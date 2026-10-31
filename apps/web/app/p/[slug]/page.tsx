'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Printer, 
  UploadCloud, 
  FileText, 
  Check, 
  Trash2, 
  Smartphone, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  Sparkles,
  QrCode,
  Layers,
  Copy,
  ArrowRight
} from 'lucide-react';
import { formatPaise, formatFileSize } from '@/lib/utils';

interface UploadedDoc {
  id: string;
  original_filename: string;
  storage_path: string;
  file_size: number;
  mime_type: string;
  raw_page_count: number;
  printable_page_count: number;
  color_mode: 'bw' | 'color';
  paper_size: string;
  page_range: string;
  copies: number;
  sided_mode: 'single' | 'double_long_edge' | 'double_short_edge';
  orientation: 'portrait' | 'landscape' | 'auto';
}

export default function CustomerPrintPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [shopData, setShopData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [files, setFiles] = useState<UploadedDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>('');

  // Pricing breakdown
  const [pricingBreakdown, setPricingBreakdown] = useState<any>(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);

  // Payment State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Shop details
  useEffect(() => {
    async function fetchShop() {
      try {
        setLoading(true);
        const res = await fetch(`/api/shops/${slug}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to load shop');
          return;
        }
        setShopData(data);
        if (data.printers && data.printers.length > 0) {
          const defaultPrinter = data.printers.find((p: any) => p.is_default) || data.printers[0];
          setSelectedPrinterId(defaultPrinter.id);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (slug) fetchShop();
  }, [slug]);

  // Recalculate price whenever files or item settings change
  useEffect(() => {
    async function updatePricing() {
      if (!shopData || files.length === 0) {
        setPricingBreakdown(null);
        return;
      }
      try {
        setCalculatingPrice(true);
        const itemsPayload = files.map(f => ({
          fileId: f.id,
          filename: f.original_filename,
          rawPageCount: f.raw_page_count,
          colorMode: f.color_mode,
          paperSize: f.paper_size,
          pageRange: f.page_range,
          copies: f.copies,
          sidedMode: f.sided_mode,
          orientation: f.orientation
        }));

        const res = await fetch('/api/orders/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shop_id: shopData.shop.id,
            items: itemsPayload
          })
        });
        const data = await res.json();
        if (data.success) {
          setPricingBreakdown(data.pricing);
        }
      } catch (err) {
        console.error('Pricing calc error', err);
      } finally {
        setCalculatingPrice(false);
      }
    }

    const timer = setTimeout(updatePricing, 200);
    return () => clearTimeout(timer);
  }, [files, shopData]);

  // File Upload Handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0 || !shopData) return;

    setUploading(true);
    const newDocs: UploadedDoc[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('shop_id', shopData.shop.id);

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();

        if (res.ok && data.success) {
          const doc = data.file;
          newDocs.push({
            id: doc.id,
            original_filename: doc.original_filename,
            storage_path: doc.storage_path,
            file_size: doc.file_size,
            mime_type: doc.mime_type,
            raw_page_count: doc.raw_page_count,
            printable_page_count: doc.printable_page_count,
            color_mode: 'bw',
            paper_size: 'A4',
            page_range: 'all',
            copies: 1,
            sided_mode: 'single',
            orientation: 'portrait'
          });
        } else {
          alert(`Error uploading ${file.name}: ${data.error || 'Failed'}`);
        }
      } catch (err: any) {
        alert(`Upload error for ${file.name}: ${err.message}`);
      }
    }

    setFiles(prev => [...prev, ...newDocs]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateFileSetting = (id: string, key: keyof UploadedDoc, value: any) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, [key]: value } : f));
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  // Submit Order & Open Dynamic Payment QR
  const handleProceedToPayment = async () => {
    if (files.length === 0 || !shopData) return;
    try {
      setIsSubmitting(true);
      // 1. Create order
      const orderRes = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_id: shopData.shop.id,
          printer_id: selectedPrinterId,
          files: files,
          items: files.map(f => ({
            fileId: f.id,
            rawPageCount: f.raw_page_count,
            colorMode: f.color_mode,
            paperSize: f.paper_size,
            pageRange: f.page_range,
            copies: f.copies,
            sidedMode: f.sided_mode,
            orientation: f.orientation
          }))
        })
      });

      const orderData = await orderRes.json();
      if (!orderData.success) {
        alert(orderData.error || 'Failed to create order');
        setIsSubmitting(false);
        return;
      }

      // 2. Generate dynamic payment intent and QR
      const payRes = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderData.order_id })
      });
      const payInfo = await payRes.json();

      setPaymentData({
        ...payInfo,
        order_number: orderData.order_number,
        order_id: orderData.order_id
      });
      setPaymentModalOpen(true);
    } catch (err: any) {
      alert(`Error initializing payment: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Simulate or verify payment
  const handleVerifyPayment = async () => {
    if (!paymentData) return;
    try {
      setVerifyingPayment(true);
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: paymentData.order_id,
          payment_id: `pay_sim_${Date.now()}`,
          sandbox_token: 'test_token_verified'
        })
      });
      const data = await res.json();
      if (data.success) {
        // Redirect to live status tracker
        router.push(`/p/${slug}/status/${paymentData.order_id}`);
      } else {
        alert(data.error || 'Payment verification failed');
      }
    } catch (err: any) {
      alert(`Verification error: ${err.message}`);
    } finally {
      setVerifyingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900 text-white min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
          <p className="text-sm text-slate-400">Loading shop print services...</p>
        </div>
      </div>
    );
  }

  if (error || !shopData) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900 p-6 min-h-screen">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white mb-2">Shop Unavailable</h2>
          <p className="text-sm text-slate-400 mb-6">{error || 'This print shop could not be found or is inactive.'}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold text-sm transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 min-h-screen pb-28">
      {/* Top Shop Banner */}
      <header className="border-b border-slate-800 bg-slate-900 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base text-white leading-tight">{shopData.shop.name}</h1>
              <p className="text-xs text-slate-400 truncate max-w-[220px] sm:max-w-sm">{shopData.shop.address}</p>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Upload Zone */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-sky-400" />
                Upload Documents
              </h2>
              <p className="text-xs text-slate-400">Supports PDF, DOCX, JPG, JPEG, PNG (Max 50MB)</p>
            </div>
            <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300">
              {files.length} {files.length === 1 ? 'file' : 'files'}
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.webp"
            onChange={handleFileUpload}
            className="hidden"
            id="doc-upload-input"
          />

          <label
            htmlFor="doc-upload-input"
            className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-sky-500/60 rounded-xl p-8 cursor-pointer bg-slate-900/50 hover:bg-slate-800/40 transition group"
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
                <span className="text-xs text-slate-400">Inspecting document pages...</span>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-slate-800 group-hover:bg-sky-500/10 flex items-center justify-center text-slate-400 group-hover:text-sky-400 transition mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-200">Tap to upload or drag files here</p>
                <p className="text-xs text-slate-500 mt-1">Automatic billable page calculation</p>
              </>
            )}
          </label>
        </section>

        {/* Uploaded Files & Print Settings */}
        {files.length > 0 && (
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider px-1">
              Print Configuration
            </h3>

            {files.map((file, idx) => (
              <div key={file.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold text-xs shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-xs">
                        {file.original_filename}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {formatFileSize(file.file_size)} •{' '}
                        <span className="text-sky-400 font-semibold">{file.raw_page_count} pages detected</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                    title="Remove file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Configuration Controls Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {/* Color Mode */}
                  <div>
                    <label className="text-slate-400 block mb-1.5 font-medium">Color Mode</label>
                    <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                      <button
                        type="button"
                        onClick={() => updateFileSetting(file.id, 'color_mode', 'bw')}
                        className={`py-1.5 text-center font-semibold rounded ${
                          file.color_mode === 'bw'
                            ? 'bg-sky-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        B&W
                      </button>
                      <button
                        type="button"
                        onClick={() => updateFileSetting(file.id, 'color_mode', 'color')}
                        className={`py-1.5 text-center font-semibold rounded ${
                          file.color_mode === 'color'
                            ? 'bg-sky-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Color
                      </button>
                    </div>
                  </div>

                  {/* Sided Printing (Duplex) */}
                  <div>
                    <label className="text-slate-400 block mb-1.5 font-medium">Sides</label>
                    <select
                      value={file.sided_mode}
                      onChange={(e) => updateFileSetting(file.id, 'sided_mode', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-slate-200 focus:outline-none focus:border-sky-500"
                    >
                      <option value="single">Single-Sided</option>
                      <option value="double_long_edge">Double (Long Edge)</option>
                      <option value="double_short_edge">Double (Short Edge)</option>
                    </select>
                  </div>

                  {/* Copies */}
                  <div>
                    <label className="text-slate-400 block mb-1.5 font-medium">Copies</label>
                    <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => updateFileSetting(file.id, 'copies', Math.max(1, file.copies - 1))}
                        className="px-2.5 py-1.5 text-slate-400 hover:text-white font-bold"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={file.copies}
                        onChange={(e) => updateFileSetting(file.id, 'copies', Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full text-center bg-transparent text-white font-semibold focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => updateFileSetting(file.id, 'copies', file.copies + 1)}
                        className="px-2.5 py-1.5 text-slate-400 hover:text-white font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Page Range */}
                  <div>
                    <label className="text-slate-400 block mb-1.5 font-medium">Pages (e.g. 1-3, 5)</label>
                    <input
                      type="text"
                      value={file.page_range}
                      onChange={(e) => updateFileSetting(file.id, 'page_range', e.target.value)}
                      placeholder="all"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Target Printer Selector */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <label className="text-xs text-slate-400 block mb-2 font-medium">Output Printer</label>
              <select
                value={selectedPrinterId}
                onChange={(e) => setSelectedPrinterId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
              >
                {shopData.printers.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.is_color_supported ? '(Color)' : '(B&W)'} {p.is_default ? '★ Default' : ''}
                  </option>
                ))}
              </select>
            </div>
          </section>
        )}

        {/* Pricing Summary Card */}
        {pricingBreakdown && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white mb-2">Price Breakdown</h3>
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Subtotal ({pricingBreakdown.items.reduce((acc: number, cur: any) => acc + cur.totalSides, 0)} printed sides):</span>
                <span>{formatPaise(pricingBreakdown.subtotalPaise)}</span>
              </div>
              {pricingBreakdown.minOrderAdjustmentPaise > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>Minimum order adjustment:</span>
                  <span>+{formatPaise(pricingBreakdown.minOrderAdjustmentPaise)}</span>
                </div>
              )}
              {pricingBreakdown.taxPaise > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>GST / Tax:</span>
                  <span>+{formatPaise(pricingBreakdown.taxPaise)}</span>
                </div>
              )}
              <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-bold text-white">
                <span>Total Amount:</span>
                <span className="text-sky-400 text-base">{pricingBreakdown.totalPaiseFormatted}</span>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Floating Bottom Action Bar */}
      {files.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 p-4 z-40">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-400">Total payable</p>
              <p className="text-lg font-extrabold text-white">
                {pricingBreakdown ? pricingBreakdown.totalPaiseFormatted : 'Calculating...'}
              </p>
            </div>

            <button
              onClick={handleProceedToPayment}
              disabled={isSubmitting || calculatingPrice}
              className="py-3 px-6 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-sky-500/20 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating Order...
                </>
              ) : (
                <>
                  Pay & Print Automatically <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Payment QR Modal */}
      {paymentModalOpen && paymentData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">UPI Auto Pay</span>
              <span className="text-xs px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-mono">
                {paymentData.order_number}
              </span>
            </div>

            <div>
              <p className="text-xs text-slate-400">Scan using any UPI App</p>
              <p className="text-2xl font-black text-white mt-1">{paymentData.amount_formatted}</p>
            </div>

            {/* QR Code Container */}
            <div className="p-3 bg-white rounded-2xl shadow-inner inline-block mx-auto">
              <img
                src={paymentData.qr_code_url}
                alt="Dynamic UPI Payment QR"
                className="w-56 h-56 mx-auto rounded-lg"
              />
            </div>

            <p className="text-xs text-slate-400">
              GPay • PhonePe • Paytm • BHIM
            </p>

            <div className="pt-2 space-y-2">
              <a
                href={paymentData.upi_intent_url}
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm transition flex items-center justify-center gap-2"
              >
                <Smartphone className="w-4 h-4" /> Open in UPI App
              </a>

              {/* Instant Verification Button (Sandbox / Webhook Simulator) */}
              <button
                onClick={handleVerifyPayment}
                disabled={verifyingPayment}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition flex items-center justify-center gap-2"
              >
                {verifyingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Verifying Signature...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Simulate Paid & Authorize Job
                  </>
                )}
              </button>

              <button
                onClick={() => setPaymentModalOpen(false)}
                className="text-xs text-slate-500 hover:text-slate-300 transition py-1 block w-full"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
