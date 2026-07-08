// ========================================
// BILAN DE SAISON - Dashboard Coach
// ========================================
// Vue Équipe et vue Individuelle exploitant les données RPE / check-ins / cycle
// existantes. Réutilise getYearRange() (app-volume-stats.js) et
// calculatePlayerScore() (app-reports.js).

console.log('Module Bilan de Saison chargé');

// Cache en mémoire de la liste des joueuses pour la session de l'onglet
let seasonReportPlayersCache = [];

const SYMPTOM_KEYS = ['cramps', 'headache', 'fatigue', 'moodSwings', 'bloating', 'backPain', 'breastTenderness'];
// Nommage préfixé volontairement : training-recommendations.js déclare aussi une
// constante `CYCLE_PHASES` au top-level (objet à 5 phases, structure différente).
// Les deux fichiers sont chargés via <script> classiques dans le même scope global
// — un même nom en `const` provoquerait un SyntaxError qui empêcherait l'un des
// deux fichiers de s'exécuter entièrement.
const SEASON_REPORT_CYCLE_PHASES = ['menstruation', 'follicular', 'ovulation', 'luteal'];
const CYCLE_PHASE_LABELS = {
    menstruation: 'Menstruation',
    follicular: 'Folliculaire',
    ovulation: 'Ovulation',
    luteal: 'Lutéale'
};

// ========================================
// 1. PLAGE DE DATES DU RAPPORT
// ========================================

function getReportDateRange() {
    const startInput = document.getElementById('reportStartDate');
    const endInput = document.getElementById('reportEndDate');

    const start = startInput ? startInput.value : '';
    const end = endInput ? endInput.value : '';

    if (!start || !end) {
        return getYearRange();
    }

    return { start, end };
}

// ========================================
// 2-3. REQUÊTES FIRESTORE
// ========================================

async function fetchRpeInRange(startDate, endDate, playerId = null) {
    try {
        let query = db.collection('rpe')
            .where('date', '>=', startDate)
            .where('date', '<=', endDate);

        if (playerId) {
            query = query.where('playerId', '==', playerId);
        }

        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Bilan de Saison: erreur fetchRpeInRange', error);
        return [];
    }
}

async function fetchCheckinsInRange(startDate, endDate, playerId = null) {
    try {
        let query = db.collection('checkins')
            .where('date', '>=', startDate)
            .where('date', '<=', endDate);

        if (playerId) {
            query = query.where('playerId', '==', playerId);
        }

        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Bilan de Saison: erreur fetchCheckinsInRange', error);
        return [];
    }
}

// ========================================
// UTILITAIRES DATES
// ========================================

// Découpe [startDate, endDate] en tranches de 7 jours, retourne un tableau
// de clés "S1", "S2", ... avec les bornes de chaque semaine.
function buildWeeklyBuckets(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const buckets = [];

    let cursor = new Date(start);
    let index = 1;
    while (cursor <= end) {
        const bucketStart = new Date(cursor);
        const bucketEnd = new Date(cursor);
        bucketEnd.setDate(bucketEnd.getDate() + 6);
        if (bucketEnd > end) bucketEnd.setTime(end.getTime());

        buckets.push({
            key: `S${index}`,
            start: bucketStart.toISOString().split('T')[0],
            end: bucketEnd.toISOString().split('T')[0]
        });

        cursor.setDate(cursor.getDate() + 7);
        index++;
    }

    return buckets;
}

