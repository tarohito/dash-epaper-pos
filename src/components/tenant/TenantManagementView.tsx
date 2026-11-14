import React, { useState, useMemo } from 'react';
import {
  Store,
  Users,
  MapPin,
  CheckCircle2,
  Eye,
  Plus,
} from 'lucide-react';
import { Tenant } from '../../types';
import { usePagination } from '../../hooks/usePagination';
import { PaginationControls } from '../common/PaginationControls';
import { SearchInput } from '../common/SearchInput';
import { ActionDropdownMenu } from '../common/ActionDropdownMenu';
import {
  ModalShell,
  MODAL_FOOTER_END_CLASS,
  MODAL_BTN_SECONDARY_CLASS,
  MODAL_BTN_PRIMARY_CLASS,
} from '../common/ModalShell';

interface TenantManagementViewProps {
  tenants: Tenant[];
  activeTenantId: string;
  onSelectTenant: (tenantId: string) => void;
  onOpenRegisterModal: () => void;
  onNavigateToPos: () => void;
  canCreateOutlet?: boolean;
}

type TenantFilterTab = 'all' | 'active' | 'enterprise' | 'pro';

export const TenantManagementView: React.FC<TenantManagementViewProps> = ({
  tenants,
  activeTenantId,
  onSelectTenant,
  onOpenRegisterModal,
  onNavigateToPos,
  canCreateOutlet = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<TenantFilterTab>('all');
  const [detailTenant, setDetailTenant] = useState<Tenant | null>(null);

  const activeTenant = useMemo(
    () => tenants.find(t => t.id === activeTenantId) || tenants[0],
    [tenants, activeTenantId]
  );

  const summary = useMemo(() => {
    const activeCount = tenants.filter(t => t.status === 'Aktif').length;
    const totalCashiers = tenants.reduce((acc, t) => acc + (t.cashierCount || 0), 0);
    const uniqueCities = new Set(tenants.map(t => t.city.trim()).filter(Boolean)).size;
    const enterpriseCount = tenants.filter(t => t.plan === 'Enterprise Multi-Tenant').length;
    const proCount = tenants.filter(t => t.plan !== 'Enterprise Multi-Tenant').length;

    return {
      totalTenants: tenants.length,
      activeCount,
      totalCashiers,
      uniqueCities,
      enterpriseCount,
      proCount,
    };
  }, [tenants]);

  const filteredTenants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tenants.filter(t => {
      if (filterTab === 'active' && t.status !== 'Aktif') return false;
      if (filterTab === 'enterprise' && t.plan !== 'Enterprise Multi-Tenant') return false;
      if (filterTab === 'pro' && t.plan === 'Enterprise Multi-Tenant') return false;

      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.branchName.toLowerCase().includes(q) ||
        t.city.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        t.phone.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q)
      );
    });
  }, [tenants, searchQuery, filterTab]);

  const {
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    paginatedItems,
    goToPage,
    setPageSize,
  } = usePagination(filteredTenants, { initialPageSize: 10 });

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    goToPage(1);
  };

  const handleTabChange = (nextTab: TenantFilterTab) => {
    setFilterTab(nextTab);
    goToPage(1);
  };

  const hasActiveFilter = searchQuery.trim().length > 0 || filterTab !== 'all';

  return (
    <div className="space-y-4 pb-8">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
            Kelola Multi-Outlet Toko Emas
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Kelola daftar gerai toko emas, peralihan cabang kasir aktif, dan informasi operasional setiap outlet.
          </p>
        </div>

        {canCreateOutlet && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={onOpenRegisterModal}
              className="h-9 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0 active:scale-[0.98]"
            >
              <Plus size={16} />
              <span>Tambah Toko / Outlet Baru</span>
            </button>
          </div>
        )}
      </div>

      {/* 4 Modern KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors min-w-0">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-medium text-gray-500 truncate">
              Total Outlet Terdaftar
            </span>
            <span className="w-8 h-8 rounded-lg bg-orange-50/80 text-orange-600 border border-orange-100/80 flex items-center justify-center shrink-0">
              <Store size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-gray-900 tracking-tight truncate tabular-nums">
              {summary.totalTenants} Outlet
            </div>
            <p className="text-xs text-gray-400 mt-1 truncate">
              {summary.activeCount} gerai berstatus aktif
            </p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors min-w-0">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-medium text-gray-500 truncate">
              Outlet Aktif Saat Ini
            </span>
            <span className="w-8 h-8 rounded-lg bg-emerald-50/80 text-emerald-600 border border-emerald-100/80 flex items-center justify-center shrink-0">
              <CheckCircle2 size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3 min-w-0">
            <div className="text-xl sm:text-2xl font-bold font-mono text-gray-900 tracking-tight truncate tabular-nums">
              {activeTenant?.code || '-'}
            </div>
            <p className="text-xs text-gray-400 mt-1 truncate">
              {activeTenant ? activeTenant.name : 'Belum ada outlet dipilih'}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors min-w-0">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-medium text-gray-500 truncate">
              Total Staf Kasir
            </span>
            <span className="w-8 h-8 rounded-lg bg-blue-50/80 text-blue-600 border border-blue-100/80 flex items-center justify-center shrink-0">
              <Users size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-gray-900 tracking-tight truncate tabular-nums">
              {summary.totalCashiers} Kasir
            </div>
            <p className="text-xs text-gray-400 mt-1 truncate">
              Akumulasi operator POS aktif
            </p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors min-w-0">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-medium text-gray-500 truncate">
              Cakupan Wilayah
            </span>
            <span className="w-8 h-8 rounded-lg bg-amber-50/80 text-amber-600 border border-amber-100/80 flex items-center justify-center shrink-0">
              <MapPin size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-gray-900 tracking-tight truncate tabular-nums">
              {summary.uniqueCities} Kota
            </div>
            <p className="text-xs text-gray-400 mt-1 truncate">
              Lokasi cabang operasional
            </p>
          </div>
        </div>
      </div>

      {/* Search, Filter & Outlet Cards Workspace */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <SearchInput
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Cari nama outlet, kode gerai, cabang, kota, atau kontak..."
          />

          <div className="inline-flex h-9 p-0.5 bg-gray-100 rounded-lg border border-gray-200 items-center self-start lg:self-auto overflow-x-auto max-w-full shrink-0">
            {[
              { id: 'all' as const, label: `Semua (${summary.totalTenants})` },
              { id: 'active' as const, label: `Aktif (${summary.activeCount})` },
              { id: 'enterprise' as const, label: `Enterprise (${summary.enterpriseCount})` },
              { id: 'pro' as const, label: `Pro / Basic (${summary.proCount})` },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`h-full px-3 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center whitespace-nowrap ${
                  filterTab === tab.id
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Outlet Card Grid or Empty State */}
        {paginatedItems.length === 0 ? (
          <div className="border border-gray-200 rounded-lg py-12 px-4 text-center text-gray-400 bg-gray-50/40">
            <Store size={36} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm font-semibold text-gray-600">Tidak ada outlet ditemukan</p>
            <p className="text-xs text-gray-400 mt-0.5 max-w-sm mx-auto">
              {hasActiveFilter
                ? 'Coba ubah filter atau kata kunci pencarian outlet.'
                : 'Belum ada outlet toko emas yang terdaftar.'}
            </p>
            {hasActiveFilter ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setFilterTab('all');
                  goToPage(1);
                }}
                className="mt-3 px-3.5 py-1.5 text-xs font-bold text-orange-600 bg-orange-50 rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors cursor-pointer"
              >
                Reset Filter
              </button>
            ) : canCreateOutlet ? (
              <button
                type="button"
                onClick={onOpenRegisterModal}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors cursor-pointer border border-orange-200"
              >
                <Plus size={14} />
                <span>Tambah Outlet Baru</span>
              </button>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginatedItems.map(tenant => {
              const isSelected = activeTenant?.id === tenant.id;
              return (
                <div
                  key={tenant.id}
                  className={`rounded-xl border p-4 sm:p-5 flex flex-col justify-between transition-all ${
                    isSelected
                      ? 'bg-orange-50/20 border-orange-500 ring-1 ring-orange-500/20 shadow-xs'
                      : 'bg-white border-gray-200 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)]'
                  }`}
                >
                  <div>
                    {/* Top Status & Code Strip */}
                    <div className="flex items-center justify-between gap-2 mb-3.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded border border-gray-200/70">
                          {tenant.code}
                        </span>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                            tenant.status === 'Aktif'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : tenant.status === 'Trial'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-gray-100 text-gray-600 border-gray-200'
                          }`}
                        >
                          {tenant.status}
                        </span>
                      </div>

                      {isSelected && (
                        <span className="text-xs font-semibold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200 shrink-0">
                          Aktif Digunakan
                        </span>
                      )}
                    </div>

                    {/* Outlet Identity */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-11 h-11 rounded-lg bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                        {tenant.logoInitial}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm sm:text-base font-bold text-gray-900 truncate leading-tight">
                          {tenant.name}
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-600 truncate mt-0.5">
                          {tenant.branchName}
                        </p>
                        <p className="text-xs text-gray-400 font-mono truncate mt-0.5">
                          {tenant.slug}
                        </p>
                      </div>
                    </div>

                    {/* Operational Info Card */}
                    <div className="bg-gray-50/80 rounded-lg p-3.5 space-y-2 text-xs border border-gray-100">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-500 shrink-0">Kota Lokasi</span>
                        <span className="font-semibold text-gray-800 text-right truncate">
                          {tenant.city}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-500 shrink-0">No. Telepon</span>
                        <span className="font-mono font-semibold text-gray-800 tabular-nums text-right truncate">
                          {tenant.phone}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-500 shrink-0">Paket Layanan</span>
                        <span className="font-semibold text-gray-800 text-right truncate">
                          {tenant.plan}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-500 shrink-0">Kapasitas Outlet</span>
                        <span className="font-mono font-semibold text-gray-800 tabular-nums text-right">
                          {tenant.cashierCount} kasir &bull; {tenant.productCount} SKU
                        </span>
                      </div>
                      <div className="pt-1.5 border-t border-gray-200/60">
                        <span className="text-gray-400 block mb-0.5">Alamat Gerai</span>
                        <p className="text-gray-700 leading-relaxed line-clamp-2" title={tenant.address}>
                          {tenant.address}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Footer */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
                    {isSelected ? (
                      <button
                        type="button"
                        onClick={onNavigateToPos}
                        className="flex-1 h-9 px-3.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer shadow-xs active:scale-[0.98]"
                      >
                        Buka Kasir POS
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelectTenant(tenant.id)}
                        className="flex-1 h-9 px-3.5 bg-gray-100 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 border border-gray-200 text-gray-800 font-semibold text-xs sm:text-sm rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center active:scale-[0.98]"
                      >
                        Pilih &amp; Aktifkan Outlet
                      </button>
                    )}

                    <ActionDropdownMenu
                      ariaLabel={`Aksi untuk ${tenant.name}`}
                      buttonClassName="w-9 h-9"
                      items={[
                        {
                          id: 'detail',
                          label: 'Lihat Detail Outlet',
                          icon: <Eye size={14} />,
                          onClick: () => setDetailTenant(tenant),
                        },
                        isSelected
                          ? {
                              id: 'pos',
                              label: 'Buka Kasir POS',
                              icon: <Store size={14} />,
                              tone: 'primary',
                              onClick: onNavigateToPos,
                            }
                          : {
                              id: 'activate',
                              label: 'Pilih & Aktifkan Outlet',
                              icon: <CheckCircle2 size={14} />,
                              tone: 'primary',
                              onClick: () => onSelectTenant(tenant.id),
                            },
                      ]}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls inside Workspace Card */}
        {paginatedItems.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={goToPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </div>

      {/* Detail Outlet Modal */}
      <ModalShell
        isOpen={!!detailTenant}
        onClose={() => setDetailTenant(null)}
        size="md"
        title={detailTenant?.name ?? 'Detail Outlet'}
        subtitle={detailTenant ? `${detailTenant.code} • ${detailTenant.branchName}` : undefined}
        footer={
          detailTenant ? (
            <div className={MODAL_FOOTER_END_CLASS}>
              <button
                type="button"
                onClick={() => setDetailTenant(null)}
                className={MODAL_BTN_SECONDARY_CLASS}
              >
                Tutup
              </button>
              {activeTenant?.id === detailTenant.id ? (
                <button
                  type="button"
                  onClick={() => {
                    setDetailTenant(null);
                    onNavigateToPos();
                  }}
                  className={MODAL_BTN_PRIMARY_CLASS}
                >
                  Buka Kasir POS
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const targetId = detailTenant.id;
                    setDetailTenant(null);
                    onSelectTenant(targetId);
                  }}
                  className={MODAL_BTN_PRIMARY_CLASS}
                >
                  Pilih Outlet Ini
                </button>
              )}
            </div>
          ) : undefined
        }
      >
        {detailTenant && (
          <div className="space-y-3 text-xs sm:text-sm">
            <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500">Kode Outlet</span>
                <span className="font-mono font-bold text-gray-900">{detailTenant.code}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500">Status Operasional</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
                    detailTenant.status === 'Aktif'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-gray-100 text-gray-700 border-gray-200'
                  }`}
                >
                  {detailTenant.status}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500">Cabang</span>
                <span className="font-semibold text-gray-900 text-right">{detailTenant.branchName}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500">Kota</span>
                <span className="font-semibold text-gray-900">{detailTenant.city}</span>
              </div>
              <div className="pt-2 border-t border-gray-200/70">
                <span className="text-gray-500 block mb-1">Alamat Lengkap</span>
                <p className="text-gray-800 font-medium leading-relaxed">{detailTenant.address}</p>
              </div>
            </div>

            <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500">No. Telepon / WhatsApp</span>
                <span className="font-mono font-semibold text-gray-900 tabular-nums">
                  {detailTenant.phone}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500">Email</span>
                <span className="font-medium text-gray-800">{detailTenant.email}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500">Paket Layanan</span>
                <span className="font-semibold text-gray-900">{detailTenant.plan}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500">Kapasitas Kasir &amp; Katalog</span>
                <span className="font-mono font-semibold text-gray-900 tabular-nums">
                  {detailTenant.cashierCount} kasir &bull; {detailTenant.productCount} SKU
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500">Domain Portal</span>
                <span className="font-mono text-gray-700">{detailTenant.slug}</span>
              </div>
            </div>
          </div>
        )}
      </ModalShell>
    </div>
  );
};
