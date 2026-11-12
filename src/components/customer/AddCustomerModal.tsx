import React, { useState, useEffect } from 'react';
import { X, User, Phone, CreditCard, Sparkles, MapPin, FileText, Save } from 'lucide-react';
import { Customer } from '../../types';
import { CustomSelect } from '../common/CustomSelect';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveCustomer: (customer: Customer) => void;
  initialCustomer?: Customer | null;
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  isOpen,
  onClose,
  onSaveCustomer,
  initialCustomer,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [nik, setNik] = useState('');
  const [type, setType] = useState<'Reguler' | 'VIP' | 'Mitra / Toko'>('Reguler');
  const [preferredKadar, setPreferredKadar] = useState('22K (91.6%)');
  const [ringSize, setRingSize] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialCustomer) {
      setName(initialCustomer.name || '');
      setPhone(initialCustomer.phone || '');
      setNik(initialCustomer.nik || '');
      setType(initialCustomer.type || 'Reguler');
      setPreferredKadar(initialCustomer.preferredKadar || '22K (91.6%)');
      setRingSize(initialCustomer.ringSize || '');
      setAddress(initialCustomer.address || '');
      setNotes(initialCustomer.notes || '');
    } else {
      setName('');
      setPhone('');
      setNik('');
      setType('Reguler');
      setPreferredKadar('22K (91.6%)');
      setRingSize('');
      setAddress('');
      setNotes('');
    }
  }, [initialCustomer, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Nama pelanggan wajib diisi.');
      return;
    }
    if (!phone.trim()) {
      alert('Nomor telepon / WhatsApp wajib diisi.');
      return;
    }

    const memberCode = initialCustomer?.memberCode || `MBR-${String(Date.now()).slice(-4)}`;

    const saved: Customer = {
      id: initialCustomer?.id || `cust-${Date.now()}`,
      memberCode,
      name: name.trim(),
      phone: phone.trim(),
      nik: nik.trim() || undefined,
      type,
      preferredKadar,
      ringSize: ringSize.trim() || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: initialCustomer?.createdAt || new Date().toISOString().slice(0, 10),
      totalSpent: initialCustomer?.totalSpent || 0,
      totalTransactions: initialCustomer?.totalTransactions || 0,
    };

    onSaveCustomer(saved);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-lg border border-gray-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh] shadow-2xl">
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/80 shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
              {initialCustomer ? 'Edit Data Pelanggan' : 'Tambah Pelanggan Baru'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Registrasi member dan identitas pelanggan perhiasan
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <form id="customer-form" onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Section 1: Identitas & Kontak */}
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
              1. Identitas & Kontak Utama
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                  Nama Lengkap Pelanggan <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Contoh: Ibu Hj. Ratna Dewi"
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-sm font-medium focus:bg-white focus:outline-none focus:border-orange-500 min-h-[38px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                  No. Telepon / WhatsApp <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="0812xxxxxxxx"
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-sm font-medium focus:bg-white focus:outline-none focus:border-orange-500 min-h-[38px]"
                  />
                </div>
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs sm:text-sm font-semibold text-gray-700">
                  NIK / No. KTP <span className="text-gray-400 font-normal">(Disarankan Toko Emas)</span>
                </label>
                <span className="text-xs text-gray-400">Verifikasi Buyback & Transaksi</span>
              </div>
              <div className="relative">
                <CreditCard size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  maxLength={16}
                  value={nik}
                  onChange={e => setNik(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="16 Digit NIK KTP (opsional)"
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-sm font-medium focus:bg-white focus:outline-none focus:border-orange-500 min-h-[38px] font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Tipe Member & Preferensi Perhiasan Toko Emas */}
          <div className="pt-2 border-t border-gray-100">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
              2. Kategori Member & Preferensi Emas
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                  Tipe Member
                </label>
                <CustomSelect
                  value={type}
                  onChange={val => setType(val as 'Reguler' | 'VIP' | 'Mitra / Toko')}
                  options={[
                    { value: 'Reguler', label: 'Reguler (Umum)' },
                    { value: 'VIP', label: 'Member VIP (Loyal)' },
                    { value: 'Mitra / Toko', label: 'Mitra / Toko Lain' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                  Kadar Emas Favorit
                </label>
                <CustomSelect
                  value={preferredKadar}
                  onChange={val => setPreferredKadar(val)}
                  icon={<Sparkles size={15} className="text-orange-500" />}
                  options={[
                    { value: '24K (99.9%)', label: '24K (99.9% Murni)' },
                    { value: '22K (91.6%)', label: '22K (91.6% Tua)' },
                    { value: '18K (75.0%)', label: '18K (75.0% Sedang)' },
                    { value: '16K (70.0%)', label: '16K (70.0% Muda)' },
                    { value: 'Berlian & Permata', label: 'Berlian & Permata' },
                    { value: 'Semua Kadar', label: 'Semua Kadar' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                  Ukuran Cincin / Jari
                </label>
                <input
                  type="text"
                  value={ringSize}
                  onChange={e => setRingSize(e.target.value)}
                  placeholder="Misal: Size 14 / 16"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-sm font-medium focus:bg-white focus:outline-none focus:border-orange-500 min-h-[38px]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Alamat & Catatan Pelanggan */}
          <div className="pt-2 border-t border-gray-100">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
              3. Alamat Domisili & Catatan
            </span>
            <div className="space-y-3">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                  Alamat Lengkap / Kota Domisili
                </label>
                <div className="relative">
                  <MapPin size={15} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Contoh: Jl. Riau No. 45, Bandung"
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-sm font-medium focus:bg-white focus:outline-none focus:border-orange-500 min-h-[38px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                  Catatan Toko / Riwayat Khusus
                </label>
                <div className="relative">
                  <FileText size={15} className="absolute left-3 top-3 text-gray-400" />
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Contoh: Suka perhiasan kalung rantai, langganan arisan, tanggal ulang tahun, dsb."
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm font-medium focus:bg-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer Modal */}
        <div className="p-4 sm:p-5 border-t border-gray-100 flex items-center justify-end gap-2.5 bg-gray-50/70 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 text-xs sm:text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center shadow-xs"
          >
            <X size={15} className="mr-1.5 text-gray-500" />
            <span>Batal</span>
          </button>
          <button
            type="submit"
            form="customer-form"
            className="h-9 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors cursor-pointer shadow-xs inline-flex items-center justify-center gap-1.5 active:scale-[0.98]"
          >
            <Save size={15} />
            <span>{initialCustomer ? 'Simpan Perubahan' : 'Tambah Pelanggan'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
