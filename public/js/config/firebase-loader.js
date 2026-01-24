/**
 * Firebase Configuration Loader
 * Sélectionne automatiquement la config selon l'environnement
 */

(function() {
    'use strict';
    
    // Déterminer l'environnement selon le hostname
    const hostname = window.location.hostname;
    
    let currentEnv = 'production';
    let firebaseConfig = null;
    
    // Environnements de développement
    const devHosts = [
        'localhost',
        '127.0.0.1',
        'rpe-gen2-eeaee.web.app',
        'rpe-gen2-eeaee.firebaseapp.com'
    ];
    
    // Environnements de production
    const prodHosts = [
        'rpe-volleyball-sable.web.app',
        'rpe-volleyball-sable.firebaseapp.com'
    ];
    
    // Sélection automatique
    if (devHosts.includes(hostname)) {
        currentEnv = 'development';
        firebaseConfig = window.FIREBASE_CONFIG_DEV;
        console.log('🔧 Firebase: Mode DÉVELOPPEMENT');
    } else {
        currentEnv = 'production';
        firebaseConfig = window.FIREBASE_CONFIG_PROD;
        console.log('🚀 Firebase: Mode PRODUCTION');
    }
    
    // Vérifier que la config existe
    if (!firebaseConfig) {
        console.error('❌ Configuration Firebase non trouvée !');
        console.log('Fallback sur config PRODUCTION');
        firebaseConfig = window.FIREBASE_CONFIG_PROD;
    }
    
    // Exporter la configuration sélectionnée
    window.FIREBASE_CONFIG = firebaseConfig;
    window.FIREBASE_ENV = currentEnv;
    
    // Helper pour vérifier l'environnement
    window.isDevEnvironment = function() {
        return currentEnv === 'development';
    };
    
    window.isProdEnvironment = function() {
        return currentEnv === 'production';
    };
    
    // Log de la config (sans les clés sensibles)
    console.log(`📦 Projet Firebase: ${firebaseConfig.projectId}`);
    
})();
