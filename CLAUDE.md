# Ecommerce Project Context

## What is this?
Single-tenant ecommerce storefront for shoes & fashion. Built with Next.js 14 (App Router) + Supabase + Tailwind + ShadCN UI.

## Tech Stack
- **Framework**: Next.js 14.2 (App Router, `src/` dir, TypeScript strict)
- **Database**: Supabase (Postgres + Auth + Edge Functions)
- **Styling**: Tailwind CSS + ShadCN UI (components in `src/components/ui/`)
- **State**: React Context (cart, auth) + TanStack React Query (server data)
- **Payment**: Razorpay (checkout.js widget)
- **Storage**: Cloudflare R2 (S3-compatible, for product images)
- **Package Manager**: pnpm

## Architecture Rules

### Service Layer Pattern (Critical)
```
UI Component --> hook --> service --> Supabase (swappable)
```
- **UI components NEVER import Supabase directly**
- All data access goes through `src/services/*.service.ts`
- Services return plain TypeScript types, never Supabase query builders
- When migrating to DigitalOcean later, swap service implementations only

### Server vs Client Components
- **Server Components** (default): product listing, detail, homepage — use `revalidate: 60`
- **Client Components** (`"use client"`): cart, search, filters, variant selector, auth
- Only add `"use client"` when the component needs browser APIs or interactivity

### Data Fetching
- Server Components for SSR pages (product listing, detail, homepage)
- React Query only for client-side interactivity (cart sync, search-as-you-type)
- URL search params for filters/sort (bookmarkable, shareable)

### State Management
- Cart: React Context + useReducer + localStorage (merges to server on auth)
- Auth: React Context wrapping Supabase auth state
- No Zustand/Redux needed

## Key File Locations

### App Routes
```
src/app/(storefront)/               # Public storefront (wrapped in Header+Footer)
  page.tsx                           # Homepage
  products/page.tsx                  # Product listing with filters
  products/[slug]/page.tsx           # Product detail (generateMetadata for SEO)
  cart/page.tsx                      # Shopping cart
  login/page.tsx                     # WhatsApp OTP login
  checkout/page.tsx                  # 3-step checkout (address→coupon→payment)
  order-success/[orderId]/page.tsx   # Order confirmation
  account/layout.tsx                 # Account sidebar layout
  account/addresses/page.tsx         # Address CRUD
  account/orders/page.tsx            # Order history
src/app/api/health/route.ts          # Health check
src/app/api/search/route.ts          # Search API
```

### Services (data layer)
```
src/services/product.service.ts      # getProducts, getProductBySlug, searchProducts, getFeaturedProducts
src/services/cart.service.ts         # localStorage cart + server sync (getServerCart, syncCartToServer)
src/services/auth.service.ts         # sendOtp, verifyOtp, getSession, logout
src/services/address.service.ts      # CRUD + pincode lookup
src/services/coupon.service.ts       # validateCoupon
src/services/order.service.ts        # createRazorpayOrder, verifyPaymentAndCreateOrder, getOrders
src/services/types.ts                # Vendor-agnostic interfaces (IProductService, ICartService)
```

### Supabase
```
src/lib/supabase/client.ts           # Browser client (createBrowserClient)
src/lib/supabase/server.ts           # Server client with cookie handling
supabase/migrations/00001_*.sql      # Schema: products, variants, images, users, orders, cart, coupons, admin_settings
supabase/migrations/00002_*.sql      # Phase 2: OTP codes table, stock reduction functions
supabase/functions/send-otp/         # Edge Function: generate + send OTP via WhatsApp
supabase/functions/verify-otp/       # Edge Function: verify OTP, create user, return JWT
supabase/functions/create-razorpay-order/  # Edge Function: create Razorpay order
supabase/functions/verify-payment/   # Edge Function: HMAC-SHA256 verify, create order, reduce stock
```

