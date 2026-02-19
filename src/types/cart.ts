export interface CartItem {
  id: string;
  productId: string;
  variantId: string | null;
  name: string;
  slug: string;
  size: string | null;
  color: string | null;
  price: number;
  mrp: number;
  quantity: number;
  imageUrl: string;
  maxStock: number;
}

export interface CartState {
  items: CartItem[];
  lastUpdated: number;
}

export type CartAction =
  | { type: "ADD_ITEM"; payload: CartItem }
  | { type: "REMOVE_ITEM"; payload: { id: string } }
  | { type: "UPDATE_QUANTITY"; payload: { id: string; quantity: number } }
  | { type: "CLEAR_CART" }
  | { type: "LOAD_CART"; payload: CartState };
