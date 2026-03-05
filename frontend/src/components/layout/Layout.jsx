import React from 'react';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';

export const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      {/* Noise overlay */}
      <div className="noise-overlay" />
      
      {/* Desktop Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <main className="flex-1 md:ml-64 min-h-screen pb-20 md:pb-0">
        {children}
      </main>
      
      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
};