import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
} from 'lucide-react';
import { CustomSelect } from './CustomSelect';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  isLoading?: boolean;
}

type PageToken = number | 'ellipsis-left' | 'ellipsis-right';

function getVisiblePages(current: number, total: number): PageToken[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: PageToken[] = [1];

  if (current <= 3) {
    pages.push(2, 3, 4, 'ellipsis-right', total);
    return pages;
  }

  if (current >= total - 2) {
    pages.push('ellipsis-left', total - 3, total - 2, total - 1, total);
    return pages;
  }

  pages.push('ellipsis-left', current - 1, current, current + 1, 'ellipsis-right', total);
  return pages;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
}) => {
  if (totalItems === 0) return null;

  const safeTotalPages = Math.max(1, totalPages);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), safeTotalPages);
  const startItem = (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  const pageSizeOptions = Array.from(new Set([10, 15, 20, 25, 50, 100, pageSize])).sort(
    (a, b) => a - b
  );
  const visiblePages = getVisiblePages(safeCurrentPage, safeTotalPages);

  const navBtnClass =
    'w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 inline-flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:bg-gray-50 disabled:text-gray-400 disabled:hover:bg-gray-50 disabled:hover:text-gray-400 disabled:hover:border-gray-200 disabled:cursor-not-allowed active:scale-[0.97]';

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-gray-50/60 border-t border-gray-200 text-xs text-gray-600">
      {/* Left: Range Info & Page Size Selector */}
      <div className="flex items-center gap-2.5 flex-wrap justify-center sm:justify-start">
        <span className="text-gray-500">
          Menampilkan{' '}
          <strong className="font-mono font-bold text-gray-900 tabular-nums">
            {startItem}&ndash;{endItem}
          </strong>{' '}
          dari{' '}
          <strong className="font-mono font-bold text-gray-900 tabular-nums">
            {totalItems}
          </strong>{' '}
          data
        </span>

        {onPageSizeChange && (
          <div className="w-[104px]">
            <CustomSelect
              size="sm"
              value={String(pageSize)}
              onChange={val => onPageSizeChange(Number(val))}
              disabled={isLoading}
              ariaLabel="Jumlah data per halaman"
              className="font-mono tabular-nums"
              options={pageSizeOptions.map(size => ({
                value: String(size),
                label: `${size} / hal`,
              }))}
            />
          </div>
        )}
      </div>

      {/* Right: Page Navigation Controls */}
      <nav aria-label="Navigasi Halaman" className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={isLoading || safeCurrentPage <= 1}
          className={navBtnClass}
          title="Halaman Pertama"
          aria-label="Halaman Pertama"
        >
          <ChevronsLeft size={15} />
        </button>

        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={isLoading || safeCurrentPage <= 1}
          className={navBtnClass}
          title="Halaman Sebelumnya"
          aria-label="Halaman Sebelumnya"
        >
          <ChevronLeft size={15} />
        </button>

        {/* Mobile Compact Page Indicator */}
        <span className="sm:hidden h-8 px-3 inline-flex items-center justify-center rounded-lg bg-white border border-gray-200 font-mono font-bold text-gray-800 text-xs tabular-nums">
          {safeCurrentPage} / {safeTotalPages}
        </span>

        {/* Desktop Numbered Page Buttons */}
        <div className="hidden sm:flex items-center gap-1">
          {visiblePages.map(token => {
            if (token === 'ellipsis-left' || token === 'ellipsis-right') {
              return (
                <span
                  key={token}
                  aria-hidden="true"
                  className="w-7 h-8 inline-flex items-center justify-center text-gray-400 select-none"
                >
                  <MoreHorizontal size={14} />
                </span>
              );
            }

            const isActive = token === safeCurrentPage;
            return (
              <button
                key={token}
                type="button"
                disabled={isLoading}
                onClick={() => {
                  if (!isActive) onPageChange(token);
                }}
                aria-current={isActive ? 'page' : undefined}
                aria-label={`Halaman ${token}`}
                className={`min-w-[32px] h-8 px-2 rounded-lg font-mono text-xs inline-flex items-center justify-center transition-colors tabular-nums disabled:opacity-60 ${
                  isActive
                    ? 'bg-orange-500 text-white border border-orange-500 font-bold shadow-xs cursor-default'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 font-semibold cursor-pointer active:scale-[0.97]'
                }`}
              >
                {token}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={isLoading || safeCurrentPage >= safeTotalPages}
          className={navBtnClass}
          title="Halaman Selanjutnya"
          aria-label="Halaman Selanjutnya"
        >
          <ChevronRight size={15} />
        </button>

        <button
          type="button"
          onClick={() => onPageChange(safeTotalPages)}
          disabled={isLoading || safeCurrentPage >= safeTotalPages}
          className={navBtnClass}
          title="Halaman Terakhir"
          aria-label="Halaman Terakhir"
        >
          <ChevronsRight size={15} />
        </button>
      </nav>
    </div>
  );
};
