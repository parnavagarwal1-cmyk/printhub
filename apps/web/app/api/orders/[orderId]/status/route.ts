import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db-store';

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const orderId = params.orderId;
    const order = db.getOrder(orderId);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const shop = db.getShopById(order.shop_id);
    const job = db.getPrintJobForOrder(orderId);
    const printer = job ? db.printers.get(job.printer_id) : undefined;

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        total_amount_paise: order.total_amount_paise,
        created_at: order.created_at,
        files_count: order.files.length,
        items: order.items
      },
      shop: {
        id: shop ? shop.id : '',
        name: shop ? shop.name : 'Print Shop',
        phone: shop ? shop.phone : ''
      },
      job: job ? {
        id: job.id,
        status: job.status,
        error_message: job.error_message,
        printer_name: printer ? printer.name : 'Shop Default Printer',
        updated_at: job.updated_at
      } : null
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
