import { useEffect, useState } from 'react';
import { useMatchStore } from './store/matchStore';
import { useAuthStore } from './store/useAuthStore';
import { parsePlaylistFromURL } from './utils/playlistImporter';
import { LibraryPage } from './pages/LibraryPage';
import AnalysisPage from './pages/AnalysisPage';
import { ShareMatchView } from './pages/ShareMatchView';
import PlayerPage from './pages/PlayerPage';
import SharePlayerView from './pages/SharePlayerView';
import { AuthPage } from './pages/AuthPage';
import { OnboardingWizard } from './components/OnboardingWizard';

function App() {
  const match = useMatchStore((state) => state.match);
  const { user, isInitialized, initialize, hasCompletedOnboarding, completeOnboarding } = useAuthStore();
  const [directPlayerView, setDirectPlayerView] = useState<string | null>(null);
  const [isShareMode, setIsShareMode] = useState(false);

  // Détection lien partagé (?shareMatch=TOKEN) — avant toute auth
  const [shareMatchToken] = useState(() =>
    new URLSearchParams(window.location.search).get('shareMatch'),
  );

  // Lance l'écoute onAuthStateChanged au montage
  useEffect(() => {
    const unsubscribe = initialize();
    return unsubscribe;
  }, [initialize]);

  // Handle playlist URL parameter (full integration in PROMPT 2H)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const playlistParam = urlParams.get('playlist');

    if (playlistParam) {
      console.log('[App] Playlist parameter detected:', playlistParam);

      const playlistData = parsePlaylistFromURL(window.location.href);
      if (playlistData) {
        console.log('[App] Parsed playlist:', playlistData);
        // TODO (PROMPT 2H): Apply playlist filters and load video
      } else {
        console.error('[App] Failed to parse playlist from URL');
      }
    }
  }, []);

  // Handle player URL parameter for direct player page access
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const playerParam = urlParams.get('player');
    const shareParam = urlParams.get('share');

    if (playerParam && match) {
      setDirectPlayerView(playerParam);
      setIsShareMode(shareParam === 'true');
    }
  }, [match]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--surface-root)', color: 'var(--text-primary)' }}>
      {/* Lien de partage public — pas d'auth requise */}
      {shareMatchToken ? (
        <ShareMatchView token={shareMatchToken} />
      ) : !isInitialized ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'var(--brand-green)', borderTopColor: 'transparent' }}
            />
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Chargement…</span>
          </div>
        </div>
      ) : !user ? (
        /* Utilisateur non connecté → page Auth */
        <AuthPage />
      ) : !hasCompletedOnboarding ? (
        /* Première connexion → Wizard onboarding */
        <OnboardingWizard onComplete={completeOnboarding} />
      ) : match === null ? (
        <LibraryPage />
      ) : directPlayerView !== null ? (
        isShareMode ? (
          <SharePlayerView playerId={directPlayerView} />

        ) : (
          <PlayerPage
            playerId={directPlayerView}
            onBack={() => {
              setDirectPlayerView(null);
              window.history.replaceState({}, '', window.location.pathname);
            }}
          />
        )
      ) : (
        <AnalysisPage />
      )}
    </div>
  );
}

export default App;
