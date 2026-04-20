/**
 * @file VideoPopout.tsx
 * @description Standalone video player rendered in the popup window.
 *
 * This component is mounted when the app detects ?popout=video in the URL.
 * It creates its own YouTube player and communicates with the main window
 * via BroadcastChannel for state synchronization.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useYouTubePlayer } from '../hooks/useYouTubePlayer';
import { useVideoStore } from '../store/videoStore';
import { useMatchStore } from '../store/matchStore';
import { useTeamColorStore } from '../store/teamColorStore';
import { VIDEO_CHANNEL_NAME } from '../hooks/usePopOutWindow';
import { isRallyInTimeRange } from '../utils/timelineHelpers';

const POPOUT_PLAYER_ID = 'popout-youtube-player';

export default function VideoPopout() {
  // Read persisted state from localStorage (zustand persist)
  const persistedVideoId = useVideoStore((s) => s.videoId);
  const persistedOffset = useVideoStore((s) => s.offset);
  const { homeColor, awayColor } = useTeamColorStore();

  const [videoId, setVideoId] = useState(persistedVideoId || '');
  const [initialTime, setInitialTime] = useState(0);
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const initialSeekDone = useRef(false);

  // ── YouTube player ──────────────────────────────────────────
  const {
    isReady,
    play,
    pause,
    seekTo,
    getCurrentTime,
    getDuration,
  } = useYouTubePlayer({
    videoId,
    containerId: POPOUT_PLAYER_ID,
    autoplay: false,
    controls: true, // Native YouTube controls in popup for convenience
    onReady: async () => {
      console.log('[VideoPopout] Player ready');

      // Seek to the time from main window
      if (initialTime > 0 && !initialSeekDone.current) {
        seekTo(initialTime);
        initialSeekDone.current = true;
      }

      // Send duration to main window
      const dur = await getDuration();
      if (dur > 0) {
        channelRef.current?.postMessage({ type: 'durationUpdate', duration: dur });
      }

      channelRef.current?.postMessage({ type: 'playerReady' });
    },
    onStateChange: (state) => {
      // YT states: PLAYING=1, PAUSED=2
      const isPlaying = state === 1;
      channelRef.current?.postMessage({ type: 'stateChange', isPlaying });
    },
    onError: (code) => {
      console.error('[VideoPopout] YouTube error:', code);
    },
  });

  // Keep refs to player controls so the BroadcastChannel handler (which has
  // a stable closure from the initial mount) can always call the latest versions.
  const isReadyRef = useRef(false);
  const seekToRef = useRef(seekTo);
  const playRef = useRef(play);
  const pauseRef = useRef(pause);
  useEffect(() => { isReadyRef.current = isReady; }, [isReady]);
  useEffect(() => { seekToRef.current = seekTo; }, [seekTo]);
  useEffect(() => { playRef.current = play; }, [play]);
  useEffect(() => { pauseRef.current = pause; }, [pause]);

  // ── BroadcastChannel ────────────────────────────────────────
  useEffect(() => {
    const channel = new BroadcastChannel(VIDEO_CHANNEL_NAME);
    channelRef.current = channel;

    channel.onmessage = (event: MessageEvent) => {
      const msg = event.data;

      switch (msg.type) {
        case 'init':
          // Main window sends initial state
          if (msg.videoId) setVideoId(msg.videoId);
          if (msg.currentTime > 0) setInitialTime(msg.currentTime);
          setConnected(true);
          // If player is already ready, seek immediately
          if (isReadyRef.current && msg.currentTime > 0) {
            seekToRef.current(msg.currentTime);
          }
          break;

        case 'seekTo':
          if (isReadyRef.current) {
            seekToRef.current(msg.time);
          }
          break;

        case 'play':
          if (isReadyRef.current) playRef.current();
          break;

        case 'pause':
          if (isReadyRef.current) pauseRef.current();
          break;

        case 'urlChange':
          if (msg.videoId) {
            setVideoId(msg.videoId);
            initialSeekDone.current = false;
          }
          break;
      }
    };

    // Announce we're ready and request initial state
    channel.postMessage({ type: 'popupReady' });

    // On window close, notify main window
    const handleBeforeUnload = () => {
      channel.postMessage({ type: 'closing' });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      channel.close();
      channelRef.current = null;
    };
  }, []);

  // ── Send time updates to main window ────────────────────────
  useEffect(() => {
    if (!isReady) return;

    const interval = setInterval(async () => {
      const time = await getCurrentTime();
      channelRef.current?.postMessage({ type: 'timeUpdate', time });
    }, 200);

    return () => clearInterval(interval);
  }, [isReady, getCurrentTime]);

  // ── Current time for score (updated from our own interval) ──
  const [localTime, setLocalTime] = useState(0);
  useEffect(() => {
    if (!isReady) return;
    const interval = setInterval(async () => {
      const t = await getCurrentTime();
      setLocalTime(t);
    }, 250);
    return () => clearInterval(interval);
  }, [isReady, getCurrentTime]);

  // ── Score overlay from match data ───────────────────────────
  const match = useMatchStore((s) => s.match);
  const currentScore = useMemo(() => {
    if (!match || !isReady) return null;
    const offset = persistedOffset;
    const allRallies = match.sets.flatMap((set) => set.rallies);

    const activeRally = allRallies.find((rally) =>
      isRallyInTimeRange(rally, localTime, offset)
    );

    if (activeRally) {
      return {
        home: activeRally.homeScoreAfter,
        away: activeRally.awayScoreAfter,
        setNumber: activeRally.setNumber,
      };
    }

    const ralliesBeforeCurrent = allRallies.filter((rally) => {
      if (rally.videoTimestamp == null) return false;
      return rally.videoTimestamp + offset <= localTime;
    });

    if (ralliesBeforeCurrent.length > 0) {
      const lastRally = ralliesBeforeCurrent[ralliesBeforeCurrent.length - 1];
      return {
        home: lastRally.homeScoreAfter,
        away: lastRally.awayScoreAfter,
        setNumber: lastRally.setNumber,
      };
    }

    return { home: 0, away: 0, setNumber: 1 };
  }, [match, localTime, isReady, persistedOffset]);

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="w-screen h-screen bg-slate-900 flex flex-col">
      {/* Player fills the window */}
      <div className="flex-1 relative">
        <div
          id={POPOUT_PLAYER_ID}
          className="absolute inset-0"
          style={{ width: '100%', height: '100%' }}
        />

        {/* Loading state */}
        {!isReady && videoId && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
              <span className="text-sm">Chargement du lecteur...</span>
            </div>
          </div>
        )}

        {/* No video state */}
        {!videoId && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500">
            <p className="text-lg">Aucune vidéo chargée dans la fenêtre principale</p>
          </div>
        )}

        {/* Score overlay - top right (same style as VideoPlayer) */}
        {isReady && currentScore && match && (
          <div className="absolute top-3 right-3 bg-slate-900/95 backdrop-blur-sm border border-slate-600 rounded px-3 py-1.5 shadow-lg z-50">
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1">
                <span
                  className="inline-block w-3 h-3 rounded-sm border border-slate-500"
                  style={{ backgroundColor: homeColor }}
                  title={match.homeTeam.name}
                />
                <span className="text-slate-300 font-medium">
                  {match.homeTeam.code || match.homeTeam.name.substring(0, 3).toUpperCase()}
                </span>
              </div>
              <span className="font-bold text-lg tabular-nums" style={{ color: homeColor }}>{currentScore.home}</span>
              <span className="text-slate-500">-</span>
              <span className="font-bold text-lg tabular-nums" style={{ color: awayColor }}>{currentScore.away}</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-300 font-medium">
                  {match.awayTeam.code || match.awayTeam.name.substring(0, 3).toUpperCase()}
                </span>
                <span
                  className="inline-block w-3 h-3 rounded-sm border border-slate-500"
                  style={{ backgroundColor: awayColor }}
                  title={match.awayTeam.name}
                />
              </div>
              <span className="text-slate-500 ml-1">•</span>
              <span className="text-slate-400 text-xs">Set {currentScore.setNumber}</span>
            </div>
          </div>
        )}
      </div>

      {/* Minimal status bar */}
      <div className="h-8 bg-slate-800 border-t border-slate-700 flex items-center px-3">
        <span className="text-xs text-slate-500">
          VolleyVision — Vidéo détachée
          {connected && <span className="ml-2 text-green-500">● Connecté</span>}
          {!connected && <span className="ml-2 text-amber-500">○ En attente...</span>}
        </span>
      </div>
    </div>
  );
}
