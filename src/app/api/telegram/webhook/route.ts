import { NextRequest, NextResponse } from "next/server";
import type { TelegramUpdate, TelegramMessage } from "@/types/telegram";
import {
  sendMessage,
  getFile,
  downloadFile,
  isAdminUser,
  getHighestResolutionPhoto,
} from "@/services/telegram-bot.service";
import { uploadImageToR2, uploadVideoToR2 } from "@/services/r2-upload.service";
import { parseProductText } from "@/services/ai-parser.service";
import { createProductFromTelegram } from "@/services/product-admin.service";
import {
  bufferAlbumPhoto,
  claimAndGetAlbumPhotos,
} from "@/services/telegram-media-group.service";

export const runtime = "nodejs";
export const maxDuration = 60;

async function handleMessage(message: TelegramMessage) {
  const userId = message.from?.id;
  const chatId = message.chat.id;

  if (!userId || !isAdminUser(userId)) {
    await sendMessage(chatId, "⛔ Unauthorized. This bot is for admin use only.");
    return;
  }

  // /start
  if (message.text === "/start") {
    await sendMessage(
      chatId,
      "👋 Welcome to the Product Listing Bot!\n\nSend a photo (or an album of photos) with a caption containing product details (name, price, sizes, brand, category, gender) and I'll publish it automatically."
    );
    return;
  }

  // /debug — tests all service connections
  if (message.text === "/debug") {
    await sendMessage(chatId, "🔍 Running diagnostics...");
    const results: string[] = [];

    const envVars = ["TELEGRAM_BOT_TOKEN", "OPENAI_API_KEY", "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
    const missing = envVars.filter(v => !process.env[v]);
    results.push(missing.length > 0 ? `❌ Missing env vars: ${missing.join(", ")}` : "✅ All env vars present");

    try {
      const parsed = await parseProductText("Nike Air Max 90 White, Price: 4999, Sizes: 8 9 10, Brand: Nike, Category: sneakers, Gender: men");
      results.push(`✅ OpenAI OK — ${parsed.name}`);
    } catch (e) {
      results.push(`❌ OpenAI failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    try {
      const testBuffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
      const url = await uploadImageToR2(testBuffer, "debug-test", 0);
      results.push(`✅ R2 OK — ${url}`);
    } catch (e) {
      results.push(`❌ R2 failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { error } = await supabase.from("products").select("id").limit(1);
      if (error) throw error;
      results.push("✅ Supabase OK");
    } catch (e) {
      results.push(`❌ Supabase failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    await sendMessage(chatId, results.join("\n"));
    return;
  }

  // Text-only message
  if (message.text && !message.photo && !message.video) {
    await sendMessage(chatId, "📸 Please send a photo (or an album of photos) with the product details as the caption.");
    return;
  }

  const hasMedia = message.photo || message.video;
  if (!hasMedia) return;

  // ── Album (media group) ───────────────────────────────────────────────────
  if (message.media_group_id) {
    const photoFileId = message.photo
      ? getHighestResolutionPhoto(message.photo).file_id
      : null;

    // Buffer every photo in the album into Supabase (atomic upsert).
    await bufferAlbumPhoto(
      message.media_group_id,
      chatId,
      userId,
      photoFileId,
      message.caption ?? null
    );

    // Only the captioned message drives processing.
    if (!message.caption) return;

    // Wait a moment for the remaining album messages to arrive and be buffered.
    // Telegram sends all album messages within ~1 second; 2.5 s is safe.
    await new Promise<void>((resolve) => setTimeout(resolve, 2500));

    // Atomically claim this group — returns null if already processed.
    const group = await claimAndGetAlbumPhotos(message.media_group_id);
    if (!group) return;

    await sendMessage(chatId, `⏳ Publishing product with ${group.photoFileIds.length} image(s)...`);

    try {
      const productId = crypto.randomUUID();

      // Download + upload all photos in parallel alongside AI parsing.
      const [parsed, ...maybeUrls] = await Promise.all([
        parseProductText(group.caption),
        ...group.photoFileIds.map((fileId, i) =>
          getFile(fileId).then((f) =>
            f.file_path
              ? downloadFile(f.file_path).then((buf) => uploadImageToR2(buf, productId, i))
              : null
          )
        ),
      ]);

      const imageUrls = maybeUrls.filter((u): u is string => u !== null);

      const { slug } = await createProductFromTelegram(parsed, imageUrls, []);

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ecommerce-omega-ashy-36.vercel.app";
      await sendMessage(
        chatId,
        `✅ <b>Product published!</b>\n\n<b>${parsed.name}</b>\n📸 ${imageUrls.length} image(s) uploaded\n${parsed.sizes.join(", ")} | Rs. ${parsed.sale_price}\n\n🔗 <a href="${siteUrl}/products/${slug}">View on website</a>`
      );
    } catch (error) {
      console.error("Error publishing product (album):", error);
      await sendMessage(chatId, `❌ Failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
    return;
  }

  // ── Single photo / video ──────────────────────────────────────────────────
  if (!message.caption) {
    await sendMessage(chatId, "⚠️ No caption found. Please send the photo with product details in the caption.");
    return;
  }

  await sendMessage(chatId, "⏳ Publishing product...");

  try {
    const productId = crypto.randomUUID();
    const photoFileId = message.photo ? getHighestResolutionPhoto(message.photo).file_id : null;
    const videoFileId = message.video?.file_id ?? null;

    const [parsed, imageUrl, videoUrl] = await Promise.all([
      parseProductText(message.caption),
      photoFileId
        ? getFile(photoFileId).then((f) =>
            f.file_path ? downloadFile(f.file_path).then((buf) => uploadImageToR2(buf, productId, 0)) : null
          )
        : Promise.resolve(null),
      videoFileId
        ? getFile(videoFileId).then((f) =>
            f.file_path ? downloadFile(f.file_path).then((buf) => uploadVideoToR2(buf, productId)) : null
          )
        : Promise.resolve(null),
    ]);

    const imageUrls = imageUrl ? [imageUrl] : [];
    const videoUrls = videoUrl ? [videoUrl] : [];

    const { slug } = await createProductFromTelegram(parsed, imageUrls, videoUrls);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ecommerce-omega-ashy-36.vercel.app";
    await sendMessage(
      chatId,
      `✅ <b>Product published!</b>\n\n<b>${parsed.name}</b>\n${parsed.sizes.join(", ")} | Rs. ${parsed.sale_price}\n\n🔗 <a href="${siteUrl}/products/${slug}">View on website</a>`
    );
  } catch (error) {
    console.error("Error publishing product:", error);
    await sendMessage(chatId, `❌ Failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function POST(request: NextRequest) {
  const secretHeader = request.headers.get("x-telegram-bot-api-secret-token");
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (expectedSecret && secretHeader !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const update: TelegramUpdate = await request.json();
    if (update.message) {
      await handleMessage(update.message);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ ok: true });
  }
}
