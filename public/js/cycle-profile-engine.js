console.log('Module Profil Cycle Personnalisé chargé');

// ========================================
// MOTEUR DE PROFIL DE CYCLE PERSONNALISÉ (par joueuse)
// ========================================
// Construit, à partir de l'historique COMPLET d'une joueuse (toutes les
// données checkins/rpe disponibles, pas une période bornée), un profil
// individuel de réponse au cycle menstruel, ainsi qu'un "conseil du jour"
// combinant recommandation générique de phase + signaux personnels.
//
// Réutilise fetchCheckinsInRange / fetchRpeInRange / calculatePlayerScore /
// SEASON_REPORT_CYCLE_PHASES / CYCLE_PHASE_LABELS / escapeHtml (season-report.js + app-reports.js)
// et determinePhase (training-recommendations.js). Ce fichier doit donc être
// chargé APRÈS ces deux fichiers dans index.html.
//
// Générique : ne contient aucune référence en dur à une joueuse précise.

const CYCLE_PROFILE_SYMPTOM_KEYS = ['cramps', 'headache', 'fatigue', 'moodSwings', 'bloating', 'backPain', 'breastTenderness'];

// Modificateurs génériques du modèle d'équipe (coach-alerts.js / CYCLE_PHASE_CONFIG).
// Doit rester synchronisé avec CYCLE_PHASE_CONFIG dans coach-alerts.js — dupliqué ici
// volontairement pour éviter un couplage entre les deux fichiers.
const GENERIC_PHASE_MODIFIER = {
    menstruation: -0.7,
    follicular: 0.3,
    ovulation: 0.5,
    luteal: -0.2
};

// Correspondance entre les 5 phases de determinePhase() (training-recommendations.js)
// et les 4 valeurs de phase utilisées dans les checkins / season-report.js.
const PHASE_KEY_TO_CYCLE_PHASE = {
    menstrual: 'menstruation',
    follicular: 'follicular',
    ovulatory: 'ovulation',
    luteal_early: 'luteal',
    luteal_late: 'luteal'
};

function todayIsoDate() {
    return new Date().toISOString().split('T')[0];
}

function averageOf(values) {
    const clean = values.filter(v => v != null && !Number.isNaN(v));
    if (clean.length === 0) return null;
    return clean.reduce((a, b) => a + b, 0) / clean.length;
}

// ========================================
// PROFIL PERSONNEL SUR L'HISTORIQUE COMPLET
// ========================================

