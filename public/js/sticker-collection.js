/**
 * STICKER COLLECTION MODAL
 * Interface pour visualiser et explorer la collection de stickers
 */

// Ouvrir le modal de collection (filterRarity optionnel : 'common' | 'rare' | 'legendary')
async function openStickerCollection(playerId, filterRarity) {
    try {
        const playerDoc = await db.collection('players').doc(playerId).get();
        if (!playerDoc.exists) return;

        const playerData = playerDoc.data();
        const unlockedStickers = playerData.stickers || [];

        showCollectionModal(unlockedStickers, filterRarity);
    } catch (error) {
        console.error('Erreur chargement collection:', error);
    }
}

// Créer et afficher le modal de collection
function showCollectionModal(unlockedStickers, filterRarity) {
    // Vérifier si l'utilisateur est coach (Olivier ou Alexis)
    const currentPlayerName = window.currentPlayer?.name?.toLowerCase() || '';
    const isCoach = currentPlayerName.includes('olivier') || currentPlayerName.includes('alexis');
    
    // Créer le modal
    const modal = document.createElement('div');
    modal.className = 'collection-modal';
    modal.innerHTML = `
        <div class="collection-content">
            <button class="collection-close" onclick="closeCollectionModal()">&times;</button>
            
            <h2>🏆 Ma Collection de Stickers</h2>
            
            <!-- Onglets -->
            <div class="collection-tabs">
                <button class="tab-btn active" data-tab="collection">Ma Collection</button>
                <button class="tab-btn" data-tab="guide">Comment Obtenir</button>
                ${isCoach ? '<button class="tab-btn" data-tab="verification">🔧 Vérification</button>' : ''}
            </div>
            
            <!-- Contenu des onglets -->
            <div class="collection-tab-content active" id="collection-tab">
                ${renderCollectionGrid(unlockedStickers)}
            </div>
            
            <div class="collection-tab-content" id="guide-tab">
                ${renderGuideContent()}
            </div>
            
            ${isCoach ? `
                <div class="collection-tab-content" id="verification-tab">
                    ${renderVerificationGrid()}
                </div>
            ` : ''}
        </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);

    // Gestion des onglets
    const tabButtons = modal.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => switchCollectionTab(btn.dataset.tab));
    });

    // Scroll vers la catégorie filtrée si spécifiée
    if (filterRarity) {
        setTimeout(() => {
            const target = modal.querySelector(`.collection-category[data-rarity="${filterRarity}"]`);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // Highlight bref de la section
                target.style.transition = 'outline 0s';
                target.style.outline = '2px solid rgba(255,255,255,0.6)';
                target.style.borderRadius = '8px';
                setTimeout(() => { target.style.outline = 'none'; }, 1200);
            }
        }, 350);
    }
}

// Afficher la grille de collection
function renderCollectionGrid(unlockedStickers) {
    const totalStickers = Object.keys(STICKER_DEFINITIONS).length;
    let html = '<div class="collection-stats">';
    html += `<p>🎯 ${unlockedStickers.length} / ${totalStickers} stickers débloqués</p>`;
    html += '</div>';

    // Stickers communs
    html += '<div class="collection-category" data-rarity="common">';
    html += '<h3>⚪ Stickers Communs (27)</h3>';
    html += '<div class="collection-grid">';

    Object.entries(STICKER_DEFINITIONS).forEach(([id, sticker]) => {
        if (sticker.rarity === 'common') {
            const isUnlocked = unlockedStickers.includes(id);
            html += renderStickerCard(id, sticker, isUnlocked);
        }
    });
    html += '</div></div>';

    // Stickers rares
    html += '<div class="collection-category" data-rarity="rare">';
    html += '<h3>🔵 Stickers Rares (10)</h3>';
    html += '<div class="collection-grid">';

    Object.entries(STICKER_DEFINITIONS).forEach(([id, sticker]) => {
        if (sticker.rarity === 'rare') {
            const isUnlocked = unlockedStickers.includes(id);
            html += renderStickerCard(id, sticker, isUnlocked);
        }
    });
    html += '</div></div>';

    // Stickers légendaires
    html += '<div class="collection-category" data-rarity="legendary">';
    html += '<h3>🌟 Stickers Légendaires (16)</h3>';
    html += '<div class="collection-grid">';

    Object.entries(STICKER_DEFINITIONS).forEach(([id, sticker]) => {
        if (sticker.rarity === 'legendary') {
            const isUnlocked = unlockedStickers.includes(id);
            html += renderStickerCard(id, sticker, isUnlocked);
        }
    });
    html += '</div></div>';

    return html;
}

// Carte de sticker dans la collection
function renderStickerCard(id, sticker, isUnlocked) {
    const rarityClass = `rarity-${sticker.rarity}`;
    const lockedClass = isUnlocked ? '' : 'locked';
    const clickable = isUnlocked ? 'clickable' : '';
    const onClick = isUnlocked ? `onclick="showStickerDetail('${id}')"` : '';
    
    return `
        <div class="collection-card ${rarityClass} ${lockedClass} ${clickable}" ${onClick}>
            <div class="card-image">
                <img src="${sticker.image}" alt="${sticker.name}">
                ${!isUnlocked ? '<div class="lock-overlay">🔒</div>' : '<div class="click-hint">👁️</div>'}
            </div>
            <div class="card-info">
                <p class="card-name">${isUnlocked ? sticker.name : '???'}</p>
                <p class="card-hint">${isUnlocked ? sticker.description : getHint(sticker)}</p>
            </div>
        </div>
    `;
}

// Grille de vérification pour les coachs (tous les stickers)
function renderVerificationGrid() {
    let html = '<div class="collection-stats">';
    html += `<p>🔧 Mode Vérification - ${Object.keys(STICKER_DEFINITIONS).length} stickers au total</p>`;
    html += '</div>';

    // Stickers communs
    html += '<div class="collection-category">';
    html += '<h3>⚪ Stickers Communs</h3>';
    html += '<div class="collection-grid">';
    
    Object.entries(STICKER_DEFINITIONS).forEach(([id, sticker]) => {
        if (sticker.rarity === 'common') {
            html += renderVerificationCard(id, sticker);
        }
    });
    html += '</div></div>';

    // Stickers rares
    html += '<div class="collection-category">';
    html += '<h3>🔵 Stickers Rares</h3>';
    html += '<div class="collection-grid">';
    
    Object.entries(STICKER_DEFINITIONS).forEach(([id, sticker]) => {
        if (sticker.rarity === 'rare') {
            html += renderVerificationCard(id, sticker);
        }
    });
    html += '</div></div>';

    // Stickers légendaires
    html += '<div class="collection-category">';
    html += '<h3>🌟 Stickers Légendaires</h3>';
    html += '<div class="collection-grid">';
    
    Object.entries(STICKER_DEFINITIONS).forEach(([id, sticker]) => {
        if (sticker.rarity === 'legendary') {
            html += renderVerificationCard(id, sticker);
        }
    });
    html += '</div></div>';

    return html;
}

// Carte de sticker pour vérification (toujours débloqué et cliquable)
function renderVerificationCard(id, sticker) {
    const rarityClass = `rarity-${sticker.rarity}`;
    
    return `
        <div class="collection-card ${rarityClass} clickable" onclick="showStickerDetail('${id}')">
            <div class="card-image">
                <img src="${sticker.image}" alt="${sticker.name}">
                <div class="click-hint">👁️</div>
            </div>
            <div class="card-info">
                <p class="card-name">${sticker.name}</p>
                <p class="card-hint">${sticker.description}</p>
            </div>
        </div>
    `;
}

// Indice pour sticker verrouillé
function getHint(sticker) {
    if (sticker.rarity === 'common') return 'Complète des séances...';
    if (sticker.rarity === 'rare') return 'Un exploit t\'attend...';
    return 'Légende à débloquer...';
}

// Guide d'obtention des stickers
function renderGuideContent() {
    return `
        <div class="guide-content">
            <div class="guide-section">
                <h3>⚪ Stickers Communs (27)</h3>
                <div class="guide-card">
                    <h4>📊 Séries de Check-ins</h4>
                    <ul>
                        <li><strong>7 check-ins consécutifs</strong> → Débloquer 3 stickers</li>
                        <li><strong>14 check-ins consécutifs</strong> → Débloquer 3 stickers</li>
                        <li><strong>21 check-ins consécutifs</strong> → Débloquer 3 stickers</li>
                        <li><strong>28 check-ins consécutifs</strong> → Débloquer 3 stickers</li>
                        <li><strong>35 check-ins consécutifs</strong> → Débloquer 3 stickers</li>
                        <li><strong>42 check-ins consécutifs</strong> → Débloquer 3 stickers</li>
                        <li><strong>49 check-ins consécutifs</strong> → Débloquer 3 stickers</li>
                        <li><strong>56 check-ins consécutifs</strong> → Débloquer 6 stickers</li>
                    </ul>
                    <p class="tip">💡 Fais tes check-ins chaque jour pour construire ta série ! Plus tu avances, plus tu débloques de stickers.</p>
                    
                    <h4 style="margin-top: 25px;">🛡️ Système de Gel (3 par mois)</h4>
                    <p style="margin: 10px 0; color: rgba(255, 255, 255, 0.9);">
                        Si tu rates un jour de check-in, tu peux utiliser un <strong>gel</strong> pour protéger ta série :
                    </p>
                    <ul>
                        <li>✅ Fais ton check-in avec <strong>-1 jour</strong> ou <strong>-2 jours</strong> de retard</li>
                        <li>🛡️ Le système utilise automatiquement un gel pour sauver ta série</li>
                        <li>📅 Tu as droit à <strong>3 gel maximum par mois</strong></li>
                        <li>🔄 Les gel se réinitialisent chaque 1er du mois</li>
                    </ul>
                    <p class="tip">💡 Les gel te permettent de rattraper jusqu'à 2 jours de retard sans perdre ta série !</p>
                </div>
            </div>

            <div class="guide-section">
                <h3>🔵 Stickers Rares (5)</h3>
                <div class="guide-card">
                    <h4>🎯 Objectifs de Régularité</h4>
                    <ul>
                        <li><strong>Semaine Complète</strong> : Remplis 9 RPE sur 9 en une semaine</li>
                        <li><strong>Semaine Parfaite</strong> : Remplis les 13 RPE (9 séances + 4 récup) en une semaine</li>
                        <li><strong>RPE Régulier</strong> : Atteins 50 RPE soumis au total</li>
                        <li><strong>Check-in Master</strong> : Atteins 100 check-ins au total</li>
                        <li><strong>Expert RPE</strong> : Atteins 200 RPE soumis au total</li>
                    </ul>
                    <p class="tip">💡 La régularité est la clé pour débloquer ces stickers !</p>
                </div>
            </div>

            <div class="guide-section">
                <h3>🌟 Stickers Légendaires (16)</h3>
                <div class="guide-card">
                    <h4>👥 Joueuses de l'Équipe (14)</h4>
                    <ul>
                        <li><strong>Charlotte</strong> : Termine 2 semaines complètes</li>
                        <li><strong>Chloé</strong> : Termine 3 semaines complètes</li>
                        <li><strong>Cyrielle</strong> : Termine 4 semaines complètes</li>
                        <li><strong>Julia</strong> : Termine 5 semaines complètes</li>
                        <li><strong>Léa</strong> : Termine 6 semaines complètes</li>
                        <li><strong>Lilou</strong> : Termine 7 semaines complètes</li>
                        <li><strong>Lise</strong> : Termine 8 semaines complètes</li>
                        <li><strong>Lovely</strong> : Termine 9 semaines complètes</li>
                        <li><strong>Mélina</strong> : Termine 10 semaines complètes</li>
                        <li><strong>Nelia</strong> : Termine 11 semaines complètes</li>
                        <li><strong>Rose</strong> : Termine 12 semaines complètes</li>
                        <li><strong>Zoé</strong> : Termine 13 semaines complètes</li>
                        <li><strong>Éline</strong> : Termine 14 semaines complètes</li>
                        <li><strong>Nine</strong> : Termine 15 semaines complètes</li>
                    </ul>
                    <p class="tip">💡 <strong>Semaine complète</strong> = 9 RPE sur 9 séances remplis</p>

                    <h4>🏐 Coachs</h4>
                    <ul>
                        <li><strong>Coach Olivier</strong> : Termine 2 semaines parfaites</li>
                        <li><strong>Coach adjoint Alexis</strong> : Termine 3 semaines parfaites</li>
                    </ul>
                    <p class="tip">💡 <strong>Semaine parfaite</strong> = 13 RPE sur 13 (séances + récup) remplis</p>

                    <h4>🏆 Collectif</h4>
                    <ul>
                        <li><strong>Collectif</strong> : Débloque les 14 stickers des joueuses</li>
                    </ul>
                    <p class="tip">🔥 Le sticker ultime qui récompense ta persévérance !</p>
                </div>
            </div>

            <div class="guide-tips">
                <h3>💡 Conseils Généraux</h3>
                <ul>
                    <li>🎯 <strong>Régularité</strong> : Soumets tes RPE chaque jour pour maximiser tes chances</li>
                    <li>📅 <strong>Check-ins</strong> : Fais ton check-in quotidien pour les séries</li>
                    <li>🏆 <strong>Progression</strong> : Les stickers légendaires demandent de la patience</li>
                    <li>✨ <strong>Collectif</strong> : Débloquer toutes les joueuses te donne le sticker ultime</li>
                </ul>
            </div>
        </div>
    `;
}

// Changer d'onglet
function switchCollectionTab(tabName) {
    // Mettre à jour les boutons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Mettre à jour le contenu
    document.querySelectorAll('.collection-tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-tab`);
    });
}

