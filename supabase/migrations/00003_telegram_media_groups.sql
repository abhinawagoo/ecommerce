-- Buffer table for Telegram media group (album) messages.
-- When an admin sends multiple photos at once (an "album"), Telegram fires
-- one webhook call per photo. We collect all file_ids here before processing.

CREATE TABLE telegram_media_groups (
  media_group_id  TEXT        PRIMARY KEY,
  chat_id         BIGINT      NOT NULL,
  user_id         BIGINT      NOT NULL,
  caption         TEXT,
  photo_file_ids  TEXT[]      NOT NULL DEFAULT '{}',
  processed       BOOLEAN     NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No public access — only service role (bot) may read/write.
ALTER TABLE telegram_media_groups ENABLE ROW LEVEL SECURITY;

-- Atomic upsert: insert the group on first arrival, then append any extra
-- photo file_ids that arrive in later webhook calls for the same album.
CREATE OR REPLACE FUNCTION upsert_telegram_media_group(
  p_media_group_id TEXT,
  p_chat_id        BIGINT,
  p_user_id        BIGINT,
  p_photo_file_id  TEXT,
  p_caption        TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO telegram_media_groups
    (media_group_id, chat_id, user_id, photo_file_ids, caption)
  VALUES (
    p_media_group_id,
    p_chat_id,
    p_user_id,
    CASE WHEN p_photo_file_id IS NOT NULL
         THEN ARRAY[p_photo_file_id]
         ELSE ARRAY[]::TEXT[]
    END,
    p_caption
  )
  ON CONFLICT (media_group_id) DO UPDATE SET
    photo_file_ids = CASE
      WHEN p_photo_file_id IS NOT NULL
           AND NOT (p_photo_file_id = ANY(telegram_media_groups.photo_file_ids))
      THEN array_append(telegram_media_groups.photo_file_ids, p_photo_file_id)
      ELSE telegram_media_groups.photo_file_ids
    END,
    caption = COALESCE(telegram_media_groups.caption, p_caption);
END;
$$;

-- Atomically mark a group as processed and return its data.
-- Returns exactly one row when this invocation "wins" the claim;
-- returns no rows if the group was already processed (another invocation won).
CREATE OR REPLACE FUNCTION claim_telegram_media_group(
  p_media_group_id TEXT
)
RETURNS TABLE (
  r_chat_id        BIGINT,
  r_user_id        BIGINT,
  r_caption        TEXT,
  r_photo_file_ids TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  UPDATE telegram_media_groups
  SET processed = true
  WHERE media_group_id = p_media_group_id
    AND processed = false
    AND caption IS NOT NULL
  RETURNING chat_id, user_id, caption, photo_file_ids;
END;
$$;
