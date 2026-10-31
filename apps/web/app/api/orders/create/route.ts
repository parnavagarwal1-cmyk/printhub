import { NextRequest, NextResponse } from 'next/server';
import { db, OrderRecord, OrderFileRecord, OrderItemRecord, PrintJobRecord } from '@/lib/db-store';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shop_id, customer_phone, printer_id, files, items } = body;

    if (!shop_id || !files || !items || items.length === 0) {
      return NextResponse.json({ error: 'Missing required order fields' }, { status: 400 });
    }

    const shop = db.getShopById(shop_id);
    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const pricing = db.getPricing(shop_id);

    // Calculate authoritative price on server
    let subtotalPaise = 0;
    const orderItems: OrderItemRecord[] = [];
    const orderId = crypto.randomUUID();

    for (const item of items) {
      const rawPages = Number(item.rawPageCount) || 1;
      const copies = Math.max(1, parseInt(item.copies, 10) || 1);
      const baseSideRate = item.colorMode === 'color' ? pricing.color_price_paise : pricing.bw_price_paise;
      const paperMultiplier = item.paperSize === 'A3' ? Number(pricing.a3_multiplier || 2.0) : 1.0;

      let itemTotalPaise = 0;
      if (item.sidedMode === 'single') {
        const totalSides = rawPages * copies;
        itemTotalPaise = totalSides * Math.round(baseSideRate * paperMultiplier);
      } else {
        let singleCopy = 0;
        for (let p = 1; p <= rawPages; p++) {
          let rate = baseSideRate;
          if (p % 2 === 0 && pricing.duplex_discount_paise > 0) {
            rate = Math.max(0, baseSideRate - pricing.duplex_discount_paise);
          }
          singleCopy += Math.round(rate * paperMultiplier);
        }
        itemTotalPaise = singleCopy * copies;
      }

      subtotalPaise += itemTotalPaise;

      orderItems.push({
        id: crypto.randomUUID(),
        order_id: orderId,
        order_file_id: item.fileId,
        color_mode: item.colorMode || 'bw',
        paper_size: item.paperSize || 'A4',
        page_range: item.pageRange || 'all',
        total_pages: rawPages,
        copies: copies,
        sided_mode: item.sidedMode || 'single',
        orientation: item.orientation || 'portrait',
        item_price_paise: itemTotalPaise
      });
    }

    const minOrderAdjustment = subtotalPaise < pricing.min_order_paise ? (pricing.min_order_paise - subtotalPaise) : 0;
    const taxableBase = subtotalPaise + minOrderAdjustment + pricing.service_fee_paise;
    const taxPaise = Math.round((taxableBase * (pricing.tax_percentage || 0)) / 100);
    const totalPaise = taxableBase + taxPaise;

    // Generate readable order number e.g. PF-9821
    const orderNumber = `PF-${Math.floor(1000 + Math.random() * 9000)}`;

    const orderFiles: OrderFileRecord[] = files.map((f: any) => ({
      id: f.id,
      order_id: orderId,
      shop_id: shop_id,
      original_filename: f.original_filename,
      storage_path: f.storage_path,
      file_size: f.file_size,
      mime_type: f.mime_type,
      file_checksum: f.file_checksum,
      raw_page_count: f.raw_page_count,
      printable_page_count: f.printable_page_count
    }));

    // Find default or selected printer
    const availablePrinters = db.getPrinters(shop_id);
    const selectedPrinter = availablePrinters.find(p => p.id === printer_id) || availablePrinters[0];

    const orderRecord: OrderRecord = {
      id: orderId,
      order_number: orderNumber,
      shop_id: shop_id,
      total_amount_paise: totalPaise,
      currency: 'INR',
      status: 'pending',
      pricing_snapshot: {
        pricing,
        subtotalPaise,
        minOrderAdjustment,
        taxPaise,
        totalPaise
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      files: orderFiles,
      items: orderItems
    };

    db.orders.set(orderId, orderRecord);

    // Create initial print job record
    const printJobId = crypto.randomUUID();
    const printJob: PrintJobRecord = {
      id: printJobId,
      order_id: orderId,
      shop_id: shop_id,
      printer_id: selectedPrinter ? selectedPrinter.id : '',
      device_id: selectedPrinter ? selectedPrinter.device_id : undefined,
      status: 'awaiting_payment',
      attempt_count: 0,
      max_attempts: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.printJobs.set(printJobId, printJob);

    return NextResponse.json({
      success: true,
      order_id: orderId,
      order_number: orderNumber,
      total_amount_paise: totalPaise,
      total_amount_formatted: `₹${(totalPaise / 100).toFixed(2)}`,
      print_job_id: printJobId
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
