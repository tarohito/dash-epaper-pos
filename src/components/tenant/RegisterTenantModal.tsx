import React, { useState } from 'react';
import { X, Store, Building2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Tenant } from '../../types';

interface RegisterTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTenant: (newTenant: Tenant) => void;
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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !branchName.trim()) {
      alert('Mohon isi nama bisnis dan nama cabang utama.');
      return;
    }

    const initials = name
      .split(' ')
      .slice(0, 2)
      .map(w => w[0]?.toUpperCase() || '')
      .join('') || 'EP';

    const cleanSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.epaper.id';
    const code = 'TEN-' + Math.floor(100 + Math.random() * 900);

    const newTenant: Tenant = {
      id: `tenant-${Date.now()}`,
      name: name.trim(),
      code,
      branchName: branchName.trim(),
      address: address.trim() || `Jl. Utama Bisnis No. 1, ${city || 'Indonesia'}`,
      city: city.trim() || 'Jakarta',
      plan,
      cashierCount: 2,
      productCount: 0,
      phone: phone.trim() || '0812-0000-0000',
      email: email.trim() || `kontak@${cleanSlug}`,
      slug: cleanSlug,
      logoInitial: initials,
      databaseSchema: `tenant_db_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-4)}`,
      status: 'Aktif',
    };

    onSaveTenant(newTenant);
    setCreatedTenant(newTenant);
    setIsSuccess(true);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-lg border border-gray-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 bg-gray-50/80 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight leading-tight">
              Pendaftaran Toko / Cabang Baru
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Registrasi tenant atau cabang outlet baru dalam sistem
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors cursor-pointer"
            aria-label="Tutup Modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        {isSuccess && createdTenant ? (
          <div className="p-6 text-center space-y-4">
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

            <button
              type="button"
              onClick={handleFinish}
              className="w-full py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors cursor-pointer shadow-xs active:scale-[0.98]"
            >
              Mulai Gunakan Tenant Ini Sekarang
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-xs sm:text-sm">
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

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-4 text-xs sm:text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center shadow-xs"
              >
                Batal
              </button>
              <button
                type="submit"
                className="h-9 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <Store size={15} />
                Daftarkan Tenant Sekarang
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
