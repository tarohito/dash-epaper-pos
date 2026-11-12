import React, { useState } from 'react';
import {
  ReceiptText,
  ShoppingCart,
  DollarSign,
  Gem,
  Wallet,
  Search,
  Banknote,
  CreditCard,
  Building2,
  QrCode,
  Printer,
} from 'lucide-react';
import { Transaction } from '../../types';
import { formatIDR } from '../../utils/formatters';
import Tooltip from '../Tooltip';

interface DailyTransactionsViewProps {
  transactions: Transaction[];
  onSelectReceipt: (tx: Transaction) => void;
  onNavigateToPos: () => void;
}

export const DailyTransactionsView: React.FC<DailyTransactionsViewProps> = ({
  transactions,
  onSelectReceipt,
  onNavigateToPos,
}) => {
  const [txFilterMethod, setTxFilterMethod] = useState<string>('semua');
  const [txSearchQuery, setTxSearchQuery] = useState<string>('');

  const totalOmzet = transactions.reduce((acc, tx) => acc + tx.grandTotal, 0);
  const totalBerat = transactions.reduce((acc, tx) => acc + tx.totalBerat, 0);
  const totalQty = transactions.reduce((acc, tx) => acc + tx.totalQty, 0);

  const filtered = transactions.filter(tx => {
    const matchesSearch =
      tx.invoiceNo.toLowerCase().includes(txSearchQuery.toLowerCase()) ||
      tx.customerName.toLowerCase().includes(txSearchQuery.toLowerCase()) ||
      tx.items.some(
        it =>
          it.name.toLowerCase().includes(txSearchQuery.toLowerCase()) ||
          it.sku.toLowerCase().includes(txSearchQuery.toLowerCase())
      );
    const matchesMethod = txFilterMethod === 'semua' || tx.paymentMethod === txFilterMethod;
    return matchesSearch && matchesMethod;
  });

  return (
    <div className="space-y-6">
      {/* Top Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-orange-100 text-orange-600 rounded-xl">
              <ReceiptText size={20} />
            </span>
            <h1 className="text-xl font-bold text-gray-900">Rekap Transaksi Harian</h1>
          </div>
          <p className="text-xs text-gray-500">
            Histori seluruh transaksi kasir, rincian pembayaran, dan cetak ulang bukti nota struk perhiasan
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onNavigateToPos}
            className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer"
          >
            <ShoppingCart size={15} />
            Buka Kasir POS
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Total Omzet Penjualan</p>
            <p className="text-xl font-extrabold text-gray-900 mt-0.5">{formatIDR(totalOmzet)}</p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
              {transactions.length} transaksi sukses tercatat
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 border border-orange-100">
            <Gem size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Total Gramasi Emas Terjual</p>
            <p className="text-xl font-extrabold text-gray-900 mt-0.5">{totalBerat.toFixed(2)} gram</p>
            <p className="text-[11px] text-orange-600 font-semibold mt-0.5">
              {totalQty} perhiasan berpindah tangan
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Metode Pembayaran</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-bold text-gray-800">Multi-Channel:</span>
              <span className="text-[11px] bg-gray-100 px-2 py-0.5 rounded-md font-medium text-gray-600">
                Cash, EDC, Trf, QRIS
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Real-time settlement</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
        <div className="flex-1 w-full relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
          <input
            type="text"
            placeholder="Cari transaksi berdasarkan No. Faktur, nama pelanggan, atau SKU..."
            value={txSearchQuery}
            onChange={e => setTxSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-orange-500 focus:bg-white transition-all font-medium"
          />
        </div>
        {/* Method Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto shrink-0 pb-1 md:pb-0">
          {[
            { id: 'semua', label: 'Semua Metode' },
            { id: 'cash', label: 'Tunai' },
            { id: 'debit', label: 'Debit EDC' },
            { id: 'transfer', label: 'Transfer' },
            { id: 'qris', label: 'QRIS' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTxFilterMethod(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap min-h-[36px] ${
                txFilterMethod === tab.id ? 'bg-orange-500 text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* MOBILE LIST CARDS VIEW (md:hidden) */}
      <div className="md:hidden space-y-3">
        {filtered.map(tx => (
          <div key={tx.id} className="bg-white p-4 rounded-2xl border border-gray-200 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <div>
                <span className="font-mono font-bold text-gray-900 text-xs">{tx.invoiceNo}</span>
                <p className="text-[10px] text-gray-400 mt-0.5">{tx.dateStr} &bull; {tx.timeStr}</p>
              </div>
              <div className="text-right">
                <span className="text-sm font-extrabold text-orange-600 tabular-nums">{formatIDR(tx.grandTotal)}</span>
                <p className="text-[10px] text-gray-400">Termasuk PPN</p>
              </div>
            </div>

            <div className="text-xs space-y-1">
              <div className="flex justify-between text-gray-600">
                <span className="font-medium text-gray-400">Pelanggan:</span>
                <span className="font-semibold text-gray-800">{tx.customerName}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span className="font-medium text-gray-400">Kasir:</span>
                <span className="font-medium text-gray-700">{tx.cashier}</span>
              </div>
              <div className="pt-1 text-gray-800 font-medium">
                <span className="text-[11px] text-gray-400 block font-normal">Item:</span>
                <span className="text-xs">{tx.items.map(it => `${it.name} (${it.qty}x)`).join(', ')}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <div>
                {tx.paymentMethod === 'cash' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    <Banknote size={12} />
                    Tunai
                  </span>
                )}
                {tx.paymentMethod === 'debit' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                    <CreditCard size={12} />
                    Debit {tx.paymentDetails.debitBank}
                  </span>
                )}
                {tx.paymentMethod === 'transfer' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60">
                    <Building2 size={12} />
                    Trf {tx.paymentDetails.transferBank}
                  </span>
                )}
                {tx.paymentMethod === 'qris' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200/60">
                    <QrCode size={12} />
                    QRIS
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => onSelectReceipt(tx)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-500 hover:text-white text-orange-600 font-bold rounded-xl text-xs transition-colors cursor-pointer min-h-[36px]"
              >
                <Printer size={13} />
                Cetak Struk
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center text-gray-400 text-xs">
            Tidak ada riwayat transaksi yang cocok dengan filter.
          </div>
        )}
      </div>

      {/* DESKTOP & TABLET TRANSACTIONS TABLE (hidden md:block) */}
      <div className="hidden md:block bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-500 uppercase font-semibold tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-5">No. Faktur / Waktu</th>
                <th className="py-3.5 px-4">Pelanggan & Kasir</th>
                <th className="py-3.5 px-4">Item & Rincian Gramasi</th>
                <th className="py-3.5 px-4">Metode Bayar</th>
                <th className="py-3.5 px-4 text-right">Total Transaksi</th>
                <th className="py-3.5 px-5 text-center">Aksi Nota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {filtered.map(tx => (
                <tr key={tx.id} className="hover:bg-orange-50/30 transition-colors">
                  <td className="py-4 px-5">
                    <div className="font-mono font-bold text-gray-900">{tx.invoiceNo}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      {tx.dateStr} &bull; {tx.timeStr}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-semibold text-gray-800">{tx.customerName}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{tx.cashier}</div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-gray-800 font-medium">
                      {tx.items.map(it => `${it.name} (${it.qty}x)`).join(', ')}
                    </div>
                    <div className="text-[11px] text-orange-600 font-bold mt-0.5">
                      Total Berat: {tx.totalBerat.toFixed(2)}g ({tx.totalQty} pcs)
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    {tx.paymentMethod === 'cash' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                        <Banknote size={13} />
                        Tunai
                      </span>
                    )}
                    {tx.paymentMethod === 'debit' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                        <CreditCard size={13} />
                        Debit {tx.paymentDetails.debitBank}
                      </span>
                    )}
                    {tx.paymentMethod === 'transfer' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60">
                        <Building2 size={13} />
                        Trf {tx.paymentDetails.transferBank}
                      </span>
                    )}
                    {tx.paymentMethod === 'qris' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200/60">
                        <QrCode size={13} />
                        QRIS GPN
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="font-extrabold text-sm text-gray-900 tabular-nums">{formatIDR(tx.grandTotal)}</div>
                    <div className="text-[10px] text-gray-400">Termasuk PPN 11%</div>
                  </td>
                  <td className="py-4 px-5 text-center">
                    <Tooltip content="Cetak Ulang Struk Nota" side="left" sideOffset={6}>
                      <button
                        type="button"
                        onClick={() => onSelectReceipt(tx)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-orange-500 hover:text-white text-gray-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer min-h-[36px]"
                      >
                        <Printer size={13} />
                        Cetak Struk
                      </button>
                    </Tooltip>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    Tidak ada riwayat transaksi yang cocok dengan filter pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
