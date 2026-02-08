/**
 * @file VideoPlayer.tsx
 * @description YouTube video player with custom controls for DVW synchronization
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useYouTubePlayer } from '../hooks/useYouTubePlayer';
import { useVideoStore } from '../store/videoStore';
import { useMatchStore } from '../store/matchStore';
import { formatVideoTime, isValidYouTubeUrl } from '../utils/videoHelpers';
import { isRallyInTimeRange } from '../utils/timelineHelpers';

const PLAYER_CONTAINER_ID = 'youtube-player-container';

/**
 * VideoPlayer component with custom controls
 * Integrates YouTube IFrame API with DVW synchronization
 */
export function VideoPlayer() {
  const {
    youtubeUrl,
    videoId,
    isPlaying,
    currentTime,
    duration,
    offset,
    setYoutubeUrl,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    registerSeekFunction,
    clearVideo,
  } = useVideoStore();

  const { match } = useMatchStore();

  const [urlInput, setUrlInput] = useState(youtubeUrl || '');
  const [isSeeking, setIsSeeking] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const timeUpdateIntervalRef = useRef<number | null>(null);
  const loadingTimeoutRef = useRef<number | null>(null);

  // Initialize YouTube player
  const {
    isReady,
    play,
    pause,
    seekTo,
    getCurrentTime,
    getDuration,
    getPlayerState,
  } = useYouTubePlayer({
    videoId: videoId || '',
    containerId: PLAYER_CONTAINER_ID,
    autoplay: false,
    controls: false, // Use custom controls
    onReady: async () => {
      console.log('[VideoPlayer] Player ready');
      setLoadingTimeout(false);
      setPlayerError(null);
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }

      // Retry getting duration until it's available
      const tryGetDuration = async (attempts = 0): Promise<void> => {
        const dur = await getDuration();
        if (dur > 0) {
          setDuration(dur);
        } else if (attempts < 10) {
          setTimeout(() => tryGetDuration(attempts + 1), 200);
        }
      };
      tryGetDuration();
    },
    onStateChange: async (state) => {
      // YT.PlayerState: UNSTARTED=-1, ENDED=0, PLAYING=1, PAUSED=2, BUFFERING=3, CUED=5
      setIsPlaying(state === 1);

      // Try to get duration when state changes (if not already set)
      if (duration === 0) {
        const dur = await getDuration();
        if (dur > 0) {
          setDuration(dur);
        }
      }
    },
    onError: (errorCode) => {
      console.error('[VideoPlayer] YouTube Error:', errorCode);
      const errorMessages: Record<number, string> = {
        2: 'Paramètre de requête invalide. Vérifiez l\'URL de la vidéo.',
        5: 'Erreur du lecteur HTML5. Essayez de recharger la page.',
        100: 'Vidéo introuvable ou supprimée.',
        101: 'Le propriétaire de cette vidéo n\'autorise pas la lecture intégrée.',
        150: 'Le propriétaire de cette vidéo n\'autorise pas la lecture intégrée.',
      };
      setPlayerError(errorMessages[errorCode] || `Erreur YouTube inconnue (code ${errorCode})`);
      setLoadingTimeout(false);
    },
  });

  // Loading timeout - show error if player doesn't load within 15 seconds
  useEffect(() => {
    if (videoId && !isReady) {
      setLoadingTimeout(false);
      loadingTimeoutRef.current = window.setTimeout(() => {
        setLoadingTimeout(true);
      }, 15000);
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, [videoId, isReady]);

  // Register seekTo function in videoStore when player is ready
  useEffect(() => {
    if (isReady && seekTo) {
      registerSeekFunction(seekTo);
    }
    return () => {
      // Clear on unmount
      registerSeekFunction(() => {});
    };
  }, [isReady, seekTo, registerSeekFunction]);

  // Update current time periodically when playing
  useEffect(() => {
    if (isPlaying && isReady && !isSeeking) {
      timeUpdateIntervalRef.current = window.setInterval(async () => {
        const time = await getCurrentTime();
        setCurrentTime(time);
      }, 100); // Update every 100ms for smooth progress bar
    } else {
      if (timeUpdateIntervalRef.current !== null) {
        clearInterval(timeUpdateIntervalRef.current);
        timeUpdateIntervalRef.current = null;
      }
    }

    return () => {
      if (timeUpdateIntervalRef.current !== null) {
        clearInterval(timeUpdateIntervalRef.current);
      }
    };
  }, [isPlaying, isReady, isSeeking, getCurrentTime, setCurrentTime]);

  // Handle URL submit
  const handleUrlSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (isValidYouTubeUrl(urlInput)) {
      setYoutubeUrl(urlInput);
    } else {
      alert('Invalid YouTube URL. Please enter a valid URL.');
    }
  }, [urlInput, setYoutubeUrl]);

  // Handle play/pause toggle
  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  // Skip forward/backward
  const handleSkip = useCallback((seconds: number) => {
    const newTime = Math.max(0, Math.min(currentTime + seconds, duration));
    seekTo(newTime);
    setCurrentTime(newTime);
  }, [currentTime, duration, seekTo, setCurrentTime]);

  // Handle seek bar interaction
  const handleSeekStart = useCallback(() => {
    setIsSeeking(true);
  }, []);

  const handleSeekChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
  }, [setCurrentTime]);

  const handleSeekEnd = useCallback(() => {
    seekTo(currentTime);
    setIsSeeking(false);
  }, [seekTo, currentTime]);

  // Keyboard shortcuts for video navigation
  useEffect(() => {
    if (!isReady) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          handleSkip(-1); // Reculer 1 seconde
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSkip(1); // Avancer 1 seconde
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleSkip(-10); // Reculer 10 secondes
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleSkip(10); // Avancer 10 secondes
          break;
        case ' ':
        case 'k':
          e.preventDefault();
          handlePlayPause(); // Play/Pause avec Espace ou K
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [isReady, handleSkip, handlePlayPause]);

  // Find current rally and score based on video time
  const currentScore = useMemo(() => {
    if (!match || !isReady) {
      return null;
    }

    // Get all rallies from all sets
    const allRallies = match.sets.flatMap((set) => set.rallies);

    // Debug: check if rallies have timestamps
    const ralliesWithTimestamps = allRallies.filter(r => r.videoTimestamp != null);
    console.log('[VideoPlayer] Total rallies:', allRallies.length, 'With timestamps:', ralliesWithTimestamps.length);
    console.log('[VideoPlayer] Current time:', currentTime, 'Offset:', offset);

    // Find the active rally
    const activeRally = allRallies.find((rally) =>
      isRallyInTimeRange(rally, currentTime, offset)
    );

    if (activeRally) {
      console.log('[VideoPlayer]  Found active rally, using scoreAfter');
      return {
        home: activeRally.homeScoreAfter,
        away: activeRally.awayScoreAfter,
        setNumber: activeRally.setNumber,
      };
    }

    // If no active rally, find the last rally before current time
    const ralliesBeforeCurrent = allRallies.filter((rally) => {
      if (rally.videoTimestamp == null) return false;
      return rally.videoTimestamp + offset <= currentTime;
    });

    console.log('[VideoPlayer] Rallies before current time:', ralliesBeforeCurrent.length);

    // Use the last rally's scoreAfter
    if (ralliesBeforeCurrent.length > 0) {
      const lastRally = ralliesBeforeCurrent[ralliesBeforeCurrent.length - 1];
      console.log('[VideoPlayer]  Using last rally score:', lastRally.homeScoreAfter, '-', lastRally.awayScoreAfter);
      return {
        home: lastRally.homeScoreAfter,
        away: lastRally.awayScoreAfter,
        setNumber: lastRally.setNumber,
      };
    }

    // Fallback: show 0-0 for first set if no rallies found yet
    console.log('[VideoPlayer] No rallies before current time, showing 0-0');
    return {
      home: 0,
      away: 0,
      setNumber: 1,
    };
  }, [match, currentTime, offset, isReady]);

  if (!videoId) {
    return (
      <div className="flex flex-col gap-4 p-6 bg-slate-800 rounded-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">YouTube Video Player</h3>
          <span className="text-xs text-slate-500">No video loaded</span>
        </div>
        <p className="text-sm text-slate-400">
          Enter a YouTube URL to sync with the match data
        </p>
        <form onSubmit={handleUrlSubmit} className="flex flex-col gap-2">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium text-sm transition-colors"
          >
            Load Video
          </button>
        </form>
        <div className="text-xs text-slate-500 border-t border-slate-700 pt-3">
          Supported formats: youtube.com/watch?v=..., youtu.be/..., youtube.com/embed/...
        </div>
      </div>
    );
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex flex-col gap-2 bg-slate-800 rounded-lg overflow-hidden">
      {/* Video container */}
      <div className="relative aspect-video bg-black">
        <div
          id={PLAYER_CONTAINER_ID}
          className="absolute inset-0"
          style={{ width: '100%', height: '100%' }}
        />
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black text-slate-400">
            <div className="flex flex-col items-center gap-3 max-w-md px-4 text-center">
              {!loadingTimeout && !playerError ? (
                <>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                  <span className="text-sm">Chargement du lecteur...</span>
                </>
              ) : (
                <>
                  <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-semibold text-red-400">
                    {playerError || 'Échec du chargement de la vidéo'}
                  </span>
                  {!playerError && (
                    <span className="text-xs text-slate-500">
                      La vidéo n'a pas pu être chargée. Vérifiez l'URL ou essayez une autre vidéo.
                    </span>
                  )}
                  {playerError && playerError.includes('intégrée') && (
                    <div className="mt-2 p-3 bg-amber-900/20 border border-amber-700 rounded text-xs text-amber-300">
                      <p className="font-semibold mb-1">💡 Solution :</p>
                      <p>Le propriétaire a désactivé l'intégration. Essayez une autre vidéo ou demandez l'autorisation d'intégration.</p>
                    </div>
                  )}
                </>
              )}
              <button
                onClick={() => {
                  setUrlInput('');
                  clearVideo();
                  setLoadingTimeout(false);
                  setPlayerError(null);
                }}
                className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-medium transition-colors"
              >
                {loadingTimeout || playerError ? 'Changer la vidéo' : 'Annuler'}
              </button>
            </div>
          </div>
        )}

        {/* Score overlay - top right (tennis-style compact) */}
        {isReady && currentScore && match && (
          <div className="absolute top-2 right-2 bg-slate-900/95 backdrop-blur-sm border border-slate-600 rounded px-2 py-1 shadow-lg">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-300 font-medium min-w-[30px]">{match.homeTeam.name.substring(0, 3).toUpperCase()}</span>
              <span className="text-white font-bold tabular-nums">{currentScore.home}</span>
              <span className="text-slate-500">-</span>
              <span className="text-white font-bold tabular-nums">{currentScore.away}</span>
              <span className="text-slate-300 font-medium min-w-[30px]">{match.awayTeam.name.substring(0, 3).toUpperCase()}</span>
              <span className="text-slate-500 ml-1">•</span>
              <span className="text-slate-400 text-[10px]">S{currentScore.setNumber}</span>
            </div>
          </div>
        )}
      </div>

      {/* Custom controls */}
      {isReady && (
        <div className="flex flex-col gap-3 p-4">
          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-400 min-w-[45px]">
              {formatVideoTime(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration}
              step="0.1"
              value={currentTime}
              onChange={handleSeekChange}
              onMouseDown={handleSeekStart}
              onMouseUp={handleSeekEnd}
              onTouchStart={handleSeekStart}
              onTouchEnd={handleSeekEnd}
              className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                       [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-blue-500
                       [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                       [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
                       [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:rounded-full
                       [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${progressPercent}%, #334155 ${progressPercent}%, #334155 100%)`,
              }}
            />
            <span className="text-xs font-mono text-slate-400 min-w-[45px]">
              {formatVideoTime(duration)}
            </span>
          </div>

          {/* Control buttons */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => handleSkip(-10)}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded transition-colors text-sm font-medium"
              title="Rewind 10 seconds"
            >
              -10s
            </button>
            <button
              onClick={handlePlayPause}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors font-medium flex items-center gap-2"
            >
              {isPlaying ? (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z" />
                  </svg>
                  Pause
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6 4l10 6-10 6V4z" />
                  </svg>
                  Play
                </>
              )}
            </button>
            <button
              onClick={() => handleSkip(10)}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded transition-colors text-sm font-medium"
              title="Forward 10 seconds"
            >
              +10s
            </button>
          </div>

          {/* Change video URL */}
          <div className="pt-2 border-t border-slate-700">
            <details className="group">
              <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-300 transition-colors flex items-center gap-2">
                <svg className="w-4 h-4 group-open:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Change video URL
              </summary>
              <form onSubmit={handleUrlSubmit} className="flex flex-col gap-2 mt-2">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors"
                >
                  Load New Video
                </button>
              </form>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}
