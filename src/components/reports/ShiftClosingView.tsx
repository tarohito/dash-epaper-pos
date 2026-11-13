import React, { useState, useEffect } from 'react';
import {
  Wallet,
  TrendingUp,
  Scale,
  Ban,
  Download,
  Lock,
  Eye,
  Printer,
  Loader2,
  CheckCircle2,
  AlertTriangle,
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

  return (
    <div className="space-y-4 pb-8">
      {/* Header Control Bar */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
              Laporan Tutup Kasir &amp; Rekap Shift
            </h3>
            {(isLoadingSummary || isLoadingHistory) && (
              <Loader2 size={15} className="animate-spin text-orange-500" />
            )}
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            <span>{activeTenant?.code || 'OUTLET'}</span>
            <span aria-hidden="true" className="mx-1.5 text-gray-300">&middot;</span>
            <span>{activeTenant?.name || 'Toko Mas'}</span>
            <span aria-hidden="true" className="mx-1.5 text-gray-300">&middot;</span>
            <span>Audit laci kas tunai &amp; ringkasan metode pembayaran</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setSelectedDate(todayIso)}
              className={`h-7 px-2.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                selectedDate === todayIso ? 'bg-white text-gray-900' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Hari Ini
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value || todayIso)}
              className="h-7 px-2 text-xs font-mono font-semibold bg-white border border-gray-200 rounded-md focus:outline-none focus:border-orange-500"
            />
          </div>

          {!isCashier && (
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setScope('outlet')}
                className={`h-7 px-2.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  scope === 'outlet' ? 'bg-white text-gray-900' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Seluruh Outlet
              </button>
              <button
                type="button"
                onClick={() => setScope('my')}
                className={`h-7 px-2.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  scope === 'my' ? 'bg-white text-gray-900' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Shift Saya
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleExportCsv}
            className="h-9 px-3.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-xs sm:text-sm font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Download size={15} />
            <span>Ekspor CSV</span>
          </button>

          <button
            type="button"
            disabled={!summary || isLoadingSummary}
            onClick={() => setIsCloseModalOpen(true)}
            className="h-9 px-4 bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-[0.98] disabled:opacity-50"
          >
            <Lock size={15} />
            <span>Tutup Kasir</span>
          </button>
        </div>
      </div>

      {summaryError && (
        <ErrorBanner message={summaryError} onRetry={() => setRefreshTrigger(k => k + 1)} />
      )}

      {/* 4 KPI Cards for Selected Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-medium text-gray-500 truncate">Total Penjualan Shift</span>
            <span className="w-8 h-8 rounded-lg bg-orange-50/80 text-orange-600 border border-orange-100/80 flex items-center justify-center shrink-0">
              <TrendingUp size={16} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-gray-900 tracking-tight tabular-nums">
              {formatIDR(summary?.totalSalesAmount ?? 0)}
            </div>
            <p className="text-xs text-gray-400 mt-1 font-mono tabular-nums">
              {summary?.totalSalesCount ?? 0} nota &middot; {(summary?.totalSalesGrams ?? 0).toFixed(2)} gr terjual
            </p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-medium text-gray-500 truncate">Total Buyback Keluar</span>
            <span className="w-8 h-8 rounded-lg bg-rose-50/80 text-rose-600 border border-rose-100/80 flex items-center justify-center shrink-0">
              <Scale size={16} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-gray-900 tracking-tight tabular-nums">
              {formatIDR(summary?.totalBuybackAmount ?? 0)}
            </div>
            <p className="text-xs text-gray-400 mt-1 font-mono tabular-nums">
              {summary?.totalBuybackCount ?? 0} nota &middot; {(summary?.totalBuybackGrams ?? 0).toFixed(2)} gr diterima
            </p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-medium text-gray-500 truncate">Arus Kas Tunai Bersih</span>
            <span className="w-8 h-8 rounded-lg bg-emerald-50/80 text-emerald-600 border border-emerald-100/80 flex items-center justify-center shrink-0">
              <Wallet size={16} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-gray-900 tracking-tight tabular-nums">
              {formatIDR(summary?.netCashMovement ?? 0)}
            </div>
            <p className="text-xs text-gray-400 mt-1 font-mono tabular-nums">
              Tunai masuk dikurangi buyback tunai
            </p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-medium text-gray-500 truncate">Void &amp; Riwayat Tutup</span>
            <span className="w-8 h-8 rounded-lg bg-blue-50/80 text-blue-600 border border-blue-100/80 flex items-center justify-center shrink-0">
              <Ban size={16} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-gray-900 tracking-tight tabular-nums">
              {(summary?.voidSalesCount ?? 0) + (summary?.voidBuybackCount ?? 0)} Void
            </div>
            <p className="text-xs text-gray-400 mt-1 font-mono tabular-nums">
              {summary?.alreadyClosedCount ?? 0}x tutup kasir tanggal ini &middot; Total {historyStats.totalClosings} rekap
            </p>
          </div>
        </div>
      </div>

      {/* Payment Method Breakdown Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 bg-white rounded-xl border border-gray-200/90 p-4 sm:p-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
            <h4 className="text-sm font-bold text-gray-900">Rincian Penjualan per Metode Pembayaran</h4>
            <span className="text-xs font-mono text-gray-500">{selectedDate}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-gray-50/80 border border-gray-200/70">
              <span className="text-xs text-gray-500 block">Tunai (Cash)</span>
              <span className="font-mono font-bold text-sm text-gray-900 mt-1 block tabular-nums">
                {formatIDR(summary?.salesCash ?? 0)}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-gray-50/80 border border-gray-200/70">
              <span className="text-xs text-gray-500 block">Debit / EDC</span>
              <span className="font-mono font-bold text-sm text-gray-900 mt-1 block tabular-nums">
                {formatIDR(summary?.salesDebit ?? 0)}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-gray-50/80 border border-gray-200/70">
              <span className="text-xs text-gray-500 block">Transfer Bank</span>
              <span className="font-mono font-bold text-sm text-gray-900 mt-1 block tabular-nums">
                {formatIDR(summary?.salesTransfer ?? 0)}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-gray-50/80 border border-gray-200/70">
              <span className="text-xs text-gray-500 block">QRIS Digital</span>
              <span className="font-mono font-bold text-sm text-gray-900 mt-1 block tabular-nums">
                {formatIDR(summary?.salesQris ?? 0)}
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white rounded-xl border border-gray-200/90 p-4 sm:p-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
            <h4 className="text-sm font-bold text-gray-900">Rincian Pencairan Buyback</h4>
            <span className="text-xs font-mono text-gray-500">
              {scope === 'outlet' ? 'Semua Kasir' : currentUser.fullName}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-gray-50/80 border border-gray-200/70">
              <span className="text-xs text-gray-500 block">Buyback Tunai (Laci)</span>
              <span className="font-mono font-bold text-sm text-rose-700 mt-1 block tabular-nums">
                {formatIDR(summary?.buybackCash ?? 0)}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-gray-50/80 border border-gray-200/70">
              <span className="text-xs text-gray-500 block">Buyback Transfer</span>
              <span className="font-mono font-bold text-sm text-gray-900 mt-1 block tabular-nums">
                {formatIDR(summary?.buybackTransfer ?? 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* History Table Card */}
      <div className="bg-white rounded-xl border border-gray-200/90 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(
              [
                { key: 'all', label: 'Semua Rekap' },
                { key: 'exact', label: 'Klop (Rp 0)' },
                { key: 'surplus', label: 'Selisih Lebih' },
                { key: 'shortage', label: 'Selisih Kurang' },
              ] as const
            ).map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setVarianceFilter(tab.key)}
                className={`h-8 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  varianceFilter === tab.key
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200/80 text-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Cari kode shift, kasir, tanggal, catatan..."
            className="w-full md:w-72"
          />
        </div>

        {historyError && (
          <div className="p-4">
            <ErrorBanner message={historyError} onRetry={() => setRefreshTrigger(k => k + 1)} />
          </div>
        )}

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/90 border-b border-gray-200/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4">Kode Shift</th>
                <SortableTh
                  label="Tanggal"
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
                <th className="py-3 px-4 text-right">Kas Seharusnya</th>
                <th className="py-3 px-4 text-right">Kas Fisik</th>
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
            <tbody className="divide-y divide-gray-100 text-sm">
              {historyItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-gray-400 text-xs sm:text-sm">
                    {isLoadingHistory
                      ? 'Memuat riwayat tutup kasir...'
                      : 'Belum ada rekap tutup kasir pada outlet ini.'}
                  </td>
                </tr>
              ) : (
                historyItems.map(item => {
                  const isExact = item.cashVariance === 0;
                  const isSurplus = item.cashVariance > 0;
                  return (
                    <tr key={item.id} className="hover:bg-orange-50/30 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-gray-900">{item.shiftCode}</span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono text-xs font-semibold text-gray-800">{item.shiftDate}</div>
                        <div className="text-[11px] text-gray-400 truncate max-w-[160px]">{item.shiftLabel}</div>
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-gray-800 whitespace-nowrap">
                        {item.cashierName}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs font-bold text-gray-900 tabular-nums whitespace-nowrap">
                        {formatIDR(item.totalSalesAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-gray-700 tabular-nums whitespace-nowrap">
                        {formatIDR(item.expectedCash)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                        {formatIDR(item.actualCash)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 font-mono text-xs font-bold tabular-nums ${
                            isExact ? 'text-emerald-700' : isSurplus ? 'text-blue-700' : 'text-red-700'
                          }`}
                        >
                          {isExact ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                          {item.cashVariance > 0
                            ? `+${formatIDR(item.cashVariance)}`
                            : formatIDR(item.cashVariance)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedShiftDetail(item)}
                            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-orange-50 text-gray-600 hover:text-orange-600 border border-gray-200 inline-flex items-center justify-center cursor-pointer"
                            aria-label="Lihat Detail Shift"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTriggerPrint(item)}
                            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-blue-600 border border-gray-200 inline-flex items-center justify-center cursor-pointer"
                            aria-label="Cetak Berita Acara"
                          >
                            <Printer size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {historyItems.length === 0 ? (
            <div className="py-10 px-4 text-center text-xs text-gray-400">
              {isLoadingHistory ? 'Memuat riwayat tutup kasir...' : 'Belum ada rekap tutup kasir.'}
            </div>
          ) : (
            historyItems.map(item => {
              const isExact = item.cashVariance === 0;
              const isSurplus = item.cashVariance > 0;
              return (
                <div key={item.id} className="p-4 space-y-2.5 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono font-bold text-gray-900">{item.shiftCode}</p>
                      <p className="text-gray-500 mt-0.5">
                        {item.shiftDate} &middot; {item.cashierName}
                      </p>
                    </div>
                    <span
                      className={`font-mono font-bold tabular-nums ${
                        isExact ? 'text-emerald-700' : isSurplus ? 'text-blue-700' : 'text-red-700'
                      }`}
                    >
                      {item.cashVariance > 0 ? `+${formatIDR(item.cashVariance)}` : formatIDR(item.cashVariance)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                    <div>
                      <span className="text-gray-400 block">Penjualan</span>
                      <span className="font-mono font-bold text-gray-900">{formatIDR(item.totalSalesAmount)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-400 block">Kas Fisik</span>
                      <span className="font-mono font-bold text-gray-900">{formatIDR(item.actualCash)}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedShiftDetail(item)}
                      className="h-8 px-3 rounded-lg bg-gray-100 text-gray-700 font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye size={13} />
                      <span>Detail</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTriggerPrint(item)}
                      className="h-8 px-3 rounded-lg bg-orange-50 text-orange-700 font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer size={13} />
                      <span>Cetak</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

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
      </div>

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