async function buildPersonalCycleProfile(playerId) {
    const todayStr = todayIsoDate();

    const [checkinDocs, rpeDocs] = await Promise.all([
        fetchCheckinsInRange('2000-01-01', todayStr, playerId),
        fetchRpeInRange('2000-01-01', todayStr, playerId)
    ]);

    const safeCheckins = Array.isArray(checkinDocs) ? checkinDocs : [];
    const safeRpe = Array.isArray(rpeDocs) ? rpeDocs : [];

    // --- Regroupement par phase (checkins) ---
    const checkinsByPhase = { menstruation: [], follicular: [], ovulation: [], luteal: [] };
    safeCheckins.forEach(c => {
        const normalizedPhase = c && normalizeCyclePhaseValue(c.cyclePhase);
        if (normalizedPhase && checkinsByPhase.hasOwnProperty(normalizedPhase)) {
            checkinsByPhase[normalizedPhase].push(c);
        }
    });

    const eligiblePhases = SEASON_REPORT_CYCLE_PHASES.filter(phase => checkinsByPhase[phase].length >= 5);

    if (eligiblePhases.length < 2) {
        return {
            insufficientData: true,
            message: 'Pas encore assez de données sur plusieurs cycles pour établir un profil individuel fiable.'
        };
    }

    // --- Jointure rpe par date (comme buildInfradianProfile) ---
    const rpeByDate = {};
    safeRpe.forEach(r => {
        if (r && r.date) {
            if (!rpeByDate[r.date]) rpeByDate[r.date] = [];
            rpeByDate[r.date].push(r);
        }
    });

    // --- Référentiel personnel (toutes phases confondues) ---
    const personalBaselineScore = averageOf(safeCheckins.map(c => calculatePlayerScore(c)));
    const personalBaselineEnergy = averageOf(safeCheckins.map(c => (c ? c.energy : null)));

    // --- Moyennes par phase retenue ---
    const phaseProfiles = {};
    eligiblePhases.forEach(phase => {
        const docs = checkinsByPhase[phase];

        const avgEnergy = averageOf(docs.map(c => c.energy));
        const avgMood = averageOf(docs.map(c => c.mood));
        const avgStress = averageOf(docs.map(c => c.stress));
        const avgSoreness = averageOf(docs.map(c => c.soreness));
        const avgSleep = averageOf(docs.map(c => c.sleep));
        const avgScore = averageOf(docs.map(c => calculatePlayerScore(c)));

        const rpeValues = [];
        const performanceValues = [];
        docs.forEach(c => {
            const rpeEntries = rpeByDate[c.date] || [];
            rpeEntries.forEach(r => {
                if (r.rpe != null) rpeValues.push(r.rpe);
                if (r.performance != null) performanceValues.push(r.performance);
            });
        });
        const avgRpe = averageOf(rpeValues);
        const avgPerformance = averageOf(performanceValues);

        const deltaVsPersonalBaseline = (avgScore != null && personalBaselineScore != null)
            ? avgScore - personalBaselineScore
            : null;
        const deltaVsGeneric = GENERIC_PHASE_MODIFIER[phase];

        let matchLabel;
        if (deltaVsPersonalBaseline == null) {
            matchLabel = 'Données insuffisantes pour comparer cette phase au modèle générique.';
        } else if (Math.abs(deltaVsPersonalBaseline - deltaVsGeneric) <= 0.3) {
            matchLabel = 'Profil conforme au modèle générique pour cette phase.';
        } else if (deltaVsPersonalBaseline > deltaVsGeneric) {
            matchLabel = `Moins affectée que la moyenne attendue en phase ${CYCLE_PHASE_LABELS[phase]}.`;
        } else {
            matchLabel = `Plus affectée que la moyenne attendue en phase ${CYCLE_PHASE_LABELS[phase]} — point de vigilance à individualiser.`;
        }

        phaseProfiles[phase] = {
            avgEnergy,
            avgMood,
            avgStress,
            avgSoreness,
            avgSleep,
            avgScore,
            avgRpe,
            avgPerformance,
            count: docs.length,
            deltaVsPersonalBaseline,
            deltaVsGeneric,
            matchLabel
        };
    });

    // --- Meilleure / pire phase sur tout l'historique (même algorithme que buildInfradianProfile) ---
    const valuesByPhase = { menstruation: [], follicular: [], ovulation: [], luteal: [] };
    safeCheckins.forEach(c => {
        const normalizedPhase = c && normalizeCyclePhaseValue(c.cyclePhase);
        if (!normalizedPhase || !valuesByPhase.hasOwnProperty(normalizedPhase)) return;
        const rpeEntries = rpeByDate[c.date] || [];
        const perfValues = rpeEntries.filter(r => r.performance != null).map(r => r.performance);
        if (perfValues.length > 0) {
            valuesByPhase[normalizedPhase].push(averageOf(perfValues));
        } else {
            valuesByPhase[normalizedPhase].push(calculatePlayerScore(c));
        }
    });

    const phaseAverages = [];
    SEASON_REPORT_CYCLE_PHASES.forEach(phase => {
        const arr = valuesByPhase[phase];
        if (arr.length >= 5) {
            phaseAverages.push({ phase, avg: averageOf(arr) });
        }
    });

    let bestPhase = null;
    let worstPhase = null;
    if (phaseAverages.length >= 2) {
        const sorted = [...phaseAverages].sort((a, b) => b.avg - a.avg);
        bestPhase = { phase: sorted[0].phase, label: CYCLE_PHASE_LABELS[sorted[0].phase], avg: sorted[0].avg };
        worstPhase = { phase: sorted[sorted.length - 1].phase, label: CYCLE_PHASE_LABELS[sorted[sorted.length - 1].phase], avg: sorted[sorted.length - 1].avg };
    }

    // --- Inflation RPE (par sessionType, jours symptômes >=7 vs sans) sur tout l'historique ---
    const checkinByDate = {};
    safeCheckins.forEach(c => {
        if (c && c.date) checkinByDate[c.date] = c;
    });

    const rpeBySessionType = {};
    safeRpe.forEach(r => {
        if (!r) return;
        const type = normalizeSessionType(r.sessionType);
        if (!rpeBySessionType[type]) rpeBySessionType[type] = { withSymptom: [], withoutSymptom: [] };

        const checkin = checkinByDate[r.date];
        const hasSevereSymptom = checkin && checkin.symptoms && CYCLE_PROFILE_SYMPTOM_KEYS.some(key => (checkin.symptoms[key] || 0) >= 7);

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
            const avgWith = averageOf(withSymptom);
            const avgWithout = averageOf(withoutSymptom);
            if (avgWithout > 0) {
                const pctDiff = ((avgWith - avgWithout) / avgWithout) * 100;
                if (Math.abs(pctDiff) >= 10 && (!bestInflation || Math.abs(pctDiff) > Math.abs(bestInflation.pctDiff))) {
                    bestInflation = { sessionType: type, pctDiff };
                }
            }
        }
    });

    let rpeInflation = null;
    if (bestInflation) {
        const pctRounded = Math.round(bestInflation.pctDiff);
        rpeInflation = {
            value: pctRounded,
            sessionType: bestInflation.sessionType,
            text: `Le ressenti d'effort augmente d'environ ${pctRounded}% les jours de symptômes marqués (${bestInflation.sessionType}) — ajuster les attentes de charge perçue.`
        };
    }

    const totalCyclesTracked = safeCheckins.filter(c => c && c.hasPeriod === true).length;

    return {
        insufficientData: false,
        phaseProfiles,
        personalBaseline: {
            avgScore: personalBaselineScore,
            avgEnergy: personalBaselineEnergy
        },
        bestPhase,
        worstPhase,
        rpeInflation,
        totalCheckins: safeCheckins.length,
        totalCyclesTracked
    };
}

