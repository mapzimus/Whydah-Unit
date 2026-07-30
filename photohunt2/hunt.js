/* Photo Hunt 2 (outdoor) shared logic. Loads after ../photo/photo.js (Supabase helpers).
 *
 * Round 2 is built for a field with no WiFi: a photo is saved on the phone the
 * instant it is picked, counts right away, and uploads itself whenever the
 * connection comes back. Nothing waits on staff.
 *
 * Same Supabase table as round 1 — the rounds are kept apart by the storage
 * path prefix below, so neither round ever shows the other's photos.
 */

const HUNT_ITEMS = [
  { id: 1,  text: 'Fill almost the whole frame with sky and let one small thing poke into it.' },
  { id: 2,  text: 'Lie on your back and shoot straight up into a tree.' },
  { id: 3,  text: 'Find a line that runs forever — yard lines, a fence, a park path. Shoot straight down it.' },
  { id: 4,  text: 'Put your buddy against the bright sky so they come out as a solid black shape.' },
  { id: 5,  text: 'Find something out here that looks like a face but is not one.' },
  { id: 6,  text: 'Someone mid-jump on the field, frozen in the air with nothing but sky behind them.' },
  { id: 7,  text: 'Shoot THROUGH something — a fence, a bush, the bleachers — so it frames whoever you are shooting.' },
  { id: 8,  text: 'Get so close to bark, brick, grass, or chain-link that nobody can tell what it is.' },
  { id: 9,  text: 'Find the longest shadow you can. The shadow is the star, not the person.' },
  { id: 10, text: 'Use your hand to look like you are holding up the goalpost, a tree, or the whole school.' },
  { id: 11, text: 'Bleacher rows, fence posts, windows — fill the frame with one pattern repeating.' },
  { id: 12, text: 'Find something growing where it should not be. A weed in a crack, a vine on a fence.' },
  { id: 13, text: 'Get three things the same color in one photo. Green does not count — too easy out here.' },
  { id: 14, text: 'Put the camera down in the grass so the grass is huge up front and your buddy is tiny way behind.' },
  { id: 15, text: 'Get a photo of someone running that SHOWS they are moving. Blurry on purpose.' },
  { id: 16, text: 'Find a reflection outside — a puddle, a car, a window. No mirrors.' },
  { id: 17, text: 'Just feet or shoes on the field or a park path, and make it actually interesting.' },
  { id: 18, text: 'Find the tallest thing out here — light pole, tree, flagpole. Shoot from the base looking straight up.' },
  { id: 19, text: 'Back way up so your whole team is tiny and the field is huge around them.' },
  { id: 20, text: 'Get a "spy photo" of someone who has no idea they are being photographed.' },
];
/* ------------------------------------------------------------------ *
 * Teams. How many groups there are changes day to day, so staff set the
 * list on teams.html; it rides along in the ?teams= link and sticks in
 * localStorage after that.
 *
 * DB_TEAMS is what the database will actually accept — there is a CHECK
 * constraint on hunt_submissions.team. Anything outside that list would
 * upload-fail, so the setup page warns instead of letting it happen.
 * ------------------------------------------------------------------ */
const DEFAULT_TEAMS = ['A', 'B', 'C'];
const DB_TEAMS = ['A', 'B', 'C'];

function parseTeams(s) {
  return String(s || '').split(',')
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean)
    .filter((t, i, a) => a.indexOf(t) === i)
    .slice(0, 12);
}

function loadTeams() {
  const qp = new URLSearchParams(location.search).get('teams');
  const fromUrl = parseTeams(qp);
  if (fromUrl.length) {
    try { localStorage.setItem('hunt2_teams', fromUrl.join(',')); } catch (e) {}
    return fromUrl;
  }
  try {
    const saved = parseTeams(localStorage.getItem('hunt2_teams'));
    if (saved.length) return saved;
  } catch (e) {}
  return DEFAULT_TEAMS.slice();
}

