import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Product, ProductFilters, ProductListResponse, SortOption } from "@/types/product";
import { PRODUCTS_PER_PAGE } from "@/config/constants";

// Mock data for development when Supabase is not configured
const MOCK_PRODUCTS: Product[] = [
  {
    id: "11111111-1111-1111-1111-111111111101",
    name: "Air Max Pulse",
    slug: "air-max-pulse",
    description: "Experience next-level comfort with the Air Max Pulse. Featuring a visible Air unit and plush cushioning for all-day wear.",
    mrp: 12995,
    sale_price: 9999,
    category: "sneakers",
    brand: "Nike",
    gender: "men",
    is_featured: true,
    is_active: true,
    stock: 50,
    avg_rating: 0,
    rating_count: 0,
    created_at: new Date().toISOString(),
    images: [{ id: "img-1", product_id: "11111111-1111-1111-1111-111111111101", url: "/placeholder/shoe-1.jpg", alt: "Air Max Pulse", position: 0 }],
    variants: [
      { id: "v-1", product_id: "11111111-1111-1111-1111-111111111101", size: "7", color: "Black", color_hex: "#000000", sku: "AMP-BLK-7", stock: 8, price_override: null },
      { id: "v-2", product_id: "11111111-1111-1111-1111-111111111101", size: "8", color: "Black", color_hex: "#000000", sku: "AMP-BLK-8", stock: 10, price_override: null },
      { id: "v-3", product_id: "11111111-1111-1111-1111-111111111101", size: "9", color: "Black", color_hex: "#000000", sku: "AMP-BLK-9", stock: 12, price_override: null },
      { id: "v-4", product_id: "11111111-1111-1111-1111-111111111101", size: "10", color: "Black", color_hex: "#000000", sku: "AMP-BLK-10", stock: 10, price_override: null },
      { id: "v-5", product_id: "11111111-1111-1111-1111-111111111101", size: "8", color: "White", color_hex: "#FFFFFF", sku: "AMP-WHT-8", stock: 5, price_override: null },
      { id: "v-6", product_id: "11111111-1111-1111-1111-111111111101", size: "9", color: "White", color_hex: "#FFFFFF", sku: "AMP-WHT-9", stock: 5, price_override: null },
    ],
  },
  {
    id: "11111111-1111-1111-1111-111111111102",
    name: "Classic Leather Club",
    slug: "classic-leather-club",
    description: "Timeless style meets modern comfort. Premium leather upper with cushioned insole.",
    mrp: 8999,
    sale_price: 6499,
    category: "casual",
    brand: "Reebok",
    gender: "men",
    is_featured: true,
    is_active: true,
    stock: 35,
    avg_rating: 0,
    rating_count: 0,
    created_at: new Date().toISOString(),
    images: [{ id: "img-2", product_id: "11111111-1111-1111-1111-111111111102", url: "/placeholder/shoe-2.jpg", alt: "Classic Leather Club", position: 0 }],
    variants: [
      { id: "v-7", product_id: "11111111-1111-1111-1111-111111111102", size: "7", color: "White", color_hex: "#FFFFFF", sku: "CLC-WHT-7", stock: 10, price_override: null },
      { id: "v-8", product_id: "11111111-1111-1111-1111-111111111102", size: "8", color: "White", color_hex: "#FFFFFF", sku: "CLC-WHT-8", stock: 10, price_override: null },
      { id: "v-9", product_id: "11111111-1111-1111-1111-111111111102", size: "9", color: "White", color_hex: "#FFFFFF", sku: "CLC-WHT-9", stock: 8, price_override: null },
    ],
  },
  {
    id: "11111111-1111-1111-1111-111111111103",
    name: "Ultraboost Light",
    slug: "ultraboost-light",
    description: "Our lightest Ultraboost ever. Responsive BOOST midsole for incredible energy return.",
    mrp: 16999,
    sale_price: 13999,
    category: "running",
    brand: "Adidas",
    gender: "women",
    is_featured: true,
    is_active: true,
    stock: 25,
    avg_rating: 0,
    rating_count: 0,
    created_at: new Date().toISOString(),
    images: [{ id: "img-3", product_id: "11111111-1111-1111-1111-111111111103", url: "/placeholder/shoe-3.jpg", alt: "Ultraboost Light", position: 0 }],
    variants: [
      { id: "v-10", product_id: "11111111-1111-1111-1111-111111111103", size: "6", color: "Pink", color_hex: "#FFB6C1", sku: "UBL-PNK-6", stock: 6, price_override: null },
      { id: "v-11", product_id: "11111111-1111-1111-1111-111111111103", size: "7", color: "Pink", color_hex: "#FFB6C1", sku: "UBL-PNK-7", stock: 8, price_override: null },
      { id: "v-12", product_id: "11111111-1111-1111-1111-111111111103", size: "8", color: "Pink", color_hex: "#FFB6C1", sku: "UBL-PNK-8", stock: 6, price_override: null },
    ],
  },
  {
    id: "11111111-1111-1111-1111-111111111104",
    name: "Suede Classic XXI",
    slug: "suede-classic-xxi",
    description: "The iconic suede sneaker, reinvented for today. Soft suede upper and rubber outsole.",
    mrp: 7999,
    sale_price: 5999,
    category: "sneakers",
    brand: "Puma",
    gender: "unisex",
    is_featured: true,
    is_active: true,
    stock: 40,
    avg_rating: 0,
    rating_count: 0,
    created_at: new Date().toISOString(),
    images: [{ id: "img-4", product_id: "11111111-1111-1111-1111-111111111104", url: "/placeholder/shoe-4.jpg", alt: "Suede Classic XXI", position: 0 }],
    variants: [
      { id: "v-13", product_id: "11111111-1111-1111-1111-111111111104", size: "7", color: "Blue", color_hex: "#4169E1", sku: "SC-BLU-7", stock: 10, price_override: null },
      { id: "v-14", product_id: "11111111-1111-1111-1111-111111111104", size: "8", color: "Blue", color_hex: "#4169E1", sku: "SC-BLU-8", stock: 10, price_override: null },
      { id: "v-15", product_id: "11111111-1111-1111-1111-111111111104", size: "9", color: "Blue", color_hex: "#4169E1", sku: "SC-BLU-9", stock: 10, price_override: null },
    ],
  },
  {
    id: "11111111-1111-1111-1111-111111111105",
    name: "Chuck Taylor All Star",
    slug: "chuck-taylor-all-star",
    description: "The original basketball shoe turned cultural icon. Canvas upper with rubber toe cap.",
    mrp: 5499,
    sale_price: 4499,
    category: "casual",
    brand: "Converse",
    gender: "unisex",
    is_featured: true,
    is_active: true,
    stock: 60,
    avg_rating: 0,
    rating_count: 0,
    created_at: new Date().toISOString(),
    images: [{ id: "img-5", product_id: "11111111-1111-1111-1111-111111111105", url: "/placeholder/shoe-5.jpg", alt: "Chuck Taylor All Star", position: 0 }],
    variants: [
      { id: "v-16", product_id: "11111111-1111-1111-1111-111111111105", size: "6", color: "Black", color_hex: "#000000", sku: "CT-BLK-6", stock: 15, price_override: null },
      { id: "v-17", product_id: "11111111-1111-1111-1111-111111111105", size: "7", color: "Black", color_hex: "#000000", sku: "CT-BLK-7", stock: 15, price_override: null },
      { id: "v-18", product_id: "11111111-1111-1111-1111-111111111105", size: "8", color: "Black", color_hex: "#000000", sku: "CT-BLK-8", stock: 15, price_override: null },
    ],
  },
  {
    id: "11111111-1111-1111-1111-111111111106",
    name: "GEL-Kayano 30",
    slug: "gel-kayano-30",
    description: "Premium stability running shoe with GEL technology and FlyteFoam cushioning.",
    mrp: 15999,
    sale_price: 12999,
    category: "running",
    brand: "ASICS",
    gender: "men",
    is_featured: false,
    is_active: true,
    stock: 20,
    avg_rating: 0,
    rating_count: 0,
    created_at: new Date().toISOString(),
    images: [{ id: "img-6", product_id: "11111111-1111-1111-1111-111111111106", url: "/placeholder/shoe-6.jpg", alt: "GEL-Kayano 30", position: 0 }],
    variants: [
      { id: "v-19", product_id: "11111111-1111-1111-1111-111111111106", size: "8", color: "Grey", color_hex: "#808080", sku: "GK-GRY-8", stock: 5, price_override: null },
      { id: "v-20", product_id: "11111111-1111-1111-1111-111111111106", size: "9", color: "Grey", color_hex: "#808080", sku: "GK-GRY-9", stock: 5, price_override: null },
      { id: "v-21", product_id: "11111111-1111-1111-1111-111111111106", size: "10", color: "Grey", color_hex: "#808080", sku: "GK-GRY-10", stock: 5, price_override: null },
    ],
  },
  {
    id: "11111111-1111-1111-1111-111111111107",
    name: "Old Skool",
    slug: "old-skool",
    description: "The first Vans shoe to feature the iconic side stripe. Canvas and suede upper.",
    mrp: 6499,
    sale_price: 5499,
    category: "sneakers",
    brand: "Vans",
    gender: "unisex",
    is_featured: true,
    is_active: true,
    stock: 45,
    avg_rating: 0,
    rating_count: 0,
    created_at: new Date().toISOString(),
    images: [{ id: "img-7", product_id: "11111111-1111-1111-1111-111111111107", url: "/placeholder/shoe-7.jpg", alt: "Old Skool", position: 0 }],
    variants: [
      { id: "v-22", product_id: "11111111-1111-1111-1111-111111111107", size: "7", color: "Black", color_hex: "#000000", sku: "OS-BLK-7", stock: 12, price_override: null },
      { id: "v-23", product_id: "11111111-1111-1111-1111-111111111107", size: "8", color: "Black", color_hex: "#000000", sku: "OS-BLK-8", stock: 12, price_override: null },
      { id: "v-24", product_id: "11111111-1111-1111-1111-111111111107", size: "9", color: "Black", color_hex: "#000000", sku: "OS-BLK-9", stock: 12, price_override: null },
    ],
  },
  {
    id: "11111111-1111-1111-1111-111111111108",
    name: "Fresh Foam X 1080v13",
    slug: "fresh-foam-1080v13",
    description: "Plush comfort meets performance. Engineered mesh upper with Fresh Foam X midsole.",
    mrp: 14999,
    sale_price: 11999,
    category: "running",
    brand: "New Balance",
    gender: "women",
    is_featured: false,
    is_active: true,
    stock: 30,
    avg_rating: 0,
    rating_count: 0,
    created_at: new Date().toISOString(),
    images: [{ id: "img-8", product_id: "11111111-1111-1111-1111-111111111108", url: "/placeholder/shoe-8.jpg", alt: "Fresh Foam 1080v13", position: 0 }],
    variants: [
      { id: "v-25", product_id: "11111111-1111-1111-1111-111111111108", size: "6", color: "Teal", color_hex: "#008080", sku: "FF-TEL-6", stock: 8, price_override: null },
      { id: "v-26", product_id: "11111111-1111-1111-1111-111111111108", size: "7", color: "Teal", color_hex: "#008080", sku: "FF-TEL-7", stock: 8, price_override: null },
      { id: "v-27", product_id: "11111111-1111-1111-1111-111111111108", size: "8", color: "Teal", color_hex: "#008080", sku: "FF-TEL-8", stock: 7, price_override: null },
    ],
  },
];