function daysBetween(dateStrA, dateStrB) {
    const a = new Date(dateStrA);
    const b = new Date(dateStrB);
    return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function monthsBetween(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.max(1, daysBetween(startDate, endDate));
    return Math.max(1, totalDays / 30.44);
}

// Normalise les variantes orthographiques de sessionType (avec/sans accents,
// casse différente) rencontrées dans les données historiques du champ RPE,
// pour éviter que "Entrainement"/"Entraînement" (ou équivalents) apparaissent
// comme deux types de séance distincts dans les agrégations et le Bilan de Saison.
const SESSION_TYPE_ALIASES = {
    'entrainement': 'Entraînement',
    'entraînement': 'Entraînement',
    'preparation physique': 'Préparation Physique',
    'préparation physique': 'Préparation Physique',
    'recuperation active': 'Récupération Active',
    'récupération active': 'Récupération Active'
};

function normalizeSessionType(rawType) {
    if (!rawType) return 'Autre';
    const key = String(rawType).trim().toLowerCase();
    return SESSION_TYPE_ALIASES[key] || String(rawType).trim();
}

// Le champ `checkins.cyclePhase` est enregistré par cycle-checkin.js avec des
// libellés français capitalisés ('Menstruelle', 'Folliculaire', 'Ovulatoire',
// 'Lutéale'), ou des états spéciaux ('Cycle prolongé', 'Données manquantes',
// 'J1 futur') — pas les clés internes anglaises utilisées ici pour regrouper
// (menstruation/follicular/ovulation/luteal). Sans cette conversion, aucune
// donnée de cycle ne correspond jamais et tous les calculs par phase restent
// vides (graphique "Répartition des phases de cycle", meilleure/pire phase...).
const CYCLE_PHASE_VALUE_ALIASES = {
    'menstruelle': 'menstruation',
    'menstruation': 'menstruation',
    'folliculaire': 'follicular',
    'follicular': 'follicular',
    'ovulatoire': 'ovulation',
    'ovulation': 'ovulation',
    'lutéale': 'luteal',
    'luteale': 'luteal',
    'luteal': 'luteal'
};

function normalizeCyclePhaseValue(rawPhase) {
    if (!rawPhase) return null;
    const key = String(rawPhase).trim().toLowerCase();
    return CYCLE_PHASE_VALUE_ALIASES[key] || null;
}

// ========================================
// 4. AGRÉGATION CHARGE (RPE)
// ========================================

function aggregateWorkload(rpeDocs, startDate = null, endDate = null) {
    const byPlayer = {};
    const bySessionType = {};
    let totalLoad = 0;

    rpeDocs.forEach(doc => {
        const load = doc.load != null ? doc.load : (doc.rpe || 0) * (doc.duration || 0);
        totalLoad += load;

        if (!byPlayer[doc.playerId]) {
            byPlayer[doc.playerId] = { total: 0, count: 0 };
        }
        byPlayer[doc.playerId].total += load;
        byPlayer[doc.playerId].count += 1;

        const type = normalizeSessionType(doc.sessionType);
        if (!bySessionType[type]) bySessionType[type] = { total: 0, count: 0, totalDuration: 0 };
        bySessionType[type].total += load;
        bySessionType[type].count += 1;
        bySessionType[type].totalDuration += doc.duration || 0;
    });

    const playerAverages = {};
    Object.keys(byPlayer).forEach(pid => {
        playerAverages[pid] = {
            total: byPlayer[pid].total,
            average: byPlayer[pid].count > 0 ? byPlayer[pid].total / byPlayer[pid].count : 0,
            count: byPlayer[pid].count
        };
    });

    const sessionTypeAverages = {};
    Object.keys(bySessionType).forEach(type => {
        sessionTypeAverages[type] = {
            total: bySessionType[type].total,
            average: bySessionType[type].count > 0 ? bySessionType[type].total / bySessionType[type].count : 0,
            count: bySessionType[type].count,
            totalDuration: bySessionType[type].totalDuration
        };
    });

    // Série hebdomadaire (nécessite les bornes de la période pour un découpage stable)
    let weeklySeries = [];
    if (startDate && endDate) {
        const buckets = buildWeeklyBuckets(startDate, endDate);
        weeklySeries = buckets.map(bucket => {
            const docsInBucket = rpeDocs.filter(d => d.date >= bucket.start && d.date <= bucket.end);
            const total = docsInBucket.reduce((sum, d) => sum + (d.load != null ? d.load : (d.rpe || 0) * (d.duration || 0)), 0);
            return {
                key: bucket.key,
                start: bucket.start,
                end: bucket.end,
                total,
                count: docsInBucket.length,
                average: docsInBucket.length > 0 ? total / docsInBucket.length : 0
            };
        });

        // Retire les semaines sans aucune séance en début/fin de série (avant le
        // début réel de la saison ou après sa fin) pour ne pas écraser la partie
        // utile du graphique avec un long plateau à zéro.
        let firstActive = weeklySeries.findIndex(w => w.count > 0);
        let lastActive = -1;
        for (let i = weeklySeries.length - 1; i >= 0; i--) {
            if (weeklySeries[i].count > 0) { lastActive = i; break; }
        }
        if (firstActive === -1) {
            weeklySeries = [];
        } else {
            weeklySeries = weeklySeries.slice(firstActive, lastActive + 1);
        }
    }

    const avgLoadPerEntry = rpeDocs.length > 0 ? totalLoad / rpeDocs.length : 0;

    return {
        totalLoad,
        avgLoadPerEntry,
        byPlayer: playerAverages,
        bySessionType: sessionTypeAverages,
        weeklySeries
    };
}

// ========================================
// 5. AGRÉGATION BIEN-ÊTRE (checkins)
// ========================================

function aggregateWellness(checkinDocs) {
    const sums = { sleep: 0, soreness: 0, stress: 0, mood: 0, energy: 0 };
    const counts = { sleep: 0, soreness: 0, stress: 0, mood: 0, energy: 0 };

    checkinDocs.forEach(c => {
        ['sleep', 'soreness', 'stress', 'mood', 'energy'].forEach(field => {
            if (c[field] != null) {
                sums[field] += c[field];
                counts[field] += 1;
            }
        });
    });

    const averages = {};
    Object.keys(sums).forEach(field => {
        averages[field] = counts[field] > 0 ? sums[field] / counts[field] : null;
    });

    // Série temporelle du score, triée par date (un point par check-in — adapté
    // à la vue individuelle où il y a naturellement ~1 check-in par jour).
    const sorted = [...checkinDocs].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const scoreSeries = sorted.map(c => ({
        date: c.date,
        score: calculatePlayerScore(c)
    }));

    // Série moyenne par jour (un point par date, moyenne de toutes les joueuses
    // ce jour-là) — nécessaire pour la vue équipe, sinon le graphique superpose
    // les check-ins de toutes les joueuses et devient illisible.
    const scoresByDate = {};
    sorted.forEach(c => {
        if (!c.date) return;
        if (!scoresByDate[c.date]) scoresByDate[c.date] = [];
        scoresByDate[c.date].push(calculatePlayerScore(c));
    });
    const dailyAverageSeries = Object.keys(scoresByDate)
        .sort()
        .map(date => {
            const values = scoresByDate[date];
            return {
                date,
                score: values.reduce((a, b) => a + b, 0) / values.length,
                minScore: Math.min(...values),
                maxScore: Math.max(...values)
            };
        });

    const avgScore = scoreSeries.length > 0
        ? scoreSeries.reduce((sum, s) => sum + s.score, 0) / scoreSeries.length
        : null;

    return { averages, scoreSeries, dailyAverageSeries, avgScore };
}

// ========================================
// 6. AGRÉGATION CYCLE (checkins)
// ========================================

function aggregateCycleData(checkinDocs, totalPlayersCount) {
    const playersWithCycleData = new Set();
    const countByPhase = { menstruation: 0, follicular: 0, ovulation: 0, luteal: 0 };
    const symptomSums = {};
    const symptomCounts = {};
    SYMPTOM_KEYS.forEach(key => { symptomSums[key] = 0; symptomCounts[key] = 0; });

    // Charge/score par phase — jointure avec le rpe correspondant se fait au niveau appelant (renderTeamReport)
    // Ici on retourne uniquement le score du checkin par phase, la charge est jointe séparément.
    const scoreByPhase = { menstruation: [], follicular: [], ovulation: [], luteal: [] };

    checkinDocs.forEach(c => {
        if (c.cyclePhase) {
            playersWithCycleData.add(c.playerId);
            const normalizedPhase = normalizeCyclePhaseValue(c.cyclePhase);
            if (normalizedPhase && countByPhase.hasOwnProperty(normalizedPhase)) {
                countByPhase[normalizedPhase] += 1;
                scoreByPhase[normalizedPhase].push(calculatePlayerScore(c));
            }
        }
        if (c.symptoms) {
            SYMPTOM_KEYS.forEach(key => {
                if (c.symptoms[key] != null) {
                    symptomSums[key] += c.symptoms[key];
                    symptomCounts[key] += 1;
                }
            });
        }
    });

    const avgSymptoms = {};
    SYMPTOM_KEYS.forEach(key => {
        avgSymptoms[key] = symptomCounts[key] > 0 ? symptomSums[key] / symptomCounts[key] : null;
    });

    const avgScoreByPhase = {};
    SEASON_REPORT_CYCLE_PHASES.forEach(phase => {
        const arr = scoreByPhase[phase];
        avgScoreByPhase[phase] = arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    });

    const pctPlayersWithCycleData = totalPlayersCount > 0
        ? (playersWithCycleData.size / totalPlayersCount) * 100
        : 0;

    return {
        pctPlayersWithCycleData,
        countByPhase,
        avgSymptoms,
        avgScoreByPhase
    };
}

// ========================================
// 7. PROFIL CYCLE INFRADIEN (par joueuse)
// ========================================

function buildInfradianProfile(playerId, checkinDocsForPlayer, cycleProfileDoc, menstrualCycleDoc, playerRpeDocs, startDate, endDate) {
    const profile = {
        regularityWarning: null,
        cumulatedImpact: null,
        bestPhase: null,
        worstPhase: null,
        rpeInflation: null
    };

    // --- Régularité ---
    const isRegularFlag = cycleProfileDoc && cycleProfileDoc.isRegular === false;

    // On ne garde que le premier jour de chaque épisode de règles (dates consécutives regroupées)
    // pour obtenir les débuts de cycle, puis on compare les écarts (durée de cycle) entre eux.
    const rawPeriodDates = checkinDocsForPlayer
        .filter(c => c.hasPeriod === true && c.date)
        .map(c => c.date)
        .sort();

    const cycleStartDates = [];
    rawPeriodDates.forEach(date => {
        const previous = cycleStartDates[cycleStartDates.length - 1];
        if (!previous || daysBetween(previous, date) > 10) {
            cycleStartDates.push(date);
        }
    });

    let irregularVariationDetected = false;
    const cycleLengths = [];
    for (let i = 1; i < cycleStartDates.length; i++) {
        cycleLengths.push(daysBetween(cycleStartDates[i - 1], cycleStartDates[i]));
    }
    for (let i = 1; i < cycleLengths.length; i++) {
        if (Math.abs(cycleLengths[i] - cycleLengths[i - 1]) > 7) {
            irregularVariationDetected = true;
            break;
        }
    }

    if (isRegularFlag || irregularVariationDetected) {
        profile.regularityWarning = 'Cycle irrégulier (variation > 7 jours) à surveiller.';
    }

    // --- Impact cumulé ---
    // Seuil à 5/10 ("Modéré" selon l'échelle de couleurs déjà utilisée dans le
    // check-in cycle, cf. SYMPTOM_COLORS de cycle-checkin.js) plutôt que 7/10
    // ("Sévère" uniquement) : compte les jours avec au moins un symptôme modéré
    // à sévère, pas seulement les pics les plus hauts.
    const daysWithModerateOrSevereSymptom = new Set();
    checkinDocsForPlayer.forEach(c => {
        if (!c.symptoms || !c.date) return;
        const hasModerateOrSevere = SYMPTOM_KEYS.some(key => (c.symptoms[key] || 0) >= 5);
        if (hasModerateOrSevere) daysWithModerateOrSevereSymptom.add(c.date);
    });

    if (startDate && endDate) {
        const nbMonths = monthsBetween(startDate, endDate);
        const daysPerMonth = daysWithModerateOrSevereSymptom.size / nbMonths;
        profile.cumulatedImpact = {
            value: Math.round(daysPerMonth * 10) / 10,
            text: `En moyenne ${(Math.round(daysPerMonth * 10) / 10).toFixed(1)} jours/mois d'entraînement potentiellement sous-qualitatif liés aux symptômes de cycle.`
        };
    }

    // --- Meilleure / pire phase (performance rpe du même jour, sinon score checkin) ---
    const rpeByDate = {};
    (playerRpeDocs || []).forEach(r => {
        if (r.date && r.performance != null) {
            if (!rpeByDate[r.date]) rpeByDate[r.date] = [];
            rpeByDate[r.date].push(r.performance);
        }
    });

    const valuesByPhase = { menstruation: [], follicular: [], ovulation: [], luteal: [] };
    checkinDocsForPlayer.forEach(c => {
        const normalizedPhase = normalizeCyclePhaseValue(c.cyclePhase);
        if (!normalizedPhase || !valuesByPhase.hasOwnProperty(normalizedPhase)) return;
        if (rpeByDate[c.date] && rpeByDate[c.date].length > 0) {
            const avgPerf = rpeByDate[c.date].reduce((a, b) => a + b, 0) / rpeByDate[c.date].length;
            valuesByPhase[normalizedPhase].push(avgPerf);
        } else {
            valuesByPhase[normalizedPhase].push(calculatePlayerScore(c));
        }
    });

    const phaseAverages = [];
    SEASON_REPORT_CYCLE_PHASES.forEach(phase => {
        const arr = valuesByPhase[phase];
        if (arr.length >= 5) {
            phaseAverages.push({ phase, avg: arr.reduce((a, b) => a + b, 0) / arr.length });
        }
    });

    if (phaseAverages.length >= 2) {
        const sorted = [...phaseAverages].sort((a, b) => b.avg - a.avg);
        profile.bestPhase = { phase: sorted[0].phase, label: CYCLE_PHASE_LABELS[sorted[0].phase], avg: sorted[0].avg };
        profile.worstPhase = { phase: sorted[sorted.length - 1].phase, label: CYCLE_PHASE_LABELS[sorted[sorted.length - 1].phase], avg: sorted[sorted.length - 1].avg };
    }

    // --- Inflation RPE (par sessionType, jours symptômes >=7 vs sans) ---
    const checkinByDate = {};
    checkinDocsForPlayer.forEach(c => {
        if (c.date) checkinByDate[c.date] = c;
    });

    const rpeBySessionType = {};
    (playerRpeDocs || []).forEach(r => {
        const type = normalizeSessionType(r.sessionType);
        if (!rpeBySessionType[type]) rpeBySessionType[type] = { withSymptom: [], withoutSymptom: [] };

        const checkin = checkinByDate[r.date];
        const hasSevereSymptom = checkin && checkin.symptoms && SYMPTOM_KEYS.some(key => (checkin.symptoms[key] || 0) >= 7);

        if (hasSevereSymptom) {
            rpeBySessionType[type].withSymptom.push(r.rpe || 0);
        } else {
            rpeBySessionType[type].withoutSymptom.push(r.rpe || 0);
        }
    });

    let bestInflation = null;
    Object.keys(rpeBySessionType).forEach(type => {
        const { withSymptom, withoutSymptom } = rpeBySessionType[type];
        if (withSymptom.length >= 3 && withoutSymptom.length >= 3) {
            const avgWith = withSymptom.reduce((a, b) => a + b, 0) / withSymptom.length;
            const avgWithout = withoutSymptom.reduce((a, b) => a + b, 0) / withoutSymptom.length;
            if (avgWithout > 0) {
                const pctDiff = ((avgWith - avgWithout) / avgWithout) * 100;
                if (Math.abs(pctDiff) >= 10 && (!bestInflation || Math.abs(pctDiff) > Math.abs(bestInflation.pctDiff))) {
                    bestInflation = { sessionType: type, pctDiff };
                }
            }
        }
    });

    if (bestInflation) {
        const pctRounded = Math.round(bestInflation.pctDiff);
        profile.rpeInflation = {
            value: pctRounded,
            text: `Le ressenti d'effort augmente d'environ ${pctRounded}% les jours de symptômes marqués — ajuster les attentes de charge perçue.`
        };
    }

    return profile;
}

// ========================================
// 8. AXES D'AMÉLIORATION
// ========================================

function computeImprovementAxes(playerId, playerRpeDocs, playerCheckinDocs, teamAverages, startDate, endDate) {
    const axes = [];

    const sortedCheckins = [...playerCheckinDocs].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const midIndex = Math.floor(sortedCheckins.length / 2);
    const firstHalfCheckins = sortedCheckins.slice(0, midIndex);
    const secondHalfCheckins = sortedCheckins.slice(midIndex);

    // Règle 1 : score forme
    if (firstHalfCheckins.length > 0 && secondHalfCheckins.length > 0) {
        const avgFirst = firstHalfCheckins.reduce((s, c) => s + calculatePlayerScore(c), 0) / firstHalfCheckins.length;
        const avgSecond = secondHalfCheckins.reduce((s, c) => s + calculatePlayerScore(c), 0) / secondHalfCheckins.length;
        if (avgSecond < avgFirst - 1.5) {
            axes.push('Baisse de la forme générale en fin de période.');
        }
    }

    // Règle 2 : pic de charge non suivi de récupération
    if (startDate && endDate && playerRpeDocs.length > 0) {
        const buckets = buildWeeklyBuckets(startDate, endDate);
        const totalLoad = playerRpeDocs.reduce((s, r) => s + (r.load != null ? r.load : (r.rpe || 0) * (r.duration || 0)), 0);
        const avgLoadPeriod = playerRpeDocs.length > 0 ? totalLoad / buckets.length : 0;

        for (const bucket of buckets) {
            const docsInBucket = playerRpeDocs.filter(r => r.date >= bucket.start && r.date <= bucket.end);
            if (docsInBucket.length === 0) continue;
            const bucketLoad = docsInBucket.reduce((s, r) => s + (r.load != null ? r.load : (r.rpe || 0) * (r.duration || 0)), 0);
            const bucketAvg = bucketLoad / docsInBucket.length;

            if (avgLoadPeriod > 0 && bucketAvg >= avgLoadPeriod * 1.3) {
                const followingWeekStart = bucket.end;
                const followingWeekEnd = new Date(bucket.end);
                followingWeekEnd.setDate(followingWeekEnd.getDate() + 7);
                const followingWeekEndStr = followingWeekEnd.toISOString().split('T')[0];

                const hasRecoveryAfter = playerRpeDocs.some(r =>
                    r.date > followingWeekStart && r.date <= followingWeekEndStr && normalizeSessionType(r.sessionType) === 'Récupération Active'
                );

                if (!hasRecoveryAfter) {
                    axes.push('Pic de charge non suivi de récupération.');
                    break;
                }
            }
        }
    }

    // Règle 3 : compliance check-ins
    if (startDate && endDate) {
        const totalDays = Math.max(1, daysBetween(startDate, endDate) + 1);
        const complianceRate = playerCheckinDocs.length / totalDays;
        if (complianceRate < 0.5) {
            axes.push('Taux de remplissage des check-ins insuffisant.');
        }
    }

    // Règle 4 : symptôme sévère sans adaptation de charge visible.
    // La collection rest_periods (repos d'équipe : vacances, jours fériés) ne contient
    // aucune notion de joueuse individuelle, elle ne peut donc pas servir ici.
    // On regarde à la place, dans les propres séances de la joueuse, si une séance
    // "Récupération Active" (ou l'absence de séance) apparaît autour du jour de symptôme sévère.
    {
        const severeSymptomDays = playerCheckinDocs.filter(c =>
            c.symptoms && SYMPTOM_KEYS.some(key => (c.symptoms[key] || 0) >= 7)
        );

        const hasUnadaptedSevereSymptom = severeSymptomDays.some(c => {
            if (!c.date) return false;
            const hasNearbyAdaptation = playerRpeDocs.some(r => {
                if (!r.date) return false;
                const gap = Math.abs(daysBetween(c.date, r.date));
                return gap <= 2 && normalizeSessionType(r.sessionType) === 'Récupération Active';
            });
            return !hasNearbyAdaptation;
        });

        if (severeSymptomDays.length > 0 && hasUnadaptedSevereSymptom) {
            axes.push('Symptômes de cycle sévères sans adaptation de charge visible.');
        }
    }

    // Règle 5 : stress/courbatures élevés en fin de période
    if (secondHalfCheckins.length > 0) {
        const avgStress = secondHalfCheckins.reduce((s, c) => s + (c.stress || 0), 0) / secondHalfCheckins.length;
        const avgSoreness = secondHalfCheckins.reduce((s, c) => s + (c.soreness || 0), 0) / secondHalfCheckins.length;
        if (avgStress >= 7 || avgSoreness >= 7) {
            axes.push('Stress/courbatures élevés en fin de période.');
        }
    }

    // Règle 6 : vs équipe
    if (teamAverages && teamAverages.avgScore != null && sortedCheckins.length > 0) {
        const avgPlayerScore = sortedCheckins.reduce((s, c) => s + calculatePlayerScore(c), 0) / sortedCheckins.length;
        if (avgPlayerScore < teamAverages.avgScore - 1) {
            axes.push('Score de bien-être en dessous de la moyenne d\'équipe.');
        }
    }

    return axes.join('\n');
}

// ========================================
// 9. ALERTES SANTÉ
// ========================================

function computeHealthAlerts(playerId, playerCheckinDocs, cycleProfileDoc, regularityWarningDetected) {
    const alerts = [];

    // Aménorrhée
    // Seuil minimal de check-ins réellement remplis dans la fenêtre pour que le
    // signal soit fiable : un grand écart de dates peut simplement venir d'une
    // période sans aucune saisie (vacances, coupure...), pas d'une vraie absence
    // de règles. On exige un nombre minimum de check-ins ACTIFS sur la fenêtre
    // avant de conclure à une aménorrhée.
    const MIN_CHECKINS_FOR_AMENORRHEA_SIGNAL = 20;

    let amenorrheaDetected = cycleProfileDoc && cycleProfileDoc.hasAmenorrhea === true;
    let amenorrheaFromProfile = amenorrheaDetected;
    let amenorrheaCheckinCount = 0;
    let amenorrheaSpanDays = 0;

    if (!amenorrheaDetected) {
        // Ne garder que les check-ins où la question "règles aujourd'hui ?" a
        // réellement été posée/répondue (true ou false). Les check-ins antérieurs
        // à l'activation du suivi de cycle dans l'app (hasPeriod absent/null) ne
        // prouvent rien dans un sens ou dans l'autre et fausseraient le calcul.
        const sorted = [...playerCheckinDocs]
            .filter(c => c.date && (c.hasPeriod === true || c.hasPeriod === false))
            .sort((a, b) => a.date.localeCompare(b.date));

        if (sorted.length > 0) {
            const periodDates = sorted.filter(c => c.hasPeriod === true).map(c => c.date);
            const firstDate = sorted[0].date;
            const lastDate = sorted[sorted.length - 1].date;

            // Découpe la période en segments délimités par les dates de règles connues,
            // et ne retient un segment que s'il contient assez de check-ins actifs
            // ayant réellement répondu à la question du cycle.
            const boundaries = [firstDate, ...periodDates, lastDate].sort();
            for (let i = 1; i < boundaries.length; i++) {
                const segmentStart = boundaries[i - 1];
                const segmentEnd = boundaries[i];
                const spanDays = daysBetween(segmentStart, segmentEnd);
                if (spanDays < 45) continue;

                const checkinsInSegment = sorted.filter(c => c.date >= segmentStart && c.date <= segmentEnd).length;
                if (checkinsInSegment >= MIN_CHECKINS_FOR_AMENORRHEA_SIGNAL) {
                    amenorrheaDetected = true;
                    amenorrheaCheckinCount = checkinsInSegment;
                    amenorrheaSpanDays = spanDays;
                    break;
                }
            }
        }
    }

    if (amenorrheaDetected) {
        if (amenorrheaFromProfile) {
            alerts.push('Absence de règles constatée (déclarée dans le profil de la joueuse) — avis médical recommandé.');
        } else {
            alerts.push(`Absence de règles constatée sur ${amenorrheaSpanDays} jours, malgré ${amenorrheaCheckinCount} check-ins remplis sur cette période — avis médical recommandé.`);
        }
    }

    // RED-S
    const energyValues = playerCheckinDocs.filter(c => c.energy != null).map(c => c.energy);
    if (energyValues.length > 0) {
        const avgEnergy = energyValues.reduce((a, b) => a + b, 0) / energyValues.length;
        if (avgEnergy < 4 && (regularityWarningDetected || amenorrheaDetected)) {
            alerts.push('Signaux compatibles avec un déficit énergétique relatif (RED-S) — à faire évaluer par le staff médical.');
        }
    }

    // Symptômes sévères récurrents (>=9)
    let severeCount = 0;
    playerCheckinDocs.forEach(c => {
        if (!c.symptoms) return;
        SYMPTOM_KEYS.forEach(key => {
            if ((c.symptoms[key] || 0) >= 9) severeCount++;
        });
    });
    if (severeCount >= 3) {
        alerts.push('Douleurs de cycle sévères récurrentes non accompagnées d\'adaptation de charge.');
    }

    return alerts;
}

// ========================================
// UTILITAIRES HTML / IMPRESSION
// ========================================

// Échappe les caractères sensibles avant injection dans innerHTML.
// À utiliser systématiquement pour tout texte issu de Firestore ou saisi
// par l'utilisateur (notes médicales, axes d'amélioration, noms de joueuses...).
function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// Transforme un texte brut de notes médicales (convention Excel importée :
// sections "A. ..." à "F. ...", lignes "Label : valeur", chronologie
// "- DD/MM/YYYY [Type] Texte (source : Texte)", puces "•  Texte") en HTML
// structuré, utilisé comme mirroir d'impression du textarea correspondant.
// Fonction pure (aucun accès DOM), robuste si le texte ne suit pas la convention.
function formatStructuredNotesHtml(text) {
    if (!text) return '';
    const lines = String(text).split('\n');
    const blocks = [];

    let chronoBuffer = [];
    let bulletBuffer = [];

    const chronoRegex = /^- (\d{2}\/\d{2}\/\d{4})\s\[(.+?)\]\s(.+?)\s\(source\s*:\s*(.*)\)$/;
    const bulletRegex = /^•\s\s?/;
    const sectionRegex = /^[A-F]\.\s/;
    const fieldRegex = /^([^:]{2,40})\s:\s(.+)$/;

    function flushChrono() {
        if (chronoBuffer.length === 0) return;
        const rows = chronoBuffer.map(m =>
            `<tr><td>${escapeHtml(m[1])}</td><td>${escapeHtml(m[2])}</td><td>${escapeHtml(m[3])}</td><td>${escapeHtml(m[4])}</td></tr>`
        ).join('');
        blocks.push(`<table class="season-print-chrono"><thead><tr><th>Date</th><th>Type</th><th>Événement</th><th>Source</th></tr></thead><tbody>${rows}</tbody></table>`);
        chronoBuffer = [];
    }

    function flushBullets() {
        if (bulletBuffer.length === 0) return;
        const items = bulletBuffer.map(i => `<li>${escapeHtml(i)}</li>`).join('');
        blocks.push(`<ul class="season-print-list">${items}</ul>`);
        bulletBuffer = [];
    }

    lines.forEach(line => {
        if (line.trim() === '') {
            // Ligne vide = séparateur de paragraphe : ferme les blocs en cours
            flushChrono();
            flushBullets();
            return;
        }

        const chronoMatch = line.match(chronoRegex);
        if (chronoMatch) {
            flushBullets();
            chronoBuffer.push(chronoMatch);
            return;
        }
        flushChrono();

        if (sectionRegex.test(line)) {
            flushBullets();
            blocks.push(`<h4 class="season-print-section">${escapeHtml(line)}</h4>`);
            return;
        }

        if (bulletRegex.test(line)) {
            bulletBuffer.push(line.replace(bulletRegex, ''));
            return;
        }
        flushBullets();

        const fieldMatch = line.match(fieldRegex);
        if (fieldMatch && !/\d/.test(fieldMatch[1])) {
            blocks.push(`<div class="season-print-field"><strong>${escapeHtml(fieldMatch[1])}</strong> ${escapeHtml(fieldMatch[2])}</div>`);
            return;
        }

        blocks.push(`<p>${escapeHtml(line)}</p>`);
    });

    flushChrono();
    flushBullets();

    return blocks.join('');
}

// ========================================
// 13. SAUVEGARDE DES NOTES
// ========================================

async function saveReportNote(scope, playerId, field, value) {
    try {
        const docId = scope === 'global' ? 'global' : `player_${playerId}`;
        const data = {
            scope,
            [field]: value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (scope === 'player') {
            data.playerId = playerId;
        }
        await db.collection('seasonReportNotes').doc(docId).set(data, { merge: true });
        return true;
    } catch (error) {
        console.error('Bilan de Saison: erreur sauvegarde note', error);
        return false;
    }
}

// Bouton "Enregistrer" explicite + confirmation visuelle, en complément
// de la sauvegarde automatique au blur (le blur seul ne donne aucun retour visuel).
function attachSaveButton(buttonId, confirmId, textareaField, scope, playerId, field) {
    const btn = document.getElementById(buttonId);
    const confirmEl = document.getElementById(confirmId);
    if (!btn || !textareaField) return;

    btn.addEventListener('click', async function() {
        confirmEl && (confirmEl.textContent = '');
        btn.disabled = true;
        const success = await saveReportNote(scope, playerId, field, textareaField.value);
        btn.disabled = false;
        if (!confirmEl) return;

        confirmEl.classList.remove('season-save-confirm--error');
        confirmEl.textContent = success ? '✓ Enregistré' : '✗ Échec de l\'enregistrement, réessaie.';
        if (!success) confirmEl.classList.add('season-save-confirm--error');
        confirmEl.classList.add('season-save-confirm--visible');

        clearTimeout(confirmEl._hideTimeout);
        confirmEl._hideTimeout = setTimeout(() => {
            confirmEl.classList.remove('season-save-confirm--visible');
        }, 3000);
    });
}

async function fetchReportNote(scope, playerId) {
    try {
        const docId = scope === 'global' ? 'global' : `player_${playerId}`;
        const doc = await db.collection('seasonReportNotes').doc(docId).get();
        return doc.exists ? doc.data() : null;
    } catch (error) {
        console.error('Bilan de Saison: erreur lecture note', error);
        return null;
    }
}

// ========================================
// CHART.JS - HELPERS DE RENDU
// ========================================

function renderWorkloadChart(canvasId, weeklySeries) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const existing = Chart.getChart(canvas);
    if (existing) existing.destroy();

    new Chart(canvas, {
        type: 'line',
        data: {
            labels: weeklySeries.map(w => w.key),
            datasets: [{
                label: 'Charge moyenne',
                data: weeklySeries.map(w => Math.round(w.average * 10) / 10),
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'Tendance de charge', font: { size: 14, weight: 'bold' } },
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true },
                x: { ticks: { maxTicksLimit: 12, autoSkip: true } }
            }
        }
    });
}

