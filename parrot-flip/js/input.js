// input.js — pointer flick detection (mouse + touch unified)

const Input = (() => {
  const MIN_DRAG = 22;   // px — small dead zone so a quick flick registers
  // Touch samples jump; a "soft" finger flick still reports 5–10k px/s peaks.
  // Scale those down so a gentle toss stays in the make window (~2k px/s).
  const TOUCH_VEL_SCALE = 0.40;

  let canvas, onFlick;
  let dragging = false;
  let startX = 0, startY = 0, startT = 0;
  let curX = 0, curY = 0;
  let lastX = 0, lastY = 0, lastT = 0;
  let peakSpeed = 0, peakVx = 0, peakVy = 0;  // fastest instant of the gesture
  let rect = null;                             // canvas rect, captured at gesture start
  let enabled = false;
  let activePointerId = null;                  // the one pointer that owns the in-flight flick
  let pointerType = 'mouse';

  function attach(cvs, flickCallback) {
    canvas  = cvs;
    onFlick = flickCallback;

    canvas.addEventListener('pointerdown',  onDown);
    canvas.addEventListener('pointermove',  onMove);
    canvas.addEventListener('pointerup',    onUp);
    canvas.addEventListener('pointercancel', onCancel);
  }

  function enable()  { enabled = true;  }
  function disable() { enabled = false; dragging = false; activePointerId = null; }

  function onDown(e) {
    if (!enabled) return;
    // Single-flick ownership: ignore extra fingers while one flick is in flight,
    // so a second touch (or a palm) can't hijack the in-progress drag state.
    if (dragging) return;
    e.preventDefault();
    activePointerId = e.pointerId;
    pointerType = e.pointerType || 'mouse';
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    dragging = true;
    // Capture the canvas rect ONCE at gesture start. Recomputing it per move
    // event means a mid-gesture chrome shift (e.g. a mobile address bar
    // collapsing) injects a fake dy and biases the flick's vertical speed.
    rect = canvas.getBoundingClientRect();
    startX = curX = lastX = e.clientX - rect.left;
    startY = curY = lastY = e.clientY - rect.top;
    startT = lastT = performance.now();
    peakSpeed = peakVx = peakVy = 0;
  }

  function onMove(e) {
    if (!dragging || !rect || e.pointerId !== activePointerId) return;
    e.preventDefault();
    curX = e.clientX - rect.left;
    curY = e.clientY - rect.top;
    const now = performance.now();
    const dt = Math.max((now - lastT) / 1000, 0.001);
    const ivx = (curX - lastX) / dt;   // instantaneous velocity this sample
    const ivy = (curY - lastY) / dt;
    const spd = Math.hypot(ivx, ivy);
    // Capture the fastest instant — that's the "snap", robust to a pause
    // before release (which would otherwise read as zero velocity).
    if (spd > peakSpeed) { peakSpeed = spd; peakVx = ivx; peakVy = ivy; }
    lastX = curX; lastY = curY; lastT = now;
  }

  function onUp(e) {
    if (!dragging || !enabled || e.pointerId !== activePointerId) return;
    dragging = false;
    activePointerId = null;

    const dx = curX - startX, dy = curY - startY;
    const dist = Math.hypot(dx, dy);
    if (dist < MIN_DRAG) return;

    // Use the gesture's peak velocity. Fall back to a distance estimate if
    // we somehow captured almost no motion (e.g. one big jump then release).
    let vx = peakVx, vy = peakVy;
    if (peakSpeed < 80) { vx = dx * 10; vy = dy * 10; }

    // Touch/pen: one noisy sample can look like a max-power snap. Blend the
    // peak with the gesture-average, then scale so a soft flick stays soft.
    if (pointerType === 'touch' || pointerType === 'pen') {
      const dur = Math.max((performance.now() - startT) / 1000, 0.06);
      vx = 0.55 * vx + 0.45 * (dx / dur);
      vy = 0.55 * vy + 0.45 * (dy / dur);
      vx *= TOUCH_VEL_SCALE;
      vy *= TOUCH_VEL_SCALE;
    }

    onFlick(vx, vy);
  }

  // A pointercancel (palm rejection, OS gesture interrupt, lost capture) must
  // ABORT the gesture WITHOUT firing a flick. The old code routed cancel to
  // onUp, so an interrupted drag could launch a phantom flick.
  function onCancel(e) {
    if (e.pointerId !== activePointerId) return;
    dragging = false;
    activePointerId = null;
  }

  // Returns drag vector for drawing the preview arrow
  function getDragState() {
    if (!dragging) return null;
    return { startX, startY, curX, curY };
  }

  return { attach, enable, disable, getDragState };
})();
