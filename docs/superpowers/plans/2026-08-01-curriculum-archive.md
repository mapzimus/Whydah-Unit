# Curriculum Archive Implementation Plan (Phase 1a)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the frozen `/curriculum/` archive — all 20 day pages plus supporting pages — alongside the live site, changing nothing a student currently touches.

**Architecture:** A one-time Node migration script transforms each existing `dayN.html` into a self-contained archive page at `/curriculum/day-N-slug/index.html`: it strips the live-class banner, renumbers to what students actually saw, and rewrites every relative reference for the new two-level-deeper location. The script is tested, not trusted. Output is plain static HTML with inline CSS and no build step, so the archive cannot break when anything else changes.

**Tech Stack:** Node 24 (built-in `node:test`, no new dependencies), static HTML, GitHub Pages.

---

## Context an engineer needs before starting

**This repo's `.gitignore` is a whitelist.** Line 2 is `*`. Every publishable path is re-added with `!`. A new file or directory is invisible to git until an explicit `!path` rule exists — `git add` refuses it with "ignored by one of your .gitignore files". Task 1 adds the rules.

**Merging to `main` publishes.** GitHub Pages serves the repo; `CNAME` points at whydahstory.com. There is no staging. Everything in this plan is *additive* — it creates new paths and touches no existing page — so publishing mid-plan is safe.

**CI proves almost nothing here.** `.github/workflows/syntax-check.yml` runs `node --check` on tracked `.js` and verifies game pages' local `src` targets exist. It does not validate HTML. Green CI is not evidence that an HTML change is correct. Verify against the built output.

**Do not touch** `photo/`, `photohunt/`, `photohunt2/`, `day-config.js`, or any existing `dayN.html`. The unit is still running.

**The numbering is the whole point.** From Day 15 on, the displayed day number is one higher than the filename — a scar from a mid-unit renumber on 2026-07-29. The archive fixes this. Two things look like day numbers and are not:
- the headings **"Build Day 1"** and **"Build Day 2"** — lesson titles
- back-references such as *"this is a Day 5 kind of moment"* — already correct, they point at earlier lessons

A blind find-and-replace corrupts both. The script never rewrites body text — only `href`/`src` attribute values and the one `kicker` line.

---

## File structure

| File | Responsibility |
| :-- | :-- |
| `docs/tools/day-map.mjs` | Single source of truth: old filename → day number → slug → title |
| `docs/tools/rewrite-refs.mjs` | Pure function: rewrite one `href`/`src` value for the new depth |
| `docs/tools/migrate-day-pages.mjs` | Reads each page, applies transforms, writes archive output |
| `docs/tools/*.test.mjs` | Tests for the two pure modules |
| `curriculum/day-N-slug/index.html` | 20 archived day pages (19 migrated, Day 1 authored) |
| `curriculum/index.html` | Archive front page, freeze header, day index |
| `curriculum/as-taught/index.html` | Frozen dashboard snapshot |

`docs/` is already whitelisted and will be disallowed in `robots.txt`, so the tooling ships with the repo without becoming part of the public site.

---

### Task 1: Whitelist the new paths

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add the rules**

Append to `.gitignore`:

```
# Frozen curriculum archive (added 2026-08-01)
!curriculum/
!curriculum/**
```

- [ ] **Step 2: Verify git will accept the new paths**

Do not use `git check-ignore` here. With `-v` it exits 0 whenever *any* pattern matches,
including a `!` negation, so it cannot distinguish "ignored" from "explicitly un-ignored".
Test the behaviour that actually matters instead — whether git will stage the file:

```bash
mkdir -p curriculum && echo test > curriculum/.probe
git add curriculum/.probe && git diff --cached --name-only | grep -q '^curriculum/.probe$' \
  && echo "PASS: git stages files under curriculum/" \
  || echo "FAIL: whitelist rule is wrong"
git reset -q HEAD curriculum/.probe
```

Expected: `PASS`. A `FAIL` means the `!` rules are missing or mis-ordered.

- [ ] **Step 3: Clean up and commit**

