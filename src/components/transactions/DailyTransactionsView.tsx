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
import { Transaction, TransactionStatsSummary } from '../../types';
import { formatIDR } from '../../utils/formatters';
import { PaginationControls } from '../common/PaginationControls';
import { ConfirmModal } from '../common/ConfirmModal';
import { TransactionDetailModal } from './TransactionDetailModal';
import { ActionDropdownMenu } from '../common/ActionDropdownMenu';
import { posApi } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
import { SearchInput } from '../common/SearchInput';
import { ErrorBanner } from '../common/ErrorBanner';
import { useToast } from '../../contexts/ToastContext';
import { MoneyAmount } from '../common/MoneyAmount';
import {
  SortableTh,
  SortDirection,
  getNextColumnSort,
} from '../common/TableSortControls';

interface DailyTransactionsViewProps {
  refreshTrigger: number;
  onSelectReceipt: (tx: Transaction) => void;
  onVoidTransaction: (id: string, reason: string, restoreStock: boolean) => Promise<void>;
  onNavigateToPos: () => void;
  canVoid?: boolean;
}

export const DailyTransactionsView: React.FC<DailyTransactionsViewProps> = ({
  refreshTrigger,
  onSelectReceipt,
  onVoidTransaction,
  onNavigateToPos,
  canVoid = true,
}) => {
  const [txFilterMethod, setTxFilterMethod] = useState<string>('semua');
  const [txSearchQuery, setTxSearchQuery] = useState<string>('');
  const debouncedSearch = useDebounce(txSearchQuery, 220);
  const [sortBy, setSortBy] = useState<string>('newest');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [selectedDetailTx, setSelectedDetailTx] = useState<Transaction | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);

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

  const handleHeaderSort = (key: string, defaultDir: SortDirection = 'desc') => {
    const next = getNextColumnSort(key, sortBy, sortDir, defaultDir);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
  };

  const handleOpenDetail = async (tx: Transaction) => {
    setLoadingActionId(tx.id);
    try {
      const full = await posApi.getTransactionById(tx.id);
      setSelectedDetailTx(full);
    } catch {
      setSelectedDetailTx(tx);
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleOpenPrint = async (tx: Transaction) => {
    setLoadingActionId(tx.id);
    try {
      const full = await posApi.getTransactionById(tx.id);
      onSelectReceipt(full);
    } catch {
      showToast('warning', 'Detail terbaru gagal dimuat dari server, mencetak data nota dari daftar.');
      onSelectReceipt(tx);
    } finally {
      setLoadingActionId(null);
    }
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

  const getPaymentBadgeInfo = (tx: Transaction): { label: string; badgeClass: string } => {
    if (tx.status === 'void') {
      return {
        label: 'Dibatalkan',
        badgeClass: 'bg-red-50 text-red-700 border border-red-200/80',
      };
    }
    switch (tx.paymentMethod) {
      case 'cash':
        return {
          label: 'Tunai',
          badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
        };
      case 'debit':
        return {
          label: tx.paymentDetails.debitBank ? `Debit (${tx.paymentDetails.debitBank})` : 'Debit EDC',
          badgeClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200/80',
        };
      case 'transfer':
        return {
          label: tx.paymentDetails.transferBank
            ? `Transfer (${tx.paymentDetails.transferBank})`
            : 'Transfer Bank',
          badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200/80',
        };
      case 'qris':
        return {
          label: 'QRIS GPN',
          badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200/80',
        };
      default:
        return {
          label: tx.paymentMethod,
          badgeClass: 'bg-gray-100 text-gray-700 border border-gray-200',
        };
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
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors min-w-0">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-medium text-gray-500 truncate">
              Total Omzet Penjualan
            </span>
            <span className="w-8 h-8 rounded-lg bg-orange-50/80 text-orange-600 border border-orange-100/80 flex items-center justify-center shrink-0">
              <Coins size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3 min-w-0">
            <MoneyAmount value={stats?.totalOmzetPenjualan ?? 0} maxFontPx={24} minFontPx={13} />
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
            <MoneyAmount value={stats?.avgPerTransaksi ?? 0} maxFontPx={24} minFontPx={13} />
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
              <span>Memuat transaksi penjualan...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 px-4 text-center text-gray-400">
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
            </div>
          ) : (
            <>
              {/* MOBILE CARDS (md:hidden) */}
              <div className="md:hidden divide-y divide-gray-100">
                {items.map(tx => {
                  const isVoid = tx.status === 'void';
                  const firstItem = tx.items[0];
                  const remainingItems = Math.max(0, tx.items.length - 1);
                  const badge = getPaymentBadgeInfo(tx);
                  return (
                    <div
                      key={tx.id}
                      className={`p-4 space-y-2.5 transition-colors ${
                        isVoid ? 'bg-red-50/20 opacity-80' : 'hover:bg-orange-50/25'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-gray-900 text-xs">
                              {tx.invoiceNo}
                            </span>
                            {isVoid && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-red-100 text-red-700 border border-red-200 rounded">
                                VOID
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 block mt-0.5 tabular-nums">
                            {tx.dateStr} &bull; {tx.timeStr}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 text-[11px] font-semibold rounded shrink-0 ${badge.badgeClass}`}>
                          {badge.label}
                        </span>
                      </div>

                      <div className="text-xs space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-gray-900 truncate">{tx.customerName}</span>
                          <span className="text-gray-500 shrink-0">Kasir: {tx.cashier}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-gray-600">
                          <span className="truncate">
                            {firstItem ? firstItem.name : '-'}
                            {remainingItems > 0 ? ` (+${remainingItems} lain)` : ''}
                          </span>
                          <span className="font-mono font-bold text-gray-800 shrink-0">
                            {tx.totalQty} pcs &bull; {tx.totalBerat.toFixed(2)} gr
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                        <span
                          className={`font-mono font-bold text-sm tabular-nums ${
                            isVoid ? 'line-through text-gray-400' : 'text-gray-900'
                          }`}
                        >
                          {formatIDR(tx.grandTotal)}
                        </span>
                        <ActionDropdownMenu
                          ariaLabel={`Aksi untuk ${tx.invoiceNo}`}
                          items={[
                            {
                              id: 'detail',
                              label: loadingActionId === tx.id ? 'Memuat Detail...' : 'Lihat Detail',
                              icon: <Eye size={14} />,
                              onClick: () => void handleOpenDetail(tx),
                            },
                            {
                              id: 'print',
                              label: loadingActionId === tx.id ? 'Menyiapkan Nota...' : 'Cetak Nota',
                              icon: <Printer size={14} />,
                              tone: 'primary',
                              onClick: () => void handleOpenPrint(tx),
                            },
                            ...(canVoid
                              ? [
                                  {
                                    id: 'void',
                                    label: 'Void Transaksi',
                                    icon: <RotateCcw size={14} />,
                                    tone: 'warning' as const,
                                    dividerBefore: true,
                                    disabled: isVoid,
                                    disabledReason: isVoid ? 'Transaksi sudah di-void' : undefined,
                                    onClick: () => setVoidingTx(tx),
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
                        label="Pelanggan"
                        sortKey="customerName"
                        currentSortBy={sortBy}
                        currentSortDir={sortDir}
                        onSort={key => handleHeaderSort(key, 'asc')}
                        className="py-3 px-4 min-w-[165px]"
                      />
                      <SortableTh
                        label="Item Perhiasan"
                        sortKey="paymentMethod"
                        currentSortBy={sortBy}
                        currentSortDir={sortDir}
                        onSort={key => handleHeaderSort(key, 'asc')}
                        className="py-3 px-4 min-w-[220px]"
                      />
                      <SortableTh
                        label="Berat"
                        sortKey="totalBerat"
                        currentSortBy={sortBy}
                        currentSortDir={sortDir}
                        onSort={key => handleHeaderSort(key, 'desc')}
                        align="right"
                        className="py-3 px-4 w-[110px]"
                      />
                      <SortableTh
                        label="Total Bayar"
                        sortKey="grandTotal"
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
                    {items.map(tx => {
                      const isVoid = tx.status === 'void';
                      const firstItem = tx.items[0];
                      const remainingItems = Math.max(0, tx.items.length - 1);
                      const badge = getPaymentBadgeInfo(tx);
                      return (
                        <tr
                          key={tx.id}
                          className={`transition-colors ${
                            isVoid ? 'bg-red-50/20 opacity-80' : 'hover:bg-orange-50/30'
                          }`}
                        >
                          <td className="py-3.5 px-4 whitespace-nowrap align-middle">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-gray-900 text-xs sm:text-sm">
                                {tx.invoiceNo}
                              </span>
                              {isVoid && (
                                <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold uppercase bg-red-100 text-red-700 border border-red-200 rounded">
                                  VOID
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 block mt-0.5 tabular-nums">
                              {tx.dateStr} &bull; {tx.timeStr}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 align-middle max-w-[210px]">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-bold text-gray-900 truncate text-xs sm:text-sm">
                                {tx.customerName}
                              </span>
                              {tx.customerMemberCode && (
                                <span className="font-mono text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-semibold shrink-0">
                                  {tx.customerMemberCode}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 block mt-0.5 truncate">
                              Kasir: {tx.cashier}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 align-middle max-w-[280px]">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className="font-semibold text-gray-900 text-xs sm:text-sm truncate"
                                title={firstItem?.name}
                              >
                                {firstItem ? firstItem.name : '-'}
                              </span>
                              <span className="text-[11px] bg-amber-50 text-amber-800 font-bold px-1.5 py-0.5 rounded border border-amber-200 font-mono shrink-0">
                                {tx.totalQty} pcs
                              </span>
                            </div>
                            <span
                              className={`text-xs block mt-0.5 truncate ${
                                isVoid && tx.voidReason ? 'text-red-600' : 'text-gray-500 font-mono'
                              }`}
                              title={isVoid && tx.voidReason ? tx.voidReason : undefined}
                            >
                              {isVoid && tx.voidReason
                                ? `Alasan: ${tx.voidReason}`
                                : remainingItems > 0 && firstItem
                                ? `SKU: ${firstItem.sku} (+${remainingItems} item lain)`
                                : firstItem
                                ? `SKU: ${firstItem.sku}`
                                : '-'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap align-middle font-mono font-bold text-gray-900 text-xs sm:text-sm tabular-nums">
                            {tx.totalBerat.toFixed(2)} gr
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap align-middle">
                            <span
                              className={`font-mono font-bold text-sm block tabular-nums ${
                                isVoid ? 'line-through text-gray-400' : 'text-gray-900'
                              }`}
                            >
                              {formatIDR(tx.grandTotal)}
                            </span>
                            <span
                              className={`inline-block mt-0.5 text-[11px] font-semibold px-2 py-0.5 rounded ${badge.badgeClass}`}
                            >
                              {badge.label}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 text-center whitespace-nowrap align-middle">
                            <ActionDropdownMenu
                              ariaLabel={`Aksi untuk ${tx.invoiceNo}`}
                              items={[
                                {
                                  id: 'detail',
                                  label: loadingActionId === tx.id ? 'Memuat Detail...' : 'Lihat Detail',
                                  icon: <Eye size={14} />,
                                  onClick: () => void handleOpenDetail(tx),
                                },
                                {
                                  id: 'print',
                                  label: loadingActionId === tx.id ? 'Menyiapkan Nota...' : 'Cetak Nota',
                                  icon: <Printer size={14} />,
                                  tone: 'primary',
                                  onClick: () => void handleOpenPrint(tx),
                                },
                                ...(canVoid
                                  ? [
                                      {
                                        id: 'void',
                                        label: 'Void Transaksi',
                                        icon: <RotateCcw size={14} />,
                                        tone: 'warning' as const,
                                        dividerBefore: true,
                                        disabled: isVoid,
                                        disabledReason: isVoid ? 'Transaksi sudah di-void' : undefined,
                                        onClick: () => setVoidingTx(tx),
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
