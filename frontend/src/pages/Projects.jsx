import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Search, MapPin, Calendar, Loader2, Folder, Filter, File as FileIcon } from 'lucide-react';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // --- FILTER & SORT STATES ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypologies, setSelectedTypologies] = useState([]); 
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [selectedYear, setSelectedYear] = useState('All'); 
  const [sortBy, setSortBy] = useState('newest'); 

  // --- PREDICTIVE SEARCH STATES ---
  const [predictiveResults, setPredictiveResults] = useState({ projects: [], assets: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);

  const API_BASE = 'http://127.0.0.1:8000/api';

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch(`${API_BASE}/projects`);
        if (res.ok) {
          const data = await res.json();
          setProjects(data);
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  // Predictive Search logic
  useEffect(() => {
    if (searchQuery.length < 2) {
      setPredictiveResults({ projects: [], assets: [] });
      setShowDropdown(false);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setPredictiveResults(data);
          setShowDropdown(true);
        }
      } catch (error) { console.error(error); } finally { setIsSearching(false); }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Click outside search handler
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Data Extraction for Filters
  const uniqueTypologies = [...new Set(projects.map(p => p.typology))].filter(t => t && t !== "Unassigned");
  const uniqueLocations = [...new Set(projects.map(p => p.location))].filter(l => l && l !== "Unassigned");
  const uniqueYears = [...new Set(projects.map(p => p.project_date ? new Date(p.project_date).getFullYear().toString() : null))].filter(Boolean).sort((a, b) => b - a);

  // --- FILTERING ---
  let filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTypology = selectedTypologies.length === 0 || selectedTypologies.includes(p.typology);
    const matchesLocation = selectedLocation === 'All' || p.location === selectedLocation;
    const projectYear = p.project_date ? new Date(p.project_date).getFullYear().toString() : null;
    const matchesYear = selectedYear === 'All' || projectYear === selectedYear;
    return matchesSearch && matchesTypology && matchesLocation && matchesYear;
  });

  // --- SORTING (Year then Serial) ---
  filteredProjects.sort((a, b) => {
    const dateA = new Date(a.project_date || 0);
    const dateB = new Date(b.project_date || 0);
    const yearA = dateA.getFullYear();
    const yearB = dateB.getFullYear();
    const serialA = a.project_serial || 0;
    const serialB = b.project_serial || 0;

    if (sortBy === 'newest') {
      if (yearB !== yearA) return yearB - yearA; 
      return serialB - serialA; 
    }
    if (sortBy === 'oldest') {
      if (yearA !== yearB) return yearA - yearB; 
      return serialA - serialB; 
    }
    if (sortBy === 'a-z') return a.name.localeCompare(b.name);
    return 0;
  });

  const formatDate = (dateString) => {
    if (!dateString) return "NO DATE";
    return new Date(dateString).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }).toUpperCase();
  };

  const handleOpenFile = async (fileUrl) => {
    try {
      await fetch(`${API_BASE}/open-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_url: fileUrl })
      });
      setShowDropdown(false);
    } catch (err) { console.error(err); }
  };

  if (loading) return <Layout><div className="p-20 flex justify-center"><Loader2 className="animate-spin text-[#D4AF37]" size={48} /></div></Layout>;

  return (
    <Layout>
      <div className="p-8 md:p-12 relative">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-[#D4AF37] text-[10px] uppercase tracking-[0.2em] mb-2 font-mono">Portfolio</h2>
            <h1 className="text-4xl text-white uppercase tracking-[0.15em] font-serif">Projects</h1>
          </div>
          <div className="text-white/20 text-[10px] uppercase tracking-[0.3em] font-mono">
            {filteredProjects.length} Entries
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-[#111] border border-white/5 rounded-lg p-4 mb-10 space-y-4 shadow-2xl">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative" ref={searchRef}>
              <Search className="w-4 h-4 text-[#D4AF37] absolute left-4 top-1/2 -translate-y-1/2" />
              <input 
                type="text" placeholder="Search archive..." value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                className="w-full bg-black/50 border border-white/10 rounded-md py-3 pl-12 pr-10 text-sm text-white focus:outline-none focus:border-[#D4AF37]/50 transition-all placeholder:text-white/20"
              />
              
              {showDropdown && (predictiveResults.projects.length > 0 || predictiveResults.assets.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-[#0A0A0A] border border-white/10 rounded-lg shadow-2xl z-50 max-h-[400px] overflow-y-auto">
                  {predictiveResults.projects.map(p => (
                    <div key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="p-3 hover:bg-white/5 cursor-pointer flex items-center gap-3 border-b border-white/[0.03]">
                      <Folder className="w-4 h-4 text-[#D4AF37]/50" />
                      <div className="text-sm text-white uppercase tracking-tight">{p.name}</div>
                    </div>
                  ))}
                  {predictiveResults.assets.map(a => (
                    <div key={a.id} onClick={() => handleOpenFile(a.file_url)} className="p-3 hover:bg-white/5 cursor-pointer flex items-center gap-3 border-b border-white/[0.03]">
                      <FileIcon className="w-4 h-4 text-white/20" />
                      <div className="text-sm text-white truncate">{a.name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-black/50 border border-white/10 rounded-md px-4 text-xs text-white uppercase tracking-widest cursor-pointer focus:outline-none focus:border-[#D4AF37]/50">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="a-z">A - Z</option>
            </select>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="w-3 h-3 text-white/20 mr-2" />
              {uniqueTypologies.map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedTypologies(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])}
                  className={`px-4 py-1 rounded-full text-[9px] uppercase tracking-widest border transition-all ${
                    selectedTypologies.includes(type) ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]' : 'bg-transparent border-white/10 text-white/40'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4 border-l border-white/5 pl-4">
              <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} className="bg-transparent text-[10px] uppercase text-white/60 focus:outline-none cursor-pointer">
                <option value="All">All Locations</option>
                {uniqueLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
              <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent text-[10px] uppercase text-white/60 focus:outline-none cursor-pointer">
                <option value="All">All Years</option>
                {uniqueYears.map(year => <option key={year} value={year}>{year}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* --- PROJECT GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProjects.map((project) => (
            <Link key={project.id} to={`/projects/${project.id}`} className="group">
              <div className="bg-[#0F0F0F] border border-white/5 group-hover:border-[#D4AF37]/40 transition-all h-full shadow-lg flex flex-col relative overflow-hidden">
                
                {/* Serial Badge */}
                <div className="absolute top-2 left-2 z-20 bg-black/80 px-2 py-0.5 text-[8px] font-mono text-white/40 border border-white/10">
                  REF: {String(project.project_serial).padStart(2, '0')}
                </div>

                {/* Thumbnail / Hero Image Area */}
                <div className="aspect-[16/10] bg-black/40 flex items-center justify-center relative overflow-hidden border-b border-white/[0.03]">
                  {project.thumbnail_url ? (
                    <img 
                      src={`${API_BASE}/serve-image?file_url=${encodeURIComponent(project.thumbnail_url)}`} 
                      alt={project.name}
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                      onError={(e) => { e.target.style.display = 'none'; }} 
                    />
                  ) : (
                    <Folder size={40} className="text-white/[0.03] group-hover:text-[#D4AF37]/10 transition-colors" />
                  )}
                  
                  <div className="absolute bottom-3 right-3 z-10 bg-black/60 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded text-[8px] uppercase tracking-widest text-[#D4AF37]">
                    {project.typology}
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-xs text-white font-light tracking-[0.2em] group-hover:text-[#D4AF37] transition-colors line-clamp-2 mb-6 leading-relaxed uppercase">
                    {project.name}
                  </h3>
                  <div className="mt-auto pt-4 border-t border-white/[0.03] flex justify-between items-center">
                    <div className="flex items-center text-white/30 text-[9px] gap-2 uppercase tracking-widest">
                      <MapPin size={10} className="text-cyan-500/40" />
                      <span>{project.location}</span>
                    </div>
                    <div className="flex items-center text-white/30 text-[9px] gap-2 uppercase tracking-widest">
                      <Calendar size={10} className="text-emerald-500/40" />
                      <span>{formatDate(project.project_date)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}