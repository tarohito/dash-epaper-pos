import React, { useState, useEffect } from 'react';
import {
  Coins,
  Scale,
  ReceiptText,
  Building2,
  Plus,
  Printer,
  Eye,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { BuybackCreatePayload, BuybackItem, BuybackStatsSummary } from '../../types';
import { formatIDR } from '../../utils/formatters';
import { BuybackFormPage } from './BuybackFormPage';
import { BuybackDetailModal } from './BuybackDetailModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { ActionDropdownMenu } from '../common/ActionDropdownMenu';
import { PaginationControls } from '../common/PaginationControls';
import { useDebounce } from '../../hooks/useDebounce';
import { posApi } from '../../services/api';
import { SearchInput } from '../common/SearchInput';
import { ErrorBanner } from '../common/ErrorBanner';
import { useToast } from '../../contexts/ToastContext';
import { MoneyAmount } from '../common/MoneyAmount';
import {
  SortableTh,
  SortDirection,
  getNextColumnSort,
} from '../common/TableSortControls';

interface BuybackViewProps {
  refreshTrigger: number;
  branchName?: string;
  cashierName?: string;
  canVoid?: boolean;
  onSaveBuyback: (newBuyback: BuybackCreatePayload) => Promise<void>;
  onVoidBuyback: (id: string, reason: string) => Promise<void>;
  onSelectReceipt: (item: BuybackItem) => void;
  onBackToPos: () => void;
  initialCustomer?: { id?: string; name: string; phone: string; nik?: string; address?: string } | null;
}

export const BuybackView: React.FC<BuybackViewProps> = ({
  refreshTrigger,
  branchName,
  cashierName,
  canVoid = true,
  onSaveBuyback,
  onVoidBuyback,
  onSelectReceipt,
  initialCustomer,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'form'>(() => {
    return initialCustomer ? 'form' : 'list';
  });

  const [voidingItem, setVoidingItem] = useState<BuybackItem | null>(null);
  const [isVoiding, setIsVoiding] = useState(false);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 220);
  const [filterMethod, setFilterMethod] = useState<'all' | 'transfer' | 'cash'>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [selectedDetailItem, setSelectedDetailItem] = useState<BuybackItem | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [items, setItems] = useState<BuybackItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<BuybackStatsSummary>({
    totalDanaDicairkan: 0,
    totalBeratDiterima: 0,
    totalTransaksi: 0,
    avgPerTransaksi: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { showToast } = useToast();

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterMethod, sortBy, sortDir]);

  useEffect(() => {
    if (viewMode !== 'list') return;
    const controller = new AbortController();
    setIsLoading(true);
    setFetchError(null);

    posApi
      .getBuybacks(
        {
          page: currentPage,
          pageSize,
          search: debouncedSearch,
          method: filterMethod,
          sortBy,
          sortDir,
        },
        controller.signal
      )
      .then(res => {
        setItems(Array.isArray(res.items) ? res.items : []);
        setTotalItems(res.total ?? 0);
        setTotalPages(res.totalPages ?? 1);
        if (res.stats) setStats(res.stats);
        if (res.page !== currentPage) setCurrentPage(res.page ?? 1);
        setIsLoading(false);
      })
      .catch(err => {
        if ((err as Error).name !== 'AbortError') {
          const msg = err instanceof Error ? err.message : 'Gagal memuat riwayat buyback.';
          setFetchError(msg);
          setIsLoading(false);
          showToast('error', msg);
        }
      });

    return () => controller.abort();
  }, [viewMode, currentPage, pageSize, debouncedSearch, filterMethod, sortBy, sortDir, refreshTrigger, retryCount, showToast]);

  const handleHeaderSort = (key: string, defaultDir: SortDirection = 'desc') => {
    const next = getNextColumnSort(key, sortBy, sortDir, defaultDir);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
  };

  const handleOpenDetail = async (bb: BuybackItem) => {
    setLoadingActionId(bb.id);
    try {
      const full = await posApi.getBuybackById(bb.id);
      setSelectedDetailItem(full);
    } catch {
      showToast('warning', 'Detail lampiran gagal dimuat dari server, menampilkan data ringkas.');
      setSelectedDetailItem(bb);
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleOpenPrint = async (bb: BuybackItem) => {
    setLoadingActionId(bb.id);
    try {
      const full = await posApi.getBuybackById(bb.id);
      onSelectReceipt(full);
    } catch {
      showToast('warning', 'Detail lengkap gagal dimuat dari server, mencetak data ringkas.');
      onSelectReceipt(bb);
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleConfirmVoid = async (_checked: boolean, reason: string) => {
    if (!voidingItem) return;
    setIsVoiding(true);
    try {
      await onVoidBuyback(voidingItem.id, reason);
      setVoidingItem(null);
    } finally {
      setIsVoiding(false);
    }
  };

  if (viewMode === 'form') {
    return (
      <BuybackFormPage
        onSaveBuyback={async payload => {
          await onSaveBuyback(payload);
          setViewMode('list');
        }}
        onCancel={() => {
          setViewMode('list');
        }}
        initialCustomer={initialCustomer}
        existingCount={stats.totalTransaksi}
        branchName={branchName}
        cashierName={cashierName}
      />
    );
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
            Daftar Transaksi Buyback (Pembelian Emas)
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Arsip dan riwayat pembelian kembali emas nasabah, leburan, dan logam mulia bersertifikat.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('form')}
            className="h-9 px-4 text-xs sm:text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-[0.98]"
          >
            <Plus size={16} />
            <span>Transaksi Buyback Baru</span>
          </button>
        </div>
      </div>

      {/* 4 Modern KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors min-w-0">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-medium text-gray-500 truncate">
              Total Dana Dicairkan
            </span>
            <span className="w-8 h-8 rounded-lg bg-orange-50/80 text-orange-600 border border-orange-100/80 flex items-center justify-center shrink-0">
              <Coins size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3 min-w-0">
            <MoneyAmount value={stats.totalDanaDicairkan} maxFontPx={24} minFontPx={13} />
            <p className="text-xs text-gray-400 mt-1 truncate">Uang keluar untuk buyback</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-medium text-gray-500 truncate">
              Total Berat Emas
            </span>
            <span className="w-8 h-8 rounded-lg bg-amber-50/80 text-amber-600 border border-amber-100/80 flex items-center justify-center shrink-0">
              <Scale size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-gray-900 tracking-tight truncate tabular-nums">
              {stats.totalBeratDiterima.toFixed(2)} gr
            </div>
            <p className="text-xs text-gray-400 mt-1 truncate">Fisik emas masuk ke toko</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-medium text-gray-500 truncate">
              Total Transaksi
            </span>
            <span className="w-8 h-8 rounded-lg bg-blue-50/80 text-blue-600 border border-blue-100/80 flex items-center justify-center shrink-0">
              <ReceiptText size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-gray-900 tracking-tight truncate tabular-nums">
              {stats.totalTransaksi} Nota
            </div>
            <p className="text-xs text-gray-400 mt-1 truncate">Selesai &amp; terverifikasi</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors min-w-0">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-medium text-gray-500 truncate">
              Rata-rata / Nota
            </span>
            <span className="w-8 h-8 rounded-lg bg-emerald-50/80 text-emerald-600 border border-emerald-100/80 flex items-center justify-center shrink-0">
              <Building2 size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3 min-w-0">
            <MoneyAmount value={stats.avgPerTransaksi} maxFontPx={24} minFontPx={13} />
            <p className="text-xs text-gray-400 mt-1 truncate">Rata-rata per nasabah</p>
          </div>
        </div>
      </div>

      {/* Table Workspace Card */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-4 sm:p-5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-4">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Cari no nota, nasabah, NIK, jenis emas..."
          />

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            <div className="inline-flex h-9 p-0.5 bg-gray-100 rounded-lg border border-gray-200 items-center overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setFilterMethod('all')}
                className={`h-full px-3 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center whitespace-nowrap ${
                  filterMethod === 'all'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setFilterMethod('transfer')}
                className={`h-full px-3 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center whitespace-nowrap ${
                  filterMethod === 'transfer'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Transfer Bank
              </button>
              <button
                type="button"
                onClick={() => setFilterMethod('cash')}
                className={`h-full px-3 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center whitespace-nowrap ${
                  filterMethod === 'cash'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Uang Tunai
              </button>
            </div>
          </div>
        </div>

        {fetchError && (
          <ErrorBanner
            message={fetchError}
            onRetry={() => setRetryCount(c => c + 1)}
            className="mb-3"
          />
        )}

        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-2xs">
          {isLoading && items.length === 0 ? (
            <div className="py-12 px-4 flex items-center justify-center gap-2 text-xs sm:text-sm text-gray-400">
              <Loader2 size={18} className="animate-spin text-orange-500" />
              <span>Memuat transaksi buyback...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 px-4 text-center text-gray-400">
              <ReceiptText size={36} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-semibold text-gray-600">Tidak ada transaksi buyback</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {searchQuery
                  ? 'Coba gunakan kata kunci pencarian yang lain.'
                  : 'Belum ada transaksi pembelian emas yang tercatat.'}
              </p>
              {!searchQuery && (
                <button
                  type="button"
                  onClick={() => setViewMode('form')}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors cursor-pointer border border-orange-200"
                >
                  <Plus size={14} />
                  <span>Buat Transaksi Buyback Baru</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {/* MOBILE CARDS (md:hidden) */}
              <div className="md:hidden divide-y divide-gray-100">
                {items.map(bb => {
                  const isActionBusy = loadingActionId === bb.id;
                  const isVoid = bb.status === 'void';
                  const methodBadgeClass = isVoid
                    ? 'bg-red-50 text-red-700 border border-red-200/80'
                    : bb.paymentMethod === 'transfer'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200/80'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80';
                  const methodLabel = isVoid
                    ? 'Dibatalkan'
                    : bb.paymentMethod === 'transfer'
                    ? bb.bankName
                      ? `Transfer (${bb.bankName})`
                      : 'Transfer Bank'
                    : 'Tunai';

                  return (
                    <div
                      key={bb.id}
                      className={`p-4 space-y-2.5 transition-colors ${
                        isVoid ? 'bg-red-50/20 opacity-80' : 'hover:bg-orange-50/25'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-gray-900 text-xs">
                              {bb.invoiceNo}
                            </span>
                            {isVoid && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-red-100 text-red-700 border border-red-200 rounded">
                                VOID
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 block mt-0.5 tabular-nums">
                            {bb.date}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 text-[11px] font-semibold rounded shrink-0 ${methodBadgeClass}`}>
                          {methodLabel}
                        </span>
                      </div>

                      <div className="text-xs space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-gray-900 truncate">{bb.customerName}</span>
                          <span className="font-mono text-gray-500 shrink-0">{bb.customerPhone}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-gray-600">
                          <span className="truncate">
                            {bb.itemType} ({bb.kadar})
                          </span>
                          <span className="font-mono font-bold text-gray-800 shrink-0">
                            {bb.beratBersih.toFixed(2)} gr
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                        <span
                          className={`font-mono font-bold text-sm tabular-nums ${
                            isVoid ? 'line-through text-gray-400' : 'text-gray-900'
                          }`}
                        >
                          {formatIDR(bb.totalBayar)}
                        </span>
                        <ActionDropdownMenu
                          disabled={isActionBusy}
                          ariaLabel={`Aksi untuk ${bb.invoiceNo}`}
                          items={[
                            {
                              id: 'detail',
                              label: 'Lihat Detail',
                              icon: <Eye size={14} />,
                              onClick: () => void handleOpenDetail(bb),
                            },
                            {
                              id: 'print',
                              label: 'Cetak Nota',
                              icon: <Printer size={14} />,
                              tone: 'primary',
                              onClick: () => void handleOpenPrint(bb),
                            },
                            ...(canVoid
                              ? [
                                  {
                                    id: 'void',
                                    label: 'Void Buyback',
                                    icon: <RotateCcw size={14} />,
                                    tone: 'warning' as const,
                                    dividerBefore: true,
                                    disabled: isVoid,
                                    disabledReason: isVoid ? 'Sudah di-void' : undefined,
                                    onClick: () => setVoidingItem(bb),
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP TABLE (hidden md:block) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-xs sm:text-sm text-left border-collapse">
                  <thead className="bg-gray-50/90 text-gray-500 uppercase font-semibold text-[11px] border-b border-gray-200 tracking-wider">
                    <tr>
                      <SortableTh
                        label="No. Transaksi"
                        sortKey="newest"
                        currentSortBy={sortBy}
                        currentSortDir={sortDir}
                        onSort={key => handleHeaderSort(key, 'desc')}
                        className="py-3 px-4 w-[185px]"
                      />
                      <SortableTh
                        label="Nasabah"
                        sortKey="customerName"
                        currentSortBy={sortBy}
                        currentSortDir={sortDir}
                        onSort={key => handleHeaderSort(key, 'asc')}
                        className="py-3 px-4 min-w-[165px]"
                      />
                      <SortableTh
                        label="Barang & Kadar"
                        sortKey="itemType"
                        currentSortBy={sortBy}
                        currentSortDir={sortDir}
                        onSort={key => handleHeaderSort(key, 'asc')}
                        className="py-3 px-4 min-w-[220px]"
                      />
                      <SortableTh
                        label="Berat Bersih"
                        sortKey="beratBersih"
                        currentSortBy={sortBy}
                        currentSortDir={sortDir}
                        onSort={key => handleHeaderSort(key, 'desc')}
                        align="right"
                        className="py-3 px-4 w-[125px]"
                      />
                      <SortableTh
                        label="Total Bayar"
                        sortKey="totalBayar"
                        currentSortBy={sortBy}
                        currentSortDir={sortDir}
                        onSort={key => handleHeaderSort(key, 'desc')}
                        align="right"
                        className="py-3 px-4 w-[175px]"
                      />
                      <th className="py-3 px-3 text-center w-[72px]">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                    {items.map(bb => {
                      const isActionBusy = loadingActionId === bb.id;
                      const isVoid = bb.status === 'void';
                      const methodBadgeClass = isVoid
                        ? 'bg-red-50 text-red-700 border border-red-200/80'
                        : bb.paymentMethod === 'transfer'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200/80'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80';
                      const methodLabel = isVoid
                        ? 'Dibatalkan'
                        : bb.paymentMethod === 'transfer'
                        ? bb.bankName
                          ? `Transfer (${bb.bankName})`
                          : 'Transfer Bank'
                        : 'Tunai';

                      return (
                        <tr
                          key={bb.id}
                          className={`transition-colors ${
                            isVoid ? 'bg-red-50/20 opacity-80' : 'hover:bg-orange-50/30'
                          }`}
                        >
                          <td className="py-3.5 px-4 whitespace-nowrap align-middle">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-gray-900 text-xs sm:text-sm">
                                {bb.invoiceNo}
                              </span>
                              {isVoid && (
                                <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold uppercase bg-red-100 text-red-700 border border-red-200 rounded">
                                  VOID
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 block mt-0.5 tabular-nums">
                              {bb.date}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 align-middle max-w-[210px]">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-bold text-gray-900 truncate text-xs sm:text-sm">
                                {bb.customerName}
                              </span>
                              {bb.customerMemberCode && (
                                <span className="font-mono text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-semibold shrink-0">
                                  {bb.customerMemberCode}
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-mono text-gray-500 block mt-0.5 truncate">
                              {bb.customerPhone || '-'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 align-middle max-w-[280px]">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-semibold text-gray-900 text-xs sm:text-sm truncate">
                                {bb.itemType}
                              </span>
                              <span className="text-[11px] bg-amber-50 text-amber-800 font-bold px-1.5 py-0.5 rounded border border-amber-200 font-mono shrink-0">
                                {bb.kadar}
                              </span>
                            </div>
                            <span
                              className={`text-xs block mt-0.5 truncate ${
                                isVoid && bb.voidReason ? 'text-red-600' : 'text-gray-500'
                              }`}
                              title={isVoid && bb.voidReason ? bb.voidReason : undefined}
                            >
                              {isVoid && bb.voidReason
                                ? `Alasan: ${bb.voidReason}`
                                : [
                                    bb.kondisi,
                                    bb.sourceNote && bb.sourceNote !== '-'
                                      ? `Nota: ${bb.sourceNote}`
                                      : null,
                                  ]
                                    .filter(Boolean)
                                    .join(' • ')}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap align-middle">
                            <span className="font-mono font-bold text-gray-900 text-xs sm:text-sm tabular-nums block">
                              {bb.beratBersih.toFixed(2)} gr
                            </span>
                            {bb.potonganBatu > 0 && (
                              <span className="text-[11px] font-mono text-gray-400 tabular-nums block mt-0.5">
                                Kotor: {bb.beratKotor.toFixed(2)} gr
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap align-middle">
                            <span
                              className={`font-mono font-bold text-sm block tabular-nums ${
                                isVoid ? 'line-through text-gray-400' : 'text-gray-900'
                              }`}
                            >
                              {formatIDR(bb.totalBayar)}
                            </span>
                            <span
                              className={`inline-block mt-0.5 text-[11px] font-semibold px-2 py-0.5 rounded ${methodBadgeClass}`}
                            >
                              {methodLabel}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 text-center whitespace-nowrap align-middle">
                            <ActionDropdownMenu
                              disabled={isActionBusy}
                              ariaLabel={`Aksi untuk ${bb.invoiceNo}`}
                              items={[
                                {
                                  id: 'detail',
                                  label: 'Lihat Detail',
                                  icon: <Eye size={14} />,
                                  onClick: () => void handleOpenDetail(bb),
                                },
                                {
                                  id: 'print',
                                  label: 'Cetak Nota',
                                  icon: <Printer size={14} />,
                                  tone: 'primary',
                                  onClick: () => void handleOpenPrint(bb),
                                },
                                ...(canVoid
                                  ? [
                                      {
                                        id: 'void',
                                        label: 'Void Buyback',
                                        icon: <RotateCcw size={14} />,
                                        tone: 'warning' as const,
                                        dividerBefore: true,
                                        disabled: isVoid,
                                        disabledReason: isVoid ? 'Sudah di-void' : undefined,
                                        onClick: () => setVoidingItem(bb),
                                      },
                                    ]
                                  : []),
                              ]}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            isLoading={isLoading}
            onPageChange={setCurrentPage}
            onPageSizeChange={size => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      <BuybackDetailModal
        isOpen={!!selectedDetailItem}
        item={selectedDetailItem}
        onClose={() => setSelectedDetailItem(null)}
        onPrintReceipt={onSelectReceipt}
      />

      <ConfirmModal
        isOpen={!!voidingItem}
        variant="void"
        title="Void / Batalkan Transaksi Buyback"
        description={
          voidingItem
            ? `Nota buyback ${voidingItem.invoiceNo} atas nama "${voidingItem.customerName}" senilai ${formatIDR(voidingItem.totalBayar)} akan ditandai sebagai VOID agar tetap tercatat dalam arsip audit kas.`
            : ''
        }
        inputLabel="Alasan Pembatalan / Void"
        inputPlaceholder="Contoh: Salah timbang berat bersih / nasabah membatalkan buyback"
        inputRequired
        confirmLabel="Ya, Void Buyback"
        loadingLabel="Memproses Void..."
        isLoading={isVoiding}
        onCancel={() => setVoidingItem(null)}
        onConfirm={handleConfirmVoid}
      />
    </div>
  );
};
