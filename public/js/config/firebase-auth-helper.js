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

window.waitForAuth = function(timeoutMs) {
  timeoutMs = timeoutMs || 8000;
  return new Promise(function(resolve, reject) {
    var resolved = false;

    // Timeout de securite : on resolve meme sans auth apres le delai
    var timer = setTimeout(function() {
      if (resolved) return;
      resolved = true;
      console.warn('[waitForAuth] Timeout apres ' + timeoutMs + 'ms — on continue sans auth');
      resolve(null);
    }, timeoutMs);

    function tryAuth() {
      if (resolved) return;
      if (typeof firebase === 'undefined' || !firebase.apps || firebase.apps.length === 0) {
        return setTimeout(tryAuth, 100);
      }
      var auth = firebase.auth();
      console.log('[waitForAuth] currentUser:', auth.currentUser ? auth.currentUser.uid : 'null');
      if (auth.currentUser) {
        resolved = true;
        clearTimeout(timer);
        return resolve(auth.currentUser);
      }
      var unsub = auth.onAuthStateChanged(function(user) {
        if (resolved) return;
        unsub();
        console.log('[waitForAuth] onAuthStateChanged:', user ? user.uid : 'null');
        if (user) {
          resolved = true;
          clearTimeout(timer);
          resolve(user);
        } else {
          console.log('[waitForAuth] Lancement signInAnonymously...');
          auth.signInAnonymously()
            .then(function(r) {
              if (resolved) return;
              resolved = true;
              clearTimeout(timer);
              console.log('[waitForAuth] signInAnonymously OK:', r.user.uid);
              resolve(r.user);
            })
            .catch(function(e) {
              if (resolved) return;
              console.error('[waitForAuth] signInAnonymously echec:', e.code, e.message);
              // Ne pas rejeter — on laisse le timeout gerer
            });
        }
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
