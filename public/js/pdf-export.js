/**
 * Module Export PDF - Rapport d'Équipe
 * Génère un rapport PDF complet avec :
 * - Résumé de l'équipe
 * - Vue hebdomadaire des phases
 * - Recommandations d'entraînement
 * - Alertes de santé
 * - Statistiques individuelles
 */

// ============================================
// CONFIGURATION
// ============================================

const PDF_CONFIG = {
    pageWidth: 210,  // A4 width in mm
    pageHeight: 297, // A4 height in mm
    margin: 15,
    lineHeight: 7,
    colors: {
        primary: [102, 126, 234],      // #667eea
        secondary: [118, 75, 162],     // #764ba2
        success: [76, 175, 80],        // #4caf50
        warning: [255, 152, 0],        // #ff9800
        danger: [244, 67, 54],         // #f44336
        text: [33, 33, 33],            // #212121
        textLight: [117, 117, 117],    // #757575
        menstrual: [233, 30, 99],      // #e91e63
        follicular: [76, 175, 80],     // #4caf50
        ovulatory: [255, 152, 0],      // #ff9800
        luteal: [156, 39, 176]         // #9c27b0
    },
    phases: {
        menstrual: { name: 'Menstruelle', icon: '🩸', short: 'M' },
        follicular: { name: 'Folliculaire', icon: '🌱', short: 'F' },
        ovulatory: { name: 'Ovulatoire', icon: '⚡', short: 'O' },
        luteal: { name: 'Lutéale', icon: '🍂', short: 'L' },
        unknown: { name: 'Non configuré', icon: '❓', short: '?' }
    }
};

// ============================================
// FONCTIONS PRINCIPALES
// ============================================

/**
 * Générer et télécharger le rapport PDF
 */
async function exportTeamReportPDF() {
    console.log('📄 Export PDF: Génération du rapport...');
    
    // Afficher un loader
    showPDFLoader(true);
    
    try {
        // Vérifier que jsPDF est chargé
        if (typeof jspdf === 'undefined' && typeof jsPDF === 'undefined') {
            throw new Error('jsPDF non chargé. Veuillez recharger la page.');
        }
        
        const { jsPDF } = window.jspdf || window;
        const doc = new jsPDF('p', 'mm', 'a4');
        
        // Récupérer les données
        const data = await collectReportData();
        
        let yPos = PDF_CONFIG.margin;
        
        // Page 1: En-tête et résumé
        yPos = renderHeader(doc, data, yPos);
        yPos = renderTeamSummary(doc, data, yPos);
        yPos = renderPhaseDistribution(doc, data, yPos);
        
        // Page 2: Planificateur semaine
        doc.addPage();
        yPos = PDF_CONFIG.margin;
        yPos = renderWeekPlanner(doc, data, yPos);
        
        // Page 3: Alertes de santé
        if (data.healthAlerts && data.healthAlerts.length > 0) {
            doc.addPage();
            yPos = PDF_CONFIG.margin;
            yPos = renderHealthAlerts(doc, data, yPos);
        }
        
        // Pages suivantes: Fiches individuelles
        doc.addPage();
        yPos = PDF_CONFIG.margin;
        yPos = renderPlayerCards(doc, data, yPos);
        
        // Pied de page sur toutes les pages
        addFooterToAllPages(doc, data);
        
        // Télécharger le PDF
        const fileName = `Rapport_Equipe_${formatDateForFileName(new Date())}.pdf`;
        doc.save(fileName);
        
        console.log('📄 Export PDF: Rapport généré avec succès');
        showNotification('✅ Rapport PDF généré avec succès !', 'success');
        
    } catch (error) {
        console.error('Erreur génération PDF:', error);
        showNotification('❌ Erreur lors de la génération du PDF: ' + error.message, 'error');
    } finally {
        showPDFLoader(false);
    }
}

/**
 * Collecter toutes les données pour le rapport
 */
