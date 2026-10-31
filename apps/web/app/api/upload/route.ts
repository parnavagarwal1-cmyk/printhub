import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Upload directory within workspace temp storage
const UPLOADS_DIR = path.join(process.cwd(), '.uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const shopId = formData.get('shop_id') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID is required' }, { status: 400 });
    }

    // Maximum 50MB size limit
    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 50MB limit' }, { status: 400 });
    }

    const filename = file.name;
    const ext = path.extname(filename).toLowerCase();
    const allowedExts = ['.pdf', '.docx', '.doc', '.jpg', '.jpeg', '.png', '.webp'];

    if (!allowedExts.includes(ext)) {
      return NextResponse.json(
        { error: `Unsupported file format ${ext}. Allowed formats: PDF, DOCX, JPG, JPEG, PNG` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
    const fileId = crypto.randomUUID();
    const storedFilename = `${fileId}_${path.basename(filename)}`;
    const storagePath = path.join(UPLOADS_DIR, storedFilename);

    // Save file to disk
    fs.writeFileSync(storagePath, buffer);

    let rawPageCount = 1;
    let printablePageCount = 1;

    // Process PDF page count with pdf-lib
    if (ext === '.pdf') {
      try {
        const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        rawPageCount = pdfDoc.getPageCount();
        printablePageCount = rawPageCount;
      } catch (err: any) {
        return NextResponse.json(
          { error: `Corrupted or encrypted PDF cannot be processed: ${err.message}` },
          { status: 400 }
        );
      }
    } else if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      rawPageCount = 1;
      printablePageCount = 1;
    } else if (['.docx', '.doc'].includes(ext)) {
      // For DOCX: default to estimated page count based on size (avg 25KB/page) minimum 1
      rawPageCount = Math.max(1, Math.ceil(file.size / (35 * 1024)));
      printablePageCount = rawPageCount;
    }

    return NextResponse.json({
      success: true,
      file: {
        id: fileId,
        original_filename: filename,
        storage_path: storedFilename,
        file_size: file.size,
        mime_type: file.type || 'application/octet-stream',
        file_checksum: checksum,
        raw_page_count: rawPageCount,
        printable_page_count: printablePageCount,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'File upload failed' }, { status: 500 });
  }
}
