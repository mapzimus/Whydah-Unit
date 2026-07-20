# Parrot Flip

A pirate-parrot flip party game for [WhydahStory](https://whydahstory.com).
Pick a Caribbean macaw (eye patch mandatory), flick it sky-high, and land it
on its feet. Same Matter.js flick physics and rules as the original Flip Game.

**Play:** https://whydahstory.com/parrot-flip/

## Play locally

No build step. Serve the folder statically and open it:

```
npx serve .
```

## The birds

The parrot art is a **hand-authored SVG macaw** (side profile: hooked ivory
beak, white facial patch, golden wing band, long graduated tail, grey feet —
and the pirate eye patch every bird must wear). It lives entirely inside
`js/renderer.js`, baked per player color at runtime into cached images — no
asset files, still fully offline.

`js/renderer.js` is synced from the upstream game at
[mapzimus/flipgame](https://github.com/mapzimus/flipgame) → `parrot-flip/`
(art build v6). If the birds get another glow-up there, copy that one file
over, bump `?v=` in `index.html` and `CACHE_NAME` in `service-worker.js`,
and re-test. The rest of this folder (physics feel wiring, impact sounds,
pirate menu copy) is WhydahStory's own and is NOT auto-synced.

## What's pirate here

- Menu copy: Cast Off, Port → Starboard, Calm seas / Rough seas / Gale,
  Landlubber / Sailor / Pirate
- Winner is crowned **Captain**
- Night-sea / ship-deck backdrop, WhydahStory navy/gold palette
