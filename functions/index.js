const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

// Configuration région
const europeWest1 = functions.region('europe-west1');

// ============================================================================
// NOTIFICATION CHECK-IN À 12H00
// ============================================================================
exports.sendCheckinReminder = europeWest1
    .pubsub
    .schedule('0 12 * * *')
    .timeZone('Europe/Paris')
    .onRun(async (context) => {
        console.log('=== Notification Check-in 12h ===');
        
        const today = new Date().toISOString().split('T')[0];
        
        try {
            const restPeriodsSnapshot = await db.collection('restPeriods').get();
            let isRestDay = false;
            
            restPeriodsSnapshot.forEach(doc => {
                const period = doc.data();
                if (today >= period.startDate && today <= period.endDate) {
                    isRestDay = true;
                }
            });
            
            if (isRestDay) {
                console.log('Période de repos - Aucune notification');
                return null;
            }
            
            const playersSnapshot = await db.collection('players').get();
            let notificationsSent = 0;
            
            for (const playerDoc of playersSnapshot.docs) {
                const player = { id: playerDoc.id, ...playerDoc.data() };
                
                const checkinSnapshot = await db.collection('checkins')
                    .where('playerId', '==', player.id)
                    .where('date', '==', today)
                    .limit(1)
                    .get();
                
                if (!checkinSnapshot.empty) continue;
                
                const tokenDoc = await db.collection('fcmTokens').doc(player.id).get();
                if (!tokenDoc.exists) continue;
                
                const token = tokenDoc.data().token;
                const prenom = player.name ? player.name.split(' ')[0] : 'Joueuse';
                
                try {
                    await admin.messaging().send({
                        notification: {
                            title: '☀️ Check-in du jour',
                            body: `Salut ${prenom} ! N'oublie pas ton check-in 🏐`
                        },
                        token: token
                    });
                    notificationsSent++;
                } catch (error) {
                    if (error.code === 'messaging/invalid-registration-token' ||
                        error.code === 'messaging/registration-token-not-registered') {
                        await db.collection('fcmTokens').doc(player.id).delete();
                    }
                }
            }
            
            console.log(`${notificationsSent} notifications envoyées`);
            return null;
        } catch (error) {
            console.error('Erreur:', error);
            return null;
        }
    });

// ============================================================================
// NOTIFICATION RPE À 20H00
// ============================================================================
exports.sendRpeReminder = europeWest1
    .pubsub
    .schedule('0 20 * * 1-5')
    .timeZone('Europe/Paris')
    .onRun(async (context) => {
        console.log('=== Notification RPE 20h ===');
        
        const today = new Date().toISOString().split('T')[0];
        
        try {
            const playersSnapshot = await db.collection('players').get();
            let notificationsSent = 0;
            
            for (const playerDoc of playersSnapshot.docs) {
                const player = { id: playerDoc.id, ...playerDoc.data() };
                
                const rpeSnapshot = await db.collection('rpe')
                    .where('playerId', '==', player.id)
                    .where('date', '==', today)
                    .limit(1)
                    .get();
                
                if (!rpeSnapshot.empty) continue;
                
                const tokenDoc = await db.collection('fcmTokens').doc(player.id).get();
                if (!tokenDoc.exists) continue;
                
                const token = tokenDoc.data().token;
                const prenom = player.name ? player.name.split(' ')[0] : 'Joueuse';
                
                try {
                    await admin.messaging().send({
                        notification: {
                            title: '🏐 Activités du jour',
                            body: `Hey ${prenom} ! N'oublie pas ton RPE 💪`
                        },
                        token: token
                    });
                    notificationsSent++;
                } catch (error) {
                    if (error.code === 'messaging/invalid-registration-token' ||
                        error.code === 'messaging/registration-token-not-registered') {
                        await db.collection('fcmTokens').doc(player.id).delete();
                    }
                }
            }
            
            console.log(`${notificationsSent} notifications envoyées`);
            return null;
        } catch (error) {
            console.error('Erreur:', error);
            return null;
        }
    });

// ============================================================================
// TEST NOTIFICATION
// ============================================================================
exports.sendTestNotification = europeWest1.https.onCall(async (data, context) => {
    const { playerId } = data;
    
    if (!playerId) {
        throw new functions.https.HttpsError('invalid-argument', 'playerId requis');
    }
    
    const tokenDoc = await db.collection('fcmTokens').doc(playerId).get();
    if (!tokenDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Token non trouvé');
    }
    
    await admin.messaging().send({
        notification: {
            title: '🧪 Test',
            body: 'Les notifications fonctionnent ! 🎉'
        },
        token: tokenDoc.data().token
    });
    
    return { success: true };
});

// ============================================================================
// ENREGISTRER TOKEN FCM
// ============================================================================
exports.registerFcmToken = europeWest1.https.onCall(async (data, context) => {
    const { playerId, token } = data;
    
    if (!playerId || !token) {
        throw new functions.https.HttpsError('invalid-argument', 'playerId et token requis');
    }
    
    await db.collection('fcmTokens').doc(playerId).set({
        token: token,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        platform: data.platform || 'web'
    });
    
    return { success: true };
});

// ============================================================================
// CALCUL SCORE CHECK-IN
// ============================================================================
exports.onCheckinCreated = europeWest1.firestore
    .document('checkins/{checkinId}')
    .onCreate(async (snap, context) => {
        const data = snap.data();
        
        let score;
        if (data.energy !== undefined) {
            score = (data.sleep + data.mood + data.energy + (10 - data.soreness) + (10 - data.stress)) / 5;
        } else {
            score = (data.sleep + data.mood + (10 - data.soreness) + (10 - data.stress)) / 4;
        }
        
        const status = score < 5 ? 'critical' : score < 7 ? 'attention' : 'optimal';
        
        await snap.ref.update({
            score: Math.round(score * 10) / 10,
            status: status
        });
        
        return null;
    });

// ============================================================================
// MISE À JOUR STATUTS (toutes les 6h)
// ============================================================================
exports.updatePlayerStatuses = europeWest1
    .pubsub
    .schedule('0 */6 * * *')
    .timeZone('Europe/Paris')
    .onRun(async (context) => {
        console.log('=== Mise à jour statuts ===');
        
        try {
            const playersSnapshot = await db.collection('players').get();
            
            for (const playerDoc of playersSnapshot.docs) {
                const playerId = playerDoc.id;
                
                const checkinsSnapshot = await db.collection('checkins')
                    .where('playerId', '==', playerId)
                    .orderBy('date', 'desc')
                    .limit(7)
                    .get();
                
                let totalScore = 0;
                let count = 0;
                
                checkinsSnapshot.forEach(doc => {
                    const d = doc.data();
                    if (d.score) {
                        totalScore += d.score;
                    } else {
                        totalScore += (d.sleep + d.mood + (10 - d.soreness) + (10 - d.stress)) / 4;
                    }
                    count++;
                });
                
                const avgScore = count > 0 ? totalScore / count : 0;
                const status = avgScore < 5 ? 'critical' : avgScore < 7 ? 'attention' : 'optimal';
                
                await db.collection('players').doc(playerId).update({
                    currentStatus: status,
                    currentScore: Math.round(avgScore * 10) / 10,
                    lastStatusUpdate: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            
            return null;
        } catch (error) {
            console.error('Erreur:', error);
            return null;
        }
    });
