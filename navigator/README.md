# First Sail

A browser game for the Whydah unit. Steer the *Whydah* north to Maine, survive what the sea throws at you, and try to beat the storm at the end.

**Play:** open `index.html` on any static host (it is live in the site's Games menu). No build step, no libraries, nothing loaded from the network. Pure Canvas 2D in three files (`index.html`, `game.css`, `game.js`). Runs offline and on Chromebooks.

## How it plays

- **Steer the whole sea.** Full 2D helm: left/right AND forward/back (arrow keys, WASD, drag, or the on-screen buttons — SPACE fires). Steering is eased — a quick tap is a small precise nudge, holding crosses at full speed, and letting go stops fast — so you can thread a gap without overshooting, press ahead for a pickup, or hang back from a lunge. You steer around natural hazards — reefs and rocks near the coast, drift ice up north; the open ocean stays mostly clear — grab coins, and follow the Whydah's real route: Windward Passage, Carolina coast, Virginia Capes, Rhode Island, Cape Cod. The scenery changes with the latitude — palms in the tropics, pines and cottages in the Sounds, lighthouses off Cape Cod.
- **Four difficulties.** **EASY** (an extra heart, gentler seas, more hearts adrift), **HARD** (the classic tuning), **EXTREME** (tougher ships, faster guns, fans of serpent venom, a longer storm — and a 1.3× score bonus), and **🌀 INSANE** — locked until you beat EXTREME. Insane is the multiverse run: neon seas, chanting gulls, the Fanum tax, rainbow serpents in sunglasses, a chaos modifier every leg (mirror helm! giga coins! disco sea!), and the biggest score multiplier in the game. Pick your tier on the title screen.
- **Sea hazards with teeth.** Breaching sharks stalk your wake and leap at the hull — a loud **🦈 SHARK!** cue flashes in front of you so it can't sneak up while you're aiming, and there's a long wind-up to react (shoot one mid-air for a bonus). In the **Caribbean legs** (Windward Passage, Florida Straits) narrow island passages force you to thread a wide gap; further north it's open coast. Every hit gives a moment of grace before the next can land.
- **Hearts heal.** When you're hurt, **❤ heart pickups** drift down the lane — grab one to win a life back (the more hurt you are, the likelier they appear), alongside the repair barrels.
- **Plays fair on phones.** On a narrow portrait screen the steering band widens and hazards thin out and slow down, so a phone plays about as fair as a widescreen.
- **The fork.** Midway north the crew chooses: **hug the shore** (landmarks, towns, and extra healing — but rocks and reefs to hug) or **stand out to sea** (richer coins and sea room — but sharks and squalls). Each route has its own exclusive event cards.
- **A truly random voyage.** Each run draws 5 to 7 events from a pool of nearly 60 (some rare, some route-locked, ten only found in the multiverse), plus 2 to 3 ship battles, 2 to 3 navigator mini-games, and a **sea serpent** that spits far more venom than it used to, all in random order. Event cards are tagged **⚓ FROM THE RECORD** (real Whydah history), **🌀 SEA YARN** (the serpent, the kraken, the glowing sail), or **🤯 MULTIVERSE** (insane mode only). The tags teach the unit's confidence tiers. Plain events run a **steady-hands timing bar** — stop the marker in the green and good news pays double while bad news is softened. Every card you meet is collected in the **📖 Tales Logbook** on the title screen.
- **Ship battles.** Pirate hunter sloops, armed merchant brigs, a King's man-of-war — and just before the storm, **the wolf pack**: three or four privateer sloops hunting together. Break the pack for a bonus.
- **Navigator games for points and gold.** Quick skill games that do not steer the ship: a sun-sight (backstaff), a depth sounding (lead line), and a speed count (log-line).
- **Gold banks between runs.** Spend it in the **Harbor** on eight upgrades: Oak Timbers, Bilge Pumps, Chain Shot, Crow's Nest, Weather Helm, Lucky Charm, Full Canvas (faster legs), Long Nines (faster firing, then a twin broadside). Your refit ship has a better chance in the storm.
- **The nor'easter.** The storm that took the real Whydah, April 26, 1717. Targeted lightning strikes, telegraphed wind gusts, rogue waves you brace with a well-timed tap, shootable wreckage, and the odd drifting repair barrel. Lose it and your score is capped (storm progress still banks a few points). **Beat it and the win is locked in** — the crew patches the hull and you choose: make for port, or turn and fight what followed you out.
- **The grandfather serpent.** The optional final boss — a three-headed serpent. Each head hunts on its own, spits venom, and joins telegraphed triple strikes. Send all three down for the **Serpent-Slayer** rank and a big bonus; lose, and the serpent takes half your gold but the storm-win stands.

## Controls

Arrow keys or WASD to steer in all four directions, or drag on the sea. Space (or Enter, or the fire button) to fire — hold for a rolling broadside. On event choices, tap a button or press ← / →. 🔇 toggles sound (off by default for the classroom). Works on phones and Chromebook touchscreens.

## Notes

- Self-contained: no dependencies, no build, no network requests.
- The history behind it: the real Whydah was sailing north when a nor'easter wrecked her off Cape Cod in April 1717. In the game you get the chance her crew never had.
- Rebuilt July 2026, replacing the earlier 3D dead-reckoning simulator.
