import React from 'react';
import { Info } from 'lucide-react';
import Tooltip from '../Tooltip';

export type KpiAccent =
  | 'orange'
  | 'amber'
  | 'emerald'
  | 'teal'
  | 'blue'
  | 'purple'
  | 'rose';

const ACCENT_STYLES: Record<
  KpiAccent,
  {
    cardBorder: string;
    fillBg: string;
    fillText: string;
    iconBox: string;
  }
> = {
  orange: {
    cardBorder: 'hover:border-orange-500',
    fillBg: 'bg-orange-500',
    fillText: 'text-orange-500',
    iconBox:
      'bg-orange-50/80 text-orange-600 border-orange-100/80 group-hover:bg-white group-hover:text-orange-600 group-hover:border-white',
  },
  amber: {
    cardBorder: 'hover:border-amber-600',
    fillBg: 'bg-amber-600',
    fillText: 'text-amber-600',
    iconBox:
      'bg-amber-50/80 text-amber-600 border-amber-100/80 group-hover:bg-white group-hover:text-amber-600 group-hover:border-white',
  },
  emerald: {
    cardBorder: 'hover:border-emerald-600',
    fillBg: 'bg-emerald-600',
    fillText: 'text-emerald-600',
    iconBox:
      'bg-emerald-50/80 text-emerald-600 border-emerald-100/80 group-hover:bg-white group-hover:text-emerald-600 group-hover:border-white',
  },
  teal: {
    cardBorder: 'hover:border-teal-600',
    fillBg: 'bg-teal-600',
    fillText: 'text-teal-600',
    iconBox:
      'bg-teal-50/80 text-teal-600 border-teal-100/80 group-hover:bg-white group-hover:text-teal-600 group-hover:border-white',
  },
  blue: {
    cardBorder: 'hover:border-blue-600',
    fillBg: 'bg-blue-600',
    fillText: 'text-blue-600',
    iconBox:
      'bg-blue-50/80 text-blue-600 border-blue-100/80 group-hover:bg-white group-hover:text-blue-600 group-hover:border-white',
  },
  purple: {
    cardBorder: 'hover:border-purple-600',
    fillBg: 'bg-purple-600',
    fillText: 'text-purple-600',
    iconBox:
      'bg-purple-50/80 text-purple-600 border-purple-100/80 group-hover:bg-white group-hover:text-purple-600 group-hover:border-white',
  },
  rose: {
    cardBorder: 'hover:border-rose-600',
    fillBg: 'bg-rose-600',
    fillText: 'text-rose-600',
    iconBox:
      'bg-rose-50/80 text-rose-600 border-rose-100/80 group-hover:bg-white group-hover:text-rose-600 group-hover:border-white',
  },
};

interface KpiCardProps {
  title: string;
  accent: KpiAccent;
  icon: React.ReactNode;
  value: React.ReactNode;
  footer?: React.ReactNode;
  tooltip?: string;
  compactMobile?: boolean;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  accent,
  icon,
  value,
  footer,
  tooltip,
  compactMobile = false,
}) => {
  const styles = ACCENT_STYLES[accent];

  return (
    <div
      className={`group relative overflow-hidden bg-white ${
        compactMobile ? 'p-3 sm:p-5' : 'p-4 sm:p-5'
      } rounded-xl border border-gray-200/90 ${
        styles.cardBorder
      } shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between transition-colors duration-300 min-w-0`}
    >
      {/* Smooth 3-layer dynamic water wave rising slowly from bottom to top on hover */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[calc(100%+44px)] translate-y-full group-hover:translate-y-0 transition-transform duration-[1350ms] ease-[cubic-bezier(0.37,0,0.63,1)] z-0 flex flex-col will-change-transform"
      >
        <span className="relative w-full h-11 shrink-0 overflow-hidden animate-kpi-wave-swell">
          <svg
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            className={`absolute bottom-0 left-0 w-[200%] h-full ${styles.fillText} opacity-25 animate-kpi-wave-back fill-current`}
          >
            <path d="M 0,52 C 100,96 200,96 300,52 C 400,8 500,8 600,52 C 700,96 800,96 900,52 C 1000,8 1100,8 1200,52 L 1200,120 L 0,120 Z" />
          </svg>
          <svg
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            className={`absolute bottom-0 left-0 w-[200%] h-full ${styles.fillText} opacity-55 animate-kpi-wave-mid fill-current`}
          >
            <path d="M 0,56 C 50,18 100,18 150,56 C 200,94 250,94 300,56 C 350,18 400,18 450,56 C 500,94 550,94 600,56 C 650,18 700,18 750,56 C 800,94 850,94 900,56 C 950,18 1000,18 1050,56 C 1100,94 1150,94 1200,56 L 1200,120 L 0,120 Z" />
          </svg>
          <svg
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            className={`absolute bottom-0 left-0 w-[200%] h-full ${styles.fillText} animate-kpi-wave fill-current`}
          >
            <path d="M 0,62 C 100,12 200,12 300,62 C 400,112 500,112 600,62 C 700,12 800,12 900,62 C 1000,112 1100,112 1200,62 L 1200,120 L 0,120 Z" />
          </svg>
        </span>
        <span className={`w-full flex-1 -mt-px ${styles.fillBg}`} />
      </span>

      {/* Header Row */}
      <div
        className={`relative z-10 flex items-center justify-between ${
          compactMobile ? 'gap-1.5 sm:gap-3' : 'gap-3'
        }`}
      >
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-xs sm:text-sm text-gray-500 group-hover:text-white/95 font-medium truncate transition-colors duration-500 delay-0 group-hover:delay-300">
            {title}
          </span>
          {tooltip && (
            <Tooltip content={tooltip} side="top">
              <button
                type="button"
                className="text-gray-400 group-hover:text-white/85 hover:text-white cursor-help inline-flex items-center p-0.5 rounded transition-colors duration-500 delay-0 group-hover:delay-300 shrink-0"
                aria-label={`Info ${title}`}
              >
                <Info size={13} />
              </button>
            </Tooltip>
          )}
        </div>
        <span
          className={`${
            compactMobile ? 'w-7 h-7 sm:w-8 sm:h-8' : 'w-8 h-8'
          } rounded-lg border flex items-center justify-center shrink-0 transition-colors duration-500 delay-0 group-hover:delay-300 ${
            styles.iconBox
          }`}
        >
          {icon}
        </span>
      </div>

      {/* Value & Footer */}
      <div className={`relative z-10 ${compactMobile ? 'mt-2.5 sm:mt-3' : 'mt-3'} min-w-0`}>
        {value}
        {footer}
      </div>
    </div>
  );
};
