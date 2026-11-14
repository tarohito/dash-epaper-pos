import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  size?: 'sm' | 'md';
  ariaLabel?: string;
}

interface MenuPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  ready: boolean;
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
  size = 'md',
  ariaLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState<MenuPosition>({
    top: -9999,
    left: -9999,
    width: 180,
    maxHeight: 240,
    ready: false,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Normalize options to CustomSelectOption[]
  const normalizedOptions: CustomSelectOption[] = options.map(opt => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt };
    }
    return opt;
  });

  const selectedOption = normalizedOptions.find(opt => opt.value === value);

  const computePosition = useCallback(() => {
    const triggerEl = triggerRef.current;
    const menuEl = menuRef.current;
    if (!triggerEl || !menuEl) return;

    const triggerRect = triggerEl.getBoundingClientRect();
    const VIEWPORT_MARGIN = 8;
    const GAP = 4;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const width = Math.max(triggerRect.width, size === 'sm' ? 116 : 160);
    const naturalHeight = Math.min(menuEl.scrollHeight || 200, 240);

    const spaceBelow = vh - triggerRect.bottom - VIEWPORT_MARGIN - GAP;
    const spaceAbove = triggerRect.top - VIEWPORT_MARGIN - GAP;

    let top: number;
    let maxHeight = 240;

    if (spaceBelow >= naturalHeight || spaceBelow >= spaceAbove) {
      maxHeight = Math.max(120, Math.min(240, spaceBelow));
      top = triggerRect.bottom + GAP;
    } else {
      maxHeight = Math.max(120, Math.min(240, spaceAbove));
      const renderedHeight = Math.min(naturalHeight, maxHeight);
      top = Math.max(VIEWPORT_MARGIN, triggerRect.top - renderedHeight - GAP);
    }

    let left = triggerRect.left;
    if (left + width > vw - VIEWPORT_MARGIN) {
      left = Math.max(VIEWPORT_MARGIN, triggerRect.right - width);
    }
    left = Math.max(VIEWPORT_MARGIN, Math.min(left, vw - width - VIEWPORT_MARGIN));

    setPos({
      top: Math.round(top),
      left: Math.round(left),
      width: Math.round(width),
      maxHeight: Math.floor(maxHeight),
      ready: true,
    });
  }, [size]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    computePosition();
  }, [isOpen, normalizedOptions.length, computePosition]);

  useEffect(() => {
    if (!isOpen) {
      setPos(prev => (prev.ready ? { ...prev, ready: false } : prev));
      return;
    }

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleReposition = () => {
      computePosition();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [isOpen, computePosition]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  const triggerSizeClass =
    size === 'sm'
      ? 'h-8 px-2.5 text-xs border-gray-200 hover:border-gray-300'
      : 'h-10 sm:h-11 px-3.5 text-sm border-gray-300 hover:border-gray-400';

  return (
    <div ref={containerRef} className="relative w-full text-left" id={id}>
      {/* Hidden input for form submission if name is provided */}
      {name && <input type="hidden" name={name} value={value} />}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        onClick={() => {
          if (!disabled) setIsOpen(prev => !prev);
        }}
        className={`w-full bg-white border rounded-lg flex items-center justify-between transition-colors cursor-pointer focus:outline-none focus-visible:border-orange-500 ${triggerSizeClass} ${
          disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''
        } ${isOpen ? '!border-orange-500 bg-orange-50/30' : ''} ${className}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 truncate min-w-0">
          {icon && <span className="text-gray-400 shrink-0">{icon}</span>}
          {selectedOption ? (
            <span className="font-semibold text-gray-800 truncate">
              {selectedOption.label}
            </span>
          ) : (
            <span className="text-gray-400 truncate">{placeholder}</span>
          )}
        </div>

        <ChevronDown
          size={size === 'sm' ? 14 : 16}
          className={`text-gray-400 transition-transform duration-200 shrink-0 ml-2 ${
            isOpen ? 'rotate-180 text-orange-500' : ''
          }`}
        />
      </button>

      {/* Portal Floating Dropdown Menu */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxHeight,
              zIndex: 2147483647,
              opacity: pos.ready ? 1 : 0,
            }}
            className="bg-white border border-gray-200 rounded-xl p-1.5 overflow-y-auto space-y-0.5 transition-opacity duration-75"
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
                  className={`w-full rounded-lg text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-xs sm:text-sm'
                  } ${
                    isSelected
                      ? 'bg-orange-50 text-orange-700 font-bold'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium'
                  }`}
                >
                  <div className="flex flex-col truncate pr-1">
                    <span className="truncate">{opt.label}</span>
                    {opt.sublabel && (
                      <span className="text-xs text-gray-400 font-normal mt-0.5 truncate">
                        {opt.sublabel}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {opt.badge && (
                      <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                        {opt.badge}
                      </span>
                    )}
                    {isSelected && <Check size={14} className="text-orange-600 shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
};

export default CustomSelect;
