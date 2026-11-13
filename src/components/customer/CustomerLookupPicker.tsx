import React, { useState, useEffect, useRef } from 'react';
import { Search, UserCheck, X, Loader2, Crown, Building2, User } from 'lucide-react';
import { CustomerWithStats } from '../../types';
import { posApi } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';

export interface LinkedCustomerSummary {
  id: string;
  name: string;
  memberCode?: string;
  type?: string;
  phone?: string;
}

interface CustomerLookupPickerProps {
  selectedCustomer: LinkedCustomerSummary | null;
  onSelectCustomer: (customer: CustomerWithStats) => void;
  onClearSelection: () => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  compact?: boolean;
}

export const CustomerLookupPicker: React.FC<CustomerLookupPickerProps> = ({
  selectedCustomer,
  onSelectCustomer,
  onClearSelection,
  label = 'Cari dari Master Pelanggan',
  placeholder = 'Ketik nama, no. HP/WA, NIK KTP, atau kode member...',
  helperText,
  compact = false,
}) => {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 200);
  const [results, setResults] = useState<CustomerWithStats[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    setIsLoading(true);
    setLoadError(null);

    posApi
      .getCustomers(
        {
          page: 1,
          pageSize: 8,
          search: debouncedQuery.trim() || undefined,
          sortBy: 'newest',
          sortDir: 'desc',
        },
        controller.signal
      )
      .then(res => {
        setResults(Array.isArray(res.items) ? res.items : []);
        setIsLoading(false);
      })
      .catch(err => {
        if ((err as Error).name !== 'AbortError') {
          setLoadError(err instanceof Error ? err.message : 'Gagal memuat daftar pelanggan.');
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [debouncedQuery, isOpen]);

  if (selectedCustomer) {
    return (
      <div
        className={`flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/70 ${
          compact ? 'px-3 py-2' : 'px-3.5 py-2.5'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-7 h-7 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <UserCheck size={15} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-emerald-950 truncate">
                Terhubung: {selectedCustomer.name}
              </span>
              {selectedCustomer.memberCode && (
                <span className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded bg-white text-emerald-700 border border-emerald-200">
                  {selectedCustomer.memberCode}
                </span>
              )}
              {selectedCustomer.type && (
                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  {selectedCustomer.type}
                </span>
              )}
            </div>
            {selectedCustomer.phone && (
              <p className="text-[11px] text-emerald-700 font-mono truncate mt-0.5">
                HP/WA: {selectedCustomer.phone}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setQuery('');
            onClearSelection();
          }}
          className="h-7 px-2.5 text-xs font-semibold text-emerald-800 hover:text-red-700 bg-white hover:bg-red-50 border border-emerald-200 hover:border-red-200 rounded-md inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
        >
          <X size={13} />
          <span>Ganti</span>
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={e => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          placeholder={placeholder}
          className={`w-full pl-9 pr-8 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm font-medium text-gray-800 placeholder-gray-400 focus:bg-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15 transition-all ${
            compact ? 'h-9' : 'h-10'
          }`}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-0.5 cursor-pointer"
            aria-label="Hapus pencarian pelanggan"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {helperText && !isOpen && (
        <p className="text-[11px] text-gray-500 mt-1">{helperText}</p>
      )}

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-40 max-h-64 overflow-y-auto divide-y divide-gray-100">
          {isLoading ? (
            <div className="p-3.5 text-xs text-gray-500 flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin text-orange-500" />
              <span>Mencari data pelanggan...</span>
            </div>
          ) : loadError ? (
            <div className="p-3 text-xs text-red-600 text-center">{loadError}</div>
          ) : results.length === 0 ? (
            <div className="p-3.5 text-center">
              <p className="text-xs font-semibold text-gray-600">
                Pelanggan tidak ditemukan
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Lanjutkan mengisi data manual di bawah untuk transaksi baru.
              </p>
            </div>
          ) : (
            results.map(cust => (
              <button
                key={cust.id}
                type="button"
                onClick={() => {
                  onSelectCustomer(cust);
                  setIsOpen(false);
                  setQuery('');
                }}
                className="w-full text-left px-3.5 py-2.5 hover:bg-orange-50/70 transition-colors cursor-pointer flex items-center justify-between gap-2.5"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                      cust.type === 'VIP'
                        ? 'bg-amber-100 text-amber-700'
                        : cust.type === 'Mitra / Toko'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {cust.type === 'VIP' ? (
                      <Crown size={13} />
                    ) : cust.type === 'Mitra / Toko' ? (
                      <Building2 size={13} />
                    ) : (
                      <User size={13} />
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                        {cust.name}
                      </span>
                      <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
                        {cust.memberCode}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 font-mono truncate mt-0.5">
                      {cust.phone}
                      {cust.nik ? ` • NIK: ${cust.nik}` : ''}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded shrink-0 ${
                    cust.type === 'VIP'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : cust.type === 'Mitra / Toko'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {cust.type}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
