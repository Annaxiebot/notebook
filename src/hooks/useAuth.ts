import { useState, useEffect } from 'react';
import { auth, type AuthState } from '../services/auth';

export function useAuth(): AuthState & {
  signInWithGoogle: () => void;
  signOut: () => void;
  continueOffline: () => void;
  getUserId: () => string | null;
} {
  const [state, setState] = useState<AuthState>(auth.getState());

  useEffect(() => {
    return auth.subscribe(setState);
  }, []);

  return {
    ...state,
    signInWithGoogle: () => auth.signInWithGoogle(),
    signOut: () => auth.signOut(),
    continueOffline: () => auth.setOfflineMode(true),
    getUserId: () => auth.getUserId(),
  };
}
