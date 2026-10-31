import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db-store';

export async function POST(request: NextRequest) {
  try {
    const { shop_id } = await request.json();

    if (!shop_id) {
      return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });
    }

    const shop = db.getShopById(shop_id);
    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    // Generate 6-digit numeric PIN
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    db.pairingPins.set(pin, { shop_id, expires_at: expiresAt });

    return NextResponse.json({
      success: true,
      pin,
      expires_in_seconds: 600,
      shop_id,
      shop_name: shop.name
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
