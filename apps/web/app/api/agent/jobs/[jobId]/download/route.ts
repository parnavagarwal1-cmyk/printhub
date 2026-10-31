import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db-store';
import fs from 'fs';
import path from 'path';

const UPLOADS_DIR = path.join(process.cwd(), '.uploads');

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const shopId = request.headers.get('x-shop-id');
    const jobId = params.jobId;
    const fileId = request.nextUrl.searchParams.get('file_id');

    if (!jobId || !fileId) {
      return NextResponse.json({ error: 'Job ID and File ID required' }, { status: 400 });
    }

    const job = db.printJobs.get(jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (shopId && job.shop_id !== shopId) {
      return NextResponse.json({ error: 'Forbidden: Tenant mismatch' }, { status: 403 });
    }

    const order = db.getOrder(job.order_id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderFile = order.files.find(f => f.id === fileId);
    if (!orderFile) {
      return NextResponse.json({ error: 'File record not found in order' }, { status: 404 });
    }

    const filePath = path.join(UPLOADS_DIR, orderFile.storage_path);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Physical file not found on disk' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': orderFile.mime_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${orderFile.original_filename}"`,
        'X-File-Checksum': orderFile.file_checksum || ''
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
