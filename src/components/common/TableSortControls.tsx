import React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

export type SortDirection = 'asc' | 'desc';

export interface ShopeeSortPreset {
  id: string;
  label: string;
  sortBy: string;
  sortDir: SortDirection;
}

interface ShopeeSortBarProps {
  presets: ShopeeSortPreset[];
  sortBy: string;
  sortDir: SortDirection;
  onSelectPreset: (sortBy: string, sortDir: SortDirection) => void;
  rightSlot?: React.ReactNode;
}

export const ShopeeSortBar: React.FC<ShopeeSortBarProps> = ({
  presets,
  sortBy,
  sortDir,
  onSelectPreset,
  rightSlot,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 bg-gray-50/80 border border-gray-200 rounded-lg px-3 py-2 mb-3">
      <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-0.5 sm:pb-0">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 whitespace-nowrap shrink-0">
          <ArrowUpDown size={13} className="text-gray-400" />
          <span>Urutkan:</span>
        </span>
        <div className="inline-flex items-center gap-1.5">
          {presets.map(preset => {
            const isActive = preset.sortBy === sortBy && preset.sortDir === sortDir;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectPreset(preset.sortBy, preset.sortDir)}
                className={`h-8 px-3 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap shrink-0 inline-flex items-center justify-center border ${
                  isActive
                    ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {rightSlot && <div className="text-xs text-gray-500 shrink-0">{rightSlot}</div>}
    </div>
  );
};

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
