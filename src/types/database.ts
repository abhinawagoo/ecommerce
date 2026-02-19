export interface DbUser {
  id: string;
  phone: string | null;
  full_name: string | null;
  role: "customer" | "admin";
  created_at: string;
  updated_at: string;
}

export interface DbProduct {
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
  updated_at: string;
}

export interface DbProductImage {
  id: string;
  product_id: string;
  url: string;
  alt: string | null;
  position: number;
  created_at: string;
}

export interface DbProductVariant {
  id: string;
  product_id: string;
  size: string;
  color: string | null;
  color_hex: string | null;
  sku: string;
  stock: number;
  price_override: number | null;
  created_at: string;
}

export interface DbAddress {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbOrder {
  id: string;
  user_id: string;
  order_number: string;
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "returned" | "refunded";
  subtotal: number;
  discount: number;
  shipping_charge: number;
  total: number;
  coupon_code: string | null;
  shipping_address: Record<string, unknown>;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  invoice_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  variant_info: string | null;
  price: number;
  quantity: number;
  total: number;
  created_at: string;
}

export interface DbCoupon {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_amount: number;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  valid_from: string;
  valid_until: string;
  created_at: string;
}

export interface DbAdminSetting {
  id: string;
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
}
