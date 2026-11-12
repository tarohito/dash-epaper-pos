import React, { useRef, useEffect } from 'react';
import {
  Bell,
  User,
  ChevronDown,
  Scale,
  ReceiptText,
} from 'lucide-react';
import Tooltip from '../Tooltip';

interface HeaderProps {
  activeMenu: string;
  onSelectMenu: (menu: string) => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  hasNotification: boolean;
  onToggleNotification: () => void;
  isAdminMenuOpen: boolean;
  onToggleAdminMenu: () => void;
  onCloseAdminMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeMenu,
  onSelectMenu,
  isSidebarCollapsed,
  onToggleSidebar,
  hasNotification,
  onToggleNotification,
  isAdminMenuOpen,
  onToggleAdminMenu,
  onCloseAdminMenu,
}) => {
  const adminDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (adminDropdownRef.current && !adminDropdownRef.current.contains(e.target as Node)) {
        onCloseAdminMenu();
      }
    };
    if (isAdminMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAdminMenuOpen, onCloseAdminMenu]);

  const headerMenus = [
    { name: 'Pembelian (buyback)', icon: Scale },
    { name: 'Transaksi Harian', icon: ReceiptText },
  ];

  return (
    <header className="h-16 flex items-center justify-center px-6 bg-white border-b border-gray-200 z-30 shrink-0 relative">
      {/* 1. LOGO & MINIMIZE AREA (Fixed to Left) */}
      <div className="absolute left-6 flex items-center gap-3 shrink-0">
        <div className="flex items-baseline gap-2 cursor-pointer" onClick={() => onSelectMenu('Kasir POS')}>
          <span className="text-xl font-bold tracking-tight text-gradient-brand select-none whitespace-nowrap">
            e.paper
          </span>
          <span className="text-[10px] font-light tracking-widest text-gray-400 uppercase select-none whitespace-nowrap">
            POS JEWELLERY
          </span>
        </div>

        {/* MINIMIZE SIDEBAR TOGGLE BUTTON (Simpel, ramping 3-baris / clean menu toggle) */}
        <Tooltip content={isSidebarCollapsed ? 'Buka Menu' : 'Sembunyikan Menu'} side="bottom" sideOffset={8}>
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-1.5 text-gray-400 hover:text-orange-500 transition-colors flex items-center justify-center cursor-pointer shrink-0"
            aria-label="Toggle Minimize Sidebar"
          >
            <svg
              className="w-5 h-5 transition-transform duration-200"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {isSidebarCollapsed ? (
                <>
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="4" y1="12" x2="14" y2="12" />
                  <line x1="4" y1="18" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="4" y1="6" x2="16" y2="6" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="18" x2="12" y2="18" />
                </>
              )}
            </svg>
          </button>
        </Tooltip>
      </div>

      {/* 2. HORIZONTAL MENU (Presisi Center Horizontal di Header) */}
      <div className="flex items-center h-full gap-8 mx-auto">
        {headerMenus.map(menu => {
          const Icon = menu.icon;
          const isActive = activeMenu === menu.name;
          return (
            <button
              key={menu.name}
              type="button"
              onClick={() => onSelectMenu(menu.name)}
              className={`h-full flex items-center gap-2 text-xs font-semibold transition-colors cursor-pointer relative px-2 ${ isActive ? 'text-orange-600 font-bold' : 'text-gray-500 hover:text-gray-900' }`}
            >
              <Icon size={15} className={isActive ? 'text-orange-500' : 'text-gray-400'} />
              <span>{menu.name}</span>
              {isActive && (
                <span className="absolute -bottom-px left-0 right-0 h-[2.5px] bg-orange-500 rounded-t-xs" />
              )}
            </button>
          );
        })}
      </div>

      {/* 3. RIGHT ICONS (Fixed to Right) */}
      <div className="absolute right-6 flex items-center gap-2">
        <Tooltip content={hasNotification ? 'Ada notifikasi baru' : 'Tidak ada notifikasi'} side="bottom" sideOffset={6}>
          <button
            type="button"
            onClick={onToggleNotification}
            className="relative p-2 text-orange-500 hover:text-orange-600 transition-colors flex items-center justify-center cursor-pointer"
            aria-label="Notifikasi"
          >
            <Bell size={20} />
            {hasNotification && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </button>
        </Tooltip>

        {/* ADMIN DROPDOWN */}
        <div className="relative" ref={adminDropdownRef}>
          <button
            type="button"
            onClick={onToggleAdminMenu}
            className="flex items-center gap-2 text-xs font-semibold text-gray-700 hover:text-orange-600 transition-colors cursor-pointer p-2"
            aria-expanded={isAdminMenuOpen}
          >
            <User size={18} className="text-orange-500" />
            <span>Admin</span>
            <ChevronDown
              size={14}
              className={`text-gray-400 transition-transform duration-200 ${ isAdminMenuOpen ? 'rotate-180 text-orange-500' : '' }`}
            />
          </button>

          {isAdminMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-gray-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              {/* User Profile Header */}
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm">
                    AD
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-800 truncate">Administrator Kasir</p>
                    <p className="text-[11px] text-gray-400 truncate">Shift 1 (08:00 - 16:00)</p>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center justify-between text-[11px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg font-medium">
                  <span>Status Shift:</span>
                  <span className="font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Aktif
                  </span>
                </div>
              </div>

              {/* Menu Options */}
              <div className="p-1.5 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    onSelectMenu('Pengaturan');
                    onCloseAdminMenu();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors text-left cursor-pointer"
                >
                  Pengaturan Toko
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelectMenu('Rekap Shift');
                    onCloseAdminMenu();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors text-left cursor-pointer"
                >
                  Laporan Tutup Kasir
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
