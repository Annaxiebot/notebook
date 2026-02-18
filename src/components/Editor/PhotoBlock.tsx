import { useState } from 'react';
import type { PhotoBlock as PhotoBlockType } from '../../types';

interface PhotoBlockProps {
  block: PhotoBlockType;
  onChange: (updates: Partial<PhotoBlockType>) => void;
  onDelete: () => void;
}

export default function PhotoBlock({ block, onChange, onDelete }: PhotoBlockProps) {
  const [editingCaption, setEditingCaption] = useState(false);

  return (
    <div className="relative group rounded-xl overflow-hidden bg-gray-50">
      <img
        src={block.dataUrl}
        alt={block.caption || 'Note photo'}
        className="w-full object-contain max-h-96 rounded-xl"
        style={{ width: block.width ? `${block.width}%` : '100%' }}
      />

      {/* Overlay actions */}
      <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onDelete}
          className="p-1.5 bg-white/90 rounded-lg shadow text-red-400 hover:text-red-600 text-sm"
          title="Delete photo"
        >
          🗑
        </button>
      </div>

      {/* Caption */}
      {editingCaption ? (
        <input
          autoFocus
          type="text"
          value={block.caption || ''}
          onChange={e => onChange({ caption: e.target.value })}
          onBlur={() => setEditingCaption(false)}
          onKeyDown={e => e.key === 'Enter' && setEditingCaption(false)}
          className="w-full px-3 py-2 text-sm text-gray-600 bg-white/90 outline-none border-t border-gray-200"
          placeholder="Add a caption..."
        />
      ) : (
        <div
          className="px-3 py-1.5 text-sm text-gray-400 cursor-text hover:text-gray-600 transition-colors"
          onClick={() => setEditingCaption(true)}
        >
          {block.caption || <span className="opacity-50">Add caption...</span>}
        </div>
      )}
    </div>
  );
}
