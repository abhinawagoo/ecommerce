"use client";

import { useState } from "react";
import { ProductImageGallery } from "./product-image-gallery";
import { VariantSelector } from "./variant-selector";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { PriceDisplay } from "@/components/shared/price-display";
import { StockBadge } from "@/components/shared/stock-badge";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Product, ProductVariant } from "@/types/product";

interface ProductDetailClientProps {
  product: Product;
}

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants.length > 0 ? product.variants[0] : null
  );

  const currentPrice = selectedVariant?.price_override ?? product.sale_price;
  const currentStock = selectedVariant?.stock ?? product.stock;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Images */}
      <ProductImageGallery images={product.images} productName={product.name} />

      {/* Details */}
      <div className="space-y-4">
        {product.brand && (
          <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            {product.brand}
          </p>
        )}
        <h1 className="text-2xl font-bold">{product.name}</h1>

        <PriceDisplay mrp={product.mrp} salePrice={currentPrice} size="lg" />

        <div className="flex gap-2">
          <StockBadge stock={currentStock} />
          <Badge variant="outline" className="capitalize">{product.gender}</Badge>
          <Badge variant="outline" className="capitalize">{product.category}</Badge>
        </div>

        <Separator />

        {product.variants.length > 0 && (
          <>
            <VariantSelector
              variants={product.variants}
              selectedVariant={selectedVariant}
              onSelect={setSelectedVariant}
            />
            <Separator />
          </>
        )}

        <AddToCartButton product={product} selectedVariant={selectedVariant} />

        {product.description && (
          <div className="pt-4">
            <h2 className="text-sm font-semibold mb-2">Description</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {product.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
