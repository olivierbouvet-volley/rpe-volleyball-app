/**
 * @file section-splitter.ts
 * @description Splits raw DVW file content into typed sections
 *
 * DVW file format contains multiple sections delimited by [3SECTIONNAME] headers:
 * - [3DATAVOLLEYSCOUT] — Metadata (version, software, etc.)
 * - [3MATCH] — Match info (date, venue, teams, result)
 * - [3TEAMS] — Team names/codes
 * - [3MORE] — Additional metadata
 * - [3SET] — Set scores (5 lines, one per set)
 * - [3PLAYERS-H] — Home team players
 * - [3PLAYERS-V] — Away team players
 * - [3ATTACKCOMBINATION] — Attack code definitions
 * - [3SETTERCALL] — Setter call definitions
 * - [3WINNINGSYMBOLS] — Visual winning symbols
 * - [3RESERVE] — Reserved data (often empty)
 * - [3VIDEO] — Video file path
 * - [3SCOUT] — Scout lines (actions, rallies, rotations, subs, etc.)
 *
 * Note: [3COMMENTS] may exist but is not standardized (ignored gracefully)
 */

/**
 * All standard DVW sections returned by splitSections()
 */
export interface DVWSections {
  /** [3DATAVOLLEYSCOUT] — File metadata (version, software, editor) */
  dataVolleyScout: string[];
  /** [3MATCH] — Match metadata (date, venue, score) */
  match: string[];
  /** [3MORE] — Additional metadata (2 lines) */
  more: string[];
  /** [3TEAMS] — Team names and codes (2 lines) */
  teams: string[];
  /** [3PLAYERS-H] — Home team players (variable count) */
  playersHome: string[];
  /** [3PLAYERS-V] — Away team players (variable count) */
  playersAway: string[];
  /** [3SET] — Set scores and metadata (exactly 5 lines) */
  sets: string[];
  /** [3ATTACKCOMBINATION] — Attack code definitions */
  attackCombinations: string[];
  /** [3SETTERCALL] — Setter call code definitions */
  setterCalls: string[];
  /** [3WINNINGSYMBOLS] — Visual winning symbols (1 line) */
  winningSymbols: string[];
  /** [3RESERVE] — Reserved section (usually empty) */
  reserve: string[];
  /** [3VIDEO] — Video file path (0 or 1 line) */
  video: string[];
  /** [3SCOUT] — Scout lines (600+ lines of actions, rotations, subs) */
  scout: string[];
}

/**
 * Mapping from DVW section headers to DVWSections property names
 */
const SECTION_HEADER_MAP: Record<string, keyof DVWSections> = {
  '[3DATAVOLLEYSCOUT]': 'dataVolleyScout',
  '[3MATCH]': 'match',
  '[3MORE]': 'more',
  '[3TEAMS]': 'teams',
  '[3PLAYERS-H]': 'playersHome',
  '[3PLAYERS-V]': 'playersAway',
  '[3SET]': 'sets',
  '[3ATTACKCOMBINATION]': 'attackCombinations',
  '[3SETTERCALL]': 'setterCalls',
  '[3WINNINGSYMBOLS]': 'winningSymbols',
  '[3RESERVE]': 'reserve',
  '[3VIDEO]': 'video',
  '[3SCOUT]': 'scout',
};

/**
 * Splits raw DVW file content into typed sections.
 *
 * @param content - Full DVW file content as a string
 * @returns DVWSections object with each section as an array of lines
 *
 * @example
 * ```typescript
 * const content = fs.readFileSync('match.dvw', 'utf-8');
 * const sections = splitSections(content);
 * console.log(sections.scout.length); // 600+
 * console.log(sections.teams); // ['BOULOURIS;;;', 'SABLE;;;']
 * ```
 */
export function splitSections(content: string): DVWSections {
  // Initialize result with empty arrays for all sections
  const sections: DVWSections = {
    dataVolleyScout: [],
    match: [],
    more: [],
    teams: [],
    playersHome: [],
    playersAway: [],
    sets: [],
    attackCombinations: [],
    setterCalls: [],
    winningSymbols: [],
    reserve: [],
    video: [],
    scout: [],
  };

  const lines = content.split(/\r?\n/); // Support both \n and \r\n
  let currentSection: keyof DVWSections | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines
    if (trimmedLine === '') continue;

    // Check if this line is a section header
    if (trimmedLine.startsWith('[3') && trimmedLine.endsWith(']')) {
      const sectionKey = SECTION_HEADER_MAP[trimmedLine];
      if (sectionKey) {
        currentSection = sectionKey;
      } else {
        // Unknown section (e.g., [3COMMENTS]) — ignore gracefully
        currentSection = null;
      }
      continue; // Don't add the header line itself
    }

    // Add content line to current section
    if (currentSection !== null) {
      sections[currentSection].push(trimmedLine);
    }
  }

  return sections;
}
