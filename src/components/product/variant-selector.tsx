"use client";

import { Button } from "@/components/ui/button";
import type { ProductVariant } from "@/types/product";

interface VariantSelectorProps {
  variants: ProductVariant[];
  selectedVariant: ProductVariant | null;
  onSelect: (variant: ProductVariant) => void;
}

export function VariantSelector({ variants, selectedVariant, onSelect }: VariantSelectorProps) {
  // Group by color
  const colors = Array.from(new Set(variants.map((v) => v.color).filter(Boolean))) as string[];
  const colorHexMap = new Map(variants.map((v) => [v.color, v.color_hex]));

  // Get sizes for the selected color (or all sizes if no colors)
  const selectedColor = selectedVariant?.color ?? colors[0] ?? null;
  const sizesForColor = selectedColor
    ? variants.filter((v) => v.color === selectedColor)
    : variants;
  const allSizes = Array.from(new Set(variants.map((v) => v.size))).sort(
    (a, b) => parseFloat(a) - parseFloat(b)
  );

  return (
    <div className="space-y-4">
      {/* Color Selector */}
      {colors.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">
            Color: <span className="text-muted-foreground">{selectedColor}</span>
          </p>
          <div className="flex gap-2">
            {colors.map((color) => {
              const hex = colorHexMap.get(color) ?? "#ccc";
              const isSelected = selectedColor === color;
              return (
                <button
                  key={color}
                  onClick={() => {
                    const firstVariant = variants.find((v) => v.color === color);
                    if (firstVariant) onSelect(firstVariant);
                  }}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    isSelected ? "border-primary ring-2 ring-primary/20" : "border-muted"
                  }`}
                  style={{ backgroundColor: hex }}
                  title={color}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Size Selector */}
      <div>
        <p className="text-sm font-medium mb-2">
          Size: <span className="text-muted-foreground">{selectedVariant?.size ?? "Select a size"}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {allSizes.map((size) => {
            const variant = sizesForColor.find((v) => v.size === size);
            const isAvailable = variant && variant.stock > 0;
            const isSelected = selectedVariant?.id === variant?.id;

            return (
              <Button
                key={size}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                className="w-12 h-10"
                disabled={!isAvailable}
                onClick={() => {
                  if (variant) onSelect(variant);
                }}
              >
                {size}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
