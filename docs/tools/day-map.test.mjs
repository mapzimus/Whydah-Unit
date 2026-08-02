// docs/tools/day-map.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DAY_MAP, byFile } from './day-map.mjs';

test('covers all 20 student days exactly once', () => {
  const days = DAY_MAP.map(d => d.day).sort((a, b) => a - b);
  assert.deepEqual(days, Array.from({ length: 20 }, (_, i) => i + 1));
});

test('the renumber offset is preserved for the post-July-29 days', () => {
  assert.equal(byFile('day14b.html').day, 15);
  assert.equal(byFile('day15.html').day, 16);
  assert.equal(byFile('day19.html').day, 20);
});

test('Day 1 has no source file', () => {
  const dayOne = DAY_MAP.find(d => d.day === 1);
  assert.equal(dayOne.file, null);
});

test('slugs are unique and start with their day number', () => {
  const slugs = DAY_MAP.map(d => d.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const d of DAY_MAP) assert.ok(d.slug.startsWith(`day-${d.day}-`), d.slug);
});
