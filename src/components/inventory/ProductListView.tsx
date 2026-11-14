import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Barcode,
  Gem,
  Package,
  Scale,
  Coins,
} from 'lucide-react';
import { Product } from '../../types';
import { formatIDR } from '../../utils/formatters';
import { PaginationControls } from '../common/PaginationControls';
import { ConfirmModal } from '../common/ConfirmModal';
import { BarcodeLabelModal } from './BarcodeLabelModal';
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

interface ProductListViewProps {
  refreshTrigger: number;
  onOpenAddModal: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (id: number) => Promise<void>;
  canManageInventory?: boolean;
}

export const ProductListView: React.FC<ProductListViewProps> = ({
  refreshTrigger,
  onOpenAddModal,
  onEditProduct,
  onDeleteProduct,
  canManageInventory = true,
}) => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 220);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [items, setItems] = useState<Product[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalAllProducts, setTotalAllProducts] = useState(0);
  const [totalStockQty, setTotalStockQty] = useState(0);
  const [totalWeightGrams, setTotalWeightGrams] = useState(0);
  const [totalInventoryValue, setTotalInventoryValue] = useState(0);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { showToast } = useToast();

  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [printingBarcodeProduct, setPrintingBarcodeProduct] = useState<Product | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedCategory, sortBy, sortDir]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setFetchError(null);

    posApi
      .getProducts(
        {
          page: currentPage,
          pageSize,
          search: debouncedSearch,
          category: selectedCategory !== 'Semua' ? selectedCategory : undefined,
          sortBy,
          sortDir,
        },
        controller.signal
      )
      .then(res => {
        setItems(res.items);
        setTotalItems(res.total);
        setTotalAllProducts(res.totalAllProducts);
        setTotalStockQty(res.totalStockQty ?? 0);
        setTotalWeightGrams(res.totalWeightGrams ?? 0);
        setTotalInventoryValue(res.totalInventoryValue ?? 0);
        setCategoryCounts(res.categoryCounts ?? {});
        setTotalPages(res.totalPages);
        if (res.page !== currentPage) setCurrentPage(res.page);
        setIsLoading(false);
      })
      .catch(err => {
        if ((err as Error).name !== 'AbortError') {
          const msg = err instanceof Error ? err.message : 'Gagal memuat daftar barang.';
          setFetchError(msg);
          setIsLoading(false);
          showToast('error', msg);
        }
      });

    return () => controller.abort();
  }, [currentPage, pageSize, debouncedSearch, selectedCategory, sortBy, sortDir, refreshTrigger, retryCount, showToast]);

  const handleHeaderSort = (key: string, defaultDir: SortDirection = 'desc') => {
    const next = getNextColumnSort(key, sortBy, sortDir, defaultDir);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
  };

  const availableCategories = useMemo(() => {
    const cats = Object.keys(categoryCounts).filter(k => k !== 'Semua');
    return ['Semua', ...cats];
  }, [categoryCounts]);

  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;
    setIsDeleting(true);
    try {
      await onDeleteProduct(deletingProduct.id);
      setDeletingProduct(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
              Inventaris &amp; Daftar Barang
            </h3>
            {isLoading && <Loader2 size={14} className="animate-spin text-orange-500" />}
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Pantau stok fisik, gramasi emas, harga jual, dan cetak label barcode standar Code 128 &amp; QR.
          </p>
        </div>

        {canManageInventory && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={onOpenAddModal}
              className="h-9 px-4 text-xs sm:text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs active:scale-[0.98]"
            >
              <Plus size={16} />
              <span>Tambah Barang</span>
            </button>
          </div>
        )}
      </div>

      {/* 4 Modern KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-medium text-gray-500 truncate">
              Total Koleksi
            </span>
            <span className="w-8 h-8 rounded-lg bg-orange-50/80 text-orange-600 border border-orange-100/80 flex items-center justify-center shrink-0">
              <Gem size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-gray-900 tracking-tight truncate tabular-nums">
              {totalAllProducts} SKU
            </div>
            <p className="text-xs text-gray-400 mt-1 truncate">Jenis perhiasan aktif</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-medium text-gray-500 truncate">
              Total Stok Fisik
            </span>
            <span className="w-8 h-8 rounded-lg bg-blue-50/80 text-blue-600 border border-blue-100/80 flex items-center justify-center shrink-0">
              <Package size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-gray-900 tracking-tight truncate tabular-nums">
              {totalStockQty} Pcs
            </div>
            <p className="text-xs text-gray-400 mt-1 truncate">Stok tersedia di etalase</p>
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
              {totalWeightGrams.toFixed(2)} gr
            </div>
            <p className="text-xs text-gray-400 mt-1 truncate">Akumulasi gramasi stok</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors min-w-0">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-medium text-gray-500 truncate">
              Nilai Aset Etalase
            </span>
            <span className="w-8 h-8 rounded-lg bg-emerald-50/80 text-emerald-600 border border-emerald-100/80 flex items-center justify-center shrink-0">
              <Coins size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3 min-w-0">
            <MoneyAmount value={totalInventoryValue} maxFontPx={24} minFontPx={13} />
            <p className="text-xs text-gray-400 mt-1 truncate">Estimasi total harga jual</p>
          </div>
        </div>
      </div>

      {/* Search, Filter & Table Workspace */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mb-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Cari kode barcode, nama perhiasan, atau kategori..."
          />

          <div className="inline-flex h-9 p-0.5 bg-gray-100 rounded-lg border border-gray-200 items-center overflow-x-auto max-w-full shrink-0">
            {availableCategories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`h-full px-3 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {cat}
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
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-2xs">
          {/* MOBILE LIST CARDS (md:hidden) */}
          <div className="md:hidden divide-y divide-gray-100">
            {isLoading && items.length === 0 ? (
              <div className="py-12 px-4 flex items-center justify-center gap-2 text-xs text-gray-400">
                <Loader2 size={18} className="animate-spin text-orange-500" />
                <span>Memuat data inventaris...</span>
              </div>
            ) : items.length === 0 ? (
              <div className="py-12 px-4 text-center text-gray-400">
                <Gem size={36} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm font-semibold text-gray-600">Tidak ada barang perhiasan</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {search || selectedCategory !== 'Semua'
                    ? 'Coba ubah filter kategori atau kata kunci pencarian.'
                    : 'Belum ada perhiasan terdaftar di etalase toko.'}
                </p>
                {!search && selectedCategory === 'Semua' && (
                  <button
                    type="button"
                    onClick={onOpenAddModal}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors cursor-pointer border border-orange-200"
                  >
                    <Plus size={14} />
                    <span>Tambah Barang Baru</span>
                  </button>
                )}
              </div>
            ) : (
              items.map(p => (
                <div key={p.id} className="p-4 flex flex-col gap-3 hover:bg-orange-50/25 transition-colors">
                  <div className="flex items-center gap-3">
                    <img
                      src={p.image}
                      alt={p.name}
                      loading="lazy"
                      className="w-12 h-12 rounded-lg object-cover border border-gray-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono font-bold text-gray-900 text-xs">{p.sku}</span>
                        <span className="text-gray-300">&bull;</span>
                        <span className="text-xs text-gray-500 font-medium">{p.category}</span>
                      </div>
                      <h4 className="text-sm font-bold text-gray-900 truncate">{p.name}</h4>
                      <div className="flex items-center gap-2.5 mt-1 text-xs text-gray-500">
                        <span>
                          Berat: <strong className="text-gray-800 font-mono">{p.berat.toFixed(2)} gr</strong>
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-xs border ${
                            p.stok > 5
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : p.stok > 0
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          {p.stok} pcs
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-xs text-gray-400 font-medium block">Harga Jual</span>
                      <span className="text-sm font-bold text-gray-900 font-mono tabular-nums">
                        {formatIDR(p.harga)}
                      </span>
                    </div>
                    <ActionDropdownMenu
                      ariaLabel={`Aksi untuk ${p.name}`}
                      items={[
                        {
                          id: 'barcode',
                          label: 'Cetak Barcode',
                          icon: <Barcode size={14} />,
                          tone: 'primary',
                          onClick: () => setPrintingBarcodeProduct(p),
                        },
                        ...(canManageInventory
                          ? [
                              {
                                id: 'edit',
                                label: 'Edit Barang',
                                icon: <Pencil size={14} />,
                                onClick: () => onEditProduct(p),
                              },
                              {
                                id: 'delete',
                                label: 'Hapus Barang',
                                icon: <Trash2 size={14} />,
                                tone: 'danger' as const,
                                dividerBefore: true,
                                disabled: (p.salesCount ?? 0) > 0,
                                disabledReason:
                                  (p.salesCount ?? 0) > 0 ? 'Sudah terjual' : undefined,
                                onClick: () => setDeletingProduct(p),
                              },
                            ]
                          : []),
                      ]}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* DESKTOP TABLE (6 Clean Columns) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-500 uppercase font-semibold tracking-wider text-xs">
                <tr>
                  <SortableTh
                    label="Item Perhiasan"
                    sortKey="name"
                    currentSortBy={sortBy}
                    currentSortDir={sortDir}
                    onSort={key => handleHeaderSort(key, 'asc')}
                    className="py-3 px-3.5 sm:px-4"
                  />
                  <SortableTh
                    label="Kode Barcode"
                    sortKey="sku"
                    currentSortBy={sortBy}
                    currentSortDir={sortDir}
                    onSort={key => handleHeaderSort(key, 'asc')}
                    className="py-3 px-3 sm:px-4"
                  />
                  <SortableTh
                    label="Berat (gr)"
                    sortKey="berat"
                    currentSortBy={sortBy}
                    currentSortDir={sortDir}
                    onSort={key => handleHeaderSort(key, 'desc')}
                    align="right"
                    className="py-3 px-3 sm:px-4"
                  />
                  <SortableTh
                    label="Stok"
                    sortKey="stok"
                    currentSortBy={sortBy}
                    currentSortDir={sortDir}
                    onSort={key => handleHeaderSort(key, 'asc')}
                    align="center"
                    className="py-3 px-3 sm:px-4"
                  />
                  <SortableTh
                    label="Harga Jual"
                    sortKey="harga"
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
                        <span>Memuat data inventaris...</span>
                      </div>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      <Gem size={36} className="mx-auto mb-2 text-gray-300" />
                      <p className="text-sm font-semibold text-gray-600">Tidak ada barang perhiasan</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {search || selectedCategory !== 'Semua'
                          ? 'Coba ubah filter kategori atau kata kunci pencarian.'
                          : 'Belum ada perhiasan terdaftar di etalase toko.'}
                      </p>
                      {!search && selectedCategory === 'Semua' && (
                        <button
                          type="button"
                          onClick={onOpenAddModal}
                          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors cursor-pointer border border-orange-200"
                        >
                          <Plus size={14} />
                          <span>Tambah Barang Baru</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  items.map(p => (
                    <tr key={p.id} className="hover:bg-orange-50/25 transition-colors">
                      <td className="py-3.5 px-3.5 sm:px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.image}
                            alt={p.name}
                            loading="lazy"
                            className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-gray-900 text-xs sm:text-sm block truncate">
                              {p.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-xs text-gray-500 font-medium">{p.category}</span>
                              {p.isPromo && p.promoLabel && (
                                <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                  {p.promoLabel}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 sm:px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-gray-900 text-xs sm:text-sm tracking-tight">
                          {p.sku}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 sm:px-4 text-right font-semibold text-gray-800 font-mono tabular-nums whitespace-nowrap text-xs sm:text-sm">
                        {p.berat.toFixed(2)} gr
                      </td>
                      <td className="py-3.5 px-3 sm:px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold font-mono border ${
                            p.stok > 5
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : p.stok > 0
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          {p.stok} pcs
                        </span>
                      </td>
                      <td className="py-3.5 px-3 sm:px-4 text-right font-bold text-sm text-gray-900 font-mono tabular-nums whitespace-nowrap">
                        {formatIDR(p.harga)}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                        <ActionDropdownMenu
                          ariaLabel={`Aksi untuk ${p.name}`}
                          items={[
                            {
                              id: 'barcode',
                              label: 'Cetak Barcode',
                              icon: <Barcode size={14} />,
                              tone: 'primary',
                              onClick: () => setPrintingBarcodeProduct(p),
                            },
                            ...(canManageInventory
                              ? [
                                  {
                                    id: 'edit',
                                    label: 'Edit Barang',
                                    icon: <Pencil size={14} />,
                                    onClick: () => onEditProduct(p),
                                  },
                                  {
                                    id: 'delete',
                                    label: 'Hapus Barang',
                                    icon: <Trash2 size={14} />,
                                    tone: 'danger' as const,
                                    dividerBefore: true,
                                    disabled: (p.salesCount ?? 0) > 0,
                                    disabledReason:
                                      (p.salesCount ?? 0) > 0 ? 'Sudah terjual' : undefined,
                                    onClick: () => setDeletingProduct(p),
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </td>
                    </tr>
                  ))
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

      <ConfirmModal
        isOpen={!!deletingProduct}
        title="Hapus Barang Inventaris"
        description={
          deletingProduct
            ? `Apakah Anda yakin ingin menghapus "${deletingProduct.name}" (${deletingProduct.sku}) dari database? Tindakan ini tidak dapat dibatalkan.`
            : ''
        }
        confirmLabel="Ya, Hapus Barang"
        isLoading={isDeleting}
        onCancel={() => setDeletingProduct(null)}
        onConfirm={handleConfirmDelete}
      />

      <BarcodeLabelModal
        product={printingBarcodeProduct}
        onClose={() => setPrintingBarcodeProduct(null)}
      />
    </div>
  );
};
