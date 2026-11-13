import React, { useState, useRef, useEffect } from 'react';
import {
  ShoppingCart,
  Scale,
  ReceiptText,
  Package,
  FolderTree,
  Gem,
  LayoutDashboard,
  Users,
  Store,
  BarChart3,
  BadgePercent,
  ChevronDown,
  ChevronLeft,
  Check,
  Plus,
  UserCog,
  FileSpreadsheet,
  Settings,
} from 'lucide-react';
import Tooltip from '../Tooltip';
import { Tenant, UserRole } from '../../types';

interface SidebarProps {
  activeMenu: string;
  onSelectMenu: (menu: string) => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  isProdukExpanded: boolean;
  onToggleProdukExpanded: () => void;
  tenants?: Tenant[];
  activeTenantId?: string;
  onSelectTenant?: (tenantId: string) => void;
  onOpenRegisterModal?: () => void;
  userRole?: UserRole;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeMenu,
  onSelectMenu,
  isSidebarCollapsed,
  onToggleSidebar,
  isProdukExpanded,
  onToggleProdukExpanded,
  tenants = [],
  activeTenantId = '',
  onSelectTenant,
  onOpenRegisterModal,
  userRole = 'owner',
}) => {
  const [isStoreMenuOpen, setIsStoreMenuOpen] = useState(false);
  const storeMenuRef = useRef<HTMLDivElement>(null);

  const activeTenant = tenants.find(t => t.id === activeTenantId) || tenants[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (storeMenuRef.current && !storeMenuRef.current.contains(e.target as Node)) {
        setIsStoreMenuOpen(false);
      }
    };
    if (isStoreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isStoreMenuOpen]);

  useEffect(() => {
    setIsStoreMenuOpen(false);
  }, [isSidebarCollapsed]);

  const allMenuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, roles: ['owner', 'branch_manager'] as UserRole[] },
    { name: 'Kasir POS (Penjualan)', icon: ShoppingCart, roles: ['owner', 'branch_manager', 'cashier'] as UserRole[] },
    { name: 'Buyback (Pembelian)', icon: Scale, roles: ['owner', 'branch_manager', 'cashier'] as UserRole[] },
    { name: 'Transaksi', icon: ReceiptText, roles: ['owner', 'branch_manager', 'cashier'] as UserRole[] },
    { name: 'Promo', icon: BadgePercent, roles: ['owner', 'branch_manager'] as UserRole[] },
    {
      name: 'Produk',
      icon: Package,
      roles: ['owner', 'branch_manager', 'cashier'] as UserRole[],
      submenus: [
        { name: 'Daftar Kategori', icon: FolderTree, roles: ['owner', 'branch_manager'] as UserRole[] },
        { name: 'Daftar Barang', icon: Gem, roles: ['owner', 'branch_manager', 'cashier'] as UserRole[] },
      ],
    },
    { name: 'Pelanggan', icon: Users, roles: ['owner', 'branch_manager', 'cashier'] as UserRole[] },
    { name: 'Multi-Outlet', icon: Store, roles: ['owner', 'branch_manager'] as UserRole[] },
    { name: 'Manajemen User', icon: UserCog, roles: ['owner'] as UserRole[] },
    { name: 'Rekap Shift', icon: FileSpreadsheet, roles: ['owner', 'branch_manager', 'cashier'] as UserRole[] },
    { name: 'Pengaturan', icon: Settings, roles: ['owner', 'branch_manager'] as UserRole[] },
  ];

  const menuItems = allMenuItems
    .filter(item => item.roles.includes(userRole))
    .map(item =>
      item.submenus
        ? { ...item, submenus: item.submenus.filter(sub => sub.roles.includes(userRole)) }
        : item
    );

  const handleItemSelect = (menuName: string) => {
    onSelectMenu(menuName);
    if (window.innerWidth < 1024 && !isSidebarCollapsed) {
      onToggleSidebar();
    }
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {!isSidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-xs transition-opacity duration-200"
          onClick={onToggleSidebar}
          aria-hidden="true"
        />
      )}

      <aside
        className={`flex flex-col bg-gradient-to-br from-orange-400 to-red-500 flex-shrink-0 z-40 transition-all duration-300 fixed inset-y-0 left-0 lg:static lg:h-auto ${
          isSidebarCollapsed
            ? '-translate-x-full lg:translate-x-0 lg:w-16'
            : 'translate-x-0 w-72 lg:w-60'
        }`}
      >
        {/* Mobile Drawer Top Header (only visible on mobile drawer) */}
        <div className="flex lg:hidden items-center justify-between p-4 border-b border-white/20 text-white">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-white">e.paper</span>
            <span className="text-xs tracking-wider font-semibold uppercase bg-white/20 px-2 py-0.5 rounded">
              MENU
            </span>
          </div>
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-1 text-white/80 hover:text-white transition-colors cursor-pointer outline-none focus:outline-none"
            aria-label="Tutup Menu"
          >
            <ChevronLeft size={20} />
          </button>
        </div>

        {/* SIDEBAR MENUS */}
        <div className="flex-1 pl-3 py-2 lg:py-2.5 flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {menuItems.map((menu, i) => {
            const Icon = menu.icon;
            const hasSubmenus = !!menu.submenus && menu.submenus.length > 0;
            const isParentActive = activeMenu === menu.name;
            const isAnySubActive = hasSubmenus && menu.submenus.some(s => s.name === activeMenu);

            return (
              <div key={i} className="flex flex-col">
                {/* Main Menu Button */}
                <Tooltip content={menu.name} side="right" sideOffset={14} disabled={!isSidebarCollapsed}>
                  <button
                    type="button"
                    onClick={() => {
                      if (hasSubmenus) {
                        onToggleProdukExpanded();
                      } else {
                        handleItemSelect(menu.name);
                      }
                    }}
                    className={`relative flex items-center px-3.5 py-2 lg:py-1.5 text-left text-sm font-medium group w-full cursor-pointer min-h-[38px] ${
                      isParentActive ? 'z-20' : 'z-10'
                    }`}
                  >
                    {/* Hover Background */}
                    <div
                      className={`absolute top-0 bottom-0 left-0 right-0 bg-gray-100/35 rounded-l-md transition-opacity duration-300 opacity-0 ${
                        !isParentActive
                          ? "group-hover:opacity-100 before:content-[''] before:absolute before:-top-3 before:right-0 before:w-3 before:h-3 before:bg-[radial-gradient(circle_at_top_left,transparent_12px,rgba(243,244,246,0.35)_12px)] after:content-[''] after:absolute after:-bottom-3 after:right-0 after:w-3 after:h-3 after:bg-[radial-gradient(circle_at_bottom_left,transparent_12px,rgba(243,244,246,0.35)_12px)]"
                          : 'hidden'
                      }`}
                    />

                    {/* Active Background */}
                    <div
                      className={`absolute top-0 bottom-0 left-0 right-0 bg-gray-100 rounded-l-md transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                        isParentActive
                          ? "translate-x-0 opacity-100 before:content-[''] before:absolute before:-top-3 before:right-0 before:w-3 before:h-3 before:bg-[radial-gradient(circle_at_top_left,transparent_12px,#f3f4f6_12px)] after:content-[''] after:absolute after:-bottom-3 after:right-0 after:w-3 after:h-3 after:bg-[radial-gradient(circle_at_bottom_left,transparent_12px,#f3f4f6_12px)]"
                          : 'translate-x-full opacity-0 pointer-events-none'
                      }`}
                    />

                    <Icon
                      size={18}
                      className={`relative z-10 shrink-0 transition-colors duration-500 ${
                        isParentActive
                          ? 'text-orange-600'
                          : isAnySubActive
                          ? 'text-white font-bold'
                          : 'text-orange-100 group-hover:text-white'
                      }`}
                    />
                    <span
                      className={`relative z-10 whitespace-nowrap text-sm transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden flex-1 ${
                        isParentActive
                          ? 'text-orange-600 font-bold'
                          : isAnySubActive
                          ? 'text-white font-bold'
                          : 'text-white'
                      } ${
                        isSidebarCollapsed
                          ? 'max-w-0 opacity-0 translate-x-4 ml-0'
                          : 'max-w-[220px] opacity-100 translate-x-0 ml-3'
                      }`}
                    >
                      {menu.name}
                    </span>

                    {hasSubmenus && !isSidebarCollapsed && (
                      <ChevronDown
                        size={14}
                        className={`relative z-10 mr-1 text-white/70 transition-transform duration-300 ${
                          isProdukExpanded ? 'rotate-180 text-white' : ''
                        }`}
                      />
                    )}
                  </button>
                </Tooltip>

                {/* Submenu List */}
                {hasSubmenus && isProdukExpanded && (
                  <div className="flex flex-col gap-0.5 my-0.5">
                    {menu.submenus.map((sub, j) => {
                      const SubIcon = sub.icon;
                      const isSubActive = activeMenu === sub.name;

                      return (
                        <Tooltip key={j} content={sub.name} side="right" sideOffset={14} disabled={!isSidebarCollapsed}>
                          <button
                            type="button"
                            onClick={() => handleItemSelect(sub.name)}
                            className={`relative flex items-center text-left text-sm font-medium group w-full cursor-pointer transition-all duration-300 min-h-[34px] ${
                              isSidebarCollapsed ? 'px-3.5 py-2 lg:py-1.5' : 'pl-10 pr-3.5 py-1.5'
                            }`}
                          >
                            {/* Submenu Hover Background */}
                            <div
                              className={`absolute top-0 bottom-0 left-0 right-0 bg-gray-100/35 rounded-l-md transition-opacity duration-300 opacity-0 ${
                                !isSubActive
                                  ? "group-hover:opacity-100 before:content-[''] before:absolute before:-top-3 before:right-0 before:w-3 before:h-3 before:bg-[radial-gradient(circle_at_top_left,transparent_12px,rgba(243,244,246,0.35)_12px)] after:content-[''] after:absolute after:-bottom-3 after:right-0 after:w-3 after:h-3 after:bg-[radial-gradient(circle_at_bottom_left,transparent_12px,rgba(243,244,246,0.35)_12px)]"
                                  : 'hidden'
                              }`}
                            />
                            {/* Submenu Active Background */}
                            <div
                              className={`absolute top-0 bottom-0 left-0 right-0 bg-gray-100 rounded-l-md transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                                isSubActive
                                  ? "translate-x-0 opacity-100 before:content-[''] before:absolute before:-top-3 before:right-0 before:w-3 before:h-3 before:bg-[radial-gradient(circle_at_top_left,transparent_12px,#f3f4f6_12px)] after:content-[''] after:absolute after:-bottom-3 after:right-0 after:w-3 after:h-3 after:bg-[radial-gradient(circle_at_bottom_left,transparent_12px,#f3f4f6_12px)]"
                                  : 'translate-x-full opacity-0 pointer-events-none'
                              }`}
                            />

                            <SubIcon
                              size={17}
                              className={`relative z-10 shrink-0 transition-colors duration-500 ${
                                isSubActive ? 'text-orange-600' : 'text-orange-100 group-hover:text-white'
                              }`}
                            />
                            <span
                              className={`relative z-10 whitespace-nowrap text-sm transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden ${
                                isSubActive
                                  ? 'text-orange-600 font-bold'
                                  : 'text-white/90 group-hover:text-white font-medium'
                              } ${
                                isSidebarCollapsed
                                  ? 'max-w-0 opacity-0 translate-x-4 ml-0'
                                  : 'max-w-[220px] opacity-100 translate-x-0 ml-3'
                              }`}
                            >
                              {sub.name}
                            </span>
                          </button>
                        </Tooltip>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* BOTTOM SECTION: MENGATUR TOKO / MULTI-OUTLET (Dapat diklik baik saat minimize maupun expanded) */}
        <div className="p-2 border-t border-white/20 shrink-0 relative" ref={storeMenuRef}>
          {isSidebarCollapsed ? (
            <Tooltip
              content={`Toko: ${activeTenant?.name || 'Toko Mas'} (${activeTenant?.branchName || 'Cabang'})`}
              side="right"
              sideOffset={14}
              disabled={isStoreMenuOpen}
            >
              <button
                type="button"
                onClick={() => setIsStoreMenuOpen(!isStoreMenuOpen)}
                className={`w-9 h-9 mx-auto rounded-lg bg-white hover:bg-gray-100 text-orange-600 flex items-center justify-center font-bold text-xs sm:text-sm cursor-pointer transition-all shadow-sm ${
                  isStoreMenuOpen ? 'ring-2 ring-orange-300' : ''
                }`}
                aria-label="Atur Toko"
                aria-expanded={isStoreMenuOpen}
              >
                <Store size={17} className="text-orange-600" />
              </button>
            </Tooltip>
          ) : (
            <button
              type="button"
              onClick={() => setIsStoreMenuOpen(!isStoreMenuOpen)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white hover:bg-gray-50 text-left transition-all cursor-pointer group outline-none shadow-sm ${
                isStoreMenuOpen ? 'ring-2 ring-orange-300' : ''
              }`}
              aria-label="Pengaturan Toko"
              aria-expanded={isStoreMenuOpen}
            >
              <Store size={19} className="text-orange-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-orange-600 truncate leading-tight">
                  {activeTenant?.name || 'Toko Mas Sejahtera'}
                </p>
                <p className="text-xs text-gray-500 truncate mt-0.5 font-medium">
                  {activeTenant?.branchName || 'Cabang Utama'}
                </p>
              </div>
              <ChevronDown
                size={14}
                className={`text-orange-600 transition-transform shrink-0 ${
                  isStoreMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
          )}

          {/* Store Selector Popover (Tampil baik saat minimize maupun expanded) */}
          {isStoreMenuOpen && (
            <div
              className={`absolute bg-white text-gray-900 rounded-lg border border-gray-200 shadow-2xl p-2 z-50 duration-150 ${
                isSidebarCollapsed
                  ? 'bottom-2 left-full ml-3 w-64 animate-in fade-in slide-in-from-left-2'
                  : 'bottom-full left-2 sm:left-2.5 mb-2 w-64 animate-in fade-in slide-in-from-bottom-2'
              }`}
            >
              <div className="px-2.5 py-1.5 border-b border-gray-100 flex items-center justify-between">
                <p className="text-xs font-bold text-gray-800">Pilih Toko / Outlet</p>
                <span className="text-xs text-gray-400 font-medium">
                  {tenants.length} Toko
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1 my-1.5">
                {tenants.map(t => {
                  const isSelected = t.id === activeTenant?.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        onSelectTenant?.(t.id);
                        setIsStoreMenuOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-md flex items-center justify-between text-xs sm:text-sm transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-orange-50 text-orange-600 font-bold'
                          : 'hover:bg-gray-50 text-gray-700 font-medium'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="truncate font-bold leading-tight text-xs sm:text-sm">{t.name}</p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{t.branchName}</p>
                      </div>
                      {isSelected && <Check size={14} className="text-orange-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {(userRole === 'owner' || userRole === 'branch_manager') && (
                <div className="pt-2 border-t border-gray-100 space-y-1">
                  {userRole === 'owner' && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsStoreMenuOpen(false);
                        onOpenRegisterModal?.();
                      }}
                      className="w-full py-2 px-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-none"
                    >
                      <Plus size={14} className="shrink-0" />
                      <span>Tambah Toko / Outlet Baru</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsStoreMenuOpen(false);
                      onSelectMenu('Multi-Outlet');
                    }}
                    className="w-full py-1.5 px-2 text-gray-700 hover:bg-gray-100 font-semibold text-xs rounded-md transition-colors flex items-center justify-center cursor-pointer"
                  >
                    Kelola Multi-Outlet
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
