import { supabase } from './supabase';
import type { User, Session } from '@supabase/supabase-js';

export type AuthState = {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isOffline: boolean;  // user chose offline mode
  isLoading: boolean;
};

const OFFLINE_MODE_KEY = 'notebook_offline_mode';

class AuthService {
  private state: AuthState = {
    user: null,
    session: null,
    isAuthenticated: false,
    isOffline: localStorage.getItem(OFFLINE_MODE_KEY) === 'true',
    isLoading: true,
  };

  private listeners: Set<(state: AuthState) => void> = new Set();

  constructor() {
    this.initialize();
  }

  private async initialize() {
    if (!supabase) {
      this.state.isLoading = false;
      this.notify();
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    this.updateState(session);

    supabase.auth.onAuthStateChange((_event, session) => {
      this.updateState(session);
    });
  }

  private updateState(session: Session | null) {
    this.state = {
      ...this.state,
      user: session?.user || null,
      session,
      isAuthenticated: !!session,
      isLoading: false,
    };
    this.notify();
  }

  private notify() {
    this.listeners.forEach(l => l({ ...this.state }));
  }

  getState(): AuthState {
    return { ...this.state };
  }

  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  async signInWithGoogle(): Promise<void> {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/notebook/`,
      },
    });
  }

  async signOut(): Promise<void> {
    if (supabase) {
      await supabase.auth.signOut();
    }
    this.setOfflineMode(false);
    this.state = {
      ...this.state,
      user: null,
      session: null,
      isAuthenticated: false,
      isOffline: false,
    };
    this.notify();
  }

  setOfflineMode(offline: boolean) {
    localStorage.setItem(OFFLINE_MODE_KEY, String(offline));
    this.state = { ...this.state, isOffline: offline, isLoading: false };
    this.notify();
  }

  isReady(): boolean {
    return !this.state.isLoading && (
      this.state.isAuthenticated ||
      this.state.isOffline
    );
  }

  getUserId(): string | null {
    return this.state.user?.id || null;
  }
}

export const auth = new AuthService();

// Convenience exports
export const signInWithGoogle = () => auth.signInWithGoogle();
export const signOut = () => auth.signOut();
export const onAuthChange = (cb: (state: AuthState) => void) => auth.subscribe(cb);
