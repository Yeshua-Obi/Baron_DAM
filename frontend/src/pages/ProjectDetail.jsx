import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { projectsApi, assetsApi } from '../lib/api';
import { Folder, MapPin, Loader2, AlertTriangle, ArrowLeft, File as FileIcon, Image as ImageIcon, ChevronRight } from 'lucide-react';

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [currentPath, setCurrentPath] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const pRes = await projectsApi.getById(id);
        setProject(pRes.data);
        
        const aRes = await assetsApi.getByProject(id);
        setAssets(Array.isArray(aRes.data) ? aRes.data : []);
      } catch (error) {
        console.error("Failed to load project data:", error);
        setAssets([]); 
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const getItems = () => {
    const folders = new Set();
    const files = [];

    assets.forEach(asset => {
      const assetPath = asset.metadata?.path || [];
      
      let isMatch = true;
      for (let i = 0; i < currentPath.length; i++) {
        if (assetPath[i] !== currentPath[i]) {
          isMatch = false;
          break;
        }
      }

      if (isMatch) {
        if (assetPath.length > currentPath.length) {
          folders.add(assetPath[currentPath.length]);
        } else if (assetPath.length === currentPath.length) {
          files.push(asset);
        }
      }
    });

    return { folders: Array.from(folders), files };
  };

  const handleOpenFile = async (fileUrl) => {
    try {
      await fetch('http://localhost:8000/api/open-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_url: fileUrl })
      });
    } catch (err) {
      console.error("Failed to open file:", err);
    }
  };

  if (loading) return <Layout><div className="p-20 flex justify-center"><Loader2 className="animate-spin text-[#D4AF37]" size={48} /></div></Layout>;

  const { folders, files } = getItems();

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
        
        {/* BREADCRUMB NAVIGATION */}
        {currentPath.length > 0 ? (
          <div className="flex items-center gap-2 mb-8 text-xs uppercase tracking-widest text-[#D4AF37]">
            <button 
              onClick={() => setCurrentPath(prev => prev.slice(0, -1))}
              className="flex items-center gap-2 text-white/50 hover:text-[#D4AF37] transition-colors bg-white/5 px-4 py-2 rounded-full"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <div className="flex items-center gap-2 opacity-50 ml-4">
              <span className="cursor-pointer hover:text-white" onClick={() => setCurrentPath([])}>ROOT</span>
              {currentPath.map((folderName, index) => (
                <React.Fragment key={index}>
                  <ChevronRight size={12} />
                  <span 
                    className="cursor-pointer hover:text-white"
                    onClick={() => setCurrentPath(currentPath.slice(0, index + 1))}
                  >
                    {folderName}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>
        ) : (
          <h2 className="text-[#D4AF37] text-xs uppercase tracking-widest mb-6">Server Folders</h2>
        )}

        {/* FOLDERS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 mb-8">
          {folders.map(folder => (
            <div 
              key={folder} 
              onClick={() => setCurrentPath([...currentPath, folder])} 
              className="bg-[#111] border border-white/5 hover:border-[#D4AF37]/50 p-6 flex flex-col items-center group cursor-pointer transition-all rounded-lg"
            >
              <Folder size={40} className="text-[#D4AF37]/40 group-hover:text-[#D4AF37] mb-3 transition-colors" />
              <span className="text-[10px] font-medium uppercase tracking-widest text-white/80 text-center break-all">{folder}</span>
            </div>
          ))}
        </div>

        {/* FILES GRID */}
        {files.length > 0 && (
          <>
            <div className="w-full h-px bg-white/10 my-8"></div>
            <h2 className="text-white/40 text-xs uppercase tracking-widest mb-6">Files</h2>
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-4">
              {files.map(file => (
                <div 
                  key={file._id || file.id} 
                  onClick={() => handleOpenFile(file.file_url)} 
                  className="bg-white/5 border border-white/10 hover:border-[#D4AF37]/30 p-4 rounded-lg group cursor-pointer transition-all" 
                  title={file.name}
                >
                  <div className="aspect-square bg-black/50 rounded flex items-center justify-center mb-3 overflow-hidden">
                    {/* NEW: LIVE THUMBNAILS VIA FASTAPI */}
                    {file.file_type === 'image' ? (
                      <img 
                        src={`http://localhost:8000/api/serve-image?file_url=${encodeURIComponent(file.file_url)}`}
                        alt={file.name}
                        className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                      />
                    ) : (
                      <FileIcon size={24} className="text-white/20 group-hover:text-[#D4AF37]/60 transition-colors" />
                    )}
                  </div>
                  <p className="text-[10px] text-white/70 truncate text-center">{file.name}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}