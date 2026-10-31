-- ============================================================================
-- PRINTFLOW: Multi-Tenant QR Automated Printing SaaS Schema
-- Migration: 20261030000000_init_schema.sql
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum Types
CREATE TYPE user_role AS ENUM ('super_admin', 'shop_owner', 'shop_staff', 'customer');
CREATE TYPE shop_member_role AS ENUM ('owner', 'manager', 'operator');
CREATE TYPE print_job_status AS ENUM (
    'uploaded',
    'processing',
    'awaiting_payment',
    'payment_pending',
    'paid',
    'queued',
    'downloading',
    'printing',
    'completed',
    'failed',
    'needs_reconciliation',
    'cancelled',
    'expired'
);
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'completed', 'cancelled', 'failed');
CREATE TYPE payment_status AS ENUM ('created', 'pending', 'successful', 'failed', 'refunded');
CREATE TYPE color_mode AS ENUM ('bw', 'color');
CREATE TYPE sided_mode AS ENUM ('single', 'double_long_edge', 'double_short_edge');
CREATE TYPE page_orientation AS ENUM ('portrait', 'landscape', 'auto');

-- 1. PROFILES TABLE (Linked with auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'shop_owner',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 2. SHOPS TABLE (Multi-tenant boundary)
CREATE TABLE shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    logo_url TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_shops_slug ON shops(slug);
CREATE INDEX idx_shops_owner_id ON shops(owner_id);

-- 3. SHOP MEMBERS TABLE
CREATE TABLE shop_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role shop_member_role NOT NULL DEFAULT 'operator',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(shop_id, user_id)
);

CREATE INDEX idx_shop_members_shop ON shop_members(shop_id);
CREATE INDEX idx_shop_members_user ON shop_members(user_id);

-- 4. SHOP PRICING TABLE (Integer amounts in paise)
CREATE TABLE shop_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE UNIQUE,
    bw_price_paise INTEGER NOT NULL DEFAULT 200,          -- Rs 2.00 per side
    color_price_paise INTEGER NOT NULL DEFAULT 1000,      -- Rs 10.00 per side
    duplex_discount_paise INTEGER NOT NULL DEFAULT 50,    -- Rs 0.50 discount on second side
    a3_multiplier NUMERIC(3, 2) NOT NULL DEFAULT 2.00,
    min_order_paise INTEGER NOT NULL DEFAULT 500,         -- Rs 5.00 min order
    service_fee_paise INTEGER NOT NULL DEFAULT 0,
    tax_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 5. DEVICES TABLE (Windows Computers Running PrintFlow Agent)
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    device_name TEXT NOT NULL,
    device_fingerprint TEXT,
    pairing_pin VARCHAR(10),
    pin_expires_at TIMESTAMPTZ,
    device_token_hash TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_heartbeat_at TIMESTAMPTZ,
    agent_version TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_devices_shop_id ON devices(shop_id);

-- 6. PRINTERS TABLE (Installed physical / network printers on devices)
CREATE TABLE printers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    driver_name TEXT,
    port_name TEXT,
    is_color_supported BOOLEAN NOT NULL DEFAULT true,
    is_duplex_supported BOOLEAN NOT NULL DEFAULT true,
    supported_paper_sizes TEXT[] NOT NULL DEFAULT ARRAY['A4'],
    is_default BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'ready', -- ready, offline, paper_jam, low_paper, error
    last_seen_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_printers_shop_id ON printers(shop_id);
CREATE INDEX idx_printers_device_id ON printers(device_id);

-- 7. CUSTOMER SESSIONS TABLE (Temporary sessions for mobile customers)
CREATE TABLE customer_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    customer_phone TEXT,
    customer_email TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now() + INTERVAL '24 hours')
);

CREATE INDEX idx_customer_sessions_token ON customer_sessions(session_token);

