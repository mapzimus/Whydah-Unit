# First Sail

A browser game for the Whydah unit. Steer the *Whydah* north to Maine, survive what the sea throws at you, and try to beat the storm at the end.

**Play:** open `index.html` on any static host (it is live in the site's Games menu). No build step, no libraries, nothing loaded from the network. Pure Canvas 2D in three files (`index.html`, `game.css`, `game.js`). Runs offline and on Chromebooks.

## How it plays

- **Steer north.** Left and right only (arrow keys, A/D, drag, or the on-screen buttons). The ship sails itself. You dodge rocks, shoot debris out of the way (hold fire for a rolling broadside), grab coins, and follow the Whydah's real route: Windward Passage, Carolina coast, Virginia Capes, Rhode Island, Cape Cod. The scenery changes with the latitude — palms in the tropics, pines and cottages in the Sounds, lighthouses off Cape Cod.
- **Sea hazards with teeth.** Breaching sharks stalk your wake and leap at the hull (shoot them mid-air for a bonus), and narrow passages of land force you to thread a gap. Every hit gives a moment of grace before the next can land.
- **The fork.** Midway north the crew chooses: **hug the shore** (landmarks, towns, and extra healing — but shoals and narrows everywhere) or **stand out to sea** (richer coins and sea room — but sharks and squalls). Each route has its own exclusive event cards.
- **A truly random voyage.** Each run draws 5 to 7 events from a pool of 48 (some rare, some route-locked), plus 2 to 3 ship battles, 2 to 3 navigator mini-games, and a **sea serpent**, all in random order. Event cards are tagged **⚓ FROM THE RECORD** (real Whydah history) or **🌀 SEA YARN** (the serpent, the kraken, the glowing sail). The tags teach the unit's confidence tiers. Plain events run a **steady-hands timing bar** — stop the marker in the green and good news pays double while bad news is softened. Every card you meet is collected in the **📖 Tales Logbook** on the title screen.
- **Ship battles.** Pirate hunter sloops, armed merchant brigs, a King's man-of-war — and just before the storm, **the wolf pack**: three or four privateer sloops hunting together. Break the pack for a bonus.
- **Navigator games for points and gold.** Quick skill games that do not steer the ship: a sun-sight (backstaff), a depth sounding (lead line), and a speed count (log-line).
- **Gold banks between runs.** Spend it in the **Harbor** on eight upgrades: Oak Timbers, Bilge Pumps, Chain Shot, Crow's Nest, Weather Helm, Lucky Charm, Full Canvas (faster legs), Long Nines (faster firing, then a twin broadside). Your refit ship has a better chance in the storm.
- **The nor'easter.** The storm that took the real Whydah, April 26, 1717. Targeted lightning strikes, telegraphed wind gusts, rogue waves you brace with a well-timed tap, shootable wreckage, and the odd drifting repair barrel. Lose it and your score is capped (storm progress still banks a few points). **Beat it and the win is locked in** — the crew patches the hull and you choose: make for port, or turn and fight what followed you out.
- **The grandfather serpent.** The optional final boss — a three-headed serpent. Each head hunts on its own, spits venom, and joins telegraphed triple strikes. Send all three down for the **Serpent-Slayer** rank and a big bonus; lose, and the serpent takes half your gold but the storm-win stands.

## Controls

Arrow keys or A / D to steer, or drag on the sea. Space, or the fire button, to fire. On event choices, tap a button or press ← / →. 🔇 toggles sound (off by default for the classroom). Works on phones and Chromebook touchscreens.

## Notes

- Self-contained: no dependencies, no build, no network requests.
- The history behind it: the real Whydah was sailing north when a nor'easter wrecked her off Cape Cod in April 1717. In the game you get the chance her crew never had.
- Rebuilt July 2026, replacing the earlier 3D dead-reckoning simulator.
