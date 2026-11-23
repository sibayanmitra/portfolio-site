// A field of short segments drifting along a smooth noise field. Near the
// pointer they rotate into one shared direction, like a steering vector.
(function () {
  const canvas = document.getElementById("field");
  const ctx = canvas.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const STEER = -0.6;   // the shared direction, in radians
  const GAP = 24;       // grid spacing in CSS px
  const RADIUS = 170;   // pointer influence radius

  let w, h, dpr, cells = [];
  let px = -1e4, py = -1e4;
  let sweep = reduce ? null : { start: performance.now(), dur: 2200 };
  let raf = 0;

  // value noise, so the resting field reads as a flow rather than static
  const P = new Uint8Array(512);
  for (let i = 0; i < 256; i++) P[i] = i;
  for (let i = 255; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [P[i], P[j]] = [P[j], P[i]]; }
  for (let i = 0; i < 256; i++) P[i + 256] = P[i];
  const fade = (t) => t * t * (3 - 2 * t);
  function noise(x, y) {
    const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x), yf = y - Math.floor(y);
    const a = P[P[xi] + yi] / 255, b = P[P[xi + 1] + yi] / 255;
    const c = P[P[xi] + yi + 1] / 255, d = P[P[xi + 1] + yi + 1] / 255;
    const u = fade(xf), v = fade(yf);
    return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
  }

  function colors() {
    const s = getComputedStyle(document.documentElement);
    return { ink: s.getPropertyValue("--ink").trim(), accent: s.getPropertyValue("--accent").trim() };
  }
  let col = colors();

  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cells = [];
    // quiet zone: soften the field behind the name and links
    const r = document.querySelector(".plate").lastElementChild.getBoundingClientRect();
    const n = document.querySelector(".name").getBoundingClientRect();
    const zx0 = n.left - 40, zx1 = n.right + 40, zy0 = n.top - 30, zy1 = r.bottom + 30;
    const quiet = (x, y) => {
      const ex = Math.max(zx0 - x, 0, x - zx1), ey = Math.max(zy0 - y, 0, y - zy1);
      return 0.3 + 0.7 * Math.min(1, Math.hypot(ex, ey) / 60);
    };
    const ox = (w % GAP) / 2 + GAP / 2, oy = (h % GAP) / 2 + GAP / 2;
    for (let y = oy; y < h; y += GAP) {
      for (let x = ox; x < w; x += GAP) {
        const base = (noise(x / 260, y / 260) * 2 + noise(x / 90, y / 90) * 0.6) * Math.PI;
        cells.push({ x, y, base, a: base, t: 0, q: quiet(x, y) });
      }
    }
  }

  // shortest signed difference between two line orientations (period pi)
  function dAngle(from, to) {
    let d = (to - from) % Math.PI;
    if (d > Math.PI / 2) d -= Math.PI;
    if (d < -Math.PI / 2) d += Math.PI;
    return d;
  }

  function frame(now) {
    raf = 0;
    let moving = false;
    let front = null, sweepK = 0;
    if (sweep) {
      const p = (now - sweep.start) / sweep.dur;
      if (p >= 1) sweep = null;
      else { front = -0.2 * w + p * 1.4 * w; sweepK = Math.sin(Math.PI * Math.min(p * 1.15, 1)); moving = true; }
    }

    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = "round";
    const r2 = RADIUS * RADIUS;

    for (const c of cells) {
      const dx = c.x - px, dy = c.y - py;
      let k = Math.exp(-(dx * dx + dy * dy) / (r2 * 0.5));
      if (front !== null) {
        const f = (c.x - front + (c.y - h / 2) * 0.35) / (w * 0.12);
        k = Math.max(k, Math.exp(-f * f) * sweepK);
      }
      const target = c.base + dAngle(c.base, STEER) * k;
      const da = dAngle(c.a, target);
      const dt = k - c.t;
      if (Math.abs(da) > 0.002 || Math.abs(dt) > 0.002) moving = true;
      c.a += da * 0.14;
      c.t += dt * 0.14;

      const len = 5 + c.t * 5;
      const cx = Math.cos(c.a) * len, cy = Math.sin(c.a) * len;
      ctx.lineWidth = 1 + c.t * 0.6;
      // ink fades out as the accent fades in; both quieter behind the name
      const inkA = 0.16 * (1 - c.t) * c.q, accA = 0.85 * c.t * (0.4 + 0.6 * c.q);
      for (const [style, alpha] of [[col.ink, inkA], [col.accent, accA]]) {
        if (alpha < 0.004) continue;
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = style;
        ctx.beginPath();
        ctx.moveTo(c.x - cx, c.y - cy);
        ctx.lineTo(c.x + cx, c.y + cy);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    if (moving) kick();
  }

  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  window.addEventListener("pointermove", (e) => { px = e.clientX; py = e.clientY; kick(); }, { passive: true });
  window.addEventListener("pointerup", (e) => { if (e.pointerType !== "mouse") { px = py = -1e4; kick(); } });
  window.addEventListener("pointerdown", (e) => { px = e.clientX; py = e.clientY; kick(); });
  document.addEventListener("pointerleave", () => { px = py = -1e4; kick(); });
  window.addEventListener("blur", () => { px = py = -1e4; kick(); });
  window.addEventListener("resize", () => { build(); kick(); });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { col = colors(); kick(); });

  build();
  kick();
  // the name's box changes once the web font arrives; re-measure the quiet zone
  if (document.fonts) document.fonts.ready.then(() => {
    const old = cells; build();
    cells.forEach((c, i) => { if (old[i]) { c.a = old[i].a; c.t = old[i].t; } });
    kick();
  });
})();
