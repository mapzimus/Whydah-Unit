// docs/tools/copy-support-pages.mjs
// Copies the four root-level supporting pages into the archive at
// curriculum/<same-filename>, one level below the repo root (not two, like
// the day pages and the as-taught/ snapshot). Modelled on make-snapshot.mjs.
//
// The live class runs through Thursday, so this is copy-only: the root page
// is read, never modified or deleted.
//
// Run:  node docs/tools/copy-support-pages.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rewriteRef } from './rewrite-refs.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const PAGES = [
  'handouts.html',
  'curriculum-guide.html',
  'unit-at-a-glance.html',
  'choose-your-project.html',
];

export function transform(html, filename) {
  let out = html;

  // 1. Strip the live-class banner machinery, same as the other migrations
  //    (docs/tools/migrate-day-pages.mjs). Not every supporting page carries
  //    this markup — only choose-your-project.html does today — so these
  //    replaces are tolerant of zero matches, unlike make-snapshot.mjs's
  //    strict presence checks for the single dashboard file.
  out = out.replace(/^.*<script[^>]*src="day-config\.js[^"]*"[^>]*>\s*<\/script>.*$\n?/gm, '');
  out = out.replace(/<div id="today-banner"><\/div>\s*/g, '');

  // 2. Rewrite every relative href/src for the new depth: these pages live
  //    at curriculum/<filename>, one level below the repo root. rewriteRef
  //    throws on anything it doesn't recognise; that is deliberate and is
  //    not swallowed here, only annotated with which file it came from, so
  //    an unmapped reference fails the whole run loudly rather than
  //    shipping a dead link in a page that can never be updated again.
  let rewritten = 0;
  out = out.replace(/\b(href|src)="([^"]*)"/g, (full, attr, value) => {
    let next;
    try {
      next = rewriteRef(value, { depth: 1 });
    } catch (err) {
      throw new Error(`${filename}: ${err.message}`);
    }
    rewritten++;
    return `${attr}="${next}"`;
  });

  return { html: out, rewritten };
}

async function main() {
  const outDir = join(ROOT, 'curriculum');
  await mkdir(outDir, { recursive: true });

  for (const filename of PAGES) {
    const src = await readFile(join(ROOT, filename), 'utf8');
    const { html, rewritten } = transform(src, filename);
    await writeFile(join(outDir, filename), html, 'utf8');
    console.log(`${filename.padEnd(24)} -> curriculum/${filename}  (${rewritten} references rewritten)`);
  }
  console.log(`\n${PAGES.length} supporting pages copied.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
