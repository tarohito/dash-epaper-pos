import React, { useState } from 'react';
import { Search } from 'lucide-react';
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

  const currentDateStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-5 pb-6">
      {/* 1. KESATUAN 1 CARD BESAR: Persis Beranda (Tampilan Judul dan Tabel Saja) */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5">
        {/* Header Bersih Beranda: Judul + Tanggal + Subtitle + CTA Ke Kasir POS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-tight">
                Rekap Transaksi Penjualan
              </h3>
              <span className="inline-flex items-center text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 px-2.5 py-0.5 rounded">
                {currentDateStr}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Histori seluruh transaksi kasir, rincian pembayaran, dan cetak ulang bukti nota struk perhiasan.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={onNavigateToPos}
              className="h-9 px-4 text-xs sm:text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer shadow-xs active:scale-[0.98]"
            >
              Buka Kasir POS
            </button>
          </div>
        </div>

        {/* Toolbar Pencarian & Filter Metode Pembayaran */}
        <div className="pt-3.5 pb-2">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Input Pencarian */}
            <div className="relative flex-1 w-full">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari no. faktur, nama pelanggan, atau perhiasan/SKU..."
                value={txSearchQuery}
                onChange={e => setTxSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-xs sm:text-sm bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-500 outline-none leading-normal"
              />
            </div>

            {/* Segmented Filter Metode Pembayaran */}
            <div className="inline-flex h-9 p-0.5 bg-gray-100 rounded-lg border border-gray-200 items-center overflow-x-auto max-w-full">
              {[
                { id: 'semua', label: 'Semua' },
                { id: 'cash', label: 'Tunai' },
                { id: 'debit', label: 'Debit EDC' },
                { id: 'transfer', label: 'Transfer Bank' },
                { id: 'qris', label: 'QRIS' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTxFilterMethod(tab.id)}
                  className={`h-full px-3 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center whitespace-nowrap ${
                    txFilterMethod === tab.id
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* TABEL TRANSAKSI                                           */}
        {/* ========================================================= */}
        <div className="mt-2 bg-white rounded-lg border border-gray-200 overflow-hidden shadow-2xs">
          {/* MOBILE LIST CARDS VIEW (md:hidden) */}
          <div className="md:hidden divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-xs sm:text-sm">
                Tidak ada riwayat transaksi yang cocok dengan filter pencarian.
              </div>
            ) : (
              filtered.map(tx => (
                <div key={tx.id} className="p-4 space-y-3 hover:bg-orange-50/20 transition-colors">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <div>
                      <span className="font-mono font-bold text-gray-900 text-xs sm:text-sm">{tx.invoiceNo}</span>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">
                        {tx.dateStr} &bull; {tx.timeStr}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-900 font-mono tabular-nums">
                        {formatIDR(tx.grandTotal)}
                      </span>
                      <p className="text-xs text-gray-400">Termasuk PPN</p>
                    </div>
                  </div>

                  <div className="text-xs space-y-1">
                    <div className="flex justify-between text-gray-600">
                      <span className="text-gray-400">Pelanggan:</span>
                      <span className="font-semibold text-gray-800">{tx.customerName}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span className="text-gray-400">Kasir:</span>
                      <span className="font-medium text-gray-700">{tx.cashier}</span>
                    </div>
                    <div className="pt-1 text-gray-800">
                      <span className="text-gray-400 block text-xs">Item:</span>
                      <span className="font-medium">
                        {tx.items.map(it => `${it.name} (${it.qty}x)`).join(', ')}
                      </span>
                    </div>
                    <div className="text-xs text-orange-600 font-bold font-mono">
                      Total Berat: {tx.totalBerat.toFixed(2)}g ({tx.totalQty} pcs)
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      {tx.paymentMethod === 'cash' && (
                        <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded capitalize bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Tunai
                        </span>
                      )}
                      {tx.paymentMethod === 'debit' && (
                        <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded capitalize bg-blue-50 text-blue-700 border border-blue-200">
                          Debit {tx.paymentDetails.debitBank || 'EDC'}
                        </span>
                      )}
                      {tx.paymentMethod === 'transfer' && (
                        <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded capitalize bg-purple-50 text-purple-700 border border-purple-200">
                          Trf {tx.paymentDetails.transferBank || 'Bank'}
                        </span>
                      )}
                      {tx.paymentMethod === 'qris' && (
                        <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded capitalize bg-teal-50 text-teal-700 border border-teal-200">
                          QRIS GPN
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectReceipt(tx)}
                      className="inline-flex items-center justify-center h-8 px-2.5 text-xs font-semibold text-orange-600 hover:text-white bg-orange-50 hover:bg-orange-500 border border-orange-200 hover:border-orange-500 rounded-md transition-all cursor-pointer shadow-2xs active:scale-95"
                    >
                      Cetak Nota
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* DESKTOP TABLE VIEW (hidden md:block) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-500 uppercase font-semibold tracking-wider text-xs">
                <tr>
                  <th className="py-3 px-4">No. Faktur & Waktu</th>
                  <th className="py-3 px-4">Pelanggan & Kasir</th>
                  <th className="py-3 px-4">Item & Rincian Gramasi</th>
                  <th className="py-3 px-3 text-center">Metode Bayar</th>
                  <th className="py-3 px-4 text-right">Total Transaksi</th>
                  <th className="py-3 px-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500 text-xs sm:text-sm">
                      Tidak ada riwayat transaksi yang cocok dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  filtered.map(tx => (
                    <tr key={tx.id} className="hover:bg-orange-50/30 transition-colors">
                      {/* No. Faktur & Waktu */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-gray-900 text-xs sm:text-sm">{tx.invoiceNo}</div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5">
                          {tx.dateStr} &bull; {tx.timeStr}
                        </div>
                      </td>

                      {/* Pelanggan & Kasir */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-800 text-xs sm:text-sm">{tx.customerName}</div>
                        <div className="text-xs text-gray-500 mt-0.5">Kasir: {tx.cashier}</div>
                      </td>

                      {/* Item & Gramasi */}
                      <td className="py-3 px-4">
                        <div className="text-gray-800 font-medium text-xs sm:text-sm line-clamp-1 max-w-[280px]">
                          {tx.items.map(it => `${it.name} (${it.qty}x)`).join(', ')}
                        </div>
                        <div className="text-xs text-orange-600 font-bold font-mono mt-0.5">
                          {tx.totalBerat.toFixed(2)}g ({tx.totalQty} pcs)
                        </div>
                      </td>

                      {/* Metode Bayar (Badge Tanpa Icon) */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {tx.paymentMethod === 'cash' && (
                          <span className="inline-flex items-center justify-center text-xs font-semibold px-2 py-0.5 rounded capitalize bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Tunai
                          </span>
                        )}
                        {tx.paymentMethod === 'debit' && (
                          <span className="inline-flex items-center justify-center text-xs font-semibold px-2 py-0.5 rounded capitalize bg-blue-50 text-blue-700 border border-blue-200">
                            Debit {tx.paymentDetails.debitBank || 'EDC'}
                          </span>
                        )}
                        {tx.paymentMethod === 'transfer' && (
                          <span className="inline-flex items-center justify-center text-xs font-semibold px-2 py-0.5 rounded capitalize bg-purple-50 text-purple-700 border border-purple-200">
                            Trf {tx.paymentDetails.transferBank || 'Bank'}
                          </span>
                        )}
                        {tx.paymentMethod === 'qris' && (
                          <span className="inline-flex items-center justify-center text-xs font-semibold px-2 py-0.5 rounded capitalize bg-teal-50 text-teal-700 border border-teal-200">
                            QRIS GPN
                          </span>
                        )}
                      </td>

                      {/* Total Tagihan */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="font-bold text-sm sm:text-base text-gray-900 font-mono tabular-nums">
                          {formatIDR(tx.grandTotal)}
                        </div>
                        <div className="text-xs text-gray-400">Termasuk PPN 11%</div>
                      </td>

                      {/* Aksi Print Nota (Icon Saja dengan Tooltip) */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onSelectReceipt(tx)}
                          className="inline-flex items-center justify-center h-8 px-2.5 text-xs font-semibold text-orange-600 hover:text-white bg-orange-50 hover:bg-orange-500 border border-orange-200 hover:border-orange-500 rounded-md transition-all cursor-pointer shadow-2xs active:scale-95"
                        >
                          Cetak Nota
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Info Count & Total */}
          <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              Menampilkan <strong>{filtered.length}</strong> dari total{' '}
              <strong>{transactions.length}</strong> transaksi penjualan
            </span>
            <span className="hidden sm:inline text-gray-400">
              Arsip transaksi terenkripsi &amp; terintegrasi POS
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
