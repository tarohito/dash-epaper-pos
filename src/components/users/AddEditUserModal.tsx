import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { Tenant, UserAccount, UserCreatePayload, UserRole, UserUpdatePayload } from '../../types';
import {
  ModalShell,
  MODAL_FOOTER_END_CLASS,
  MODAL_BTN_SECONDARY_CLASS,
  MODAL_BTN_PRIMARY_CLASS,
} from '../common/ModalShell';
import { CustomSelect } from '../common/CustomSelect';
import { CustomCheckbox } from '../common/CustomCheckbox';

interface AddEditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingUser: UserAccount | null;
  currentUserId: string;
  tenants: Tenant[];
  onSaveUser: (
    payload: UserCreatePayload | UserUpdatePayload,
    editId?: string
  ) => Promise<void>;
}

const ROLE_OPTIONS = [
  { value: 'cashier', label: 'Kasir (Frontline POS & Buyback)' },
  { value: 'branch_manager', label: 'Kepala Cabang (Stok, Promo & Void)' },
  { value: 'owner', label: 'Owner (Akses Penuh Semua Outlet)' },
];

const SHIFT_PRESETS = [
  'Shift 1 (08:00 - 16:00)',
  'Shift 2 (13:00 - 21:00)',
  'Full Day (09:00 - 21:00)',
  'Full Day (Owner)',
];

