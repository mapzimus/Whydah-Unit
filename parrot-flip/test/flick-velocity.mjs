// Touch flicks must use the snap (last ~90ms), not a noisy peak sample,
// so a normal finger toss lands in the make window (~1800–2400 px/s).
import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { console };
vm.runInNewContext(
  fs.readFileSync(path.join(root, 'js/flick.js'), 'utf8') + '\nthis.Flick = Flick;',
  ctx,
);
const { Flick } = ctx;

let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ', name, detail || '');
  else { console.log('FAIL ', name, detail || ''); failed++; }
}

function pathUp({ px, ms, holdMs = 0, steps = 6 }) {
  const samples = [];
  const y0 = 520;
  if (holdMs) samples.push({ t: 0, x: 200, y: y0 });
  const t0 = holdMs;
  for (let i = 0; i <= steps; i++) {
    const t = t0 + (ms * i) / steps;
    const y = y0 - (px * i) / steps;
    samples.push({ t, x: 200, y });
  }
  const last = samples[samples.length - 1];
  return {
    samples,
    startX: 200,
    startY: y0,
    curX: last.x,
    curY: last.y,
  };
}

function upSpeed(opts) {
  const g = pathUp(opts);
  const v = Flick.velocityFromGesture({
    ...g,
    pointerType: opts.pointerType || 'touch',
    peakVx: 0,
    peakVy: opts.peakVy ?? -9000,
    peakSpeed: Math.abs(opts.peakVy ?? 9000),
  });
  return v ? -v.vy : 0;
}

const typical = upSpeed({ px: 140, ms: 90, peakVy: -9000 });
check(
  'typical 140px / 90ms finger toss sits in the make window',
  typical >= 1800 && typical <= 2500,
  `up=${typical.toFixed(0)}`,
);

const noisy = upSpeed({ px: 140, ms: 90, peakVy: -12000 });
check(
  'a 12k px/s noisy peak does not become max-power',
  noisy < 3200,
  `up=${noisy.toFixed(0)}`,
);

const hesitate = upSpeed({ px: 140, ms: 90, holdMs: 320, peakVy: -6000 });
check(
  'press-and-hold then snap is not diluted by the hold',
  hesitate >= 1800 && hesitate <= 2500,
  `up=${hesitate.toFixed(0)}`,
);

const soft = upSpeed({ px: 50, ms: 140, peakVy: -2000 });
check(
  'a tiny toss stays below the make window',
  soft < 1600,
  `up=${soft.toFixed(0)}`,
);

const mouse = Flick.velocityFromGesture({
  ...pathUp({ px: 220, ms: 110 }),
  pointerType: 'mouse',
  peakVx: 40,
  peakVy: -2100,
  peakSpeed: 2100,
});
check(
  'mouse still uses peak velocity (desktop feel unchanged)',
  mouse && Math.abs(-mouse.vy - 2100) < 1,
  `vy=${mouse && mouse.vy}`,
);

const commit = Flick.shouldCommitCancel({
  ...pathUp({ px: 140, ms: 90 }),
  pointerType: 'touch',
  peakVx: 0,
  peakVy: -5000,
  peakSpeed: 5000,
});
check('a real snap on pointercancel still fires', commit === true);

const noCommit = Flick.shouldCommitCancel({
  samples: [{ t: 0, x: 10, y: 10 }, { t: 20, x: 12, y: 11 }],
  pointerType: 'touch',
  startX: 10, startY: 10, curX: 12, curY: 11,
  peakVx: 100, peakVy: -80, peakSpeed: 120,
});
check('a tiny wiggle on cancel does not fire', noCommit === false);

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('\nall flick-velocity checks passed');
