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
import Tooltip from '../Tooltip';
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
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  branch_manager: {
    label: 'Kepala Cabang',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  cashier: {
    label: 'Kasir',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'US';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

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
  }, [currentPage, pageSize, debouncedSearch, roleFilter, sortBy, sortDir, refreshTrigger, showToast]);

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

  const formatAllowedTenants = (user: UserAccount) => {
    if (user.role === 'owner') {
      return `Semua Outlet (${tenants.length})`;
    }
    if (!user.allowedTenantIds || user.allowedTenantIds.length === 0) {
      return '-';
    }
    return user.allowedTenantIds
      .map(id => tenantMap.get(id)?.code || id)
      .join(', ');
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
              Manajemen User &amp; Hak Akses
            </h3>
            {isLoading && <Loader2 size={14} className="animate-spin text-orange-500" />}
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Kelola akun staf kasir, kepala cabang, jadwal shift, dan pembatasan akses per outlet toko.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingUser(null);
            setIsModalOpen(true);
          }}
          className="h-9 px-4 bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0 self-start sm:self-auto active:scale-[0.98]"
        >
          <Plus size={16} />
          <span>Tambah Pengguna</span>
        </button>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-medium text-gray-500 truncate">Total Pengguna</span>
            <span className="w-8 h-8 rounded-lg bg-orange-50/80 text-orange-600 border border-orange-100/80 flex items-center justify-center shrink-0">
              <Users size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-gray-900 tracking-tight tabular-nums">
              {stats.totalUsers} Akun
            </div>
            <p className="text-xs text-gray-400 mt-1 truncate">Terdaftar di seluruh jaringan</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-medium text-gray-500 truncate">Akun Aktif</span>
            <span className="w-8 h-8 rounded-lg bg-emerald-50/80 text-emerald-600 border border-emerald-100/80 flex items-center justify-center shrink-0">
              <UserCheck size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-gray-900 tracking-tight tabular-nums">
              {stats.activeUsers} Aktif
            </div>
            <p className="text-xs text-gray-400 mt-1 truncate">Diizinkan masuk ke sistem</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-medium text-gray-500 truncate">Kepala Cabang</span>
            <span className="w-8 h-8 rounded-lg bg-blue-50/80 text-blue-600 border border-blue-100/80 flex items-center justify-center shrink-0">
              <Shield size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-gray-900 tracking-tight tabular-nums">
              {stats.managerCount} Orang
            </div>
            <p className="text-xs text-gray-400 mt-1 truncate">Supervisor stok, promo &amp; void</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-medium text-gray-500 truncate">Staf Kasir</span>
            <span className="w-8 h-8 rounded-lg bg-purple-50/80 text-purple-600 border border-purple-100/80 flex items-center justify-center shrink-0">
              <UserCog size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-gray-900 tracking-tight tabular-nums">
              {stats.cashierCount} Orang
            </div>
            <p className="text-xs text-gray-400 mt-1 truncate">Operator POS penjualan &amp; buyback</p>
          </div>
        </div>
      </div>

      {/* Main Workspace Card */}
      <div className="bg-white rounded-xl border border-gray-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(
              [
                { key: 'all', label: 'Semua' },
                { key: 'owner', label: 'Owner' },
                { key: 'branch_manager', label: 'Kepala Cabang' },
                { key: 'cashier', label: 'Kasir' },
              ] as const
            ).map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setRoleFilter(tab.key)}
                className={`h-8 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  roleFilter === tab.key
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200/80 text-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Cari nama, username, email, shift..."
            className="w-full md:w-72"
          />
        </div>

        {fetchError && (
          <div className="p-4">
            <ErrorBanner message={fetchError} onRetry={() => setRefreshTrigger(k => k + 1)} />
          </div>
        )}

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/90 border-b border-gray-200/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <SortableTh
                  label="Pengguna"
                  sortKey="fullName"
                  currentSortBy={sortBy}
                  currentSortDir={sortDir}
                  onSort={key => handleHeaderSort(key, 'asc')}
                  className="py-3 px-4"
                />
                <SortableTh
                  label="Username"
                  sortKey="username"
                  currentSortBy={sortBy}
                  currentSortDir={sortDir}
                  onSort={key => handleHeaderSort(key, 'asc')}
                  className="py-3 px-4"
                />
                <SortableTh
                  label="Role"
                  sortKey="role"
                  currentSortBy={sortBy}
                  currentSortDir={sortDir}
                  onSort={key => handleHeaderSort(key, 'asc')}
                  className="py-3 px-4"
                />
                <th className="py-3 px-4">Shift</th>
                <th className="py-3 px-4">Akses Outlet</th>
                <SortableTh
                  label="Status"
                  sortKey="isActive"
                  currentSortBy={sortBy}
                  currentSortDir={sortDir}
                  onSort={key => handleHeaderSort(key, 'desc')}
                  align="center"
                  className="py-3 px-4"
                />
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-400 text-xs sm:text-sm">
                    {isLoading ? 'Memuat daftar pengguna...' : 'Tidak ada akun pengguna yang sesuai filter.'}
                  </td>
                </tr>
              ) : (
                items.map(u => {
                  const meta = ROLE_META[u.role];
                  const isSelf = u.id === currentUser.id;
                  return (
                    <tr key={u.id} className="hover:bg-orange-50/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {getInitials(u.fullName)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-gray-900 text-sm truncate">{u.fullName}</span>
                              {isSelf && (
                                <span className="text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-200 px-1.5 py-0.5 rounded">
                                  Anda
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold text-gray-800 bg-gray-100 px-2 py-0.5 rounded border border-gray-200/70">
                          @{u.username}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${meta.badgeClass}`}
                        >
                          {meta.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-xs text-gray-600 whitespace-nowrap">
                        {u.shiftLabel}
                      </td>

                      <td className="py-3 px-4 text-xs font-mono font-medium text-gray-700">
                        {formatAllowedTenants(u)}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
                            u.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-gray-100 text-gray-500 border-gray-200'
                          }`}
                        >
                          {u.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          <Tooltip content="Edit Pengguna" side="top">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingUser(u);
                                setIsModalOpen(true);
                              }}
                              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-blue-600 border border-gray-200 hover:border-blue-200 inline-flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
                              aria-label="Edit Pengguna"
                            >
                              <Pencil size={15} />
                            </button>
                          </Tooltip>

                          <Tooltip content={isSelf ? 'Tidak dapat menghapus akun sendiri' : 'Hapus Pengguna'} side="top">
                            <button
                              type="button"
                              disabled={isSelf}
                              onClick={() => setDeletingUser(u)}
                              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 border border-gray-200 hover:border-red-200 inline-flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-100 disabled:hover:text-gray-600 disabled:active:scale-100"
                              aria-label="Hapus Pengguna"
                            >
                              <Trash2 size={15} />
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

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {items.length === 0 ? (
            <div className="py-10 px-4 text-center text-xs text-gray-400">
              {isLoading ? 'Memuat daftar pengguna...' : 'Tidak ada akun pengguna yang sesuai filter.'}
            </div>
          ) : (
            items.map(u => {
              const meta = ROLE_META[u.role];
              const isSelf = u.id === currentUser.id;
              return (
                <div key={u.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {getInitials(u.fullName)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{u.fullName}</p>
                        <p className="text-xs font-mono text-gray-500 truncate">@{u.username}</p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border shrink-0 ${meta.badgeClass}`}
                    >
                      {meta.label}
                    </span>
                  </div>

                  <div className="text-xs text-gray-600 space-y-1 bg-gray-50/70 rounded-lg p-2.5 border border-gray-100">
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-400">Email</span>
                      <span className="font-medium truncate">{u.email}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-400">Outlet</span>
                      <span className="font-mono font-semibold text-right">{formatAllowedTenants(u)}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-400">Status</span>
                      <span className={u.isActive ? 'font-semibold text-emerald-700' : 'font-semibold text-gray-500'}>
                        {u.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingUser(u);
                        setIsModalOpen(true);
                      }}
                      className="h-8 px-3 rounded-lg bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-600 border border-gray-200 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Pencil size={13} />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      disabled={isSelf}
                      onClick={() => setDeletingUser(u)}
                      className="h-8 px-3 rounded-lg bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 border border-gray-200 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={13} />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
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
