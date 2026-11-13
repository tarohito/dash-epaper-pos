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
import { Transaction, TransactionStatsSummary } from '../../types';
import { formatIDR } from '../../utils/formatters';
import { PaginationControls } from '../common/PaginationControls';
import { ConfirmModal } from '../common/ConfirmModal';
import { TransactionDetailModal } from './TransactionDetailModal';
import Tooltip from '../Tooltip';
import { posApi } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
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

const TRANSACTION_SORT_PRESETS: ShopeeSortPreset[] = [
  { id: 'newest', label: 'Terbaru', sortBy: 'newest', sortDir: 'desc' },
  { id: 'oldest', label: 'Terlama', sortBy: 'newest', sortDir: 'asc' },
  { id: 'total-desc', label: 'Total Tertinggi', sortBy: 'grandTotal', sortDir: 'desc' },
  { id: 'total-asc', label: 'Total Terendah', sortBy: 'grandTotal', sortDir: 'asc' },
  { id: 'berat-desc', label: 'Berat Terberat', sortBy: 'totalBerat', sortDir: 'desc' },
  { id: 'cust-asc', label: 'Pelanggan A–Z', sortBy: 'customerName', sortDir: 'asc' },
];

interface DailyTransactionsViewProps {
  refreshTrigger: number;
  onSelectReceipt: (tx: Transaction) => void;
  onVoidTransaction: (id: string, reason: string, restoreStock: boolean) => Promise<void>;
  onNavigateToPos: () => void;
}

