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
  ArrowRight,
} from 'lucide-react';
import Tooltip from '../Tooltip';
import { Tenant } from '../../types';

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

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Kasir POS (Penjualan)', icon: ShoppingCart },
    { name: 'Buyback (Pembelian)', icon: Scale },
    { name: 'Transaksi', icon: ReceiptText },
    { name: 'Promo', icon: BadgePercent },
    {
      name: 'Produk',
      icon: Package,
      submenus: [
        { name: 'Daftar Kategori', icon: FolderTree },
        { name: 'Daftar Barang', icon: Gem },
      ],
    },
    { name: 'Pelanggan', icon: Users },
    { name: 'Multi-Outlet', icon: Store },
    { name: 'Laporan & Analitik', icon: BarChart3 },
  ];

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
            : 'translate-x-0 w-64 lg:w-52'
        }`}
      >
        {/* Mobile Drawer Top Header (only visible on mobile drawer) */}
        <div className="flex lg:hidden items-center justify-between p-4 border-b border-white/20 text-white">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-white">e.paper</span>
            <span className="text-[10px] tracking-wider font-semibold uppercase bg-white/20 px-1.5 py-0.5 rounded">
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
        <div className="flex-1 pl-3 py-4 lg:py-6 flex flex-col gap-0 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
                    className={`relative flex items-center px-3.5 py-3 lg:py-2.5 text-left text-xs font-medium group w-full cursor-pointer min-h-[44px] ${
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
                      size={16}
                      className={`relative z-10 shrink-0 transition-colors duration-500 ${
                        isParentActive
                          ? 'text-orange-600'
                          : isAnySubActive
                          ? 'text-white font-bold'
                          : 'text-orange-100 group-hover:text-white'
                      }`}
                    />
                    <span
                      className={`relative z-10 whitespace-nowrap text-xs transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden flex-1 ${
                        isParentActive
                          ? 'text-orange-600 font-bold'
                          : isAnySubActive
                          ? 'text-white font-bold'
                          : 'text-white'
                      } ${
                        isSidebarCollapsed
                          ? 'max-w-0 opacity-0 translate-x-4 ml-0'
                          : 'max-w-[200px] opacity-100 translate-x-0 ml-3'
                      }`}
                    >
                      {menu.name}
                    </span>

                    {hasSubmenus && !isSidebarCollapsed && (
                      <ChevronDown
                        size={13}
                        className={`relative z-10 mr-1 text-white/70 transition-transform duration-300 ${
                          isProdukExpanded ? 'rotate-180 text-white' : ''
                        }`}
                      />
                    )}
                  </button>
                </Tooltip>

                {/* Submenu List */}
                {hasSubmenus && isProdukExpanded && (
                  <div className="flex flex-col gap-0 my-0">
                    {menu.submenus.map((sub, j) => {
                      const SubIcon = sub.icon;
                      const isSubActive = activeMenu === sub.name;

                      return (
                        <Tooltip key={j} content={sub.name} side="right" sideOffset={14} disabled={!isSidebarCollapsed}>
                          <button
                            type="button"
                            onClick={() => handleItemSelect(sub.name)}
                            className={`relative flex items-center text-left text-xs font-medium group w-full cursor-pointer transition-all duration-300 min-h-[44px] ${
                              isSidebarCollapsed ? 'px-3.5 py-3 lg:py-2.5' : 'pl-9 pr-3.5 py-3 lg:py-2.5'
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
                              size={16}
                              className={`relative z-10 shrink-0 transition-colors duration-500 ${
                                isSubActive ? 'text-orange-600' : 'text-orange-100 group-hover:text-white'
                              }`}
                            />
                            <span
                              className={`relative z-10 whitespace-nowrap text-xs transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden ${
                                isSubActive
                                  ? 'text-orange-600 font-bold'
                                  : 'text-white/90 group-hover:text-white font-medium'
                              } ${
                                isSidebarCollapsed
                                  ? 'max-w-0 opacity-0 translate-x-4 ml-0'
                                  : 'max-w-[200px] opacity-100 translate-x-0 ml-3'
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

        {/* BOTTOM SECTION: MENGATUR TOKO / MULTI-OUTLET (Placed at bottom of sidebar as requested) */}
        <div className="p-2 sm:p-2.5 border-t border-white/20 shrink-0" ref={storeMenuRef}>
          {isSidebarCollapsed ? (
            <Tooltip
              content={`Mengatur Toko: ${activeTenant?.name || 'Toko Mas'} (${activeTenant?.branchName || 'Cabang'})`}
              side="right"
              sideOffset={14}
            >
              <button
                type="button"
                onClick={() => setIsStoreMenuOpen(!isStoreMenuOpen)}
                className="w-10 h-10 mx-auto rounded-md bg-white/15 hover:bg-white/25 text-white flex items-center justify-center font-bold text-xs cursor-pointer transition-colors relative"
                aria-label="Mengatur Toko"
              >
                <Store size={18} />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-orange-500" />
              </button>
            </Tooltip>
          ) : (
            <div className="relative">
              {/* Store Card / Button */}
              <div className="bg-black/15 hover:bg-black/20 rounded-md p-2 border border-white/20 transition-all text-white">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-orange-100 flex items-center gap-1">
                    <Store size={12} />
                    Mengatur Toko
                  </span>
                  <span className="text-[9px] bg-white/20 text-white font-mono font-bold px-1.5 py-0.2 rounded">
                    {activeTenant?.code || 'TMS-01'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsStoreMenuOpen(!isStoreMenuOpen)}
                  className="w-full text-left flex items-center justify-between gap-1.5 cursor-pointer outline-none group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black truncate leading-tight group-hover:text-yellow-200 transition-colors">
                      {activeTenant?.name || 'Toko Mas Sejahtera'}
                    </p>
                    <p className="text-[10px] text-white/75 truncate mt-0.5">
                      {activeTenant?.branchName || 'Cabang Utama'}
                    </p>
                  </div>
                  <ChevronDown
                    size={14}
                    className={`text-white/80 transition-transform shrink-0 ${isStoreMenuOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>

              {/* Store Selector Popover */}
              {isStoreMenuOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-64 bg-white text-gray-900 rounded-lg border border-gray-200 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <div className="px-2.5 py-1.5 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-[11px] font-black text-gray-800">Pilih / Ganti Outlet Toko</p>
                    <span className="text-[9px] bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded">
                      Multi-Outlet
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
                          className={`w-full text-left p-2 rounded-md flex items-center justify-between text-xs transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-orange-50 text-orange-600 font-bold'
                              : 'hover:bg-gray-50 text-gray-700 font-medium'
                          }`}
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="truncate font-bold leading-tight">{t.name}</p>
                            <p className="text-[10px] text-gray-400 truncate mt-0.5">{t.branchName}</p>
                          </div>
                          {isSelected && <Check size={14} className="text-orange-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t border-gray-100 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsStoreMenuOpen(false);
                        onOpenRegisterModal?.();
                      }}
                      className="w-full py-1.5 px-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-[11px] rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-none"
                    >
                      <Plus size={13} />
                      Tambah Toko / Outlet Baru
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsStoreMenuOpen(false);
                        onSelectMenu('Multi-Outlet');
                      }}
                      className="w-full py-1.5 px-2 text-gray-700 hover:bg-gray-100 font-semibold text-[11px] rounded-md transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>Kelola Multi-Outlet</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