async function collectReportData() {
    const data = {
        generatedAt: new Date(),
        teamName: 'Équipe Volleyball',
        players: [],
        healthAlerts: [],
        weekDays: []
    };
    
    // Récupérer les joueuses
    const playersSnapshot = await db.collection('players').get();
    
    for (const doc of playersSnapshot.docs) {
        const playerData = doc.data();
        
        // Récupérer la config du cycle
        let cycleConfig = null;
        try {
            const configDoc = await db.collection('cycleConfig').doc(doc.id).get();
            if (configDoc.exists) {
                cycleConfig = configDoc.data();
            }
        } catch (e) {
            console.warn('Erreur config cycle pour', doc.id);
        }
        
        // Récupérer les derniers check-ins
        let lastCheckin = null;
        try {
            const checkinsSnapshot = await db.collection('checkins')
                .where('playerId', '==', doc.id)
                .orderBy('date', 'desc')
                .limit(1)
                .get();
            if (!checkinsSnapshot.empty) {
                lastCheckin = checkinsSnapshot.docs[0].data();
            }
        } catch (e) {
            console.warn('Erreur check-in pour', doc.id);
        }
        
        // Calculer la phase actuelle
        const phaseInfo = calculatePhaseForDate(cycleConfig, new Date());
        
        data.players.push({
            id: doc.id,
            name: playerData.name || doc.id,
            cycleConfig: cycleConfig,
            lastCheckin: lastCheckin,
            currentPhase: phaseInfo.phase,
            currentDay: phaseInfo.day
        });
    }
    
    // Trier par nom
    data.players.sort((a, b) => a.name.localeCompare(b.name));
    
    // Générer les 7 prochains jours
    const today = new Date();
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        
        const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        
        data.weekDays.push({
            date: date,
            dayName: dayNames[date.getDay()],
            dayNumber: date.getDate(),
            isToday: i === 0
        });
    }
    
    // Récupérer les alertes de santé (si disponibles)
    try {
        const alertsSnapshot = await db.collection('healthAlerts')
            .where('status', '==', 'active')
            .get();
        
        alertsSnapshot.forEach(doc => {
            data.healthAlerts.push({
                id: doc.id,
                ...doc.data()
            });
        });
    } catch (e) {
        console.warn('Pas d\'alertes de santé ou collection non existante');
    }
    
    return data;
}

/**
 * Calculer la phase pour une date donnée
 */
function calculatePhaseForDate(cycleConfig, date) {
    if (!cycleConfig || !cycleConfig.lastPeriodDate) {
        return { phase: 'unknown', day: 0 };
    }

    const lastJ1 = cycleConfig.lastPeriodDate.toDate
        ? cycleConfig.lastPeriodDate.toDate()
        : new Date(cycleConfig.lastPeriodDate);

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    lastJ1.setHours(0, 0, 0, 0);

    // Si J1 dans le futur, erreur
    if (lastJ1 > targetDate) {
        return { phase: 'unknown', day: 0 };
    }

    // Calcul SANS modulo - pas de reset automatique de cycle
    const daysSinceJ1 = Math.floor((targetDate - lastJ1) / (1000 * 60 * 60 * 24));
    const cycleLength = cycleConfig.cycleLength || 28;
    let cycleDay = daysSinceJ1 + 1;
    if (cycleDay <= 0) cycleDay = 1;

    const isExtended = cycleDay > cycleLength;

    let phase;
    if (cycleDay <= 5) {
        phase = 'menstrual';
    } else if (cycleDay <= 13) {
        phase = 'follicular';
    } else if (cycleDay <= 16) {
        phase = 'ovulatory';
    } else if (isExtended) {
        phase = 'extended';
    } else {
        phase = 'luteal';
    }

    return { phase, day: cycleDay, isExtended };
}

// ============================================
// FONCTIONS DE RENDU PDF
// ============================================

/**
 * Rendre l'en-tête du rapport
 */
