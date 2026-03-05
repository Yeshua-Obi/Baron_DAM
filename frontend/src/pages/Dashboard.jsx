import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { ProjectCard } from '../components/projects/ProjectCard';
import { FolderOpen, Image as ImageIcon, TrendingUp, ArrowRight, Database, Loader2 } from 'lucide-react';
import { projectsApi, statsApi, seedDemoData } from '../lib/api';
import { toast } from 'sonner';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentProjects, setRecentProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, projectsRes] = await Promise.all([
        statsApi.getStats(),
        projectsApi.getAll({ limit: 4 })
      ]);
      setStats(statsRes.data);
      setRecentProjects(projectsRes.data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDemo = async () => {
    setSeeding(true);
    try {
      await seedDemoData();
      toast.success('Demo data loaded successfully!');
      loadData();
    } catch (error) {
      console.error('Error seeding demo data:', error);
      toast.error('Failed to load demo data.');
    } finally {
      setSeeding(false);
    }
  };

  const statCards = [
    { label: 'Total Projects', value: stats?.total_projects || 0, icon: FolderOpen, color: 'text-[#D4AF37]' },
    { label: 'Total Assets', value: stats?.total_assets || 0, icon: ImageIcon, color: 'text-cyan-400' },
    { label: 'Categories', value: Object.keys(stats?.assets_by_category || {}).length, icon: TrendingUp, color: 'text-emerald-400' }
  ];

  return (
    <Layout>
      <div className="p-8 md:p-12 lg:p-16">
        <header className="mb-16">
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#D4AF37] mb-4">
            Digital Asset Management
          </p>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-[#F5F5F0] tracking-tight leading-tight">
            Baron Architecture
          </h1>
          <p className="text-white/40 text-base font-light mt-4 max-w-xl leading-relaxed">
            Manage, organize, and search your architectural assets with intelligent categorization.
          </p>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
              {statCards.map((stat, index) => (
                <div key={stat.label} className={`card-hover bg-[#121212] border border-white/5 p-6 animate-fade-in stagger-${index + 1}`}>
                  <div className="flex items-start justify-between mb-4">
                    <stat.icon className={`w-5 h-5 ${stat.color}`} strokeWidth={1.5} />
                    <span className="text-[10px] font-mono uppercase tracking-widest text-white/30">{stat.label}</span>
                  </div>
                  <div className="font-serif text-4xl text-[#F5F5F0]">{stat.value}</div>
                </div>
              ))}
            </section>

            {stats?.total_projects === 0 && (
              <section className="mb-16">
                <div className="bg-[#121212] border border-white/5 p-8 text-center">
                  <Database className="w-12 h-12 text-white/20 mx-auto mb-4" strokeWidth={1} />
                  <h3 className="font-serif text-xl text-[#F5F5F0] mb-2">No Projects Yet</h3>
                  <p className="text-white/40 text-sm mb-6">Seed demo data to explore the DAM system with sample architectural assets.</p>
                  <button onClick={handleSeedDemo} disabled={seeding} className="bg-[#D4AF37] text-black px-8 py-3 text-sm font-medium uppercase tracking-wider hover:bg-[#C5A059] disabled:opacity-50 flex items-center gap-2 mx-auto">
                    {seeding ? <><Loader2 className="w-4 h-4 animate-spin" /> Seeding...</> : <><Database className="w-4 h-4" /> Seed Demo Data</>}
                  </button>
                </div>
              </section>
            )}

            {recentProjects.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="font-serif text-2xl text-[#F5F5F0]">Recent Projects</h2>
                  <Link to="/projects" className="flex items-center gap-2 text-sm text-white/40 hover:text-[#D4AF37] uppercase tracking-wider">
                    View All <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {recentProjects.map((project, index) => (
                    <ProjectCard key={project.id} project={project} index={index} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}