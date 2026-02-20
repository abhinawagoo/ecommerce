import { NextRequest, NextResponse } from "next/server";
import type {
  TelegramUpdate,
  TelegramMessage,
  BufferedMediaGroup,
  PendingProduct,
  ParsedProductData,
} from "@/types/telegram";
import {
  sendMessage,
  editMessageText,
  answerCallbackQuery,
  getFile,
  downloadFile,
  isAdminUser,
  getHighestResolutionPhoto,
} from "@/services/telegram-bot.service";
import { uploadImageToR2, uploadVideoToR2 } from "@/services/r2-upload.service";
import { parseProductText } from "@/services/ai-parser.service";
import { createProductFromTelegram } from "@/services/product-admin.service";

export const runtime = "nodejs";
export const maxDuration = 60;

// In-memory state (fine for single instance, 15-20 products/day)
const mediaGroupBuffer = new Map<string, BufferedMediaGroup>();
const pendingProducts = new Map<string, PendingProduct>();

// Cleanup pending products older than 30 minutes
function cleanupPendingProducts() {
  const now = Date.now();
  pendingProducts.forEach((pending, key) => {
    if (now - pending.createdAt > 30 * 60 * 1000) {
      pendingProducts.delete(key);
    }
  });
}

function formatCurrency(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-IN")}`;
}

function buildConfirmationMessage(parsed: ParsedProductData, photoCount: number, videoCount: number): string {
  const mediaInfo = [
    photoCount > 0 ? `${photoCount} photo${photoCount > 1 ? "s" : ""}` : "",
    videoCount > 0 ? `${videoCount} video${videoCount > 1 ? "s" : ""}` : "",
  ].filter(Boolean).join(", ");

  return [
    `📦 <b>New Product Parsed:</b>`,
    ``,
    `<b>Name:</b> ${parsed.name}`,
    `<b>Brand:</b> ${parsed.brand}`,
    `<b>Category:</b> ${parsed.category}`,
    `<b>Gender:</b> ${parsed.gender}`,
    `<b>Sizes:</b> ${parsed.sizes.join(", ")}`,
    `<b>Price:</b> ${formatCurrency(parsed.sale_price)}`,
    `<b>MRP:</b> ${formatCurrency(parsed.mrp)}`,
    `<b>Color:</b> ${parsed.color}`,
    `<b>Media:</b> ${mediaInfo || "none"}`,
    ``,
    `<b>Description:</b> ${parsed.description}`,
    `<b>Slug:</b> /${parsed.slug}`,
  ].join("\n");
}

async function processMediaGroup(group: BufferedMediaGroup) {
  const { chatId, photoFileIds, videoFileIds, caption } = group;

  if (!caption) {
    await sendMessage(chatId, "⚠️ No caption found. Please send photos with a product description as the caption.");
    return;
  }

  await sendMessage(chatId, "⏳ Processing your product listing...");

  try {
    // Generate product ID upfront for R2 paths
    const productId = crypto.randomUUID();

    // Download and upload photos to R2
    const imageUrls: string[] = [];
    for (let i = 0; i < photoFileIds.length; i++) {
      const file = await getFile(photoFileIds[i]);
      if (!file.file_path) continue;
      const buffer = await downloadFile(file.file_path);
      const url = await uploadImageToR2(buffer, productId, i);
      imageUrls.push(url);
    }

    // Download and upload videos to R2
    const videoUrls: string[] = [];
    for (const videoFileId of videoFileIds) {
      const file = await getFile(videoFileId);
      if (!file.file_path) continue;
      const buffer = await downloadFile(file.file_path);
      const url = await uploadVideoToR2(buffer, productId);
      videoUrls.push(url);
    }

    // Parse product text with AI
    const parsed = await parseProductText(caption);

    // Send confirmation with buttons
    const confirmMessage = buildConfirmationMessage(parsed, imageUrls.length, videoUrls.length);
    const pendingKey = `pending_${chatId}_${Date.now()}`;

    const sentMessage = await sendMessage(chatId, confirmMessage, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Publish", callback_data: `publish:${pendingKey}` },
            { text: "❌ Cancel", callback_data: `cancel:${pendingKey}` },
          ],
        ],
      },
    });

    // Store pending product
    pendingProducts.set(pendingKey, {
      parsed,
      imageUrls,
      videoUrls,
      chatId,
      messageId: sentMessage.message_id,
      createdAt: Date.now(),
    });

    cleanupPendingProducts();
  } catch (error) {
    console.error("Error processing media group:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await sendMessage(chatId, `❌ Error processing product: ${errorMessage}`);
  }
}

