// Telegram Bot API types (subset needed for product listing bot)

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
}

export interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface TelegramVideo {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  duration: number;
  file_size?: number;
  mime_type?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  caption?: string;
  photo?: TelegramPhotoSize[];
  video?: TelegramVideo;
  media_group_id?: string;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  chat_instance: string;
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramFile {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_path?: string;
}

// Parsed product data from AI
export interface ParsedProductData {
  name: string;
  brand: string;
  category: string;
  gender: string;
  sizes: string[];
  sale_price: number;
  mrp: number;
  description: string;
  slug: string;
  color: string;
  color_hex: string;
  is_featured: boolean;
}

// Media group buffering (multiple photos sent together)
export interface BufferedMediaGroup {
  chatId: number;
  userId: number;
  caption: string | null;
  photoFileIds: string[];
  videoFileIds: string[];
  timer: ReturnType<typeof setTimeout>;
}

// Product pending admin confirmation
export interface PendingProduct {
  parsed: ParsedProductData;
  imageUrls: string[];
  videoUrls: string[];
  chatId: number;
  messageId: number;
  createdAt: number;
}
