import React, { useState, useEffect } from 'react';
import {
  Users,
  MessageCircle,
  ShoppingBag,
  Pencil,
  Trash2,
  Crown,
  Loader2,
  Plus,
} from 'lucide-react';
import { Customer, CustomerStatsSummary, CustomerWithStats } from '../../types';
import { formatIDR } from '../../utils/formatters';
import { PaginationControls } from '../common/PaginationControls';
import { ConfirmModal } from '../common/ConfirmModal';
import { AddCustomerModal } from './AddCustomerModal';
import { posApi } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
import { SearchInput } from '../common/SearchInput';
import { ErrorBanner } from '../common/ErrorBanner';
import { useToast } from '../../contexts/ToastContext';
import Tooltip from '../Tooltip';
import { MoneyAmount } from '../common/MoneyAmount';
import {
  SortableTh,
  SortDirection,
  getNextColumnSort,
} from '../common/TableSortControls';

interface CustomerViewProps {
  refreshTrigger: number;
  onSaveCustomer: (customer: Customer, isEdit?: boolean) => Promise<void>;
  onDeleteCustomer: (id: string) => Promise<void>;
  canDelete?: boolean;
}

export const CustomerView: React.FC<CustomerViewProps> = ({
  refreshTrigger,
  onSaveCustomer,
  onDeleteCustomer,
  canDelete = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 220);
  const [filterType, setFilterType] = useState<string>('semua');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [items, setItems] = useState<CustomerWithStats[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<CustomerStatsSummary>({
    totalPelanggan: 0,
    totalVip: 0,
    totalAkumulasiBelanja: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { showToast } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterType, sortBy, sortDir]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setFetchError(null);

    posApi
      .getCustomers(
        {
          page: currentPage,
          pageSize,
          search: debouncedSearch,
          type: filterType,
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
          const msg = err instanceof Error ? err.message : 'Gagal memuat data pelanggan.';
          setFetchError(msg);
          setIsLoading(false);
          showToast('error', msg);
        }
      });

    return () => controller.abort();
  }, [currentPage, pageSize, debouncedSearch, filterType, sortBy, sortDir, refreshTrigger, retryCount, showToast]);

  const handleHeaderSort = (key: string, defaultDir: SortDirection = 'desc') => {
    const next = getNextColumnSort(key, sortBy, sortDir, defaultDir);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsAddModalOpen(true);
  };

  const handleDelete = (c: Customer) => {
    setDeletingCustomer(c);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCustomer) return;
    setIsDeletingCustomer(true);
    try {
      await onDeleteCustomer(deletingCustomer.id);
      setDeletingCustomer(null);
    } finally {
      setIsDeletingCustomer(false);
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* 1. HEADER SECTION */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
              Data Pelanggan &amp; Member
            </h3>
            {isLoading && <Loader2 size={14} className="animate-spin text-orange-500" />}
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Kelola member toko emas, kontak WhatsApp, ukuran cincin, dan riwayat belanja.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setEditingCustomer(null);
              setIsAddModalOpen(true);
            }}
            className="h-9 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors cursor-pointer shadow-xs shrink-0 inline-flex items-center justify-center gap-1.5 active:scale-[0.98]"
          >
            <Plus size={16} />
            <span>Tambah Pelanggan Baru</span>
          </button>
        </div>
      </div>

      {/* 2. RINGKASAN METRIK */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors min-w-0">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm text-gray-500 font-medium truncate">
              Total Pelanggan Terdaftar
            </span>
            <span className="w-8 h-8 rounded-lg bg-blue-50/80 text-blue-600 border border-blue-100/80 flex items-center justify-center shrink-0">
              <Users size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold text-gray-900 font-mono tabular-nums tracking-tight truncate">
              {stats.totalPelanggan} Orang
            </div>
            <p className="text-xs text-gray-400 mt-1 truncate">Database member toko</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors min-w-0">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm text-gray-500 font-medium truncate">
              Member VIP &amp; Loyal
            </span>
            <span className="w-8 h-8 rounded-lg bg-amber-50/80 text-amber-600 border border-amber-100/80 flex items-center justify-center shrink-0">
              <Crown size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold text-gray-900 font-mono tabular-nums tracking-tight truncate">
              {stats.totalVip} Member
            </div>
            <p className="text-xs text-gray-400 mt-1 truncate">Pelanggan prioritas</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors min-w-0">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm text-gray-500 font-medium truncate">
              Akumulasi Belanja Member
            </span>
            <span className="w-8 h-8 rounded-lg bg-orange-50/80 text-orange-600 border border-orange-100/80 flex items-center justify-center shrink-0">
              <ShoppingBag size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3 min-w-0">
            <MoneyAmount
              value={stats.totalAkumulasiBelanja}
              maxFontPx={24}
              minFontPx={13}
            />
            <p className="text-xs text-gray-400 mt-1 truncate">Total omzet member aktif</p>
          </div>
        </div>
      </div>

      {/* 3. TABLE WORKSPACE CARD */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-4 sm:p-5">
        {/* Toolbar Pencarian & Segmented Tabs */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-4">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Cari nama, kode member, WhatsApp, NIK, atau NPWP..."
          />

          <div className="inline-flex h-9 p-0.5 bg-gray-100 rounded-lg border border-gray-200 items-center self-start md:self-auto shrink-0 overflow-x-auto max-w-full">
            {[
              { id: 'semua', label: 'Semua' },
              { id: 'VIP', label: 'Member VIP' },
              { id: 'Reguler', label: 'Reguler' },
              { id: 'Mitra', label: 'Mitra / Toko' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id)}
                className={`h-full px-3 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center whitespace-nowrap ${
                  filterType === tab.id
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {fetchError && (
          <ErrorBanner
            message={fetchError}
            onRetry={() => setRetryCount(c => c + 1)}
            className="mb-3"
          />
        )}

        {/* Inner Table & Mobile Cards Container */}
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-2xs">
          {isLoading && items.length === 0 ? (
            <div className="p-12 text-center text-gray-500 flex items-center justify-center gap-2 text-xs sm:text-sm">
              <Loader2 size={18} className="animate-spin text-orange-500" />
              <span>Memuat data pelanggan...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 px-4 text-center text-gray-400">
              <Users size={36} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-semibold text-gray-600">Tidak ada pelanggan ditemukan</p>
              <p className="text-xs text-gray-400 mt-0.5 max-w-sm mx-auto">
                {searchQuery
                  ? `Pencarian "${searchQuery}" tidak cocok dengan data pelanggan mana pun.`
                  : 'Belum ada data pelanggan untuk filter yang dipilih.'}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-3 px-3.5 py-1.5 text-xs font-bold text-orange-600 bg-orange-50 rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors cursor-pointer"
                >
                  Reset Pencarian
                </button>
              )}
            </div>
          ) : (
            <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-xs">
                    <SortableTh
                      label="Pelanggan"
                      sortKey="name"
                      currentSortBy={sortBy}
                      currentSortDir={sortDir}
                      onSort={key => handleHeaderSort(key, 'asc')}
                      className="py-3 px-3.5 sm:px-4"
                    />
                    <th className="py-3 px-3 sm:px-4">Kontak &amp; Domisili</th>
                    <SortableTh
                      label="Preferensi Emas"
                      sortKey="preferredKadar"
                      currentSortBy={sortBy}
                      currentSortDir={sortDir}
                      onSort={key => handleHeaderSort(key, 'asc')}
                      className="py-3 px-3 sm:px-4"
                    />
                    <th className="py-3 px-3 sm:px-4 text-center">Ukuran</th>
                    <SortableTh
                      label="Total Belanja"
                      sortKey="computedSpent"
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
                  {items.map(c => {
                    const cleanPhone = c.phone.replace(/[^0-9]/g, '');
                    const waPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;

                    return (
                      <tr key={c.id} className="hover:bg-orange-50/25 transition-colors">
                        <td className="py-3.5 px-3.5 sm:px-4 align-top min-w-[190px]">
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 text-xs sm:text-sm leading-tight">
                              {c.name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="font-mono text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-semibold">
                                {c.memberCode}
                              </span>
                              <span
                                className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                  c.type === 'VIP'
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                    : c.type === 'Mitra / Toko'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {c.type}
                              </span>
                            </div>
                            {(c.nik || c.npwp) && (
                              <p className="text-xs text-gray-400 font-mono mt-1 truncate max-w-[230px]">
                                {c.nik ? `NIK: ${c.nik}` : ''}
                                {c.nik && c.npwp ? ' • ' : ''}
                                {c.npwp ? `NPWP: ${c.npwp}` : ''}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-3 sm:px-4 align-top min-w-[180px] max-w-[250px]">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-gray-800 text-xs">
                                {c.phone}
                              </span>
                              <a
                                href={`https://wa.me/${waPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded text-xs font-semibold transition-colors cursor-pointer"
                                title="Chat WhatsApp Pelanggan"
                              >
                                <MessageCircle size={12} />
                                <span>WA</span>
                              </a>
                            </div>
                            {c.address && (
                              <p className="text-xs text-gray-500 truncate" title={c.address}>
                                {c.address}
                              </p>
                            )}
                            {c.notes && (
                              <p className="text-xs text-gray-400 italic truncate" title={c.notes}>
                                "{c.notes}"
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-3 sm:px-4 align-top whitespace-nowrap">
                          <div className="space-y-1">
                            <span className="inline-block text-xs bg-amber-50 text-amber-800 font-mono font-bold px-2 py-0.5 rounded border border-amber-200">
                              {c.preferredKadar || 'Semua Kadar'}
                            </span>
                            {c.goldColor && (
                              <p className="text-xs text-gray-500">
                                {c.goldColor}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-3 sm:px-4 align-top text-center whitespace-nowrap">
                          {c.ringSize && c.ringSize !== '-' ? (
                            <span className="font-mono text-xs font-semibold text-gray-800 block">
                              Jari: {c.ringSize}
                            </span>
                          ) : null}
                          {c.braceletSize ? (
                            <span className="font-mono text-xs text-gray-500 block mt-0.5">
                              {c.braceletSize}
                            </span>
                          ) : null}
                          {(!c.ringSize || c.ringSize === '-') && !c.braceletSize && (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 sm:px-4 align-top text-right whitespace-nowrap">
                          <div>
                            <p className="font-mono font-bold text-gray-900 text-xs sm:text-sm tabular-nums">
                              {formatIDR(c.computedSpent)}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {c.computedTx} transaksi
                              {c.buybackCount > 0 ? ` • ${c.buybackCount} buyback` : ''}
                            </p>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 align-top text-center whitespace-nowrap">
                          <div className="inline-flex items-center justify-center gap-1.5">
                            <Tooltip content="Edit Pelanggan" side="top">
                              <button
                                type="button"
                                onClick={() => handleEdit(c)}
                                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-blue-600 border border-gray-200 hover:border-blue-200 inline-flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
                                aria-label="Edit Pelanggan"
                              >
                                <Pencil size={15} />
                              </button>
                            </Tooltip>

                            {canDelete && (
                              <Tooltip
                                content={
                                  c.computedTx > 0 || c.buybackCount > 0
                                    ? 'Ada riwayat transaksi'
                                    : 'Hapus Pelanggan'
                                }
                                side="top"
                              >
                                <button
                                  type="button"
                                  disabled={c.computedTx > 0 || c.buybackCount > 0}
                                  onClick={() => handleDelete(c)}
                                  className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 border border-gray-200 hover:border-red-200 inline-flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-100 disabled:hover:text-gray-600 disabled:active:scale-100"
                                  aria-label="Hapus Pelanggan"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Card View */}
            <div className="lg:hidden divide-y divide-gray-100">
              {items.map(c => {
                const cleanPhone = c.phone.replace(/[^0-9]/g, '');
                const waPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;

                return (
                  <div key={c.id} className="p-3.5 sm:p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-gray-900 text-xs sm:text-sm leading-tight truncate">
                            {c.name}
                          </p>
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded shrink-0 ${
                              c.type === 'VIP'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : c.type === 'Mitra / Toko'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {c.type}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">
                          {c.memberCode}
                          {c.nik ? ` • NIK: ${c.nik}` : ''}
                          {c.npwp ? ` • NPWP: ${c.npwp}` : ''}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-gray-900 text-xs sm:text-sm tabular-nums block">
                          {formatIDR(c.computedSpent)}
                        </span>
                        <span className="text-xs text-gray-400 block">{c.computedTx} transaksi</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-gray-700 text-xs">{c.phone}</span>
                        <a
                          href={`https://wa.me/${waPhone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-xs font-semibold"
                        >
                          <MessageCircle size={12} />
                          <span>WA</span>
                        </a>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs bg-amber-50 text-amber-800 font-mono font-bold px-2 py-0.5 rounded border border-amber-200">
                          {c.preferredKadar || 'Semua Kadar'}
                        </span>
                        {c.goldColor && (
                          <span className="text-xs bg-gray-100 text-gray-700 font-medium px-2 py-0.5 rounded">
                            {c.goldColor}
                          </span>
                        )}
                        {c.ringSize && c.ringSize !== '-' && (
                          <span className="text-xs bg-gray-100 text-gray-700 font-mono font-medium px-2 py-0.5 rounded">
                            Jari: {c.ringSize}
                          </span>
                        )}
                        {c.braceletSize && (
                          <span className="text-xs bg-gray-100 text-gray-700 font-mono font-medium px-2 py-0.5 rounded">
                            {c.braceletSize}
                          </span>
                        )}
                      </div>
                    </div>

                    {c.address && (
                      <p className="text-xs text-gray-500 truncate">
                        {c.address}
                      </p>
                    )}

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-1.5">
                      <Tooltip content="Edit Pelanggan" side="top">
                          <button
                            type="button"
                            onClick={() => handleEdit(c)}
                            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-blue-600 border border-gray-200 hover:border-blue-200 inline-flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
                            aria-label="Edit Pelanggan"
                          >
                            <Pencil size={15} />
                          </button>
                        </Tooltip>
                        {canDelete && (
                          <Tooltip
                            content={
                              c.computedTx > 0 || c.buybackCount > 0
                                ? 'Ada riwayat transaksi'
                                : 'Hapus Pelanggan'
                            }
                            side="top"
                          >
                            <button
                              type="button"
                              disabled={c.computedTx > 0 || c.buybackCount > 0}
                              onClick={() => handleDelete(c)}
                              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 border border-gray-200 hover:border-red-200 inline-flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-100 disabled:hover:text-gray-600 disabled:active:scale-100"
                              aria-label="Hapus Pelanggan"
                            >
                              <Trash2 size={15} />
                            </button>
                          </Tooltip>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>

            </>
          )}

          {items.length > 0 && (
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
          )}
        </div>
      </div>

      <AddCustomerModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingCustomer(null);
        }}
        onSaveCustomer={saved => onSaveCustomer(saved, Boolean(editingCustomer))}
        initialCustomer={editingCustomer}
      />

      <ConfirmModal
        isOpen={!!deletingCustomer}
        title="Hapus Data Pelanggan"
        description={
          deletingCustomer
            ? `Apakah Anda yakin ingin menghapus pelanggan "${deletingCustomer.name}" dari database?`
            : ''
        }
        confirmLabel="Ya, Hapus Pelanggan"
        isLoading={isDeletingCustomer}
        onCancel={() => setDeletingCustomer(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
