import Link from 'next/link';
import { 
  Printer, 
  QrCode, 
  Smartphone, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  Cpu, 
  CreditCard,
  Building2,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-slate-100">
      {/* Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-sky-500 text-white p-2 rounded-xl shadow-lg shadow-sky-500/20">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white">PrintFlow</span>
              <span className="text-xs ml-2 px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 font-medium border border-sky-500/20">
                SaaS v1.0
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Shop Dashboard
            </Link>
            <Link
              href="/admin"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Super Admin
            </Link>
            <Link
              href="/p/campus-prints"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold transition-all shadow-md shadow-sky-600/20"
            >
              Customer Demo <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28 border-b border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.15),rgba(255,255,255,0))]" />
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium mb-6">
            <Zap className="w-3.5 h-3.5 text-sky-400" />
            Zero manual file transfers • Instant dynamic UPI • Auto Windows spooling
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Automated QR Self-Service Printing for Modern Print Shops
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            Customers scan a permanent shop QR code, upload documents from their phones, 
            choose B&W or color, pay via UPI, and your Windows computer prints automatically 
            using connected USB or Wi-Fi printers.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/p/campus-prints"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-base transition-all shadow-lg shadow-sky-500/25"
            >
              <Smartphone className="w-5 h-5 text-slate-950" />
              Scan & Print Demo
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold text-base transition-all"
            >
              <Building2 className="w-5 h-5 text-sky-400" />
              Shop Owner Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Multi-Tenant Demo Shops Directory */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Live Demo Shops</h2>
            <p className="text-slate-400 text-sm">
              Each shop operates in strict tenant isolation with unique pricing, QR codes, and connected Windows print agents.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Shop 1 Card */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 flex flex-col justify-between hover:border-sky-500/50 transition-colors">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    ● Windows Agent Connected
                  </span>
                  <h3 className="text-xl font-bold text-white mt-2">Campus Prints & Xerox Express</h3>
                  <p className="text-xs text-slate-400">Student Activity Center, Gate 2, Tech Campus</p>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-700">
                  <QrCode className="w-8 h-8 text-sky-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-700/60 my-4 text-xs">
                <div>
                  <span className="text-slate-400 block">B&W Rate:</span>
                  <span className="font-semibold text-slate-200">₹2.00 / side</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Color Rate:</span>
                  <span className="font-semibold text-slate-200">₹8.00 / side</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Printers:</span>
                  <span className="font-semibold text-slate-200">HP LaserJet (USB), Epson L8050 (Wi-Fi)</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Duplex Discount:</span>
                  <span className="font-semibold text-emerald-400">₹0.50 off back side</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Link
                href="/p/campus-prints"
                className="flex-1 text-center py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-1.5"
              >
                Open Customer Portal <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Shop 2 Card */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 flex flex-col justify-between hover:border-sky-500/50 transition-colors">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    ● Windows Agent Connected
                  </span>
                  <h3 className="text-xl font-bold text-white mt-2">Metro Documentation & Digital Prints</h3>
                  <p className="text-xs text-slate-400">Shop 4, Metro Plaza, Commercial Complex</p>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-700">
                  <QrCode className="w-8 h-8 text-sky-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-700/60 my-4 text-xs">
                <div>
                  <span className="text-slate-400 block">B&W Rate:</span>
                  <span className="font-semibold text-slate-200">₹2.50 / side</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Color Rate:</span>
                  <span className="font-semibold text-slate-200">₹12.00 / side</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Printers:</span>
                  <span className="font-semibold text-slate-200">Canon C3530i (192.168.1.150)</span>
                </div>
                <div>
                  <span className="text-slate-400 block">GST Tax:</span>
                  <span className="font-semibold text-slate-200">18.0% Configured</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Link
                href="/p/metro-docs"
                className="flex-1 text-center py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-1.5"
              >
                Open Customer Portal <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Steps */}
      <section className="py-16 bg-slate-950/60 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl font-bold text-white mb-3">22-Step Fully Automated Flow</h2>
            <p className="text-slate-400 text-sm">
              From phone QR scan to physical paper delivery without any manual intervention.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold mb-4">
                1
              </div>
              <h4 className="font-semibold text-white mb-2">Scan & Upload</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Customer scans the shop's permanent QR and uploads PDF, DOCX, or images. Document engine counts billable pages automatically.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold mb-4">
                2
              </div>
              <h4 className="font-semibold text-white mb-2">Configure & Price</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Choose B&W or color, duplex mode, copies, and page range. Backend calculates total in paise using shop pricing rules.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold mb-4">
                3
              </div>
              <h4 className="font-semibold text-white mb-2">Instant UPI Payment</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Dynamic UPI QR code generated on customer screen. Payment gateway webhook verifies signature and authorizes job.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold mb-4">
                4
              </div>
              <h4 className="font-semibold text-white mb-2">Auto Windows Print</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                PrintFlow Agent pulls job, configures DEVMODE driver settings, and transmits to Windows Spooler on USB or Wi-Fi printer.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800 bg-slate-950 py-8 text-center text-xs text-slate-500">
        <p>PrintFlow Multi-Tenant QR Automated Printing SaaS • Built with Next.js, Supabase, and Python Windows Print Agent</p>
      </footer>
    </div>
  );
}
