import { useState } from 'react';
import type { Notebook, NotebookPage } from '../../types';

const NOTEBOOK_COLORS = [
  '#6366f1', // indigo
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // rose
  '#0ea5e9', // sky
  '#8b5cf6', // violet
  '#ec4899', // pink
];

const NOTEBOOK_ICONS = ['📓', '📔', '📒', '📕', '📗', '📘', '📙', '🗒️', '✏️', '🎨'];

interface NotebookSidebarProps {
  notebooks: Notebook[];
  pages: NotebookPage[];
  selectedNotebookId: string | null;
  selectedPageId: string | null;
  onSelectNotebook: (id: string) => void;
  onSelectPage: (id: string) => void;
  onCreateNotebook: (name: string, color: string, icon: string) => void;
  onCreatePage: () => void;
  onDeleteNotebook: (id: string) => void;
  onDeletePage: (id: string) => void;
  user: { name?: string; email?: string; avatarUrl?: string } | null;
  onSignOut: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function NotebookSidebar({
  notebooks,
  pages,
  selectedNotebookId,
  selectedPageId,
  onSelectNotebook,
  onSelectPage,
  onCreateNotebook,
  onCreatePage,
  onDeleteNotebook,
  onDeletePage,
  user,
  onSignOut,
  isOpen,
  onClose,
}: NotebookSidebarProps) {
  const [showNewNotebook, setShowNewNotebook] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(NOTEBOOK_COLORS[0]);
  const [newIcon, setNewIcon] = useState('📓');

  const handleCreateNotebook = () => {
    if (!newName.trim()) return;
    onCreateNotebook(newName.trim(), newColor, newIcon);
    setNewName('');
    setNewColor(NOTEBOOK_COLORS[0]);
    setNewIcon('📓');
    setShowNewNotebook(false);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={[
          'fixed lg:static inset-y-0 left-0 z-30 w-72 bg-white border-r border-gray-100',
          'flex flex-col shadow-xl lg:shadow-none',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        {/* Header */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📓</span>
              <h1 className="font-bold text-gray-900 text-lg tracking-tight">The Notebook</h1>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Close sidebar"
            >
              ✕
            </button>
          </div>

          {/* User info */}
          {user ? (
            <div className="flex items-center gap-3">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full ring-2 ring-indigo-100" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                  {(user.name || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{user.name || user.email}</p>
                <p className="text-xs text-gray-400">Synced</p>
              </div>
              <button
                onClick={onSignOut}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50"
                title="Sign out"
              >
                ↩
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">👤</div>
              <span>Offline mode</span>
            </div>
          )}
        </div>

        {/* Notebooks list */}
        <div className="flex-1 overflow-y-auto py-3">
          {/* New notebook button */}
          <div className="px-4 mb-2">
            <button
              onClick={() => setShowNewNotebook(v => !v)}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-indigo-600 font-medium text-sm hover:bg-indigo-50 transition-colors"
            >
              <span className="text-lg leading-none">+</span>
              New Notebook
            </button>
          </div>

          {/* New notebook form */}
          {showNewNotebook && (
            <div className="mx-4 mb-3 p-4 bg-indigo-50 rounded-2xl space-y-3 shadow-sm">
              <input
                autoFocus
                type="text"
                placeholder="Notebook name…"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateNotebook()}
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-indigo-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white transition-all"
              />
              {/* Icon picker */}
              <div className="flex flex-wrap gap-1.5">
                {NOTEBOOK_ICONS.map(icon => (
                  <button
                    key={icon}
                    onClick={() => setNewIcon(icon)}
                    className={`text-lg p-1.5 rounded-lg transition-all ${newIcon === icon ? 'bg-indigo-200 scale-110' : 'hover:bg-indigo-100'}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              {/* Color picker */}
              <div className="flex gap-2">
                {NOTEBOOK_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewColor(color)}
                    style={{ backgroundColor: color }}
                    className={`w-6 h-6 rounded-full transition-all ${newColor === color ? 'scale-125 ring-2 ring-white ring-offset-1 shadow-sm' : 'hover:scale-110'}`}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateNotebook}
                  disabled={!newName.trim()}
                  className="flex-1 text-sm bg-indigo-600 text-white py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowNewNotebook(false)}
                  className="flex-1 text-sm text-gray-500 py-2 rounded-xl hover:bg-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Separator */}
          <div className="mx-4 h-px bg-gray-100 mb-2" />

          {/* Notebook list */}
          <div className="px-2">
            {notebooks.length === 0 && !showNewNotebook && (
              <div className="text-center py-10 text-gray-400">
                <div className="text-4xl mb-2">📚</div>
                <p className="text-sm">No notebooks yet.</p>
                <p className="text-xs mt-1">Create one to get started!</p>
              </div>
            )}

            {notebooks.map(nb => (
              <NotebookItem
                key={nb.id}
                notebook={nb}
                pages={nb.id === selectedNotebookId ? pages : []}
                isSelected={selectedNotebookId === nb.id}
                selectedPageId={selectedPageId}
                onSelect={() => onSelectNotebook(nb.id)}
                onSelectPage={onSelectPage}
                onCreatePage={onCreatePage}
                onDeleteNotebook={onDeleteNotebook}
                onDeletePage={onDeletePage}
              />
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}

interface NotebookItemProps {
  notebook: Notebook;
  pages: NotebookPage[];
  isSelected: boolean;
  selectedPageId: string | null;
  onSelect: () => void;
  onSelectPage: (id: string) => void;
  onCreatePage: () => void;
  onDeleteNotebook: (id: string) => void;
  onDeletePage: (id: string) => void;
}

function NotebookItem({
  notebook,
  pages,
  isSelected,
  selectedPageId,
  onSelect,
  onSelectPage,
  onCreatePage,
  onDeleteNotebook,
  onDeletePage,
}: NotebookItemProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="mb-0.5">
      {/* Notebook row */}
      <div
        className={[
          'flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer group',
          'transition-colors duration-150',
          isSelected
            ? 'bg-indigo-50 text-indigo-700'
            : 'hover:bg-gray-50 text-gray-700',
        ].join(' ')}
        onClick={onSelect}
      >
        {/* Color dot */}
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: notebook.color }}
        />
        <span className="text-lg">{notebook.icon}</span>
        <span className={`flex-1 text-sm font-medium truncate ${isSelected ? 'text-indigo-700' : ''}`}>
          {notebook.name}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={e => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-200/50 transition-all text-xs"
            title="Notebook options"
          >
            ···
          </button>
          <span className="text-gray-400 text-xs">{isSelected ? '▾' : '▸'}</span>
        </div>
      </div>

      {/* Context menu */}
      {showMenu && (
        <div className="mx-3 mb-1 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden text-sm z-10">
          <button
            onClick={() => { onDeleteNotebook(notebook.id); setShowMenu(false); }}
            className="w-full text-left px-4 py-2.5 text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2"
          >
            <span>🗑</span> Delete notebook
          </button>
          <button
            onClick={() => setShowMenu(false)}
            className="w-full text-left px-4 py-2.5 text-gray-400 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Pages (only when selected) */}
      {isSelected && (
        <div className="ml-6 mt-0.5 space-y-0.5 pb-1">
          {pages.map(page => (
            <div
              key={page.id}
              className={[
                'flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer group',
                'transition-colors duration-150 text-sm',
                selectedPageId === page.id
                  ? 'bg-indigo-100 text-indigo-700 font-medium'
                  : 'hover:bg-gray-50 text-gray-600',
              ].join(' ')}
              onClick={() => onSelectPage(page.id)}
            >
              <span className="text-xs opacity-60">📄</span>
              <span className="flex-1 truncate">{page.title || 'Untitled'}</span>
              <button
                onClick={e => { e.stopPropagation(); onDeletePage(page.id); }}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-xs p-0.5 rounded"
                title="Delete page"
              >
                ✕
              </button>
            </div>
          ))}

          {/* New page */}
          <button
            onClick={onCreatePage}
            className="flex items-center gap-2 px-3 py-2 rounded-lg w-full text-sm text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            <span className="text-base leading-none">+</span>
            <span>New Page</span>
          </button>
        </div>
      )}
    </div>
  );
}
