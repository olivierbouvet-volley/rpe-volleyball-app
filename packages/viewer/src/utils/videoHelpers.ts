/**
 * @file videoHelpers.ts
 * @description Video utility functions for YouTube integration and time formatting
 */

/**
 * Extract YouTube video ID from various URL formats
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 *
 * @param url - YouTube URL
 * @returns Video ID or null if invalid
 */
export function extractVideoId(url: string): string | null {
  if (!url) return null;

  try {
    const urlObj = new URL(url);

    // Standard watch URL: youtube.com/watch?v=VIDEO_ID
    if (urlObj.hostname.includes('youtube.com') && urlObj.searchParams.has('v')) {
      return urlObj.searchParams.get('v');
    }

    // Short URL: youtu.be/VIDEO_ID
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1).split('?')[0];
    }

    // Embed URL: youtube.com/embed/VIDEO_ID
    // Old embed: youtube.com/v/VIDEO_ID
    if (urlObj.hostname.includes('youtube.com')) {
      const match = urlObj.pathname.match(/\/(embed|v)\/([^/?]+)/);
      if (match) {
        return match[2];
      }
    }

    return null;
  } catch (error) {
    // If URL parsing fails, try regex as fallback
    const regexMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([^&?\/\s]{11})/);
    return regexMatch ? regexMatch[1] : null;
  }
}

/**
 * Format seconds into MM:SS or HH:MM:SS
 *
 * @param seconds - Time in seconds
 * @returns Formatted time string
 *
 * @example
 * formatVideoTime(65) // "01:05"
 * formatVideoTime(3665) // "1:01:05"
 */
export function formatVideoTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) {
    return '00:00';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Convert DVW timestamp to YouTube video time accounting for offset
 *
 * DVW timestamps are relative to match start (first rally).
 * YouTube timestamps are absolute from video start.
 * Offset calibrates the difference between match start and video start.
 *
 * @param dvwSeconds - Time in seconds from DVW file (match time)
 * @param offset - Calibration offset in seconds (video start time of match)
 * @returns YouTube video time in seconds
 *
 * @example
 * // Match starts at 2:30 in the video
 * dvwToYouTubeTime(0, 150) // 150 (video time for first rally)
 * dvwToYouTubeTime(60, 150) // 210 (1 minute into match)
 */
export function dvwToYouTubeTime(dvwSeconds: number, offset: number): number {
  return dvwSeconds + offset;
}

/**
 * Convert YouTube video time to DVW timestamp accounting for offset
 *
 * @param youtubeSeconds - Time in seconds from YouTube video
 * @param offset - Calibration offset in seconds
 * @returns DVW match time in seconds
 *
 * @example
 * // Match starts at 2:30 in the video
 * youTubeToDvwTime(150, 150) // 0 (first rally)
 * youTubeToDvwTime(210, 150) // 60 (1 minute into match)
 */
export function youTubeToDvwTime(youtubeSeconds: number, offset: number): number {
  return youtubeSeconds - offset;
}

/**
 * Validate if a string is a valid YouTube URL
 *
 * @param url - URL to validate
 * @returns True if valid YouTube URL
 */
export function isValidYouTubeUrl(url: string): boolean {
  return extractVideoId(url) !== null;
}

/**
 * Parse time string (MM:SS or HH:MM:SS) to seconds
 * Useful for manual time input
 *
 * @param timeString - Time string in MM:SS or HH:MM:SS format
 * @returns Seconds or null if invalid
 *
 * @example
 * parseTimeString("01:30") // 90
 * parseTimeString("1:05:30") // 3930
 */
export function parseTimeString(timeString: string): number | null {
  if (!timeString) return null;

  const parts = timeString.split(':').map(Number);

  if (parts.some(isNaN)) {
    return null;
  }

  if (parts.length === 2) {
    // MM:SS
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  } else if (parts.length === 3) {
    // HH:MM:SS
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }

  return null;
}
