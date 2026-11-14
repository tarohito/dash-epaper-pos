import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

export interface ActionMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  disabledReason?: string;
  tone?: 'default' | 'primary' | 'danger' | 'warning';
  dividerBefore?: boolean;
}

interface ActionDropdownMenuProps {
  items: ActionMenuItem[];
  ariaLabel?: string;
  buttonClassName?: string;
  disabled?: boolean;
}

interface MenuPosition {
  top: number;
  left: number;
  maxHeight?: number;
  placement: 'bottom' | 'top';
  ready: boolean;
}

// Memastikan hanya satu dropdown aksi yang terbuka dalam satu waktu
let closeCurrentlyOpenMenu: (() => void) | null = null;

export const ActionDropdownMenu: React.FC<ActionDropdownMenuProps> = ({
  items,
  ariaLabel = 'Menu Aksi',
  buttonClassName = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState<MenuPosition>({
    top: -9999,
    left: -9999,
    placement: 'bottom',
    ready: false,
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  const visibleItems = items.filter(Boolean);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const closeImmediately = useCallback(() => {
    clearCloseTimer();
    setIsOpen(false);
    setPos(prev => (prev.ready ? { ...prev, ready: false } : prev));
  }, [clearCloseTimer]);

  const computePosition = useCallback(() => {
    const triggerEl = triggerRef.current;
    const menuEl = menuRef.current;
    if (!triggerEl || !menuEl) return;

    const triggerRect = triggerEl.getBoundingClientRect();
    const menuWidth = menuEl.offsetWidth || 200;
    const menuHeight = menuEl.scrollHeight || 160;

    const VIEWPORT_MARGIN = 8;
    const GAP = 4;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const spaceBelow = vh - triggerRect.bottom - VIEWPORT_MARGIN - GAP;
    const spaceAbove = triggerRect.top - VIEWPORT_MARGIN - GAP;

    // Pilih posisi vertikal berdasarkan ruang kosong yang tersedia
    let placement: 'bottom' | 'top' = 'bottom';
    let top: number;
    let maxHeight: number | undefined;

    if (spaceBelow >= menuHeight) {
      placement = 'bottom';
      top = triggerRect.bottom + GAP;
    } else if (spaceAbove >= menuHeight) {
      placement = 'top';
      top = triggerRect.top - menuHeight - GAP;
    } else if (spaceAbove > spaceBelow) {
      placement = 'top';
      maxHeight = Math.max(110, spaceAbove);
      top = Math.max(VIEWPORT_MARGIN, triggerRect.top - maxHeight - GAP);
    } else {
      placement = 'bottom';
      maxHeight = Math.max(110, spaceBelow);
      top = triggerRect.bottom + GAP;
    }

    // Pilih posisi horizontal yang paling pas dengan ruang kosong (kanan/kiri)
    const spaceFromRightEdgeToLeft = triggerRect.right - VIEWPORT_MARGIN;
    const spaceFromLeftEdgeToRight = vw - triggerRect.left - VIEWPORT_MARGIN;

    let left: number;
    if (spaceFromRightEdgeToLeft >= menuWidth) {
      left = triggerRect.right - menuWidth;
    } else if (spaceFromLeftEdgeToRight >= menuWidth) {
      left = triggerRect.left;
    } else if (spaceFromRightEdgeToLeft >= spaceFromLeftEdgeToRight) {
      left = VIEWPORT_MARGIN;
    } else {
      left = vw - menuWidth - VIEWPORT_MARGIN;
    }

    left = Math.max(VIEWPORT_MARGIN, Math.min(left, vw - menuWidth - VIEWPORT_MARGIN));

    setPos({
      top: Math.round(top),
      left: Math.round(left),
      maxHeight: maxHeight ? Math.floor(maxHeight) : undefined,
      placement,
      ready: true,
    });
  }, []);

  const openMenu = useCallback(() => {
    if (disabled || visibleItems.length === 0) return;
    clearCloseTimer();
    if (closeCurrentlyOpenMenu && closeCurrentlyOpenMenu !== closeImmediately) {
      closeCurrentlyOpenMenu();
    }
    closeCurrentlyOpenMenu = closeImmediately;
    setIsOpen(true);
  }, [disabled, visibleItems.length, clearCloseTimer, closeImmediately]);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
      setPos(prev => (prev.ready ? { ...prev, ready: false } : prev));
      if (closeCurrentlyOpenMenu === closeImmediately) {
        closeCurrentlyOpenMenu = null;
      }
    }, 150);
  }, [clearCloseTimer, closeImmediately]);

  useEffect(() => {
    return () => {
      clearCloseTimer();
      if (closeCurrentlyOpenMenu === closeImmediately) {
        closeCurrentlyOpenMenu = null;
      }
    };
  }, [clearCloseTimer, closeImmediately]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    computePosition();
  }, [isOpen, visibleItems.length, computePosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        closeImmediately();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeImmediately();
      }
    };

    const handleReposition = () => {
      computePosition();
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [isOpen, closeImmediately, computePosition]);

  if (visibleItems.length === 0) return null;

  const getToneClass = (tone: ActionMenuItem['tone'], isDisabled?: boolean) => {
    if (isDisabled) {
      return 'text-gray-400 cursor-not-allowed';
    }
    switch (tone) {
      case 'danger':
        return 'text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer';
      case 'warning':
        return 'text-amber-700 hover:bg-amber-50 hover:text-amber-800 cursor-pointer';
      case 'primary':
        return 'text-orange-600 hover:bg-orange-50 hover:text-orange-700 cursor-pointer';
      default:
        return 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 cursor-pointer';
    }
  };

  return (
    <>
      <div
        className="inline-flex items-center justify-center"
        onMouseEnter={openMenu}
        onMouseLeave={scheduleClose}
      >
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={e => {
            e.stopPropagation();
            if (isOpen) {
              closeImmediately();
            } else {
              openMenu();
            }
          }}
          aria-label={ariaLabel}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          className={`w-8 h-8 rounded-lg bg-gray-100 hover:bg-orange-50 text-gray-600 hover:text-orange-600 border border-gray-200 hover:border-orange-200 inline-flex items-center justify-center transition-colors cursor-pointer active:scale-95 shadow-2xs disabled:opacity-45 disabled:cursor-not-allowed ${
            isOpen ? 'bg-orange-50 text-orange-600 border-orange-200' : ''
          } ${buttonClassName}`}
        >
          <MoreVertical size={16} />
        </button>
      </div>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            onMouseEnter={clearCloseTimer}
            onMouseLeave={scheduleClose}
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              maxHeight: pos.maxHeight,
              overflowY: pos.maxHeight ? 'auto' : undefined,
              zIndex: 2147483647,
              opacity: pos.ready ? 1 : 0,
            }}
            className={`min-w-[185px] max-w-[250px] bg-white rounded-xl border border-gray-200 shadow-xl py-1.5 text-left transition-opacity duration-75 before:content-[''] before:absolute before:left-0 before:right-0 before:h-2 ${
              pos.placement === 'top' ? 'before:-bottom-2' : 'before:-top-2'
            }`}
          >
            {visibleItems.map(item => (
              <React.Fragment key={item.id}>
                {item.dividerBefore && <div className="my-1 border-t border-gray-100" />}
                <button
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  title={item.disabled && item.disabledReason ? item.disabledReason : undefined}
                  onClick={e => {
                    e.stopPropagation();
                    if (item.disabled) return;
                    closeImmediately();
                    item.onClick();
                  }}
                  className={`w-full px-3 py-2 text-xs font-semibold flex items-center gap-2.5 text-left transition-colors ${getToneClass(
                    item.tone,
                    item.disabled
                  )}`}
                >
                  {item.icon && <span className="shrink-0 opacity-85">{item.icon}</span>}
                  <div className="min-w-0 flex-1">
                    <span className="block truncate">{item.label}</span>
                    {item.disabled && item.disabledReason && (
                      <span className="block text-xs font-normal text-gray-400 truncate mt-0.5">
                        {item.disabledReason}
                      </span>
                    )}
                  </div>
                </button>
              </React.Fragment>
            ))}
          </div>,
          document.body
        )}
    </>
  );
};
