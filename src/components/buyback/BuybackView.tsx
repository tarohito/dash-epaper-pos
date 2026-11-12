import React, { useState } from 'react';
import {
  Search,
  Coins,
  Scale,
  ReceiptText,
  Calendar,
  Building2,
  FileText,
  Plus,
  Printer,
} from 'lucide-react';
import { BuybackItem } from '../../types';
import { formatIDR } from '../../utils/formatters';
import { BuybackFormPage } from './BuybackFormPage';
import Tooltip from '../Tooltip';

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
  onBackToPos,
  initialCustomer,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'form'>(() => {
    return initialCustomer ? 'form' : 'list';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMethod, setFilterMethod] = useState<'all' | 'transfer' | 'cash'>('all');
  const [tableDensity, setTableDensity] = useState<'compact' | 'detailed'>('compact');

  // Filtered Buybacks
  const filteredBuybacks = buybacks.filter(bb => {
    const matchesSearch =
      bb.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bb.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bb.customerPhone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (bb.customerNik && bb.customerNik.includes(searchQuery)) ||
      bb.itemType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bb.kadar.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesMethod = filterMethod === 'all' || bb.paymentMethod === filterMethod;
    return matchesSearch && matchesMethod;
  });

  // KPI Metrics
  const totalDanaDicairkan = buybacks.reduce((sum, b) => sum + b.totalBayar, 0);
  const totalBeratDiterima = buybacks.reduce((sum, b) => sum + b.beratBersih, 0);
  const totalTransaksi = buybacks.length;
  const avgPerTransaksi = totalTransaksi > 0 ? Math.round(totalDanaDicairkan / totalTransaksi) : 0;

  // Jika sedang membuka Form Buyback Mandiri
  if (viewMode === 'form') {
    return (
      <BuybackFormPage
        onSaveBuyback={newBuyback => {
          onSaveBuyback(newBuyback);
          setViewMode('list');
        }}
        onCancel={() => setViewMode('list')}
        initialCustomer={initialCustomer}
        existingCount={buybacks.length}
      />
    );
  }

  // Tampilan Depan: Satu Kesatuan Card Besar Konsisten dengan Halaman Dashboard
  return (
    <div className="space-y-5 pb-8">
      {/* 1 CARD BESAR SATU KESATUAN (KONSISTEN DENGAN DASHBOARD) */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5">
        {/* Header: Judul, Subtitle, dan CTA Tombol Baru (Garis tidak ngefull, tanpa badge transaksi) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-tight">
              Daftar Transaksi Buyback (Pembelian Emas)
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Arsip dan riwayat pembelian kembali emas nasabah, leburan, dan logam mulia bersertifikat.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('form')}
              className="h-9 px-4 text-xs sm:text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-[0.98]"
            >
              <Plus size={16} />
              <span>Transaksi Buyback Baru</span>
            </button>
          </div>
        </div>

        {/* 4 Card Metrik KPI Sub-Cards Grid (Format & Style Persis Sub-Cards Dashboard) */}
        <div className="pt-4 pb-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* KPI 1: Total Dana Dicairkan */}
            <div className="bg-gray-50/70 hover:bg-orange-50/30 p-3 sm:p-3.5 rounded-lg border border-gray-200/80 hover:border-orange-200 flex flex-col justify-between transition-all">
              <div className="flex items-center justify-between text-gray-500 mb-1.5">
                <span className="text-xs sm:text-sm text-gray-700 font-semibold leading-tight truncate">
                  Total Dana Dicairkan
                </span>
                <Coins size={15} className="text-orange-500 shrink-0" />
              </div>
              <div className="text-base sm:text-lg lg:text-xl font-bold font-mono text-gray-900 truncate tabular-nums">
                {formatIDR(totalDanaDicairkan)}
              </div>
              <span className="text-xs text-gray-400 mt-1">Uang keluar untuk buyback</span>
            </div>

            {/* KPI 2: Total Berat Emas */}
            <div className="bg-gray-50/70 hover:bg-orange-50/30 p-3 sm:p-3.5 rounded-lg border border-gray-200/80 hover:border-orange-200 flex flex-col justify-between transition-all">
              <div className="flex items-center justify-between text-gray-500 mb-1.5">
                <span className="text-xs sm:text-sm text-gray-700 font-semibold leading-tight truncate">
                  Total Berat Emas
                </span>
                <Scale size={15} className="text-amber-500 shrink-0" />
              </div>
              <div className="text-base sm:text-lg lg:text-xl font-bold font-mono text-gray-900 truncate tabular-nums">
                {totalBeratDiterima.toFixed(2)} gr
              </div>
              <span className="text-xs text-gray-400 mt-1">Fisik emas masuk ke toko</span>
            </div>

            {/* KPI 3: Total Transaksi */}
            <div className="bg-gray-50/70 hover:bg-orange-50/30 p-3 sm:p-3.5 rounded-lg border border-gray-200/80 hover:border-orange-200 flex flex-col justify-between transition-all">
              <div className="flex items-center justify-between text-gray-500 mb-1.5">
                <span className="text-xs sm:text-sm text-gray-700 font-semibold leading-tight truncate">
                  Total Transaksi
                </span>
                <ReceiptText size={15} className="text-blue-500 shrink-0" />
              </div>
              <div className="text-base sm:text-lg lg:text-xl font-bold font-mono text-gray-900 truncate tabular-nums">
                {totalTransaksi} Nota
              </div>
              <span className="text-xs text-gray-400 mt-1">Selesai &amp; terverifikasi</span>
            </div>

            {/* KPI 4: Rata-rata / Nota */}
            <div className="bg-gray-50/70 hover:bg-orange-50/30 p-3 sm:p-3.5 rounded-lg border border-gray-200/80 hover:border-orange-200 flex flex-col justify-between transition-all">
              <div className="flex items-center justify-between text-gray-500 mb-1.5">
                <span className="text-xs sm:text-sm text-gray-700 font-semibold leading-tight truncate">
                  Rata-rata / Nota
                </span>
                <Building2 size={15} className="text-emerald-500 shrink-0" />
              </div>
              <div className="text-base sm:text-lg lg:text-xl font-bold font-mono text-gray-900 truncate tabular-nums">
                {formatIDR(avgPerTransaksi)}
              </div>
              <span className="text-xs text-gray-400 mt-1">Rata-rata per nasabah</span>
            </div>
          </div>
        </div>

        {/* Section Divider & Table Section */}
        <div className="pt-4 mt-2 border-t border-gray-100">
          {/* Controls Bar: Search, Method Filter & Density Toggle */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-4">
            <div className="relative w-full md:w-80">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari no nota, nasabah, NIK, jenis emas..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-xs sm:text-sm bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-500 outline-none leading-normal"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Filter Metode Pembayaran */}
              <div className="inline-flex h-9 p-0.5 bg-gray-100 rounded-lg border border-gray-200 items-center">
                <button
                  type="button"
                  onClick={() => setFilterMethod('all')}
                  className={`h-full px-3 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center ${
                    filterMethod === 'all'
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMethod('transfer')}
                  className={`h-full px-3 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center ${
                    filterMethod === 'transfer'
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Transfer Bank
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMethod('cash')}
                  className={`h-full px-3 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center ${
                    filterMethod === 'cash'
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Uang Tunai
                </button>
              </div>

              {/* Toggle Kerapatan Tampilan: Ringkas vs Detail */}
              <div className="inline-flex h-9 p-0.5 bg-gray-100 rounded-lg border border-gray-200 items-center ml-auto sm:ml-0">
                <button
                  type="button"
                  onClick={() => setTableDensity('compact')}
                  className={`h-full px-2.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center ${
                    tableDensity === 'compact'
                      ? 'bg-white text-gray-900 shadow-2xs font-bold'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                  title="Tampilan ringkas, hemat tempat & kolom"
                >
                  Ringkas
                </button>
                <button
                  type="button"
                  onClick={() => setTableDensity('detailed')}
                  className={`h-full px-2.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center ${
                    tableDensity === 'detailed'
                      ? 'bg-white text-gray-900 shadow-2xs font-bold'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                  title="Tampilan rinci seluruh kolom kotor & potongan"
                >
                  Detail
                </button>
              </div>
            </div>
          </div>

          {/* Table Container dengan border bersih */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left border-collapse">
                <thead className="bg-gray-50 text-gray-600 uppercase font-semibold text-xs border-b border-gray-200">
                  <tr>
                    <th className={tableDensity === 'compact' ? 'py-2.5 px-3' : 'py-3 px-3.5'}>No. Transaksi</th>
                    <th className={tableDensity === 'compact' ? 'py-2.5 px-3' : 'py-3 px-3'}>Nasabah</th>
                    <th className={tableDensity === 'compact' ? 'py-2.5 px-3' : 'py-3 px-3'}>Item &amp; Kadar</th>
                    <th className={tableDensity === 'compact' ? 'py-2.5 px-3 text-center' : 'py-3 px-3 text-center'}>Berat</th>
                    {tableDensity === 'detailed' && (
                      <>
                        <th className="py-3 px-3 text-right">Nilai Kotor</th>
                        <th className="py-3 px-3 text-right">Potongan / Pajak</th>
                      </>
                    )}
                    <th className={tableDensity === 'compact' ? 'py-2.5 px-3 text-right' : 'py-3 px-3 text-right'}>
                      {tableDensity === 'compact' ? 'Total Dana Bersih' : 'Total Bersih'}
                    </th>
                    <th className={tableDensity === 'compact' ? 'py-2.5 px-2.5 text-center' : 'py-3 px-3 text-center'}>Metode</th>
                    <th className={tableDensity === 'compact' ? 'py-2.5 px-2.5 text-center' : 'py-3 px-3.5 text-center'}>Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                  {filteredBuybacks.length === 0 ? (
                    <tr>
                      <td colSpan={tableDensity === 'compact' ? 7 : 9} className="py-12 text-center text-gray-400">
                        <ReceiptText size={36} className="mx-auto mb-2 text-gray-300" />
                        <p className="text-sm font-semibold text-gray-600">Tidak ada transaksi buyback</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {searchQuery
                            ? 'Coba gunakan kata kunci pencarian yang lain.'
                            : 'Belum ada transaksi pembelian emas yang tercatat.'}
                        </p>
                        {!searchQuery && (
                          <button
                            type="button"
                            onClick={() => setViewMode('form')}
                            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors cursor-pointer border border-orange-200"
                          >
                            <Plus size={14} />
                            <span>Buat Transaksi Buyback Baru</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredBuybacks.map(bb => {
                      const nilaiKotor = bb.totalKotor || bb.beratBersih * bb.hargaPerGram;
                      const totalPotongan = (bb.potonganBiaya || bb.biayaLebur || 0) + (bb.pph22 || 0);

                      return (
                        <tr key={bb.id} className="hover:bg-orange-50/20 transition-colors">
                          {/* No Transaksi */}
                          <td className={tableDensity === 'compact' ? 'py-2 px-3 whitespace-nowrap' : 'py-3 px-3.5 whitespace-nowrap'}>
                            <span className="font-mono font-bold text-gray-900 block text-xs sm:text-sm">{bb.invoiceNo}</span>
                            <span className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                              <Calendar size={11} /> {bb.date}
                            </span>
                          </td>

                          {/* Nasabah */}
                          <td className={tableDensity === 'compact' ? 'py-2 px-3 min-w-[130px]' : 'py-3 px-3 min-w-[140px]'}>
                            <span className="font-bold text-gray-900 block truncate text-xs sm:text-sm">{bb.customerName}</span>
                            <span className="text-[11px] text-gray-500 font-mono block">{bb.customerPhone}</span>
                            {tableDensity === 'detailed' && bb.customerNik && (
                              <span className="text-xs text-gray-400 font-mono block">
                                NIK: {bb.customerNik.slice(0, 6)}******{bb.customerNik.slice(-4)}
                              </span>
                            )}
                          </td>

                          {/* Item & Kadar */}
                          <td className={tableDensity === 'compact' ? 'py-2 px-3 min-w-[140px]' : 'py-3 px-3 min-w-[160px]'}>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-gray-900 text-xs sm:text-sm leading-tight">
                                {bb.itemType}
                              </span>
                              <span className="text-[10px] sm:text-[11px] bg-amber-50 text-amber-800 font-bold px-1.5 py-0.2 rounded border border-amber-200 font-mono">
                                {bb.kadar}
                              </span>
                            </div>
                            <span className="text-[11px] text-gray-400 block mt-0.5">{bb.kondisi}</span>
                          </td>

                          {/* Berat */}
                          <td className={tableDensity === 'compact' ? 'py-2 px-3 text-center whitespace-nowrap font-mono font-bold text-gray-900 text-xs sm:text-sm' : 'py-3 px-3 text-center whitespace-nowrap font-mono font-bold text-gray-900'}>
                            {bb.beratBersih.toFixed(2)} gr
                          </td>

                          {/* Kolom Nilai Kotor & Potongan (Khusus Mode Detail) */}
                          {tableDensity === 'detailed' && (
                            <>
                              <td className="py-3 px-3 text-right whitespace-nowrap font-mono text-gray-600 text-xs sm:text-sm">
                                {formatIDR(nilaiKotor)}
                              </td>
                              <td className="py-3 px-3 text-right whitespace-nowrap font-mono text-xs">
                                {totalPotongan > 0 ? (
                                  <span className="text-rose-600 font-semibold block">
                                    - {formatIDR(totalPotongan)}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">Rp 0</span>
                                )}
                                {bb.pph22 && bb.pph22 > 0 ? (
                                  <span className="text-gray-400 block text-[11px]">
                                    (PPh: {formatIDR(bb.pph22)})
                                  </span>
                                ) : null}
                              </td>
                            </>
                          )}

                          {/* Total Bersih */}
                          <td className={tableDensity === 'compact' ? 'py-2 px-3 text-right whitespace-nowrap' : 'py-3 px-3 text-right whitespace-nowrap'}>
                            <span className="font-mono font-bold text-xs sm:text-sm text-gray-900 block">
                              {formatIDR(bb.totalBayar)}
                            </span>
                            {tableDensity === 'compact' && totalPotongan > 0 && (
                              <span className="text-[11px] text-gray-400 font-mono block leading-tight mt-0.5">
                                Kotor: {formatIDR(nilaiKotor)} <span className="text-rose-500 font-medium">&bull; Pot: -{formatIDR(totalPotongan)}</span>
                              </span>
                            )}
                          </td>

                          {/* Metode Pencairan */}
                          <td className={tableDensity === 'compact' ? 'py-2 px-2.5 text-center whitespace-nowrap' : 'py-3 px-3 text-center whitespace-nowrap'}>
                            <span
                              className={`inline-flex items-center justify-center text-xs font-semibold px-2 py-0.5 rounded capitalize ${
                                bb.paymentMethod === 'transfer'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {bb.paymentMethod === 'transfer' ? (bb.bankName || 'Transfer') : 'Tunai'}
                            </span>
                          </td>

                          {/* Aksi */}
                          <td className={tableDensity === 'compact' ? 'py-2 px-2.5 text-center whitespace-nowrap' : 'py-3 px-3.5 text-center whitespace-nowrap'}>
                              <button
                                type="button"
                                onClick={() => onSelectReceipt(bb)}
                                className="inline-flex items-center justify-center gap-1.5 h-8 px-2.5 text-xs font-semibold text-orange-600 hover:text-white bg-orange-50 hover:bg-orange-500 border border-orange-200 hover:border-orange-500 rounded-md transition-all cursor-pointer shadow-2xs active:scale-95"
                              >
                                <Printer size={13} />
                                <span>Cetak Nota</span>
                              </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer info count */}
            <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>
                Menampilkan <strong>{filteredBuybacks.length}</strong> dari total{' '}
                <strong>{buybacks.length}</strong> transaksi buyback
              </span>
              <span className="hidden sm:inline text-gray-400">
                Arsip transaksi terenkripsi &amp; terintegrasi POS
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
