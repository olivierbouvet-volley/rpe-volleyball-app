import type { PlaylistExport } from './exportPlaylist';

/**
 * Parse and validate a PlaylistExport from JSON string
 * Returns null if the JSON is invalid or doesn't match the expected structure
 */
export function parsePlaylistFromJSON(json: string): PlaylistExport | null {
  try {
    const data = JSON.parse(json);

    // Validate structure
    if (
      data.version !== '1.0' ||
      !Array.isArray(data.clips) ||
      data.clips.length === 0 ||
      !data.videoId ||
      !data.title ||
      !data.exportedBy
    ) {
      console.error('[playlistImporter] Invalid JSON structure:', data);
      return null;
    }

    // Type assertion after validation
    return data as PlaylistExport;
  } catch (err) {
    console.error('[playlistImporter] Failed to parse JSON:', err);
    return null;
  }
}

/**
 * Parse compressed playlist from URL query param
 * Example: ?playlist=eyJ2IjoiYWJjMTIzIiwiYyI6W1swLDUsIkF0dGFxdWUi...
 * Returns null if the URL doesn't contain a valid playlist parameter
 */
export function parsePlaylistFromURL(urlString: string): {
  videoId: string;
  clips: [number, number, string][];
} | null {
  try {
    const url = new URL(urlString);
    const playlistParam = url.searchParams.get('playlist');

    if (!playlistParam) {
      return null;
    }

    // Decode base64 and parse JSON
    const json = decodeURIComponent(escape(atob(playlistParam)));
    const data = JSON.parse(json);

    // Validate structure: { v: string, c: [[num, num, str], ...] }
    if (
      !data.v ||
      typeof data.v !== 'string' ||
      !Array.isArray(data.c) ||
      data.c.length === 0
    ) {
      console.error('[playlistImporter] Invalid URL playlist structure:', data);
      return null;
    }

    return {
      videoId: data.v,
      clips: data.c
    };
  } catch (err) {
    console.error('[playlistImporter] Failed to parse playlist URL:', err);
    return null;
  }
}