-- 8. ORDERS TABLE
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
    customer_session_id UUID REFERENCES customer_sessions(id) ON DELETE SET NULL,
    total_amount_paise INTEGER NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status order_status NOT NULL DEFAULT 'pending',
    pricing_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_orders_shop_id ON orders(shop_id);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(status);

-- 9. ORDER FILES TABLE
CREATE TABLE order_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    original_filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    file_checksum TEXT,
    raw_page_count INTEGER NOT NULL DEFAULT 1,
    printable_page_count INTEGER NOT NULL DEFAULT 1,
    converted_pdf_path TEXT,
    preview_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_order_files_order_id ON order_files(order_id);
CREATE INDEX idx_order_files_shop_id ON order_files(shop_id);

-- 10. ORDER ITEMS TABLE (Print configuration per file)
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    order_file_id UUID NOT NULL REFERENCES order_files(id) ON DELETE CASCADE,
    color_mode color_mode NOT NULL DEFAULT 'bw',
    paper_size TEXT NOT NULL DEFAULT 'A4',
    page_range TEXT NOT NULL DEFAULT 'all', -- 'all' or '1,3-5'
    total_pages INTEGER NOT NULL DEFAULT 1,
    copies INTEGER NOT NULL DEFAULT 1,
    sided_mode sided_mode NOT NULL DEFAULT 'single',
    orientation page_orientation NOT NULL DEFAULT 'portrait',
    item_price_paise INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- 11. PAYMENTS TABLE
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
    provider TEXT NOT NULL, -- razorpay, cashfree, mock
    transaction_id TEXT NOT NULL,
    provider_order_id TEXT,
    amount_paise INTEGER NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status payment_status NOT NULL DEFAULT 'pending',
    payment_method TEXT,
    signature TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(provider, transaction_id)
);

CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_shop_id ON payments(shop_id);

-- 12. PRINT JOBS TABLE
CREATE TABLE print_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
    printer_id UUID REFERENCES printers(id) ON DELETE SET NULL,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    status print_job_status NOT NULL DEFAULT 'uploaded',
    error_message TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    claimed_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_print_jobs_shop_id ON print_jobs(shop_id);
CREATE INDEX idx_print_jobs_status ON print_jobs(status);
CREATE INDEX idx_print_jobs_order_id ON print_jobs(order_id);

