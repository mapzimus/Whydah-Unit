# Whydah’s Voyage — Main Campaign Audit (100 runs)

**Scope:** Easy / Hard / Extreme only. INSANE / multiverse content excluded.  
**Method:** 100 headless voyages via the game’s `__fsAPI` (structure Monte Carlo + full skip-through completions + boss stress samples), plus a code/design pass of `navigator/game.js`.  
**Date:** 2026-08-07  
**Raw data:** playtest artifacts (`summary.json`, `runs.json`, `structures.json`).

---

## Verdict

The main campaign’s **spine is strong**: prologue → boss ladder → four-phase nor’easter is readable history and good game design. What it needs is not another mode — it needs **classroom UX parity**, **guaranteed story beats**, **teaching for graze/blast**, and **filling the soft legs** so the hard fights feel earned.

---

## Playtest numbers (n=100)

| Metric | Result |
|---|---|
| Modes | 34 Easy / 33 Hard / 33 Extreme |
| Voyages that reached the storm | **100 / 100** |
| Storm clears (auto-clear harness) | **100 / 100** |
| Serpent fights taken | 25 (by design, 25% of runs) |
| Avg sequence length | **62.4 beats** (range 57–68) |
| Avg sail legs / events / minis / merchants | **11.0 / 7.5 / 3.1 / 3.9** |
| Unique main-pool events drawn | **64** |
| Runs with **zero** navigator minis | 1 |
| Runs with **zero** merchants | 2 |
| Route split (fork) | 50 shore / 50 sea |
| Voyage weather | clear 25 / busy 21 / fog 27 / rich 27 |

**Score bands after a cleared voyage** (skip-through, so combat skill not scored — useful for multiplier/shape only):

| Mode | Median score | Range |
|---|---|---|
| Easy | 874 | 803–1110 |
| Hard | 1110 | 1035–1435 |
| Extreme | 1456 | 1313–1827 |

**Ranks after clear:** Legend of the Whydah 33 · Master Mariner 25 · Storm-Beater 25 · Serpent-Slayer 17.

**Event draw reality check (story spine is RNG):** across 100 builds, `williams` appeared **7** times, `boyking` **6**, `careen` **6**, `warning` **3** — while filler `fishcatch` led at **24**. Mission-weighted cards that *do* fire (`blackbeard` 21, `oldsowlore` 15) prove the weighting system works; most Whydah history cards simply aren’t pinned.

---

## What’s already working (keep)

1. **Boss ladder identity** — election → chase → sloop → mooncusser → powder brig → flagship → blockade → squadron → storm is distinct enough to teach.
2. **Mooncusser** — best “read the tell” fight in the main game (false lights + fog).
3. **Storm phases** — Squall / Teeth / Eye / Wall with a progress bar kids can feel.
4. **Port banking** — death only costs gold since last port; Harbor is between voyages. Correct for class.
5. **Resume + prologue skip** — furthest mission + stipend after clearing election/chase once.
6. **Mute default + pause + tab auto-pause** — classroom-safe.
7. **Hallett curse → storm** — one of the few guaranteed story → systems links.
8. **DIFF.bossThreat** — Easy actually sheds secondary threats (0.45), not just softer HP.

---

## Gaps (main game only)

### 1. Classroom UX sharp edges (P0)

| Issue | Evidence |
|---|---|
| **Port / Merchant / Harbor / Result are click-trapped** | `PortScene` / `MerchantScene` only advance via `uiButton` — Space does nothing (unlike nearly every other panel). Chromebook keyboard classes stall. |
| **Election vote has no ←/→** | `EventScene` / `ForkScene` support keys; election vote does not. |
| **Storm win choice rejects Space by design** | Correct to avoid auto-picking port — but mashers soft-lock until they notice ← port / → fight. Needs a louder reject toast. |
| **No touch up/down** | Full 2D helm; on-screen pads are left/right only. Touch Chromebooks lose half the scheme (drag exists but is undiscoverable). |
| **Graze + Powder Blast under-taught** | Combo toast at x3, blast toast when full — no forced teach in Election/Sloop. Most kids never learn the skill loop the README promises. |

### 2. Campaign pacing holes (P0–P1)

| Mission | Problem |
|---|---|
| **`gulfstream` (Florida Straits)** | Signature is **only `fork`** — no fight. Softest mission after the chase. Needs a light prize/current beat. |
| **`capecod`** | `mini:[0,0]`, `event:[0,1]` — **thinnest setup before hardest ship fight** (King’s Blockade). |
| **`rhodeisland` / Palatine** | 12s avoid-scene after Flagship; atmospheric but low game. |
| **`longisland`** | Fightiest mid-run (battle:2 + flagship) — fine, but makes Capecod’s emptiness worse by contrast. |
| **Finale gold** | Capecod ports bank the chest; squadron/storm often start at **0 voyage gold** — merchant/cargo agency dies right before the climax. |

### 3. History pedagogy is optional (P1)

