export type UserRole = 'super_admin' | 'shop_owner' | 'shop_staff' | 'customer';

export type PrintJobStatus =
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

export type OrderStatus = 'pending' | 'paid' | 'completed' | 'cancelled' | 'failed';
export type PaymentStatus = 'created' | 'pending' | 'successful' | 'failed' | 'refunded';
export type ColorMode = 'bw' | 'color';
export type SidedMode = 'single' | 'double_long_edge' | 'double_short_edge';
export type PageOrientation = 'portrait' | 'landscape' | 'auto';
export type PaperSize = 'A4' | 'A3' | 'Letter' | 'Legal';

export interface ShopPricing {
  shop_id: string;
  bw_price_paise: number;
  color_price_paise: number;
  duplex_discount_paise: number;
  a3_multiplier: number;
  min_order_paise: number;
  service_fee_paise: number;
  tax_percentage: number;
}

export interface PrintItemConfig {
  fileId: string;
  filename: string;
  colorMode: ColorMode;
  paperSize: PaperSize;
  pageRange: string; // e.g. "all", "1-5", "1,3,7"
  copies: number;
  sidedMode: SidedMode;
  orientation: PageOrientation;
  rawPageCount: number;
  effectivePages: number;
}

export interface PriceBreakdownItem {
  fileId: string;
  filename: string;
  effectivePages: number;
  copies: number;
  sidesPerCopy: number;
  totalSides: number;
  baseSideRatePaise: number;
  duplexDiscountPaise: number;
  paperSizeMultiplier: number;
  netItemPaise: number;
}

export interface CalculatedOrderPrice {
  items: PriceBreakdownItem[];
  subtotalPaise: number;
  serviceFeePaise: number;
  minOrderAdjustmentPaise: number;
  taxPaise: number;
  totalPaise: number;
  totalPaiseFormatted: string; // e.g. "₹24.00"
}
