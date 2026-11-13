import React from 'react';
import {
  X,
  Printer,
  ReceiptText,
  User,
  Calendar,
  CreditCard,
  FileText,
} from 'lucide-react';
import { Transaction } from '../../types';
import { formatIDR } from '../../utils/formatters';

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onPrintReceipt: (tx: Transaction) => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onPrintReceipt,
}) => {
  if (!isOpen || !transaction) return null;

  const isVoid = transaction.status === 'void';
  const methodLabel =
    transaction.paymentMethod === 'cash'
      ? 'Uang Tunai'
      : transaction.paymentMethod === 'debit'
      ? `Debit EDC${transaction.paymentDetails.debitBank ? ` (${transaction.paymentDetails.debitBank})` : ''}`
      : transaction.paymentMethod === 'transfer'
      ? `Transfer Bank${transaction.paymentDetails.transferBank ? ` (${transaction.paymentDetails.transferBank})` : ''}`
      : 'QRIS GPN';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl border border-gray-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] shadow-2xl">
        {/* Header Modal */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
              <ReceiptText size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-tight">
                  Rincian Transaksi Penjualan
                </h3>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                  {transaction.invoiceNo}
                </span>
                {isVoid && (
                  <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                    VOID
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                <Calendar size={12} />
                <span>{transaction.dateStr}</span>
                {transaction.timeStr && <span>&bull; {transaction.timeStr}</span>}
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

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {isVoid && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
              <strong className="font-bold block">Nota Penjualan Ini Telah Di-VOID (Dibatalkan)</strong>
              {transaction.voidReason && <span className="block mt-0.5">Alasan: {transaction.voidReason}</span>}
            </div>
          )}

          {/* Highlight Banner */}
          <div className="bg-gradient-to-r from-orange-500 to-amber-600 p-4 rounded-xl text-white shadow-xs flex items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-orange-100 block">
                Total Nilai Transaksi (Termasuk PPN 11%)
              </span>
              <p className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white mt-0.5">
                {formatIDR(transaction.grandTotal)}
              </p>
              <p className="text-xs text-orange-100 mt-1">
                Metode: <strong className="text-white">{methodLabel}</strong>
              </p>
            </div>
            <div className="hidden sm:flex flex-col items-end text-right">
              <span className="text-xs text-orange-100">Total Berat Emas</span>
              <span className="text-xl font-bold font-mono text-white">
                {transaction.totalBerat.toFixed(2)} gr
              </span>
              <span className="text-xs text-orange-200 mt-0.5 font-medium">
                Jumlah Item: {transaction.totalQty} pcs
              </span>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Card 1: Pelanggan & Kasir */}
            <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800 pb-2 border-b border-gray-200/60 mb-2.5">
                <User size={14} className="text-orange-500" />
                <span>Pelanggan &amp; Kasir</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Nama Pelanggan</span>
                  <span className="font-semibold text-gray-900 text-right">{transaction.customerName}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Kasir Bertugas</span>
                  <span className="font-medium text-gray-800 text-right">{transaction.cashier}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Status Transaksi</span>
                  <span
                    className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                      isVoid
                        ? 'bg-red-100 text-red-700 border border-red-200'
                        : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {isVoid ? 'VOID / Dibatalkan' : 'Lunas & Selesai'}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Detail Pembayaran */}
            <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800 pb-2 border-b border-gray-200/60 mb-2.5">
                <CreditCard size={14} className="text-orange-500" />
                <span>Rincian Pembayaran</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Metode Bayar</span>
                  <span className="font-semibold text-gray-900">{methodLabel}</span>
                </div>

                {transaction.paymentMethod === 'cash' && (
                  <>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-500">Tunai Diterima</span>
                      <span className="font-mono font-semibold text-gray-900">
                        {formatIDR(transaction.paymentDetails.cashReceived ?? transaction.grandTotal)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-500">Uang Kembalian</span>
                      <span className="font-mono font-semibold text-emerald-700">
                        {formatIDR(transaction.paymentDetails.cashChange ?? 0)}
                      </span>
                    </div>
                  </>
                )}

                {transaction.paymentMethod === 'debit' && (
                  <>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-500">No. Kartu (4 Digit)</span>
                      <span className="font-mono font-semibold text-gray-900">
                        •••• {transaction.paymentDetails.debitCardLast4 || '----'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-500">Kode Approval</span>
                      <span className="font-mono font-medium text-gray-800">
                        {transaction.paymentDetails.debitApprovalCode || '-'}
                      </span>
                    </div>
                  </>
                )}

                {transaction.paymentMethod === 'transfer' && (
                  <>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-500">Bank Tujuan</span>
                      <span className="font-semibold text-gray-900">
                        {transaction.paymentDetails.transferBank || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-500">No. Referensi</span>
                      <span className="font-mono font-medium text-gray-800">
                        {transaction.paymentDetails.transferRef || '-'}
                      </span>
                    </div>
                  </>
                )}

                {transaction.paymentMethod === 'qris' && (
                  <>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-500">NMID Merchant</span>
                      <span className="font-mono font-medium text-gray-800">
                        {transaction.paymentDetails.qrisNmid || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-500">RRN Referensi</span>
                      <span className="font-mono font-medium text-gray-800">
                        {transaction.paymentDetails.qrisRrn || '-'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Daftar Perhiasan & Rincian Harga */}
          <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800 pb-2 border-b border-gray-200/60 mb-2.5">
              <FileText size={14} className="text-orange-500" />
              <span>Rincian Barang &amp; Kalkulasi Harga</span>
            </div>

            <div className="bg-white rounded-lg border border-gray-200/70 divide-y divide-gray-100 mb-3 overflow-hidden">
              {transaction.items.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="p-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-gray-900 truncate">{item.name}</span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[10px] font-bold">
                        {item.berat.toFixed(2)} gr
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-400 font-mono block mt-0.5">
                      {item.sku} &bull; {item.qty} pcs &times; {formatIDR(item.harga)}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-gray-900 whitespace-nowrap tabular-nums">
                    {formatIDR(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Subtotal ({transaction.totalQty} pcs, {transaction.totalBerat.toFixed(2)} gr)
                </span>
                <span className="font-mono font-semibold text-gray-900 tabular-nums">
                  {formatIDR(transaction.subtotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">PPN (11%)</span>
                <span className="font-mono font-semibold text-gray-900 tabular-nums">
                  {formatIDR(transaction.tax)}
                </span>
              </div>
              <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-sm">
                <span className="font-bold text-gray-900">Grand Total Pembayaran</span>
                <span className="font-mono font-black text-orange-600 text-base tabular-nums">
                  {formatIDR(transaction.grandTotal)}
                </span>
              </div>
            </div>
          </div>
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
              onPrintReceipt(transaction);
            }}
            className="h-9 px-4 text-xs sm:text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-[0.98]"
          >
            <Printer size={15} />
            <span>Cetak Nota Penjualan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
