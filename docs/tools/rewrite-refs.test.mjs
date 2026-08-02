// docs/tools/rewrite-refs.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rewriteRef } from './rewrite-refs.mjs';

test('leaves absolute and in-page references alone', () => {
  for (const v of ['https://example.com/x', '#top', '/favicon.ico', 'mailto:a@b.c']) {
    assert.equal(rewriteRef(v), v);
  }
});

test('root assets climb two levels', () => {
  assert.equal(rewriteRef('pics/whydah-bell.jpg'), '../../pics/whydah-bell.jpg');
  assert.equal(rewriteRef('navigator/'), '../../navigator/');
  assert.equal(rewriteRef('black-sam/'), '../../black-sam/');
  assert.equal(rewriteRef('games/'), '../../games/');
});

test('tools that keep their root URL climb two levels and keep their query', () => {
  assert.equal(rewriteRef('map-studio.html?door=suez'), '../../map-studio.html?door=suez');
  assert.equal(rewriteRef('flythrough.html'), '../../flythrough.html');
});

test('pages moving into the archive climb one level', () => {
  assert.equal(rewriteRef('handouts.html'), '../handouts.html');
  assert.equal(rewriteRef('choose-your-project.html#form'), '../choose-your-project.html#form');
});

test('the dashboard becomes the frozen snapshot, anchors intact', () => {
  assert.equal(rewriteRef('whydah-dashboard.html#people'), '../as-taught/#people');
  assert.equal(rewriteRef('whydah-dashboard.html'), '../as-taught/');
});

test('sibling day links use the new slug and the displayed number', () => {
  assert.equal(rewriteRef('day8.html'), '../day-8-the-vote/');
  assert.equal(rewriteRef('day14b.html'), '../day-15-the-trial/');
  assert.equal(rewriteRef('day19.html'), '../day-20-the-showcase/');
});

test('an unrecognised relative reference throws rather than shipping broken', () => {
  assert.throws(() => rewriteRef('mystery-page.html'), /unmapped/i);
});
