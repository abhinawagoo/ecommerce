// Vendor-agnostic service interfaces
// These types define the contract between UI and data layer.
// When migrating from Supabase, only change service implementations.

import type { Product, ProductFilters, ProductListResponse, SortOption } from "@/types/product";
import type { CartItem, CartState } from "@/types/cart";

export interface IProductService {
  getProducts(
    filters?: ProductFilters,
    sort?: SortOption,
    page?: number,
    pageSize?: number
  ): Promise<ProductListResponse>;
  getProductBySlug(slug: string): Promise<Product | null>;
  searchProducts(query: string, limit?: number): Promise<Product[]>;
  getFeaturedProducts(limit?: number): Promise<Product[]>;
}

export interface ICartService {
  getCart(): CartState;
  addItem(item: CartItem): CartState;
  removeItem(id: string): CartState;
  updateQuantity(id: string, quantity: number): CartState;
  clearCart(): CartState;
}

export interface IProductAdminService {
  createProductFromTelegram(
    parsed: import("@/types/telegram").ParsedProductData,
    imageUrls: string[],
    videoUrls: string[]
  ): Promise<{ productId: string; slug: string }>;
}

export type { Product, ProductFilters, ProductListResponse, SortOption, CartItem, CartState };
