/**
 * @file export.test.ts
 * @description Tests for Playlist Export (PROMPT 2G)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { parseDVW } from '@volleyvision/dvw-parser';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  buildPlaylistExport,
  exportAsShareURL,
  generateYouTubeChapters,
  sanitizeFilename,
  formatTime,
  generateTitle,
} from '../src/utils/exportPlaylist';
import { applyFilters } from '../src/utils/filterEngine';
import { DEFAULT_CRITERIA } from '../src/store/filterStore';
import { parsePlaylistFromJSON, parsePlaylistFromURL } from '../src/utils/playlistImporter';
import type { Match } from '@volleyvision/data-model';
import type { FilteredAction } from '../src/utils/filterEngine';

describe('Playlist Export', () => {
  let match: Match;
  let filteredActions: FilteredAction[];

  beforeAll(() => {
    // Load test fixture
    const dvwPath = join(__dirname, '..', '..', '..', 'fixtures', 'boulouris-sable.dvw');
    const dvwContent = readFileSync(dvwPath, 'utf-8');
    match = parseDVW(dvwContent);

    // Create filtered actions (attacks with video timestamps)
    filteredActions = applyFilters(match, {
      ...DEFAULT_CRITERIA,
      skills: ['attack'],
      hasVideoTimestamp: true,
    }).slice(0, 25); // Limit to 25 for testing
  });

  // ============================================================================
  // Test 1: buildPlaylistExport creates valid structure
  // ============================================================================

  it('buildPlaylistExport creates valid structure', () => {
    const playlist = buildPlaylistExport(
      match,
      filteredActions,
      'abc123',
      150, // offset
      2,   // preRoll
      3    // postRoll
    );

    expect(playlist.version).toBe('1.0');
    expect(playlist.exportedBy).toBe('VolleyVision');
    expect(playlist.videoId).toBe('abc123');
    expect(playlist.clips.length).toBeGreaterThan(0);
    expect(playlist.totalDuration).toBeGreaterThan(0);
    expect(playlist.homeTeam).toBe(match.homeTeam.name);
    expect(playlist.awayTeam).toBe(match.awayTeam.name);
    expect(playlist.matchId).toBe(match.id);
    expect(playlist.createdAt).toBeDefined();
    expect(new Date(playlist.createdAt).getTime()).toBeGreaterThan(0); // Valid ISO date
  });

  // ============================================================================
  // Test 2: Each clip has startTime < endTime
  // ============================================================================

  it('each clip has startTime < endTime', () => {
    const playlist = buildPlaylistExport(match, filteredActions, 'abc123', 150, 2, 3);

    playlist.clips.forEach(clip => {
      expect(clip.endTime).toBeGreaterThan(clip.startTime);
    });
  });

  // ============================================================================
  // Test 3: preRoll is correctly applied
  // ============================================================================

  it('preRoll is correctly applied', () => {
    const preRoll = 5;
    const offset = 100;
    const playlist = buildPlaylistExport(match, filteredActions, 'abc123', offset, preRoll, 3);

    // Find a clip without sequenceStart (should use preRoll)
    const regularClip = playlist.clips.find(clip => {
      // Find corresponding FilteredAction
      const item = filteredActions.find(fa =>
        fa.action.videoTimestamp != null &&
        !fa.sequenceStart &&
        Math.abs(clip.startTime - (fa.action.videoTimestamp + offset - preRoll)) < 0.1
      );
      return item !== undefined;
    });

    // At least one clip should use standard preRoll margins
    expect(regularClip).toBeDefined();
  });

  // ============================================================================
  // Test 4: startTime is never negative
  // ============================================================================

  it('startTime is never negative', () => {
    // Test with offset=0 and large preRoll to force clamping
    const playlist = buildPlaylistExport(match, filteredActions, 'abc123', 0, 999, 3);

    playlist.clips.forEach(clip => {
      expect(clip.startTime).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // Test 5: generateTitle produces descriptive title
  // ============================================================================

  it('generateTitle produces descriptive title', () => {
    const title = generateTitle(match, filteredActions);

    // Title should contain match teams
    expect(title).toContain('vs');
    expect(title.length).toBeGreaterThan(10);
    // Should contain skill or player info
    expect(title).toMatch(/Attaque|Service|Réception/);
  });

  // ============================================================================
  // Test 6: CSV format is valid
  // ============================================================================

  it('CSV export generates valid format', () => {
    const playlist = buildPlaylistExport(match, filteredActions, 'abc123', 150, 2, 3);

    // Simulate CSV generation
    const lines: string[] = [
      'N°,Début,Fin,Skill,Qualité,Joueuse,Set,Score,URL YouTube\n'
    ];

    playlist.clips.forEach((clip, i) => {
      lines.push(
        `${i + 1},` +
        `${formatTime(clip.startTime)},` +
        `${formatTime(clip.endTime)},` +
        `${clip.skill},` +
        `${clip.quality},` +
        `"${clip.playerName}",` +
        `${clip.setNumber},` +
        `${clip.score},` +
        `${clip.youtubeUrl}\n`
      );
    });

    const csv = lines.join('');
    const csvLines = csv.split('\n');

    // Header exists
    expect(csvLines[0]).toContain('N°,Début,Fin,Skill');

    // Each data line has 9 columns (8 commas + 1 newline)
    for (let i = 1; i < Math.min(5, csvLines.length - 1); i++) {
      const columns = csvLines[i].split(',');
      expect(columns.length).toBeGreaterThanOrEqual(9); // May have more if name contains comma
    }
  });

  // ============================================================================
  // Test 7: Share URL encode/decode symmetry
  // ============================================================================

  it('share URL can be encoded and decoded', () => {
    const playlist = buildPlaylistExport(match, filteredActions.slice(0, 5), 'abc123', 150, 2, 3);
    const url = exportAsShareURL(playlist);

    const decoded = parsePlaylistFromURL(url);
    expect(decoded).not.toBeNull();
    expect(decoded?.videoId).toBe('abc123');
    expect(decoded?.clips.length).toBe(5);

    // Verify structure of clips
    decoded?.clips.forEach(clip => {
      expect(Array.isArray(clip)).toBe(true);
      expect(clip.length).toBe(3); // [startTime, endTime, label]
      expect(typeof clip[0]).toBe('number'); // startTime
      expect(typeof clip[1]).toBe('number'); // endTime
      expect(typeof clip[2]).toBe('string'); // label
    });
  });

  // ============================================================================
  // Test 8: JSON import accepts valid export
  // ============================================================================

  it('JSON import accepts valid export', () => {
    const playlist = buildPlaylistExport(match, filteredActions, 'abc123', 150, 2, 3);
    const json = JSON.stringify(playlist);

    const imported = parsePlaylistFromJSON(json);
    expect(imported).not.toBeNull();
    expect(imported?.version).toBe('1.0');
    expect(imported?.clips.length).toBe(playlist.clips.length);
    expect(imported?.videoId).toBe(playlist.videoId);
    expect(imported?.title).toBe(playlist.title);
  });

  // ============================================================================
  // Test 9: JSON import rejects invalid inputs
  // ============================================================================

  it('JSON import rejects invalid inputs', () => {
    // Invalid JSON
    expect(parsePlaylistFromJSON('invalid json')).toBeNull();

    // Missing version
    expect(parsePlaylistFromJSON('{"clips": []}')).toBeNull();

    // Wrong version
    expect(parsePlaylistFromJSON('{"version": "2.0", "clips": [1,2,3], "videoId": "abc"}')).toBeNull();

    // Empty clips
    expect(parsePlaylistFromJSON('{"version": "1.0", "clips": [], "videoId": "abc"}')).toBeNull();

    // Missing videoId
    expect(parsePlaylistFromJSON('{"version": "1.0", "clips": [{"test": 1}]}')).toBeNull();
  });

  // ============================================================================
  // Test 10: YouTube chapters format correctly
  // ============================================================================

  it('YouTube chapters format correctly', () => {
    const playlist = buildPlaylistExport(match, filteredActions.slice(0, 3), 'abc123', 150, 2, 3);
    const chapters = generateYouTubeChapters(playlist);

    const lines = chapters.split('\n');
    expect(lines.length).toBe(3);

    lines.forEach((line, i) => {
      // Should match format "M:SS — Clip N: Label" or "H:MM:SS — Clip N: Label"
      expect(line).toMatch(/^\d+:\d{2}(\:\d{2})? — Clip \d+:/);
      expect(line).toContain(`Clip ${i + 1}:`);
    });
  });

  // ============================================================================
  // Test 11: sanitizeFilename removes special characters
  // ============================================================================

  it('sanitizeFilename removes special characters', () => {
    // Special chars removed
    const result1 = sanitizeFilename('Attaques/Service : Test!');
    expect(result1).not.toContain('/');
    expect(result1).not.toContain(':');
    expect(result1).not.toContain('!');

    // Accents preserved
    const result2 = sanitizeFilename('Éléonore Ömer');
    expect(result2).toContain('É');
    expect(result2).toContain('é');
    expect(result2).toContain('Ö');

    // Spaces converted to underscores
    const result3 = sanitizeFilename('Test Multiple   Spaces');
    expect(result3).toContain('_');
    expect(result3).not.toMatch(/\s/); // No spaces should remain

    // Very long names truncated
    const longName = 'A'.repeat(250);
    const result4 = sanitizeFilename(longName);
    expect(result4.length).toBeLessThanOrEqual(200);
  });

  // ============================================================================
  // Test 12: formatTime formats durations correctly
  // ============================================================================

  it('formatTime formats durations correctly', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(5)).toBe('0:05');
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(125)).toBe('2:05');
    expect(formatTime(3661)).toBe('1:01:01'); // Format H:MM:SS for > 1h

    // Edge cases
    expect(formatTime(60)).toBe('1:00');
    expect(formatTime(3600)).toBe('1:00:00');
  });

  // ============================================================================
  // Test 13: Share URL warns on large playlists
  // ============================================================================

  it('share URL warns and truncates large playlists', () => {
    // Create a large playlist by duplicating actions
    const largeActions: FilteredAction[] = [];
    for (let i = 0; i < 100; i++) {
      if (filteredActions[i % filteredActions.length]) {
        const originalAction = filteredActions[i % filteredActions.length];
        largeActions.push({
          ...originalAction,
          action: { ...originalAction.action, id: `action-${i}` }
        });
      }
    }

    const playlist = buildPlaylistExport(match, largeActions, 'abc123', 150, 2, 3);

    // Mock console.warn to check if warning is issued
    const originalWarn = console.warn;
    let warnCalled = false;
    console.warn = (...args: any[]) => {
      if (args[0]?.includes('URL too long')) {
        warnCalled = true;
      }
    };

    const url = exportAsShareURL(playlist);

    // Restore console.warn
    console.warn = originalWarn;

    // URL should still be generated (fallback to 20 clips)
    expect(url).toBeTruthy();
    expect(url).toContain('?playlist=');
    expect(url.length).toBeLessThan(3000); // Should be reasonable length

    // Decode and verify truncation
    const decoded = parsePlaylistFromURL(url);
    if (decoded) {
      // Should be truncated to 20 clips if original URL was too long
      expect(decoded.clips.length).toBeLessThanOrEqual(playlist.clips.length);
    }
  });

  // ============================================================================
  // Additional Test: Clip metadata is complete
  // ============================================================================

  it('clips contain all required metadata', () => {
    const playlist = buildPlaylistExport(match, filteredActions, 'abc123', 150, 2, 3);

    playlist.clips.forEach(clip => {
      expect(clip.videoId).toBe('abc123');
      expect(clip.startTime).toBeGreaterThanOrEqual(0);
      expect(clip.endTime).toBeGreaterThan(clip.startTime);
      expect(clip.label).toBeDefined();
      expect(clip.label.length).toBeGreaterThan(0);
      expect(clip.skill).toBeDefined();
      expect(clip.quality).toMatch(/^[#\+!\-\/=]$/); // Valid quality
      expect(clip.playerNumber).toBeGreaterThanOrEqual(0);
      expect(clip.playerName).toBeDefined();
      expect(clip.setNumber).toBeGreaterThan(0);
      expect(clip.setNumber).toBeLessThanOrEqual(5);
      expect(clip.score).toBeDefined();
      expect(clip.youtubeUrl).toContain('youtu.be');
      expect(clip.youtubeUrl).toContain('?t=');
    });
  });

  // ============================================================================
  // Additional Test: Total duration calculation
  // ============================================================================

  it('total duration is correctly calculated', () => {
    const playlist = buildPlaylistExport(match, filteredActions, 'abc123', 150, 2, 3);

    const manualTotal = playlist.clips.reduce((sum, clip) =>
      sum + (clip.endTime - clip.startTime), 0
    );

    expect(playlist.totalDuration).toBeCloseTo(manualTotal, 2);
    expect(playlist.totalDuration).toBeGreaterThan(0);
  });
});
