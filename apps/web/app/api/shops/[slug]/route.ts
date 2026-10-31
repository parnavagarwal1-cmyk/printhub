import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db-store';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;
    const shop = db.getShopBySlug(slug);

    if (!shop || !shop.is_active) {
      return NextResponse.json(
        { error: 'Shop not found or currently inactive' },
        { status: 404 }
      );
    }

    const pricing = db.getPricing(shop.id);
    const printers = db.getPrinters(shop.id);
    const devices = db.getDevices(shop.id);

    return NextResponse.json({
      success: true,
      shop: {
        id: shop.id,
        slug: shop.slug,
        name: shop.name,
        logo_url: shop.logo_url,
        address: shop.address,
        phone: shop.phone,
        email: shop.email,
      },
      pricing,
      printers,
      has_online_device: devices.some(d => d.is_active)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
