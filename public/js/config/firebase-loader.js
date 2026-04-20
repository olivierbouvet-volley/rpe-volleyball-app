/**
 * Firebase Configuration Loader
 * Projet: rpe-volleyball-sable (production)
 */

(function() {
    'use strict';

    window.FIREBASE_CONFIG = window.FIREBASE_CONFIG_PROD;
    window.FIREBASE_ENV = 'production';

    window.isDevEnvironment = function() { return false; };
    window.isProdEnvironment = function() { return true; };

    console.log('Firebase: Projet ' + window.FIREBASE_CONFIG.projectId);
})();
