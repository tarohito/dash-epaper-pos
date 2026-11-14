import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Palette,
  SlidersHorizontal,
  FileSignature,
  Upload,
  Trash2,
  RotateCcw,
  Eye,
} from 'lucide-react';
import {
  BuybackItem,
  ReceiptLogoPreset,
  ReceiptPaperSize,
  ReceiptTheme,
  StoreSettings,
  Tenant,
  Transaction,
} from '../../types';
import { GoldInvoiceDocument } from '../common/GoldInvoiceDocument';
import { CustomSelect } from '../common/CustomSelect';
import { useToast } from '../../contexts/ToastContext';

export const DEFAULT_RECEIPT_TERMS_TEMPLATE = [
  'Wajib membawa surat ini saat jual kembali atau tukar tambah barang.',
  'Barang dari {TOKO} diterima kembali sesuai ketentuan harga & potongan toko.',
  'Jika rusak/cacat atau mata hilang dikenakan potongan tambahan sesuai kondisi.',
  'Pesanan khusus (custom order), batu, dan ongkos lebur tidak dapat dikembalikan.',
].join('\n');

interface ReceiptCustomizationTabProps {
  settings: StoreSettings;
  tenantPreview: Tenant;
  onUpdateField: <K extends keyof StoreSettings>(field: K, value: StoreSettings[K]) => void;
  onResetReceiptDefaults: () => void;
}

type EditorSubTab = 'theme_header' | 'elements' | 'terms_sign';

const THEME_OPTIONS: Array<{
  value: ReceiptTheme;
  label: string;
  desc: string;
  swatchClass: string;
}> = [
  {
    value: 'classic_gold',
    label: 'Emas Klasik',
    desc: 'Aksen emas khas toko perhiasan',
    swatchClass: 'bg-[#d4a017]',
  },
  {
    value: 'royal_emerald',
    label: 'Zamrud Royal',
    desc: 'Hijau zamrud elegan & berwibawa',
    swatchClass: 'bg-emerald-700',
  },
  {
    value: 'midnight_navy',
    label: 'Biru Malam',
    desc: 'Slate gelap modern & formal',
    swatchClass: 'bg-slate-900',
  },
  {
    value: 'rose_gold',
    label: 'Rose Gold',
    desc: 'Nuansa butik perhiasan modern',
    swatchClass: 'bg-rose-700',
  },
  {
    value: 'monochrome',
    label: 'Monokrom Cetak',
    desc: 'Hitam putih kontras tinggi (Thermal)',
    swatchClass: 'bg-gray-950',
  },
];

const PAPER_SIZE_OPTIONS: Array<{
  value: ReceiptPaperSize;
  label: string;
  sublabel: string;
}> = [
  { value: 'a5', label: 'A5 Standar', sublabel: '148 × 210 mm' },
  { value: 'a6', label: 'A6 Ringkas', sublabel: '105 × 148 mm' },
  { value: '80mm', label: 'Thermal 80mm', sublabel: 'Struk Roll Kasir' },
];

const WATERMARK_OPACITY_OPTIONS = [
  { value: 4, label: 'Tipis (4%)' },
  { value: 6, label: 'Standar (6%)' },
  { value: 10, label: 'Sedang (10%)' },
  { value: 14, label: 'Tegas (14%)' },
];

async function resizeImageToDataUrl(file: File): Promise<string> {
  const rawUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(file);
  });

  if (file.type === 'image/svg+xml') {
    if (rawUrl.length > 350_000) {
      throw new Error('Ukuran file SVG terlalu besar (maksimal 250KB).');
    }
    return rawUrl;
  }

  return await new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 240;
      const scale = Math.min(1, maxDim / Math.max(img.width || maxDim, img.height || maxDim));
      const w = Math.max(1, Math.round((img.width || maxDim) * scale));
      const h = Math.max(1, Math.round((img.height || maxDim) * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Browser tidak mendukung pemrosesan gambar.'));
        return;
      }
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      const output = canvas.toDataURL('image/png');
      if (output.length > 350_000) {
        resolve(canvas.toDataURL('image/webp', 0.85));
      } else {
        resolve(output);
      }
    };
    img.onerror = () => reject(new Error('File gambar tidak valid.'));
    img.src = rawUrl;
  });
}

