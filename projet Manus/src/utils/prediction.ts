import type { Player, GroupPrediction, GroupType } from '../types';

/**
 * Prédiction basée uniquement sur le cycle (quand pas de check-in)
 */
function predictGroupByCycleOnly(player: Player): GroupPrediction {
  const { cyclePhase, cycleDay, hasSPM } = player;

  // Si pas de données de cycle -> Wonder Woman par défaut
  if (cyclePhase === 'unknown' || cycleDay === 0) {
    return {
      group: 'wonder_woman',
      reason: 'Pas de check-in - Cycle inconnu',
      confidence: 'low'
    };
  }

  // Phase Menstruelle (J1-J5) -> Récupération
  if (cyclePhase === 'menstrual' || (cycleDay >= 1 && cycleDay <= 5)) {
    return {
      group: 'recovery',
      reason: 'Pas de check-in - Phase Menstruelle (J1-J5)',
      confidence: 'medium'
    };
  }

  // Phase Folliculaire & Ovulatoire (J6-J16) -> Wonder Woman
  else if (cyclePhase === 'follicular' || cyclePhase === 'ovulatory' || (cycleDay >= 6 && cycleDay <= 16)) {
    return {
      group: 'wonder_woman',
      reason: 'Pas de check-in - Phase Folliculaire/Ovulatoire (J6-J16)',
      confidence: 'medium'
    };
  }

  // Phase Lutéale (J17-J28+) -> Bad Girl
  else {
    // Si SPM détecté hier -> Récupération
    if (hasSPM) {
      return {
        group: 'recovery',
        reason: 'Pas de check-in - SPM détecté précédemment',
        confidence: 'medium'
      };
    }
    return {
      group: 'bad_girl',
      reason: 'Pas de check-in - Phase Lutéale (J17+)',
      confidence: 'medium'
    };
  }
}

export function calculateWellnessScore(player: Player): number {
  // Calcul du score de bien-être global (0-100)
  // Basé sur : Readiness (50%), Energie (50%)
  // Pénalité SPM : -15 points
  
  const readinessPart = player.readinessScore * 0.5;
  const energyPart = (player.energy * 10) * 0.5;
  
  let score = readinessPart + energyPart;
  
  if (player.hasSPM) {
    score -= 15;
  }
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function predictGroup(player: Player): GroupPrediction {
  // On s'assure que le wellnessScore est à jour (au cas où il ne le serait pas dans l'objet)
  const score = player.wellnessScore || calculateWellnessScore(player);
  
  // Si pas de check-in du jour, se baser uniquement sur le cycle (ignorer le score)
  if (!player.hasCheckin) {
    return predictGroupByCycleOnly(player);
  }

  // 1. Score Critique (< 40%) -> Récupération directe
  if (score < 40) {
    return {
      group: 'recovery',
      reason: 'Score de bien-être critique (< 40%)',
      confidence: 'high'
    };
  }

  // 2. Logique basée sur le cycle menstruel et le score
  const { cyclePhase, cycleDay, hasSPM } = player;

  // Si pas de données de cycle -> Classification uniquement par score
  if (cyclePhase === 'unknown' || cycleDay === 0) {
    if (score >= 70) {
      return {
        group: 'wonder_woman',
        reason: 'Pas de données cycle - Score élevé',
        confidence: 'low'
      };
    } else if (score >= 50) {
      return {
        group: 'bad_girl',
        reason: 'Pas de données cycle - Score moyen',
        confidence: 'low'
      };
    } else {
      return {
        group: 'recovery',
        reason: 'Pas de données cycle - Score faible',
        confidence: 'low'
      };
    }
  }

  // Phase Menstruelle (J1-J5) -> Récupération par défaut
  if (cyclePhase === 'menstrual' || (cycleDay >= 1 && cycleDay <= 5)) {
    // Exception : Si score excellent (> 75%), on peut passer en Bad Girl
    if (score >= 75) {
      return {
        group: 'bad_girl',
        reason: 'Phase Menstruelle mais score élevé',
        confidence: 'medium'
      };
    }
    return {
      group: 'recovery',
      reason: 'Phase Menstruelle (J1-J5)',
      confidence: 'high'
    };
  }

  // Phase Folliculaire & Ovulatoire (J6-J16) -> Wonder Woman
  else if (cyclePhase === 'follicular' || cyclePhase === 'ovulatory' || (cycleDay >= 6 && cycleDay <= 16)) {
    // Condition : Score correct (> 60%) et pas de SPM (peu probable ici mais possible)
    if (score >= 60 && !hasSPM) {
      return {
        group: 'wonder_woman',
        reason: 'Phase Folliculaire/Ovulatoire (J6-J16)',
        confidence: 'high'
      };
    } else {
      // Si fatiguée en phase haute -> Bad Girl (Adaptation)
      return {
        group: 'bad_girl',
        reason: 'Phase haute mais score moyen',
        confidence: 'medium'
      };
    }
  }

  // Phase Lutéale (J17-J28+) -> Bad Girl
  else {
    // Si SPM ou score faible -> Récupération
    if (hasSPM || score < 50) {
      return {
        group: 'recovery',
        reason: hasSPM ? 'Syndrome Pré-Menstruel (SPM)' : 'Fin de cycle et fatigue',
        confidence: 'medium'
      };
    }
    // Si score très élevé (> 85%) -> Wonder Woman possible
    if (score > 85) {
        return {
            group: 'wonder_woman',
            reason: 'Phase Lutéale mais score exceptionnel',
            confidence: 'low'
        };
    }
    return {
      group: 'bad_girl',
      reason: 'Phase Lutéale (J17+)',
      confidence: 'high'
    };
  }
}

export function getGroupCounts(players: Player[]) {
  const counts: Record<GroupType, number> = {
    wonder_woman: 0,
    bad_girl: 0,
    recovery: 0
  };

  players.forEach(player => {
    const prediction = predictGroup(player);
    counts[prediction.group]++;
  });

  return counts;
}
