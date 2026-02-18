import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useNotebooks, usePages } from './hooks/useStorage';
import AuthScreen from './components/Auth/AuthScreen';
import NotebookSidebar from './components/Sidebar/NotebookSidebar';
import PageEditor from './components/Editor/PageEditor';
import type { NotebookPage } from './types';

const NOTEBOOK_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9',
];
const NOTEBOOK_ICONS = ['📓', '📔', '📒', '📕', '📗', '📘', '📙'];

export default function App() {
  const auth = useAuth();
  const { notebooks, createNotebook, deleteNotebook } = useNotebooks();
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<NotebookPage | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { pages, createPage, savePage, deletePage } = usePages(selectedNotebookId);

  // Auto-select first notebook
  useEffect(() => {
    if (notebooks.length > 0 && !selectedNotebookId) {
      setSelectedNotebookId(notebooks[0].id);
    }
  }, [notebooks, selectedNotebookId]);

  // Auto-select first page in notebook
  useEffect(() => {
    if (pages.length > 0 && !selectedPageId) {
      setSelectedPageId(pages[0].id);
    } else if (pages.length === 0) {
      setSelectedPageId(null);
      setCurrentPage(null);
    }
  }, [pages, selectedPageId]);

  // Load selected page
  useEffect(() => {
    if (!selectedPageId) return;
    const page = pages.find(p => p.id === selectedPageId);
    if (page) setCurrentPage(page);
  }, [selectedPageId, pages]);

  // ── Auth screen ─────────────────────────────────────────────────────

  if (auth.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-4xl animate-pulse">📓</div>
      </div>
    );
  }

  if (!auth.isAuthenticated && !auth.isOffline) {
    return (
      <AuthScreen
        onSignInGoogle={auth.signInWithGoogle}
        onContinueOffline={auth.continueOffline}
      />
    );
  }

  // ── Main app ────────────────────────────────────────────────────────

  const user = auth.user ? {
    name: auth.user.user_metadata?.full_name || auth.user.user_metadata?.name,
    email: auth.user.email,
    avatarUrl: auth.user.user_metadata?.avatar_url,
  } : null;

  const handleCreateNotebook = async (name: string, color: string, icon: string) => {
    const nb = await createNotebook(name, color, icon, auth.getUserId() ?? undefined);
    setSelectedNotebookId(nb.id);
    setSelectedPageId(null);
  };

  const handleSelectNotebook = (id: string) => {
    setSelectedNotebookId(id);
    setSelectedPageId(null);
    setCurrentPage(null);
    setSidebarOpen(false);
  };

  const handleSelectPage = (id: string) => {
    setSelectedPageId(id);
    setSidebarOpen(false);
  };

  const handleCreatePage = async () => {
    if (!selectedNotebookId) return;
    const page = await createPage(selectedNotebookId, 'Untitled', auth.getUserId() ?? undefined);
    setSelectedPageId(page.id);
    setSidebarOpen(false);
  };

  const handleDeletePage = async (id: string) => {
    await deletePage(id);
    if (selectedPageId === id) {
      setSelectedPageId(null);
      setCurrentPage(null);
    }
  };

  const handlePageChange = (updated: NotebookPage) => {
    setCurrentPage(updated);
    savePage(updated);
  };

  // Quick bootstrap: create a sample notebook if none exist
  useEffect(() => {
    if (notebooks.length === 0 && !auth.isLoading) {
      const colorIdx = Math.floor(Math.random() * NOTEBOOK_COLORS.length);
      const iconIdx = Math.floor(Math.random() * NOTEBOOK_ICONS.length);
      createNotebook('My Notes', NOTEBOOK_COLORS[colorIdx], NOTEBOOK_ICONS[iconIdx], auth.getUserId() ?? undefined);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isLoading]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-10 lg:hidden p-2 rounded-xl bg-white shadow-md text-gray-600 hover:bg-gray-50 transition-colors"
        aria-label="Open menu"
      >
        ☰
      </button>

      {/* Sidebar */}
      <NotebookSidebar
        notebooks={notebooks}
        pages={pages}
        selectedNotebookId={selectedNotebookId}
        selectedPageId={selectedPageId}
        onSelectNotebook={handleSelectNotebook}
        onSelectPage={handleSelectPage}
        onCreateNotebook={handleCreateNotebook}
        onCreatePage={handleCreatePage}
        onDeleteNotebook={deleteNotebook}
        onDeletePage={handleDeletePage}
        user={user}
        onSignOut={auth.signOut}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Editor area */}
      <main className="flex-1 min-w-0 overflow-hidden">
        {currentPage ? (
          <PageEditor
            key={currentPage.id}
            page={currentPage}
            onPageChange={handlePageChange}
          />
        ) : (
          <EmptyState
            hasNotebook={!!selectedNotebookId}
            onCreatePage={handleCreatePage}
          />
        )}
      </main>
    </div>
  );
}

function EmptyState({ hasNotebook, onCreatePage }: { hasNotebook: boolean; onCreatePage: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="text-6xl mb-4">📝</div>
      <h2 className="text-2xl font-semibold text-gray-700 mb-2">
        {hasNotebook ? 'No page selected' : 'Welcome!'}
      </h2>
      <p className="text-gray-400 mb-6 max-w-xs">
        {hasNotebook
          ? 'Select a page from the sidebar or create a new one.'
          : 'Create your first notebook to get started.'}
      </p>
      {hasNotebook && (
        <button
          onClick={onCreatePage}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 active:scale-95 transition-all shadow-sm"
        >
          + New Page
        </button>
      )}
    </div>
  );
}
