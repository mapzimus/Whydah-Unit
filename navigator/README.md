# First Sail

A browser game for the Whydah unit. Steer the *Whydah* north to Maine, survive what the sea throws at you, and try to beat the storm at the end.

**Play:** open `index.html` on any static host (it is live in the site's Games menu). No build step, no libraries, nothing loaded from the network. Pure Canvas 2D in three files (`index.html`, `game.css`, `game.js`). Runs offline and on Chromebooks.

## How it plays

- **Steer north.** Left and right only (arrow keys, A/D, drag, or the on-screen buttons). The ship sails itself. You dodge rocks, shoot debris out of the way, grab coins, and follow the Whydah's real route: Windward Passage, Carolina coast, Virginia Capes, Rhode Island, Cape Cod. The scenery changes with the latitude — palms in the tropics, pines and cottages in the Sounds, lighthouses off Cape Cod.
- **Sea hazards with teeth.** Breaching sharks stalk your wake and leap at the hull (shoot them mid-air for a bonus), and narrow passages of land force you to thread a gap.
- **A truly random voyage.** Each run draws 5 to 7 events from a pool of 40 (some rare), plus 2 to 3 ship battles, 2 to 3 navigator mini-games, and a **sea serpent**, all in random order. Event cards are tagged **⚓ FROM THE RECORD** (real Whydah history: the Mary Anne's wine, John Julian at the helm, Williams turning for Block Island, equal shares) or **🌀 SEA YARN** (the serpent, the kraken, the glowing sail). The tags teach the unit's confidence tiers. Plain events now run a **steady-hands timing bar** — stop the marker in the green and good news pays double while bad news is softened.
- **Ship battles.** Pirate hunter sloops, armed merchant brigs, and a King's man-of-war. Sink them for gold.
- **Navigator games for points and gold.** Quick skill games that do not steer the ship: a sun-sight (backstaff), a depth sounding (lead line), and a speed count (log-line).
- **Gold banks between runs.** Spend it in the **Harbor** on eight upgrades: Oak Timbers, Bilge Pumps, Chain Shot, Crow's Nest, Weather Helm, Lucky Charm, Full Canvas (faster legs), Long Nines (faster shot, then a twin broadside). Your refit ship has a better chance in the storm.
- **The nor'easter.** The storm that took the real Whydah, April 26, 1717. Now with targeted lightning strikes, wind gusts that shove the wheel, rogue waves, and thicker wreckage (which you can shoot). Lose it and your score is capped. Beat it and a survivor bonus breaks the cap and lifts your rank.
- **The grandfather serpent.** Beat the storm and a three-headed serpent rises as the final boss. Each head hunts on its own, spits venom, and joins triple strikes. Send all three back down for the Serpent-Slayer rank.

## Controls

Arrow keys or A / D to steer, or drag on the sea. Space, or the fire button, to fire. On event choices, tap a button or press ← / →. 🔇 toggles sound (off by default for the classroom). Works on phones and Chromebook touchscreens.

## Notes

- Self-contained: no dependencies, no build, no network requests.
- The history behind it: the real Whydah was sailing north when a nor'easter wrecked her off Cape Cod in April 1717. In the game you get the chance her crew never had.
- Rebuilt July 2026, replacing the earlier 3D dead-reckoning simulator.
