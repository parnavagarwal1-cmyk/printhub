import {
  ShopPricing,
  PrintItemConfig,
  CalculatedOrderPrice,
  PriceBreakdownItem
} from './types';

/**
 * Parses a page range string (e.g., "1-3, 5, 8-10") bounded by maxPages.
 * Returns sorted unique 1-indexed page numbers.
 */
export function parsePageRange(rangeStr: string, maxPages: number): number[] {
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

/**
 * Calculates pricing for print items based on shop rules.
 * All financial inputs and outputs are in integer paise.
 */
export function calculateOrderPrice(
  items: PrintItemConfig[],
  pricing: ShopPricing
): CalculatedOrderPrice {
  let subtotalPaise = 0;
  const breakdownItems: PriceBreakdownItem[] = [];

  for (const item of items) {
    const selectedPages = parsePageRange(item.pageRange, item.rawPageCount);
    const effectivePages = selectedPages.length;
    const copies = Math.max(1, item.copies || 1);
    const baseSideRate = item.colorMode === 'color' ? pricing.color_price_paise : pricing.bw_price_paise;
    const paperMultiplier = item.paperSize === 'A3' ? Number(pricing.a3_multiplier || 2.0) : 1.0;

    let itemTotalPaise = 0;

    if (item.sidedMode === 'single') {
      const totalSides = effectivePages * copies;
      const sidePrice = Math.round(baseSideRate * paperMultiplier);
      itemTotalPaise = totalSides * sidePrice;

      breakdownItems.push({
        fileId: item.fileId,
        filename: item.filename,
        effectivePages,
        copies,
        sidesPerCopy: effectivePages,
        totalSides,
        baseSideRatePaise: baseSideRate,
        duplexDiscountPaise: 0,
        paperSizeMultiplier: paperMultiplier,
        netItemPaise: itemTotalPaise
      });
    } else {
      // Double sided:
      // In duplex, each sheet has up to 2 sides.
      // Side 1 is charged at full baseSideRate.
      // Side 2 (backside) receives duplex_discount_paise if applicable.
      let singleCopyPaise = 0;
      let totalSides = 0;

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

      breakdownItems.push({
        fileId: item.fileId,
        filename: item.filename,
        effectivePages,
        copies,
        sidesPerCopy: effectivePages,
        totalSides,
        baseSideRatePaise: baseSideRate,
        duplexDiscountPaise: pricing.duplex_discount_paise,
        paperSizeMultiplier: paperMultiplier,
        netItemPaise: itemTotalPaise
      });
    }

    subtotalPaise += itemTotalPaise;
  }

  // Minimum order rule
  const minOrderPaise = pricing.min_order_paise || 0;
  const minOrderAdjustmentPaise = subtotalPaise < minOrderPaise ? minOrderPaise - subtotalPaise : 0;
  const adjustedSubtotal = subtotalPaise + minOrderAdjustmentPaise;

  const serviceFeePaise = pricing.service_fee_paise || 0;
  const taxableBase = adjustedSubtotal + serviceFeePaise;
  const taxPercentage = pricing.tax_percentage || 0;
  const taxPaise = Math.round((taxableBase * taxPercentage) / 100);

  const totalPaise = taxableBase + taxPaise;

  return {
    items: breakdownItems,
    subtotalPaise,
    serviceFeePaise,
    minOrderAdjustmentPaise,
    taxPaise,
    totalPaise,
    totalPaiseFormatted: `₹${(totalPaise / 100).toFixed(2)}`
  };
}
