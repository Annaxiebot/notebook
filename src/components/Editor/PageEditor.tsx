import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { NotebookPage, ContentBlock, EditorMode, Stroke, TextBlock as TB, HandwritingBlock as HB, PhotoBlock as PB } from '../../types';
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
  const [insertPhotoAfterId, setInsertPhotoAfterId] = useState<string | null>(null);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // ── Page update helpers ─────────────────────────────────────────────

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
    updatePage({ blocks: page.blocks.filter(b => b.id !== blockId) });
  }, [page.blocks, updatePage]);

  const insertBlockAfter = useCallback((afterId: string | null, block: ContentBlock) => {
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
    setLastAddedId(block.id);
    updatePage({ blocks });
  }, [page.blocks, updatePage]);

  // ── Block factory ───────────────────────────────────────────────────

  const addTextBlock = useCallback((afterId: string | null = null) => {
    const block: TB = { id: uuidv4(), type: 'text', content: '' };
    insertBlockAfter(afterId, block);
    setMode('text');
  }, [insertBlockAfter]);

  const addHandwritingBlock = useCallback((afterId: string | null = null) => {
    const block: HB = {
      id: uuidv4(),
      type: 'handwriting',
      strokes: [],
      height: 220,
      backgroundColor: 'transparent',
    };
    insertBlockAfter(afterId, block);
    setMode('draw');
  }, [insertBlockAfter]);

  const addPhotoBlock = useCallback((afterId: string | null = null) => {
    setInsertPhotoAfterId(afterId);
    setShowCamera(true);
  }, []);

  const handleCameraCapture = (dataUrl: string, mimeType: string) => {
    setShowCamera(false);
    const block: PB = {
      id: uuidv4(),
      type: 'photo',
      dataUrl,
      mimeType,
      caption: '',
    };
    insertBlockAfter(insertPhotoAfterId, block);
  };

  // ── Reorder ─────────────────────────────────────────────────────────

  const moveBlock = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= page.blocks.length) return;
    const blocks = [...page.blocks];
    [blocks[idx], blocks[newIdx]] = [blocks[newIdx], blocks[idx]];
    updatePage({ blocks });
  };

  // ── Render ──────────────────────────────────────────────────────────

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Page header */}
      <div className="px-6 lg:px-10 pt-8 pb-3 border-b border-gray-50">
        <input
          ref={titleRef}
          type="text"
          value={page.title}
          onChange={e => updatePage({ title: e.target.value })}
          placeholder="Untitled"
          className="w-full text-3xl lg:text-4xl font-bold text-gray-900 outline-none placeholder:text-gray-200 bg-transparent leading-tight"
        />
        <p className="text-xs text-gray-300 mt-2 select-none">
          Last edited {formatDate(page.updatedAt)}
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

      {/* Content blocks */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 lg:px-8 pb-40 pt-4 max-w-3xl mx-auto">
          {/* Empty state */}
          {page.blocks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-200 gap-3 select-none">
              <span className="text-6xl">✨</span>
              <p className="text-sm text-gray-300">Tap a button below to add your first block</p>
            </div>
          )}

          {/* Blocks */}
          {page.blocks.map((block, idx) => (
            <div key={block.id} className="relative group mb-1">
              {/* Reorder handles */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 flex-col gap-0.5 hidden lg:flex opacity-0 group-hover:opacity-100 transition-opacity select-none">
                <button
                  onClick={() => moveBlock(idx, -1)}
                  disabled={idx === 0}
                  className="text-gray-200 hover:text-gray-500 text-xs disabled:opacity-0 transition-colors"
                >▲</button>
                <button
                  onClick={() => moveBlock(idx, 1)}
                  disabled={idx === page.blocks.length - 1}
                  className="text-gray-200 hover:text-gray-500 text-xs disabled:opacity-0 transition-colors"
                >▼</button>
              </div>

              {/* Block content */}
              <div className="rounded-2xl overflow-hidden border border-transparent focus-within:border-indigo-100 hover:border-gray-100 transition-colors">
                {block.type === 'text' && (
                  <TextBlock
                    block={block}
                    onChange={content => updateBlock(block.id, { content })}
                    onEnter={() => addTextBlock(block.id)}
                    autoFocus={lastAddedId === block.id}
                  />
                )}

                {block.type === 'handwriting' && (
                  <div className="p-2 bg-amber-50/30 rounded-2xl">
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
                  </div>
                )}

                {block.type === 'photo' && (
                  <PhotoBlock
                    block={block}
                    onChange={updates => updateBlock(block.id, updates as Partial<ContentBlock>)}
                    onDelete={() => deleteBlock(block.id)}
                  />
                )}
              </div>

              {/* Block delete (top-right) */}
              <button
                onClick={() => deleteBlock(block.id)}
                className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-xl text-gray-200 hover:text-red-400 hover:bg-red-50 text-xs"
                title="Delete block"
              >
                ✕
              </button>

              {/* Insert-between row */}
              <InsertRow
                onAddText={() => addTextBlock(block.id)}
                onAddDrawing={() => addHandwritingBlock(block.id)}
                onAddPhoto={() => addPhotoBlock(block.id)}
              />
            </div>
          ))}

          {/* Persistent add-block strip at bottom */}
          <div className="mt-4 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-xs text-gray-300 mr-1 select-none">Add:</span>
              <AddBtn onClick={() => addTextBlock(null)} icon="T" label="Text" />
              <AddBtn onClick={() => addHandwritingBlock(null)} icon="✏️" label="Drawing" />
              <AddBtn onClick={() => addPhotoBlock(null)} icon="📷" label="Photo" />
            </div>
          </div>
        </div>
      </div>

      {/* Camera */}
      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onCancel={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────

interface InsertRowProps {
  onAddText: () => void;
  onAddDrawing: () => void;
  onAddPhoto: () => void;
}

function InsertRow({ onAddText, onAddDrawing, onAddPhoto }: InsertRowProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity my-0.5">
      {open ? (
        <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-full shadow-sm px-2 py-0.5 text-xs">
          <QuickBtn onClick={() => { onAddText(); setOpen(false); }} label="+ Text" />
          <QuickBtn onClick={() => { onAddDrawing(); setOpen(false); }} label="✏️ Draw" />
          <QuickBtn onClick={() => { onAddPhoto(); setOpen(false); }} label="📷 Photo" />
          <QuickBtn onClick={() => setOpen(false)} label="✕" className="text-gray-300" />
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="text-gray-200 hover:text-indigo-400 text-xs px-4 transition-colors"
        >
          ── + ──
        </button>
      )}
    </div>
  );
}

function QuickBtn({ onClick, label, className = '' }: { onClick: () => void; label: string; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 rounded-full hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-gray-500 ${className}`}
    >
      {label}
    </button>
  );
}

function AddBtn({ onClick, icon, label }: { onClick: () => void; icon: string; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 active:scale-95 transition-all"
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
