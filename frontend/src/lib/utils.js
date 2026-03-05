import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Combines CSS classes smoothly
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Converts raw bytes into readable MB/GB
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Formats dates elegantly
export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Sets colors for architectural typologies
export function getTypologyColor(typology) {
  const colors = {
    'Residential': 'border-emerald-500/30 text-emerald-400',
    'Commercial': 'border-blue-500/30 text-blue-400',
    'Masterplan': 'border-purple-500/30 text-purple-400',
  };
  return colors[typology] || 'border-white/20 text-white/60';
}

// Sets colors for AI image categories
export function getCategoryColor(category) {
  const colors = {
    'Render': 'border-[#D4AF37]/50 text-[#D4AF37]',
    'Floor Plan': 'border-cyan-500/50 text-cyan-400',
    'Elevation': 'border-orange-500/50 text-orange-400',
    'Site Photo': 'border-green-500/50 text-green-400',
    'Sketch': 'border-pink-500/50 text-pink-400',
    'Section': 'border-violet-500/50 text-violet-400',
    'Detail': 'border-amber-500/50 text-amber-400',
    'Uncategorized': 'border-white/20 text-white/40',
  };
  return colors[category] || 'border-white/20 text-white/40';
}