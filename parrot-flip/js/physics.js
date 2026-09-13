// physics.js — Matter.js world, bottle body, liquid sim

const Physics = (() => {
  const { Engine, Bodies, Body, World, Events } = Matter;

  let engine, world, bottle, ground, leftWall, rightWall;
  let groundedFrames = 0;
  let angleWin = [];   // sliding window of recent angles (settle detection)
  let totalRotation = 0, hasFlipped = false, launchAngle = 0, hasLanded = false, wasAirborne = false;
  let lastLandingInfo = null;
  let lastFlickInfo = null;
  let canvasW;
  let canvasH;
  let lastInset = 0;
  let groundY;
  let wallsOn = true;   // false on phones — open arena, no side rails

  // Rare 1/100 hold-plinko. Target slot is rolled up front so each of the 9
  // buckets stays equally likely; physics + a late nudge sell the bounce.
  let plinkoArmed = false;
  let plinkoMode = false;
  let plinkoTarget = 4;
  let plinkoLayout = null;
  let plinkoPegs = [];
  let plinkoSettle = 0;
  let plinkoFrames = 0;
  let plinkoDone = null;

  // Spin tuning (rad/step) — see applyFlick. Single sweet spot near 1 turn:
  // soft flick under-rotates (<360, fails), medium ≈ one clean turn (make),
  // hard overshoots (~1.3 turns, miss). Rotation ranges ~0.8 to ~1.35.
  const SPIN_BASE   = 0.140;  // spin from a soft flick (~0.8 turn)
  const SPIN_RANGE  = 0.100;  // extra spin at full-strength flick (~1.35 turn)
  const POWER_SPEED = 4000;   // flick speed (px/s) that maps to full power
  const WALL_INSET  = 14;     // px from each screen edge to the wall's inner face (matches renderer)

  function placeWalls(w, h) {
    if (!leftWall || !rightWall) return;
    if (wallsOn) {
      Body.setPosition(leftWall,  { x: WALL_INSET - 20,     y: h / 2 });
      Body.setPosition(rightWall, { x: w - WALL_INSET + 20, y: h / 2 });
    } else {
      // Park off-world so they can't collide (open arena on phones).
      Body.setPosition(leftWall,  { x: -50000, y: h / 2 });
      Body.setPosition(rightWall, { x:  50000, y: h / 2 });
    }
  }

  function setSideWalls(on) {
    wallsOn = !!on;
    if (engine) placeWalls(canvasW, canvasH);
  }

  // ── Landing-detection knobs (the false-miss fix) ───────────────────────────
  // A verdict is read ONLY once the bottle has truly come to rest. A make is
  // called the instant it settles upright; an obvious miss (toppled flat, or
  // never completed a 360°) the instant it settles in that pose. But a
  // tipped-yet-recoverable pose — the bowling-pin bottle hovering near its ~40°
  // tipping point — is NOT judged: it can still slowly RIGHT itself into a make,
  // so we wait it out instead of calling a premature miss. Only if nothing
  // resolves within MISS_CAP_FRAMES (the glitch / teeter-stall fallback) do we
  // force a MISS so a turn can never soft-lock in EVALUATING.
  const SETTLE_FRAMES   = 22;    // frames of stillness required to read the pose
  const SETTLE_RANGE    = 0.03;  // rad — max angle spread across that window
  const PERFECT_ANGLE   = 0.16;  // ≤~9° upright = perfect landing flair
  const MISS_CAP_FRAMES = 300;   // ~5s grounded with no verdict → forced MISS (fallback)

  // One classroom feel — a hair more forgiving than the old "standard" preset
  // so a decent flick usually sticks, without deleting the miss chance.
  const FEEL = { makeAngle: 0.70, fallenAngle: 1.12, spinJitter: 0.16, launchJitter: 0.09, kickScale: 0.75 };
  const MAKE_ANGLE   = FEEL.makeAngle;
  const FALLEN_ANGLE = FEEL.fallenAngle;


  // ── Liquid oscillator ──────────────────────────────────────────────────────
  // Virtual pendulum — tracks the slosh of liquid inside the bottle.
  // It is NOT a physics body; it's a visual/stability modifier only.
  const liquid = {
    slosh: 0,      // -1..1 offset of liquid mass center (bottle frame)
    vel: 0,        // rate of change
    settleTimer: 0,

    update(bottleAngVel, dt) {
      // Liquid behaves like a damped pendulum driven by bottle rotation
      const spring  = -0.10 * this.slosh;
      const drive   =  0.40 * bottleAngVel;
      const damping = -0.08 * this.vel;
      this.vel   += (spring + drive + damping) * dt;
      this.slosh += this.vel * dt;
      this.slosh  = Math.max(-1, Math.min(1, this.slosh));

      this.settleTimer = Math.abs(this.vel) < 0.10
        ? this.settleTimer + dt
        : 0;
    },

    renderOffset() { return this.slosh * 13; }, // px horizontal shift for drawing
    isSettled()    { return this.settleTimer > 0.25; },
    reset()        { this.slosh = 0; this.vel = 0; this.settleTimer = 0; },
  };

  // ── Landing detection — judge only once the bottle has COMMITTED ──────────
  // The low-CG "bowling pin" bottle can land tipped, hover near its ~40° tipping
  // point, then slowly RIGHT itself into a make. The old logic judged the first
  // moment it went still — so a bottle paused mid-teeter (tilted past the make
  // window) was called a MISS even though it then stood up: a false miss.
  //
  // Fix: never call a miss on a pose that can still become a make. Once the
  // bottle is genuinely at rest we read the pose:
  //   • upright (≤ MAKE_ANGLE)         → MAKE   (it won't un-right — call it now)
  //   • toppled past recovery (≥ FALLEN_ANGLE) or never flipped → MISS (certain)
  //   • in between (the teeter zone)   → DON'T judge; wait for it to commit up
  //     (→ MAKE) or fall over (→ MISS), or for the cap to fire.
  // MISS_CAP_FRAMES (~5s grounded) is the fallback: a bottle that never resolves
  // (a rare wall-lean / glitch) is forced to MISS so the turn can't soft-lock.
  function recordLanding(result, tilt, reason) {
    lastLandingInfo = {
      result,
      tilt,
      perfect: result === 'MAKE' && tilt != null && tilt <= PERFECT_ANGLE,
      reason,
    };
    return result;
  }

  function checkLanding() {
    if (!bottle || plinkoMode) return null;

    const angVel   = Math.abs(bottle.angularVelocity);
    const linSpeed = Math.hypot(bottle.velocity.x, bottle.velocity.y);
    const grounded = bottle.position.y >= groundY - 80;

    if (!grounded) wasAirborne = true;
    if (grounded && plinkoArmed && wasAirborne) {
      plinkoArmed = false;
      return 'PLINKO';
    }

    if (!grounded) {
      groundedFrames = 0;
      angleWin = [];
      return null;
    }

    groundedFrames++;

    // Fallback cap: grounded this long without committing (a teeter that neither
    // rights nor falls, a wall-lean, or a glitch) → force a MISS so EVALUATING
    // can't soft-lock. This is the "wait ~5s, then it's a miss" safety net.
    if (groundedFrames > MISS_CAP_FRAMES) return recordLanding('MISS', null, 'timeout');

    // Read the pose ONLY when truly at rest: very low spin + drift, held with a
    // stable angle across the settle window. A momentary teeter pause can't fill
    // the whole window, so we never judge mid-teeter.
    if (angVel < 0.010 && linSpeed < 7) {
      angleWin.push(bottle.angle);
      if (angleWin.length > SETTLE_FRAMES) angleWin.shift();
      let lo = Infinity, hi = -Infinity;
      for (const a of angleWin) { if (a < lo) lo = a; if (a > hi) hi = a; }
      if (angleWin.length >= SETTLE_FRAMES && (hi - lo) < SETTLE_RANGE) {
        if (!hasFlipped) return recordLanding('MISS', null, 'underrotated');   // never completed a 360° — a certain miss
        let angle = ((bottle.angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        if (angle > Math.PI) angle -= 2 * Math.PI;
        const tilt = Math.abs(angle);
        if (tilt < MAKE_ANGLE)    return recordLanding('MAKE', tilt, 'upright');   // upright & settled — won't un-right
        if (tilt >= FALLEN_ANGLE) return recordLanding('MISS', tilt, 'fallen');   // toppled past recovery — certain miss
        // else: settled in the teeter zone — still able to right itself into a
        // make. Don't judge; wait for it to commit (or the cap to fire) below.
      }
    } else {
      angleWin = [];
    }

    return null; // still evaluating
  }

  // ── Bottle creation ────────────────────────────────────────────────────────
  // Three-part compound body that mimics a ~¼-full Gatorade bottle:
  //   • Heavy bottom (liquid region) → low CG → "bowling pin" stability
  //   • Medium upper body
  //   • Light neck
  //
  // With this mass distribution the CG sits ~30px above the base edge, giving
  // a tipping angle ≈ 40°. A landing within ~35° of vertical can right itself;
  // steeper than that and gravity wins — producing the "almost stuck" teeter.
  function createBottle() {
    const cx = canvasW / 2;
    // Spawn resting on the table: base bottom edge (cy+73) sits ~3px above ground
    const cy = groundY - 76;

    // Gatorade bottle — wide, squat, thick base:
    //   liq:  74×70px heavy base (bottom 70px of body)
    //   body: 70×50px upper body
    //   neck: 44×35px wide short neck
    // Compound CG ends up ~34px below cy → bottle.position.y ≈ groundY - 90

    const liq  = Bodies.rectangle(cx, cy + 38, 74, 70, { density: 0.018 }); // heavy liquid base
    const body = Bodies.rectangle(cx, cy - 18, 70, 50, { density: 0.0015 });
    const neck = Bodies.rectangle(cx, cy - 62, 44, 36, { density: 0.0004 });

    const b = Body.create({
      parts: [liq, body, neck],
      frictionAir: 0.025,  // moderate decay — spin nearly stops before landing
      friction:    0.85,   // high — grips the table on landing
      restitution: 0.02,   // near-zero — no bounce, just a thud
      label: 'bottle',
    });

    return b;
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  function init(w, h, bottomInset = 0) {
    canvasW = w;
    canvasH = h;
    lastInset = bottomInset;
    groundY = h - 30 - bottomInset;          // top surface of the table
    clearPlinkoFlags();

    // Rematch / practice restart: drop the previous engine so Matter bodies
    // don't accumulate across a long classroom day.
    if (engine) {
      try { World.clear(engine.world, false); Engine.clear(engine); } catch (_) {}
      bottle = ground = leftWall = rightWall = null;
    }

    engine = Engine.create({ gravity: { y: 1.5, scale: 0.001 } });
    world  = engine.world;
    engine.gravity.y = 1.5;
    engine.gravity.scale = 0.001;

    ground = Bodies.rectangle(w / 2, groundY + 25, w * 6, 50, {
      isStatic: true,
      label: 'ground',
      friction: 0.9,
      restitution: 0.01,
    });

    // Side walls (inner faces at x=WALL_INSET and w-WALL_INSET) — pure inelastic
    // CONTAINMENT only: friction 0 + restitution 0, so a bottle that reaches a
    // wall neither bounces nor gets spin imparted. (Before, the springy carom
    // could right a landing — and because the walls track screen WIDTH, a narrow
    // phone got far more of that free correction than a wide panel, making
    // difficulty inconsistent across devices. Neutralizing equalizes it.)
    const wallOpts = { isStatic: true, label: 'wall', friction: 0, restitution: 0 };
    leftWall  = Bodies.rectangle(WALL_INSET - 20, h / 2, 40, h * 3, wallOpts);
    rightWall = Bodies.rectangle(w - WALL_INSET + 20, h / 2, 40, h * 3, wallOpts);

    World.add(world, [ground, leftWall, rightWall]);
    placeWalls(w, h);

    resetBottle();
  }

  // Re-fit the static world to a new canvas size (resize / orientation change).
  // Without this, groundY + walls keep their original dimensions and the bottle
  // flips against an off-screen floor. Statics only — the caller decides whether
  // to re-place the bottle (safe when it's at rest, not mid-flight).
  function reflow(w, h, bottomInset = 0) {
    if (!engine) return;
    canvasW = w;
    canvasH = h;
    lastInset = bottomInset;
    if (plinkoMode) {
      startPlinko(plinkoTarget);
      return;
    }
    groundY = h - 30 - bottomInset;
    if (!ground) return;
    Body.setPosition(ground, { x: w / 2, y: groundY + 25 });
    placeWalls(w, h);
    // If a viewport shrink moved the deck above the bird, snap it back onto the
    // table. Leaving it under the floor makes the shadow radii go negative and
    // (worse) leaves the turn stuck with a buried body.
    if (bottle && bottle.position.y > groundY - 20) {
      const pad = wallsOn ? WALL_INSET + 40 : 40;
      Body.setPosition(bottle, {
        x: Math.max(pad, Math.min(w - pad, bottle.position.x)),
        y: groundY - 76,
      });
      Body.setVelocity(bottle, { x: 0, y: 0 });
      Body.setAngularVelocity(bottle, 0);
    }
  }

  function resetBottle() {
    if (plinkoMode) {
      init(canvasW, canvasH, lastInset);
      return;
    }
    if (bottle) World.remove(world, bottle);
    groundedFrames = 0;
    plinkoArmed = false;
    angleWin       = [];
    totalRotation  = 0;
    hasFlipped     = false;
    launchAngle    = 0;
    hasLanded      = false;
    wasAirborne    = false;
    lastLandingInfo = null;
    lastFlickInfo    = null;
    liquid.reset();

    bottle = createBottle();
    World.add(world, bottle);
  }

  // Convert a flick gesture (px/s) into a launch — models a wrist snap.
  //   • A quick UPWARD flick tosses the bottle up AND spins it forward.
  //   • Flick STRENGTH (upward speed) drives the spin — harder snap = more
  //     rotation. This is the skill: snap hard enough for one clean 360°.
  //   • Sideways lean only nudges drift + which way it tumbles.
  // Launch height stays in a tight band so airtime is steady and the player
  // is really tuning the *spin* (rotation count) with their flick strength.
  function applyFlick(vx, vy) {
    const upSpeed = Math.max(0, -vy);                  // upward flick speed (px/s)
    const power   = Math.min(upSpeed / POWER_SPEED, 1.0); // 0..1 flick strength
    lastFlickInfo = { upSpeed, power, vx, vy };

    // Small randomness so the same flick isn't a guaranteed make — a centered
    // flick still usually lands, but a marginal one becomes a coin flip.
    const jSpin   = 1 + (Math.random() - 0.5) * FEEL.spinJitter;
    const jLaunch = 1 + (Math.random() - 0.5) * FEEL.launchJitter;
    const jDrift  = (Math.random() - 0.5) * 2.4;       // ±1.2 px/frame stray drift

    // Fairly steady launch height so airtime is consistent — the player is
    // really tuning the *spin* (rotation count) with their flick strength.
    const launchY = -(16 + power * 5) * jLaunch;       // -16 (soft) .. -21 (hard)
    const launchX = Math.max(-6, Math.min(6, vx / 280)) + jDrift; // sideways drift

    // Wrist-snap spin scales with flick strength. Forward by default;
    // a sideways lean flips the tumble direction.
    const dir  = vx >= 0 ? 1 : -1;
    const spin = dir * (SPIN_BASE + power * SPIN_RANGE) * jSpin;

    launchAngle = bottle.angle;
    Body.setVelocity(bottle, { x: launchX, y: launchY });
    Body.setAngularVelocity(bottle, spin);
  }

  function step(dt) {
    if (plinkoMode && bottle && plinkoLayout) steerPlinko();
    Engine.update(engine, dt * 1000);
    if (plinkoMode) {
      plinkoFrames++;
      liquid.update(bottle ? bottle.angularVelocity : 0, dt);
      return;
    }
    // Require a full 360° flip: track angle traveled since launch.
    // Matter's body.angle accumulates (doesn't wrap) so this is exact.
    if (!hasFlipped) {
      totalRotation = Math.abs(bottle.angle - launchAngle);
      if (totalRotation >= 5.6) hasFlipped = true; // ~320° ≈ a completed flip
    }

    // Liquid-driven landing kick: the instant the bottle first comes down on
    // the table, the still-sloshing liquid gives it a shove. Sometimes it
    // sticks, sometimes that extra push tips it over — the "almost stuck then
    // falls" moment. Keeps a good flick from being a guaranteed make.
    if (hasFlipped && !hasLanded && bottle.velocity.y > 0 && bottle.position.y >= groundY - 55) {
      hasLanded = true;
      const kick = (liquid.vel * 0.06 + (Math.random() - 0.5) * 0.16) * FEEL.kickScale;
      Body.setAngularVelocity(bottle, bottle.angularVelocity + kick);
    }

    liquid.update(bottle.angularVelocity, dt);
  }

  function clearPlinkoFlags() {
    plinkoMode = false;
    plinkoArmed = false;
    plinkoLayout = null;
    plinkoPegs = [];
    plinkoSettle = 0;
    plinkoFrames = 0;
    plinkoDone = null;
  }

  function slotCenter(i, layout) {
    return layout.inset + layout.slotW * (i + 0.5);
  }

  function buildPlinkoLayout(w, h) {
    const inset = 6;
    const innerW = w - inset * 2;
    const slotW = innerW / 9;
    const hud = Math.round(Math.min(168, Math.max(96, h * 0.14)));
    const floor = h - hud;
    const bucketH = Math.max(48, Math.min(72, h * 0.085));
    const bucketTop = floor - bucketH;
    const top = 58;
    const pegR = Math.max(5, Math.min(8, slotW * 0.16));
    const ballR = Math.max(7, Math.min(13, slotW * 0.28));
    return { w, h, inset, innerW, slotW, pegR, ballR, top, bucketTop, bucketH, floor };
  }

  function armPlinko(force) {
    plinkoArmed = !!force || Math.random() < (typeof PLINKO_CHANCE === 'number' ? PLINKO_CHANCE : 0.01);
    if (plinkoArmed) plinkoTarget = Math.floor(Math.random() * 9);
    return plinkoArmed;
  }

  function startPlinko(forcedTarget) {
    if (!engine) return plinkoTarget;
    if (Number.isInteger(forcedTarget) && forcedTarget >= 0 && forcedTarget <= 8) {
      plinkoTarget = forcedTarget;
    }
    const w = canvasW, h = canvasH;
    const layout = buildPlinkoLayout(w, h);
    plinkoLayout = layout;
    plinkoMode = true;
    plinkoSettle = 0;
    plinkoFrames = 0;
    plinkoDone = null;
    plinkoArmed = false;

    try { World.clear(world, false); } catch (_) {}
    bottle = ground = leftWall = rightWall = null;
    plinkoPegs = [];

    engine.gravity.y = 1.85;
    engine.gravity.scale = 0.001;

    const wallOpts = { isStatic: true, label: 'wall', friction: 0.04, restitution: 0.45 };
    leftWall  = Bodies.rectangle(layout.inset - 16, h / 2, 32, h * 3, wallOpts);
    rightWall = Bodies.rectangle(w - layout.inset + 16, h / 2, 32, h * 3, wallOpts);
    const floor = Bodies.rectangle(w / 2, layout.floor + 18, w * 2, 36, {
      isStatic: true, label: 'plinko-floor', friction: 0.9, restitution: 0.05,
    });

    const pegs = [];
    const rows = 6;
    const pegTop = layout.top + 28;
    const pegBot = layout.bucketTop - 28;
    for (let row = 0; row < rows; row++) {
      const y = pegTop + (pegBot - pegTop) * (row / (rows - 1));
      const cols = row % 2 === 0 ? 8 : 9;
      const span = layout.innerW - layout.slotW * 0.55;
      for (let c = 0; c < cols; c++) {
        const x = layout.inset + layout.slotW * 0.275 + (cols === 1 ? span / 2 : span * (c / (cols - 1)));
        const peg = Bodies.circle(x, y, layout.pegR, {
          isStatic: true, restitution: 0.72, friction: 0.02, label: 'peg',
        });
        pegs.push(peg);
      }
    }
    plinkoPegs = pegs;

    const dividers = [];
    for (let i = 0; i <= 9; i++) {
      const x = layout.inset + layout.slotW * i;
      dividers.push(Bodies.rectangle(x, layout.bucketTop + layout.bucketH / 2, 5, layout.bucketH + 8, {
        isStatic: true, label: 'divider', friction: 0.4, restitution: 0.15,
      }));
    }

    const startX = slotCenter(plinkoTarget, layout) * 0.22 + (w / 2) * 0.78 + (Math.random() - 0.5) * layout.slotW * 0.8;
    bottle = Bodies.circle(startX, layout.top, layout.ballR, {
      restitution: 0.58,
      friction: 0.04,
      frictionAir: 0.01,
      density: 0.004,
      label: 'bottle',
    });
    Body.setVelocity(bottle, { x: (Math.random() - 0.5) * 3.2, y: 1.2 });
    Body.setAngularVelocity(bottle, (Math.random() - 0.5) * 0.18);

    World.add(world, [leftWall, rightWall, floor, bottle].concat(pegs, dividers));
    return plinkoTarget;
  }

  function steerPlinko() {
    const layout = plinkoLayout;
    const tx = slotCenter(plinkoTarget, layout);
    const dx = tx - bottle.position.x;
    const t = Math.max(0, Math.min(1, (bottle.position.y - layout.top) / (layout.bucketTop - layout.top)));
    const k = 0.00012 + t * t * 0.0016;
    Body.applyForce(bottle, bottle.position, { x: dx * k * bottle.mass, y: 0 });
    if (bottle.position.y > layout.bucketTop - 24) {
      Body.setVelocity(bottle, {
        x: bottle.velocity.x * 0.55 + dx * 0.12,
        y: Math.max(bottle.velocity.y, 0.4),
      });
    }
    // Guarantee the rolled slot if the bounce runs long — equal chance first.
    if (plinkoFrames > 280) {
      Body.setPosition(bottle, { x: tx, y: layout.bucketTop + layout.bucketH * 0.45 });
      Body.setVelocity(bottle, { x: 0, y: 0 });
      Body.setAngularVelocity(bottle, 0);
    }
  }

  function checkPlinko() {
    if (!plinkoMode || !bottle || !plinkoLayout || plinkoDone != null) return plinkoDone;
    const layout = plinkoLayout;
    const inBucket = bottle.position.y >= layout.bucketTop - 6;
    const slow = Math.hypot(bottle.velocity.x, bottle.velocity.y) < 2.4
      && Math.abs(bottle.angularVelocity) < 0.12;
    if (inBucket && slow) plinkoSettle++;
    else plinkoSettle = 0;
    if (plinkoSettle >= 18 || plinkoFrames > 320) {
      plinkoDone = plinkoTarget;
      return plinkoDone;
    }
    return null;
  }

  function getPlinkoState() {
    if (!plinkoMode || !plinkoLayout) return null;
    return {
      layout: plinkoLayout,
      target: plinkoTarget,
      pegs: plinkoPegs.map((p) => ({ x: p.position.x, y: p.position.y, r: p.circleRadius || plinkoLayout.pegR })),
    };
  }

  function getBottle()  { return bottle; }
  function getLiquid()  { return liquid; }
  function getGroundY() { return groundY; }
  function getLastLandingInfo() { return lastLandingInfo; }
  function getLastFlickInfo()   { return lastFlickInfo; }

  return {
    init, reflow, step, resetBottle, applyFlick, checkLanding, setSideWalls,
    armPlinko, startPlinko, checkPlinko, getPlinkoState,
    getBottle, getLiquid, getGroundY, getLastLandingInfo, getLastFlickInfo,
  };
})();
