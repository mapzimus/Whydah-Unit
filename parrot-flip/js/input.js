// input.js — pointer flick detection (mouse + touch unified)

const Input = (() => {
  let canvas, onFlick;
  let dragging = false;
  let startX = 0, startY = 0, startT = 0;
  let curX = 0, curY = 0;
  let lastX = 0, lastY = 0, lastT = 0;
  let peakSpeed = 0, peakVx = 0, peakVy = 0;  // fastest instant of the gesture
  let samples = [];                            // {t,x,y} for snap-window velocity
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
    samples = [{ t: startT, x: startX, y: startY }];
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
    samples.push({ t: now, x: curX, y: curY });
  }

  function gestureArgs() {
    return {
      samples, pointerType, peakVx, peakVy, peakSpeed,
      startX, startY, curX, curY,
    };
  }

  function fireIfFlick() {
    const v = Flick.velocityFromGesture(gestureArgs());
    if (!v) return;
    onFlick(v.vx, v.vy);
  }

  function onUp(e) {
    if (!dragging || !enabled || e.pointerId !== activePointerId) return;
    dragging = false;
    activePointerId = null;
    fireIfFlick();
  }

  // iOS often fires pointercancel instead of pointerup on a fast upward
  // flick (it thinks the page is scrolling). If the gesture was a real
  // snap, commit it. Tiny wiggles still abort — those were the phantom
  // launches the old cancel→up path created.
  function onCancel(e) {
    if (e.pointerId !== activePointerId) return;
    const commit = dragging && enabled && Flick.shouldCommitCancel(gestureArgs());
    dragging = false;
    activePointerId = null;
    if (commit) fireIfFlick();
  }

  // Returns drag vector for drawing the preview arrow
  function getDragState() {
    if (!dragging) return null;
    return { startX, startY, curX, curY };
  }

  return { attach, enable, disable, getDragState };
})();
