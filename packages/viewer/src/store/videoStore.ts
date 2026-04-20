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
  /** Type de source vidéo : YouTube ou fichier local */
  videoType: 'youtube' | 'local' | null;
  /** Object URL créée depuis un File local (URL.createObjectURL) */
  localVideoUrl: string | null;

  // Synchronization
  offset: number; // Seconds offset between video start and match start

  // Playback state
  isPlaying: boolean;
  currentTime: number; // Current video time in seconds
  duration: number;

  // Player controls (registered by VideoPlayer component)
  seekToFunction: ((seconds: number) => void) | null;
  playFunction: (() => void) | null;

  // Actions
  setYoutubeUrl: (url: string) => void;
  /** Charge un fichier vidéo local depuis le système de fichiers */
  setLocalVideoFile: (file: File) => void;
  setOffset: (offset: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  registerSeekFunction: (seekFn: (seconds: number) => void) => void;
  registerPlayFunction: (playFn: () => void) => void;
  seekTo: (seconds: number) => void;
  triggerPlay: () => void;
  clearVideo: () => void;
}

const initialState = {
  youtubeUrl: null,
  videoId: null,
  videoType: null as 'youtube' | 'local' | null,
  localVideoUrl: null as string | null,
  offset: 0,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  seekToFunction: null,
  playFunction: null,
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
          // Révoquer l'éventuel blob URL précédent
          const prev = useVideoStore.getState().localVideoUrl;
          if (prev) URL.revokeObjectURL(prev);
          set({ youtubeUrl: url, videoId, videoType: 'youtube', localVideoUrl: null });
        } else {
          console.error('[videoStore] Invalid YouTube URL:', url);
        }
      },

      setLocalVideoFile: (file) => {
        // Révoquer l'URL précédente si elle existe
        const prev = useVideoStore.getState().localVideoUrl;
        if (prev) URL.revokeObjectURL(prev);
        const objectUrl = URL.createObjectURL(file);
        set({
          localVideoUrl: objectUrl,
          videoType: 'local',
          youtubeUrl: null,
          videoId: null,
          currentTime: 0,
          duration: 0,
          isPlaying: false,
        });
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

      registerPlayFunction: (playFn) => {
        set({ playFunction: playFn });
      },

      seekTo: (seconds) => {
        const state = useVideoStore.getState();
        if (state.seekToFunction) {
          state.seekToFunction(seconds);
        } else {
          console.warn('[videoStore] seekTo called but no seek function registered');
        }
      },

      triggerPlay: () => {
        const state = useVideoStore.getState();
        if (state.playFunction) {
          state.playFunction();
        }
      },

      clearVideo: () => {
        // Révoquer le blob URL local si présent
        const prev = useVideoStore.getState().localVideoUrl;
        if (prev) URL.revokeObjectURL(prev);
        set(initialState);
      },
    }),
    {
      name: 'video-storage', // localStorage key
      // Only persist configuration, not playback state
      // Ne pas persister localVideoUrl (blob URL invalide après rechargement)
      partialize: (state) => ({
        youtubeUrl: state.youtubeUrl,
        videoId: state.videoId,
        videoType: state.videoType === 'local' ? null : state.videoType,
        offset: state.offset,
      }),
    }
  )
);

// Expose store to window for debugging
if (typeof window !== 'undefined') {
  (window as any).videoStore = useVideoStore;
}
