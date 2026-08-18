# whydahstory.com — restructure design

**Date:** 2026-08-01
**Author:** design notes with Claude
**Status:** complete — Phase 1a done; Phase 3 switchover advanced 2026-08-08 (unit-complete voice, `/projects/`, Sources & Methods un-gated, classroom Game Gate / Banner / Crew Points retired, GIS tools public as `#modern-tools`); planner finalized; reference-page split landed 2026-08-18 (`/story/` `/people/` `/pirate-world/` `/the-wreck/` `/artifacts/` `/why-piracy/` `/salem/` `/maps/` `/glossary/` `/sources/` `/methods/` via `docs/tools/build-reference.mjs`), `/unit/` and `whydah-dashboard.html` retired into anchor-mapping redirect stubs, `day-config.js` and the photo-hunt galleries (§9 precondition) deleted. Remaining: phase 6 reference build-out, which is open-ended by design

---

## 1. Why

The site was built under a five-week deadline for an audience of about fifty students who
were told the URL out loud. It now needs a permanent shape, because three of its four
purposes are ending this week and the fourth is only starting.

The unit finishes 2026-08-06. After that:

- The curriculum stops changing and becomes a teaching record.
- The students' final projects need a home.
- The games stop being classroom infrastructure and become things that still work.
- Everything else becomes an independent, growing reference on the Whydah — the part
  intended to be **found by strangers searching the internet**, which nothing on the site
  has ever had to do.

Those four things have incompatible maintenance rules. One of them changes forever; three
never change again. That conflict is what this restructure resolves.

## 2. The four zones

```
whydahstory.com/
│
├── /                          REFERENCE — living, the front door
│   ├── /story/                overview + timeline
│   ├── /people/               the crew, the hanged six, the survivors
│   ├── /pirate-world/         the Atlantic world
│   ├── /the-wreck/            the wreck and the fleet
│   ├── /artifacts/            recovered objects
│   ├── /why-piracy/           push / pull
│   ├── /salem/                the Salem connection
│   ├── /maps/                 cartography, projections, Map Studio, flythrough
│   ├── /glossary/
│   ├── /sources/              un-gated (see §5)
│   └── /methods/              un-gated — the 🟢/🟡/🔴 confidence tiers
│
├── /curriculum/               FROZEN — not edited after 2026-08-06
│   ├── (index: how to teach this unit)
│   ├── /day-2-what-is-a-map/ … /day-20-the-showcase/
│   ├── /planner/              the LEAP unit planner
│   ├── guide · at-a-glance · handouts · project menu
│   └── /as-taught/            dated snapshot of the dashboard
│
├── /projects/                 STUDENT WORK — written once, then static
│
└── /games/                    PARKED — still playable, no backend
```

**Root becomes the reference front door.** Today `index.html` is the student "Crew Deck";
that page moves to `/curriculum/` and the root is rebuilt for a visitor who has never
heard of this class.

## 3. Curriculum: what "frozen" means

Frozen means **declared, not merely neglected**. `/curriculum/` carries a dated header:

> This unit ran July 6 – August 6, 2026 at Collins Middle School, Salem MA.
> Archived as taught. Not maintained.

That is what tells a reader in 2029 whether they are looking at something current.

### 3.1 Day page changes

Nineteen pages (`day2`–`day19` plus `day14b`), one pass:

| # | Change | Note |
| :-- | :-- | :-- |
| 1 | Delete the `today-banner` div and the `day-config.js` script tag | Otherwise an archived page advertises "Next voyage" forever |
| 2 | Move to `/curriculum/day-N-slug/`, numbered as students saw it | `day14b.html` → `/curriculum/day-15-the-trial/` |
| 3 | Rewrite internal cross-links | Tomorrow-previews and back-references |

**The renumber is the point of moving them.** The current filenames are one lower than the
displayed number from Day 15 on, a scar from the 2026-07-29 mid-unit renumber. Nothing
external depends on those filenames once the unit ends, so the archive gets honest URLs.

