import Link from "next/link";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { categories } from "@/config/navigation";

const categoryIcons: Record<string, string> = {
  sneakers: "👟",
  running: "🏃",
  formal: "👞",
  casual: "🥿",
  sandals: "🩴",
  boots: "🥾",
};

export function CategoryScroll() {
  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        <h2 className="text-lg font-semibold mb-4">Shop by Category</h2>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-4 pb-4">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={category.href}
                className="flex flex-col items-center gap-2 min-w-[80px] group"
              >
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-2xl group-hover:bg-primary/10 transition-colors">
                  {categoryIcons[category.slug] ?? "👟"}
                </div>
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {category.label}
                </span>
              </Link>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </section>
  );
}