```bash
rm curriculum/.probe
git add .gitignore
git commit -m "chore: whitelist the curriculum archive path"
```

---

### Task 2: The day map

**Files:**
- Create: `docs/tools/day-map.mjs`
- Test: `docs/tools/day-map.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// docs/tools/day-map.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DAY_MAP, byFile } from './day-map.mjs';

test('covers all 20 student days exactly once', () => {
  const days = DAY_MAP.map(d => d.day).sort((a, b) => a - b);
  assert.deepEqual(days, Array.from({ length: 20 }, (_, i) => i + 1));
});

test('the renumber offset is preserved for the post-July-29 days', () => {
  assert.equal(byFile('day14b.html').day, 15);
  assert.equal(byFile('day15.html').day, 16);
  assert.equal(byFile('day19.html').day, 20);
});

test('Day 1 has no source file', () => {
  const dayOne = DAY_MAP.find(d => d.day === 1);
  assert.equal(dayOne.file, null);
});

test('slugs are unique and start with their day number', () => {
  const slugs = DAY_MAP.map(d => d.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const d of DAY_MAP) assert.ok(d.slug.startsWith(`day-${d.day}-`), d.slug);
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node --test docs/tools/day-map.test.mjs`
Expected: FAIL — `Cannot find module './day-map.mjs'`

- [ ] **Step 3: Write the map**

```js
// docs/tools/day-map.mjs
// Single source of truth for the archive renumber.
// `day` is what students saw. `file` is the historical filename, which from
// Day 15 on is one LOWER than the displayed number (2026-07-29 renumber).
export const DAY_MAP = [
  { day: 1,  file: null,           slug: 'day-1-launching-the-voyage',        title: 'Launching the Voyage' },
  { day: 2,  file: 'day2.html',    slug: 'day-2-what-is-a-map',               title: 'What Is a Map?' },
  { day: 3,  file: 'day3.html',    slug: 'day-3-reading-the-1719-map',        title: 'Reading the 1719 World Map' },
  { day: 4,  file: 'day4.html',    slug: 'day-4-adopt-a-ship',                title: 'Adopt a Ship' },
  { day: 5,  file: 'day5.html',    slug: 'day-5-out-of-the-machine',          title: 'Out of the Machine' },
  { day: 6,  file: 'day6.html',    slug: 'day-6-real-pirates-salem-maritime', title: 'Field Trip 1 — Real Pirates + Salem Maritime' },
  { day: 7,  file: 'day7.html',    slug: 'day-7-life-at-sea',                 title: 'Field Trip 2 — Life at Sea: Kayak Day' },
  { day: 8,  file: 'day8.html',    slug: 'day-8-the-vote',                    title: 'The Vote' },
  { day: 9,  file: 'day9.html',    slug: 'day-9-sign-the-articles',           title: 'Sign the Articles' },
  { day: 10, file: 'day10.html',   slug: 'day-10-the-wreck',                  title: 'The Wreck' },
  { day: 11, file: 'day11.html',   slug: 'day-11-georges-island',             title: 'Field Trip 3 — Georges Island' },
  { day: 12, file: 'day12.html',   slug: 'day-12-lost-and-found',             title: 'Lost and Found' },
  { day: 13, file: 'day13.html',   slug: 'day-13-where-ships-squeeze-through', title: 'Where Ships Squeeze Through' },
  { day: 14, file: 'day14.html',   slug: 'day-14-salem-then-and-now',         title: 'Salem Then and Now' },
  { day: 15, file: 'day14b.html',  slug: 'day-15-the-trial',                  title: 'The Trial' },
  { day: 16, file: 'day15.html',   slug: 'day-16-pitch-day',                  title: 'Pitch Day' },
  { day: 17, file: 'day16.html',   slug: 'day-17-synthesis-studio',           title: 'Synthesis Studio' },
  { day: 18, file: 'day17.html',   slug: 'day-18-build-day-1',                title: 'Build Day 1' },
  { day: 19, file: 'day18.html',   slug: 'day-19-build-day-2',                title: 'Build Day 2 — Peer Review' },
  { day: 20, file: 'day19.html',   slug: 'day-20-the-showcase',               title: 'The Showcase' },
];

export function byFile(file) {
  return DAY_MAP.find(d => d.file === file) ?? null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test docs/tools/day-map.test.mjs`
