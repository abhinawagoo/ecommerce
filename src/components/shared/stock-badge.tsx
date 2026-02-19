import { Badge } from "@/components/ui/badge";

interface StockBadgeProps {
  stock: number;
}

export function StockBadge({ stock }: StockBadgeProps) {
  if (stock <= 0) {
    return (
      <Badge variant="destructive" className="text-xs">
        Out of Stock
      </Badge>
    );
  }

  if (stock <= 5) {
    return (
      <Badge variant="secondary" className="text-xs text-orange-700 bg-orange-50">
        Only {stock} left
      </Badge>
    );
  }

  return null;
}
