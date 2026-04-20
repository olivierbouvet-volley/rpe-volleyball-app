/**
 * @file useAuthStore.ts
 * @description Store Zustand pour l'authentification Firebase
 * Gère l'état user, les méthodes signIn/signOut, et l'onboarding
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  type User,
} from 'firebase/auth';
import { auth } from '../firebase';

interface AuthState {
  // ── État ──
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;   // true après le premier onAuthStateChanged
  error: string | null;
  hasCompletedOnboarding: boolean;  // false → affiche le wizard à la 1ère connexion

  // ── Actions ──
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  completeOnboarding: () => void;
  clearError: () => void;
  initialize: () => () => void;  // retourne l'unsubscribe pour le cleanup
}

const googleProvider = new GoogleAuthProvider();

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // ── État initial ──
      user: null,
      isLoading: false,
      isInitialized: false,
      error: null,
      hasCompletedOnboarding: false,

      // ── Email / Password ──
      signInWithEmail: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
          set({ error: formatAuthError(err), isLoading: false });
          throw err;
        }
      },

      signUpWithEmail: async (email, password, displayName) => {
        set({ isLoading: true, error: null });
        try {
          const credential = await createUserWithEmailAndPassword(auth, email, password);
          await updateProfile(credential.user, { displayName });
          // Nouvel utilisateur → onboarding à afficher
          set({ hasCompletedOnboarding: false });
        } catch (err) {
          set({ error: formatAuthError(err), isLoading: false });
          throw err;
        }
      },

      // ── Google Sign-In ──
      signInWithGoogle: async () => {
        set({ isLoading: true, error: null });
        try {
          const result = await signInWithPopup(auth, googleProvider);
          // Si c'est un nouvel utilisateur Google, lancer l'onboarding
          const isNewUser = result.user.metadata.creationTime === result.user.metadata.lastSignInTime;
          if (isNewUser) {
            set({ hasCompletedOnboarding: false });
          }
        } catch (err) {
          set({ error: formatAuthError(err), isLoading: false });
          throw err;
        }
      },

      // ── Sign Out ──
      signOut: async () => {
        set({ isLoading: true, error: null });
        try {
          await firebaseSignOut(auth);
          set({ user: null, hasCompletedOnboarding: false });
        } catch (err) {
          set({ error: formatAuthError(err) });
        } finally {
          set({ isLoading: false });
        }
      },

      // ── Reset Password ──
      resetPassword: async (email) => {
        set({ isLoading: true, error: null });
        try {
          await sendPasswordResetEmail(auth, email);
        } catch (err) {
          set({ error: formatAuthError(err) });
          throw err;
        } finally {
          set({ isLoading: false });
        }
      },

      // ── Onboarding ──
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),

      clearError: () => set({ error: null }),

      // ── Initialisation (écoute onAuthStateChanged) ──
      initialize: () => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          const prev = get();
          set({
            user,
            isInitialized: true,
            isLoading: false,
            // Si l'utilisateur se reconnecte (refresh page), on garde l'état onboarding persisté
            hasCompletedOnboarding: user ? prev.hasCompletedOnboarding : false,
          });
        });
        return unsubscribe;
      },
    }),
    {
      name: 'volleyvision-auth',
      // Ne persister que l'état d'onboarding — user est rechargé via onAuthStateChanged
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
      }),
    },
  ),
);

// ── Helper : messages d'erreur Firebase en français ──────────────────────────
function formatAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  const messages: Record<string, string> = {
    'auth/user-not-found':       'Aucun compte trouvé avec cet email.',
    'auth/wrong-password':       'Mot de passe incorrect.',
    'auth/email-already-in-use': 'Cet email est déjà utilisé.',
    'auth/weak-password':        'Le mot de passe doit contenir au moins 6 caractères.',
    'auth/invalid-email':        'Adresse email invalide.',
    'auth/too-many-requests':    'Trop de tentatives. Réessayez dans quelques minutes.',
    'auth/popup-closed-by-user': 'Connexion annulée.',
    'auth/network-request-failed': 'Erreur réseau. Vérifiez votre connexion.',
  };
  return messages[code] ?? 'Une erreur est survenue. Veuillez réessayer.';
}
