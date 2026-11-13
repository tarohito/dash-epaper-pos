import React from 'react';
import { Printer, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ShiftClosingRecord, Tenant } from '../../types';
import { formatIDR } from '../../utils/formatters';
import { ModalShell, MODAL_BTN_PRIMARY_CLASS, MODAL_BTN_SECONDARY_CLASS, MODAL_FOOTER_END_CLASS } from '../common/ModalShell';

interface ShiftDetailModalProps {
  shift: ShiftClosingRecord | null;
  activeTenant?: Tenant;
  onClose: () => void;
  onPrint: (shift: ShiftClosingRecord) => void;
}

export const ShiftDetailModal: React.FC<ShiftDetailModalProps> = ({
  shift,
  activeTenant,
  onClose,
  onPrint,
}) => {
  if (!shift) return null;

  const closedAtFormatted = new Date(shift.closedAt).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const isExact = shift.cashVariance === 0;
  const isSurplus = shift.cashVariance > 0;

  return (
    <ModalShell
      isOpen={!!shift}
      onClose={onClose}
      size="xl"
      title={`Berita Acara Tutup Kasir · ${shift.shiftCode}`}
      subtitle={`${activeTenant?.name || 'Outlet'} (${activeTenant?.branchName || ''}) · Ditutup ${closedAtFormatted}`}
      footer={
        <div className={MODAL_FOOTER_END_CLASS}>
          <button type="button" onClick={onClose} className={MODAL_BTN_SECONDARY_CLASS}>
            Tutup
          </button>
          <button
            type="button"
            onClick={() => onPrint(shift)}
            className={MODAL_BTN_PRIMARY_CLASS}
          >
            <Printer size={15} />
            <span>Cetak Berita Acara</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Metadata Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg bg-gray-50 border border-gray-200/80 text-xs">
          <div>
            <span className="text-gray-400 block">Tanggal Shift</span>
            <span className="font-mono font-bold text-gray-900 mt-0.5 block">{shift.shiftDate}</span>
          </div>
          <div>
            <span className="text-gray-400 block">Periode Shift</span>
            <span className="font-semibold text-gray-900 mt-0.5 block truncate">{shift.shiftLabel}</span>
          </div>
          <div>
            <span className="text-gray-400 block">Petugas Kasir</span>
            <span className="font-semibold text-gray-900 mt-0.5 block truncate">{shift.cashierName}</span>
          </div>
          <div>
            <span className="text-gray-400 block">Status Rekonsiliasi</span>
            <span
              className={`inline-flex items-center gap-1 font-bold mt-0.5 ${
                isExact ? 'text-emerald-700' : isSurplus ? 'text-blue-700' : 'text-red-700'
              }`}
            >
              {isExact ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
              {isExact ? 'Klop (Rp 0)' : isSurplus ? `Lebih (+${formatIDR(shift.cashVariance)})` : `Kurang (${formatIDR(shift.cashVariance)})`}
            </span>
          </div>
        </div>

        {/* 2 Column Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: Sales & Buyback Breakdown */}
          <div className="rounded-xl border border-gray-200 p-4 space-y-3 text-xs">
            <h4 className="font-bold text-gray-900 text-sm border-b border-gray-100 pb-2">
              Rincian Penjualan &amp; Buyback
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Penjualan Tunai</span>
                <span className="font-mono font-semibold text-gray-900 tabular-nums">{formatIDR(shift.salesCash)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Penjualan Debit / EDC</span>
                <span className="font-mono font-semibold text-gray-900 tabular-nums">{formatIDR(shift.salesDebit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Penjualan Transfer Bank</span>
                <span className="font-mono font-semibold text-gray-900 tabular-nums">{formatIDR(shift.salesTransfer)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Penjualan QRIS</span>
                <span className="font-mono font-semibold text-gray-900 tabular-nums">{formatIDR(shift.salesQris)}</span>
              </div>
              <div className="pt-2 border-t border-gray-100 flex justify-between font-bold text-gray-900">
                <span>Total Penjualan ({shift.totalSalesCount} nota · {shift.totalSalesGrams.toFixed(2)} gr)</span>
                <span className="font-mono tabular-nums">{formatIDR(shift.totalSalesAmount)}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-200 space-y-2">
              <div className="flex justify-between text-rose-700">
                <span>Buyback Tunai</span>
                <span className="font-mono font-semibold tabular-nums">- {formatIDR(shift.buybackCash)}</span>
              </div>
              <div className="flex justify-between text-rose-700">
                <span>Buyback Transfer</span>
                <span className="font-mono font-semibold tabular-nums">- {formatIDR(shift.buybackTransfer)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900">
                <span>Total Buyback ({shift.totalBuybackCount} nota · {shift.totalBuybackGrams.toFixed(2)} gr)</span>
                <span className="font-mono tabular-nums">{formatIDR(shift.totalBuybackAmount)}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 flex justify-between text-gray-500">
              <span>Transaksi Void (Batal)</span>
              <span className="font-mono">
                {shift.voidSalesCount} Penjualan · {shift.voidBuybackCount} Buyback
              </span>
            </div>
          </div>

          {/* Right: Drawer Cash Reconciliation */}
          <div className="rounded-xl border border-gray-200 p-4 space-y-3 text-xs flex flex-col justify-between">
            <div className="space-y-2.5">
              <h4 className="font-bold text-gray-900 text-sm border-b border-gray-100 pb-2">
                Rekonsiliasi Kas Tunai Laci
              </h4>

              <div className="flex justify-between">
                <span className="text-gray-600">Modal Awal Laci</span>
                <span className="font-mono font-semibold text-gray-900 tabular-nums">{formatIDR(shift.openingCash)}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>(+) Penjualan Tunai</span>
                <span className="font-mono font-semibold tabular-nums">{formatIDR(shift.salesCash)}</span>
              </div>
              <div className="flex justify-between text-rose-700">
                <span>(-) Pembayaran Buyback Tunai</span>
                <span className="font-mono font-semibold tabular-nums">{formatIDR(shift.buybackCash)}</span>
              </div>

              <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-gray-900 text-sm">
                <span>Kas Seharusnya (Sistem)</span>
                <span className="font-mono tabular-nums">{formatIDR(shift.expectedCash)}</span>
              </div>

              <div className="flex justify-between font-bold text-gray-900 text-sm">
                <span>Kas Fisik Dihitung</span>
                <span className="font-mono tabular-nums">{formatIDR(shift.actualCash)}</span>
              </div>

              <div
                className={`p-2.5 rounded-lg border flex justify-between font-bold text-sm ${
                  isExact
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : isSurplus
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                <span>Selisih Kas</span>
                <span className="font-mono tabular-nums">
                  {shift.cashVariance > 0 ? `+${formatIDR(shift.cashVariance)}` : formatIDR(shift.cashVariance)}
                </span>
              </div>
            </div>

            {shift.notes && (
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200/80 text-xs text-gray-700">
                <span className="font-semibold text-gray-900 block mb-0.5">Catatan Shift:</span>
                <p>{shift.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalShell>
  );
};
