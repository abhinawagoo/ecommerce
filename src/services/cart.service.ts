import { createClient } from "@/lib/supabase/client";
import type { CartItem, CartState } from "@/types/cart";
import { generateCartItemId } from "@/lib/utils";

const CART_STORAGE_KEY = "ecommerce_cart";

const EMPTY_CART: CartState = { items: [], lastUpdated: Date.now() };

export function getCart(): CartState {
  if (typeof window === "undefined") return EMPTY_CART;
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : EMPTY_CART;
  } catch {
    return EMPTY_CART;
  }
}

export function saveCart(state: CartState): CartState {
  const updated = { ...state, lastUpdated: Date.now() };
  if (typeof window !== "undefined") {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updated));
  }
  return updated;
}

export function addItem(item: CartItem): CartState {
  const cart = getCart();
  const existingIndex = cart.items.findIndex((i) => i.id === item.id);

  if (existingIndex >= 0) {
    const existing = cart.items[existingIndex];
    const newQty = Math.min(existing.quantity + item.quantity, item.maxStock);
    cart.items[existingIndex] = { ...existing, quantity: newQty };
  } else {
    cart.items.push(item);
  }

  return saveCart(cart);
}

export function removeItem(id: string): CartState {
  const cart = getCart();
  cart.items = cart.items.filter((i) => i.id !== id);
  return saveCart(cart);
}

export function updateQuantity(id: string, quantity: number): CartState {
  const cart = getCart();
  const index = cart.items.findIndex((i) => i.id === id);
  if (index >= 0) {
    if (quantity <= 0) {
      cart.items.splice(index, 1);
    } else {
      const item = cart.items[index];
      cart.items[index] = { ...item, quantity: Math.min(quantity, item.maxStock) };
    }
  }
  return saveCart(cart);
}

export function clearCart(): CartState {
  return saveCart(EMPTY_CART);
}

export function getCartTotal(items: CartItem[]): { subtotal: number; mrpTotal: number; discount: number } {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const mrpTotal = items.reduce((sum, item) => sum + item.mrp * item.quantity, 0);
  return { subtotal, mrpTotal, discount: mrpTotal - subtotal };
}

export function getCartCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

// --- Server-side cart operations (Phase 2) ---

export async function getServerCart(): Promise<CartItem[]> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const { data, error } = await supabase
    .from("cart")
    .select(`
      id, quantity,
      product:products(id, name, slug, mrp, sale_price, stock, images:product_images(url)),
      variant:product_variants(id, size, color, stock, price_override)
    `)
    .eq("user_id", session.user.id);

  if (error || !data) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[])
    .filter((row) => row.product)
    .map((row) => {
      const p = Array.isArray(row.product) ? row.product[0] : row.product;
      const v = Array.isArray(row.variant) ? row.variant[0] : row.variant;
      if (!p) return null;
      const price = v?.price_override ?? p.sale_price;
      return {
        id: generateCartItemId(p.id, v?.id ?? null),
        productId: p.id,
        variantId: v?.id ?? null,
        name: p.name,
        slug: p.slug,
        size: v?.size ?? null,
        color: v?.color ?? null,
        price,
        mrp: p.mrp,
        quantity: row.quantity,
        imageUrl: p.images?.[0]?.url ?? "",
        maxStock: v?.stock ?? p.stock,
      } as CartItem;
    })
    .filter((item): item is CartItem => item !== null);
}

export async function syncCartToServer(localItems: CartItem[]): Promise<CartItem[]> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return localItems;

  const serverItems = await getServerCart();

  // Merge: combine local + server. For same product+variant, add quantities
  const merged = new Map<string, CartItem>();

  // Server items first (server wins on conflict)
  for (const item of serverItems) {
    merged.set(item.id, item);
  }

  // Local items: add quantity if exists on server, otherwise add new
  for (const localItem of localItems) {
    const existing = merged.get(localItem.id);
    if (existing) {
      merged.set(localItem.id, {
        ...existing,
        quantity: Math.min(existing.quantity + localItem.quantity, existing.maxStock),
      });
    } else {
      merged.set(localItem.id, localItem);
    }
  }

  const mergedItems = Array.from(merged.values());

  // Sync merged cart to server
  await supabase.from("cart").delete().eq("user_id", session.user.id);

  if (mergedItems.length > 0) {
    const rows = mergedItems.map((item) => ({
      user_id: session.user.id,
      product_id: item.productId,
      variant_id: item.variantId,
      quantity: item.quantity,
    }));
    await supabase.from("cart").insert(rows);
  }

  // Clear localStorage after sync
  if (typeof window !== "undefined") {
    localStorage.removeItem(CART_STORAGE_KEY);
  }

  return mergedItems;
}
