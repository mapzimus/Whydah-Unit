// flick.js — turn a pointer gesture into launch velocity (px/s).
// Mouse keeps peak-sample speed. Touch/pen use the last SNAP_MS of motion
// so a noisy 8k px/s sample can't max-power a soft toss, and a pause
// before the snap doesn't kill it.

const Flick = (() => {
  const MIN_DRAG = 22;       // px — ignore taps
  const SNAP_MS = 90;        // window that is the actual wrist snap
  const TOUCH_GAIN = 1.25;   // a 140px / 90ms toss → ~1950 px/s (make band)
  const CANCEL_MIN_UP = 400; // px/s — real upward snap, not a cancel wiggle

  function snapVelocity(samples) {
    if (!samples || samples.length < 2) return { vx: 0, vy: 0 };
    const b = samples[samples.length - 1];
    const t0 = b.t - SNAP_MS;
    let a = samples[0];
    for (let i = 0; i < samples.length; i++) {
      if (samples[i].t <= t0) a = samples[i];
    }
    const dt = Math.max((b.t - a.t) / 1000, 0.016);
    return { vx: (b.x - a.x) / dt, vy: (b.y - a.y) / dt };
  }

  function velocityFromGesture({
    samples, pointerType, peakVx, peakVy, peakSpeed,
    startX, startY, curX, curY,
  }) {
    const dx = curX - startX, dy = curY - startY;
    const dist = Math.hypot(dx, dy);
    if (dist < MIN_DRAG) return null;

    if (pointerType === 'touch' || pointerType === 'pen') {
      const snap = snapVelocity(samples);
      return { vx: snap.vx * TOUCH_GAIN, vy: snap.vy * TOUCH_GAIN };
    }

    let vx = peakVx, vy = peakVy;
    if (peakSpeed < 80) { vx = dx * 10; vy = dy * 10; }
    return { vx, vy };
  }

  function shouldCommitCancel(args) {
    const v = velocityFromGesture(args);
    if (!v) return false;
    return -v.vy >= CANCEL_MIN_UP;
  }

  return { MIN_DRAG, SNAP_MS, TOUCH_GAIN, velocityFromGesture, shouldCommitCancel, snapVelocity };
})();