function renderWellnessChart(canvasId, scoreSeries) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const existing = Chart.getChart(canvas);
    if (existing) existing.destroy();

    // Les courbes haute (max du jour) et basse (min du jour) ne sont disponibles
    // que sur la série moyenne par jour de la vue équipe (dailyAverageSeries),
    // pas sur la série brute par check-in de la vue individuelle.
    const hasMinMax = scoreSeries.length > 0 && scoreSeries[0].maxScore != null;

    const datasets = [{
        label: 'Score moyen',
        data: scoreSeries.map(s => s.score),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: hasMinMax ? false : true,
        pointRadius: 2
    }];

    if (hasMinMax) {
        datasets.push({
            label: 'Score le plus haut du jour',
            data: scoreSeries.map(s => s.maxScore),
            borderColor: '#3b82f6',
            backgroundColor: 'transparent',
            tension: 0.4,
            fill: false,
            pointRadius: 1,
            borderWidth: 1.5
        });
        datasets.push({
            label: 'Score le plus bas du jour',
            data: scoreSeries.map(s => s.minScore),
            borderColor: '#ef4444',
            backgroundColor: 'transparent',
            tension: 0.4,
            fill: false,
            pointRadius: 1,
            borderWidth: 1.5
        });
    }

    new Chart(canvas, {
        type: 'line',
        data: {
            labels: scoreSeries.map(s => s.date),
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'Tendance bien-être', font: { size: 14, weight: 'bold' } },
                legend: { display: hasMinMax, position: 'bottom' }
            },
            scales: {
                y: { beginAtZero: true, max: 10 },
                x: { ticks: { maxTicksLimit: 20, autoSkip: true } }
            }
        }
    });
}

