/* games-gate.js — shared teacher-controlled lock for the Whydah classroom games.
 *
 * WHAT IT DOES
 *   One switch per game lives in Supabase (table public.game_gate). Students'
 *   browsers READ it with the publishable key; they cannot flip it. The teacher
 *   flips it from the Captain's Cabin, which calls a passcode-checked database
 *   function (public.set_game_gate) — the passcode lives only in the database,
 *   never in this file, so the publishable key alone can't unlock anything.
 *
 * HOW IT'S USED
 *   - On a game page (parrot-flip / navigator / black-sam index.html), include:
 *       <script src="/games-gate.js" data-enforce="parrot-flip"></script>
 *     placed in <head> (NOT deferred) so the page is covered before it renders.
 *     Fail-closed: the game stays hidden behind a lock overlay until a live read
 *     confirms it's open, and re-hides within a few seconds if the teacher locks
 *     it again (or the network drops).
 *   - On the dashboard, include plain:
 *       <script src="/games-gate.js" defer></script>
 *     and drive the UI with window.WhydahGate (onChange / setGate / getState).
 *
 * NO external libraries — plain fetch, like /photo/photo.js — so nothing here
 * depends on a CDN the school network might block.
 */
(function () {
  'use strict';

  var SB_URL = 'https://segzgdlqqymqlfuahosd.supabase.co';
  var SB_KEY = 'sb_publishable_fBBZAVo-ljKvaBKNVMukmA_TopYb6D8';
  var HEADERS = { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY };

  var GAMES = ['navigator', 'black-sam', 'parrot-flip'];
  var GAME_NAMES = { 'navigator': 'Navigator', 'black-sam': 'Black Sam', 'parrot-flip': 'Parrot Flip' };

  // state[slug] = true (open) | false (locked) | undefined (not yet known)
  var state = {};
  var lastOk = false;          // did the most recent read succeed?
  var listeners = [];

  function notify() {
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](state, lastOk); } catch (_) {}
    }
  }

  function fetchState() {
    return fetch(SB_URL + '/rest/v1/game_gate?select=slug,unlocked', {
      headers: HEADERS,
      cache: 'no-store',
    })
      .then(function (r) { if (!r.ok) throw new Error('gate read ' + r.status); return r.json(); })
      .then(function (rows) {
        var next = {};
        rows.forEach(function (row) { next[row.slug] = row.unlocked === true; });
        state = next;
        lastOk = true;
        notify();
        return state;
      })
      .catch(function (err) {
        // Keep the last known values but mark the read as failed. Enforcement
        // treats "never succeeded" as locked (fail-closed).
        lastOk = false;
        notify();
        throw err;
      });
  }

  // Teacher-only: flip a game via the passcode-checked DB function.
  // Resolves with the updated row; rejects with an Error whose .status is the
  // HTTP code (403 = wrong passcode).
  function setGate(slug, unlocked, passcode) {
    return fetch(SB_URL + '/rest/v1/rpc/set_game_gate', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, HEADERS),
      body: JSON.stringify({ p_passcode: passcode, p_slug: slug, p_unlocked: !!unlocked }),
    }).then(function (r) {
      if (!r.ok) {
        return r.text().then(function (t) {
          var e = new Error('set_game_gate ' + r.status + ' ' + t);
          e.status = r.status;
          throw e;
        });
      }
      return r.json();
    }).then(function (row) { return fetchState().then(function () { return row; }); });
  }

  var pollTimer = null;
  function startPolling(ms) {
    ms = ms || 5000;
    fetchState().catch(function () {});
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(function () {
      if (document.visibilityState !== 'hidden') fetchState().catch(function () {});
    }, ms);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') fetchState().catch(function () {});
    });
  }

  window.WhydahGate = {
    GAMES: GAMES,
    NAMES: GAME_NAMES,
    getState: function () { return state; },
    lastReadOk: function () { return lastOk; },
    onChange: function (cb) { listeners.push(cb); try { cb(state, lastOk); } catch (_) {} },
    setGate: setGate,
    refresh: fetchState,
    startPolling: startPolling,
  };

  // ── Enforcement overlay (game pages) ──────────────────────────────────────
  var script = document.currentScript;
  var enforceSlug = script && script.getAttribute('data-enforce');

  if (enforceSlug) {
    var root = document.documentElement;
    root.classList.add('wg-gate', 'wg-checking');   // wg-gate: body hidden until wg-open

    var style = document.createElement('style');
    style.textContent =
      'html.wg-gate body{visibility:hidden!important;pointer-events:none!important}' +
      'html.wg-gate.wg-open body{visibility:visible!important;pointer-events:auto!important}' +
      '#wg-overlay{position:fixed;inset:0;z-index:2147483647;display:none;' +
        'flex-direction:column;align-items:center;justify-content:center;text-align:center;' +
        'padding:2rem;background:radial-gradient(circle at 50% 35%,#12314c,#081522 70%);' +
        'color:#f3e8ce;font-family:Georgia,"Times New Roman",serif;-webkit-user-select:none;user-select:none}' +
      'html.wg-gate:not(.wg-open) #wg-overlay{display:flex}' +
      '#wg-overlay .wg-seal{font-size:3.2rem;margin-bottom:.5rem}' +
      '#wg-overlay h1{font-size:1.6rem;margin:.2rem 0 .6rem;color:#e7c877;font-weight:700}' +
      '#wg-overlay p{margin:.2rem 0;max-width:30rem;line-height:1.45;color:#d9cba8}' +
      '#wg-overlay a{margin-top:1.4rem;color:#0b1a2b;background:#c9a55f;padding:.55em 1.1em;' +
        'border-radius:6px;text-decoration:none;font-weight:700}' +
      '#wg-overlay a:hover{background:#e7c877}' +
      '#wg-overlay .wg-dim{opacity:.7;font-size:.85rem;margin-top:1rem}';

    (document.head || root).appendChild(style);

    function buildOverlay() {
      if (document.getElementById('wg-overlay')) return;
      var ov = document.createElement('div');
      ov.id = 'wg-overlay';
      ov.setAttribute('role', 'dialog');
      ov.setAttribute('aria-live', 'polite');
      ov.innerHTML =
        '<div class="wg-seal" aria-hidden="true">🔒</div>' +
        '<h1 id="wg-title">Checking the ship’s log…</h1>' +
        '<p id="wg-msg">One moment while we see whether the crew may play.</p>' +
        '<a href="/">← Back to the dashboard</a>' +
        '<p class="wg-dim">' + (GAME_NAMES[enforceSlug] || enforceSlug) + '</p>';
      // Appended to <html>, not <body>, so the body-hidden rule can't hide it.
      root.appendChild(ov);
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', buildOverlay);
    } else {
      buildOverlay();
    }

    function render() {
      var known = Object.prototype.hasOwnProperty.call(state, enforceSlug);
      var open = state[enforceSlug] === true;
      root.classList.toggle('wg-open', open);
      root.classList.toggle('wg-checking', !known && lastOk === false ? false : !known);
      var title = document.getElementById('wg-title');
      var msg = document.getElementById('wg-msg');
      if (!title || !msg) return;
      if (open) return;                       // overlay hidden by CSS anyway
      if (!known && !lastOk) {
        title.textContent = 'Checking the ship’s log…';
        msg.textContent = 'One moment while we see whether the crew may play.';
      } else if (!lastOk) {
        title.textContent = 'Locked — no signal';
        msg.textContent = 'Can’t reach the ship’s log. You need to be online during class for the games to open.';
      } else {
        title.textContent = 'This game is locked';
        msg.textContent = 'Your teacher will open it for the crew during class.';
      }
    }

    listeners.push(render);
    startPolling(4000);
  } else if (!script || script.getAttribute('data-mode') !== 'off') {
    // Dashboard / watcher mode: just keep state fresh; the page drives its own UI.
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { startPolling(5000); });
    } else {
      startPolling(5000);
    }
  }
})();
