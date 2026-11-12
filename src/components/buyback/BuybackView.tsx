import React, { useState } from 'react';
import { RotateCcw, ChevronLeft, Scale, CheckCircle2, Search, FileText } from 'lucide-react';
import { BuybackItem } from '../../types';
import { formatIDR, formatNumber } from '../../utils/formatters';
import { KADAR_PRESETS } from '../../constants/kadar';

interface BuybackViewProps {
  buybacks: BuybackItem[];
  onSaveBuyback: (newBuyback: Omit<BuybackItem, 'id' | 'invoiceNo' | 'date'>) => void;
  onSelectReceipt: (item: BuybackItem) => void;
  onBackToPos: () => void;
}

export const BuybackView: React.FC<BuybackViewProps> = ({
  buybacks,
  onSaveBuyback,
  onSelectReceipt,
  onBackToPos,
}) => {
  const [buybackSearch, setBuybackSearch] = useState('');
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    sourceNote: '',
    itemType: 'Cincin',
    kadar: '24K (99.9%)',
    beratKotor: '3.50',
    potonganBatu: '0.00',
    hargaPerGram: '1250000',
    biayaLebur: '0',
    kondisi: 'Mulus (Lengkap Surat)',
    paymentMethod: 'cash' as 'cash' | 'transfer',
    bankName: 'BCA',
    accountNo: '',
    catatan: '',
  });

  const handleKadarChange = (kadar: string) => {
    const defaultPrice = KADAR_PRESETS[kadar] || 1000000;
    setFormData(prev => ({
      ...prev,
      kadar,
      hargaPerGram: defaultPrice.toString(),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName.trim()) {
      alert('Harap isi nama pelanggan.');
      return;
    }
    const beratKotorNum = parseFloat(formData.beratKotor) || 0;
    const potonganBatuNum = parseFloat(formData.potonganBatu) || 0;
    const beratBersihNum = Math.max(0, +(beratKotorNum - potonganBatuNum).toFixed(2));
    const hargaPerGramNum = parseFloat(formData.hargaPerGram.replace(/[^0-9]/g, '')) || 0;
    const biayaLeburNum = parseFloat(formData.biayaLebur.replace(/[^0-9]/g, '')) || 0;

    if (beratBersihNum <= 0) {
      alert('Berat bersih emas harus lebih dari 0 gram.');
      return;
    }
    if (hargaPerGramNum <= 0) {
      alert('Harga beli per gram harus lebih dari Rp 0.');
      return;
    }

    const totalBayar = Math.max(0, Math.round(beratBersihNum * hargaPerGramNum - biayaLeburNum));

    onSaveBuyback({
      customerName: formData.customerName.trim(),
      customerPhone: formData.customerPhone.trim() || '-',
      sourceNote: formData.sourceNote.trim() || '-',
      itemType: formData.itemType,
      kadar: formData.kadar,
      beratKotor: beratKotorNum,
      potonganBatu: potonganBatuNum,
      beratBersih: beratBersihNum,
      hargaPerGram: hargaPerGramNum,
      biayaLebur: biayaLeburNum,
      kondisi: formData.kondisi,
      totalBayar,
      paymentMethod: formData.paymentMethod,
      bankName: formData.paymentMethod === 'transfer' ? formData.bankName : undefined,
      accountNo: formData.paymentMethod === 'transfer' ? formData.accountNo : undefined,
      catatan: formData.catatan.trim() || '-',
    });

    // Reset Form
    setFormData({
      customerName: '',
      customerPhone: '',
      sourceNote: '',
      itemType: 'Cincin',
      kadar: '24K (99.9%)',
      beratKotor: '3.50',
      potonganBatu: '0.00',
      hargaPerGram: '1250000',
      biayaLebur: '0',
      kondisi: 'Mulus (Lengkap Surat)',
      paymentMethod: 'cash',
      bankName: 'BCA',
      accountNo: '',
      catatan: '',
    });
  };

  const totalBuybackToday = buybacks.reduce((acc, b) => acc + b.totalBayar, 0);
  const totalGramasiMasuk = buybacks.reduce((acc, b) => acc + b.beratBersih, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-orange-100 text-orange-600 rounded-xl">
              <RotateCcw size={20} />
            </span>
            <h2 className="text-xl font-extrabold text-gray-900">Pembelian Kembali (Buyback Perhiasan)</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Penerimaan kembali perhiasan emas & logam mulia, penimbangan fisik, uji kadar karat, dan pencairan dana ke pelanggan.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 bg-orange-50/80 px-4 py-2 rounded-xl border border-orange-100">
            <div>
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Total Buyback Hari Ini</p>
              <p className="text-sm font-black text-orange-600">{formatIDR(totalBuybackToday)}</p>
            </div>
            <div className="w-px h-8 bg-orange-200" />
            <div>
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Gramasi Masuk</p>
              <p className="text-sm font-black text-gray-800">{totalGramasiMasuk.toFixed(2)} g</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onBackToPos}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <ChevronLeft size={16} />
            Kasir POS
          </button>
        </div>
      </div>

      {/* Main Grid: Form Input Buyback & Riwayat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Form Transaksi Buyback Baru */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-gray-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Scale size={18} className="text-orange-500" />
                Form Penimbangan & Penaksiran Buyback
              </h3>
              <span className="text-[11px] font-bold px-2.5 py-1 bg-orange-50 text-orange-700 rounded-lg font-mono">
                Faktur: BB-{new Date().getFullYear()}
                {(new Date().getMonth() + 1).toString().padStart(2, '0')}
                {new Date().getDate().toString().padStart(2, '0')}-{(buybacks.length + 1).toString().padStart(3, '0')}
              </span>
            </div>

            <form onSubmit={handleSubmit} id="buyback-form" className="space-y-4">
              {/* Row 1: Data Pelanggan */}
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
                    placeholder="Cth: Hj. Siti Rahmah"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">No. Telepon / WhatsApp</label>
                  <input
                    type="text"
                    value={formData.customerPhone}
                    onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
                    placeholder="Cth: 08123456789"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Row 2: Jenis Perhiasan & Asal Surat */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Jenis Barang</label>
                  <select
                    value={formData.itemType}
                    onChange={e => setFormData({ ...formData, itemType: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-orange-500"
                  >
                    {[
                      'Cincin',
                      'Gelang',
                      'Kalung',
                      'Anting',
                      'Liontin',
                      'Bros',
                      'Logam Mulia / Emas Batangan',
                      'Lainnya',
                    ].map(it => (
                      <option key={it} value={it}>
                        {it}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    No. Nota Toko Asal (Jika Ada)
                  </label>
                  <input
                    type="text"
                    value={formData.sourceNote}
                    onChange={e => setFormData({ ...formData, sourceNote: e.target.value })}
                    placeholder="Cth: TRX-20261015-089 (Kosongkan jika luar toko)"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Row 3: Kadar Karat & Harga Beli per Gram */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Kadar Karat Emas</label>
                  <select
                    value={formData.kadar}
                    onChange={e => handleKadarChange(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-orange-600 focus:bg-white focus:outline-none focus:border-orange-500"
                  >
                    {Object.keys(KADAR_PRESETS).map(k => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Harga Beli Hari Ini / Gram</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-gray-400">Rp</span>
                    <input
                      type="text"
                      value={formatNumber(formData.hargaPerGram)}
                      onChange={e => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        setFormData({ ...formData, hargaPerGram: raw });
                      }}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Timbangan Fisik (Gramasi) */}
              <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-200/80 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                  <span className="flex items-center gap-1.5">
                    <Scale size={14} className="text-amber-600" />
                    Penimbangan & Kalkulasi Gramasi
                  </span>
                  <span className="text-[11px] text-amber-700 font-normal">Timbangan digital terverifikasi</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Berat Kotor (g)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.beratKotor}
                      onChange={e => setFormData({ ...formData, beratKotor: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Potongan Batu (g)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.potonganBatu}
                      onChange={e => setFormData({ ...formData, potonganBatu: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-red-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Berat Bersih Emas (g)</label>
                    <div className="px-2.5 py-1.5 bg-amber-100/70 border border-amber-300 rounded-lg text-xs font-black text-amber-900 text-center">
                      {Math.max(
                        0,
                        +((parseFloat(formData.beratKotor) || 0) - (parseFloat(formData.potonganBatu) || 0)).toFixed(2)
                      )}{' '}
                      g
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 5: Biaya Lebur & Kondisi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Kondisi Fisik Barang</label>
                  <select
                    value={formData.kondisi}
                    onChange={e => setFormData({ ...formData, kondisi: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="Mulus (Lengkap Surat)">Mulus (Lengkap Surat)</option>
                    <option value="Lecet Pemakaian Wajar">Lecet Pemakaian Wajar</option>
                    <option value="Patah / Rusak Ringan">Patah / Rusak Ringan</option>
                    <option value="Tanpa Surat / Luar Toko">Tanpa Surat / Luar Toko</option>
                    <option value="Perlu Lebur Ulang">Perlu Lebur Ulang</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Potongan Ongkos / Biaya Lebur</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-gray-400">Rp</span>
                    <input
                      type="text"
                      value={formData.biayaLebur ? formatNumber(formData.biayaLebur) : ''}
                      onChange={e => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        setFormData({ ...formData, biayaLebur: raw });
                      }}
                      placeholder="0"
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Row 6: Metode Pembayaran ke Pelanggan */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                <label className="block text-xs font-semibold text-gray-700">Metode Pencairan Dana ke Pelanggan</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="bbPayment"
                      checked={formData.paymentMethod === 'cash'}
                      onChange={() => setFormData({ ...formData, paymentMethod: 'cash' })}
                      className="text-orange-600 focus:ring-orange-500"
                    />
                    Tunai / Kas Toko
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="bbPayment"
                      checked={formData.paymentMethod === 'transfer'}
                      onChange={() => setFormData({ ...formData, paymentMethod: 'transfer' })}
                      className="text-orange-600 focus:ring-orange-500"
                    />
                    Transfer Bank
                  </label>
                </div>

                {formData.paymentMethod === 'transfer' && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
                    <div>
                      <input
                        type="text"
                        placeholder="Nama Bank (BCA / Mandiri / BRI)"
                        value={formData.bankName}
                        onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Nomor Rekening Pelanggan"
                        value={formData.accountNo}
                        onChange={e => setFormData({ ...formData, accountNo: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* Total Calculation & Action Buttons */}
          <div className="pt-4 border-t border-gray-100 mt-4">
            {(() => {
              const bk = parseFloat(formData.beratKotor) || 0;
              const pb = parseFloat(formData.potonganBatu) || 0;
              const bb = Math.max(0, +(bk - pb).toFixed(2));
              const hg = parseFloat(formData.hargaPerGram.replace(/[^0-9]/g, '')) || 0;
              const bl = parseFloat(formData.biayaLebur.replace(/[^0-9]/g, '')) || 0;
              const total = Math.max(0, Math.round(bb * hg - bl));

              return (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">
                      Total Pencairan ke Pelanggan:
                    </p>
                    <p className="text-2xl font-black text-orange-600">{formatIDR(total)}</p>
                    <p className="text-[10px] text-gray-400">
                      {bb} gram x {formatIDR(hg)} {bl > 0 ? `- Potongan ${formatIDR(bl)}` : ''}
                    </p>
                  </div>

                  <button
                    type="submit"
                    form="buyback-form"
                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 size={18} />
                    Proses & Cetak Nota Buyback
                  </button>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Right: Riwayat Transaksi Buyback Hari Ini */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-200 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Riwayat Buyback</h3>
              <p className="text-xs text-gray-500">{buybacks.length} transaksi tercatat</p>
            </div>
            <div className="relative w-44">
              <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari faktur / nama..."
                value={buybackSearch}
                onChange={e => setBuybackSearch(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto max-h-[560px] space-y-3 pr-1">
            {buybacks
              .filter(
                b =>
                  b.invoiceNo.toLowerCase().includes(buybackSearch.toLowerCase()) ||
                  b.customerName.toLowerCase().includes(buybackSearch.toLowerCase()) ||
                  b.itemType.toLowerCase().includes(buybackSearch.toLowerCase())
              )
              .map(bb => (
                <div
                  key={bb.id}
                  className="p-3.5 rounded-xl border border-gray-100 hover:border-orange-300 bg-gray-50/60 hover:bg-orange-50/30 transition-all flex flex-col justify-between gap-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-gray-900">{bb.customerName}</span>
                        <span className="text-[10px] bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded">
                          {bb.kadar}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {bb.itemType} • {bb.beratBersih}g bersih
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-orange-600 block">{formatIDR(bb.totalBayar)}</span>
                      <span className="text-[10px] text-gray-400 uppercase font-medium">{bb.paymentMethod}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                    <span className="font-mono">{bb.invoiceNo}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectReceipt(bb)}
                        className="text-xs font-semibold text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <FileText size={12} />
                        Nota
                      </button>
                    </div>
                  </div>
                </div>
              ))}

            {buybacks.length === 0 && (
              <div className="text-center py-12 text-gray-400 text-xs">Belum ada riwayat transaksi buyback.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
