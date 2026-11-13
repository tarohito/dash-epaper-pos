import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { Tenant } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import {
  ModalShell,
  MODAL_FOOTER_END_CLASS,
  MODAL_BTN_SECONDARY_CLASS,
  MODAL_BTN_PRIMARY_CLASS,
} from '../common/ModalShell';

interface RegisterTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTenant: (newTenant: Tenant) => Promise<void> | void;
}

export const RegisterTenantModal: React.FC<RegisterTenantModalProps> = ({
  isOpen,
  onClose,
  onSaveTenant,
}) => {
  const [name, setName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState<Tenant['plan']>('Enterprise Multi-Tenant');
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdTenant, setCreatedTenant] = useState<Tenant | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const failValidation = (msg: string) => {
    setErrorMsg(msg);
    showToast('error', msg, 'Validasi Form Outlet');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = name.trim();
    const cleanBranch = branchName.trim();
    const cleanPhone = phone.trim();
    const phoneDigits = cleanPhone.replace(/[^0-9]/g, '');
    const cleanEmail = email.trim();

    if (!cleanName || cleanName.length < 3) {
      failValidation('Nama bisnis / toko emas wajib diisi (minimal 3 karakter).');
      return;
    }
    if (!cleanBranch || cleanBranch.length < 3) {
      failValidation('Nama cabang utama wajib diisi (minimal 3 karakter).');
      return;
    }
    if (cleanPhone && (phoneDigits.length < 8 || phoneDigits.length > 15)) {
      failValidation('Format nomor WhatsApp / HP tidak sesuai (8–15 digit angka).');
      return;
    }
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      failValidation('Format alamat email toko tidak sesuai.');
      return;
    }

    const initials = cleanName
      .split(' ')
      .slice(0, 2)
      .map(w => w[0]?.toUpperCase() || '')
      .join('') || 'EP';

    const cleanSlug = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.epaper.id';
    const code = 'TEN-' + Math.floor(100 + Math.random() * 900);

    const newTenant: Tenant = {
      id: `tenant-${Date.now()}`,
      name: cleanName,
      code,
      branchName: cleanBranch,
      address: address.trim() || `Jl. Utama Bisnis No. 1, ${city.trim() || 'Indonesia'}`,
      city: city.trim() || 'Jakarta',
      plan,
      cashierCount: 2,
      productCount: 0,
      phone: cleanPhone || '0812-0000-0000',
      email: cleanEmail || `kontak@${cleanSlug}`,
      slug: cleanSlug,
      logoInitial: initials,
      databaseSchema: `tenant_db_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-4)}`,
      status: 'Aktif',
    };

    setIsSubmitting(true);
    try {
      await onSaveTenant(newTenant);
      setCreatedTenant(newTenant);
      setIsSuccess(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal mendaftarkan tenant baru.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => {
    setIsSuccess(false);
    setName('');
    setBranchName('');
    setCity('');
    setAddress('');
    setOwnerName('');
    setPhone('');
    setEmail('');
    onClose();
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={isSuccess && createdTenant ? handleFinish : onClose}
      size="md"
      title="Pendaftaran Outlet Baru"
      subtitle="Registrasi toko atau cabang baru dalam sistem"
      disableEscapeClose={isSubmitting}
      footer={
        isSuccess && createdTenant ? (
          <div className={MODAL_FOOTER_END_CLASS}>
            <button
              type="button"
              onClick={handleFinish}
              className={MODAL_BTN_PRIMARY_CLASS}
            >
              Mulai Gunakan Outlet Ini
            </button>
          </div>
        ) : (
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
              form="register-tenant-form"
              disabled={isSubmitting}
              className={MODAL_BTN_PRIMARY_CLASS}
            >
              {isSubmitting ? 'Mendaftarkan...' : 'Daftarkan Tenant'}
            </button>
          </div>
        )
      }
    >
      {isSuccess && createdTenant ? (
        <div className="py-2 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 size={36} />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">Selamat! Tenant Berhasil Terdaftar</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              Bisnis Anda telah resmi bergabung ke dalam cloud multi-tenant e.paper POS. Sistem kini aktif untuk tenant ini.
            </p>
          </div>

          <div className="bg-orange-50/70 border border-orange-200/80 rounded-lg p-4 text-left space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">Nama Bisnis:</span>
              <span className="font-bold text-gray-900">{createdTenant.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">Cabang Utama:</span>
              <span className="font-semibold text-gray-800">{createdTenant.branchName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">Kode Tenant:</span>
              <span className="font-mono font-bold text-orange-600">{createdTenant.code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">Domain POS:</span>
              <span className="font-mono text-gray-700">{createdTenant.slug}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">Paket Kemitraan:</span>
              <span className="font-semibold text-emerald-700">{createdTenant.plan}</span>
            </div>
          </div>
        </div>
      ) : (
        <form id="register-tenant-form" noValidate onSubmit={handleSubmit} className="space-y-3.5 text-xs sm:text-sm">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            <div className="bg-amber-50 border border-amber-200/80 rounded-md p-3 flex items-start gap-2.5 text-amber-900">
              <ShieldCheck size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs sm:text-sm">Multi-Tenant Cloud Isolation</p>
                <p className="text-xs text-amber-800/90 mt-0.5 leading-relaxed">
                  Setiap tenant toko emas memiliki database terisolasi, hak akses kasir terpisah, stok mandiri, dan laporan omzet real-time.
                </p>
              </div>
            </div>

            <div>
              <label className="font-semibold text-gray-800 block mb-1.5 text-xs sm:text-sm">
                Nama Bisnis / Toko Emas <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Cth: Toko Mas Berlian Abadi"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-orange-500 focus:bg-white text-sm font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-gray-800 block mb-1.5 text-xs sm:text-sm">
                  Nama Cabang Pertama <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Cth: Cabang Mall Kelapa Gading"
                  value={branchName}
                  onChange={e => setBranchName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-orange-500 focus:bg-white text-sm font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-800 block mb-1.5 text-xs sm:text-sm">Kota / Domisili Cabang</label>
                <input
                  type="text"
                  placeholder="Cth: Jakarta Utara"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-orange-500 focus:bg-white text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-gray-800 block mb-1.5 text-xs sm:text-sm">Alamat Lengkap Gerai / Outlet</label>
              <input
                type="text"
                placeholder="Cth: Jl. Boulevard Raya Blok M No. 8, Mall Kelapa Gading Lt. Dasar"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-orange-500 focus:bg-white text-sm font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-gray-800 block mb-1.5 text-xs sm:text-sm">Nama Pemilik / PIC</label>
                <input
                  type="text"
                  placeholder="Cth: Ibu Veronica"
                  value={ownerName}
                  onChange={e => setOwnerName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-orange-500 focus:bg-white text-sm font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-800 block mb-1.5 text-xs sm:text-sm">No. WhatsApp / HP</label>
                <input
                  type="tel"
                  placeholder="0812-xxxx-xxxx"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-orange-500 focus:bg-white text-sm font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-800 block mb-1.5 text-xs sm:text-sm">Email Toko</label>
                <input
                  type="email"
                  placeholder="admin@tokoemas.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-orange-500 focus:bg-white text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-gray-800 block mb-1.5 text-xs sm:text-sm">Pilihan Paket Kemitraan e.paper</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  {
                    id: 'Enterprise Multi-Tenant' as const,
                    title: 'Enterprise Multi-Tenant',
                    desc: 'Database terisolasi, unlimited cabang & kasir, analitik terpusat',
                    popular: true,
                  },
                  {
                    id: 'Pro Multi-Outlet' as const,
                    title: 'Pro Multi-Outlet',
                    desc: 'Mendukung hingga 5 cabang terintegrasi & sinkronisasi stok',
                    popular: false,
                  },
                ].map(item => (
                  <label
                    key={item.id}
                    className={`p-3 rounded-md border cursor-pointer transition-all flex flex-col justify-between ${
                      plan === item.id
                        ? 'border-orange-500 bg-orange-50/70 text-orange-950 font-bold'
                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-semibold">{item.title}</span>
                      <input
                        type="radio"
                        name="plan"
                        checked={plan === item.id}
                        onChange={() => setPlan(item.id)}
                        className="text-orange-600 focus:ring-orange-500"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 font-normal leading-relaxed">{item.desc}</p>
                  </label>
                ))}
              </div>
            </div>

        </form>
      )}
    </ModalShell>
  );
};