function renderCyclePhaseChart(canvasId, countByPhase) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const existing = Chart.getChart(canvas);
    if (existing) existing.destroy();

    new Chart(canvas, {
        type: 'bar',
        data: {
            labels: SEASON_REPORT_CYCLE_PHASES.map(p => CYCLE_PHASE_LABELS[p]),
            datasets: [{
                label: 'Nombre de check-ins',
                data: SEASON_REPORT_CYCLE_PHASES.map(p => countByPhase[p] || 0),
                backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#8b5cf6'],
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'Répartition des phases de cycle', font: { size: 14, weight: 'bold' } },
                legend: { display: false }
            },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });
}

// ========================================
// 14. SYNTHÈSE NARRATIVE INDIVIDUELLE
// ========================================

// Retourne un paragraphe (2 à 4 phrases) résumant la période pour une joueuse :
// séances/charge vs équipe, tendance du score de bien-être vs équipe,
// et signaux de cycle (régularité, impact cumulé) s'ils existent.
function buildNarrativeSummary(playerId, playerRpeDocs, playerCheckinDocs, workload, wellness, infradianProfile, teamAverages) {
    if ((!playerCheckinDocs || playerCheckinDocs.length === 0) && (!playerRpeDocs || playerRpeDocs.length === 0)) {
        return ['Données insuffisantes sur cette période pour établir une synthèse.'];
    }

    const sentences = [];

    // Phrase 1 : nombre de séances et charge moyenne vs équipe
    const nbSeances = playerRpeDocs ? playerRpeDocs.length : 0;
    const avgLoad = workload && workload.avgLoadPerEntry != null ? Math.round(workload.avgLoadPerEntry) : null;
    const teamAvgLoad = teamAverages && teamAverages.avgLoad != null ? Math.round(teamAverages.avgLoad) : null;
    if (avgLoad != null) {
        let phrase1 = `Sur la période analysée, la joueuse a réalisé ${nbSeances} séance${nbSeances > 1 ? 's' : ''} pour une charge moyenne de ${avgLoad}`;
        if (teamAvgLoad != null) {
            phrase1 += ` (contre ${teamAvgLoad} pour l'équipe)`;
        }
        sentences.push(phrase1 + '.');
    } else if (nbSeances > 0) {
        sentences.push(`Sur la période analysée, la joueuse a réalisé ${nbSeances} séance${nbSeances > 1 ? 's' : ''}.`);
    }

    // Phrase 2 : tendance du score de bien-être (1ère vs 2e moitié) et comparaison équipe
    const sortedCheckins = [...(playerCheckinDocs || [])].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    if (sortedCheckins.length > 0 && wellness && wellness.avgScore != null) {
        const midIndex = Math.floor(sortedCheckins.length / 2);
        const firstHalf = sortedCheckins.slice(0, midIndex);
        const secondHalf = sortedCheckins.slice(midIndex);

        let trendText = '';
        if (firstHalf.length > 0 && secondHalf.length > 0) {
            const avgFirst = firstHalf.reduce((s, c) => s + calculatePlayerScore(c), 0) / firstHalf.length;
            const avgSecond = secondHalf.reduce((s, c) => s + calculatePlayerScore(c), 0) / secondHalf.length;
            if (avgSecond - avgFirst >= 1) {
                trendText = ', en hausse sur la deuxième moitié de la période';
            } else if (avgFirst - avgSecond >= 1) {
                trendText = ', en légère baisse sur la deuxième moitié de la période';
            } else {
                trendText = ', stable sur la période';
            }
        }

        let teamCompareText = '';
        if (teamAverages && teamAverages.avgScore != null) {
            const delta = wellness.avgScore - teamAverages.avgScore;
            if (delta >= 1) {
                teamCompareText = ', au-dessus de la moyenne de l\'équipe';
            } else if (delta <= -1) {
                teamCompareText = ', en dessous de la moyenne de l\'équipe';
            } else {
                teamCompareText = ', dans la moyenne de l\'équipe';
            }
        }

        sentences.push(`Son score de bien-être moyen est de ${wellness.avgScore.toFixed(1)}/10${trendText}${teamCompareText}.`);
    }

    // Phrase 3 : régularité du cycle
    if (infradianProfile && infradianProfile.regularityWarning) {
        sentences.push(`Concernant le cycle : ${infradianProfile.regularityWarning}`);
    }

    // Phrase 4 : impact cumulé
    if (infradianProfile && infradianProfile.cumulatedImpact) {
        sentences.push(infradianProfile.cumulatedImpact.text);
    }

    if (sentences.length === 0) {
        return ['Données insuffisantes sur cette période pour établir une synthèse.'];
    }

    return sentences;
}