function isSupabaseConfigured(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://your-project.supabase.co"
  );
}

function applyFilters(products: Product[], filters?: ProductFilters): Product[] {
  let result = products;
  if (filters?.category) {
    result = result.filter((p) => p.category === filters.category);
  }
  if (filters?.gender) {
    result = result.filter((p) => p.gender === filters.gender || p.gender === "unisex");
  }
  if (filters?.brand) {
    result = result.filter((p) => p.brand?.toLowerCase() === filters.brand?.toLowerCase());
  }
  if (filters?.minPrice !== undefined) {
    result = result.filter((p) => p.sale_price >= filters.minPrice!);
  }
  if (filters?.maxPrice !== undefined) {
    result = result.filter((p) => p.sale_price <= filters.maxPrice!);
  }
  if (filters?.size) {
    result = result.filter((p) =>
      p.variants.some((v) => v.size === filters.size && v.stock > 0)
    );
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }
  return result;
}

function applySort(products: Product[], sort?: SortOption): Product[] {
  const sorted = [...products];
  switch (sort) {
    case "price_asc":
      return sorted.sort((a, b) => a.sale_price - b.sale_price);
    case "price_desc":
      return sorted.sort((a, b) => b.sale_price - a.sale_price);
    case "popular":
      return sorted.sort((a, b) => b.rating_count - a.rating_count);
    case "newest":
    default:
      return sorted.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }
}

