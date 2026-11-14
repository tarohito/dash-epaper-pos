import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserCheck,
  Shield,
  UserCog,
  Plus,
  Pencil,
  Trash2,
  Loader2,
} from 'lucide-react';
import {
  Tenant,
  UserAccount,
  UserCreatePayload,
  UserRole,
  UserUpdatePayload,
} from '../../types';
import { posApi } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
import { SearchInput } from '../common/SearchInput';
import { PaginationControls } from '../common/PaginationControls';
import { ErrorBanner } from '../common/ErrorBanner';
import { ConfirmModal } from '../common/ConfirmModal';
import { AddEditUserModal } from './AddEditUserModal';
import { useToast } from '../../contexts/ToastContext';
import { ActionDropdownMenu } from '../common/ActionDropdownMenu';
import {
  SortableTh,
  SortDirection,
  getNextColumnSort,
} from '../common/TableSortControls';

interface UserManagementViewProps {
  currentUser: UserAccount;
  tenants: Tenant[];
}

const ROLE_META: Record<UserRole, { label: string; badgeClass: string }> = {
  owner: {
    label: 'Owner',
    badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200',
  },
  branch_manager: {
    label: 'Kepala Cabang',
    badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200',
  },
  cashier: {
    label: 'Kasir',
    badgeClass: 'bg-gray-100 text-gray-700',
  },
};

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  currentUser,
  tenants,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 220);
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [items, setItems] = useState<UserAccount[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    managerCount: 0,
    cashierCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserAccount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useToast();

  const tenantMap = useMemo(() => new Map(tenants.map(t => [t.id, t])), [tenants]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, roleFilter, sortBy, sortDir]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setFetchError(null);

    posApi
      .getUsers(
        {
          page: currentPage,
          pageSize,
          search: debouncedSearch,
          role: roleFilter,
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
          const msg = err instanceof Error ? err.message : 'Gagal memuat daftar pengguna.';
          setFetchError(msg);
          setIsLoading(false);
          showToast('error', msg);
        }
      });

    return () => controller.abort();
  }, [currentPage, pageSize, debouncedSearch, roleFilter, sortBy, sortDir, refreshTrigger, retryCount, showToast]);

  const handleHeaderSort = (key: string, defaultDir: SortDirection = 'asc') => {
    const next = getNextColumnSort(key, sortBy, sortDir, defaultDir);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
  };

  const handleSaveUser = async (
    payload: UserCreatePayload | UserUpdatePayload,
    editId?: string
  ) => {
    try {
      if (editId) {
        const updated = await posApi.updateUser(editId, payload as UserUpdatePayload);
        showToast('success', `Akun "${updated.fullName}" berhasil diperbarui.`);
      } else {
        const created = await posApi.createUser(payload as UserCreatePayload);
        showToast('success', `Akun "${created.fullName}" berhasil dibuat.`);
      }
      setIsModalOpen(false);
      setEditingUser(null);
      setRefreshTrigger(k => k + 1);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menyimpan akun pengguna.');
      throw err;
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    try {
      await posApi.deleteUser(deletingUser.id);
      showToast('success', `Akun "${deletingUser.fullName}" berhasil dihapus.`);
      setDeletingUser(null);
      setRefreshTrigger(k => k + 1);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menghapus akun pengguna.');
    } finally {
      setIsDeleting(false);
    }
  };

  const renderAllowedTenants = (user: UserAccount) => {
    if (user.role === 'owner') {
      return (
        <span className="inline-block text-xs bg-amber-50 text-amber-800 font-semibold px-2 py-0.5 rounded border border-amber-200">
          Semua Outlet ({tenants.length})
        </span>
      );
    }
    if (!user.allowedTenantIds || user.allowedTenantIds.length === 0) {
      return <span className="text-xs text-gray-400">Belum ada akses outlet</span>;
    }
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {user.allowedTenantIds.map(id => {
          const tenant = tenantMap.get(id);
          return (
            <span
              key={id}
              className="font-mono text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-semibold"
              title={tenant ? `${tenant.name} (${tenant.branchName})` : id}
            >
              {tenant ? tenant.code : id}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-8">
      {/* 1. HEADER SECTION */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
              Manajemen Pengguna &amp; Hak Akses
            </h3>
            {isLoading && <Loader2 size={14} className="animate-spin text-orange-500" />}
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Kelola akun staf kasir, kepala cabang, jadwal shift, dan pembatasan akses per outlet toko.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setEditingUser(null);
              setIsModalOpen(true);
            }}
            className="h-9 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors cursor-pointer shadow-xs shrink-0 inline-flex items-center justify-center gap-1.5 active:scale-[0.98]"
          >
            <Plus size={16} />
            <span>Tambah Pengguna Baru</span>
          </button>
        </div>
      </div>

      {/* 2. RINGKASAN METRIK */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors min-w-0">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm text-gray-500 font-medium truncate">
              Total Pengguna
            </span>
            <span className="w-8 h-8 rounded-lg bg-blue-50/80 text-blue-600 border border-blue-100/80 flex items-center justify-center shrink-0">
              <Users size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold text-gray-900 font-mono tabular-nums tracking-tight truncate">
              {stats.totalUsers} Akun
            </div>
            <p className="text-xs text-gray-400 mt-1 truncate">Terdaftar di seluruh jaringan</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors min-w-0">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm text-gray-500 font-medium truncate">
              Akun Aktif
            </span>
            <span className="w-8 h-8 rounded-lg bg-emerald-50/80 text-emerald-600 border border-emerald-100/80 flex items-center justify-center shrink-0">
              <UserCheck size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold text-gray-900 font-mono tabular-nums tracking-tight truncate">
              {stats.activeUsers} Aktif
            </div>
            <p className="text-xs text-gray-400 mt-1 truncate">Diizinkan masuk ke sistem</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors min-w-0">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm text-gray-500 font-medium truncate">
              Kepala Cabang
            </span>
            <span className="w-8 h-8 rounded-lg bg-amber-50/80 text-amber-600 border border-amber-100/80 flex items-center justify-center shrink-0">
              <Shield size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold text-gray-900 font-mono tabular-nums tracking-tight truncate">
              {stats.managerCount} Orang
            </div>
            <p className="text-xs text-gray-400 mt-1 truncate">Supervisor stok, promo &amp; void</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors min-w-0">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm text-gray-500 font-medium truncate">
              Staf Kasir
            </span>
            <span className="w-8 h-8 rounded-lg bg-orange-50/80 text-orange-600 border border-orange-100/80 flex items-center justify-center shrink-0">
              <UserCog size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold text-gray-900 font-mono tabular-nums tracking-tight truncate">
              {stats.cashierCount} Orang
            </div>
            <p className="text-xs text-gray-400 mt-1 truncate">Operator POS penjualan &amp; buyback</p>
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
            placeholder="Cari nama, username, email, atau shift..."
          />

          <div className="inline-flex h-9 p-0.5 bg-gray-100 rounded-lg border border-gray-200 items-center self-start md:self-auto shrink-0 overflow-x-auto max-w-full">
            {(
              [
                { id: 'all', label: 'Semua' },
                { id: 'owner', label: 'Owner' },
                { id: 'branch_manager', label: 'Kepala Cabang' },
                { id: 'cashier', label: 'Kasir' },
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRoleFilter(tab.id)}
                className={`h-full px-3 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center whitespace-nowrap ${
                  roleFilter === tab.id
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
              <span>Memuat data pengguna...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 px-4 text-center text-gray-400">
              <Users size={36} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-semibold text-gray-600">Tidak ada pengguna ditemukan</p>
              <p className="text-xs text-gray-400 mt-0.5 max-w-sm mx-auto">
                {searchQuery
                  ? `Pencarian "${searchQuery}" tidak cocok dengan akun pengguna mana pun.`
                  : 'Belum ada akun pengguna untuk filter yang dipilih.'}
              </p>
              {(searchQuery || roleFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setRoleFilter('all');
                  }}
                  className="mt-3 px-3.5 py-1.5 text-xs font-bold text-orange-600 bg-orange-50 rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors cursor-pointer"
                >
                  Reset Filter
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
                        label="Pengguna"
                        sortKey="fullName"
                        currentSortBy={sortBy}
                        currentSortDir={sortDir}
                        onSort={key => handleHeaderSort(key, 'asc')}
                        className="py-3 px-3.5 sm:px-4"
                      />
                      <SortableTh
                        label="Role"
                        sortKey="role"
                        currentSortBy={sortBy}
                        currentSortDir={sortDir}
                        onSort={key => handleHeaderSort(key, 'asc')}
                        className="py-3 px-3 sm:px-4"
                      />
                      <th className="py-3 px-3 sm:px-4">Kontak &amp; Shift</th>
                      <th className="py-3 px-3 sm:px-4">Akses Outlet</th>
                      <SortableTh
                        label="Status"
                        sortKey="isActive"
                        currentSortBy={sortBy}
                        currentSortDir={sortDir}
                        onSort={key => handleHeaderSort(key, 'desc')}
                        align="center"
                        className="py-3 px-3 sm:px-4"
                      />
                      <th className="py-3 px-3 sm:px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                    {items.map(u => {
                      const meta = ROLE_META[u.role];
                      const isSelf = u.id === currentUser.id;
                      return (
                        <tr key={u.id} className="hover:bg-orange-50/25 transition-colors">
                          <td className="py-3.5 px-3.5 sm:px-4 align-top min-w-[200px]">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-bold text-gray-900 text-xs sm:text-sm leading-tight">
                                  {u.fullName}
                                </p>
                                {isSelf && (
                                  <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">
                                    Anda
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className="font-mono text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-semibold">
                                  @{u.username}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-3 sm:px-4 align-top whitespace-nowrap">
                            <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${meta.badgeClass}`}>
                              {meta.label}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 sm:px-4 align-top min-w-[180px] max-w-[250px]">
                            <div className="space-y-1">
                              <p className="text-xs font-mono text-gray-800 truncate" title={u.email}>
                                {u.email}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {u.shiftLabel}
                              </p>
                            </div>
                          </td>

                          <td className="py-3.5 px-3 sm:px-4 align-top">
                            {renderAllowedTenants(u)}
                          </td>

                          <td className="py-3.5 px-3 sm:px-4 align-top text-center whitespace-nowrap">
                            <span
                              className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${
                                u.isActive
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-gray-100 text-gray-500 border border-gray-200'
                              }`}
                            >
                              {u.isActive ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 align-top text-center whitespace-nowrap">
                            <ActionDropdownMenu
                              ariaLabel={`Aksi untuk ${u.fullName}`}
                              items={[
                                {
                                  id: 'edit',
                                  label: 'Edit Pengguna',
                                  icon: <Pencil size={14} />,
                                  onClick: () => {
                                    setEditingUser(u);
                                    setIsModalOpen(true);
                                  },
                                },
                                {
                                  id: 'delete',
                                  label: 'Hapus Pengguna',
                                  icon: <Trash2 size={14} />,
                                  tone: 'danger',
                                  dividerBefore: true,
                                  disabled: isSelf,
                                  disabledReason: isSelf ? 'Tidak dapat menghapus akun sendiri' : undefined,
                                  onClick: () => setDeletingUser(u),
                                },
                              ]}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile / Tablet Card View */}
              <div className="lg:hidden divide-y divide-gray-100">
                {items.map(u => {
                  const meta = ROLE_META[u.role];
                  const isSelf = u.id === currentUser.id;
                  return (
                    <div key={u.id} className="p-3.5 sm:p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-bold text-gray-900 text-xs sm:text-sm leading-tight truncate">
                              {u.fullName}
                            </p>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded shrink-0 ${meta.badgeClass}`}>
                              {meta.label}
                            </span>
                            {isSelf && (
                              <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200 shrink-0">
                                Anda
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">
                            @{u.username} &bull; {u.email}
                          </p>
                        </div>

                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded shrink-0 ${
                            u.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-gray-100 text-gray-500 border border-gray-200'
                          }`}
                        >
                          {u.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                        <span className="text-gray-500 font-medium">{u.shiftLabel}</span>
                        <div>{renderAllowedTenants(u)}</div>
                      </div>

                      <div className="pt-2 border-t border-gray-100 flex items-center justify-end">
                        <ActionDropdownMenu
                          ariaLabel={`Aksi untuk ${u.fullName}`}
                          items={[
                            {
                              id: 'edit',
                              label: 'Edit Pengguna',
                              icon: <Pencil size={14} />,
                              onClick: () => {
                                setEditingUser(u);
                                setIsModalOpen(true);
                              },
                            },
                            {
                              id: 'delete',
                              label: 'Hapus Pengguna',
                              icon: <Trash2 size={14} />,
                              tone: 'danger',
                              dividerBefore: true,
                              disabled: isSelf,
                              disabledReason: isSelf ? 'Tidak dapat menghapus akun sendiri' : undefined,
                              onClick: () => setDeletingUser(u),
                            },
                          ]}
                        />
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

      <AddEditUserModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingUser(null);
        }}
        editingUser={editingUser}
        currentUserId={currentUser.id}
        tenants={tenants}
        onSaveUser={handleSaveUser}
      />

      <ConfirmModal
        isOpen={!!deletingUser}
        title="Hapus Akun Pengguna"
        description={
          deletingUser
            ? `Apakah Anda yakin ingin menghapus akun "${deletingUser.fullName}" (@${deletingUser.username})? Sesi login pengguna tersebut akan langsung dihentikan.`
            : ''
        }
        confirmLabel="Ya, Hapus Akun"
        isLoading={isDeleting}
        onCancel={() => setDeletingUser(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
