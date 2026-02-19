"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Package } from "lucide-react";
import { cn } from "@/lib/utils";

const accountNav = [
  { label: "My Orders", href: "/account/orders", icon: Package },
  { label: "Addresses", href: "/account/addresses", icon: MapPin },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-xl font-semibold mb-6">My Account</h1>
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar nav */}
        <nav className="flex md:flex-col gap-2 md:w-48 shrink-0 overflow-x-auto md:overflow-visible">
          {accountNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm rounded-md whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