export const AddEditUserModal: React.FC<AddEditUserModalProps> = ({
  isOpen,
  onClose,
  editingUser,
  currentUserId,
  tenants,
  onSaveUser,
}) => {
  const isEdit = !!editingUser;
  const isEditingSelf = !!editingUser && editingUser.id === currentUserId;

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('cashier');
  const [shiftLabel, setShiftLabel] = useState('Shift 1 (08:00 - 16:00)');
  const [allowedTenantIds, setAllowedTenantIds] = useState<string[]>([]);
  const [defaultTenantId, setDefaultTenantId] = useState<string>('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFormError(null);
    setShowPassword(false);

    if (editingUser) {
      setUsername(editingUser.username);
      setEmail(editingUser.email);
      setFullName(editingUser.fullName);
      setPassword('');
      setRole(editingUser.role);
      setShiftLabel(editingUser.shiftLabel || 'Shift 1 (08:00 - 16:00)');
      setAllowedTenantIds(editingUser.allowedTenantIds ?? []);
      setDefaultTenantId(editingUser.defaultTenantId || editingUser.allowedTenantIds?.[0] || tenants[0]?.id || '');
      setIsActive(editingUser.isActive);
    } else {
      const firstId = tenants[0]?.id ?? '';
      setUsername('');
      setEmail('');
      setFullName('');
      setPassword('');
      setRole('cashier');
      setShiftLabel('Shift 1 (08:00 - 16:00)');
      setAllowedTenantIds(firstId ? [firstId] : []);
      setDefaultTenantId(firstId);
      setIsActive(true);
    }
  }, [isOpen, editingUser, tenants]);

  const handleToggleTenant = (tenantId: string) => {
    setAllowedTenantIds(prev => {
      const exists = prev.includes(tenantId);
      const next = exists ? prev.filter(id => id !== tenantId) : [...prev, tenantId];
      if (!next.includes(defaultTenantId)) {
        setDefaultTenantId(next[0] ?? '');
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!isEdit && !/^[a-z0-9._-]{3,32}$/i.test(username.trim())) {
      setFormError('Username wajib 3-32 karakter (huruf, angka, titik, garis bawah, atau strip).');
      return;
    }
    if (!fullName.trim()) {
      setFormError('Nama lengkap pengguna wajib diisi.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setFormError('Alamat email tidak valid.');
      return;
    }
    if (!isEdit && password.trim().length < 6) {
      setFormError('Kata sandi akun baru minimal 6 karakter.');
      return;
    }
    if (isEdit && password.trim().length > 0 && password.trim().length < 6) {
      setFormError('Kata sandi baru minimal 6 karakter.');
      return;
    }
    if (role !== 'owner' && allowedTenantIds.length === 0) {
      setFormError('Pilih minimal 1 outlet cabang yang diizinkan untuk akun ini.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEdit && editingUser) {
        const updatePayload: UserUpdatePayload = {
          email: email.trim().toLowerCase(),
          fullName: fullName.trim(),
          role,
          shiftLabel: shiftLabel.trim() || 'Shift 1 (08:00 - 16:00)',
          allowedTenantIds: role === 'owner' ? [] : allowedTenantIds,
          defaultTenantId:
            role === 'owner'
              ? defaultTenantId || tenants[0]?.id
              : allowedTenantIds.includes(defaultTenantId)
              ? defaultTenantId
              : allowedTenantIds[0],
          isActive,
        };
        if (password.trim().length > 0) {
          updatePayload.password = password.trim();
        }
        await onSaveUser(updatePayload, editingUser.id);
      } else {
        const createPayload: UserCreatePayload = {
          username: username.trim().toLowerCase(),
          email: email.trim().toLowerCase(),
          fullName: fullName.trim(),
          password: password.trim(),
          role,
          shiftLabel: shiftLabel.trim() || 'Shift 1 (08:00 - 16:00)',
          allowedTenantIds: role === 'owner' ? [] : allowedTenantIds,
          defaultTenantId:
            role === 'owner'
              ? defaultTenantId || tenants[0]?.id
              : allowedTenantIds.includes(defaultTenantId)
              ? defaultTenantId
              : allowedTenantIds[0],
          isActive,
        };
        await onSaveUser(createPayload);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan data pengguna.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const defaultOutletOptions = (role === 'owner' ? tenants : tenants.filter(t => allowedTenantIds.includes(t.id))).map(
    t => ({
      value: t.id,
      label: `${t.code} - ${t.name}`,
      sublabel: t.branchName,
    })
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={isEdit ? `Edit Akun: ${editingUser?.fullName}` : 'Tambah Pengguna & Hak Akses Baru'}
      subtitle="Atur identitas login, jabatan (role), jadwal shift, serta cabang outlet yang boleh diakses."
      disableEscapeClose={isSubmitting}
      footer={
        <div className={MODAL_FOOTER_END_CLASS}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className={MODAL_BTN_SECONDARY_CLASS}
          >
            Batal
          </button>
          <button
            type="submit"
            form="add-edit-user-form"
            disabled={isSubmitting}
            className={MODAL_BTN_PRIMARY_CLASS}
          >
            {isSubmitting && <Loader2 size={15} className="animate-spin" />}
            <span>{isEdit ? 'Simpan Perubahan' : 'Buat Akun Pengguna'}</span>
          </button>
        </div>
      }
    >
      <form id="add-edit-user-form" onSubmit={handleSubmit} className="space-y-4.5">
        {formError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
            <span>{formError}</span>
          </div>
        )}

        {/* Section 1: Profil & Kredensial Login */}
        <div className="space-y-3">
          <div className="pb-1 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              1. Identitas &amp; Kredensial Login
            </span>
            <span className="text-xs text-gray-400 font-medium">Wajib diisi</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Contoh: Siti Nurhaliza"
                className="w-full h-9 px-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Username Login <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={username}
                disabled={isEdit}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                placeholder="contoh: kasir.sby"
                className="w-full h-9 px-3 text-sm font-mono bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Email Staf <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nama@tokomas.id"
                className="w-full h-9 px-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {isEdit ? 'Kata Sandi Baru (Opsional)' : 'Kata Sandi'}{' '}
                {!isEdit && <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={isEdit ? 'Kosongkan jika tidak diubah' : 'Minimal 6 karakter'}
                  className="w-full h-9 pl-3 pr-9 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
                  aria-label="Toggle kata sandi"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Role & Jadwal Shift */}
        <div className="space-y-3 pt-1">
          <div className="pb-1 border-b border-gray-100">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              2. Peran &amp; Jadwal Kerja
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Role / Jabatan <span className="text-red-500">*</span>
              </label>
              <CustomSelect
                value={role}
                disabled={isEditingSelf}
                onChange={val => setRole(val as UserRole)}
                options={ROLE_OPTIONS}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Jadwal Shift Kerja
              </label>
              <CustomSelect
                value={SHIFT_PRESETS.includes(shiftLabel) ? shiftLabel : 'Shift 1 (08:00 - 16:00)'}
                onChange={setShiftLabel}
                options={SHIFT_PRESETS}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Outlet Access Control */}
        <div className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-200/80 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                3. Hak Akses Outlet / Cabang
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {role === 'owner'
                  ? 'Role Owner otomatis memiliki akses penuh ke seluruh outlet yang terdaftar.'
                  : 'Centang outlet cabang yang diizinkan untuk login dan operasional akun ini.'}
              </p>
            </div>
          </div>

          {role === 'owner' ? (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-orange-50 border border-orange-200/80 text-orange-800 text-xs font-medium">
              <ShieldCheck size={16} className="text-orange-600 shrink-0" />
              <span>Akses Global Aktif (Semua {tenants.length} outlet &amp; seluruh fitur manajemen)</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {tenants.map(t => {
                const checked = allowedTenantIds.includes(t.id);
                return (
                  <label
                    key={t.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      checked
                        ? 'bg-orange-50/70 border-orange-300 text-gray-900 shadow-2xs'
                        : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <CustomCheckbox
                      checked={checked}
                      onChange={() => handleToggleTenant(t.id)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-bold text-gray-800">{t.code}</span>
                        <span className="text-xs font-semibold truncate">{t.name}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{t.branchName}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          {defaultOutletOptions.length > 0 && (
            <div className="pt-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Outlet Awal Saat Login
              </label>
              <CustomSelect
                value={defaultOutletOptions.some(o => o.value === defaultTenantId) ? defaultTenantId : defaultOutletOptions[0].value}
                onChange={setDefaultTenantId}
                options={defaultOutletOptions}
              />
            </div>
          )}
        </div>

        {/* Section 4: Account Active Status */}
        <label
          className={`flex items-center justify-between gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
            isActive ? 'bg-emerald-50/40 border-emerald-200/80' : 'bg-gray-50 border-gray-200'
          } ${isEditingSelf ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          <div>
            <p className="text-xs font-bold text-gray-800">Status Akun Aktif</p>
            <p className="text-xs text-gray-500">
              {isEditingSelf
                ? 'Anda tidak dapat menonaktifkan akun yang sedang digunakan.'
                : 'Akun nonaktif langsung ditolak saat login dan sesi aktifnya dicabut.'}
            </p>
          </div>
          <CustomCheckbox
            disabled={isEditingSelf}
            checked={isActive}
            onChange={setIsActive}
          />
        </label>
      </form>
    </ModalShell>
  );
};
