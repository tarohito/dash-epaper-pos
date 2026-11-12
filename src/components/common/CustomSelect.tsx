import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface CustomSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
}

export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: (CustomSelectOption | string)[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  id?: string;
  name?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Pilih opsi...',
  className = '',
  disabled = false,
  icon,
  id,
  name,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Normalize options to CustomSelectOption[]
  const normalizedOptions: CustomSelectOption[] = options.map(opt => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt };
    }
    return opt;
  });

  const selectedOption = normalizedOptions.find(opt => opt.value === value);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full text-left" id={id}>
      {/* Hidden input for form submission if name is provided */}
      {name && <input type="hidden" name={name} value={value} />}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-10 sm:h-11 px-3.5 bg-white border border-gray-300 hover:border-gray-400 rounded-lg flex items-center justify-between text-sm transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 ${
          disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''
        } ${isOpen ? 'border-orange-500 ring-2 ring-orange-500/20' : ''} ${className}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5 truncate">
          {icon && <span className="text-gray-400 shrink-0">{icon}</span>}
          {selectedOption ? (
            <span className="font-semibold text-gray-900 truncate">
              {selectedOption.label}
            </span>
          ) : (
            <span className="text-gray-400 truncate">{placeholder}</span>
          )}
        </div>

        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform duration-200 shrink-0 ml-2 ${
            isOpen ? 'rotate-180 text-orange-500' : ''
          }`}
        />
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden py-1 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100"
        >
          {normalizedOptions.map(opt => {
            const isSelected = opt.value === value;

            return (
              <button
                type="button"
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.value)}
                className={`w-full px-3.5 py-2 text-left text-xs sm:text-sm flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-orange-50 text-orange-700 font-bold'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium'
                }`}
              >
                <div className="flex flex-col truncate pr-2">
                  <span className="truncate">{opt.label}</span>
                  {opt.sublabel && (
                    <span className="text-[11px] text-gray-400 font-normal mt-0.5 truncate">
                      {opt.sublabel}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {opt.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                      {opt.badge}
                    </span>
                  )}
                  {isSelected && <Check size={15} className="text-orange-600" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
