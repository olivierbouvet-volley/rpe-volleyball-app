/**
 * @file parse-dvw.ts
 * @description Main orchestration function that parses a complete DVW file into a Match object
 */

import type { Match, SetData, TeamSide } from '@volleyvision/data-model';
import { splitSections } from './section-splitter';
import { parseHeader, parseMatchInfo } from './sections/header';
import { parseTeams, parsePlayers } from './sections/teams';
import { parseSets } from './sections/sets';
import { parseAttackCombinations } from './sections/attack-combos';
import { parseSetterCalls } from './sections/setter-calls';
import { parseVideoPath } from './sections/video';
import { parseAllScoutLines } from './scout/line-parser';
import { buildRallies } from './scout/rally-builder';
import type { DVWScoutLine } from '@volleyvision/data-model';

/**
 * Adapter: Converts line-parser format to data-model format
 */
function adaptScoutLine(
  parsed: ReturnType<typeof parseAllScoutLines>[number]
): DVWScoutLine | null {
  if (!parsed) return null;

  // Determine team from action code
  const team: TeamSide = parsed.actionCode.startsWith('*') ? 'home' : 'away';

  const adapted: DVWScoutLine = {
    type: parsed.lineType,
    rawLine: parsed.rawLine,
    lineNumber: parsed.lineNumber,
    team,
    timestamp: parsed.meta.timestamp,
    setNumber: parsed.meta.setNumber,
    homeRotation: parsed.meta.homeRotation,
    awayRotation: parsed.meta.awayRotation,
    videoSeconds: parsed.meta.videoSeconds,
    homePositions: parsed.meta.homePositions,
    awayPositions: parsed.meta.awayPositions,
  };

  // Map type-specific fields
  switch (parsed.lineType) {
    case 'action':
      adapted.action = parsed.action;
      break;
    case 'point':
      if (parsed.homeScore !== undefined && parsed.awayScore !== undefined) {
        adapted.point = {
          homeScore: parsed.homeScore,
          awayScore: parsed.awayScore,
        };
      }
      break;
    case 'rotation':
      adapted.rotation = parsed.rotation;
      break;
    case 'substitution':
      if (parsed.playerOut !== undefined && parsed.playerIn !== undefined) {
        adapted.substitution = {
          playerOut: parsed.playerOut,
          playerIn: parsed.playerIn,
        };
      }
      break;
    case 'set-end':
      adapted.setEnd = parsed.setNumber;
      break;
    case 'lineup':
      adapted.lineup = { player: 0 };
      break;
  }

  return adapted;
}

/**
 * Main DVW parsing function
 *
 * Orchestrates all section parsers and rally builders to produce a complete Match object
 *
 * @param content - Full DVW file content as a string
 * @returns Parsed Match object with all data
 *
 * @example
 * ```typescript
 * const content = fs.readFileSync('match.dvw', 'utf-8');
 * const match = parseDVW(content);
 * console.log(match.homeTeam.name); // "POLE BOULOURIS"
 * console.log(match.sets.length); // 3
 * console.log(match.sets[0].rallies.length); // 45
 * ```
 */
export function parseDVW(content: string): Match {
  // 1. Split into sections
  const sections = splitSections(content);

  // 2. Parse header metadata
  const header = parseHeader(sections.dataVolleyScout);

  // 3. Parse match info
  const matchInfo = parseMatchInfo(sections.match);

  // 4. Parse teams
  const { home: homeTeamInfo, away: awayTeamInfo } = parseTeams(sections.teams);

  // 5. Parse players
  const homePlayers = parsePlayers(sections.playersHome, 'home');
  const awayPlayers = parsePlayers(sections.playersAway, 'away');

  // 6. Parse set scores
  const setsData = parseSets(sections.sets);

  // 7. Parse attack combinations and setter calls
  const attackCombos = parseAttackCombinations(sections.attackCombinations);
  const setterCallsList = parseSetterCalls(sections.setterCalls);

  // 8. Parse video path
  const videoPath = parseVideoPath(sections.video);

  // 9. Parse scout lines
  const rawScoutLines = parseAllScoutLines(sections.scout);
  const adaptedScoutLines = rawScoutLines
    .map(adaptScoutLine)
    .filter((line): line is DVWScoutLine => line !== null);

  // 10. Build rallies
  const { ralliesBySet, timeouts, substitutions } = buildRallies(adaptedScoutLines);

  // 11. Inject rallies into SetData
  const completeSets: SetData[] = setsData.map((setData) => {
    const rallies = ralliesBySet.get(setData.number) || [];
    return {
      ...setData,
      rallies,
    };
  });

  // 12. Determine overall winner
  const homeWins = completeSets.filter((s) => s.winner === 'home').length;
  const awayWins = completeSets.filter((s) => s.winner === 'away').length;
  const winner: TeamSide = homeWins > awayWins ? 'home' : 'away';

  // 13. Generate match ID
  const matchId = `${matchInfo.date}-${homeTeamInfo.code}-${awayTeamInfo.code}`;

  // 14. Assemble complete Match object
  const match: Match = {
    id: matchId,
    date: matchInfo.date,
    competition: matchInfo.competition,
    category: matchInfo.season,
    homeTeam: {
      ...homeTeamInfo,
      players: homePlayers,
    },
    awayTeam: {
      ...awayTeamInfo,
      players: awayPlayers,
    },
    sets: completeSets,
    result: {
      homeWins,
      awayWins,
      winner,
    },
    videoSources: videoPath
      ? [
          {
            type: 'local',
            url: videoPath,
            dvwLocalPath: videoPath,
          },
        ]
      : [],
    timeouts,
    substitutions,
    source: {
      type: 'dvw',
      importedAt: new Date().toISOString(),
      dvwVersion: header.fileFormat,
      dvwSoftware: header.software,
      dvwEditor: header.editor,
      dataCompleteness: 'full',
    },
    dvwMetadata: {
      attackCombinations: attackCombos,
      setterCalls: setterCallsList,
      videoPath,
    },
  };

  return match;
}
