import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { projectsApi, assetsApi } from '../lib/api';
import { AssetCard } from '../components/assets/AssetCard';
import { AssetViewer } from '../components/assets/AssetViewer';
import { ArrowLeft, MapPin, Loader2, Folder, File, ChevronRight } from 'lucide-react';

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [allAssets, setAllAssets] = useState([]);
  const [currentPath, setCurrentPath] = useState([]); // Tracks folder depth: ['Admin', 'Architecture Certificate']
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [p, a] = await Promise.all([projectsApi.getById(id), assetsApi.getByProject(id)]);
        setProject(p.data);
        setAllAssets(a.data);
      } finally { setLoading(false); }
    };
    load();
  }, [id]);

  // Logic to filter assets based on the current folder path
  const getVisibleItems = () => {
    const folders = new Set();
    const files = [];

    allAssets.forEach(asset => {
      const pathParts = asset.metadata?.path || []; // Assuming backend sends [Admin, Letters]
      
      // If we are at the root, look for top-level folders (Admin, Drawings...)
      if (currentPath.length === 0) {
        if (pathParts.length > 0) folders.add(pathParts[0]);
        else files.push(asset);
      } 
      // If we are inside a folder, look for items inside that path
      else {
        const isInsideMatch = currentPath.every((part, i) => pathParts[i] === part);
        if (isInsideMatch) {
          if (pathParts.length > currentPath.length) {
            folders.add(pathParts[currentPath.length]);
          } else {
            files.push(asset);
          }
        }
      }
    });

    return { folders: Array.from(folders), files };
  };

  if (loading) return <Layout><div className="p-20"><Loader2 className="animate-spin text-gold" /></div></Layout>;

  const { folders, files } = getVisibleItems();

  return (
    <Layout>
      <div className="p-8 md:p-12">
        {/* Breadcrumbs Navigation */}
        <div className="flex items-center gap-2 text-white/40 text-xs uppercase tracking-widest mb-8">
          <Link to="/projects" className="hover:text-white transition-colors">Projects</Link>
          <ChevronRight size={12} />
          <button onClick={() => setCurrentPath([])} className="hover:text-white transition-colors">{project?.name}</button>
          {currentPath.map((folder, i) => (
            <React.Fragment key={i}>
              <ChevronRight size={12} />
              <button 
                onClick={() => setCurrentPath(currentPath.slice(0, i + 1))}
                className="hover:text-white transition-colors"
              >
                {folder}
              </button>
            </React.Fragment>
          ))}
        </div>

        <h1 className="text-5xl text-white mb-4">{project?.name}</h1>
        <div className="flex items-center gap-4 text-white/40 mb-12"><MapPin size={16}/> {project?.location}</div>
        
        {/* Folders Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-12">
          {folders.map(folder => (
            <button 
              key={folder}
              onClick={() => setCurrentPath([...currentPath, folder])}
              className="folder-card p-6 flex flex-col items-center gap-4 text-white/60 hover:text-gold group"
            >
              <Folder size={40} strokeWidth={1.5} className="group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium uppercase tracking-tight">{folder}</span>
            </button>
          ))}
        </div>

        {/* Files Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {files.map((asset, i) => (
            <AssetCard key={asset.id} asset={asset} index={i} onClick={setSelectedAsset} />
          ))}
        </div>

        <AssetViewer asset={selectedAsset} open={!!selectedAsset} onOpenChange={() => setSelectedAsset(null)} />
      </div>
    </Layout>
  );
}