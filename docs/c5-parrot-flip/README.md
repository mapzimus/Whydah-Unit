# Parrot Flip for c5

Playable minigame port of this repo's `parrot-flip/` (Matter.js flick physics + pirate macaw art), ready to land in **[mapzimus/c5](https://github.com/mapzimus/c5)**.

This agent could not push to `c5` (GitHub App access is only on Whydah-Unit). Apply the patch there:

```bash
git clone https://github.com/mapzimus/c5.git
cd c5
git checkout -b parrot-flip
git am path/to/0001-add-parrot-flip.patch
git push -u origin parrot-flip
```

That registers **Parrot Flip** on the C5 minigame menu: four tosses each, most upright landings wins. Needs `matter-js@0.19.0` (included in the patch).
