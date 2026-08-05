// Finalise the LEAP unit planner for handover.
//
// Three jobs:
//   1. Repoint every URL at the frozen archive under /curriculum/.
//   2. Drop the specific dates. The calendar becomes an ordered sequence of
//      Days 1-20. The gaps and doubled-up cells in the original are artifacts
//      of one particular July, not properties of the unit, and a facilitator
//      re-running this needs the lesson order, not our calendar.
//   3. Reframe the materials appendix: nothing is uploaded anywhere, the
//      teaching kit is handed over as files.
//
// Run: node docs/tools/finalize-planner.mjs

import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DAY_MAP } from './day-map.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, 'unit-planner', 'PBL-Unit-Planner-Summer-2026-FINAL.md');
const OUT = join(ROOT, 'curriculum', 'planner', 'index.md');
const SITE = 'https://whydahstory.com';

// ------------------------------------------------------------------ URLs ---
function repointUrls(t) {
  // Day pages, longest filename first so day14b is never matched as day14 + "b".
  const ordered = DAY_MAP.filter(d => d.file).sort((a, b) => b.file.length - a.file.length);
  for (const d of ordered) {
    t = t.split(`${SITE}/${d.file}`).join(`${SITE}/curriculum/${d.slug}/`);
  }
  // The live dashboard is frozen into the archive. Anchors must survive: the
  // resource index links eleven of them by name.
  t = t.split(`${SITE}/unit/#`).join(`${SITE}/curriculum/as-taught/#`);
  t = t.split(`${SITE}/unit/`).join(`${SITE}/curriculum/as-taught/`);
  // Supporting pages moved into the archive.
  for (const p of ['curriculum-guide.html', 'unit-at-a-glance.html', 'handouts.html', 'choose-your-project.html']) {
    t = t.split(`${SITE}/${p}`).join(`${SITE}/curriculum/${p}`);
  }
  // Black Sam was removed from the site; the games hub is what remains.
  t = t.split(`${SITE}/black-sam/`).join(`${SITE}/games/`);
  return t;
}

// ------------------------------------------------------------------ dates ---
const WEEK_HEADS = [
  ['### Week 1 (07/06) — Maps & Power', '### Week 1 — Maps and Power'],
  ['### Week 2 (07/13) — The Triangle Trade', '### Week 2 — The Triangle Trade'],
  ['### Week 3 (07/20) — Life as a Pirate', '### Week 3 — Life as a Pirate'],
  ['### Week 4 (07/27) — Modern Oceans, and the Record', '### Week 4 — Modern Oceans, and the Record'],
  ['### Week 5 (08/03) — Synthesis, Build & Showcase *(as planned)*', '### Week 5 — Synthesis, Build and Showcase'],
];

// Week 1 loses its fourth column entirely. The session that would have filled it
// was lost to illness and its content folded into Day 4, so a facilitator with a
// normal calendar should simply see a three-lesson opening week.
const WEEK1_HEAD_OLD = '| Mon 7/6 · **Day 1** | Tue 7/7 · **Day 2** | Wed 7/8 · **Day 3** | Thu 7/9 |';
const WEEK1_HEAD_NEW = '| **Day 1** | **Day 2** | **Day 3** |';

const HEADS = [
  ['| Mon 7/13 · **Day 4** | Tue 7/14 · **Day 5** | Wed 7/15 · **Day 6 — FIELD TRIP 1** | Thu 7/16 · **Day 7 — FIELD TRIP 2** |',
   '| **Day 4** | **Day 5** | **Day 6 — FIELD TRIP 1** | **Day 7 — FIELD TRIP 2** |'],
  ['| Mon 7/20 · **Day 8** | Tue 7/21 · **Day 9** | Wed 7/22 · **Days 10 + 12** | Thu 7/23 · **Day 11 — FIELD TRIP 3** |',
   '| **Day 8** | **Day 9** | **Day 10 and Day 12** | **Day 11 — FIELD TRIP 3** |'],
  ['| Mon 7/27 · **Day 13** | Tue 7/28 · **Day 14** | Wed 7/29 · **Day 15** | Thu 7/30 · **Day 16** |',
   '| **Day 13** | **Day 14** | **Day 15** | **Day 16** |'],
  ['| Mon 8/3 · **Day 17** | Tue 8/4 · **Day 18** | Wed 8/5 · **Day 19** | Thu 8/6 · **Day 20** |',
   '| **Day 17** | **Day 18** | **Day 19** | **Day 20** |'],
];

