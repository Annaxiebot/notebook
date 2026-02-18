import { useState, useEffect, useCallback } from 'react';
import { storage } from '../services/storage';
import type { Notebook, NotebookPage } from '../types';
import { v4 as uuidv4 } from 'uuid';

export function useNotebooks() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const nbs = await storage.getNotebooks();
    setNotebooks(nbs);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createNotebook = useCallback(async (
    name: string,
    color = '#6366f1',
    icon = '📓',
    userId?: string
  ): Promise<Notebook> => {
    const nb: Notebook = {
      id: uuidv4(),
      name,
      color,
      icon,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      userId,
    };
    await storage.saveNotebook(nb);
    await load();
    return nb;
  }, [load]);

  const updateNotebook = useCallback(async (nb: Notebook) => {
    const updated = { ...nb, updatedAt: Date.now() };
    await storage.saveNotebook(updated);
    await load();
  }, [load]);

  const deleteNotebook = useCallback(async (id: string) => {
    await storage.deleteNotebook(id);
    await load();
  }, [load]);

  return { notebooks, loading, createNotebook, updateNotebook, deleteNotebook, reload: load };
}

export function usePages(notebookId: string | null) {
  const [pages, setPages] = useState<NotebookPage[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!notebookId) { setPages([]); return; }
    setLoading(true);
    const ps = await storage.getPagesForNotebook(notebookId);
    setPages(ps);
    setLoading(false);
  }, [notebookId]);

  useEffect(() => { load(); }, [load]);

  const createPage = useCallback(async (
    notebookId: string,
    title = 'Untitled',
    userId?: string
  ): Promise<NotebookPage> => {
    const page: NotebookPage = {
      id: uuidv4(),
      notebookId,
      title,
      blocks: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      userId,
    };
    await storage.savePage(page);
    await load();
    return page;
  }, [load]);

  const savePage = useCallback(async (page: NotebookPage) => {
    const updated = { ...page, updatedAt: Date.now() };
    await storage.savePage(updated);
    await load();
  }, [load]);

  const deletePage = useCallback(async (id: string) => {
    await storage.deletePage(id);
    await load();
  }, [load]);

  return { pages, loading, createPage, savePage, deletePage, reload: load };
}
