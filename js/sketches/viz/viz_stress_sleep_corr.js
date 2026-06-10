// viz_stress_sleep_corr.js
//
// Per-student stress-sleep correlation chart.
// Each row = one student. Position on the horizontal axis = strength and
// direction of that student's daily stress-sleep correlation across the term.
// Burgundy = stress hurts sleep (negative). Navy = stress and sleep rise together (positive).
//
// Data file: data/stress_sleep_corr.tsv
// Expected columns: uid, r, direction, n_days
//
// Exposes window.StressSleepCorrViz, called from sketch_renderer.js when the
// active section index matches the one this chart is wired to.
//
// Designed to fit a roughly 700x680 viewport area inside the p5 canvas.
// The chart fades in based on the `progress` argument (0 = invisible, 1 = full).

window.StressSleepCorrViz = (function () {
  // ----- Palette -----
  const COLOR_NEG = "#8B3A3A";      // burgundy — stress hurts sleep
  const COLOR_POS = "#2C4870";      // navy — stress and sleep rise together
  const COLOR_TEXT = 0;            // near-black (gets adjusted at runtime)
  const COLOR_MUTED = 30;          // mid-gray for labels
  const COLOR_FAINT = 100;          // faint gray for zone backgrounds and dividers

  // ----- Layout constants -----
  // All measurements in canvas pixels relative to the chart's top-left origin.
  const CHART_W = 680;
  const CHART_H = 680;
  const PLOT_LEFT = 60;
  const PLOT_RIGHT = 620;
  const PLOT_TOP = 127;             // first row of data starts at row_y_start
  const PLOT_BOTTOM = 660;
  const ROW_Y_START = 155;
  const ROW_STEP = 15;
  const ZERO_X = 340;               // x position of r = 0
  const X_SCALE = 280;              // pixels per unit of r (so r = +1 → x = 620)

  // ----- Public API -----
  function draw(p, manager, ai, progress) {
    const data = manager.data;
    if (!data || data.length === 0) return;

    // Optional offset if the caller wants to position the chart somewhere
    // other than (0,0). Defaults to centered horizontally on the canvas.
    const scale = Math.min(p.width / CHART_W, (p.height - 40) / CHART_H) * 0.95;
    const offsetX = (p.width - CHART_W * scale) / 2;
    const offsetY = Math.max(20, (p.height - CHART_H * scale) / 2);

    p.push();
    p.translate(offsetX, offsetY);
    p.scale(scale);

    // Fade in based on scroll progress
    const alpha = p.constrain(progress * 255, 0, 255);

    drawHeader(p, alpha);
    drawDirectionLabels(p, alpha);
    drawAxis(p, alpha);
    drawZoneLabels(p, alpha);
    drawZoneBackgrounds(p, alpha);
    drawZeroLine(p, alpha);
    drawZoneBoundaries(p, alpha);
    drawRows(p, data, alpha);

    p.pop();
  }

  // ----- Drawing pieces -----

  function drawHeader(p, alpha) {
    p.noStroke();
    p.fill(COLOR_TEXT, alpha);
    p.textAlign(p.LEFT, p.BASELINE);
    p.textStyle(p.NORMAL);
    p.textSize(18);
    p.text("The daily stress-sleep link is more individual than universal", 20, 24);

    p.fill(COLOR_TEXT, alpha * 0.8);
    p.textSize(14);
    p.text(
      "Each row is one of 34 students. Position shows the strength and direction of their daily stress-sleep correlation.",
      20, 42
    );
  }

  function drawDirectionLabels(p, alpha) {
    p.noStroke();
    p.textAlign(p.CENTER, p.BASELINE);
    p.textSize(11);

    p.fill(...hexToRgb(COLOR_NEG), alpha);
    p.text("← Stress hurts sleep", 170, 74);

    p.fill(...hexToRgb(COLOR_POS), alpha);
    p.text("Stress and sleep increase together →", 510, 74);
  }

  function drawAxis(p, alpha) {
    // Horizontal axis line
    p.stroke(COLOR_MUTED, alpha * 0.6);
    p.strokeWeight(0.5);
    p.line(PLOT_LEFT, 87, PLOT_RIGHT, 87);

    // Tick labels
    p.noStroke();
    p.fill(COLOR_MUTED, alpha);
    p.textAlign(p.CENTER, p.BASELINE);
    p.textSize(10);
    const ticks = [
      { x: 60,  label: "−1.0" },
      { x: 160, label: "−0.4" },
      { x: 260, label: "−0.2" },
      { x: 340, label: "0" },
      { x: 420, label: "+0.2" },
      { x: 520, label: "+0.4" },
      { x: 620, label: "+1.0" },
    ];
    for (const t of ticks) {
      p.text(t.label, t.x, 102);
    }
  }

  function drawZoneLabels(p, alpha) {
    p.noStroke();
    p.fill(COLOR_TEXT, alpha * 0.8);
    p.textAlign(p.CENTER, p.BASELINE);
    p.textStyle(p.BOLD);
    p.textSize(9.5);
    p.text("STRONG",      110, 120);
    p.text("MODERATE",    210, 120);
    p.text("WEAK / NONE", 340, 120);
    p.text("MODERATE",    470, 120);
    p.text("STRONG",      570, 120);
    p.textStyle(p.NORMAL);
  }

  function drawZoneBackgrounds(p, alpha) {
    p.noStroke();
    // Strong zones (outer): slightly stronger fill
    p.fill(COLOR_TEXT, alpha * 0.04 * 255 / 255);
    p.rect(60,  PLOT_TOP, 100, PLOT_BOTTOM - PLOT_TOP);
    p.rect(520, PLOT_TOP, 100, PLOT_BOTTOM - PLOT_TOP);
    // Moderate zones: very subtle
    p.fill(COLOR_TEXT, alpha * 0.02 * 255 / 255);
    p.rect(160, PLOT_TOP, 100, PLOT_BOTTOM - PLOT_TOP);
    p.rect(420, PLOT_TOP, 100, PLOT_BOTTOM - PLOT_TOP);
  }

  function drawZeroLine(p, alpha) {
    p.stroke(COLOR_TEXT, alpha * 0.4);
    p.strokeWeight(1);
    p.line(ZERO_X, PLOT_TOP, ZERO_X, PLOT_BOTTOM);
  }

  function drawZoneBoundaries(p, alpha) {
    p.stroke(COLOR_TEXT, alpha * 0.12);
    p.strokeWeight(0.5);
    // Dashed lines at the four zone boundaries
    const boundaries = [160, 260, 420, 520];
    for (const x of boundaries) {
      drawDashedLine(p, x, PLOT_TOP, x, PLOT_BOTTOM, 3, 2);
    }
  }

  function drawRows(p, data, alpha) {
    p.strokeWeight(1.5);
    p.noFill();
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      const r = +d.r;
      const isNeg = r < 0;
      const colorHex = isNeg ? COLOR_NEG : COLOR_POS;
      const [cr, cg, cb] = hexToRgb(colorHex);
      const y = ROW_Y_START + i * ROW_STEP;
      const xEnd = ZERO_X + r * X_SCALE;

      // Line from zero to the student's r position
      p.stroke(cr, cg, cb, alpha);
      p.line(ZERO_X, y, xEnd, y);

      // Endpoint dot
      p.noStroke();
      p.fill(cr, cg, cb, alpha);
      p.circle(xEnd, y, 7);
    }
  }

  // ----- Utilities -----

  function hexToRgb(hex) {
    const h = hex.replace("#", "");
    return [
      parseInt(h.substring(0, 2), 16),
      parseInt(h.substring(2, 4), 16),
      parseInt(h.substring(4, 6), 16),
    ];
  }

  function drawDashedLine(p, x1, y1, x2, y2, dashLen, gapLen) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const step = dashLen + gapLen;
    const n = Math.floor(dist / step);
    const ux = dx / dist;
    const uy = dy / dist;
    for (let i = 0; i < n; i++) {
      const sx = x1 + ux * (i * step);
      const sy = y1 + uy * (i * step);
      const ex = sx + ux * dashLen;
      const ey = sy + uy * dashLen;
      p.line(sx, sy, ex, ey);
    }
  }

  return { draw };
})();