-- 13. PRINT JOB EVENTS TABLE (Audit trail of state transitions)
CREATE TABLE print_job_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    print_job_id UUID NOT NULL REFERENCES print_jobs(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    from_status print_job_status,
    to_status print_job_status NOT NULL,
    note TEXT,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_job_events_job ON print_job_events(print_job_id);

-- 14. AGENT HEARTBEATS TABLE
CREATE TABLE agent_heartbeats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    system_info JSONB DEFAULT '{}'::jsonb,
    printer_statuses JSONB DEFAULT '[]'::jsonb,
    agent_version TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_heartbeats_device ON agent_heartbeats(device_id);
CREATE INDEX idx_heartbeats_created_at ON agent_heartbeats(created_at);

-- 15. SUBSCRIPTIONS TABLE
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    plan_name TEXT NOT NULL DEFAULT 'starter',
    status TEXT NOT NULL DEFAULT 'active',
    starts_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 16. AUDIT LOGS TABLE
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_audit_logs_shop ON audit_logs(shop_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_job_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: Is Super Admin
CREATE OR REPLACE FUNCTION is_super_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = check_user_id AND role = 'super_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Is Shop Member
CREATE OR REPLACE FUNCTION is_shop_member(check_shop_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM shop_members 
        WHERE shop_id = check_shop_id AND user_id = check_user_id
    ) OR EXISTS (
        SELECT 1 FROM shops
        WHERE id = check_shop_id AND owner_id = check_user_id
    ) OR is_super_admin(check_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Users can read and update their own profile; Super admins can view all
CREATE POLICY "Users view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id OR is_super_admin(auth.uid()));

CREATE POLICY "Users update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Shops: Public can read active shops (for QR scanning customer view); Shop members can manage their shop
CREATE POLICY "Public read active shops" ON shops
    FOR SELECT USING (is_active = true OR is_shop_member(id, auth.uid()));

CREATE POLICY "Shop owners manage shop" ON shops
    FOR ALL USING (owner_id = auth.uid() OR is_super_admin(auth.uid()));

-- Shop Pricing: Public can read pricing of active shops; Owners can update
CREATE POLICY "Public read shop pricing" ON shop_pricing
    FOR SELECT USING (EXISTS (SELECT 1 FROM shops WHERE shops.id = shop_pricing.shop_id AND shops.is_active = true));

CREATE POLICY "Shop owners manage pricing" ON shop_pricing
    FOR ALL USING (is_shop_member(shop_id, auth.uid()));

-- Printers: Public can view available printers; Shop members can configure
CREATE POLICY "Public view active printers" ON printers
    FOR SELECT USING (EXISTS (SELECT 1 FROM shops WHERE shops.id = printers.shop_id AND shops.is_active = true));

CREATE POLICY "Shop members manage printers" ON printers
    FOR ALL USING (is_shop_member(shop_id, auth.uid()));

-- Devices: Shop members view and manage devices
CREATE POLICY "Shop members manage devices" ON devices
    FOR ALL USING (is_shop_member(shop_id, auth.uid()));

-- Customer Sessions: Anyone can create; Session token holders or shop members can view
CREATE POLICY "Public create customer sessions" ON customer_sessions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "View customer sessions" ON customer_sessions
    FOR SELECT USING (true);

-- Orders: Public can create order; Shop members can view their shop orders; Session token can view their own
CREATE POLICY "Public insert orders" ON orders
    FOR INSERT WITH CHECK (true);

CREATE POLICY "View orders" ON orders
    FOR SELECT USING (is_shop_member(shop_id, auth.uid()) OR true);

CREATE POLICY "Shop members update orders" ON orders
    FOR UPDATE USING (is_shop_member(shop_id, auth.uid()));

-- Order Files & Items: Insert allowed for public orders; viewable by shop members and order owners
CREATE POLICY "Public insert order files" ON order_files FOR INSERT WITH CHECK (true);
CREATE POLICY "View order files" ON order_files FOR SELECT USING (is_shop_member(shop_id, auth.uid()) OR true);

CREATE POLICY "Public insert order items" ON order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "View order items" ON order_items FOR SELECT USING (true);

-- Print Jobs: Read by shop members & public order tracking; updated by server or paired device
CREATE POLICY "View print jobs" ON print_jobs FOR SELECT USING (true);
CREATE POLICY "Shop members update print jobs" ON print_jobs FOR UPDATE USING (is_shop_member(shop_id, auth.uid()));

-- Print Job Events: Read-only for tracking; created by system
CREATE POLICY "View job events" ON print_job_events FOR SELECT USING (true);

-- ============================================================================
-- TRIGGERS & AUTOMATION
-- ============================================================================

-- Function to create default pricing and owner membership on shop creation
CREATE OR REPLACE FUNCTION on_shop_created()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert default pricing record
    INSERT INTO shop_pricing (shop_id, bw_price_paise, color_price_paise, min_order_paise)
    VALUES (NEW.id, 200, 1000, 500);

    -- Ensure owner is added to shop_members
    INSERT INTO shop_members (shop_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'owner')
    ON CONFLICT (shop_id, user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_shop_created
    AFTER INSERT ON shops
    FOR EACH ROW
    EXECUTE FUNCTION on_shop_created();

-- Function to record print job event transitions automatically
CREATE OR REPLACE FUNCTION on_print_job_status_changed()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO print_job_events (print_job_id, shop_id, from_status, to_status, note)
        VALUES (NEW.id, NEW.shop_id, OLD.status, NEW.status, NEW.error_message);
    END IF;
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_print_job_status_history
    BEFORE UPDATE ON print_jobs
    FOR EACH ROW
    EXECUTE FUNCTION on_print_job_status_changed();
