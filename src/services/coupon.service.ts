import { createClient } from "@/lib/supabase/client";
import type { DbCoupon } from "@/types/database";

export interface CouponResult {
  valid: boolean;
  coupon?: DbCoupon;
  discountAmount?: number;
  message: string;
}

export async function validateCoupon(code: string, cartTotal: number): Promise<CouponResult> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", code.toUpperCase())
    .eq("is_active", true)
    .single();

  if (error || !data) {
    return { valid: false, message: "Invalid coupon code" };
  }

  const coupon = data as DbCoupon;
  const now = new Date();

  if (new Date(coupon.valid_from) > now) {
    return { valid: false, message: "This coupon is not yet active" };
  }

  if (new Date(coupon.valid_until) < now) {
    return { valid: false, message: "This coupon has expired" };
  }

  if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
    return { valid: false, message: "This coupon has reached its usage limit" };
  }

  if (cartTotal < coupon.min_order_amount) {
    return {
      valid: false,
      message: `Minimum order amount is Rs. ${coupon.min_order_amount}`,
    };
  }

  let discountAmount: number;
  if (coupon.discount_type === "percentage") {
    discountAmount = (cartTotal * coupon.discount_value) / 100;
    if (coupon.max_discount !== null) {
      discountAmount = Math.min(discountAmount, coupon.max_discount);
    }
  } else {
    discountAmount = coupon.discount_value;
  }

  discountAmount = Math.min(discountAmount, cartTotal);

  return {
    valid: true,
    coupon,
    discountAmount: Math.round(discountAmount * 100) / 100,
    message: `Coupon applied! You save Rs. ${discountAmount.toFixed(0)}`,
  };
}
