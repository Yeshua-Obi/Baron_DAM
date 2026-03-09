import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, File as FileIcon, Image as ImageIcon, Folder, Loader2 } from 'lucide-react';

export const GlobalSearch = ({ open, onOpenChange }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ projects: [], assets: [] });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // The Live Search Engine
  useEffect(() => {
    // If the modal is closed, wipe the old search clean
    if (!open) {
      setQuery('');
      setResults({ projects: [], assets: [] });
      return;
    }

    // A "Debounce" function: waits 300ms after you stop typing before hitting the Python server
    const delayDebounceFn = setTimeout(async () => {
      if (query.length < 2) {
        setResults({ projects: [], assets: [] });
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:8000/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (error) {
        console.error("Search failed", error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, open]);

  // Uses our "Bridge" to open files natively from the search modal!
  const handleOpenFile = async (fileUrl) => {
    try {
      await fetch('http://localhost:8000/api/open-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_url: fileUrl })
      });
      onOpenChange(false); // Auto-close the search modal when the file opens
    } catch (err) {
      console.error("Failed to open file:", err);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/60 backdrop-blur-sm" onClick={() => onOpenChange(false)}>
      <div 
        className="w-full max-w-2xl bg-[#111] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Area */}
        <div className="flex items-center px-4 py-4 border-b border-white/10 relative">
          <Search className="w-5 h-5 text-[#D4AF37]" />
          <input 
            type="text" 
            placeholder="Search projects, files, or categories (e.g., 'Elevation')..." 
            className="w-full bg-transparent border-none text-white px-4 outline-none placeholder:text-white/30"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          {loading && <Loader2 className="w-5 h-5 text-white/30 animate-spin absolute right-12" />}
          <button onClick={() => onOpenChange(false)} className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {query.length < 2 ? (
            <div className="text-center text-white/30 py-8 text-xs uppercase tracking-widest">
              Type at least 2 characters to search
            </div>
          ) : results.projects.length === 0 && results.assets.length === 0 && !loading ? (
            <div className="text-center text-white/30 py-8 text-xs uppercase tracking-widest">
              No results found
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Project Results */}
              {results.projects.length > 0 && (
                <div>
                  <h3 className="text-[#D4AF37] text-[10px] uppercase tracking-widest mb-3 px-2">Projects</h3>
                  <div className="space-y-1">
                    {results.projects.map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => { navigate(`/projects/${p.id}`); onOpenChange(false); }}
                        className="flex items-center gap-4 p-2 rounded hover:bg-white/5 cursor-pointer group transition-colors"
                      >
                        <div className="w-10 h-10 rounded bg-black/50 border border-white/5 flex items-center justify-center group-hover:border-[#D4AF37]/50 transition-colors">
                          <Folder className="w-5 h-5 text-white/40 group-hover:text-[#D4AF37] transition-colors" />
                        </div>
                        <div>
                          <div className="text-sm text-white group-hover:text-[#D4AF37] transition-colors">{p.name}</div>
                          <div className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">{p.typology} • {p.location}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Asset Results */}
              {results.assets.length > 0 && (
                <div>
                  <h3 className="text-[#D4AF37] text-[10px] uppercase tracking-widest mb-3 px-2">Files & Assets</h3>
                  <div className="space-y-1">
                    {results.assets.map(a => (
                      <div 
                        key={a.id} 
                        onClick={() => handleOpenFile(a.file_url)}
                        className="flex items-center gap-4 p-2 rounded hover:bg-white/5 cursor-pointer group transition-colors"
                      >
                        <div className="w-10 h-10 rounded bg-black/50 border border-white/5 flex items-center justify-center group-hover:border-[#D4AF37]/50 overflow-hidden transition-colors">
                          {/* Search uses the exact same Live Thumbnails we just built! */}
                          {a.file_type === 'image' ? (
                            <img src={`http://localhost:8000/api/serve-image?file_url=${encodeURIComponent(a.file_url)}`} alt={a.name} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                          ) : (
                            <FileIcon className="w-5 h-5 text-white/40 group-hover:text-[#D4AF37] transition-colors" />
                          )}
                        </div>
                        <div className="flex-1 truncate border-r border-white/5 pr-4">
                          <div className="text-sm text-white truncate group-hover:text-[#D4AF37] transition-colors">{a.name}</div>
                          <div className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">{a.ai_category}</div>
                        </div>
                        <div className="text-[10px] font-mono text-white/30 pl-4 pr-2">
                            {(a.size_bytes / 1024 / 1024).toFixed(1)} MB
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}