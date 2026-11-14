import React, { useState, useEffect } from 'react';
import { Calculator, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { ShiftClosingCreatePayload, ShiftLiveSummary, UserAccount } from '../../types';
import { formatIDR } from '../../utils/formatters';
import { ModalShell, MODAL_BTN_PRIMARY_CLASS, MODAL_BTN_SECONDARY_CLASS, MODAL_FOOTER_END_CLASS } from '../common/ModalShell';
import { NumericInput } from '../common/NumericInput';
import { CustomSelect } from '../common/CustomSelect';

interface ShiftClosingModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: ShiftLiveSummary;
  shiftDate: string;
  scope: 'my' | 'outlet';
  currentUser: UserAccount;
  onConfirmClose: (payload: ShiftClosingCreatePayload) => Promise<void>;
}

export const ShiftClosingModal: React.FC<ShiftClosingModalProps> = ({
  isOpen,
  onClose,
  summary,
  shiftDate,
  scope,
  currentUser,
  onConfirmClose,
}) => {
  const [shiftLabel, setShiftLabel] = useState(currentUser.shiftLabel || 'Shift 1 (08:00 - 16:00)');
  const [openingCash, setOpeningCash] = useState<number>(2000000);
  const [actualCash, setActualCash] = useState<number>(2000000);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const expectedCash = Math.max(0, openingCash + summary.salesCash - summary.buybackCash);
  const variance = actualCash - expectedCash;
  const nonCashTotal = summary.salesDebit + summary.salesTransfer + summary.salesQris;

  useEffect(() => {
    if (isOpen) {
      const defaultOpening = 2000000;
      setOpeningCash(defaultOpening);
      setActualCash(Math.max(0, defaultOpening + summary.salesCash - summary.buybackCash));
      setShiftLabel(currentUser.shiftLabel || 'Shift 1 (08:00 - 16:00)');
      setNotes('');
      setIsSubmitting(false);
    }
  }, [isOpen, summary.salesCash, summary.buybackCash, currentUser.shiftLabel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirmClose({
        shiftDate,
        shiftLabel,
        scope,
        openingCash,
        actualCash,
        notes: notes.trim() || undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Hitung Uang Laci & Tutup Kasir"
      subtitle={`Tanggal: ${shiftDate} · Petugas: ${currentUser.fullName} · ${
        scope === 'outlet' ? 'Semua Kasir Outlet' : 'Transaksi Saya'
      }`}
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
            form="shift-closing-form"
            disabled={isSubmitting}
            className={MODAL_BTN_PRIMARY_CLASS}
          >
            {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
            <span>{isSubmitting ? 'Menyimpan...' : 'Simpan & Tutup Kasir'}</span>
          </button>
        </div>
      }
    >
      <form id="shift-closing-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Langkah 1: Pilih Shift & Modal Awal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              1. Pilih Jam / Nama Shift
            </label>
            <CustomSelect
              value={shiftLabel}
              onChange={setShiftLabel}
              options={[
                { value: 'Shift 1 (08:00 - 16:00)', label: 'Shift 1 (08:00 - 16:00)' },
                { value: 'Shift 2 (13:00 - 21:00)', label: 'Shift 2 (13:00 - 21:00)' },
                { value: 'Full Day (Owner)', label: 'Full Day (Operasional Penuh)' },
                { value: 'Shift Lembur / Khusus', label: 'Shift Lembur / Khusus' },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              2. Uang Modal Awal di Laci (Rp)
            </label>
            <NumericInput
              prefix="Rp"
              value={openingCash}
              onChange={setOpeningCash}
              min={0}
              className="h-10 px-3 text-sm font-mono font-bold bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Uang kembalian yang disiapkan sebelum toko buka.
            </p>
          </div>
        </div>

        {/* Langkah 2: Hitungan Otomatis Sistem */}
        <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase tracking-wider pb-1 border-b border-gray-200/80">
            <Calculator size={14} className="text-orange-500" />
            <span>3. Hitungan Uang Laci Menurut Sistem</span>
          </div>

          <div className="space-y-1.5 text-xs sm:text-sm">
            <div className="flex items-center justify-between text-gray-600">
              <span>Modal Awal Laci</span>
              <span className="font-mono font-semibold text-gray-900 tabular-nums">
                {formatIDR(openingCash)}
              </span>
            </div>
            <div className="flex items-center justify-between text-emerald-700">
              <span>(+) Penjualan Tunai ({summary.totalSalesCount} nota total)</span>
              <span className="font-mono font-semibold tabular-nums">
                + {formatIDR(summary.salesCash)}
              </span>
            </div>
            <div className="flex items-center justify-between text-rose-700">
              <span>(−) Bayar Buyback Tunai ({summary.totalBuybackCount} nota total)</span>
              <span className="font-mono font-semibold tabular-nums">
                − {formatIDR(summary.buybackCash)}
              </span>
            </div>
          </div>

          <div className="pt-2.5 border-t border-gray-200 flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-bold text-gray-900">
              Uang yang Seharusnya Ada di Laci
            </span>
            <span className="font-mono font-bold text-base sm:text-lg text-gray-900 tabular-nums">
              {formatIDR(expectedCash)}
            </span>
          </div>

          {nonCashTotal > 0 && (
            <p className="text-[11px] text-gray-500 pt-1">
              Info: Pembayaran non-tunai (EDC/Transfer/QRIS) sebesar{' '}
              <span className="font-mono font-semibold text-gray-700">{formatIDR(nonCashTotal)}</span>{' '}
              tidak masuk hitungan laci karena langsung ke rekening.
            </p>
          )}
        </div>

        {/* Langkah 3: Input Uang Fisik & Hasil Selisih */}
        <div className="rounded-xl border border-orange-200/90 bg-orange-50/30 p-4 space-y-3">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="text-xs font-bold text-gray-900">
                4. Berapa Uang Tunai Fisik yang Anda Hitung di Laci?
              </label>
              <button
                type="button"
                onClick={() => setActualCash(expectedCash)}
                className="text-xs font-semibold text-orange-600 hover:text-orange-700 cursor-pointer"
              >
                Isi Pas / Samakan
              </button>
            </div>
            <NumericInput
              prefix="Rp"
              value={actualCash}
              onChange={setActualCash}
              min={0}
              className="h-11 px-3 text-base font-mono font-bold bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
            />
          </div>

          <div
            className={`p-3 rounded-lg border flex items-center justify-between gap-2 text-xs sm:text-sm font-semibold ${
              variance === 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : variance > 0
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {variance === 0 ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>
                {variance === 0
                  ? 'Uang Laci Pas (Klop / Tidak Ada Selisih)'
                  : variance > 0
                  ? 'Uang Fisik Lebih Banyak dari Sistem'
                  : 'Uang Fisik Kurang dari Hitungan Sistem'}
              </span>
            </div>
            <span className="font-mono font-bold tabular-nums">
              {variance > 0 ? `+${formatIDR(variance)}` : formatIDR(variance)}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            5. Catatan Tambahan / Serah Terima (Opsional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full p-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
            placeholder="Contoh: Semua struk EDC & QRIS sudah cocok, uang laci diserahkan ke brankas."
          />
        </div>
      </form>
    </ModalShell>
  );
};
