'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Building2, 
  Printer, 
  Monitor, 
  ArrowLeft, 
  RefreshCw, 
  Power, 
  BarChart2, 
  Cpu,
  ExternalLink
} from 'lucide-react';
import { formatPaise, formatDate } from '@/lib/utils';

export default function SuperAdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function loadAdminData() {
    try {
      const res = await fetch('/api/admin');
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error('Error loading admin data', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdminData();
    const interval = setInterval(loadAdminData, 6000);
    return () => clearInterval(interval);
  }, []);

  const toggleShopStatus = async (shopId: string, currentStatus: boolean) => {
    try {
      await fetch('/api/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_id: shopId, is_active: !currentStatus })
      });
      loadAdminData();
    } catch (err) {
      alert('Error updating shop status');
    }
  };

  if (loading && !data) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950 text-white min-h-screen">
        <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
      </div>
    );
  }

  const { stats, shops, devices } = data;

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 min-h-screen flex flex-col">
      {/* Top Admin Navbar */}
      <header className="border-b border-slate-800 bg-slate-900 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-white font-bold text-lg">
              <div className="bg-rose-500 text-white p-1.5 rounded-lg">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span>PrintFlow Super Admin</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Shop Owner Portal
            </Link>
            <Link
              href="/"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Platform Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full space-y-6 flex-1">
        {/* Global SaaS Platform Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Registered Shops
            </span>
            <p className="text-2xl font-black text-white">{stats.totalShops}</p>
            <span className="text-xs text-emerald-400 mt-2 block">{stats.activeShops} currently active</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Platform Gross Revenue
            </span>
            <p className="text-2xl font-black text-white">{formatPaise(stats.totalRevenuePaise)}</p>
            <span className="text-xs text-slate-400 mt-2 block">Total Transactions: {stats.totalOrders}</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Total Spooled Pages
            </span>
            <p className="text-2xl font-black text-white">{stats.totalPagesPrinted}</p>
            <span className="text-xs text-sky-400 mt-2 block">Across all tenant shops</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Connected Windows PCs
            </span>
            <p className="text-2xl font-black text-sky-400">{stats.totalDevices}</p>
            <span className="text-xs text-emerald-400 mt-2 block">Printers online: {stats.totalPrinters}</span>
          </div>
        </div>

        {/* Multi-Tenant Shops Management Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-400" />
              Tenant Print Shops Directory
            </h3>
            <span className="text-xs text-slate-400">{shops.length} registered shops</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Shop Name & Slug</th>
                  <th className="py-3 px-4 font-semibold">Address / Contact</th>
                  <th className="py-3 px-4 font-semibold">Printers</th>
                  <th className="py-3 px-4 font-semibold">Agents</th>
                  <th className="py-3 px-4 font-semibold">Orders</th>
                  <th className="py-3 px-4 font-semibold">Tenant Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {shops.map((shop: any) => (
                  <tr key={shop.id} className="hover:bg-slate-850">
                    <td className="py-3 px-4">
                      <strong className="text-white block font-semibold">{shop.name}</strong>
                      <span className="text-slate-500 font-mono text-[11px]">/p/{shop.slug}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      <span className="block truncate max-w-xs">{shop.address}</span>
                      <span className="text-slate-500 text-[11px]">{shop.phone}</span>
                    </td>
                    <td className="py-3 px-4 font-medium text-white">{shop.printersCount} installed</td>
                    <td className="py-3 px-4 font-medium text-white">{shop.devicesCount} PC(s)</td>
                    <td className="py-3 px-4 font-medium text-white">{shop.ordersCount} orders</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        shop.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {shop.is_active ? 'ACTIVE' : 'SUSPENDED'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <Link
                        href={`/p/${shop.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition font-medium"
                      >
                        Visit <ExternalLink className="w-3 h-3" />
                      </Link>
                      <button
                        onClick={() => toggleShopStatus(shop.id, shop.is_active)}
                        className={`px-2.5 py-1 rounded-lg transition font-medium ${
                          shop.is_active
                            ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                      >
                        {shop.is_active ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Windows Agents Health Monitor */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-400" />
              Windows Agent Fleet Health
            </h3>
            <span className="text-xs text-slate-400">{devices.length} registered agents</span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {devices.map((d: any) => (
              <div key={d.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between text-xs">
                <div>
                  <h4 className="font-bold text-white">{d.device_name}</h4>
                  <p className="text-slate-400 mt-0.5">Shop: <strong className="text-slate-200">{d.shop_name}</strong></p>
                  <p className="text-slate-500 text-[11px] mt-0.5">Fingerprint: {d.device_fingerprint}</p>
                </div>
                <div className="text-right">
                  <span className="text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 block mb-1">
                    ● v{d.agent_version} Online
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Heartbeat: {formatDate(d.last_heartbeat_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