function renderHeader(doc, data, yPos) {
    const { margin, pageWidth, colors } = PDF_CONFIG;
    
    // Titre principal avec dégradé simulé
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('📊 Rapport d\'Équipe - Cycle & Performance', margin, 20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Généré le ${formatDate(data.generatedAt)} à ${formatTime(data.generatedAt)}`, margin, 30);
    
    return 45;
}

/**
 * Rendre le résumé de l'équipe
 */
function renderTeamSummary(doc, data, yPos) {
    const { margin, colors } = PDF_CONFIG;
    
    doc.setTextColor(...colors.text);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('📋 Résumé de l\'Équipe', margin, yPos);
    yPos += 10;
    
    // Statistiques
    const totalPlayers = data.players.length;
    const configuredPlayers = data.players.filter(p => p.cycleConfig && p.cycleConfig.lastPeriodDate).length;
    const unconfiguredPlayers = totalPlayers - configuredPlayers;
    
    // Compter par phase
    const phaseCounts = {
        menstrual: 0,
        follicular: 0,
        ovulatory: 0,
        luteal: 0,
        unknown: 0
    };
    
    data.players.forEach(p => {
        phaseCounts[p.currentPhase]++;
    });
    
    // Tableau de résumé
    const summaryData = [
        ['Total joueuses', totalPlayers.toString()],
        ['Cycles configurés', `${configuredPlayers}/${totalPlayers}`],
        ['Phase Menstruelle', phaseCounts.menstrual.toString()],
        ['Phase Folliculaire', phaseCounts.follicular.toString()],
        ['Phase Ovulatoire', phaseCounts.ovulatory.toString()],
        ['Phase Lutéale', phaseCounts.luteal.toString()]
    ];
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    let xPos = margin;
    summaryData.forEach((item, index) => {
        if (index % 2 === 0 && index > 0) {
            yPos += 8;
            xPos = margin;
        }
        
        doc.setTextColor(...colors.textLight);
        doc.text(item[0] + ':', xPos, yPos);
        
        doc.setTextColor(...colors.text);
        doc.setFont('helvetica', 'bold');
        doc.text(item[1], xPos + 45, yPos);
        doc.setFont('helvetica', 'normal');
        
        xPos += 90;
    });
    
    return yPos + 15;
}

/**
 * Rendre la distribution des phases
 */
function renderPhaseDistribution(doc, data, yPos) {
    const { margin, colors, pageWidth } = PDF_CONFIG;
    
    doc.setTextColor(...colors.text);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('🌸 Distribution des Phases Aujourd\'hui', margin, yPos);
    yPos += 12;
    
    // Compter par phase
    const phaseCounts = { menstrual: 0, follicular: 0, ovulatory: 0, luteal: 0, unknown: 0 };
    data.players.forEach(p => phaseCounts[p.currentPhase]++);
    
    const total = data.players.length;
    const barWidth = pageWidth - (2 * margin);
    const barHeight = 12;
    
    // Dessiner la barre de distribution
    let xOffset = margin;
    
    const phaseColors = {
        menstrual: colors.menstrual,
        follicular: colors.follicular,
        ovulatory: colors.ovulatory,
        luteal: colors.luteal,
        unknown: [158, 158, 158]
    };
    
    Object.entries(phaseCounts).forEach(([phase, count]) => {
        if (count > 0) {
            const width = (count / total) * barWidth;
            doc.setFillColor(...phaseColors[phase]);
            doc.rect(xOffset, yPos, width, barHeight, 'F');
            
            // Texte sur la barre si assez large
            if (width > 15) {
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(8);
                doc.text(`${count}`, xOffset + width/2 - 3, yPos + 8);
            }
            
            xOffset += width;
        }
    });
    
    yPos += barHeight + 8;
    
    // Légende
    doc.setFontSize(9);
    let legendX = margin;
    
    Object.entries(PDF_CONFIG.phases).forEach(([key, phase]) => {
        if (phaseCounts[key] > 0) {
            doc.setFillColor(...phaseColors[key]);
            doc.rect(legendX, yPos - 3, 8, 4, 'F');
            
            doc.setTextColor(...colors.text);
            doc.text(`${phase.name} (${phaseCounts[key]})`, legendX + 10, yPos);
            
            legendX += 45;
        }
    });
    
    return yPos + 15;
}

/**
 * Rendre le planificateur semaine
 */
function renderWeekPlanner(doc, data, yPos) {
    const { margin, colors, pageWidth } = PDF_CONFIG;
    
    doc.setTextColor(...colors.text);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('📅 Planificateur Semaine', margin, yPos);
    yPos += 12;
    
    // En-tête du tableau
    const colWidth = (pageWidth - 2 * margin - 40) / 7;
    const rowHeight = 10;
    
    // Colonne des noms
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos, 40, rowHeight, 'F');
    doc.setFontSize(8);
    doc.setTextColor(...colors.text);
    doc.text('Joueuse', margin + 2, yPos + 7);
    
    // Colonnes des jours
    data.weekDays.forEach((day, index) => {
        const x = margin + 40 + (index * colWidth);
        doc.setFillColor(day.isToday ? 230 : 240, day.isToday ? 240 : 240, day.isToday ? 255 : 240);
        doc.rect(x, yPos, colWidth, rowHeight, 'F');
        doc.setFontSize(7);
        doc.text(`${day.dayName} ${day.dayNumber}`, x + 2, yPos + 7);
    });
    
    yPos += rowHeight;
    
    // Lignes des joueuses
    data.players.forEach((player, playerIndex) => {
        // Vérifier si on doit ajouter une nouvelle page
        if (yPos > 270) {
            doc.addPage();
            yPos = PDF_CONFIG.margin;
        }
        
        // Nom de la joueuse
        doc.setFillColor(playerIndex % 2 === 0 ? 255 : 250, playerIndex % 2 === 0 ? 255 : 250, playerIndex % 2 === 0 ? 255 : 250);
        doc.rect(margin, yPos, 40, rowHeight, 'F');
        doc.setFontSize(7);
        doc.setTextColor(...colors.text);
        
        // Tronquer le nom si trop long
        let displayName = player.name;
        if (displayName.length > 12) {
            displayName = displayName.substring(0, 10) + '..';
        }
        doc.text(displayName, margin + 2, yPos + 7);
        
        // Phases pour chaque jour
        data.weekDays.forEach((day, dayIndex) => {
            const x = margin + 40 + (dayIndex * colWidth);
            const phaseInfo = calculatePhaseForDate(player.cycleConfig, day.date);
            const phaseConfig = PDF_CONFIG.phases[phaseInfo.phase];
            
            // Couleur de fond selon la phase
            const phaseColors = {
                menstrual: [255, 230, 240],
                follicular: [230, 255, 230],
                ovulatory: [255, 245, 230],
                luteal: [245, 230, 255],
                unknown: [245, 245, 245]
            };
            
            doc.setFillColor(...phaseColors[phaseInfo.phase]);
            doc.rect(x, yPos, colWidth, rowHeight, 'F');
            
            // Texte de la phase
            doc.setFontSize(6);
            doc.setTextColor(...colors.text);
            doc.text(`${phaseConfig.short}${phaseInfo.day > 0 ? phaseInfo.day : ''}`, x + colWidth/2 - 3, yPos + 7);
        });
        
        yPos += rowHeight;
    });
    
    yPos += 10;
    
    // Légende
    doc.setFontSize(8);
    doc.setTextColor(...colors.textLight);
    doc.text('Légende: M=Menstruelle, F=Folliculaire, O=Ovulatoire, L=Lutéale, ?=Non configuré', margin, yPos);
    
    return yPos + 15;
}

/**
 * Rendre les alertes de santé
 */
function renderHealthAlerts(doc, data, yPos) {
    const { margin, colors } = PDF_CONFIG;
    
    doc.setTextColor(...colors.danger);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('🚨 Alertes de Santé Actives', margin, yPos);
    yPos += 12;
    
    if (data.healthAlerts.length === 0) {
        doc.setTextColor(...colors.success);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('✅ Aucune alerte de santé active', margin, yPos);
        return yPos + 15;
    }
    
    data.healthAlerts.forEach(alert => {
        // Cadre d'alerte
        doc.setFillColor(255, 240, 240);
        doc.setDrawColor(...colors.danger);
        doc.rect(margin, yPos, 180, 20, 'FD');
        
        doc.setTextColor(...colors.danger);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${alert.type === 'amenorrhea' ? '🩸 Aménorrhée' : '⚠️ RED-S'} - ${alert.playerName || 'Joueuse'}`, margin + 5, yPos + 8);
        
        doc.setTextColor(...colors.text);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(alert.message || 'Consultation médicale recommandée', margin + 5, yPos + 15);
        
        yPos += 25;
    });
    
    return yPos + 10;
}

