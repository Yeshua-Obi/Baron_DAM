// --- CORRECTED SORTING LOGIC ---
  filteredProjects.sort((a, b) => {
    const dateA = new Date(a.project_date || 0);
    const dateB = new Date(b.project_date || 0);
    
    const yearA = dateA.getFullYear();
    const yearB = dateB.getFullYear();

    if (sortBy === 'newest') {
      // 1. Highest Year first (e.g., 2026 before 2025)
      if (yearB !== yearA) return yearB - yearA;
      // 2. Highest Serial first (e.g., Project 14 before Project 01)
      return (b.project_serial || 0) - (a.project_serial || 0);
    }
    
    if (sortBy === 'oldest') {
      // 1. Lowest Year first
      if (yearA !== yearB) return yearA - yearB;
      // 2. Lowest Serial first
      return (a.project_serial || 0) - (b.project_serial || 0);
    }
    
    if (sortBy === 'a-z') {
      return a.name.localeCompare(b.name);
    }
    return 0;
  });