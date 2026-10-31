import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db-store';
import crypto from 'crypto';

const processedWebhookEvents = new Set<string>();

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const razorpaySignature = request.headers.get('x-razorpay-signature');
    const cashfreeSignature = request.headers.get('x-cashfree-signature');

    const razorpaySecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const cashfreeSecret = process.env.CASHFREE_WEBHOOK_SECRET;

    // 1. Signature Verification
    if (razorpaySignature && razorpaySecret) {
      const expectedSig = crypto
        .createHmac('sha256', razorpaySecret)
        .update(rawBody)
        .digest('hex');

      if (expectedSig !== razorpaySignature) {
        return NextResponse.json({ error: 'Invalid Razorpay webhook signature' }, { status: 400 });
      }
    } else if (cashfreeSignature && cashfreeSecret) {
      const expectedSig = crypto
        .createHmac('sha256', cashfreeSecret)
        .update(rawBody)
        .digest('hex');

      if (expectedSig !== cashfreeSignature) {
        return NextResponse.json({ error: 'Invalid Cashfree webhook signature' }, { status: 400 });
      }
    }

    const payload = JSON.parse(rawBody);

    // 2. Event Deduplication
    const eventId = payload.event_id || payload.id || payload.data?.order?.order_id;
    if (eventId && processedWebhookEvents.has(eventId)) {
      return NextResponse.json({ received: true, deduplicated: true });
    }
    if (eventId) processedWebhookEvents.add(eventId);

    // 3. Process Payment Event
    let orderId: string | null = null;
    let paymentSuccess = false;

    if (payload.event === 'payment.captured' || payload.event === 'order.paid') {
      orderId = payload.payload?.payment?.entity?.notes?.order_id || payload.payload?.order?.entity?.receipt;
      paymentSuccess = true;
    } else if (payload.type === 'PAYMENT_SUCCESS_WEBHOOK') {
      orderId = payload.data?.order?.order_id;
      paymentSuccess = true;
    }

    if (orderId && paymentSuccess) {
      const order = db.getOrder(orderId);
      if (order && order.status !== 'paid' && order.status !== 'completed') {
        order.status = 'paid';
        order.updated_at = new Date().toISOString();

        const printJob = db.getPrintJobForOrder(orderId);
        if (printJob) {
          printJob.status = 'queued';
          printJob.updated_at = new Date().toISOString();

          db.emit({
            type: 'JOB_QUEUED',
            payload: { job_id: printJob.id, order_id: orderId, shop_id: order.shop_id }
          });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
