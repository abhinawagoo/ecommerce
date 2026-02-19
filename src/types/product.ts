export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  mrp: number;
  sale_price: number;
  category: string;
  brand: string | null;
  gender: string;
  is_featured: boolean;
  is_active: boolean;
  stock: number;
  avg_rating: number;
  rating_count: number;
  created_at: string;
  images: ProductImage[];
  variants: ProductVariant[];
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt: string | null;
  position: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size: string;
  color: string | null;
  color_hex: string | null;
  sku: string;
  stock: number;
  price_override: number | null;
}

export interface ProductFilters {
  category?: string;
  gender?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  size?: string;
  search?: string;
}

export type SortOption = "newest" | "price_asc" | "price_desc" | "popular";

export interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
