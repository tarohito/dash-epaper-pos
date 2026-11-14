import React, { useState, useEffect } from 'react';
import {
  Wallet,
  TrendingUp,
  Scale,
  Download,
  Lock,
  Eye,
  Printer,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  FileText,
} from 'lucide-react';
import {
  ShiftClosingCreatePayload,
  ShiftClosingRecord,
  ShiftLiveSummary,
  Tenant,
  UserAccount,
} from '../../types';
import { posApi } from '../../services/api';
import { formatIDR } from '../../utils/formatters';
import { useDebounce } from '../../hooks/useDebounce';
import { SearchInput } from '../common/SearchInput';
import { PaginationControls } from '../common/PaginationControls';
import { ErrorBanner } from '../common/ErrorBanner';
import { SortableTh, SortDirection, getNextColumnSort } from '../common/TableSortControls';
import { ShiftClosingModal } from './ShiftClosingModal';
import { ShiftDetailModal } from './ShiftDetailModal';
import { useToast } from '../../contexts/ToastContext';
import { ActionDropdownMenu } from '../common/ActionDropdownMenu';
import { MoneyAmount } from '../common/MoneyAmount';
import { KpiCard } from '../common/KpiCard';

interface ShiftClosingViewProps {
  currentUser: UserAccount;
  activeTenant?: Tenant;
  onPrintShift?: (shift: ShiftClosingRecord) => void;
}

