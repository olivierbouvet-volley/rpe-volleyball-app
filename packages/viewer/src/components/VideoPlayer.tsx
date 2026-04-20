/**
 * @file VideoPlayer.tsx
 * @description YouTube video player with custom controls for DVW synchronization
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useYouTubePlayer } from '../hooks/useYouTubePlayer';
import { useVideoStore } from '../store/videoStore';
import { useMatchStore } from '../store/matchStore';
import { useLayoutStore } from '../store/layoutStore';
import { useTeamColorStore } from '../store/teamColorStore';
import { useMatchLibraryStore } from '../store/matchLibraryStore';
import { usePopOutWindow } from '../hooks/usePopOutWindow';
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
    videoType,
    localVideoUrl,
    isPlaying,
    currentTime,
    duration,
    offset,
    setYoutubeUrl,
    setOffset,
    setLocalVideoFile,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    registerSeekFunction,
    registerPlayFunction,
    clearVideo,
  } = useVideoStore();

  const { match } = useMatchStore();
  const isVideoDetached = useLayoutStore((s) => s.isVideoDetached);
  const { homeColor, awayColor } = useTeamColorStore();
  const { currentMatchId, currentMatchOwnerId, saveMatchVideoUrl, saveMatchVideoOffset } = useMatchLibraryStore(
    (s) => ({
      currentMatchId: s.currentMatchId,
      currentMatchOwnerId: s.currentMatchOwnerId,
      saveMatchVideoUrl: s.saveMatchVideoUrl,
      saveMatchVideoOffset: s.saveMatchVideoOffset,
    }),
  );
  const { popOut, popIn } = usePopOutWindow({
    title: 'VolleyVision – Video Player',
    width: 1280,
    height: 720,
  });

  const [urlInput, setUrlInput] = useState(youtubeUrl || '');
  const [isSeeking, setIsSeeking] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [savingUrl, setSavingUrl] = useState(false);
  const [savedUrlFlash, setSavedUrlFlash] = useState(false);
  const [savingOffset, setSavingOffset] = useState(false);
  const [savedOffsetFlash, setSavedOffsetFlash] = useState(false);
  const timeUpdateIntervalRef = useRef<number | null>(null);
  const loadingTimeoutRef = useRef<number | null>(null);
  /** Ref sur l'élément <video> HTML5 pour la lecture locale */
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  // Initialize YouTube player (pass empty videoId when detached to avoid creating it)
  const {
    isReady,
    play,
    pause,
    seekTo,
    getCurrentTime,
    getDuration,
    getPlayerState,
  } = useYouTubePlayer({
    videoId: isVideoDetached ? '' : (videoId || ''),
    containerId: PLAYER_CONTAINER_ID,
    autoplay: false,
    controls: false, // Use custom controls
    onReady: async () => {
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

  // Register seekTo and play functions in videoStore when player is ready
  useEffect(() => {
    if (isReady && seekTo && !isVideoDetached) {
      registerSeekFunction(seekTo);
      registerPlayFunction(play);
    }
    return () => {
      // Only clear if NOT detaching — the proxy seekTo from usePopOutWindow takes over
      if (!useLayoutStore.getState().isVideoDetached) {
        registerSeekFunction(() => {});
        registerPlayFunction(() => {});
      }
    };
  }, [isReady, seekTo, play, registerSeekFunction, registerPlayFunction, isVideoDetached]);

  // ── Vidéo locale : enregistrer le seek function ──
  useEffect(() => {
    if (videoType === 'local' && localVideoRef.current) {
      registerSeekFunction((seconds) => {
        if (localVideoRef.current) {
          localVideoRef.current.currentTime = seconds;
        }
      });
    }
  }, [videoType, localVideoUrl, registerSeekFunction]);

  // ── Handler : sélection d'un fichier vidéo local ──
  const handleLocalFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLocalVideoFile(file);
    }
  }, [setLocalVideoFile]);

  // Update current time periodically when playing
  useEffect(() => {
    if (isPlaying && isReady && !isSeeking) {
      timeUpdateIntervalRef.current = window.setInterval(async () => {
        const time = await getCurrentTime();
        setCurrentTime(time);
      }, 250); // Update every 250ms — smooth enough, much lighter
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

    // Find the active rally
    const activeRally = allRallies.find((rally) =>
      isRallyInTimeRange(rally, currentTime, offset)
    );

    if (activeRally) {
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

    // Use the last rally's scoreAfter
    if (ralliesBeforeCurrent.length > 0) {
      const lastRally = ralliesBeforeCurrent[ralliesBeforeCurrent.length - 1];
      return {
        home: lastRally.homeScoreAfter,
        away: lastRally.awayScoreAfter,
        setNumber: lastRally.setNumber,
      };
    }

    // Fallback: show 0-0 for first set if no rallies found yet
    return {
      home: 0,
      away: 0,
      setNumber: 1,
    };
  }, [match, currentTime, offset, isReady]);

  if (isVideoDetached) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 bg-slate-800 rounded-lg min-h-[200px]">
        <svg className="w-16 h-16 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
        <p className="text-slate-400 text-sm text-center">
          Vidéo affichée dans une fenêtre séparée
        </p>
        <p className="text-slate-500 text-xs text-center">
          Les contrôles timeline et playlist restent synchronisés.
        </p>
        <button
          onClick={popIn}
          className="flex items-center gap-2 px-4 py-2 rounded-lg
                     bg-slate-700 hover:bg-slate-600 border border-slate-500
                     text-slate-200 text-sm font-medium transition-colors"
          title="Fermer la fenêtre et ramener la vidéo ici"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 8 3 3 8 3" />
            <polyline points="21 16 21 21 16 21" />
            <line x1="3" y1="3" x2="10" y2="10" />
            <line x1="21" y1="21" x2="14" y2="14" />
          </svg>
          Ramener la vidéo ici
        </button>
      </div>
    );
  }

  if (!videoId && videoType !== 'local') {
    return (
      <div className="flex flex-col gap-4 p-6 bg-slate-800 rounded-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Lecteur Vidéo</h3>
          <span className="text-xs text-slate-500">Aucune vidéo chargée</span>
        </div>

        {/* YouTube URL */}
        <form onSubmit={handleUrlSubmit} className="flex flex-col gap-2">
          <p className="text-sm text-slate-400">YouTube</p>
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium text-sm transition-colors"
          >
            Charger YouTube
          </button>
        </form>

        {/* Séparateur */}
        <div className="flex items-center gap-2 text-slate-600">
          <div className="flex-1 border-t border-slate-700" />
          <span className="text-xs">ou</span>
          <div className="flex-1 border-t border-slate-700" />
        </div>

        {/* Fichier local */}
        <div className="flex flex-col gap-2">
          <p className="text-sm text-slate-400">Fichier local (MP4, MOV, AVI...)</p>
          <label className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 border-dashed rounded cursor-pointer transition-colors text-sm font-medium text-slate-300">
            <span>📂</span>
            <span>Ouvrir une vidéo locale</span>
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleLocalFileChange}
            />
          </label>
        </div>

        <div className="text-xs text-slate-500 border-t border-slate-700 pt-3">
          Tous les contrôles (timeline, playlist, seek) fonctionnent avec les deux sources.
        </div>
      </div>
    );
  }

  // ── Lecteur vidéo LOCAL (HTML5) ──
  if (videoType === 'local' && localVideoUrl) {
    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
    return (
      <div className="flex flex-col gap-2 bg-slate-800 rounded-lg overflow-hidden">
        {/* Vidéo HTML5 */}
        <div className="relative aspect-video bg-black">
          <video
            ref={localVideoRef}
            src={localVideoUrl}
            className="absolute inset-0 w-full h-full"
            onTimeUpdate={() => {
              if (localVideoRef.current) {
                setCurrentTime(localVideoRef.current.currentTime);
              }
            }}
            onLoadedMetadata={() => {
              if (localVideoRef.current) {
                setDuration(localVideoRef.current.duration);
                // Enregistrer le seek function
                registerSeekFunction((s) => {
                  if (localVideoRef.current) localVideoRef.current.currentTime = s;
                });
              }
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        </div>

        {/* Barre de progression */}
        <div className="px-3">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            className="w-full h-1 accent-blue-500"
            onChange={(e) => {
              const t = parseFloat(e.target.value);
              setCurrentTime(t);
              if (localVideoRef.current) localVideoRef.current.currentTime = t;
            }}
          />
        </div>

        {/* Contrôles */}
        <div className="flex items-center justify-between px-3 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (localVideoRef.current) {
                  localVideoRef.current.currentTime = Math.max(0, currentTime - 10);
                }
              }}
              className="p-1 text-slate-400 hover:text-white"
              title="Reculer 10s"
            >⏮ 10s</button>
            <button
              onClick={() => {
                if (localVideoRef.current) {
                  isPlaying ? localVideoRef.current.pause() : localVideoRef.current.play();
                }
              }}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm font-bold"
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button
              onClick={() => {
                if (localVideoRef.current) {
                  localVideoRef.current.currentTime = Math.min(duration, currentTime + 10);
                }
              }}
              className="p-1 text-slate-400 hover:text-white"
              title="Avancer 10s"
            >10s ⏭</button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
            </span>
            {/* Progress */}
            <span className="text-xs text-slate-500">{Math.round(progressPercent)}%</span>
            {/* Bouton changer de fichier */}
            <label className="cursor-pointer text-xs text-blue-400 hover:text-blue-300 underline">
              Changer
              <input type="file" accept="video/*" className="hidden" onChange={handleLocalFileChange} />
            </label>
            <button
              onClick={clearVideo}
              className="text-xs text-slate-500 hover:text-red-400"
              title="Fermer la vidéo"
            >✕</button>
          </div>
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
              <div className="flex items-center gap-1">
                <span
                  className="inline-block w-3 h-3 rounded-sm border border-slate-500"
                  style={{ backgroundColor: homeColor }}
                  title={match.homeTeam.name}
                />
                <span className="text-slate-300 font-medium min-w-[30px]">
                  {match.homeTeam.code || match.homeTeam.name.substring(0, 3).toUpperCase()}
                </span>
              </div>
              <span className="font-bold tabular-nums" style={{ color: homeColor }}>{currentScore.home}</span>
              <span className="text-slate-500">-</span>
              <span className="font-bold tabular-nums" style={{ color: awayColor }}>{currentScore.away}</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-300 font-medium min-w-[30px]">
                  {match.awayTeam.code || match.awayTeam.name.substring(0, 3).toUpperCase()}
                </span>
                <span
                  className="inline-block w-3 h-3 rounded-sm border border-slate-500"
                  style={{ backgroundColor: awayColor }}
                  title={match.awayTeam.name}
                />
              </div>
              <span className="text-slate-500 ml-1">•</span>
              <span className="text-slate-400 text-[10px]">S{currentScore.setNumber}</span>
            </div>
          </div>
        )}

        {/* Pop-out overlay button — top-left corner */}
        {isReady && (
          <button
            onClick={popOut}
            title="Ouvrir dans une fenêtre séparée"
            className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2 py-1 rounded
                       bg-slate-900/80 hover:bg-slate-700/90 border border-slate-600/60
                       text-slate-400 hover:text-slate-200 transition-colors text-xs
                       backdrop-blur-sm"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
            <span>Pop-out</span>
          </button>
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

          {/* Change video URL + Save to match */}
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

              {/* Save URL to match */}
              {currentMatchId && videoId && (
                <button
                  onClick={async () => {
                    if (!currentMatchOwnerId) return;
                    setSavingUrl(true);
                    await saveMatchVideoUrl(currentMatchOwnerId, currentMatchId, youtubeUrl || '');
                    setSavingUrl(false);
                    setSavedUrlFlash(true);
                    setTimeout(() => setSavedUrlFlash(false), 2000);
                  }}
                  disabled={savingUrl}
                  className="mt-2 w-full px-3 py-2 rounded text-xs font-medium transition-colors disabled:opacity-50"
                  style={{
                    backgroundColor: savedUrlFlash ? '#16a34a' : '#1e293b',
                    border: '1px solid #334155',
                    color: savedUrlFlash ? '#fff' : '#94a3b8',
                  }}
                >
                  {savedUrlFlash ? '✓ URL enregistrée !' : savingUrl ? 'Enregistrement…' : '💾 Enregistrer l\'URL pour ce match'}
                </button>
              )}

              {/* Sync offset — always visible */}
              <div className="mt-3 pt-3 border-t border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400">🕐 Offset synchro</span>
                  <span className="text-xs font-mono text-slate-300">{offset >= 0 ? '+' : ''}{offset.toFixed(1)}s</span>
                </div>

                {/* Set offset to current video time */}
                <button
                  onClick={() => setOffset(currentTime)}
                  className="w-full mb-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-xs font-medium transition-colors"
                >
                  ▶ Caler sur le temps actuel ({Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')})
                </button>

                {/* Fine adjustment buttons */}
                <div className="flex gap-1 mb-2">
                  {([-10, -1, -0.1] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setOffset(Math.max(0, offset + d))}
                      className="flex-1 px-1 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs transition-colors"
                    >
                      {d}s
                    </button>
                  ))}
                  {([0.1, 1, 10] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setOffset(offset + d)}
                      className="flex-1 px-1 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs transition-colors"
                    >
                      +{d}s
                    </button>
                  ))}
                </div>

                {/* Reset */}
                <button
                  onClick={() => setOffset(0)}
                  className="w-full mb-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs transition-colors"
                >
                  ↺ Remettre à zéro
                </button>

                {/* Save to Firestore — only when a library match is open */}
                {currentMatchId && (
                  <button
                    onClick={async () => {
                      if (!currentMatchOwnerId) return;
                      setSavingOffset(true);
                      await saveMatchVideoOffset(currentMatchOwnerId, currentMatchId, offset);
                      setSavingOffset(false);
                      setSavedOffsetFlash(true);
                      setTimeout(() => setSavedOffsetFlash(false), 2000);
                    }}
                    disabled={savingOffset}
                    className="w-full px-3 py-2 rounded text-xs font-medium transition-colors disabled:opacity-50"
                    style={{
                      backgroundColor: savedOffsetFlash ? '#16a34a' : '#1e293b',
                      border: '1px solid #334155',
                      color: savedOffsetFlash ? '#fff' : '#94a3b8',
                    }}
                  >
                    {savedOffsetFlash ? '✓ Synchro enregistrée !' : savingOffset ? 'Enregistrement…' : '💾 Enregistrer la synchronisation'}
                  </button>
                )}
              </div>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}
