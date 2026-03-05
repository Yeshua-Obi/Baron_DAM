import React from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { X, Download, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { getCategoryColor, formatFileSize, formatDate } from '../../lib/utils';

export const AssetViewer = ({ asset, open, onOpenChange, onPrevious, onNext, hasPrevious, hasNext }) => {
  if (!asset) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 bg-[#0A0A0A] border border-white/10 overflow-hidden flex flex-col">
        <DialogTitle className="sr-only">Asset Viewer</DialogTitle>
        <DialogDescription className="sr-only">Viewing {asset.name}</DialogDescription>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h3 className="text-[#F5F5F0] text-lg font-light truncate">{asset.name}</h3>
          <button onClick={() => onOpenChange(false)} className="p-2 text-white/50 hover:text-white"><X /></button>
        </div>
        <div className="flex-1 flex overflow-hidden bg-black relative justify-center items-center">
           {hasPrevious && <button onClick={onPrevious} className="absolute left-4 p-4 bg-black/40 text-white"><ChevronLeft /></button>}
           {hasNext && <button onClick={onNext} className="absolute right-4 p-4 bg-black/40 text-white"><ChevronRight /></button>}
           <img src={asset.file_url} className="max-w-full max-h-full object-contain" />
        </div>
      </DialogContent>
    </Dialog>
  );
};