// ========================================
// 15. DÉTAIL DE LA RÉPARTITION DE CHARGE
// ========================================

// Construit le HTML du tableau de répartition de charge par type de séance,
// avec la moyenne de séances/semaine et la comparaison de la part "Match"
// entre 1ère et 2e moitié de la période.
function buildWorkloadBreakdownHtml(workload, rpeDocs, startDate, endDate) {
    const nbWeeks = Math.max(1, (workload.weeklySeries || []).length);
    const avgPerWeek = Math.round((rpeDocs.length / nbWeeks) * 10) / 10;

    const types = Object.keys(workload.bySessionType || {});
    const sortedTypes = types
        .map(type => ({ type, ...workload.bySessionType[type] }))
        .sort((a, b) => b.total - a.total);

    const rows = sortedTypes.map(t => {
        const pct = workload.totalLoad > 0 ? Math.round((t.total / workload.totalLoad) * 100) : 0;
        const cumulatedHours = Math.round(((t.totalDuration || 0) / 60) * 10) / 10;
        return `<tr><td>${escapeHtml(t.type)}</td><td>${t.count}</td><td>${cumulatedHours.toFixed(1)}h</td><td>${Math.round(t.total)}</td><td>${Math.round(t.average)}</td><td>${pct}%</td></tr>`;
    }).join('');

    const table = `<table class="season-workload-table"><thead><tr><th>Type de séance</th><th>Nombre de séances</th><th>Temps cumulé</th><th>Charge totale</th><th>Charge moyenne</th><th>% de la charge totale</th></tr></thead><tbody>${rows}</tbody></table>`;

    // Comparaison de la part de charge "Match" entre 1ère et 2e moitié de la période
    const sortedDocs = [...rpeDocs].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const midIndex = Math.floor(sortedDocs.length / 2);
    const firstHalf = sortedDocs.slice(0, midIndex);
    const secondHalf = sortedDocs.slice(midIndex);

    function matchSharePct(docs) {
        if (!docs || docs.length === 0) return null;
        const total = docs.reduce((s, d) => s + (d.load != null ? d.load : (d.rpe || 0) * (d.duration || 0)), 0);
        if (total === 0) return null;
        const matchTotal = docs
            .filter(d => normalizeSessionType(d.sessionType) === 'Match')
            .reduce((s, d) => s + (d.load != null ? d.load : (d.rpe || 0) * (d.duration || 0)), 0);
        return Math.round((matchTotal / total) * 100);
    }

    const firstPct = matchSharePct(firstHalf);
    const secondPct = matchSharePct(secondHalf);
    const firstPctText = firstPct != null ? `${firstPct}%` : 'non disponible';
    const secondPctText = secondPct != null ? `${secondPct}%` : 'non disponible';

    return `<div class="season-workload-breakdown">
            <h3><i class="fas fa-layer-group" style="margin-right:6px;"></i>Répartition de la charge</h3>
            <p>Moyenne de ${avgPerWeek.toFixed(1)} séances par semaine sur la période.</p>
            ${table}
            <p>Part de la charge liée aux matchs : ${firstPctText} en première moitié de période, ${secondPctText} en seconde moitié.</p>
        </div>`;
}

