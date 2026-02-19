export const PRODUCTS_PER_PAGE = 12;

export const SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Popular", value: "popular" },
] as const;

export const SIZE_OPTIONS = [
  "5", "6", "7", "8", "9", "10", "11", "12",
] as const;

export const GENDER_OPTIONS = ["men", "women", "kids", "unisex"] as const;

export const STALE_TIME = 60 * 1000; // 60 seconds
