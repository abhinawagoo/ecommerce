-- ============================================================================
-- Ecommerce Schema - Phase 1
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS (extends Supabase auth.users)
-- ============================================================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_phone ON public.users(phone);
CREATE INDEX idx_users_role ON public.users(role);

-- ============================================================================
-- PRODUCTS
-- ============================================================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  mrp NUMERIC(10,2) NOT NULL CHECK (mrp >= 0),
  sale_price NUMERIC(10,2) NOT NULL CHECK (sale_price >= 0),
  category TEXT NOT NULL,
  brand TEXT,
  gender TEXT NOT NULL DEFAULT 'unisex' CHECK (gender IN ('men', 'women', 'kids', 'unisex')),
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  avg_rating NUMERIC(2,1) NOT NULL DEFAULT 0 CHECK (avg_rating >= 0 AND avg_rating <= 5),
  rating_count INTEGER NOT NULL DEFAULT 0 CHECK (rating_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_slug ON public.products(slug);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_gender ON public.products(gender);
CREATE INDEX idx_products_brand ON public.products(brand);
CREATE INDEX idx_products_is_featured ON public.products(is_featured) WHERE is_featured = true;
CREATE INDEX idx_products_is_active ON public.products(is_active) WHERE is_active = true;
CREATE INDEX idx_products_sale_price ON public.products(sale_price);
CREATE INDEX idx_products_created_at ON public.products(created_at DESC);
CREATE INDEX idx_products_search ON public.products USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(brand, '')));

-- ============================================================================
-- PRODUCT IMAGES
-- ============================================================================
CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_images_product_id ON public.product_images(product_id);

-- ============================================================================
-- PRODUCT VARIANTS (size + color combinations)
-- ============================================================================
CREATE TABLE public.product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size TEXT NOT NULL,
  color TEXT,
  color_hex TEXT,
  sku TEXT NOT NULL UNIQUE,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  price_override NUMERIC(10,2) CHECK (price_override IS NULL OR price_override >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX idx_product_variants_sku ON public.product_variants(sku);

-- ============================================================================
-- ADDRESSES
-- ============================================================================
CREATE TABLE public.addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_addresses_user_id ON public.addresses(user_id);

-- ============================================================================
-- CART (server-side for Phase 2)
-- ============================================================================
CREATE TABLE public.cart (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id, variant_id)
);

CREATE INDEX idx_cart_user_id ON public.cart(user_id);

-- ============================================================================
-- ORDERS
-- ============================================================================
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  order_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'refunded')),
  subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  discount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  shipping_charge NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (shipping_charge >= 0),
  total NUMERIC(10,2) NOT NULL CHECK (total >= 0),
  coupon_code TEXT,
  shipping_address JSONB NOT NULL,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  invoice_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_order_number ON public.orders(order_number);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);

-- ============================================================================
-- ORDER ITEMS
-- ============================================================================
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  variant_info TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total NUMERIC(10,2) NOT NULL CHECK (total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);

-- ============================================================================
-- COUPONS
-- ============================================================================
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  min_order_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_discount NUMERIC(10,2),
  usage_limit INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_coupons_code ON public.coupons(code);

-- ============================================================================
-- ADMIN SETTINGS (key-value store)
-- ============================================================================
CREATE TABLE public.admin_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default settings
INSERT INTO public.admin_settings (key, value) VALUES
  ('site', '{"name": "ShoeStore", "logo_url": null, "primary_color": "#000000"}'),
  ('shipping', '{"free_above": 999, "default_charge": 99}'),
  ('announcement', '{"text": "Free shipping on orders above Rs. 999!", "is_active": true}');

-- ============================================================================
-- TRIGGERS: auto-update updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_addresses_updated_at BEFORE UPDATE ON public.addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_cart_updated_at BEFORE UPDATE ON public.cart
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- TRIGGER: ensure only one default address per user
-- ============================================================================
CREATE OR REPLACE FUNCTION ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.addresses
    SET is_default = false
    WHERE user_id = NEW.user_id AND id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_addresses_default BEFORE INSERT OR UPDATE ON public.addresses
  FOR EACH ROW EXECUTE FUNCTION ensure_single_default_address();

-- ============================================================================
-- TRIGGER: generate order number
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number = 'ORD-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(nextval('order_number_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE order_number_seq START 1;

CREATE TRIGGER tr_orders_number BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Products, images, variants: public read
CREATE POLICY "products_public_read" ON public.products FOR SELECT USING (is_active = true);
CREATE POLICY "product_images_public_read" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "product_variants_public_read" ON public.product_variants FOR SELECT USING (true);
CREATE POLICY "coupons_public_read" ON public.coupons FOR SELECT USING (is_active = true);
CREATE POLICY "admin_settings_public_read" ON public.admin_settings FOR SELECT USING (true);

