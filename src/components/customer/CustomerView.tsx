import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  ShoppingCart,
  MessageCircle,
  Sparkles,
  ShoppingBag,
  Scale,
  Edit2,
  Trash2,
  MapPin,
  CreditCard,
  Crown,
  Building2,
  UserCheck,
  Loader2,
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
import {
  ShopeeSortBar,
  ShopeeSortPreset,
  SortableTh,
  SortDirection,
  getNextColumnSort,
} from '../common/TableSortControls';

const CUSTOMER_SORT_PRESETS: ShopeeSortPreset[] = [
  { id: 'newest', label: 'Terbaru', sortBy: 'newest', sortDir: 'desc' },
  { id: 'spent-desc', label: 'Belanja Tertinggi', sortBy: 'computedSpent', sortDir: 'desc' },
  { id: 'tx-desc', label: 'Transaksi Terbanyak', sortBy: 'computedTx', sortDir: 'desc' },
  { id: 'name-asc', label: 'Nama A–Z', sortBy: 'name', sortDir: 'asc' },
];

interface CustomerViewProps {
  refreshTrigger: number;
  onSaveCustomer: (customer: Customer, isEdit?: boolean) => Promise<void>;
  onDeleteCustomer: (id: string) => Promise<void>;
  onSelectCustomerForPOS: (customer: { id: string; name: string }) => void;
  onSelectCustomerForBuyback: (customer: {
    id: string;
    name: string;
    phone: string;
    nik?: string;
    address?: string;
  }) => void;
}

