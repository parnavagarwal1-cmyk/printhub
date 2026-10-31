// Shared database store with both Supabase connection and local reactive mock store for sandbox testing

export interface ShopRecord {
  id: string;
  slug: string;
  name: string;
  logo_url: string;
  address: string;
  phone: string;
  email: string;
  owner_id: string;
  is_active: boolean;
}

export interface PricingRecord {
  shop_id: string;
  bw_price_paise: number;
  color_price_paise: number;
  duplex_discount_paise: number;
  a3_multiplier: number;
  min_order_paise: number;
  service_fee_paise: number;
  tax_percentage: number;
}

export interface DeviceRecord {
  id: string;
  shop_id: string;
  device_name: string;
  device_fingerprint: string;
  pairing_pin: string;
  pin_expires_at: string;
  device_token_hash?: string;
  is_active: boolean;
  last_heartbeat_at: string;
  agent_version: string;
}

export interface PrinterRecord {
  id: string;
  shop_id: string;
  device_id: string;
  name: string;
  driver_name: string;
  port_name: string;
  is_color_supported: boolean;
  is_duplex_supported: boolean;
  supported_paper_sizes: string[];
  is_default: boolean;
  status: 'ready' | 'offline' | 'paper_jam' | 'low_paper' | 'error';
  last_seen_at: string;
}

export interface OrderRecord {
  id: string;
  order_number: string;
  shop_id: string;
  customer_session_id?: string;
  total_amount_paise: number;
  currency: string;
  status: 'pending' | 'paid' | 'completed' | 'cancelled' | 'failed';
  pricing_snapshot: any;
  created_at: string;
  updated_at: string;
  files: OrderFileRecord[];
  items: OrderItemRecord[];
}

export interface OrderFileRecord {
  id: string;
  order_id: string;
  shop_id: string;
  original_filename: string;
  storage_path: string;
  file_size: number;
  mime_type: string;
  file_checksum?: string;
  raw_page_count: number;
  printable_page_count: number;
  converted_pdf_path?: string;
  preview_url?: string;
}

export interface OrderItemRecord {
  id: string;
  order_id: string;
  order_file_id: string;
  color_mode: 'bw' | 'color';
  paper_size: string;
  page_range: string;
  total_pages: number;
  copies: number;
  sided_mode: 'single' | 'double_long_edge' | 'double_short_edge';
  orientation: 'portrait' | 'landscape' | 'auto';
  item_price_paise: number;
}

export interface PrintJobRecord {
  id: string;
  order_id: string;
  shop_id: string;
  printer_id: string;
  device_id?: string;
  status:
    | 'uploaded'
    | 'processing'
    | 'awaiting_payment'
    | 'payment_pending'
    | 'paid'
    | 'queued'
    | 'downloading'
    | 'printing'
    | 'completed'
    | 'failed'
    | 'needs_reconciliation'
    | 'cancelled'
    | 'expired';
  error_message?: string;
  attempt_count: number;
  max_attempts: number;
  claimed_at?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

class MemoryDatabase {
  public shops: Map<string, ShopRecord> = new Map();
  public pricing: Map<string, PricingRecord> = new Map();
  public devices: Map<string, DeviceRecord> = new Map();
  public printers: Map<string, PrinterRecord> = new Map();
  public orders: Map<string, OrderRecord> = new Map();
  public printJobs: Map<string, PrintJobRecord> = new Map();
  public pairingPins: Map<string, { shop_id: string; expires_at: number }> = new Map();
  public listeners: Set<(event: { type: string; payload: any }) => void> = new Set();

  constructor() {
    this.seed();
  }