// ========================================
// 16. RECOMMANDATIONS DE PÉRIODISATION (CYCLE)
// ========================================

// Retourne 0 à 2 recommandations d'entraînement liées à la meilleure/pire
// phase de cycle détectée. Ne s'applique que si bestPhase ET worstPhase
// sont déjà établis (même condition que l'affichage existant).
function buildPeriodizationRecommendations(infradianProfile) {
    const recos = [];
    if (!infradianProfile || !infradianProfile.bestPhase || !infradianProfile.worstPhase) {
        return recos;
    }

    if (infradianProfile.bestPhase.phase === 'follicular' || infradianProfile.bestPhase.phase === 'ovulation') {
        recos.push("Phase folliculaire/ovulatoire (fenêtre de performance) : c'est le moment le plus favorable pour la force maximale, la pliométrie et le travail explosif.");
    }
    if (infradianProfile.worstPhase.phase === 'luteal') {
        recos.push("Phase lutéale : privilégier le volume, l'endurance et le travail technique/tactique plutôt que l'intensité maximale, et prévoir une récupération plus longue.");
    }
    if (infradianProfile.worstPhase.phase === 'menstruation') {
        recos.push("Phase de menstruation : adapter l'échauffement et rester à l'écoute des douleurs, sans réduire systématiquement la charge si la joueuse se sent bien.");
    }

    return recos;
}

// ========================================
// 10. RENDU VUE ÉQUIPE
// ========================================

async function renderTeamReport() {
    const container = document.getElementById('seasonReportTeamView');
    if (!container) return;

    container.innerHTML = '<p class="season-report-empty">Chargement du bilan d\'équipe...</p>';

    const { start, end } = getReportDateRange();

    const [rpeDocs, checkinDocs, playersSnapshot] = await Promise.all([
        fetchRpeInRange(start, end),
        fetchCheckinsInRange(start, end),
        db.collection('players').get()
    ]);

    const players = playersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    seasonReportPlayersCache = players;

    const workload = aggregateWorkload(rpeDocs, start, end);
    const wellness = aggregateWellness(checkinDocs);
    const cycleData = aggregateCycleData(checkinDocs, players.length);

    const totalDays = Math.max(1, daysBetween(start, end) + 1);
    const expectedCheckins = totalDays * Math.max(1, players.length);
    const fillRate = expectedCheckins > 0 ? (checkinDocs.length / expectedCheckins) * 100 : 0;

    // Cache pour comparaison individuelle
    window.__seasonReportTeamAverages = {
        avgScore: wellness.avgScore,
        avgLoad: workload.avgLoadPerEntry
    };

    const existingNote = await fetchReportNote('global', null);
    const globalMedicalNotesValue = existingNote && existingNote.medicalNotes ? existingNote.medicalNotes : '';

    const workloadBreakdownHtml = buildWorkloadBreakdownHtml(workload, rpeDocs, start, end);

    container.innerHTML = `
        <div class="season-kpi-grid">
            <div class="season-kpi-card">
                <div class="season-kpi-label">Score moyen équipe</div>
                <div class="season-kpi-value">${wellness.avgScore != null ? wellness.avgScore.toFixed(1) : '--'}</div>
            </div>
            <div class="season-kpi-card">
                <div class="season-kpi-label">Charge moyenne</div>
                <div class="season-kpi-value">${workload.avgLoadPerEntry ? Math.round(workload.avgLoadPerEntry) : '--'}</div>
            </div>
            <div class="season-kpi-card">
                <div class="season-kpi-label">% Remplissage check-ins</div>
                <div class="season-kpi-value">${fillRate.toFixed(0)}%</div>
            </div>
            <div class="season-kpi-card">
                <div class="season-kpi-label">% Suivi cycle</div>
                <div class="season-kpi-value">${cycleData.pctPlayersWithCycleData.toFixed(0)}%</div>
            </div>
        </div>

        ${workloadBreakdownHtml}

        <div class="season-charts-grid">
            <div class="season-chart-card season-chart-card--wide"><canvas id="seasonTeamWellnessChart"></canvas></div>
            <div class="season-chart-card"><canvas id="seasonTeamWorkloadChart"></canvas></div>
            <div class="season-chart-card"><canvas id="seasonTeamCyclePhaseChart"></canvas></div>
        </div>

        <div class="season-textarea-block">
            <label for="globalMedicalNotes">Notes médicales / observations d'équipe</label>
            <textarea id="globalMedicalNotes" placeholder="Notes libres sur la saison de l'équipe...">${escapeHtml(globalMedicalNotesValue)}</textarea>
            <div id="globalMedicalNotesPrint" class="season-print-mirror"></div>
            <div class="season-save-row">
                <button type="button" id="globalMedicalNotesSaveBtn" class="season-save-btn">Enregistrer</button>
                <span id="globalMedicalNotesConfirm" class="season-save-confirm"></span>
            </div>
        </div>
    `;

    renderWorkloadChart('seasonTeamWorkloadChart', workload.weeklySeries);
    renderWellnessChart('seasonTeamWellnessChart', wellness.dailyAverageSeries);
    renderCyclePhaseChart('seasonTeamCyclePhaseChart', cycleData.countByPhase);

    const globalNotesField = document.getElementById('globalMedicalNotes');
    const globalNotesPrintMirror = document.getElementById('globalMedicalNotesPrint');

    function syncGlobalMedicalNotesMirror() {
        if (globalNotesField && globalNotesPrintMirror) {
            globalNotesPrintMirror.innerHTML = formatStructuredNotesHtml(globalNotesField.value);
        }
    }

    syncGlobalMedicalNotesMirror();

    if (globalNotesField) {
        globalNotesField.addEventListener('input', syncGlobalMedicalNotesMirror);
        globalNotesField.addEventListener('blur', function() {
            saveReportNote('global', null, 'medicalNotes', this.value);
        });
    }

    attachSaveButton('globalMedicalNotesSaveBtn', 'globalMedicalNotesConfirm', globalNotesField, 'global', null, 'medicalNotes');
}