function dropDates(t) {
  for (const [a, b] of WEEK_HEADS) t = t.split(a).join(b);
  for (const [a, b] of HEADS) t = t.split(a).join(b);

  // Week 1: drop the header's fourth column, its separator cell, and the
  // "no class" body cell (everything from the last ` | ` of that row onward).
  const i = t.indexOf(WEEK1_HEAD_OLD);
  if (i !== -1) {
    t = t.replace(WEEK1_HEAD_OLD, WEEK1_HEAD_NEW);
    // The separator row immediately after it.
    t = t.replace('| :-- | :-- | :-- | :-- |\n| **Launching the Voyage**', '| :-- | :-- | :-- |\n| **Launching the Voyage**');
    // The missed-session cell is the final cell of the Week 1 body row.
    t = t.replace(/\s*\|\s*\*\*No class — session missed\.\*\*[\s\S]*?\*\*Day 13\*\*\.\s*\|/, ' |');
  }

  // Header block and prose references to specific dates.
  t = t.replace('**Dates:** July 6 – August 6, 2026 · Mon–Thu · 2 sections × ~20 students · 90 min per section',
                '**Format:** 20 sessions across five weeks · Mon–Thu · 2 sections × ~20 students · 90 min per section');
  t = t.replace(/> \*\*How to read this planner\.\*\*[\s\S]*?are in-line so any future facilitator can run this unit straight from the web\./,
`> **How to read this planner.** The calendar below is the unit as designed and taught:
> twenty lessons in order, grouped by week and theme. Specific dates are deliberately
> omitted, because they belong to one particular summer rather than to the unit. Every
> lesson has a live student page, linked in-line, so this can be run straight from the web.
> **Appendix B records what changed from the original plan and why** — that is the part
> worth reading before you teach it.`);
  t = t.replace('Presented publicly at the **Showcase (Thu Aug 6)**.', 'Presented publicly at the **Showcase** on the final day.');
  t = t.replace('### Week 5 (08/03)', '### Week 5');
  t = t.replace(/\*\*Weekly extended writing prompt:\*\*/g, '**Weekly extended writing prompt:**');
  return t;
}

// ------------------------------------------------------------- appendix C ---
function reframeAppendixC(t) {
  t = t.replace(/All of the following have been \*\*located and inventoried\*\*[\s\S]*?folder too\./,
`Everything listed below is **included in the handover packet** as files. Nothing is hosted
online, and nothing needs to be uploaded.

The complete teaching handbook — every run-sheet, all circle activities, assessment criteria,
materials and supply lists, the family letter, the substitute plan and the field-trip
briefings — is supplied as a single PDF. The twenty slide decks are supplied as PowerPoint
files alongside it.

> **One item is deliberately kept off the website.** The cipher league runs live across all
> five weeks, and its answer key is supplied as a separate file. If those answers are posted
> anywhere students can search, the league stops working.`);
  t = t.replace('## Materials still to be linked', '## The handover packet');
  t = t.replace(/Every session's projector deck and teacher run-sheet, by filename\. These are inventoried and\nverified present; \*\*they are not yet uploaded\*\*\. When they are, replace each filename with its link\nand this planner is complete\./,
`Every session's projector deck and teacher run-sheet, by filename, as supplied in the
handover packet.`);
  return t;
}

const raw = await readFile(SRC, 'utf8');
let out = reframeAppendixC(dropDates(repointUrls(raw)));

// Stamp the archive header so a reader knows what they are holding.
out = out.replace('# PBL Unit Planner — Summer 2026 (FINAL DRAFT)', '# PBL Unit Planner — Navigating Piracy');

await writeFile(OUT, out, 'utf8');
await writeFile(SRC, out, 'utf8');

// -------------------------------------------------------------- reporting ---
const urls = [...out.matchAll(/https?:\/\/[^\s)<>"'\]]+/g)].map(m => m[0].replace(/[.,;]$/, ''));
const uniq = [...new Set(urls)];
console.log(`${uniq.length} unique URLs`);
const suspect = uniq.filter(u => /\/day\d+\w*\.html|\/unit\/|black-sam|maxwellhowegis\.com\/whydah/.test(u));
console.log(suspect.length ? 'STALE:\n' + suspect.map(s => '  ' + s).join('\n') : 'no stale URLs remain');
const dates = out.match(/\b(Mon|Tue|Wed|Thu) \d{1,2}\/\d{1,2}\b|\b0[78]\/\d{2}\b/g);
console.log(dates ? `dates still present: ${[...new Set(dates)].join(', ')}` : 'no calendar dates remain');
console.log(`written: ${OUT}`);
