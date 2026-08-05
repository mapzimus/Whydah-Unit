# Photography Unit — `/photo`

A small standalone section of whydahstory.com for the photography unit, reachable at
**https://whydahstory.com/photo**. It is deliberately separate from the pirate curriculum
site (different audience) and is not linked from the main dashboard.

## Pages

| Page | URL | Purpose |
|------|-----|---------|
| `index.html` | `/photo` | Landing page linking the tools below. |
| `submit.html` | `/photo/submit.html` | **Showcase submission.** Each student uploads exactly three photos, with a caption on each and their name. Enforces the three-photo limit per name. |
| `showcase.html` | `/photo/showcase.html` | **Showcase slideshow.** Fullscreen gallery for the final show — about five minutes. Order is shuffled every time you hit Play (and again on Shuffle). Keyboard: Space, ←/→, F, Esc. |
| `map.html` | `/photo/map.html` | The **Salem Photography Walks** scouting map — 17 walkable shooting spots around Collins Middle School, color-coded by category (nature / historic / urban / train), each with a walking time from the school, plus a true 5/10/15-minute pedestrian walk-shed and the commuter rail line. Draggable pins, GeoJSON export, and print. This is a copy of the canonical map in the `maxwellhowegis` repo (`salem-photo-walk/index.html`); edit the `SPOTS` array near the top to change locations, and re-copy here if you update the master. Uses Leaflet + Tabler Icons + CARTO/Esri/OSM tiles from CDNs (the one part of `/photo` that depends on outside hosts). |
| `claim.html` | `/photo/claim.html` | **Camera photo pickup.** Teacher uploads a batch of photos from the shared digital cameras (via the "Teacher" panel at the bottom); students find their shots, tap **Claim** to put their name on one, then **Download** to their Chromebook. Students can also download all their claimed photos as a `.zip`. |
| `gallery.html` | `/photo/gallery.html` | **Student galleries.** A student uploads phone photos into a gallery they create, then opens the gallery on their Chromebook and downloads everything (individually or as a `.zip`) to edit. |

## Why this exists (the Chromebook problem)

Student Chromebooks are locked down and can't read from thumb drives, but they *can* download
files from a website that's unblocked on school WiFi. So photos go **up** to this site (from a
phone, a camera card, or the teacher's computer) and come **down** onto the Chromebook as normal
browser downloads.

## Backend

No server code — the pages talk directly to a **Supabase** project (free tier) over plain
`fetch`, so there are no external JS libraries that school WiFi might block (except Leaflet on the
map page, which degrades gracefully).

- Project URL and the **publishable/anon** key are in `photo.js`. These are safe to ship publicly.
- Storage bucket `photos` is public-read; anonymous users may **upload** but not overwrite or
  delete (enforced by row-level security policies).
- Two tables: `galleries` (student gallery metadata) and `claims` (who claimed which camera photo).
  Anyone may read and insert; nobody may update or delete via the public key. A unique constraint
  on `claims.photo_path` means the first person to claim a photo wins (others get a friendly
  "already claimed" message).
- Showcase submissions live entirely in storage under `showcase/`: each photo is a JPEG plus a
  matching `.meta.jpg` sidecar whose *bytes* are JSON (`student_name`, `caption`, `photo_path`,
  `created_at`). The sidecar uses an image MIME type because the `photos` bucket rejects
  non-image uploads. No extra database table is required.

### Clearing photos between units

Everything here is meant to be temporary. To wipe it, in the Supabase dashboard for the
`whydah-photo` project:

1. **Storage → `photos`** — delete the `drops/`, `galleries/`, and `showcase/` folders.
2. **Table editor** — empty the `galleries` and `claims` tables.

Dev probes left `_probe_*` and `Smoke_Test` files under `showcase/`; the slideshow ignores those
names, but delete them from the dashboard whenever you wipe the folder.

### `photo.js`

Shared helpers used by all three pages: Supabase REST/Storage calls, client-side image shrinking
before upload (saves storage and upload time on the free tier), individual downloads, and a tiny
dependency-free ZIP writer for "download all" / "download my claimed photos".