| Students saw | Lesson | Old file | New URL |
| :-- | :-- | :-- | :-- |
| Day 1 | Launching the Voyage | *(none — see below)* | `/curriculum/day-1-launching-the-voyage/` |
| Day 2 | What Is a Map? | `day2.html` | `/curriculum/day-2-what-is-a-map/` |
| Day 3 | Reading the 1719 World Map | `day3.html` | `/curriculum/day-3-reading-the-1719-map/` |
| Day 4 | Adopt a Ship | `day4.html` | `/curriculum/day-4-adopt-a-ship/` |
| Day 5 | Out of the Machine | `day5.html` | `/curriculum/day-5-out-of-the-machine/` |
| Day 6 | Field Trip 1 | `day6.html` | `/curriculum/day-6-real-pirates-salem-maritime/` |
| Day 7 | Field Trip 2 | `day7.html` | `/curriculum/day-7-life-at-sea/` |
| Day 8 | The Vote | `day8.html` | `/curriculum/day-8-the-vote/` |
| Day 9 | Sign the Articles | `day9.html` | `/curriculum/day-9-sign-the-articles/` |
| Day 10 | The Wreck | `day10.html` | `/curriculum/day-10-the-wreck/` |
| Day 11 | Field Trip 3 | `day11.html` | `/curriculum/day-11-georges-island/` |
| Day 12 | Lost and Found | `day12.html` | `/curriculum/day-12-lost-and-found/` |
| Day 13 | Where Ships Squeeze Through | `day13.html` | `/curriculum/day-13-where-ships-squeeze-through/` |
| Day 14 | Salem Then and Now | `day14.html` | `/curriculum/day-14-salem-then-and-now/` |
| **Day 15** | **The Trial** | **`day14b.html`** | `/curriculum/day-15-the-trial/` |
| **Day 16** | **Pitch Day** | **`day15.html`** | `/curriculum/day-16-pitch-day/` |
| **Day 17** | **Synthesis Studio** | **`day16.html`** | `/curriculum/day-17-synthesis-studio/` |
| **Day 18** | **Build Day 1** | **`day17.html`** | `/curriculum/day-18-build-day-1/` |
| **Day 19** | **Build Day 2** | **`day18.html`** | `/curriculum/day-19-build-day-2/` |
| **Day 20** | **The Showcase** | **`day19.html`** | `/curriculum/day-20-the-showcase/` |

**Two known find-and-replace hazards.** `Build Day 1` and `Build Day 2` are lesson titles,
not day numbers. Back-references such as *"this is a Day 5 kind of moment"* point at
earlier lessons and are already correct. Both are edited by hand and verified, never swept.

### 3.2 Day 1 is written, not migrated

Day 1 predates the day-page pattern and has never had a student page — it was a
no-folders intro day. An archive that stops at Day 2 is not a twenty-day unit, so
`/curriculum/day-1-launching-the-voyage/` is **written** from material that already exists:
`Day-1-Welcome-Aboard.pptx` (20 slides), `DAY-1-Presentation-Script.docx`,
`Day-1-Teleprompter-Notes.pdf` and `Day-1-Circle-Activities.docx`.

It is built to match the other archived day pages in structure and voice. This is the only
page in the curriculum zone that is authored rather than migrated, and it is the single
change that makes the archive complete.

### 3.3 What deliberately does not change

The teaching voice stays. Pages say *"Chromebooks out. whydahstory dot com, red banner,
Day 10."* That is the record of how the unit was actually taught; sanding it into neutral
prose would cost more than it buys. The `/curriculum/` index explains that the red banner
was a live-class device and points at the day index instead.

### 3.4 `/curriculum/as-taught/`

A dated, immutable snapshot of `whydah-dashboard.html`. This is what lets "frozen" and
"growing" coexist: archived day pages and the LEAP planner point at a copy that never
moves, while the reference pages are rewritten freely.

## 4. Reference site

### 4.1 Dashboard section mapping

The dashboard is 392 KB and roughly sixty percent of everything written for this project.
Its eighteen sections resolve as follows.

| Section | Currently | Destination |
| :-- | :-- | :-- |
| `overview`, `timeline` | public | `/story/` |
| `people` | public | `/people/` |
| `pirate-world` | public | `/pirate-world/` |
| `wreck-fleet` | public | `/the-wreck/` |
| `artifacts` | public | `/artifacts/` |
| `why-piracy` | public | `/why-piracy/` |
| `salem` | public | `/salem/` |
| `maps-geo`, `projections` | public | `/maps/` |
| `glossary` | public | `/glossary/` |
| `final-project` | public | **curriculum** — it is the teaching project |
| `source-links` | **public** (un-gated 2026-08-08) | `/sources/` when the reference split lands |
| `confidence` | **public** (un-gated 2026-08-08) | `/methods/` when the reference split lands |
| `unit-plan` | admin-gated | curriculum |
| `voyage-journal` | admin-gated | curriculum |
| `game-gate` | **deleted** (2026-08-08) | — |
| `teacher-toolkit` | **retired** — GIS / live tools now public as `#modern-tools` | `/maps/` when the reference split lands |

