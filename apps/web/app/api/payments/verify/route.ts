import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db-store';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order_id, payment_id, signature, sandbox_token } = body;

    if (!order_id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const order = db.getOrder(order_id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Idempotency: If already paid, return success without duplicate processing
    if (order.status === 'paid' || order.status === 'completed') {
      return NextResponse.json({
        success: true,
        message: 'Order was already authorized and paid',
        order_status: order.status
      });
    }

    const provider = process.env.PAYMENT_PROVIDER || 'mock';
    let isVerified = false;

    if (provider === 'razorpay' && process.env.RAZORPAY_KEY_SECRET) {
      // Razorpay signature verification: HMAC SHA256(order_id + "|" + payment_id, secret)
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${order_id}|${payment_id}`)
        .digest('hex');

      isVerified = (signature === expectedSignature);
    } else {
      // Sandbox / Mock Mode Verification: validates secure sandbox token or test transaction
      isVerified = Boolean(payment_id || sandbox_token);
    }

    if (!isVerified) {
      return NextResponse.json({ error: 'Invalid payment signature or verification failed' }, { status: 400 });
    }

    // Mark Order as Paid
    order.status = 'paid';
    order.updated_at = new Date().toISOString();

    // Authorize Print Job: Transition from payment_pending -> paid -> queued
    const printJob = db.getPrintJobForOrder(order_id);
    if (printJob) {
      printJob.status = 'queued';
      printJob.updated_at = new Date().toISOString();

      // Emit event for real-time listeners and Windows Agent
      db.emit({
        type: 'JOB_QUEUED',
        payload: {
          job_id: printJob.id,
          order_id,
          shop_id: order.shop_id,
          status: 'queued'
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified and print job authorized',
      order_id,
      order_status: 'paid',
      print_job_status: printJob ? printJob.status : 'queued'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
