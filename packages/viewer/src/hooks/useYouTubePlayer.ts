/**
 * @file useYouTubePlayer.ts
 * @description React hook for YouTube IFrame API integration
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseYouTubePlayerOptions {
  videoId: string;
  containerId: string;
  autoplay?: boolean;
  controls?: boolean;
  onReady?: () => void;
  onStateChange?: (state: number) => void;
  onError?: (error: number) => void;
}

interface YouTubePlayerControls {
  player: any;
  isReady: boolean;
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
  getCurrentTime: () => Promise<number>;
  getDuration: () => Promise<number>;
  getPlayerState: () => number | null;
  setPlaybackRate: (rate: number) => void;
  destroy: () => void;
}

/**
 * Load YouTube IFrame API script dynamically
 * Returns a promise that resolves when the API is ready
 */
function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve) => {
    // Check if API already loaded
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }

    // Check if script is already loading
    if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      // Wait for existing script to load
      const checkInterval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      return;
    }

    // Load the script
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    // Set up callback
    window.onYouTubeIframeAPIReady = () => {
      resolve();
    };
  });
}

/**
 * Custom React hook for YouTube player integration
 * Handles API loading, player initialization, and provides control methods
 *
 * @example
 * const { player, isReady, play, pause, seekTo } = useYouTubePlayer({
 *   videoId: 'dQw4w9WgXcQ',
 *   containerId: 'youtube-player',
 *   onReady: () => console.log('Player ready'),
 * });
 */
export function useYouTubePlayer({
  videoId,
  containerId,
  autoplay = false,
  controls = false,
  onReady,
  onStateChange,
  onError,
}: UseYouTubePlayerOptions): YouTubePlayerControls {
  const playerRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [apiLoaded, setApiLoaded] = useState(false);

  // Use refs for callbacks to avoid recreating player on every render
  const onReadyRef = useRef(onReady);
  const onStateChangeRef = useRef(onStateChange);
  const onErrorRef = useRef(onError);

  // Update refs when callbacks change
  useEffect(() => {
    onReadyRef.current = onReady;
    onStateChangeRef.current = onStateChange;
    onErrorRef.current = onError;
  }, [onReady, onStateChange, onError]);

  // Load YouTube API on mount
  useEffect(() => {
    loadYouTubeAPI().then(() => {
      setApiLoaded(true);
    });
  }, []);

  // Initialize player when API is loaded and videoId changes
  useEffect(() => {
    if (!apiLoaded || !videoId) return;

    // Clean up existing player
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
      setIsReady(false);
    }

    // Create new player
    try {
      playerRef.current = new window.YT.Player(containerId, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: autoplay ? 1 : 0,
          controls: controls ? 1 : 0,
          rel: 0, // Don't show related videos
          modestbranding: 1, // Minimal YouTube branding
          playsinline: 1, // Play inline on mobile
          enablejsapi: 1, // Enable JS API
          origin: window.location.origin,
        },
        events: {
          onReady: (event) => {
            setIsReady(true);
            onReadyRef.current?.();
          },
          onStateChange: (event) => {
            onStateChangeRef.current?.(event.data);
          },
          onError: (event) => {
            console.error('[useYouTubePlayer] Error:', event.data);
            onErrorRef.current?.(event.data);
          },
        },
      });
    } catch (error) {
      console.error('[useYouTubePlayer] Failed to create player:', error);
    }

    // Cleanup on unmount or videoId change
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
        setIsReady(false);
      }
    };
  }, [apiLoaded, videoId, containerId, autoplay, controls]);

  // Control methods
  const play = useCallback(() => {
    if (playerRef.current && isReady) {
      playerRef.current.playVideo();
    }
  }, [isReady]);

  const pause = useCallback(() => {
    if (playerRef.current && isReady) {
      playerRef.current.pauseVideo();
    }
  }, [isReady]);

  const seekTo = useCallback((seconds: number) => {
    if (playerRef.current && isReady) {
      playerRef.current.seekTo(seconds, true);
    }
  }, [isReady]);

  const getCurrentTime = useCallback(async (): Promise<number> => {
    if (playerRef.current && isReady) {
      return playerRef.current.getCurrentTime();
    }
    return 0;
  }, [isReady]);

  const getDuration = useCallback(async (): Promise<number> => {
    if (playerRef.current && isReady) {
      return playerRef.current.getDuration();
    }
    return 0;
  }, [isReady]);

  const getPlayerState = useCallback((): number | null => {
    if (playerRef.current && isReady) {
      return playerRef.current.getPlayerState();
    }
    return null;
  }, [isReady]);

  const setPlaybackRate = useCallback((rate: number) => {
    if (playerRef.current && isReady) {
      playerRef.current.setPlaybackRate(rate);
    }
  }, [isReady]);

  const destroy = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
      setIsReady(false);
    }
  }, []);

  return {
    player: playerRef.current,
    isReady,
    play,
    pause,
    seekTo,
    getCurrentTime,
    getDuration,
    getPlayerState,
    setPlaybackRate,
    destroy,
  };
}
