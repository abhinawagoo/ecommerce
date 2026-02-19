"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SlidersHorizontal, X } from "lucide-react";
import { categories } from "@/config/navigation";
import { SIZE_OPTIONS, GENDER_OPTIONS } from "@/config/constants";

export function ProductFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentCategory = searchParams.get("category") ?? "";
  const currentGender = searchParams.get("gender") ?? "";
  const currentSize = searchParams.get("size") ?? "";

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`/products?${params.toString()}`);
    },
    [router, searchParams]
  );

  const clearFilters = useCallback(() => {
    router.push("/products");
  }, [router]);

  const hasFilters = currentCategory || currentGender || currentSize;

  const filterContent = (
    <div className="space-y-6">
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full justify-start text-muted-foreground">
          <X className="h-4 w-4 mr-2" /> Clear all filters
        </Button>
      )}

      {/* Gender */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Gender</h3>
        <div className="flex flex-wrap gap-2">
          {GENDER_OPTIONS.map((gender) => (
            <Button
              key={gender}
              variant={currentGender === gender ? "default" : "outline"}
              size="sm"
              onClick={() => updateFilter("gender", currentGender === gender ? "" : gender)}
              className="capitalize"
            >
              {gender}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Category */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Category</h3>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <Button
              key={cat.slug}
              variant={currentCategory === cat.slug ? "default" : "outline"}
              size="sm"
              onClick={() => updateFilter("category", currentCategory === cat.slug ? "" : cat.slug)}
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Size */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Size</h3>
        <div className="flex flex-wrap gap-2">
          {SIZE_OPTIONS.map((size) => (
            <Button
              key={size}
              variant={currentSize === size ? "default" : "outline"}
              size="sm"
              className="w-10 h-10 p-0"
              onClick={() => updateFilter("size", currentSize === size ? "" : size)}
            >
              {size}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile: Sheet trigger */}
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
              {hasFilters && (
                <span className="ml-1 bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">
                  {[currentCategory, currentGender, currentSize].filter(Boolean).length}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="mt-6">{filterContent}</div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: Sidebar */}
      <div className="hidden md:block w-56 shrink-0">
        <h2 className="text-sm font-semibold mb-4">Filters</h2>
        {filterContent}
      </div>
    </>
  );
}
