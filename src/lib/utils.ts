import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-IN")}`
}

export function calculateDiscount(mrp: number, salePrice: number): number {
  if (mrp <= 0) return 0
  return Math.round(((mrp - salePrice) / mrp) * 100)
}

export function generateCartItemId(productId: string, variantId: string | null): string {
  return variantId ? `${productId}-${variantId}` : productId
}
