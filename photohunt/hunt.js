/* Photo Hunt shared logic. Loads after ./photo.js (Supabase helpers). */

const HUNT_ITEMS = [
  { id: 1,  text: 'Find something that looks like a face but is not one.' },
  { id: 2,  text: 'Make your buddy look TINY standing next to something huge.' },
  { id: 3,  text: 'Shoot down the longest, straightest line you can find in the building.' },
  { id: 4,  text: 'Hide behind something so only part of you is showing.' },
  { id: 5,  text: 'Find your reflection somewhere weird that is not a mirror.' },
  { id: 6,  text: 'Get 3 things the same color in one photo.' },
  { id: 7,  text: 'Take a spooky shadow photo. The shadow is the star, not the person.' },
  { id: 8,  text: 'Get a photo of someone mid-jump, frozen in the air.' },
  { id: 9,  text: 'Find something round or patterned. Get so close it looks like a different object.' },
  { id: 10, text: 'Copy someone’s exact pose so it looks like a mirror image. Two people, not a reflection.' },
  { id: 11, text: 'Find the tallest thing in the building. Shoot from the floor looking straight up.' },
  { id: 12, text: 'Get a "spy photo" of someone who has no idea they are being photographed.' },
  { id: 13, text: 'Take a photo completely upside down.' },
  { id: 14, text: 'Find two things that could pass as twins. Same shape or color, totally unrelated objects.' },
  { id: 15, text: 'Take a photo of just feet or shoes that is actually interesting.' },
  { id: 16, text: 'Catch someone right before something happens. About to sit, about to catch, about to jump.' },
  { id: 17, text: 'Find the messiest, most chaotic spot in the building. Make it look cool.' },
  { id: 18, text: 'Get the brightest spot and the darkest spot both in one frame.' },
  { id: 19, text: 'Pretend to hold up or balance something huge with your hand in front of the camera.' },
  { id: 20, text: 'Make a hallway look like it goes on forever.' },
];
const TEAMS = ['A', 'B', 'C'];

function itemText(id) {
  const it = HUNT_ITEMS.find((i) => i.id === id);
  return it ? it.text : 'Item ' + id;
}

/* PATCH a row's status (photo.js only has select/insert) */
async function dbUpdate(table, query, patch) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    headers: { ...sbHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error(`Update failed (${r.status})`);
}

/* Round 1's submissions, oldest first (optionally one team's).
 * The path filter keeps this round separate from round 2 ("hunt2/"), which
 * shares this table. */
async function huntRows(team) {
  const filter = team ? `&team=eq.${team}` : '';
  return dbSelect('hunt_submissions', `select=*&path=like.hunt/*${filter}&order=created_at.asc`);
}

/* Current state per item for one team: the newest row wins; a 'retake' row
 * means the item is open again. Returns {itemId: row|null}. */
function teamState(rows) {
  const state = {};
  for (const it of HUNT_ITEMS) state[it.id] = null;
  for (const r of rows) state[r.item_id] = r.status === 'retake' ? null : r;
  return state;
}
