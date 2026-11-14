import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
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

const KADAR_OPTIONS = [
  { value: '24K (99.9%)', label: '24K (99.9% - Murni / LM)' },
  { value: '22K (91.6%)', label: '22K (91.6% - Emas Tua)' },
  { value: '18K (75.0%)', label: '18K (75.0% - Standar)' },
  { value: '17K (75.0%)', label: '17K (75.0% - Perhiasan)' },
  { value: '16K (70.0%)', label: '16K (70.0% - Kadar 700)' },
  { value: '9K (37.5%)', label: '9K (37.5% - Emas Muda)' },
  { value: 'Berlian & Permata', label: 'Berlian & Permata' },
  { value: 'Semua Kadar', label: 'Semua Kadar' },
];

const GOLD_COLOR_OPTIONS = [
  { value: 'Semua Warna', label: 'Semua Warna Emas' },
  { value: 'Kuning (Yellow Gold)', label: 'Kuning (Yellow Gold)' },
  { value: 'Putih (White Gold)', label: 'Putih (White Gold)' },
  { value: 'Rose Gold', label: 'Rose Gold' },
  { value: 'Kombinasi', label: 'Kombinasi (Two-Tone)' },
];

const INPUT_CLASS =
  'w-full h-10 sm:h-11 px-3.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all';