export const CustomerView: React.FC<CustomerViewProps> = ({
  refreshTrigger,
  onSaveCustomer,
  onDeleteCustomer,
  onSelectCustomerForPOS,
  onSelectCustomerForBuyback,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 220);
  const [filterType, setFilterType] = useState<string>('semua');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
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

  const handleSortPreset = (nextBy: string, nextDir: SortDirection) => {
    setSortBy(nextBy);
    setSortDir(nextDir);
  };

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
    <div className="space-y-4 w-full pb-10">
      {/* 1. HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-lg border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-orange-50 text-orange-600 rounded-lg border border-orange-100">
              <Users size={20} />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                Data Pelanggan
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Kelola member toko emas, kontak WhatsApp, ukuran cincin, dan riwayat belanja
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingCustomer(null);
            setIsAddModalOpen(true);
          }}
          className="h-9 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors cursor-pointer shadow-xs shrink-0 inline-flex items-center justify-center gap-1.5 active:scale-[0.98]"
        >
          <UserPlus size={16} />
          <span>Tambah Pelanggan Baru</span>
        </button>
      </div>

      {/* 2. RINGKASAN METRIK */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm text-gray-500 font-medium truncate">Total Pelanggan Terdaftar</span>
            <span className="w-8 h-8 rounded-lg bg-gray-50 text-gray-600 border border-gray-200/80 flex items-center justify-center shrink-0">
              <Users size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold text-gray-900 font-mono tabular-nums tracking-tight">
              {stats.totalPelanggan} Orang
            </div>
            <p className="text-xs text-gray-400 mt-1">Database member toko</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm text-gray-500 font-medium truncate">Member VIP &amp; Loyal</span>
            <span className="w-8 h-8 rounded-lg bg-amber-50/80 text-amber-600 border border-amber-100/80 flex items-center justify-center shrink-0">
              <Crown size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold text-amber-600 font-mono tabular-nums tracking-tight">
              {stats.totalVip} Member
            </div>
            <p className="text-xs text-gray-400 mt-1">Pelanggan prioritas</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm text-gray-500 font-medium truncate">Akumulasi Belanja Member</span>
            <span className="w-8 h-8 rounded-lg bg-orange-50/80 text-orange-600 border border-orange-100/80 flex items-center justify-center shrink-0">
              <ShoppingBag size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold text-orange-600 font-mono tabular-nums tracking-tight truncate">
              {formatIDR(stats.totalAkumulasiBelanja)}
            </div>
            <p className="text-xs text-gray-400 mt-1">Total omzet member aktif</p>
          </div>
        </div>
      </div>

      {/* 3. FILTER & SEARCH BAR */}
      <div className="bg-white p-3.5 sm:p-4 rounded-lg border border-gray-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Cari nama, WhatsApp, NIK KTP, atau kode member..."
        />

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 shrink-0">
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
              className={`h-9 px-3.5 text-xs sm:text-sm font-semibold rounded-lg inline-flex items-center justify-center transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                filterType === tab.id
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3.5 SORT BAR */}
      <ShopeeSortBar
        presets={CUSTOMER_SORT_PRESETS}
        sortBy={sortBy}
        sortDir={sortDir}
        onSelectPreset={handleSortPreset}
      />

      {fetchError && (
        <ErrorBanner message={fetchError} onRetry={() => setRetryCount(c => c + 1)} />
      )}

      {/* 4. DAFTAR PELANGGAN */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {isLoading && items.length === 0 ? (
          <div className="p-12 text-center text-gray-500 flex items-center justify-center gap-2 text-xs sm:text-sm">
            <Loader2 size={18} className="animate-spin text-orange-500" />
            <span>Memuat data pelanggan...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users size={22} />
            </div>
            <p className="text-sm font-bold text-gray-700">Tidak ada pelanggan ditemukan</p>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `Pencarian "${searchQuery}" tidak cocok dengan data pelanggan mana pun.`
                : 'Belum ada data pelanggan untuk filter yang dipilih.'}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-3 px-3.5 py-1.5 text-xs font-bold text-orange-600 bg-orange-50 rounded-md hover:bg-orange-100 transition-colors cursor-pointer"
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
                      label="Member & Identitas"
                      sortKey="name"
                      currentSortBy={sortBy}
                      currentSortDir={sortDir}
                      onSort={key => handleHeaderSort(key, 'asc')}
                      className="py-3 px-4"
                    />
                    <th className="py-3 px-4">Kontak &amp; Alamat</th>
                    <SortableTh
                      label="Kadar & Ukuran Jari"
                      sortKey="preferredKadar"
                      currentSortBy={sortBy}
                      currentSortDir={sortDir}
                      onSort={key => handleHeaderSort(key, 'asc')}
                      className="py-3 px-4"
                    />
                    <SortableTh
                      label="Akumulasi Belanja"
                      sortKey="computedSpent"
                      currentSortBy={sortBy}
                      currentSortDir={sortDir}
                      onSort={key => handleHeaderSort(key, 'desc')}
                      align="right"
                      className="py-3 px-4"
                    />
                    <th className="py-3 px-4 text-center">Aksi Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map(c => {
                    const cleanPhone = c.phone.replace(/[^0-9]/g, '');
                    const waPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;

                    return (
                      <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3.5 px-4 align-top">
                          <div className="flex items-start gap-2.5">
                            <span
                              className={`p-1.5 rounded-md mt-0.5 shrink-0 ${
                                c.type === 'VIP'
                                  ? 'bg-amber-100 text-amber-700'
                                  : c.type === 'Mitra / Toko'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {c.type === 'VIP' ? (
                                <Crown size={14} />
                              ) : c.type === 'Mitra / Toko' ? (
                                <Building2 size={14} />
                              ) : (
                                <UserCheck size={14} />
                              )}
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 text-xs sm:text-sm leading-tight">{c.name}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-semibold">
                                  {c.memberCode}
                                </span>
                                <span
                                  className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                    c.type === 'VIP'
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : c.type === 'Mitra / Toko'
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                      : 'bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  {c.type}
                                </span>
                              </div>
                              {c.nik && (
                                <p className="text-xs text-gray-400 font-mono mt-1 flex items-center gap-1">
                                  <CreditCard size={12} className="shrink-0" />
                                  <span>NIK: {c.nik}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-medium text-gray-800 text-xs">{c.phone}</span>
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
                              <p className="text-xs text-gray-500 flex items-start gap-1 max-w-xs">
                                <MapPin size={12} className="shrink-0 mt-0.5 text-gray-400" />
                                <span className="truncate">{c.address}</span>
                              </p>
                            )}
                            {c.notes && (
                              <p className="text-xs text-gray-400 italic max-w-xs truncate">"{c.notes}"</p>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-1">
                            <div className="inline-flex items-center gap-1 text-xs text-orange-600 font-semibold bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                              <Sparkles size={12} />
                              <span>{c.preferredKadar || 'Semua Kadar'}</span>
                            </div>
                            {c.ringSize && (
                              <p className="text-xs text-gray-600 font-medium">
                                Ukuran Jari: <span className="font-bold">{c.ringSize}</span>
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 align-top text-right">
                          <div>
                            <p className="font-bold text-gray-900 text-xs sm:text-sm">
                              {formatIDR(c.computedSpent)}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {c.computedTx} kali belanja
                              {c.buybackCount > 0 ? ` (${c.buybackCount}x buyback)` : ''}
                            </p>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 align-top text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onSelectCustomerForPOS({ id: c.id, name: c.name })}
                              className="h-7 px-2.5 inline-flex items-center justify-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-md transition-colors cursor-pointer"
                              title="Buka Kasir POS untuk pelanggan ini"
                            >
                              <ShoppingCart size={12} />
                              <span>POS</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                onSelectCustomerForBuyback({
                                  id: c.id,
                                  name: c.name,
                                  phone: c.phone,
                                  nik: c.nik,
                                  address: c.address,
                                })
                              }
                              className="h-7 px-2.5 inline-flex items-center justify-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors cursor-pointer"
                              title="Input Buyback untuk pelanggan ini"
                            >
                              <Scale size={12} />
                              <span>Buyback</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleEdit(c)}
                              className="h-7 px-2 inline-flex items-center justify-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                              title="Edit Data"
                            >
                              <Edit2 size={12} />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              disabled={c.computedTx > 0 || c.buybackCount > 0}
                              onClick={() => handleDelete(c)}
                              className="h-7 px-2 inline-flex items-center justify-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-red-400"
                              title={
                                c.computedTx > 0 || c.buybackCount > 0
                                  ? `Tidak dapat dihapus: pelanggan memiliki ${c.computedTx} transaksi penjualan & ${c.buybackCount} buyback`
                                  : 'Hapus Pelanggan'
                              }
                            >
                              <Trash2 size={12} />
                              <span>Hapus</span>
                            </button>
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
                          <p className="font-semibold text-gray-900 text-xs sm:text-sm leading-tight truncate">
                            {c.name}
                          </p>
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded shrink-0 ${
                              c.type === 'VIP'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : c.type === 'Mitra / Toko'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {c.type}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">
                          {c.memberCode} {c.nik ? `• NIK: ${c.nik}` : ''}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-bold text-gray-900 text-xs sm:text-sm block">
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

                      <div className="flex items-center gap-1.5">
                        <span className="text-xs bg-orange-50 text-orange-600 font-semibold px-2 py-0.5 rounded border border-orange-100">
                          {c.preferredKadar || 'Emas'}
                        </span>
                        {c.ringSize && (
                          <span className="text-xs bg-gray-100 text-gray-700 font-medium px-2 py-0.5 rounded">
                            Size: {c.ringSize}
                          </span>
                        )}
                      </div>
                    </div>

                    {c.address && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                        <MapPin size={12} className="shrink-0 text-gray-400" />
                        <span className="truncate">{c.address}</span>
                      </p>
                    )}

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectCustomerForPOS({ id: c.id, name: c.name })}
                          className="px-2.5 py-1 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <ShoppingCart size={12} />
                          <span>Kasir POS</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onSelectCustomerForBuyback({
                              id: c.id,
                              name: c.name,
                              phone: c.phone,
                              nik: c.nik,
                              address: c.address,
                            })
                          }
                          className="px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <Scale size={12} />
                          <span>Buyback</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEdit(c)}
                          className="px-2 py-1 text-xs font-semibold text-gray-600 hover:text-gray-900 rounded cursor-pointer inline-flex items-center gap-1"
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          disabled={c.computedTx > 0 || c.buybackCount > 0}
                          onClick={() => handleDelete(c)}
                          className="px-2 py-1 text-xs font-semibold text-red-500 hover:text-red-700 rounded cursor-pointer inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-red-400"
                          title={
                            c.computedTx > 0 || c.buybackCount > 0
                              ? `Tidak dapat dihapus: pelanggan memiliki ${c.computedTx} transaksi penjualan & ${c.buybackCount} buyback`
                              : 'Hapus Pelanggan'
                          }
                        >
                          <Trash2 size={12} />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
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
          </>
        )}
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
