import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderOpen, 
  Search, 
  Settings,
  Sparkles
} from 'lucide-react';
import { GlobalSearch } from '../search/GlobalSearch';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: FolderOpen, label: 'Projects' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export const Sidebar = () => {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <aside className="fixed left-0 top-0 bottom-0 w-64 border-r border-white/5 bg-[#0A0A0A] p-6 hidden md:flex flex-col z-40">
        {/* Logo */}
        <div className="mb-12">
          <h1 className="font-serif text-xl tracking-tight text-[#F5F5F0]">
            Baron
          </h1>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37] mt-1">
            Architecture
          </p>
        </div>

        {/* Search Button */}
        <button
          onClick={() => setSearchOpen(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 mb-8 border border-white/10 hover:border-[#D4AF37]/30 bg-white/[0.02] text-white/40 hover:text-white/60 text-sm"
        >
          <Search className="w-4 h-4" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 bg-white/5 text-white/30">
            ⌘K
          </kbd>
        </button>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm font-light tracking-wide ${
                  isActive
                    ? 'text-[#D4AF37] border-l-2 border-[#D4AF37] -ml-[2px] pl-[14px]'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/[0.02]'
                }`
              }
            >
              <item.icon className="w-4 h-4" strokeWidth={1.5} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* AI Badge */}
        <div className="mt-auto pt-6 border-t border-white/5">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-white/30">
            <Sparkles className="w-3 h-3 text-[#D4AF37]" />
            <span>AI Tagging: Mock</span>
          </div>
        </div>
      </aside>

      {/* Global Search Modal */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
};