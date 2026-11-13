import React, { useState, useEffect, useRef } from 'react';
import {
  TrendingDown,
  Info,
  Loader2,
  Coins,
  ReceiptText,
  TrendingUp,
  Wallet,
  ShoppingBag,
  Gem,
} from 'lucide-react';
import { DashboardSummaryResponse, Tenant } from '../../types';
import { formatIDR, formatCompactIDR } from '../../utils/formatters';
import { MarketGoldPriceCard } from './MarketGoldPriceCard';
import { CustomerServiceModal } from './CustomerServiceModal';
import Tooltip from '../Tooltip';
import { posApi } from '../../services/api';
import { ErrorBanner } from '../common/ErrorBanner';
import { useToast } from '../../contexts/ToastContext';
import { MoneyAmount } from '../common/MoneyAmount';

interface DashboardViewProps {
  refreshTrigger: number;
  activeTenant?: Tenant;
  onNavigateTo: (menu: string) => void;
  onOpenRegisterTenant: () => void;
}

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

const EMPTY_SUMMARY: DashboardSummaryResponse = {
  period: 'HARI',
  displayTotalPenjualan: 0,
  displayPenjualanKotor: 0,
  displayLabaKotor: 0,
  displayPenerimaan: 0,
  displayTransaksi: 0,
  displayProduk: 0,
  activeLabels: ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'],
  salesData: Array(12).fill(0),
  trxData: Array(12).fill(0),
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  refreshTrigger,
  activeTenant,
  onNavigateTo,
}) => {
  const [period, setPeriod] = useState<'HARI' | 'BULAN'>('HARI');
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [summary, setSummary] = useState<DashboardSummaryResponse>(EMPTY_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isCsModalOpen, setIsCsModalOpen] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(840);
  const { showToast } = useToast();

  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el) return;

    const updateWidth = () => {
      const nextWidth = Math.round(el.getBoundingClientRect().width);
      if (nextWidth > 0) {
        setContainerWidth(prev => (prev !== nextWidth ? nextWidth : prev));
      }
    };

    updateWidth();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(entries => {
        for (const entry of entries) {
          const nextWidth = Math.round(entry.contentRect.width);
          if (nextWidth > 0) {
            setContainerWidth(prev => (prev !== nextWidth ? nextWidth : prev));
          }
        }
      });
      observer.observe(el);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setFetchError(null);
    setHoveredPoint(null);

    posApi
      .getDashboardSummary(period, controller.signal)
      .then(res => {
        setSummary(res);
        setIsLoading(false);
      })
      .catch(err => {
        if ((err as Error).name !== 'AbortError') {
          const msg = err instanceof Error ? err.message : 'Gagal memuat ringkasan dashboard.';
          setFetchError(msg);
          setIsLoading(false);
          showToast('error', msg);
        }
      });

    return () => controller.abort();
  }, [period, refreshTrigger, retryCount, showToast]);

  const {
    displayTotalPenjualan,
    displayPenjualanKotor,
    displayLabaKotor,
    displayPenerimaan,
    displayTransaksi,
    displayProduk,
    activeLabels,
    salesData,
    trxData,
  } = summary;

  const maxVal = Math.max(...salesData, displayTotalPenjualan, 1000);
  const ceilingSale = getNiceCeiling(maxVal);

  const rawMaxTrx = Math.max(...trxData, displayTransaksi, 1);
  const ceilingTrx = rawMaxTrx <= 2 ? 4 : rawMaxTrx <= 5 ? 6 : Math.ceil(rawMaxTrx * 1.3);

  const chartWidth = Math.max(300, containerWidth);
  const chartHeight = chartWidth < 540 ? 220 : 256;
  const yAxisLabels = [0, 0.5, 1].map(pct =>
    pct === 0 ? '0' : formatCompactIDR(Math.round(ceilingSale * pct))
  );
  const maxLabelChars = Math.max(...yAxisLabels.map(l => l.length));
  const paddingLeft = Math.max(54, Math.min(84, maxLabelChars * 7.8 + 18));
  const paddingRight = chartWidth < 540 ? 18 : 26;
  const paddingTop = 24;
  const paddingBottom = 30;
  const plotWidth = Math.max(120, chartWidth - paddingLeft - paddingRight);
  const pointStepPx = plotWidth / Math.max(1, activeLabels.length - 1);
  const labelEvery = Math.max(1, Math.ceil(54 / Math.max(1, pointStepPx)));
  const hitWidth = Math.max(20, pointStepPx);

  const getSalesCoordinates = (index: number, val: number) => {
    const x =
      paddingLeft +
      (index / Math.max(1, activeLabels.length - 1)) * plotWidth;
    const y =
      chartHeight -
      paddingBottom -
      (val / ceilingSale) * (chartHeight - paddingTop - paddingBottom);
    return { x, y };
  };

  const getTrxCoordinates = (index: number, val: number) => {
    const x =
      paddingLeft +
      (index / Math.max(1, activeLabels.length - 1)) * plotWidth;
    const y =
      chartHeight -
      paddingBottom -
      (val / ceilingTrx) * (chartHeight - paddingTop - paddingBottom);
    return { x, y };
  };

  const salesPoints = salesData.map((val, idx) => getSalesCoordinates(idx, val));
  const salesPathD = salesPoints.reduce(
    (acc, pt, idx) => (idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
    ''
  );
  const salesAreaD =
    salesPoints.length > 0
      ? `${salesPathD} L ${salesPoints[salesPoints.length - 1].x} ${
          chartHeight - paddingBottom
        } L ${salesPoints[0].x} ${chartHeight - paddingBottom} Z`
      : '';

  const trxPoints = trxData.map((val, idx) => getTrxCoordinates(idx, val));
  const trxPathD = trxPoints.reduce(
    (acc, pt, idx) => (idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
    ''
  );

  return (
    <div className="space-y-4 pb-6">
      {/* Hero Banner */}
      <div className="@container relative overflow-hidden rounded-xl border border-orange-300/60 bg-gradient-to-r from-[#ff6a00] to-[#ff3b00] shadow-xs">
        <img
          src="/assets/aistudio/banner_01_26f17fb6.jpeg"
          alt="Kelola Penjualan dan Stok dalam Satu Sistem"
          className="w-full h-auto block select-none"
        />
        <div className="p-4 sm:p-5 md:p-0 md:absolute md:inset-y-0 md:left-0 md:flex md:flex-col md:justify-center md:pl-[4.2cqw] md:pr-2 md:w-[52%]">
          <h2 className="text-[clamp(1.125rem,5.2cqw,1.75rem)] md:text-[clamp(1.125rem,3.1cqw,2.5rem)] font-bold text-white leading-[1.2] tracking-tight">
            <span className="block whitespace-nowrap">Kelola Penjualan dan</span>
            <span className="block whitespace-nowrap">Stok dalam Satu Sistem</span>
          </h2>
          <div className="mt-3 md:mt-[1.4cqw]">
            <button
              type="button"
              onClick={() => setIsCsModalOpen(true)}
              className="h-9 px-4 bg-white hover:bg-orange-50 text-orange-600 font-semibold text-xs sm:text-sm rounded-lg transition-colors inline-flex items-center justify-center whitespace-nowrap cursor-pointer shadow-xs active:scale-[0.98]"
            >
              Berlangganan Sekarang
            </button>
          </div>
        </div>
      </div>

      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
              Ringkasan Penjualan {period === 'HARI' ? 'Harian' : 'Bulanan'}
            </h3>
            <span className="text-xs text-gray-400" aria-hidden="true">&middot;</span>
            <span className="text-xs sm:text-sm font-medium text-gray-500">
              {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            {isLoading && <Loader2 size={14} className="animate-spin text-orange-500" />}
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            {period === 'HARI'
              ? 'Pantau omzet, laba kotor, transaksi, dan grafik penjualan per jam dibanding hari kemarin.'
              : 'Pantau akumulasi omzet, laba kotor, transaksi, dan grafik penjualan dibanding bulan kemarin.'}
          </p>
        </div>

        <div className="inline-flex h-9 p-0.5 bg-gray-100 rounded-lg border border-gray-200 self-start sm:self-auto items-center shrink-0">
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

      {fetchError && (
        <ErrorBanner message={fetchError} onRetry={() => setRetryCount(c => c + 1)} />
      )}

      {/* 6 Modern Metric KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-xs sm:text-sm text-gray-500 font-medium truncate">
                Total Penjualan
              </span>
              <Tooltip
                content="Total uang riil yang dibayarkan pembeli (Grand Total di struk termasuk pajak/PPN)."
                side="top"
              >
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-600 cursor-help inline-flex items-center p-0.5 rounded transition-colors shrink-0"
                  aria-label="Info Total Penjualan"
                >
                  <Info size={13} />
                </button>
              </Tooltip>
            </div>
            <span className="w-8 h-8 rounded-lg bg-orange-50/80 text-orange-600 border border-orange-100/80 flex items-center justify-center shrink-0">
              <Coins size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3 min-w-0">
            <MoneyAmount value={displayTotalPenjualan} maxFontPx={24} minFontPx={13} />
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              <span className="inline-flex items-center gap-0.5 font-semibold text-red-600 font-mono">
                <TrendingDown size={12} />
                <span>92.23%</span>
              </span>
              <span className="text-gray-400">termasuk PPN 11%</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-xs sm:text-sm text-gray-500 font-medium truncate">
                Penjualan Kotor
              </span>
              <Tooltip
                content="Total harga murni perhiasan yang terjual sebelum ditambah pajak atau potongan diskon."
                side="top"
              >
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-600 cursor-help inline-flex items-center p-0.5 rounded transition-colors shrink-0"
                  aria-label="Info Penjualan Kotor"
                >
                  <Info size={13} />
                </button>
              </Tooltip>
            </div>
            <span className="w-8 h-8 rounded-lg bg-amber-50/80 text-amber-600 border border-amber-100/80 flex items-center justify-center shrink-0">
              <ReceiptText size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3 min-w-0">
            <MoneyAmount value={displayPenjualanKotor} maxFontPx={24} minFontPx={13} />
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              <span className="inline-flex items-center gap-0.5 font-semibold text-red-600 font-mono">
                <TrendingDown size={12} />
                <span>96.04%</span>
              </span>
              <span className="text-gray-400">sebelum pajak</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-xs sm:text-sm text-gray-500 font-medium truncate">
                Laba Kotor
              </span>
              <Tooltip
                content="Keuntungan bersih penjualan setelah dikurangi modal awal beli perhiasan (HPP modal emas)."
                side="top"
              >
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-600 cursor-help inline-flex items-center p-0.5 rounded transition-colors shrink-0"
                  aria-label="Info Laba Kotor"
                >
                  <Info size={13} />
                </button>
              </Tooltip>
            </div>
            <span className="w-8 h-8 rounded-lg bg-emerald-50/80 text-emerald-600 border border-emerald-100/80 flex items-center justify-center shrink-0">
              <TrendingUp size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3 min-w-0">
            <MoneyAmount value={displayLabaKotor} maxFontPx={24} minFontPx={13} />
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              <span className="inline-flex items-center gap-0.5 font-semibold text-red-600 font-mono">
                <TrendingDown size={12} />
                <span>91.4%</span>
              </span>
              <span className="text-gray-400">estimasi margin HPP</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-xs sm:text-sm text-gray-500 font-medium truncate">
                Penerimaan Kas Bersih
              </span>
              <Tooltip
                content="Uang kas bersih masuk setelah dikurangi pengeluaran pembelian emas dari pelanggan (buyback)."
                side="top"
              >
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-600 cursor-help inline-flex items-center p-0.5 rounded transition-colors shrink-0"
                  aria-label="Info Penerimaan"
                >
                  <Info size={13} />
                </button>
              </Tooltip>
            </div>
            <span className="w-8 h-8 rounded-lg bg-teal-50/80 text-teal-600 border border-teal-100/80 flex items-center justify-center shrink-0">
              <Wallet size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3 min-w-0">
            <MoneyAmount value={displayPenerimaan} maxFontPx={24} minFontPx={13} />
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              <span className="font-semibold text-gray-700 font-mono">0%</span>
              <span className="text-gray-400">penjualan dikurangi buyback</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-xs sm:text-sm text-gray-500 font-medium truncate">
                Total Transaksi
              </span>
              <Tooltip
                content="Jumlah nota/struk belanja yang berhasil diselesaikan dan dibayar oleh pelanggan."
                side="top"
              >
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-600 cursor-help inline-flex items-center p-0.5 rounded transition-colors shrink-0"
                  aria-label="Info Transaksi"
                >
                  <Info size={13} />
                </button>
              </Tooltip>
            </div>
            <span className="w-8 h-8 rounded-lg bg-blue-50/80 text-blue-600 border border-blue-100/80 flex items-center justify-center shrink-0">
              <ShoppingBag size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-gray-900 truncate tabular-nums tracking-tight">
              {displayTransaksi} Nota
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              <span className="inline-flex items-center gap-0.5 font-semibold text-red-600 font-mono">
                <TrendingDown size={12} />
                <span>85%</span>
              </span>
              <span className="text-gray-400">transaksi selesai (non-void)</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-xs sm:text-sm text-gray-500 font-medium truncate">
                Produk Terjual
              </span>
              <Tooltip
                content="Jumlah fisik perhiasan emas yang terjual keluar dari etalase toko."
                side="top"
              >
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-600 cursor-help inline-flex items-center p-0.5 rounded transition-colors shrink-0"
                  aria-label="Info Produk"
                >
                  <Info size={13} />
                </button>
              </Tooltip>
            </div>
            <span className="w-8 h-8 rounded-lg bg-purple-50/80 text-purple-600 border border-purple-100/80 flex items-center justify-center shrink-0">
              <Gem size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-gray-900 truncate tabular-nums tracking-tight">
              {displayProduk} Pcs
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              <span className="inline-flex items-center gap-0.5 font-semibold text-red-600 font-mono">
                <TrendingDown size={12} />
                <span>88.89%</span>
              </span>
              <span className="text-gray-400">unit perhiasan keluar</span>
            </div>
          </div>
        </div>
      </div>

      {/* SVG Interactive Line Chart Card */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-4 sm:p-5">
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-gray-100">
          <div>
            <h4 className="text-sm sm:text-base font-bold text-gray-900">
              Grafik Penjualan &amp; Volume Transaksi
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">
              {period === 'HARI'
                ? 'Distribusi omzet dan jumlah nota per interval waktu hari ini'
                : 'Distribusi omzet dan jumlah nota harian selama bulan berjalan'}
            </p>
          </div>
        </div>
        <div>
          <div ref={chartContainerRef} className="relative w-full">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              style={{ height: `${chartHeight}px` }}
              className="w-full block select-none overflow-visible"
            >
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.14" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {[0, 0.5, 1].map((pct, idx) => {
                const y = paddingTop + (1 - pct) * (chartHeight - paddingTop - paddingBottom);
                const labelVal = yAxisLabels[idx];
                return (
                  <g key={idx}>
                    <text x={paddingLeft - 12} y={y + 4} textAnchor="end" className="text-xs fill-gray-400 font-mono font-medium">
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

              <line
                x1={paddingLeft}
                y1={chartHeight - paddingBottom}
                x2={chartWidth - paddingRight}
                y2={chartHeight - paddingBottom}
                stroke="#e2e8f0"
                strokeWidth="1.5"
              />

              {hoveredPoint !== null && salesPoints[hoveredPoint] && (
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

              {salesAreaD && <path d={salesAreaD} fill="url(#salesGrad)" />}

              {salesPathD && (
                <path
                  d={salesPathD}
                  fill="none"
                  stroke="#ea580c"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {trxPathD && (
                <path
                  d={trxPathD}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {trxPoints.map((pt, idx) => {
                const isHovered = hoveredPoint === idx;
                return (
                  <circle
                    key={`trx-${idx}`}
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 5.5 : 3.5}
                    fill="#ffffff"
                    stroke="#2563eb"
                    strokeWidth={isHovered ? 2.5 : 2}
                    className="transition-all pointer-events-none"
                  />
                );
              })}

              {salesPoints.map((pt, idx) => {
                const isHovered = hoveredPoint === idx;
                return (
                  <g
                    key={`sales-${idx}`}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredPoint(idx)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    <rect
                      x={pt.x - hitWidth / 2}
                      y={paddingTop}
                      width={hitWidth}
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

              {activeLabels.map((lbl, idx) => {
                if (idx % labelEvery !== 0) return null;
                const isHovered = hoveredPoint === idx;
                const x =
                  paddingLeft +
                  (idx / Math.max(1, activeLabels.length - 1)) * plotWidth;
                return (
                  <text
                    key={idx}
                    x={x}
                    y={chartHeight - 8}
                    textAnchor="middle"
                    className={`text-[11px] sm:text-xs font-mono transition-colors ${
                      isHovered ? 'fill-gray-900 font-bold' : 'fill-gray-400'
                    }`}
                  >
                    {lbl}
                  </text>
                );
              })}
            </svg>

            {hoveredPoint !== null && salesPoints[hoveredPoint] && (() => {
              const ratio = salesPoints[hoveredPoint].x / chartWidth;
              const translateX = ratio < 0.18 ? '-15%' : ratio > 0.82 ? '-85%' : '-50%';
              return (
                <div
                  className="absolute bg-gray-900 text-white text-xs py-1.5 px-3 rounded-lg shadow-xl pointer-events-none z-20 transition-all border border-gray-800 whitespace-nowrap"
                  style={{
                    left: `${ratio * 100}%`,
                    top: `${Math.max(8, salesPoints[hoveredPoint].y - 58)}px`,
                    transform: `translateX(${translateX})`,
                  }}
                >
                  <p className="font-bold text-orange-400 border-b border-gray-800 pb-0.5">
                    {period === 'HARI' ? `Pukul ${activeLabels[hoveredPoint]}` : activeLabels[hoveredPoint]}
                  </p>
                  <div className="mt-1 space-y-0.5">
                    <p className="text-gray-200 flex items-center justify-between gap-3">
                      <span className="text-orange-400">Penjualan:</span>
                      <span className="font-semibold text-white">{formatIDR(salesData[hoveredPoint])}</span>
                    </p>
                    <p className="text-gray-200 flex items-center justify-between gap-3">
                      <span className="text-blue-400">Transaksi:</span>
                      <span className="font-semibold text-blue-300">{trxData[hoveredPoint]} nota</span>
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 mt-3 pt-2 text-xs sm:text-sm font-semibold">
            <div className="flex items-center gap-2">
              <div className="flex items-center w-6 justify-center">
                <span className="w-2 h-[2px] bg-orange-600 rounded-full" />
                <span className="w-2.5 h-2.5 rounded-full border-2 border-orange-600 bg-white -ml-0.5 -mr-0.5 z-10 shrink-0" />
                <span className="w-2 h-[2px] bg-orange-600 rounded-full" />
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
                <span className="w-2 h-[2px] bg-blue-600 rounded-full" />
                <span className="w-2.5 h-2.5 rounded-full border-2 border-blue-600 bg-white -ml-0.5 -mr-0.5 z-10 shrink-0" />
                <span className="w-2 h-[2px] bg-blue-600 rounded-full" />
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

      <div>
        <MarketGoldPriceCard
          onNavigateToPOS={() => onNavigateTo('Kasir POS (Penjualan)')}
          onNavigateToBuyback={() => onNavigateTo('Buyback (Pembelian)')}
        />
      </div>

      <CustomerServiceModal
        isOpen={isCsModalOpen}
        onClose={() => setIsCsModalOpen(false)}
        activeTenant={activeTenant}
      />
    </div>
  );
};
