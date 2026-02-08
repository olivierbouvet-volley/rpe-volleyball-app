/**
 * @file videoHelpers.test.ts
 * @description Unit tests for video helper utilities
 */

import { describe, it, expect } from 'vitest';
import {
  extractVideoId,
  formatVideoTime,
  dvwToYouTubeTime,
  youTubeToDvwTime,
  isValidYouTubeUrl,
  parseTimeString,
} from './videoHelpers';

describe('extractVideoId', () => {
  it('should extract video ID from standard watch URL', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('should extract video ID from short URL', () => {
    expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('should extract video ID from embed URL', () => {
    expect(extractVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('should extract video ID from old v/ URL', () => {
    expect(extractVideoId('https://www.youtube.com/v/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('should handle URLs with additional query parameters', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s')).toBe('dQw4w9WgXcQ');
  });

  it('should handle short URLs with query parameters', () => {
    expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ?t=30')).toBe('dQw4w9WgXcQ');
  });

  it('should return null for invalid URLs', () => {
    expect(extractVideoId('https://example.com')).toBeNull();
    expect(extractVideoId('not a url')).toBeNull();
    expect(extractVideoId('')).toBeNull();
  });

  it('should handle URLs without protocol using regex fallback', () => {
    expect(extractVideoId('youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
});

describe('formatVideoTime', () => {
  it('should format seconds as MM:SS', () => {
    expect(formatVideoTime(0)).toBe('00:00');
    expect(formatVideoTime(30)).toBe('00:30');
    expect(formatVideoTime(90)).toBe('01:30');
    expect(formatVideoTime(599)).toBe('09:59');
  });

  it('should format hours as HH:MM:SS', () => {
    expect(formatVideoTime(3600)).toBe('1:00:00');
    expect(formatVideoTime(3665)).toBe('1:01:05');
    expect(formatVideoTime(7384)).toBe('2:03:04');
  });

  it('should handle edge cases', () => {
    expect(formatVideoTime(0)).toBe('00:00');
    expect(formatVideoTime(-10)).toBe('00:00'); // Negative becomes 00:00
    expect(formatVideoTime(NaN)).toBe('00:00');
  });

  it('should pad single digit minutes and seconds', () => {
    expect(formatVideoTime(65)).toBe('01:05');
    expect(formatVideoTime(125)).toBe('02:05');
  });
});

describe('dvwToYouTubeTime', () => {
  it('should add offset to DVW time', () => {
    expect(dvwToYouTubeTime(0, 150)).toBe(150);
    expect(dvwToYouTubeTime(60, 150)).toBe(210);
    expect(dvwToYouTubeTime(120, 150)).toBe(270);
  });

  it('should handle zero offset', () => {
    expect(dvwToYouTubeTime(100, 0)).toBe(100);
  });

  it('should work with negative DVW times', () => {
    expect(dvwToYouTubeTime(-10, 150)).toBe(140);
  });
});

describe('youTubeToDvwTime', () => {
  it('should subtract offset from YouTube time', () => {
    expect(youTubeToDvwTime(150, 150)).toBe(0);
    expect(youTubeToDvwTime(210, 150)).toBe(60);
    expect(youTubeToDvwTime(270, 150)).toBe(120);
  });

  it('should handle zero offset', () => {
    expect(youTubeToDvwTime(100, 0)).toBe(100);
  });

  it('should allow negative results', () => {
    expect(youTubeToDvwTime(140, 150)).toBe(-10);
  });
});

describe('isValidYouTubeUrl', () => {
  it('should return true for valid YouTube URLs', () => {
    expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    expect(isValidYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
    expect(isValidYouTubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(true);
  });

  it('should return false for invalid URLs', () => {
    expect(isValidYouTubeUrl('https://example.com')).toBe(false);
    expect(isValidYouTubeUrl('not a url')).toBe(false);
    expect(isValidYouTubeUrl('')).toBe(false);
  });
});

describe('parseTimeString', () => {
  it('should parse MM:SS format', () => {
    expect(parseTimeString('00:30')).toBe(30);
    expect(parseTimeString('01:30')).toBe(90);
    expect(parseTimeString('10:45')).toBe(645);
  });

  it('should parse HH:MM:SS format', () => {
    expect(parseTimeString('1:00:00')).toBe(3600);
    expect(parseTimeString('1:05:30')).toBe(3930);
    expect(parseTimeString('2:30:45')).toBe(9045);
  });

  it('should handle edge cases', () => {
    expect(parseTimeString('0:00')).toBe(0);
    expect(parseTimeString('0:00:00')).toBe(0);
  });

  it('should return null for invalid formats', () => {
    expect(parseTimeString('')).toBeNull();
    expect(parseTimeString('invalid')).toBeNull();
    expect(parseTimeString('1:2:3:4')).toBeNull();
    expect(parseTimeString('abc:def')).toBeNull();
  });

  it('should handle single digit values', () => {
    expect(parseTimeString('1:5')).toBe(65);
    expect(parseTimeString('1:2:3')).toBe(3723);
  });
});
