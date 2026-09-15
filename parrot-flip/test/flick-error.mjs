// Same flick must not be a lock. Random spin/kick/drift should leave
// a decent miss chance even in the sweet-spot speed band.
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

function verdict(Physics, vy) {
  Physics.init(390, 844, 170);
  Physics.applyFlick(0, vy);
  for (let i = 0; i < 360; i++) {
    Physics.step(1 / 60);
    const r = Physics.checkLanding();
    if (r) return r;
  }
  return 'NONE';
}

function makeRate(Physics, vy, n) {
  let makes = 0;
  for (let i = 0; i < n; i++) {
    if (verdict(Physics, vy) === 'MAKE') makes++;
  }
  return makes / n;
}

const Physics = loadPhysics();
let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ', name, detail || '');
  else { console.log('FAIL ', name, detail || ''); failed++; }
}

const mid = makeRate(Physics, -2100, 40);
check(
  'sweet-spot flick is usually a make, not a lock',
  mid >= 0.40 && mid <= 0.75,
  `make=${(mid * 100).toFixed(0)}%`,
);

const easy = makeRate(Physics, -1400, 40);
check(
  'a slightly-soft flick is not a guaranteed make',
  easy < 0.85,
  `make=${(easy * 100).toFixed(0)}%`,
);

const hard = makeRate(Physics, -3200, 24);
check(
  'a max-power flick still usually misses',
  hard <= 0.35,
  `make=${(hard * 100).toFixed(0)}%`,
);

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('\nall flick-error checks passed');
