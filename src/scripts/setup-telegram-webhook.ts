/**
 * One-time script to register the Telegram webhook.
 *
 * Usage:
 *   pnpm telegram:setup
 *
 * Requires TELEGRAM_BOT_TOKEN and NEXT_PUBLIC_SITE_URL env vars.
 * Optionally set TELEGRAM_WEBHOOK_SECRET for webhook verification.
 */

import dotenv from "dotenv";
import path from "path";

// Load .env.local (Next.js convention), then fall back to .env
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!token) {
    console.error("Error: TELEGRAM_BOT_TOKEN is not set");
    process.exit(1);
  }
  if (!siteUrl) {
    console.error("Error: NEXT_PUBLIC_SITE_URL is not set");
    process.exit(1);
  }

  const webhookUrl = `${siteUrl}/api/telegram/webhook`;
  console.log(`Setting webhook to: ${webhookUrl}`);

  const body: Record<string, unknown> = {
    url: webhookUrl,
    allowed_updates: ["message", "callback_query"],
  };

  if (secret) {
    body.secret_token = secret;
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (data.ok) {
    console.log("Webhook set successfully!");
    console.log("Result:", data.description);
  } else {
    console.error("Failed to set webhook:", data.description);
    process.exit(1);
  }

  // Also get bot info for verification
  const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const meData = await meRes.json();

  if (meData.ok) {
    console.log(`\nBot: @${meData.result.username} (${meData.result.first_name})`);
  }
}

main();
