-- ============================================================
-- Database Schema for handicraftkids.com
-- Migrated from Supabase to self-hosted PostgreSQL
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  image_url TEXT,
  color TEXT DEFAULT '#57c5cf',
  icon_url TEXT,
  show_icon BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  is_hidden BOOLEAN DEFAULT false,
  admin_id INTEGER,
  sort_order INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  name_en TEXT,
  name_ru TEXT,
  description TEXT,
  description_en TEXT,
  description_ru TEXT,
  short_description TEXT,
  short_description_en TEXT,
  short_description_ru TEXT,
  price NUMERIC(10,2) DEFAULT 0,
  old_price NUMERIC(10,2),
  image_url TEXT,
  additional_images JSONB,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  stock INTEGER DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  manage_inventory BOOLEAN DEFAULT false,
  availability TEXT,
  is_hidden BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  is_new BOOLEAN DEFAULT false,
  rating NUMERIC(3,1) DEFAULT 5,
  reviews_count INTEGER DEFAULT 0,
  external_id TEXT,
  url_slug TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCT IMAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CATEGORY ATTRIBUTES
-- ============================================================
CREATE TABLE IF NOT EXISTS category_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  attribute_name TEXT NOT NULL,
  attribute_type TEXT DEFAULT 'text',
  is_required BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  options JSONB,
  name_en TEXT,
  name_ru TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCT ATTRIBUTES
-- ============================================================
CREATE TABLE IF NOT EXISTS product_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  attribute_name TEXT NOT NULL,
  attribute_value TEXT,
  attribute_value_en TEXT,
  attribute_value_ru TEXT,
  attribute_type TEXT DEFAULT 'text',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number BIGINT,
  customer_info JSONB,
  products JSONB,
  total_amount NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'new',
  shipping_method TEXT,
  tracking_number TEXT,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending',
  payment_provider TEXT,
  payment_id TEXT,
  payment_order_id TEXT,
  payment_date TIMESTAMPTZ,
  payment_callback_data JSONB,
  flitt_payment_id TEXT,
  flitt_order_id TEXT,
  sms_sent_to_admin BOOLEAN DEFAULT false,
  sms_sent_to_customer BOOLEAN DEFAULT false,
  email_sent_to_customer BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- HERO SLIDES
-- ============================================================
CREATE TABLE IF NOT EXISTS hero_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT,
  button_link TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  title TEXT,
  subtitle TEXT,
  title_color TEXT,
  subtitle_color TEXT,
  title_line1 JSONB DEFAULT '{"ka":"","en":"","ru":""}',
  title_line2 JSONB DEFAULT '{"ka":"","en":"","ru":""}',
  description JSONB DEFAULT '{"ka":"","en":"","ru":""}',
  button_text JSONB DEFAULT '{"ka":"","en":"","ru":""}',
  title_line1_color TEXT DEFAULT '#000000',
  title_line2_color TEXT DEFAULT '#000000',
  description_color TEXT DEFAULT '#666666',
  title_line1_size INTEGER DEFAULT 60,
  title_line2_size INTEGER DEFAULT 48,
  description_size INTEGER DEFAULT 18,
  decorative_icon_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- HOMEPAGE SECTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS homepage_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  component_key TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  settings JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRANSLATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  ka TEXT,
  en TEXT,
  ru TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PAGES CONTENT
-- ============================================================
CREATE TABLE IF NOT EXISTS pages_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  title_ka TEXT,
  title_en TEXT,
  title_ru TEXT,
  content_ka TEXT,
  content_en TEXT,
  content_ru TEXT,
  hero_image_url TEXT,
  staff_data JSONB,
  contact_info JSONB,
  map_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  message TEXT,
  type TEXT DEFAULT 'order',
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ADMIN USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  auth_id TEXT,
  reset_token TEXT,
  reset_token_expires TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ADMIN PHONE NUMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ADMIN NOTIFICATION PREFERENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enable_sms_notifications BOOLEAN DEFAULT true,
  enable_inapp_notifications BOOLEAN DEFAULT true,
  enable_email_notifications BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FLITT SETTINGS (Payment)
-- ============================================================
CREATE TABLE IF NOT EXISTS flitt_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_mode BOOLEAN DEFAULT true,
  merchant_url TEXT DEFAULT 'https://pay.flitt.com/api/checkout/url',
  merchant_id TEXT,
  payment_key TEXT,
  credit_private_key TEXT,
  test_merchant_id TEXT,
  test_payment_key TEXT,
  test_credit_private_key TEXT,
  company_name TEXT,
  settlement_account_currency TEXT DEFAULT 'GEL',
  settlement_account_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SMS PROVIDER SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS sms_provider_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name TEXT,
  api_key TEXT,
  sender_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SMS LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_phone TEXT,
  message TEXT,
  status TEXT DEFAULT 'pending',
  response JSONB,
  order_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATION LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT,
  order_id UUID,
  status TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCT AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS product_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  action TEXT,
  admin_id UUID,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FOOTER SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS footer_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url TEXT,
  social_links JSONB DEFAULT '[]'::jsonb,
  smarketer_logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NEWSLETTER SUBSCRIBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCT TRANSLATIONS (multi-lang product data)
-- ============================================================
CREATE TABLE IF NOT EXISTS product_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  lang TEXT NOT NULL,
  title TEXT,
  description TEXT,
  meta_title TEXT,
  meta_description TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, lang)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_is_hidden ON products(is_hidden);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_attributes_product_id ON product_attributes(product_id);
CREATE INDEX IF NOT EXISTS idx_category_attributes_category_id ON category_attributes(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_translations_key ON translations(key);
CREATE INDEX IF NOT EXISTS idx_hero_slides_sort_order ON hero_slides(sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);

-- ============================================================
-- RPC FUNCTION: decrement_stock
-- ============================================================
CREATE OR REPLACE FUNCTION decrement_stock(p_id UUID, qty INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET stock_quantity = GREATEST(stock_quantity - qty, 0),
      updated_at = NOW()
  WHERE id = p_id AND manage_inventory = true;
END;
$$ LANGUAGE plpgsql;
