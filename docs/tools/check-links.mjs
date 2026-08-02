// Walks every HTML file under a directory and confirms each relative href/src
// resolves to a file that exists on disk.
//
// The archive is a freeze: a dead link becomes permanent. This is the check
// that proves references were not merely rewritten, but rewritten correctly.
//
//   node docs/tools/check-links.mjs curriculum
//
// Exits 1 if anything is unresolved, so it can gate a commit.
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] ?? 'curriculum';

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]
  );
}

const SKIP = /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i;

const pages = walk(root).filter(f => f.endsWith('.html'));
const broken = new Map();
let checked = 0;

for (const page of pages) {
  const html = fs.readFileSync(page, 'utf8');
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const ref = m[1].split(/[?#]/)[0];
    if (!ref || SKIP.test(ref)) continue;
    checked++;
    let target = path.join(path.dirname(page), ref);
    if (ref.endsWith('/')) target = path.join(target, 'index.html');
    if (!fs.existsSync(target)) {
      if (!broken.has(ref)) broken.set(ref, new Set());
      broken.get(ref).add(page);
    }
  }
}

console.log(`${pages.length} pages, ${checked} relative references checked`);

if (broken.size === 0) {
  console.log('ALL REFERENCES RESOLVE');
  process.exit(0);
}

console.log(`\n${broken.size} unresolved target(s):`);
for (const [ref, pagesWithRef] of [...broken].sort((a, b) => b[1].size - a[1].size)) {
  console.log(`  ${String(pagesWithRef.size).padStart(3)} page(s)  ${ref}`);
}
process.exit(1);
