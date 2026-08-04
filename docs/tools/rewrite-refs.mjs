// docs/tools/rewrite-refs.mjs
// Rewrites one href/src value for a page some number of directory levels
// below the repo root. Default depth 2 matches an archived day page at
// /curriculum/<slug>/index.html; pass { depth: 1 } for a page that sits
// directly under /curriculum/, e.g. /curriculum/handouts.html.
//
// Anything relative that is not recognised THROWS. A missed reference on a
// frozen archive is permanent, so failing loudly beats shipping a dead link.
import { byFile } from './day-map.mjs';

const ASSET_DIRS = ['pics/', 'navigator/', 'black-sam/', 'games/', 'parrot-flip/', 'vendor/'];
const STAYS_AT_ROOT = ['map-studio.html', 'flythrough.html', 'favicon.ico', 'site.webmanifest', 'apple-touch-icon.png'];
const MOVES_INTO_ARCHIVE = [
  'handouts.html',
  'choose-your-project.html',
  'curriculum-guide.html',
  'unit-at-a-glance.html',
  'index.html',
];

export function rewriteRef(value, { depth = 2 } = {}) {
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i.test(value)) return value;

  const m = /^([^?#]*)([?#].*)?$/.exec(value);
  const path = m[1];
  const suffix = m[2] ?? '';

  // STAYS_AT_ROOT / ASSET_DIRS never move — climb all the way to the repo
  // root. MOVES_INTO_ARCHIVE, day pages, and the as-taught/ snapshot live
  // inside curriculum/ — they are siblings (or a level of siblings) of this
  // page, one climb shorter.
  const toRoot = '../'.repeat(depth);
  const toArchive = '../'.repeat(depth - 1);

  if (path === 'whydah-dashboard.html') return toArchive + 'as-taught/' + suffix;

  const day = byFile(path);
  if (day) return `${toArchive}${day.slug}/${suffix}`;

  if (STAYS_AT_ROOT.includes(path)) return toRoot + path + suffix;
  if (MOVES_INTO_ARCHIVE.includes(path)) return toArchive + path + suffix;
  if (ASSET_DIRS.some(d => path.startsWith(d))) return toRoot + path + suffix;

  throw new Error(`unmapped relative reference: ${value}`);
}
