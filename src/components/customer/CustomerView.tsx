import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  ShoppingCart,
  Search,
  Phone,
  MessageCircle,
  Sparkles,
  ShoppingBag,
  Scale,
  Edit2,
  Trash2,
  MapPin,
  CreditCard,
  Crown,
  Building2,
  UserCheck,
} from 'lucide-react';
import { Customer, Transaction, BuybackItem } from '../../types';
import { formatIDR } from '../../utils/formatters';
import { AddCustomerModal } from './AddCustomerModal';

interface CustomerViewProps {
  customers: Customer[];
  transactions: Transaction[];
  buybacks: BuybackItem[];
  onSaveCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  onSelectCustomerForPOS: (customerName: string) => void;
  onSelectCustomerForBuyback: (customerName: string, customerPhone: string) => void;
}

export const CustomerView: React.FC<CustomerViewProps> = ({
  customers,
  transactions,
  buybacks,
  onSaveCustomer,
  onDeleteCustomer,
  onSelectCustomerForPOS,
  onSelectCustomerForBuyback,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('semua');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Perhitungan dinamis akumulasi transaksi per pelanggan
  const customersWithStats = customers.map(cust => {
    // Cari transaksi penjualan yang cocok dengan nama pelanggan
    const matchingTx = transactions.filter(
      tx => tx.customerName.toLowerCase() === cust.name.toLowerCase()
    );
    const txSpent = matchingTx.reduce((sum, tx) => sum + tx.grandTotal, 0);
    const totalTx = matchingTx.length;

    // Cari transaksi buyback
    const matchingBb = buybacks.filter(
      bb => bb.customerName.toLowerCase() === cust.name.toLowerCase()
    );

    const totalSpent = (cust.totalSpent || 0) + txSpent;
    const totalTransactions = (cust.totalTransactions || 0) + totalTx + matchingBb.length;

    return {
      ...cust,
      computedSpent: totalSpent,
      computedTx: totalTransactions,
      buybackCount: matchingBb.length,
    };
  });

  // Filter pelanggan
  const filteredCustomers = customersWithStats.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.memberCode.toLowerCase().includes(q) ||
      (c.nik && c.nik.includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q));

    const matchesType =
      filterType === 'semua' ||
      (filterType === 'VIP' && c.type === 'VIP') ||
      (filterType === 'Reguler' && c.type === 'Reguler') ||
      (filterType === 'Mitra' && c.type === 'Mitra / Toko');

    return matchesSearch && matchesType;
  });

  // KPI Ringkasan
  const totalPelanggan = customers.length;
  const totalVip = customers.filter(c => c.type === 'VIP').length;
  const totalAkumulasiBelanja = customersWithStats.reduce((sum, c) => sum + c.computedSpent, 0);

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsAddModalOpen(true);
  };

  const handleDelete = (c: Customer) => {
    if (confirm(`Apakah Anda yakin ingin menghapus pelanggan "${c.name}"?`)) {
      onDeleteCustomer(c.id);
    }
  };

  return (
    <div className="space-y-4 w-full pb-10">
      {/* 1. HEADER SECTION (Clean Brand e.paper) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-lg border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-orange-50 text-orange-600 rounded-lg border border-orange-100">
              <Users size={20} />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                Data Pelanggan
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Kelola member toko emas, kontak WhatsApp, ukuran cincin, dan riwayat belanja
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingCustomer(null);
            setIsAddModalOpen(true);
          }}
          className="h-9 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors cursor-pointer shadow-xs shrink-0 inline-flex items-center justify-center gap-1.5 active:scale-[0.98]"
        >
          <UserPlus size={16} />
          <span>Tambah Pelanggan Baru</span>
        </button>
      </div>

      {/* 2. RINGKASAN METRIK TOKO EMAS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-4 sm:p-5 rounded-lg border border-gray-200 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs sm:text-sm text-gray-500 font-medium block">Total Pelanggan Terdaftar</span>
            <div className="text-xl sm:text-2xl font-bold text-gray-900 font-mono tracking-tight mt-1">{totalPelanggan} Orang</div>
          </div>
          <span className="p-2.5 bg-gray-50 text-gray-600 rounded-lg border border-gray-100">
            <Users size={20} />
          </span>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-4 sm:p-5 rounded-lg border border-gray-200 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs sm:text-sm text-gray-500 font-medium block">Member VIP & Loyal</span>
            <div className="text-xl sm:text-2xl font-bold text-amber-600 font-mono tracking-tight mt-1">{totalVip} Member</div>
          </div>
          <span className="p-2.5 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
            <Crown size={20} />
          </span>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-4 sm:p-5 rounded-lg border border-gray-200 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs sm:text-sm text-gray-500 font-medium block">Akumulasi Belanja Member</span>
            <div className="text-xl sm:text-2xl font-bold text-orange-600 font-mono tracking-tight mt-1 truncate">
              {formatIDR(totalAkumulasiBelanja)}
            </div>
          </div>
          <span className="p-2.5 bg-orange-50 text-orange-600 rounded-lg border border-orange-100">
            <ShoppingBag size={20} />
          </span>
        </div>
      </div>

      {/* 3. FILTER & SEARCH BAR */}
      <div className="bg-white p-3.5 sm:p-4 rounded-lg border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari nama, WhatsApp, NIK KTP, atau kode member..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm font-medium focus:bg-white focus:outline-none focus:border-orange-500 min-h-[38px]"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'semua', label: 'Semua' },
            { id: 'VIP', label: 'Member VIP' },
            { id: 'Reguler', label: 'Reguler' },
            { id: 'Mitra', label: 'Mitra / Toko' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterType(tab.id)}
              className={`h-9 px-3.5 text-xs sm:text-sm font-semibold rounded-lg inline-flex items-center justify-center transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                filterType === tab.id
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. DAFTAR PELANGGAN: TABEL DESKTOP & CARD LIST MOBILE */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users size={22} />
            </div>
            <p className="text-sm font-bold text-gray-700">Tidak ada pelanggan ditemukan</p>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `Pencarian "${searchQuery}" tidak cocok dengan data pelanggan mana pun.`
                : 'Belum ada data pelanggan untuk filter yang dipilih.'}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-3 px-3.5 py-1.5 text-xs font-bold text-orange-600 bg-orange-50 rounded-md hover:bg-orange-100 transition-colors cursor-pointer"
              >
                Reset Pencarian
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View (lg:block) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-xs">
                    <th className="py-3 px-4">Member & Identitas</th>
                    <th className="py-3 px-4">Kontak & Alamat</th>
                    <th className="py-3 px-4">Kadar & Ukuran Jari</th>
                    <th className="py-3 px-4 text-right">Akumulasi Belanja</th>
                    <th className="py-3 px-4 text-center">Aksi Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCustomers.map(c => {
                    const cleanPhone = c.phone.replace(/[^0-9]/g, '');
                    const waPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;

                    return (
                      <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                        {/* Member & Identitas */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="flex items-start gap-2.5">
                            <span
                              className={`p-1.5 rounded-md mt-0.5 shrink-0 ${
                                c.type === 'VIP'
                                  ? 'bg-amber-100 text-amber-700'
                                  : c.type === 'Mitra / Toko'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {c.type === 'VIP' ? (
                                <Crown size={14} />
                              ) : c.type === 'Mitra / Toko' ? (
                                <Building2 size={14} />
                              ) : (
                                <UserCheck size={14} />
                              )}
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 text-xs sm:text-sm leading-tight">{c.name}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-semibold">
                                  {c.memberCode}
                                </span>
                                <span
                                  className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                    c.type === 'VIP'
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : c.type === 'Mitra / Toko'
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                      : 'bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  {c.type}
                                </span>
                              </div>
                              {c.nik && (
                                <p className="text-xs text-gray-400 font-mono mt-1 flex items-center gap-1">
                                  <CreditCard size={12} className="shrink-0" />
                                  <span>NIK: {c.nik}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Kontak & Alamat */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-medium text-gray-800 text-xs">{c.phone}</span>
                              <a
                                href={`https://wa.me/${waPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded text-xs font-semibold transition-colors cursor-pointer"
                                title="Chat WhatsApp Pelanggan"
                              >
                                <MessageCircle size={12} />
                                <span>WA</span>
                              </a>
                            </div>
                            {c.address && (
                              <p className="text-xs text-gray-500 flex items-start gap-1 max-w-xs">
                                <MapPin size={12} className="shrink-0 mt-0.5 text-gray-400" />
                                <span className="truncate">{c.address}</span>
                              </p>
                            )}
                            {c.notes && (
                              <p className="text-xs text-gray-400 italic max-w-xs truncate">
                                "{c.notes}"
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Kadar & Ukuran Jari */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-1">
                            <div className="inline-flex items-center gap-1 text-xs text-orange-600 font-semibold bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                              <Sparkles size={12} />
                              <span>{c.preferredKadar || 'Semua Kadar'}</span>
                            </div>
                            {c.ringSize && (
                              <p className="text-xs text-gray-600 font-medium">
                                Ukuran Jari: <span className="font-bold">{c.ringSize}</span>
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Akumulasi Belanja */}
                        <td className="py-3.5 px-4 align-top text-right">
                          <div>
                            <p className="font-bold text-gray-900 text-xs sm:text-sm">
                              {formatIDR(c.computedSpent)}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {c.computedTx} kali belanja
                              {c.buybackCount > 0 ? ` (${c.buybackCount}x buyback)` : ''}
                            </p>
                          </div>
                        </td>

                        {/* Aksi Cepat */}
                        <td className="py-3.5 px-4 align-top text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Tombol Kasir POS */}
                            <button
                              type="button"
                              onClick={() => onSelectCustomerForPOS(c.name)}
                              className="h-7 px-2.5 inline-flex items-center justify-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-md transition-colors cursor-pointer"
                              title="Buka Kasir POS untuk pelanggan ini"
                            >
                              <ShoppingCart size={12} />
                              <span>POS</span>
                            </button>

                            {/* Tombol Buyback */}
                            <button
                              type="button"
                              onClick={() => onSelectCustomerForBuyback(c.name, c.phone)}
                              className="h-7 px-2.5 inline-flex items-center justify-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors cursor-pointer"
                              title="Input Buyback untuk pelanggan ini"
                            >
                              <Scale size={12} />
                              <span>Buyback</span>
                            </button>

                            {/* Tombol Edit */}
                            <button
                              type="button"
                              onClick={() => handleEdit(c)}
                              className="h-7 px-2 inline-flex items-center justify-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                              title="Edit Data"
                            >
                              <Edit2 size={12} />
                              <span>Edit</span>
                            </button>

                            {/* Tombol Hapus */}
                            <button
                              type="button"
                              onClick={() => handleDelete(c)}
                              className="h-7 px-2 inline-flex items-center justify-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                              title="Hapus Pelanggan"
                            >
                              <Trash2 size={12} />
                              <span>Hapus</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Card View (lg:hidden) */}
            <div className="lg:hidden divide-y divide-gray-100">
              {filteredCustomers.map(c => {
                const cleanPhone = c.phone.replace(/[^0-9]/g, '');
                const waPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;

                return (
                  <div key={c.id} className="p-3.5 sm:p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-gray-900 text-xs sm:text-sm leading-tight truncate">
                            {c.name}
                          </p>
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded shrink-0 ${
                              c.type === 'VIP'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : c.type === 'Mitra / Toko'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {c.type}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">
                          {c.memberCode} {c.nik ? `• NIK: ${c.nik}` : ''}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-bold text-gray-900 text-xs sm:text-sm block">
                          {formatIDR(c.computedSpent)}
                        </span>
                        <span className="text-xs text-gray-400 block">
                          {c.computedTx} transaksi
                        </span>
                      </div>
                    </div>

                    {/* Kontak & Preferensi */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-gray-700 text-xs">{c.phone}</span>
                        <a
                          href={`https://wa.me/${waPhone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-xs font-semibold"
                        >
                          <MessageCircle size={12} />
                          <span>WA</span>
                        </a>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-xs bg-orange-50 text-orange-600 font-semibold px-2 py-0.5 rounded border border-orange-100">
                          {c.preferredKadar || 'Emas'}
                        </span>
                        {c.ringSize && (
                          <span className="text-xs bg-gray-100 text-gray-700 font-medium px-2 py-0.5 rounded">
                            Size: {c.ringSize}
                          </span>
                        )}
                      </div>
                    </div>

                    {c.address && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                        <MapPin size={12} className="shrink-0 text-gray-400" />
                        <span className="truncate">{c.address}</span>
                      </p>
                    )}

                    {/* Mobile Action Buttons */}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectCustomerForPOS(c.name)}
                          className="px-2.5 py-1 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <ShoppingCart size={12} />
                          <span>Kasir POS</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectCustomerForBuyback(c.name, c.phone)}
                          className="px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <Scale size={12} />
                          <span>Buyback</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEdit(c)}
                          className="px-2 py-1 text-xs font-semibold text-gray-600 hover:text-gray-900 rounded cursor-pointer inline-flex items-center gap-1"
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c)}
                          className="px-2 py-1 text-xs font-semibold text-red-500 hover:text-red-700 rounded cursor-pointer inline-flex items-center gap-1"
                        >
                          <Trash2 size={12} />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Modal Tambah / Edit Pelanggan */}
      <AddCustomerModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingCustomer(null);
        }}
        onSaveCustomer={onSaveCustomer}
        initialCustomer={editingCustomer}
      />
    </div>
  );
};
