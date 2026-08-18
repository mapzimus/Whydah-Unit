// Split whydah-dashboard.html into the permanent reference pages.
//
// This is the reference-page split from the 2026-08-01 restructure design
// (§2, §4): the 392 KB single-page dashboard becomes eleven focused, static,
// crawlable pages. Content is extracted as-is; only links and the handful of
// phrases that assumed the tabbed dashboard ("this tab", "this dashboard")
// are rewritten — and every one of those rewrites is exact-match and verified,
// so drift in the source fails the build instead of silently passing through.
//
// The dashboard itself is not deleted by this script. Retiring it (and /unit/)
// into redirect stubs is a separate, hand-written step; the frozen copy lives
// at /curriculum/as-taught/.
//
// NOTE (2026-08-18): this ran once, against the full dashboard, in the same
// change that then retired whydah-dashboard.html into a redirect stub. Like
// migrate-day-pages.mjs it is kept as the record of the migration; to re-run
// it, restore the pre-split whydah-dashboard.html from git history first.
//
// Run: node docs/tools/build-reference.mjs

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, 'whydah-dashboard.html');
const SITE = 'https://whydahstory.com';

// --------------------------------------------------------------- pages ---
// Section ids per the dashboard; destinations per design §4.1.
// final-project, unit-plan and voyage-journal are curriculum, not reference:
// they stay in /curriculum/as-taught/ and are not extracted here.
const PAGES = [
  {
    dir: 'story',
    sections: ['overview', 'timeline'],
    kicker: 'The Reference',
    h1: 'The story',
    title: 'The Whydah — the story and timeline',
    description:
      'The Whydah Gally: a slave ship captured by Black Sam Bellamy in 1717, wrecked off Cape Cod ten weeks later, found again in 1984 with a 1717 chart. The full story and a source-tiered timeline.',
    ogImage: '/pics/black-sam-bellamy-feature.jpg',
    next: [
      ['/people/', 'People', 'The crew, the captives, the investigators, and the trial figures.'],
      ['/the-wreck/', 'The Wreck & Fleet', 'Four ships in the nor’easter — who lived, who drowned, and why.'],
      ['/why-piracy/', 'Why Piracy', 'The push and pull factors behind choosing piracy in 1717.'],
    ],
  },
  {
    dir: 'people',
    sections: ['people'],
    kicker: 'The Reference',
    h1: 'People',
    title: 'People of the Whydah — crew, captives, investigators',
    description:
      'The people in the Whydah story: Sam Bellamy and his crew, the two survivors, the six hanged in Boston, the establishment that built the ship, and the investigators from 1717 to today.',
    ogImage: '/pics/black-sam-bellamy-feature.jpg',
    next: [
      ['/story/', 'The story', 'The whole arc, from Devonshire to the wreck to the museum.'],
      ['/why-piracy/', 'Why Piracy', 'Why these people chose piracy — push and pull.'],
      ['/pirate-world/', 'The Pirate World', 'The wider Atlantic network Bellamy sailed in.'],
    ],
  },
  {
    dir: 'pirate-world',
    sections: ['pirate-world'],
    kicker: 'The Reference',
    h1: 'The Pirate World',
    title: 'The Pirate World — the Atlantic network around the Whydah',
    description:
      'Bellamy’s Atlantic world: Hornigold’s Flying Gang, Blackbeard, the Nassau hub, the privateer-to-pirate pipeline, and the 1724 engravings that fixed the popular image of the Golden Age.',
    ogImage: '/pics/blackbeard-1724.jpg',
    next: [
      ['/people/', 'People', 'The Whydah’s own people, card by card.'],
      ['/why-piracy/', 'Why Piracy', 'The economics and politics that filled pirate crews.'],
      ['/salem/', 'Salem', 'The Salem connection — trade, trials, and the museum.'],
    ],
  },
  {
    dir: 'the-wreck',
    sections: ['wreck-fleet'],
    kicker: 'The Reference',
    h1: 'The Wreck & Fleet',
    title: 'The Wreck & Fleet — four ships in the nor’easter of April 26, 1717',
    description:
      'Bellamy’s four-ship fleet on the night of April 26, 1717: what each vessel was, why the Whydah took the worst of the storm off Wellfleet, and what the survivors swore under oath.',
    ogImage: '/pics/whydah-model.jpg',
    next: [
      ['/artifacts/', 'Artifacts', 'What 40 years of excavation has brought up.'],
      ['/maps/', 'Maps & Flythrough', 'The chart that found her, flown across a 3D globe.'],
      ['/story/', 'The story', 'The full timeline, before and after the storm.'],
    ],
  },
  {
    dir: 'artifacts',
    sections: ['artifacts'],
    kicker: 'The Reference',
    h1: 'Artifacts',
    title: 'Artifacts of the Whydah — recovered objects and what they teach',
    description:
      'More than 200,000 objects recovered from the Whydah wreck — gold dust, the ship’s bell, John King’s shoe — and what each one anchors in the story.',
    ogImage: '/pics/whydah-bell.jpg',
    next: [
      ['/the-wreck/', 'The Wreck & Fleet', 'Where the objects came from and how the ship broke.'],
      ['/methods/', 'Methods', 'How claims about objects and people are tiered.'],
      ['/sources/', 'Sources', 'The museums and archives holding the collection.'],
    ],
  },
  {
    dir: 'why-piracy',
    sections: ['why-piracy'],
    kicker: 'The Reference',
    h1: 'Why piracy',
    title: 'Why piracy? Push and pull factors in 1717',
    description:
      'Why a sailor chose piracy in 1717: naval demobilization, brutal merchant conditions, and debt on the push side; pay, food, and a vote on the pull side. With the historiographical dispute stated, not hidden.',
    ogImage: '/pics/black-sam-bellamy-feature.jpg',
    next: [
      ['/people/', 'People', 'The individual lives behind the push-pull map.'],
      ['/pirate-world/', 'The Pirate World', 'The privateer-to-pirate pipeline.'],
      ['/methods/', 'Methods', 'Where historians disagree, and how we mark it.'],
    ],
  },
  {
    dir: 'salem',
    sections: ['salem'],
    kicker: 'The Reference',
    h1: 'Salem connection',
    title: 'The Salem connection — trade, witch-trial figures, and the Whydah',
    description:
      'Salem’s two direct links to the Whydah: a maritime economy built on the same Atlantic trade, and Salem Witch Trials figures — Cotton Mather above all — who ran the pirate trials of 1717.',
    ogImage: '/pics/cotton-mather.jpg',
    next: [
      ['/story/', 'The story', 'The trials and hangings in the full timeline.'],
      ['/people/', 'People', 'Mather, Sewall, and the Boston trial figures.'],
      ['/sources/', 'Sources', 'The primary records behind the Salem links.'],
    ],
  },
  {
    dir: 'maps',
    sections: ['maps-geo', 'projections', 'modern-tools'],
    kicker: 'The Reference',
    h1: 'Maps & Flythrough',
    title: 'Maps of the Whydah — Southack’s 1717 chart, the flythrough, and navigation',
    description:
      'The cartography half of the Whydah story: Southack’s 1717 chart that found the wreck in 1984, a 19-stop 3D flythrough, live wind and shipping maps, latitude and longitude in 1717, and why flat maps lie.',
    ogImage: '/pics/southack-1717-chart-clean.jpg',
    next: [
      ['/map-studio.html', 'Map Studio', 'Drop voice pins on a world map or Southack’s chart.'],
      ['/the-wreck/', 'The Wreck & Fleet', 'The night the chart records.'],
      ['/glossary/', 'Glossary', 'Chart, projection, dead reckoning — the terms defined.'],
    ],
  },
  {
    dir: 'glossary',
    sections: ['glossary'],
    kicker: 'The Reference',
    h1: 'Glossary',
    title: 'Glossary — the Whydah reference, term by term',
    description:
      'Quick, searchable definitions for the technical terms in the Whydah reference: rigging and navigation, the Atlantic trade, admiralty law, archaeology, and cartography.',
    ogImage: '/pics/black-sam-bellamy-feature.jpg',
    next: [
      ['/story/', 'The story', 'See the terms in use, in order.'],
      ['/maps/', 'Maps & Flythrough', 'The navigation terms, demonstrated.'],
      ['/methods/', 'Methods', 'What Solid, Contested, and Mythologized mean.'],
    ],
  },
  {
    dir: 'sources',
    sections: ['source-links'],
    kicker: 'How we know',
    h1: 'Sources & bibliography',
    title: 'Sources & bibliography — the records behind the Whydah reference',
    description:
      'Every source class behind this site: the 1717 Boston Vice-Admiralty records, Mather’s execution sermon, the Whydah Sourcebook, Rediker, Woodard, the museums, and the archives — with reliability notes.',
    ogImage: '/pics/pyrates-frontispiece.jpg',
    next: [
      ['/methods/', 'Methods', 'How the sources are tiered and disagreements handled.'],
      ['/story/', 'The story', 'The record those sources build.'],
    ],
  },
  {
    dir: 'methods',
    sections: ['confidence'],
    kicker: 'How we know',
    h1: 'Confidence & methods',
    title: 'Confidence & methods — how the Whydah reference sorts its claims',
    description:
      'The methodology of this site: every claim tiered 🟢 Solid, 🟡 Contested, or 🔴 Mythologized, disagreements taught rather than resolved, and the equal-shares dispute as the standing example.',
    ogImage: '/pics/black-sam-bellamy-feature.jpg',
    next: [
      ['/sources/', 'Sources', 'The bibliography the tiers are graded against.'],
      ['/story/', 'The story', 'The tiers in action across the timeline.'],
    ],
  },
];

