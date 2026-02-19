"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, ShoppingBag, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MobileNav } from "./mobile-nav";
import { SearchBar } from "./search-bar";
import { useCart } from "@/providers/cart-provider";
import { useAuth } from "@/hooks/use-auth";
import { mainNav } from "@/config/navigation";
import { siteConfig } from "@/config/site";

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const { itemCount } = useCart();
  const { session, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center gap-4 px-4">
        <MobileNav />

        <Link href="/" className="font-bold text-lg shrink-0">
          {siteConfig.name}
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 ml-6">
          {mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex-1" />

        {/* Search */}
        {searchOpen ? (
          <div className="absolute inset-x-0 top-0 h-14 bg-background z-50 flex items-center px-4 gap-2 border-b">
            <div className="flex-1 max-w-lg mx-auto">
              <SearchBar onClose={() => setSearchOpen(false)} />
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSearchOpen(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)}>
            <Search className="h-5 w-5" />
            <span className="sr-only">Search</span>
          </Button>
        )}

        {/* Auth */}
        {session.isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
                <span className="sr-only">Account</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{session.user?.full_name ?? "My Account"}</p>
                <p className="text-xs text-muted-foreground">{session.user?.phone}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/account/orders">My Orders</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/account/addresses">Addresses</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link href="/login">
            <Button variant="ghost" size="sm" className="hidden sm:flex">
              Login
            </Button>
            <Button variant="ghost" size="icon" className="sm:hidden">
              <User className="h-5 w-5" />
              <span className="sr-only">Login</span>
            </Button>
          </Link>
        )}

        {/* Cart */}
        <Link href="/cart">
          <Button variant="ghost" size="icon" className="relative">
            <ShoppingBag className="h-5 w-5" />
            {itemCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]">
                {itemCount}
              </Badge>
            )}
            <span className="sr-only">Cart</span>
          </Button>
        </Link>
      </div>
    </header>
  );
}