### 4.2 Positioning

Wikipedia owns the plain facts. What this site can own is **how we know what we know**: the
🟢 Solid / 🟡 Contested / 🔴 Mythologized tiering, the primary-source scans, and a stated
willingness to teach disagreements rather than resolve them — the equal-shares question
(Rediker vs. Bialuschewski) being the standing example.

Therefore `/methods/` is a feature, not a footnote, and is linked from claim-bearing pages.

Map Studio and the flythrough stay, under `/maps/`. They are original work — a login-free
Leaflet build with a georeferenced 1717 Southack chart and a working chokepoints model —
and are the half of this site that is a GIS project rather than a history project.

### 4.3 Discoverability

Nothing on the site has ever needed to compete for a stranger's attention. Required:

- `sitemap.xml`, `robots.txt`, and a real `404.html` (none currently exist)
- one `<h1>` per page; a real meta description and Open Graph tags per page
- cross-links between reference pages
- **retire `/unit/`** — it is a stub that fetches the dashboard with JavaScript and injects
  it client-side, so a crawler sees only `Loading the unit dashboard…`
- `robots.txt` disallows `/docs/`

Splitting one 392 KB page into ten focused pages is itself the largest SEO change: a single
document covering people, the wreck, artifacts, Salem and cartography can only rank for one
thing at a time.

## 5. Teacher backend removal

The `data-audience="admin"` flag was doing two incompatible jobs: hiding *controls* that
change classroom state, and hiding *content*. Those get opposite treatment.

**Deleted:** `game-gate`, `teacher-toolkit` (Banner Control, Crew Points), the passcode gate
itself, `games-gate.js`, `day-config.js`.

**Promoted to public:** `source-links` and `confidence`.

> The bibliography and the sourcing methodology — the entire basis for trusting anything on
> the site — are currently behind a passcode while the claims they support are public. The
> LEAP planner also states the methodology is "published on the site" and lists
> `unit/#confidence` in its public resource index. It is not public. Un-gating corrects the
> site and the document together.

**Games decoupled from Supabase.** `games-gate.js` and `navigator/game.js` both call a
free-tier Supabase project. Free-tier projects pause when idle, and if the teacher lock
defaults to locked with no teacher left to unlock it, the games could be permanently
bricked. `/games/` becomes wholly static.

## 6. Student projects

Written once after the Showcase, then static.

**Defaults, pending explicit confirmation before publishing:** first name and last initial;
project work only, no photographs of children's faces; opt-out honoured. This page is
indexed and effectively permanent, and it concerns other people's children, so the naming
decision is confirmed explicitly rather than assumed. If media releases exist, full names
are a one-line change.

## 7. The LEAP planner

### 7.1 Drop the dates

The calendar is currently pinned to real dates, which forces scheduling artifacts into
view: Week 1 shows three teaching days plus a "no class" cell, and Week 3 shows five
lessons in four columns. All twenty lessons exist; they simply do not sit on a tidy 5 × 4
grid of one particular July.

**The main calendar becomes an ordered sequence of Days 1–20, grouped by week and theme,
with no dates.** A facilitator re-running this does not care that Day 6 fell on Wednesday
July 15; they care that Day 6 is the first field trip and what must be true beforehand.
Removing the dates removes the gaps and doublings, because those are properties of a
calendar rather than of the unit.

This is presented as a lesson sequence and is therefore accurate as a lesson sequence. The
framing line at the top changes, since "Weeks 1–4 are written as taught" stops holding once
the dates come out.

**Appendix B is retained and is where the useful adaptations live** — Google My Maps cut for
lack of student logins, the mock trial cut and reborn as Day 15, the second museum trip
replaced by Synthesis Studio. That is design intelligence a facilitator needs. Site-specific
scheduling noise is not recorded anywhere.

### 7.2 Links

Every URL in the planner changes — roughly fifty, including eleven dashboard anchors. The
anchors resolve into `/curriculum/as-taught/`, not the living reference pages, so the
document keeps working after the reference is rewritten.

**A link checker is part of this work, not a nicety.** It walks every URL in the planner,
requests it against the live site, and fails on anything that is not a 200. It runs as the
last step before handover. No link reaches LEAP unverified.

### 7.3 Appendix C becomes a packet manifest

