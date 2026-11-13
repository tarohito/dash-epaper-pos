import React, { useState, useEffect } from 'react';
import {
  Coins,
  Scale,
  ReceiptText,
  Calendar,
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
import Tooltip from '../Tooltip';
import { PaginationControls } from '../common/PaginationControls';
import { useDebounce } from '../../hooks/useDebounce';
import { posApi } from '../../services/api';
import { SearchInput } from '../common/SearchInput';
import { ErrorBanner } from '../common/ErrorBanner';
import { useToast } from '../../contexts/ToastContext';
import {
  ShopeeSortBar,
  ShopeeSortPreset,
  SortableTh,
  SortDirection,
  getNextColumnSort,
} from '../common/TableSortControls';

const BUYBACK_SORT_PRESETS: ShopeeSortPreset[] = [
  { id: 'newest', label: 'Terbaru', sortBy: 'newest', sortDir: 'desc' },
  { id: 'oldest', label: 'Terlama', sortBy: 'newest', sortDir: 'asc' },
  { id: 'bayar-desc', label: 'Bayar Tertinggi', sortBy: 'totalBayar', sortDir: 'desc' },
  { id: 'bayar-asc', label: 'Bayar Terendah', sortBy: 'totalBayar', sortDir: 'asc' },
  { id: 'berat-desc', label: 'Berat Terberat', sortBy: 'beratBersih', sortDir: 'desc' },
  { id: 'cust-asc', label: 'Nasabah A–Z', sortBy: 'customerName', sortDir: 'asc' },
];

interface BuybackViewProps {
  refreshTrigger: number;
  onSaveBuyback: (newBuyback: BuybackCreatePayload) => Promise<void>;
  onVoidBuyback: (id: string, reason: string) => Promise<void>;
  onSelectReceipt: (item: BuybackItem) => void;
  onBackToPos: () => void;
  initialCustomer?: { id?: string; name: string; phone: string; nik?: string; address?: string } | null;
}

export const BuybackView: React.FC<BuybackViewProps> = ({
  refreshTrigger,
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
  const [pageSize, setPageSize] = useState(20);
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

  const handleSortPreset = (nextBy: string, nextDir: SortDirection) => {
    setSortBy(nextBy);
    setSortDir(nextDir);
  };

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
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-medium text-gray-500 truncate">
              Total Dana Dicairkan
            </span>
            <span className="w-8 h-8 rounded-lg bg-orange-50/80 text-orange-600 border border-orange-100/80 flex items-center justify-center shrink-0">
              <Coins size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-gray-900 tracking-tight truncate tabular-nums">
              {formatIDR(stats.totalDanaDicairkan)}
            </div>
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

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-medium text-gray-500 truncate">
              Rata-rata / Nota
            </span>
            <span className="w-8 h-8 rounded-lg bg-emerald-50/80 text-emerald-600 border border-emerald-100/80 flex items-center justify-center shrink-0">
              <Building2 size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-gray-900 tracking-tight truncate tabular-nums">
              {formatIDR(stats.avgPerTransaksi)}
            </div>
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
              <div className="inline-flex h-9 p-0.5 bg-gray-100 rounded-lg border border-gray-200 items-center">
                <button
                  type="button"
                  onClick={() => setFilterMethod('all')}
                  className={`h-full px-3 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center ${
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
                  className={`h-full px-3 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center ${
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
                  className={`h-full px-3 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center ${
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

          <ShopeeSortBar
            presets={BUYBACK_SORT_PRESETS}
            sortBy={sortBy}
            sortDir={sortDir}
            onSelectPreset={handleSortPreset}
          />

          {fetchError && (
            <ErrorBanner
              message={fetchError}
              onRetry={() => setRetryCount(c => c + 1)}
              className="mb-3"
            />
          )}

          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left border-collapse">
                <thead className="bg-gray-50/80 text-gray-500 uppercase font-semibold text-xs border-b border-gray-200 tracking-wider">
                  <tr>
                    <SortableTh
                      label="No. Transaksi"
                      sortKey="newest"
                      currentSortBy={sortBy}
                      currentSortDir={sortDir}
                      onSort={key => handleHeaderSort(key, 'desc')}
                      className="py-3 px-3.5 sm:px-4"
                    />
                    <SortableTh
                      label="Nasabah"
                      sortKey="customerName"
                      currentSortBy={sortBy}
                      currentSortDir={sortDir}
                      onSort={key => handleHeaderSort(key, 'asc')}
                      className="py-3 px-3 sm:px-4"
                    />
                    <SortableTh
                      label="Barang & Kadar"
                      sortKey="itemType"
                      currentSortBy={sortBy}
                      currentSortDir={sortDir}
                      onSort={key => handleHeaderSort(key, 'asc')}
                      className="py-3 px-3 sm:px-4"
                    />
                    <SortableTh
                      label="Berat"
                      sortKey="beratBersih"
                      currentSortBy={sortBy}
                      currentSortDir={sortDir}
                      onSort={key => handleHeaderSort(key, 'desc')}
                      align="center"
                      className="py-3 px-3 sm:px-4"
                    />
                    <SortableTh
                      label="Total Bayar"
                      sortKey="totalBayar"
                      currentSortBy={sortBy}
                      currentSortDir={sortDir}
                      onSort={key => handleHeaderSort(key, 'desc')}
                      align="right"
                      className="py-3 px-3 sm:px-4"
                    />
                    <th className="py-3 px-3 sm:px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                  {isLoading && items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400">
                        <div className="inline-flex items-center gap-2">
                          <Loader2 size={18} className="animate-spin text-orange-500" />
                          <span>Memuat transaksi buyback...</span>
                        </div>
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400">
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
                      </td>
                    </tr>
                  ) : (
                    items.map(bb => {
                      const isActionBusy = loadingActionId === bb.id;
                      const isVoid = bb.status === 'void';
                      return (
                        <tr
                          key={bb.id}
                          className={`transition-colors ${isVoid ? 'bg-red-50/20 opacity-80' : 'hover:bg-orange-50/25'}`}
                        >
                          <td className="py-3.5 px-3.5 sm:px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-gray-900 text-xs sm:text-sm">
                                {bb.invoiceNo}
                              </span>
                              {isVoid && (
                                <span className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-bold uppercase bg-red-100 text-red-700 border border-red-200 rounded">
                                  VOID
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <Calendar size={12} /> {bb.date}
                            </span>
                            {isVoid && bb.voidReason && (
                              <span className="text-xs text-red-600 block mt-0.5 max-w-[200px] truncate" title={bb.voidReason}>
                                Alasan: {bb.voidReason}
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-3 sm:px-4 min-w-[130px]">
                            <span className="font-bold text-gray-900 block truncate text-xs sm:text-sm">
                              {bb.customerName}
                            </span>
                            <span className="text-xs text-gray-500 font-mono block mt-0.5">
                              {bb.customerPhone || '-'}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 sm:px-4 min-w-[140px]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-gray-900 text-xs sm:text-sm">
                                {bb.itemType}
                              </span>
                              <span className="text-xs bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-200 font-mono">
                                {bb.kadar}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500 block mt-0.5 truncate max-w-[180px]">
                              {bb.kondisi}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 sm:px-4 text-center whitespace-nowrap font-mono font-bold text-gray-900 text-xs sm:text-sm">
                            {bb.beratBersih.toFixed(2)} gr
                          </td>

                          <td className="py-3.5 px-3 sm:px-4 text-right whitespace-nowrap">
                            <span
                              className={`font-mono font-bold text-sm block tabular-nums ${
                                isVoid ? 'line-through text-gray-400' : 'text-gray-900'
                              }`}
                            >
                              {formatIDR(bb.totalBayar)}
                            </span>
                            <span className="inline-block mt-0.5 text-xs font-semibold px-2 py-0.5 rounded capitalize bg-gray-100 text-gray-600">
                              {isVoid
                                ? 'Dibatalkan'
                                : bb.paymentMethod === 'transfer'
                                ? bb.bankName
                                  ? `Transfer (${bb.bankName})`
                                  : 'Transfer Bank'
                                : 'Tunai'}
                            </span>
                          </td>

                          <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                            <div className="inline-flex items-center justify-center gap-1.5">
                              <Tooltip content="Lihat Rincian Lengkap" side="top">
                                <button
                                  type="button"
                                  disabled={isActionBusy}
                                  onClick={() => void handleOpenDetail(bb)}
                                  className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-orange-50 text-gray-600 hover:text-orange-600 border border-gray-200 hover:border-orange-200 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs disabled:opacity-50"
                                  aria-label="Lihat Rincian Lengkap"
                                >
                                  {isActionBusy ? <Loader2 size={14} className="animate-spin" /> : <Eye size={15} />}
                                </button>
                              </Tooltip>

                              <Tooltip content={isVoid ? 'Nota buyback sudah di-void' : 'Void / Batalkan Buyback'} side="top">
                                <button
                                  type="button"
                                  disabled={isActionBusy || isVoid}
                                  onClick={() => setVoidingItem(bb)}
                                  className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-amber-50 text-gray-600 hover:text-amber-700 border border-gray-200 hover:border-amber-200 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-100 disabled:hover:text-gray-600 disabled:active:scale-100"
                                  aria-label="Void Transaksi Buyback"
                                >
                                  <RotateCcw size={15} />
                                </button>
                              </Tooltip>

                              <Tooltip content="Cetak Nota Resmi" side="top">
                                <button
                                  type="button"
                                  disabled={isActionBusy}
                                  onClick={() => void handleOpenPrint(bb)}
                                  className="w-8 h-8 rounded-lg bg-orange-50 hover:bg-orange-500 text-orange-600 hover:text-white border border-orange-200 hover:border-orange-500 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs disabled:opacity-50"
                                  aria-label="Cetak Nota Resmi"
                                >
                                  <Printer size={15} />
                                </button>
                              </Tooltip>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

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
