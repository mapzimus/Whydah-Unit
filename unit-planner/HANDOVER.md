# Handover — PBL Unit Planner work

Written 2026-08-01 to hand this off to a local Claude Code session that can reach the
flash drive. Everything below is current as of merge `6f201f7`.

---

## 1. Where things stand

**Merged and live** (PR #43):

| What | Where |
| :-- | :-- |
| Final-draft LEAP unit planner | `unit-planner/PBL-Unit-Planner-Summer-2026-FINAL.md` |
| Live copy (raw Markdown) | https://whydahstory.com/unit-planner/PBL-Unit-Planner-Summer-2026-FINAL.md |
| Week 5 day-number fix | `day16–19.html`, verified live |

**The planner is complete except for linked materials.** It fills the LEAP
*PBL Unit Planner Summer 26* template: project overview, four KSQs, standards, focus
outcomes, voice and choice, reflection routines, career connections, ML/EL strategies,
and a Mon–Thu daily grid for all five weeks with activities, reflection question, and
academic vocabulary per day. Weeks 1–4 are written **as taught**; Week 5 **as planned**.

It was built from the as-taught record in this repo — the `dayN.html` pages,
`day-config.js`, the session cards and revised-calendar table in `whydah-dashboard.html`,
and the git history — **not** from the March planning doc, which the unit had diverged
from substantially (that doc still describes a 6-week arc and a Google My Maps final
project).

---

## 2. Getting set up locally

```bash
git clone https://github.com/mapzimus/Whydah-Unit.git
cd Whydah-Unit
```

Then open Claude Code in that folder. The USB is at `H:\` with the decks in
`H:\lessons` — a local session can read it directly; point Claude at the path.

---

## 3. The work list

### Priority 1 — Link the flash-drive materials

This is the only thing standing between the planner and "done." The email asked
specifically that slides and resources be shared and linked so the unit can be re-run.

The planner has a checklist section, **"Materials still to be linked."** Outstanding:

- [ ] Daily slide decks (Days 1–20)
- [ ] Printed teacher run-sheets
- [ ] Field-trip packets — the Real Pirates + Salem Maritime trip sheet (Day 6), the Georges Island pre-trip briefing (Day 11)
- [ ] The final-project rubric as actually used
- [ ] Voyage Journal templates — folder cover, weekly dividers, per-session sheets
- [ ] Day 1 materials — hook artifact images, the DQ wall poster

**Suggested approach:** upload the lessons folder to Google Drive, set the folder to
"anyone with the link can view," then link each item into its day in the calendar. Drive
links survive; a USB does not, and the whole point is that a future facilitator can run
this from the web.

Each day in the planner's calendar already has a natural slot — the day's cell ends with
its vocabulary line, and a `**Slides:** <link>` line goes right after it.

### Priority 2 — Resolve the two Week 3 gaps

Flagged inline in the planner under Week 3's *Additional notes*. Both are marked with ⚠️
and should be corrected or the flag removed before this goes to LEAP.

The evidence is contradictory:

- `day-config.js` lists **both** Day 10 (The Wreck) and Day 12 (Lost and Found) on `2026-07-22`, with a comment saying Day 12 was pulled forward into "the same slot as Day 10's original date."
- Commit `1b07874` (Mon 7/20) says *"Force banner to Day 9 (class running ahead of date grid)"* and `aaaa0e5` re-dates Day 9 to July 20 — which implies Day 8 (The Vote) had already happened by Monday.
- But Week 2's Wed/Thu were both field trips, so there was no obvious slot for it.

The planner currently reconstructs it as: **Mon = The Vote · Tue = Sign the Articles ·
Wed = The Wreck + Lost and Found doubled up · Thu = Georges Island.** The run-sheets on
the USB may settle it. If they don't, Max's memory is the source of truth.

### Priority 3 — Optional polish

- **Render the planner as a styled HTML page.** It currently serves as raw Markdown. Modelling it on `curriculum-guide.html` (same fonts, print button, `@media print` rules) would make it a handable URL for LEAP and consistent with the rest of the site.
- **Submit to LEAP.** The template is a Google Doc shared with Max: *PBL Unit Planner Summer 26* → https://docs.google.com/document/d/1aG20-FCxbfWlesuxixFsaKPMZ0aXr2T_2k8ck5Y7jIQ/edit — **do not edit that file**; it is the blank master shared with every facilitator. Make a copy, name it for the Pirates cohort, and paste the planner's content into it.
- **The old draft** — *LEAP Pirate Planning* → https://docs.google.com/document/d/1cGMSO8jT4y0kIX38LMB9r7OSZcKyGOYDj75QNH2wsWY/edit — is superseded. Worth archiving rather than deleting; it records the original design intent.

---

## 4. Things a new session needs to know about this repo

These are the traps. Read before editing.

**`.gitignore` is a whitelist, not a blocklist.** Line 2 is `*` — everything is ignored by
default, and each publishable path is re-added with `!`. A new file or directory is
invisible to git until you add an explicit `!path` rule. `git add` will refuse it with an
"ignored by one of your .gitignore files" error.

**`day-config.js` is the source of truth for what students see.** The red TODAY banner is
date-driven and flips at midnight Eastern. An entry's `label:` field overrides the
displayed number.

**Filenames do not match displayed day numbers after Day 14.** On July 29 an inserted
studio day became Day 15 for students, shifting everything after it up one. Filenames
were deliberately left unchanged, because they are how `day-config.js` looks entries up:

| Students see | Lesson | File |
| :-- | :-- | :-- |
| Day 15 | The Trial | `day14b.html` |
| Day 16 | Pitch Day | `day15.html` |
| Day 17 | Synthesis Studio | `day16.html` |
| Day 18 | Build Day 1 | `day17.html` |
| Day 19 | Build Day 2 | `day18.html` |
| Day 20 | The Showcase | `day19.html` |

When editing day numbers, watch for two things that look like day numbers but are not:
the `<h1>` headings **"Build Day 1"** and **"Build Day 2"**, and back-references to
earlier days ("This is a Day 5 kind of moment"), which were not renumbered. A blind
find-and-replace will corrupt both.

To verify a renumber, walk `day-config.js` and compare each entry's rendered label
against that page's `class="kicker"` line — all 19 should match.

**Merging to `main` publishes.** GitHub Pages serves the whole repo; `CNAME` points at
whydahstory.com. There is no staging. Anything merged is live within a minute or two.

**CI** is `.github/workflows/syntax-check.yml`. It runs `node --check` on every tracked
`.js` file and confirms each game page's local `src="...js"` targets exist. It does not
validate HTML, so HTML-only changes pass trivially — green CI is not proof an HTML edit
is correct. Verify those against the live site.

**No student Google logins.** The Chromebooks have none, which is why Google My Maps was
cut from the whole unit and `map-studio.html` was built as the login-free replacement.
Any new activity must work without an account.

**Source discipline.** Every factual claim on the dashboard is tiered
🟢 Solid / 🟡 Contested / 🔴 Mythologized, with the methodology published on the site.
New content should carry the same tiering, and contested claims should stay contested —
the equal-shares-regardless-of-race claim, for instance, is supported by some testimony
and disputed by Bialuschewski (2008). The unit teaches the disagreement rather than
resolving it.

**"As taught" vs "as planned."** The planner distinguishes these deliberately. Weeks 1–4
describe what actually happened, including the missed Thursday and both mid-unit re-maps.
Week 5 was still in the future when it was written — **once the Showcase happens on
Aug 6, Week 5 should be rewritten in the past tense** to record what actually occurred.
That is the last edit this document needs.

---

## 5. Prompts to paste into a local session

**To link the slides:**

> Read `unit-planner/PBL-Unit-Planner-Summer-2026-FINAL.md` and `unit-planner/HANDOVER.md`.
> The lesson slide decks are at `H:\lessons`. Match each deck to its day in the planner's
> daily calendar, and add a `**Slides:** <link>` line to that day's cell. Tell me which
> days have no matching deck, and which decks don't match any day.

**To resolve Week 3:**

> Read the Week 3 section of `unit-planner/PBL-Unit-Planner-Summer-2026-FINAL.md` and the
> ⚠️ note under it. Check the run-sheets on `H:\lessons` for July 20–23 and tell me what
> actually ran each day. Then correct the table and remove the flag.

**To render the HTML version:**

> Build `unit-planner.html` from `unit-planner/PBL-Unit-Planner-Summer-2026-FINAL.md`,
> styled like `curriculum-guide.html` — same fonts, colors, print button, and print rules.
> Add it to `.gitignore`'s whitelist and link it from the dashboard.

**To close out the unit after the Showcase:**

> The Showcase happened on Aug 6. Rewrite Week 5 of
> `unit-planner/PBL-Unit-Planner-Summer-2026-FINAL.md` in the past tense to record what
> actually ran, the way Weeks 1–4 are written.

---

## 6. Open questions for Max

1. **Week 3, July 20–23** — what actually ran on Mon, Tue, and Wed? (See Priority 2.)
2. **Day 1 (Mon Jul 6)** has no student page — it was a no-materials intro day. Its planner entry is reconstructed from the dashboard session card. Worth a look to confirm it matches what you did.
3. **Should the planner stay published** at whydahstory.com, or move somewhere non-public? It is currently live as raw Markdown, including the ⚠️ flags and this handover.
