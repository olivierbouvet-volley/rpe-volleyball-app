import {
  DVWScoutLine,
  Rally,
  Action,
  TimeoutEvent,
  SubstitutionEvent,
  PlayerRotation,
  TeamSide,
} from '@volleyvision/data-model';

export interface BuildResult {
  ralliesBySet: Map<number, Rally[]>;
  timeouts: TimeoutEvent[];
  substitutions: SubstitutionEvent[];
}

/**
 * Builds Rally[] from DVWScoutLine[] by grouping actions between point markers.
 *
 * A rally starts after a point marker (or at set start) and ends at the next point marker.
 * The first action of each rally is typically a serve.
 */
export function buildRallies(lines: DVWScoutLine[]): BuildResult {
  // State variables
  let currentSet = 1;
  let currentActions: Action[] = [];
  let currentScoreHome = 0;
  let currentScoreAway = 0;
  let rallyCounter = 0;

  // Pending state for the next rally
  let pendingRotation = { home: 1, away: 1 };
  let pendingPositions: { home?: PlayerRotation; away?: PlayerRotation } = {};

  // Accumulators
  const allTimeouts: TimeoutEvent[] = [];
  const allSubstitutions: SubstitutionEvent[] = [];
  const ralliesBySet = new Map<number, Rally[]>();

  /**
   * Helper: Close the current rally and start a new one
   */
  const closeRally = (pointWinner: TeamSide, pointLine: DVWScoutLine) => {
    if (currentActions.length === 0) {
      // No actions in this rally (shouldn't happen, but safeguard)
      return;
    }

    rallyCounter++;

    // Determine serving team from first serve action
    const firstServe = currentActions.find((a) => a.skill === 'serve');
    const servingTeam: TeamSide = firstServe ? firstServe.player.team : 'home';

    // Scores before point
    const homeScoreBefore = currentScoreHome;
    const awayScoreBefore = currentScoreAway;

    // Update scores after point
    if (pointWinner === 'home') {
      currentScoreHome++;
    } else {
      currentScoreAway++;
    }

    const homeScoreAfter = currentScoreHome;
    const awayScoreAfter = currentScoreAway;

    // Create rally
    const rallyId = `set${currentSet}-rally${rallyCounter}`;
    const rally: Rally = {
      id: rallyId,
      setNumber: currentSet,
      rallyNumber: rallyCounter,
      homeScoreBefore,
      awayScoreBefore,
      homeScoreAfter,
      awayScoreAfter,
      servingTeam,
      pointWinner,
      actions: currentActions.map((action) => ({
        ...action,
        rallyId, // Fill in the rallyId
      })),
      videoTimestamp: currentActions[0]?.videoTimestamp,
      endVideoTimestamp: currentActions[currentActions.length - 1]?.videoTimestamp,
      rotation: { ...pendingRotation },
      positions: {
        home: pendingPositions.home ? { ...pendingPositions.home } : undefined!,
        away: pendingPositions.away ? { ...pendingPositions.away } : undefined!,
      },
    };

    // Add to set rallies
    if (!ralliesBySet.has(currentSet)) {
      ralliesBySet.set(currentSet, []);
    }
    ralliesBySet.get(currentSet)!.push(rally);

    // Reset for next rally
    currentActions = [];
  };

  /**
   * Helper: Convert DVWAction to Action
   */
  const convertAction = (line: DVWScoutLine, sequenceOrder: number): Action => {
    const dvwAction = line.action!;
    const playerId = dvwAction.isTeamError
      ? `${line.team}-team`
      : `${line.team}-${dvwAction.playerNumber}`;

    return {
      id: crypto.randomUUID(),
      rallyId: '', // Will be filled when closing rally
      sequenceOrder,
      player: {
        id: playerId,
        number: dvwAction.playerNumber,
        team: line.team,
        isTeamAction: dvwAction.isTeamError,
      },
      skill: dvwAction.skill,
      quality: dvwAction.quality,
      ballType: dvwAction.ballType,
      subtype: dvwAction.attackCombo,
      setterCall: dvwAction.setterCall,
      startZone: dvwAction.startZone,
      endZone: dvwAction.endZone,
      endSubZone: dvwAction.endSubZone,
      numBlockers: dvwAction.numBlockers,
      receiveEffect: dvwAction.receiveEffect,
      inNet: dvwAction.inNet,
      isOpponentError: dvwAction.isOpponentError,
      videoTimestamp: line.videoSeconds,
      source: 'dvw',
      modifiers: dvwAction.modifiers,
    };
  };

  /**
   * Helper: Parse PlayerRotation from positions array
   */
  const parsePositions = (positions?: number[]): PlayerRotation | undefined => {
    if (!positions || positions.length !== 6) return undefined;
    return {
      P1: positions[0],
      P2: positions[1],
      P3: positions[2],
      P4: positions[3],
      P5: positions[4],
      P6: positions[5],
    };
  };

  // ========== MAIN LOOP ==========

  for (const line of lines) {
    // Update positions if available (for every line)
    if (line.homePositions) {
      pendingPositions.home = parsePositions(line.homePositions);
    }
    if (line.awayPositions) {
      pendingPositions.away = parsePositions(line.awayPositions);
    }

    // Update rotations if available
    if (line.homeRotation) {
      pendingRotation.home = line.homeRotation;
    }
    if (line.awayRotation) {
      pendingRotation.away = line.awayRotation;
    }

    switch (line.type) {
      case 'set-end':
        // Set end marker - all rallies should already be closed by point markers
        // Just move to the next set
        currentSet++;
        rallyCounter = 0;
        currentScoreHome = 0;
        currentScoreAway = 0;

        // If there are any pending actions (shouldn't happen), warn but don't close
        if (currentActions.length > 0) {
          console.warn(`[rally-builder] Set ${currentSet - 1} ended with ${currentActions.length} unclosed actions`);
          currentActions = []; // Reset to avoid carrying over
        }
        break;

      case 'lineup':
        // Lineup information - already tracked in positions
        break;

      case 'rotation-init':
        // Initial rotation for set start
        if (line.rotation) {
          pendingRotation[line.team] = line.rotation;
        }
        break;

      case 'timeout':
        allTimeouts.push({
          team: line.team,
          setNumber: line.setNumber || currentSet,
          homeScore: currentScoreHome,
          awayScore: currentScoreAway,
          timestamp: line.timestamp,
          videoSeconds: line.videoSeconds,
        });
        break;

      case 'substitution':
        if (line.substitution) {
          allSubstitutions.push({
            team: line.team,
            playerOut: line.substitution.playerOut,
            playerIn: line.substitution.playerIn,
            setNumber: line.setNumber || currentSet,
            homeScore: currentScoreHome,
            awayScore: currentScoreAway,
            timestamp: line.timestamp,
            videoSeconds: line.videoSeconds,
          });
        }
        break;

      case 'rotation':
        // Rotation change - update pending rotation for next rally
        if (line.rotation) {
          pendingRotation[line.team] = line.rotation;
        }
        break;

      case 'action':
        // Add action to current rally
        const action = convertAction(line, currentActions.length);
        currentActions.push(action);
        break;

      case 'point':
        // Close rally with this point
        if (line.point) {
          // Determine point winner by comparing scores
          const newHomeScore = line.point.homeScore;
          const newAwayScore = line.point.awayScore;

          const pointWinner: TeamSide =
            newHomeScore > currentScoreHome ? 'home' : 'away';

          closeRally(pointWinner, line);

          // Update scores to match point marker
          currentScoreHome = newHomeScore;
          currentScoreAway = newAwayScore;
        }
        break;

      case 'player-entry':
        // Player entry without substitution - usually part of lineup
        break;

      default:
        // Unknown type - skip
        break;
    }
  }

  // Close any final pending rally (edge case: last rally without point marker)
  if (currentActions.length > 0) {
    const lastPointWinner: TeamSide =
      currentScoreHome > currentScoreAway ? 'home' : 'away';
    closeRally(lastPointWinner, lines[lines.length - 1]);
  }

  return {
    ralliesBySet,
    timeouts: allTimeouts,
    substitutions: allSubstitutions,
  };
}
