// docs/tools/make-snapshot.mjs
// Freezes whydah-dashboard.html into curriculum/as-taught/index.html — the
// permanent snapshot that the 19 archived day pages link to. The live
// dashboard is about to be split apart and rewritten; this snapshot must
// never move and must keep its anchors (an external document links eleven
// of them by name).
//
// The dashboard's data-audience="admin" sections get three different
// treatments in the frozen archive, per the design spec:
//   - source-links, confidence            -> promoted to public (un-gated)
//   - unit-plan, voyage-journal           -> kept as-is (curriculum content)
//   - game-gate, teacher-toolkit          -> deleted (live classroom
//                                            control panels, meaningless
//                                            once the class no longer exists)
//
// Run:  node docs/tools/make-snapshot.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rewriteRef } from './rewrite-refs.mjs';
import { withArchiveNotice } from './archive-notice.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const GATE_RULE = 'body:not(.admin-unlocked) [data-audience="admin"] { display: none !important; }';
const GATE_REPLACEMENT = '/* archive: nothing is gated */';

// Sections are flat siblings under <main> (verified: no <section> nests
// inside another in this document), so matching from the opening tag to the
// next </section> is exactly that section's own close.
const DELETED_SECTIONS = ['game-gate', 'teacher-toolkit'];

const DELETED_NAV_LINKS = [
  '<li data-audience="admin"><a href="#game-gate" data-admin-link="true">Game Gate</a></li>',
  '<li data-audience="admin"><a href="#teacher-toolkit" data-admin-link="true">Teacher Toolkit</a></li>',
];

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

  // 3. Delete the two teacher-control panels outright (game-gate,
  //    teacher-toolkit) — un-gating exposed them, but they are classroom
  //    control surfaces (crew-points scoreboard, banner override, the
  //    live game-unlock switch), not content, and are meaningless on a
  //    frozen public archive. unit-plan, voyage-journal, source-links and
  //    confidence are curriculum/research content and are kept.
  for (const id of DELETED_SECTIONS) {
    const re = new RegExp(`<section id="${id}"[\\s\\S]*?<\\/section>\\s*`);
    if (!re.test(out)) {
      throw new Error(`<section id="${id}"> not found — dashboard markup may have changed`);
    }
    out = out.replace(re, '');
  }
  for (const li of DELETED_NAV_LINKS) {
    if (!out.includes(li)) {
      throw new Error(`nav link not found verbatim: ${li} — dashboard markup may have changed`);
    }
    // Remove the whole line (including its indentation) so no blank line
    // full of leading whitespace is left behind in the nav list.
    out = out.replace(new RegExp(`^.*${li.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*$\\n?`, 'm'), '');
  }
  for (const id of DELETED_SECTIONS) {
    if (out.includes(`<section id="${id}"`) || out.includes(`href="#${id}"`)) {
      throw new Error(`${id} survived deletion (section or nav link) — check the removal regex`);
    }
  }

  // 4. The og:image preview path is a relative reference too, just not on
  //    href/src — rewrite it the same way everything else gets rewritten.
  //    Deliberately narrow: this does NOT touch other content="..." meta
  //    attributes (twitter:card, descriptions, etc.), which are prose, not
  //    paths.
  const OG_IMAGE_RE = /(<meta property="og:image" content=")([^"]*)(">)/;
  if (!OG_IMAGE_RE.test(out)) {
    throw new Error('og:image meta tag not found — dashboard markup may have changed');
  }
  out = out.replace(OG_IMAGE_RE, (full, pre, value, post) => pre + rewriteRef(value) + post);

  // 5. Rewrite every relative href/src for the new depth (two levels below
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

  out = withArchiveNotice(out, 2);
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
  console.log(`  teacher-control panels deleted: ${DELETED_SECTIONS.join(', ')} (+ their nav links)`);
  console.log('  og:image meta path: rewritten');
  console.log(`  href/src references rewritten: ${rewritten}`);
  console.log(`  output size: ${Buffer.byteLength(html, 'utf8').toLocaleString()} bytes`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