async function handleMessage(message: TelegramMessage) {
  const userId = message.from?.id;
  const chatId = message.chat.id;

  if (!userId || !isAdminUser(userId)) {
    await sendMessage(chatId, "⛔ Unauthorized. This bot is for admin use only.");
    return;
  }

  // Handle /start command
  if (message.text === "/start") {
    await sendMessage(
      chatId,
      "👋 Welcome to the Product Listing Bot!\n\nSend me product photos with a caption containing the product details (name, price, sizes, etc.) and I'll create the listing for you."
    );
    return;
  }

  // Handle /debug command — tests R2 and OpenAI connectivity
  if (message.text === "/debug") {
    await sendMessage(chatId, "🔍 Running diagnostics...");
    const results: string[] = [];

    // Check env vars
    const envVars = ["TELEGRAM_BOT_TOKEN", "OPENAI_API_KEY", "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
    const missing = envVars.filter(v => !process.env[v]);
    if (missing.length > 0) {
      results.push(`❌ Missing env vars: ${missing.join(", ")}`);
    } else {
      results.push("✅ All env vars present");
    }

    // Test OpenAI
    try {
      const { parseProductText } = await import("@/services/ai-parser.service");
      const parsed = await parseProductText("Nike Air Max 90 White, Price: 4999, Sizes: 8 9 10, Brand: Nike, Category: sneakers, Gender: men");
      results.push(`✅ OpenAI OK — parsed: ${parsed.name}`);
    } catch (e) {
      results.push(`❌ OpenAI failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Test R2
    try {
      const { uploadImageToR2 } = await import("@/services/r2-upload.service");
      const testBuffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
      const url = await uploadImageToR2(testBuffer, "debug-test", 0);
      results.push(`✅ R2 OK — url: ${url}`);
    } catch (e) {
      results.push(`❌ R2 failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Test Supabase
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

  // Handle text-only messages (no photos)
  if (message.text && !message.photo && !message.video) {
    await sendMessage(
      chatId,
      "📸 Please send photos along with the product description as a caption. Text-only messages are not supported for product listings."
    );
    return;
  }

  const hasMedia = message.photo || message.video;
  if (!hasMedia) return;

  const mediaGroupId = message.media_group_id;

  if (mediaGroupId) {
    // Part of a media group — buffer it
    let group = mediaGroupBuffer.get(mediaGroupId);
    if (!group) {
      group = {
        chatId,
        userId,
        caption: null,
        photoFileIds: [],
        videoFileIds: [],
        timer: setTimeout(() => {
          const g = mediaGroupBuffer.get(mediaGroupId);
          if (g) {
            mediaGroupBuffer.delete(mediaGroupId);
            processMediaGroup(g);
          }
        }, 2000), // 2s debounce
      };
      mediaGroupBuffer.set(mediaGroupId, group);
    }

    // Capture caption from whichever message has it
    if (message.caption) {
      group.caption = message.caption;
    }

    if (message.photo) {
      const best = getHighestResolutionPhoto(message.photo);
      group.photoFileIds.push(best.file_id);
    }
    if (message.video) {
      group.videoFileIds.push(message.video.file_id);
    }

    // Reset debounce timer
    clearTimeout(group.timer);
    group.timer = setTimeout(() => {
      const g = mediaGroupBuffer.get(mediaGroupId);
      if (g) {
        mediaGroupBuffer.delete(mediaGroupId);
        processMediaGroup(g);
      }
    }, 2000);
  } else {
    // Single photo/video — process immediately
    const singleGroup: BufferedMediaGroup = {
      chatId,
      userId,
      caption: message.caption ?? null,
      photoFileIds: [],
      videoFileIds: [],
      timer: null as unknown as ReturnType<typeof setTimeout>,
    };

    if (message.photo) {
      const best = getHighestResolutionPhoto(message.photo);
      singleGroup.photoFileIds.push(best.file_id);
    }
    if (message.video) {
      singleGroup.videoFileIds.push(message.video.file_id);
    }

    await processMediaGroup(singleGroup);
  }
}

async function handleCallbackQuery(callbackQuery: TelegramUpdate["callback_query"]) {
  if (!callbackQuery?.data) return;

  const { id: queryId, data, from } = callbackQuery;

  if (!isAdminUser(from.id)) {
    await answerCallbackQuery(queryId, "⛔ Unauthorized");
    return;
  }

  const colonIdx = data.indexOf(":");
  const action = data.substring(0, colonIdx);
  const fullKey = data.substring(colonIdx + 1);

  const chatId = callbackQuery.message?.chat.id;
  const messageId = callbackQuery.message?.message_id;

  if (!chatId || !messageId) {
    await answerCallbackQuery(queryId, "Error: message not found");
    return;
  }

  const pendingProduct = pendingProducts.get(fullKey);

  if (!pendingProduct) {
    await answerCallbackQuery(queryId, "⏰ This listing has expired. Please send again.");
    await editMessageText(chatId, messageId, "⏰ Listing expired or already processed.");
    return;
  }

  if (action === "publish") {
    await answerCallbackQuery(queryId, "Publishing...");
    await editMessageText(chatId, messageId, "⏳ Publishing product...");

    try {
      const { slug } = await createProductFromTelegram(
        pendingProduct.parsed,
        pendingProduct.imageUrls,
        pendingProduct.videoUrls
      );

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      await editMessageText(
        chatId,
        messageId,
        `✅ <b>Product published!</b>\n\n<b>${pendingProduct.parsed.name}</b>\n\n🔗 <a href="${siteUrl}/products/${slug}">View on website</a>`
      );
    } catch (error) {
      console.error("Error publishing product:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await editMessageText(chatId, messageId, `❌ Failed to publish: ${errorMessage}`);
    }

    pendingProducts.delete(fullKey);
  } else if (action === "cancel") {
    await answerCallbackQuery(queryId, "Cancelled");
    await editMessageText(chatId, messageId, "❌ Product listing cancelled.");
    pendingProducts.delete(fullKey);
  }
}

export async function POST(request: NextRequest) {
  // Verify webhook secret
  const secretHeader = request.headers.get("x-telegram-bot-api-secret-token");
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (expectedSecret && secretHeader !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const update: TelegramUpdate = await request.json();

    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    } else if (update.message) {
      await handleMessage(update.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    // Always return 200 to prevent Telegram from retrying
    return NextResponse.json({ ok: true });
  }
}
