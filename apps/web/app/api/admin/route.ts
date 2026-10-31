import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db-store';

export async function GET(request: NextRequest) {
  try {
    const allShops = Array.from(db.shops.values());
    const allDevices = Array.from(db.devices.values());
    const allPrinters = Array.from(db.printers.values());
    const allOrders = Array.from(db.orders.values());

    const totalRevenuePaise = allOrders
      .filter(o => o.status === 'paid' || o.status === 'completed')
      .reduce((sum, o) => sum + o.total_amount_paise, 0);

    let totalPagesPrinted = 0;
    for (const o of allOrders) {
      if (o.status === 'paid' || o.status === 'completed') {
        for (const it of o.items) {
          totalPagesPrinted += (it.total_pages * it.copies);
        }
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalShops: allShops.length,
        activeShops: allShops.filter(s => s.is_active).length,
        totalDevices: allDevices.length,
        activeDevices: allDevices.filter(d => d.is_active).length,
        totalPrinters: allPrinters.length,
        totalOrders: allOrders.length,
        totalRevenuePaise,
        totalPagesPrinted
      },
      shops: allShops.map(s => ({
        ...s,
        ordersCount: allOrders.filter(o => o.shop_id === s.id).length,
        printersCount: allPrinters.filter(p => p.shop_id === s.id).length,
        devicesCount: allDevices.filter(d => d.shop_id === s.id).length
      })),
      devices: allDevices.map(d => ({
        ...d,
        shop_name: db.shops.get(d.shop_id)?.name || 'Unknown'
      }))
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { shop_id, is_active } = await request.json();
    if (!shop_id || typeof is_active !== 'boolean') {
      return NextResponse.json({ error: 'Shop ID and active status required' }, { status: 400 });
    }

    const shop = db.shops.get(shop_id);
    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    shop.is_active = is_active;
    return NextResponse.json({ success: true, shop });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