export const ReceiptCustomizationTab: React.FC<ReceiptCustomizationTabProps> = ({
  settings,
  tenantPreview,
  onUpdateField,
  onResetReceiptDefaults,
}) => {
  const { showToast } = useToast();
  const [editorTab, setEditorTab] = useState<EditorSubTab>('theme_header');
  const [previewDocType, setPreviewDocType] = useState<'sale' | 'buyback'>('sale');
  const [previewPaperSize, setPreviewPaperSize] = useState<ReceiptPaperSize>(
    settings.receiptDefaultPaperSize || 'a5'
  );
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setPreviewPaperSize(settings.receiptDefaultPaperSize || 'a5');
  }, [settings.receiptDefaultPaperSize]);

  const sampleSaleReceipt: Transaction = useMemo(() => {
    const subtotal = 14850000;
    const tax = settings.enablePpn ? Math.round(subtotal * (settings.ppnPercent / 100)) : 0;
    const grandTotal = subtotal + tax;
    return {
      id: 'preview-sale-1',
      invoiceNo: 'INV-20261114-008',
      dateTime: new Date().toISOString(),
      dateStr: '14 Nov 2026',
      timeStr: '14:25',
      cashier: 'Sinta Wijaya',
      customerMemberCode: 'VIP-0042',
      customerName: 'Ibu Ratna Kusuma',
      customerPhone: '0812-9000-4455',
      customerAddress: 'Jl. Kemang Raya No. 18, Jakarta Selatan',
      items: [
        {
          id: 1,
          sku: 'CNC-18K-041',
          name: 'Cincin Solitaire Berlian 18K',
          category: 'Cincin',
          berat: 3.45,
          harga: 6850000,
          qty: 1,
          subtotal: 6850000,
        },
        {
          id: 2,
          sku: 'LM-ANTAM-5G',
          name: 'Logam Mulia Antam CertiCard 5gr (24K)',
          category: 'Logam Mulia',
          berat: 5.0,
          harga: 8000000,
          qty: 1,
          subtotal: 8000000,
        },
      ],
      totalQty: 2,
      totalBerat: 8.45,
      subtotal,
      tax,
      grandTotal,
      paymentMethod: 'qris',
      paymentDetails: {
        qrisRrn: '991827364512',
        qrisNmid: 'ID102003948571',
      },
      status: 'completed',
    };
  }, [settings.enablePpn, settings.ppnPercent]);

  const sampleBuybackReceipt: BuybackItem = useMemo(
    () => ({
      id: 'preview-bb-1',
      invoiceNo: 'BB-20261114-003',
      date: '14 Nov 2026',
      timeStr: '15:10',
      branchName: `${tenantPreview.name} • ${tenantPreview.branchName}`,
      cashierName: 'Sinta Wijaya',
      customerMemberCode: 'REG-0118',
      customerName: 'Bapak Hendra Saputra',
      customerPhone: '0813-7788-1122',
      customerAddress: 'Jl. Sudirman Kav. 22, Jakarta',
      sourceNote: 'INV-20250410-019',
      itemType: 'Gelang Rantai Milan',
      kadar: '22K (916)',
      beratKotor: 8.4,
      potonganBatu: 0.2,
      beratBersih: 8.2,
      hargaPerGram: settings.goldPrice22kBuyback || 1950000,
      biayaLebur: 150000,
      kondisi: 'Baik / Utuh',
      totalKotor: Math.round(8.2 * (settings.goldPrice22kBuyback || 1950000)),
      potonganBiaya: 150000,
      pph22: 0,
      totalBayar: Math.max(0, Math.round(8.2 * (settings.goldPrice22kBuyback || 1950000)) - 150000),
      paymentMethod: 'transfer',
      bankName: 'BCA',
      accountNo: '5210-8899-12',
      items: [
        {
          id: 'bb-item-1',
          category: 'Perhiasan',
          brandType: 'Gelang Rantai Milan',
          kadar: '22K (916)',
          berat: 8.2,
          kondisi: 'Baik / Utuh',
          hargaPerGram: settings.goldPrice22kBuyback || 1950000,
          subtotal: Math.round(8.2 * (settings.goldPrice22kBuyback || 1950000)),
        },
      ],
      status: 'completed',
    }),
    [settings.goldPrice22kBuyback, tenantPreview.branchName, tenantPreview.name]
  );

  const handleUploadCustomLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Pilih file gambar PNG, JPG, WebP, atau SVG.');
      return;
    }
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      onUpdateField('receiptCustomLogoUrl', dataUrl);
      onUpdateField('receiptLogoPreset', 'custom');
      showToast('success', 'Logo custom nota siap digunakan.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal memproses gambar logo.');
    }
  };

  const elementToggles: Array<{
    key: keyof StoreSettings;
    label: string;
    desc: string;
    checked: boolean;
  }> = [
    {
      key: 'receiptShowStoreAddress',
      label: 'Alamat & Telepon Outlet',
      desc: 'Menampilkan alamat lengkap dan nomor telepon cabang di bawah nama toko.',
      checked: settings.receiptShowStoreAddress,
    },
    {
      key: 'receiptShowCashierName',
      label: 'Nama Kasir / Gold Advisor',
      desc: 'Mencetak nama petugas kasir yang memproses transaksi.',
      checked: settings.receiptShowCashierName,
    },
    {
      key: 'receiptShowBarcode',
      label: 'Barcode Code-128 Invoice',
      desc: 'Barcode cepat di kanan atas untuk scan nota saat pelanggan buyback.',
      checked: settings.receiptShowBarcode,
    },
    {
      key: 'receiptShowQrCode',
      label: 'QR Code Verifikasi Nota',
      desc: 'Kode QR berisi identitas outlet, nomor nota, dan total transaksi.',
      checked: settings.receiptShowQrCode,
    },
    {
      key: 'receiptShowPhoto',
      label: 'Foto Thumbnail Emas / Produk',
      desc: 'Menampilkan gambar perhiasan atau foto bukti emas buyback di nota.',
      checked: settings.receiptShowPhoto,
    },
    {
      key: 'receiptShowItemSku',
      label: 'Kode SKU & Nomor Seri Barang',
      desc: 'Menampilkan kode SKU perhiasan serta nomor seri & tahun sertifikat LM.',
      checked: settings.receiptShowItemSku,
    },
    {
      key: 'receiptShowTaxLine',
      label: 'Baris Rincian Pajak PPN',
      desc: 'Tampilkan baris PPN di ringkasan total (matikan untuk nota Non-PKP ringkas).',
      checked: settings.receiptShowTaxLine,
    },
    {
      key: 'receiptShowTerms',
      label: 'Blok Syarat & Ketentuan',
      desc: 'Menampilkan daftar poin ketentuan jual kembali di bagian bawah nota.',
      checked: settings.receiptShowTerms,
    },
    {
      key: 'receiptShowSignatures',
      label: 'Kolom Tanda Tangan',
      desc: 'Menampilkan kotak tanda tangan Pembeli / Penjual dan Kasir outlet.',
      checked: settings.receiptShowSignatures,
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
      {/* Left Column: Customization Controls */}
      <div className="lg:col-span-6 bg-white rounded-xl border border-gray-200/90 p-4 sm:p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-sm sm:text-base font-bold text-gray-900">
              Kustomisasi Tampilan Nota Resmi
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">
              Atur tema warna, logo, ukuran kertas default, elemen nota, dan ketentuan cetak untuk penjualan maupun buyback.
            </p>
          </div>
          <button
            type="button"
            onClick={onResetReceiptDefaults}
            className="h-8 px-2.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors inline-flex items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap"
          >
            <RotateCcw size={13} />
            <span>Standar</span>
          </button>
        </div>

        {/* Sub-tab Switcher */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-gray-100 rounded-lg border border-gray-200/70">
          {(
            [
              { key: 'theme_header', label: 'Tema & Header', icon: Palette },
              { key: 'elements', label: 'Elemen Nota', icon: SlidersHorizontal },
              { key: 'terms_sign', label: 'Ketentuan & TTD', icon: FileSignature },
            ] as const
          ).map(tab => {
            const Icon = tab.icon;
            const active = editorTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setEditorTab(tab.key)}
                className={`h-8 px-2 rounded-md text-xs font-semibold transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-white text-orange-600 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon size={14} className="shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sub-Tab 1: Tema & Header */}
        {editorTab === 'theme_header' && (
          <div className="space-y-4">
            {/* Default Paper Size */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Ukuran Kertas Cetak Default
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PAPER_SIZE_OPTIONS.map(opt => {
                  const active = settings.receiptDefaultPaperSize === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => onUpdateField('receiptDefaultPaperSize', opt.value)}
                      className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-orange-50/70 border-orange-400 text-orange-900'
                          : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span className="text-xs font-bold block leading-tight">{opt.label}</span>
                      <span className="text-[11px] text-gray-500 block mt-0.5 tabular-nums">
                        {opt.sublabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Theme */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Tema Warna &amp; Aksen Nota
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {THEME_OPTIONS.map(theme => {
                  const active = settings.receiptTheme === theme.value;
                  return (
                    <button
                      key={theme.value}
                      type="button"
                      onClick={() => onUpdateField('receiptTheme', theme.value)}
                      className={`p-2.5 rounded-lg border flex items-center gap-2.5 text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-orange-50/60 border-orange-400'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-md shrink-0 border border-black/10 ${theme.swatchClass}`}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-gray-900 block leading-tight">
                          {theme.label}
                        </span>
                        <span className="text-[11px] text-gray-500 block truncate mt-0.5">
                          {theme.desc}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Logo & Watermark */}
            <div className="pt-3 border-t border-gray-100 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Logo Header Nota
                  </label>
                  <CustomSelect
                    value={settings.receiptLogoPreset}
                    onChange={val => onUpdateField('receiptLogoPreset', val as ReceiptLogoPreset)}
                    options={[
                      { value: 'crown', label: 'Mahkota Emas (Klasik)' },
                      { value: 'diamond', label: 'Berlian Geometris' },
                      { value: 'monogram', label: 'Monogram Inisial Toko' },
                      { value: 'custom', label: 'Upload Logo Sendiri' },
                      { value: 'none', label: 'Tanpa Logo (Teks Saja)' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Ketebalan Watermark Latar
                  </label>
                  <CustomSelect
                    value={String(settings.receiptWatermarkOpacity)}
                    disabled={!settings.receiptShowWatermark}
                    onChange={val => onUpdateField('receiptWatermarkOpacity', Number(val))}
                    options={WATERMARK_OPACITY_OPTIONS.map(o => ({
                      value: String(o.value),
                      label: o.label,
                    }))}
                  />
                </div>
              </div>

              {settings.receiptLogoPreset === 'custom' && (
                <div className="p-3 rounded-lg border border-gray-200 bg-gray-50/70 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-lg border border-gray-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
                      {settings.receiptCustomLogoUrl ? (
                        <img
                          src={settings.receiptCustomLogoUrl}
                          alt="Logo Custom"
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <Upload size={16} className="text-gray-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {settings.receiptCustomLogoUrl ? 'Logo Custom Aktif' : 'Belum Ada Logo Custom'}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        PNG/JPG/WebP transparan disarankan (otomatis dioptimasi).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleUploadCustomLogo}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="h-8 px-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Upload size={13} />
                      <span>{settings.receiptCustomLogoUrl ? 'Ganti' : 'Upload'}</span>
                    </button>
                    {settings.receiptCustomLogoUrl && (
                      <button
                        type="button"
                        onClick={() => onUpdateField('receiptCustomLogoUrl', '')}
                        className="h-8 w-8 bg-white hover:bg-red-50 text-gray-500 hover:text-red-600 border border-gray-300 rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer"
                        aria-label="Hapus logo custom"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              <label className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50/70 cursor-pointer">
                <div>
                  <span className="text-xs font-semibold text-gray-900 block">
                    Tampilkan Watermark Keamanan di Tengah Nota
                  </span>
                  <span className="text-[11px] text-gray-500">
                    Membantu mencegah pemalsuan surat emas resmi toko.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.receiptShowWatermark}
                  onChange={e => onUpdateField('receiptShowWatermark', e.target.checked)}
                  className="w-4 h-4 accent-orange-500 rounded cursor-pointer shrink-0"
                />
              </label>
            </div>

            {/* Header Text Fields */}
            <div className="pt-3 border-t border-gray-100 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Tagline Brand di Header Nota
                </label>
                <input
                  type="text"
                  value={settings.receiptTagline}
                  onChange={e => onUpdateField('receiptTagline', e.target.value)}
                  className="w-full h-9 px-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 uppercase tracking-wider font-semibold"
                  placeholder="GOLD & JEWELLERY"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Judul Nota Penjualan
                  </label>
                  <input
                    type="text"
                    value={settings.receiptSaleTitle}
                    onChange={e => onUpdateField('receiptSaleTitle', e.target.value)}
                    className="w-full h-9 px-3 text-xs font-semibold bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 uppercase"
                    placeholder="FAKTUR PENJUALAN EMAS"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Judul Nota Buyback
                  </label>
                  <input
                    type="text"
                    value={settings.receiptBuybackTitle}
                    onChange={e => onUpdateField('receiptBuybackTitle', e.target.value)}
                    className="w-full h-9 px-3 text-xs font-semibold bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 uppercase"
                    placeholder="SURAT PEMBELIAN KEMBALI (BUYBACK)"
                  />
                </div>
              </div>
              <p className="text-[11px] text-gray-400">
                Kosongkan judul nota jika ingin menyembunyikan pita judul di bagian paling atas.
              </p>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Info Tambahan Header (Instagram / Jam Buka / NPWP)
                </label>
                <input
                  type="text"
                  value={settings.receiptHeaderExtra}
                  onChange={e => onUpdateField('receiptHeaderExtra', e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                  placeholder="IG @tokomas.id • Buka Setiap Hari 09:00–21:00"
                />
              </div>
            </div>
          </div>
        )}

        {/* Sub-Tab 2: Elemen Nota */}
        {editorTab === 'elements' && (
          <div className="space-y-2.5">
            {elementToggles.map(item => (
              <label
                key={item.key}
                className="flex items-start justify-between gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50/70 transition-colors cursor-pointer"
              >
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-gray-900 block">{item.label}</span>
                  <span className="text-[11px] text-gray-500 block mt-0.5 leading-snug">
                    {item.desc}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={e => onUpdateField(item.key, e.target.checked as StoreSettings[typeof item.key])}
                  className="mt-0.5 w-4 h-4 accent-orange-500 rounded cursor-pointer shrink-0"
                />
              </label>
            ))}
          </div>
        )}

        {/* Sub-Tab 3: Ketentuan & Tanda Tangan */}
        {editorTab === 'terms_sign' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Judul Bagian Syarat &amp; Ketentuan
              </label>
              <input
                type="text"
                value={settings.receiptTermsTitle}
                onChange={e => onUpdateField('receiptTermsTitle', e.target.value)}
                className="w-full h-9 px-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 font-semibold"
                placeholder="Perhatian :"
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="block text-xs font-semibold text-gray-700">
                  Daftar Poin Syarat &amp; Ketentuan (1 Baris = 1 Poin)
                </label>
                <button
                  type="button"
                  onClick={() => onUpdateField('receiptTermsText', DEFAULT_RECEIPT_TERMS_TEMPLATE)}
                  className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 cursor-pointer whitespace-nowrap"
                >
                  Isi Template Standar
                </button>
              </div>
              <textarea
                rows={5}
                value={settings.receiptTermsText}
                onChange={e => onUpdateField('receiptTermsText', e.target.value)}
                className="w-full p-3 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 leading-relaxed"
                placeholder="Wajib membawa surat ini saat jual kembali..."
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Gunakan variabel <span className="font-mono font-semibold text-gray-600">{'{TOKO}'}</span> untuk otomatis menampilkan nama outlet Anda.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Catatan Tambahan / Footer Nota
              </label>
              <textarea
                rows={3}
                value={settings.receiptFooterNote}
                onChange={e => onUpdateField('receiptFooterNote', e.target.value)}
                className="w-full p-3 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 leading-relaxed"
                placeholder="Contoh: Gratis cuci perhiasan seumur hidup • WA Layanan Pelanggan 0812-xxxx"
              />
            </div>

            <div className="pt-3 border-t border-gray-100 space-y-3">
              <p className="text-xs font-bold text-gray-800">Label Blok Tanda Tangan</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Salam Penutup
                  </label>
                  <input
                    type="text"
                    value={settings.receiptSignatureGreeting}
                    onChange={e => onUpdateField('receiptSignatureGreeting', e.target.value)}
                    className="w-full h-9 px-2.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                    placeholder="Hormat Kami,"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Label Pelanggan
                  </label>
                  <input
                    type="text"
                    value={settings.receiptCustomerSignLabel}
                    onChange={e => onUpdateField('receiptCustomerSignLabel', e.target.value)}
                    className="w-full h-9 px-2.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                    placeholder="Customer"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Label Petugas Toko
                  </label>
                  <input
                    type="text"
                    value={settings.receiptCashierSignLabel}
                    onChange={e => onUpdateField('receiptCashierSignLabel', e.target.value)}
                    className="w-full h-9 px-2.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                    placeholder="Kasir / Gold Advisor"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Live WYSIWYG Preview */}
      <div className="lg:col-span-6 lg:sticky lg:top-4 bg-white rounded-xl border border-gray-200/90 p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <Eye size={16} className="text-orange-500 shrink-0" />
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-gray-900 leading-tight">
                Pratinjau Nota Langsung
              </h4>
              <p className="text-[11px] text-gray-500">
                Simulasi tampilan cetak aktual sebelum disimpan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <div className="inline-flex p-0.5 bg-gray-100 rounded-lg border border-gray-200/80">
              {(
                [
                  { key: 'sale', label: 'Penjualan' },
                  { key: 'buyback', label: 'Buyback' },
                ] as const
              ).map(doc => (
                <button
                  key={doc.key}
                  type="button"
                  onClick={() => setPreviewDocType(doc.key)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    previewDocType === doc.key
                      ? 'bg-white text-orange-600 shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {doc.label}
                </button>
              ))}
            </div>

            <div className="inline-flex p-0.5 bg-gray-100 rounded-lg border border-gray-200/80">
              {(['a5', 'a6', '80mm'] as const).map(size => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setPreviewPaperSize(size)}
                  className={`px-2 py-1 text-[11px] font-bold uppercase rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    previewPaperSize === size
                      ? 'bg-white text-gray-900 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-100/90 p-3 sm:p-4 overflow-x-auto flex justify-center">
          <GoldInvoiceDocument
            receipt={previewDocType === 'buyback' ? sampleBuybackReceipt : sampleSaleReceipt}
            type={previewDocType}
            activeTenant={tenantPreview}
            storeSettings={settings}
            paperSize={previewPaperSize}
          />
        </div>
      </div>
    </div>
  );
};
