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
  let plinkoHazards = [];
  let plinkoHazardT = 0;
  let plinkoSettle = 0;
  let plinkoFrames = 0;
  let plinkoDone = null;
  let flickLeftTable = false; // rose well above the standing pose this flick
  let deckOpen = false;       // hatch is open — bird is falling through the table

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
    const restY    = groundY - 76;
    const grounded = bottle.position.y >= restY - 12;

    // Perched CG is ~40px above the rail (measured), not restY (the spawn
    // anchor). Measure the toss from that pose so a normal flick that clearly
    // leaves the table can open the hatch — the old restY-70 check needed a
    // ~107px hop and quietly ignored most classroom tosses.
    const standY = groundY - 40;
    if (standY - bottle.position.y > 64) flickLeftTable = true;

    // Open the hatch before the feet hit the rail so the bird doesn't bounce
    // off a still-solid deck and then teleport into the hold.
    if (plinkoArmed && flickLeftTable && bottle.velocity.y > 0.15) {
      if (bottle.bounds.max.y >= groundY - 110) openDeck();
    }
    if (deckOpen && bottle.position.y > groundY + 28) {
      plinkoArmed = false;
      return 'PLINKO';
    }
    if (deckOpen) return null;

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
    rebuildEngine(1.5);

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
    if (!deckOpen) Body.setPosition(ground, { x: w / 2, y: groundY + 25 });
    placeWalls(w, h);
    // If a viewport shrink moved the deck above the bird, snap it back onto the
    // table. Leaving it under the floor makes the shadow radii go negative and
    // (worse) leaves the turn stuck with a buried body. Skip while the hatch is
    // open — that's the bird falling through on purpose.
    if (!deckOpen && bottle && bottle.position.y > groundY - 20) {
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
    if (plinkoMode || deckOpen) {
      init(canvasW, canvasH, lastInset);
      return;
    }
    if (bottle) World.remove(world, bottle);
    groundedFrames = 0;
    plinkoArmed = false;
    flickLeftTable = false;
    deckOpen = false;
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
    flickLeftTable = false;
    Body.setVelocity(bottle, { x: launchX, y: launchY });
    Body.setAngularVelocity(bottle, spin);
  }

  function step(dt) {
    if (plinkoMode && bottle && plinkoLayout) {
      stepHazards(dt);
      steerPlinko();
    }
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
    if (!deckOpen && hasFlipped && !hasLanded && bottle.velocity.y > 0 && bottle.position.y >= groundY - 55) {
      hasLanded = true;
      const kick = (liquid.vel * 0.06 + (Math.random() - 0.5) * 0.16) * FEEL.kickScale;
      Body.setAngularVelocity(bottle, bottle.angularVelocity + kick);
    }

    liquid.update(bottle.angularVelocity, dt);
  }

  function rebuildEngine(gravityY) {
    if (engine) {
      try { World.clear(engine.world, false); Engine.clear(engine); } catch (_) {}
    }
    bottle = ground = leftWall = rightWall = null;
    plinkoPegs = [];
    plinkoHazards = [];
    engine = Engine.create({ gravity: { y: gravityY, scale: 0.001 } });
    world = engine.world;
    engine.gravity.y = gravityY;
    engine.gravity.scale = 0.001;
  }

  function clearPlinkoFlags() {
    plinkoMode = false;
    plinkoArmed = false;
    plinkoLayout = null;
    plinkoPegs = [];
    plinkoHazards = [];
    plinkoHazardT = 0;
    plinkoSettle = 0;
    plinkoFrames = 0;
    plinkoDone = null;
    flickLeftTable = false;
    deckOpen = false;
  }

  function openDeck() {
    if (deckOpen || !ground) return;
    deckOpen = true;
    ground.collisionFilter.mask = 0;
    ground.collisionFilter.category = 0;
    Body.setPosition(ground, { x: -50000, y: ground.position.y });
  }

  function slotCenter(i, layout) {
    return layout.inset + layout.slotW * (i + 0.5);
  }

  function buildPlinkoLayout(w, h) {
    const inset = 10;
    const innerW = w - inset * 2;
    const slotW = innerW / 9;
    const hud = Math.round(Math.min(176, Math.max(110, h * 0.16)));
    const floor = h - hud;
    const bucketH = Math.max(58, Math.min(86, h * 0.10));
    const bucketTop = floor - bucketH;
    const top = 52;
    const pegR = Math.max(4, Math.min(6, slotW * 0.12));
    const ballR = Math.max(8, Math.min(12, slotW * 0.22));
    return { w, h, inset, innerW, slotW, pegR, ballR, top, bucketTop, bucketH, floor };
  }

  function armPlinko(force, chance) {
    const p = (typeof chance === 'number') ? chance
      : (typeof PLINKO_CHANCE === 'number' ? PLINKO_CHANCE : 0.01);
    plinkoArmed = !!force || Math.random() < p;
    if (plinkoArmed) plinkoTarget = Math.floor(Math.random() * 9);
    return plinkoArmed;
  }

  function startPlinko(forcedTarget) {
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
    flickLeftTable = false;

    const inheritX = bottle ? bottle.position.x : w / 2;
    const inheritVx = bottle ? bottle.velocity.x : (Math.random() - 0.5) * 2.2;
    const inheritVy = bottle ? bottle.velocity.y : 1.6;
    const inheritSpin = bottle ? bottle.angularVelocity : 0;
    deckOpen = false;

    // New engine — World.clear on the live table world left a frozen hold.
    rebuildEngine(1.15);

    const wallOpts = { isStatic: true, label: 'wall', friction: 0.08, restitution: 0.2 };
    leftWall  = Bodies.rectangle(layout.inset - 14, h / 2, 28, h * 3, wallOpts);
    rightWall = Bodies.rectangle(w - layout.inset + 14, h / 2, 28, h * 3, wallOpts);
    const floor = Bodies.rectangle(w / 2, layout.floor + 16, w * 2, 32, {
      isStatic: true, label: 'plinko-floor', friction: 0.95, restitution: 0.02,
    });

    const pegs = [];
    // Four rows, starting below the trade-wind belt so hazards have room.
    const rows = 4;
    const dropH = layout.bucketTop - layout.top;
    const pegTop = layout.top + dropH * 0.20;
    const pegBot = layout.bucketTop - 26;
    for (let row = 0; row < rows; row++) {
      const y = pegTop + (pegBot - pegTop) * (row / (rows - 1));
      const cols = row % 2 === 0 ? 8 : 9;
      const span = layout.innerW - layout.slotW * 0.7;
      for (let c = 0; c < cols; c++) {
        const x = layout.inset + layout.slotW * 0.35 + (cols === 1 ? span / 2 : span * (c / (cols - 1)));
        pegs.push(Bodies.circle(x, y, layout.pegR, {
          isStatic: true, restitution: 0.38, friction: 0.04, label: 'peg',
        }));
      }
    }
    plinkoPegs = pegs;

    const hazardBodies = buildHazards(layout);

    const dividers = [];
    for (let i = 0; i <= 9; i++) {
      const x = layout.inset + layout.slotW * i;
      dividers.push(Bodies.rectangle(x, layout.bucketTop + layout.bucketH / 2, 6, layout.bucketH + 10, {
        isStatic: true, label: 'divider', friction: 0.5, restitution: 0.08,
      }));
    }

    const startX = Math.max(
      layout.inset + layout.ballR + 8,
      Math.min(w - layout.inset - layout.ballR - 8, inheritX)
    );
    bottle = Bodies.circle(startX, layout.top + 6, layout.ballR, {
      restitution: 0.32,
      friction: 0.06,
      frictionAir: 0.012,
      density: 0.006,
      label: 'plinko-ball',
    });
    Body.setVelocity(bottle, {
      x: Math.max(-5, Math.min(5, inheritVx * 0.5)),
      y: Math.max(2.4, Math.min(6.5, inheritVy * 0.42)),
    });
    Body.setAngularVelocity(bottle, Math.max(-0.22, Math.min(0.22, inheritSpin * 0.35)));

    World.add(world, [leftWall, rightWall, floor, bottle].concat(pegs, dividers, hazardBodies));
    return plinkoTarget;
  }

  function yAt(layout, t) {
    return layout.top + (layout.bucketTop - layout.top) * t;
  }

  function clampHazardX(x, half, layout) {
    const lo = layout.inset + 12 + half;
    const hi = layout.w - layout.inset - 12 - half;
    return Math.max(lo, Math.min(hi, x));
  }

  // Pirate-hold movers in the upper ~2/3. Late bucket fairness stays in steerPlinko.
  function buildHazards(layout) {
    const mid = layout.inset + layout.innerW / 2;
    const wood = { isStatic: true, friction: 0.14, restitution: 0.44, label: 'hazard' };
    const hazards = [];

    hazards.push({
      kind: 'wind',
      x: layout.inset + 6,
      y: yAt(layout, 0.06),
      w: layout.innerW * 0.48,
      h: Math.max(42, (layout.bucketTop - layout.top) * 0.10),
      dir: 1,
      period: 2.35,
      phase: 0,
      strength: 0.038,
      label: 'TRADE WIND',
      style: 'gust',
      pulse: 0.6,
    });
    hazards.push({
      kind: 'wind',
      x: layout.inset + layout.innerW * 0.50,
      y: yAt(layout, 0.14),
      w: layout.innerW * 0.48,
      h: Math.max(38, (layout.bucketTop - layout.top) * 0.09),
      dir: -1,
      period: 2.05,
      phase: 1.35,
      strength: 0.036,
      label: 'GUST',
      style: 'gust',
      pulse: 0.6,
    });
    hazards.push({
      kind: 'wind',
      x: layout.inset + layout.innerW * 0.16,
      y: yAt(layout, 0.37),
      w: layout.innerW * 0.68,
      h: Math.max(26, (layout.bucketTop - layout.top) * 0.05),
      dir: 1,
      period: 3.15,
      phase: 0.5,
      strength: 0.030,
      label: 'CANNON BLAST',
      style: 'cannon',
      pulse: 0.4,
    });

    const plankH = Math.max(10, Math.min(14, layout.slotW * 0.28));
    const plankW = layout.slotW * 2.35;
    const plank = Bodies.rectangle(mid, yAt(layout, 0.27), plankW, plankH, wood);
    hazards.push({
      kind: 'plank',
      body: plank,
      cx: mid,
      y: yAt(layout, 0.27),
      w: plankW,
      h: plankH,
      amp: layout.innerW * 0.26,
      period: 2.75,
      phase: 0,
    });

    const crateW = layout.slotW * 1.55;
    const crateH = Math.max(18, Math.min(26, layout.slotW * 0.52));
    const crate = Bodies.rectangle(mid, yAt(layout, 0.54), crateW, crateH, wood);
    hazards.push({
      kind: 'crate',
      body: crate,
      cx: mid,
      y: yAt(layout, 0.54),
      w: crateW,
      h: crateH,
      amp: layout.innerW * 0.30,
      period: 3.45,
      phase: Math.PI,
    });

    const boomW = layout.slotW * 2.55;
    const boomH = Math.max(8, plankH - 2);
    const boomX = clampHazardX(mid - layout.innerW * 0.16, boomW * 0.15, layout);
    const boomY = yAt(layout, 0.43);
    const boom = Bodies.rectangle(boomX, boomY, boomW, boomH, {
      isStatic: true, friction: 0.12, restitution: 0.5, label: 'hazard',
    });
    hazards.push({
      kind: 'boom',
      body: boom,
      cx: boomX,
      cy: boomY,
      w: boomW,
      h: boomH,
      period: 3.7,
    });

    const lanternR = Math.max(9, Math.min(13, layout.slotW * 0.26));
    const pivotX = clampHazardX(mid + layout.innerW * 0.22, lanternR + 8, layout);
    const pivotY = yAt(layout, 0.31);
    const hang = Math.max(26, (layout.bucketTop - layout.top) * 0.052);
    const lantern = Bodies.circle(pivotX, pivotY + hang, lanternR, {
      isStatic: true, friction: 0.04, restitution: 0.64, label: 'hazard-lantern',
    });
    hazards.push({
      kind: 'lantern',
      body: lantern,
      pivotX,
      pivotY,
      hang,
      r: lanternR,
      period: 2.45,
      phase: 0.55,
      swing: 0.72,
    });

    const barrelR = Math.max(11, Math.min(15, layout.slotW * 0.30));
    const barrelY = yAt(layout, 0.64);
    const barrel = Bodies.circle(mid, barrelY, barrelR, {
      isStatic: true, friction: 0.2, restitution: 0.36, label: 'hazard-barrel',
    });
    hazards.push({
      kind: 'barrel',
      body: barrel,
      y: barrelY,
      cx: mid,
      r: barrelR,
      amp: layout.innerW * 0.27,
      period: 4.05,
      phase: 0.25,
    });

    plinkoHazards = hazards;
    plinkoHazardT = 0;
    return hazards.filter((h) => h.body).map((h) => h.body);
  }

  function stepHazards(dt) {
    if (!plinkoLayout) return;
    plinkoHazardT += dt;
    const t = plinkoHazardT;
    const layout = plinkoLayout;
    const steerLine = layout.top + (layout.bucketTop - layout.top) * 0.68;

    for (const h of plinkoHazards) {
      if (h.kind === 'wind') {
        const pulse = 0.28 + 0.72 * (0.5 + 0.5 * Math.sin((t / h.period) * Math.PI * 2 + h.phase));
        h.pulse = pulse;
        if (!bottle || bottle.position.y > steerLine) continue;
        const bx = bottle.position.x, by = bottle.position.y;
        if (bx >= h.x && bx <= h.x + h.w && by >= h.y && by <= h.y + h.h) {
          let force = h.dir * h.strength * pulse;
          const leftGap = bx - layout.inset;
          const rightGap = layout.w - layout.inset - bx;
          if (force < 0 && leftGap < 40) force *= Math.max(0, leftGap / 40);
          if (force > 0 && rightGap < 40) force *= Math.max(0, rightGap / 40);
          Body.applyForce(bottle, bottle.position, {
            x: force * bottle.mass,
            y: -0.0012 * pulse * bottle.mass,
          });
        }
        continue;
      }

      const prevX = h.body.position.x;
      const prevY = h.body.position.y;

      if (h.kind === 'plank' || h.kind === 'crate') {
        const x = clampHazardX(
          h.cx + Math.sin((t / h.period) * Math.PI * 2 + h.phase) * h.amp,
          h.w / 2,
          layout
        );
        Body.setPosition(h.body, { x, y: h.y });
        Body.setVelocity(h.body, { x: (x - prevX) * 2.2, y: 0 });
      } else if (h.kind === 'boom') {
        const ang = (t / h.period) * Math.PI * 2;
        Body.setAngle(h.body, ang);
        Body.setAngularVelocity(h.body, (Math.PI * 2 / h.period) * dt);
      } else if (h.kind === 'lantern') {
        const swing = Math.sin((t / h.period) * Math.PI * 2 + h.phase) * h.swing;
        const x = h.pivotX + Math.sin(swing) * h.hang;
        const y = h.pivotY + Math.cos(swing) * h.hang;
        Body.setPosition(h.body, { x, y });
        Body.setVelocity(h.body, { x: (x - prevX) * 2.2, y: (y - prevY) * 2.2 });
      } else if (h.kind === 'barrel') {
        const u = (t / h.period) * Math.PI * 2 + h.phase;
        const x = clampHazardX(h.cx + Math.sin(u) * h.amp, h.r, layout);
        Body.setPosition(h.body, { x, y: h.y });
        Body.setVelocity(h.body, { x: (x - prevX) * 2.2, y: 0 });
        Body.setAngle(h.body, x / Math.max(h.r, 1));
      }
    }
  }

  function serializeHazard(h) {
    if (h.kind === 'wind') {
      return {
        kind: 'wind',
        x: h.x, y: h.y, w: h.w, h: h.h,
        dir: h.dir,
        pulse: h.pulse || 0.5,
        label: h.label,
        style: h.style || 'gust',
      };
    }
    const p = h.body.position;
    if (h.kind === 'plank' || h.kind === 'crate' || h.kind === 'boom') {
      return { kind: h.kind, x: p.x, y: p.y, w: h.w, h: h.h, angle: h.body.angle || 0 };
    }
    if (h.kind === 'lantern') {
      return {
        kind: 'lantern',
        x: p.x, y: p.y, r: h.r,
        pivotX: h.pivotX, pivotY: h.pivotY,
        glow: 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(plinkoHazardT * 5.5)),
      };
    }
    if (h.kind === 'barrel') {
      return { kind: 'barrel', x: p.x, y: p.y, r: h.r, angle: h.body.angle || 0 };
    }
    return { kind: h.kind };
  }

  function steerPlinko() {
    const layout = plinkoLayout;
    const tx = slotCenter(plinkoTarget, layout);
    const dx = tx - bottle.position.x;
    const t = Math.max(0, Math.min(1, (bottle.position.y - layout.top) / (layout.bucketTop - layout.top)));
    // Light bias only in the lower third so the bounce still reads as plinko.
    if (t > 0.62) {
      Body.applyForce(bottle, bottle.position, { x: dx * 0.0009 * t * bottle.mass, y: 0 });
    }
    if (bottle.position.y > layout.bucketTop - 18) {
      Body.setVelocity(bottle, {
        x: bottle.velocity.x * 0.7 + dx * 0.08,
        y: Math.max(bottle.velocity.y, 0.35),
      });
    }
    if (plinkoFrames > 240) {
      Body.setPosition(bottle, { x: tx, y: layout.bucketTop + layout.bucketH * 0.5 });
      Body.setVelocity(bottle, { x: 0, y: 0 });
      Body.setAngularVelocity(bottle, 0);
    }
  }

  function checkPlinko() {
    if (!plinkoMode || !bottle || !plinkoLayout || plinkoDone != null) return plinkoDone;
    const layout = plinkoLayout;
    const inBucket = bottle.position.y >= layout.bucketTop + 4;
    const slow = Math.hypot(bottle.velocity.x, bottle.velocity.y) < 1.8
      && Math.abs(bottle.angularVelocity) < 0.15;
    if (inBucket && slow) plinkoSettle++;
    else plinkoSettle = 0;
    if (plinkoSettle >= 14 || plinkoFrames > 280) {
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
      hazards: plinkoHazards.map(serializeHazard),
    };
  }

  function getDeckHole() {
    if (!deckOpen || plinkoMode || !bottle) return null;
    return { x: bottle.position.x, r: 58 };
  }

  function getBottle()  { return bottle; }
  function getLiquid()  { return liquid; }
  function getGroundY() { return groundY; }
  function getLastLandingInfo() { return lastLandingInfo; }
  function getLastFlickInfo()   { return lastFlickInfo; }

  return {
    init, reflow, step, resetBottle, applyFlick, checkLanding, setSideWalls,
    armPlinko, startPlinko, checkPlinko, getPlinkoState, getDeckHole,
    getBottle, getLiquid, getGroundY, getLastLandingInfo, getLastFlickInfo,
  };
})();
