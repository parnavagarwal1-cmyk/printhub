import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db-store';

export async function GET(request: NextRequest) {
  try {
    const shopId = request.nextUrl.searchParams.get('shop_id') || '11111111-1111-1111-1111-111111111111';
    const shop = db.getShopById(shopId);

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const pricing = db.getPricing(shopId);
    const printers = db.getPrinters(shopId);
    const devices = db.getDevices(shopId);
    const orders = db.getOrders(shopId);

    // Compute metrics
    const totalOrders = orders.length;
    const paidOrders = orders.filter(o => o.status === 'paid' || o.status === 'completed');
    const totalRevenuePaise = paidOrders.reduce((sum, o) => sum + o.total_amount_paise, 0);

    // Total pages printed
    let totalPagesPrinted = 0;
    for (const o of paidOrders) {
      for (const item of o.items) {
        totalPagesPrinted += (item.total_pages * item.copies);
      }
    }

    // Pending jobs in queue
    const queuedJobs = Array.from(db.printJobs.values()).filter(
      j => j.shop_id === shopId && (j.status === 'queued' || j.status === 'downloading' || j.status === 'printing')
    );

    return NextResponse.json({
      success: true,
      shop,
      metrics: {
        totalOrders,
        totalRevenuePaise,
        totalPagesPrinted,
        pendingJobsCount: queuedJobs.length,
        printersCount: printers.length,
        devicesCount: devices.length
      },
      pricing,
      printers,
      devices,
      orders: orders.map(o => {
        const job = db.getPrintJobForOrder(o.id);
        return {
          ...o,
          job_status: job ? job.status : 'awaiting_payment',
          printer_name: job ? db.printers.get(job.printer_id)?.name : undefined
        };
      })
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
