import type { Match, Skill, Quality } from '@volleyvision/data-model';
import type { FilteredAction } from './filterEngine';
import { getPlayer, getPlayerName, formatDate } from './formatters';
import { getSkillLabel } from './timelineHelpers';

// ============================================================================
// Type Definitions
// ============================================================================

export interface ExportedClip {
  videoId: string;           // YouTube video ID
  startTime: number;         // Seconds from video start (with offset applied)
  endTime: number;           // Seconds from video start
  label: string;             // "Attaque #7 - +"
  skill: Skill;              // From @volleyvision/data-model
  quality: Quality;          // '#', '+', '!', '-', '/', '='
  playerNumber: number;
  playerName: string;        // "Prenom NOM"
  setNumber: number;
  score: string;             // "15-12"
  youtubeUrl: string;        // Full timestamped URL
}

export interface PlaylistExport {
  version: '1.0';
  title: string;
  exportedBy: 'VolleyVision';
  createdAt: string;         // ISO 8601
  matchId: string;
  matchDate: string;
  homeTeam: string;
  awayTeam: string;
  videoId: string;
  clips: ExportedClip[];
  totalDuration: number;     // Sum of all clip durations in seconds
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format time in seconds as M:SS or H:MM:SS
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

/**
 * Sanitize filename by removing special characters
 * Keep: letters (including accents), digits, spaces, hyphens, dots
 */
export function sanitizeFilename(name: string): string {
  return name
    .normalize('NFC') // Normalize Unicode
    .replace(/[^\p{L}\p{N}\s\-\.]/gu, '') // Keep letters, numbers, spaces, hyphens, dots
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_+/g, '_') // Collapse multiple underscores
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    .substring(0, 200); // Limit length
}

/**
 * Generate a descriptive title based on the most frequent skill and player
 */
export function generateTitle(match: Match, items: FilteredAction[]): string {
  if (items.length === 0) {
    return `${match.homeTeam.name} vs ${match.awayTeam.name}`;
  }

  // Count skills
  const skillCounts: Record<string, number> = {};
  items.forEach(item => {
    const skill = item.action.skill;
    skillCounts[skill] = (skillCounts[skill] || 0) + 1;
  });

  // Find dominant skill (most frequent)
  const dominantSkill = Object.entries(skillCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] as Skill | undefined;

  const skillLabel = dominantSkill ? getSkillLabel(dominantSkill) : 'Actions';

  // Find most frequent player
  const playerCounts: Record<string, number> = {};
  items.forEach(item => {
    const playerId = item.action.player.id;
    playerCounts[playerId] = (playerCounts[playerId] || 0) + 1;
  });

  const dominantPlayerId = Object.entries(playerCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0];

  let title = '';

  if (dominantPlayerId) {
    const playerName = getPlayerName(dominantPlayerId, match);
    title = `${skillLabel}s de ${playerName}`;
  } else {
    title = skillLabel + 's';
  }

  // Add match context
  title += ` — ${match.homeTeam.name} vs ${match.awayTeam.name}`;

  return title;
}

/**
 * Download a Blob as a file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================================
// Main Export Builder
// ============================================================================

/**
 * Build a complete playlist export from filtered actions
 */