export async function getProducts(
  filters?: ProductFilters,
  sort?: SortOption,
  page: number = 1,
  pageSize: number = PRODUCTS_PER_PAGE
): Promise<ProductListResponse> {
  if (!isSupabaseConfigured()) {
    const filtered = applyFilters(MOCK_PRODUCTS, filters);
    const sorted = applySort(filtered, sort);
    const start = (page - 1) * pageSize;
    const paged = sorted.slice(start, start + pageSize);
    return {
      products: paged,
      total: filtered.length,
      page,
      pageSize,
      hasMore: start + pageSize < filtered.length,
    };
  }

  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("products")
    .select("*, images:product_images(*), variants:product_variants(*)", { count: "exact" })
    .eq("is_active", true);

  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.gender) query = query.or(`gender.eq.${filters.gender},gender.eq.unisex`);
  if (filters?.brand) query = query.ilike("brand", filters.brand);
  if (filters?.minPrice !== undefined) query = query.gte("sale_price", filters.minPrice);
  if (filters?.maxPrice !== undefined) query = query.lte("sale_price", filters.maxPrice);
  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,brand.ilike.%${filters.search}%,category.ilike.%${filters.search}%`
    );
  }

  switch (sort) {
    case "price_asc":
      query = query.order("sale_price", { ascending: true });
      break;
    case "price_desc":
      query = query.order("sale_price", { ascending: false });
      break;
    case "popular":
      query = query.order("rating_count", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const start = (page - 1) * pageSize;
  query = query.range(start, start + pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const products = (data ?? []).map((p) => ({
    ...p,
    images: (p.images ?? []).sort((a: { position: number }, b: { position: number }) => a.position - b.position),
  })) as Product[];

  const total = count ?? 0;
  return {
    products,
    total,
    page,
    pageSize,
    hasMore: start + pageSize < total,
  };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (!isSupabaseConfigured()) {
    return MOCK_PRODUCTS.find((p) => p.slug === slug) ?? null;
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, images:product_images(*), variants:product_variants(*)")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error) return null;

  return {
    ...data,
    images: (data.images ?? []).sort((a: { position: number }, b: { position: number }) => a.position - b.position),
  } as Product;
}

export async function searchProducts(query: string, limit: number = 5): Promise<Product[]> {
  if (!isSupabaseConfigured()) {
    const q = query.toLowerCase();
    return MOCK_PRODUCTS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q)
    ).slice(0, limit);
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, images:product_images(*), variants:product_variants(*)")
    .eq("is_active", true)
    .or(`name.ilike.%${query}%,brand.ilike.%${query}%`)
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as Product[];
}

export async function getFeaturedProducts(limit: number = 6): Promise<Product[]> {
  if (!isSupabaseConfigured()) {
    return MOCK_PRODUCTS.filter((p) => p.is_featured).slice(0, limit);
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, images:product_images(*), variants:product_variants(*)")
    .eq("is_active", true)
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as Product[];
}
