import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { Folder, Image as ImageIcon, TrendingUp, Loader2, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    total_projects: 0,
    total_assets: 0,
    assets_by_category: {},
  });
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null); // NEW: Error tracker

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Switched from 'localhost' to '127.0.0.1' to bypass Windows network quirks
        const res = await fetch('http://127.0.0.1:8000/api/stats');
        
        if (!res.ok) {
          throw new Error(`Server rejected connection with status: ${res.status}`);
        }
        
        const data = await res.json();
        setStats(data);
      } catch (error) {
        console.error("Failed to load dashboard stats:", error);
        setFetchError(error.message); // Save the error to show on screen
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="p-20 flex justify-center">
          <Loader2 className="animate-spin text-[#D4AF37]" size={48} />
        </div>
      </Layout>
    );
  }

  const totalCategories = Object.keys(stats.assets_by_category || {}).length;

  return (
    <Layout>
      <div className="p-8 md:p-12">
        <div className="mb-16">
          <h2 className="text-[#D4AF37] text-[10px] uppercase tracking-[0.2em] mb-4">
            Digital Asset Management
          </h2>
          <h1 className="text-5xl md:text-6xl text-[#D4AF37] uppercase tracking-widest font-serif mb-6">
            Baron Architecture
          </h1>
          <p className="text-white/40 font-light tracking-wide text-sm max-w-2xl">
            Manage, organize, and search your architectural assets with intelligent categorization.
          </p>
        </div>

        {/* NEW: If the connection fails, it will show this red box instead of hiding the error */}
        {fetchError && (
          <div className="mb-8 p-4 border border-red-500/30 bg-red-500/10 rounded flex items-center gap-4 text-red-400">
            <AlertTriangle />
            <div>
              <p className="font-bold text-sm">Connection Blocked</p>
              <p className="text-xs text-red-400/70">{fetchError}. Please right-click the page, select 'Inspect', and check the 'Console' tab for red text.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#111] border border-white/5 p-8 rounded flex flex-col justify-between min-h-[160px]">
            <div className="flex justify-between items-start w-full">
              <Folder className="text-[#D4AF37] w-5 h-5" />
              <span className="text-white/30 text-[10px] uppercase tracking-widest">Total Projects</span>
            </div>
            <div className="text-5xl font-light text-[#D4AF37] font-serif mt-4">
              {stats.total_projects}
            </div>
          </div>

          <div className="bg-[#111] border border-white/5 p-8 rounded flex flex-col justify-between min-h-[160px]">
            <div className="flex justify-between items-start w-full">
              <ImageIcon className="text-cyan-500 w-5 h-5" />
              <span className="text-white/30 text-[10px] uppercase tracking-widest">Total Assets</span>
            </div>
            <div className="text-5xl font-light text-[#D4AF37] font-serif mt-4">
              {stats.total_assets}
            </div>
          </div>

          <div className="bg-[#111] border border-white/5 p-8 rounded flex flex-col justify-between min-h-[160px]">
            <div className="flex justify-between items-start w-full">
              <TrendingUp className="text-emerald-500 w-5 h-5" />
              <span className="text-white/30 text-[10px] uppercase tracking-widest">Categories</span>
            </div>
            <div className="text-5xl font-light text-[#D4AF37] font-serif mt-4">
              {totalCategories}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}