'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Printer, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ArrowLeft, 
  RefreshCw,
  Phone,
  FileCheck2,
  Sparkles
} from 'lucide-react';
import { formatPaise } from '@/lib/utils';

export default function OrderLiveStatusPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const orderId = params?.orderId as string;

  const [orderInfo, setOrderInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchStatus() {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`);
      const data = await res.json();
      if (data.success) {
        setOrderInfo(data);
      }
    } catch (err) {
      console.error('Error fetching order status', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchStatus();
    // Poll every 2 seconds for live status updates from Windows Print Agent
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [orderId]);

  const getStepProgress = (status: string) => {
    const steps = ['paid', 'queued', 'downloading', 'printing', 'completed'];
    const idx = steps.indexOf(status);
    return idx >= 0 ? idx + 1 : 1;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950 text-white min-h-screen">
        <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
      </div>
    );
  }

  const jobStatus = orderInfo?.job?.status || 'queued';
  const isCompleted = jobStatus === 'completed';
  const isPrinting = jobStatus === 'printing';
  const isFailed = jobStatus === 'failed';
  const isReconcile = jobStatus === 'needs_reconciliation';

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <button
            onClick={() => router.push(`/p/${slug}`)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" /> New Print
          </button>
          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-slate-800 text-sky-400">
            {orderInfo?.order?.order_number}
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 flex-1 w-full space-y-6">
        {/* Main Status Hero Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500" />

          {isCompleted ? (
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-white">Printing Completed!</h2>
              <p className="text-sm text-slate-400 max-w-sm mx-auto">
                Your documents have been printed successfully. Please collect them at the counter.
              </p>
            </div>
          ) : isPrinting ? (
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center mx-auto border border-sky-500/30 animate-pulse">
                <Printer className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-white">Printing in Progress...</h2>
              <p className="text-sm text-slate-400">
                Windows Print Spooler is processing pages on <span className="text-white font-medium">{orderInfo?.job?.printer_name}</span>.
              </p>
            </div>
          ) : isReconcile || isFailed ? (
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-white">
                {isReconcile ? 'Printer Attention Needed' : 'Printing Failed'}
              </h2>
              <p className="text-sm text-slate-400 max-w-sm mx-auto">
                {orderInfo?.job?.error_message || 'Please contact shop staff to assist with your job.'}
              </p>
              {orderInfo?.shop?.phone && (
                <div className="pt-2">
                  <a
                    href={`tel:${orderInfo.shop.phone}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 transition"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call Shop ({orderInfo.shop.phone})
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8 animate-spin" />
              </div>
              <h2 className="text-2xl font-black text-white">In Print Queue</h2>
              <p className="text-sm text-slate-400">
                Authorized and queued for PrintFlow Windows Agent download.
              </p>
            </div>
          )}

          {/* Progress Steps Indicator */}
          <div className="grid grid-cols-4 gap-2 mt-8 pt-6 border-t border-slate-800/80 text-xs">
            <div className={`p-2 rounded-xl text-center ${getStepProgress(jobStatus) >= 1 ? 'bg-sky-500/10 text-sky-400 font-semibold' : 'text-slate-600'}`}>
              1. Paid
            </div>
            <div className={`p-2 rounded-xl text-center ${getStepProgress(jobStatus) >= 2 ? 'bg-sky-500/10 text-sky-400 font-semibold' : 'text-slate-600'}`}>
              2. Queued
            </div>
            <div className={`p-2 rounded-xl text-center ${getStepProgress(jobStatus) >= 4 ? 'bg-sky-500/10 text-sky-400 font-semibold' : 'text-slate-600'}`}>
              3. Spooling
            </div>
            <div className={`p-2 rounded-xl text-center ${getStepProgress(jobStatus) >= 5 ? 'bg-emerald-500/10 text-emerald-400 font-semibold' : 'text-slate-600'}`}>
              4. Done
            </div>
          </div>
        </div>

        {/* Order Details Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Order Summary</h3>
          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex justify-between">
              <span>Order Reference:</span>
              <span className="font-mono font-semibold text-white">{orderInfo?.order?.order_number}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Paid Amount:</span>
              <span className="font-semibold text-emerald-400">{formatPaise(orderInfo?.order?.total_amount_paise)}</span>
            </div>
            <div className="flex justify-between">
              <span>Printer Device:</span>
              <span className="text-slate-200">{orderInfo?.job?.printer_name || 'Standard Spooler'}</span>
            </div>
            <div className="flex justify-between">
              <span>Shop Name:</span>
              <span className="text-slate-200">{orderInfo?.shop?.name}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