### Types
```
src/types/product.ts                 # Product, ProductImage, ProductVariant, ProductFilters, ProductListResponse
src/types/cart.ts                    # CartItem, CartState, CartAction
src/types/database.ts                # All Db* types (DbUser, DbProduct, DbOrder, etc.)
src/types/common.ts                  # PaginationParams, ApiError, SearchParams
src/types/razorpay.d.ts              # Window.Razorpay type declarations
```

### Config
```
src/config/site.ts                   # Site name, currency, locale
src/config/navigation.ts             # Main nav links, categories list
src/config/constants.ts              # PRODUCTS_PER_PAGE, SORT_OPTIONS, SIZE_OPTIONS, STALE_TIME
```

## Database Schema (10 tables)
- **users**: extends auth.users, has role (customer/admin)
- **products**: name, slug, mrp, sale_price, stock, category, brand, gender, is_featured
- **product_images**: url, position ordering
- **product_variants**: size, color, color_hex, sku, stock per variant
- **addresses**: full address with pincode, is_default (trigger ensures single default)
- **cart**: server-side cart (user_id, product_id, variant_id, quantity)
- **orders**: order_number (auto-generated), status workflow, razorpay fields, shipping_address JSONB
- **order_items**: snapshots of product name, variant, price at order time
- **coupons**: percentage/fixed, usage limits, validity dates
- **admin_settings**: key-value JSONB store
- **otp_codes**: phone, code, attempts, expires_at

RLS: public read for products/variants/images, user-scoped for cart/orders/addresses, admin-scoped for management.

## Conventions

### Money
- Stored as `NUMERIC(10,2)` in DB, `number` in TypeScript (INR, no decimals confusion)
- Display with `formatCurrency()` from `src/lib/utils.ts` → "Rs. X,XXX"

### Images
- R2 paths: `products/{product_id}/{uuid}.webp`
- Next.js Image with responsive sizes, lazy loading
- Priority on PDP first image

### Auth Flow
- Phone → WhatsApp OTP (via Supabase Edge Function) → Verify → JWT session
- Middleware protects `/checkout` and `/account/*`, redirects to `/login?redirect=...`
- Cart merges localStorage → server on login (server wins conflicts, quantities add)

### Checkout Flow
- Step 1: Select delivery address → Step 2: Apply coupon → Step 3: Razorpay payment
- On payment success: edge function verifies signature, creates order, reduces stock atomically, clears cart

### Mock Data
- `product.service.ts` has built-in MOCK_PRODUCTS array
- Falls back to mock data when `NEXT_PUBLIC_SUPABASE_URL` is placeholder
- 8 seed products with variants in SQL migration

## Commands
```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm lint         # ESLint
```

## Environment Variables
See `.env.example`. Key ones:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — server-only
- `R2_*` — Cloudflare R2 storage
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — payment
- `NEXT_PUBLIC_RAZORPAY_KEY_ID` — client-side payment
- `WHATSAPP_API_URL` / `WHATSAPP_API_KEY` — OTP delivery

## Completed Phases
- **Phase 1**: Scaffolding, schema, storefront (homepage, listing, detail, cart)
- **Phase 2**: Auth (WhatsApp OTP), checkout, Razorpay, address management, cart merge, orders

## Remaining Phases
- **Phase 3**: Order management, invoice PDF, WhatsApp notifications
- **Phase 4**: Admin dashboard (products, orders, coupons, settings, CSV export)
- **Phase 5**: Reviews, wishlist, related products, SEO sitemap, PWA
- **Phase 6**: DigitalOcean migration (swap service layer, self-host Postgres)

## Common Gotchas
- Supabase Edge Functions (in `supabase/functions/`) use Deno — excluded from tsconfig
- ShadCN `use-toast.ts` has an eslint-disable for `actionTypes` (upstream issue)
- `useSearchParams()` in App Router pages requires a `<Suspense>` boundary (see login page)
- Product service returns relations; Supabase may return them as arrays — handle both cases
- Cart state shape has `lastUpdated` field designed for Phase 2 auth merge
