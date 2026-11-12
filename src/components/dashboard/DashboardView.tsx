import React from 'react';
import {
  DollarSign,
  TrendingUp,
  Scale,
  ShoppingCart,
  Store,
  ChevronRight,
  Gem,
  Sparkles,
  ArrowRight,
  Building2,
} from 'lucide-react';
import { Product, Transaction, BuybackItem, Tenant } from '../../types';
import { formatIDR } from '../../utils/formatters';
import { PromoCard } from '../pos/PromoCard';

interface DashboardViewProps {
  products: Product[];
  transactions: Transaction[];
  buybacks: BuybackItem[];
  activeTenant?: Tenant;
  onNavigateTo: (menu: string) => void;
  onOpenRegisterTenant: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  products,
  transactions,
  buybacks,
  activeTenant,
  onNavigateTo,
  onOpenRegisterTenant,
}) => {
  // Metrics
  const totalOmzet = transactions.reduce((sum, tx) => sum + tx.grandTotal, 0);
  const totalWeightSold = transactions.reduce((sum, tx) => sum + tx.totalBerat, 0);
  const totalBuybackBayar = buybacks.reduce((sum, bb) => sum + bb.totalBayar, 0);
  const promoCount = products.filter(p => p.isPromo).length;
  const inStockCount = products.filter(p => p.stok > 0).length;

  return (
    <div className="space-y-5 pb-6">
      {/* 1. TOP SPOTLIGHT BANNER: Kembangkan bisnis bersama epaper (Requested by User) */}
      <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-red-500 rounded-lg p-5 sm:p-6 text-white border border-orange-600/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        {/* Subtle decorative background watermark */}
        <div className="absolute -right-6 -bottom-8 pointer-events-none select-none text-white/10 rotate-12">
          <Sparkles size={160} />
        </div>

        <div className="relative z-10 space-y-0.5">
          <p className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug">
            Kembangkan bisnis bersama epaper
          </p>
          <p className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug">
            Tunggu apa lagi?
          </p>
        </div>

        <div className="relative z-10 shrink-0 flex items-center">
          <button
            type="button"
            onClick={onOpenRegisterTenant}
            className="px-5 py-2.5 sm:py-3 bg-white hover:bg-orange-50 text-orange-600 hover:text-orange-700 font-black text-xs sm:text-sm rounded-md transition-all cursor-pointer shadow-none active:scale-95 flex items-center gap-2 whitespace-nowrap"
          >
            <span>Daftar Sekarang</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* Main Grid: KPI Metrics + Promo Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (8 cols): Key Business Metrics */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Card 1: Omzet Penjualan */}
            <div className="bg-white p-4 sm:p-5 rounded-lg border border-gray-200 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 border border-orange-100">
                <DollarSign size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-400 font-medium">Omzet Penjualan Hari Ini</p>
                <p className="text-lg sm:text-xl font-extrabold text-gray-900 truncate mt-0.5">
                  {formatIDR(totalOmzet)}
                </p>
                <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                  <TrendingUp size={12} /> {transactions.length} Transaksi Selesai
                </p>
              </div>
            </div>

            {/* Card 2: Berat Emas Terjual */}
            <div className="bg-white p-4 sm:p-5 rounded-lg border border-gray-200 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                <Gem size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-400 font-medium">Total Emas Terjual</p>
                <p className="text-lg sm:text-xl font-extrabold text-gray-900 mt-0.5">
                  {totalWeightSold.toFixed(2)} <span className="text-xs font-semibold text-gray-500">gram</span>
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Dari {inStockCount} perhiasan ready stok
                </p>
              </div>
            </div>

            {/* Card 3: Buyback Pembelian */}
            <div className="bg-white p-4 sm:p-5 rounded-lg border border-gray-200 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                <Scale size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-400 font-medium">Total Buyback Masuk</p>
                <p className="text-lg sm:text-xl font-extrabold text-gray-900 truncate mt-0.5">
                  {formatIDR(totalBuybackBayar)}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {buybacks.length} Transaksi Buyback
                </p>
              </div>
            </div>

            {/* Card 4: Multi-Outlet Aktif */}
            <div className="bg-white p-4 sm:p-5 rounded-lg border border-gray-200 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                <Store size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs text-gray-400 font-medium">Outlet Aktif</p>
                  <span className="text-[9px] bg-blue-100 text-blue-700 font-bold px-1 rounded">
                    Multi-Outlet
                  </span>
                </div>
                <p className="text-base sm:text-lg font-extrabold text-gray-900 mt-0.5 truncate">
                  {activeTenant?.name || 'Toko Mas Sejahtera'}
                </p>
                <p className="text-[11px] text-blue-600 font-semibold mt-0.5 truncate">
                  {activeTenant?.branchName || 'Cabang Utama'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Menu Shortcuts */}
          <div className="bg-white p-5 rounded-lg border border-gray-200">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Akses Cepat Modul Utama
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => onNavigateTo('Kasir POS (Penjualan)')}
                className="p-3 bg-gray-50 hover:bg-orange-50 border border-gray-200 hover:border-orange-200 rounded-md text-left transition-colors flex items-center justify-between cursor-pointer group"
              >
                <div>
                  <p className="text-xs font-bold text-gray-800 group-hover:text-orange-600">
                    Kasir POS (Penjualan)
                  </p>
                  <p className="text-[11px] text-gray-400">Scan barcode & pembayaran</p>
                </div>
                <ChevronRight size={16} className="text-gray-400 group-hover:text-orange-600" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateTo('Buyback (Pembelian)')}
                className="p-3 bg-gray-50 hover:bg-orange-50 border border-gray-200 hover:border-orange-200 rounded-md text-left transition-colors flex items-center justify-between cursor-pointer group"
              >
                <div>
                  <p className="text-xs font-bold text-gray-800 group-hover:text-orange-600">
                    Buyback (Pembelian)
                  </p>
                  <p className="text-[11px] text-gray-400">Penimbangan & kalkulasi kadar</p>
                </div>
                <ChevronRight size={16} className="text-gray-400 group-hover:text-orange-600" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateTo('Multi-Outlet')}
                className="p-3 bg-gray-50 hover:bg-orange-50 border border-gray-200 hover:border-orange-200 rounded-md text-left transition-colors flex items-center justify-between cursor-pointer group"
              >
                <div>
                  <p className="text-xs font-bold text-gray-800 group-hover:text-orange-600">
                    Multi-Outlet
                  </p>
                  <p className="text-[11px] text-gray-400">Kelola gerai & sinkronisasi toko</p>
                </div>
                <ChevronRight size={16} className="text-gray-400 group-hover:text-orange-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Solid Yellow Promo Card Featured */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200 flex flex-col h-full">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Promosi Aktif Toko
            </h3>
            {/* The Solid Yellow Promo Card */}
            <div className="flex-1">
              <PromoCard
                promoCount={promoCount}
                onToggleFilter={() => onNavigateTo('Kasir POS (Penjualan)')}
              />
            </div>
            <p className="text-[11px] text-gray-500 text-center mt-2.5">
              Klik card promo di atas untuk langsung membuka kasir dengan filter promo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
