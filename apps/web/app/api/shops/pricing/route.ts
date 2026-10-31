import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db-store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      shop_id,
      bw_price_paise,
      color_price_paise,
      duplex_discount_paise,
      a3_multiplier,
      min_order_paise,
      service_fee_paise,
      tax_percentage
    } = body;

    if (!shop_id) {
      return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });
    }

    const currentPricing = db.getPricing(shop_id);
    const updated = {
      ...currentPricing,
      bw_price_paise: parseInt(bw_price_paise, 10) || currentPricing.bw_price_paise,
      color_price_paise: parseInt(color_price_paise, 10) || currentPricing.color_price_paise,
      duplex_discount_paise: parseInt(duplex_discount_paise, 10) ?? currentPricing.duplex_discount_paise,
      a3_multiplier: parseFloat(a3_multiplier) || currentPricing.a3_multiplier,
      min_order_paise: parseInt(min_order_paise, 10) || currentPricing.min_order_paise,
      service_fee_paise: parseInt(service_fee_paise, 10) ?? currentPricing.service_fee_paise,
      tax_percentage: parseFloat(tax_percentage) ?? currentPricing.tax_percentage
    };

    db.pricing.set(shop_id, updated);

    return NextResponse.json({
      success: true,
      pricing: updated
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
