"use client";

import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Menu } from "lucide-react";
import { mainNav, categories } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { useState } from "react";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle className="text-left">{siteConfig.name}</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 mt-6">
          {mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="px-3 py-2 text-sm font-medium rounded-md hover:bg-muted transition-colors"
            >
              {item.label}
            </Link>
          ))}
          <Separator className="my-3" />
          <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Categories
          </p>
          {categories.map((cat) => (
            <Link
              key={cat.href}
              href={cat.href}
              onClick={() => setOpen(false)}
              className="px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
            >
              {cat.label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
