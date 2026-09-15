// Assert a mid-strength flick goes high enough to finish one turn, without
// flying off a phone screen. Loads the real physics.js + Matter.
import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadPhysics() {
  const ctx = { console };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'js/vendor/matter.min.js'), 'utf8'), ctx);
  vm.runInNewContext(
    fs.readFileSync(path.join(root, 'js/physics.js'), 'utf8') + '\nthis.Physics = Physics;',
    ctx,
  );
  return ctx.Physics;
}

function flight(Physics, { w, h, inset, vx, vy }) {
  Physics.init(w, h, inset);
  const startY = Physics.getBottle().position.y;
  const startA = Physics.getBottle().angle;
  const groundY = Physics.getGroundY();
  Physics.applyFlick(vx, vy);
  let minY = startY;
  let landTurns = null;
  for (let i = 0; i < 240; i++) {
    Physics.step(1 / 60);
    const b = Physics.getBottle();
    minY = Math.min(minY, b.position.y);
    if (landTurns == null && i > 8 && b.position.y >= groundY - 88 && b.velocity.y > 0) {
      landTurns = Math.abs(b.angle - startA) / (2 * Math.PI);
    }
  }
  return { startY, peak: startY - minY, minY, landTurns, groundY };
}

const Physics = loadPhysics();
let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ', name, detail || '');
  else { console.log('FAIL ', name, detail || ''); failed++; }
}

// Classroom phone (Playwright / iPhone-ish logical size).
const phone = flight(Physics, { w: 390, h: 844, inset: 170, vx: 0, vy: -2100 });
check(
  'mid flick on a tall phone peaks well above the old ~220px hop',
  phone.peak >= 330,
  `peak=${phone.peak.toFixed(0)} minY=${phone.minY.toFixed(0)}`,
);
check(
  'bird stays on screen (head above y=40)',
  phone.minY > 120,
  `minY=${phone.minY.toFixed(0)}`,
);
check(
  'mid flick completes about one turn',
  phone.landTurns != null && phone.landTurns >= 0.95 && phone.landTurns <= 1.22,
  `turns=${phone.landTurns && phone.landTurns.toFixed(2)}`,
);

const se = flight(Physics, { w: 375, h: 667, inset: 133, vx: 0, vy: -2100 });
check(
  'small phone: still higher than the old hop, still on screen',
  se.peak >= 260 && se.minY > 80,
  `peak=${se.peak.toFixed(0)} minY=${se.minY.toFixed(0)}`,
);

const soft = flight(Physics, { w: 390, h: 844, inset: 170, vx: 0, vy: -900 });
check(
  'soft flick still under-rotates (skill preserved)',
  soft.landTurns != null && soft.landTurns < 0.92,
  `turns=${soft.landTurns && soft.landTurns.toFixed(2)}`,
);

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('\nall toss-height checks passed');