Expected: PASS, 4 tests

- [ ] **Step 5: Commit**

```bash
git add docs/tools/day-map.mjs docs/tools/day-map.test.mjs
git commit -m "feat: day map for the archive renumber"
```

---

### Task 3: Reference rewriting

Archive pages live at `/curriculum/<slug>/index.html` — two levels below root. Every relative reference has to move with them. This is the step that silently breaks all 34 images if it is wrong, so it is a pure function with tests.

**Files:**
- Create: `docs/tools/rewrite-refs.mjs`
- Test: `docs/tools/rewrite-refs.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// docs/tools/rewrite-refs.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rewriteRef } from './rewrite-refs.mjs';

test('leaves absolute and in-page references alone', () => {
  for (const v of ['https://example.com/x', '#top', '/favicon.ico', 'mailto:a@b.c']) {
    assert.equal(rewriteRef(v), v);
  }
});

test('root assets climb two levels', () => {
  assert.equal(rewriteRef('pics/whydah-bell.jpg'), '../../pics/whydah-bell.jpg');
  assert.equal(rewriteRef('navigator/'), '../../navigator/');
  assert.equal(rewriteRef('black-sam/'), '../../black-sam/');
  assert.equal(rewriteRef('games/'), '../../games/');
});

test('tools that keep their root URL climb two levels and keep their query', () => {
  assert.equal(rewriteRef('map-studio.html?door=suez'), '../../map-studio.html?door=suez');
  assert.equal(rewriteRef('flythrough.html'), '../../flythrough.html');
});

test('pages moving into the archive climb one level', () => {
  assert.equal(rewriteRef('handouts.html'), '../handouts.html');
  assert.equal(rewriteRef('choose-your-project.html#form'), '../choose-your-project.html#form');
});

test('the dashboard becomes the frozen snapshot, anchors intact', () => {
  assert.equal(rewriteRef('whydah-dashboard.html#people'), '../as-taught/#people');
  assert.equal(rewriteRef('whydah-dashboard.html'), '../as-taught/');
});

test('sibling day links use the new slug and the displayed number', () => {
  assert.equal(rewriteRef('day8.html'), '../day-8-the-vote/');
  assert.equal(rewriteRef('day14b.html'), '../day-15-the-trial/');
  assert.equal(rewriteRef('day19.html'), '../day-20-the-showcase/');
});

test('an unrecognised relative reference throws rather than shipping broken', () => {
  assert.throws(() => rewriteRef('mystery-page.html'), /unmapped/i);
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node --test docs/tools/rewrite-refs.test.mjs`
Expected: FAIL — `Cannot find module './rewrite-refs.mjs'`

- [ ] **Step 3: Write the implementation**

```js
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test docs/tools/rewrite-refs.test.mjs`
Expected: PASS, 7 tests

- [ ] **Step 5: Commit**

```bash
git add docs/tools/rewrite-refs.mjs docs/tools/rewrite-refs.test.mjs
git commit -m "feat: relative-reference rewriting for the archive"
```

---

### Task 4: The migration script