function saveTeams(list) {
  TEAMS = list.slice();
  try { localStorage.setItem('hunt2_teams', TEAMS.join(',')); } catch (e) {}
  return TEAMS;
}

let TEAMS = loadTeams();

/* Teams that actually have photos, for the gallery and staff views — those
 * should show whatever exists, no matter what this device has configured. */
function teamsInRows(rows) {
  const seen = [];
  for (const r of rows) if (r.team && seen.indexOf(r.team) === -1) seen.push(r.team);
  for (const t of TEAMS) if (seen.indexOf(t) === -1) seen.push(t);
  return seen.sort();
}

/* Round 2 lives under this storage folder. Every query filters on it. */
const PATH_PREFIX = 'hunt2';

function itemText(id) {
  const it = HUNT_ITEMS.find((i) => i.id === id);
  return it ? it.text : 'Item ' + id;
}

/* PATCH a row's status (photo.js only has select/insert) */
async function dbUpdate(table, query, patch) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    headers: { ...sbHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error(`Update failed (${r.status})`);
}

/* This round's submissions, oldest first (optionally one team's) */
async function huntRows(team) {
  const filter = team ? `&team=eq.${team}` : '';
  return dbSelect('hunt_submissions',
    `select=*&path=like.${PATH_PREFIX}/*${filter}&order=created_at.asc`);
}

/* Current state per item for one team: the newest row wins; a 'retake' row
 * means the item is open again. Returns {itemId: row|null}. */
function teamState(rows) {
  const state = {};
  for (const it of HUNT_ITEMS) state[it.id] = null;
  for (const r of rows) state[r.item_id] = r.status === 'retake' ? null : r;
  return state;
}

/* ------------------------------------------------------------------ *
 * Offline queue — photos live in IndexedDB until they reach Supabase.
 * A record is {key, team, itemId, blob, ext, savedAt}.
 * ------------------------------------------------------------------ */
const QDB = 'photohunt2', QSTORE = 'queue';

function openQueue() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(QDB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(QSTORE)) {
        req.result.createObjectStore(QSTORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function queueTx(mode, run) {
  return openQueue().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(QSTORE, mode);
    const req = run(tx.objectStore(QSTORE));
    tx.oncomplete = () => resolve(req && req.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }));
}

const queueSave = (rec) => queueTx('readwrite', (s) => s.put(rec));
const queueDelete = (key) => queueTx('readwrite', (s) => s.delete(key));
const queueAll = () => queueTx('readonly', (s) => s.getAll()).then((r) => r || []);

/* One queued photo per team+item: re-shooting an item replaces the old one. */
const queueKey = (team, itemId) => team + ':' + itemId;

/* Push one queued photo to Supabase, then drop it from the queue.
 * Storage upload is idempotent enough for us: a retry just writes a new path. */
async function flushOne(rec) {
  const path = `${PATH_PREFIX}/team-${rec.team}/item-${rec.itemId}-${rec.savedAt}${rec.ext}`;
  await storageUpload(path, rec.blob);
  let row;
  try {
    row = await dbInsert('hunt_submissions', {
      team: rec.team, item_id: rec.itemId, path, status: 'approved',
    });
  } catch (e) {
    // DB may not allow setting status on insert — a plain insert still counts
    row = await dbInsert('hunt_submissions', { team: rec.team, item_id: rec.itemId, path });
  }
  await queueDelete(rec.key);
  return row;
}

/* Try to send everything waiting. Returns {sent, left, rows}. Never throws —
 * a failure just means the photos stay queued for the next attempt. */
async function flushQueue(team) {
  const all = await queueAll();
  const mine = team ? all.filter((r) => r.team === team) : all;
  const rows = [];
  let sent = 0;
  for (const rec of mine) {
    try {
      rows.push(await flushOne(rec));
      sent++;
    } catch (e) {
      break; // still offline or the upload is failing — keep the rest queued
    }
  }
  const left = (await queueAll()).filter((r) => !team || r.team === team).length;
  return { sent, left, rows };
}