const REF_NAV = [
  ['/story/', 'Story'],
  ['/people/', 'People'],
  ['/pirate-world/', 'Pirate World'],
  ['/the-wreck/', 'The Wreck'],
  ['/artifacts/', 'Artifacts'],
  ['/why-piracy/', 'Why Piracy'],
  ['/salem/', 'Salem'],
  ['/maps/', 'Maps'],
  ['/glossary/', 'Glossary'],
  ['/sources/', 'Sources'],
  ['/methods/', 'Methods'],
];

// ---------------------------------------------------------------- links ---
// Old dashboard tab anchors → new page URLs. Applied everywhere.
const HASH_MAP = [
  ['#overview', '/story/'],
  ['#timeline', '/story/#timeline'],
  ['#people', '/people/'],
  ['#pirate-world', '/pirate-world/'],
  ['#wreck-fleet', '/the-wreck/'],
  ['#artifacts', '/artifacts/'],
  ['#why-piracy', '/why-piracy/'],
  ['#salem', '/salem/'],
  ['#maps-geo', '/maps/'],
  ['#projections', '/maps/#projections'],
  ['#modern-tools', '/maps/#modern-tools'],
  ['#glossary', '/glossary/'],
  ['#source-links', '/sources/'],
  ['#confidence', '/methods/'],
  // The teaching project lives in the frozen curriculum, not the reference.
  ['#final-project', '/curriculum/choose-your-project.html'],
];

