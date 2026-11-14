import React, { useState, useEffect } from 'react';
import {
  Store,
  Percent,
  Coins,
  FileText,
  Save,
  RotateCcw,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { StoreSettings, StoreSettingsUpdatePayload, Tenant, UserRole } from '../../types';
import { posApi } from '../../services/api';
import { formatIDR } from '../../utils/formatters';
import { CustomSelect } from '../common/CustomSelect';
import { NumericInput } from '../common/NumericInput';
import { ErrorBanner } from '../common/ErrorBanner';
import { useToast } from '../../contexts/ToastContext';

interface StoreSettingsViewProps {
  activeTenant?: Tenant;
  storeSettings: StoreSettings;
  userRole: UserRole;
  onSettingsSaved: (updated: { tenant: Tenant; storeSettings: StoreSettings }) => void;
}

type SettingsTab = 'profile' | 'pos_tax' | 'buyback_prices' | 'receipt';

export const StoreSettingsView: React.FC<StoreSettingsViewProps> = ({
  activeTenant,
  storeSettings,
  userRole,
  onSettingsSaved,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Tenant Profile form state
  const [storeName, setStoreName] = useState(activeTenant?.name || '');
  const [branchName, setBranchName] = useState(activeTenant?.branchName || '');
  const [address, setAddress] = useState(activeTenant?.address || '');
  const [city, setCity] = useState(activeTenant?.city || '');
  const [phone, setPhone] = useState(activeTenant?.phone || '');
  const [email, setEmail] = useState(activeTenant?.email || '');
  const [status, setStatus] = useState<'Aktif' | 'Trial' | 'Nonaktif'>(activeTenant?.status || 'Aktif');

  // Operational Store Settings state
  const [enablePpn, setEnablePpn] = useState(storeSettings.enablePpn);
  const [ppnPercent, setPpnPercent] = useState(storeSettings.ppnPercent);
  const [requireCustomerOnSale, setRequireCustomerOnSale] = useState(storeSettings.requireCustomerOnSale);
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(storeSettings.autoPrintReceipt);

  const [price24k, setPrice24k] = useState(storeSettings.goldPrice24kBuyback);
  const [price22k, setPrice22k] = useState(storeSettings.goldPrice22kBuyback);
  const [price18k, setPrice18k] = useState(storeSettings.goldPrice18kBuyback);
  const [price16k, setPrice16k] = useState(storeSettings.goldPrice16kBuyback);

  const [receiptTagline, setReceiptTagline] = useState(storeSettings.receiptTagline);
  const [receiptFooterNote, setReceiptFooterNote] = useState(storeSettings.receiptFooterNote);
  const [lastUpdatedMeta, setLastUpdatedMeta] = useState<{ updatedAt?: string; updatedBy?: string }>({
    updatedAt: storeSettings.updatedAt,
    updatedBy: storeSettings.updatedBy,
  });

  // Baseline snapshot for Reset Changes
  const [baseline, setBaseline] = useState<{ tenant: Tenant | null; settings: StoreSettings } | null>(null);

  const applyData = (tenant: Tenant | null, s: StoreSettings) => {
    setBaseline({ tenant, settings: s });
    if (tenant) {
      setStoreName(tenant.name);
      setBranchName(tenant.branchName);
      setAddress(tenant.address);
      setCity(tenant.city);
      setPhone(tenant.phone);
      setEmail(tenant.email);
      setStatus(tenant.status);
    }
    setEnablePpn(s.enablePpn);
    setPpnPercent(s.ppnPercent);
    setRequireCustomerOnSale(s.requireCustomerOnSale);
    setAutoPrintReceipt(s.autoPrintReceipt);
    setPrice24k(s.goldPrice24kBuyback);
    setPrice22k(s.goldPrice22kBuyback);
    setPrice18k(s.goldPrice18kBuyback);
    setPrice16k(s.goldPrice16kBuyback);
    setReceiptTagline(s.receiptTagline);
    setReceiptFooterNote(s.receiptFooterNote);
    setLastUpdatedMeta({ updatedAt: s.updatedAt, updatedBy: s.updatedBy });
  };

  const loadSettings = async (signal?: AbortSignal) => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await posApi.getStoreSettings(signal);
      applyData(res.tenant, res.storeSettings);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        const msg = err instanceof Error ? err.message : 'Gagal memuat pengaturan toko.';
        setFetchError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadSettings(controller.signal);
    return () => controller.abort();
  }, [activeTenant?.id]);

  const handleReset = () => {
    if (!baseline) return;
    applyData(baseline.tenant, baseline.settings);
    showToast('info', 'Perubahan dikembalikan ke pengaturan tersimpan.');
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!storeName.trim() || !branchName.trim()) {
      showToast('error', 'Nama toko dan nama cabang wajib diisi.');
      setActiveTab('profile');
      return;
    }
    if (!Number.isFinite(ppnPercent) || ppnPercent < 0 || ppnPercent > 30) {
      showToast('error', 'Tarif PPN harus antara 0% sampai 30%.');
      setActiveTab('pos_tax');
      return;
    }

    setIsSaving(true);
    try {
      const payload: StoreSettingsUpdatePayload = {
        tenantProfile: {
          name: storeName.trim(),
          branchName: branchName.trim(),
          address: address.trim(),
          city: city.trim(),
          phone: phone.trim(),
          email: email.trim(),
          status: userRole === 'owner' ? status : undefined,
        },
        settings: {
          enablePpn,
          ppnPercent: Number(ppnPercent),
          requireCustomerOnSale,
          autoPrintReceipt,
          goldPrice24kBuyback: price24k,
          goldPrice22kBuyback: price22k,
          goldPrice18kBuyback: price18k,
          goldPrice16kBuyback: price16k,
          receiptTagline: receiptTagline.trim() || 'GOLD & JEWELLERY',
          receiptFooterNote: receiptFooterNote.trim(),
        },
      };

      const saved = await posApi.updateStoreSettings(payload);
      applyData(saved.tenant, saved.storeSettings);
      onSettingsSaved(saved);
      showToast('success', `Pengaturan outlet "${saved.tenant.name}" berhasil disimpan.`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menyimpan pengaturan toko.');
    } finally {
      setIsSaving(false);
    }
  };

  const sampleSubtotal = 10000000;
  const sampleTax = enablePpn ? Math.round(sampleSubtotal * (ppnPercent / 100)) : 0;
  const sampleTotal = sampleSubtotal + sampleTax;

  const formattedUpdatedAt = lastUpdatedMeta.updatedAt
    ? new Date(lastUpdatedMeta.updatedAt).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-';

  return (
    <form onSubmit={handleSave} className="space-y-4 pb-8">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
              Pengaturan Toko &amp; Operasional Outlet
            </h3>
            {isLoading && <Loader2 size={15} className="animate-spin text-orange-500" />}
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            <span>{activeTenant?.code || 'OUTLET'}</span>
            <span aria-hidden="true" className="mx-1.5 text-gray-300">&middot;</span>
            <span className="font-medium text-gray-700">{activeTenant?.name || 'Toko Aktif'}</span>
            <span aria-hidden="true" className="mx-1.5 text-gray-300">&middot;</span>
            <span>Terakhir diperbarui {formattedUpdatedAt}{lastUpdatedMeta.updatedBy ? ` oleh ${lastUpdatedMeta.updatedBy}` : ''}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleReset}
            disabled={isSaving || isLoading}
            className="h-9 px-3.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-xs sm:text-sm font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            <RotateCcw size={15} />
            <span>Reset</span>
          </button>

          <button
            type="submit"
            disabled={isSaving || isLoading}
            className="h-9 px-4 bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-[0.98] disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
          </button>
        </div>
      </div>

      {fetchError && <ErrorBanner message={fetchError} onRetry={() => void loadSettings()} />}

      {/* Section Navigation Tabs */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {(
          [
            { key: 'profile', label: 'Profil Outlet', icon: Store },
            { key: 'pos_tax', label: 'Pajak PPN & POS', icon: Percent },
            { key: 'buyback_prices', label: 'Harga Acuan Buyback', icon: Coins },
            { key: 'receipt', label: 'Tampilan Nota Resmi', icon: FileText },
          ] as const
        ).map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`h-9 px-3.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-xl border border-gray-200/90 p-4 sm:p-6 space-y-5">
          <div>
            <h4 className="text-sm sm:text-base font-bold text-gray-900">Identitas &amp; Kontak Outlet</h4>
            <p className="text-xs text-gray-500 mt-0.5">
              Informasi ini tampil pada header nota faktur penjualan, surat buyback, dan daftar multi-outlet.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Nama Toko / Brand <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={storeName}
                onChange={e => setStoreName(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                placeholder="Toko Mas Sejahtera"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Nama Cabang / Lokasi <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={branchName}
                onChange={e => setBranchName(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                placeholder="Cabang Utama (Grand City Mall Lt. 1)"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nomor Telepon / WhatsApp</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 font-mono"
                placeholder="0812-8899-7766"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email Resmi Outlet</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                placeholder="admin@tokomassejahtera.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Kota / Wilayah</label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                placeholder="Jakarta Pusat"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Status Operasional Outlet</label>
              <CustomSelect
                value={status}
                onChange={val => setStatus(val as 'Aktif' | 'Trial' | 'Nonaktif')}
                disabled={userRole !== 'owner'}
                options={[
                  { value: 'Aktif', label: 'Aktif (Operasional Normal)' },
                  { value: 'Trial', label: 'Masa Uji Coba (Trial)' },
                  { value: 'Nonaktif', label: 'Nonaktif Sementara' },
                ]}
              />
              {userRole !== 'owner' && (
                <p className="text-xs text-gray-400 mt-1">Hanya Owner yang dapat mengubah status operasional outlet.</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Alamat Lengkap Outlet</label>
              <textarea
                rows={2}
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full p-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                placeholder="Jl. Pemuda No. 108..."
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pos_tax' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 bg-white rounded-xl border border-gray-200/90 p-4 sm:p-6 space-y-5">
            <div>
              <h4 className="text-sm sm:text-base font-bold text-gray-900">Konfigurasi Pajak PPN &amp; Kasir POS</h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Tarif PPN langsung diterapkan ke perhitungan keranjang Kasir POS dan backend checkout outlet ini.
              </p>
            </div>

            <div className="flex items-center justify-between gap-4 p-3.5 rounded-lg border border-gray-200 bg-gray-50/70">
              <div>
                <p className="text-sm font-semibold text-gray-900">Aktifkan PPN pada Transaksi Penjualan</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Nonaktifkan jika toko menggunakan harga net (Non-PKP) atau pajak sudah termasuk di harga jual.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={enablePpn}
                onClick={() => setEnablePpn(prev => !prev)}
                className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${
                  enablePpn ? 'bg-orange-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white transition-transform transform ${
                    enablePpn ? 'translate-x-5.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {enablePpn && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-gray-700">Pilih Preset atau Isi Tarif PPN (%)</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'PPN Emas 1,1% (PMK 48)', value: 1.1 },
                    { label: 'PPN Emas 1,65%', value: 1.65 },
                    { label: 'PPN Umum 11%', value: 11 },
                    { label: 'PPN Umum 12%', value: 12 },
                  ].map(preset => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setPpnPercent(preset.value)}
                      className={`h-8 px-3 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                        Number(ppnPercent) === preset.value
                          ? 'bg-orange-50 text-orange-700 border-orange-300'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="max-w-xs">
                  <NumericInput
                    value={ppnPercent}
                    onChange={val => setPpnPercent(val)}
                    allowDecimal
                    min={0}
                    max={30}
                    suffix="%"
                    className="h-10 px-3 text-sm font-mono font-bold bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            )}

            <div className="border-t border-gray-100 pt-4 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireCustomerOnSale}
                  onChange={e => setRequireCustomerOnSale(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-orange-500 rounded cursor-pointer"
                />
                <div>
                  <span className="text-sm font-semibold text-gray-800 block">
                    Wajibkan Data Pelanggan Member Saat Checkout
                  </span>
                  <span className="text-xs text-gray-500">
                    Ingatkan kasir untuk menautkan data pelanggan sebelum menyelesaikan pembayaran.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoPrintReceipt}
                  onChange={e => setAutoPrintReceipt(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-orange-500 rounded cursor-pointer"
                />
                <div>
                  <span className="text-sm font-semibold text-gray-800 block">
                    Tampilkan Opsi Cetak Cepat Setelah Transaksi Lunas
                  </span>
                  <span className="text-xs text-gray-500">
                    Otomatis memunculkan nota resmi emas siap cetak begitu pembayaran diselesaikan.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Live Tax Preview Card */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-gray-200/90 p-4 sm:p-6 flex flex-col justify-between space-y-4">
            <div>
              <h4 className="text-sm sm:text-base font-bold text-gray-900">Simulasi Kalkulasi POS Aktif</h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Contoh perhitungan invoice dengan konfigurasi PPN saat ini.
              </p>

              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50/70 p-4 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal Perhiasan</span>
                  <span className="font-mono font-semibold text-gray-900 tabular-nums">{formatIDR(sampleSubtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {enablePpn ? `PPN (${ppnPercent}%)` : 'PPN (Nonaktif / 0%)'}
                  </span>
                  <span className="font-mono font-semibold text-gray-900 tabular-nums">{formatIDR(sampleTax)}</span>
                </div>
                <div className="pt-2.5 border-t border-gray-200 flex justify-between items-center">
                  <span className="font-bold text-gray-900">Total Tagihan Kasir</span>
                  <span className="font-mono font-bold text-base text-orange-600 tabular-nums">
                    {formatIDR(sampleTotal)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 flex items-start gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <p>
                Perubahan tarif PPN akan langsung aktif pada keranjang POS &amp; server checkout tanpa perlu restart aplikasi.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'buyback_prices' && (
        <div className="bg-white rounded-xl border border-gray-200/90 p-4 sm:p-6 space-y-5">
          <div>
            <h4 className="text-sm sm:text-base font-bold text-gray-900">Standar Harga Acuan Buyback per Gram</h4>
            <p className="text-xs text-gray-500 mt-0.5">
              Harga acuan harian per gram sebagai panduan penaksir emas saat melayani transaksi buyback di outlet ini.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
              <label className="block text-xs font-bold text-gray-700">Kadar 24K (99.9% / LM)</label>
              <NumericInput
                prefix="Rp"
                value={price24k}
                onChange={setPrice24k}
                min={0}
                className="h-10 px-3 text-sm font-mono font-bold bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
              />
              <p className="text-xs text-gray-500 font-mono">{formatIDR(price24k)} / gr</p>
            </div>

            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
              <label className="block text-xs font-bold text-gray-700">Kadar 22K (91.6%)</label>
              <NumericInput
                prefix="Rp"
                value={price22k}
                onChange={setPrice22k}
                min={0}
                className="h-10 px-3 text-sm font-mono font-bold bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
              />
              <p className="text-xs text-gray-500 font-mono">{formatIDR(price22k)} / gr</p>
            </div>

            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
              <label className="block text-xs font-bold text-gray-700">Kadar 18K (75.0%)</label>
              <NumericInput
                prefix="Rp"
                value={price18k}
                onChange={setPrice18k}
                min={0}
                className="h-10 px-3 text-sm font-mono font-bold bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
              />
              <p className="text-xs text-gray-500 font-mono">{formatIDR(price18k)} / gr</p>
            </div>

            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
              <label className="block text-xs font-bold text-gray-700">Kadar 16K (70.0%)</label>
              <NumericInput
                prefix="Rp"
                value={price16k}
                onChange={setPrice16k}
                min={0}
                className="h-10 px-3 text-sm font-mono font-bold bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
              />
              <p className="text-xs text-gray-500 font-mono">{formatIDR(price16k)} / gr</p>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 flex items-start gap-2.5 text-xs text-amber-800">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p>
              Harga acuan di atas dapat diperbarui setiap pagi mengikuti fluktuasi harga emas spot / Antam harian.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'receipt' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-6 bg-white rounded-xl border border-gray-200/90 p-4 sm:p-6 space-y-4">
            <div>
              <h4 className="text-sm sm:text-base font-bold text-gray-900">Kustomisasi Nota Emas Resmi</h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Teks ini akan tercetak pada header dan kolom ketentuan bawah nota penjualan &amp; buyback.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tagline Brand di Header Nota</label>
              <input
                type="text"
                value={receiptTagline}
                onChange={e => setReceiptTagline(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 uppercase tracking-wider font-semibold"
                placeholder="GOLD & JEWELLERY"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Ketentuan Khusus / Catatan Footer Nota
              </label>
              <textarea
                rows={4}
                value={receiptFooterNote}
                onChange={e => setReceiptFooterNote(e.target.value)}
                className="w-full p-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                placeholder="Barang yang sudah dibeli dapat dijual kembali..."
              />
            </div>
          </div>

          <div className="lg:col-span-6 bg-white rounded-xl border border-gray-200/90 p-4 sm:p-6 space-y-3">
            <h4 className="text-sm sm:text-base font-bold text-gray-900">Pratinjau Header &amp; Ketentuan Nota</h4>
            <div className="border border-gray-300 rounded-lg p-4 bg-white space-y-4">
              <div className="flex items-start justify-between border-b border-gray-200 pb-3">
                <div>
                  <p className="text-lg font-bold uppercase text-[#8c671b] leading-none">
                    {storeName || 'e.paper'}
                  </p>
                  <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#9a7420] mt-1">
                    {receiptTagline || 'GOLD & JEWELLERY'}
                  </p>
                </div>
                <div className="text-right text-xs text-gray-600">
                  <p className="font-bold text-gray-800">{branchName || 'Cabang Utama'}</p>
                  <p>{phone || '-'}</p>
                </div>
              </div>

              <div className="text-xs text-gray-600 space-y-1">
                <p className="font-bold text-gray-900 uppercase">Catatan Outlet:</p>
                <p className="leading-relaxed">{receiptFooterNote}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};