const LABEL_CLASS = 'block text-xs font-semibold text-gray-700 mb-1.5';

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  isOpen,
  onClose,
  onSaveCustomer,
  initialCustomer,
}) => {
  const [memberCode, setMemberCode] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [nik, setNik] = useState('');
  const [npwp, setNpwp] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [type, setType] = useState<'Reguler' | 'VIP' | 'Mitra / Toko'>('Reguler');
  const [preferredKadar, setPreferredKadar] = useState('22K (91.6%)');
  const [goldColor, setGoldColor] = useState('Semua Warna');
  const [ringSize, setRingSize] = useState('');
  const [braceletSize, setBraceletSize] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    if (initialCustomer) {
      setMemberCode(initialCustomer.memberCode || '');
      setName(initialCustomer.name || '');
      setPhone(initialCustomer.phone || '');
      setNik(initialCustomer.nik || '');
      setNpwp(initialCustomer.npwp || '');
      setBirthDate(initialCustomer.birthDate || '');
      setType(initialCustomer.type || 'Reguler');
      setPreferredKadar(initialCustomer.preferredKadar || '22K (91.6%)');
      setGoldColor(initialCustomer.goldColor || 'Semua Warna');
      setRingSize(initialCustomer.ringSize || '');
      setBraceletSize(initialCustomer.braceletSize || '');
      setAddress(initialCustomer.address || '');
      setNotes(initialCustomer.notes || '');
    } else {
      setMemberCode('');
      setName('');
      setPhone('');
      setNik('');
      setNpwp('');
      setBirthDate('');
      setType('Reguler');
      setPreferredKadar('22K (91.6%)');
      setGoldColor('Semua Warna');
      setRingSize('');
      setBraceletSize('');
      setAddress('');
      setNotes('');
    }
  }, [initialCustomer, isOpen]);

  const failValidation = (msg: string) => {
    setErrorMsg(msg);
    showToast('error', msg, 'Validasi Form Member');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanCode = initialCustomer?.memberCode?.trim().toUpperCase() || '';
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const phoneDigits = cleanPhone.replace(/[^0-9]/g, '');
    const cleanNik = nik.trim().replace(/[^0-9]/g, '');
    const cleanNpwp = npwp.trim().replace(/[^0-9]/g, '');

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
    if (cleanNik.length !== 16) {
      failValidation(
        cleanNik.length === 0
          ? 'NIK / No. KTP wajib diisi (16 digit angka sebagai identitas unik pelanggan).'
          : `Nomor NIK / KTP harus tepat 16 digit angka (saat ini ${cleanNik.length} digit).`
      );
      return;
    }
    if (npwp.trim() && cleanNpwp.length !== 15 && cleanNpwp.length !== 16) {
      failValidation(`Nomor NPWP harus 15 atau 16 digit angka (saat ini ${cleanNpwp.length} digit).`);
      return;
    }

    const saved: Customer = {
      id: initialCustomer?.id || `cust-${Date.now()}`,
      memberCode: cleanCode,
      name: cleanName,
      phone: cleanPhone,
      nik: cleanNik || undefined,
      npwp: cleanNpwp || undefined,
      type,
      preferredKadar,
      goldColor: goldColor === 'Semua Warna' ? undefined : goldColor,
      ringSize: ringSize.trim() || undefined,
      braceletSize: braceletSize.trim() || undefined,
      birthDate: birthDate.trim() || undefined,
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
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan data member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={initialCustomer ? 'Edit Data Pelanggan' : 'Tambah Pelanggan Baru'}
      subtitle={
        initialCustomer
          ? 'Perbarui identitas KYC dan preferensi perhiasan pelanggan'
          : 'Lengkapi identitas KYC dan preferensi perhiasan pelanggan'
      }
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
            form="customer-form"
            disabled={isSubmitting}
            className={MODAL_BTN_PRIMARY_CLASS}
          >
            {isSubmitting
              ? 'Menyimpan...'
              : initialCustomer
              ? 'Simpan Perubahan'
              : 'Simpan Pelanggan'}
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

        {/* Section 1: Identitas & Verifikasi KYC */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Identitas &amp; Kontak KYC
            </span>
            <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
              Kode: {initialCustomer ? memberCode : 'Otomatis Sistem'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6">
              <label className={LABEL_CLASS}>
                Nama Lengkap (Sesuai KTP) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Contoh: Ibu Hj. Ratna Dewi"
                className={INPUT_CLASS}
              />
            </div>

            <div className="sm:col-span-3">
              <label className={LABEL_CLASS}>
                No. WhatsApp / HP <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="0812xxxxxxxx"
                className={`${INPUT_CLASS} font-mono`}
              />
            </div>

            <div className="sm:col-span-3">
              <label className={LABEL_CLASS}>Kategori Member</label>
              <CustomSelect
                value={type}
                onChange={val => setType(val as 'Reguler' | 'VIP' | 'Mitra / Toko')}
                options={[
                  { value: 'Reguler', label: 'Reguler' },
                  { value: 'VIP', label: 'Member VIP' },
                  { value: 'Mitra / Toko', label: 'Mitra / Toko' },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-5">
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <label className="block text-xs font-semibold text-gray-700">
                  NIK / No. KTP <span className="text-red-500">*</span>
                </label>
                <span
                  className={`text-xs font-mono ${
                    nik.length === 16 ? 'text-emerald-600 font-semibold' : 'text-gray-400'
                  }`}
                >
                  {nik.length}/16
                </span>
              </div>
              <input
                type="text"
                required
                maxLength={16}
                value={nik}
                onChange={e => setNik(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="16 digit NIK unik"
                className={`${INPUT_CLASS} font-mono`}
              />
            </div>

            <div className="sm:col-span-4">
              <label className={LABEL_CLASS}>
                NPWP <span className="text-gray-400 font-normal">(Opsional)</span>
              </label>
              <input
                type="text"
                maxLength={16}
                value={npwp}
                onChange={e => setNpwp(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="15 / 16 digit"
                className={`${INPUT_CLASS} font-mono`}
              />
            </div>

            <div className="sm:col-span-3">
              <label className={LABEL_CLASS}>Tanggal Lahir</label>
              <input
                type="date"
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div>
            <label className={LABEL_CLASS}>Alamat Domisili</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Contoh: Jl. Riau No. 45, Bandung"
              className={INPUT_CLASS}
            />
          </div>
        </div>

        {/* Section 2: Preferensi Perhiasan & Ukuran */}
        <div className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-200/80 space-y-3">
          <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
            Preferensi Perhiasan &amp; Ukuran
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLASS}>Kadar Emas Favorit</label>
              <CustomSelect
                value={preferredKadar}
                onChange={setPreferredKadar}
                options={KADAR_OPTIONS}
              />
            </div>

            <div>
              <label className={LABEL_CLASS}>Warna Emas Favorit</label>
              <CustomSelect
                value={goldColor}
                onChange={setGoldColor}
                options={GOLD_COLOR_OPTIONS}
              />
            </div>

            <div>
              <label className={LABEL_CLASS}>Ukuran Cincin (Ring Size)</label>
              <input
                type="text"
                value={ringSize}
                onChange={e => setRingSize(e.target.value)}
                placeholder="Contoh: 14 atau 16"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className={LABEL_CLASS}>Ukuran Gelang / Panjang Kalung</label>
              <input
                type="text"
                value={braceletSize}
                onChange={e => setBraceletSize(e.target.value)}
                placeholder="Contoh: 16 cm / 45 cm"
                className={INPUT_CLASS}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Catatan Khusus */}
        <div>
          <label className={LABEL_CLASS}>Catatan Preferensi &amp; Riwayat</label>
          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Contoh: Suka kalung rantai nori, kolektor LM Antam rutin, alergi rhodium, dsb."
            className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          />
        </div>
      </form>
    </ModalShell>
  );
};