**Files:**
- Create: `docs/tools/migrate-day-pages.mjs`
- Test: `docs/tools/migrate-day-pages.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// docs/tools/migrate-day-pages.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transform } from './migrate-day-pages.mjs';

const SAMPLE = `<!DOCTYPE html><html><head>
<script src="day-config.js?v=20260729" defer></script>
</head><body>
<div id="today-banner"></div>
<div class="kicker">Day 14 · Week 4 · Pitch Week</div>
<h1>Build Day 1</h1>
<p>This is a Day 5 kind of moment.</p>
<a href="whydah-dashboard.html#people">People</a>
<img src="pics/whydah-bell.jpg">
<p><b>Tomorrow:</b> <a href="day15.html">next</a></p>
</body></html>`;

test('strips the banner div and the day-config script', () => {
  const out = transform(SAMPLE, { day: 15, slug: 'day-15-the-trial', title: 'The Trial' });
  assert.ok(!out.includes('today-banner'));
  assert.ok(!out.includes('day-config.js'));
});

test('renumbers only the kicker, never body text', () => {
  const out = transform(SAMPLE, { day: 15, slug: 'day-15-the-trial', title: 'The Trial' });
  assert.match(out, /<div class="kicker">Day 15 · Week 4 · Pitch Week<\/div>/);
  assert.ok(out.includes('<h1>Build Day 1</h1>'), 'lesson title must survive');
  assert.ok(out.includes('This is a Day 5 kind of moment.'), 'back-reference must survive');
});

test('rewrites references for the new depth', () => {
  const out = transform(SAMPLE, { day: 15, slug: 'day-15-the-trial', title: 'The Trial' });
  assert.ok(out.includes('href="../as-taught/#people"'));
  assert.ok(out.includes('src="../../pics/whydah-bell.jpg"'));
  assert.ok(out.includes('href="../day-16-pitch-day/"'));
});

test('adds the archive notice', () => {
  const out = transform(SAMPLE, { day: 15, slug: 'day-15-the-trial', title: 'The Trial' });
  assert.match(out, /Archived as taught/);
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node --test docs/tools/migrate-day-pages.test.mjs`
Expected: FAIL — `Cannot find module './migrate-day-pages.mjs'`

- [ ] **Step 3: Write the implementation**

```js
// docs/tools/migrate-day-pages.mjs
// Transforms a live day page into a frozen archive page.
// Run:  node docs/tools/migrate-day-pages.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DAY_MAP } from './day-map.mjs';
import { rewriteRef } from './rewrite-refs.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const NOTICE = `<div class="archive-notice" style="background:#1C3743;color:#C7BCA0;padding:.7em 1em;text-align:center;font-size:.95em;border-bottom:2px solid #A9781F;">
This unit ran July 6 – August 6, 2026 at Collins Middle School, Salem MA. <b>Archived as taught.</b> Not maintained. <a href="../" style="color:#D8B25A;">All 20 days</a>
</div>`;

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

  // 4. Add the archive notice at the top of the body.
  out = out.replace(/(<body[^>]*>)/, `$1\n${NOTICE}`);

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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test docs/tools/migrate-day-pages.test.mjs`
Expected: PASS, 4 tests

- [ ] **Step 5: Commit**

```bash
git add docs/tools/migrate-day-pages.mjs docs/tools/migrate-day-pages.test.mjs
git commit -m "feat: day page migration script"
```

---

### Task 5: Run the migration

**Files:**
- Create: `curriculum/day-2-*/index.html` … `curriculum/day-20-*/index.html` (19 pages)

- [ ] **Step 1: Run the full test suite first**

Run: `node --test "docs/tools/*.test.mjs"` (the bare-directory form `node --test docs/tools/` fails on this Node 24 / Windows setup — it tries to `require()` the directory)
Expected: PASS, 15 tests. Do not migrate on a red suite.

- [ ] **Step 2: Run the migration**

Run: `node docs/tools/migrate-day-pages.mjs`
Expected: 19 lines mapping old file to new slug, then `19 pages migrated.`

If it throws `unmapped relative reference`, a link exists that Task 3 does not know about. Add it to the correct list in `rewrite-refs.mjs` **with a test**, then re-run. Do not silence the error.

- [ ] **Step 3: Verify the day number matches the slug on every page**

```bash
for d in curriculum/day-*/index.html; do
  printf '%-46s %s\n' "$d" "$(grep -oE '<div class="kicker">[^<]*' "$d" | sed 's/<[^>]*>//')"
done
```

Expected: the number in each kicker matches the number in its directory name, for all 19. This is the check that catches a renumber error.

- [ ] **Step 4: Verify no live-class machinery survived**

