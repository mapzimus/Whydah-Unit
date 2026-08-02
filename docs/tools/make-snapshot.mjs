// docs/tools/make-snapshot.mjs
// Freezes whydah-dashboard.html into curriculum/as-taught/index.html — the
// permanent snapshot that the 19 archived day pages link to. The live
// dashboard is about to be split apart and rewritten; this snapshot must
// never move and must keep its anchors (an external document links eleven
// of them by name).
//
// Run:  node docs/tools/make-snapshot.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rewriteRef } from './rewrite-refs.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const GATE_RULE = 'body:not(.admin-unlocked) [data-audience="admin"] { display: none !important; }';
const GATE_REPLACEMENT = '/* archive: nothing is gated */';

export function transform(html) {
  let out = html;

  // 1. Strip the live-class banner machinery, exactly as the day-page
  //    migration does (docs/tools/migrate-day-pages.mjs).
  out = out.replace(/^.*<script[^>]*src="day-config\.js[^"]*"[^>]*>\s*<\/script>.*$\n?/gm, '');
  out = out.replace(/<div id="today-banner"><\/div>\s*/g, '');
  if (/<script[^>]*src="day-config\.js/.test(out)) {
    throw new Error('day-config.js script tag survived the strip — dashboard markup may have changed');
  }
  if (out.includes('<div id="today-banner">')) {
    throw new Error('#today-banner div survived the strip — dashboard markup may have changed');
  }

  // 2. Un-gate the hidden research sections. In the frozen archive nothing
  //    is gated: source-links (bibliography) and confidence (sourcing
  //    methodology) are the basis for trusting the site's claims. Section
  //    markup and data-audience attributes are left untouched — only the
  //    CSS rule that hides them is replaced.
  if (!out.includes(GATE_RULE)) {
    throw new Error('admin gate CSS rule not found verbatim — dashboard markup may have changed');
  }
  out = out.replace(GATE_RULE, GATE_REPLACEMENT);

  // 3. Rewrite every relative href/src for the new depth (two levels below
  //    the repo root, same as an archived day page). rewriteRef() throws on
  //    anything it doesn't recognise — that is deliberate and is not caught
  //    here, so an unmapped reference fails the whole run loudly rather than
  //    shipping a dead link in a page that can never be updated again.
  let rewritten = 0;
  out = out.replace(/\b(href|src)="([^"]*)"/g, (full, attr, value) => {
    const next = rewriteRef(value);
    rewritten++;
    return `${attr}="${next}"`;
  });

  return { html: out, rewritten };
}

async function main() {
  const srcPath = join(ROOT, 'whydah-dashboard.html');
  const src = await readFile(srcPath, 'utf8');

  const { html, rewritten } = transform(src);

  const outDir = join(ROOT, 'curriculum', 'as-taught');
  const outPath = join(outDir, 'index.html');
  await mkdir(outDir, { recursive: true });
  await writeFile(outPath, html, 'utf8');

  console.log('whydah-dashboard.html -> curriculum/as-taught/index.html');
  console.log('  live-class banner machinery: removed (day-config.js script + #today-banner div)');
  console.log(`  admin gate CSS rule: replaced with "${GATE_REPLACEMENT}"`);
  console.log(`  href/src references rewritten: ${rewritten}`);
  console.log(`  output size: ${Buffer.byteLength(html, 'utf8').toLocaleString()} bytes`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
