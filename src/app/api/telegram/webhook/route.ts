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
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 60;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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
      "👋 Welcome to the Product Listing Bot!\n\nSend a photo (or album) with product details as caption."
    );
    return;
  }

  // /debug_album — shows what is currently buffered in admin_settings
  if (message.text === "/debug_album") {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("admin_settings")
      .select("key, value")
      .like("key", "tg_mg_%");
    if (error) {
      await sendMessage(chatId, `❌ DB error: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      await sendMessage(chatId, "📭 No album buffer entries found in admin_settings.");
      return;
    }
    const lines = data.map((r) => `• ${r.key}\n  ${JSON.stringify(r.value)}`);
    await sendMessage(chatId, `📦 Buffer entries (${data.length}):\n\n${lines.join("\n\n")}`);
    return;
  }

  // /debug_write — tests if writing to admin_settings works
  if (message.text === "/debug_write") {
    const supabase = getSupabase();
    const testKey = `tg_mg_test_${Date.now()}`;
    const { error } = await supabase.from("admin_settings").upsert(
      { key: testKey, value: { test: true, ts: Date.now() } },
      { onConflict: "key" }
    );
    if (error) {
      await sendMessage(chatId, `❌ Write failed: ${error.message}`);
    } else {
      await sendMessage(chatId, `✅ Write OK (key: ${testKey})\nSend /debug_album to verify it appears.`);
    }
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
      const supabase = getSupabase();
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
    await sendMessage(chatId, "📸 Please send a photo (or album) with product details as caption.");
    return;
  }

  const hasMedia = message.photo || message.video;
  if (!hasMedia) return;

  // ── Album (media group) ───────────────────────────────────────────────────
  if (message.media_group_id) {
    const photo = message.photo ? getHighestResolutionPhoto(message.photo) : null;
    const supabase = getSupabase();

    // Buffer this photo into admin_settings using a unique key per photo.
    if (photo) {
      const bufferKey = `tg_mg_${message.media_group_id}_photo_${photo.file_unique_id}`;
      const { error: writeErr } = await supabase.from("admin_settings").upsert(
        { key: bufferKey, value: { fileId: photo.file_id, chatId, userId } },
        { onConflict: "key" }
      );
      if (writeErr) {
        console.error(`Buffer write failed [${bufferKey}]:`, writeErr.message);
        // Report the error so we can diagnose remotely
        if (message.caption) {
          await sendMessage(chatId, `⚠️ Buffer write error: ${writeErr.message}\nProceeding with single image.`);
        }
      }
    }

    // Buffer the caption too
    if (message.caption) {
      await supabase.from("admin_settings").upsert(
        {
          key: `tg_mg_${message.media_group_id}_caption`,
          value: { caption: message.caption, chatId, userId },
        },
        { onConflict: "key" }
      );
    }

    // Non-captioned messages exit here after buffering
    if (!message.caption) return;

    // The captioned message waits, then collects everything
    await sendMessage(chatId, "⏳ Collecting all photos from album...");
    await new Promise<void>((resolve) => setTimeout(resolve, 5000));

    // Read all buffered entries for this album
    const prefix = `tg_mg_${message.media_group_id}_`;
    const { data: bufferRows, error: readErr } = await supabase
      .from("admin_settings")
      .select("key, value")
      .like("key", `${prefix}%`);

    if (readErr) {
      await sendMessage(chatId, `❌ Buffer read failed: ${readErr.message}`);
      return;
    }

    const photoRows = (bufferRows ?? []).filter((r) => r.key.startsWith(`${prefix}photo_`));
    const photoFileIds = photoRows.map((r) => r.value.fileId as string);

    await sendMessage(chatId, `📸 Found ${photoFileIds.length} photo(s) — uploading...`);

    // Clean up buffer
    await supabase.from("admin_settings").delete().like("key", `${prefix}%`);

    try {
      const productId = crypto.randomUUID();
      const [parsed, ...maybeUrls] = await Promise.all([
        parseProductText(message.caption),
        ...photoFileIds.map((fileId, i) =>
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
        `✅ <b>Product published!</b>\n\n<b>${parsed.name}</b>\n📸 ${imageUrls.length} image(s)\n${parsed.sizes.join(", ")} | Rs. ${parsed.sale_price}\n\n🔗 <a href="${siteUrl}/products/${slug}">View on website</a>`
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
