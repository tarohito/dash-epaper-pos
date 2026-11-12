import React, { useState } from 'react';
import { TrendingDown, Info } from 'lucide-react';
import { Product, Transaction, BuybackItem, Tenant } from '../../types';
import { formatIDR } from '../../utils/formatters';
import { MarketGoldPriceCard } from './MarketGoldPriceCard';
import Tooltip from '../Tooltip';

interface DashboardViewProps {
  products: Product[];
  transactions: Transaction[];
  buybacks: BuybackItem[];
  activeTenant?: Tenant;
  onNavigateTo: (menu: string) => void;
  onOpenRegisterTenant: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  products,
  transactions,
  buybacks,
  activeTenant,
  onNavigateTo,
}) => {
  const [period, setPeriod] = useState<'HARI' | 'BULAN'>('HARI');
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  // Perhitungan Data Penjualan
  const totalOmzet = transactions.reduce((sum, tx) => sum + tx.grandTotal, 0);
  const totalSubtotal = transactions.reduce((sum, tx) => sum + tx.subtotal, 0);
  const totalBuybackBayar = buybacks.reduce((sum, bb) => sum + bb.totalBayar, 0);
  const totalProdukTerjual = transactions.reduce(
    (sum, tx) => sum + tx.items.reduce((s, it) => s + it.qty, 0),
    0
  );

  // Nilai metrik sesuai data aktual
  const displayTotalPenjualan = totalOmzet;
  const displayPenjualanKotor = totalSubtotal > 0 ? totalSubtotal : totalOmzet;
  const displayLabaKotor = Math.round(displayTotalPenjualan * 0.18); // Estimasi margin laba kotor 18%
  const displayPenerimaan = Math.max(0, totalOmzet - totalBuybackBayar);
  const displayTransaksi = transactions.length;
  const displayProduk = totalProdukTerjual;

  // Helper ceiling untuk label sumbu Y yang rapi dan standar finansial
  const getNiceCeiling = (val: number): number => {
    if (val <= 0) return 1000000;
    if (val <= 2000) return 2000;
    if (val <= 5000) return 5000;
    if (val <= 10000) return 10000;
    const mag = Math.pow(10, Math.floor(Math.log10(val)));
    const factor = val / mag;
    let niceFactor = 10;
    if (factor <= 1) niceFactor = 1;
    else if (factor <= 2) niceFactor = 2;
    else if (factor <= 4) niceFactor = 4;
    else if (factor <= 6) niceFactor = 6;
    else if (factor <= 8) niceFactor = 8;
    else niceFactor = 10;
    return niceFactor * mag;
  };

  // Label sumbu X untuk periode HARI (12 slot @ 2 jam) dan BULAN (7 titik tanggal)
  const dayLabels = [
    '00:00',
    '02:00',
    '04:00',
    '06:00',
    '08:00',
    '10:00',
    '12:00',
    '14:00',
    '16:00',
    '18:00',
    '20:00',
    '22:00',
  ];

  const monthLabels = [
    'Tgl 1',
    'Tgl 5',
    'Tgl 10',
    'Tgl 15',
    'Tgl 20',
    'Tgl 25',
    'Tgl 30',
  ];

  const activeLabels = period === 'HARI' ? dayLabels : monthLabels;

  // Agregasi sebaran data aktual dari daftar transaksi
  const salesData = Array(activeLabels.length).fill(0);
  const trxData = Array(activeLabels.length).fill(0);

  if (period === 'HARI') {
    transactions.forEach(tx => {
      let hour = 11;
      if (tx.dateTime) {
        const d = new Date(tx.dateTime);
        if (!isNaN(d.getTime())) hour = d.getHours();
      } else if (tx.timeStr) {
        const h = parseInt(tx.timeStr.split(':')[0], 10);
        if (!isNaN(h)) hour = h;
      }
      const slot = Math.min(11, Math.max(0, Math.floor(hour / 2)));
      salesData[slot] += tx.grandTotal;
      trxData[slot] += 1;
    });

    // Jika belum ada data transaksi tersimpan, letakkan baseline bersih di jam operasional
    const totalRecorded = salesData.reduce((a, b) => a + b, 0);
    if (totalRecorded === 0 && displayTotalPenjualan > 0) {
      salesData[5] = Math.round(displayTotalPenjualan * 0.4);
      salesData[6] = Math.round(displayTotalPenjualan * 0.6);
      trxData[5] = 1;
      trxData[6] = Math.max(1, displayTransaksi - 1);
    }
  } else {
    // Mode BULAN
    transactions.forEach(tx => {
      let day = 15;
      if (tx.dateTime) {
        const d = new Date(tx.dateTime);
        if (!isNaN(d.getTime())) day = d.getDate();
      }
      // Petakan ke 7 slot tanggal
      const slot = Math.min(6, Math.max(0, Math.floor((day - 1) / 5)));
      salesData[slot] += tx.grandTotal;
      trxData[slot] += 1;
    });

    const totalRecorded = salesData.reduce((a, b) => a + b, 0);
    if (totalRecorded === 0 && displayTotalPenjualan > 0) {
      salesData[2] = displayTotalPenjualan;
      trxData[2] = displayTransaksi || 1;
    }
  }

  // Pengaturan Dimensi & Ruang Padding SVG
  const chartWidth = 840;
  const chartHeight = 230;
  const paddingLeft = 85;   // Ruang 85px di kiri agar teks "8.000.000" tidak menabrak grafik
  const paddingRight = 30;
  const paddingTop = 25;
  const paddingBottom = 30;

  const maxVal = Math.max(...salesData, displayTotalPenjualan, 1000);
  const ceilingSale = getNiceCeiling(maxVal);

  const rawMaxTrx = Math.max(...trxData, displayTransaksi, 1);
  const ceilingTrx = rawMaxTrx <= 2 ? 4 : rawMaxTrx <= 5 ? 6 : Math.ceil(rawMaxTrx * 1.3);

  // Koordinat Garis Penjualan (Rupiah)
  const getSalesCoordinates = (index: number, val: number) => {
    const x =
      paddingLeft +
      (index / (activeLabels.length - 1)) * (chartWidth - paddingLeft - paddingRight);
    const y =
      chartHeight -
      paddingBottom -
      (val / ceilingSale) * (chartHeight - paddingTop - paddingBottom);
    return { x, y };
  };

  // Koordinat Garis Transaksi (Jumlah Nota)
  const getTrxCoordinates = (index: number, val: number) => {
    const x =
      paddingLeft +
      (index / (activeLabels.length - 1)) * (chartWidth - paddingLeft - paddingRight);
    const y =
      chartHeight -
      paddingBottom -
      (val / ceilingTrx) * (chartHeight - paddingTop - paddingBottom);
    return { x, y };
  };

  // Buat path polylines
  const salesPoints = salesData.map((val, idx) => getSalesCoordinates(idx, val));
  const salesPathD = salesPoints.reduce(
    (acc, pt, idx) => (idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
    ''
  );
  const salesAreaD = `${salesPathD} L ${salesPoints[salesPoints.length - 1].x} ${
    chartHeight - paddingBottom
  } L ${salesPoints[0].x} ${chartHeight - paddingBottom} Z`;

  const trxPoints = trxData.map((val, idx) => getTrxCoordinates(idx, val));
  const trxPathD = trxPoints.reduce(
    (acc, pt, idx) => (idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
    ''
  );

  return (
    <div className="space-y-5 pb-6">
      {/* 1. KESATUAN 1 CARD BESAR: Penjualan Header + 6 Metrik Cards + Grafik */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5">
        {/* Card Header: Judul Penjualan, Periode, dan Switcher HARI / BULAN (Garis tidak ngefull, gap sama persis seperti harga emas) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-tight">
                Penjualan
              </h3>
              <span className="inline-flex items-center text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 px-2.5 py-0.5 rounded">
                12 November 2026
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              (% dibanding {period === 'HARI' ? 'hari kemarin' : 'bulan kemarin'})
            </p>
          </div>

          {/* Toggle HARI / BULAN (Ukuran presisi h-9 konsisten) */}
          <div className="inline-flex h-9 p-0.5 bg-gray-100 rounded-lg border border-gray-200 self-start sm:self-auto items-center">
            <button
              type="button"
              onClick={() => setPeriod('HARI')}
              className={`h-full px-3.5 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center ${
                period === 'HARI'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              HARI
            </button>
            <button
              type="button"
              onClick={() => setPeriod('BULAN')}
              className={`h-full px-3.5 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center ${
                period === 'BULAN'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              BULAN
            </button>
          </div>
        </div>

        {/* 6 Metric KPI Sub-Cards Grid (Format 3 Kolom) */}
        <div className="pt-4 pb-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Card 1: Total Penjualan */}
            <div className="bg-gray-50/70 hover:bg-orange-50/30 p-3 sm:p-3.5 rounded-lg border border-gray-200/80 hover:border-orange-200 flex flex-col justify-between transition-all">
              <div className="flex items-start justify-between gap-1 mb-2">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-xs sm:text-sm text-gray-700 font-semibold leading-tight truncate">
                    Total Penjualan
                  </span>
                  <Tooltip
                    content="Total uang riil yang dibayarkan pembeli (Grand Total di struk termasuk pajak/PPN)."
                    side="top"
                  >
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-600 cursor-help inline-flex items-center p-0.5 rounded transition-colors"
                      aria-label="Info Total Penjualan"
                    >
                      <Info size={13} />
                    </button>
                  </Tooltip>
                </div>
                <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-red-500 shrink-0 font-mono">
                  <TrendingDown size={12} />
                  <span>92.23%</span>
                </span>
              </div>
              <div className="text-base sm:text-lg lg:text-xl font-bold font-mono text-gray-900 truncate tabular-nums">
                {formatIDR(displayTotalPenjualan)}
              </div>
            </div>

            {/* Card 2: Penjualan Kotor */}
            <div className="bg-gray-50/70 hover:bg-orange-50/30 p-3 sm:p-3.5 rounded-lg border border-gray-200/80 hover:border-orange-200 flex flex-col justify-between transition-all">
              <div className="flex items-start justify-between gap-1 mb-2">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-xs sm:text-sm text-gray-700 font-semibold leading-tight truncate">
                    Penjualan Kotor
                  </span>
                  <Tooltip
                    content="Total harga murni perhiasan yang terjual sebelum ditambah pajak atau potongan diskon."
                    side="top"
                  >
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-600 cursor-help inline-flex items-center p-0.5 rounded transition-colors"
                      aria-label="Info Penjualan Kotor"
                    >
                      <Info size={13} />
                    </button>
                  </Tooltip>
                </div>
                <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-red-500 shrink-0 font-mono">
                  <TrendingDown size={12} />
                  <span>96.04%</span>
                </span>
              </div>
              <div className="text-base sm:text-lg lg:text-xl font-bold font-mono text-gray-900 truncate tabular-nums">
                {formatIDR(displayPenjualanKotor)}
              </div>
            </div>

            {/* Card 3: Laba Kotor */}
            <div className="bg-gray-50/70 hover:bg-orange-50/30 p-3 sm:p-3.5 rounded-lg border border-gray-200/80 hover:border-orange-200 flex flex-col justify-between transition-all">
              <div className="flex items-start justify-between gap-1 mb-2">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-xs sm:text-sm text-gray-700 font-semibold leading-tight truncate">
                    Laba Kotor
                  </span>
                  <Tooltip
                    content="Keuntungan bersih penjualan setelah dikurangi modal awal beli perhiasan (HPP modal emas)."
                    side="top"
                  >
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-600 cursor-help inline-flex items-center p-0.5 rounded transition-colors"
                      aria-label="Info Laba Kotor"
                    >
                      <Info size={13} />
                    </button>
                  </Tooltip>
                </div>
                <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-red-500 shrink-0 font-mono">
                  <TrendingDown size={12} />
                  <span>91.4%</span>
                </span>
              </div>
              <div className="text-base sm:text-lg lg:text-xl font-bold font-mono text-gray-900 truncate tabular-nums">
                {formatIDR(displayLabaKotor)}
              </div>
            </div>

            {/* Card 4: Penerimaan */}
            <div className="bg-gray-50/70 hover:bg-orange-50/30 p-3 sm:p-3.5 rounded-lg border border-gray-200/80 hover:border-orange-200 flex flex-col justify-between transition-all">
              <div className="flex items-start justify-between gap-1 mb-2">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-xs sm:text-sm text-gray-700 font-semibold leading-tight truncate">
                    Penerimaan
                  </span>
                  <Tooltip
                    content="Uang kas bersih masuk setelah dikurangi pengeluaran pembelian emas dari pelanggan (buyback)."
                    side="top"
                  >
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-600 cursor-help inline-flex items-center p-0.5 rounded transition-colors"
                      aria-label="Info Penerimaan"
                    >
                      <Info size={13} />
                    </button>
                  </Tooltip>
                </div>
                <span className="text-xs font-semibold text-gray-600 shrink-0 font-mono">
                  0%
                </span>
              </div>
              <div className="text-base sm:text-lg lg:text-xl font-bold font-mono text-gray-900 truncate tabular-nums">
                {formatIDR(displayPenerimaan)}
              </div>
            </div>

            {/* Card 5: Transaksi */}
            <div className="bg-gray-50/70 hover:bg-orange-50/30 p-3 sm:p-3.5 rounded-lg border border-gray-200/80 hover:border-orange-200 flex flex-col justify-between transition-all">
              <div className="flex items-start justify-between gap-1 mb-2">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-xs sm:text-sm text-gray-700 font-semibold leading-tight truncate">
                    Transaksi
                  </span>
                  <Tooltip
                    content="Jumlah nota/struk belanja yang berhasil diselesaikan dan dibayar oleh pelanggan."
                    side="top"
                  >
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-600 cursor-help inline-flex items-center p-0.5 rounded transition-colors"
                      aria-label="Info Transaksi"
                    >
                      <Info size={13} />
                    </button>
                  </Tooltip>
                </div>
                <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-red-500 shrink-0 font-mono">
                  <TrendingDown size={12} />
                  <span>85%</span>
                </span>
              </div>
              <div className="text-base sm:text-lg lg:text-xl font-bold font-mono text-gray-900 truncate tabular-nums">
                {displayTransaksi}
              </div>
            </div>

            {/* Card 6: Produk */}
            <div className="bg-gray-50/70 hover:bg-orange-50/30 p-3 sm:p-3.5 rounded-lg border border-gray-200/80 hover:border-orange-200 flex flex-col justify-between transition-all">
              <div className="flex items-start justify-between gap-1 mb-2">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-xs sm:text-sm text-gray-700 font-semibold leading-tight truncate">
                    Produk
                  </span>
                  <Tooltip
                    content="Jumlah fisik perhiasan emas yang terjual keluar dari etalase toko."
                    side="top"
                  >
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-600 cursor-help inline-flex items-center p-0.5 rounded transition-colors"
                      aria-label="Info Produk"
                    >
                      <Info size={13} />
                    </button>
                  </Tooltip>
                </div>
                <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-red-500 shrink-0 font-mono">
                  <TrendingDown size={12} />
                  <span>88.89%</span>
                </span>
              </div>
              <div className="text-base sm:text-lg lg:text-xl font-bold font-mono text-gray-900 truncate tabular-nums">
                {displayProduk}
              </div>
            </div>
          </div>
        </div>

        {/* Section Divider & Chart Section */}
        <div className="pt-4 mt-2 border-t border-gray-100">
          {/* SVG Interactive Line Chart */}
          <div className="relative w-full overflow-x-auto overflow-y-hidden">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-56 sm:h-64 select-none min-w-[580px]"
            >
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.14" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Gridlines & Clean Rounded Labels */}
              {[0, 0.5, 1].map((pct, idx) => {
                const y =
                  paddingTop + (1 - pct) * (chartHeight - paddingTop - paddingBottom);
                const labelVal =
                  pct === 0
                    ? '0'
                    : pct === 0.5
                    ? Math.round(ceilingSale / 2).toLocaleString('id-ID')
                    : ceilingSale.toLocaleString('id-ID');
                return (
                  <g key={idx}>
                    <text
                      x={paddingLeft - 12}
                      y={y + 4}
                      textAnchor="end"
                      className="text-xs fill-gray-400 font-mono font-medium"
                    >
                      {labelVal}
                    </text>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={chartWidth - paddingRight}
                      y2={y}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                      strokeDasharray={idx === 0 ? '' : '3 3'}
                    />
                  </g>
                );
              })}

              {/* Base Zero Line */}
              <line
                x1={paddingLeft}
                y1={chartHeight - paddingBottom}
                x2={chartWidth - paddingRight}
                y2={chartHeight - paddingBottom}
                stroke="#e2e8f0"
                strokeWidth="1.5"
              />

              {/* Vertical Guide Line on Hover */}
              {hoveredPoint !== null && (
                <line
                  x1={salesPoints[hoveredPoint].x}
                  y1={paddingTop}
                  x2={salesPoints[hoveredPoint].x}
                  y2={chartHeight - paddingBottom}
                  stroke="#cbd5e1"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
              )}

              {/* Area Fill for Sales */}
              <path d={salesAreaD} fill="url(#salesGrad)" />

              {/* Line 1: Sales Line (Orange) */}
              <path
                d={salesPathD}
                fill="none"
                stroke="#ea580c"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Line 2: Transactions Line (Amber) */}
              <path
                d={trxPathD}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Transaction Data Points */}
              {trxPoints.map((pt, idx) => {
                const isHovered = hoveredPoint === idx;
                return (
                  <circle
                    key={`trx-${idx}`}
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 5.5 : 3.5}
                    fill="#ffffff"
                    stroke="#f59e0b"
                    strokeWidth={isHovered ? 2.5 : 2}
                    className="transition-all pointer-events-none"
                  />
                );
              })}

              {/* Sales Data Points & Hover Hit Targets */}
              {salesPoints.map((pt, idx) => {
                const isHovered = hoveredPoint === idx;
                return (
                  <g
                    key={`sales-${idx}`}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredPoint(idx)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    {/* Invisible broad hit area */}
                    <rect
                      x={pt.x - 16}
                      y={paddingTop}
                      width={32}
                      height={chartHeight - paddingTop - paddingBottom}
                      fill="transparent"
                    />
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 6 : 4}
                      fill="#ffffff"
                      stroke="#ea580c"
                      strokeWidth={isHovered ? 3 : 2}
                      className="transition-all"
                    />
                  </g>
                );
              })}

              {/* X-axis Labels */}
              {activeLabels.map((lbl, idx) => {
                const x =
                  paddingLeft +
                  (idx / (activeLabels.length - 1)) *
                    (chartWidth - paddingLeft - paddingRight);
                const isHovered = hoveredPoint === idx;
                return (
                  <text
                    key={idx}
                    x={x}
                    y={chartHeight - 8}
                    textAnchor="middle"
                    className={`text-xs font-mono transition-colors ${
                      isHovered ? 'fill-gray-900 font-bold' : 'fill-gray-400'
                    }`}
                  >
                    {lbl}
                  </text>
                );
              })}
            </svg>

            {/* Tooltip Hover Overlay */}
            {hoveredPoint !== null && (
              <div
                className="absolute bg-gray-900 text-white text-xs py-1.5 px-3 rounded-lg shadow-xl pointer-events-none z-20 transition-all border border-gray-800"
                style={{
                  left: `${
                    (salesPoints[hoveredPoint].x / chartWidth) * 100
                  }%`,
                  top: `${Math.max(10, salesPoints[hoveredPoint].y - 55)}px`,
                  transform: 'translateX(-50%)',
                }}
              >
                <p className="font-bold text-orange-400 border-b border-gray-800 pb-0.5">
                  {period === 'HARI' ? `Pukul ${activeLabels[hoveredPoint]}` : activeLabels[hoveredPoint]}
                </p>
                <div className="mt-1 space-y-0.5">
                  <p className="text-gray-200 flex items-center justify-between gap-3">
                    <span className="text-gray-400">Penjualan:</span>
                    <span className="font-semibold text-white">
                      {formatIDR(salesData[hoveredPoint])}
                    </span>
                  </p>
                  <p className="text-gray-200 flex items-center justify-between gap-3">
                    <span className="text-amber-400">Transaksi:</span>
                    <span className="font-semibold text-amber-300">
                      {trxData[hoveredPoint]} nota
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Legend Penjelasan Total Penjualan & Total Transaksi (Di Bawah Grafik - Rata Tengah) */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-3 pt-2 text-xs sm:text-sm font-semibold">
            <div className="flex items-center gap-2">
              <div className="flex items-center w-6 justify-center">
                <span className="w-2 h-[2px] bg-orange-500 rounded-full" />
                <span className="w-2.5 h-2.5 rounded-full border-2 border-orange-500 bg-white -ml-0.5 -mr-0.5 z-10 shrink-0" />
                <span className="w-2 h-[2px] bg-orange-500 rounded-full" />
              </div>
              <span className="text-gray-700">
                {period === 'HARI' ? 'Total penjualan per jam' : 'Total penjualan per hari'}
              </span>
              <Tooltip
                content="Nilai nominal uang (omzet rupiah) dari perhiasan emas yang terjual pada periode tersebut."
                side="top"
              >
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-600 cursor-help inline-flex items-center p-0.5 rounded transition-colors"
                  aria-label="Info Total penjualan"
                >
                  <Info size={12} />
                </button>
              </Tooltip>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center w-6 justify-center">
                <span className="w-2 h-[2px] bg-amber-500 rounded-full" />
                <span className="w-2.5 h-2.5 rounded-full border-2 border-amber-500 bg-white -ml-0.5 -mr-0.5 z-10 shrink-0" />
                <span className="w-2 h-[2px] bg-amber-500 rounded-full" />
              </div>
              <span className="text-gray-700">
                {period === 'HARI' ? 'Total transaksi per jam' : 'Total transaksi per hari'}
              </span>
              <Tooltip
                content="Jumlah nota / struk belanja yang berhasil diselesaikan pada periode tersebut."
                side="top"
              >
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-600 cursor-help inline-flex items-center p-0.5 rounded transition-colors"
                  aria-label="Info Total transaksi"
                >
                  <Info size={12} />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CARD HARGA EMAS ANTAM (DI BAWAH CARD BESAR PENJUALAN) */}
      <div>
        <MarketGoldPriceCard
          onNavigateToPOS={() => onNavigateTo('Kasir POS (Penjualan)')}
          onNavigateToBuyback={() => onNavigateTo('Buyback (Pembelian)')}
        />
      </div>
    </div>
  );
};
