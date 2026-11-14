import React, { useState, useEffect } from 'react';
import {
  User,
  CreditCard,
  Phone,
  MapPin,
  Upload,
  FileText,
  AlertCircle,
  Plus,
  Trash2,
  Printer,
  Save,
  Loader2,
} from 'lucide-react';
import { BuybackCreatePayload, BuybackGoldItem, BuybackItem } from '../../types';
import { formatIDR } from '../../utils/formatters';
import { KADAR_PRESETS } from '../../constants/kadar';
import { CustomSelect } from '../common/CustomSelect';
import { NumericInput } from '../common/NumericInput';
import { ConfirmModal } from '../common/ConfirmModal';
import { useToast } from '../../contexts/ToastContext';
import { CustomerLookupPicker, LinkedCustomerSummary } from '../customer/CustomerLookupPicker';

interface BuybackFormPageProps {
  onSaveBuyback: (newBuyback: BuybackCreatePayload, editId?: string) => Promise<void> | void;
  onCancel: () => void;
  editingItem?: BuybackItem | null;
  initialCustomer?: { id?: string; name: string; phone: string; nik?: string; address?: string } | null;
  existingCount?: number;
  branchName?: string;
  cashierName?: string;
}

export const BuybackFormPage: React.FC<BuybackFormPageProps> = ({
  onSaveBuyback,
  onCancel,
  editingItem,
  initialCustomer,
  existingCount = 0,
  branchName = 'e.paper Flagship Store - G-Walk Citraland',
  cashierName = 'Admin Kasir (Gold Advisor)',
}) => {
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<BuybackGoldItem | null>(null);
  const { showToast } = useToast();

  // Generate Live Transaction Info
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [invoiceNoCode, setInvoiceNoCode] = useState('');

  useEffect(() => {
    if (editingItem) {
      setCurrentDateTime(editingItem.date);
      setInvoiceNoCode(editingItem.invoiceNo);
      return;
    }
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const timeFormatted = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
    setCurrentDateTime(`${dateFormatted}, ${timeFormatted}`);

    const pad = (n: number) => n.toString().padStart(2, '0');
    const code = `BB-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${(existingCount + 1).toString().padStart(3, '0')}`;
    setInvoiceNoCode(code);
  }, [existingCount, editingItem]);

  // Bagian A: Data Penjual (Nasabah)
  const [selectedCustomer, setSelectedCustomer] = useState<LinkedCustomerSummary | null>(() => {
    if (editingItem?.customerId) {
      return {
        id: editingItem.customerId,
        name: editingItem.customerName,
        phone: editingItem.customerPhone,
      };
    }
    if (initialCustomer?.id) {
      return {
        id: initialCustomer.id,
        name: initialCustomer.name,
        phone: initialCustomer.phone,
      };
    }
    return null;
  });
  const [saveToCustomerMaster, setSaveToCustomerMaster] = useState<boolean>(true);
  const [customerName, setCustomerName] = useState(editingItem?.customerName || initialCustomer?.name || '');
  const [customerNik, setCustomerNik] = useState(editingItem?.customerNik || initialCustomer?.nik || '');
  const [customerNpwp, setCustomerNpwp] = useState(editingItem?.customerNpwp || '');
  const [customerPhone, setCustomerPhone] = useState(editingItem?.customerPhone || initialCustomer?.phone || '');
  const [customerAddress, setCustomerAddress] = useState(editingItem?.customerAddress || initialCustomer?.address || '');

  // Bagian B: Detail Item Emas (Repeater)
  const [items, setItems] = useState<BuybackGoldItem[]>(() => {
    if (editingItem?.items && editingItem.items.length > 0) {
      return editingItem.items;
    }
    if (editingItem) {
      return [
        {
          id: `item-${Date.now()}-1`,
          category: editingItem.itemType.toLowerCase().includes('antam') || editingItem.itemType.toLowerCase().includes('batang')
            ? 'Logam Mulia Batangan'
            : 'Perhiasan',
          brandType: editingItem.itemType,
          kadar: editingItem.kadar,
          berat: editingItem.beratBersih,
          serialNumber: editingItem.sourceNote !== '-' ? editingItem.sourceNote : '',
          kondisi: (editingItem.kondisi as BuybackGoldItem['kondisi']) || 'Baik / Utuh',
          hargaPerGram: editingItem.hargaPerGram,
          subtotal: Math.round(editingItem.beratBersih * editingItem.hargaPerGram),
        },
      ];
    }
    return [
      {
        id: `item-${Date.now()}-1`,
        category: 'Logam Mulia Batangan',
        brandType: 'Antam CertiEye',
        kadar: '24K (99.99%)',
        berat: 10,
        serialNumber: '',
        certYear: '2024',
        kondisi: 'Baik / Utuh',
        hargaPerGram: KADAR_PRESETS['24K (99.9%)'] || 1250000,
        subtotal: 10 * (KADAR_PRESETS['24K (99.9%)'] || 1250000),
      },
    ];
  });

  // Bagian C: Ringkasan & Pembayaran
  const [potonganBiaya, setPotonganBiaya] = useState<number>(
    editingItem ? (editingItem.potonganBiaya ?? editingItem.biayaLebur ?? 0) : 0
  );
  const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'cash'>(
    editingItem?.paymentMethod || 'transfer'
  );
  const [bankName, setBankName] = useState(editingItem?.bankName || 'BCA');
  const [accountNo, setAccountNo] = useState(editingItem?.accountNo || '');
  const [accountHolder, setAccountHolder] = useState(
    editingItem?.accountHolder || editingItem?.customerName || initialCustomer?.name || ''
  );
  const [catatan, setCatatan] = useState(editingItem?.catatan || '');

  // Bagian D: Unggah Dokumen & Persetujuan
  const [fotoKtp, setFotoKtp] = useState<string | null>(editingItem?.fotoKtp || null);
  const [fotoEmas, setFotoEmas] = useState<string | null>(editingItem?.fotoEmas || null);
  const [isAgreedLegal, setIsAgreedLegal] = useState<boolean>(editingItem ? true : false);

  // Sync account holder with customer name initially if empty
  useEffect(() => {
    if (customerName && !accountHolder) {
      setAccountHolder(customerName);
    }
  }, [customerName, accountHolder]);

  // --- Handlers Item Repeater ---
  const handleAddItem = (categoryPreset: 'Logam Mulia Batangan' | 'Perhiasan' = 'Perhiasan') => {
    const isBar = categoryPreset === 'Logam Mulia Batangan';
    const defaultKadar = isBar ? '24K (99.99%)' : '18K (75.0%)';
    const defaultPrice = KADAR_PRESETS[defaultKadar] || (isBar ? 1250000 : 930000);
    const defaultBerat = isBar ? 5 : 3.5;

    const newItem: BuybackGoldItem = {
      id: `item-${Date.now()}-${items.length + 1}`,
      category: categoryPreset,
      brandType: isBar ? 'Antam' : 'Cincin Emas',
      kadar: defaultKadar,
      berat: defaultBerat,
      serialNumber: '',
      certYear: isBar ? '2024' : undefined,
      kondisi: 'Baik / Utuh',
      hargaPerGram: defaultPrice,
      subtotal: Math.round(defaultBerat * defaultPrice),
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleRemoveItem = (item: BuybackGoldItem) => {
    if (items.length <= 1) {
      const msg = 'Minimal harus ada 1 item emas dalam transaksi buyback.';
      setFormError(msg);
      showToast('warning', msg);
      return;
    }
    setPendingDeleteItem(item);
  };

  const handleConfirmRemoveItem = () => {
    if (!pendingDeleteItem) return;
    setItems(prev => prev.filter(it => it.id !== pendingDeleteItem.id));
    showToast('success', `Item "${pendingDeleteItem.brandType}" dihapus dari daftar buyback.`);
    setPendingDeleteItem(null);
  };

  const handleUpdateItem = (id: string, field: keyof BuybackGoldItem, value: any) => {
    setItems(prev =>
      prev.map(it => {
        if (it.id !== id) return it;
        const updated = { ...it, [field]: value };

        // Jika kadar diganti, sesuaikan hargaPerGram standar
        if (field === 'kadar') {
          const suggestedPrice = KADAR_PRESETS[value as string] || 1000000;
          updated.hargaPerGram = suggestedPrice;
        }

        // Jika kategori diganti
        if (field === 'category') {
          if (value === 'Logam Mulia Batangan') {
            updated.brandType = 'Antam';
            updated.kadar = '24K (99.99%)';
            updated.hargaPerGram = KADAR_PRESETS['24K (99.9%)'] || 1250000;
          } else {
            updated.brandType = 'Perhiasan Emas';
            updated.kadar = '18K (75.0%)';
            updated.hargaPerGram = KADAR_PRESETS['18K (75.0%)'] || 930000;
          }
        }

        // Recalculate subtotal
        const berat = typeof updated.berat === 'number' ? updated.berat : parseFloat(updated.berat) || 0;
        const harga = typeof updated.hargaPerGram === 'number' ? updated.hargaPerGram : parseFloat(updated.hargaPerGram) || 0;
        updated.subtotal = Math.round(berat * harga);

        return updated;
      })
    );
  };

  // --- Kalkulasi Real-time ---
  const totalBerat = items.reduce((sum, it) => sum + (parseFloat(it.berat as any) || 0), 0);
  const totalNilaiKotor = items.reduce((sum, it) => sum + it.subtotal, 0);

  // PPh Pasal 22:
  // Jika total transaksi > Rp 10.000.000:
  // - Ada NPWP (min 10 digit): 1.5%
  // - Tanpa NPWP: 3.0%
  // Jika <= Rp 10.000.000: Rp 0
  const isTaxApplicable = totalNilaiKotor > 10000000;
  const hasValidNpwp = customerNpwp.trim().replace(/[^0-9]/g, '').length >= 10;
  const taxRate = !isTaxApplicable ? 0 : hasValidNpwp ? 0.015 : 0.03;
  const pph22Amount = Math.round(totalNilaiKotor * taxRate);

  const totalDiterimaBersih = Math.max(0, totalNilaiKotor - potonganBiaya - pph22Amount);

  // File Upload Handlers (with base64 conversion)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'ktp' | 'emas') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      const msg = 'Format file harus berupa gambar (JPG, PNG, atau WEBP).';
      setFormError(msg);
      showToast('error', msg, 'Validasi Unggah Foto');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      const msg = 'Ukuran file foto maksimal 5MB.';
      setFormError(msg);
      showToast('error', msg, 'Validasi Unggah Foto');
      return;
    }

    const reader = new FileReader();
    reader.onload = event => {
      const result = event.target?.result as string;
      if (target === 'ktp') {
        setFotoKtp(result);
        showToast('success', 'Foto KTP nasabah berhasil diunggah.');
      }
      if (target === 'emas') {
        setFotoEmas(result);
        showToast('success', 'Foto fisik emas & sertifikat berhasil diunggah.');
      }
    };
    reader.onerror = () => {
      const msg = 'Gagal membaca file gambar. Silakan coba pilih file lain.';
      setFormError(msg);
      showToast('error', msg);
    };
    reader.readAsDataURL(file);
  };

  const setSampleKtp = () => {
    setFotoKtp(
      'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=500&q=80'
    );
  };

  const setSampleEmas = () => {
    setFotoEmas(
      'https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=500&q=80'
    );
  };

  const failValidation = (msg: string) => {
    setFormError(msg);
    showToast('error', msg, 'Validasi Form Buyback');
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validasi Bagian A
    if (!customerName.trim() || customerName.trim().length < 2) {
      failValidation('Harap isi Nama Lengkap nasabah sesuai KTP (minimal 2 karakter).');
      return;
    }
    const cleanNik = customerNik.replace(/[^0-9]/g, '');
    if (cleanNik.length !== 16) {
      failValidation(`Nomor NIK/KTP harus tepat 16 digit angka (saat ini: ${cleanNik.length} digit).`);
      return;
    }
    const cleanPhoneDigits = customerPhone.replace(/[^0-9]/g, '');
    if (!customerPhone.trim() || cleanPhoneDigits.length < 8 || cleanPhoneDigits.length > 15) {
      failValidation('Nomor HP / WhatsApp nasabah tidak valid (minimal 8–15 digit angka).');
      return;
    }
    const cleanNpwpDigits = customerNpwp.trim().replace(/[^0-9]/g, '');
    if (customerNpwp.trim() && cleanNpwpDigits.length < 15) {
      failValidation('Format Nomor NPWP tidak valid (minimal 15 digit angka jika diisi).');
      return;
    }

    // Validasi Bagian B
    if (items.length === 0) {
      failValidation('Harap tambahkan minimal 1 item emas.');
      return;
    }
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.brandType.trim()) {
        failValidation(`Merek / jenis barang pada Item #${i + 1} wajib diisi.`);
        return;
      }
      if (Number.isNaN(it.berat) || it.berat <= 0) {
        failValidation(`Berat Item #${i + 1} (${it.brandType}) harus lebih dari 0 gram.`);
        return;
      }
      if (Number.isNaN(it.hargaPerGram) || it.hargaPerGram <= 0) {
        failValidation(`Harga beli per gram Item #${i + 1} harus lebih dari Rp 0.`);
        return;
      }
    }

    // Validasi Bagian C
    if (potonganBiaya < 0) {
      failValidation('Potongan biaya admin tidak boleh bernilai negatif.');
      return;
    }
    if (potonganBiaya > totalNilaiKotor) {
      failValidation('Potongan biaya admin tidak boleh melebihi total nilai kotor buyback.');
      return;
    }
    if (paymentMethod === 'transfer') {
      const cleanRek = accountNo.replace(/[^0-9]/g, '');
      if (!cleanRek || cleanRek.length < 6) {
        failValidation('Nomor Rekening tujuan wajib diisi minimal 6 digit angka.');
        return;
      }
      if (!accountHolder.trim()) {
        failValidation('Harap isi Nama Pemilik Rekening tujuan.');
        return;
      }
    }

    // Validasi Bagian D
    if (!editingItem && !fotoKtp) {
      failValidation('Harap unggah Foto KTP nasabah atau gunakan sample KTP.');
      return;
    }
    if (!editingItem && !fotoEmas) {
      failValidation('Harap unggah Foto Fisik Emas & Sertifikat/Nota atau gunakan sample foto.');
      return;
    }
    if (!isAgreedLegal) {
      failValidation('Nasabah wajib mencentang pernyataan keabsahan kepemilikan emas.');
      return;
    }

    const itemTypeSummary = items.map(it => `${it.brandType} ${it.berat}g`).join(', ');
    const primaryKadar = items[0]?.kadar || '24K (99.9%)';
    const primaryKondisi = items[0]?.kondisi || 'Baik / Utuh';
    const avgHargaPerGram = Math.round(totalNilaiKotor / (totalBerat || 1));

    setIsSubmitting(true);
    try {
      await onSaveBuyback(
        {
          customerId: selectedCustomer?.id,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerNik: cleanNik,
          customerNpwp: customerNpwp.trim() || undefined,
          customerAddress: customerAddress.trim() || undefined,
          branchName: editingItem?.branchName || branchName,
          cashierName: editingItem?.cashierName || cashierName,
          sourceNote: items[0]?.serialNumber ? `Seri: ${items[0].serialNumber}` : 'Buyback Toko',
          itemType: itemTypeSummary,
          kadar: primaryKadar,
          beratKotor: +totalBerat.toFixed(2),
          potonganBatu: 0,
          beratBersih: +totalBerat.toFixed(2),
          hargaPerGram: avgHargaPerGram,
          biayaLebur: potonganBiaya,
          kondisi: primaryKondisi,
          totalKotor: totalNilaiKotor,
          potonganBiaya,
          pph22: pph22Amount,
          totalBayar: totalDiterimaBersih,
          paymentMethod,
          bankName: paymentMethod === 'transfer' ? bankName : undefined,
          accountNo: paymentMethod === 'transfer' ? accountNo : undefined,
          accountHolder: paymentMethod === 'transfer' ? accountHolder : undefined,
          catatan: catatan.trim() || undefined,
          fotoKtp: fotoKtp || undefined,
          fotoEmas: fotoEmas || undefined,
          isAgreedLegal: true,
          items,
          saveToCustomerMaster: !selectedCustomer && saveToCustomerMaster,
        },
        editingItem?.id
      );
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan data buyback.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto px-2 sm:px-4 pt-2">
      <form noValidate onSubmit={handleSubmit} className="space-y-6">
        {formError && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm font-semibold text-red-700 flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{formError}</span>
          </div>
        )}
        {/* ========================================================= */}
        {/* 1. INFORMASI HEADER TRANSAKSI                             */}
        {/* ========================================================= */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs">
                1
              </span>
              <h2 className="text-sm sm:text-base font-bold text-gray-900">
                Informasi Transaksi &amp; Gerai
              </h2>
            </div>
            <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-md border border-emerald-200">
              Sistem POS Otomatis
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Nomor Transaksi */}
            <div className="bg-gray-50 rounded-lg p-3.5 border border-gray-200">
              <span className="text-xs font-semibold text-gray-500 block mb-1">
                Nomor Nota Buyback
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-base text-gray-900">
                  {invoiceNoCode || 'BB-20261112-001'}
                </span>
                <span className="text-xs bg-gray-200 text-gray-700 font-semibold px-1.5 py-0.5 rounded">
                  Read-only
                </span>
              </div>
            </div>

            {/* Tanggal & Waktu */}
            <div className="bg-gray-50 rounded-lg p-3.5 border border-gray-200">
              <span className="text-xs font-semibold text-gray-500 block mb-1">
                Waktu Transaksi
              </span>
              <div className="text-sm font-bold text-gray-900">
                {currentDateTime || 'Waktu saat ini'}
              </div>
            </div>

            {/* Gerai & Kasir */}
            <div className="bg-gray-50 rounded-lg p-3.5 border border-gray-200">
              <span className="text-xs font-semibold text-gray-500 block mb-1">
                Gerai &amp; Kasir Bertugas
              </span>
              <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">{branchName}</p>
              <p className="text-xs text-gray-500 truncate mt-0.5">{cashierName}</p>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. BAGIAN A: DATA PENJUAL (NASABAH)                       */}
        {/* ========================================================= */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 mb-5">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs">
                A
              </span>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-gray-900">
                  Data Nasabah (Penjual)
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Wajib mengisi data identitas resmi sesuai KTP nasabah untuk kepatuhan KYC
                </p>
              </div>
            </div>
          </div>

          <div className="mb-5 p-3.5 rounded-xl bg-gray-50/80 border border-gray-200/80">
            <CustomerLookupPicker
              selectedCustomer={selectedCustomer}
              label="Pilih dari Master Pelanggan (Opsional — Isi Otomatis)"
              placeholder="Cari nama, no. HP/WA, NIK KTP, atau kode member..."
              helperText="Jika nasabah sudah pernah terdaftar, pilih dari daftar agar Nama, HP, NIK, dan Alamat terisi otomatis."
              onSelectCustomer={cust => {
                setSelectedCustomer({
                  id: cust.id,
                  name: cust.name,
                  memberCode: cust.memberCode,
                  type: cust.type,
                  phone: cust.phone,
                });
                setCustomerName(cust.name);
                setCustomerPhone(cust.phone);
                if (cust.nik) setCustomerNik(cust.nik);
                if (cust.address) setCustomerAddress(cust.address);
                setAccountHolder(cust.name);
                showToast('info', `Data nasabah "${cust.name}" dimuat dari Master Pelanggan.`);
              }}
              onClearSelection={() => {
                setSelectedCustomer(null);
              }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
            {/* Nama Lengkap */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                Nama Lengkap (sesuai KTP) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  placeholder="Contoh: Siti Rahmah"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full h-11 pl-10 pr-3.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-gray-900 font-medium"
                />
              </div>
            </div>

            {/* NIK / Nomor KTP (16 Digit) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-gray-800">
                  NIK / Nomor KTP <span className="text-red-500">*</span>
                </label>
                <span
                  className={`text-xs font-mono font-bold ${
                    customerNik.replace(/[^0-9]/g, '').length === 16
                      ? 'text-emerald-600'
                      : 'text-gray-400'
                  }`}
                >
                  {customerNik.replace(/[^0-9]/g, '').length} / 16 digit
                </span>
              </div>
              <div className="relative">
                <CreditCard size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  maxLength={16}
                  placeholder="16 digit angka KTP"
                  value={customerNik}
                  onChange={e => setCustomerNik(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full h-11 pl-10 pr-3.5 text-sm font-mono font-bold bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-gray-900"
                />
              </div>
            </div>

            {/* Nomor HP / WhatsApp */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                Nomor HP / WhatsApp <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  required
                  placeholder="08xxxxxxxxxx"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full h-11 pl-10 pr-3.5 text-sm font-mono font-medium bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-gray-900"
                />
              </div>
            </div>

            {/* Nomor NPWP (Opsional) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-gray-800">
                  Nomor NPWP <span className="text-gray-400 font-normal">(Opsional)</span>
                </label>
                <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold border border-emerald-200">
                  PPh 22 1.5%
                </span>
              </div>
              <input
                type="text"
                placeholder="Contoh: 01.234.567.8-123.000"
                value={customerNpwp}
                onChange={e => setCustomerNpwp(e.target.value)}
                className="w-full h-11 px-3.5 text-sm font-mono bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-gray-900"
              />
              <p className="text-xs text-gray-500 mt-1">
                Nasabah ber-NPWP mendapat tarif pajak lebih rendah (1.5% vs 3.0%).
              </p>
            </div>

            {/* Alamat Lengkap Domisili (Opsional) */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                Alamat Domisili <span className="text-gray-400 font-normal">(Opsional)</span>
              </label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Alamat lengkap tempat tinggal sesuai identitas..."
                  value={customerAddress}
                  onChange={e => setCustomerAddress(e.target.value)}
                  className="w-full h-11 pl-10 pr-3.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-gray-900"
                />
              </div>
            </div>
          </div>

          {!selectedCustomer && !editingItem && (
            <div className="mt-4 pt-3.5 border-t border-gray-100">
              <label className="inline-flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={saveToCustomerMaster}
                  onChange={e => setSaveToCustomerMaster(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500 cursor-pointer shrink-0"
                />
                <span className="text-xs text-gray-700 leading-relaxed">
                  <strong className="font-semibold text-gray-900">
                    Simpan otomatis ke Master Pelanggan
                  </strong>{' '}
                  &mdash; Data Nama, No. HP, NIK, dan Alamat nasabah akan otomatis terdaftar di halaman Pelanggan jika belum ada, sehingga kunjungan berikutnya tidak perlu input ulang.
                </span>
              </label>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* 3. BAGIAN B: DETAIL ITEM EMAS (REPEATER)                  */}
        {/* ========================================================= */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-gray-100 mb-5 gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs">
                B
              </span>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-gray-900">
                  Detail Item Emas ({items.length} Item)
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Bisa menambahkan lebih dari 1 item perhiasan atau emas batangan dalam 1 nota
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => handleAddItem('Logam Mulia Batangan')}
                className="h-9 px-3.5 text-xs sm:text-sm font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Plus size={14} className="shrink-0" />
                <span>Emas Batangan</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddItem('Perhiasan')}
                className="h-9 px-3.5 text-xs sm:text-sm font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Plus size={14} className="shrink-0" />
                <span>Perhiasan</span>
              </button>
            </div>
          </div>

          {/* List Repeater Item Cards */}
          <div className="space-y-4">
            {items.map((item, index) => {
              const isBatangan = item.category === 'Logam Mulia Batangan';

              return (
                <div
                  key={item.id}
                  className="bg-gray-50/80 border border-gray-200 rounded-xl p-4 sm:p-5 relative transition-all hover:border-orange-300"
                >
                  {/* Item Header & Delete */}
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-200">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-orange-500 text-white font-bold text-xs flex items-center justify-center font-mono">
                        {index + 1}
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        Item #{index + 1} &bull; {item.category}
                      </span>
                    </div>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item)}
                        className="text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1 rounded-md transition-colors cursor-pointer border border-transparent hover:border-red-200 inline-flex items-center gap-1"
                      >
                        <Trash2 size={14} className="shrink-0" />
                        <span>Hapus Item</span>
                      </button>
                    )}
                  </div>

                  {/* Form Grid Lega & Rapi */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Kategori Emas */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Kategori Emas
                      </label>
                      <CustomSelect
                        value={item.category}
                        onChange={val => handleUpdateItem(item.id, 'category', val)}
                        options={[
                          { value: 'Logam Mulia Batangan', label: 'Logam Mulia Batangan' },
                          { value: 'Perhiasan', label: 'Perhiasan Emas' },
                        ]}
                      />
                    </div>

                    {/* Merek / Jenis */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Merek / Jenis Perhiasan
                      </label>
                      <input
                        type="text"
                        placeholder={isBatangan ? 'Antam / UBS / Galeri 24' : 'Cincin / Kalung / Gelang'}
                        value={item.brandType}
                        onChange={e => handleUpdateItem(item.id, 'brandType', e.target.value)}
                        className="w-full h-10 sm:h-11 px-3.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-gray-900 font-medium"
                      />
                    </div>

                    {/* Kadar Karat */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Kadar Karat Emas
                      </label>
                      <CustomSelect
                        value={item.kadar}
                        onChange={val => handleUpdateItem(item.id, 'kadar', val)}
                        options={[
                          { value: '24K (99.99%)', label: '24K (99.99%) - Emas Murni' },
                          { value: '24K (99.9%)', label: '24K (99.9%) - Batangan Standar' },
                          { value: '22K (91.6%)', label: '22K (91.6%) - Emas Tua' },
                          { value: '18K (75.0%)', label: '18K (75.0%) - Standar Toko' },
                          { value: '16K (70.0%)', label: '16K (70.0%)' },
                          { value: '9K (37.5%)', label: '9K (37.5%) - Emas Muda' },
                        ]}
                      />
                    </div>

                    {/* Berat Aktual (gram) */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Berat Aktual (gram) <span className="text-red-500">*</span>
                      </label>
                      <NumericInput
                        value={item.berat}
                        onChange={val => handleUpdateItem(item.id, 'berat', val)}
                        allowDecimal={true}
                        suffix="gr"
                        placeholder="0.00"
                        required
                        className="h-10 sm:h-11 px-3.5 text-sm font-mono font-bold bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-gray-900"
                      />
                    </div>

                    {/* Harga Beli per Gram */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Harga Beli / Gram (Rp) <span className="text-red-500">*</span>
                      </label>
                      <NumericInput
                        value={item.hargaPerGram}
                        onChange={val => handleUpdateItem(item.id, 'hargaPerGram', val)}
                        prefix="Rp"
                        placeholder="1.000.000"
                        required
                        className="h-10 sm:h-11 px-3.5 text-sm font-mono font-bold bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-gray-900"
                      />
                    </div>

                    {/* Kondisi Fisik */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Kondisi Fisik
                      </label>
                      <CustomSelect
                        value={item.kondisi}
                        onChange={val => handleUpdateItem(item.id, 'kondisi', val)}
                        options={[
                          { value: 'Baik / Utuh', label: 'Baik / Utuh (Lengkap)' },
                          { value: 'Kemasan Rusak', label: 'Kemasan / CertiEye Rusak' },
                          { value: 'Tanpa Sertifikat / Nota', label: 'Tanpa Sertifikat / Nota' },
                          { value: 'Patah / Cacat', label: 'Patah / Cacat / Mata Hilang' },
                        ]}
                      />
                    </div>

                    {/* Nomor Seri & Tahun Cetak (Opsional / Batangan) */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        {isBatangan ? 'Nomor Seri & Tahun Cetak' : 'Keterangan Tambahan / Nomor Nota Asal'}
                      </label>
                      <input
                        type="text"
                        placeholder={
                          isBatangan
                            ? 'Contoh: Seri A892144 (Tahun 2024)'
                            : 'Contoh: Ada nota pembelian toko asal'
                        }
                        value={item.serialNumber || ''}
                        onChange={e => handleUpdateItem(item.id, 'serialNumber', e.target.value)}
                        className="w-full h-10 px-3 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-gray-900 font-medium"
                      />
                    </div>

                    {/* Subtotal Item Card */}
                    <div className="bg-orange-50/80 border border-orange-200 rounded-lg p-3 flex flex-col justify-center">
                      <span className="text-xs font-semibold text-gray-600 block">
                        Subtotal Item #{index + 1}:
                      </span>
                      <span className="font-mono font-bold text-base sm:text-lg text-orange-700 mt-0.5">
                        {formatIDR(item.subtotal)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Subtotal Footer Bar */}
          <div className="mt-4 p-4 bg-gray-100/80 rounded-xl flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-4 text-gray-700">
              <span>
                Total Item: <strong className="text-gray-900 font-mono font-bold">{items.length}</strong>
              </span>
              <span>&bull;</span>
              <span>
                Total Berat Fisik:{' '}
                <strong className="text-gray-900 font-mono font-bold">
                  {totalBerat.toFixed(2)} gram
                </strong>
              </span>
            </div>
            <div className="text-right">
              <span className="text-gray-600 font-medium">Total Nilai Buyback Kotor: </span>
              <strong className="text-gray-900 font-mono text-base sm:text-lg font-bold ml-1.5">
                {formatIDR(totalNilaiKotor)}
              </strong>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. BAGIAN C: RINGKASAN PERHITUNGAN & PEMBAYARAN          */}
        {/* ========================================================= */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 mb-5">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs">
                C
              </span>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-gray-900">
                  Perhitungan Dana &amp; Metode Pembayaran
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Kalkulasi potongan admin, pajak PPh Pasal 22, dan rekening tujuan pencairan
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sisi Kiri: Rincian Angka & Total Bersih */}
            <div className="space-y-4">
              {/* Nilai Kotor */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-sm font-semibold text-gray-700">Total Nilai Kotor</span>
                <span className="font-mono font-bold text-base text-gray-900">
                  {formatIDR(totalNilaiKotor)}
                </span>
              </div>

              {/* Potongan Biaya Admin / Kondisi */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Potongan Biaya Admin / Kondisi Fisik / Lebur (Rp)
                </label>
                <NumericInput
                  value={potonganBiaya}
                  onChange={val => setPotonganBiaya(val)}
                  prefix="Rp"
                  placeholder="0"
                  className="h-11 px-3.5 text-sm font-mono font-bold bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Contoh: biaya lebur perhiasan, kemasan rusak, atau ongkos uji kadar.
                </p>
              </div>

              {/* Potongan Pajak PPh 22 */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-800">Potongan Pajak PPh 22</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-bold font-mono ${
                        isTaxApplicable
                          ? hasValidNpwp
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {isTaxApplicable
                        ? hasValidNpwp
                          ? '1.5% (Ber-NPWP)'
                          : '3.0% (Non-NPWP)'
                        : '0% (Bebas PPh ≤ Rp 10Jt)'}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-base text-gray-900">
                    - {formatIDR(pph22Amount)}
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {isTaxApplicable
                    ? `Transaksi buyback di atas Rp 10 Juta dikenakan PPh 22 sesuai regulasi pajak (${
                        hasValidNpwp ? '1.5% ber-NPWP' : '3.0% tanpa NPWP'
                      }).`
                    : 'Nilai transaksi di bawah batas ambang Rp 10 Juta bebas dari potongan PPh Pasal 22.'}
                </p>
              </div>

              {/* TOTAL DANA DITERIMA BERSIH (BANNER HIGHLIGHT BESAR) */}
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl p-4 sm:p-5 flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-xs uppercase tracking-wider font-bold text-white/80 block">
                    Total Dana Diterima Bersih
                  </span>
                  <span className="text-xs text-white/90 mt-0.5 block">
                    Jumlah dana yang dicairkan ke nasabah
                  </span>
                </div>
                <div className="font-mono font-bold text-2xl sm:text-3xl text-white tracking-tight">
                  {formatIDR(totalDiterimaBersih)}
                </div>
              </div>
            </div>

            {/* Sisi Kanan: Metode Pembayaran */}
            <div className="space-y-4 border-t lg:border-t-0 lg:border-l border-gray-100 lg:pl-6 pt-4 lg:pt-0">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Metode Pencairan Dana <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('transfer')}
                    className={`h-11 px-4 text-sm font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                      paymentMethod === 'transfer'
                        ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Transfer Bank
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`h-11 px-4 text-sm font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                      paymentMethod === 'cash'
                        ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Uang Tunai (Cash)
                  </button>
                </div>
              </div>

              {/* Form Rekening Bank */}
              {paymentMethod === 'transfer' ? (
                <div className="space-y-3.5 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Nama Bank Tujuan <span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      value={bankName}
                      onChange={val => setBankName(val)}
                      options={[
                        { value: 'BCA', label: 'BCA - Bank Central Asia' },
                        { value: 'Mandiri', label: 'Bank Mandiri' },
                        { value: 'BRI', label: 'BRI - Bank Rakyat Indonesia' },
                        { value: 'BNI', label: 'BNI - Bank Negara Indonesia' },
                        { value: 'BSI', label: 'BSI - Bank Syariah Indonesia' },
                        { value: 'CIMB Niaga', label: 'CIMB Niaga' },
                        { value: 'Permata', label: 'Permata Bank' },
                        { value: 'Danamon', label: 'Bank Danamon' },
                        { value: 'Bank Jatim', label: 'Bank Jatim' },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Nomor Rekening <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required={paymentMethod === 'transfer'}
                      placeholder="Masukkan nomor rekening tujuan..."
                      value={accountNo}
                      onChange={e => setAccountNo(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full h-10 px-3 text-sm font-mono font-bold bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Nama Pemilik Rekening <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required={paymentMethod === 'transfer'}
                      placeholder="Nama pemilik rekening..."
                      value={accountHolder}
                      onChange={e => setAccountHolder(e.target.value)}
                      className="w-full h-10 px-3 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-gray-900 font-semibold"
                    />
                    <p className="text-xs text-orange-600 font-medium mt-1">
                      Nama pemilik rekening harus sesuai dengan nama KTP nasabah penjual.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 leading-relaxed">
                  <p className="font-bold text-sm mb-1">Pencairan Tunai Langsung:</p>
                  Uang tunai sebesar <strong>{formatIDR(totalDiterimaBersih)}</strong> diserahkan oleh petugas kasir setelah nota fisik ditandatangani basah oleh nasabah.
                </div>
              )}

              {/* Catatan Tambahan */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Catatan Transaksi <span className="text-gray-400 font-normal">(Opsional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Catatan hasil timbangan digital, nomor nota toko lama, dsb..."
                  value={catatan}
                  onChange={e => setCatatan(e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-gray-900"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 5. BAGIAN D: DOKUMEN KYC & PERSETUJUAN                    */}
        {/* ========================================================= */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 mb-5">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs">
                D
              </span>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-gray-900">
                  Dokumen Pendukung &amp; Verifikasi Keabsahan
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Arsip dokumentasi fisik KTP dan fisik emas untuk kepatuhan regulasi
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
            {/* Foto KTP */}
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/70">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-sm font-bold text-gray-900">
                  Foto KTP Penjual <span className="text-red-500">*</span>
                </span>
                <button
                  type="button"
                  onClick={setSampleKtp}
                  className="text-xs text-orange-600 hover:text-orange-700 font-semibold cursor-pointer underline"
                >
                  Gunakan Sample KTP
                </button>
              </div>

              {fotoKtp ? (
                <div className="relative rounded-lg overflow-hidden border border-gray-300 h-36 bg-white">
                  <img src={fotoKtp} alt="KTP Nasabah" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFotoKtp(null)}
                    className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2.5 py-1 rounded font-bold hover:bg-red-700 transition-colors cursor-pointer shadow-xs"
                  >
                    Ganti Foto
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-gray-300 rounded-lg p-5 flex flex-col items-center justify-center h-36 bg-white cursor-pointer hover:border-orange-400 hover:bg-orange-50/20 transition-all">
                  <Upload size={24} className="text-gray-400 mb-1.5" />
                  <span className="text-xs sm:text-sm font-semibold text-gray-700">Pilih / Upload Foto KTP</span>
                  <span className="text-xs text-gray-400 mt-0.5">Format JPG, PNG (Maks 5MB)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileUpload(e, 'ktp')}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Foto Emas & Sertifikat */}
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/70">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-sm font-bold text-gray-900">
                  Foto Emas &amp; Sertifikat/Nota <span className="text-red-500">*</span>
                </span>
                <button
                  type="button"
                  onClick={setSampleEmas}
                  className="text-xs text-orange-600 hover:text-orange-700 font-semibold cursor-pointer underline"
                >
                  Gunakan Sample Foto
                </button>
              </div>

              {fotoEmas ? (
                <div className="relative rounded-lg overflow-hidden border border-gray-300 h-36 bg-white">
                  <img src={fotoEmas} alt="Foto Emas" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFotoEmas(null)}
                    className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2.5 py-1 rounded font-bold hover:bg-red-700 transition-colors cursor-pointer shadow-xs"
                  >
                    Ganti Foto
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-gray-300 rounded-lg p-5 flex flex-col items-center justify-center h-36 bg-white cursor-pointer hover:border-orange-400 hover:bg-orange-50/20 transition-all">
                  <Upload size={24} className="text-gray-400 mb-1.5" />
                  <span className="text-xs sm:text-sm font-semibold text-gray-700">Pilih / Upload Foto Emas &amp; Nota</span>
                  <span className="text-xs text-gray-400 mt-0.5">Format JPG, PNG (Maks 5MB)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileUpload(e, 'emas')}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Pernyataan Sah Checkbox */}
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl mb-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={isAgreedLegal}
                onChange={e => setIsAgreedLegal(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500 cursor-pointer shrink-0"
              />
              <span className="text-xs sm:text-sm text-gray-800 font-medium leading-relaxed select-none">
                <strong>Pernyataan Nasabah:</strong> &quot;Saya menyatakan bahwa emas yang dijual adalah milik pribadi yang sah dan bukan berasal dari tindak pidana.&quot;
              </span>
            </label>
          </div>

          {/* Keterangan Tanda Tangan Basah */}
          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs sm:text-sm text-gray-600 flex items-start gap-2.5">
            <FileText size={18} className="text-orange-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-gray-900 block text-xs sm:text-sm">
                Prosedur Tanda Tangan Basah
              </span>
              <p className="text-xs text-gray-500 leading-relaxed mt-0.5">
                Kolom tanda tangan resmi nasabah (penjual) dan kasir (Gold Advisor) otomatis tercetak pada lembar nota fisik untuk ditandatangani basah secara langsung saat serah terima barang dan pencairan dana.
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* BOTTOM ACTION BAR                                         */}
        {/* ========================================================= */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-end gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 sm:flex-none h-11 px-5 text-xs sm:text-sm font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center text-center shadow-xs"
            >
              Batal / Kembali
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 sm:flex-none h-11 px-6 text-xs sm:text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-60 rounded-lg transition-colors cursor-pointer shadow-xs inline-flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin shrink-0" />
              ) : editingItem ? (
                <Save size={16} className="shrink-0" />
              ) : (
                <Printer size={16} className="shrink-0" />
              )}
              <span>
                {isSubmitting
                  ? 'Menyimpan...'
                  : editingItem
                  ? 'Simpan Perubahan Buyback'
                  : 'Simpan & Cetak Struk Buyback'}
              </span>
            </button>
          </div>
        </div>
      </form>

      <ConfirmModal
        isOpen={!!pendingDeleteItem}
        title="Hapus Item Emas Buyback"
        description={
          pendingDeleteItem
            ? `Apakah Anda yakin ingin menghapus item "${pendingDeleteItem.brandType}" (${pendingDeleteItem.berat} gr) dari daftar formulir buyback ini?`
            : ''
        }
        confirmLabel="Ya, Hapus Item"
        onCancel={() => setPendingDeleteItem(null)}
        onConfirm={handleConfirmRemoveItem}
      />
    </div>
  );
};
