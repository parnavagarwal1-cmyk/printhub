import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db-store';
import QRCode from 'qrcode';

export async function POST(request: NextRequest) {
  try {
    const { order_id } = await request.json();

    if (!order_id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const order = db.getOrder(order_id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const shop = db.getShopById(order.shop_id);
    const amountRupees = (order.total_amount_paise / 100).toFixed(2);
    const provider = process.env.PAYMENT_PROVIDER || 'mock';

    // Construct standard UPI Dynamic Payment Intent string
    // Format: upi://pay?pa=<vpa>&pn=<payee>&am=<amount>&cu=INR&tn=<note>&tr=<ref>
    const upiVpa = 'printflow.merchant@icici';
    const payeeName = encodeURIComponent(shop ? shop.name : 'PrintFlow Self-Service');
    const transactionNote = encodeURIComponent(`PrintFlow Order ${order.order_number}`);
    const upiString = `upi://pay?pa=${upiVpa}&pn=${payeeName}&am=${amountRupees}&cu=INR&tn=${transactionNote}&tr=${order.order_number}`;

    // Generate dynamic QR Code Data URL (Base64 PNG)
    const qrDataUrl = await QRCode.toDataURL(upiString, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });

    const paymentOrderId = `pay_ord_${order.order_number}_${Date.now().toString().slice(-6)}`;

    // Transition print job to 'payment_pending'
    const job = db.getPrintJobForOrder(order_id);
    if (job) {
      job.status = 'payment_pending';
      job.updated_at = new Date().toISOString();
    }

    return NextResponse.json({
      success: true,
      provider,
      order_id,
      payment_order_id: paymentOrderId,
      amount_paise: order.total_amount_paise,
      amount_formatted: `₹${amountRupees}`,
      upi_intent_url: upiString,
      qr_code_url: qrDataUrl,
      sandbox: provider === 'mock' || !process.env.RAZORPAY_KEY_SECRET
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
