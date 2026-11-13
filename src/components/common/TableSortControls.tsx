import React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

export type SortDirection = 'asc' | 'desc';

interface SortableThProps {
  label: string;
  sortKey: string;
  currentSortBy: string;
  currentSortDir: SortDirection;
  onSort: (sortKey: string) => void;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export const SortableTh: React.FC<SortableThProps> = ({
  label,
  sortKey,
  currentSortBy,
  currentSortDir,
  onSort,
  align = 'left',
  className = '',
}) => {
  const isActive = currentSortBy === sortKey;

  const justifyClass =
    align === 'right'
      ? 'justify-end'
      : align === 'center'
      ? 'justify-center'
      : 'justify-start';

  return (
    <th className={className} aria-sort={isActive ? (currentSortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`group w-full inline-flex items-center gap-1.5 ${justifyClass} uppercase font-semibold tracking-wider text-xs cursor-pointer transition-colors select-none ${
          isActive ? 'text-orange-600' : 'text-gray-500 hover:text-gray-800'
        }`}
        title={`Urutkan berdasarkan ${label}`}
      >
        <span>{label}</span>
        {isActive ? (
          currentSortDir === 'asc' ? (
            <ArrowUp size={13} className="text-orange-600 shrink-0" />
          ) : (
            <ArrowDown size={13} className="text-orange-600 shrink-0" />
          )
        ) : (
          <ArrowUpDown size={13} className="text-gray-300 group-hover:text-gray-500 shrink-0 transition-colors" />
        )}
      </button>
    </th>
  );
};

export function getNextColumnSort(
  clickedKey: string,
  currentSortBy: string,
  currentSortDir: SortDirection,
  defaultDir: SortDirection = 'desc'
): { sortBy: string; sortDir: SortDirection } {
  if (currentSortBy === clickedKey) {
    return {
      sortBy: clickedKey,
      sortDir: currentSortDir === 'asc' ? 'desc' : 'asc',
    };
  }
  return {
    sortBy: clickedKey,
    sortDir: defaultDir,
  };
}