// Dashboard-relative targets → root-relative (pages now live one level down).
const REL_MAP = [
  ['src="pics/', 'src="/pics/'],
  ['href="map-studio.html"', 'href="/map-studio.html"'],
  ['href="flythrough.html"', 'href="/flythrough.html"'],
  ['src="flythrough.html"', 'src="/flythrough.html"'],
  ['href="games/"', 'href="/games/"'],
  ['href="navigator/"', 'href="/navigator/"'],
  ['href="parrot-flip/"', 'href="/parrot-flip/"'],
  // Curriculum support pages: the frozen copies are the declared home.
  ['href="handouts.html', 'href="/curriculum/handouts.html'],
  ['href="curriculum-guide.html"', 'href="/curriculum/curriculum-guide.html"'],
  ['href="unit-at-a-glance.html"', 'href="/curriculum/unit-at-a-glance.html"'],
  ['href="choose-your-project.html"', 'href="/curriculum/choose-your-project.html"'],
];

// -------------------------------------------------------------- phrases ---
// The dashboard was one page of tabs; these pages are not. Each entry is an
// exact string; the build fails if any is not found exactly once across the
// extracted sections, so a future dashboard edit cannot silently strand one.
// Applied AFTER the hash/relative link rewrites above.
const PHRASES = [
  // overview
  [
    'See the <a href="/curriculum/choose-your-project.html">Final Project</a> tab for the format menu',
    'See the archived <a href="/curriculum/choose-your-project.html">project menu</a> for the formats',
  ],
  [
    '<p class="meta">What follows on this dashboard is the reference record of the unit: people, timeline, maps, artifacts, and how we sorted the evidence.</p>',
    '<p class="meta">What follows across these pages is the reference record: people, timeline, maps, artifacts, and how we sorted the evidence.</p>',
  ],
  ['Open any tab to explore. The voyage is finished', 'Explore any page. The voyage is finished'],
  ['brief off the <a href="/why-piracy/">Why Piracy</a> tab.', 'brief on the <a href="/why-piracy/">Why Piracy</a> page.'],
  ['See the <a href="/salem/">Salem Connection</a> tab.', 'See the <a href="/salem/">Salem Connection</a> page.'],
  [
    'head to the <a href="/maps/">Maps &amp; Flythrough</a> tab.',
    'head to the <a href="/maps/">Maps &amp; Flythrough</a> page.',
  ],
  // pirate-world
  [
    '<a href="/why-piracy/">Why Piracy</a> tab for the privateer-vs-pirate line.',
    '<a href="/why-piracy/">Why Piracy</a> page for the privateer-vs-pirate line.',
  ],
  [
    '<a href="/why-piracy/">Why Piracy</a> tab for the privateer-vs-pirate breakdown',
    '<a href="/why-piracy/">Why Piracy</a> page for the privateer-vs-pirate breakdown',
  ],
  ['(see the People tab)', '(see the <a href="/people/">People</a> page)'],
  // why-piracy
  [
    '<em>This tab also carries the ~10-minute pre-paddle brief',
    '<em>This page also carries the ~10-minute pre-paddle brief',
  ],
  // maps / projections
  [
    "open Southack's 1717 chart (Maps &amp; Flythrough tab)",
    "open Southack's 1717 chart (earlier on this page)",
  ],
  ['This tab shows why, and what a 1717 navigator', 'This page shows why, and what a 1717 navigator'],
  // glossary
  [
    'technical terms used across the dashboard. Type in the search box to filter. Bold term = direct first-use anchor in another tab.',
    'technical terms used across this reference. Type in the search box to filter.',
  ],
  [
    'See the Navigation &amp; Projections tab for examples.',
    'See <a href="/maps/#projections">Navigation &amp; Projections</a> for examples.',
  ],
  // sources
  ['Most of the research for this dashboard drew on', 'Most of the research for this site drew on'],
  ['Excerpts now in dashboard', 'Excerpts on this site'],
  [
    "Period images from this book are already in the dashboard's pics folder.",
    "Period images from this book are already in the site's pics folder.",
  ],
  [
    'Lives at <code>flythrough.html</code> alongside <code>whydah-dashboard.html</code> in the repo.',
    'Lives at <code>flythrough.html</code> in the repo.',
  ],
];

