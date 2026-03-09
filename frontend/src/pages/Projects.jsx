import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Search, MapPin, Calendar, Loader2, Folder, Filter, File as FileIcon, Image as ImageIcon } from 'lucide-react';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // --- FILTER STATES ---
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

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/projects');
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

  // Predictive Search Logic
  useEffect(() => {
    if (searchQuery.length < 2) {
      setPredictiveResults({ projects: [], assets: [] });
      setShowDropdown(false);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/search?q=${encodeURIComponent(searchQuery)}`);
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

  // Dynamic Data Extraction
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

  // --- CORRECTED SORTING (Year then Serial) ---
  filteredProjects.sort((a, b) => {
    const dateA = new Date(a.project_date || 0);
    const dateB = new Date(b.project_date || 0);
    const yearA = dateA.getFullYear();
    const yearB = dateB.getFullYear();
    const serialA = a.project_serial || 0;
    const serialB = b.project_serial || 0;

    if (sortBy === 'newest') {
      if (yearB !== yearA) return yearB - yearA; // Highest year first
      return serialB - serialA; // Highest serial first
    }
    if (sortBy === 'oldest') {
      if (yearA !== yearB) return yearA - yearB; // Lowest year first
      return serialA - serialB; // Lowest serial first
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
      await fetch('http://127.0.0.1:8000/api/open-file', {
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
            <h2 className="text-[#D4AF37] text-[10px] uppercase tracking-[0.2em] mb-2 font-mono">Archive Explorer</h2>
            <h1 className="text-4xl text-white uppercase tracking-[0.15em] font-serif">Projects</h1>
          </div>
          <div className="text-white/20 text-[10px] uppercase tracking-[0.3em] font-mono">
            {filteredProjects.length} Entries Found
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-[#111] border border-white/5 rounded-lg p-4 mb-10 space-y-4 shadow-2xl">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative" ref={searchRef}>
              <Search className="w-4 h-4 text-[#D4AF37] absolute left-4 top-1/2 -translate-y-1/2" />
              <input 
                type="text" placeholder="Quick Search Project or Asset..." value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                className="w-full bg-black/50 border border-white/10 rounded-md py-3 pl-12 pr-10 text-sm text-white focus:outline-none focus:border-[#D4AF37]/50 transition-all placeholder:text-white/20"
              />
              {isSearching && <Loader2 className="w-4 h-4 text-white/20 animate-spin absolute right-4 top-1/2 -translate-y-1/2" />}

              {/* Dropdown Results */}
              {showDropdown && (predictiveResults.projects.length > 0 || predictiveResults.assets.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-[#0A0A0A] border border-white/10 rounded-lg shadow-2xl z-50 max-h-[500px] overflow-y-auto overflow-x-hidden">
                  {predictiveResults.projects.map(p => (
                    <div key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="p-3 hover:bg-white/5 cursor-pointer flex items-center gap-3 group border-b border-white/[0.03]">
                      <Folder className="w-4 h-4 text-[#D4AF37]/50 group-hover:text-[#D4AF37]" />
                      <div><div className="text-sm text-white uppercase tracking-tight">{p.name}</div><div className="text-[9px] text-white/30 uppercase">{p.typology}</div></div>
                    </div>
                  ))}
                  {predictiveResults.assets.map(a => (
                    <div key={a.id} onClick={() => handleOpenFile(a.file_url)} className="p-3 hover:bg-white/5 cursor-pointer flex items-center gap-3 group border-b border-white/[0.03]">
                      <FileIcon className="w-4 h-4 text-white/20 group-hover:text-[#D4AF37]" />
                      <div className="truncate"><div className="text-sm text-white truncate">{a.name}</div><div className="text-[9px] text-white/30 uppercase">Local File</div></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-black/50 border border-white/10 rounded-md px-4 text-xs text-white uppercase tracking-widest cursor-pointer focus:outline-none focus:border-[#D4AF37]/50 min-w-[160px]">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="a-z">Alphabetical</option>
            </select>
          </div>

          <div className="h-px w-full bg-white/5" />

          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="w-3 h-3 text-white/20 mr-2" />
              {uniqueTypologies.map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedTypologies(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])}
                  className={`px-4 py-1.5 rounded-full text-[9px] uppercase tracking-widest transition-all border ${
                    selectedTypologies.includes(type) ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]' : 'bg-transparent border-white/10 text-white/40 hover:border-white/30'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4 border-l border-white/5 pl-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-3 h-3 text-cyan-500/50" />
                <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} className="bg-transparent text-[10px] uppercase text-white/60 focus:outline-none cursor-pointer">
                  <option value="All">Locations</option>
                  {uniqueLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-3 h-3 text-emerald-500/50" />
                <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent text-[10px] uppercase text-white/60 focus:outline-none cursor-pointer">
                  <option value="All">Years</option>
                  {uniqueYears.map(year => <option key={year} value={year}>{year}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProjects.map((project) => (
            <Link key={project.id} to={`/projects/${project.id}`} className="group">
              <div className="bg-[#0F0F0F] border border-white/5 group-hover:border-[#D4AF37]/40 transition-all h-full shadow-lg flex flex-col relative">
                
                {/* Serial Badge */}
                <div className="absolute top-2 left-2 z-10 bg-black/80 px-2 py-0.5 text-[8px] font-mono text-white/40 border border-white/10">
                  REF: {String(project.project_serial).padStart(2, '0')}
                </div>

                <div className="aspect-[16/10] bg-black/40 flex items-center justify-center relative overflow-hidden">
                   <Folder size={40} className="text-white/[0.03] group-hover:text-[#D4AF37]/10 transition-colors" />
                   <div className="absolute bottom-3 right-3 bg-[#D4AF37]/10 border border-[#D4AF37]/30 px-2 py-0.5 rounded text-[8px] uppercase tracking-widest text-[#D4AF37]">
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