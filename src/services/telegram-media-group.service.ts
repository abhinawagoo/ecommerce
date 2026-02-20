/**
 * Buffers Telegram album (media group) photos in the existing admin_settings
 * table — no extra migration required.
 *
 * Key convention (all share the same media_group_id prefix):
 *   tg_mg_{mediaGroupId}_photo_{fileUniqueId}   ← one row per photo
 *   tg_mg_{mediaGroupId}_caption                ← one row for the caption
 *
 * Because each photo uses a unique key (file_unique_id), concurrent webhook
 * invocations never conflict with each other.
 */

import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function bufferAlbumPhoto(
  mediaGroupId: string,
  chatId: number,
  userId: number,
  photoFileId: string,
  fileUniqueId: string
): Promise<void> {
  const supabase = getServiceClient();
  // onConflict: 'key' is required — admin_settings primary key is `id` (UUID),
  // so without this, upsert defaults to ON CONFLICT (id) which never matches
  // when id is auto-generated, potentially causing unique-constraint errors.
  const { error } = await supabase.from("admin_settings").upsert(
    {
      key: `tg_mg_${mediaGroupId}_photo_${fileUniqueId}`,
      value: { fileId: photoFileId, chatId, userId },
    },
    { onConflict: "key" }
  );
  if (error) throw new Error(`bufferAlbumPhoto failed: ${error.message}`);
}

export async function bufferAlbumCaption(
  mediaGroupId: string,
  chatId: number,
  userId: number,
  caption: string
): Promise<void> {
  const supabase = getServiceClient();
  const { error } = await supabase.from("admin_settings").upsert(
    {
      key: `tg_mg_${mediaGroupId}_caption`,
      value: { caption, chatId, userId },
    },
    { onConflict: "key" }
  );
  if (error) throw new Error(`bufferAlbumCaption failed: ${error.message}`);
}

export interface ClaimedMediaGroup {
  chatId: number;
  userId: number;
  caption: string;
  photoFileIds: string[];
}

/**
 * Reads all buffered photos + caption for this album, deletes the temp rows,
 * and returns the collected data. Only the captioned webhook message calls
 * this, so there is no race condition between invocations.
 */
export async function claimAndGetAlbumPhotos(
  mediaGroupId: string
): Promise<ClaimedMediaGroup | null> {
  const supabase = getServiceClient();
  const prefix = `tg_mg_${mediaGroupId}_`;

  const { data, error } = await supabase
    .from("admin_settings")
    .select("key, value")
    .like("key", `${prefix}%`);

  if (error) throw new Error(`claimAndGetAlbumPhotos failed: ${error.message}`);
  if (!data || data.length === 0) return null;

  const captionRow = data.find((r) => r.key === `${prefix}caption`);
  if (!captionRow) return null;

  const photoFileIds = data
    .filter((r) => r.key.startsWith(`${prefix}photo_`))
    .map((r) => r.value.fileId as string);

  // Clean up all temp rows for this album
  await supabase.from("admin_settings").delete().like("key", `${prefix}%`);

  return {
    chatId: captionRow.value.chatId as number,
    userId: captionRow.value.userId as number,
    caption: captionRow.value.caption as string,
    photoFileIds,
  };
}
