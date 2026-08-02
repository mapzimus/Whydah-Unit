// docs/tools/day-map.mjs
// Single source of truth for the archive renumber.
// `day` is what students saw. `file` is the historical filename, which from
// Day 15 on is one LOWER than the displayed number (2026-07-29 renumber).
export const DAY_MAP = [
  { day: 1,  file: null,           slug: 'day-1-launching-the-voyage',        title: 'Launching the Voyage' },
  { day: 2,  file: 'day2.html',    slug: 'day-2-what-is-a-map',               title: 'What Is a Map?' },
  { day: 3,  file: 'day3.html',    slug: 'day-3-reading-the-1719-map',        title: 'Reading the 1719 World Map' },
  { day: 4,  file: 'day4.html',    slug: 'day-4-adopt-a-ship',                title: 'Adopt a Ship' },
  { day: 5,  file: 'day5.html',    slug: 'day-5-out-of-the-machine',          title: 'Out of the Machine' },
  { day: 6,  file: 'day6.html',    slug: 'day-6-real-pirates-salem-maritime', title: 'Field Trip 1 — Real Pirates + Salem Maritime' },
  { day: 7,  file: 'day7.html',    slug: 'day-7-life-at-sea',                 title: 'Field Trip 2 — Life at Sea: Kayak Day' },
  { day: 8,  file: 'day8.html',    slug: 'day-8-the-vote',                    title: 'The Vote' },
  { day: 9,  file: 'day9.html',    slug: 'day-9-sign-the-articles',           title: 'Sign the Articles' },
  { day: 10, file: 'day10.html',   slug: 'day-10-the-wreck',                  title: 'The Wreck' },
  { day: 11, file: 'day11.html',   slug: 'day-11-georges-island',             title: 'Field Trip 3 — Georges Island' },
  { day: 12, file: 'day12.html',   slug: 'day-12-lost-and-found',             title: 'Lost and Found' },
  { day: 13, file: 'day13.html',   slug: 'day-13-where-ships-squeeze-through', title: 'Where Ships Squeeze Through' },
  { day: 14, file: 'day14.html',   slug: 'day-14-salem-then-and-now',         title: 'Salem Then and Now' },
  { day: 15, file: 'day14b.html',  slug: 'day-15-the-trial',                  title: 'The Trial' },
  { day: 16, file: 'day15.html',   slug: 'day-16-pitch-day',                  title: 'Pitch Day' },
  { day: 17, file: 'day16.html',   slug: 'day-17-synthesis-studio',           title: 'Synthesis Studio' },
  { day: 18, file: 'day17.html',   slug: 'day-18-build-day-1',                title: 'Build Day 1' },
  { day: 19, file: 'day18.html',   slug: 'day-19-build-day-2',                title: 'Build Day 2 — Peer Review' },
  { day: 20, file: 'day19.html',   slug: 'day-20-the-showcase',               title: 'The Showcase' },
];

export function byFile(file) {
  return DAY_MAP.find(d => d.file === file) ?? null;
}