// Fermer le modal
function closeCollectionModal() {
    const modal = document.querySelector('.collection-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }
}

// Afficher le sticker en détail (galerie)
function showStickerDetail(stickerId) {
    const sticker = STICKER_DEFINITIONS[stickerId];
    if (!sticker) return;

    const rarityLabel = sticker.rarity === 'common' ? 'Commun'
                      : sticker.rarity === 'rare'   ? 'Rare'
                      : 'Légendaire';

    const detailModal = document.createElement('div');
    detailModal.className = 'sticker-detail-modal';
    detailModal.innerHTML = `
        <div class="detail-overlay" onclick="closeStickerDetail()"></div>
        <div class="detail-card" data-rarity="${sticker.rarity}">
            <button class="detail-close" onclick="closeStickerDetail()">&times;</button>

            <!-- Image — héro (clic = plein écran) -->
            <div class="detail-sticker-wrap" onclick="openStickerFullscreen('${sticker.image}', '${sticker.name}')">
                <img src="${sticker.image}" alt="${sticker.name}" class="detail-image">
                <div class="detail-image-hint">🔍</div>
            </div>

            <!-- Texte sous le sticker -->
            <div class="detail-info">
                <div class="detail-rarity ${sticker.rarity}">
                    ${sticker.emoji}&nbsp; ${rarityLabel.toUpperCase()}
                </div>

                <h2 class="detail-name">${sticker.name}</h2>

                <p class="detail-description">${sticker.description}</p>

                <div class="detail-divider"></div>

                <div class="detail-criteria">
                    <span class="detail-criteria-label">Débloqué en réalisant</span>
                    <span class="detail-criteria-value">${formatCriteria(sticker.criteria)}</span>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(detailModal);
    setTimeout(() => detailModal.classList.add('active'), 10);
}

// Plein écran image sticker
function openStickerFullscreen(src, alt) {
    const fs = document.createElement('div');
    fs.className = 'sticker-fullscreen';
    fs.innerHTML = `<img src="${src}" alt="${alt}" class="sticker-fullscreen-img">`;
    fs.onclick = () => {
        fs.classList.remove('active');
        setTimeout(() => fs.remove(), 250);
    };
    document.body.appendChild(fs);
    setTimeout(() => fs.classList.add('active'), 10);
}

// Fermer le modal de détail
function closeStickerDetail() {
    const modal = document.querySelector('.sticker-detail-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }
}

// Formater les critères
function formatCriteria(criteria) {
    if (criteria.type === 'checkin_streak') {
        return `${criteria.days} check-ins consécutifs`;
    }
    if (criteria.type === 'streak') {
        return `${criteria.days} jours de RPE consécutifs`;
    }
    if (criteria.type === 'weekly_rpe') {
        return `${criteria.required} RPE dans une semaine`;
    }
    if (criteria.type === 'monthly_rpe') {
        return `${criteria.completion}% des RPE obligatoires du mois`;
    }
    if (criteria.type === 'weeks_complete') {
        return `${criteria.required} semaines complètes (9/9 RPE)`;
    }
    if (criteria.type === 'weeks_perfect') {
        return `${criteria.required} semaines parfaites (13/13 RPE)`;
    }
    if (criteria.type === 'bonus_sessions') {
        return `${criteria.required}+ séances supplémentaires dans une semaine`;
    }
    if (criteria.type === 'all_players') {
        return `Obtenir tous les ${criteria.required} stickers de joueuses`;
    }
    return 'Critère spécial';
}

// Fermeture au clic en dehors
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('collection-modal')) {
        closeCollectionModal();
    }
});
