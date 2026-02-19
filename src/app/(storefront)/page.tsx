import { HeroBanner } from "@/components/home/hero-banner";
import { CategoryScroll } from "@/components/home/category-scroll";
import { FeaturedProducts } from "@/components/home/featured-products";
import { getFeaturedProducts } from "@/services/product.service";

export const revalidate = 60;

export default async function HomePage() {
  const featuredProducts = await getFeaturedProducts(8);

  return (
    <>
      <HeroBanner />
      <CategoryScroll />
      <FeaturedProducts products={featuredProducts} />
    </>
  );
}
