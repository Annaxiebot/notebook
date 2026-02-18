// sync.ts — Local ↔ Supabase sync (stub for future implementation)
// The app works fully offline. Sync runs in background when authenticated.

import { supabase } from './supabase';
import { storage } from './storage';
import type { Notebook, NotebookPage } from '../types';

export async function syncToCloud(userId: string): Promise<void> {
  if (!supabase) return;

  try {
    // Upload local notebooks
    const notebooks = await storage.getNotebooks();
    for (const nb of notebooks) {
      if (!nb.userId) {
        // Assign ownership
        const owned = { ...nb, userId };
        await storage.saveNotebook(owned);
      }
    }
    // Note: Full cloud sync tables (notebook_pages, notebooks) would need
    // to be created in Supabase. This is a placeholder for that logic.
    console.log('[sync] Sync placeholder — would sync', notebooks.length, 'notebooks for user', userId);
  } catch (err) {
    console.error('[sync] Error syncing to cloud:', err);
  }
}

export async function syncFromCloud(_userId: string): Promise<void> {
  if (!supabase) return;
  // Placeholder: would fetch from Supabase and merge with local
}

export type { Notebook, NotebookPage };
