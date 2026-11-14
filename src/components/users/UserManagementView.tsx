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
  Clock,
  Store,
  Mail,
  ShieldCheck,
  RotateCcw,
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

const ROLE_META: Record<UserRole, { label: string; badgeClass: string; dotClass: string }> = {
  owner: {
    label: 'Owner',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
    dotClass: 'bg-amber-500',
  },
  branch_manager: {
    label: 'Kepala Cabang',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80',
    dotClass: 'bg-blue-500',
  },
  cashier: {
    label: 'Kasir',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    dotClass: 'bg-emerald-500',
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
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[11px] font-semibold border border-amber-200/80">
          <ShieldCheck size={12} className="text-amber-600" />
          <span>Semua Outlet ({tenants.length})</span>
        </span>
      );
    }
    if (!user.allowedTenantIds || user.allowedTenantIds.length === 0) {
      return <span className="text-gray-400">-</span>;
    }
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {user.allowedTenantIds.map(id => {
          const tenant = tenantMap.get(id);
          return (
            <span
              key={id}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-gray-100 text-gray-700 border border-gray-200"
              title={tenant ? `${tenant.name} (${tenant.branchName})` : id}
            >
              <Store size={10} className="text-gray-400" />
              <span>{tenant ? tenant.code : id}</span>
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center shrink-0">
            <UserCog size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                Manajemen Pengguna &amp; Hak Akses
              </h2>
              <span className="text-xs bg-orange-100/70 text-orange-700 font-semibold px-2 py-0.5 rounded-full">
                RBAC Multi-Outlet
              </span>
              {isLoading && <Loader2 size={14} className="animate-spin text-orange-500" />}
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Kelola akun staf kasir, kepala cabang, jadwal shift kerja, dan pembatasan akses per outlet toko emas.
            </p>
          </div>
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
        <div className="bg-white p-4 sm:p-4.5 rounded-xl border border-gray-200/90 shadow-2xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-medium text-gray-500">Total Pengguna</span>
            <span className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center shrink-0">
              <Users size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-bold font-mono text-gray-900 tracking-tight tabular-nums">
              {stats.totalUsers} <span className="text-xs font-sans font-normal text-gray-400">Akun</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">Terdaftar di seluruh jaringan</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-4.5 rounded-xl border border-gray-200/90 shadow-2xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-medium text-gray-500">Akun Aktif</span>
            <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <UserCheck size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-bold font-mono text-gray-900 tracking-tight tabular-nums text-emerald-700">
              {stats.activeUsers} <span className="text-xs font-sans font-normal text-gray-400">Aktif</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">Diizinkan masuk ke sistem</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-4.5 rounded-xl border border-gray-200/90 shadow-2xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-medium text-gray-500">Kepala Cabang</span>
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
              <Shield size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-bold font-mono text-gray-900 tracking-tight tabular-nums">
              {stats.managerCount} <span className="text-xs font-sans font-normal text-gray-400">Manager</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">Supervisor stok, promo &amp; void</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-4.5 rounded-xl border border-gray-200/90 shadow-2xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-medium text-gray-500">Staf Kasir</span>
            <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
              <UserCog size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-bold font-mono text-gray-900 tracking-tight tabular-nums">
              {stats.cashierCount} <span className="text-xs font-sans font-normal text-gray-400">Kasir</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">Operator POS penjualan &amp; buyback</p>
          </div>
        </div>
      </div>

      {/* Main Workspace Card */}
      <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
        {/* Toolbar Filter & Pencarian */}
        <div className="p-3.5 sm:p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(
              [
                { key: 'all', label: 'Semua Role', count: stats.totalUsers },
                { key: 'owner', label: 'Owner', count: undefined },
                { key: 'branch_manager', label: 'Kepala Cabang', count: stats.managerCount },
                { key: 'cashier', label: 'Kasir', count: stats.cashierCount },
              ] as const
            ).map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setRoleFilter(tab.key)}
                className={`h-8 px-3 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                  roleFilter === tab.key
                    ? 'bg-orange-500 text-white shadow-2xs'
                    : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200/80'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      roleFilter === tab.key
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Cari nama, username, email, shift..."
              className="w-full md:w-72"
            />
            {(searchQuery || roleFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setRoleFilter('all');
                }}
                className="h-8 px-2.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-600 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0"
                title="Reset filter"
              >
                <RotateCcw size={12} />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
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
              <tr className="bg-gray-50/80 border-b border-gray-200/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <SortableTh
                  label="Pengguna & Profil"
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
                  label="Jabatan (Role)"
                  sortKey="role"
                  currentSortBy={sortBy}
                  currentSortDir={sortDir}
                  onSort={key => handleHeaderSort(key, 'asc')}
                  className="py-3 px-4"
                />
                <th className="py-3 px-4">Jadwal Shift</th>
                <th className="py-3 px-4">Akses Outlet Cabang</th>
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
                  <td colSpan={7} className="py-14 text-center text-gray-400">
                    <Users size={36} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm font-semibold text-gray-700">
                      {isLoading ? 'Memuat daftar pengguna...' : 'Tidak ada akun pengguna yang sesuai filter'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                      {searchQuery
                        ? `Tidak ada hasil untuk kata kunci "${searchQuery}". Coba kata kunci lain atau reset filter.`
                        : 'Belum ada akun pengguna yang terdaftar untuk filter role ini.'}
                    </p>
                    {!isLoading && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingUser(null);
                          setIsModalOpen(true);
                        }}
                        className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors cursor-pointer border border-orange-200"
                      >
                        <Plus size={14} />
                        <span>Tambah Pengguna Baru</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                items.map(u => {
                  const meta = ROLE_META[u.role];
                  const isSelf = u.id === currentUser.id;
                  return (
                    <tr key={u.id} className="hover:bg-orange-50/20 transition-colors">
                      {/* 1. Pengguna & Profil */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                            {getInitials(u.fullName)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-gray-900 text-sm truncate">{u.fullName}</span>
                              {isSelf && (
                                <span className="text-[10px] font-bold bg-orange-100/70 text-orange-700 border border-orange-200 px-1.5 py-0.2 rounded">
                                  Anda
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                              <Mail size={11} className="text-gray-400 shrink-0" />
                              <span className="truncate">{u.email}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 2. Username */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold text-gray-700 bg-gray-100/80 px-2 py-0.5 rounded border border-gray-200/60">
                          @{u.username}
                        </span>
                      </td>

                      {/* 3. Role */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${meta.badgeClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`} />
                          <span>{meta.label}</span>
                        </span>
                      </td>

                      {/* 4. Shift */}
                      <td className="py-3 px-4 text-xs text-gray-600 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-50 border border-gray-200 text-gray-700 font-medium">
                          <Clock size={12} className="text-gray-400" />
                          <span>{u.shiftLabel}</span>
                        </span>
                      </td>

                      {/* 5. Akses Outlet */}
                      <td className="py-3 px-4 text-xs">
                        {formatAllowedTenants(u)}
                      </td>

                      {/* 6. Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${
                            u.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-gray-100 text-gray-500 border-gray-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.isActive ? 'bg-emerald-500' : 'bg-gray-400'
                            }`}
                          />
                          <span>{u.isActive ? 'Aktif' : 'Nonaktif'}</span>
                        </span>
                      </td>

                      {/* 7. Aksi */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          <Tooltip content="Edit Pengguna" side="top">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingUser(u);
                                setIsModalOpen(true);
                              }}
                              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-orange-50 text-gray-600 hover:text-orange-600 border border-gray-200 hover:border-orange-200 inline-flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
                              aria-label="Edit Pengguna"
                            >
                              <Pencil size={14} />
                            </button>
                          </Tooltip>

                          <Tooltip content={isSelf ? 'Tidak dapat menghapus akun sendiri' : 'Hapus Pengguna'} side="top">
                            <button
                              type="button"
                              disabled={isSelf}
                              onClick={() => setDeletingUser(u)}
                              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 border border-gray-200 hover:border-red-200 inline-flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-gray-100 disabled:hover:text-gray-600 disabled:active:scale-100"
                              aria-label="Hapus Pengguna"
                            >
                              <Trash2 size={14} />
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
            <div className="py-12 px-4 text-center text-xs text-gray-400">
              <Users size={32} className="mx-auto mb-2 text-gray-300" />
              {isLoading ? 'Memuat daftar pengguna...' : 'Tidak ada akun pengguna yang sesuai filter.'}
            </div>
          ) : (
            items.map(u => {
              const meta = ROLE_META[u.role];
              const isSelf = u.id === currentUser.id;
              return (
                <div key={u.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                        {getInitials(u.fullName)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-gray-900 truncate">{u.fullName}</p>
                          {isSelf && (
                            <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-1.5 py-0.2 rounded">
                              Anda
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-mono text-gray-500 truncate">@{u.username}</p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border shrink-0 ${meta.badgeClass}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`} />
                      <span>{meta.label}</span>
                    </span>
                  </div>

                  <div className="text-xs text-gray-600 space-y-1.5 bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-400">Email</span>
                      <span className="font-medium truncate text-gray-800">{u.email}</span>
                    </div>
                    <div className="flex justify-between gap-2 items-center">
                      <span className="text-gray-400">Shift</span>
                      <span className="font-medium text-gray-800">{u.shiftLabel}</span>
                    </div>
                    <div className="flex justify-between gap-2 items-center">
                      <span className="text-gray-400">Akses Outlet</span>
                      <div className="text-right">{formatAllowedTenants(u)}</div>
                    </div>
                    <div className="flex justify-between gap-2 items-center pt-1 border-t border-gray-200/60">
                      <span className="text-gray-400">Status</span>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold ${
                          u.isActive ? 'text-emerald-700' : 'text-gray-500'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            u.isActive ? 'bg-emerald-500' : 'bg-gray-400'
                          }`}
                        />
                        <span>{u.isActive ? 'Aktif' : 'Nonaktif'}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingUser(u);
                        setIsModalOpen(true);
                      }}
                      className="h-8 px-3 rounded-lg bg-gray-100 hover:bg-orange-50 text-gray-700 hover:text-orange-600 border border-gray-200 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Pencil size={13} />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      disabled={isSelf}
                      onClick={() => setDeletingUser(u)}
                      className="h-8 px-3 rounded-lg bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 border border-gray-200 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
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

        {/* Footer info & Pagination Controls */}
        <div className="p-3 bg-gray-50/70 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
          <div>
            Menampilkan <strong>{items.length}</strong> dari total <strong>{totalItems}</strong> pengguna terdaftar
          </div>
          <div className="text-gray-400 text-[11px]">
            Role Owner otomatis memiliki hak akses penuh ke seluruh outlet
          </div>
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
            ? `Apakah Anda yakin ingin menghapus akun "${deletingUser.fullName}" (@${deletingUser.username})? Sesi login pengguna tersebut akan langsung dihentikan dan hak akses dicabut.`
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
