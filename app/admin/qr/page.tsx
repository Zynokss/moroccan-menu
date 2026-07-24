'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';

export default function QRCodeGeneratorPage() {
  const [tableCount, setTableCount] = useState<number>(10);
  const [baseUrl, setBaseUrl] = useState<string>('');

  // Set default origin URL once client renders
  if (typeof window !== 'undefined' && !baseUrl) {
    setBaseUrl(window.location.origin);
  }

  const printQRCodes = () => {
    window.print();
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-8 max-w-5xl mx-auto">
      <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800 pb-6 print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-amber-500">
            Table QR Generator
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Print QR codes for your tables. Scanning automatically locks in the table number.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/admin"
            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            ← Menu Manager
          </Link>
          <button
            onClick={printQRCodes}
            className="text-xs bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2.5 rounded-xl transition-colors shadow-md"
          >
            🖨️ Print All Cards
          </button>
        </div>
      </header>

      {/* Controls Bar */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl mb-8 print:hidden flex flex-col sm:flex-row gap-6 items-end">
        <div className="flex-1">
          <label className="block text-xs font-semibold uppercase text-zinc-400 mb-2">
            Number of Tables
          </label>
          <input
            type="number"
            min={1}
            max={50}
            value={tableCount}
            onChange={(e) => setTableCount(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 text-sm"
          />
        </div>

        <div className="flex-[2]">
          <label className="block text-xs font-semibold uppercase text-zinc-400 mb-2">
            Base URL (Your deployed domain)
          </label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://your-restaurant-app.vercel.app"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 text-sm font-mono"
          />
        </div>
      </div>

      {/* Grid of Printable Table Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-2 print:gap-4 print:p-0">
        {Array.from({ length: tableCount }, (_, i) => i + 1).map((tableNum) => {
          const targetUrl = `${baseUrl}?table=${tableNum}`;

          return (
            <div
              key={tableNum}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center flex flex-col items-center justify-between shadow-lg print:bg-white print:text-black print:border-2 print:border-black print:rounded-none print:shadow-none print:break-inside-avoid"
            >
              <div className="w-full">
                <span className="text-xs uppercase tracking-widest text-amber-500 font-bold print:text-amber-700">
                  Moroccan Delights
                </span>
                <h2 className="text-2xl font-extrabold mt-1 text-white print:text-black">
                  Table {tableNum}
                </h2>
              </div>

              <div className="my-6 bg-white p-4 rounded-xl border border-zinc-700 print:border-black">
                <QRCodeSVG
                  value={targetUrl}
                  size={160}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="H"
                />
              </div>

              <div className="w-full border-t border-zinc-800 print:border-zinc-300 pt-3">
                <p className="text-xs text-zinc-400 print:text-zinc-600 font-medium">
                  Scan with your phone camera to order
                </p>
                <p className="text-[10px] text-zinc-600 print:text-zinc-400 font-mono mt-1 truncate">
                  {targetUrl}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
