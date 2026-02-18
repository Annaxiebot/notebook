import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { NotebookPage, ContentBlock, EditorMode, Stroke } from '../../types';
import Toolbar from './Toolbar';
import TextBlock from './TextBlock';
import HandwritingCanvas from './HandwritingCanvas';
import PhotoBlock from './PhotoBlock';
import CameraCapture from '../Camera/CameraCapture';
import { storage } from '../../services/storage';

interface PageEditorProps {
  page: NotebookPage;
  onPageChange: (page: NotebookPage) => void;
}

export default function PageEditor({ page, onPageChange }: PageEditorProps) {
  const [mode, setMode] = useState<EditorMode>('text');
  const [penColor, setPenColor] = useState('#1f2937');
  const [penSize, setPenSize] = useState(2);
  const [showCamera, setShowCamera] = useState(false);
  const [insertPhotoAfterBlock, setInsertPhotoAfterBlock] = useState<string | null>(null);

  // ── Page update helper ─────────────────────────────────────────────

  const updatePage = useCallback((updates: Partial<NotebookPage>) => {
    const updated: NotebookPage = { ...page, ...updates, updatedAt: Date.now() };
    onPageChange(updated);
    storage.debouncedSave(updated);
  }, [page, onPageChange]);

  const updateBlock = useCallback((blockId: string, changes: Partial<ContentBlock>) => {
    const blocks = page.blocks.map(b =>
      b.id === blockId ? { ...b, ...changes } as ContentBlock : b
    );
    updatePage({ blocks });
  }, [page.blocks, updatePage]);

  const deleteBlock = useCallback((blockId: string) => {
    const blocks = page.blocks.filter(b => b.id !== blockId);
    updatePage({ blocks });
  }, [page.blocks, updatePage]);

  const addBlockAfter = useCallback((afterId: string | null, block: ContentBlock) => {
    let blocks: ContentBlock[];
    if (afterId === null) {
      blocks = [...page.blocks, block];
    } else {
      const idx = page.blocks.findIndex(b => b.id === afterId);
      blocks = [
        ...page.blocks.slice(0, idx + 1),
        block,
        ...page.blocks.slice(idx + 1),
      ];
    }
    updatePage({ blocks });
  }, [page.blocks, updatePage]);

  // ── Block adders ───────────────────────────────────────────────────

  const addTextBlock = (afterId: string | null = null) => {
    addBlockAfter(afterId, { id: uuidv4(), type: 'text', content: '' });
    setMode('text');
  };

  const addHandwritingBlock = (afterId: string | null = null) => {
    addBlockAfter(afterId, {
      id: uuidv4(),
      type: 'handwriting',
      strokes: [],
      height: 200,
      backgroundColor: 'transparent',
    });
    setMode('draw');
  };

  const triggerCamera = (afterId: string | null = null) => {
    setInsertPhotoAfterBlock(afterId);
    setShowCamera(true);
  };

  const handleCameraCapture = (dataUrl: string, mimeType: string) => {
    setShowCamera(false);
    addBlockAfter(insertPhotoAfterBlock, {
      id: uuidv4(),
      type: 'photo',
      dataUrl,
      mimeType,
      caption: '',
    });
  };

  // ── Drag reorder (simple swap) ──────────────────────────────────────

  const moveBlockUp = (idx: number) => {
    if (idx === 0) return;
    const blocks = [...page.blocks];
    [blocks[idx - 1], blocks[idx]] = [blocks[idx], blocks[idx - 1]];
    updatePage({ blocks });
  };

  const moveBlockDown = (idx: number) => {
    if (idx >= page.blocks.length - 1) return;
    const blocks = [...page.blocks];
    [blocks[idx], blocks[idx + 1]] = [blocks[idx + 1], blocks[idx]];
    updatePage({ blocks });
  };

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Title */}
      <div className="px-6 pt-8 pb-4">
        <input
          type="text"
          value={page.title}
          onChange={e => updatePage({ title: e.target.value })}
          placeholder="Untitled"
          className="w-full text-3xl font-bold text-gray-900 outline-none placeholder:text-gray-200 bg-transparent"
        />
        <p className="text-xs text-gray-300 mt-1">
          {new Date(page.updatedAt).toLocaleString()}
        </p>
      </div>

      {/* Toolbar */}
      <Toolbar
        mode={mode}
        onModeChange={setMode}
        penColor={penColor}
        onPenColorChange={setPenColor}
        penSize={penSize}
        onPenSizeChange={setPenSize}
      />

      {/* Blocks */}
      <div className="flex-1 overflow-y-auto px-2 pb-32">
        {page.blocks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-300 gap-4">
            <span className="text-5xl">✨</span>
            <p className="text-sm">Add your first block below</p>
          </div>
        )}

        {page.blocks.map((block, idx) => (
          <div key={block.id} className="relative group mb-2">
            {/* Drag handles */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => moveBlockUp(idx)}
                className="text-gray-300 hover:text-gray-500 text-xs leading-none"
                title="Move up"
              >▲</button>
              <button
                onClick={() => moveBlockDown(idx)}
                className="text-gray-300 hover:text-gray-500 text-xs leading-none"
                title="Move down"
              >▼</button>
            </div>

            {/* Block content */}
            <div className="rounded-xl overflow-hidden border border-transparent hover:border-gray-100 transition-colors">
              {block.type === 'text' && (
                <TextBlock
                  block={block}
                  onChange={content => updateBlock(block.id, { content })}
                  onEnter={() => addTextBlock(block.id)}
                />
              )}

              {block.type === 'handwriting' && (
                <HandwritingCanvas
                  block={block}
                  isActive={mode === 'draw' || mode === 'erase'}
                  isErasing={mode === 'erase'}
                  penColor={penColor}
                  penSize={penSize}
                  onChange={(strokes: Stroke[], height?: number) => {
                    updateBlock(block.id, {
                      strokes,
                      ...(height !== undefined ? { height } : {}),
                    });
                  }}
                />
              )}

              {block.type === 'photo' && (
                <PhotoBlock
                  block={block}
                  onChange={updates => updateBlock(block.id, updates)}
                  onDelete={() => deleteBlock(block.id)}
                />
              )}
            </div>

            {/* Block delete button */}
            <button
              onClick={() => deleteBlock(block.id)}
              className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 text-xs"
              title="Delete block"
            >
              ✕
            </button>

            {/* Add block below */}
            <AddBlockRow
              onAddText={() => addTextBlock(block.id)}
              onAddDrawing={() => addHandwritingBlock(block.id)}
              onAddPhoto={() => triggerCamera(block.id)}
            />
          </div>
        ))}

        {/* Add block at end (always shown) */}
        <div className="px-4 pt-2">
          <AddBlockRow
            onAddText={() => addTextBlock(null)}
            onAddDrawing={() => addHandwritingBlock(null)}
            onAddPhoto={() => triggerCamera(null)}
            prominent
          />
        </div>
      </div>

      {/* Camera modal */}
      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onCancel={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}

