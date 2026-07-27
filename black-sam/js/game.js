/*
 * Black Sam — the voyage
 *
 * One continuous action game. You sail, dive, chase and finally try to
 * survive a nor'easter, in the order Bellamy actually lived it. Story is
 * delivered between chapters in a card you can dismiss with one button;
 * the history that matters lives on collectable logbook pages so nobody
 * has to read to play.
 *
 * Between legs you put into port (see crew.js) to hire, promote and pick
 * who sails. That is the only place management happens — during a leg the
 * only verbs are steer and fire.
 */
(function () {
  "use strict";

  var E = window.ENGINE;
  var A = window.ART;
  var CH = window.CHAPTERS;
  var SAVE_KEY = "blacksam.voyage.v2";

  var W = E.W, H = E.H;
  var SEA_TOP = E.SEA_TOP, SEA_BOTTOM = E.SEA_BOTTOM;

  /* ---------- DOM ---------- */

  var C = window.CREW;

  var dom = {};
  ["canvas", "stage", "titleScreen", "cardScreen", "logScreen", "crewScreen", "hudFire",
   "startBtn", "continueBtn", "logBtn", "logBackBtn", "logList", "logCount",
   "cardKicker", "cardTitle", "cardLine", "cardCue", "cardFact", "cardStats",
   "cardBtn", "cardBtn2", "muteBtn", "pauseBtn",
   "crewGold", "crewBerths", "crewStats", "crewHint", "crewList",
   "crewGoBtn", "shareOutBtn"
  ].forEach(function (id) { dom[id] = document.getElementById(id); });

  var ctx = E.fit(dom.canvas);
  E.bindInput(dom.canvas);
  E.bindFireButton(dom.hudFire);

  /* ---------- run state ---------- */

  var screen = "title";      // title | card | play | log
  var paused = false;
  var run = null;            // whole-voyage state
  var lvl = null;            // current chapter state
  var clock = 0;

  function freshRun() {
    return {
      chapter: 0,
      gold: 0,
      goldEarned: 0,   // score counts every coin ever taken, spent or not
      crew: 4,
      hullMax: 6,
      pages: [],
      boarded: 0,
      rescued: 0,
      sunkBy: null,
      officers: {},    // id -> { hired, level, mood }
      berths: [],
      best: loadBest(),
      sound: run ? run.sound : false
    };
  }

  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        chapter: run.chapter, gold: run.gold, goldEarned: run.goldEarned,
        crew: run.crew, pages: run.pages, boarded: run.boarded,
        rescued: run.rescued, officers: run.officers, berths: run.berths,
        sharedThisPort: run.sharedThisPort, sound: run.sound, best: run.best
      }));
    } catch (e) { /* private browsing — the game still plays fine */ }
  }
  function loadSave() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      var d = JSON.parse(raw);
      if (!d || typeof d.chapter !== "number") return null;
      if (d.chapter < 0 || d.chapter >= CH.length) return null;
      return d;
    } catch (e) { return null; }
  }
  function loadBest() {
    try { return parseInt(localStorage.getItem(SAVE_KEY + ".best") || "0", 10) || 0; }
    catch (e) { return 0; }
  }
  function saveBest(n) {
    try { localStorage.setItem(SAVE_KEY + ".best", String(n)); } catch (e) { /* ignore */ }
  }

  function sfx(name) {
    if (window.SFX && window.SFX[name]) { try { window.SFX[name](); } catch (e) { /* ignore */ } }
  }

  /* ---------- chapter setup ---------- */

  function chapterDef() { return CH[run.chapter]; }

  function baseHullMax() {
    return Math.min(9, 6 + Math.floor(run.chapter / 2));
  }

  function startChapter() {
    var def = chapterDef();
    E.resetEffects();
    var stats = C.computeStats(run);
    run.hullMax = baseHullMax() + stats.hullBonus;
    lvl = {
      def: def,
      stats: stats,
      deeds: {
        boards: 0, kills: 0, rescues: 0, pages: 0,
        barrels: 0, pickups: 0, hits: 0, sank: false
      },
      t: 0,
      progress: 0,
      ents: [],
      balls: [],
      timers: {},
      pagesTaken: 0,
      done: false,
      failed: false,
      goalToast: 3.4,
      hintTimer: def.tutorial ? 7 : 0,
      boss: null,
      air: 100,
      dashCd: 0,
      braceCd: 0,
      brace: 0,
      combo: 0,
      comboTimer: 0,
      chapterGold: 0,
      snapshot: {
        gold: run.gold, goldEarned: run.goldEarned,
        crew: run.crew, pages: run.pages.slice()
      }
    };

    (def.spawns || []).forEach(function (s, i) {
      lvl.timers[i] = E.rand(0.4, s.every[1] * 0.6);
    });

    lvl.player = {
      x: def.mode === "dive" ? 200 : 190,
      y: (SEA_TOP + SEA_BOTTOM) / 2,
      vx: 0, vy: 0,
      hp: run.hullMax,
      r: def.mode === "dive" ? 17 : 26,
      inv: 1.2,
      hit: 0,
      reload: 0,
      roll: 0
    };

    if (def.boss) {
      lvl.boss = {
        kind: def.boss.kind,
        x: W - 218, y: (SEA_TOP + SEA_BOTTOM) / 2 - 20,
        vy: 34,
        hp: def.boss.hp, maxHp: def.boss.hp,
        r: 54, hit: 0, fire: 2.5, struck: false, sinking: 0
      };
    }

    dom.hudFire.hidden = false;
    dom.hudFire.textContent = def.mode === "dive" ? "DASH" : def.mode === "storm" ? "BRACE" : "FIRE";
    screen = "play";
    showOnly(null);
    if (window.SFX && run.sound) window.SFX.startSea();
  }

  /* ---------- spawning ---------- */

  function spawnKind(kind) {
    var def = lvl.def;
    var y = E.rand(SEA_TOP + 34, SEA_BOTTOM - 22);
    var x = W + 70;

    switch (kind) {
      case "merchant": case "sloop": case "navy": case "fishing": {
        var hp = kind === "navy" ? 8 : kind === "merchant" ? 4 : kind === "sloop" ? 3 : 1;
        var sp = kind === "navy" ? 58 : kind === "sloop" ? 118 : kind === "fishing" ? 70 : 74;
        lvl.ents.push({
          type: "ship", kind: kind, x: x, y: y,
          vx: -sp, vy: E.rand(-8, 8),
          hp: hp, maxHp: hp,
          r: kind === "navy" ? 36 : kind === "sloop" ? 22 : kind === "fishing" ? 18 : 28,
          fire: kind === "sloop" ? E.rand(1.4, 2.6) : kind === "navy" ? E.rand(1.8, 2.6) : 0,
          struck: false, boardTimer: 0, sinking: 0, hit: 0, furl: 0
        });
        break;
      }
      case "coin": case "barrel": case "swimmer": case "page": case "silver": case "air":
        lvl.ents.push({
          type: "pickup", kind: kind, x: x, y: y,
          vx: -(kind === "swimmer" ? 60 : 120), vy: 0,
          r: kind === "page" ? 22 : 19, taken: false
        });
        break;
      case "reef": case "urchin": case "shark":
        lvl.ents.push({
          type: "hazard", kind: kind, x: x, y: y,
          vx: kind === "shark" ? -95 : -140, vy: 0,
          r: kind === "reef" ? 22 : kind === "shark" ? 24 : 16
        });
        break;
      case "wave": {
        var gapY = E.rand(SEA_TOP + 70, SEA_BOTTOM - 60);
        lvl.ents.push({
          type: "wave", x: W + 60, gapY: gapY,
          gapH: E.lerp(172, 118, lvl.progress),
          vx: -E.lerp(150, 205, lvl.progress), hitOnce: false
        });
        break;
      }
      case "bolt":
        lvl.ents.push({
          type: "bolt", x: E.rand(120, W - 90), y: E.rand(SEA_TOP + 50, SEA_BOTTOM - 30),
          r: 58, phase: "warn", timer: 1.15, flash: 1
        });
        break;
    }
  }

  function updateSpawns(dt) {
    var def = lvl.def;
    (def.spawns || []).forEach(function (s, i) {
      var from = s.from == null ? 0 : s.from;
      var to = s.to == null ? 1 : s.to;
      if (lvl.progress < from || lvl.progress > to) return;
      // Fortune buys extra pages on the leg, not just faster pickups.
      if (s.max && s.kind === "page" && lvl.pagesTaken >= s.max + Math.floor(lvl.stats.luck)) return;
      lvl.timers[i] -= dt;
      if (lvl.timers[i] > 0) return;
      lvl.timers[i] = E.rand(s.every[0], s.every[1]);
      var n = s.count ? E.randInt(s.count[0], s.count[1]) : 1;
      for (var k = 0; k < n; k++) {
        spawnKind(s.kind);
        // Stagger a group so it arrives as a readable line, not a wall.
        var last = lvl.ents[lvl.ents.length - 1];
        if (last && k > 0) { last.x += k * E.rand(34, 60); last.y += E.rand(-26, 26); }
      }
    });
  }

  /* ---------- player ---------- */

  function movePlayer(dt) {
    var p = lvl.player;
    var mode = lvl.def.mode;
    var dive = mode === "dive";
    var xMin = dive ? 70 : 100;
    var xMax = dive ? W - 90 : 540;
    var yMin = SEA_TOP + (dive ? 24 : 18);
    var yMax = SEA_BOTTOM - (dive ? 10 : 16);
    var speed = (dive ? 300 : mode === "storm" ? 320 : 270) * lvl.stats.speed;

    if (E.Input.pointerActive) {
      // Ship rides a little above the finger so a thumb never hides it.
      var tx = E.clamp(E.Input.pointerX, xMin, xMax);
      var ty = E.clamp(E.Input.pointerY - 34, yMin, yMax);
      // Handling has to help drag-steering too, not just the keyboard.
      var k = 1 - Math.pow(0.0016 / lvl.stats.speed, dt);
      p.vx = (tx - p.x) / Math.max(dt, 0.0001) * 0.22;
      p.vy = (ty - p.y) / Math.max(dt, 0.0001) * 0.22;
      p.x = E.lerp(p.x, tx, k);
      p.y = E.lerp(p.y, ty, k);
    } else {
      var ax = 0, ay = 0;
      if (E.Input.left) ax -= 1;
      if (E.Input.right) ax += 1;
      if (E.Input.up) ay -= 1;
      if (E.Input.down) ay += 1;
      if (ax && ay) { ax *= 0.72; ay *= 0.72; }
      p.vx = E.lerp(p.vx, ax * speed, 1 - Math.pow(0.002, dt));
      p.vy = E.lerp(p.vy, ay * speed * 0.85, 1 - Math.pow(0.002, dt));
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    if (lvl.dashActive > 0) p.x += 260 * dt;

    p.x = E.clamp(p.x, xMin, xMax);
    p.y = E.clamp(p.y, yMin, yMax);
    p.roll = E.lerp(p.roll, E.clamp(p.vy / 900, -0.16, 0.16), 1 - Math.pow(0.01, dt));

    if (p.inv > 0) p.inv -= dt;
    if (p.hit > 0) p.hit = Math.max(0, p.hit - dt * 4);
  }

  function fireCannon(spread) {
    var p = lvl.player;
    var s = E.depthScale(p.y);
    var n = (spread ? (run.crew >= 9 ? 3 : 2) : 1) + (spread ? lvl.stats.volley : 0);
    n = Math.min(4, n);
    for (var i = 0; i < n; i++) {
      lvl.balls.push({
        x: p.x + 38 * s, y: p.y - 5 * s + (n > 1 ? (i - (n - 1) / 2) * 12 : 0),
        vx: 620, vy: n > 1 ? (i - (n - 1) / 2) * 40 : 0,
        r: 7, hostile: false, life: 1.6
      });
    }
    E.burst(p.x + 42 * s, p.y - 5 * s, {
      count: 8, angle: 0, spread: 0.5, speedMin: 60, speedMax: 200,
      color: ["#fff0c4", "#e0a45a"], sizeMin: 2, sizeMax: 6, lifeMax: 0.35
    });
    E.addShake(2.2);
    sfx("cannon");
  }

  function updateWeapons(dt) {
    var mode = lvl.def.mode;
    var p = lvl.player;

    if (mode === "dive") {
      lvl.dashCd = Math.max(0, lvl.dashCd - dt);
      lvl.dashActive = Math.max(0, (lvl.dashActive || 0) - dt);
      if (E.consumeFirePress() && lvl.dashCd <= 0) {
        lvl.dashCd = 1.1;
        lvl.dashActive = 0.26;
        p.inv = Math.max(p.inv, 0.42);
        sfx("clash");
        E.burst(p.x - 18, p.y, { count: 14, color: ["#bff0f5", "#8fd8e6"], speedMax: 150, lifeMax: 0.5 });
      }
      return;
    }

    if (mode === "storm") {
      lvl.braceCd = Math.max(0, lvl.braceCd - dt);
      lvl.brace = Math.max(0, lvl.brace - dt);
      if (E.consumeFirePress() && lvl.braceCd <= 0) {
        lvl.braceCd = 3.2;
        lvl.brace = 1.1;
        p.inv = Math.max(p.inv, 1.1);
        sfx("creak");
        E.burst(p.x, p.y, { count: 18, color: ["#dff0f8", "#9fc6dc"], shape: "ring", sizeMax: 10, speedMax: 90, lifeMax: 0.6 });
      }
      return;
    }

    // Sail and chase: a slow auto-fire keeps one-thumb play viable, and
    // holding FIRE gives the fast, aimed rate.
    lvl.player.reload -= dt;
    var holding = E.Input.fire;
    var rate = (holding ? Math.max(0.19, 0.34 - run.crew * 0.008) : 0.85) * lvl.stats.reload;
    if (lvl.player.reload <= 0) {
      lvl.player.reload = rate;
      fireCannon(holding && run.crew >= 6);
    }
    E.consumeFirePress();
  }

  /* ---------- damage + rewards ---------- */

  function hurtPlayer(n, cause) {
    var p = lvl.player;
    if (p.inv > 0 || lvl.done) return;
    p.hp -= n;
    p.inv = 1.35;
    p.hit = 1;
    if (n > 0) lvl.deeds.hits++;
    lvl.combo = 0;
    lvl.comboTimer = 0;
    E.addShake(11);
    E.setFlash("#8f2f24", 0.22);
    sfx("loss");
    E.burst(p.x, p.y, { count: 20, color: ["#e8b45a", "#8f2f24", "#3a2a19"], speedMax: 220, sizeMax: 7 });
    if (p.hp <= 0) {
      p.hp = 0;
      run.sunkBy = cause || "the sea";
      loseChapter();
    }
  }

  function bumpCombo() {
    lvl.comboTimer = 5;
    lvl.combo = Math.min(5, lvl.combo + 1);
  }

  function addGold(n, x, y) {
    var mult = Math.max(1, lvl.combo);
    var total = Math.round(n * mult * lvl.stats.plunder);
    run.gold += total;
    run.goldEarned += total;
    lvl.chapterGold += total;
    E.popup(x, y - 26, "+" + total, "#ffd88a");
    sfx("coins");
  }

  function boardShip(s) {
    var reward = { merchant: 26, sloop: 16, navy: 40, fishing: 8 }[s.kind] || 20;
    var crewGain = (s.kind === "sloop" ? 0 : 1) + lvl.stats.handsPerBoard;
    lvl.deeds.boards++;
    bumpCombo();
    addGold(reward, s.x, s.y);
    if (crewGain) {
      run.crew += crewGain;
      E.popup(s.x, s.y - 52, "+" + crewGain + " crew", "#bfe3ff");
    }
    run.boarded++;
    if (lvl.player.hp < run.hullMax && Math.random() < 0.4) {
      lvl.player.hp++;
      E.popup(s.x, s.y - 76, "+1 hull", "#9fe0a8");
    }
    E.addShake(6);
    E.burst(s.x, s.y, {
      count: 26, color: ["#ffd88a", "#e8b45a", "#fff3d0"],
      speedMax: 260, sizeMax: 7, lifeMax: 1
    });
    s.dead = true;
    sfx("victory");
  }

  function strikeShip(s) {
    s.struck = true;
    lvl.deeds.kills++;
    s.boardTimer = 9;
    s.vx *= 0.28;
    s.fire = 0;
    E.addShake(5);
    E.burst(s.x, s.y - 20, {
      count: 22, color: ["#e9dcc0", "#8a7a58", "#3a2a19"], speedMax: 200, sizeMax: 6
    });
    E.popup(s.x, s.y - 60, "BOARD HER!", "#ffe9a8");
    sfx("clash");
  }

  /* ---------- entity update ---------- */

  function updateEntities(dt) {
    var p = lvl.player;
    var mode = lvl.def.mode;

    for (var i = lvl.ents.length - 1; i >= 0; i--) {
      var e = lvl.ents[i];

      if (e.type === "wave") {
        e.x += e.vx * dt;
        if (!e.hitOnce && Math.abs(p.x - e.x) < 36) {
          var inGap = Math.abs(p.y - e.gapY) < e.gapH / 2 - 8;
          if (!inGap) {
            e.hitOnce = true;
            hurtPlayer(lvl.brace > 0 ? 0 : 1, "the nor'easter");
            if (lvl.brace > 0) E.popup(p.x, p.y - 40, "BRACED", "#9fe0a8");
          } else if (!e.scored) {
            e.scored = true;
            bumpCombo();
            addGold(6, p.x, p.y - 30);
          }
        }
        if (e.x < -80) lvl.ents.splice(i, 1);
        continue;
      }

      if (e.type === "bolt") {
        e.timer -= dt;
        if (e.phase === "warn" && e.timer <= 0) {
          e.phase = "strike";
          e.timer = 0.38;
          e.flash = 1;
          E.setFlash("#ffffff", 0.16);
          E.addShake(9);
          sfx("cannon");
          if (Math.abs(p.x - e.x) < e.r && Math.abs(p.y - e.y) < e.r * 0.5) {
            hurtPlayer(lvl.brace > 0 ? 0 : 1, "lightning");
          }
        } else if (e.phase === "strike") {
          e.flash = Math.max(0, e.timer / 0.38);
          if (e.timer <= 0) lvl.ents.splice(i, 1);
        }
        continue;
      }

      e.x += e.vx * dt;
      e.y += (e.vy || 0) * dt;

      if (e.type === "hazard") {
        if (e.kind === "shark") {
          // Sharks nose toward the diver — slow enough to outswim.
          e.y += E.clamp(p.y - e.y, -1, 1) * 42 * dt;
        }
        if (E.overlaps(p, e)) {
          hurtPlayer(1, e.kind === "reef" ? "a reef" : e.kind);
          e.x -= 40;
        }
      }

      if (e.type === "pickup") {
        // Gentle magnetism: near misses still feel like a catch.
        var dx = p.x - e.x, dy = p.y - e.y;
        var d2 = dx * dx + dy * dy;
        var reach = 90 * lvl.stats.magnet;
        if (d2 < reach * reach) {
          e.x += dx * 2.4 * dt;
          e.y += dy * 2.4 * dt;
        }
        if (E.overlaps(p, e)) {
          collect(e);
          lvl.ents.splice(i, 1);
          continue;
        }
      }

      if (e.type === "ship") {
        e.hit = Math.max(0, e.hit - dt * 4);
        if (e.struck) {
          e.furl = Math.min(1, e.furl + dt * 1.6);
          e.boardTimer -= dt;
          if (e.boardTimer < 3) e.sinking = Math.min(1, e.sinking + dt * 0.34);
          if (Math.random() < dt * 6) {
            E.spawnParticle({
              x: e.x + E.rand(-20, 20), y: e.y - E.rand(0, 30),
              vx: E.rand(-10, 10), vy: -E.rand(20, 50),
              life: 0.9, size: E.rand(3, 8), grow: 6,
              color: "rgba(60,50,42,0.6)"
            });
          }
          if (E.overlaps(p, e)) { boardShip(e); }
          if (e.boardTimer <= 0) e.dead = true;
        } else {
          if (e.fire > 0) {
            e.fire -= dt;
            if (e.fire <= 0 && e.x < W - 30 && e.x > p.x + 60) {
              e.fire = e.kind === "navy" ? E.rand(2.2, 3) : E.rand(1.9, 3.1);
              var shots = e.kind === "navy" ? 3 : 1;
              for (var k = 0; k < shots; k++) {
                var aim = (p.y - e.y) * 0.55 + (k - (shots - 1) / 2) * 46;
                lvl.balls.push({
                  x: e.x - 30, y: e.y - 4,
                  vx: -300, vy: E.clamp(aim, -110, 110),
                  r: 7, hostile: true, life: 3
                });
              }
              E.burst(e.x - 32, e.y - 4, {
                count: 6, angle: Math.PI, spread: 0.5, color: ["#fff0c4", "#c98a5d"],
                speedMax: 140, lifeMax: 0.3
              });
              sfx("cannon");
            }
          }
          if (E.overlaps(p, e)) {
            // Ramming a healthy ship hurts you both.
            e.hp -= 2;
            e.hit = 1;
            hurtPlayer(1, "a collision");
            if (e.hp <= 0) strikeShip(e);
          }
        }
      }

      if (e.dead || e.x < -140 || (e.sinking >= 1)) lvl.ents.splice(i, 1);
    }

    /* cannonballs */
    for (var b = lvl.balls.length - 1; b >= 0; b--) {
      var ball = lvl.balls[b];
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      ball.life -= dt;
      var gone = ball.life <= 0 || ball.x < -40 || ball.x > W + 60;

      if (!ball.hostile) {
        for (var j = 0; j < lvl.ents.length && !gone; j++) {
          var target = lvl.ents[j];
          if (target.type !== "ship" || target.struck) continue;
          if (!E.overlaps(ball, target)) continue;
          target.hp -= 1;
          target.hit = 1;
          gone = true;
          E.burst(ball.x, ball.y, { count: 8, color: ["#fff0c4", "#c9a25a"], speedMax: 160, lifeMax: 0.4 });
          if (target.hp <= 0) strikeShip(target);
        }
        if (!gone && lvl.boss && !lvl.boss.struck && E.overlaps(ball, lvl.boss)) {
          lvl.boss.hp -= 1;
          lvl.boss.hit = 1;
          gone = true;
          E.addShake(2);
          E.burst(ball.x, ball.y, { count: 10, color: ["#fff0c4", "#e9dcc0"], speedMax: 190, lifeMax: 0.45 });
          if (lvl.boss.hp <= 0) strikeBoss();
        }
      } else if (E.overlaps(ball, lvl.player)) {
        gone = true;
        hurtPlayer(1, "cannon fire");
      }

      if (gone) lvl.balls.splice(b, 1);
    }
  }

  function collect(e) {
    var p = lvl.player;
    lvl.deeds.pickups++;
    switch (e.kind) {
      case "coin": addGold(4 + lvl.stats.luck, e.x, e.y); break;
      case "silver": addGold(7 + lvl.stats.luck, e.x, e.y); break;
      case "barrel":
        lvl.deeds.barrels++;
        if (p.hp < run.hullMax) {
          p.hp++;
          E.popup(e.x, e.y - 24, "+1 hull", "#9fe0a8");
        } else {
          addGold(6, e.x, e.y);
        }
        sfx("dig");
        break;
      case "swimmer":
        run.crew++;
        run.rescued++;
        lvl.deeds.rescues++;
        bumpCombo();
        E.popup(e.x, e.y - 24, "+1 crew", "#bfe3ff");
        sfx("victory");
        break;
      case "air":
        lvl.air = Math.min(100, lvl.air + 38);
        E.popup(e.x, e.y - 24, "+ AIR", "#bff0f5");
        sfx("dig");
        break;
      case "page":
        takePage(e);
        break;
    }
    E.burst(e.x, e.y, { count: 10, color: ["#ffd88a", "#fff3d0"], speedMax: 150, lifeMax: 0.5 });
  }

  function takePage(e) {
    lvl.pagesTaken++;
    lvl.deeds.pages++;
    var pool = window.LOGBOOK.filter(function (f) { return run.pages.indexOf(f.id) === -1; });
    if (pool.length) {
      var fact = E.pick(pool);
      run.pages.push(fact.id);
      E.popup(e.x, e.y - 30, "LOGBOOK PAGE", "#ffe9a8");
    } else {
      addGold(12, e.x, e.y);
    }
    bumpCombo();
    sfx("bell");
  }

  /* ---------- boss (the Whydah) ---------- */

  function updateBoss(dt) {
    var b = lvl.boss;
    if (!b) return;
    var p = lvl.player;
    b.hit = Math.max(0, b.hit - dt * 4);

    if (b.struck) {
      b.furl = Math.min(1, (b.furl || 0) + dt * 0.9);
      b.x -= 40 * dt;
      if (E.overlaps(p, b)) {
        run.boarded++;
        run.crew += 6 + lvl.stats.handsPerBoard;
        lvl.deeds.boards++;
        bumpCombo();
        addGold(240, b.x, b.y);
        E.addShake(16);
        E.setFlash("#ffd88a", 0.4);
        E.burst(b.x, b.y, { count: 70, color: ["#ffd88a", "#e8b45a", "#fff3d0"], speedMax: 380, sizeMax: 9, lifeMax: 1.4 });
        sfx("victory");
        b.taken = true;
        winChapter();
      }
      return;
    }

    // Past the scheduled length the gun crews grind her down on their own,
    // so a cautious player can never stall the chase forever.
    if (lvl.t > lvl.def.duration) {
      b.grind = (b.grind || 0) + dt;
      if (b.grind >= 2) {
        b.grind = 0;
        b.hp -= 1;
        b.hit = 0.6;
        if (b.hp <= 0) { strikeBoss(); return; }
      }
    }

    b.y += b.vy * dt;
    if (b.y < SEA_TOP + 60) { b.y = SEA_TOP + 60; b.vy = Math.abs(b.vy); }
    if (b.y > SEA_BOTTOM - 40) { b.y = SEA_BOTTOM - 40; b.vy = -Math.abs(b.vy); }
    b.x = E.lerp(b.x, W - 218 - Math.sin(lvl.t * 0.4) * 40, 1 - Math.pow(0.4, dt));

    b.fire -= dt;
    if (b.fire <= 0) {
      b.fire = E.lerp(2.3, 1.35, 1 - b.hp / b.maxHp);
      var shots = b.hp / b.maxHp < 0.5 ? 4 : 3;
      for (var k = 0; k < shots; k++) {
        lvl.balls.push({
          x: b.x - 60, y: b.y - 6,
          vx: -330, vy: (k - (shots - 1) / 2) * 58 + (p.y - b.y) * 0.25,
          r: 7, hostile: true, life: 4
        });
      }
      E.burst(b.x - 62, b.y - 6, {
        count: 12, angle: Math.PI, spread: 0.6, color: ["#fff0c4", "#c98a5d"], speedMax: 180, lifeMax: 0.4
      });
      sfx("cannon");
    }
  }

  function strikeBoss() {
    var b = lvl.boss;
    b.struck = true;
    b.furl = 0;
    E.addShake(20);
    E.setFlash("#ffffff", 0.3);
    E.popup(b.x, b.y - 90, "SHE STRIKES HER COLOURS", "#ffe9a8");
    E.burst(b.x, b.y - 30, { count: 50, color: ["#e9dcc0", "#8a7a58", "#3a2a19"], speedMax: 300, sizeMax: 9, lifeMax: 1.2 });
    sfx("bell");
  }

  /* ---------- mode extras ---------- */

  function updateDive(dt) {
    lvl.air -= dt * 3.4;
    if (lvl.air <= 0) {
      lvl.air = 0;
      lvl.drown = (lvl.drown || 0) + dt;
      if (lvl.drown >= 1.4) {
        lvl.drown = 0;
        lvl.player.inv = 0;
        hurtPlayer(1, "no air");
      }
    }
    if (Math.random() < dt * 8) {
      E.spawnParticle({
        x: lvl.player.x - 10, y: lvl.player.y - 6,
        vx: E.rand(-8, 8), vy: -E.rand(30, 70),
        life: 1.1, size: E.rand(1.5, 3.5), grow: 1.5,
        color: "rgba(200,245,255,0.55)"
      });
    }
  }

  /* ---------- chapter flow ---------- */

  function winChapter() {
    if (lvl.done) return;
    lvl.done = true;
    lvl.endTimer = 1.5;
    sfx("bell");
  }

  function loseChapter() {
    if (lvl.done) return;
    lvl.done = true;
    lvl.failed = true;
    lvl.deeds.sank = true;
    lvl.endTimer = 1.8;
    E.setFlash("#000000", 0.6);
    E.burst(lvl.player.x, lvl.player.y, {
      count: 50, color: ["#3a2a19", "#8f2f24", "#dff0f8"], speedMax: 340, sizeMax: 10, lifeMax: 1.4
    });
  }

  function finishChapter() {
    dom.hudFire.hidden = true;
    if (lvl.failed) {
      // The storm is the one place sinking is an ending, not a mistake.
      if (lvl.def.final) { showEnding("wreck"); return; }
      showCard({
        kicker: "Chapter " + (run.chapter + 1),
        title: "She's Beaten",
        line: "The " + shipName() + " takes on more water than the crew can throw out. You wash up with nothing but the story.",
        cue: "Lost to " + (run.sunkBy || "the sea") + ".",
        primary: "Try this leg again",
        onPrimary: function () {
          run.gold = lvl.snapshot.gold;
          run.goldEarned = lvl.snapshot.goldEarned;
          run.crew = lvl.snapshot.crew;
          run.pages = lvl.snapshot.pages.slice();
          save();
          startChapter();
        },
        secondary: "Give up the voyage",
        onSecondary: goTitle
      });
      return;
    }

    var def = lvl.def;
    if (def.final) { showEnding("legend"); return; }

    var moodChanges = C.settleMood(run, lvl.deeds);
    run.chapter++;
    save();
    showCard({
      kicker: def.when,
      title: def.title + " — done",
      line: def.outro.line,
      fact: def.outro.fact,
      stats: [
        ["Gold this leg", lvl.chapterGold],
        ["Ships boarded", run.boarded],
        ["Hands", run.crew]
      ],
      moods: moodChanges,
      primary: "Into port",
      onPrimary: showCrew
    });
  }

  function shipName() {
    return run.chapter >= 5 ? "Whydah" : run.chapter >= 2 ? "Marianne" : "sloop";
  }

  /* ---------- scoring + endings ---------- */

  function finalScore() {
    // Everything you ever took, so buying crew never costs you points.
    return run.goldEarned
      + run.crew * 18
      + run.pages.length * 60
      + run.boarded * 12
      + run.rescued * 15;
  }

  function showEnding(kind) {
    var score = finalScore();
    var isBest = score > (run.best || 0);
    if (isBest) { run.best = score; saveBest(score); }
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }

    var body;
    if (kind === "legend") {
      body = {
        kicker: "26 April 1717",
        title: "You Beat the Bar",
        line: "The Whydah scrapes over the sand and holds together. At first light there is a bluff, and a road, and someone standing on it.",
        fact: "It did not happen. The real Whydah was driven onto the bar off Wellfleet that night and broke apart. About 145 men drowned; two survived. Bellamy was twenty-eight."
      };
    } else {
      body = {
        kicker: "26 April 1717",
        title: "The Whydah Goes Down",
        line: "The bar takes her. Masts come down in the dark, and four and a half tons of treasure go into the sand off Wellfleet.",
        fact: "This is what really happened. In 1984 Barry Clifford found the wreck, and a bell reading “THE WHYDAH GALLY 1716” proved it — the only fully authenticated pirate shipwreck ever found."
      };
    }

    showCard({
      kicker: body.kicker,
      title: body.title,
      line: body.line,
      fact: body.fact,
      stats: [
        ["Gold taken", run.goldEarned],
        ["Hands", run.crew],
        ["Ships boarded", run.boarded],
        ["Logbook pages", run.pages.length + " / " + window.LOGBOOK.length],
        [isBest ? "NEW BEST SCORE" : "Score", score]
      ],
      primary: "Sail again",
      onPrimary: function () { run = freshRun(); showBrief(); },
      secondary: "Read the logbook",
      onSecondary: showLog
    });
  }

  /* ---------- screens ---------- */

  function showOnly(node) {
    [dom.titleScreen, dom.cardScreen, dom.logScreen, dom.crewScreen].forEach(function (n) {
      if (n) n.hidden = n !== node;
    });
    if (dom.pauseBtn) dom.pauseBtn.hidden = !!node;
  }

  function goTitle() {
    screen = "title";
    dom.hudFire.hidden = true;
    lvl = null;
    run = run || freshRun();
    refreshContinue();
    showOnly(dom.titleScreen);
  }

  function refreshContinue() {
    var s = loadSave();
    if (dom.continueBtn) {
      dom.continueBtn.hidden = !s || s.chapter === 0;
      if (s && s.chapter > 0) {
        dom.continueBtn.textContent = "Continue — " + CH[s.chapter].title;
      }
    }
  }

  var cardActions = { primary: null, secondary: null };

  function showCard(opts) {
    screen = "card";
    dom.hudFire.hidden = true;
    dom.cardKicker.textContent = opts.kicker || "";
    dom.cardTitle.textContent = opts.title || "";
    dom.cardLine.textContent = opts.line || "";
    dom.cardCue.textContent = opts.cue || "";
    dom.cardCue.hidden = !opts.cue;
    if (opts.fact) {
      dom.cardFact.hidden = false;
      dom.cardFact.innerHTML = '<span class="fact-tag">True story</span>' + escapeHtml(opts.fact);
    } else {
      dom.cardFact.hidden = true;
    }
    if (opts.stats && opts.stats.length) {
      dom.cardStats.hidden = false;
      var html = opts.stats.map(function (row) {
        return '<div class="stat"><dt>' + escapeHtml(row[0]) + "</dt><dd>" + escapeHtml(row[1]) + "</dd></div>";
      }).join("");
      // How the leg landed with the people who sailed it
      if (opts.moods && opts.moods.length) {
        html += '<div class="stat stat-moods"><dt>Crew mood</dt><dd>' +
          opts.moods.map(function (m) {
            var cls = m.delta > 0 ? "up" : m.delta < 0 ? "down" : "flat";
            var arrow = m.delta > 0 ? "▲" : m.delta < 0 ? "▼" : "–";
            return '<span class="mood-chip mood-' + cls + '">' +
              escapeHtml(m.short) + " " + arrow + "</span>";
          }).join("") + "</dd></div>";
      }
      dom.cardStats.innerHTML = html;
    } else {
      dom.cardStats.hidden = true;
    }
    dom.cardBtn.textContent = opts.primary || "Onward";
    cardActions.primary = opts.onPrimary || goTitle;
    if (opts.secondary) {
      dom.cardBtn2.hidden = false;
      dom.cardBtn2.textContent = opts.secondary;
      cardActions.secondary = opts.onSecondary || goTitle;
    } else {
      dom.cardBtn2.hidden = true;
      cardActions.secondary = null;
    }
    showOnly(dom.cardScreen);
    dom.cardBtn.focus({ preventScroll: true });
  }

  function showBrief() {
    var def = chapterDef();
    showCard({
      kicker: "Chapter " + (run.chapter + 1) + " · " + def.when,
      title: def.title,
      line: def.intro.line,
      cue: def.intro.cue,
      primary: "Cast off",
      onPrimary: startChapter
    });
  }

  /* ---------- port: the ship's company ---------- */

  var portraitCache = {};

  function portraitFor(def) {
    if (!portraitCache[def.id]) portraitCache[def.id] = A.portrait(def.face, 96);
    return portraitCache[def.id];
  }

  function showCrew() {
    screen = "crew";
    dom.hudFire.hidden = true;
    renderCrew();
    showOnly(dom.crewScreen);
    dom.crewGoBtn.focus({ preventScroll: true });
  }

  function renderCrew() {
    var berths = C.berthCount(run.chapter);
    var stats = C.computeStats(run);
    // Re-rendering after every tap must not throw the list back to the top.
    var scrollAt = dom.crewList.scrollTop;

    dom.crewGold.textContent = run.gold;
    dom.crewBerths.textContent = run.berths.length + "/" + berths;

    dom.crewStats.innerHTML = C.statBars(stats).map(function (b) {
      return '<li class="stat-bar"><span class="stat-name">' + escapeHtml(b.label) + "</span>" +
        '<span class="stat-track"><span class="stat-fill" style="width:' +
        Math.round(b.frac * 100) + '%"></span></span></li>';
    }).join("");

    var available = C.ROSTER.filter(function (def) { return C.isAvailable(run, def); });

    if (!available.length) {
      dom.crewHint.textContent = "Nobody worth hiring in this port. Sail on.";
      dom.crewList.innerHTML = "";
    } else {
      dom.crewHint.textContent = run.berths.length >= berths
        ? "Every berth is full. Tap someone on deck to stand them down and swap."
        : "Tap a card to send that hand on deck — only the crew on deck change how the ship sails.";
    }

    dom.crewList.innerHTML = available.map(function (def) {
      var rec = run.officers[def.id];
      var hired = !!(rec && rec.hired);
      var deck = C.onDeck(run, def.id);
      var promo = hired ? C.promoteCost(run, def) : null;
      var full = run.berths.length >= berths;

      var stars = "";
      for (var i = 1; i <= 3; i++) {
        stars += '<span class="star' + (hired && rec.level >= i ? " on" : "") + '">★</span>';
      }

      var actions = "";
      if (!hired) {
        actions = '<button type="button" class="crew-btn" data-act="hire" data-id="' + def.id + '"' +
          (run.gold < def.cost ? " disabled" : "") + ">Recruit — " + def.cost + "</button>";
      } else {
        actions = '<button type="button" class="crew-btn' + (deck ? " is-on" : "") +
          '" data-act="berth" data-id="' + def.id + '"' +
          (!deck && full ? " disabled" : "") + ">" +
          (deck ? "On deck ✓" : full ? "No berth free" : "Send on deck") + "</button>";
        if (promo != null) {
          actions += '<button type="button" class="crew-btn crew-btn-soft" data-act="promote" data-id="' + def.id + '"' +
            (run.gold < promo ? " disabled" : "") + ">Promote — " + promo + "</button>";
        }
      }

      var moodPct = hired ? rec.mood : 60;
      var band = C.moodBand(moodPct);

      return '<li class="crew-card' + (deck ? " is-deck" : "") + (hired ? "" : " is-unhired") + '">' +
        '<img class="crew-face" src="' + portraitFor(def) + '" alt="" />' +
        '<div class="crew-body">' +
          '<h3>' + escapeHtml(def.short) + '<span class="crew-stars">' + stars + "</span></h3>" +
          '<p class="crew-role">' + escapeHtml(def.role) + "</p>" +
          '<p class="crew-effect">' + escapeHtml(def.effectText) + "</p>" +
          (hired
            ? '<p class="crew-mood mood-' + band + '"><span class="mood-dot"></span>' +
              escapeHtml(C.moodLabel(moodPct)) + " · " + escapeHtml(def.likesText) + "</p>"
            : '<p class="crew-blurb">' + escapeHtml(def.blurb) + "</p>") +
          '<p class="crew-note">' + escapeHtml(def.note) + "</p>" +
          '<div class="crew-btns">' + actions + "</div>" +
        "</div></li>";
    }).join("");

    Array.prototype.forEach.call(dom.crewList.querySelectorAll("[data-act]"), function (btn) {
      btn.addEventListener("click", onCrewAction);
    });
    dom.crewList.scrollTop = scrollAt;

    dom.shareOutBtn.hidden = !Object.keys(run.officers).length;
    dom.shareOutBtn.disabled = run.gold < C.SHARE_OUT_COST || !!run.sharedThisPort;
    dom.shareOutBtn.textContent = run.sharedThisPort
      ? "Plunder shared out ✓"
      : "Share out the plunder — " + C.SHARE_OUT_COST;

    dom.crewGoBtn.textContent = "Cast off: " + CH[run.chapter].title;
  }

  function onCrewAction(ev) {
    var id = ev.currentTarget.getAttribute("data-id");
    var act = ev.currentTarget.getAttribute("data-act");
    var def = C.byId(id);
    if (!def) return;
    sfx("click");

    if (act === "hire") {
      if (run.gold < def.cost) return;
      run.gold -= def.cost;
      run.officers[id] = { hired: true, level: 1, mood: 62 };
      // Hiring somebody only to leave them ashore is a confusing first move.
      if (run.berths.length < C.berthCount(run.chapter)) run.berths.push(id);
      sfx("coins");
    } else if (act === "promote") {
      var cost = C.promoteCost(run, def);
      if (cost == null || run.gold < cost) return;
      run.gold -= cost;
      run.officers[id].level++;
      sfx("victory");
    } else if (act === "berth") {
      var at = run.berths.indexOf(id);
      if (at !== -1) run.berths.splice(at, 1);
      else if (run.berths.length < C.berthCount(run.chapter)) run.berths.push(id);
    }

    save();
    renderCrew();
  }

  function showLog() {
    screen = "log";
    dom.hudFire.hidden = true;
    var found = run ? run.pages : [];
    dom.logCount.textContent = found.length + " of " + window.LOGBOOK.length + " pages recovered";
    dom.logList.innerHTML = window.LOGBOOK.map(function (f) {
      var have = found.indexOf(f.id) !== -1;
      return '<li class="log-entry' + (have ? "" : " is-locked") + '">' +
        "<h3>" + escapeHtml(have ? f.title : "Waterlogged page") + "</h3>" +
        "<p>" + escapeHtml(have ? f.text : "Find this page floating on the voyage to read it.") + "</p></li>";
    }).join("");
    showOnly(dom.logScreen);
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* ---------- draw ---------- */

  function draw(dt) {
    ctx.save();
    ctx.clearRect(0, 0, W, H);

    if (!lvl) { drawIdleSea(); ctx.restore(); return; }

    var def = lvl.def;
    var th = A.theme(def.theme);
    var storm = def.mode === "storm";

    ctx.save();
    E.applyShake(ctx);

    A.drawSky(ctx, th, clock);
    if (!th.underwater) A.drawClouds(ctx, clock * 60, storm);
    if (def.land) {
      A.drawLand(ctx, clock * 40, {
        alpha: def.land.alpha * (0.5 + 0.5 * lvl.progress),
        height: def.land.height
      });
    }
    A.drawSea(ctx, th, clock * 60, clock, { swell: storm ? 2.4 : 1 });
    if (def.mode === "dive") A.drawWreckScene(ctx, clock * 60, clock);

    // Sort so ships further out are drawn behind nearer ones.
    var drawList = lvl.ents.slice();
    if (lvl.boss) drawList.push({ type: "boss", y: lvl.boss.y, ref: lvl.boss });
    drawList.push({ type: "player", y: lvl.player.y });
    drawList.sort(function (a, b) { return a.y - b.y; });

    drawList.forEach(function (e) { drawEntity(e); });

    lvl.balls.forEach(function (b) { A.drawCannonball(ctx, b); });

    E.drawParticles(ctx);
    if (storm) A.drawRain(ctx, clock, 1);
    if (th.underwater) drawWaterTint();
    E.drawPopups(ctx);
    E.drawFlash(ctx);
    ctx.restore();

    drawHud();
    ctx.restore();
  }

  function drawWaterTint() {
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#0a4655";
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function drawEntity(e) {
    var t = clock;
    if (e.type === "player") { drawPlayer(); return; }
    if (e.type === "boss") {
      var b = e.ref;
      A.drawShip(ctx, b.x, b.y, {
        kind: b.kind, scale: E.depthScale(b.y) * 1.15, facing: -1, t: t,
        bob: Math.sin(t * 1.3) * 4, hit: b.hit, sailFurl: b.furl || 0,
        damage: 1 - b.hp / b.maxHp
      });
      return;
    }

    var s = E.depthScale(e.y);
    switch (e.type) {
      case "ship":
        A.drawShip(ctx, e.x, e.y, {
          kind: e.kind, scale: s, facing: -1, t: t,
          bob: Math.sin(t * 2 + e.x * 0.01) * 2.5,
          hit: e.hit, sailFurl: e.furl, sinking: e.sinking,
          damage: 1 - e.hp / e.maxHp
        });
        if (e.struck) {
          ctx.save();
          ctx.globalAlpha = 0.45 + 0.35 * Math.sin(t * 8);
          ctx.strokeStyle = "#ffe9a8";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(e.x, e.y + 6, e.r * s * 1.5, e.r * s * 0.7, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else if (e.hp < e.maxHp) {
          drawTinyBar(e.x, e.y - 62 * s, 44 * s, e.hp / e.maxHp);
        }
        break;
      case "pickup":
        if (e.kind === "coin") A.drawCoin(ctx, e.x, e.y, s, t);
        else if (e.kind === "silver") A.drawSilverBar(ctx, e.x, e.y, s * 1.45, t);
        else if (e.kind === "barrel") A.drawBarrel(ctx, e.x, e.y, s, t);
        else if (e.kind === "swimmer") A.drawSwimmer(ctx, e.x, e.y, s, t);
        else if (e.kind === "air") A.drawAirBubble(ctx, e.x, e.y, s, t);
        else if (e.kind === "page") A.drawLogbookPage(ctx, e.x, e.y, s * 1.15, t);
        break;
      case "hazard":
        if (e.kind === "reef") A.drawReef(ctx, e.x, e.y, s, t);
        else if (e.kind === "urchin") A.drawUrchin(ctx, e.x, e.y, s, t);
        else if (e.kind === "shark") A.drawShark(ctx, e.x, e.y, s, t);
        break;
      case "wave":
        A.drawWaveWall(ctx, e, t);
        break;
      case "bolt":
        A.drawLightning(ctx, e, t);
        break;
    }
  }

  function drawPlayer() {
    var p = lvl.player;
    var s = E.depthScale(p.y);
    var blink = p.inv > 0 && Math.floor(p.inv * 12) % 2 === 0;
    ctx.save();
    if (blink) ctx.globalAlpha = 0.45;
    if (lvl.def.mode === "dive") {
      A.drawDiver(ctx, p.x, p.y, { scale: s * 1.7, t: clock, tilt: p.roll * 1.6, dash: lvl.dashActive || 0 });
    } else {
      A.drawShip(ctx, p.x, p.y, {
        kind: "player", scale: s, facing: 1, t: clock,
        bob: Math.sin(clock * 2.2) * 2.5, roll: p.roll, hit: p.hit,
        damage: 1 - p.hp / run.hullMax
      });
    }
    ctx.restore();
    if (lvl.brace > 0) {
      ctx.save();
      ctx.globalAlpha = 0.5 * lvl.brace;
      ctx.strokeStyle = "#9fe0a8";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 52 * s, 30 * s, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawTinyBar(x, y, w, frac) {
    ctx.save();
    ctx.fillStyle = "rgba(6,14,20,0.7)";
    ctx.fillRect(x - w / 2, y, w, 5);
    ctx.fillStyle = frac > 0.5 ? "#9fe0a8" : frac > 0.25 ? "#e8b45a" : "#c9584a";
    ctx.fillRect(x - w / 2, y, w * E.clamp(frac, 0, 1), 5);
    ctx.restore();
  }

  function drawIdleSea() {
    var th = A.theme("dawn");
    A.drawSky(ctx, th, clock);
    A.drawClouds(ctx, clock * 60, false);
    A.drawLand(ctx, clock * 40, { alpha: 0.4 });
    A.drawSea(ctx, th, clock * 60, clock, {});
    A.drawShip(ctx, 300, 400, {
      kind: "player", scale: 1.1, facing: 1, t: clock, bob: Math.sin(clock * 1.6) * 4
    });
  }

  /* ---------- HUD ---------- */

  function drawHud() {
    var def = lvl.def;
    ctx.save();
    ctx.textBaseline = "middle";

    // Top scrim so text stays readable over bright sky
    var g = ctx.createLinearGradient(0, 0, 0, 78);
    g.addColorStop(0, "rgba(5,12,18,0.72)");
    g.addColorStop(1, "rgba(5,12,18,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, 78);

    // Hull
    var hx = 24;
    for (var i = 0; i < run.hullMax; i++) {
      var full = i < lvl.player.hp;
      ctx.globalAlpha = full ? 1 : 0.25;
      ctx.fillStyle = full ? (lvl.player.hp <= 2 ? "#e2705f" : "#e8b45a") : "#8fa3b0";
      roundRect(hx + i * 17, 20, 12, 18, 3);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.font = "600 13px 'Source Sans 3', system-ui, sans-serif";
    ctx.fillStyle = "rgba(226,238,246,0.7)";
    ctx.textAlign = "left";
    ctx.fillText("HULL", 24, 48);

    // Gold + crew
    ctx.font = "700 26px 'Cinzel', Georgia, serif";
    ctx.fillStyle = "#ffd88a";
    ctx.textAlign = "left";
    var gx = 24 + run.hullMax * 17 + 26;
    ctx.fillText("◉ " + run.gold, gx, 28);
    ctx.font = "600 13px 'Source Sans 3', system-ui, sans-serif";
    ctx.fillStyle = "rgba(226,238,246,0.7)";
    ctx.fillText("GOLD", gx, 48);

    ctx.font = "700 26px 'Cinzel', Georgia, serif";
    ctx.fillStyle = "#bfe3ff";
    ctx.fillText("⚑ " + run.crew, gx + 118, 28);
    ctx.font = "600 13px 'Source Sans 3', system-ui, sans-serif";
    ctx.fillStyle = "rgba(226,238,246,0.7)";
    ctx.fillText("CREW", gx + 118, 48);

    // Progress / boss bar
    // Keep clear of the pause/mute buttons pinned to the top-right corner.
    var barW = 270, barX = W - barW - 108, barY = 22;
    var frac, label;
    if (lvl.boss) {
      frac = 1 - lvl.boss.hp / lvl.boss.maxHp;
      label = lvl.boss.struck ? "BOARD HER" : "WHYDAH'S RIGGING";
    } else {
      frac = lvl.progress;
      label = def.title.toUpperCase();
    }
    ctx.fillStyle = "rgba(6,14,20,0.65)";
    roundRect(barX, barY, barW, 12, 6);
    ctx.fill();
    var pg = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    pg.addColorStop(0, "#c9a25a");
    pg.addColorStop(1, "#ffe9a8");
    ctx.fillStyle = pg;
    roundRect(barX, barY, Math.max(4, barW * E.clamp(frac, 0, 1)), 12, 6);
    ctx.fill();
    ctx.font = "600 12px 'Source Sans 3', system-ui, sans-serif";
    ctx.fillStyle = "rgba(226,238,246,0.75)";
    ctx.textAlign = "right";
    ctx.fillText(label, barX + barW, 48);

    // Air (dive only)
    if (def.mode === "dive") {
      var ax = W / 2 - 90;
      ctx.fillStyle = "rgba(6,14,20,0.7)";
      roundRect(ax, H - 46, 180, 16, 8);
      ctx.fill();
      ctx.fillStyle = lvl.air < 30 ? "#e2705f" : "#8fe2f0";
      roundRect(ax, H - 46, 180 * (lvl.air / 100), 16, 8);
      ctx.fill();
      ctx.font = "700 12px 'Source Sans 3', system-ui, sans-serif";
      ctx.fillStyle = "#08202a";
      ctx.textAlign = "center";
      ctx.fillText("AIR", W / 2, H - 38);
    }

    // Combo
    if (lvl.combo >= 2) {
      ctx.textAlign = "center";
      ctx.font = "700 34px 'Cinzel', Georgia, serif";
      ctx.globalAlpha = E.clamp(lvl.comboTimer / 1.4, 0, 1);
      ctx.fillStyle = "#ffd88a";
      ctx.fillText("×" + lvl.combo, W - 60, 92);
      ctx.font = "600 11px 'Source Sans 3', system-ui, sans-serif";
      ctx.fillStyle = "rgba(226,238,246,0.75)";
      ctx.fillText("PLUNDER", W - 60, 112);
      ctx.globalAlpha = 1;
    }

    // Goal toast
    if (lvl.goalToast > 0) {
      ctx.globalAlpha = E.clamp(lvl.goalToast, 0, 1);
      ctx.textAlign = "center";
      ctx.font = "700 30px 'Cinzel', Georgia, serif";
      ctx.fillStyle = "#f2e6cc";
      ctx.strokeStyle = "rgba(5,12,18,0.85)";
      ctx.lineWidth = 6;
      ctx.strokeText(def.goal, W / 2, 120);
      ctx.fillText(def.goal, W / 2, 120);
      ctx.globalAlpha = 1;
    }

    // First-chapter control hints
    if (lvl.hintTimer > 0) {
      ctx.globalAlpha = E.clamp(lvl.hintTimer / 2, 0, 0.9);
      ctx.textAlign = "center";
      ctx.font = "600 18px 'Source Sans 3', system-ui, sans-serif";
      ctx.fillStyle = "#e2eef6";
      ctx.strokeStyle = "rgba(5,12,18,0.8)";
      ctx.lineWidth = 5;
      var hint = "Drag anywhere to steer  ·  arrow keys work too";
      ctx.strokeText(hint, W / 2, H - 70);
      ctx.fillText(hint, W / 2, H - 70);
      ctx.globalAlpha = 1;
    }

    if (paused) {
      ctx.fillStyle = "rgba(5,12,18,0.72)";
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.font = "700 46px 'Cinzel', Georgia, serif";
      ctx.fillStyle = "#f2e6cc";
      ctx.fillText("Paused", W / 2, H / 2 - 10);
      ctx.font = "600 18px 'Source Sans 3', system-ui, sans-serif";
      ctx.fillStyle = "rgba(226,238,246,0.8)";
      ctx.fillText("Tap the pause button or press P to sail on", W / 2, H / 2 + 34);
    }

    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /* ---------- loop ---------- */

  E.startLoop(function (dt) {
    clock += dt;

    if (screen === "play" && lvl && !paused) {
      lvl.t += dt;

      if (!lvl.done) {
        if (lvl.boss) {
          // The chase ends when the Whydah is boarded, not when time runs out.
          lvl.progress = Math.min(0.99, lvl.t / lvl.def.duration);
        } else {
          lvl.progress = lvl.t / lvl.def.duration;
          if (lvl.progress >= 1) winChapter();
        }
        movePlayer(dt);
        updateWeapons(dt);
        updateSpawns(dt);
        updateEntities(dt);
        if (lvl.boss) updateBoss(dt);
        if (lvl.def.mode === "dive") updateDive(dt);
      } else {
        movePlayer(dt);
        updateEntities(dt);
        lvl.endTimer -= dt;
        if (lvl.endTimer <= 0) { finishChapter(); }
      }

      lvl.goalToast = Math.max(0, lvl.goalToast - dt);
      lvl.hintTimer = Math.max(0, lvl.hintTimer - dt);
      if (lvl.comboTimer > 0) {
        lvl.comboTimer -= dt;
        if (lvl.comboTimer <= 0) lvl.combo = 0;
      }
    }

    E.updateParticles(dt);
    E.updatePopups(dt);
    E.updateEffects(dt);
    draw(dt);
  });

  /* ---------- wiring ---------- */

  dom.startBtn.addEventListener("click", function () {
    run = freshRun();
    save();
    showBrief();
  });

  dom.continueBtn.addEventListener("click", function () {
    var s = loadSave();
    run = freshRun();
    if (s) {
      run.chapter = s.chapter;
      run.gold = s.gold || 0;
      run.goldEarned = s.goldEarned || s.gold || 0;
      run.crew = s.crew || 4;
      run.pages = s.pages || [];
      run.boarded = s.boarded || 0;
      run.rescued = s.rescued || 0;
      run.officers = s.officers || {};
      run.berths = s.berths || [];
      run.sharedThisPort = !!s.sharedThisPort;
      run.sound = !!s.sound;
    }
    // Resuming drops you in port so you can see the company before sailing.
    if (run.chapter > 0) showCrew(); else showBrief();
  });

  dom.logBtn.addEventListener("click", function () {
    run = run || freshRun();
    var s = loadSave();
    if (s && s.pages && !run.pages.length) run.pages = s.pages;
    showLog();
  });
  dom.logBackBtn.addEventListener("click", goTitle);

  dom.crewGoBtn.addEventListener("click", function () {
    run.sharedThisPort = false;
    save();
    showBrief();
  });

  dom.shareOutBtn.addEventListener("click", function () {
    if (run.sharedThisPort) return;
    if (!C.shareOut(run)) return;
    run.sharedThisPort = true;
    sfx("coins");
    save();
    renderCrew();
  });

  dom.cardBtn.addEventListener("click", function () {
    if (cardActions.primary) cardActions.primary();
  });
  dom.cardBtn2.addEventListener("click", function () {
    if (cardActions.secondary) cardActions.secondary();
  });

  dom.muteBtn.addEventListener("click", function () {
    run = run || freshRun();
    run.sound = !run.sound;
    if (window.SFX) {
      window.SFX.setMuted(!run.sound);
      if (run.sound) { window.SFX.startSea(); window.SFX.click(); }
    }
    dom.muteBtn.textContent = run.sound ? "♫" : "♪";
    dom.muteBtn.setAttribute("aria-label", run.sound ? "Sound on" : "Sound off");
    save();
  });

  function togglePause() {
    if (screen !== "play") return;
    paused = !paused;
    dom.pauseBtn.textContent = paused ? "▶" : "❚❚";
  }
  dom.pauseBtn.addEventListener("click", togglePause);

  window.addEventListener("keydown", function (e) {
    if (e.code === "KeyP" || e.code === "Escape") { togglePause(); }
    if (e.code === "Enter" && screen === "card") {
      e.preventDefault();
      if (cardActions.primary) cardActions.primary();
    }
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden && screen === "play") {
      paused = true;
      dom.pauseBtn.textContent = "▶";
    }
  });

  (function init() {
    run = freshRun();
    var s = loadSave();
    if (s) run.sound = !!s.sound;
    if (window.SFX) window.SFX.setMuted(!run.sound);
    dom.muteBtn.textContent = run.sound ? "♫" : "♪";
    goTitle();
  })();
})();
