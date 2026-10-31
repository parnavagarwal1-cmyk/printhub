-- ============================================================================
-- PRINTFLOW SEED DATA
-- ============================================================================

-- 1. Create Demo Profiles
INSERT INTO profiles (id, email, full_name, role)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'admin@printflow.io', 'Platform Administrator', 'super_admin'),
    ('00000000-0000-0000-0000-000000000002', 'owner@campusprints.com', 'Rajesh Sharma', 'shop_owner'),
    ('00000000-0000-0000-0000-000000000003', 'owner@metrodocs.com', 'Anita Verma', 'shop_owner')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

-- 2. Create Demo Shops
INSERT INTO shops (id, slug, name, logo_url, address, phone, email, owner_id, is_active)
VALUES
    (
        '11111111-1111-1111-1111-111111111111',
        'campus-prints',
        'Campus Prints & Xerox Express',
        'https://images.unsplash.com/photo-1568667256549-094345857637?w=128&auto=format&fit=crop&q=80',
        'Student Activity Center, Gate 2, Tech Campus',
        '+91 98765 43210',
        'campus@printflow.io',
        '00000000-0000-0000-0000-000000000002',
        true
    ),
    (
        '22222222-2222-2222-2222-222222222222',
        'metro-docs',
        'Metro Documentation & Digital Prints',
        'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=128&auto=format&fit=crop&q=80',
        'Shop 4, Metro Plaza, Commercial Complex',
        '+91 98111 22334',
        'metro@printflow.io',
        '00000000-0000-0000-0000-000000000003',
        true
    )
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 3. Shop Pricing Customization
INSERT INTO shop_pricing (shop_id, bw_price_paise, color_price_paise, duplex_discount_paise, a3_multiplier, min_order_paise, service_fee_paise, tax_percentage)
VALUES
    ('11111111-1111-1111-1111-111111111111', 200, 800, 50, 2.00, 500, 0, 0.00),
    ('22222222-2222-2222-2222-222222222222', 250, 1000, 50, 2.00, 500, 50, 18.00)
ON CONFLICT (shop_id) DO UPDATE 
SET bw_price_paise = EXCLUDED.bw_price_paise,
    color_price_paise = EXCLUDED.color_price_paise;

-- 4. Demo Registered Devices
INSERT INTO devices (id, shop_id, device_name, device_fingerprint, pairing_pin, pin_expires_at, is_active, last_heartbeat_at, agent_version)
VALUES
    (
        '33333333-3333-3333-3333-333333333331',
        '11111111-1111-1111-1111-111111111111',
        'FRONT-DESK-PC-01',
        'WIN-FP-84920491',
        '482910',
        timezone('utc', now() + INTERVAL '7 days'),
        true,
        timezone('utc', now()),
        '1.0.0'
    ),
    (
        '33333333-3333-3333-3333-333333333332',
        '22222222-2222-2222-2222-222222222222',
        'MAIN-KIOSK-PC',
        'WIN-FP-99018274',
        '192837',
        timezone('utc', now() + INTERVAL '7 days'),
        true,
        timezone('utc', now()),
        '1.0.0'
    )
ON CONFLICT (id) DO NOTHING;

-- 5. Demo Printers
INSERT INTO printers (id, shop_id, device_id, name, driver_name, port_name, is_color_supported, is_duplex_supported, supported_paper_sizes, is_default, status)
VALUES
    (
        '44444444-4444-4444-4444-444444444441',
        '11111111-1111-1111-1111-111111111111',
        '33333333-3333-3333-3333-333333333331',
        'HP LaserJet Pro M404dn (Counter 1)',
        'HP LaserJet Pro M404-M405 PCL 6',
        'USB001',
        false,
        true,
        ARRAY['A4', 'Letter'],
        true,
        'ready'
    ),
    (
        '44444444-4444-4444-4444-444444444442',
        '11111111-1111-1111-1111-111111111111',
        '33333333-3333-3333-3333-333333333331',
        'Epson EcoTank L8050 Color Photo',
        'EPSON L8050 Series',
        'WSD-29104-Epson',
        true,
        false,
        ARRAY['A4', 'A3', 'Photo 4x6'],
        false,
        'ready'
    ),
    (
        '44444444-4444-4444-4444-444444444443',
        '22222222-2222-2222-2222-222222222222',
        '33333333-3333-3333-3333-333333333332',
        'Canon imageRUNNER ADVANCE C3530i',
        'Canon Generic Plus UFR II',
        '192.168.1.150',
        true,
        true,
        ARRAY['A4', 'A3', 'Legal'],
        true,
        'ready'
    )
ON CONFLICT (id) DO NOTHING;
