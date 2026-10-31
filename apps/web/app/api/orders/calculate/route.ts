import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db-store';

function parsePageRange(rangeStr: string, maxPages: number): number[] {
  if (!rangeStr || rangeStr.trim().toLowerCase() === 'all') {
    return Array.from({ length: Math.max(1, maxPages) }, (_, i) => i + 1);
  }
  const pagesSet = new Set<number>();
  const parts = rangeStr.split(',');
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const minP = Math.max(1, Math.min(start, end));
        const maxP = Math.min(maxPages, Math.max(start, end));
        for (let p = minP; p <= maxP; p++) {
          pagesSet.add(p);
        }
      }
    } else {
      const page = parseInt(trimmed, 10);
      if (!isNaN(page) && page >= 1 && page <= maxPages) {
        pagesSet.add(page);
      }
    }
  }
  const result = Array.from(pagesSet).sort((a, b) => a - b);
  return result.length > 0 ? result : [1];
}

export async function POST(request: NextRequest) {
  try {
    const { shop_id, items } = await request.json();

    if (!shop_id || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Missing shop_id or items array' }, { status: 400 });
    }

    const pricing = db.getPricing(shop_id);
    let subtotalPaise = 0;
    const breakdownItems: any[] = [];

    for (const item of items) {
      const rawPages = Number(item.rawPageCount) || 1;
      const selectedPages = parsePageRange(item.pageRange, rawPages);
      const effectivePages = selectedPages.length;
      const copies = Math.max(1, parseInt(item.copies, 10) || 1);
      const baseSideRate = item.colorMode === 'color' ? pricing.color_price_paise : pricing.bw_price_paise;
      const paperMultiplier = item.paperSize === 'A3' ? Number(pricing.a3_multiplier || 2.0) : 1.0;

      let itemTotalPaise = 0;
      let totalSides = 0;

      if (item.sidedMode === 'single') {
        totalSides = effectivePages * copies;
        const sidePrice = Math.round(baseSideRate * paperMultiplier);
        itemTotalPaise = totalSides * sidePrice;
      } else {
        // Double-sided
        let singleCopyPaise = 0;
        for (let p = 1; p <= effectivePages; p++) {
          totalSides += 1;
          const isBackSide = p % 2 === 0;
          let sideRate = baseSideRate;
          if (isBackSide && pricing.duplex_discount_paise > 0) {
            sideRate = Math.max(0, baseSideRate - pricing.duplex_discount_paise);
          }
          singleCopyPaise += Math.round(sideRate * paperMultiplier);
        }
        itemTotalPaise = singleCopyPaise * copies;
        totalSides = totalSides * copies;
      }

      subtotalPaise += itemTotalPaise;

      breakdownItems.push({
        fileId: item.fileId,
        filename: item.filename,
        effectivePages,
        copies,
        totalSides,
        baseSideRatePaise: baseSideRate,
        duplexDiscountPaise: pricing.duplex_discount_paise,
        paperSizeMultiplier: paperMultiplier,
        netItemPaise: itemTotalPaise
      });
    }

    // Minimum order amount adjustment
    const minOrderPaise = pricing.min_order_paise || 0;
    const minOrderAdjustmentPaise = subtotalPaise < minOrderPaise ? minOrderPaise - subtotalPaise : 0;
    const adjustedSubtotal = subtotalPaise + minOrderAdjustmentPaise;

    const serviceFeePaise = pricing.service_fee_paise || 0;
    const taxableBase = adjustedSubtotal + serviceFeePaise;
    const taxPercentage = pricing.tax_percentage || 0;
    const taxPaise = Math.round((taxableBase * taxPercentage) / 100);

    const totalPaise = taxableBase + taxPaise;

    return NextResponse.json({
      success: true,
      pricing: {
        items: breakdownItems,
        subtotalPaise,
        minOrderAdjustmentPaise,
        serviceFeePaise,
        taxPaise,
        totalPaise,
        totalPaiseFormatted: `₹${(totalPaise / 100).toFixed(2)}`
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
