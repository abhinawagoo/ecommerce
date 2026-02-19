"use client";

import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/providers/cart-provider";
import { useToast } from "@/hooks/use-toast";
import { generateCartItemId } from "@/lib/utils";
import type { Product, ProductVariant } from "@/types/product";

interface AddToCartButtonProps {
  product: Product;
  selectedVariant: ProductVariant | null;
}

export function AddToCartButton({ product, selectedVariant }: AddToCartButtonProps) {
  const { addItem } = useCart();
  const { toast } = useToast();

  const needsVariant = product.variants.length > 0;
  const disabled = needsVariant && !selectedVariant;
  const outOfStock = selectedVariant ? selectedVariant.stock <= 0 : product.stock <= 0;

  function handleAdd() {
    const price = selectedVariant?.price_override ?? product.sale_price;
    const imageUrl = product.images?.[0]?.url ?? "";

    addItem({
      id: generateCartItemId(product.id, selectedVariant?.id ?? null),
      productId: product.id,
      variantId: selectedVariant?.id ?? null,
      name: product.name,
      slug: product.slug,
      size: selectedVariant?.size ?? null,
      color: selectedVariant?.color ?? null,
      price,
      mrp: product.mrp,
      quantity: 1,
      imageUrl,
      maxStock: selectedVariant?.stock ?? product.stock,
    });

    toast({
      title: "Added to cart",
      description: `${product.name}${selectedVariant ? ` - Size ${selectedVariant.size}` : ""} added to your cart.`,
    });
  }

  if (outOfStock) {
    return (
      <Button disabled size="lg" className="w-full">
        Out of Stock
      </Button>
    );
  }

  return (
    <Button
      size="lg"
      className="w-full"
      disabled={disabled}
      onClick={handleAdd}
    >
      <ShoppingBag className="h-4 w-4 mr-2" />
      {disabled ? "Select a Size" : "Add to Cart"}
    </Button>
  );
}