interface AddBlockRowProps {
  onAddText: () => void;
  onAddDrawing: () => void;
  onAddPhoto: () => void;
  prominent?: boolean;
}

function AddBlockRow({ onAddText, onAddDrawing, onAddPhoto, prominent }: AddBlockRowProps) {
  const [expanded, setExpanded] = useState(false);

  if (prominent) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={onAddText}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
        >
          <span>+</span><span>Text</span>
        </button>
        <button
          onClick={onAddDrawing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
        >
          <span>+</span><span>Drawing</span>
        </button>
        <button
          onClick={onAddPhoto}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
        >
          <span>+</span><span>Photo</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex justify-center py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
      {expanded ? (
        <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-full shadow-sm px-2 py-1">
          <MiniBtn onClick={() => { onAddText(); setExpanded(false); }} emoji="T" label="Text" />
          <MiniBtn onClick={() => { onAddDrawing(); setExpanded(false); }} emoji="✏️" label="Draw" />
          <MiniBtn onClick={() => { onAddPhoto(); setExpanded(false); }} emoji="📷" label="Photo" />
          <MiniBtn onClick={() => setExpanded(false)} emoji="✕" label="Cancel" />
        </div>
      ) : (
        <button
          onClick={() => setExpanded(true)}
          className="text-gray-200 hover:text-indigo-400 transition-colors text-sm px-3"
          title="Add block here"
        >
          ─── + ───
        </button>
      )}
    </div>
  );
}

function MiniBtn({ onClick, emoji, label }: { onClick: () => void; emoji: string; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
      title={label}
    >
      <span>{emoji}</span>
    </button>
  );
}
