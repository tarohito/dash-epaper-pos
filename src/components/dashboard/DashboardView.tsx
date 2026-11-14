import React, { useState, useEffect } from 'react';
import {
  TrendingDown,
  Loader2,
  Coins,
  ReceiptText,
  TrendingUp,
  Wallet,
  ShoppingBag,
  Gem,
} from 'lucide-react';
import { DashboardSummaryResponse, Tenant } from '../../types';
import { MarketGoldPriceCard } from './MarketGoldPriceCard';
import { CustomerServiceModal } from './CustomerServiceModal';
import { SalesVolumeChart } from './SalesVolumeChart';
import { posApi } from '../../services/api';
import { ErrorBanner } from '../common/ErrorBanner';
import { useToast } from '../../contexts/ToastContext';
import { MoneyAmount } from '../common/MoneyAmount';
import { KpiCard } from '../common/KpiCard';

interface DashboardViewProps {
  refreshTrigger: number;
  activeTenant?: Tenant;
  onNavigateTo: (menu: string) => void;
  onOpenRegisterTenant: () => void;
}

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
  const [summary, setSummary] = useState<DashboardSummaryResponse>(EMPTY_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isCsModalOpen, setIsCsModalOpen] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setFetchError(null);

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

  return (
    <div className="space-y-4 pb-6">
      {/* Hero Banner */}
      <div className="@container relative overflow-hidden rounded-xl border border-orange-300/60 bg-gradient-to-r from-[#ff6a00] to-[#ff3b00] shadow-xs">
        <img
          src="/assets/banner_dashboard.jpeg"
          alt="Kelola Penjualan dan Stok dalam Satu Sistem"
          className="hidden md:block w-full h-auto select-none"
          loading="eager"
          decoding="async"
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.src.includes('banner_01_26f17fb6.jpeg')) {
              target.src = '/assets/aistudio/banner_01_26f17fb6.jpeg';
            }
          }}
        />
        <div className="p-4 sm:p-5 md:p-0 md:absolute md:inset-y-0 md:left-0 md:flex md:flex-col md:justify-center md:pl-[4.2cqw] md:pr-2 md:w-[52%]">
          <h2 className="text-lg sm:text-xl md:text-[clamp(1.125rem,3.1cqw,2.5rem)] font-bold text-white leading-[1.2] tracking-tight">
            <span className="block md:whitespace-nowrap">Kelola Penjualan dan</span>
            <span className="block md:whitespace-nowrap">Stok dalam Satu Sistem</span>
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
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3.5">
        <KpiCard
          title="Total Penjualan"
          accent="orange"
          compactMobile
          tooltip="Total uang riil yang dibayarkan pembeli (Grand Total di struk termasuk pajak/PPN)."
          icon={<Coins size={15} strokeWidth={2} />}
          value={
            <MoneyAmount
              value={displayTotalPenjualan}
              maxFontPx={24}
              minFontPx={12}
              className="font-bold font-mono text-gray-900 group-hover:text-white tracking-tight tabular-nums transition-colors duration-200"
            />
          }
          footer={
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1 text-xs min-w-0">
              <span className="inline-flex items-center gap-0.5 font-semibold text-rose-600 group-hover:text-white font-mono shrink-0 transition-colors duration-200">
                <TrendingDown size={12} />
                <span>92.23%</span>
              </span>
              <span className="text-gray-400 group-hover:text-white/85 truncate transition-colors duration-200">
                termasuk PPN 11%
              </span>
            </div>
          }
        />

        <KpiCard
          title="Penjualan Kotor"
          accent="amber"
          compactMobile
          tooltip="Total harga murni perhiasan yang terjual sebelum ditambah pajak atau potongan diskon."
          icon={<ReceiptText size={15} strokeWidth={2} />}
          value={
            <MoneyAmount
              value={displayPenjualanKotor}
              maxFontPx={24}
              minFontPx={12}
              className="font-bold font-mono text-gray-900 group-hover:text-white tracking-tight tabular-nums transition-colors duration-200"
            />
          }
          footer={
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1 text-xs min-w-0">
              <span className="inline-flex items-center gap-0.5 font-semibold text-rose-600 group-hover:text-white font-mono shrink-0 transition-colors duration-200">
                <TrendingDown size={12} />
                <span>96.04%</span>
              </span>
              <span className="text-gray-400 group-hover:text-white/85 truncate transition-colors duration-200">
                sebelum pajak
              </span>
            </div>
          }
        />

        <KpiCard
          title="Laba Kotor"
          accent="emerald"
          compactMobile
          tooltip="Keuntungan bersih penjualan setelah dikurangi modal awal beli perhiasan (HPP modal emas)."
          icon={<TrendingUp size={15} strokeWidth={2} />}
          value={
            <MoneyAmount
              value={displayLabaKotor}
              maxFontPx={24}
              minFontPx={12}
              className="font-bold font-mono text-gray-900 group-hover:text-white tracking-tight tabular-nums transition-colors duration-200"
            />
          }
          footer={
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1 text-xs min-w-0">
              <span className="inline-flex items-center gap-0.5 font-semibold text-rose-600 group-hover:text-white font-mono shrink-0 transition-colors duration-200">
                <TrendingDown size={12} />
                <span>91.4%</span>
              </span>
              <span className="text-gray-400 group-hover:text-white/85 truncate transition-colors duration-200">
                estimasi margin HPP
              </span>
            </div>
          }
        />

        <KpiCard
          title="Penerimaan Kas Bersih"
          accent="teal"
          compactMobile
          tooltip="Uang kas bersih masuk setelah dikurangi pengeluaran pembelian emas dari pelanggan (buyback)."
          icon={<Wallet size={15} strokeWidth={2} />}
          value={
            <MoneyAmount
              value={displayPenerimaan}
              maxFontPx={24}
              minFontPx={12}
              className="font-bold font-mono text-gray-900 group-hover:text-white tracking-tight tabular-nums transition-colors duration-200"
            />
          }
          footer={
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1 text-xs min-w-0">
              <span className="font-semibold text-gray-500 group-hover:text-white font-mono shrink-0 transition-colors duration-200">
                0%
              </span>
              <span className="text-gray-400 group-hover:text-white/85 truncate transition-colors duration-200">
                penjualan dikurangi buyback
              </span>
            </div>
          }
        />

        <KpiCard
          title="Total Transaksi"
          accent="blue"
          compactMobile
          tooltip="Jumlah nota/struk belanja yang berhasil diselesaikan dan dibayar oleh pelanggan."
          icon={<ShoppingBag size={15} strokeWidth={2} />}
          value={
            <div className="text-lg sm:text-2xl font-bold font-mono text-gray-900 group-hover:text-white truncate tabular-nums tracking-tight transition-colors duration-200">
              {displayTransaksi} Nota
            </div>
          }
          footer={
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1 text-xs min-w-0">
              <span className="inline-flex items-center gap-0.5 font-semibold text-rose-600 group-hover:text-white font-mono shrink-0 transition-colors duration-200">
                <TrendingDown size={12} />
                <span>85%</span>
              </span>
              <span className="text-gray-400 group-hover:text-white/85 truncate transition-colors duration-200">
                transaksi selesai (non-void)
              </span>
            </div>
          }
        />

        <KpiCard
          title="Produk Terjual"
          accent="purple"
          compactMobile
          tooltip="Jumlah fisik perhiasan emas yang terjual keluar dari etalase toko."
          icon={<Gem size={15} strokeWidth={2} />}
          value={
            <div className="text-lg sm:text-2xl font-bold font-mono text-gray-900 group-hover:text-white truncate tabular-nums tracking-tight transition-colors duration-200">
              {displayProduk} Pcs
            </div>
          }
          footer={
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1 text-xs min-w-0">
              <span className="inline-flex items-center gap-0.5 font-semibold text-rose-600 group-hover:text-white font-mono shrink-0 transition-colors duration-200">
                <TrendingDown size={12} />
                <span>88.89%</span>
              </span>
              <span className="text-gray-400 group-hover:text-white/85 truncate transition-colors duration-200">
                unit perhiasan keluar
              </span>
            </div>
          }
        />
      </div>

      {/* Chart.js Interactive Line Chart Card */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-4 sm:p-5">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
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
        <SalesVolumeChart
          period={period}
          labels={activeLabels}
          salesData={salesData}
          trxData={trxData}
        />
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
