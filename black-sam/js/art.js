/*
 * Captain Bellamy — canvas art
 *
 * Everything is drawn procedurally: no image files, no loading, no
 * broken-asset states. Each helper draws in local space around (0,0) so the
 * caller owns position, scale and depth.
 */
window.ART = (function () {
  "use strict";

  var E = window.ENGINE;
  var W = E.W, H = E.H, HORIZON = E.HORIZON;

  /* ---------- palettes ---------- */

  var THEMES = {
    dawn: {
      skyTop: "#1d2f46", skyMid: "#5b4a54", skyLow: "#c98a5d",
      sun: "#ffd9a0", sunY: 132, sunX: 720,
      seaTop: "#20394c", seaMid: "#16293a", seaLow: "#0d1b28",
      foam: "rgba(232,240,246,0.72)", haze: "rgba(255,196,140,0.16)"
    },
    day: {
      skyTop: "#2b5f86", skyMid: "#5f9dbd", skyLow: "#a9d3e2",
      sun: "#fff3cf", sunY: 96, sunX: 250,
      seaTop: "#2b7391", seaMid: "#175a76", seaLow: "#062839",
      foam: "rgba(255,255,255,0.8)", haze: "rgba(180,225,240,0.14)"
    },
    dusk: {
      skyTop: "#141d33", skyMid: "#4a3355", skyLow: "#b5624f",
      sun: "#ffb46a", sunY: 138, sunX: 180,
      seaTop: "#243a4e", seaMid: "#17293a", seaLow: "#0b1622",
      foam: "rgba(240,224,210,0.62)", haze: "rgba(255,150,110,0.14)"
    },
    night: {
      skyTop: "#050c18", skyMid: "#0d1c30", skyLow: "#17324a",
      sun: "#e8e2cc", sunY: 74, sunX: 800, moon: true,
      seaTop: "#12293c", seaMid: "#0a1a28", seaLow: "#050e17",
      foam: "rgba(200,222,235,0.5)", haze: "rgba(120,170,210,0.1)"
    },
    storm: {
      skyTop: "#080d14", skyMid: "#161f2b", skyLow: "#2b3440",
      sun: null,
      seaTop: "#1b2a35", seaMid: "#111d27", seaLow: "#070e15",
      foam: "rgba(226,238,246,0.85)", haze: "rgba(150,170,190,0.08)"
    },
    reef: {
      skyTop: "#0a3a4a", skyMid: "#0d5566", skyLow: "#127a86",
      sun: null,
      seaTop: "#0e6272", seaMid: "#0a4655", seaLow: "#05252f",
      foam: "rgba(190,240,246,0.3)", haze: "rgba(120,230,240,0.12)",
      underwater: true
    }
  };

  var WOOD_LIT = "#5a4127";
  var SAIL = "#e9dcc0";
  var SAIL_DIM = "#c4b491";
  var GOLD = "#e8b45a";

  function theme(name) { return THEMES[name] || THEMES.dusk; }

  /* ---------- sky + sea ---------- */

  function drawSky(ctx, th, t) {
    var g = ctx.createLinearGradient(0, 0, 0, HORIZON + 30);
    g.addColorStop(0, th.skyTop);
    g.addColorStop(0.6, th.skyMid);
    g.addColorStop(1, th.skyLow);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, HORIZON + 30);

    if (th.moon) {
      ctx.save();
      ctx.fillStyle = "rgba(232,236,250,0.9)";
      for (var i = 0; i < 46; i++) {
        var sx = (i * 137.5) % W;
        var sy = ((i * 61.7) % (HORIZON - 20)) + 6;
        ctx.globalAlpha = 0.25 + (0.5 + 0.5 * Math.sin(t * 2 + i)) * 0.5;
        ctx.fillRect(sx, sy, 1.6, 1.6);
      }
      ctx.restore();
    }

    if (th.sun) {
      ctx.save();
      var r = th.moon ? 22 : 34;
      var glow = ctx.createRadialGradient(th.sunX, th.sunY, 2, th.sunX, th.sunY, r * 4);
      glow.addColorStop(0, th.sun);
      glow.addColorStop(0.25, th.sun);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(th.sunX, th.sunY, r * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = th.sun;
      ctx.beginPath();
      ctx.arc(th.sunX, th.sunY, r, 0, Math.PI * 2);
      ctx.fill();
      if (th.moon) {
        ctx.fillStyle = th.skyMid;
        ctx.beginPath();
        ctx.arc(th.sunX - 11, th.sunY - 7, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawClouds(ctx, scroll, heavy) {
    ctx.save();
    ctx.fillStyle = heavy ? "rgba(16,22,30,0.85)" : "rgba(255,255,255,0.1)";
    var bands = heavy ? 5 : 3;
    for (var b = 0; b < bands; b++) {
      var speed = 8 + b * 5;
      var y = 18 + b * 24;
      var off = -((scroll * speed * 0.06) % (W + 400));
      for (var k = 0; k < 3; k++) {
        var x = off + k * (W / 2 + 160) + b * 90;
        ctx.beginPath();
        ctx.ellipse(x, y, 130 + b * 30, 16 + b * 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawSea(ctx, th, scroll, t, opts) {
    opts = opts || {};
    var g = ctx.createLinearGradient(0, HORIZON, 0, H);
    g.addColorStop(0, th.seaTop);
    g.addColorStop(0.45, th.seaMid);
    g.addColorStop(1, th.seaLow);
    ctx.fillStyle = g;
    ctx.fillRect(0, HORIZON, W, H - HORIZON);

    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = th.haze;
    ctx.fillRect(0, HORIZON - 6, W, 14);
    ctx.restore();

    /*
     * Swell: short crest strokes scattered per row rather than lines running
     * the full width — continuous lines read as notebook ruling, not water.
     * Positions come from a cheap hash so they stay stable while scrolling.
     */
    var rows = 20;
    var swell = opts.swell || 1;
    ctx.save();
    ctx.lineCap = "round";
    for (var i = 0; i < rows; i++) {
      var p = i / rows;
      var y = HORIZON + 10 + Math.pow(p, 1.75) * (H - HORIZON - 4);
      var amp = 1 + p * 6 * swell;
      var speed = 26 + p * 250;
      var off = (scroll * speed * 0.02) % 320;
      var perRow = 5 + Math.round(p * 7);
      ctx.strokeStyle = th.foam;
      ctx.lineWidth = 0.9 + p * 2.6 * swell;
      for (var k = 0; k < perRow; k++) {
        // Deterministic pseudo-random spread across the row
        var h = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
        var frac = h - Math.floor(h);
        var h2 = Math.sin(i * 39.346 + k * 11.135) * 24634.6345;
        var frac2 = h2 - Math.floor(h2);
        var x0 = frac * (W + 320) - off - 160;
        if (x0 < -180 || x0 > W + 60) x0 += (x0 < 0 ? 1 : -1) * (W + 320);
        var wlen = (26 + frac2 * 70) * (0.5 + p);
        var wob = Math.sin(x0 * 0.02 + t * (1.1 + p * 2.2) + i) * amp;
        ctx.globalAlpha = (0.05 + p * 0.22) * (0.55 + frac2 * 0.75);
        ctx.beginPath();
        ctx.moveTo(x0, y + wob);
        ctx.quadraticCurveTo(x0 + wlen * 0.5, y + wob - amp * 1.5, x0 + wlen, y + wob);
        ctx.stroke();
      }
    }
    ctx.restore();

    if (th.underwater) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (var r = 0; r < 6; r++) {
        var bx = ((r * 190) + Math.sin(t * 0.4 + r) * 40) % (W + 200) - 100;
        ctx.globalAlpha = 0.05 + 0.03 * Math.sin(t + r);
        var rg = ctx.createLinearGradient(bx, 0, bx + 60, H);
        rg.addColorStop(0, "rgba(180,255,255,0.5)");
        rg.addColorStop(1, "rgba(180,255,255,0)");
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.moveTo(bx, 0);
        ctx.lineTo(bx + 70, 0);
        ctx.lineTo(bx + 190, H);
        ctx.lineTo(bx + 40, H);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }

  /* Distant land — sells "Cape Cod is getting closer". */
  function drawLand(ctx, scroll, opts) {
    opts = opts || {};
    var alpha = opts.alpha == null ? 0.55 : opts.alpha;
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = opts.color || "#16241f";
    var off = -((scroll * 6) % (W + 200));
    for (var k = 0; k < 3; k++) {
      var base = off + k * (W + 200);
      ctx.beginPath();
      ctx.moveTo(base - 200, HORIZON + 2);
      for (var x = -200; x <= W + 260; x += 40) {
        var h = 14 + Math.sin(x * 0.012 + k) * 8 + Math.sin(x * 0.031) * 5;
        ctx.lineTo(base + x, HORIZON + 2 - h * (opts.height || 1));
      }
      ctx.lineTo(base + W + 260, HORIZON + 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /* ---------- ships ---------- */

  var SHIP_STYLES = {
    player:   { hull: "#3b2a18", trim: "#c9a25a", sail: SAIL,     len: 74,  masts: 2, flagBlack: true },
    whydah:   { hull: "#2c1d10", trim: "#d8a24a", sail: "#f2e8cf", len: 132, masts: 3, flagBlack: false },
    merchant: { hull: "#4a3a26", trim: "#8f7a4e", sail: "#dfd3b6", len: 68,  masts: 2, flagBlack: false },
    sloop:    { hull: "#3f3222", trim: "#9a8352", sail: "#d8cbab", len: 54,  masts: 1, flagBlack: false },
    navy:     { hull: "#22303c", trim: "#b9c4cc", sail: "#eef2f4", len: 98,  masts: 3, flagBlack: false, navy: true },
    fishing:  { hull: "#4c3b25", trim: "#7d6a44", sail: "#cfc3a4", len: 42,  masts: 1, flagBlack: false }
  };

  function shipStyle(kind) { return SHIP_STYLES[kind] || SHIP_STYLES.merchant; }

  /*
   * opts: { kind, scale, facing (1 = bow right), bob, roll, damage 0..1,
   *         sinking 0..1, sailFurl 0..1, t, hit 0..1, noWake }
   */
  function drawShip(ctx, x, y, opts) {
    var o = opts || {};
    var st = shipStyle(o.kind);
    var s = o.scale == null ? 1 : o.scale;
    var facing = o.facing == null ? 1 : o.facing;
    var t = o.t || 0;
    var sink = o.sinking || 0;
    var len = st.len;
    var half = len / 2;
    var baseAlpha = sink > 0 ? Math.max(0, 1 - sink * 0.75) : 1;

    ctx.save();
    ctx.translate(x, y + (o.bob || 0) + sink * 26);
    ctx.scale(facing * s, s);
    ctx.rotate((o.roll || 0) + sink * 0.35);
    ctx.globalAlpha = baseAlpha;

    ctx.save();
    ctx.globalAlpha = 0.28 * baseAlpha;
    ctx.fillStyle = "#04121c";
    ctx.beginPath();
    ctx.ellipse(0, 12, half * 1.05, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    var mastH = len * (st.masts >= 3 ? 1.02 : 0.9);

    for (var m = 0; m < st.masts; m++) {
      var mx = -half * 0.45 + (m * len * 0.36);
      var mh = mastH * (m === 1 && st.masts === 3 ? 1.12 : 1);
      ctx.strokeStyle = WOOD_LIT;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(mx, 4);
      ctx.lineTo(mx, -mh);
      ctx.stroke();

      var furl = o.sailFurl || 0;
      if (furl < 0.95) {
        var sw = len * 0.3 * (1 - furl * 0.7);
        var sh = mh * 0.62;
        var belly = Math.sin(t * 2 + m) * 3 + 6;
        ctx.fillStyle = m % 2 ? SAIL_DIM : st.sail;
        ctx.beginPath();
        ctx.moveTo(mx - sw * 0.5, -mh * 0.9);
        ctx.quadraticCurveTo(mx + belly, -mh * 0.9 + sh * 0.5, mx - sw * 0.5, -mh * 0.9 + sh);
        ctx.lineTo(mx + sw * 0.62, -mh * 0.9 + sh);
        ctx.quadraticCurveTo(mx + sw * 0.62 + belly * 0.4, -mh * 0.9 + sh * 0.5, mx + sw * 0.62, -mh * 0.9);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Flag
    var fx = -half * 0.45;
    var flagWave = Math.sin(t * 6) * 2.5;
    ctx.fillStyle = st.flagBlack ? "#0b0d10" : (st.navy ? "#c9d3da" : "#8f2f24");
    ctx.beginPath();
    ctx.moveTo(fx, -mastH);
    ctx.lineTo(fx - 20, -mastH + 3 + flagWave);
    ctx.lineTo(fx, -mastH + 10);
    ctx.closePath();
    ctx.fill();
    if (st.flagBlack) {
      ctx.fillStyle = "#e8e2cc";
      ctx.beginPath();
      ctx.arc(fx - 8, -mastH + 4.5, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Hull
    var hullG = ctx.createLinearGradient(0, -10, 0, 16);
    hullG.addColorStop(0, st.trim);
    hullG.addColorStop(0.28, st.hull);
    hullG.addColorStop(1, "#1a1108");
    ctx.fillStyle = hullG;
    ctx.beginPath();
    ctx.moveTo(-half, -6);
    ctx.lineTo(half * 0.82, -8);
    ctx.quadraticCurveTo(half * 1.12, -6, half, 2);
    ctx.quadraticCurveTo(half * 0.4, 14, -half * 0.55, 13);
    ctx.quadraticCurveTo(-half * 1.02, 10, -half, -6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#0d0a06";
    var ports = st.masts + 2;
    for (var g = 0; g < ports; g++) {
      ctx.fillRect(-half * 0.62 + g * (len * 0.72 / ports), -1, 5, 4);
    }

    ctx.strokeStyle = st.trim;
    ctx.lineWidth = 1.4;
    ctx.globalAlpha = baseAlpha * 0.8;
    ctx.beginPath();
    ctx.moveTo(-half * 0.95, -6.5);
    ctx.lineTo(half * 0.85, -8);
    ctx.stroke();
    ctx.globalAlpha = baseAlpha;

    if (o.damage > 0.35) {
      ctx.fillStyle = "rgba(20,12,8,0.75)";
      ctx.beginPath();
      ctx.arc(half * 0.1, 2, 5 * o.damage, 0, Math.PI * 2);
      ctx.fill();
    }

    if (o.hit > 0) {
      ctx.globalAlpha = o.hit * 0.8;
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.moveTo(-half, -6);
      ctx.lineTo(half * 0.82, -8);
      ctx.quadraticCurveTo(half * 1.12, -6, half, 2);
      ctx.quadraticCurveTo(half * 0.4, 14, -half * 0.55, 13);
      ctx.quadraticCurveTo(-half * 1.02, 10, -half, -6);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();

    if (!o.noWake && sink < 0.2) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = "#dff0f8";
      ctx.beginPath();
      ctx.ellipse(x + facing * half * s * 0.9, y + 12 * s, 14 * s, 4 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /* ---------- diver (Florida wreck chapter) ---------- */

  function drawDiver(ctx, x, y, opts) {
    var o = opts || {};
    var s = o.scale == null ? 1 : o.scale;
    var t = o.t || 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.rotate(o.tilt || 0);

    var kick = Math.sin(t * 9) * 0.5;

    // Rim light — a brown diver on a teal seabed needs help standing out.
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.shadowColor = "rgba(255,226,160,0.95)";
    ctx.shadowBlur = 22;
    ctx.fillStyle = "rgba(255,232,180,0.45)";
    ctx.beginPath();
    ctx.ellipse(0, 0, 17, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = "#2d3f4a";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-4, 2);
    ctx.lineTo(-18, 6 + kick * 8);
    ctx.moveTo(-4, 2);
    ctx.lineTo(-18, -2 - kick * 8);
    ctx.stroke();
    ctx.fillStyle = "#1b2b34";
    ctx.beginPath();
    ctx.ellipse(-21, 7 + kick * 8, 6, 3, 0.4, 0, Math.PI * 2);
    ctx.ellipse(-21, -3 - kick * 8, 6, 3, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7b5a3a";
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8d6b46";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(18, -3 + Math.sin(t * 6) * 2);
    ctx.stroke();
    ctx.fillStyle = "#c99a68";
    ctx.beginPath();
    ctx.arc(11, -5, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8f2f24";
    ctx.fillRect(7, -10, 9, 3);

    if (o.dash > 0) {
      ctx.globalAlpha = o.dash * 0.6;
      ctx.strokeStyle = "#bff0f5";
      ctx.lineWidth = 2;
      for (var i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(-6 - i * 8, 0, 9 - i * 2, -0.8, 0.8);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /* ---------- props ---------- */

  function drawCoin(ctx, x, y, s, t) {
    var wob = Math.abs(Math.cos(t * 5 + x * 0.05));
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = "#8a5f20";
    ctx.beginPath();
    ctx.ellipse(0, 1.5, 8 * wob + 1.5, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.ellipse(0, 0, 8 * wob + 1.5, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = "#fff0c0";
    ctx.beginPath();
    ctx.ellipse(-1.5 * wob, -2, 2.5 * wob + 0.6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawSilverBar(ctx, x, y, s, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(t * 1.5 + x * 0.02) * 0.25);
    ctx.scale(s, s);
    ctx.fillStyle = "#7f8a93";
    ctx.fillRect(-11, -5, 22, 10);
    ctx.fillStyle = "#c9d6de";
    ctx.fillRect(-11, -5, 22, 4);
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = "#eef6fa";
    ctx.fillRect(-8, -4, 8, 2);
    ctx.restore();
  }

  function drawBarrel(ctx, x, y, s, t) {
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 2 + x * 0.03) * 2);
    ctx.scale(s, s);
    ctx.fillStyle = "#6b4a26";
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8a6134";
    ctx.beginPath();
    ctx.ellipse(0, -2, 10, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#3a2a19";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, -4); ctx.lineTo(10, -4);
    ctx.moveTo(-10, 4); ctx.lineTo(10, 4);
    ctx.stroke();
    ctx.restore();
  }

  function drawChest(ctx, x, y, s, t) {
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 2.4 + x * 0.04) * 2);
    ctx.scale(s, s);
    ctx.fillStyle = "#4a3218";
    ctx.fillRect(-14, -6, 28, 14);
    ctx.fillStyle = "#66451f";
    ctx.beginPath();
    ctx.moveTo(-14, -6);
    ctx.quadraticCurveTo(0, -18, 14, -6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = GOLD;
    ctx.fillRect(-3, -8, 6, 8);
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 4);
    ctx.fillStyle = "#fff2c8";
    ctx.fillRect(-2, -7, 4, 3);
    ctx.restore();
  }

  function drawSwimmer(ctx, x, y, s, t) {
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 3 + x * 0.05) * 3);
    ctx.scale(s, s);
    ctx.strokeStyle = "#c99a68";
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.lineTo(6 + Math.sin(t * 8) * 3, -14);
    ctx.stroke();
    ctx.fillStyle = "#c99a68";
    ctx.beginPath();
    ctx.arc(0, -5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8f2f24";
    ctx.fillRect(-5, -9, 10, 3);
    ctx.strokeStyle = "rgba(224,244,252,0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 1, 12, 4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawReef(ctx, x, y, s, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = "#241f1a";
    ctx.beginPath();
    ctx.moveTo(-20, 8);
    ctx.lineTo(-10, -14);
    ctx.lineTo(-2, 0);
    ctx.lineTo(6, -20);
    ctx.lineTo(16, 4);
    ctx.lineTo(22, 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#3d352c";
    ctx.beginPath();
    ctx.moveTo(-10, -14);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-16, 8);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.6 + 0.3 * Math.sin(t * 4 + x);
    ctx.fillStyle = "#e6f3fa";
    ctx.beginPath();
    ctx.ellipse(0, 9, 24, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawUrchin(ctx, x, y, s, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 0.8);
    ctx.scale(s, s);
    ctx.strokeStyle = "#1c1424";
    ctx.lineWidth = 2.5;
    for (var i = 0; i < 12; i++) {
      var a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 7, Math.sin(a) * 7);
      ctx.lineTo(Math.cos(a) * 15, Math.sin(a) * 15);
      ctx.stroke();
    }
    ctx.fillStyle = "#3a2440";
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6b4a78";
    ctx.beginPath();
    ctx.arc(-2, -2, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawShark(ctx, x, y, s, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    var sway = Math.sin(t * 5) * 0.18;
    ctx.rotate(sway * 0.3);
    ctx.fillStyle = "#54636e";
    ctx.beginPath();
    ctx.moveTo(26, 0);
    ctx.quadraticCurveTo(4, -11, -20, -5);
    ctx.lineTo(-30, -12 + sway * 20);
    ctx.lineTo(-26, 0);
    ctx.lineTo(-30, 12 + sway * 20);
    ctx.lineTo(-20, 5);
    ctx.quadraticCurveTo(4, 11, 26, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#3d4a54";
    ctx.beginPath();
    ctx.moveTo(-2, -8);
    ctx.lineTo(6, -20);
    ctx.lineTo(10, -7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#e8eef2";
    ctx.beginPath();
    ctx.arc(18, -2, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawAirBubble(ctx, x, y, s, t) {
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 3 + x) * 3);
    ctx.scale(s, s);
    ctx.strokeStyle = "rgba(210,250,255,0.9)";
    ctx.fillStyle = "rgba(160,230,245,0.28)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.arc(-4, -4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawLogbookPage(ctx, x, y, s, t) {
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 2.2 + x * 0.05) * 4);
    ctx.rotate(Math.sin(t * 1.6) * 0.2);
    ctx.scale(s, s);
    ctx.shadowColor = "rgba(255,225,150,0.9)";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#f4e6c4";
    ctx.fillRect(-9, -12, 18, 24);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#9a7c4a";
    ctx.lineWidth = 1;
    for (var i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(-6, -7 + i * 5);
      ctx.lineTo(6, -7 + i * 5);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCannonball(ctx, b) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#dfe9f0";
    ctx.beginPath();
    ctx.ellipse(b.x - b.vx * 0.02, b.y, 7, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = b.hostile ? "#2a2018" : "#141a20";
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = b.hostile ? "#c9744a" : "#7d8790";
    ctx.beginPath();
    ctx.arc(b.x - 1.5, b.y - 1.5, b.r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* ---------- crew portraits ---------- */

  /*
   * Drawn once each into an offscreen canvas and handed to the port screen as
   * a data URL, so the roster keeps the no-asset-files rule.
   */
  function portrait(face, size) {
    var c = document.createElement("canvas");
    var px = size || 96;
    c.width = px;
    c.height = px;
    var g = c.getContext("2d");
    g.scale(px / 96, px / 96);

    // Background disc
    var bg = g.createLinearGradient(0, 0, 0, 96);
    bg.addColorStop(0, "#1b3646");
    bg.addColorStop(1, "#0d1e2a");
    g.fillStyle = bg;
    g.fillRect(0, 0, 96, 96);

    if (face.goat) {
      drawGoatFace(g);
      return c.toDataURL();
    }

    var young = !!face.young;
    var headR = young ? 21 : 24;
    var cy = young ? 50 : 47;

    // Shoulders / coat
    g.fillStyle = face.coat || "#3d5a6c";
    g.beginPath();
    g.moveTo(12, 96);
    g.quadraticCurveTo(20, 70, 48, 68);
    g.quadraticCurveTo(76, 70, 84, 96);
    g.closePath();
    g.fill();

    // Shirt
    g.fillStyle = "#d9cbaa";
    g.beginPath();
    g.moveTo(38, 70);
    g.lineTo(48, 86);
    g.lineTo(58, 70);
    g.closePath();
    g.fill();

    // Neck + head
    g.fillStyle = shade(face.skin, -0.18);
    g.fillRect(41, cy + headR - 8, 14, 12);
    g.fillStyle = face.skin;
    g.beginPath();
    g.ellipse(48, cy, headR - 2, headR, 0, 0, Math.PI * 2);
    g.fill();

    // Hair
    g.fillStyle = face.hair;
    g.beginPath();
    g.ellipse(48, cy - headR * 0.45, headR - 1, headR * 0.72, 0, Math.PI, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(48 - headR + 3, cy + 2, 4, headR * 0.55, 0, 0, Math.PI * 2);
    g.ellipse(48 + headR - 3, cy + 2, 4, headR * 0.55, 0, 0, Math.PI * 2);
    g.fill();

    if (face.beard) {
      g.beginPath();
      g.ellipse(48, cy + headR * 0.62, headR * 0.68, headR * 0.5, 0, 0, Math.PI * 2);
      g.fill();
    }

    // Eyes
    g.fillStyle = "#1a1410";
    g.beginPath();
    g.arc(41, cy - 1, 2.4, 0, Math.PI * 2);
    g.arc(55, cy - 1, 2.4, 0, Math.PI * 2);
    g.fill();

    // Mouth
    g.strokeStyle = shade(face.skin, -0.45);
    g.lineWidth = 1.8;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(43, cy + (face.beard ? 6 : 9));
    g.quadraticCurveTo(48, cy + (face.beard ? 9 : 12), 53, cy + (face.beard ? 6 : 9));
    g.stroke();

    // Headgear
    if (face.hat === "tricorn") {
      g.fillStyle = "#241a12";
      g.beginPath();
      g.moveTo(20, cy - headR + 4);
      g.quadraticCurveTo(48, cy - headR - 20, 76, cy - headR + 4);
      g.quadraticCurveTo(48, cy - headR + 12, 20, cy - headR + 4);
      g.closePath();
      g.fill();
      g.fillStyle = "#c9a25a";
      g.fillRect(42, cy - headR - 6, 12, 3);
    } else if (face.hat === "scarf") {
      g.fillStyle = "#8f2f24";
      g.beginPath();
      g.ellipse(48, cy - headR * 0.7, headR - 1, headR * 0.5, 0, Math.PI, Math.PI * 2);
      g.fill();
      g.fillRect(27, cy - headR * 0.72, 42, 6);
    } else if (face.hat === "cap") {
      g.fillStyle = "#5d4a30";
      g.beginPath();
      g.ellipse(48, cy - headR * 0.62, headR - 2, headR * 0.55, 0, Math.PI, Math.PI * 2);
      g.fill();
    }

    return c.toDataURL();
  }

  function drawGoatFace(g) {
    // Body hint
    g.fillStyle = "#6b6055";
    g.beginPath();
    g.moveTo(14, 96);
    g.quadraticCurveTo(22, 72, 48, 70);
    g.quadraticCurveTo(74, 72, 82, 96);
    g.closePath();
    g.fill();

    // Head
    g.fillStyle = "#cfc4b2";
    g.beginPath();
    g.ellipse(48, 48, 20, 24, 0, 0, Math.PI * 2);
    g.fill();
    // Muzzle
    g.fillStyle = "#e8e0d2";
    g.beginPath();
    g.ellipse(48, 60, 12, 11, 0, 0, Math.PI * 2);
    g.fill();
    // Horns
    g.strokeStyle = "#8a7a62";
    g.lineWidth = 6;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(37, 30);
    g.quadraticCurveTo(30, 14, 38, 8);
    g.moveTo(59, 30);
    g.quadraticCurveTo(66, 14, 58, 8);
    g.stroke();
    // Ears
    g.fillStyle = "#b8ab97";
    g.beginPath();
    g.ellipse(25, 46, 9, 5, -0.3, 0, Math.PI * 2);
    g.ellipse(71, 46, 9, 5, 0.3, 0, Math.PI * 2);
    g.fill();
    // Eyes — rectangular pupils, because goats
    g.fillStyle = "#f4e6c4";
    g.beginPath();
    g.ellipse(39, 44, 5.5, 4.5, 0, 0, Math.PI * 2);
    g.ellipse(57, 44, 5.5, 4.5, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#1a1410";
    g.fillRect(36, 42.6, 7, 2.8);
    g.fillRect(54, 42.6, 7, 2.8);
    // Beard
    g.fillStyle = "#cfc4b2";
    g.beginPath();
    g.moveTo(43, 68);
    g.lineTo(53, 68);
    g.lineTo(48, 82);
    g.closePath();
    g.fill();
    // A stolen hat, mid-chew
    g.fillStyle = "#241a12";
    g.beginPath();
    g.ellipse(66, 66, 12, 5, -0.4, 0, Math.PI * 2);
    g.fill();
  }

  function shade(hex, amt) {
    var n = parseInt(String(hex).slice(1), 16);
    var r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
    function mix(c) {
      return Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
    }
    return "rgb(" + mix(r) + "," + mix(gg) + "," + mix(b) + ")";
  }

  /* ---------- storm furniture ---------- */

  /*
   * A wave is only fun if the gap reads instantly. So: heavy opaque water
   * with a bright breaking crest, and the gap lit like calm water with
   * chevrons pointing the way through.
   */
  function drawWaveWall(ctx, wave, t) {
    var x = wave.x;
    var gapY = wave.gapY;
    var gapH = wave.gapH;
    var wobble = function (y) { return Math.sin(y * 0.045 + t * 4) * 10; };

    ctx.save();

    function crest(y0, y1) {
      if (y1 <= y0) return;
      // Pale face, dark base: a wave you can see coming in the dark.
      var g = ctx.createLinearGradient(x - 58, 0, x + 58, 0);
      g.addColorStop(0, "rgba(12,24,33,0.1)");
      g.addColorStop(0.3, "rgba(46,80,100,0.9)");
      g.addColorStop(0.62, "rgba(96,140,163,0.95)");
      g.addColorStop(0.9, "rgba(168,206,224,0.98)");
      g.addColorStop(1, "rgba(226,242,250,1)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x + 58, y0);
      for (var y = y0; y <= y1; y += 10) ctx.lineTo(x + 52 + wobble(y), y);
      ctx.lineTo(x + 58, y1);
      ctx.lineTo(x - 58, y1);
      ctx.lineTo(x - 58, y0);
      ctx.closePath();
      ctx.fill();

      // Breaking foam along the face
      ctx.strokeStyle = "rgba(236,248,255,0.92)";
      ctx.lineWidth = 5;
      ctx.lineJoin = "round";
      ctx.beginPath();
      for (var yy = y0; yy <= y1; yy += 8) {
        var wx = x + 52 + wobble(yy);
        if (yy === y0) ctx.moveTo(wx, yy); else ctx.lineTo(wx, yy);
      }
      ctx.stroke();

      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 2;
      for (var streak = 0; streak < 3; streak++) {
        ctx.beginPath();
        for (var y2 = y0; y2 <= y1; y2 += 8) {
          var wx2 = x + 8 + streak * 15 + wobble(y2) * 0.6;
          if (y2 === y0) ctx.moveTo(wx2, y2); else ctx.lineTo(wx2, y2);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    crest(E.SEA_TOP - 30, gapY - gapH / 2);
    crest(gapY + gapH / 2, H + 30);

    // The gap: lit calm water plus chevrons showing the way through
    var gg = ctx.createLinearGradient(x - 58, 0, x + 58, 0);
    gg.addColorStop(0, "rgba(150,220,240,0)");
    gg.addColorStop(0.5, "rgba(150,220,240,0.16)");
    gg.addColorStop(1, "rgba(150,220,240,0)");
    ctx.fillStyle = gg;
    ctx.fillRect(x - 58, gapY - gapH / 2, 116, gapH);

    ctx.globalAlpha = 0.55 + 0.35 * Math.sin(t * 6);
    ctx.strokeStyle = "#bff0f5";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    for (var c = 0; c < 2; c++) {
      var cx = x + 6 + c * 22;
      ctx.beginPath();
      ctx.moveTo(cx + 12, gapY - 16);
      ctx.lineTo(cx, gapY);
      ctx.lineTo(cx + 12, gapY + 16);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* Wreck scenery for the dive chapter: seabed, broken ribs, kelp. */
  function drawWreckScene(ctx, scroll, t) {
    ctx.save();
    // Seabed
    ctx.fillStyle = "#0a2a33";
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (var x = 0; x <= W; x += 30) {
      ctx.lineTo(x, H - 44 - Math.sin((x + scroll * 0.4) * 0.012) * 14);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    // Kelp
    ctx.strokeStyle = "rgba(20,90,80,0.55)";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    for (var k = 0; k < 14; k++) {
      var kx = ((k * 173 - scroll * 0.55) % (W + 200)) - 100;
      var kh = 70 + ((k * 37) % 60);
      ctx.beginPath();
      ctx.moveTo(kx, H - 40);
      for (var s = 0; s < 4; s++) {
        var frac = (s + 1) / 4;
        ctx.lineTo(kx + Math.sin(t * 1.2 + k + frac * 3) * 14 * frac, H - 40 - kh * frac);
      }
      ctx.stroke();
    }

    // Broken hull ribs of the 1715 fleet, deep in the haze
    ctx.globalAlpha = 0.42;
    for (var w = 0; w < 3; w++) {
      var wx = ((w * 520 - scroll * 0.32) % (W + 700)) - 260;
      var wy = H - 60;
      ctx.strokeStyle = "#123c47";
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(wx - 110, wy);
      ctx.quadraticCurveTo(wx, wy - 62, wx + 110, wy);
      ctx.stroke();
      ctx.lineWidth = 6;
      for (var rib = -3; rib <= 3; rib++) {
        var rx = wx + rib * 30;
        var top = wy - 54 + Math.abs(rib) * 9;
        ctx.beginPath();
        ctx.moveTo(rx, wy);
        ctx.quadraticCurveTo(rx + 8, (top + wy) / 2, rx + 4, top);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawLightning(ctx, strike, t) {
    ctx.save();
    if (strike.phase === "warn") {
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 22);
      ctx.strokeStyle = "#ffe9a8";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(strike.x, strike.y, strike.r, strike.r * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.globalAlpha = strike.flash;
      ctx.strokeStyle = "#fffbe8";
      ctx.lineWidth = 5;
      ctx.beginPath();
      var y = 0, x = strike.x;
      ctx.moveTo(x, 0);
      while (y < strike.y) {
        y += 26;
        x += E.rand(-18, 18);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = strike.flash * 0.6;
      ctx.fillStyle = "#fffbe8";
      ctx.beginPath();
      ctx.ellipse(strike.x, strike.y, strike.r, strike.r * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawRain(ctx, t, intensity) {
    ctx.save();
    ctx.strokeStyle = "rgba(190,215,235,0.4)";
    ctx.lineWidth = 1.4;
    var n = Math.round(120 * intensity);
    for (var i = 0; i < n; i++) {
      var seed = i * 97.13;
      var x = (seed * 7 + t * 900) % (W + 200) - 100;
      var y = (seed * 13 + t * 1400) % H;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 9, y + 18);
      ctx.stroke();
    }
    ctx.restore();
  }

  return {
    theme: theme,
    drawSky: drawSky, drawClouds: drawClouds, drawSea: drawSea, drawLand: drawLand,
    drawShip: drawShip, shipStyle: shipStyle, drawDiver: drawDiver,
    drawCoin: drawCoin, drawSilverBar: drawSilverBar, drawBarrel: drawBarrel,
    drawChest: drawChest, drawSwimmer: drawSwimmer, drawReef: drawReef,
    drawUrchin: drawUrchin, drawShark: drawShark, drawAirBubble: drawAirBubble,
    drawLogbookPage: drawLogbookPage, drawCannonball: drawCannonball,
    portrait: portrait,
    drawWaveWall: drawWaveWall, drawWreckScene: drawWreckScene,
    drawLightning: drawLightning, drawRain: drawRain
  };
})();