// ========================================
// 11B. PROFIL PERSONNALISÉ — HISTORIQUE COMPLET (cycle-profile-engine.js)
// ========================================

// Construit le bloc HTML du profil personnalisé (basé sur TOUT l'historique de la
// joueuse, indépendamment de la période sélectionnée dans le Bilan de Saison).
// Réutilise la classe CSS "season-workload-table" déjà stylée.
function buildPersonalCycleProfileHtml(personalProfile) {
    if (!personalProfile || personalProfile.insufficientData) {
        const message = personalProfile && personalProfile.message
            ? personalProfile.message
            : 'Pas encore assez de données sur plusieurs cycles pour établir un profil individuel fiable.';
        return `
            <div class="season-personal-cycle-profile">
                <h3><i class="fas fa-venus" style="margin-right:6px;"></i>Profil personnalisé — historique complet</h3>
                <p class="season-report-empty">${escapeHtml(message)}</p>
            </div>
        `;
    }

    const rows = SEASON_REPORT_CYCLE_PHASES
        .filter(phase => personalProfile.phaseProfiles[phase])
        .map(phase => {
            const p = personalProfile.phaseProfiles[phase];
            const energyText = p.avgEnergy != null ? p.avgEnergy.toFixed(1) : '--';
            const scoreText = p.avgScore != null ? p.avgScore.toFixed(1) : '--';
            const rpeText = p.avgRpe != null ? p.avgRpe.toFixed(1) : '--';
            return `<tr><td>${escapeHtml(CYCLE_PHASE_LABELS[phase])}</td><td>${energyText}</td><td>${scoreText}</td><td>${rpeText}</td><td>${p.count}</td></tr>`;
        }).join('');

    const table = `<table class="season-workload-table"><thead><tr><th>Phase</th><th>Énergie moy.</th><th>Score moy.</th><th>RPE moy.</th><th>Nb points</th></tr></thead><tbody>${rows}</tbody></table>`;

    const matchLabelsList = SEASON_REPORT_CYCLE_PHASES
        .filter(phase => personalProfile.phaseProfiles[phase])
        .map(phase => `<li>${escapeHtml(CYCLE_PHASE_LABELS[phase])} — ${escapeHtml(personalProfile.phaseProfiles[phase].matchLabel)}</li>`)
        .join('');

    return `
        <div class="season-personal-cycle-profile">
            <h3><i class="fas fa-venus" style="margin-right:6px;"></i>Profil personnalisé — historique complet</h3>
            ${table}
            <ul>${matchLabelsList}</ul>
        </div>
    `;
}

// ========================================
// 11. RENDU VUE INDIVIDUELLE
// ========================================

async function renderPlayerReport(playerId) {
    const container = document.getElementById('seasonReportPlayerView');
    if (!container) return;

    container.innerHTML = '<p class="season-report-empty">Chargement du bilan de la joueuse...</p>';

    const { start, end } = getReportDateRange();

    const [playerRpeDocs, playerCheckinDocs, cycleProfileSnap, menstrualCycleSnap] = await Promise.all([
        fetchRpeInRange(start, end, playerId),
        fetchCheckinsInRange(start, end, playerId),
        db.collection('cycleProfiles').doc(playerId).get(),
        db.collection('menstrualCycle').doc(playerId).get()
    ]);

    const cycleProfileDoc = cycleProfileSnap.exists ? cycleProfileSnap.data() : null;
    const menstrualCycleDoc = menstrualCycleSnap.exists ? menstrualCycleSnap.data() : null;

    const workload = aggregateWorkload(playerRpeDocs, start, end);
    const wellness = aggregateWellness(playerCheckinDocs);

    const teamAverages = window.__seasonReportTeamAverages || { avgScore: null, avgLoad: null };

    const infradianProfile = buildInfradianProfile(playerId, playerCheckinDocs, cycleProfileDoc, menstrualCycleDoc, playerRpeDocs, start, end);
    const healthAlerts = computeHealthAlerts(playerId, playerCheckinDocs, cycleProfileDoc, !!infradianProfile.regularityWarning);

    // Profil personnalisé basé sur l'historique COMPLET de la joueuse (indépendant
    // de la période start/end sélectionnée dans le Bilan de Saison).
    const personalProfile = await buildPersonalCycleProfile(playerId);

    const existingNote = await fetchReportNote('player', playerId);

    let improvementAxesText;
    if (existingNote && existingNote.improvementAxes != null && existingNote.improvementAxes !== '') {
        improvementAxesText = existingNote.improvementAxes;
    } else {
        improvementAxesText = computeImprovementAxes(playerId, playerRpeDocs, playerCheckinDocs, teamAverages, start, end);
    }

    const scoreDelta = (wellness.avgScore != null && teamAverages.avgScore != null)
        ? wellness.avgScore - teamAverages.avgScore
        : null;
    const loadDelta = (workload.avgLoadPerEntry != null && teamAverages.avgLoad != null && teamAverages.avgLoad > 0)
        ? workload.avgLoadPerEntry - teamAverages.avgLoad
        : null;

    function deltaClass(delta) {
        if (delta == null) return 'season-kpi-delta--neutral';
        return delta >= 0 ? 'season-kpi-delta--positive' : 'season-kpi-delta--negative';
    }

    function deltaText(delta, unit) {
        if (delta == null) return '';
        const sign = delta >= 0 ? '+' : '';
        return `${sign}${delta.toFixed(1)}${unit} vs équipe`;
    }

    let healthAlertsHtml = '';
    if (healthAlerts.length > 0) {
        healthAlertsHtml = `
            <div class="season-health-alerts">
                <h3><i class="fas fa-triangle-exclamation"></i>Alertes santé</h3>
                <ul>${healthAlerts.map(a => `<li>${escapeHtml(a)}</li>`).join('')}</ul>
            </div>
        `;
    }

    let cycleProfileHtml = '';
    const cycleItems = [];
    if (infradianProfile.regularityWarning) {
        cycleItems.push(`<div class="season-cycle-profile-item"><strong>Régularité</strong>${escapeHtml(infradianProfile.regularityWarning)}</div>`);
    }
    if (infradianProfile.cumulatedImpact) {
        cycleItems.push(`<div class="season-cycle-profile-item"><strong>Impact cumulé</strong>${escapeHtml(infradianProfile.cumulatedImpact.text)}</div>`);
    }
    if (infradianProfile.bestPhase && infradianProfile.worstPhase) {
        cycleItems.push(`<div class="season-cycle-profile-item"><strong>Meilleure phase</strong>${escapeHtml(infradianProfile.bestPhase.label)} (moyenne ${infradianProfile.bestPhase.avg.toFixed(1)})</div>`);
        cycleItems.push(`<div class="season-cycle-profile-item"><strong>Phase la plus difficile</strong>${escapeHtml(infradianProfile.worstPhase.label)} (moyenne ${infradianProfile.worstPhase.avg.toFixed(1)})</div>`);
        buildPeriodizationRecommendations(infradianProfile).forEach(text => {
            cycleItems.push('<div class="season-cycle-profile-item"><strong>Recommandation d\'entraînement</strong>' + escapeHtml(text) + '</div>');
        });
    }
    if (infradianProfile.rpeInflation) {
        cycleItems.push(`<div class="season-cycle-profile-item"><strong>Inflation RPE</strong>${escapeHtml(infradianProfile.rpeInflation.text)}</div>`);
    }

    if (cycleItems.length > 0) {
        cycleProfileHtml = `
            <div class="season-cycle-profile">
                <h3><i class="fas fa-venus" style="margin-right:6px;"></i>Profil Cycle</h3>
                ${cycleItems.join('')}
            </div>
        `;
    }

    const narrativeSummary = buildNarrativeSummary(playerId, playerRpeDocs, playerCheckinDocs, workload, wellness, infradianProfile, teamAverages);
    const workloadBreakdownHtml = buildWorkloadBreakdownHtml(workload, playerRpeDocs, start, end);
    const playerMedicalNotesValue = existingNote && existingNote.medicalNotes ? existingNote.medicalNotes : '';

    container.innerHTML = `
        <div class="season-kpi-grid">
            <div class="season-kpi-card">
                <div class="season-kpi-label">Score moyen</div>
                <div class="season-kpi-value">${wellness.avgScore != null ? wellness.avgScore.toFixed(1) : '--'}</div>
                <div class="season-kpi-delta ${deltaClass(scoreDelta)}">${deltaText(scoreDelta, '')}</div>
            </div>
            <div class="season-kpi-card">
                <div class="season-kpi-label">Charge moyenne</div>
                <div class="season-kpi-value">${workload.avgLoadPerEntry ? Math.round(workload.avgLoadPerEntry) : '--'}</div>
                <div class="season-kpi-delta ${deltaClass(loadDelta)}">${deltaText(loadDelta, '')}</div>
            </div>
            <div class="season-kpi-card">
                <div class="season-kpi-label">Nombre de séances</div>
                <div class="season-kpi-value">${playerRpeDocs.length}</div>
            </div>
            <div class="season-kpi-card">
                <div class="season-kpi-label">Check-ins remplis</div>
                <div class="season-kpi-value">${playerCheckinDocs.length}</div>
            </div>
        </div>

        ${workloadBreakdownHtml}
        ${healthAlertsHtml}
        ${cycleProfileHtml}
        ${buildPersonalCycleProfileHtml(personalProfile)}

        <div class="season-charts-grid">
            <div class="season-chart-card season-chart-card--wide"><canvas id="seasonPlayerWellnessChart"></canvas></div>
            <div class="season-chart-card"><canvas id="seasonPlayerWorkloadChart"></canvas></div>
        </div>

        <div class="season-narrative-summary">
            <h3><i class="fas fa-align-left" style="margin-right:6px;"></i>Synthèse individuelle</h3>
            <ul class="season-narrative-summary-list">${narrativeSummary.map(point => `<li>${escapeHtml(point)}</li>`).join('')}</ul>
        </div>

        <div class="season-textarea-block">
            <label for="improvementAxesText">Axes d'amélioration (pré-remplis, éditables)</label>
            <textarea id="improvementAxesText" placeholder="Aucun axe détecté automatiquement.">${escapeHtml(improvementAxesText || '')}</textarea>
            <div id="improvementAxesTextPrint" class="season-print-mirror"></div>
            <div class="season-save-row">
                <button type="button" id="improvementAxesTextSaveBtn" class="season-save-btn">Enregistrer</button>
                <span id="improvementAxesTextConfirm" class="season-save-confirm"></span>
            </div>
        </div>

        <div class="season-textarea-block">
            <label for="playerMedicalNotes">Notes médicales / observations individuelles</label>
            <textarea id="playerMedicalNotes" placeholder="Notes libres sur la joueuse...">${escapeHtml(playerMedicalNotesValue)}</textarea>
            <div id="playerMedicalNotesPrint" class="season-print-mirror"></div>
            <div class="season-save-row">
                <button type="button" id="playerMedicalNotesSaveBtn" class="season-save-btn">Enregistrer</button>
                <span id="playerMedicalNotesConfirm" class="season-save-confirm"></span>
            </div>
        </div>
    `;

    renderWorkloadChart('seasonPlayerWorkloadChart', workload.weeklySeries);
    renderWellnessChart('seasonPlayerWellnessChart', wellness.scoreSeries);

    const improvementField = document.getElementById('improvementAxesText');
    const improvementPrintMirror = document.getElementById('improvementAxesTextPrint');

    function syncImprovementAxesMirror() {
        if (improvementField && improvementPrintMirror) {
            improvementPrintMirror.innerHTML = escapeHtml(improvementField.value);
        }
    }

    syncImprovementAxesMirror();

    if (improvementField) {
        improvementField.addEventListener('input', syncImprovementAxesMirror);
        improvementField.addEventListener('blur', function() {
            saveReportNote('player', playerId, 'improvementAxes', this.value);
        });
    }

    attachSaveButton('improvementAxesTextSaveBtn', 'improvementAxesTextConfirm', improvementField, 'player', playerId, 'improvementAxes');

    const playerNotesField = document.getElementById('playerMedicalNotes');
    const playerNotesPrintMirror = document.getElementById('playerMedicalNotesPrint');

    function syncPlayerMedicalNotesMirror() {
        if (playerNotesField && playerNotesPrintMirror) {
            playerNotesPrintMirror.innerHTML = formatStructuredNotesHtml(playerNotesField.value);
        }
    }

    syncPlayerMedicalNotesMirror();

    if (playerNotesField) {
        playerNotesField.addEventListener('input', syncPlayerMedicalNotesMirror);
        playerNotesField.addEventListener('blur', function() {
            saveReportNote('player', playerId, 'medicalNotes', this.value);
        });
    }

    attachSaveButton('playerMedicalNotesSaveBtn', 'playerMedicalNotesConfirm', playerNotesField, 'player', playerId, 'medicalNotes');
}

