import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  isLoading?: boolean;
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

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border-t border-gray-200 text-xs text-gray-600 rounded-b-lg">
      <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
        <span>
          Menampilkan <strong className="font-mono text-gray-900">{startItem}</strong> -{' '}
          <strong className="font-mono text-gray-900">{endItem}</strong> dari{' '}
          <strong className="font-mono text-gray-900">{totalItems}</strong> data
        </span>
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={e => onPageSizeChange(Number(e.target.value))}
            disabled={isLoading}
            aria-label="Jumlah data per halaman"
            className="ml-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs font-medium text-gray-700 outline-none cursor-pointer disabled:opacity-50"
          >
            {pageSizeOptions.map(size => (
              <option key={size} value={size}>
                {size} / hal
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={isLoading || safeCurrentPage <= 1}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          title="Halaman Pertama"
          aria-label="Halaman Pertama"
        >
          <ChevronsLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={isLoading || safeCurrentPage <= 1}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          title="Halaman Sebelumnya"
          aria-label="Halaman Sebelumnya"
        >
          <ChevronLeft size={16} />
        </button>

        <span className="px-3 py-1 font-mono font-bold text-gray-900 bg-gray-100 rounded text-xs">
          {safeCurrentPage} / {safeTotalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={isLoading || safeCurrentPage >= safeTotalPages}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          title="Halaman Selanjutnya"
          aria-label="Halaman Selanjutnya"
        >
          <ChevronRight size={16} />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(safeTotalPages)}
          disabled={isLoading || safeCurrentPage >= safeTotalPages}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          title="Halaman Terakhir"
          aria-label="Halaman Terakhir"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
};
