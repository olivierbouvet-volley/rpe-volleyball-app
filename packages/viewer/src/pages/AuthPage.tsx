/**
 * @file AuthPage.tsx
 * @description Page d'authentification VolleyVision
 * Mode : login / register / reset-password
 * Design : surface-root fond, card surface-2, bouton brand-green
 */

import { useState, type FormEvent } from 'react';
import { useAuthStore } from '../store/useAuthStore';

type AuthMode = 'login' | 'register' | 'reset';

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const { signInWithEmail, signUpWithEmail, signInWithGoogle, resetPassword, isLoading, error, clearError } =
    useAuthStore();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
      } else if (mode === 'register') {
        await signUpWithEmail(email, password, displayName);
      } else {
        await resetPassword(email);
        setResetSent(true);
      }
    } catch {
      // Erreur déjà gérée dans le store
    }
  };

  const switchMode = (next: AuthMode) => {
    clearError();
    setResetSent(false);
    setMode(next);
  };

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-4 py-12"
      style={{ backgroundColor: 'var(--surface-root)' }}
    >
      {/* ── Logo ── */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-1">
          <span className="text-primary-green">Volley</span>
          <span className="text-primary-blue">Vision</span>
        </h1>
        <p style={{ color: 'var(--text-muted)' }} className="text-sm">
          Analyse vidéo · Statistiques · Bibliothèque de matchs
        </p>
      </div>

      {/* ── Card ── */}
      <div
        className="w-full max-w-md rounded-xl p-8 shadow-lg"
        style={{
          backgroundColor: 'var(--surface-2)',
          border: '1px solid var(--surface-border)',
        }}
      >
        {/* Titre du mode */}
        <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
          {mode === 'login'    && 'Connexion'}
          {mode === 'register' && 'Créer un compte'}
          {mode === 'reset'    && 'Réinitialiser le mot de passe'}
        </h2>

        {/* Message reset envoyé */}
        {resetSent && (
          <div
            className="mb-4 px-4 py-3 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--state-success-bg)', color: 'var(--state-success)' }}
          >
            ✅ Email envoyé ! Vérifiez votre boîte de réception.
          </div>
        )}

        {/* Message d'erreur */}
        {error && (
          <div
            className="mb-4 px-4 py-3 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--state-error-bg)', color: 'var(--state-error)' }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Nom d'affichage (register seulement) */}
          {mode === 'register' && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Nom complet
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ex : Jean Dupont"
                required
                className="px-3 py-2.5 rounded-lg text-sm transition-colors"
                style={{
                  backgroundColor: 'var(--surface-3)',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            </div>
          )}

          {/* Email */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
              autoComplete="email"
              className="px-3 py-2.5 rounded-lg text-sm transition-colors"
              style={{
                backgroundColor: 'var(--surface-3)',
                border: '1px solid var(--border-strong)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>

          {/* Mot de passe (pas sur reset) */}
          {mode !== 'reset' && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? '6 caractères minimum' : '••••••••'}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={mode === 'register' ? 6 : undefined}
                className="px-3 py-2.5 rounded-lg text-sm transition-colors"
                style={{
                  backgroundColor: 'var(--surface-3)',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            </div>
          )}

          {/* Lien reset password (login seulement) */}
          {mode === 'login' && (
            <button
              type="button"
              onClick={() => switchMode('reset')}
              className="text-xs text-left transition-colors"
              style={{ color: 'var(--text-link)' }}
            >
              Mot de passe oublié ?
            </button>
          )}

          {/* Bouton principal */}
          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 py-3 px-4 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--brand-green)',
              color: '#fff',
            }}
          >
            {isLoading
              ? 'Chargement…'
              : mode === 'login'
              ? 'Se connecter'
              : mode === 'register'
              ? 'Créer mon compte'
              : 'Envoyer le lien'}
          </button>
        </form>

        {/* Séparateur + Google (pas sur reset) */}
        {mode !== 'reset' && (
          <>
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--surface-border)' }} />
              <span className="text-xs" style={{ color: 'var(--text-disabled)' }}>
                ou
              </span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--surface-border)' }} />
            </div>

            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              style={{
                backgroundColor: 'var(--surface-3)',
                border: '1px solid var(--border-strong)',
                color: 'var(--text-primary)',
              }}
            >
              {/* Logo Google SVG */}
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continuer avec Google
            </button>
          </>
        )}

        {/* Liens de navigation entre modes */}
        <div className="mt-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          {mode === 'login' && (
            <>
              Pas encore de compte ?{' '}
              <button
                type="button"
                onClick={() => switchMode('register')}
                className="font-medium transition-colors"
                style={{ color: 'var(--brand-blue)' }}
              >
                S'inscrire
              </button>
            </>
          )}
          {mode === 'register' && (
            <>
              Déjà un compte ?{' '}
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="font-medium transition-colors"
                style={{ color: 'var(--brand-blue)' }}
              >
                Se connecter
              </button>
            </>
          )}
          {mode === 'reset' && (
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="font-medium transition-colors"
              style={{ color: 'var(--brand-blue)' }}
            >
              ← Retour à la connexion
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <p className="mt-6 text-xs" style={{ color: 'var(--text-disabled)' }}>
        VolleyVision · Analyse de performance volleyball
      </p>
    </div>
  );
}
