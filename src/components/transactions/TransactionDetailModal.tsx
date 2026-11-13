import React from 'react';
import { Printer } from 'lucide-react';
import { Transaction } from '../../types';
import { formatIDR } from '../../utils/formatters';
import {
  ModalShell,
  MODAL_FOOTER_END_CLASS,
  MODAL_BTN_PRIMARY_CLASS,
} from '../common/ModalShell';
import { MoneyAmount } from '../common/MoneyAmount';

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
    <ModalShell
      isOpen={isOpen && Boolean(transaction)}
      onClose={onClose}
      size="xl"
      title="Rincian Transaksi Penjualan"
      subtitle={[
        transaction.invoiceNo,
        transaction.dateStr,
        transaction.timeStr,
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
              onPrintReceipt(transaction);
            }}
            className={`${MODAL_BTN_PRIMARY_CLASS} gap-1.5`}
          >
            <Printer size={15} className="shrink-0" />
            <span>Cetak Nota Penjualan</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4">
          {isVoid && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
              <strong className="font-bold block">Nota Penjualan Ini Telah Di-VOID (Dibatalkan)</strong>
              {transaction.voidReason && <span className="block mt-0.5">Alasan: {transaction.voidReason}</span>}
            </div>
          )}

          {/* Highlight Banner */}
          <div className="bg-gradient-to-r from-orange-500 to-amber-600 p-4 rounded-xl text-white shadow-xs flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-orange-100 block">
                Total Nilai Transaksi (Termasuk PPN 11%)
              </span>
              <div className="mt-0.5">
                <MoneyAmount
                  value={transaction.grandTotal}
                  maxFontPx={28}
                  minFontPx={15}
                  className="font-black font-mono tracking-tight text-white tabular-nums"
                />
              </div>
              <p className="text-xs text-orange-100 mt-1">
                Metode: <strong className="text-white">{methodLabel}</strong>
              </p>
            </div>
            <div className="hidden sm:flex flex-col items-end text-right shrink-0">
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
              <div className="text-xs font-bold text-gray-800 pb-2 border-b border-gray-200/60 mb-2.5">
                Pelanggan &amp; Kasir
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
              <div className="text-xs font-bold text-gray-800 pb-2 border-b border-gray-200/60 mb-2.5">
                Rincian Pembayaran
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
            <div className="text-xs font-bold text-gray-800 pb-2 border-b border-gray-200/60 mb-2.5">
              Rincian Barang &amp; Kalkulasi Harga
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
    </ModalShell>
  );
};
