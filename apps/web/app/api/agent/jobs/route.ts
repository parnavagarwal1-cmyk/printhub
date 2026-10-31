import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db-store';

export async function GET(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    const deviceId = request.headers.get('x-device-id');

    if (!shopId || !deviceId) {
      return NextResponse.json({ error: 'Device credentials required' }, { status: 401 });
    }

    // Find all print jobs that are 'queued' for this shop
    const queuedJobs = Array.from(db.printJobs.values()).filter(
      job => job.shop_id === shopId && job.status === 'queued'
    );

    const enrichedJobs = queuedJobs.map(job => {
      const order = db.getOrder(job.order_id);
      const printer = db.printers.get(job.printer_id);

      return {
        id: job.id,
        order_id: job.order_id,
        shop_id: job.shop_id,
        printer_id: job.printer_id,
        printer_name: printer ? printer.name : 'Default Printer',
        status: job.status,
        files: order ? order.files : [],
        items: order ? order.items : [],
        created_at: job.created_at
      };
    });

    return NextResponse.json({
      success: true,
      jobs: enrichedJobs
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    const deviceId = request.headers.get('x-device-id');
    const body = await request.json();
    const { job_id, status, error_message, note } = body;

    if (!job_id || !status) {
      return NextResponse.json({ error: 'Job ID and status are required' }, { status: 400 });
    }

    const job = db.printJobs.get(job_id);
    if (!job) {
      return NextResponse.json({ error: 'Print job not found' }, { status: 404 });
    }

    // Enforce tenant boundary: Job shop_id must match authenticated agent's shop_id
    if (shopId && job.shop_id !== shopId) {
      return NextResponse.json({ error: 'Unauthorized: Job belongs to another shop' }, { status: 403 });
    }

    // Valid state transitions
    const validStatuses = [
      'uploaded', 'processing', 'awaiting_payment', 'payment_pending',
      'paid', 'queued', 'downloading', 'printing', 'completed',
      'failed', 'needs_reconciliation', 'cancelled', 'expired'
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status: ${status}` }, { status: 400 });
    }

    job.status = status;
    job.updated_at = new Date().toISOString();
    if (error_message) job.error_message = error_message;
    if (deviceId) job.device_id = deviceId;

    if (status === 'printing' && !job.started_at) {
      job.started_at = new Date().toISOString();
    } else if (status === 'completed') {
      job.completed_at = new Date().toISOString();
      // Also update order status
      const order = db.getOrder(job.order_id);
      if (order) {
        order.status = 'completed';
        order.updated_at = new Date().toISOString();
      }
    }

    // Broadcast state transition to live customer tracking & dashboard
    db.emit({
      type: 'JOB_STATUS_UPDATED',
      payload: {
        job_id: job.id,
        order_id: job.order_id,
        shop_id: job.shop_id,
        status: job.status,
        error_message: job.error_message,
        note: note || ''
      }
    });

    return NextResponse.json({
      success: true,
      job_id: job.id,
      status: job.status
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
