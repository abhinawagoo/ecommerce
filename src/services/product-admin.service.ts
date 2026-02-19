import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import type { ParsedProductData } from "@/types/telegram";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function createProductFromTelegram(
  parsed: ParsedProductData,
  imageUrls: string[],
  videoUrls: string[]
): Promise<{ productId: string; slug: string }> {
  const supabase = getServiceClient();
  const productId = randomUUID();

  const totalStock = parsed.sizes.length * 10;

  // Insert product
  const { error: productError } = await supabase.from("products").insert({
    id: productId,
    name: parsed.name,
    slug: parsed.slug,
    description: parsed.description,
    mrp: parsed.mrp,
    sale_price: parsed.sale_price,
    category: parsed.category,
    brand: parsed.brand,
    gender: parsed.gender,
    is_featured: parsed.is_featured,
    is_active: true,
    stock: totalStock,
  });

  if (productError) throw new Error(`Failed to insert product: ${productError.message}`);

  // Insert images (photos + videos stored as product_images rows)
  const allMediaUrls = [...imageUrls, ...videoUrls];
  if (allMediaUrls.length > 0) {
    const imageRows = allMediaUrls.map((url, i) => ({
      id: randomUUID(),
      product_id: productId,
      url,
      alt: `${parsed.name} - ${i < imageUrls.length ? `Image ${i + 1}` : `Video ${i - imageUrls.length + 1}`}`,
      position: i,
    }));

    const { error: imageError } = await supabase.from("product_images").insert(imageRows);
    if (imageError) {
      console.error("Failed to insert images:", imageError);
    }
  }

  // Insert variants (one per size)
  if (parsed.sizes.length > 0) {
    const brandCode = parsed.brand
      .substring(0, 3)
      .toUpperCase()
      .replace(/[^A-Z]/g, "X");
    const colorCode = parsed.color
      .substring(0, 3)
      .toUpperCase()
      .replace(/[^A-Z]/g, "X");

    const variantRows = parsed.sizes.map((size) => ({
      id: randomUUID(),
      product_id: productId,
      size,
      color: parsed.color,
      color_hex: parsed.color_hex,
      sku: `${brandCode}-${colorCode}-${size}`,
      stock: 10,
      price_override: null,
    }));

    const { error: variantError } = await supabase.from("product_variants").insert(variantRows);
    if (variantError) {
      console.error("Failed to insert variants:", variantError);
    }
  }

  return { productId, slug: parsed.slug };
}
