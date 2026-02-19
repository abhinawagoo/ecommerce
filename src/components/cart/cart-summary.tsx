"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { useCart } from "@/providers/cart-provider";

export function CartSummary() {
  const { subtotal, mrpTotal, discount, itemCount } = useCart();

  return (
    <div className="bg-muted/40 rounded-lg p-4 space-y-3">
      <h2 className="font-semibold">Order Summary</h2>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal ({itemCount} items)</span>
          <span>{formatCurrency(mrpTotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-green-700">
            <span>Discount</span>
            <span>-{formatCurrency(discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-muted-foreground">
          <span>Shipping</span>
          <span>Calculated at checkout</span>
        </div>
      </div>
      <Separator />
      <div className="flex justify-between font-semibold">
        <span>Estimated Total</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>
      <Link href="/checkout">
        <Button className="w-full" size="lg">
          Proceed to Checkout
        </Button>
      </Link>
    </div>
  );
}
