"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import * as orderService from "@/services/order.service";
import type { DbOrder, DbOrderItem } from "@/types/database";

interface OrderSuccessPageProps {
  params: { orderId: string };
}

export default function OrderSuccessPage({ params }: OrderSuccessPageProps) {
  const [order, setOrder] = useState<DbOrder | null>(null);
  const [items, setItems] = useState<DbOrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadOrder() {
      try {
        const result = await orderService.getOrderById(params.orderId);
        if (result) {
          setOrder(result.order);
          setItems(result.items);
        }
      } catch {
        // Order may not be accessible yet
      } finally {
        setIsLoading(false);
      }
    }
    loadOrder();
  }, [params.orderId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-lg text-center">
      <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
      <h1 className="text-2xl font-bold mb-2">Order Confirmed!</h1>
      <p className="text-muted-foreground mb-6">
        Thank you for your order. We&apos;ll send you updates on WhatsApp.
      </p>

      {order && (
        <Card className="text-left mb-6">
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Order Number</span>
              <span className="font-mono font-medium">{order.order_number}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <span className="capitalize font-medium text-green-700">{order.status}</span>
            </div>
            <Separator />
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {item.product_name}
                  {item.variant_info && ` (${item.variant_info})`}
                  {" x"}{item.quantity}
                </span>
                <span>{formatCurrency(item.total)}</span>
              </div>
            ))}
            <Separator />
            {order.discount > 0 && (
              <div className="flex justify-between text-sm text-green-700">
                <span>Discount</span>
                <span>-{formatCurrency(order.discount)}</span>
              </div>
            )}
            {order.shipping_charge > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span>{formatCurrency(order.shipping_charge)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold">
              <span>Total Paid</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/account/orders">
          <Button variant="outline">
            <Package className="h-4 w-4 mr-2" />
            View Orders
          </Button>
        </Link>
        <Link href="/products">
          <Button>Continue Shopping</Button>
        </Link>
      </div>
    </div>
  );
}
