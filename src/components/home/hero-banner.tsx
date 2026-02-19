import Link from "next/link";
import { Button } from "@/components/ui/button";

export function HeroBanner() {
  return (
    <section className="relative bg-gradient-to-br from-zinc-900 to-zinc-800 text-white">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-xl">
          <p className="text-sm font-medium uppercase tracking-wider text-zinc-400 mb-2">
            New Arrivals
          </p>
          <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
            Step Into Style
          </h1>
          <p className="text-zinc-300 mb-6 text-base md:text-lg">
            Discover the latest collection of shoes for every occasion. From casual sneakers to performance running shoes.
          </p>
          <div className="flex gap-3">
            <Link href="/products">
              <Button size="lg" variant="secondary">
                Shop Now
              </Button>
            </Link>
            <Link href="/products?is_featured=true">
              <Button size="lg" variant="outline" className="border-zinc-500 text-white hover:bg-zinc-800">
                View Featured
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
