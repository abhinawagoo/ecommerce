import { Suspense } from "react";
import type { Metadata } from "next";
import { getProducts } from "@/services/product.service";
import { ProductGrid } from "@/components/product/product-grid";
import { ProductFilters } from "@/components/product/product-filters";
import { ProductSort } from "@/components/product/product-sort";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProductFilters as FilterType, SortOption } from "@/types/product";

export const metadata: Metadata = {
  title: "All Products",
  description: "Browse our collection of shoes and footwear.",
};

export const revalidate = 60;

interface ProductsPageProps {
  searchParams: {
    category?: string;
    gender?: string;
    size?: string;
    search?: string;
    sort?: string;
    page?: string;
  };
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="aspect-square rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

async function ProductList({
  filters,
  sort,
  page,
}: {
  filters: FilterType;
  sort: SortOption;
  page: number;
}) {
  const { products, total } = await getProducts(filters, sort, page);

  if (products.length === 0) {
    return <EmptyState title="No products found" description="Try adjusting your filters or search term." />;
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        {total} product{total !== 1 ? "s" : ""} found
      </p>
      <ProductGrid products={products} />
    </div>
  );
}

export default function ProductsPage({ searchParams }: ProductsPageProps) {
  const filters: FilterType = {
    category: searchParams.category,
    gender: searchParams.gender,
    size: searchParams.size,
    search: searchParams.search,
  };
  const sort = (searchParams.sort as SortOption) ?? "newest";
  const page = parseInt(searchParams.page ?? "1", 10);

  return (
    <div className="container mx-auto px-4 py-6">
      {searchParams.search && (
        <h1 className="text-xl font-semibold mb-4">
          Results for &ldquo;{searchParams.search}&rdquo;
        </h1>
      )}
      <div className="flex gap-8">
        <Suspense fallback={null}>
          <ProductFilters />
        </Suspense>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div className="md:hidden" />
            <Suspense fallback={null}>
              <ProductSort />
            </Suspense>
          </div>
          <Suspense fallback={<ProductGridSkeleton />}>
            <ProductList filters={filters} sort={sort} page={page} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
