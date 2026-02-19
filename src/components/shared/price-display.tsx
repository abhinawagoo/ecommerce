import { formatCurrency, calculateDiscount } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface PriceDisplayProps {
  mrp: number;
  salePrice: number;
  size?: "sm" | "md" | "lg";
}

export function PriceDisplay({ mrp, salePrice, size = "md" }: PriceDisplayProps) {
  const discount = calculateDiscount(mrp, salePrice);
  const hasDiscount = discount > 0;

  const priceClasses = {
    sm: "text-sm font-semibold",
    md: "text-base font-semibold",
    lg: "text-xl font-bold",
  };

  const mrpClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={priceClasses[size]}>{formatCurrency(salePrice)}</span>
      {hasDiscount && (
        <>
          <span className={`${mrpClasses[size]} text-muted-foreground line-through`}>
            {formatCurrency(mrp)}
          </span>
          <Badge variant="secondary" className="text-xs text-green-700 bg-green-50">
            {discount}% off
          </Badge>
        </>
      )}
    </div>
  );
}
