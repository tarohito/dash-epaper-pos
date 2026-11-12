import React, { useState, useEffect } from 'react';
import { X, ChevronDown, User, Phone, CreditCard, Sparkles, MapPin, FileText } from 'lucide-react';
import { Customer } from '../../types';

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
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-orange-50 text-orange-600 rounded-lg border border-orange-100">
              <User size={18} />
            </span>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">
                {initialCustomer ? 'Edit Data Pelanggan' : 'Tambah Pelanggan Toko Emas'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Standar registrasi member & kepatuhan data transaksi perhiasan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <form id="customer-form" onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Section 1: Identitas & Kontak */}
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
              1. Identitas & Kontak Utama
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nama Lengkap Pelanggan <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Contoh: Ibu Hj. Ratna Dewi"
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs font-medium focus:bg-white focus:outline-none focus:border-orange-500 min-h-[38px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  No. Telepon / WhatsApp <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="0812xxxxxxxx"
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs font-medium focus:bg-white focus:outline-none focus:border-orange-500 min-h-[38px]"
                  />
                </div>
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-700">
                  NIK / No. KTP <span className="text-gray-400 font-normal">(Disarankan Toko Emas)</span>
                </label>
                <span className="text-[10px] text-gray-400">Verifikasi Buyback & Transaksi Bernilai Tinggi</span>
              </div>
              <div className="relative">
                <CreditCard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  maxLength={16}
                  value={nik}
                  onChange={e => setNik(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="16 Digit NIK KTP (opsional)"
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs font-medium focus:bg-white focus:outline-none focus:border-orange-500 min-h-[38px] font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Tipe Member & Preferensi Perhiasan Toko Emas */}
          <div className="pt-2 border-t border-gray-100">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
              2. Kategori Member & Preferensi Emas
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tipe Member
                </label>
                <div className="relative">
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as 'Reguler' | 'VIP' | 'Mitra / Toko')}
                    className="w-full appearance-none px-3 py-2 pr-8 bg-gray-50 border border-gray-200 rounded-md text-xs font-semibold text-gray-800 focus:bg-white focus:outline-none focus:border-orange-500 min-h-[38px] cursor-pointer"
                  >
                    <option value="Reguler">Reguler (Umum)</option>
                    <option value="VIP">Member VIP (Loyal)</option>
                    <option value="Mitra / Toko">Mitra / Toko Lain</option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Kadar Emas Favorit
                </label>
                <div className="relative">
                  <Sparkles size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500" />
                  <select
                    value={preferredKadar}
                    onChange={e => setPreferredKadar(e.target.value)}
                    className="w-full appearance-none pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs font-medium text-gray-800 focus:bg-white focus:outline-none focus:border-orange-500 min-h-[38px] cursor-pointer"
                  >
                    <option value="24K (99.9%)">24K (99.9% Murni)</option>
                    <option value="22K (91.6%)">22K (91.6% Tua)</option>
                    <option value="18K (75.0%)">18K (75.0% Sedang)</option>
                    <option value="16K (70.0%)">16K (70.0% Muda)</option>
                    <option value="Berlian & Permata">Berlian & Permata</option>
                    <option value="Semua Kadar">Semua Kadar</option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Ukuran Cincin / Jari
                </label>
                <input
                  type="text"
                  value={ringSize}
                  onChange={e => setRingSize(e.target.value)}
                  placeholder="Misal: Size 14 / 16"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs font-medium focus:bg-white focus:outline-none focus:border-orange-500 min-h-[38px]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Alamat & Catatan Pelanggan */}
          <div className="pt-2 border-t border-gray-100">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
              3. Alamat Domisili & Catatan
            </span>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Alamat Lengkap / Kota Domisili
                </label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Contoh: Jl. Riau No. 45, Bandung"
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs font-medium focus:bg-white focus:outline-none focus:border-orange-500 min-h-[38px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Catatan Toko / Riwayat Khusus
                </label>
                <div className="relative">
                  <FileText size={14} className="absolute left-3 top-3 text-gray-400" />
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Contoh: Suka perhiasan kalung rantai, langganan arisan, tanggal ulang tahun, dsb."
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs font-medium focus:bg-white focus:outline-none focus:border-orange-500"
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
            className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-100 font-semibold text-xs rounded-md transition-colors cursor-pointer min-h-[38px]"
          >
            Batal
          </button>
          <button
            type="submit"
            form="customer-form"
            className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-md transition-colors cursor-pointer shadow-none min-h-[38px] flex items-center gap-1.5"
          >
            <span>{initialCustomer ? 'Simpan Perubahan' : 'Tambah Pelanggan'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
