// docs/tools/migrate-day-pages.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transform } from './migrate-day-pages.mjs';

const SAMPLE = `<!DOCTYPE html><html><head>
<script src="day-config.js?v=20260729" defer></script>
</head><body>
<div id="today-banner"></div>
<div class="kicker">Day 14 · Week 4 · Pitch Week</div>
<h1>Build Day 1</h1>
<p>This is a Day 5 kind of moment.</p>
<a href="whydah-dashboard.html#people">People</a>
<img src="pics/whydah-bell.jpg">
<p><b>Tomorrow:</b> <a href="day15.html">next</a></p>
</body></html>`;

test('strips the banner div and the day-config script', () => {
  const out = transform(SAMPLE, { day: 15, slug: 'day-15-the-trial', title: 'The Trial' });
  assert.ok(!out.includes('today-banner'));
  assert.ok(!out.includes('day-config.js'));
});

test('renumbers only the kicker, never body text', () => {
  const out = transform(SAMPLE, { day: 15, slug: 'day-15-the-trial', title: 'The Trial' });
  assert.match(out, /<div class="kicker">Day 15 · Week 4 · Pitch Week<\/div>/);
  assert.ok(out.includes('<h1>Build Day 1</h1>'), 'lesson title must survive');
  assert.ok(out.includes('This is a Day 5 kind of moment.'), 'back-reference must survive');
});

test('rewrites references for the new depth', () => {
  const out = transform(SAMPLE, { day: 15, slug: 'day-15-the-trial', title: 'The Trial' });
  assert.ok(out.includes('href="../as-taught/#people"'));
  assert.ok(out.includes('src="../../pics/whydah-bell.jpg"'));
  assert.ok(out.includes('href="../day-16-pitch-day/"'));
});

test('adds the archive notice', () => {
  const out = transform(SAMPLE, { day: 15, slug: 'day-15-the-trial', title: 'The Trial' });
  assert.match(out, /Archived as taught/);
});