```bash
grep -rl 'today-banner\|day-config.js' curriculum/ ; echo "matches=$?"
```

Expected: `matches=1` (grep found nothing).

- [ ] **Step 5: Verify no reference still points at a root page**

```bash
grep -rhoE '(href|src)="(day[0-9]|whydah-dashboard|pics/|navigator/|black-sam/)[^"]*"' curriculum/ | sort -u
```

Expected: no output. Any hit is an un-rewritten reference.

- [ ] **Step 6: Commit**

```bash
git add curriculum/
git commit -m "feat: archive the 19 day pages, renumbered as students saw them"
```

---

### Task 6: The frozen dashboard snapshot

Archived pages and the LEAP planner point at `../as-taught/`. It must never move.

**Files:**
- Create: `curriculum/as-taught/index.html`

- [ ] **Step 1: Copy the dashboard**

```bash
mkdir -p curriculum/as-taught
cp whydah-dashboard.html curriculum/as-taught/index.html
```

- [ ] **Step 2: Fix its asset paths for the new depth**

The dashboard also sits two levels deeper now. Run:

```bash
node -e '
const fs=require("fs");const p="curriculum/as-taught/index.html";
let h=fs.readFileSync(p,"utf8");
h=h.replace(/\b(href|src)="(pics\/|vendor\/|navigator\/|black-sam\/|games\/|parrot-flip\/)/g,"$1=\"../../$2");
h=h.replace(/\b(href|src)="(day[0-9][^"]*\.html)"/g,"$1=\"../\$2\"");
fs.writeFileSync(p,h);
console.log("rewritten");'
```

- [ ] **Step 3: Un-gate the hidden research sections**

The passcode currently hides `source-links` (bibliography) and `confidence` (the 🟢/🟡/🔴 methodology). In the snapshot, everything is visible. Delete the gating rule:

```bash
node -e '
const fs=require("fs");const p="curriculum/as-taught/index.html";
let h=fs.readFileSync(p,"utf8");
h=h.replace(/body:not\(\.admin-unlocked\) \[data-audience="admin"\] \{ display: none !important; \}/,
            "/* archive: nothing is gated */");
fs.writeFileSync(p,h);
console.log("un-gated");'
```

- [ ] **Step 4: Verify the anchors the planner depends on all exist**

```bash
for a in overview timeline people artifacts maps-geo why-piracy wreck-fleet salem final-project glossary confidence; do
  printf '%-16s %s\n' "$a" "$(grep -c "id=\"$a\"" curriculum/as-taught/index.html)"
done
```

Expected: `1` for all eleven. These are the anchors in the LEAP planner's resource index.

- [ ] **Step 5: Commit**

```bash
git add curriculum/as-taught/
git commit -m "feat: frozen as-taught dashboard snapshot, research sections un-gated"
```

---

### Task 7: Author the Day 1 page

Day 1 predates the day-page pattern and never had one. An archive that starts at Day 2 is not a twenty-day unit. **This task is independent — it blocks nothing and can be done at any point.**

**Files:**
- Create: `curriculum/day-1-launching-the-voyage/index.html`

