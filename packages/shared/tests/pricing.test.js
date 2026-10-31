const assert = require('assert');

// Simple standalone JS equivalent for fast unit testing
function parsePageRange(rangeStr, maxPages) {
  if (!rangeStr || rangeStr.trim().toLowerCase() === 'all') {
    return Array.from({ length: Math.max(1, maxPages) }, (_, i) => i + 1);
  }
  const pagesSet = new Set();
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

function calculateOrderPrice(items, pricing) {
  let subtotalPaise = 0;
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
    } else {
      let singleCopyPaise = 0;
      for (let p = 1; p <= effectivePages; p++) {
        const isBackSide = p % 2 === 0;
        let sideRate = baseSideRate;
        if (isBackSide && pricing.duplex_discount_paise > 0) {
          sideRate = Math.max(0, baseSideRate - pricing.duplex_discount_paise);
        }
        singleCopyPaise += Math.round(sideRate * paperMultiplier);
      }
      itemTotalPaise = singleCopyPaise * copies;
    }
    subtotalPaise += itemTotalPaise;
  }

  const minOrderPaise = pricing.min_order_paise || 0;
  const minOrderAdjustmentPaise = subtotalPaise < minOrderPaise ? minOrderPaise - subtotalPaise : 0;
  const adjustedSubtotal = subtotalPaise + minOrderAdjustmentPaise;
  const serviceFeePaise = pricing.service_fee_paise || 0;
  const taxableBase = adjustedSubtotal + serviceFeePaise;
  const taxPercentage = pricing.tax_percentage || 0;
  const taxPaise = Math.round((taxableBase * taxPercentage) / 100);
  const totalPaise = taxableBase + taxPaise;

  return {
    subtotalPaise,
    serviceFeePaise,
    minOrderAdjustmentPaise,
    taxPaise,
    totalPaise,
    totalPaiseFormatted: `₹${(totalPaise / 100).toFixed(2)}`
  };
}

// ----------------------------------------------------
// TEST CASES
// ----------------------------------------------------
console.log('Testing Page Range Parsing...');
assert.deepStrictEqual(parsePageRange('all', 10), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
assert.deepStrictEqual(parsePageRange('1-3, 5, 8-9', 10), [1, 2, 3, 5, 8, 9]);
assert.deepStrictEqual(parsePageRange('1-20', 5), [1, 2, 3, 4, 5], 'Should clamp to maxPages');
assert.deepStrictEqual(parsePageRange('invalid', 3), [1], 'Fallback to page 1');
console.log('✓ Page Range Parsing Tests Passed.');

console.log('Testing Pricing Calculations...');
const defaultPricing = {
  shop_id: 'test-shop',
  bw_price_paise: 200,          // ₹2.00
  color_price_paise: 1000,      // ₹10.00
  duplex_discount_paise: 50,    // ₹0.50 discount on back
  a3_multiplier: 2.0,
  min_order_paise: 500,         // ₹5.00 min order
  service_fee_paise: 0,
  tax_percentage: 0
};

// Case 1: 2 B&W single-sided pages (₹4.00), min order applies (₹5.00 total)
const res1 = calculateOrderPrice([{
  fileId: '1',
  filename: 'notes.pdf',
  colorMode: 'bw',
  paperSize: 'A4',
  pageRange: '1-2',
  copies: 1,
  sidedMode: 'single',
  rawPageCount: 2
}], defaultPricing);

assert.strictEqual(res1.subtotalPaise, 400);
assert.strictEqual(res1.minOrderAdjustmentPaise, 100);
assert.strictEqual(res1.totalPaise, 500);
assert.strictEqual(res1.totalPaiseFormatted, '₹5.00');

// Case 2: 4 pages B&W duplex (page 1: ₹2.00, page 2: ₹1.50, page 3: ₹2.00, page 4: ₹1.50 = ₹7.00)
const res2 = calculateOrderPrice([{
  fileId: '2',
  filename: 'assignment.pdf',
  colorMode: 'bw',
  paperSize: 'A4',
  pageRange: 'all',
  copies: 1,
  sidedMode: 'double_long_edge',
  rawPageCount: 4
}], defaultPricing);

assert.strictEqual(res2.subtotalPaise, 700);
assert.strictEqual(res2.totalPaise, 700);

// Case 3: 2 copies of 1 color A3 page (1 page * ₹10.00 * 2.0 = ₹20.00 per copy * 2 = ₹40.00)
const res3 = calculateOrderPrice([{
  fileId: '3',
  filename: 'poster.pdf',
  colorMode: 'color',
  paperSize: 'A3',
  pageRange: '1',
  copies: 2,
  sidedMode: 'single',
  rawPageCount: 1
}], defaultPricing);

assert.strictEqual(res3.totalPaise, 4000);
assert.strictEqual(res3.totalPaiseFormatted, '₹40.00');

console.log('✓ All Pricing Engine Unit Tests Passed Successfully.');
