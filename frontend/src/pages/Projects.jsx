import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { ProjectCard } from '../components/projects/ProjectCard';
import { Plus, Filter, X, Loader2 } from 'lucide-react';
import { projectsApi } from '../lib/api';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await projectsApi.getAll();
      setProjects(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = filter === 'all' ? projects : projects.filter(p => p.typology === filter);

  return (
    <Layout>
      <div className="p-8 md:p-12">
        <header className="flex justify-between items-end mb-12">
          <div>
            <p className="text-[10px] font-mono text-[#D4AF37] uppercase tracking-widest mb-2">Portfolio</p>
            <h1 className="font-serif text-4xl text-white">Projects</h1>
          </div>
          <div className="flex gap-4">
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="bg-[#121212] border border-white/10 text-white text-xs p-2 uppercase tracking-widest outline-none"
            >
              <option value="all">All Typologies</option>
              <option value="Residential">Residential</option>
              <option value="Commercial">Commercial</option>
              <option value="Masterplan">Masterplan</option>
            </select>
          </div>
        </header>
        {loading ? <Loader2 className="animate-spin mx-auto text-gold" /> : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.map((p, i) => <ProjectCard key={p.id} project={p} index={i} />)}
          </div>
        )}
      </div>
    </Layout>
  );
}