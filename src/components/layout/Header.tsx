import React, { useRef, useEffect } from'react';
import {
  Bell,
  ChevronDown,
  Settings,
  FileSpreadsheet,
} from'lucide-react';
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

  return (
    <header className="h-12 sm:h-14 flex items-center justify-between px-3 sm:px-6 bg-white border-b border-gray-200 z-30 shrink-0 relative">
      {/* 1. LOGO & SIDEBAR TOGGLE (Left - Aligned left) */}
      <div className="flex-1 flex items-center justify-start gap-2 sm:gap-3 shrink-0">
        {/* SIDEBAR TOGGLE / MINIMIZE BUTTON (Direct button without wrapper) */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-1 -ml-1 text-gray-500 hover:text-orange-600 transition-colors flex items-center justify-center cursor-pointer shrink-0 outline-none focus:outline-none"
          title={isSidebarCollapsed ? 'Buka Menu' : 'Sembunyikan Menu'}
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

        <div
          className="flex items-center gap-2 cursor-pointer select-none"
          onClick={() => onSelectMenu('Kasir POS (Penjualan)')}
        >
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-gradient-brand whitespace-nowrap leading-none flex items-center">
            e.paper
          </span>
        </div>
      </div>

      {/* 2. ACTIVE PAGE INDICATOR (Center - Horizontally Centered across header) */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center text-center pointer-events-none z-10">
        <div className="pointer-events-auto flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
          <span className="text-gray-400 font-medium hidden md:inline">Menu</span>
          <span className="text-gray-300 hidden md:inline">/</span>
          <span className="text-orange-600 font-bold bg-orange-50/90 px-2.5 py-1 rounded-md border border-orange-200/60 text-xs sm:text-sm whitespace-nowrap shadow-none">
            {activeMenu}
          </span>
        </div>
      </div>

      {/* 3. RIGHT ICONS (Notification & User Profile - Aligned right) */}
      <div className="flex-1 flex items-center justify-end gap-1 sm:gap-2 shrink-0">

        <Tooltip content={hasNotification ? 'Ada notifikasi baru' : 'Tidak ada notifikasi'} side="bottom" sideOffset={6}>
          <button
            type="button"
            onClick={onToggleNotification}
            className="relative p-2 text-orange-500 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors flex items-center justify-center cursor-pointer min-w-[40px] min-h-[40px] outline-none focus:outline-none"
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
            className="flex items-center justify-center gap-1.5 sm:gap-2 text-sm font-semibold text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors cursor-pointer p-1.5 sm:p-2 min-h-[40px] outline-none focus:outline-none"
            aria-expanded={isAdminMenuOpen}
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-orange-500 to-red-500 text-white flex items-center justify-center font-bold text-xs sm:text-sm">
              AD
            </div>
            <span className="hidden sm:inline font-bold">Admin</span>
            <ChevronDown
              size={14}
              className={`text-gray-400 transition-transform duration-200 hidden sm:inline ${
                isAdminMenuOpen ?'rotate-180 text-orange-500' :''
              }`}
            />
          </button>

          {isAdminMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg border border-gray-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              {/* User Profile Header */}
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-500 to-red-500 text-white flex items-center justify-center font-bold text-sm">
                    AD
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-800 truncate">Administrator Kasir</p>
                    <p className="text-xs text-gray-500 truncate">Shift 1 (08:00 - 16:00)</p>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center justify-between text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md font-medium">
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
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-md transition-colors text-left cursor-pointer"
                >
                  <Settings size={15} className="text-gray-400 shrink-0" />
                  <span>Pengaturan Toko</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelectMenu('Rekap Shift');
                    onCloseAdminMenu();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-md transition-colors text-left cursor-pointer"
                >
                  <FileSpreadsheet size={15} className="text-gray-400 shrink-0" />
                  <span>Laporan Tutup Kasir</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
