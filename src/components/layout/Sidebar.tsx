import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FolderTree,
  Gem,
  Store,
  Users,
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Tooltip from '../Tooltip';

interface SidebarProps {
  activeMenu: string;
  onSelectMenu: (menu: string) => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  isProdukExpanded: boolean;
  onToggleProdukExpanded: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeMenu,
  onSelectMenu,
  isSidebarCollapsed,
  onToggleSidebar,
  isProdukExpanded,
  onToggleProdukExpanded,
}) => {
  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Kasir POS', icon: ShoppingCart },
    {
      name: 'Produk',
      icon: Package,
      submenus: [
        { name: 'Daftar Kategori', icon: FolderTree },
        { name: 'Daftar Barang', icon: Gem },
      ],
    },
    { name: 'Multi-Outlet', icon: Store },
    { name: 'Pelanggan', icon: Users },
    { name: 'Laporan & Analitik', icon: BarChart3 },
  ];

  return (
    <div
      className={`flex flex-col ${ isSidebarCollapsed ? 'w-16' : 'w-52' } bg-gradient-to-br from-orange-400 to-red-500 flex-shrink-0 z-20 transition-all duration-300 relative`}
    >
      {/* SIDEBAR MENUS */}
      <div className="flex-1 pl-3 py-6 flex flex-col gap-1 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {menuItems.map((menu, i) => {
          const Icon = menu.icon;
          const hasSubmenus = !!menu.submenus && menu.submenus.length > 0;
          const isParentActive = activeMenu === menu.name;
          const isAnySubActive = hasSubmenus && menu.submenus.some(s => s.name === activeMenu);

          return (
            <div key={i} className="flex flex-col gap-1">
              {/* Main Menu Button */}
              <Tooltip content={menu.name} side="right" sideOffset={14} disabled={!isSidebarCollapsed}>
                <button
                  type="button"
                  onClick={() => {
                    if (hasSubmenus) {
                      onToggleProdukExpanded();
                    } else {
                      onSelectMenu(menu.name);
                    }
                  }}
                  className="relative flex items-center px-3.5 py-2.5 text-left text-xs font-medium group w-full cursor-pointer"
                >
                  {/* Hover Background */}
                  <div
                    className={`absolute top-0 bottom-0 left-0 right-0 bg-white/20 rounded-l-xl transition-opacity duration-300 opacity-0 ${ !isParentActive ? "group-hover:opacity-100 " + "before:content-[''] before:absolute before:-top-3 before:right-0 before:w-3 before:h-3 before:bg-[radial-gradient(circle_at_top_left,transparent_12px,rgba(255,255,255,0.2)_12px)] " + "after:content-[''] after:absolute after:-bottom-3 after:right-0 after:w-3 after:h-3 after:bg-[radial-gradient(circle_at_bottom_left,transparent_12px,rgba(255,255,255,0.2)_12px)]" : 'hidden' }`}
                  />

                  {/* Active Background */}
                  <div
                    className={`absolute top-0 bottom-0 left-0 right-0 bg-gray-100 rounded-l-xl transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${ isParentActive ? "translate-x-0 opacity-100 " + "before:content-[''] before:absolute before:-top-3 before:right-0 before:w-3 before:h-3 before:bg-[radial-gradient(circle_at_top_left,transparent_12px,#f3f4f6_12px)] " + "after:content-[''] after:absolute after:-bottom-3 after:right-0 after:w-3 after:h-3 after:bg-[radial-gradient(circle_at_bottom_left,transparent_12px,#f3f4f6_12px)]" : 'translate-x-full opacity-0 pointer-events-none' }`}
                  />

                  <Icon
                    size={16}
                    className={`relative z-10 shrink-0 transition-colors duration-500 ${ isParentActive ? 'text-orange-600' : isAnySubActive ? 'text-white font-bold' : 'text-orange-100 group-hover:text-white' }`}
                  />
                  <span
                    className={`relative z-10 whitespace-nowrap text-xs transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden flex-1 ${ isParentActive ? 'text-orange-600 font-bold' : isAnySubActive ? 'text-white font-bold' : 'text-white' } ${isSidebarCollapsed ? 'max-w-0 opacity-0 translate-x-4 ml-0' : 'max-w-[200px] opacity-100 translate-x-0 ml-3'}`}
                  >
                    {menu.name}
                  </span>

                  {hasSubmenus && !isSidebarCollapsed && (
                    <ChevronDown
                      size={13}
                      className={`relative z-10 mr-1 text-white/70 transition-transform duration-300 ${ isProdukExpanded ? 'rotate-180 text-white' : '' }`}
                    />
                  )}
                </button>
              </Tooltip>

              {/* Submenu List */}
              {hasSubmenus && isProdukExpanded && (
                <div className="flex flex-col gap-1 my-0.5">
                  {menu.submenus.map((sub, j) => {
                    const SubIcon = sub.icon;
                    const isSubActive = activeMenu === sub.name;

                    return (
                      <Tooltip key={j} content={sub.name} side="right" sideOffset={14} disabled={!isSidebarCollapsed}>
                        <button
                          type="button"
                          onClick={() => onSelectMenu(sub.name)}
                          className={`relative flex items-center text-left text-xs font-medium group w-full cursor-pointer transition-all duration-300 ${ isSidebarCollapsed ? 'px-3.5 py-2.5' : 'pl-9 pr-3.5 py-2.5' }`}
                        >
                          <div
                            className={`absolute top-0 bottom-0 left-0 right-0 bg-white/20 rounded-l-xl transition-opacity duration-300 opacity-0 ${ !isSubActive ? "group-hover:opacity-100 " + "before:content-[''] before:absolute before:-top-3 before:right-0 before:w-3 before:h-3 before:bg-[radial-gradient(circle_at_top_left,transparent_12px,rgba(255,255,255,0.2)_12px)] " + "after:content-[''] after:absolute after:-bottom-3 after:right-0 after:w-3 after:h-3 after:bg-[radial-gradient(circle_at_bottom_left,transparent_12px,rgba(255,255,255,0.2)_12px)]" : 'hidden' }`}
                          />
                          <div
                            className={`absolute top-0 bottom-0 left-0 right-0 bg-gray-100 rounded-l-xl transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${ isSubActive ? "translate-x-0 opacity-100 " + "before:content-[''] before:absolute before:-top-3 before:right-0 before:w-3 before:h-3 before:bg-[radial-gradient(circle_at_top_left,transparent_12px,#f3f4f6_12px)] " + "after:content-[''] after:absolute after:-bottom-3 after:right-0 after:w-3 after:h-3 after:bg-[radial-gradient(circle_at_bottom_left,transparent_12px,#f3f4f6_12px)]" : 'translate-x-full opacity-0 pointer-events-none' }`}
                          />

                          <SubIcon
                            size={16}
                            className={`relative z-10 shrink-0 transition-colors duration-500 ${ isSubActive ? 'text-orange-600' : 'text-orange-100 group-hover:text-white' }`}
                          />
                          <span
                            className={`relative z-10 whitespace-nowrap text-xs transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden ${ isSubActive ? 'text-orange-600 font-bold' : 'text-white/90 group-hover:text-white font-medium' } ${isSidebarCollapsed ? 'max-w-0 opacity-0 translate-x-4 ml-0' : 'max-w-[200px] opacity-100 translate-x-0 ml-3'}`}
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
    </div>
  );
};
