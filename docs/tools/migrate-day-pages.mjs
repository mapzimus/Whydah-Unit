// docs/tools/migrate-day-pages.mjs
// Transforms a live day page into a frozen archive page.
// Run:  node docs/tools/migrate-day-pages.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DAY_MAP } from './day-map.mjs';
import { rewriteRef } from './rewrite-refs.mjs';
import { withArchiveNotice } from './archive-notice.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function transform(html, entry) {
  let out = html;

  // 1. Remove the live-class banner machinery.
  out = out.replace(/^.*<script[^>]*src="day-config\.js[^"]*"[^>]*>\s*<\/script>.*$\n?/gm, '');
  out = out.replace(/<div id="today-banner"><\/div>\s*/g, '');

  // 2. Normalise the kicker against DAY_MAP. The kickers are ALREADY correct on
  //    all 19 pages (fixed by commit 1b42072), so this is a guard against drift,
  //    not the renumber itself — the renumber is in the filenames/slugs.
  //    Body text is never touched: "Build Day 1" is a lesson title and
  //    "a Day 5 kind of moment" is a back-reference.
  out = out.replace(
    /(<div class="kicker">)Day\s+[\d.]+[A-Za-z]*(\s*·)/,
    `$1Day ${entry.day}$2`
  );

  // 3. Rewrite every relative href/src for the new depth.
  out = out.replace(/\b(href|src)="([^"]*)"/g, (full, attr, value) => {
    try {
      return `${attr}="${rewriteRef(value)}"`;
    } catch (err) {
      throw new Error(`${entry.slug}: ${err.message}`);
    }
  });

  // 4. Add the archive notice at the top of the body. Depth 2, because day
  //    pages live at curriculum/<slug>/index.html.
  out = withArchiveNotice(out, 2);

  return out;
}

async function main() {
  const migrated = DAY_MAP.filter(d => d.file);
  for (const entry of migrated) {
    const src = await readFile(join(ROOT, entry.file), 'utf8');
    const outDir = join(ROOT, 'curriculum', entry.slug);
    await mkdir(outDir, { recursive: true });
    await writeFile(join(outDir, 'index.html'), transform(src, entry), 'utf8');
    console.log(`${entry.file.padEnd(14)} -> curriculum/${entry.slug}/  (Day ${entry.day})`);
  }
  console.log(`\n${migrated.length} pages migrated.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
