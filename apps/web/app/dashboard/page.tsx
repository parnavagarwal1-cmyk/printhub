'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Printer, 
  Monitor, 
  QrCode, 
  DollarSign, 
  FileText, 
  BarChart3, 
  Settings, 
  Plus, 
  RefreshCw, 
  Copy, 
  Download, 
  Check, 
  ArrowUpRight,
  ShieldCheck,
  HardDrive,
  Wifi,
  ExternalLink,
  Key
} from 'lucide-react';
import { formatPaise, formatDate } from '@/lib/utils';

export default function ShopOwnerDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'printers' | 'devices' | 'qr' | 'pricing'>('overview');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  // Pairing PIN modal
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [generatedPin, setGeneratedPin] = useState<string | null>(null);
  const [pinLoading, setPinLoading] = useState(false);

  // Pricing Form State
  const [pricingForm, setPricingForm] = useState<any>({});
  const [savingPricing, setSavingPricing] = useState(false);

  async function loadDashboard() {
    try {
      const res = await fetch('/api/shops/dashboard?shop_id=11111111-1111-1111-1111-111111111111');
      const data = await res.json();
      if (data.success) {
        setDashboardData(data);
        setPricingForm(data.pricing);
      }
    } catch (err) {
      console.error('Error loading dashboard', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleGeneratePin = async () => {
    try {
      setPinLoading(true);
      const res = await fetch('/api/shops/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_id: dashboardData.shop.id })
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedPin(data.pin);
        setPinModalOpen(true);
      }
    } catch (err) {
      alert('Failed to generate pairing PIN');
    } finally {
      setPinLoading(false);
    }
  };

  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingPricing(true);
      const res = await fetch('/api/shops/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_id: dashboardData.shop.id,
          ...pricingForm
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Pricing rules updated successfully!');
        loadDashboard();
      }
    } catch (err) {
      alert('Error updating pricing');
    } finally {
      setSavingPricing(false);
    }
  };

  const publicShopUrl = typeof window !== 'undefined' && dashboardData
    ? `${window.location.origin}/p/${dashboardData.shop.slug}`
    : 'https://printflow.com/p/campus-prints';

  const copyUrl = () => {
    navigator.clipboard.writeText(publicShopUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading && !dashboardData) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950 text-white min-h-screen">
        <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
      </div>
    );
  }

  const { metrics, printers, devices, orders, shop } = dashboardData;

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 min-h-screen">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-white font-bold text-lg">
              <div className="bg-sky-500 text-slate-950 p-1.5 rounded-lg">
                <Printer className="w-5 h-5" />
              </div>
              <span>PrintFlow</span>
            </Link>
            <span className="text-slate-600 font-bold">/</span>
            <span className="text-sm font-semibold text-slate-300">{shop.name}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleGeneratePin}
              disabled={pinLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition"
            >
              <Key className="w-3.5 h-3.5" /> Pair Windows PC
            </button>
            <Link
              href={`/p/${shop.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
            >
              Customer View <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full flex-1 flex flex-col">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-4 mb-6 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'orders', label: `Orders (${orders.length})`, icon: FileText },
            { id: 'printers', label: `Printers (${printers.length})`, icon: Printer },
            { id: 'devices', label: `Computers (${devices.length})`, icon: Monitor },
            { id: 'qr', label: 'Shop QR & Link', icon: QrCode },
            { id: 'pricing', label: 'Pricing Rules', icon: DollarSign },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Total Revenue
                </span>
                <p className="text-2xl font-black text-white">{formatPaise(metrics.totalRevenuePaise)}</p>
                <span className="text-xs text-emerald-400 mt-2 block">100% Verified UPI</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Total Orders
                </span>
                <p className="text-2xl font-black text-white">{metrics.totalOrders}</p>
                <span className="text-xs text-sky-400 mt-2 block">{orders.filter((o: any) => o.status === 'completed').length} completed</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Printed Pages
                </span>
                <p className="text-2xl font-black text-white">{metrics.totalPagesPrinted}</p>
                <span className="text-xs text-slate-400 mt-2 block">Physical Spool Output</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Active Spooler Queue
                </span>
                <p className="text-2xl font-black text-sky-400">{metrics.pendingJobsCount} jobs</p>
                <span className="text-xs text-slate-400 mt-2 block">Agent Status: Active</span>
              </div>
            </div>

            {/* Quick Printers & Connected Computers Snapshot */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <Printer className="w-4 h-4 text-sky-400" />
                    Connected Windows Printers
                  </h3>
                  <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                    {printers.length} Installed
                  </span>
                </div>
                <div className="space-y-3">
                  {printers.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-white">{p.name}</p>
                          {p.is_default && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 font-medium border border-sky-500/20">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">{p.port_name} • {p.driver_name}</p>
                      </div>
                      <span className="text-xs font-semibold text-emerald-400 uppercase">
                        ● {p.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-sky-400" />
                    Connected Windows PCs
                  </h3>
                  <button
                    onClick={handleGeneratePin}
                    className="text-xs text-sky-400 hover:text-sky-300 font-semibold"
                  >
                    + Pair New PC
                  </button>
                </div>
                <div className="space-y-3">
                  {devices.map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                      <div>
                        <p className="text-xs font-semibold text-white">{d.device_name}</p>
                        <p className="text-[11px] text-slate-500">Agent v{d.agent_version} • {d.device_fingerprint}</p>
                      </div>
                      <span className="text-xs font-semibold text-emerald-400">
                        ● Connected
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Orders */}
        {activeTab === 'orders' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-white">Live Customer Orders</h3>
              <span className="text-xs text-slate-400">{orders.length} total orders</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Order #</th>
                    <th className="py-3 px-4 font-semibold">Date</th>
                    <th className="py-3 px-4 font-semibold">Files & Pages</th>
                    <th className="py-3 px-4 font-semibold">Settings</th>
                    <th className="py-3 px-4 font-semibold">Amount</th>
                    <th className="py-3 px-4 font-semibold">Payment</th>
                    <th className="py-3 px-4 font-semibold">Print Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No customer orders received yet. Scan the shop QR code to place a test print.
                      </td>
                    </tr>
                  ) : (
                    orders.map((order: any) => (
                      <tr key={order.id} className="hover:bg-slate-850">
                        <td className="py-3 px-4 font-mono font-bold text-white">{order.order_number}</td>
                        <td className="py-3 px-4 text-slate-400">{formatDate(order.created_at)}</td>
                        <td className="py-3 px-4">
                          <span className="text-white font-medium">{order.files.length} doc(s)</span>
                          <span className="text-slate-500 block">
                            {order.items.reduce((acc: number, cur: any) => acc + (cur.total_pages * cur.copies), 0)} total sides
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {order.items.map((it: any, i: number) => (
                            <span key={i} className="inline-block bg-slate-800 px-2 py-0.5 rounded mr-1 text-[11px]">
                              {it.color_mode.toUpperCase()} • {it.sided_mode === 'single' ? '1-Sided' : 'Duplex'} • {it.copies}x
                            </span>
                          ))}
                        </td>
                        <td className="py-3 px-4 font-bold text-white">{formatPaise(order.total_amount_paise)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            order.status === 'paid' || order.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {order.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            order.job_status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : order.job_status === 'printing'
                              ? 'bg-sky-500/10 text-sky-400 animate-pulse'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {order.job_status?.toUpperCase() || 'QUEUED'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Printers */}
        {activeTab === 'printers' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">Installed Windows Printers</h3>
                <p className="text-xs text-slate-400">
                  Detected and synchronized automatically by the PrintFlow Agent running on your Windows computers.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {printers.map((p: any) => (
                <div key={p.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-white flex items-center gap-2">
                        {p.name}
                        {p.is_default && (
                          <span className="text-[10px] bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded border border-sky-500/30">
                            Default
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">{p.driver_name}</p>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                      {p.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-900 text-slate-400">
                    <div>
                      <span>Port:</span> <strong className="text-slate-200">{p.port_name}</strong>
                    </div>
                    <div>
                      <span>Color:</span> <strong className="text-slate-200">{p.is_color_supported ? 'Yes' : 'B&W Only'}</strong>
                    </div>
                    <div>
                      <span>Duplex:</span> <strong className="text-slate-200">{p.is_duplex_supported ? 'Supported' : 'No'}</strong>
                    </div>
                    <div>
                      <span>Paper:</span> <strong className="text-slate-200">A4, Letter</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Devices */}
        {activeTab === 'devices' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">Paired Windows Computers</h3>
                <p className="text-xs text-slate-400">
                  Manage desktop PCs connected to your shop's physical USB and Wi-Fi printers.
                </p>
              </div>
              <button
                onClick={handleGeneratePin}
                className="py-2 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Pair New Computer
              </button>
            </div>

            <div className="space-y-3">
              {devices.map((d: any) => (
                <div key={d.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-sky-400">
                      <Monitor className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">{d.device_name}</h4>
                      <p className="text-xs text-slate-500">
                        Fingerprint: {d.device_fingerprint} • Agent v{d.agent_version}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 block mb-1">
                      ● Active & Polling
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Last heartbeat: {formatDate(d.last_heartbeat_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: QR Code & Link */}
        {activeTab === 'qr' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl mx-auto space-y-6 text-center">
            <div>
              <h3 className="text-lg font-bold text-white">Permanent Shop QR Code</h3>
              <p className="text-xs text-slate-400 mt-1">
                Display this QR at your shop counter. Customers scan to upload files and pay directly.
              </p>
            </div>

            <div className="p-4 bg-white rounded-3xl inline-block mx-auto shadow-2xl">
              <img
                src={`/api/qr?text=${encodeURIComponent(publicShopUrl)}&format=svg`}
                alt="Shop Permanent QR"
                className="w-64 h-64 mx-auto rounded-xl"
              />
            </div>

            <div className="flex items-center justify-center gap-2 max-w-md mx-auto">
              <input
                type="text"
                readOnly
                value={publicShopUrl}
                className="bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-300 font-mono w-full"
              />
              <button
                onClick={copyUrl}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold shrink-0 transition"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <a
                href={`/api/qr?text=${encodeURIComponent(publicShopUrl)}&format=png`}
                download={`${shop.slug}-qr.png`}
                className="py-2.5 px-5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Download QR (PNG)
              </a>
              <Link
                href={`/p/${shop.slug}`}
                target="_blank"
                className="py-2.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" /> Test Customer Portal
              </Link>
            </div>
          </div>
        )}

        {/* Tab 6: Pricing Rules */}
        {activeTab === 'pricing' && (
          <form onSubmit={handleSavePricing} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl mx-auto space-y-5">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Automatic Pricing Rules</h3>
              <p className="text-xs text-slate-400">
                All amounts are configured in paise (100 paise = ₹1.00). Price calculations are executed strictly on the backend.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-medium">B&W Price per side (Paise)</label>
                <input
                  type="number"
                  value={pricingForm.bw_price_paise || ''}
                  onChange={(e) => setPricingForm({ ...pricingForm, bw_price_paise: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white font-semibold focus:outline-none focus:border-sky-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Example: 200 paise = ₹2.00
                </span>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-medium">Color Price per side (Paise)</label>
                <input
                  type="number"
                  value={pricingForm.color_price_paise || ''}
                  onChange={(e) => setPricingForm({ ...pricingForm, color_price_paise: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white font-semibold focus:outline-none focus:border-sky-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Example: 1000 paise = ₹10.00
                </span>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-medium">Duplex Back-Side Discount (Paise)</label>
                <input
                  type="number"
                  value={pricingForm.duplex_discount_paise || ''}
                  onChange={(e) => setPricingForm({ ...pricingForm, duplex_discount_paise: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white font-semibold focus:outline-none focus:border-sky-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Discount applied on the second side in duplex
                </span>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-medium">Minimum Order Amount (Paise)</label>
                <input
                  type="number"
                  value={pricingForm.min_order_paise || ''}
                  onChange={(e) => setPricingForm({ ...pricingForm, min_order_paise: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white font-semibold focus:outline-none focus:border-sky-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Example: 500 paise = ₹5.00 min order
                </span>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-medium">A3 Size Price Multiplier</label>
                <input
                  type="number"
                  step="0.1"
                  value={pricingForm.a3_multiplier || ''}
                  onChange={(e) => setPricingForm({ ...pricingForm, a3_multiplier: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white font-semibold focus:outline-none focus:border-sky-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Default 2.0 (Double rate for A3)
                </span>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-medium">GST / Tax Percentage (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={pricingForm.tax_percentage || ''}
                  onChange={(e) => setPricingForm({ ...pricingForm, tax_percentage: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white font-semibold focus:outline-none focus:border-sky-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  0 for exempt, 18 for 18% GST
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={savingPricing}
                className="py-2.5 px-6 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition"
              >
                {savingPricing ? 'Saving...' : 'Save Pricing Rules'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Pairing PIN Modal */}
      {pinModalOpen && generatedPin && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center mx-auto">
              <Key className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Device Pairing PIN</h3>
              <p className="text-xs text-slate-400 mt-1">
                Enter this 6-digit numeric PIN in the PrintFlow Windows Agent application on your computer:
              </p>
            </div>

            <div className="py-4 px-6 bg-slate-950 rounded-2xl border border-slate-800 tracking-widest font-mono text-3xl font-black text-sky-400">
              {generatedPin}
            </div>

            <p className="text-[11px] text-slate-500">
              This PIN is single-use and will expire in 10 minutes.
            </p>

            <button
              onClick={() => setPinModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