export function buildPlaylistExport(
  match: Match,
  items: FilteredAction[],
  videoId: string,
  offset: number,
  preRollSeconds: number,
  postRollSeconds: number,
  title?: string
): PlaylistExport {
  // 1. Filter items with valid timestamps
  const validItems = items.filter(item =>
    item.action.videoTimestamp != null || item.estimatedTimestamp != null
  );

  // 2. Build ExportedClip for each item
  const clips: ExportedClip[] = validItems.map(item => {
    const timestamp = item.action.videoTimestamp ?? item.estimatedTimestamp!;

    // Calculate time bounds with sequence awareness
    let startTime: number;
    let endTime: number;

    if (item.sequenceStart != null && item.sequenceEnd != null) {
      // Use full sequence bounds
      startTime = Math.max(0, item.sequenceStart + offset);
      endTime = item.sequenceEnd + offset;
    } else {
      // Use standard margins
      startTime = Math.max(0, timestamp + offset - preRollSeconds);
      endTime = timestamp + offset + postRollSeconds;
    }

    // Extract player info using existing formatters
    const player = getPlayer(item.action.player.id, match);
    const playerName = player ? `${player.firstName} ${player.lastName}` : 'Inconnu';
    const playerNumber = player?.number || 0;

    // Build label using existing helpers
    const skillLabel = getSkillLabel(item.action.skill);
    const quality = item.action.quality;
    const label = `${skillLabel} #${playerNumber} - ${quality}`;

    // Parse score from matchTime ("Set 2 — 15-12 — Rally #23")
    const scoreMatch = item.matchTime.match(/(\d+-\d+)/);
    const score = scoreMatch ? scoreMatch[1] : 'N/A';

    // Build YouTube URL
    const youtubeUrl = `https://youtu.be/${videoId}?t=${Math.floor(startTime)}`;

    return {
      videoId,
      startTime,
      endTime,
      label,
      skill: item.action.skill,
      quality,
      playerNumber,
      playerName,
      setNumber: item.setNumber,
      score,
      youtubeUrl,
    };
  });

  // 3. Calculate total duration
  const totalDuration = clips.reduce((sum, clip) =>
    sum + (clip.endTime - clip.startTime), 0
  );

  // 4. Generate or use provided title
  const finalTitle = title || generateTitle(match, items);

  // 5. Return complete export structure
  return {
    version: '1.0',
    title: finalTitle,
    exportedBy: 'VolleyVision',
    createdAt: new Date().toISOString(),
    matchId: match.id,
    matchDate: match.date,
    homeTeam: match.homeTeam.name,
    awayTeam: match.awayTeam.name,
    videoId,
    clips,
    totalDuration,
  };
}

// ============================================================================
// Export Format Functions
// ============================================================================

/**
 * Export playlist as JSON file
 */
export function exportAsJSON(playlist: PlaylistExport): void {
  const json = JSON.stringify(playlist, null, 2);
  const filename = sanitizeFilename(`${playlist.title}.volleyvision.json`);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  downloadBlob(blob, filename);
}

/**
 * Export playlist as CSV file
 */
export function exportAsCSV(playlist: PlaylistExport): void {
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
  const filename = sanitizeFilename(`${playlist.title}.csv`);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, filename);
}

/**
 * Export playlist as shareable URL (base64 encoded)
 * Returns the URL string
 * @param playlist - The playlist export data
 * @param origin - Optional origin URL (defaults to window.location.origin if available)
 */
export function exportAsShareURL(playlist: PlaylistExport, origin?: string): string {
  // Use provided origin or window.location.origin, with fallback for tests
  const baseOrigin = origin || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');

  // Create compressed structure
  const compressed = {
    v: playlist.videoId,
    c: playlist.clips.map(clip => [
      clip.startTime,
      clip.endTime,
      clip.label
    ])
  };

  const json = JSON.stringify(compressed);
  const base64 = btoa(unescape(encodeURIComponent(json))); // Handle Unicode
  const url = `${baseOrigin}?playlist=${base64}`;

  // Warn if URL too long (browsers have ~2000 char limit)
  if (url.length > 2000) {
    console.warn(`[exportPlaylist] URL too long (${url.length} chars). Falling back to first 20 clips.`);

    // Fallback: only include first 20 clips
    const fallbackCompressed = {
      v: playlist.videoId,
      c: playlist.clips.slice(0, 20).map(clip => [
        clip.startTime,
        clip.endTime,
        clip.label
      ])
    };
    const fallbackJson = JSON.stringify(fallbackCompressed);
    const fallbackBase64 = btoa(unescape(encodeURIComponent(fallbackJson)));
    return `${baseOrigin}?playlist=${fallbackBase64}`;
  }

  return url;
}

/**
 * Generate YouTube chapters text
 */
export function generateYouTubeChapters(playlist: PlaylistExport): string {
  const lines = playlist.clips.map((clip, i) => {
    const timestamp = formatTime(clip.startTime);
    return `${timestamp} — Clip ${i + 1}: ${clip.label}`;
  });

  return lines.join('\n');
}