/**
 * Rendre les fiches individuelles des joueuses
 */
function renderPlayerCards(doc, data, yPos) {
    const { margin, colors, pageWidth } = PDF_CONFIG;
    
    doc.setTextColor(...colors.text);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('👥 Fiches Individuelles', margin, yPos);
    yPos += 12;
    
    const cardWidth = (pageWidth - 2 * margin - 10) / 2;
    const cardHeight = 35;
    let cardIndex = 0;
    
    data.players.forEach((player, index) => {
        // Vérifier si on doit ajouter une nouvelle page
        if (yPos > 250) {
            doc.addPage();
            yPos = PDF_CONFIG.margin;
            cardIndex = 0;
        }
        
        const xPos = margin + (cardIndex % 2) * (cardWidth + 10);
        
        // Cadre de la carte
        const phaseColors = {
            menstrual: [255, 230, 240],
            follicular: [230, 255, 230],
            ovulatory: [255, 245, 230],
            luteal: [245, 230, 255],
            unknown: [245, 245, 245]
        };
        
        doc.setFillColor(...phaseColors[player.currentPhase]);
        doc.setDrawColor(200, 200, 200);
        doc.rect(xPos, yPos, cardWidth, cardHeight, 'FD');
        
        // Nom
        doc.setTextColor(...colors.text);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(player.name, xPos + 5, yPos + 8);
        
        // Phase actuelle
        const phaseConfig = PDF_CONFIG.phases[player.currentPhase];
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Phase: ${phaseConfig.name} (J${player.currentDay || '?'})`, xPos + 5, yPos + 16);
        
        // Recommandation
        const recommendations = {
            menstrual: 'Récupération, Mobilité',
            follicular: 'Force, Puissance',
            ovulatory: 'Performance Max',
            luteal: 'Endurance, Technique',
            unknown: 'Configurer le cycle'
        };
        
        doc.setTextColor(...colors.textLight);
        doc.setFontSize(7);
        doc.text(`Reco: ${recommendations[player.currentPhase]}`, xPos + 5, yPos + 23);
        
        // Dernier check-in
        if (player.lastCheckin) {
            const checkinDate = player.lastCheckin.date?.toDate ? player.lastCheckin.date.toDate() : new Date(player.lastCheckin.date);
            doc.text(`Dernier check-in: ${formatDate(checkinDate)}`, xPos + 5, yPos + 30);
        } else {
            doc.text('Pas de check-in récent', xPos + 5, yPos + 30);
        }
        
        cardIndex++;
        
        // Nouvelle ligne après 2 cartes
        if (cardIndex % 2 === 0) {
            yPos += cardHeight + 5;
        }
    });
    
    return yPos + cardHeight + 10;
}

/**
 * Ajouter le pied de page sur toutes les pages
 */
function addFooterToAllPages(doc, data) {
    const { pageHeight, pageWidth, margin, colors } = PDF_CONFIG;
    const totalPages = doc.internal.getNumberOfPages();
    
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        
        doc.setFontSize(8);
        doc.setTextColor(...colors.textLight);
        doc.text(
            `RPE Volleyball - Rapport généré le ${formatDate(data.generatedAt)} - Page ${i}/${totalPages}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
        );
    }
}

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