export const ShiftClosingView: React.FC<ShiftClosingViewProps> = ({
  currentUser,
  activeTenant,
  onPrintShift,
}) => {
  const { showToast } = useToast();
  const isCashier = currentUser.role === 'cashier';
  const todayIso = new Date().toISOString().slice(0, 10);

  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [scope, setScope] = useState<'my' | 'outlet'>(isCashier ? 'my' : 'outlet');
  const [summary, setSummary] = useState<ShiftLiveSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // History table state
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 220);
  const [varianceFilter, setVarianceFilter] = useState<'all' | 'exact' | 'surplus' | 'shortage'>('all');
  const [sortBy, setSortBy] = useState('newest');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [historyItems, setHistoryItems] = useState<ShiftClosingRecord[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [historyStats, setHistoryStats] = useState({
    totalClosings: 0,
    exactMatchCount: 0,
    totalRecordedSales: 0,
    totalVariance: 0,
  });
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [selectedShiftDetail, setSelectedShiftDetail] = useState<ShiftClosingRecord | null>(null);

  useEffect(() => {
    if (isCashier && scope !== 'my') {
      setScope('my');
    }
  }, [isCashier, scope]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoadingSummary(true);
    setSummaryError(null);

    posApi
      .getShiftSummary({ date: selectedDate, scope }, controller.signal)
      .then(res => {
        setSummary(res);
        setIsLoadingSummary(false);
      })
      .catch(err => {
        if ((err as Error).name !== 'AbortError') {
          setSummaryError(err instanceof Error ? err.message : 'Gagal memuat ringkasan shift.');
          setIsLoadingSummary(false);
        }
      });

    return () => controller.abort();
  }, [selectedDate, scope, activeTenant?.id, refreshTrigger]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, varianceFilter, sortBy, sortDir, activeTenant?.id]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoadingHistory(true);
    setHistoryError(null);

    posApi
      .getShiftClosings(
        {
          page: currentPage,
          pageSize,
          search: debouncedSearch,
          varianceFilter,
          sortBy,
          sortDir,
        },
        controller.signal
      )
      .then(res => {
        setHistoryItems(Array.isArray(res.items) ? res.items : []);
        setTotalItems(res.total ?? 0);
        setTotalPages(res.totalPages ?? 1);
        if (res.stats) setHistoryStats(res.stats);
        if (res.page !== currentPage) setCurrentPage(res.page ?? 1);
        setIsLoadingHistory(false);
      })
      .catch(err => {
        if ((err as Error).name !== 'AbortError') {
          setHistoryError(err instanceof Error ? err.message : 'Gagal memuat riwayat tutup kasir.');
          setIsLoadingHistory(false);
        }
      });

    return () => controller.abort();
  }, [currentPage, pageSize, debouncedSearch, varianceFilter, sortBy, sortDir, activeTenant?.id, refreshTrigger]);

  const handleHeaderSort = (key: string, defaultDir: SortDirection = 'desc') => {
    const next = getNextColumnSort(key, sortBy, sortDir, defaultDir);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
  };

  const handleConfirmCloseShift = async (payload: ShiftClosingCreatePayload) => {
    try {
      const created = await posApi.closeShift(payload);
      setIsCloseModalOpen(false);
      setRefreshTrigger(k => k + 1);
      setSelectedShiftDetail(created);
      showToast('success', `Rekap tutup kasir ${created.shiftCode} berhasil disimpan.`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menyimpan tutup kasir.');
      throw err;
    }
  };

  const handleExportCsv = () => {
    if (historyItems.length === 0) {
      showToast('warning', 'Belum ada riwayat tutup kasir untuk diekspor.');
      return;
    }

    const headers = [
      'Kode Shift',
      'Tanggal',
      'Periode Shift',
      'Petugas Kasir',
      'Modal Awal',
      'Total Penjualan',
      'Penjualan Tunai',
      'Penjualan Debit',
      'Penjualan Transfer',
      'Penjualan QRIS',
      'Total Buyback',
      'Buyback Tunai',
      'Kas Seharusnya',
      'Kas Fisik',
      'Selisih Kas',
      'Catatan',
    ];

    const rows = historyItems.map(r => [
      r.shiftCode,
      r.shiftDate,
      r.shiftLabel,
      r.cashierName,
      r.openingCash,
      r.totalSalesAmount,
      r.salesCash,
      r.salesDebit,
      r.salesTransfer,
      r.salesQris,
      r.totalBuybackAmount,
      r.buybackCash,
      r.expectedCash,
      r.actualCash,
      r.cashVariance,
      `"${(r.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rekap-tutup-kasir-${activeTenant?.code || 'outlet'}-${todayIso}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Laporan tutup kasir berhasil diunduh (CSV).');
  };

  const handleTriggerPrint = (shift: ShiftClosingRecord) => {
    if (onPrintShift) {
      onPrintShift(shift);
    } else {
      window.print();
    }
  };

  const alreadyClosedToday = (summary?.alreadyClosedCount ?? 0) > 0;
  const nonCashSales =
    (summary?.salesDebit ?? 0) + (summary?.salesTransfer ?? 0) + (summary?.salesQris ?? 0);
  const voidTotal = (summary?.voidSalesCount ?? 0) + (summary?.voidBuybackCount ?? 0);

  return (
    <div className="space-y-4 pb-8">
      {/* 1. HEADER & NAVIGASI TAB UTAMA */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
              Rekap Shift &amp; Tutup Kasir
            </h3>
            {(isLoadingSummary || isLoadingHistory) && (
              <Loader2 size={14} className="animate-spin text-orange-500" />
            )}
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Rekapitulasi penjualan, buyback, dan rekonsiliasi uang tunai laci sebelum pergantian shift atau tutup toko.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-auto">
          <div className="inline-flex h-9 p-0.5 bg-gray-100 rounded-lg border border-gray-200 items-center">
            <button
              type="button"
              onClick={() => setActiveTab('today')}
              className={`h-full px-3 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'today'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Lock size={14} />
              <span>Rekap Shift Aktif</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`h-full px-3 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'history'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText size={14} />
              <span>Riwayat Laporan ({historyStats.totalClosings})</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'today' ? (
        <>
          {/* 2. BAR FILTER TANGGAL, CAKUPAN & STATUS */}
          <div className="bg-white rounded-xl border border-gray-200/90 px-4 py-3 sm:px-5 sm:py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-gray-500">Tanggal:</span>
              <div className="inline-flex h-8 p-0.5 bg-gray-100 rounded-lg border border-gray-200 items-center">
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayIso)}
                  className={`h-full px-2.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    selectedDate === todayIso
                      ? 'bg-white text-gray-900 shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Hari Ini
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value || todayIso)}
                  className="h-full px-2 text-xs font-mono font-semibold bg-transparent border-0 focus:outline-none text-gray-800 cursor-pointer"
                />
              </div>

              {!isCashier && (
                <div className="inline-flex h-8 p-0.5 bg-gray-100 rounded-lg border border-gray-200 items-center">
                  <button
                    type="button"
                    onClick={() => setScope('outlet')}
                    className={`h-full px-2.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      scope === 'outlet'
                        ? 'bg-white text-gray-900 shadow-2xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Semua Kasir
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope('my')}
                    className={`h-full px-2.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      scope === 'my'
                        ? 'bg-white text-gray-900 shadow-2xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Shift Saya
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center">
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border ${
                  alreadyClosedToday
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                {alreadyClosedToday ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                {alreadyClosedToday
                  ? `Sudah tutup kasir ${summary?.alreadyClosedCount}x pada tanggal ini`
                  : 'Belum ada tutup kasir pada tanggal ini'}
              </span>
            </div>
          </div>

          {summaryError && (
            <ErrorBanner message={summaryError} onRetry={() => setRefreshTrigger(k => k + 1)} />
          )}

          {/* 3. 3 KARTU RINGKASAN UTAMA */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-3.5">
            <KpiCard
              title="Total Penjualan"
              accent="orange"
              icon={<TrendingUp size={16} strokeWidth={2} />}
              value={
                <MoneyAmount
                  value={summary?.totalSalesAmount ?? 0}
                  maxFontPx={24}
                  minFontPx={13}
                  className="font-bold font-mono text-gray-900 group-hover:text-white tracking-tight tabular-nums transition-colors duration-200"
                />
              }
              footer={
                <p className="text-xs text-gray-400 group-hover:text-white/85 mt-1 truncate transition-colors duration-200">
                  {summary?.totalSalesCount ?? 0} nota terjual ({(summary?.totalSalesGrams ?? 0).toFixed(2)} gr)
                </p>
              }
            />

            <KpiCard
              title="Total Buyback"
              accent="rose"
              icon={<Scale size={16} strokeWidth={2} />}
              value={
                <MoneyAmount
                  value={summary?.totalBuybackAmount ?? 0}
                  maxFontPx={24}
                  minFontPx={13}
                  className="font-bold font-mono text-gray-900 group-hover:text-white tracking-tight tabular-nums transition-colors duration-200"
                />
              }
              footer={
                <p className="text-xs text-gray-400 group-hover:text-white/85 mt-1 truncate transition-colors duration-200">
                  {summary?.totalBuybackCount ?? 0} nota buyback ({(summary?.totalBuybackGrams ?? 0).toFixed(2)} gr)
                </p>
              }
            />

            <KpiCard
              title="Pergerakan Kas Tunai"
              accent="emerald"
              icon={<Wallet size={16} strokeWidth={2} />}
              value={
                <div
                  className={`text-xl sm:text-2xl font-bold font-mono tracking-tight truncate tabular-nums group-hover:text-white transition-colors duration-200 ${
                    (summary?.netCashMovement ?? 0) < 0 ? 'text-rose-700' : 'text-emerald-700'
                  }`}
                >
                  {(summary?.netCashMovement ?? 0) > 0 ? '+' : ''}
                  {formatIDR(summary?.netCashMovement ?? 0)}
                </div>
              }
              footer={
                <p className="text-xs text-gray-400 group-hover:text-white/85 mt-1 truncate transition-colors duration-200">
                  Penjualan tunai dikurangi buyback tunai
                </p>
              }
            />
          </div>

          {/* 4. RINCIAN PEMBAYARAN & AKSI TUTUP KASIR */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
            {/* Kiri: Detail Uang Masuk & Keluar */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-gray-200/90 p-4 sm:p-5 flex flex-col justify-between gap-4">
              <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-gray-900">Rincian Arus Kas &amp; Pembayaran</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Pemisahan uang tunai di laci kasir dan pembayaran non-tunai ke rekening.
                  </p>
                </div>
                {voidTotal > 0 && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200 shrink-0">
                    {voidTotal} Nota Void
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 flex-1">
                {/* Uang Laci Tunai */}
                <div className="p-3.5 rounded-lg bg-emerald-50/40 border border-emerald-200/80 flex flex-col justify-between gap-3">
                  <div className="space-y-2.5">
                    <p className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                      Laci Tunai
                    </p>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-gray-600">(+) Penjualan Tunai</span>
                      <span className="font-mono font-bold text-emerald-700 tabular-nums">
                        {formatIDR(summary?.salesCash ?? 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-gray-600">(−) Buyback Tunai</span>
                      <span className="font-mono font-bold text-rose-700 tabular-nums">
                        {formatIDR(summary?.buybackCash ?? 0)}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2.5 border-t border-emerald-200/70 flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-gray-900">Tambahan Tunai Laci</span>
                    <span className="font-mono font-bold text-gray-900 tabular-nums">
                      {formatIDR(summary?.netCashMovement ?? 0)}
                    </span>
                  </div>
                </div>

                {/* Non-Tunai (Rekening Bank) */}
                <div className="p-3.5 rounded-lg bg-gray-50/80 border border-gray-200/80 flex flex-col justify-between gap-3">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Non-Tunai (EDC / Bank)
                    </p>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-gray-600">Debit / EDC</span>
                      <span className="font-mono font-semibold text-gray-900 tabular-nums">
                        {formatIDR(summary?.salesDebit ?? 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-gray-600">Transfer Bank</span>
                      <span className="font-mono font-semibold text-gray-900 tabular-nums">
                        {formatIDR(summary?.salesTransfer ?? 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-gray-600">QRIS</span>
                      <span className="font-mono font-semibold text-gray-900 tabular-nums">
                        {formatIDR(summary?.salesQris ?? 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-rose-700">Buyback Transfer</span>
                      <span className="font-mono font-semibold text-rose-700 tabular-nums">
                        − {formatIDR(summary?.buybackTransfer ?? 0)}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2.5 border-t border-gray-200/80 flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-gray-900">Total Penjualan Non-Tunai</span>
                    <span className="font-mono font-bold text-gray-900 tabular-nums">
                      {formatIDR(nonCashSales)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Kanan: Kartu Aksi Tutup Kasir */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-gray-200/90 p-4 sm:p-5 flex flex-col justify-between gap-4">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-orange-600 uppercase tracking-wider">
                    {activeTenant?.code || 'OUTLET'} &bull; {activeTenant?.name || 'Toko Mas'}
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-bold text-gray-900">
                  Hitung Fisik &amp; Tutup Kasir
                </h4>
                <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                  Cocokkan modal awal dan uang fisik di laci untuk tanggal{' '}
                  <span className="font-mono font-semibold text-gray-800">{selectedDate}</span>, lalu simpan berita
                  acara serah terima shift.
                </p>

                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200/80 text-xs flex items-center justify-between gap-2">
                  <span className="text-gray-600">Total transaksi non-tunai</span>
                  <span className="font-mono font-bold text-gray-900 tabular-nums">
                    {formatIDR(nonCashSales)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  disabled={!summary || isLoadingSummary}
                  onClick={() => setIsCloseModalOpen(true)}
                  className="w-full h-10 px-4 bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-50 shadow-xs"
                >
                  <Lock size={15} />
                  <span>Mulai Hitung &amp; Tutup Kasir</span>
                  <ArrowRight size={15} />
                </button>

                {historyStats.totalClosings > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className="w-full h-9 px-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Lihat {historyStats.totalClosings} Riwayat Laporan Sebelumnya
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        /* TAB 2: RIWAYAT LAPORAN TUTUP KASIR */
        <>
          {/* Ringkasan KPI Riwayat */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
            <KpiCard
              title="Total Rekap Shift"
              accent="orange"
              compactMobile
              icon={<FileText size={15} strokeWidth={2} />}
              value={
                <div className="text-lg sm:text-2xl font-bold font-mono text-gray-900 group-hover:text-white tracking-tight truncate tabular-nums transition-colors duration-200">
                  {historyStats.totalClosings} Laporan
                </div>
              }
              footer={
                <p className="text-xs text-gray-400 group-hover:text-white/85 mt-1 truncate transition-colors duration-200">
                  Arsip berita acara shift
                </p>
              }
            />

            <KpiCard
              title="Shift Pas (Klop)"
              accent="emerald"
              compactMobile
              icon={<CheckCircle2 size={15} strokeWidth={2} />}
              value={
                <div className="text-lg sm:text-2xl font-bold font-mono text-gray-900 group-hover:text-white tracking-tight truncate tabular-nums transition-colors duration-200">
                  {historyStats.exactMatchCount} Shift
                </div>
              }
              footer={
                <p className="text-xs text-gray-400 group-hover:text-white/85 mt-1 truncate transition-colors duration-200">
                  Dari {historyStats.totalClosings} total laporan
                </p>
              }
            />

            <KpiCard
              title="Total Penjualan"
              accent="blue"
              compactMobile
              icon={<TrendingUp size={15} strokeWidth={2} />}
              value={
                <MoneyAmount
                  value={historyStats.totalRecordedSales}
                  maxFontPx={24}
                  minFontPx={12}
                  className="font-bold font-mono text-gray-900 group-hover:text-white tracking-tight tabular-nums transition-colors duration-200"
                />
              }
              footer={
                <p className="text-xs text-gray-400 group-hover:text-white/85 mt-1 truncate transition-colors duration-200">
                  Akumulasi omzet tercatat
                </p>
              }
            />

            <KpiCard
              title="Akumulasi Selisih"
              accent="amber"
              compactMobile
              icon={<Scale size={15} strokeWidth={2} />}
              value={
                <div
                  className={`text-lg sm:text-2xl font-bold font-mono tracking-tight truncate tabular-nums group-hover:text-white transition-colors duration-200 ${
                    historyStats.totalVariance === 0
                      ? 'text-emerald-700'
                      : historyStats.totalVariance > 0
                      ? 'text-blue-700'
                      : 'text-rose-700'
                  }`}
                >
                  {historyStats.totalVariance > 0 ? '+' : ''}
                  {formatIDR(historyStats.totalVariance)}
                </div>
              }
              footer={
                <p className="text-xs text-gray-400 group-hover:text-white/85 mt-1 truncate transition-colors duration-200">
                  Total selisih fisik vs sistem
                </p>
              }
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-200/90 p-4 sm:p-5">
            {/* Toolbar Pencarian, Filter Status & Ekspor */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mb-4">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Cari kode shift, kasir, tanggal, atau catatan..."
              />

              <div className="flex items-center gap-2 flex-wrap justify-between lg:justify-end">
                <div className="inline-flex h-9 p-0.5 bg-gray-100 rounded-lg border border-gray-200 items-center overflow-x-auto max-w-full">
                  {(
                    [
                      { key: 'all', label: 'Semua' },
                      { key: 'exact', label: 'Pas (Klop)' },
                      { key: 'surplus', label: 'Uang Lebih' },
                      { key: 'shortage', label: 'Uang Kurang' },
                    ] as const
                  ).map(tab => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setVarianceFilter(tab.key)}
                      className={`h-full px-3 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center whitespace-nowrap ${
                        varianceFilter === tab.key
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="h-9 px-3.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-xs sm:text-sm font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Download size={15} />
                  <span>Ekspor CSV</span>
                </button>
              </div>
            </div>

            {historyError && (
              <ErrorBanner
                message={historyError}
                onRetry={() => setRefreshTrigger(k => k + 1)}
                className="mb-3"
              />
            )}

            {/* Inner Table & Mobile Cards Container */}
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-2xs">
              {isLoadingHistory && historyItems.length === 0 ? (
                <div className="p-12 text-center text-gray-500 flex items-center justify-center gap-2 text-xs sm:text-sm">
                  <Loader2 size={18} className="animate-spin text-orange-500" />
                  <span>Memuat riwayat tutup kasir...</span>
                </div>
              ) : historyItems.length === 0 ? (
                <div className="py-12 px-4 text-center text-gray-400">
                  <FileText size={36} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm font-semibold text-gray-600">Belum ada riwayat tutup kasir</p>
                  <p className="text-xs text-gray-400 mt-0.5 max-w-sm mx-auto">
                    {searchQuery || varianceFilter !== 'all'
                      ? 'Tidak ada laporan tutup kasir yang cocok dengan pencarian atau filter Anda.'
                      : 'Klik tab Rekap Shift Aktif untuk membuat laporan tutup shift pertama.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-xs">
                          <th className="py-3 px-4">Kode Shift</th>
                          <SortableTh
                            label="Tanggal & Shift"
                            sortKey="shiftDate"
                            currentSortBy={sortBy}
                            currentSortDir={sortDir}
                            onSort={key => handleHeaderSort(key, 'desc')}
                            className="py-3 px-4"
                          />
                          <SortableTh
                            label="Petugas Kasir"
                            sortKey="cashierName"
                            currentSortBy={sortBy}
                            currentSortDir={sortDir}
                            onSort={key => handleHeaderSort(key, 'asc')}
                            className="py-3 px-4"
                          />
                          <SortableTh
                            label="Total Penjualan"
                            sortKey="totalSalesAmount"
                            currentSortBy={sortBy}
                            currentSortDir={sortDir}
                            onSort={key => handleHeaderSort(key, 'desc')}
                            align="right"
                            className="py-3 px-4"
                          />
                          <th className="py-3 px-4 text-right">Hitungan Sistem</th>
                          <th className="py-3 px-4 text-right">Uang Fisik Laci</th>
                          <SortableTh
                            label="Selisih"
                            sortKey="cashVariance"
                            currentSortBy={sortBy}
                            currentSortDir={sortDir}
                            onSort={key => handleHeaderSort(key, 'desc')}
                            align="right"
                            className="py-3 px-4"
                          />
                          <th className="py-3 px-4 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                        {historyItems.map(item => {
                          const isExact = item.cashVariance === 0;
                          const isSurplus = item.cashVariance > 0;
                          return (
                            <tr key={item.id} className="hover:bg-orange-50/25 transition-colors">
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span className="font-mono text-xs font-bold text-gray-900">
                                  {item.shiftCode}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="font-mono text-xs font-semibold text-gray-800">
                                  {item.shiftDate}
                                </div>
                                <div className="text-xs text-gray-400 truncate max-w-[180px]">
                                  {item.shiftLabel}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-xs font-semibold text-gray-800 whitespace-nowrap">
                                {item.cashierName}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono text-xs font-bold text-gray-900 tabular-nums whitespace-nowrap">
                                {formatIDR(item.totalSalesAmount)}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono text-xs text-gray-700 tabular-nums whitespace-nowrap">
                                {formatIDR(item.expectedCash)}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono text-xs font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                                {formatIDR(item.actualCash)}
                              </td>
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-1 font-mono text-xs font-bold px-2 py-0.5 rounded tabular-nums ${
                                    isExact
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : isSurplus
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                      : 'bg-red-50 text-red-700 border border-red-200'
                                  }`}
                                >
                                  {isExact ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                                  {isExact
                                    ? 'Pas (Rp 0)'
                                    : item.cashVariance > 0
                                    ? `+${formatIDR(item.cashVariance)}`
                                    : formatIDR(item.cashVariance)}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                <ActionDropdownMenu
                                  ariaLabel={`Aksi untuk ${item.shiftCode}`}
                                  items={[
                                    {
                                      id: 'detail',
                                      label: 'Lihat Rincian Laporan',
                                      icon: <Eye size={14} />,
                                      onClick: () => setSelectedShiftDetail(item),
                                    },
                                    {
                                      id: 'print',
                                      label: 'Cetak Berita Acara',
                                      icon: <Printer size={14} />,
                                      tone: 'primary',
                                      onClick: () => handleTriggerPrint(item),
                                    },
                                  ]}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile / Tablet Card View */}
                  <div className="lg:hidden divide-y divide-gray-100">
                    {historyItems.map(item => {
                      const isExact = item.cashVariance === 0;
                      const isSurplus = item.cashVariance > 0;
                      return (
                        <div key={item.id} className="p-3.5 sm:p-4 space-y-2.5 text-xs">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-mono font-bold text-gray-900">{item.shiftCode}</p>
                                <span
                                  className={`inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded tabular-nums ${
                                    isExact
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : isSurplus
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                      : 'bg-red-50 text-red-700 border border-red-200'
                                  }`}
                                >
                                  {isExact
                                    ? 'Pas (Rp 0)'
                                    : item.cashVariance > 0
                                    ? `+${formatIDR(item.cashVariance)}`
                                    : formatIDR(item.cashVariance)}
                                </span>
                              </div>
                              <p className="text-gray-500 mt-0.5 truncate">
                                {item.shiftDate} &middot; {item.shiftLabel} &middot; {item.cashierName}
                              </p>
                            </div>
                            <ActionDropdownMenu
                              ariaLabel={`Aksi untuk ${item.shiftCode}`}
                              items={[
                                {
                                  id: 'detail',
                                  label: 'Lihat Rincian Laporan',
                                  icon: <Eye size={14} />,
                                  onClick: () => setSelectedShiftDetail(item),
                                },
                                {
                                  id: 'print',
                                  label: 'Cetak Berita Acara',
                                  icon: <Printer size={14} />,
                                  tone: 'primary',
                                  onClick: () => handleTriggerPrint(item),
                                },
                              ]}
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-gray-50/80 border border-gray-100">
                            <div className="min-w-0">
                              <span className="text-gray-400 block truncate">Penjualan</span>
                              <span className="font-mono font-bold text-gray-900 tabular-nums block truncate">
                                {formatIDR(item.totalSalesAmount)}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <span className="text-gray-400 block truncate">Sistem</span>
                              <span className="font-mono font-semibold text-gray-700 tabular-nums block truncate">
                                {formatIDR(item.expectedCash)}
                              </span>
                            </div>
                            <div className="text-right min-w-0">
                              <span className="text-gray-400 block truncate">Fisik Laci</span>
                              <span className="font-mono font-bold text-gray-900 tabular-nums block truncate">
                                {formatIDR(item.actualCash)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {historyItems.length > 0 && (
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  pageSize={pageSize}
                  isLoading={isLoadingHistory}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={size => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                />
              )}
            </div>
          </div>
        </>
      )}

      {summary && (
        <ShiftClosingModal
          isOpen={isCloseModalOpen}
          onClose={() => setIsCloseModalOpen(false)}
          summary={summary}
          shiftDate={selectedDate}
          scope={scope}
          currentUser={currentUser}
          onConfirmClose={handleConfirmCloseShift}
        />
      )}

      <ShiftDetailModal
        shift={selectedShiftDetail}
        activeTenant={activeTenant}
        onClose={() => setSelectedShiftDetail(null)}
        onPrint={handleTriggerPrint}
      />
    </div>
  );
};