-- Users: own data
CREATE POLICY "users_own_read" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_own_update" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Addresses: user-scoped
CREATE POLICY "addresses_own_read" ON public.addresses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "addresses_own_insert" ON public.addresses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "addresses_own_update" ON public.addresses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "addresses_own_delete" ON public.addresses FOR DELETE USING (auth.uid() = user_id);

-- Cart: user-scoped
CREATE POLICY "cart_own_read" ON public.cart FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cart_own_insert" ON public.cart FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cart_own_update" ON public.cart FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "cart_own_delete" ON public.cart FOR DELETE USING (auth.uid() = user_id);

-- Orders: user-scoped read
CREATE POLICY "orders_own_read" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "order_items_own_read" ON public.order_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));

-- Admin: full access to all tables
CREATE POLICY "admin_users_all" ON public.users FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_products_all" ON public.products FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_product_images_all" ON public.product_images FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_product_variants_all" ON public.product_variants FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_orders_all" ON public.orders FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_order_items_all" ON public.order_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_coupons_all" ON public.coupons FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_settings_all" ON public.admin_settings FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================================
-- SEED DATA: Sample products for development
-- ============================================================================
INSERT INTO public.products (id, name, slug, description, mrp, sale_price, category, brand, gender, is_featured, stock) VALUES
  ('11111111-1111-1111-1111-111111111101', 'Air Max Pulse', 'air-max-pulse', 'Experience next-level comfort with the Air Max Pulse. Featuring a visible Air unit and plush cushioning for all-day wear.', 12995, 9999, 'sneakers', 'Nike', 'men', true, 50),
  ('11111111-1111-1111-1111-111111111102', 'Classic Leather Club', 'classic-leather-club', 'Timeless style meets modern comfort. Premium leather upper with cushioned insole.', 8999, 6499, 'casual', 'Reebok', 'men', true, 35),
  ('11111111-1111-1111-1111-111111111103', 'Ultraboost Light', 'ultraboost-light', 'Our lightest Ultraboost ever. Responsive BOOST midsole for incredible energy return.', 16999, 13999, 'running', 'Adidas', 'women', true, 25),
  ('11111111-1111-1111-1111-111111111104', 'Suede Classic XXI', 'suede-classic-xxi', 'The iconic suede sneaker, reinvented for today. Soft suede upper and rubber outsole.', 7999, 5999, 'sneakers', 'Puma', 'unisex', true, 40),
  ('11111111-1111-1111-1111-111111111105', 'Chuck Taylor All Star', 'chuck-taylor-all-star', 'The original basketball shoe turned cultural icon. Canvas upper with rubber toe cap.', 5499, 4499, 'casual', 'Converse', 'unisex', true, 60),
  ('11111111-1111-1111-1111-111111111106', 'GEL-Kayano 30', 'gel-kayano-30', 'Premium stability running shoe with GEL technology and FlyteFoam cushioning.', 15999, 12999, 'running', 'ASICS', 'men', false, 20),
  ('11111111-1111-1111-1111-111111111107', 'Old Skool', 'old-skool', 'The first Vans shoe to feature the iconic side stripe. Canvas and suede upper.', 6499, 5499, 'sneakers', 'Vans', 'unisex', true, 45),
  ('11111111-1111-1111-1111-111111111108', 'Fresh Foam X 1080v13', 'fresh-foam-1080v13', 'Plush comfort meets performance. Engineered mesh upper with Fresh Foam X midsole.', 14999, 11999, 'running', 'New Balance', 'women', false, 30);

INSERT INTO public.product_images (product_id, url, alt, position) VALUES
  ('11111111-1111-1111-1111-111111111101', '/placeholder/shoe-1.jpg', 'Air Max Pulse - Front', 0),
  ('11111111-1111-1111-1111-111111111101', '/placeholder/shoe-1-side.jpg', 'Air Max Pulse - Side', 1),
  ('11111111-1111-1111-1111-111111111102', '/placeholder/shoe-2.jpg', 'Classic Leather Club - Front', 0),
  ('11111111-1111-1111-1111-111111111103', '/placeholder/shoe-3.jpg', 'Ultraboost Light - Front', 0),
  ('11111111-1111-1111-1111-111111111104', '/placeholder/shoe-4.jpg', 'Suede Classic XXI - Front', 0),
  ('11111111-1111-1111-1111-111111111105', '/placeholder/shoe-5.jpg', 'Chuck Taylor All Star - Front', 0),
  ('11111111-1111-1111-1111-111111111106', '/placeholder/shoe-6.jpg', 'GEL-Kayano 30 - Front', 0),
  ('11111111-1111-1111-1111-111111111107', '/placeholder/shoe-7.jpg', 'Old Skool - Front', 0),
  ('11111111-1111-1111-1111-111111111108', '/placeholder/shoe-8.jpg', 'Fresh Foam 1080v13 - Front', 0);

