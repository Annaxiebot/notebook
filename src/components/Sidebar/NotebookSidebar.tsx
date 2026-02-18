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
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30 w-72 bg-white border-r border-gray-100
          flex flex-col shadow-xl lg:shadow-none
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📓</span>
              <h1 className="font-bold text-gray-900 text-lg">The Notebook</h1>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* User info */}
          {user ? (
            <div className="flex items-center gap-3">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm">
                  {(user.name || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{user.name || user.email}</p>
              </div>
              <button
                onClick={onSignOut}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                title="Sign out"
              >
                ↩
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-400">
              <span className="text-lg">👤</span>
              <span className="text-sm">Offline mode</span>
            </div>
          )}
        </div>

        {/* Notebooks list */}
        <div className="flex-1 overflow-y-auto py-3">
          <div className="px-4 mb-2">
            <button
              onClick={() => setShowNewNotebook(true)}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-indigo-600 font-medium text-sm hover:bg-indigo-50 transition-colors"
            >
              <span className="text-lg">+</span>
              New Notebook
            </button>
          </div>

          {/* New notebook form */}
          {showNewNotebook && (
            <div className="mx-4 mb-3 p-3 bg-indigo-50 rounded-xl space-y-2">
              <input
                autoFocus
                type="text"
                placeholder="Notebook name..."
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateNotebook()}
                className="w-full text-sm px-3 py-2 rounded-lg border border-indigo-200 outline-none focus:border-indigo-400 bg-white"
              />
              {/* Icon picker */}
              <div className="flex flex-wrap gap-1">
                {NOTEBOOK_ICONS.map(icon => (
                  <button
                    key={icon}
                    onClick={() => setNewIcon(icon)}
                    className={`text-lg p-1 rounded-lg transition-colors ${newIcon === icon ? 'bg-indigo-200' : 'hover:bg-indigo-100'}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              {/* Color picker */}
              <div className="flex gap-1.5">
                {NOTEBOOK_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewColor(color)}
                    style={{ backgroundColor: color }}
                    className={`w-5 h-5 rounded-full transition-transform ${newColor === color ? 'scale-125 ring-2 ring-white ring-offset-1' : ''}`}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateNotebook}
                  disabled={!newName.trim()}
                  className="flex-1 text-sm bg-indigo-600 text-white py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowNewNotebook(false)}
                  className="flex-1 text-sm text-gray-500 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="px-2">
            {notebooks.length === 0 && !showNewNotebook && (
              <p className="text-center text-sm text-gray-400 py-8">
                No notebooks yet.<br />Create one to get started!
              </p>
            )}

            {notebooks.map(nb => (
              <NotebookItem
                key={nb.id}
                notebook={nb}
                pages={pages}
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
    <div className="mb-1">
      {/* Notebook row */}
      <div
        className={`
          flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer group
          transition-colors duration-150
          ${isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'}
        `}
        onClick={onSelect}
      >
        <span className="text-xl">{notebook.icon}</span>
        <span
          className="flex-1 text-sm font-medium truncate"
          style={{ color: isSelected ? notebook.color : '#374151' }}
        >
          {notebook.name}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={e => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="p-1 rounded text-gray-400 hover:text-gray-600 text-xs"
          >
            ···
          </button>
        </div>
        <span className="text-gray-400 text-xs">{isSelected ? '▾' : '▸'}</span>
      </div>

      {/* Context menu */}
      {showMenu && (
        <div className="mx-3 mb-1 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden text-sm">
          <button
            onClick={() => { onDeleteNotebook(notebook.id); setShowMenu(false); }}
            className="w-full text-left px-4 py-2.5 text-red-500 hover:bg-red-50 transition-colors"
          >
            🗑 Delete notebook
          </button>
          <button
            onClick={() => setShowMenu(false)}
            className="w-full text-left px-4 py-2.5 text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Pages */}
      {isSelected && (
        <div className="ml-5 mt-0.5 space-y-0.5">
          {pages.map(page => (
            <div
              key={page.id}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer group
                transition-colors duration-150
                ${selectedPageId === page.id ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-50 text-gray-600'}
              `}
              onClick={() => onSelectPage(page.id)}
            >
              <span className="text-sm">📄</span>
              <span className="flex-1 text-sm truncate">{page.title || 'Untitled'}</span>
              <button
                onClick={e => { e.stopPropagation(); onDeletePage(page.id); }}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-xs p-0.5"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={onCreatePage}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-indigo-500 hover:bg-indigo-50 transition-colors w-full text-sm"
          >
            <span>+</span>
            <span>New Page</span>
          </button>
        </div>
      )}
    </div>
  );
}
