/*
 * Captain Bellamy — engine
 *
 * Canvas plumbing shared by every chapter: fixed logical resolution, a
 * clamped fixed-step loop, unified keyboard/touch/mouse input, particles,
 * screen shake, and small math helpers.
 *
 * The sea is drawn in oblique projection: y position doubles as distance,
 * so anything further up the screen is further out and drawn smaller.
 */
window.ENGINE = (function () {
  "use strict";

  var W = 960;
  var H = 540;
  var HORIZON = 150;
  var SEA_TOP = 186;
  var SEA_BOTTOM = 512;

  /* ---------- math ---------- */

  function clamp(n, a, b) { return n < a ? a : n > b ? b : n; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function chance(p) { return Math.random() < p; }

  /* Depth scale: near the bottom of the sea you are close, so you look big. */
  function depthScale(y) {
    var t = clamp((y - SEA_TOP) / (SEA_BOTTOM - SEA_TOP), 0, 1);
    return 0.52 + t * 0.62;
  }

  function overlaps(a, b) {
    var dx = a.x - b.x;
    var dy = (a.y - b.y) * 1.6; // squash vertically: the sea plane is foreshortened
    var r = a.r + b.r;
    return dx * dx + dy * dy < r * r;
  }

  /* ---------- input ---------- */

  var Input = {
    up: false, down: false, left: false, right: false,
    fire: false, firePressed: false,
    pointerActive: false, pointerX: 0, pointerY: 0,
    anyPressed: false
  };

  var keyMap = {
    ArrowUp: "up", KeyW: "up",
    ArrowDown: "down", KeyS: "down",
    ArrowLeft: "left", KeyA: "left",
    ArrowRight: "right", KeyD: "right",
    Space: "fire", Enter: "fire", KeyJ: "fire", KeyZ: "fire"
  };

  var canvasEl = null;

  function toLogical(clientX, clientY) {
    if (!canvasEl) return { x: 0, y: 0 };
    var r = canvasEl.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / r.width) * W,
      y: ((clientY - r.top) / r.height) * H
    };
  }

  function bindInput(canvas) {
    canvasEl = canvas;

    window.addEventListener("keydown", function (e) {
      var slot = keyMap[e.code];
      if (!slot) return;
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
      e.preventDefault();
      if (slot === "fire" && !Input.fire) Input.firePressed = true;
      Input[slot] = true;
      Input.anyPressed = true;
    }, { passive: false });

    window.addEventListener("keyup", function (e) {
      var slot = keyMap[e.code];
      if (!slot) return;
      e.preventDefault();
      Input[slot] = false;
    }, { passive: false });

    window.addEventListener("blur", function () {
      Input.up = Input.down = Input.left = Input.right = Input.fire = false;
      Input.pointerActive = false;
    });

    function movePointer(clientX, clientY) {
      var p = toLogical(clientX, clientY);
      Input.pointerX = p.x;
      Input.pointerY = p.y;
      Input.pointerActive = true;
    }

    canvas.addEventListener("pointerdown", function (e) {
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
      movePointer(e.clientX, e.clientY);
      Input.anyPressed = true;
      e.preventDefault();
    });
    canvas.addEventListener("pointermove", function (e) {
      if (!Input.pointerActive) return;
      movePointer(e.clientX, e.clientY);
      e.preventDefault();
    });
    function release(e) {
      Input.pointerActive = false;
      if (e) e.preventDefault();
    }
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);
    canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  }

  /* The big touch FIRE button lives in the DOM so it never fights the canvas. */
  function bindFireButton(btn) {
    if (!btn) return;
    function down(e) {
      e.preventDefault();
      if (!Input.fire) Input.firePressed = true;
      Input.fire = true;
      btn.classList.add("is-down");
    }
    function up(e) {
      if (e) e.preventDefault();
      Input.fire = false;
      btn.classList.remove("is-down");
    }
    btn.addEventListener("pointerdown", down);
    btn.addEventListener("pointerup", up);
    btn.addEventListener("pointerleave", up);
    btn.addEventListener("pointercancel", up);
  }

  function consumeFirePress() {
    var v = Input.firePressed;
    Input.firePressed = false;
    return v;
  }

  /* ---------- particles ---------- */

  var particles = [];

  function spawnParticle(p) {
    if (particles.length > 480) particles.shift();
    particles.push({
      x: p.x, y: p.y,
      vx: p.vx || 0, vy: p.vy || 0,
      life: p.life || 0.6, age: 0,
      size: p.size || 3,
      grow: p.grow || 0,
      drag: p.drag == null ? 0.92 : p.drag,
      color: p.color || "#fff",
      shape: p.shape || "dot",
      spin: p.spin || 0,
      rot: p.rot || 0
    });
  }

  function burst(x, y, opts) {
    var o = opts || {};
    var n = o.count || 12;
    for (var i = 0; i < n; i++) {
      var a = o.angle == null ? rand(0, Math.PI * 2) : o.angle + rand(-(o.spread || 1), o.spread || 1);
      var s = rand(o.speedMin || 40, o.speedMax || 180);
      spawnParticle({
        x: x, y: y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s * 0.6,
        life: rand(o.lifeMin || 0.3, o.lifeMax || 0.8),
        size: rand(o.sizeMin || 2, o.sizeMax || 6),
        grow: o.grow || 0,
        drag: o.drag,
        color: Array.isArray(o.color) ? pick(o.color) : (o.color || "#ffd88a"),
        shape: o.shape || "dot",
        spin: o.spin || 0
      });
    }
  }

  function updateParticles(dt) {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.age += dt;
      if (p.age >= p.life) { particles.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(p.drag, dt * 60);
      p.vy *= Math.pow(p.drag, dt * 60);
      p.size += p.grow * dt;
      p.rot += p.spin * dt;
    }
  }

  function drawParticles(ctx) {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var t = p.age / p.life;
      ctx.save();
      ctx.globalAlpha = clamp(1 - t * t, 0, 1);
      ctx.fillStyle = p.color;
      if (p.shape === "square") {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      } else if (p.shape === "ring") {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, p.size), 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function clearParticles() { particles.length = 0; }

  /* ---------- floating score popups ---------- */

  var popups = [];

  function popup(x, y, text, color) {
    popups.push({ x: x, y: y, text: text, color: color || "#ffd88a", age: 0, life: 1.1 });
    if (popups.length > 24) popups.shift();
  }

  function updatePopups(dt) {
    for (var i = popups.length - 1; i >= 0; i--) {
      popups[i].age += dt;
      popups[i].y -= 34 * dt;
      if (popups[i].age >= popups[i].life) popups.splice(i, 1);
    }
  }

  function drawPopups(ctx) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "700 22px 'Cinzel', Georgia, serif";
    for (var i = 0; i < popups.length; i++) {
      var p = popups[i];
      ctx.globalAlpha = clamp(1 - p.age / p.life, 0, 1);
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(6,14,20,0.75)";
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.restore();
  }

  function clearPopups() { popups.length = 0; }

  /* ---------- screen shake + flash ---------- */

  var shake = 0;
  var flash = null;

  function addShake(n) { shake = Math.min(26, shake + n); }
  function setFlash(color, life) { flash = { color: color, age: 0, life: life || 0.25 }; }

  function updateEffects(dt) {
    shake *= Math.pow(0.86, dt * 60);
    if (shake < 0.2) shake = 0;
    if (flash) {
      flash.age += dt;
      if (flash.age >= flash.life) flash = null;
    }
  }

  function applyShake(ctx) {
    if (shake > 0) {
      ctx.translate(rand(-shake, shake), rand(-shake, shake) * 0.6);
    }
  }

  function drawFlash(ctx) {
    if (!flash) return;
    ctx.save();
    ctx.globalAlpha = clamp(1 - flash.age / flash.life, 0, 1) * 0.55;
    ctx.fillStyle = flash.color;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function resetEffects() {
    shake = 0;
    flash = null;
    clearParticles();
    clearPopups();
  }

  /* ---------- canvas setup + loop ---------- */

  function fit(canvas) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    return ctx;
  }

  function startLoop(step) {
    var last = 0;
    var raf = null;
    function frame(ts) {
      raf = requestAnimationFrame(frame);
      if (!last) { last = ts; return; }
      var dt = (ts - last) / 1000;
      last = ts;
      // A dropped frame or a backgrounded tab must never teleport the ship.
      if (dt > 0.05) dt = 0.05;
      step(dt, ts / 1000);
    }
    raf = requestAnimationFrame(frame);
    return function stop() { if (raf) cancelAnimationFrame(raf); };
  }

  return {
    W: W, H: H, HORIZON: HORIZON, SEA_TOP: SEA_TOP, SEA_BOTTOM: SEA_BOTTOM,
    clamp: clamp, lerp: lerp, rand: rand, randInt: randInt, pick: pick, chance: chance,
    depthScale: depthScale, overlaps: overlaps,
    Input: Input, bindInput: bindInput, bindFireButton: bindFireButton,
    consumeFirePress: consumeFirePress,
    burst: burst, spawnParticle: spawnParticle,
    updateParticles: updateParticles, drawParticles: drawParticles,
    popup: popup, updatePopups: updatePopups, drawPopups: drawPopups,
    addShake: addShake, setFlash: setFlash, updateEffects: updateEffects,
    applyShake: applyShake, drawFlash: drawFlash, resetEffects: resetEffects,
    fit: fit, startLoop: startLoop
  };
})();
