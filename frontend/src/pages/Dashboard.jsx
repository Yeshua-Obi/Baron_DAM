import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { Folder, FileText, PieChart, Activity, AlertCircle, Loader2 } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    total_projects: 0,
    total_assets: 0,
    assets_by_category: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/stats');
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      setStats(data);
      setError(null);
    } catch (err) {
      console.error("Dashboard Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-10 h-10 text-[#D4AF37] animate-spin" />
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="p-8 md:p-12 max-w-7xl mx-auto">
        <header className="mb-12">
          <h2 className="text-[#D4AF37] text-[10px] uppercase tracking-[0.4em] mb-3 font-mono">Digital Asset Management</h2>
          <h1 className="text-6xl text-white font-serif tracking-tighter mb-6 uppercase">
            Baron <span className="text-white/20">Architecture</span>
          </h1>
          <p className="text-white/40 max-w-2xl font-light leading-relaxed">
            Manage, organize, and search your architectural assets with intelligent categorization and real-time server syncing.
          </p>
        </header>

        {error && (
          <div className="mb-8 bg-red-950/20 border border-red-500/50 p-6 rounded-lg flex items-start gap-4">
            <AlertCircle className="text-red-500 shrink-0" size={24} />
            <div>
              <h3 className="text-red-500 font-bold uppercase text-xs tracking-widest mb-1">Connection Error</h3>
              <p className="text-red-200/60 text-sm">Dashboard couldn't reach the backend. Ensure Python is running.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-[#111] border border-white/5 p-8 hover:border-[#D4AF37]/30 transition-all">
            <div className="flex justify-between items-start mb-12">
              <Folder className="text-[#D4AF37] opacity-50" size={24} />
              <span className="text-white/20 text-[10px] uppercase tracking-widest">Projects</span>
            </div>
            <div className="text-6xl text-white font-serif">{stats.total_projects}</div>
          </div>

          <div className="bg-[#111] border border-white/5 p-8 hover:border-[#D4AF37]/30 transition-all">
            <div className="flex justify-between items-start mb-12">
              <FileText className="text-[#D4AF37] opacity-50" size={24} />
              <span className="text-white/20 text-[10px] uppercase tracking-widest">Assets</span>
            </div>
            <div className="text-6xl text-white font-serif">{stats.total_assets}</div>
          </div>

          <div className="bg-[#111] border border-white/5 p-8 hover:border-[#D4AF37]/30 transition-all">
            <div className="flex justify-between items-start mb-12">
              <PieChart className="text-[#D4AF37] opacity-50" size={24} />
              <span className="text-white/20 text-[10px] uppercase tracking-widest">Categories</span>
            </div>
            <div className="text-6xl text-white font-serif">
              {Object.keys(stats.assets_by_category || {}).length}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}