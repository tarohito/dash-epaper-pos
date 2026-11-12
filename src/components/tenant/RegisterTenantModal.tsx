import React, { useState } from 'react';
import { X, Store, Sparkles, Building2, ShieldCheck, CheckCircle2 } from 'lucide-react';
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
        <div className="p-4 sm:p-5 bg-gradient-to-r from-orange-500 via-orange-600 to-red-500 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-md bg-white/20 flex items-center justify-center shrink-0">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                Pendaftaran Tenant e.paper POS
              </h2>
              <p className="text-[11px] text-orange-100 mt-0.5">
                Kembangkan bisnis perhiasan Anda bersama sistem Multi-Tenant e.paper
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
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
              <h3 className="text-lg font-black text-gray-900">Selamat! Tenant Berhasil Terdaftar</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Bisnis Anda telah resmi bergabung ke dalam cloud multi-tenant e.paper POS. Sistem kini aktif untuk tenant ini.
              </p>
            </div>

            <div className="bg-orange-50/70 border border-orange-200/80 rounded-lg p-4 text-left space-y-2 text-xs">
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
                <span className="font-bold text-emerald-700">{createdTenant.plan}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFinish}
              className="w-full py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-md transition-colors cursor-pointer"
            >
              Mulai Gunakan Tenant Ini Sekarang
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-xs">
            <div className="bg-amber-50 border border-amber-200/80 rounded-md p-3 flex items-start gap-2.5 text-amber-900">
              <ShieldCheck size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Multi-Tenant Cloud Isolation</p>
                <p className="text-[11px] text-amber-800/90 mt-0.5">
                  Setiap tenant toko emas memiliki database terisolasi, hak akses kasir terpisah, stok mandiri, dan laporan omzet real-time.
                </p>
              </div>
            </div>

            <div>
              <label className="font-bold text-gray-800 block mb-1">
                Nama Bisnis / Toko Emas <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Cth: Toko Mas Berlian Abadi"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-orange-500 focus:bg-white text-xs font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-gray-800 block mb-1">
                  Nama Cabang Pertama <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Cth: Cabang Mall Kelapa Gading"
                  value={branchName}
                  onChange={e => setBranchName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-orange-500 focus:bg-white text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-gray-800 block mb-1">Kota / Domisili Cabang</label>
                <input
                  type="text"
                  placeholder="Cth: Jakarta Utara"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-orange-500 focus:bg-white text-xs"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-gray-800 block mb-1">Alamat Lengkap Gerai / Outlet</label>
              <input
                type="text"
                placeholder="Cth: Jl. Boulevard Raya Blok M No. 8, Mall Kelapa Gading Lt. Dasar"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-orange-500 focus:bg-white text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-gray-800 block mb-1">Nama Pemilik / PIC</label>
                <input
                  type="text"
                  placeholder="Cth: Ibu Veronica"
                  value={ownerName}
                  onChange={e => setOwnerName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-orange-500 focus:bg-white text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-gray-800 block mb-1">No. WhatsApp / HP</label>
                <input
                  type="tel"
                  placeholder="0812-xxxx-xxxx"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-orange-500 focus:bg-white text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-gray-800 block mb-1">Email Toko</label>
                <input
                  type="email"
                  placeholder="admin@tokoemas.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-orange-500 focus:bg-white text-xs"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-gray-800 block mb-1.5">Pilihan Paket Kemitraan e.paper</label>
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
                    className={`p-2.5 rounded-md border cursor-pointer transition-all flex flex-col justify-between ${
                      plan === item.id
                        ? 'border-orange-500 bg-orange-50/70 text-orange-950 font-bold'
                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{item.title}</span>
                      <input
                        type="radio"
                        name="plan"
                        checked={plan === item.id}
                        onChange={() => setPlan(item.id)}
                        className="text-orange-600 focus:ring-orange-500"
                      />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 font-normal leading-tight">{item.desc}</p>
                  </label>
                ))}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-md transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-none"
              >
                <Store size={14} />
                Daftarkan Tenant Sekarang
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