The teacher materials are handed over as files, not hosted. Nothing is uploaded
anywhere. Appendix C therefore changes from "filenames pending links" to "contents of the
handover packet", and the *Materials still to be linked* section is retitled to match.

This also resolves the cipher problem: the run-sheets carry the cipher-league answers, and
publishing them would break the game for any future class. Off the internet entirely is the
correct answer.

| Public, on the site | Private, in the handover packet |
| :-- | :-- |
| Day pages, guide, at-a-glance | Slide decks (20) |
| Handouts, project menu | Run-sheets — **cipher answers** |
| The planner itself | `TEACHER-ONLY-Answer-Sheets.pdf` |
| `/curriculum/as-taught/` | Student print pack |

## 8. Old URLs

GitHub Pages cannot issue server redirects, so old links break silently unless handled.

- **`404.html`** explaining what happened, linking the four zones.
- **Meta-refresh stubs** at the roughly twenty-seven old paths (`day8.html` → its new home),
  keeping alive anything bookmarked or emailed to a family during the unit.

## 9. Sequencing

**Hard constraint: `day-config.js` and the six dashboard anchors Day 17 needs must survive
until Monday's session ends.** Day 17 — Synthesis Studio, Monday 2026-08-03 — includes a
40-minute mission drawing on the Artifacts, Timeline and People tabs, and every deck routes
students by *"whydahstory.com, tap the red banner, Day N."* The banner is the navigation;
students have never typed a URL.

| Phase | When | Work |
| :-- | :-- | :-- |
| **1 — additive** | now | Reference pages at new URLs · un-gate sources & methods · `404`/`robots`/`sitemap` · curriculum pages alongside the live ones · games decoupled |
| **2 — coexist** | after Monday's session | New structure live beside the old; both sets of URLs work |
| **3 — switchover** | after the Showcase, 08-06 | Retire banner, `day-config.js`, `/unit/`, old dashboard · root becomes the reference · stubs dropped · freeze declared |
| **4 — planner** | after phase 3 | Drop dates · rewrite links · run the link checker · Appendix C reframed |
| **5 — projects** | when projects land | `/projects/` |
| **6 — ongoing** | open-ended | Reference build-out |

Phase 1 is entirely additive: nothing a student touches changes. Phase 3 is small precisely
because phase 1 did the building.

**This is too large for a single implementation plan.** Each phase gets its own plan and its
own verification. The first plan covers phase 1 only, because phase 1 is both the largest
body of work and the only part that can start before Monday.

**Precondition:** `photo/`, `photohunt/` and `photohunt2/` are deleted at the
end of the week. They are ungated galleries where students claim uploaded photographs by
name, which is acceptable for a five-week class on an unadvertised URL and not acceptable
on a site being optimised for discovery. **This restructure does not touch those three
directories.** Their `.gitignore` whitelist entries are removed once they are gone.

## 10. Verification

- **Link checker** over the planner — every URL must return 200 (§7.2).
- **Renumber check** — walk every archived day page and confirm the displayed number matches
  the manifest, as with the Week 5 deck renumber.
- **Verify against the live site, not CI.** `.github/workflows/syntax-check.yml` runs
  `node --check` on tracked JavaScript and confirms game pages' local `src` targets exist.
  It does not validate HTML, so green CI proves nothing about an HTML-only change.
- **Crawl check** — confirm every reference page returns real HTML to a client with
  JavaScript disabled.

## 11. Open items

- Provenance of `pics/whydah-bell.jpg`, `whydah-model.jpg`, `whydah-silver.jpg`. These are
  photographs of recovered artifacts, and a photograph carries its own copyright regardless
  of the object's age; project notes flag museum display photos as "classroom-use", which is
  a narrower scope than a public reference site. The rest of `pics/` is public-domain
  historical material. If provenance is unclear the pages work without them.
- Student project naming (§6) — confirmed before publishing, not before building.
- Domain renewal. Every link in the LEAP document depends on `whydahstory.com` not lapsing.
- Master materials — decks, scripts and sources exist only on one USB drive, gitignored and
  therefore not in the repository. The premise of this work is durability; the originals are
  on removable media.

## 12. Out of scope

- Rewriting curriculum content. The freeze is structural.
- The photography sections (§9, owned separately).
- Rewriting Week 5 of the planner as-taught. It is labelled *as planned*, and one site's
  staffing accident would mislead a facilitator with a normal schedule.
- Re-mapping the unit to a strict 5 × 4 grid. It would contradict the week label printed on
  every day page, deck and script, for a neater-looking calendar.
