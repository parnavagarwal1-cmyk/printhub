import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function GET(request: NextRequest) {
  try {
    const text = request.nextUrl.searchParams.get('text');
    const format = request.nextUrl.searchParams.get('format') || 'svg'; // svg or png

    if (!text) {
      return NextResponse.json({ error: 'Text/URL query parameter required' }, { status: 400 });
    }

    if (format === 'svg') {
      const svg = await QRCode.toString(text, {
        type: 'svg',
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });

      return new NextResponse(svg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      });
    } else {
      const pngBuffer = await QRCode.toBuffer(text, {
        type: 'png',
        width: 512,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });

      return new NextResponse(new Uint8Array(pngBuffer), {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
