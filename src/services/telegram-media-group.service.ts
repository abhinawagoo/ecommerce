import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Upsert a photo file_id (and optional caption) into the media-group buffer.
 * Safe to call concurrently — the SQL function uses atomic INSERT ... ON CONFLICT.
 */
export async function bufferAlbumPhoto(
  mediaGroupId: string,
  chatId: number,
  userId: number,
  photoFileId: string | null,
  caption: string | null
): Promise<void> {
  const supabase = getServiceClient();
  const { error } = await supabase.rpc("upsert_telegram_media_group", {
    p_media_group_id: mediaGroupId,
    p_chat_id: chatId,
    p_user_id: userId,
    p_photo_file_id: photoFileId,
    p_caption: caption,
  });
  if (error) throw new Error(`Failed to buffer album photo: ${error.message}`);
}

export interface ClaimedMediaGroup {
  chatId: number;
  userId: number;
  caption: string;
  photoFileIds: string[];
}

/**
 * Atomically mark the group as processed and return all its data.
 * Returns null if the group was already claimed by another invocation.
 */
export async function claimAndGetAlbumPhotos(
  mediaGroupId: string
): Promise<ClaimedMediaGroup | null> {
  const supabase = getServiceClient();
  const { data, error } = await supabase.rpc("claim_telegram_media_group", {
    p_media_group_id: mediaGroupId,
  });
  if (error) throw new Error(`Failed to claim media group: ${error.message}`);
  if (!data || data.length === 0) return null;
  const row = data[0];
  return {
    chatId: row.r_chat_id,
    userId: row.r_user_id,
    caption: row.r_caption,
    photoFileIds: row.r_photo_file_ids,
  };
}
