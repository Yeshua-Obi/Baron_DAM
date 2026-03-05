import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { Search, FolderOpen, Image, X, Loader2 } from 'lucide-react';
import { searchApi } from '../../lib/api';
import { getCategoryColor } from '../../lib/utils';

export const GlobalSearch = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ projects: [], assets: [] });
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onOpenChange]);

  // Search handler connected to your Python backend
  const handleSearch = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults({ projects: [], assets: [] });
      return;
    }

    setLoading(true);
    try {
      const response = await searchApi.search(searchQuery);
      setResults(response.data);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Search error:', error);
      setResults({ projects: [], assets: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search (waits for you to stop typing before searching)
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(query);
    }, 200);

    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  // Reset when closed
  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults({ projects: [], assets: [] });
      setSelectedIndex(0);
    }
  }, [open]);

  // Navigate to the selected result
  const handleSelect = (type, id) => {
    onOpenChange(false);
    
    // Slight delay allows the modal to remove its body-scroll-lock before the page transitions
    setTimeout(() => {
      if (type === 'project') {
        navigate(`/projects/${id}`);
      } else {
        navigate(`/projects?asset=${id}`);
      }
    }, 150);
  };

  // Keyboard navigation logic
  const allResults = [
    ...results.projects.map(p => ({ type: 'project', ...p })),
    ...results.assets.map(a => ({ type: 'asset', ...a }))
  ];

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, allResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && allResults[selectedIndex]) {
      e.preventDefault();
      const item = allResults[selectedIndex];
      handleSelect(item.type, item.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 bg-[#121212] border border-white/10 overflow-hidden">
        {/* Screen Reader Accessibility */}
        <DialogTitle className="sr-only">Global Search</DialogTitle>
        <DialogDescription className="sr-only">Search for architectural projects and assets.</DialogDescription>

        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/5">
          {loading ? (
            <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
          ) : (
            <Search className="w-5 h-5 text-white/40" />
          )}
          <input
            type="text"
            placeholder="Search projects, assets, locations..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-[#F5F5F0] placeholder:text-white/30 text-base outline-none"
            autoFocus
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="p-1 hover:bg-white/5 text-white/40 hover:text-white/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search Results Display */}
        <div className="max-h-[60vh] overflow-y-auto">
          {!query && (
            <div className="px-4 py-8 text-center text-white/30 text-sm">
              Start typing to search across all projects and assets
            </div>
          )}

          {query && allResults.length === 0 && !loading && (
            <div className="px-4 py-8 text-center text-white/30 text-sm">
              No results found for "{query}"
            </div>
          )}

          {/* Projects List */}
          {results.projects.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-white/30">
                Projects
              </div>
              {results.projects.map((project, index) => (
                <button
                  key={project.id}
                  onClick={() => handleSelect('project', project.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    selectedIndex === index ? 'bg-white/5' : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="w-10 h-10 bg-white/5 flex items-center justify-center shrink-0">
                    <FolderOpen className="w-5 h-5 text-[#D4AF37]" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[#F5F5F0] text-sm font-medium truncate">
                      {project.name}
                    </div>
                    <div className="text-white/40 text-xs truncate mt-0.5">
                      {project.location} · {project.typology}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Assets List */}
          {results.assets.length > 0 && (
            <div className="py-2 border-t border-white/5">
              <div className="px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-white/30">
                Assets
              </div>
              {results.assets.map((asset, index) => {
                const adjustedIndex = results.projects.length + index;
                return (
                  <button
                    key={asset.id}
                    onClick={() => handleSelect('asset', asset.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      selectedIndex === adjustedIndex ? 'bg-white/5' : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="w-10 h-10 bg-black/50 border border-white/5 overflow-hidden shrink-0">
                      {asset.file_type === 'image' ? (
                        <img 
                          src={asset.file_url} 
                          alt={asset.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image className="w-5 h-5 text-white/40" strokeWidth={1.5} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[#F5F5F0] text-sm font-medium truncate">
                        {asset.name}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`tag-pill ${getCategoryColor(asset.ai_category)}`}>
                          {asset.ai_category}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Keyboard Navigation Footer */}
        <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-white/30">
          <div className="flex items-center gap-4">
            <span><kbd className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10">↑↓</kbd> Navigate</span>
            <span><kbd className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10">↵</kbd> Select</span>
          </div>
          <span><kbd className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10">ESC</kbd> Close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};