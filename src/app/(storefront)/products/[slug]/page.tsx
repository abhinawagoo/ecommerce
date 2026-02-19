import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug } from "@/services/product.service";
import { ProductDetailClient } from "@/components/product/product-detail-client";
import { formatCurrency } from "@/lib/utils";
import { siteConfig } from "@/config/site";

interface ProductPageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return { title: "Product Not Found" };

  return {
    title: product.name,
    description: product.description ?? `${product.name} - ${formatCurrency(product.sale_price)} at ${siteConfig.name}`,
    openGraph: {
      title: product.name,
      description: product.description ?? undefined,
      images: product.images?.[0]?.url ? [product.images[0].url] : undefined,
    },
  };
}

export const revalidate = 60;

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await getProductBySlug(params.slug);

  if (!product) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <ProductDetailClient product={product} />
    </div>
  );
}
