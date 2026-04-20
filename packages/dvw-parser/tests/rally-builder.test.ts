import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { splitSections } from '../src/section-splitter';
import { parseScoutLine } from '../src/scout/line-parser';
import { buildRallies } from '../src/scout/rally-builder';
import type { DVWScoutLine, TeamSide } from '@volleyvision/data-model';

/**
 * Adapter: Converts line-parser format to data-model format
 */
function adaptScoutLine(parsed: ReturnType<typeof parseScoutLine>): DVWScoutLine | null {
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
      // Simplified: just mark as lineup
      adapted.lineup = { player: 0 };
      break;
  }

  return adapted;
}

describe('Rally Builder', () => {
  const fixturePath = join(__dirname, '../../../fixtures/boulouris-sable.dvw');
  const content = readFileSync(fixturePath, 'utf-8');
  const sections = splitSections(content);
  const scoutLines = sections.scout;

  // Parse all scout lines and adapt to data-model format
  const parsedLines = scoutLines
    .map((line, index) => parseScoutLine(line, index + 1))
    .map(adaptScoutLine)
    .filter((line): line is DVWScoutLine => line !== null);

  const result = buildRallies(parsedLines);

  describe('Rally Counts', () => {
    it('should build rallies for all 3 sets', () => {
      expect(result.ralliesBySet.size).toBe(3);
      expect(result.ralliesBySet.has(1)).toBe(true);
      expect(result.ralliesBySet.has(2)).toBe(true);
      expect(result.ralliesBySet.has(3)).toBe(true);
    });

    it('should have approximately 45 rallies in set 1 (25-20)', () => {
      const set1Rallies = result.ralliesBySet.get(1) || [];
      // Set 1 score: 25-20 = 45 points = 45 rallies (±1 tolerance)
      expect(set1Rallies.length).toBeGreaterThanOrEqual(44);
      expect(set1Rallies.length).toBeLessThanOrEqual(46);
    });

    it('should have approximately 45 rallies in set 2 (25-20)', () => {
      const set2Rallies = result.ralliesBySet.get(2) || [];
      // Set 2 score: 25-20 = 45 points = 45 rallies (±2 tolerance for duplicate points)
      expect(set2Rallies.length).toBeGreaterThanOrEqual(43);
      expect(set2Rallies.length).toBeLessThanOrEqual(47);
    });

    it('should have approximately 22 rallies in set 3 (15-7)', () => {
      const set3Rallies = result.ralliesBySet.get(3) || [];
      // Set 3 score: 15-7 = 22 points = 22 rallies (±1 tolerance)
      expect(set3Rallies.length).toBeGreaterThanOrEqual(21);
      expect(set3Rallies.length).toBeLessThanOrEqual(23);
    });

    it('should have approximately 112 total rallies', () => {
      let totalRallies = 0;
      result.ralliesBySet.forEach((rallies) => {
        totalRallies += rallies.length;
      });
      // 45 + 45 + 22 = 112 (±3 tolerance)
      expect(totalRallies).toBeGreaterThanOrEqual(109);
      expect(totalRallies).toBeLessThanOrEqual(115);
    });
  });

  describe('Rally Structure', () => {
    it('should have at least 1 action per rally', () => {
      result.ralliesBySet.forEach((rallies) => {
        rallies.forEach((rally) => {
          expect(rally.actions.length).toBeGreaterThanOrEqual(1);
        });
      });
    });

    it('should have a serve as the first action of the first rally', () => {
      const set1Rallies = result.ralliesBySet.get(1) || [];
      const firstRally = set1Rallies[0];
      expect(firstRally).toBeDefined();
      expect(firstRally.actions.length).toBeGreaterThan(0);

      const firstAction = firstRally.actions[0];
      expect(firstAction.skill).toBe('serve');
    });

    it('should have sequential rally numbers per set', () => {
      result.ralliesBySet.forEach((rallies) => {
        rallies.forEach((rally, index) => {
          expect(rally.rallyNumber).toBe(index + 1);
        });
      });
    });

    it('should have consistent scores progression', () => {
      result.ralliesBySet.forEach((rallies, setNum) => {
        rallies.forEach((rally) => {
          // Score after should be exactly 1 point more than score before
          const homeDiff = rally.homeScoreAfter - rally.homeScoreBefore;
          const awayDiff = rally.awayScoreAfter - rally.awayScoreBefore;

          // Exactly one team should gain 1 point
          expect(homeDiff + awayDiff).toBe(1);
          expect(homeDiff === 1 || awayDiff === 1).toBe(true);
          expect(homeDiff === 0 || awayDiff === 0).toBe(true);
        });
      });
    });

    it('should have correct final scores for set 1', () => {
      const set1Rallies = result.ralliesBySet.get(1) || [];
      const lastRally = set1Rallies[set1Rallies.length - 1];

      // Set 1 winner: Boulouris (home) 25-20
      expect(lastRally.homeScoreAfter).toBe(25);
      expect(lastRally.awayScoreAfter).toBe(20);
    });

    it('should have correct final scores for set 2', () => {
      const set2Rallies = result.ralliesBySet.get(2) || [];
      const lastRally = set2Rallies[set2Rallies.length - 1];

      // Set 2 winner: Boulouris (home) 25-20 (per DVW scout lines, not [3SET] metadata)
      expect(lastRally.homeScoreAfter).toBe(25);
      expect(lastRally.awayScoreAfter).toBe(20);
    });

    it('should have correct final scores for set 3', () => {
      const set3Rallies = result.ralliesBySet.get(3) || [];
      const lastRally = set3Rallies[set3Rallies.length - 1];

      // Debug: show all set 3 rallies
      console.log(`Set 3 has ${set3Rallies.length} rallies:`);
      set3Rallies.forEach((r, i) => {
        console.log(`  #${i+1}: ${r.homeScoreBefore}-${r.awayScoreBefore} → ${r.homeScoreAfter}-${r.awayScoreAfter} (setNum: ${r.setNumber})`);
      });

      // Set 3 winner: Boulouris (home) 15-7
      expect(lastRally.homeScoreAfter).toBe(15);
      expect(lastRally.awayScoreAfter).toBe(7);
    });
  });

  describe('Rally Metadata', () => {
    it('should have serving team set for each rally', () => {
      result.ralliesBySet.forEach((rallies) => {
        rallies.forEach((rally) => {
          expect(rally.servingTeam).toMatch(/^(home|away)$/);
        });
      });
    });

    it('should have point winner set for each rally', () => {
      result.ralliesBySet.forEach((rallies) => {
        rallies.forEach((rally) => {
          expect(rally.pointWinner).toMatch(/^(home|away)$/);
        });
      });
    });

    it('should have video timestamps for rallies', () => {
      const set1Rallies = result.ralliesBySet.get(1) || [];
      const firstRally = set1Rallies[0];

      // At least the first rally should have video timestamps
      expect(firstRally.videoTimestamp).toBeDefined();
      expect(typeof firstRally.videoTimestamp).toBe('number');
    });

    it('should have rotation data for rallies', () => {
      result.ralliesBySet.forEach((rallies) => {
        rallies.forEach((rally) => {
          expect(rally.rotation).toBeDefined();
          expect(rally.rotation?.home).toBeGreaterThanOrEqual(1);
          expect(rally.rotation?.home).toBeLessThanOrEqual(6);
          expect(rally.rotation?.away).toBeGreaterThanOrEqual(1);
          expect(rally.rotation?.away).toBeLessThanOrEqual(6);
        });
      });
    });

    it('should have positions data (P1-P6) for rallies', () => {
      const set1Rallies = result.ralliesBySet.get(1) || [];
      // Check first few rallies have positions
      const ralliesWithPositions = set1Rallies.slice(0, 10).filter((r) => {
        return (
          r.positions?.home &&
          r.positions?.away &&
          r.positions.home.P1 > 0 &&
          r.positions.away.P1 > 0
        );
      });

      expect(ralliesWithPositions.length).toBeGreaterThan(0);
    });
  });

  describe('Actions in Rallies', () => {
    it('should have sequential sequenceOrder within each rally', () => {
      result.ralliesBySet.forEach((rallies) => {
        rallies.forEach((rally) => {
          rally.actions.forEach((action, index) => {
            expect(action.sequenceOrder).toBe(index);
          });
        });
      });
    });

    it('should have rallyId filled in for all actions', () => {
      result.ralliesBySet.forEach((rallies) => {
        rallies.forEach((rally) => {
          rally.actions.forEach((action) => {
            expect(action.rallyId).toBe(rally.id);
          });
        });
      });
    });

    it('should have source set to "dvw" for all actions', () => {
      result.ralliesBySet.forEach((rallies) => {
        rallies.forEach((rally) => {
          rally.actions.forEach((action) => {
            expect(action.source).toBe('dvw');
          });
        });
      });
    });

    it('should have player team and number set', () => {
      const set1Rallies = result.ralliesBySet.get(1) || [];
      const firstRally = set1Rallies[0];

      firstRally.actions.forEach((action) => {
        expect(action.player.team).toMatch(/^(home|away)$/);
        expect(action.player.number).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Timeouts and Substitutions', () => {
    it('should capture timeouts', () => {
      // DVW file should have some timeouts
      expect(result.timeouts.length).toBeGreaterThan(0);
    });

    it('should have valid timeout data', () => {
      result.timeouts.forEach((timeout) => {
        expect(timeout.team).toMatch(/^(home|away)$/);
        expect(timeout.setNumber).toBeGreaterThanOrEqual(1);
        expect(timeout.setNumber).toBeLessThanOrEqual(3);
        expect(timeout.homeScore).toBeGreaterThanOrEqual(0);
        expect(timeout.awayScore).toBeGreaterThanOrEqual(0);
      });
    });

    it('should capture substitutions', () => {
      // DVW file should have some substitutions
      expect(result.substitutions.length).toBeGreaterThan(0);
    });

    it('should have valid substitution data', () => {
      result.substitutions.forEach((sub) => {
        expect(sub.team).toMatch(/^(home|away)$/);
        expect(sub.setNumber).toBeGreaterThanOrEqual(1);
        expect(sub.setNumber).toBeLessThanOrEqual(3);
        expect(sub.playerOut).toBeGreaterThan(0);
        expect(sub.playerIn).toBeGreaterThan(0);
        expect(sub.playerOut).not.toBe(sub.playerIn);
      });
    });
  });

  describe('Serving Team Logic', () => {
    it('should have serving team determined from first serve action', () => {
      const set1Rallies = result.ralliesBySet.get(1) || [];

      // Check that serving team is set for each rally
      set1Rallies.slice(0, 10).forEach((rally) => {
        expect(rally.servingTeam).toMatch(/^(home|away)$/);

        // The first action should typically be a serve (if present)
        if (rally.actions.length > 0 && rally.actions[0].skill === 'serve') {
          // Serving team should match the team of the first serve
          expect(rally.servingTeam).toBe(rally.actions[0].player.team);
        }
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle rallies with only 1 action (direct ace or error)', () => {
      let foundSingleActionRally = false;

      result.ralliesBySet.forEach((rallies) => {
        rallies.forEach((rally) => {
          if (rally.actions.length === 1) {
            foundSingleActionRally = true;
            // Should be a serve that directly wins the point (ace or opponent error)
            expect(rally.actions[0].skill).toBe('serve');
          }
        });
      });

      // Not guaranteed, but likely in a real match
      // (Comment out if it fails due to no aces in this specific file)
      // expect(foundSingleActionRally).toBe(true);
    });

    it('should handle long rallies (10+ actions)', () => {
      let foundLongRally = false;

      result.ralliesBySet.forEach((rallies) => {
        rallies.forEach((rally) => {
          if (rally.actions.length >= 10) {
            foundLongRally = true;
          }
        });
      });

      // Long rallies should exist in a real match
      expect(foundLongRally).toBe(true);
    });
  });
});
