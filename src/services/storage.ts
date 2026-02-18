import type { Notebook, NotebookPage } from '../types';

const DB_NAME = 'NotebookDB';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('notebooks')) {
        const nbStore = db.createObjectStore('notebooks', { keyPath: 'id' });
        nbStore.createIndex('userId', 'userId', { unique: false });
      }

      if (!db.objectStoreNames.contains('pages')) {
        const pageStore = db.createObjectStore('pages', { keyPath: 'id' });
        pageStore.createIndex('notebookId', 'notebookId', { unique: false });
        pageStore.createIndex('userId', 'userId', { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txGet<T>(db: IDBDatabase, store: string, key: string): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

function txGetAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txGetByIndex<T>(db: IDBDatabase, store: string, index: string, value: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).index(index).getAll(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txPut<T>(db: IDBDatabase, store: string, value: T): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function txDelete(db: IDBDatabase, store: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

class NotebookStorage {
  private dbPromise: Promise<IDBDatabase>;
  private saveTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor() {
    this.dbPromise = openDB();
  }

  // ── Notebooks ──────────────────────────────────────────────

  async getNotebooks(): Promise<Notebook[]> {
    const db = await this.dbPromise;
    const nbs = await txGetAll<Notebook>(db, 'notebooks');
    return nbs.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async saveNotebook(nb: Notebook): Promise<void> {
    const db = await this.dbPromise;
    await txPut(db, 'notebooks', nb);
  }

  async deleteNotebook(id: string): Promise<void> {
    const db = await this.dbPromise;
    // Delete all pages in this notebook first
    const pages = await txGetByIndex<NotebookPage>(db, 'pages', 'notebookId', id);
    for (const page of pages) {
      await txDelete(db, 'pages', page.id);
    }
    await txDelete(db, 'notebooks', id);
  }

  // ── Pages ──────────────────────────────────────────────────

  async getPagesForNotebook(notebookId: string): Promise<NotebookPage[]> {
    const db = await this.dbPromise;
    const pages = await txGetByIndex<NotebookPage>(db, 'pages', 'notebookId', notebookId);
    return pages.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async getPage(id: string): Promise<NotebookPage | null> {
    const db = await this.dbPromise;
    return txGet<NotebookPage>(db, 'pages', id);
  }

  async savePage(page: NotebookPage): Promise<void> {
    const db = await this.dbPromise;
    await txPut(db, 'pages', page);
  }

  async deletePage(id: string): Promise<void> {
    const db = await this.dbPromise;
    await txDelete(db, 'pages', id);
  }

  // ── Debounced auto-save ───────────────────────────────────

  debouncedSave(page: NotebookPage, delay = 500): void {
    const existing = this.saveTimers.get(page.id);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(async () => {
      await this.savePage(page);
      this.saveTimers.delete(page.id);
    }, delay);
    this.saveTimers.set(page.id, timer);
  }
}

export const storage = new NotebookStorage();
