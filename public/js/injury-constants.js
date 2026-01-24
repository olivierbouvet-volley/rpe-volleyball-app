// Constantes pour le module de suivi des blessures

// Types de blessures prédéfinis
const INJURY_TYPES = {
  ANKLE_SPRAIN: { id: 'ankle_sprain', label: 'Entorse cheville' },
  KNEE_TENDINITIS: { id: 'knee_tendinitis', label: 'Tendinite genou' },
  MUSCLE_TEAR: { id: 'muscle_tear', label: 'Déchirure musculaire' },
  FINGER_SPRAIN: { id: 'finger_sprain', label: 'Entorse doigt' },
  SHOULDER_PAIN: { id: 'shoulder_pain', label: 'Douleur épaule' },
  BACK_PAIN: { id: 'back_pain', label: 'Douleur dos' },
  KNEE_PAIN: { id: 'knee_pain', label: 'Douleur genou' },
  ANKLE_PAIN: { id: 'ankle_pain', label: 'Douleur cheville' },
  WRIST_SPRAIN: { id: 'wrist_sprain', label: 'Entorse poignet' },
  THIGH_STRAIN: { id: 'thigh_strain', label: 'Élongation cuisse' },
  CALF_STRAIN: { id: 'calf_strain', label: 'Élongation mollet' },
  OTHER: { id: 'other', label: 'Autre (à préciser)' }
};

// Zones corporelles
const BODY_ZONES = {
  ANKLE: { id: 'ankle', label: 'Cheville' },
  KNEE: { id: 'knee', label: 'Genou' },
  THIGH: { id: 'thigh', label: 'Cuisse' },
  CALF: { id: 'calf', label: 'Mollet' },
  SHOULDER: { id: 'shoulder', label: 'Épaule' },
  ELBOW: { id: 'elbow', label: 'Coude' },
  WRIST: { id: 'wrist', label: 'Poignet' },
  FINGER: { id: 'finger', label: 'Doigt' },
  BACK: { id: 'back', label: 'Dos' },
  HIP: { id: 'hip', label: 'Hanche' },
  OTHER: { id: 'other', label: 'Autre' }
};

// Niveaux de gravité
const SEVERITY_LEVELS = {
  MINOR: { id: 1, label: 'Légère', description: '1-7 jours', color: '#06D6A0' },
  MODERATE: { id: 2, label: 'Modérée', description: '1-4 semaines', color: '#F77F00' },
  SEVERE: { id: 3, label: 'Grave', description: '1-3 mois', color: '#E63946' },
  VERY_SEVERE: { id: 4, label: 'Très grave', description: '3+ mois', color: '#8B0000' }
};

// Circonstances de la blessure
const CIRCUMSTANCES = {
  TRAINING: { id: 'training', label: 'Entraînement' },
  MATCH: { id: 'match', label: 'Match' },
  OTHER: { id: 'other', label: 'Hors volleyball' }
};

// Statuts de blessure
const INJURY_STATUS = {
  ACTIVE: { id: 'active', label: 'Blessée', color: '#E63946' },
  REHABILITATION: { id: 'rehabilitation', label: 'En réathlétisation', color: '#F77F00' },
  PROGRESSIVE_RETURN: { id: 'progressive_return', label: 'Retour progressif', color: '#06D6A0' },
  RECOVERED: { id: 'recovered', label: 'Rétablie', color: '#1D3557' }
};

// Fonction helper pour obtenir le label d'un type de blessure
function getInjuryTypeLabel(injuryTypeId) {
  const type = Object.values(INJURY_TYPES).find(t => t.id === injuryTypeId);
  return type ? type.label : injuryTypeId;
}

// Fonction helper pour obtenir le label d'une zone corporelle
function getBodyZoneLabel(bodyZoneId) {
  const zone = Object.values(BODY_ZONES).find(z => z.id === bodyZoneId);
  return zone ? zone.label : bodyZoneId;
}

// Fonction helper pour obtenir les informations de gravité
function getSeverityInfo(severityLevel) {
  const severity = Object.values(SEVERITY_LEVELS).find(s => s.id === severityLevel);
  return severity || SEVERITY_LEVELS.MINOR;
}

// Fonction helper pour obtenir les informations de statut
function getStatusInfo(statusId) {
  const status = Object.values(INJURY_STATUS).find(s => s.id === statusId);
  return status || INJURY_STATUS.ACTIVE;
}

// Fonction pour calculer la durée d'indisponibilité en jours
function calculateDaysOut(injuryDate, recoveryDate) {
  if (!recoveryDate) {
    // Si pas encore rétablie, calculer depuis la date de blessure jusqu'à aujourd'hui
    const today = new Date();
    const injury = injuryDate.toDate ? injuryDate.toDate() : new Date(injuryDate);
    const diffTime = Math.abs(today - injury);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } else {
    // Calculer entre date de blessure et date de rétablissement
    const injury = injuryDate.toDate ? injuryDate.toDate() : new Date(injuryDate);
    const recovery = recoveryDate.toDate ? recoveryDate.toDate() : new Date(recoveryDate);
    const diffTime = Math.abs(recovery - injury);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

// Fonction pour formater une date en français
function formatDateFR(date) {
  if (!date) return '-';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

