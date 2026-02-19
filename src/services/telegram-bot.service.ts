import type { TelegramFile, TelegramPhotoSize } from "@/types/telegram";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const ADMIN_USER_IDS = (process.env.TELEGRAM_ADMIN_USER_IDS ?? "")
  .split(",")
  .map((id) => parseInt(id.trim(), 10))
  .filter(Boolean);

const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;
const FILE_BASE = `https://api.telegram.org/file/bot${BOT_TOKEN}`;

async function callApi(method: string, body: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.ok) {
    console.error(`Telegram API error [${method}]:`, json);
    throw new Error(`Telegram API error: ${json.description}`);
  }
  return json.result;
}

export async function sendMessage(
  chatId: number,
  text: string,
  options?: {
    reply_markup?: Record<string, unknown>;
    parse_mode?: string;
  }
): Promise<{ message_id: number }> {
  return callApi("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: options?.parse_mode ?? "HTML",
    ...options,
  });
}

export async function editMessageText(
  chatId: number,
  messageId: number,
  text: string,
  options?: {
    reply_markup?: Record<string, unknown>;
    parse_mode?: string;
  }
) {
  return callApi("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: options?.parse_mode ?? "HTML",
    ...options,
  });
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  return callApi("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
  });
}

export async function getFile(fileId: string): Promise<TelegramFile> {
  return callApi("getFile", { file_id: fileId });
}

export async function downloadFile(filePath: string): Promise<Buffer> {
  const res = await fetch(`${FILE_BASE}/${filePath}`);
  if (!res.ok) throw new Error(`Failed to download file: ${res.statusText}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export function isAdminUser(userId: number): boolean {
  return ADMIN_USER_IDS.includes(userId);
}

export function getHighestResolutionPhoto(photos: TelegramPhotoSize[]): TelegramPhotoSize {
  return photos.reduce((best, current) =>
    (current.width * current.height) > (best.width * best.height) ? current : best
  );
}
