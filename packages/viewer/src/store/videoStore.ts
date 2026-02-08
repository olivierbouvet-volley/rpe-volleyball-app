/**
 * @file videoStore.ts
 * @description Zustand store for YouTube video state and DVW synchronization
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { extractVideoId } from '../utils/videoHelpers';

interface VideoState {
  // Video configuration
  youtubeUrl: string | null;
  videoId: string | null;

  // Synchronization
  offset: number; // Seconds offset between video start and match start

  // Playback state
  isPlaying: boolean;
  currentTime: number; // Current video time in seconds
  duration: number;

  // Player controls (registered by VideoPlayer component)
  seekToFunction: ((seconds: number) => void) | null;

  // Actions
  setYoutubeUrl: (url: string) => void;
  setOffset: (offset: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  registerSeekFunction: (seekFn: (seconds: number) => void) => void;
  seekTo: (seconds: number) => void;
  clearVideo: () => void;
}

const initialState = {
  youtubeUrl: null,
  videoId: null,
  offset: 0,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  seekToFunction: null,
};

/**
 * Video store for managing YouTube player state and DVW synchronization
 *
 * The offset value calibrates the difference between:
 * - DVW timestamps (relative to match start, first rally = 0)
 * - YouTube timestamps (absolute from video start)
 *
 * Example: If match starts at 2:30 in the video, offset = 150
 */
export const useVideoStore = create<VideoState>()(
  persist(
    (set) => ({
      ...initialState,

      setYoutubeUrl: (url) => {
        const videoId = extractVideoId(url);
        if (videoId) {
          set({ youtubeUrl: url, videoId });
        } else {
          console.error('[videoStore] Invalid YouTube URL:', url);
        }
      },

      setOffset: (offset) => {
        set({ offset });
      },

      setIsPlaying: (isPlaying) => {
        set({ isPlaying });
      },

      setCurrentTime: (time) => {
        set({ currentTime: time });
      },

      setDuration: (duration) => {
        set({ duration });
      },

      registerSeekFunction: (seekFn) => {
        set({ seekToFunction: seekFn });
      },

      seekTo: (seconds) => {
        const state = useVideoStore.getState();
        if (state.seekToFunction) {
          state.seekToFunction(seconds);
        } else {
          console.warn('[videoStore] seekTo called but no seek function registered');
        }
      },

      clearVideo: () => {
        set(initialState);
      },
    }),
    {
      name: 'video-storage', // localStorage key
      // Only persist configuration, not playback state
      partialize: (state) => ({
        youtubeUrl: state.youtubeUrl,
        videoId: state.videoId,
        offset: state.offset,
      }),
    }
  )
);

// Expose store to window for debugging
if (typeof window !== 'undefined') {
  (window as any).videoStore = useVideoStore;
}
