import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { projectsApi, assetsApi } from '../lib/api';
import { Folder, MapPin, Loader2, AlertTriangle } from 'lucide-react';

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const pRes = await projectsApi.getById(id);
        setProject(pRes.data);
        
        const aRes = await assetsApi.getByProject(id);
        // CRITICAL FIX: Protects the page from crashing if the API fails
        setAssets(Array.isArray(aRes.data) ? aRes.data : []);
      } catch (error) {
        console.error("Failed to load project data:", error);
        setAssets([]); // Fallback to safe empty array
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const getFolders = () => {
    const folderSet = new Set();
    assets.forEach(asset => {
      const path = asset.metadata?.path || [];
      if (path.length > 0) folderSet.add(path[0]);
    });
    return Array.from(folderSet);
  };

  if (loading) return <Layout><div className="p-20 flex justify-center"><Loader2 className="animate-spin text-[#D4AF37]" size={48} /></div></Layout>;

  const folders = getFolders();

  return (
    <Layout>
      <div className="p-8 md:p-12">
        <h1 className="text-5xl text-white mb-4 uppercase tracking-tighter font-serif">
          {project?.name || "Connecting..."}
        </h1>
        <div className="flex items-center gap-4 text-white/40 mb-12">
            <MapPin size={16}/> {project?.location || "Lagos, Nigeria"}
            <span className="border border-white/10 px-3 py-1 text-xs rounded-full">
                {assets.length} Files Linked
            </span>
        </div>
        
        <h2 className="text-[#D4AF37] text-xs uppercase tracking-widest mb-6">Server Folders</h2>
        
        {folders.length === 0 ? (
          <div className="p-10 border border-dashed border-red-500/30 bg-red-500/5 rounded-lg flex gap-4">
              <AlertTriangle className="text-red-400" />
              <div>
                  <h3 className="font-bold text-red-300">Database Link Broken</h3>
                  <p className="text-sm text-red-200/70 mt-1">The frontend is looking for files, but the backend returned 0. We need to fix the Python Scanner ID format.</p>
              </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {folders.map(folder => (
              <div key={folder} className="bg-[#111] border border-white/5 hover:border-[#D4AF37]/50 p-8 flex flex-col items-center group cursor-pointer transition-all rounded-lg">
                <Folder size={48} className="text-[#D4AF37]/40 group-hover:text-[#D4AF37] mb-4 transition-colors" />
                <span className="text-sm font-medium uppercase tracking-widest text-white/80">{folder}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}