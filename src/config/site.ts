export const siteConfig = {
  name: "ShoeStore",
  description: "Premium shoes & fashion for everyone",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  currency: "INR",
  currencySymbol: "Rs.",
  locale: "en-IN",
} as const;