// ========================================
// CONSEIL DU JOUR
// ========================================

async function buildDailyCycleAdvice(playerId, personalProfile) {
    const todayStr = todayIsoDate();

    let checkinSnapshot;
    try {
        checkinSnapshot = await db.collection('checkins')
            .where('playerId', '==', playerId)
            .where('date', '==', todayStr)
            .limit(1)
            .get();
    } catch (error) {
        console.error('cycle-profile-engine: erreur lecture check-in du jour', error);
        return { status: 'no-checkin', message: "Check-in du jour non renseigné." };
    }

    if (!checkinSnapshot || checkinSnapshot.empty) {
        return { status: 'no-checkin', message: "Check-in du jour non renseigné." };
    }

    const checkinDuJour = checkinSnapshot.docs[0].data();

    let cycleLength = 28;
    try {
        const menstrualCycleDoc = await db.collection('menstrualCycle').doc(playerId).get();
        if (menstrualCycleDoc.exists) {
            const data = menstrualCycleDoc.data();
            if (data && data.cycleLength) cycleLength = data.cycleLength;
        }
    } catch (error) {
        console.error('cycle-profile-engine: erreur lecture menstrualCycle', error);
    }

    const cycleDay = checkinDuJour.cycleDay != null ? checkinDuJour.cycleDay : checkinDuJour.dayOfCycle;

    if (cycleDay == null) {
        return { status: 'no-cycle-data', message: "Jour de cycle non renseigné pour le check-in du jour." };
    }

    const phaseInfo = determinePhase(cycleDay, cycleLength);
    const recommendations = (phaseInfo && phaseInfo.recommendations) || {};
    const phase4 = PHASE_KEY_TO_CYCLE_PHASE[phaseInfo ? phaseInfo.phaseKey : null] || null;

    const personalFlags = [];

    if (personalProfile && !personalProfile.insufficientData && phase4 && personalProfile.phaseProfiles && personalProfile.phaseProfiles[phase4]) {
        const phaseProfile = personalProfile.phaseProfiles[phase4];
        if (checkinDuJour.energy != null && phaseProfile.avgEnergy != null && checkinDuJour.energy <= phaseProfile.avgEnergy - 1.5) {
            personalFlags.push("Énergie nettement en dessous de son niveau habituel pour cette phase aujourd'hui.");
        }
    }

    if (checkinDuJour.symptoms) {
        const hasSevere = CYCLE_PROFILE_SYMPTOM_KEYS.some(key => (checkinDuJour.symptoms[key] || 0) >= 7);
        if (hasSevere) {
            personalFlags.push("Symptôme sévère signalé aujourd'hui — envisager de réduire la complexité technique ou l'intensité prévue.");
        }
    }

    return {
        status: 'ok',
        phaseLabel: phaseInfo ? phaseInfo.name : null,
        baselineRecommendation: {
            global: recommendations.global || null,
            focus: recommendations.focus || [],
            avoid: recommendations.avoid || []
        },
        personalFlags,
        severity: personalFlags.length > 0 ? 'attention' : 'normal'
    };
}

// Exports globaux (cohérent avec le reste du code base)
window.buildPersonalCycleProfile = buildPersonalCycleProfile;
window.buildDailyCycleAdvice = buildDailyCycleAdvice;

console.log('Module Profil Cycle Personnalisé initialisé');
