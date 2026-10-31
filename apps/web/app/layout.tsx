import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PrintFlow — Automated Multi-Tenant QR Document Printing SaaS',
  description: 'Self-service automated document printing for shops, campus centers, and kiosks with instant UPI payment and direct Windows print spooler integration.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="bg-slate-50 text-slate-900 font-sans antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
