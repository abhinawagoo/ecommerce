export const mainNav = [
  { label: "Men", href: "/products?gender=men" },
  { label: "Women", href: "/products?gender=women" },
  { label: "Kids", href: "/products?gender=kids" },
] as const;

export const categories = [
  { label: "Sneakers", slug: "sneakers", href: "/products?category=sneakers" },
  { label: "Running", slug: "running", href: "/products?category=running" },
  { label: "Formal", slug: "formal", href: "/products?category=formal" },
  { label: "Casual", slug: "casual", href: "/products?category=casual" },
  { label: "Sandals", slug: "sandals", href: "/products?category=sandals" },
  { label: "Boots", slug: "boots", href: "/products?category=boots" },
] as const;
