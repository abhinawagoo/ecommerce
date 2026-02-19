"use client";

import { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from "react";
import type { CartItem, CartState, CartAction } from "@/types/cart";
import * as cartService from "@/services/cart.service";
import { useAuth } from "@/hooks/use-auth";

interface CartContextValue {
  state: CartState;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  mrpTotal: number;
  discount: number;
}

const CartContext = createContext<CartContextValue | null>(null);

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const existingIndex = state.items.findIndex((i) => i.id === action.payload.id);
      let newItems: CartItem[];
      if (existingIndex >= 0) {
        newItems = state.items.map((item, idx) =>
          idx === existingIndex
            ? { ...item, quantity: Math.min(item.quantity + action.payload.quantity, item.maxStock) }
            : item
        );
      } else {
        newItems = [...state.items, action.payload];
      }
      return { items: newItems, lastUpdated: Date.now() };
    }
    case "REMOVE_ITEM":
      return {
        items: state.items.filter((i) => i.id !== action.payload.id),
        lastUpdated: Date.now(),
      };
    case "UPDATE_QUANTITY":
      return {
        items: action.payload.quantity <= 0
          ? state.items.filter((i) => i.id !== action.payload.id)
          : state.items.map((item) =>
              item.id === action.payload.id
                ? { ...item, quantity: Math.min(action.payload.quantity, item.maxStock) }
                : item
            ),
        lastUpdated: Date.now(),
      };
    case "CLEAR_CART":
      return { items: [], lastUpdated: Date.now() };
    case "LOAD_CART":
      return action.payload;
    default:
      return state;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], lastUpdated: Date.now() });
  const { session } = useAuth();

  // Load cart from localStorage on mount
  useEffect(() => {
    const saved = cartService.getCart();
    if (saved.items.length > 0) {
      dispatch({ type: "LOAD_CART", payload: saved });
    }
  }, []);

  // Persist cart to localStorage on changes (only when not authenticated)
  useEffect(() => {
    if (state.lastUpdated > 0 && !session.isAuthenticated) {
      cartService.saveCart(state);
    }
  }, [state, session.isAuthenticated]);

  // Merge cart on login
  const syncCart = useCallback(async () => {
    if (!session.isAuthenticated) return;

    try {
      const localCart = cartService.getCart();
      const mergedItems = await cartService.syncCartToServer(localCart.items);
      dispatch({
        type: "LOAD_CART",
        payload: { items: mergedItems, lastUpdated: Date.now() },
      });
    } catch (error) {
      console.error("Cart sync failed:", error);
    }
  }, [session.isAuthenticated]);

  useEffect(() => {
    syncCart();
  }, [syncCart]);

  const { subtotal, mrpTotal, discount } = cartService.getCartTotal(state.items);
  const itemCount = cartService.getCartCount(state.items);

  const value: CartContextValue = {
    state,
    addItem: (item) => dispatch({ type: "ADD_ITEM", payload: item }),
    removeItem: (id) => dispatch({ type: "REMOVE_ITEM", payload: { id } }),
    updateQuantity: (id, quantity) => dispatch({ type: "UPDATE_QUANTITY", payload: { id, quantity } }),
    clearCart: () => dispatch({ type: "CLEAR_CART" }),
    itemCount,
    subtotal,
    mrpTotal,
    discount,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
