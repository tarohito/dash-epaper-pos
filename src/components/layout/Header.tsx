import React, { useRef, useEffect } from 'react';
import {
  Bell,
  ChevronDown,
  Settings,
  FileSpreadsheet,
  LogOut,
  UserCog,
} from 'lucide-react';
import Tooltip from '../Tooltip';
import { Tenant, UserAccount, UserRole } from '../../types';

interface HeaderProps {
  onSelectMenu: (menu: string) => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  hasNotification: boolean;
  onToggleNotification: () => void;
  isAdminMenuOpen: boolean;
  onToggleAdminMenu: () => void;
  onCloseAdminMenu: () => void;
  currentUser: UserAccount;
  activeTenant?: Tenant;
  onLogout: () => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Owner',
  branch_manager: 'Kepala Cabang',
  cashier: 'Kasir',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'US';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const Header: React.FC<HeaderProps> = ({
  onSelectMenu,
  isSidebarCollapsed,
  onToggleSidebar,
  hasNotification,
  onToggleNotification,
  isAdminMenuOpen,
  onToggleAdminMenu,
  onCloseAdminMenu,
  currentUser,
  activeTenant,
  onLogout,
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

  const initials = getInitials(currentUser.fullName);
  const firstName = currentUser.fullName.split(' ')[0] || currentUser.username;

  return (
    <header className="h-12 sm:h-14 flex items-center justify-between px-3 sm:px-6 bg-white border-b border-gray-200 z-30 shrink-0 relative">
      {/* 1. LOGO & SIDEBAR TOGGLE (Left - Aligned left) */}
      <div className="flex-1 flex items-center justify-start gap-2 sm:gap-3 shrink-0">
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

      {/* 2. RIGHT ICONS (Notification & User Profile - Aligned right) */}
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

        {/* USER PROFILE DROPDOWN */}
        <div className="relative" ref={adminDropdownRef}>
          <button
            type="button"
            onClick={onToggleAdminMenu}
            className="flex items-center justify-center gap-1.5 sm:gap-2 text-sm font-semibold text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors cursor-pointer p-1.5 sm:p-2 min-h-[40px] outline-none focus:outline-none"
            aria-expanded={isAdminMenuOpen}
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-orange-500 to-red-500 text-white flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
              {initials}
            </div>
            <div className="hidden sm:flex flex-col items-start text-left leading-tight">
              <span className="font-bold text-xs sm:text-sm text-gray-800 max-w-[120px] truncate">{firstName}</span>
              <span className="text-xs font-medium text-gray-400">{ROLE_LABELS[currentUser.role]}</span>
            </div>
            <ChevronDown
              size={14}
              className={`text-gray-400 transition-transform duration-200 hidden sm:inline ${
                isAdminMenuOpen ? 'rotate-180 text-orange-500' : ''
              }`}
            />
          </button>

          {isAdminMenuOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl border border-gray-200 shadow-lg py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              {/* User Profile Header */}
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-500 to-red-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <p className="text-sm font-bold text-gray-900 truncate">{currentUser.fullName}</p>
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200 shrink-0">
                        {ROLE_LABELS[currentUser.role]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{currentUser.shiftLabel}</p>
                  </div>
                </div>

                {activeTenant && (
                  <div className="mt-2.5 text-xs bg-gray-50 border border-gray-200/80 text-gray-700 px-2.5 py-1.5 rounded-lg">
                    <span className="text-xs text-gray-400 block">Outlet Aktif:</span>
                    <span className="font-semibold text-gray-800 block truncate">
                      {activeTenant.code} &bull; {activeTenant.name}
                    </span>
                  </div>
                )}
              </div>

              {/* Menu Options */}
              <div className="p-1.5 space-y-0.5">
                {currentUser.role === 'owner' && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectMenu('Manajemen User');
                      onCloseAdminMenu();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-md transition-colors text-left cursor-pointer"
                  >
                    <UserCog size={15} className="text-gray-400 shrink-0" />
                    <span>Manajemen User &amp; Akses</span>
                  </button>
                )}

                {currentUser.role !== 'cashier' && (
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
                )}

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

                <div className="my-1 border-t border-gray-100" />

                <button
                  type="button"
                  onClick={() => {
                    onCloseAdminMenu();
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-md transition-colors text-left cursor-pointer"
                >
                  <LogOut size={15} className="text-red-500 shrink-0" />
                  <span>Keluar (Logout)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
