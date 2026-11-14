import React from 'react';
import { Printer } from 'lucide-react';
import { BuybackItem } from '../../types';
import { formatIDR } from '../../utils/formatters';
import {
  ModalShell,
  MODAL_FOOTER_END_CLASS,
  MODAL_BTN_PRIMARY_CLASS,
} from '../common/ModalShell';
import { MoneyAmount } from '../common/MoneyAmount';

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
  const isVoid = item.status === 'void';
  const hasAttachments = Boolean(
    item.fotoKtp || item.fotoEmas || item.ttdNasabah || item.ttdPetugas
  );

  return (
    <ModalShell
      isOpen={isOpen && Boolean(item)}
      onClose={onClose}
      size="xl"
      title="Rincian Transaksi Buyback"
      subtitle={[
        item.invoiceNo,
        item.date,
        item.timeStr,
        item.branchName,
        isVoid ? 'Status VOID' : null,
      ]
        .filter(Boolean)
        .join(' • ')}
      footer={
        <div className={MODAL_FOOTER_END_CLASS}>
          <button
            type="button"
            onClick={() => {
              onClose();
              onPrintReceipt(item);
            }}
            className={`${MODAL_BTN_PRIMARY_CLASS} gap-1.5`}
          >
            <Printer size={15} className="shrink-0" />
            <span>Cetak Nota Buyback</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4">
          {isVoid && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
              <strong className="font-bold block">Nota Buyback Ini Telah Di-VOID (Dibatalkan)</strong>
              {item.voidReason && <span className="block mt-0.5">Alasan: {item.voidReason}</span>}
              {item.voidedAt && (
                <span className="block mt-0.5 text-red-600 font-mono">
                  Waktu Void: {item.voidedAt}
                </span>
              )}
            </div>
          )}

          {/* Highlight Banner: Total Payout */}
          <div className="bg-gradient-to-r from-orange-500 to-amber-600 p-4 rounded-xl text-white shadow-xs flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-orange-100 block">
                Total Dana Bersih Diterima Nasabah
              </span>
              <div className="mt-0.5">
                <MoneyAmount
                  value={item.totalBayar}
                  maxFontPx={28}
                  minFontPx={15}
                  className="font-bold font-mono tracking-tight text-white tabular-nums"
                />
              </div>
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
            <div className="hidden sm:flex flex-col items-end text-right shrink-0">
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
              <div className="text-xs font-bold text-gray-800 pb-2 border-b border-gray-200/60 mb-2.5">
                Identitas Nasabah
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Nama Lengkap</span>
                  <span className="font-semibold text-gray-900 text-right">{item.customerName}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">No. WhatsApp / HP</span>
                  <span className="font-mono font-medium text-gray-900 text-right">
                    {item.customerPhone || '-'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">NIK (KTP)</span>
                  <span className="font-mono text-gray-700 text-right">
                    {item.customerNik || '-'}
                  </span>
                </div>
                {item.customerNpwp && (
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500">NPWP</span>
                    <span className="font-mono text-gray-700 text-right">{item.customerNpwp}</span>
                  </div>
                )}
                {item.customerAddress && (
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500 shrink-0">Alamat</span>
                    <span className="text-gray-700 text-right">{item.customerAddress}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: Rincian Barang Emas */}
            <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-3.5">
              <div className="text-xs font-bold text-gray-800 pb-2 border-b border-gray-200/60 mb-2.5">
                Spesifikasi &amp; Kondisi Emas
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Jenis Perhiasan</span>
                  <span className="font-semibold text-gray-900 text-right">{item.itemType}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-gray-500">Kadar Kemurnian</span>
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold font-mono text-xs">
                    {item.kadar}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Kondisi Fisik</span>
                  <span className="font-medium text-gray-800 text-right">{item.kondisi}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Surat Toko Asal</span>
                  <span className="font-medium text-gray-800 text-right">
                    {item.sourceNote || 'Ada Nota Asli'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Daftar Rincian Item Emas (Jika Multi-Item) */}
          {item.items && item.items.length > 0 && (
            <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200/60 mb-2.5">
                <span className="text-xs font-bold text-gray-800">
                  Rincian Item Emas ({item.items.length} Item)
                </span>
              </div>
              <div className="bg-white rounded-lg border border-gray-200/70 divide-y divide-gray-100 overflow-hidden">
                {item.items.map((gold, idx) => (
                  <div
                    key={gold.id || idx}
                    className="p-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-gray-900">
                          {gold.brandType || gold.category}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono text-xs font-bold">
                          {gold.kadar}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-mono text-xs font-semibold">
                          {gold.berat.toFixed(2)} gr
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 block mt-0.5">
                        {gold.category} &bull; Kondisi: {gold.kondisi}
                        {gold.serialNumber ? ` · SN: ${gold.serialNumber}` : ''}
                        {gold.certYear ? ` (${gold.certYear})` : ''}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-gray-900 block tabular-nums">
                        {formatIDR(gold.subtotal)}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">
                        @{formatIDR(gold.hargaPerGram)}/gr
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Card 3: Rincian Berat & Kalkulasi Keuangan */}
          <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-3.5">
            <div className="text-xs font-bold text-gray-800 pb-2 border-b border-gray-200/60 mb-2.5">
              Rincian Berat &amp; Perhitungan Harga
            </div>

            <div className="grid grid-cols-3 gap-2 p-2.5 bg-white rounded-lg border border-gray-200/60 text-center mb-3">
              <div>
                <span className="text-xs text-gray-400 font-medium block">Berat Kotor</span>
                <span className="font-mono font-bold text-gray-800 text-xs sm:text-sm">
                  {item.beratKotor ? item.beratKotor.toFixed(2) : item.beratBersih.toFixed(2)} gr
                </span>
              </div>
              <div>
                <span className="text-xs text-rose-500 font-medium block">Pot. Batu/Cacat</span>
                <span className="font-mono font-bold text-rose-600 text-xs sm:text-sm">
                  -{(item.potonganBatu || 0).toFixed(2)} gr
                </span>
              </div>
              <div>
                <span className="text-xs text-emerald-600 font-medium block">Berat Bersih (Net)</span>
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
                <span className="text-gray-600">
                  Nilai Kotor ({item.beratBersih.toFixed(2)} gr &times; {formatIDR(item.hargaPerGram)})
                </span>
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
                <span className="font-mono font-bold text-orange-600 text-base">
                  {formatIDR(item.totalBayar)}
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Info Rekening Transfer (Jika ada) */}
          {item.paymentMethod === 'transfer' && (
            <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3.5 text-xs">
              <div className="font-bold text-blue-900 mb-2">
                Rincian Rekening Transfer Bank
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <span className="text-blue-500 block text-xs">Bank Tujuan</span>
                  <span className="font-bold text-blue-950">{item.bankName || 'BCA'}</span>
                </div>
                <div>
                  <span className="text-blue-500 block text-xs">Nomor Rekening</span>
                  <span className="font-mono font-bold text-blue-950">{item.accountNo || '-'}</span>
                </div>
                <div>
                  <span className="text-blue-500 block text-xs">Atas Nama (A/N)</span>
                  <span className="font-semibold text-blue-950">
                    {item.accountHolder || item.customerName}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Card 5: Lampiran Foto & Tanda Tangan (Jika ada) */}
          {hasAttachments && (
            <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-3.5">
              <div className="text-xs font-bold text-gray-800 pb-2 border-b border-gray-200/60 mb-2.5">
                Lampiran Dokumen &amp; Tanda Tangan
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {item.fotoKtp && (
                  <div className="bg-white border border-gray-200 rounded-lg p-2 text-center">
                    <span className="text-xs font-semibold text-gray-500 block mb-1.5">Foto KTP</span>
                    <img
                      src={item.fotoKtp}
                      alt="Foto KTP Nasabah"
                      className="w-full h-20 object-cover rounded border border-gray-100"
                    />
                  </div>
                )}
                {item.fotoEmas && (
                  <div className="bg-white border border-gray-200 rounded-lg p-2 text-center">
                    <span className="text-xs font-semibold text-gray-500 block mb-1.5">Foto Fisik Emas</span>
                    <img
                      src={item.fotoEmas}
                      alt="Foto Fisik Emas"
                      className="w-full h-20 object-cover rounded border border-gray-100"
                    />
                  </div>
                )}
                {item.ttdNasabah && (
                  <div className="bg-white border border-gray-200 rounded-lg p-2 text-center">
                    <span className="text-xs font-semibold text-gray-500 block mb-1.5">
                      TTD Nasabah
                    </span>
                    <img
                      src={item.ttdNasabah}
                      alt="Tanda Tangan Nasabah"
                      className="w-full h-20 object-contain rounded bg-gray-50 border border-gray-100"
                    />
                  </div>
                )}
                {item.ttdPetugas && (
                  <div className="bg-white border border-gray-200 rounded-lg p-2 text-center">
                    <span className="text-xs font-semibold text-gray-500 block mb-1.5">
                      TTD Petugas
                    </span>
                    <img
                      src={item.ttdPetugas}
                      alt="Tanda Tangan Petugas"
                      className="w-full h-20 object-contain rounded bg-gray-50 border border-gray-100"
                    />
                  </div>
                )}
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
    </ModalShell>
  );
};
