/**
 * Album photo handling — no waiting, no timing issues.
 *
 * Strategy:
 * 1. Captioned message arrives first → create product immediately with 1 image
 *    → store tg_mg_product_{mediaGroupId} so late-arriving photos can find the product
 * 2. Non-captioned messages arrive later → find the product → upload + add to product_images
 *
 * If non-captioned messages somehow arrive before the captioned one, they buffer
 * themselves (tg_mg_pending_{mediaGroupId}_{fileUniqueId}) and the captioned
 * handler picks them up when it runs.
 */

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── Product mapping (set once product is created) ─────────────────────────────

export interface MediaGroupProduct {
  productId: string;
  slug: string;
  name: string;
}

export async function storeMediaGroupProduct(
  mediaGroupId: string,
  product: MediaGroupProduct
): Promise<void> {
  const supabase = getServiceClient();
  const { error } = await supabase.from("admin_settings").upsert(
    { key: `tg_mg_product_${mediaGroupId}`, value: product },
    { onConflict: "key" }
  );
  if (error) throw new Error(`storeMediaGroupProduct failed: ${error.message}`);
}

export async function getMediaGroupProduct(
  mediaGroupId: string
): Promise<MediaGroupProduct | null> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("admin_settings")
    .select("value")
    .eq("key", `tg_mg_product_${mediaGroupId}`)
    .single();
  if (!data) return null;
  return data.value as MediaGroupProduct;
}

// ── Pending buffer (non-captioned photos that arrive before product is created) ─

export async function bufferPendingPhoto(
  mediaGroupId: string,
  fileId: string,
  fileUniqueId: string
): Promise<void> {
  const supabase = getServiceClient();
  const { error } = await supabase.from("admin_settings").upsert(
    {
      key: `tg_mg_pending_${mediaGroupId}_${fileUniqueId}`,
      value: { fileId },
    },
    { onConflict: "key" }
  );
  if (error) throw new Error(`bufferPendingPhoto failed: ${error.message}`);
}

/** Returns all pending file IDs and deletes them from the buffer. */
export async function collectAndClearPendingPhotos(
  mediaGroupId: string
): Promise<string[]> {
  const supabase = getServiceClient();
  const pattern = `tg_mg_pending_${mediaGroupId}_%`;

  const { data } = await supabase
    .from("admin_settings")
    .select("value")
    .like("key", pattern);

  await supabase.from("admin_settings").delete().like("key", pattern);

  return (data ?? []).map((r) => r.value.fileId as string);
}

// ── Add a single image to an existing product ─────────────────────────────────

export async function addImageToProduct(
  productId: string,
  imageUrl: string
): Promise<void> {
  const supabase = getServiceClient();

  // Get current max position so we don't overwrite existing images
  const { data: existing } = await supabase
    .from("product_images")
    .select("position")
    .eq("product_id", productId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 1;

  const { error } = await supabase.from("product_images").insert({
    id: randomUUID(),
    product_id: productId,
    url: imageUrl,
    alt: `Image ${nextPosition + 1}`,
    position: nextPosition,
  });
  if (error) throw new Error(`addImageToProduct failed: ${error.message}`);
}