export const DailyTransactionsView: React.FC<DailyTransactionsViewProps> = ({
  refreshTrigger,
  onSelectReceipt,
  onVoidTransaction,
  onNavigateToPos,
}) => {
  const [txFilterMethod, setTxFilterMethod] = useState<string>('semua');
  const [txSearchQuery, setTxSearchQuery] = useState<string>('');
  const debouncedSearch = useDebounce(txSearchQuery, 220);
  const [sortBy, setSortBy] = useState<string>('newest');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [selectedDetailTx, setSelectedDetailTx] = useState<Transaction | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [items, setItems] = useState<Transaction[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<TransactionStatsSummary>({
    totalOmzetPenjualan: 0,
    totalBeratTerjual: 0,
    totalTransaksi: 0,
    avgPerTransaksi: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { showToast } = useToast();

  const [voidingTx, setVoidingTx] = useState<Transaction | null>(null);
  const [isVoiding, setIsVoiding] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, txFilterMethod, sortBy, sortDir]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setFetchError(null);

    posApi
      .getTransactions(
        {
          page: currentPage,
          pageSize,
          search: debouncedSearch,
          method: txFilterMethod,
          sortBy,
          sortDir,
        },
        controller.signal
      )
      .then(res => {
        const list = Array.isArray(res.items) ? res.items : [];
        setItems(list);
        setTotalItems(res.total ?? list.length);
        setTotalPages(res.totalPages ?? 1);
        if (res.stats) {
          setStats({
            totalOmzetPenjualan: res.stats.totalOmzetPenjualan ?? 0,
            totalBeratTerjual: res.stats.totalBeratTerjual ?? 0,
            totalTransaksi: res.stats.totalTransaksi ?? 0,
            avgPerTransaksi: res.stats.avgPerTransaksi ?? 0,
          });
        } else {
          const activeList = list.filter(tx => tx.status !== 'void');
          const sumOmzet = activeList.reduce((acc, tx) => acc + (tx.grandTotal || 0), 0);
          const sumBerat = activeList.reduce((acc, tx) => acc + (tx.totalBerat || 0), 0);
          setStats({
            totalOmzetPenjualan: sumOmzet,
            totalBeratTerjual: sumBerat,
            totalTransaksi: activeList.length,
            avgPerTransaksi: activeList.length > 0 ? Math.round(sumOmzet / activeList.length) : 0,
          });
        }
        if (res.page !== currentPage) setCurrentPage(res.page ?? 1);
        setIsLoading(false);
      })
      .catch(err => {
        if ((err as Error).name !== 'AbortError') {
          const msg = err instanceof Error ? err.message : 'Gagal memuat riwayat transaksi.';
          setFetchError(msg);
          setIsLoading(false);
          showToast('error', msg);
        }
      });

    return () => controller.abort();
  }, [currentPage, pageSize, debouncedSearch, txFilterMethod, sortBy, sortDir, refreshTrigger, retryCount, showToast]);

  const handleSortPreset = (nextBy: string, nextDir: SortDirection) => {
    setSortBy(nextBy);
    setSortDir(nextDir);
  };

  const handleHeaderSort = (key: string, defaultDir: SortDirection = 'desc') => {
    const next = getNextColumnSort(key, sortBy, sortDir, defaultDir);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
  };

  const handleConfirmVoid = async (restoreStock: boolean, reason: string) => {
    if (!voidingTx) return;
    setIsVoiding(true);
    try {
      await onVoidTransaction(voidingTx.id, reason, restoreStock);
      setVoidingTx(null);
    } finally {
      setIsVoiding(false);
    }
  };

  const getPaymentBadgeLabel = (tx: Transaction): string => {
    if (tx.status === 'void') return 'Dibatalkan';
    switch (tx.paymentMethod) {
      case 'cash':
        return 'Tunai';
      case 'debit':
        return tx.paymentDetails.debitBank ? `Debit (${tx.paymentDetails.debitBank})` : 'Debit EDC';
      case 'transfer':
        return tx.paymentDetails.transferBank ? `Transfer (${tx.paymentDetails.transferBank})` : 'Transfer Bank';
      case 'qris':
        return 'QRIS GPN';
      default:
        return tx.paymentMethod;
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
            Daftar Transaksi Penjualan (Kasir POS)
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Arsip dan riwayat penjualan perhiasan, rincian pembayaran, serta cetak ulang bukti nota resmi toko.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onNavigateToPos}
            className="h-9 px-4 text-xs sm:text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-[0.98]"
          >
            <Plus size={16} />
            <span>Transaksi Penjualan Baru</span>
          </button>
        </div>
      </div>

      {/* 4 Modern KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-medium text-gray-500 truncate">
              Total Omzet Penjualan
            </span>
            <span className="w-8 h-8 rounded-lg bg-orange-50/80 text-orange-600 border border-orange-100/80 flex items-center justify-center shrink-0">
              <Coins size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-gray-900 tracking-tight truncate tabular-nums">
              {formatIDR(stats?.totalOmzetPenjualan ?? 0)}
            </div>
            <p className="text-xs text-gray-400 mt-1 truncate">Uang masuk penjualan aktif</p>
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
              {(stats?.totalBeratTerjual ?? 0).toFixed(2)} gr
            </div>
            <p className="text-xs text-gray-400 mt-1 truncate">Fisik emas keluar terjual</p>
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
              {stats?.totalTransaksi ?? 0} Nota
            </div>
            <p className="text-xs text-gray-400 mt-1 truncate">Lunas &amp; terverifikasi</p>
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
              {formatIDR(stats?.avgPerTransaksi ?? 0)}
            </div>
            <p className="text-xs text-gray-400 mt-1 truncate">Rata-rata per pelanggan</p>
          </div>
        </div>
      </div>

      {/* Table Workspace Card */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-4 sm:p-5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-4">
          <SearchInput
            value={txSearchQuery}
            onChange={setTxSearchQuery}
            placeholder="Cari no nota, pelanggan, kasir, perhiasan/SKU..."
          />

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            <div className="inline-flex h-9 p-0.5 bg-gray-100 rounded-lg border border-gray-200 items-center overflow-x-auto max-w-full">
              {[
                { id: 'semua', label: 'Semua' },
                { id: 'cash', label: 'Tunai' },
                { id: 'debit', label: 'Debit EDC' },
                { id: 'transfer', label: 'Transfer Bank' },
                { id: 'qris', label: 'QRIS' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTxFilterMethod(tab.id)}
                  className={`h-full px-3 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center whitespace-nowrap ${
                    txFilterMethod === tab.id
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <ShopeeSortBar
          presets={TRANSACTION_SORT_PRESETS}
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
                    label="Pelanggan"
                    sortKey="customerName"
                    currentSortBy={sortBy}
                    currentSortDir={sortDir}
                    onSort={key => handleHeaderSort(key, 'asc')}
                    className="py-3 px-3 sm:px-4"
                  />
                  <SortableTh
                    label="Item & Rincian"
                    sortKey="paymentMethod"
                    currentSortBy={sortBy}
                    currentSortDir={sortDir}
                    onSort={key => handleHeaderSort(key, 'asc')}
                    className="py-3 px-3 sm:px-4"
                  />
                  <SortableTh
                    label="Berat"
                    sortKey="totalBerat"
                    currentSortBy={sortBy}
                    currentSortDir={sortDir}
                    onSort={key => handleHeaderSort(key, 'desc')}
                    align="center"
                    className="py-3 px-3 sm:px-4"
                  />
                  <SortableTh
                    label="Total Bayar"
                    sortKey="grandTotal"
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
                        <span>Memuat transaksi penjualan...</span>
                      </div>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      <ReceiptText size={36} className="mx-auto mb-2 text-gray-300" />
                      <p className="text-sm font-semibold text-gray-600">Tidak ada transaksi penjualan</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {txSearchQuery
                          ? 'Coba gunakan kata kunci pencarian yang lain.'
                          : 'Belum ada transaksi penjualan kasir yang tercatat.'}
                      </p>
                      {!txSearchQuery && (
                        <button
                          type="button"
                          onClick={onNavigateToPos}
                          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors cursor-pointer border border-orange-200"
                        >
                          <Plus size={14} />
                          <span>Buat Transaksi Penjualan Baru</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  items.map(tx => {
                    const isVoid = tx.status === 'void';
                    const firstItem = tx.items[0];
                    const remainingItems = Math.max(0, tx.items.length - 1);
                    return (
                      <tr
                        key={tx.id}
                        className={`transition-colors ${isVoid ? 'bg-red-50/20 opacity-80' : 'hover:bg-orange-50/25'}`}
                      >
                        <td className="py-3.5 px-3.5 sm:px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-gray-900 text-xs sm:text-sm">
                              {tx.invoiceNo}
                            </span>
                            {isVoid && (
                              <span className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-bold uppercase bg-red-100 text-red-700 border border-red-200 rounded">
                                VOID
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <Calendar size={12} /> {tx.dateStr} &bull; {tx.timeStr}
                          </span>
                          {isVoid && tx.voidReason && (
                            <span className="text-xs text-red-600 block mt-0.5 max-w-[200px] truncate" title={tx.voidReason}>
                              Alasan: {tx.voidReason}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 sm:px-4 min-w-[140px]">
                          <span className="font-bold text-gray-900 block truncate text-xs sm:text-sm">
                            {tx.customerName}
                          </span>
                          <span className="text-xs text-gray-500 block mt-0.5 truncate max-w-[190px]">
                            Kasir: {tx.cashier}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 sm:px-4 min-w-[180px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-gray-900 text-xs sm:text-sm truncate max-w-[200px]">
                              {firstItem ? `${firstItem.name} (${firstItem.qty}x)` : '-'}
                            </span>
                            <span className="text-xs bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-200 font-mono">
                              {tx.totalQty} pcs
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 block mt-0.5 truncate max-w-[240px]">
                            {remainingItems > 0
                              ? `+${remainingItems} item lain (${tx.items.map(it => it.sku).join(', ')})`
                              : firstItem
                              ? `SKU: ${firstItem.sku}`
                              : '-'}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 sm:px-4 text-center whitespace-nowrap font-mono font-bold text-gray-900 text-xs sm:text-sm">
                          {tx.totalBerat.toFixed(2)} gr
                        </td>

                        <td className="py-3.5 px-3 sm:px-4 text-right whitespace-nowrap">
                          <span
                            className={`font-mono font-bold text-sm block tabular-nums ${
                              isVoid ? 'line-through text-gray-400' : 'text-gray-900'
                            }`}
                          >
                            {formatIDR(tx.grandTotal)}
                          </span>
                          <span className="inline-block mt-0.5 text-xs font-semibold px-2 py-0.5 rounded capitalize bg-gray-100 text-gray-600">
                            {getPaymentBadgeLabel(tx)}
                          </span>
                        </td>

                        <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center justify-center gap-1.5">
                            <Tooltip content="Lihat Rincian Lengkap" side="top">
                              <button
                                type="button"
                                onClick={() => setSelectedDetailTx(tx)}
                                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-orange-50 text-gray-600 hover:text-orange-600 border border-gray-200 hover:border-orange-200 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
                                aria-label="Lihat Rincian Lengkap"
                              >
                                <Eye size={15} />
                              </button>
                            </Tooltip>

                            <Tooltip content={isVoid ? 'Transaksi sudah di-void' : 'Void / Batalkan Transaksi'} side="top">
                              <button
                                type="button"
                                disabled={isVoid}
                                onClick={() => setVoidingTx(tx)}
                                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-amber-50 text-gray-600 hover:text-amber-700 border border-gray-200 hover:border-amber-200 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-100 disabled:hover:text-gray-600 disabled:active:scale-100"
                                aria-label="Void Transaksi"
                              >
                                <RotateCcw size={15} />
                              </button>
                            </Tooltip>

                            <Tooltip content="Cetak Nota Resmi" side="top">
                              <button
                                type="button"
                                onClick={() => onSelectReceipt(tx)}
                                className="w-8 h-8 rounded-lg bg-orange-50 hover:bg-orange-500 text-orange-600 hover:text-white border border-orange-200 hover:border-orange-500 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
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

      <TransactionDetailModal
        isOpen={!!selectedDetailTx}
        transaction={selectedDetailTx}
        onClose={() => setSelectedDetailTx(null)}
        onPrintReceipt={onSelectReceipt}
      />

      <ConfirmModal
        isOpen={!!voidingTx}
        variant="void"
        title="Void / Batalkan Transaksi"
        description={
          voidingTx
            ? `Transaksi ${voidingTx.invoiceNo} atas nama "${voidingTx.customerName}" senilai ${formatIDR(voidingTx.grandTotal)} akan ditandai sebagai VOID agar tetap tercatat dalam jejak audit kasir.`
            : ''
        }
        inputLabel="Alasan Pembatalan / Void"
        inputPlaceholder="Contoh: Salah input metode bayar / pelanggan batal beli"
        inputRequired
        checkboxLabel="Kembalikan stok produk yang terjual kembali ke inventaris"
        defaultChecked={true}
        confirmLabel="Ya, Void Transaksi"
        loadingLabel="Memproses Void..."
        isLoading={isVoiding}
        onCancel={() => setVoidingTx(null)}
        onConfirm={handleConfirmVoid}
      />
    </div>
  );
};
