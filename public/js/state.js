// ============================================================================
// ARENA STATE — Store global vanilla JS (pattern pub/sub)
// Compatible script tag classique, sans bundler
// ============================================================================

const _listeners = new Set();

let _state = {
  user: null,
  day: 'today',       // 'today' | 'yesterday' | 'daybefore'
  activeTab: 'checkin',
};

function getState() {
  return _state;
}

function setState(patch) {
  _state = { ..._state, ...patch };
  _listeners.forEach(l => l(_state));
}

function subscribe(fn) {
  _listeners.add(fn);
  return function unsubscribe() {
    _listeners.delete(fn);
  };
}

// Exporter globalement
window.getState = getState;
window.setState = setState;
window.subscribe = subscribe;
