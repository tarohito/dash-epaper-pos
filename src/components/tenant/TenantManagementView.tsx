import React, { useState, useMemo } from 'react';
import {
  Store,
  ShieldCheck,
  CheckCircle2,
  Users,
  Plus,
} from 'lucide-react';
import { Tenant } from '../../types';
import { usePagination } from '../../hooks/usePagination';
import { PaginationControls } from '../common/PaginationControls';
import { SearchInput } from '../common/SearchInput';

interface TenantManagementViewProps {
  tenants: Tenant[];
  activeTenantId: string;
  onSelectTenant: (tenantId: string) => void;
  onOpenRegisterModal: () => void;
  onNavigateToPos: () => void;
}

export const TenantManagementView: React.FC<TenantManagementViewProps> = ({
  tenants,
  activeTenantId,
  onSelectTenant,
  onOpenRegisterModal,
  onNavigateToPos,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const activeTenant = useMemo(() => tenants.find(t => t.id === activeTenantId) || tenants[0], [tenants, activeTenantId]);

  const filteredTenants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter(
      t =>
        t.name.toLowerCase().includes(q) ||
        t.branchName.toLowerCase().includes(q) ||
        t.city.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q)
    );
  }, [tenants, searchQuery]);

  const {
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    paginatedItems,
    goToPage,
    setPageSize,
  } = usePagination(filteredTenants, { initialPageSize: 12 });

  return (
    <div className="space-y-6 pb-6">
      {/* Top Header Card */}
      <div className="bg-white p-5 sm:p-6 rounded-lg border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="p-2 bg-orange-100 text-orange-600 rounded-lg">
              <Store size={20} />
            </span>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                Kelola Multi-Outlet Toko Emas
              </h1>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Multi-Outlet Cloud
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Manajemen gerai toko emas, integrasi multi-cabang, hak akses kasir, dan sinkronisasi data e.paper POS.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenRegisterModal}
            className="h-9 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
          >
            <Plus size={16} />
            <span>Tambah Toko / Outlet Baru</span>
          </button>
        </div>
      </div>

      {/* Architecture Explainer Banner */}
      <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 p-4 sm:p-5 rounded-lg border border-orange-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-orange-500 text-white rounded-lg shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-gray-900">
              Multi-Outlet Cloud Integration & Real-time Synchronization
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed">
              Setiap cabang outlet toko emas memiliki kode gerai mandiri, rekap kasir per-cabang, dan katalog stok yang tersinkronisasi otomatis secara terpusat.
            </p>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2 text-xs sm:text-sm font-semibold text-orange-700 bg-white/80 px-3 py-1.5 rounded-md border border-orange-200">
          <Store size={16} />
          <span>Outlet Aktif: {activeTenant.name} ({activeTenant.branchName})</span>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-medium text-gray-500 truncate">Total Toko / Bisnis</span>
            <span className="w-8 h-8 rounded-lg bg-orange-50/80 text-orange-600 border border-orange-100/80 flex items-center justify-center shrink-0">
              <Store size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xl sm:text-2xl font-bold text-gray-900 font-mono tabular-nums tracking-tight">{tenants.length} Toko</p>
            <p className="text-xs text-emerald-600 font-medium mt-1">Semua status aktif</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-medium text-gray-500 truncate">Total Cabang / Gerai</span>
            <span className="w-8 h-8 rounded-lg bg-amber-50/80 text-amber-600 border border-amber-100/80 flex items-center justify-center shrink-0">
              <Store size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xl sm:text-2xl font-bold text-gray-900 font-mono tabular-nums tracking-tight">
              {tenants.reduce((acc, t) => acc + (t.plan.includes('Multi') ? 3 : 1), 0)} Gerai
            </p>
            <p className="text-xs text-gray-400 mt-1">Tersebar di 3 kota besar</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-medium text-gray-500 truncate">Kasir Multi-Tenant</span>
            <span className="w-8 h-8 rounded-lg bg-blue-50/80 text-blue-600 border border-blue-100/80 flex items-center justify-center shrink-0">
              <Users size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xl sm:text-2xl font-bold text-gray-900 font-mono tabular-nums tracking-tight">
              {tenants.reduce((acc, t) => acc + t.cashierCount, 0)} Kasir
            </p>
            <p className="text-xs text-blue-600 font-medium mt-1">Shift 1 &amp; 2 terproteksi</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-medium text-gray-500 truncate">Cloud Synchronization</span>
            <span className="w-8 h-8 rounded-lg bg-emerald-50/80 text-emerald-600 border border-emerald-100/80 flex items-center justify-center shrink-0">
              <CheckCircle2 size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xl sm:text-2xl font-bold text-emerald-600 font-mono tabular-nums tracking-tight">100% Real-time</p>
            <p className="text-xs text-gray-400 mt-1">Encrypted Multi-Tenant DB</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-lg border border-gray-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Cari tenant, kode, cabang, atau kota..."
        />
        <div className="text-xs sm:text-sm text-gray-500 flex items-center gap-2 shrink-0">
          <span>Menampilkan <strong>{filteredTenants.length}</strong> dari {tenants.length} Tenant</span>
        </div>
      </div>

      {/* Grid of Tenants */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {paginatedItems.map(tenant => {
          const isSelected = tenant.id === activeTenant.id;
          return (
            <div
              key={tenant.id}
              className={`bg-white rounded-lg border transition-all p-5 flex flex-col justify-between shadow-xs ${
                isSelected
                  ? 'border-orange-500 ring-2 ring-orange-500/20'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div>
                {/* Top badges */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded">
                      {tenant.code}
                    </span>
                    <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2 py-0.5 rounded">
                      {tenant.status}
                    </span>
                  </div>

                  {isSelected ? (
                    <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-md border border-orange-200/80 flex items-center gap-1">
                      <CheckCircle2 size={13} />
                      Aktif Digunakan
                    </span>
                  ) : null}
                </div>

                {/* Tenant Title & Avatar */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {tenant.logoInitial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">{tenant.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-500 truncate mt-0.5">{tenant.branchName}</p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{tenant.slug}</p>
                  </div>
                </div>

                {/* Details List */}
                <div className="bg-gray-50/70 rounded-md p-3 space-y-1.5 text-xs border border-gray-100">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Kota Lokasi:</span>
                    <span className="font-semibold text-gray-700">{tenant.city}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Paket Tenant:</span>
                    <span className="font-semibold text-gray-800">{tenant.plan}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Staf Kasir:</span>
                    <span className="font-semibold text-gray-700">{tenant.cashierCount} Kasir POS</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Database Schema:</span>
                    <span className="font-mono text-gray-600 truncate max-w-[170px]">
                      {tenant.databaseSchema}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
                {isSelected ? (
                  <button
                    type="button"
                    onClick={onNavigateToPos}
                    className="flex-1 h-9 px-3.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer shadow-xs active:scale-[0.98]"
                  >
                    Buka POS Kasir Tenant Ini
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelectTenant(tenant.id)}
                    className="flex-1 h-9 px-3.5 bg-gray-100 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 border border-gray-200 text-gray-800 font-semibold text-xs sm:text-sm rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                  >
                    Pilih & Beralih ke Tenant Ini
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={goToPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
};