function formatDate(date) {
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatTime(date) {
    return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDateForFileName(date) {
    return date.toISOString().split('T')[0].replace(/-/g, '');
}

function showPDFLoader(show) {
    let loader = document.getElementById('pdfLoader');
    
    if (show) {
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'pdfLoader';
            loader.innerHTML = `
                <div style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                ">
                    <div style="
                        background: white;
                        padding: 30px 50px;
                        border-radius: 12px;
                        text-align: center;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                    ">
                        <div class="spinner" style="margin: 0 auto 15px;"></div>
                        <p style="margin: 0; font-size: 16px; color: #333;">Génération du PDF en cours...</p>
                    </div>
                </div>
            `;
            document.body.appendChild(loader);
        }
        loader.style.display = 'block';
    } else {
        if (loader) {
            loader.style.display = 'none';
        }
    }
}

function showNotification(message, type = 'info') {
    // Utiliser le système de notification existant si disponible
    if (typeof Toastify !== 'undefined') {
        Toastify({
            text: message,
            duration: 3000,
            gravity: 'top',
            position: 'right',
            backgroundColor: type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'
        }).showToast();
    } else {
        alert(message);
    }
}

// Exposer les fonctions globalement
window.exportTeamReportPDF = exportTeamReportPDF;

console.log('📄 Module Export PDF chargé');

