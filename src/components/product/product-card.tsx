import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { PriceDisplay } from "@/components/shared/price-display";
import { StockBadge } from "@/components/shared/stock-badge";
import type { Product } from "@/types/product";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const primaryImage = product.images?.[0];

  return (
    <Link href={`/products/${product.slug}`}>
      <Card className="group overflow-hidden border hover:shadow-md transition-shadow">
        <div className="relative aspect-square bg-muted overflow-hidden">
          {primaryImage ? (
            <Image
              src={primaryImage.url}
              alt={primaryImage.alt ?? product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No Image
            </div>
          )}
          <div className="absolute top-2 right-2">
            <StockBadge stock={product.stock} />
          </div>
        </div>
        <CardContent className="p-3">
          {product.brand && (
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">
              {product.brand}
            </p>
          )}
          <h3 className="text-sm font-medium truncate mb-1">{product.name}</h3>
          <PriceDisplay mrp={product.mrp} salePrice={product.sale_price} size="sm" />
        </CardContent>
      </Card>
    </Link>
  );
}
