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
    <header className="h-14 sm:h-16 flex items-center justify-between px-3 sm:px-6 bg-white border-b border-gray-200 z-30 shrink-0 relative">
      {/* 1. LOGO & SIDEBAR TOGGLE (Left) */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* SIDEBAR TOGGLE BUTTON */}
        <Tooltip content={isSidebarCollapsed ? 'Buka Menu' : 'Sembunyikan Menu'} side="bottom" sideOffset={8}>
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 -ml-1 text-gray-500 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-colors flex items-center justify-center cursor-pointer shrink-0 min-w-[40px] min-h-[40px]"
            aria-label="Toggle Sidebar"
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

        <div
          className="flex items-baseline gap-1.5 sm:gap-2 cursor-pointer select-none"
          onClick={() => onSelectMenu('Kasir POS')}
        >
          <span className="text-lg sm:text-xl font-bold tracking-tight text-gradient-brand whitespace-nowrap">
            e.paper
          </span>
          <span className="text-[9px] sm:text-[10px] font-semibold tracking-wider sm:tracking-widest text-gray-400 uppercase whitespace-nowrap hidden xs:inline">
            POS JEWELLERY
          </span>
        </div>
      </div>

      {/* 2. HORIZONTAL MENU (Visible only on desktop lg+, moves to bottom navigation on tablet & phone) */}
      <div className="hidden lg:flex items-center h-full gap-4 lg:gap-8 mx-2 sm:mx-4 overflow-x-auto">
        {headerMenus.map(menu => {
          const Icon = menu.icon;
          const isActive = activeMenu === menu.name;
          return (
            <button
              key={menu.name}
              type="button"
              onClick={() => onSelectMenu(menu.name)}
              className={`h-full flex items-center gap-1.5 lg:gap-2 text-xs font-semibold transition-colors cursor-pointer relative px-2 shrink-0 ${
                isActive ? 'text-orange-600 font-bold' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Icon size={15} className={isActive ? 'text-orange-500' : 'text-gray-400'} />
              <span className="whitespace-nowrap">{menu.name}</span>
              {isActive && (
                <span className="absolute -bottom-px left-0 right-0 h-[2.5px] bg-orange-500 rounded-t-xs" />
              )}
            </button>
          );
        })}
      </div>

      {/* 3. RIGHT ICONS (Notification & User Profile) */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">

        <Tooltip content={hasNotification ? 'Ada notifikasi baru' : 'Tidak ada notifikasi'} side="bottom" sideOffset={6}>
          <button
            type="button"
            onClick={onToggleNotification}
            className="relative p-2 text-orange-500 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors flex items-center justify-center cursor-pointer min-w-[40px] min-h-[40px]"
            aria-label="Notifikasi"
          >
            <Bell size={19} />
            {hasNotification && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </button>
        </Tooltip>

        {/* ADMIN DROPDOWN */}
        <div className="relative" ref={adminDropdownRef}>
          <button
            type="button"
            onClick={onToggleAdminMenu}
            className="flex items-center gap-1.5 sm:gap-2 text-xs font-semibold text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors cursor-pointer p-1.5 sm:p-2 min-h-[40px]"
            aria-expanded={isAdminMenuOpen}
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-orange-500 to-red-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              AD
            </div>
            <span className="hidden sm:inline font-bold">Admin</span>
            <ChevronDown
              size={14}
              className={`text-gray-400 transition-transform duration-200 hidden sm:inline ${
                isAdminMenuOpen ? 'rotate-180 text-orange-500' : ''
              }`}
            />
          </button>

          {isAdminMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-gray-100 py-1.5 z-50 shadow-xl animate-in fade-in zoom-in-95 duration-100">
              {/* User Profile Header */}
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-500 to-red-500 text-white flex items-center justify-center font-bold text-sm">
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