Source material, all on the flash drive at `H:\Navigating_Piracy\Lessons\`:
`Day-1-Welcome-Aboard.pptx` (20 slides) · `DAY-1-Presentation-Script.md` · `Day-1-Circle-Activities.md` · `Day-1-Teleprompter-Notes.pdf`

- [ ] **Step 1: Read the source script**

Run: `node -e 'console.log(require("fs").readFileSync("H:/Navigating_Piracy/Lessons/DAY-1-Presentation-Script.md","utf8"))' | head -120`

- [ ] **Step 2: Copy an existing archive page as the structural template**

```bash
mkdir -p curriculum/day-1-launching-the-voyage
cp curriculum/day-2-what-is-a-map/index.html curriculum/day-1-launching-the-voyage/index.html
```

Day 2 is the closest structural match: same week, same page pattern, no field-trip layout.

- [ ] **Step 3: Replace the content**

Keep the shell — `<style>` block, archive notice, kicker, footer. Replace the body content with Day 1's lesson, drawn from the script. The page must carry the same elements every other day page has:

- kicker: `Day 1 · Week 1: Setting Sail`
- the hook artifact do-now (3 noticings, 2 questions)
- the Driving Question posted to the wall
- the 90-second Whydah spark
- the quick-write and pair-share
- hand-drawn "routes you travel on an ordinary day"
- the Articles norms segment (this is what Day 9's wax-seal signing pays off)
- closing circle
- **Reflection Q:** What questions do you already have about the world of the Whydah?
- **Academic Vocab:** driving question · perspective · voyage · primary source
- a note that Day 1 ran with no student folders — those begin Day 2

Voice rules are binding (`CLAUDE.md`): no em dashes, short sentences, one idea per line, captain-to-crew not brochure.

- [ ] **Step 4: Verify it matches the other pages structurally**

```bash
for f in curriculum/day-1-*/index.html curriculum/day-2-*/index.html; do
  printf '%-46s kicker=%s notice=%s vocab=%s\n' "$f" \
    "$(grep -c 'class="kicker"' $f)" "$(grep -c 'archive-notice' $f)" "$(grep -ci 'academic vocab' $f)"
done
```

Expected: `1 1 1` on both rows.

- [ ] **Step 5: Commit**

```bash
git add curriculum/day-1-launching-the-voyage/
git commit -m "feat: write the Day 1 archive page, completing the 20-day unit"
```

---

### Task 8: Supporting pages and the archive index

**Files:**
- Create: `curriculum/index.html`
- Create: `curriculum/{handouts,curriculum-guide,unit-at-a-glance,choose-your-project}.html`
- Create: `curriculum/planner/index.html`

- [ ] **Step 1: Copy the supporting pages and fix their depth**

```bash
for f in handouts curriculum-guide unit-at-a-glance choose-your-project; do
  node -e '
    const fs=require("fs");const n=process.argv[1];
    let h=fs.readFileSync(n+".html","utf8");
    h=h.replace(/\b(href|src)="(pics\/|vendor\/|navigator\/|black-sam\/|games\/|parrot-flip\/|map-studio\.html|flythrough\.html)/g,"$1=\"../$2");
    h=h.replace(/\b(href|src)="whydah-dashboard\.html/g,"$1=\"as-taught/index.html");
    h=h.replace(/^.*<script[^>]*day-config\.js[^>]*><\/script>.*$\n?/gm,"");
    h=h.replace(/<div id="today-banner"><\/div>\s*/g,"");
    fs.writeFileSync("curriculum/"+n+".html",h);
    console.log("wrote curriculum/"+n+".html");' "$f"
