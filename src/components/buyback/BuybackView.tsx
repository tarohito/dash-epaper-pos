import React, { useState } from 'react';
import { Search, Printer, ChevronDown } from 'lucide-react';
import { BuybackItem } from '../../types';
import { formatIDR, formatNumber } from '../../utils/formatters';
import { KADAR_PRESETS } from '../../constants/kadar';

interface BuybackViewProps {
  buybacks: BuybackItem[];
  onSaveBuyback: (newBuyback: Omit<BuybackItem, 'id' | 'invoiceNo' | 'date'>) => void;
  onSelectReceipt: (item: BuybackItem) => void;
  onBackToPos: () => void;
  initialCustomer?: { name: string; phone: string } | null;
}

export const BuybackView: React.FC<BuybackViewProps> = ({
  buybacks,
  onSaveBuyback,
  onSelectReceipt,
  initialCustomer,
}) => {
  const [activeMobileTab, setActiveMobileTab] = useState<'form' | 'history'>('form');
  const [buybackSearch, setBuybackSearch] = useState('');
  const [formData, setFormData] = useState({
    customerName: initialCustomer?.name || '',
    customerPhone: initialCustomer?.phone || '',
    sourceNote: '',
    itemType: 'Cincin',
    kadar: '24K (99.9%)',
    beratKotor: '',
    potonganBatu: '0.00',
    hargaPerGram: (KADAR_PRESETS['24K (99.9%)'] || 1250000).toString(),
    biayaLebur: '0',
    kondisi: 'Mulus (Lengkap Surat)',
    paymentMethod: 'cash' as 'cash' | 'transfer',
    bankName: 'BCA',
    accountNo: '',
    catatan: '',
  });

  React.useEffect(() => {
    if (initialCustomer) {
      setFormData(prev => ({
        ...prev,
        customerName: initialCustomer.name,
        customerPhone: initialCustomer.phone || '',
      }));
    }
  }, [initialCustomer]);

  const handleKadarChange = (kadar: string) => {
    const defaultPrice = KADAR_PRESETS[kadar] || 1000000;
    setFormData(prev => ({
      ...prev,
      kadar,
      hargaPerGram: defaultPrice.toString(),
    }));
  };

  // Kalkulasi berat bersih & total pencairan
  const beratKotorNum = parseFloat(formData.beratKotor) || 0;
  const potonganBatuNum = parseFloat(formData.potonganBatu) || 0;
  const beratBersihNum = Math.max(0, +(beratKotorNum - potonganBatuNum).toFixed(2));
  const hargaPerGramNum = parseFloat(formData.hargaPerGram.replace(/[^0-9]/g, '')) || 0;
  const biayaLeburNum = parseFloat(formData.biayaLebur.replace(/[^0-9]/g, '')) || 0;
  const totalPencairan = Math.max(0, Math.round(beratBersihNum * hargaPerGramNum - biayaLeburNum));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName.trim()) {
      alert('Harap isi nama pelanggan.');
      return;
    }
    if (beratBersihNum <= 0) {
      alert('Berat bersih emas harus lebih dari 0 gram.');
      return;
    }
    if (hargaPerGramNum <= 0) {
      alert('Harga beli per gram harus lebih dari Rp 0.');
      return;
    }

    onSaveBuyback({
      customerName: formData.customerName.trim(),
      customerPhone: formData.customerPhone.trim() || '-',
      sourceNote: formData.sourceNote.trim() || 'Toko Ini',
      itemType: formData.itemType,
      kadar: formData.kadar,
      beratKotor: beratKotorNum,
      potonganBatu: potonganBatuNum,
      beratBersih: beratBersihNum,
      hargaPerGram: hargaPerGramNum,
      biayaLebur: biayaLeburNum,
      kondisi: formData.kondisi,
      totalBayar: totalPencairan,
      paymentMethod: formData.paymentMethod,
      bankName: formData.paymentMethod === 'transfer' ? formData.bankName : undefined,
      accountNo: formData.paymentMethod === 'transfer' ? formData.accountNo : undefined,
      catatan: formData.catatan.trim() || '-',
    });

    // Reset Form ke keadaan awal
    setFormData({
      customerName: '',
      customerPhone: '',
      sourceNote: '',
      itemType: 'Cincin',
      kadar: '24K (99.9%)',
      beratKotor: '',
      potonganBatu: '0.00',
      hargaPerGram: (KADAR_PRESETS['24K (99.9%)'] || 1250000).toString(),
      biayaLebur: '0',
      kondisi: 'Mulus (Lengkap Surat)',
      paymentMethod: 'cash',
      bankName: 'BCA',
      accountNo: '',
      catatan: '',
    });

    // Jika di layar HP/Tablet kecil, alihkan otomatis ke tab riwayat agar kasir langsung melihat transaksi
    setActiveMobileTab('history');
  };

  const totalBuybackToday = buybacks.reduce((acc, b) => acc + b.totalBayar, 0);
  const totalGramasiMasuk = buybacks.reduce((acc, b) => acc + b.beratBersih, 0);

  const filteredBuybacks = buybacks.filter(
    b =>
      b.invoiceNo.toLowerCase().includes(buybackSearch.toLowerCase()) ||
      b.customerName.toLowerCase().includes(buybackSearch.toLowerCase()) ||
      b.itemType.toLowerCase().includes(buybackSearch.toLowerCase())
  );

  return (
    <div className="space-y-3.5 sm:space-y-4 w-full pb-10">
      {/* 1. HEADER RESPONSIF (HP / TABLET / LAPTOP / DESKTOP) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-5 rounded-lg border border-gray-200">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
            Buyback (Pembelian Emas)
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Penerimaan kembali perhiasan emas pelanggan dan pencairan dana langsung
          </p>
        </div>

        {/* Ringkasan Akumulasi Hari Ini */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 bg-gray-50 p-2.5 sm:px-3.5 sm:py-2 rounded-lg border border-gray-200 w-full sm:w-auto">
          <div>
            <span className="text-xs text-gray-500 font-medium block">
              Total Pembelian Hari Ini
            </span>
            <span className="text-xs sm:text-sm font-bold text-orange-600 block truncate">
              {formatIDR(totalBuybackToday)}
            </span>
          </div>
          <div className="hidden sm:block w-px h-7 bg-gray-200" />
          <div>
            <span className="text-xs text-gray-500 font-medium block">
              Gramasi Masuk
            </span>
            <span className="text-xs sm:text-sm font-bold text-gray-900 block truncate">
              {totalGramasiMasuk.toFixed(2)} g
            </span>
          </div>
        </div>
      </div>

      {/* 2. TAB SWITCHER KHUSUS LAYAR HP & TABLET KECIL (< lg) */}
      <div className="flex lg:hidden bg-gray-100 p-1 rounded-lg border border-gray-200">
        <button
          type="button"
          onClick={() => setActiveMobileTab('form')}
          className={`flex-1 py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${
            activeMobileTab === 'form'
              ? 'bg-orange-500 text-white shadow-none'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Form Input Buyback
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab('history')}
          className={`flex-1 py-2 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeMobileTab === 'history'
              ? 'bg-orange-500 text-white shadow-none'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span>Riwayat Buyback</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeMobileTab === 'history'
                ? 'bg-white/25 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            {buybacks.length}
          </span>
        </button>
      </div>

      {/* 3. GRID UTAMA: FORM INPUT & RIWAYAT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Sisi Kiri: Form Transaksi Buyback Baru */}
        <div
          className={`lg:col-span-7 xl:col-span-8 bg-white p-4 sm:p-5 rounded-lg border border-gray-200 ${
            activeMobileTab === 'form' ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="pb-3 border-b border-gray-100 mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">
              Form Pembelian Emas
            </h2>
            <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
              Transaksi Baru
            </span>
          </div>

          <form onSubmit={handleSubmit} id="buyback-form" className="space-y-4">
            {/* Bagian 1: Data Pelanggan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nama Pelanggan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.customerName}
                  onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="Masukkan nama pelanggan"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs font-medium focus:bg-white focus:outline-none focus:border-orange-500 transition-colors min-h-[38px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  No. Telepon / WhatsApp
                </label>
                <input
                  type="text"
                  value={formData.customerPhone}
                  onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
                  placeholder="08xxxxxxxxxx (opsional)"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs font-medium focus:bg-white focus:outline-none focus:border-orange-500 transition-colors min-h-[38px]"
                />
              </div>
            </div>

            {/* Bagian 2: Data Perhiasan & Kadar Emas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Jenis Perhiasan
                </label>
                <div className="relative">
                  <select
                    value={formData.itemType}
                    onChange={e => setFormData({ ...formData, itemType: e.target.value })}
                    className="w-full appearance-none pl-3 pr-8 py-2 bg-gray-50 hover:bg-white border border-gray-200 hover:border-gray-300 rounded-md text-xs font-medium text-gray-800 focus:bg-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 cursor-pointer transition-colors min-h-[38px]"
                  >
                    {[
                      'Cincin',
                      'Gelang',
                      'Kalung',
                      'Anting',
                      'Liontin',
                      'Bros',
                      'Emas Batangan (Logam Mulia)',
                      'Lainnya',
                    ].map(it => (
                      <option key={it} value={it}>
                        {it}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Kadar Karat Emas
                </label>
                <div className="relative">
                  <select
                    value={formData.kadar}
                    onChange={e => handleKadarChange(e.target.value)}
                    className="w-full appearance-none pl-3 pr-8 py-2 bg-gray-50 hover:bg-white border border-gray-200 hover:border-gray-300 rounded-md text-xs font-bold text-orange-600 focus:bg-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 cursor-pointer transition-colors min-h-[38px]"
                  >
                    {Object.keys(KADAR_PRESETS).map(k => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-orange-500 pointer-events-none"
                  />
                </div>
              </div>

              <div className="sm:col-span-2 md:col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Harga Beli / Gram
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-xs font-bold text-gray-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    value={formatNumber(formData.hargaPerGram)}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      setFormData({ ...formData, hargaPerGram: raw });
                    }}
                    className="w-full pl-8 pr-2.5 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs font-bold text-gray-900 focus:bg-white focus:outline-none focus:border-orange-500 min-h-[38px]"
                  />
                </div>
              </div>
            </div>

            {/* Bagian 3: Penimbangan Fisik (Gramasi Responsif) */}
            <div className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800 block">
                  Hasil Penimbangan Emas
                </span>
                <span className="text-[10px] text-gray-500">
                  Satuan: Gram (g)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Berat Kotor (g) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formData.beratKotor}
                    onChange={e => setFormData({ ...formData, beratKotor: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-xs sm:text-sm font-bold text-gray-900 focus:outline-none focus:border-orange-500 min-h-[38px]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Potongan Batu / Kotoran (g)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.potonganBatu}
                    onChange={e => setFormData({ ...formData, potonganBatu: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-xs sm:text-sm font-bold text-gray-700 focus:outline-none focus:border-orange-500 min-h-[38px]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Berat Bersih Emas (g)
                  </label>
                  <div className="px-3 py-2 bg-orange-50 border border-orange-200 rounded-md text-xs sm:text-sm font-black text-orange-700 text-center flex items-center justify-center min-h-[38px]">
                    {beratBersihNum.toFixed(2)} gram
                  </div>
                </div>
              </div>
            </div>

            {/* Bagian 4: Kondisi & Potongan Biaya */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Kondisi Fisik Barang
                </label>
                <div className="relative">
                  <select
                    value={formData.kondisi}
                    onChange={e => setFormData({ ...formData, kondisi: e.target.value })}
                    className="w-full appearance-none pl-3 pr-8 py-2 bg-gray-50 hover:bg-white border border-gray-200 hover:border-gray-300 rounded-md text-xs font-medium text-gray-800 focus:bg-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 cursor-pointer transition-colors min-h-[38px]"
                  >
                    <option value="Mulus (Lengkap Surat)">Mulus (Lengkap Surat)</option>
                    <option value="Lecet Pemakaian Wajar">Lecet Pemakaian Wajar</option>
                    <option value="Patah / Rusak Ringan">Patah / Rusak Ringan</option>
                    <option value="Tanpa Surat / Luar Toko">Tanpa Surat / Luar Toko</option>
                    <option value="Perlu Lebur Ulang">Perlu Lebur Ulang</option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Potongan Biaya / Ongkos Lebur (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-xs font-bold text-gray-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    value={formData.biayaLebur ? formatNumber(formData.biayaLebur) : ''}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      setFormData({ ...formData, biayaLebur: raw });
                    }}
                    placeholder="0"
                    className="w-full pl-8 pr-2.5 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs font-medium focus:bg-white focus:outline-none focus:border-orange-500 min-h-[38px]"
                  />
                </div>
              </div>
            </div>

            {/* Bagian 5: Asal Barang & Metode Pembayaran */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Asal Nota / Pembelian
                </label>
                <input
                  type="text"
                  value={formData.sourceNote}
                  onChange={e => setFormData({ ...formData, sourceNote: e.target.value })}
                  placeholder="Toko Ini / Luar Toko / No. Nota"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs font-medium focus:bg-white focus:outline-none focus:border-orange-500 min-h-[38px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Metode Pencairan Dana
                </label>
                <div className="flex flex-wrap gap-3 sm:gap-4 pt-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="bbPayment"
                      checked={formData.paymentMethod === 'cash'}
                      onChange={() => setFormData({ ...formData, paymentMethod: 'cash' })}
                      className="text-orange-500 focus:ring-orange-500"
                    />
                    <span>Tunai (Kas Toko)</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="bbPayment"
                      checked={formData.paymentMethod === 'transfer'}
                      onChange={() => setFormData({ ...formData, paymentMethod: 'transfer' })}
                      className="text-orange-500 focus:ring-orange-500"
                    />
                    <span>Transfer Bank</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Input Tambahan Jika Transfer Bank */}
            {formData.paymentMethod === 'transfer' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Nama Bank
                  </label>
                  <input
                    type="text"
                    placeholder="BCA / Mandiri / BRI / BNI"
                    value={formData.bankName}
                    onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-md text-xs min-h-[36px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Nomor Rekening Tujuan
                  </label>
                  <input
                    type="text"
                    placeholder="Nomor rekening penerima"
                    value={formData.accountNo}
                    onChange={e => setFormData({ ...formData, accountNo: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-md text-xs min-h-[36px]"
                  />
                </div>
              </div>
            )}

            {/* Panel Total Pencairan & Tombol Submit (Responsif di Semua Layar) */}
            <div className="pt-4 border-t border-gray-100 mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/60 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-3.5 sm:p-5 rounded-b-lg border-t">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold block">
                  Total Pencairan Dana:
                </span>
                <span className="text-lg sm:text-xl font-bold text-orange-600 block leading-tight">
                  {formatIDR(totalPencairan)}
                </span>
                <span className="text-xs text-gray-500 block mt-0.5">
                  {beratBersihNum} g &times; {formatIDR(hargaPerGramNum)}{' '}
                  {biayaLeburNum > 0 ? `- Potongan ${formatIDR(biayaLeburNum)}` : ''}
                </span>
              </div>

              <button
                type="submit"
                form="buyback-form"
                className="w-full sm:w-auto px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm rounded-md transition-colors cursor-pointer shadow-none min-h-[44px] flex items-center justify-center gap-2"
              >
                <span>Selesaikan & Cetak Nota</span>
              </button>
            </div>
          </form>
        </div>

        {/* Sisi Kanan: Riwayat Transaksi Buyback */}
        <div
          className={`lg:col-span-5 xl:col-span-4 bg-white p-4 sm:p-5 rounded-lg border border-gray-200 flex flex-col ${
            activeMobileTab === 'history' ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="pb-3 border-b border-gray-100 mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-gray-900 leading-tight">
                Riwayat Buyback
              </h2>
              <span className="text-xs text-gray-400">
                {buybacks.length} transaksi tercatat
              </span>
            </div>

            {/* Search Bar Cepat */}
            <div className="relative w-36 sm:w-44">
              <Search size={13} className="absolute left-2.5 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari..."
                value={buybackSearch}
                onChange={e => setBuybackSearch(e.target.value)}
                className="w-full pl-7 pr-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-xs focus:bg-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* List Riwayat */}
          <div className="divide-y divide-gray-100 max-h-[520px] overflow-y-auto pr-1">
            {filteredBuybacks.map(bb => (
              <div
                key={bb.id}
                className="py-3 flex items-center justify-between gap-3 text-xs hover:bg-gray-50/60 transition-colors px-1 rounded"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-gray-900 truncate">
                      {bb.customerName}
                    </span>
                    <span className="text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded">
                      {bb.kadar}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {bb.itemType} • {bb.beratBersih}g bersih
                  </p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    {bb.invoiceNo}
                  </p>
                </div>

                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <span className="font-bold text-gray-900 text-xs sm:text-sm">
                    {formatIDR(bb.totalBayar)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectReceipt(bb)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer"
                  >
                    <Printer size={12} />
                    <span>Nota</span>
                  </button>
                </div>
              </div>
            ))}

            {filteredBuybacks.length === 0 && (
              <div className="text-center py-10 text-gray-400 text-xs">
                Belum ada transaksi buyback yang cocok.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
