import React from 'react';
import { ShiftClosingRecord, Tenant } from '../../types';
import { formatIDR } from '../../utils/formatters';

interface PrintableShiftReportProps {
  shift: ShiftClosingRecord | null;
  activeTenant?: Tenant;
}

export const PrintableShiftReport: React.FC<PrintableShiftReportProps> = ({ shift, activeTenant }) => {
  if (!shift) return null;

  const isExact = shift.cashVariance === 0;
  const closedAtFormatted = new Date(shift.closedAt).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div id="printable-shift-report" className="print-only bg-white text-gray-900 p-6 font-sans max-w-2xl mx-auto">
      <div className="border-b-2 border-gray-900 pb-3 mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold uppercase tracking-wide">{activeTenant?.name || 'e.paper POS'}</h1>
          <p className="text-xs text-gray-700">{activeTenant?.branchName || 'Cabang Utama'}</p>
          <p className="text-xs text-gray-600">{activeTenant?.address || ''}</p>
        </div>
        <div className="text-right text-xs">
          <p className="font-bold uppercase text-sm">Berita Acara Tutup Kasir</p>
          <p className="font-mono font-bold mt-0.5">{shift.shiftCode}</p>
          <p className="text-gray-600">Ditutup: {closedAtFormatted}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs mb-4 border-b border-gray-300 pb-3">
        <div>
          <p><span className="text-gray-500">Tanggal Shift:</span> <span className="font-mono font-bold">{shift.shiftDate}</span></p>
          <p><span className="text-gray-500">Periode:</span> <span className="font-semibold">{shift.shiftLabel}</span></p>
        </div>
        <div className="text-right">
          <p><span className="text-gray-500">Petugas Kasir:</span> <span className="font-bold">{shift.cashierName}</span></p>
          <p><span className="text-gray-500">Transaksi Void:</span> <span className="font-mono">{shift.voidSalesCount} Penjualan / {shift.voidBuybackCount} Buyback</span></p>
        </div>
      </div>

      <table className="w-full text-xs border-collapse mb-4">
        <thead>
          <tr className="border-t border-b border-gray-900 bg-gray-100">
            <th className="py-1.5 px-2 text-left">Keterangan Transaksi &amp; Kas</th>
            <th className="py-1.5 px-2 text-right">Nominal (IDR)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          <tr><td className="py-1.5 px-2">Penjualan Tunai (Cash)</td><td className="py-1.5 px-2 text-right font-mono">{formatIDR(shift.salesCash)}</td></tr>
          <tr><td className="py-1.5 px-2">Penjualan Debit / EDC</td><td className="py-1.5 px-2 text-right font-mono">{formatIDR(shift.salesDebit)}</td></tr>
          <tr><td className="py-1.5 px-2">Penjualan Transfer Bank</td><td className="py-1.5 px-2 text-right font-mono">{formatIDR(shift.salesTransfer)}</td></tr>
          <tr><td className="py-1.5 px-2">Penjualan QRIS Digital</td><td className="py-1.5 px-2 text-right font-mono">{formatIDR(shift.salesQris)}</td></tr>
          <tr className="font-bold bg-gray-50">
            <td className="py-1.5 px-2">Total Omzet Penjualan ({shift.totalSalesCount} nota · {shift.totalSalesGrams.toFixed(2)} gr)</td>
            <td className="py-1.5 px-2 text-right font-mono">{formatIDR(shift.totalSalesAmount)}</td>
          </tr>
          <tr><td className="py-1.5 px-2">Buyback Tunai (Keluar Laci)</td><td className="py-1.5 px-2 text-right font-mono">- {formatIDR(shift.buybackCash)}</td></tr>
          <tr><td className="py-1.5 px-2">Buyback Transfer Bank</td><td className="py-1.5 px-2 text-right font-mono">- {formatIDR(shift.buybackTransfer)}</td></tr>
          <tr className="font-bold">
            <td className="py-1.5 px-2">Total Buyback ({shift.totalBuybackCount} nota · {shift.totalBuybackGrams.toFixed(2)} gr)</td>
            <td className="py-1.5 px-2 text-right font-mono">{formatIDR(shift.totalBuybackAmount)}</td>
          </tr>
        </tbody>
      </table>

      <div className="border border-gray-800 p-3 text-xs space-y-1.5 mb-5">
        <div className="flex justify-between"><span>Modal Awal Laci Kasir</span><span className="font-mono font-semibold">{formatIDR(shift.openingCash)}</span></div>
        <div className="flex justify-between"><span>Kas Seharusnya di Laci (Sistem)</span><span className="font-mono font-bold">{formatIDR(shift.expectedCash)}</span></div>
        <div className="flex justify-between"><span>Kas Fisik Dihitung</span><span className="font-mono font-bold">{formatIDR(shift.actualCash)}</span></div>
        <div className="border-t border-gray-400 pt-1.5 flex justify-between font-bold text-sm">
          <span>Selisih Kas ({isExact ? 'KLOP' : shift.cashVariance > 0 ? 'LEBIH' : 'KURANG'})</span>
          <span className="font-mono">{shift.cashVariance > 0 ? `+${formatIDR(shift.cashVariance)}` : formatIDR(shift.cashVariance)}</span>
        </div>
      </div>

      {shift.notes && (
        <div className="text-xs mb-6">
          <p className="font-bold">Catatan Shift:</p>
          <p className="text-gray-700 mt-0.5">{shift.notes}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-8 pt-6 text-center text-xs">
        <div>
          <p className="mb-12">Diserahkan oleh (Kasir),</p>
          <p className="border-t border-gray-600 pt-1 font-bold">{shift.cashierName}</p>
        </div>
        <div>
          <p className="mb-12">Diperiksa oleh (Kepala Cabang / Owner),</p>
          <p className="border-t border-gray-600 pt-1 font-bold">_________________________</p>
        </div>
      </div>
    </div>
  );
};
