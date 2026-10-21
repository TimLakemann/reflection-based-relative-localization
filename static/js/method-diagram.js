/* Interactive side-view of the method (Sec. II of the paper).
   The SVG is built from the same geometry the paper uses: the reflection cone has its apex at the
   observer's mirror image a = [0, 0, -2 z_o], the direct cone has its apex at the observer, and the
   transmitter is found where samples of the first fall inside the second. */
(function () {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const SURF = 290;                 // surface line (SVG y grows downward)
  const O = [130, 200];             // observer
  const A = [130, 2 * SURF - O[1]]; // mirrored observer, apex of the reflection cone
  const T = [610, 130];             // transmitter (truth)
  const D2R = Math.PI / 180;

  const HALF_REF = 4.5 * D2R;       // exaggerated so the cones are readable at this scale
  const HALF_DIR = 3.5 * D2R;
  const LEN_REF = 640;
  const LEN_DIR = 650;

  const STEPS = [
    {
      kicker: "Overview",
      title: "Two views of the same light",
      color: "var(--c-ink)",
      body: `<p>The observer's camera sees a teammate's blinking LEDs directly, and again as a reflection on the surface below.
        Each sighting, together with its uncertainty, becomes a cone of positions where the teammate could be.</p>
        <p>The teammate lies where the two cones meet. Sampling that intersection and filtering it over time gives a 3D
        position from <strong>one camera and one rangefinder</strong>, with no knowledge of the teammate's size or marker layout.</p>
        <p class="ref">Use the numbered steps or Next to walk through the pipeline.</p>`,
    },
    {
      kicker: "Step 1 · Detect & identify",
      title: "Find the blinking LEDs and their reflection",
      color: "var(--c-ref)",
      body: `<p>A transmitting UAV carries UV LEDs that blink a unique sequence. The observer's camera tracks the blinking
        points and decodes the sequence, so it knows which team member it is looking at.</p>
        <p>The light shows up twice in the image: once from the LEDs themselves and once as their reflection on the surface below.
        At the higher exposure needed to see the reflection, one LED can break up into several blobs, so detections within
        \\(r_c\\) pixels are clustered. The dominant cluster is the direct light \\(p_d\\), and a cluster vertically below it is the reflection \\(p_r\\).
        If the sequence cannot be decoded in the reflection, \\(p_r\\) is still found geometrically, directly below \\(p_d\\).</p>`,
    },
    {
      kicker: "Step 2 · Bearings",
      title: "Turn pixels into gravity-aligned rays",
      color: "var(--c-dir)",
      body: `<p>The calibrated fisheye model converts both centroids into unit bearing vectors and removes the observer's roll \\(\\psi\\) and pitch \\(\\phi\\):</p>
        <div class="eq">\\[\\hat{\\mathbf b}_{d,r} = \\mathbf R(-\\psi)\\,\\mathbf R(-\\phi)\\;\\mathrm{cam2world}(p_{d,r})\\]</div>
        <p>Intersecting the two rays directly would be ill-conditioned: small pixel errors and surface ripples
        would cause large range errors. The method uses cones instead.</p>
        <p class="ref">Eqs. (1)–(2)</p>`,
    },
    {
      kicker: "Step 3 · Reflection point",
      title: "Place the reflection on the surface",
      color: "var(--c-ref)",
      body: `<p>A single-beam rangefinder measures the observer's height \\(z_o\\). Scaling the reflection ray until it reaches the surface gives the reflection point:</p>
        <div class="eq">\\[\\vec r = \\Big[\\,|z_o|\\tfrac{\\hat x_r}{|\\hat z_r|},\\;\\; |z_o|\\tfrac{\\hat y_r}{|\\hat z_r|},\\;\\; -z_o\\Big]^{\\top}\\]</div>
        <p>This is the only metric measurement the method needs. Surface orientation is never measured. The surface is assumed level, and the Results section shows how much tilt it tolerates.</p>
        <p class="ref">Eqs. (3)–(5)</p>`,
    },
    {
      kicker: "Step 4 · Reflection cone",
      title: "A cone from the mirror image",
      color: "var(--c-ref)",
      body: `<p>Seen from the reflection, the light comes from the observer's mirror image at \\(\\vec a = [0,\\,0,\\,-2z_o]^{\\top}\\).
        The reflection is smeared by shallow viewing angles and surface roughness. The farthest bright pixels above
        threshold \\(\\sigma\\), vertically \\((p_v)\\) and horizontally \\((p_h)\\), give the half-angles \\(\\alpha_r^{\\max}\\) and \\(\\upsilon_r^{\\max}\\).</p>
        <p>The result is a finite elliptical cone from \\(\\vec a\\) through \\(\\vec r\\) up to the maximum height \\(z_m\\).
        Rough water simply makes the cone wider.</p>
        <p class="ref">Eqs. (6)–(11)</p>`,
    },
    {
      kicker: "Step 5 · Direct cone",
      title: "A cone around the direct bearing",
      color: "var(--c-dir)",
      body: `<p>Limited resolution and detection noise give the direct bearing an uncertainty too. A second elliptical cone with
        half-angles \\(\\alpha_d^{\\max}\\) and \\(\\upsilon_d^{\\max}\\) is placed around \\(\\hat{\\mathbf b}_d\\), with its apex at the observer and extending to \\(x_m\\).</p>
        <p>Neither cone alone fixes the range. The direct cone knows the direction and the reflection cone knows the height.</p>
        <p class="ref">Eqs. (12)–(14)</p>`,
    },
    {
      kicker: "Step 6 · Sample & intersect",
      title: "Keep samples that lie in both cones",
      color: "var(--c-inl)",
      body: `<p>Instead of solving the non-linear cone intersection, \\(n\\) points are drawn uniformly from the reflection cone,
        only above the surface (\\(l_r \\ge \\lVert\\vec a-\\vec r\\rVert\\)). Each one is projected onto the direct cone's axis and kept if it falls inside its elliptical cross-section:</p>
        <div class="eq">\\[\\frac{(\\vec p_i-\\vec p_{i\\parallel})_y^2}{(\\lVert\\vec p_{i\\parallel}\\rVert\\tan\\upsilon_d^{\\max})^2}+\\frac{(\\vec p_i-\\vec p_{i\\parallel})_z^2}{(\\lVert\\vec p_{i\\parallel}\\rVert\\tan\\alpha_d^{\\max})^2}\\le 1\\]</div>
        <p>The surviving inliers sample where the teammate can be.</p>
        <p class="ref">Eqs. (15)–(18)</p>`,
    },
    {
      kicker: "Step 7 · Particle filter",
      title: "Filter the inliers over time",
      color: "var(--c-est)",
      body: `<p>The inliers are the observations for a particle filter with \\(n_p\\) particles and a constant-velocity motion model.
        Weights come from a robust Cauchy kernel, and particles are resampled when the effective sample size drops below \\(n_p/2\\).</p>
        <p>The weighted particle cloud gives the teammate's relative position. It runs onboard at 8.4&nbsp;Hz on an Intel NUC and 6.8&nbsp;Hz on a Raspberry&nbsp;Pi&nbsp;5.</p>
        <p class="ref">Sec. II, Tab. I</p>`,
    },
  ];

  /* ---------- tiny helpers ---------- */
  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function group(parent, steps, extra) {
    const g = el("g", Object.assign({ class: "dg", "data-s": steps }, extra || {}), parent);
    return g;
  }
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const mul = (a, s) => [a[0] * s, a[1] * s];
  const len = (a) => Math.hypot(a[0], a[1]);
  const unit = (a) => mul(a, 1 / len(a));
  const rot = (v, t) => [v[0] * Math.cos(t) - v[1] * Math.sin(t), v[0] * Math.sin(t) + v[1] * Math.cos(t)];
  const pts = (arr) => arr.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");

  function rng(seed) {
    let s = seed >>> 0;
    const r = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    r.gauss = () => { let u = 0, v = 0; while (!u) u = r(); v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    return r;
  }

  function cone(apex, axis, half, length) {
    return [apex, add(apex, mul(rot(axis, half), length)), add(apex, mul(rot(axis, -half), length))];
  }

  function drawUav(parent, c, opts) {
    const g = el("g", { transform: `translate(${c[0]},${c[1]})` }, parent);
    el("line", { x1: -26, y1: 0, x2: 26, y2: 0, stroke: "var(--c-ink)", "stroke-width": 3, "stroke-linecap": "round" }, g);
    for (const x of [-26, 26]) {
      el("line", { x1: x, y1: 0, x2: x, y2: -5, stroke: "var(--c-ink)", "stroke-width": 2 }, g);
      el("ellipse", { cx: x, cy: -6, rx: 13, ry: 2.4, fill: "none", stroke: "var(--c-ink)", "stroke-width": 1.4 }, g);
    }
    el("rect", { x: -9, y: -6, width: 18, height: 10, rx: 2.5, fill: "var(--c-ink)" }, g);
    if (opts.camera) {
      el("path", { d: "M 9 -2 L 21 -8 L 21 8 Z", fill: "#FFE888", stroke: "var(--c-ink)", "stroke-width": 1.2 }, g);
    }
    if (opts.leds) {
      for (const x of [-26, 0, 26]) {
        el("circle", { cx: x, cy: x === 0 ? -9 : 3, r: 7, fill: "#7B6CFF", opacity: 0.25 }, g);
        el("circle", { cx: x, cy: x === 0 ? -9 : 3, r: 3, fill: "#7B6CFF" }, g);
      }
    }
    return g;
  }

  function build(svg) {
    const defs = el("defs", {}, svg);
    for (const [id, color] of [["arr-dir", "var(--c-dir)"], ["arr-ref", "var(--c-ref)"]]) {
      const m = el("marker", { id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, defs);
      el("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: color }, m);
    }
    const clipAbove = el("clipPath", { id: "clip-above" }, defs);
    el("rect", { x: 0, y: 0, width: 800, height: SURF }, clipAbove);
    const clipBelow = el("clipPath", { id: "clip-below" }, defs);
    el("rect", { x: 0, y: SURF, width: 800, height: 440 - SURF }, clipBelow);

    const uRef = unit(sub(T, A));
    const uDir = unit(sub(T, O));
    const tSurf = (A[1] - SURF) / (A[1] - T[1]);
    const R = add(A, mul(sub(T, A), tSurf));         // reflection point on the surface
    const lMin = len(sub(R, A));

    /* water / surface */
    el("rect", { x: 0, y: SURF, width: 800, height: 440 - SURF, fill: "var(--c-water)" }, svg);
    el("line", { x1: 0, y1: SURF, x2: 800, y2: SURF, stroke: "var(--c-water-line)", "stroke-width": 2 }, svg);
    for (let i = 0; i < 9; i++) {
      const y = SURF + 22 + i * 16, x0 = (i * 97) % 700;
      el("path", { d: `M ${x0} ${y} q 12 -4 24 0 t 24 0`, fill: "none", stroke: "var(--c-water-line)", "stroke-width": 1, opacity: 0.5 }, svg);
    }
    const tSurfLbl = el("text", { x: 790, y: SURF - 8, "text-anchor": "end", class: "dim" }, svg);
    tSurfLbl.textContent = "level surface: calm water or floor";
    const tMirror = el("text", { x: 790, y: 430, "text-anchor": "end", class: "dim" }, svg);
    tMirror.textContent = "mirror space";

    /* reflection cone (step 4, 6) */
    const gRef = group(svg, "4 6");
    const refPoly = pts(cone(A, uRef, HALF_REF, LEN_REF));
    el("polygon", { points: refPoly, fill: "var(--c-ref)", "fill-opacity": 0.14, stroke: "var(--c-ref)", "stroke-width": 1.2, "clip-path": "url(#clip-above)" }, gRef);
    el("polygon", { points: refPoly, fill: "var(--c-ref)", "fill-opacity": 0.05, stroke: "var(--c-ref)", "stroke-width": 1, "stroke-dasharray": "4 4", "clip-path": "url(#clip-below)" }, gRef);
    el("line", { x1: A[0], y1: A[1], x2: A[0] + uRef[0] * LEN_REF, y2: A[1] + uRef[1] * LEN_REF, stroke: "var(--c-ref)", "stroke-width": 1, "stroke-dasharray": "2 4", opacity: 0.7 }, gRef);

    /* direct cone (step 5, 6) */
    const gDir = group(svg, "5 6");
    el("polygon", { points: pts(cone(O, uDir, HALF_DIR, LEN_DIR)), fill: "var(--c-dir)", "fill-opacity": 0.12, stroke: "var(--c-dir)", "stroke-width": 1.2 }, gDir);

    /* mirror observer + apex (step 4) */
    const gMirror = group(svg, "4");
    el("line", { x1: O[0], y1: SURF, x2: A[0], y2: A[1], stroke: "var(--c-dim)", "stroke-width": 1, "stroke-dasharray": "3 4" }, gMirror);
    const ghost = drawUav(gMirror, A, { camera: true });
    ghost.setAttribute("opacity", "0.35");
    ghost.setAttribute("transform", `translate(${A[0]},${A[1]}) scale(1,-1)`);
    el("circle", { cx: A[0], cy: A[1], r: 3.5, fill: "var(--c-ref)" }, gMirror);
    const tA = el("text", { x: A[0] + 34, y: A[1] + 5 }, gMirror);
    tA.innerHTML = '<tspan class="math">a</tspan><tspan class="dim"> = [0, 0, −2z</tspan><tspan class="dim" baseline-shift="sub" font-size="9">o</tspan><tspan class="dim">]  mirrored observer</tspan>';

    /* rangefinder (step 3) */
    const gRange = group(svg, "3");
    el("line", { x1: O[0], y1: O[1] + 6, x2: O[0], y2: SURF, stroke: "var(--c-ink)", "stroke-width": 1.4, "stroke-dasharray": "5 3" }, gRange);
    el("circle", { cx: O[0], cy: SURF, r: 3, fill: "var(--c-ink)" }, gRange);
    const tZo = el("text", { x: O[0] - 10, y: (O[1] + SURF) / 2 + 5, "text-anchor": "end" }, gRange);
    tZo.innerHTML = '<tspan class="math">z</tspan><tspan baseline-shift="sub" font-size="10">o</tspan>';
    const tRf = el("text", { x: O[0] - 10, y: (O[1] + SURF) / 2 + 22, "text-anchor": "end", class: "dim" }, gRange);
    tRf.textContent = "1D rangefinder";

    /* light paths and bearings (step 2, 3, 4) */
    const gRayDir = group(svg, "2 5");
    el("line", { x1: T[0] - uDir[0] * 30, y1: T[1] - uDir[1] * 30, x2: O[0] + uDir[0] * 26, y2: O[1] + uDir[1] * 26, stroke: "var(--c-dir)", "stroke-width": 2, "marker-end": "url(#arr-dir)" }, gRayDir);
    const tBd = el("text", { x: (O[0] + T[0]) / 2 - 30, y: (O[1] + T[1]) / 2 - 12, fill: "var(--c-dir)" }, gRayDir);
    tBd.innerHTML = '<tspan class="math" fill="var(--c-dir)">b̂</tspan><tspan baseline-shift="sub" font-size="10" fill="var(--c-dir)">d</tspan>';

    const gRayRef = group(svg, "2 3 4");
    const uIn = unit(sub(R, T)), uOut = unit(sub(O, R));
    el("line", { x1: T[0] + uIn[0] * 24, y1: T[1] + uIn[1] * 24, x2: R[0], y2: R[1], stroke: "var(--c-ref)", "stroke-width": 2 }, gRayRef);
    el("line", { x1: R[0], y1: R[1], x2: O[0] - uOut[0] * 24, y2: O[1] - uOut[1] * 24, stroke: "var(--c-ref)", "stroke-width": 2, "marker-end": "url(#arr-ref)" }, gRayRef);
    const tBr = el("text", { x: (O[0] + R[0]) / 2 + 12, y: (O[1] + R[1]) / 2 + 4 }, gRayRef);
    tBr.innerHTML = '<tspan class="math" fill="var(--c-ref)">b̂</tspan><tspan baseline-shift="sub" font-size="10" fill="var(--c-ref)">r</tspan>';

    /* reflection point and its spread ellipse (step 3, 4) */
    const gR = group(svg, "3 4");
    el("ellipse", { cx: R[0], cy: SURF, rx: 22, ry: 5, fill: "var(--c-ref)", "fill-opacity": 0.18, stroke: "var(--c-ref)", "stroke-width": 1.4 }, gR);
    el("circle", { cx: R[0], cy: SURF, r: 3.5, fill: "var(--c-ref)" }, gR);
    const tR = el("text", { x: R[0] + 4, y: SURF + 24 }, gR);
    tR.innerHTML = '<tspan class="math" fill="var(--c-ref)">r</tspan>';

    /* samples (step 6) and inliers (step 6, 7) */
    const rand = rng(7);
    const gOut = group(svg, "6");
    const gIn = group(svg, "6 7");
    const inliers = [];
    for (let i = 0; i < 420; i++) {
      const l = lMin + rand() * (LEN_REF - lMin);
      const th = (rand() * 2 - 1) * HALF_REF;
      const p = add(A, mul(rot(uRef, th), l));
      if (p[1] > SURF - 2) continue;
      const v = sub(p, O);
      const along = v[0] * uDir[0] + v[1] * uDir[1];
      const perp = Math.abs(v[0] * uDir[1] - v[1] * uDir[0]);
      const inside = along > 0 && along <= LEN_DIR && perp <= along * Math.tan(HALF_DIR);
      if (inside) inliers.push(p);
      el("circle", { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: inside ? 2.6 : 1.7, fill: inside ? "var(--c-inl)" : "var(--c-ref)", opacity: inside ? 0.95 : 0.35 }, inside ? gIn : gOut);
    }

    /* particles + estimate (step 7) */
    const gPf = group(svg, "7");
    const rp = rng(11);
    let mx = 0, my = 0;
    for (let i = 0; i < 90; i++) {
      // spread mostly along the viewing direction, where depth is least constrained
      const a = rp.gauss() * 16, b = rp.gauss() * 4.5;
      const p = [T[0] + uDir[0] * a - uDir[1] * b, T[1] + uDir[1] * a + uDir[0] * b];
      mx += p[0]; my += p[1];
      el("circle", { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: 2, fill: "var(--c-est)", opacity: 0.55 }, gPf);
    }
    mx /= 90; my /= 90;
    el("circle", { cx: mx, cy: my, r: 9, fill: "none", stroke: "var(--c-est)", "stroke-width": 2.2 }, gPf);
    el("path", { d: `M ${mx - 14} ${my} h 8 M ${mx + 6} ${my} h 8 M ${mx} ${my - 14} v 8 M ${mx} ${my + 6} v 8`, stroke: "var(--c-est)", "stroke-width": 2 }, gPf);
    const tEst = el("text", { x: mx + 12, y: my + 40, fill: "var(--c-est)" }, gPf);
    tEst.textContent = "estimate";
    tEst.setAttribute("style", "fill: var(--c-est); font-weight: 600;");

    /* robots: always visible */
    drawUav(svg, O, { camera: true });
    drawUav(svg, T, { leds: true });
    const tO = el("text", { x: O[0] - 34, y: O[1] + 5, "text-anchor": "end", style: "font-weight:600" }, svg);
    tO.textContent = "observer";
    const tT = el("text", { x: T[0], y: T[1] - 26, "text-anchor": "middle", style: "font-weight:600" }, svg);
    tT.textContent = "transmitter";

    /* onboard camera inset (step 1) */
    const gCam = group(svg, "1", { class: "dg inset" });
    const ix = 16, iy = 14, iw = 196, ih = 120;
    el("rect", { x: ix, y: iy, width: iw, height: ih, rx: 8, fill: "#0A0E10" }, gCam);
    const tCam = el("text", { x: ix + 10, y: iy + 17, style: "fill:#9FB3B8; font-size:10.5px; letter-spacing:.06em" }, gCam);
    tCam.textContent = "ONBOARD UV CAMERA";
    const cx = ix + 118, dy = iy + 50, ry = iy + 92;
    el("line", { x1: ix + 8, y1: iy + 70, x2: ix + iw - 8, y2: iy + 70, stroke: "#2A3D44", "stroke-dasharray": "3 3" }, gCam);
    el("circle", { cx, cy: dy, r: 7, fill: "#9C8CFF", opacity: 0.35 }, gCam);
    el("circle", { cx, cy: dy, r: 3.5, fill: "#fff" }, gCam);
    el("rect", { x: cx - 11, y: dy - 11, width: 22, height: 22, fill: "none", stroke: "var(--c-dir)", "stroke-width": 2 }, gCam);
    for (const [ox, oy, r] of [[0, -4, 1.6], [1, 1, 2], [-1, 5, 1.5], [0, 9, 1.2], [2, -8, 1.1]]) {
      el("circle", { cx: cx + ox, cy: ry + oy, r, fill: "#D9D2FF", opacity: 0.85 }, gCam);
    }
    el("ellipse", { cx, cy: ry + 1, rx: 8, ry: 15, fill: "none", stroke: "var(--c-ref)", "stroke-width": 2 }, gCam);
    const tPd = el("text", { x: cx - 20, y: dy + 5, "text-anchor": "end", style: "fill:#8FB6FF; font-size:13px" }, gCam);
    tPd.innerHTML = '<tspan class="math" style="fill:#8FB6FF">p</tspan><tspan baseline-shift="sub" font-size="9" style="fill:#8FB6FF">d</tspan>';
    const tPr = el("text", { x: cx - 20, y: ry + 5, "text-anchor": "end", style: "fill:#FF9C8A; font-size:13px" }, gCam);
    tPr.innerHTML = '<tspan class="math" style="fill:#FF9C8A">p</tspan><tspan baseline-shift="sub" font-size="9" style="fill:#FF9C8A">r</tspan>';
    const tHz = el("text", { x: ix + iw - 10, y: iy + 66, "text-anchor": "end", style: "fill:#5C7177; font-size:9.5px" }, gCam);
    tHz.textContent = "horizon";

    return inliers.length;
  }

  function init() {
    const svg = document.getElementById("method-svg");
    const nav = document.getElementById("step-nav");
    if (!svg || !nav) return;
    build(svg);

    const card = document.getElementById("step-card");
    const kicker = document.getElementById("step-kicker");
    const title = document.getElementById("step-title");
    const body = document.getElementById("step-body");
    const prev = document.getElementById("step-prev");
    const next = document.getElementById("step-next");
    const groups = Array.from(svg.querySelectorAll(".dg"));

    const pills = STEPS.map((s, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "step-pill";
      b.setAttribute("role", "tab");
      b.textContent = i === 0 ? "Overview" : String(i);
      b.setAttribute("aria-label", s.kicker);
      b.addEventListener("click", () => show(i));
      nav.appendChild(b);
      return b;
    });

    let current = 0;
    function show(i) {
      current = i;
      const s = STEPS[i];
      card.style.setProperty("--step-color", s.color);
      kicker.textContent = s.kicker;
      title.textContent = s.title;
      body.innerHTML = s.body;
      pills.forEach((p, k) => p.setAttribute("aria-selected", k === i ? "true" : "false"));
      prev.disabled = i === 0;
      next.disabled = i === STEPS.length - 1;
      svg.classList.toggle("focus", i !== 0);
      groups.forEach((g) => g.classList.toggle("on", i === 0 || g.dataset.s.split(" ").includes(String(i))));
      if (window.renderMathInElement) renderMath(body);
    }
    prev.addEventListener("click", () => current > 0 && show(current - 1));
    next.addEventListener("click", () => current < STEPS.length - 1 && show(current + 1));
    nav.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" && current < STEPS.length - 1) { show(current + 1); pills[current].focus(); }
      if (e.key === "ArrowLeft" && current > 0) { show(current - 1); pills[current].focus(); }
    });
    show(0);
  }

  function renderMath(node) {
    window.renderMathInElement(node, {
      delimiters: [
        { left: "\\[", right: "\\]", display: true },
        { left: "\\(", right: "\\)", display: false },
      ],
      throwOnError: false,
    });
  }
  window.__renderMath = renderMath;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
