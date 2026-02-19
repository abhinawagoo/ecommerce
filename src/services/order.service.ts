import { createClient } from "@/lib/supabase/client";
import type { DbOrder, DbOrderItem } from "@/types/database";
import type { CartItem } from "@/types/cart";
import type { DbAddress } from "@/types/database";

export interface CreateOrderData {
  items: CartItem[];
  address: DbAddress;
  subtotal: number;
  discount: number;
  shippingCharge: number;
  total: number;
  couponCode?: string;
}

export interface RazorpayOrderResponse {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
}

export async function createRazorpayOrder(amount: number): Promise<RazorpayOrderResponse> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const { data, error } = await supabase.functions.invoke("create-razorpay-order", {
    body: {
      amount,
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    },
  });

  if (error) throw new Error(error.message || "Failed to create payment order");
  return data as RazorpayOrderResponse;
}

export async function verifyPaymentAndCreateOrder(
  razorpayPaymentData: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  },
  orderData: CreateOrderData
): Promise<{ order_id: string; order_number: string }> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const { data, error } = await supabase.functions.invoke("verify-payment", {
    body: {
      ...razorpayPaymentData,
      order_data: {
        subtotal: orderData.subtotal,
        discount: orderData.discount,
        shipping_charge: orderData.shippingCharge,
        total: orderData.total,
        coupon_code: orderData.couponCode ?? null,
        shipping_address: {
          full_name: orderData.address.full_name,
          phone: orderData.address.phone,
          address_line1: orderData.address.address_line1,
          address_line2: orderData.address.address_line2,
          city: orderData.address.city,
          state: orderData.address.state,
          pincode: orderData.address.pincode,
        },
        items: orderData.items.map((item) => ({
          product_id: item.productId,
          variant_id: item.variantId,
          product_name: item.name,
          variant_info: [item.color, item.size ? `Size ${item.size}` : null]
            .filter(Boolean)
            .join(" / ") || null,
          price: item.price,
          quantity: item.quantity,
        })),
      },
    },
  });

  if (error) throw new Error(error.message || "Payment verification failed");
  return data;
}

export async function getOrders(page: number = 1, pageSize: number = 10): Promise<{ orders: DbOrder[]; total: number }> {
  const supabase = createClient();
  const start = (page - 1) * pageSize;

  const { data, error, count } = await supabase
    .from("orders")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(start, start + pageSize - 1);

  if (error) throw new Error(error.message);
  return { orders: (data ?? []) as DbOrder[], total: count ?? 0 };
}

export async function getOrderById(orderId: string): Promise<{ order: DbOrder; items: DbOrderItem[] } | null> {
  const supabase = createClient();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderError || !order) return null;

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);

  if (itemsError) return null;

  return {
    order: order as DbOrder,
    items: (items ?? []) as DbOrderItem[],
  };
}
