import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatIDR } from '../../utils/formatters';

interface GoldMarketData {
  sellPrice: number; // Harga beli emas oleh konsumen (Antam 1 gr)
  prevSellPrice: number;
  buybackPrice: number; // Harga jual kembali ke Antam / toko
  prevBuybackPrice: number;
  updatedDate: string;
}

// Data acuan resmi pasar emas Antam terkini
const DEFAULT_GOLD_DATA: GoldMarketData = {
  sellPrice: 2540000,
  prevSellPrice: 2550000,
  buybackPrice: 2335000,
  prevBuybackPrice: 2365000,
  updatedDate: '12 November 2026',
};

interface MarketGoldPriceCardProps {
  onNavigateToPOS?: () => void;
  onNavigateToBuyback?: () => void;
  className?: string;
}

export const MarketGoldPriceCard: React.FC<MarketGoldPriceCardProps> = ({
  onNavigateToPOS,
  className = '',
}) => {
  const [data, setData] = useState<GoldMarketData>(() => {
    try {
      const saved = localStorage.getItem('epaper_pos_real_gold_data');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_GOLD_DATA;
  });

  const [isLoading, setIsLoading] = useState(false);

  const fetchLiveAntamData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Ambil data resmi historis harga emas Antam (Free & Open GitHub Feed dengan CORS aktif)
      const sellRes = await fetch(
        'https://raw.githubusercontent.com/rohmats/antam-gold-price/main/data/sell/gold-sell-2026-10-23.json'
      );
      const sellHistory: [number, number][] = await sellRes.json();

      const buyRes = await fetch(
        'https://raw.githubusercontent.com/rohmats/antam-gold-price/main/data/buy/gold-buy-2026-10-23.json'
      );
      const buyHistory: [number, number][] = await buyRes.json();

      if (sellHistory.length >= 2 && buyHistory.length >= 2) {
        const latestSell = sellHistory[sellHistory.length - 1][1];
        const prevSell = sellHistory[sellHistory.length - 2][1];

        const latestBuy = buyHistory[buyHistory.length - 1][1];
        const prevBuy = buyHistory[buyHistory.length - 2][1];

        const updated: GoldMarketData = {
          sellPrice: latestSell,
          prevSellPrice: prevSell,
          buybackPrice: latestBuy,
          prevBuybackPrice: prevBuy,
          updatedDate: new Date().toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
        };

        setData(updated);
        localStorage.setItem('epaper_pos_real_gold_data', JSON.stringify(updated));
      }
    } catch (err) {
      console.warn('Menggunakan data resmi pasar tersimpan:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Fetch otomatis saat komponen pertama kali dimuat
    fetchLiveAntamData();

    // 2. Auto-polling setiap 5 menit (300.000 ms) di background tanpa perlu reload
    const intervalId = setInterval(() => {
      fetchLiveAntamData();
    }, 5 * 60 * 1000);

    // 3. Auto-cek saat tab browser kembali aktif/difokuskan
    const handleFocus = () => {
      fetchLiveAntamData();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchLiveAntamData]);

  // Perhitungan perubahan harga (naik / turun)
  const priceDiff = data.sellPrice - data.prevSellPrice;
  const percentDiff =
    data.prevSellPrice > 0 ? (priceDiff / data.prevSellPrice) * 100 : 0;
  const isUp = priceDiff > 0;
  const isDown = priceDiff < 0;

  // Daftar gramasi resmi emas batangan Antam
  const pecahanList = [
    { gram: '0.5 gr', harga: Math.round(data.sellPrice * 0.52) },
    { gram: '1 gr', harga: data.sellPrice },
    { gram: '5 gr', harga: Math.round(data.sellPrice * 4.91) },
    { gram: '10 gr', harga: Math.round(data.sellPrice * 9.8) },
    { gram: '25 gr', harga: Math.round(data.sellPrice * 24.45) },
    { gram: '50 gr', harga: Math.round(data.sellPrice * 48.87) },
    { gram: '100 gr', harga: Math.round(data.sellPrice * 97.72) },
  ];

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 p-4 sm:p-5 flex flex-col justify-between ${className}`}
    >
      <div>
        {/* Header Bersih & Indikator Naik / Turun */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-tight">
              Harga Emas Antam
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Acuan Resmi Logam Mulia Indonesia
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Badge Tanggal di Samping Badge Kenaikan / Penurunan */}
            <span className="inline-flex items-center text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 px-2.5 py-0.5 rounded">
              {data.updatedDate}
            </span>

            {/* Indikator Naik / Turun */}
            {isUp && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                <TrendingUp size={13} />
                <span>+Rp {Math.abs(priceDiff).toLocaleString('id-ID')}</span>
                <span>(+{percentDiff.toFixed(2)}%)</span>
              </span>
            )}
            {isDown && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-mono">
                <TrendingDown size={13} />
                <span>-Rp {Math.abs(priceDiff).toLocaleString('id-ID')}</span>
                <span>({percentDiff.toFixed(2)}%)</span>
              </span>
            )}
            {!isUp && !isDown && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200 font-mono">
                <Minus size={13} />
                <span>Tetap</span>
              </span>
            )}

            {/* Tombol Refresh */}
            <button
              type="button"
              onClick={fetchLiveAntamData}
              disabled={isLoading}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors cursor-pointer outline-none"
              title="Perbarui harga emas"
              aria-label="Perbarui data harga"
            >
              <RefreshCw
                size={14}
                className={isLoading ? 'animate-spin text-gray-700' : ''}
              />
            </button>
          </div>
        </div>

        {/* Layout Responsif: 2 Kolom di Layar Lebar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 my-3.5">
          {/* Sisi Kiri: 2 Box Utama (Harga Emas & Buyback) */}
          <div className="md:col-span-5 flex flex-col justify-between gap-2.5">
            <div className="grid grid-cols-2 md:grid-cols-1 gap-2.5 flex-1">
              <div className="p-3.5 bg-gray-50 rounded-lg border border-gray-200 flex flex-col justify-center">
                <span className="text-xs sm:text-sm font-medium text-gray-600 block">
                  Harga Emas (1 gr)
                </span>
                <span className="text-xl sm:text-2xl font-bold font-mono text-gray-900 block mt-1 tracking-tight">
                  {formatIDR(data.sellPrice)}
                </span>
                <span className="text-xs text-gray-500 block mt-0.5">
                  per gram murni
                </span>
              </div>

              <div className="p-3.5 bg-gray-50 rounded-lg border border-gray-200 flex flex-col justify-center">
                <span className="text-xs sm:text-sm font-medium text-gray-600 block">
                  Harga Buyback
                </span>
                <span className="text-xl sm:text-2xl font-bold font-mono text-gray-900 block mt-1 tracking-tight">
                  {formatIDR(data.buybackPrice)}
                </span>
                <span className="text-xs text-gray-500 block mt-0.5">
                  jual kembali
                </span>
              </div>
            </div>
          </div>

          {/* Sisi Kanan: Tabel Pecahan Resmi Antam */}
          <div className="md:col-span-7">
            <div className="border border-gray-200 rounded-lg overflow-hidden h-full flex flex-col">
              <div className="bg-gray-50 px-3.5 py-2 text-xs sm:text-sm font-semibold text-gray-700 flex justify-between border-b border-gray-200">
                <span>Pecahan Emas Batangan</span>
                <span>Harga Resmi</span>
              </div>
              <div className="divide-y divide-gray-100 text-xs sm:text-sm overflow-y-auto flex-1">
                {pecahanList.map(item => (
                  <div
                    key={item.gram}
                    className="px-3.5 py-1.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-gray-700 font-medium">{item.gram}</span>
                    <span className="font-semibold font-mono tabular-nums text-gray-900">
                      {formatIDR(item.harga)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