// ========================================
// 12. POINT D'ENTRÉE
// ========================================

let seasonReportListenersAttached = false;

async function loadSeasonReport() {
    const teamView = document.getElementById('seasonReportTeamView');
    const playerView = document.getElementById('seasonReportPlayerView');
    const playerSelect = document.getElementById('seasonReportPlayerSelect');

    if (!teamView || !playerView) return;

    // Peupler le sélecteur de joueuses une seule fois par ouverture (rechargé à chaque appel pour rester à jour)
    if (playerSelect) {
        try {
            const playersSnapshot = await db.collection('players').get();
            const players = playersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            seasonReportPlayersCache = players;

            const currentValue = playerSelect.value;
            const sortedPlayers = [...players].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            playerSelect.innerHTML = '<option value="">-- Vue Équipe --</option>' +
                sortedPlayers.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name || p.id)}</option>`).join('');

            if (currentValue) playerSelect.value = currentValue;
        } catch (error) {
            console.error('Bilan de Saison: erreur chargement joueuses', error);
        }
    }

    if (!seasonReportListenersAttached) {
        seasonReportListenersAttached = true;

        const startInput = document.getElementById('reportStartDate');
        const endInput = document.getElementById('reportEndDate');
        const useSeasonBtn = document.getElementById('useSeasonRangeBtn');

        if (useSeasonBtn) {
            useSeasonBtn.addEventListener('click', function() {
                const range = getYearRange();
                if (startInput) startInput.value = range.start;
                if (endInput) endInput.value = range.end;
                refreshSeasonReportView();
            });
        }

        if (startInput) startInput.addEventListener('change', refreshSeasonReportView);
        if (endInput) endInput.addEventListener('change', refreshSeasonReportView);

        if (playerSelect) {
            playerSelect.addEventListener('change', refreshSeasonReportView);
        }
    }

    await refreshSeasonReportView();
}

async function refreshSeasonReportView() {
    const playerSelect = document.getElementById('seasonReportPlayerSelect');
    const teamView = document.getElementById('seasonReportTeamView');
    const playerView = document.getElementById('seasonReportPlayerView');

    const selectedPlayerId = playerSelect ? playerSelect.value : '';

    // La vue équipe alimente aussi les moyennes d'équipe utilisées par la vue individuelle
    await renderTeamReport();

    if (selectedPlayerId) {
        teamView.style.display = 'none';
        playerView.style.display = 'block';
        await renderPlayerReport(selectedPlayerId);
    } else {
        teamView.style.display = 'block';
        playerView.style.display = 'none';
    }
}

// Exports globaux
window.getReportDateRange = getReportDateRange;
window.fetchRpeInRange = fetchRpeInRange;
window.fetchCheckinsInRange = fetchCheckinsInRange;
window.aggregateWorkload = aggregateWorkload;
window.aggregateWellness = aggregateWellness;
window.aggregateCycleData = aggregateCycleData;
window.buildInfradianProfile = buildInfradianProfile;
window.computeImprovementAxes = computeImprovementAxes;
window.computeHealthAlerts = computeHealthAlerts;
window.escapeHtml = escapeHtml;
window.formatStructuredNotesHtml = formatStructuredNotesHtml;
window.buildNarrativeSummary = buildNarrativeSummary;
window.buildWorkloadBreakdownHtml = buildWorkloadBreakdownHtml;
window.buildPeriodizationRecommendations = buildPeriodizationRecommendations;
window.buildPersonalCycleProfileHtml = buildPersonalCycleProfileHtml;
window.renderTeamReport = renderTeamReport;
window.renderPlayerReport = renderPlayerReport;
window.loadSeasonReport = loadSeasonReport;
window.saveReportNote = saveReportNote;

console.log('Module Bilan de Saison initialisé');
