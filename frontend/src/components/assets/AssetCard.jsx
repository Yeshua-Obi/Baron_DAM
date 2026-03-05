import React from 'react';
import { Image as ImageIcon, FileText, Video, Maximize2 } from 'lucide-react';
import { getCategoryColor, formatFileSize } from '../../lib/utils';

export const AssetCard = ({ asset, onClick, index = 0 }) => {
  const FileIcon = asset.file_type === 'video' ? Video : asset.file_type === 'image' ? ImageIcon : FileText;

  return (
    <button onClick={() => onClick(asset)} className={`group block w-full text-left animate-fade-in stagger-${(index % 6) + 1}`}>
      <div className="card-hover border border-white/5 bg-[#121212] overflow-hidden">
        <div className="aspect-square relative overflow-hidden image-hover">
          {asset.file_type === 'image' ? (
            <img src={asset.file_url} alt={asset.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[#1F1F1F] flex items-center justify-center">
              <FileIcon className="w-12 h-12 text-white/10" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Maximize2 className="w-8 h-8 text-white/80" />
          </div>
          <div className="absolute top-3 left-3">
            <span className={`tag-pill ${getCategoryColor(asset.ai_category)}`}>{asset.ai_category}</span>
          </div>
        </div>
        <div className="p-4">
          <h4 className="text-sm text-[#F5F5F0] truncate mb-2 font-light">{asset.name}</h4>
          <div className="flex items-center justify-between text-[10px] font-mono uppercase text-white/30">
            <span>{formatFileSize(asset.size_bytes)}</span>
          </div>
        </div>
      </div>
    </button>
  );
};