done
```

- [ ] **Step 2: Rewrite the day links inside those pages**

`curriculum-guide.html` and `unit-at-a-glance.html` link day pages by old filename. Run:

```bash
node --input-type=module -e '
import fs from "node:fs";
import { DAY_MAP } from "./docs/tools/day-map.mjs";
for (const n of ["curriculum-guide","unit-at-a-glance","handouts","choose-your-project"]) {
  const p="curriculum/"+n+".html"; let h=fs.readFileSync(p,"utf8");
  for (const d of DAY_MAP) if (d.file) h=h.split(`"${d.file}"`).join(`"${d.slug}/"`);
  fs.writeFileSync(p,h); console.log("relinked "+p);
}'
```

- [ ] **Step 3: Move the planner**

```bash
mkdir -p curriculum/planner
git mv unit-planner/PBL-Unit-Planner-Summer-2026-FINAL.md curriculum/planner/index.md
```

The planner's own link rewrite is **Phase 1c**, not this plan. Moving it now only establishes its final URL.

- [ ] **Step 4: Write the archive index**

Create `curriculum/index.html`. It must contain, in this order:

1. The freeze header, verbatim:
   *"This unit ran July 6 – August 6, 2026 at Collins Middle School, Salem MA. Archived as taught. Not maintained."*
2. One paragraph on what the unit was and who it was for.
3. **A note that the red TODAY banner referenced throughout the day pages was a live-class device that no longer exists** — readers should use the day index below.
4. The full Day 1–20 index, linking each `day-N-slug/`, with lesson titles from `DAY_MAP`.
5. Links to the guide, at-a-glance, handouts, project menu, planner, and `as-taught/`.
6. A line stating that slide decks and teacher run-sheets are not published here because the run-sheets contain the cipher-league answers, and are supplied directly with the planner.

- [ ] **Step 5: Verify every link in the index resolves to a real file**

```bash
node -e '
const fs=require("fs");
const h=fs.readFileSync("curriculum/index.html","utf8");
const refs=[...h.matchAll(/href="([^":#][^"]*)"/g)].map(m=>m[1].split(/[?#]/)[0]);
let bad=0;
for (const r of new Set(refs)) {
  const p="curriculum/"+r.replace(/\/$/,"/index.html");
  if (!fs.existsSync(p)) { console.log("MISSING: "+r+"  -> "+p); bad++; }
}
console.log(bad===0?"all index links resolve":bad+" broken");'
```

Expected: `all index links resolve`

- [ ] **Step 6: Commit**

```bash
git add curriculum/ unit-planner/
git commit -m "feat: curriculum archive index and supporting pages"
```

---

### Task 9: Whole-archive verification

Nothing here changes files. If any check fails, fix it before the archive is considered done — this is a freeze, so errors become permanent.

- [ ] **Step 1: Every one of the 20 days exists**

```bash
node --input-type=module -e '
import fs from "node:fs";
import { DAY_MAP } from "./docs/tools/day-map.mjs";
let bad=0;
for (const d of DAY_MAP) {
  const p=`curriculum/${d.slug}/index.html`;
  if(!fs.existsSync(p)){console.log("MISSING "+p);bad++;}
}
console.log(bad?bad+" missing":"all 20 day pages present");'
```

Expected: `all 20 day pages present`

- [ ] **Step 2: No archive page references a file that does not exist**

```bash
node -e '
const fs=require("fs"),path=require("path");
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
let bad=0;
for (const f of walk("curriculum").filter(f=>f.endsWith(".html"))) {
  const h=fs.readFileSync(f,"utf8");
  for (const m of h.matchAll(/(?:href|src)="([^":#][^"]*)"/g)) {
    const r=m[1].split(/[?#]/)[0]; if(!r) continue;
    let t=path.join(path.dirname(f),r);
    if (r.endsWith("/")) t=path.join(t,"index.html");
    if(!fs.existsSync(t)){console.log(f+" -> "+r);bad++;}
  }
}
console.log(bad?bad+" broken references":"no broken references");'
```

Expected: `no broken references`

- [ ] **Step 3: Confirm the live site is untouched**

```bash
git diff --stat origin/main -- . ':!curriculum' ':!docs' ':!.gitignore' ':!unit-planner'
```

Expected: empty. This plan must not have modified a single page a student is still using.

- [ ] **Step 4: Confirm the tests still pass**

Run: `node --test "docs/tools/*.test.mjs"` (the bare-directory form `node --test docs/tools/` fails on this Node 24 / Windows setup — it tries to `require()` the directory)
Expected: PASS, 15 tests

- [ ] **Step 5: Push**

```bash
git push origin main
```

Additive only — no existing URL changes. Then spot-check three live pages in a browser:
`/curriculum/`, `/curriculum/day-15-the-trial/`, `/curriculum/as-taught/#people`

---

## What this plan deliberately does not do

- **Touch any live page.** No `dayN.html`, no `index.html`, no `day-config.js`. That is the switchover, after the Showcase.
- **Delete anything.** Old URLs keep working throughout.
- **Build the reference site.** `/story/`, `/people/`, `/the-wreck/` and the rest are Phase 1b.
- **Rewrite the planner's links or drop its dates.** Phase 1c, once these URLs are live and verifiable.
- **Touch `photo/`, `photohunt/`, `photohunt2/`.** Max deletes those at end of week.
