import Link from "next/link";
import { siteConfig } from "@/config/site";

export function Footer() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-semibold text-sm mb-3">Shop</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/products?gender=men" className="hover:text-foreground transition-colors">Men</Link></li>
              <li><Link href="/products?gender=women" className="hover:text-foreground transition-colors">Women</Link></li>
              <li><Link href="/products?gender=kids" className="hover:text-foreground transition-colors">Kids</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-sm mb-3">Categories</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/products?category=sneakers" className="hover:text-foreground transition-colors">Sneakers</Link></li>
              <li><Link href="/products?category=running" className="hover:text-foreground transition-colors">Running</Link></li>
              <li><Link href="/products?category=casual" className="hover:text-foreground transition-colors">Casual</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-sm mb-3">Help</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-foreground transition-colors">Contact Us</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Shipping Info</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Returns</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-sm mb-3">About</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-foreground transition-colors">Our Story</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