// ------------------------------------------------------------- extract ---
function extractSection(html, id) {
  const open = new RegExp(`<section id="${id}"[^>]*>\\n?`);
  const m = open.exec(html);
  if (!m) throw new Error(`section #${id} not found`);
  const start = m.index + m[0].length;
  const end = html.indexOf('\n</section>', start);
  if (end === -1) throw new Error(`section #${id} has no close`);
  return html.slice(start, end);
}

function stripLeadingH2(content) {
  const m = /^\s*<h2>[\s\S]*?<\/h2>\s*/.exec(content);
  if (!m) throw new Error('expected a leading <h2>');
  return content.slice(m[0].length);
}

function rewriteLinks(content) {
  for (const [from, to] of HASH_MAP) content = content.split(`href="${from}"`).join(`href="${to}"`);
  for (const [from, to] of REL_MAP) content = content.split(from).join(to);
  return content;
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ------------------------------------------------------------ template ---
const CANONICAL_HOST_SCRIPT = `<script>/* canonical-host redirect */(function(){var h=location.hostname;if(/\\.github\\.io$/i.test(h)||/(^|\\.)maxwellhowegis\\.com$/i.test(h)){location.replace("https://whydahstory.com"+location.pathname.replace(/^\\/(Whydah-Unit|whydah)(?=\\/|$)/i,"")+location.search+location.hash);}})();</script>`;

function refNav(currentDir) {
  const items = REF_NAV.map(([href, label]) => {
    const current = href === `/${currentDir}/` ? ' aria-current="page"' : '';
    return `<a href="${href}"${current}>${label}</a>`;
  }).join('');
  return `<nav class="ref-nav wrap" aria-label="The Whydah reference">${items}</nav>`;
}

function nextBlock(next) {
  const cards = next
    .map(
      ([href, label, blurb]) => `    <a class="next-card" href="${href}">
      <span class="next-label">${label}</span>
      <span class="next-blurb">${blurb}</span>
      <span class="next-go">Continue &rarr;</span>
    </a>`
    )
    .join('\n');
  return `  <nav class="next-deck" aria-label="Keep exploring">
    <p class="next-head">Keep exploring</p>
${cards}
  </nav>`;
}

function renderPage(page, sectionHtml) {
  const url = `${SITE}/${page.dir}/`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
${CANONICAL_HOST_SCRIPT}
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}">
<meta name="theme-color" content="#142333">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:image" content="${SITE}${page.ogImage}">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="${url}">
<link rel="icon" type="image/png" sizes="32x32" href="/pics/favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="stylesheet" href="/reference.css">
<script src="/reference.js" defer></script>
</head>
<body>
<header class="wrap site-nav">
  <a class="brand" href="/">WhydahStory</a>
  <nav class="nav-links" aria-label="Primary">
    <a href="/story/">Story</a>
    <a href="/projects/">Projects</a>
    <a href="/curriculum/">Curriculum</a>
    <a href="/games/">Games</a>
  </nav>
</header>
${refNav(page.dir)}
<main class="wrap content">
  <article>
    <header class="page-head">
      <p class="kicker">${esc(page.kicker)}</p>
      <h1>${page.h1}</h1>
    </header>
${sectionHtml}
  </article>
${nextBlock(page.next)}
</main>
<footer class="wrap footer">
  <span>Part of the WhydahStory reference on the Whydah Gally &mdash; a slave ship turned pirate ship, wrecked off Cape Cod in 1717. Claims are tiered <a href="/methods/">🟢 Solid / 🟡 Contested / 🔴 Mythologized</a>.</span>
  <div class="row">
    <a href="/">Home</a> ·
    <a href="/sources/">Sources</a> ·
    <a href="/methods/">Methods</a> ·
    <a href="/curriculum/">Curriculum archive</a>
  </div>
</footer>
</body>
</html>
`;
}

// ----------------------------------------------------------------- run ---
const dashboard = await readFile(SRC, 'utf8');

// Extract every needed section once, then apply link rewrites.
const raw = {};
for (const page of PAGES) {
  for (const id of page.sections) raw[id] = rewriteLinks(extractSection(dashboard, id));
}

// Apply and verify the phrase fixes across the pooled content.
let pool = Object.entries(raw);
for (const [from, to] of PHRASES) {
  const hits = pool.filter(([, c]) => c.includes(from));
  if (hits.length === 0) throw new Error(`phrase not found: ${from.slice(0, 60)}…`);
  for (const [id, c] of pool) {
    if (c.includes(from)) raw[id] = raw[id].split(from).join(to);
  }
  pool = Object.entries(raw);
}

// Assemble pages.
let pagesWritten = 0;
for (const page of PAGES) {
  const parts = page.sections.map((id, i) => {
    let content = raw[id];
    if (i === 0) content = stripLeadingH2(content); // the page <h1> replaces it
    return `<section id="${id}">\n${content}\n</section>`;
  });
  const html = renderPage(page, parts.join('\n'));

  // No stranded tab anchors and no dashboard-relative asset paths.
  for (const [id] of Object.entries(raw)) {
    if (html.includes(`href="#${id}"`)) throw new Error(`${page.dir}: stranded anchor #${id}`);
  }
  if (html.includes('src="pics/')) throw new Error(`${page.dir}: non-rooted pics path`);

  const outDir = join(ROOT, page.dir);
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, 'index.html'), html);
  pagesWritten++;
  console.log(`  /${page.dir}/  (${page.sections.join(' + ')})  ${(html.length / 1024).toFixed(0)} KB`);
}
console.log(`${pagesWritten} reference pages written.`);