  private seed() {
    // Seed Shop 1: Campus Prints
    const shop1Id = '11111111-1111-1111-1111-111111111111';
    this.shops.set(shop1Id, {
      id: shop1Id,
      slug: 'campus-prints',
      name: 'Campus Prints & Xerox Express',
      logo_url: 'https://images.unsplash.com/photo-1568667256549-094345857637?w=128&auto=format&fit=crop&q=80',
      address: 'Student Activity Center, Gate 2, Tech Campus',
      phone: '+91 98765 43210',
      email: 'campus@printflow.io',
      owner_id: '00000000-0000-0000-0000-000000000002',
      is_active: true
    });

    this.pricing.set(shop1Id, {
      shop_id: shop1Id,
      bw_price_paise: 200,
      color_price_paise: 1000,
      duplex_discount_paise: 50,
      a3_multiplier: 2.0,
      min_order_paise: 500,
      service_fee_paise: 0,
      tax_percentage: 0
    });

    const device1Id = '33333333-3333-3333-3333-333333333331';
    this.devices.set(device1Id, {
      id: device1Id,
      shop_id: shop1Id,
      device_name: 'FRONT-DESK-PC-01',
      device_fingerprint: 'WIN-FP-84920491',
      pairing_pin: '482910',
      pin_expires_at: new Date(Date.now() + 864000000).toISOString(),
      is_active: true,
      last_heartbeat_at: new Date().toISOString(),
      agent_version: '1.0.0'
    });

    const printer1Id = '44444444-4444-4444-4444-444444444441';
    this.printers.set(printer1Id, {
      id: printer1Id,
      shop_id: shop1Id,
      device_id: device1Id,
      name: 'HP LaserJet Pro M404dn (USB)',
      driver_name: 'HP LaserJet Pro M404-M405 PCL 6',
      port_name: 'USB001',
      is_color_supported: false,
      is_duplex_supported: true,
      supported_paper_sizes: ['A4', 'Letter'],
      is_default: true,
      status: 'ready',
      last_seen_at: new Date().toISOString()
    });

    const printer2Id = '44444444-4444-4444-4444-444444444442';
    this.printers.set(printer2Id, {
      id: printer2Id,
      shop_id: shop1Id,
      device_id: device1Id,
      name: 'Epson EcoTank L8050 Color Photo (Wi-Fi)',
      driver_name: 'EPSON L8050 Series',
      port_name: 'WSD-29104-Epson',
      is_color_supported: true,
      is_duplex_supported: false,
      supported_paper_sizes: ['A4', 'A3'],
      is_default: false,
      status: 'ready',
      last_seen_at: new Date().toISOString()
    });

    // Seed Shop 2: Metro Docs
    const shop2Id = '22222222-2222-2222-2222-222222222222';
    this.shops.set(shop2Id, {
      id: shop2Id,
      slug: 'metro-docs',
      name: 'Metro Documentation & Digital Prints',
      logo_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=128&auto=format&fit=crop&q=80',
      address: 'Shop 4, Metro Plaza, Commercial Complex',
      phone: '+91 98111 22334',
      email: 'metro@printflow.io',
      owner_id: '00000000-0000-0000-0000-000000000003',
      is_active: true
    });

    this.pricing.set(shop2Id, {
      shop_id: shop2Id,
      bw_price_paise: 250,
      color_price_paise: 1200,
      duplex_discount_paise: 50,
      a3_multiplier: 2.0,
      min_order_paise: 500,
      service_fee_paise: 50,
      tax_percentage: 18.0
    });
  }

  public getShopBySlug(slug: string): ShopRecord | undefined {
    for (const shop of this.shops.values()) {
      if (shop.slug.toLowerCase() === slug.toLowerCase()) return shop;
    }
    return undefined;
  }

  public getShopById(id: string): ShopRecord | undefined {
    return this.shops.get(id);
  }

  public getPricing(shopId: string): PricingRecord {
    return (
      this.pricing.get(shopId) || {
        shop_id: shopId,
        bw_price_paise: 200,
        color_price_paise: 1000,
        duplex_discount_paise: 50,
        a3_multiplier: 2.0,
        min_order_paise: 500,
        service_fee_paise: 0,
        tax_percentage: 0
      }
    );
  }

  public getPrinters(shopId: string): PrinterRecord[] {
    return Array.from(this.printers.values()).filter((p) => p.shop_id === shopId);
  }

  public getDevices(shopId: string): DeviceRecord[] {
    return Array.from(this.devices.values()).filter((d) => d.shop_id === shopId);
  }

  public getOrders(shopId?: string): OrderRecord[] {
    const list = Array.from(this.orders.values());
    if (!shopId) return list;
    return list.filter((o) => o.shop_id === shopId);
  }

  public getOrder(orderId: string): OrderRecord | undefined {
    return this.orders.get(orderId);
  }

  public getPrintJobForOrder(orderId: string): PrintJobRecord | undefined {
    for (const job of this.printJobs.values()) {
      if (job.order_id === orderId) return job;
    }
    return undefined;
  }

  public emit(event: { type: string; payload: any }) {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Event listener error', err);
      }
    }
  }

  public subscribe(listener: (event: { type: string; payload: any }) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

// Global persistent singleton in development
const globalForDb = global as unknown as { printflowDb: MemoryDatabase };
export const db = globalForDb.printflowDb || new MemoryDatabase();
if (process.env.NODE_ENV !== 'production') globalForDb.printflowDb = db;
