import { useEffect, useState } from 'react';
import { useMatchStore } from './store/matchStore';
import { parsePlaylistFromURL } from './utils/playlistImporter';
import ImportPage from './pages/ImportPage';
import AnalysisPage from './pages/AnalysisPage';
import PlayerPage from './pages/PlayerPage';
import SharePlayerView from './pages/SharePlayerView';

function App() {
  const match = useMatchStore((state) => state.match);
  const [directPlayerView, setDirectPlayerView] = useState<string | null>(null);
  const [isShareMode, setIsShareMode] = useState(false);

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
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {match === null ? (
        <ImportPage />
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
