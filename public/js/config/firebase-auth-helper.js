// FIREBASE AUTH HELPER - Auto-connexion anonyme
function initAuth() {
  if (typeof firebase === 'undefined' || !firebase.apps || firebase.apps.length === 0) {
    setTimeout(initAuth, 100);
    return;
  }
  var auth = firebase.auth();
  if (auth.currentUser) {
    console.log('[Auth] Deja connecte: ' + auth.currentUser.uid);
    return;
  }
  auth.onAuthStateChanged(function(user) {
    if (user) {
      console.log('[Auth] Session active: ' + user.uid);
    } else {
      console.log('[Auth] Connexion anonyme en cours...');
      auth.signInAnonymously()
        .then(function(r) { console.log('[Auth] Connexion anonyme reussie: ' + r.user.uid); })
        .catch(function(e) { console.error('[Auth] Echec:', e.code, e.message); });
    }
  });
}

window.waitForAuth = function() {
  return new Promise(function(resolve, reject) {
    function tryAuth() {
      if (typeof firebase === 'undefined' || !firebase.apps || firebase.apps.length === 0) {
        return setTimeout(tryAuth, 100);
      }
      var auth = firebase.auth();
      if (auth.currentUser) return resolve(auth.currentUser);
      var u = auth.onAuthStateChanged(function(user) {
        u();
        if (user) return resolve(user);
        auth.signInAnonymously().then(function(r) { resolve(r.user); }).catch(reject);
      });
    }
    tryAuth();
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuth);
} else {
  initAuth();
}
