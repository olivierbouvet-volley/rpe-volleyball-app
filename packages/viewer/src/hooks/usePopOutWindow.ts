/**
 * @file usePopOutWindow.ts
 * @description Hook for detaching video into a separate same-origin window.
 *
 * Architecture:
 * - Opens popup at the same Vite URL with ?popout=video (same origin → YouTube works)
 * - The popup renders its own VideoPopout component with an independent YT player
 * - State sync happens via BroadcastChannel ('volleyvision-video')
 * - The main window registers a proxy seekTo so timeline/playlist still work
 */

import { useRef, useCallback, useEffect } from 'react';
import { useLayoutStore } from '../store/layoutStore';
import { useVideoStore } from '../store/videoStore';

/** Channel name shared between main window and popup */
export const VIDEO_CHANNEL_NAME = 'volleyvision-video';

interface UsePopOutWindowOptions {
  title?: string;
  width?: number;
  height?: number;
  onClose?: () => void;
}

interface UsePopOutWindowReturn {
  isPopOut: boolean;
  popOut: () => void;
  popIn: () => void;
}

export function usePopOutWindow({
  title = 'VolleyVision - Video Player',
  width = 1280,
  height = 720,
  onClose,
}: UsePopOutWindowOptions = {}): UsePopOutWindowReturn {
  const popOutWindowRef = useRef<Window | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const { isVideoDetached, setVideoDetached } = useLayoutStore();

  // ── BroadcastChannel setup ──────────────────────────────────
  useEffect(() => {
    const channel = new BroadcastChannel(VIDEO_CHANNEL_NAME);
    channelRef.current = channel;

    channel.onmessage = (event: MessageEvent) => {
      const msg = event.data;
      const vs = useVideoStore.getState();

      switch (msg.type) {
        // Popup is loaded and ready — send it the current video state
        case 'popupReady':
          channel.postMessage({
            type: 'init',
            videoId: vs.videoId,
            currentTime: vs.currentTime,
            isPlaying: vs.isPlaying,
            offset: vs.offset,
          });
          break;

        // Popup sends periodic time updates → keep main store in sync
        case 'timeUpdate':
          vs.setCurrentTime(msg.time);
          break;

        // Popup play/pause changed
        case 'stateChange':
          vs.setIsPlaying(msg.isPlaying);
          break;

        // Popup resolved the video duration
        case 'durationUpdate':
          vs.setDuration(msg.duration);
          break;

        // Popup window is closing → re-attach
        case 'closing':
          popOutWindowRef.current = null;
          setVideoDetached(false);
          // Clear the proxy seekTo — VideoPlayer will re-register its own when it mounts
          useVideoStore.getState().registerSeekFunction(() => {});
          onClose?.();
          break;
      }
    };

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [setVideoDetached, onClose]);

  // ── Register proxy seekTo when detached ─────────────────────
  useEffect(() => {
    if (!isVideoDetached) return;

    // Use setTimeout(0) to guarantee this runs AFTER VideoPlayer's cleanup effects
    const timer = setTimeout(() => {
      const channel = channelRef.current;
      if (!channel) return;

      // Replace the local seekTo with one that forwards via BroadcastChannel
      useVideoStore.getState().registerSeekFunction((seconds: number) => {
        channel.postMessage({ type: 'seekTo', time: seconds });
        // Also tell the popup to play after seeking (playlist expects playback)
        channel.postMessage({ type: 'play' });
      });
    }, 0);

    return () => clearTimeout(timer);
  }, [isVideoDetached]);

  // ── Pop out ─────────────────────────────────────────────────
  const popOut = useCallback(() => {
    // Build same-origin URL with popout marker
    const popOutUrl = new URL(window.location.href);
    popOutUrl.searchParams.set('popout', 'video');

    const newWindow = window.open(
      popOutUrl.toString(),
      title,
      `width=${width},height=${height},menubar=no,toolbar=no,location=no,status=no`,
    );

    if (!newWindow) {
      console.error('[usePopOutWindow] Popup blocked by browser');
      return;
    }

    popOutWindowRef.current = newWindow;
    setVideoDetached(true);
  }, [title, width, height, setVideoDetached]);

  // ── Pop in ──────────────────────────────────────────────────
  const popIn = useCallback(() => {
    if (popOutWindowRef.current) {
      popOutWindowRef.current.close();
      popOutWindowRef.current = null;
    }
    setVideoDetached(false);
    onClose?.();
  }, [setVideoDetached, onClose]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (popOutWindowRef.current) {
        popOutWindowRef.current.close();
        popOutWindowRef.current = null;
      }
    };
  }, []);

  return {
    isPopOut: isVideoDetached,
    popOut,
    popIn,
  };
}