INSERT INTO public.product_variants (product_id, size, color, color_hex, sku, stock) VALUES
  ('11111111-1111-1111-1111-111111111101', '7', 'Black', '#000000', 'AMP-BLK-7', 8),
  ('11111111-1111-1111-1111-111111111101', '8', 'Black', '#000000', 'AMP-BLK-8', 10),
  ('11111111-1111-1111-1111-111111111101', '9', 'Black', '#000000', 'AMP-BLK-9', 12),
  ('11111111-1111-1111-1111-111111111101', '10', 'Black', '#000000', 'AMP-BLK-10', 10),
  ('11111111-1111-1111-1111-111111111101', '8', 'White', '#FFFFFF', 'AMP-WHT-8', 5),
  ('11111111-1111-1111-1111-111111111101', '9', 'White', '#FFFFFF', 'AMP-WHT-9', 5),
  ('11111111-1111-1111-1111-111111111102', '7', 'White', '#FFFFFF', 'CLC-WHT-7', 10),
  ('11111111-1111-1111-1111-111111111102', '8', 'White', '#FFFFFF', 'CLC-WHT-8', 10),
  ('11111111-1111-1111-1111-111111111102', '9', 'White', '#FFFFFF', 'CLC-WHT-9', 8),
  ('11111111-1111-1111-1111-111111111102', '10', 'White', '#FFFFFF', 'CLC-WHT-10', 7),
  ('11111111-1111-1111-1111-111111111103', '6', 'Pink', '#FFB6C1', 'UBL-PNK-6', 6),
  ('11111111-1111-1111-1111-111111111103', '7', 'Pink', '#FFB6C1', 'UBL-PNK-7', 8),
  ('11111111-1111-1111-1111-111111111103', '8', 'Pink', '#FFB6C1', 'UBL-PNK-8', 6),
  ('11111111-1111-1111-1111-111111111103', '7', 'Black', '#000000', 'UBL-BLK-7', 5),
  ('11111111-1111-1111-1111-111111111104', '7', 'Blue', '#4169E1', 'SC-BLU-7', 10),
  ('11111111-1111-1111-1111-111111111104', '8', 'Blue', '#4169E1', 'SC-BLU-8', 10),
  ('11111111-1111-1111-1111-111111111104', '9', 'Blue', '#4169E1', 'SC-BLU-9', 10),
  ('11111111-1111-1111-1111-111111111104', '10', 'Blue', '#4169E1', 'SC-BLU-10', 10),
  ('11111111-1111-1111-1111-111111111105', '6', 'Black', '#000000', 'CT-BLK-6', 15),
  ('11111111-1111-1111-1111-111111111105', '7', 'Black', '#000000', 'CT-BLK-7', 15),
  ('11111111-1111-1111-1111-111111111105', '8', 'Black', '#000000', 'CT-BLK-8', 15),
  ('11111111-1111-1111-1111-111111111105', '9', 'Black', '#000000', 'CT-BLK-9', 15),
  ('11111111-1111-1111-1111-111111111106', '8', 'Grey', '#808080', 'GK-GRY-8', 5),
  ('11111111-1111-1111-1111-111111111106', '9', 'Grey', '#808080', 'GK-GRY-9', 5),
  ('11111111-1111-1111-1111-111111111106', '10', 'Grey', '#808080', 'GK-GRY-10', 5),
  ('11111111-1111-1111-1111-111111111106', '11', 'Grey', '#808080', 'GK-GRY-11', 5),
  ('11111111-1111-1111-1111-111111111107', '7', 'Black', '#000000', 'OS-BLK-7', 12),
  ('11111111-1111-1111-1111-111111111107', '8', 'Black', '#000000', 'OS-BLK-8', 12),
  ('11111111-1111-1111-1111-111111111107', '9', 'Black', '#000000', 'OS-BLK-9', 12),
  ('11111111-1111-1111-1111-111111111107', '10', 'Black', '#000000', 'OS-BLK-10', 9),
  ('11111111-1111-1111-1111-111111111108', '6', 'Teal', '#008080', 'FF-TEL-6', 8),
  ('11111111-1111-1111-1111-111111111108', '7', 'Teal', '#008080', 'FF-TEL-7', 8),
  ('11111111-1111-1111-1111-111111111108', '8', 'Teal', '#008080', 'FF-TEL-8', 7),
  ('11111111-1111-1111-1111-111111111108', '9', 'Teal', '#008080', 'FF-TEL-9', 7);
