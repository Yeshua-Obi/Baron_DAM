import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderOpen, Search, Settings } from 'lucide-react';
import { GlobalSearch } from '../search/GlobalSearch';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/projects', icon: FolderOpen, label: 'Projects' },
  { id: 'search', icon: Search, label: 'Search' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export const MobileNav = () => {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0A0A0A]/95 backdrop-blur-xl border-t border-white/5 px-4 py-3 z-50">
        <div className="flex items-center justify-around">
          {navItems.map((item) => 
            item.id === 'search' ? (
              <button
                key={item.id}
                onClick={() => setSearchOpen(true)}
                className="flex flex-col items-center gap-1 text-white/40 hover:text-white/80 px-4 py-1"
              >
                <item.icon className="w-5 h-5" strokeWidth={1.5} />
                <span className="text-[10px] font-light">{item.label}</span>
              </button>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 px-4 py-1 ${
                    isActive
                      ? 'text-[#D4AF37]'
                      : 'text-white/40 hover:text-white/80'
                  }`
                }
              >
                <item.icon className="w-5 h-5" strokeWidth={1.5} />
                <span className="text-[10px] font-light">{item.label}</span>
              </NavLink>
            )
          )}
        </div>
      </nav>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
};