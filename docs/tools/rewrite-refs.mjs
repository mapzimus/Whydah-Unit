// docs/tools/rewrite-refs.mjs
// Rewrites one href/src value for a page moving from /dayN.html to
// /curriculum/<slug>/index.html (two levels deeper).
//
// Anything relative that is not recognised THROWS. A missed reference on a
// frozen archive is permanent, so failing loudly beats shipping a dead link.
import { byFile } from './day-map.mjs';

const ASSET_DIRS = ['pics/', 'navigator/', 'black-sam/', 'games/', 'parrot-flip/', 'vendor/'];
const STAYS_AT_ROOT = ['map-studio.html', 'flythrough.html'];
const MOVES_INTO_ARCHIVE = [
  'handouts.html',
  'choose-your-project.html',
  'curriculum-guide.html',
  'unit-at-a-glance.html',
  'index.html',
];

export function rewriteRef(value) {
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i.test(value)) return value;

  const m = /^([^?#]*)([?#].*)?$/.exec(value);
  const path = m[1];
  const suffix = m[2] ?? '';

  if (path === 'whydah-dashboard.html') return '../as-taught/' + suffix;

  const day = byFile(path);
  if (day) return `../${day.slug}/${suffix}`;

  if (STAYS_AT_ROOT.includes(path)) return '../../' + path + suffix;
  if (MOVES_INTO_ARCHIVE.includes(path)) return '../' + path + suffix;
  if (ASSET_DIRS.some(d => path.startsWith(d))) return '../../' + path + suffix;

  throw new Error(`unmapped relative reference: ${value}`);
}