- Guaranteed: election framing, chase, Hallett, Palatine, Old Sow, storm date, 1984 bell on first career win.
- **Not guaranteed:** Julian, John King / `boyking`, Williams, `freeship`, Mary Anne, equal shares — the unit’s actual teaching targets.
- Life-at-sea commons (`fishcatch`, `leaks`, `rats`, `doldrums`, `slush` at w:3) outdraw record cards in the 100-run sample.
- Steady-hand bar on non-choice events competes with *reading* the card in class.

### 4. Combat / skill expression (P1)

- `BattleScene` (Virginia / LI / RI) is the same aim-and-strafe loop as the sloop minus dash — repetition before Flagship/Blockade.
- Flagship + Blockade both use “wall of shot + gap” with **toast-only** gap cues (mortar rings / dash bands are clearer).
- Powder-brig spouts are weaker telegraphs than kegs.
- Blast is never *scripted* into a fight (“save ⚡ for the sweep”).
- Blockade Extreme can pile sweep + mortar + aimed fire after Capecod under-preps the player.

### 5. Economy / Harbor (P1)

| Upgrade | Feel in main campaign |
|---|---|
| Oak Timbers / Long Nines | Clear, worth buying first |
| Bilge Pumps | Dead until mission 10 |
| Crow’s Nest / Weather Helm / Charm | Real but invisible without feedback |
| Full Canvas | Shortens legs 12%/lvl — can **starve** loot/identity on Easy |
| Tree total | **3150g** — overwhelms a first Harbor visit |

Merchant (~98% of runs had ≥1; avg 3.9) is the best mid-voyage agency and should be **guaranteed once**.

### 6. Navigator minis (P1)

- Same green-band timing three ways (backstaff / leadline / logline).
- Good `⚓ FROM THE RECORD` tags; low stakes (miss and still advance).
- No mission flavor, no escalation, no voyage best.
- Capecod slots none.

### 7. Dead weight / polish (P2)

- **`DiveScene` still ships** (~200 lines) but is never sequenced; `index.html` meta still says “dive the wrecks.”
- Chase header comments still mention cannons; implementation is no-cannon pursuit.
- Port names keyed by raw `mIndex` drift from geography (Windward → “Charles Town Lights”).
- Mission intros are name/obj only — no “last port → next coast” connective tissue.

---

## Top enhancements (classroom impact)

| # | P | Enhancement | Why | Size |
|---|---|---|---|---|
| 1 | **P0** | Space/Enter advances Port, Merchant, Harbor, Result; ←/→ on Election vote | Keyboard Chromebooks are the real clients | Small |
| 2 | **P0** | Storm win: flash “← port · → fight”; Space shows a reject toast | Stops soft-locks without auto-picking | Small |
| 3 | **P0** | Touch up/down pads (or radial helm) | Half of helm missing on touch | Medium |
| 4 | **P0** | Teach graze + blast in Election or first Sloop | Skill loop exists but is invisible | Medium |
| 5 | **P0** | Capecod prep: guarantee 1 mini or repair beat before Blockade | Hardest ship fight after thinnest mission | Small–Med |
| 6 | **P1** | Pin story spine cards to missions (`julian`, `williams`, `freeship`, `boyking`, `maryanne`) | History is currently RNG (playtest-confirmed) | Small |
| 7 | **P1** | Give `gulfstream` a light signature (prize hail / current race), not only fork | Fixes empty M4 | Medium |
| 8 | **P1** | Paint sweep gaps on Flagship/Blockade like mortar rings | Telegraph quality = fewer unfair deaths | Small |
| 9 | **P1** | Guarantee ≥1 merchant hail mid-run | Only real mid-voyage agency | Small |
| 10 | **P1** | Harbor first-buy guidance (Timbers / Nines; “storm insurance” on Pumps) | 3150g tree is opaque | Small |
| 11 | **P1** | Nav mini depth: mission-flavored prompt + one escalating round | Currently skippable filler | Medium |
| 12 | **P1** | Soften Blockade Extreme pile-up or add mid-fight barrel | Ladder spike after Capecod | Medium |
| 13 | **P2** | Delete/archive `DiveScene`; fix `index.html` description | Dead code + stale marketing | Small |
| 14 | **P2** | Rhode Island: short hazard gauntlet or real skirmish around Palatine | Float-by after Flagship | Medium |
| 15 | **P2** | Port geography + one-line voyage recap on intros | Connective tissue for the unit | Small |

---

## What not to do (for this audit’s scope)

- Do **not** grow INSANE / mutators / meme cards to “add content” to the main voyage.
- Do **not** add a mid-voyage full Harbor (ports banking + end Harbor is the right classroom shape).
- Do **not** replace the storm’s four phases — tune Capecod → Blockade → Storm, don’t redesign the finale.

---

## Suggested implementation order

1. Keyboard/touch parity + storm reject toast (same afternoon).  
2. Guaranteed history pins + Capecod prep + merchant guarantee (high unit value).  
3. Graze/blast teach + painted sweep gaps (combat readability).  
4. Gulfstream signature + Palatine bite + Harbor guidance (pacing/economy).  
5. Dead `DiveScene` cleanup + copy fixes.

---

*Harness note: completions used `debugWin` / `skip` to clear fights, so score/gold absolute values are structural, not skill-accurate. Event frequencies, sequence shape, route/weather splits, and UX/code findings are the reliable signals.*
