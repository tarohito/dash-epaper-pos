import React from 'react';
import { BadgePercent } from 'lucide-react';

interface PromoCardProps {
  promoCount: number;
  isActiveFilter?: boolean;
  onToggleFilter?: () => void;
  className?: string;
}

export const PromoCard: React.FC<PromoCardProps> = ({
  promoCount,
  isActiveFilter = false,
  onToggleFilter,
  className = '',
}) => {
  return (
    <div
      onClick={onToggleFilter}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggleFilter?.();
        }
      }}
      className={`bg-[#f8dc24] border border-[#ecd019] rounded-lg p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between select-none cursor-pointer min-h-[220px] sm:min-h-[240px] transition-all duration-200 active:scale-[0.98] ${
        isActiveFilter ? 'ring-2 ring-black/70' : 'hover:brightness-98'
      } ${className}`}
      title="Klik untuk memfilter produk promo"
    >
      {/* Giant Dominant Discount Icon Watermark (Overflowing Top-Right) */}
      <div
        className="absolute -top-7 -right-7 sm:-top-8 sm:-right-8 pointer-events-none select-none text-white/45 rotate-[16deg]"
        aria-hidden="true"
      >
        <BadgePercent
          className="w-36 h-36 sm:w-44 sm:h-44 text-white/45"
          strokeWidth={1.75}
        />
      </div>

      {/* Top Left: Crisp Dark Discount Badge Icon */}
      <div className="relative z-10 flex items-start justify-between w-full">
        <div className="text-[#262626]">
          <BadgePercent size={34} strokeWidth={2.4} className="text-[#262626]" />
        </div>

        {isActiveFilter && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-black/85 text-yellow-300 rounded uppercase tracking-wider">
            Filter Aktif
          </span>
        )}
      </div>

      {/* Bottom Left: Title & Subtext exactly as in reference */}
      <div className="relative z-10 mt-auto text-left pt-6">
        <h3 className="text-base sm:text-lg font-black text-[#222222] tracking-tight leading-none mb-1.5">
          Promo
        </h3>
        <p className="text-xs sm:text-[13px] font-bold text-[#444444] leading-snug">
          {promoCount} promo tersedia
          <br />
          untuk pelanggan
        </p>
      </div>
    </div>
  );
};
