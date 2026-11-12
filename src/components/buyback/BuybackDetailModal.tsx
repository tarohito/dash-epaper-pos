import React from 'react';
import {
  X,
  Printer,
  Scale,
  User,
  Calendar,
  Building2,
  Coins,
  ShieldCheck,
  CreditCard,
  FileText,
  BadgePercent,
  Info,
} from 'lucide-react';
import { BuybackItem } from '../../types';
import { formatIDR } from '../../utils/formatters';

interface BuybackDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: BuybackItem | null;
  onPrintReceipt: (item: BuybackItem) => void;
}

export const BuybackDetailModal: React.FC<BuybackDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  onPrintReceipt,
}) => {
  if (!isOpen || !item) return null;

  const nilaiKotor = item.totalKotor || item.beratBersih * item.hargaPerGram;
  const totalPotongan =
    (item.potonganBiaya || item.biayaLebur || 0) + (item.pph22 || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl border border-gray-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] shadow-2xl">
        {/* Header Modal */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
              <Scale size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-tight">
                  Rincian Transaksi Buyback
                </h3>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                  {item.invoiceNo}
                </span>
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                <Calendar size={12} />
                <span>{item.date}</span>
                {item.timeStr && <span>&bull; {item.timeStr}</span>}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: Organized Cards */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Highlight Banner: Total Payout */}
          <div className="bg-gradient-to-r from-orange-500 to-amber-600 p-4 rounded-xl text-white shadow-xs flex items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-orange-100 block">
                Total Dana Bersih Diterima Nasabah
              </span>
              <p className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white mt-0.5">
                {formatIDR(item.totalBayar)}
              </p>
              <p className="text-xs text-orange-100 mt-1">
                Metode:{' '}
                <strong className="text-white capitalize">
                  {item.paymentMethod === 'transfer' ? 'Transfer Bank' : 'Uang Tunai'}
                </strong>
                {item.paymentMethod === 'transfer' && item.bankName && (
                  <span> ({item.bankName})</span>
                )}
              </p>
            </div>
            <div className="hidden sm:flex flex-col items-end text-right">
              <span className="text-xs text-orange-100">Berat Bersih</span>
              <span className="text-xl font-bold font-mono text-white">
                {item.beratBersih.toFixed(2)} gr
              </span>
              <span className="text-xs text-orange-200 mt-0.5 font-medium">
                Kadar: {item.kadar}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Card 1: Data Nasabah */}
            <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800 pb-2 border-b border-gray-200/60 mb-2.5">
                <User size={14} className="text-orange-500" />
                <span>Identitas Nasabah</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Nama Lengkap</span>
                  <span className="font-semibold text-gray-900">{item.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">No. WhatsApp / HP</span>
                  <span className="font-mono font-medium text-gray-900">{item.customerPhone || '-'}</span>
                </div>
                {item.customerNik && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">NIK (KTP)</span>
                    <span className="font-mono text-gray-700">{item.customerNik}</span>
                  </div>
                )}
                {item.customerNpwp && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">NPWP</span>
                    <span className="font-mono text-gray-700">{item.customerNpwp}</span>
                  </div>
                )}
                {item.customerAddress && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Alamat</span>
                    <span className="text-gray-700 text-right max-w-[180px] truncate">{item.customerAddress}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: Rincian Barang Emas */}
            <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800 pb-2 border-b border-gray-200/60 mb-2.5">
                <Coins size={14} className="text-orange-500" />
                <span>Spesifikasi Emas</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Jenis Perhiasan</span>
                  <span className="font-semibold text-gray-900">{item.itemType}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Kadar Kemurnian</span>
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold font-mono text-[11px]">
                    {item.kadar}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Kondisi Fisik</span>
                  <span className="font-medium text-gray-800">{item.kondisi}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Surat Toko Asal</span>
                  <span className="font-medium text-gray-800">{item.sourceNote || 'Ada Nota Asli'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Rincian Berat & Kalkulasi Keuangan */}
          <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800 pb-2 border-b border-gray-200/60 mb-2.5">
              <FileText size={14} className="text-orange-500" />
              <span>Rincian Berat &amp; Perhitungan Harga</span>
            </div>

            <div className="grid grid-cols-3 gap-2 p-2.5 bg-white rounded-lg border border-gray-200/60 text-center mb-3">
              <div>
                <span className="text-[10px] text-gray-400 font-medium block">Berat Kotor</span>
                <span className="font-mono font-bold text-gray-800 text-xs sm:text-sm">
                  {item.beratKotor ? item.beratKotor.toFixed(2) : item.beratBersih.toFixed(2)} gr
                </span>
              </div>
              <div>
                <span className="text-[10px] text-rose-500 font-medium block">Pot. Batu/Cacat</span>
                <span className="font-mono font-bold text-rose-600 text-xs sm:text-sm">
                  -{(item.potonganBatu || 0).toFixed(2)} gr
                </span>
              </div>
              <div>
                <span className="text-[10px] text-emerald-600 font-medium block">Berat Bersih (Net)</span>
                <span className="font-mono font-bold text-emerald-700 text-xs sm:text-sm">
                  {item.beratBersih.toFixed(2)} gr
                </span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Harga Acuan Buyback / Gram</span>
                <span className="font-mono font-semibold text-gray-900">
                  {formatIDR(item.hargaPerGram)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Nilai Kotor ({item.beratBersih.toFixed(2)} gr &times; {formatIDR(item.hargaPerGram)})</span>
                <span className="font-mono font-bold text-gray-900">
                  {formatIDR(nilaiKotor)}
                </span>
              </div>

              {(item.biayaLebur || 0) > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Biaya Lebur / Susut</span>
                  <span className="font-mono">- {formatIDR(item.biayaLebur || 0)}</span>
                </div>
              )}

              {(item.potonganBiaya || 0) > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Potongan Kerusakan / Lainnya</span>
                  <span className="font-mono">- {formatIDR(item.potonganBiaya || 0)}</span>
                </div>
              )}

              {(item.pph22 || 0) > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Potongan Pajak PPh 22 (0.25%)</span>
                  <span className="font-mono">- {formatIDR(item.pph22 || 0)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-sm">
                <span className="font-bold text-gray-900">Total Bersih yang Dibayarkan</span>
                <span className="font-mono font-black text-orange-600 text-base">
                  {formatIDR(item.totalBayar)}
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Info Rekening Transfer (Jika ada) */}
          {item.paymentMethod === 'transfer' && (
            <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3.5 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-blue-900 mb-2">
                <CreditCard size={14} className="text-blue-600" />
                <span>Rincian Rekening Transfer Bank</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <span className="text-blue-500 block text-[11px]">Bank Tujuan</span>
                  <span className="font-bold text-blue-950">{item.bankName || 'BCA'}</span>
                </div>
                <div>
                  <span className="text-blue-500 block text-[11px]">Nomor Rekening</span>
                  <span className="font-mono font-bold text-blue-950">{item.accountNo || '-'}</span>
                </div>
                <div>
                  <span className="text-blue-500 block text-[11px]">Atas Nama (A/N)</span>
                  <span className="font-semibold text-blue-950">{item.accountHolder || item.customerName}</span>
                </div>
              </div>
            </div>
          )}

          {/* Catatan jika ada */}
          {item.catatan && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
              <span className="text-gray-500 font-semibold block mb-0.5">Catatan:</span>
              <p className="text-gray-700">{item.catatan}</p>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-3.5 sm:px-6 sm:py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 text-xs sm:text-sm font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onPrintReceipt(item);
            }}
            className="h-9 px-4 text-xs sm:text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-[0.98]"
          >
            <Printer size={15} />
            <span>Cetak Nota Buyback</span>
          </button>
        </div>
      </div>
    </div>
  );
};
