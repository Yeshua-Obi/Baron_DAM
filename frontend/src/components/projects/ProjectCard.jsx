import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { getTypologyColor, formatDate } from '../../lib/utils';

export const ProjectCard = ({ project, index = 0 }) => {
  return (
    <Link
      to={`/projects/${project.id}`}
      className={`group block animate-fade-in stagger-${(index % 6) + 1}`}
    >
      <div className="card-hover border border-white/5 bg-[#121212] overflow-hidden">
        {/* Thumbnail */}
        <div className="aspect-[4/3] relative overflow-hidden image-hover">
          {project.thumbnail_url ? (
            <img
              src={project.thumbnail_url}
              alt={project.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[#1F1F1F] flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-white/10" strokeWidth={1} />
            </div>
          )}
          
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-4 right-4">
              <ExternalLink className="w-5 h-5 text-white/80" strokeWidth={1.5} />
            </div>
          </div>

          {/* Typology Badge */}
          <div className="absolute top-4 left-4">
            <span className={`tag-pill ${getTypologyColor(project.typology)}`}>
              {project.typology}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="p-5">
          <h3 className="font-serif text-lg text-[#F5F5F0] group-hover:text-[#D4AF37] transition-colors duration-200 mb-2 line-clamp-1">
            {project.name}
          </h3>
          
          <div className="flex items-center gap-2 text-white/40 text-xs mb-3">
            <MapPin className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span className="truncate">{project.location}</span>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-white/30">
            <span>{project.asset_count || 0} Assets</span>
            <span>{formatDate(project.created_at)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};