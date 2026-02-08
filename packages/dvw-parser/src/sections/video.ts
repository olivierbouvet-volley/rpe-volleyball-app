/**
 * @file video.ts
 * @description Parser for video file paths from [3VIDEO] section
 */

/**
 * Parses the [3VIDEO] section and extracts the video file path
 * 
 * Format: Camera0=C:\Path\To\Video.mp4
 * 
 * @param lines - Array of video path lines (typically 0 or 1 line)
 * @returns Video file path string, or undefined if no video
 * 
 * @example
 * ```typescript
 * const lines = ['Camera0=C:\\Users\\maxim\\Videos\\INTERPOLE\\XXX00 POLE B vs POLE SABLE.mp4'];
 * const path = parseVideoPath(lines);
 * console.log(path); // "C:\\Users\\maxim\\Videos\\INTERPOLE\\XXX00 POLE B vs POLE SABLE.mp4"
 * ```
 */
export function parseVideoPath(lines: string[]): string | undefined {
  if (lines.length === 0) return undefined;
  
  for (const line of lines) {
    // Look for pattern: CameraN=PATH
    const match = line.match(/^Camera\d+=(.+)$/);
    if (match) {
      return match[1].trim();
    }
  }
  
  return undefined;
}
