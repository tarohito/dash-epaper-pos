import React, { useState, useEffect } from 'react';
import { X, User, Phone, CreditCard, Sparkles, MapPin, FileText, Save, AlertCircle, Loader2 } from 'lucide-react';
import { Customer } from '../../types';
import { CustomSelect } from '../common/CustomSelect';
import { useToast } from '../../contexts/ToastContext';
import {
  ModalShell,
  MODAL_FOOTER_END_CLASS,
  MODAL_BTN_SECONDARY_CLASS,
  MODAL_BTN_PRIMARY_CLASS,
} from '../common/ModalShell';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveCustomer: (customer: Customer) => Promise<void> | void;
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    setErrorMsg(null);
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

  const failValidation = (msg: string) => {
    setErrorMsg(msg);
    showToast('error', msg, 'Validasi Form Pelanggan');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const phoneDigits = cleanPhone.replace(/[^0-9]/g, '');
    const cleanNik = nik.trim().replace(/[^0-9]/g, '');

    if (!cleanName || cleanName.length < 2) {
      failValidation('Nama lengkap pelanggan wajib diisi (minimal 2 karakter).');
      return;
    }
    if (!cleanPhone) {
      failValidation('Nomor telepon / WhatsApp wajib diisi.');
      return;
    }
    if (phoneDigits.length < 8 || phoneDigits.length > 15) {
      failValidation('Format nomor telepon / WhatsApp tidak sesuai (8–15 digit angka).');
      return;
    }
    if (nik.trim() && cleanNik.length !== 16) {
      failValidation(`Nomor NIK / KTP harus tepat 16 digit angka (saat ini ${cleanNik.length} digit).`);
      return;
    }

    const memberCode = initialCustomer?.memberCode || `MBR-${String(Date.now()).slice(-4)}`;

    const saved: Customer = {
      id: initialCustomer?.id || `cust-${Date.now()}`,
      memberCode,
      name: cleanName,
      phone: cleanPhone,
      nik: cleanNik || undefined,
      type,
      preferredKadar,
      ringSize: ringSize.trim() || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: initialCustomer?.createdAt || new Date().toISOString().slice(0, 10),
      totalSpent: initialCustomer?.totalSpent || 0,
      totalTransactions: initialCustomer?.totalTransactions || 0,
    };

    setIsSubmitting(true);
    try {
      await onSaveCustomer(saved);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan data pelanggan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={initialCustomer ? 'Edit Data Pelanggan' : 'Tambah Pelanggan Baru'}
      subtitle={initialCustomer ? 'Perbarui profil dan kontak pelanggan' : 'Daftarkan data dan kontak pelanggan baru'}
      disableEscapeClose={isSubmitting}
      footer={
        <div className={MODAL_FOOTER_END_CLASS}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className={MODAL_BTN_SECONDARY_CLASS}
          >
            <X size={15} className="text-gray-500 shrink-0" />
            <span>Batal</span>
          </button>
          <button
            type="submit"
            form="customer-form"
            disabled={isSubmitting}
            className={MODAL_BTN_PRIMARY_CLASS}
          >
            {isSubmitting ? <Loader2 size={15} className="animate-spin shrink-0" /> : <Save size={15} className="shrink-0" />}
            <span>
              {isSubmitting ? 'Menyimpan...' : initialCustomer ? 'Simpan Perubahan' : 'Tambah Pelanggan'}
            </span>
          </button>
        </div>
      }
    >
      <form id="customer-form" noValidate onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
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
    </ModalShell>
  );
};
