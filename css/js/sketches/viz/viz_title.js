// viz_title.js — STYLE: BOTANICAL / SCIENTIFIC ILLUSTRATION
// Same mechanics as the current intro (vertical climb, full-bleed trunk that
// bleeds past the screen, bottom-up growth, real meditation labels, red crown).
// Rendering evokes a 19th-century botanical plate: fine confident ink linework,
// restrained watercolor-style washes that sit inside the lines, soft cream
// ground, leaf veining, gentle stippled shading.
(function () {
    // ---- TREE COLOR PALETTE ----
    // p5 draws to a canvas and can't cheaply read CSS custom properties every
    // frame, so the tree's colors live here as RGB triples. Keep these in visual
    // sync with the CSS theme library in index.html (:root) — ACCENT mirrors
    // --accent-red, and the bark/paper tones mirror the --paper-* ground so the
    // tree sits naturally on the page background. Edit both places together.
    var INK         = [58, 54, 44];          // sepia-ink line (contours, veins)
    var WASH_HI     = [150, 196, 110];       // leaf greens: light highlight
    var WASH_MID    = [86, 158, 80];         //              mid
    var WASH_LO     = [44, 112, 60];         //              deep shadow
    var WASH_SCI_HI = [128, 180, 104];       // science-crown greens: light
    var WASH_SCI_MID= [72, 142, 82];         //                        mid
    var WASH_SCI_LO = [40, 100, 58];         //                        deep
    var BARK_WASH   = [188, 162, 124];       // trunk/branch bark: light
    var BARK_WASH_LO= [150, 122, 86];        //                    shadow
    var ACCENT      = [168, 54, 44];          // crown annotation circle (≈ --accent-red)


    var BRANCHES = [
        { row: 0, side: -1, label: 'Dhikr · Islam' },
        { row: 0, side: 1, label: 'Neidan · Daoism' },
        { row: 1, side: -1, label: 'Lectio Divina · Christianity' },
        { row: 1, side: 1, label: 'Prāṇāyāma · Hinduism' },
        { row: 2, side: -1, label: 'Hitbodedut · Judaism' },
        { row: 2, side: 1, label: 'Vipassanā · Buddhism' }
    ];
    var CROWN_LABELS = ['Mindfulness-Based', 'Transcendental', 'Relaxation', 'Therapeutic'];

    function ease(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }
    function clamp01(t) { return Math.max(0, Math.min(1, t)); }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function mix(c1, c2, t) { return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)]; }

    function seeds(manager) {
        if (manager._treeSeeds) return manager._treeSeeds;
        var s = [];
        for (var i = 0; i < 460; i++) s.push([Math.random(), Math.random(), Math.random(), Math.random()]);
        manager._treeSeeds = s;
        return s;
    }

    // a botanical leaf cluster: soft wash fill, fine ink contour, central vein +
    // side veins, light stipple for shading. Reads like a plate illustration.
    function leafMass(p, cx, cy, R, grow, sd, off, hi, mid, lo) {
        var g = ease(grow);
        if (g <= 0.001) return;
        p.push();
        // soft wash underlayer (layered translucent ellipses -> watercolor look)
        p.noStroke();
        var n = 16, fc = n * g, shown = Math.max(1, Math.ceil(fc));
        for (var i = 0; i < shown; i++) {
            var s = sd[(off + i) % sd.length];
            var th = s[0] * Math.PI * 2, rad = R * (0.1 + s[1] * 0.6) * g;
            var lx = cx + Math.cos(th) * rad, ly = cy + Math.sin(th) * rad * 0.86;
            var t = clamp01((ly - (cy - R * g)) / (2 * R * g));
            var col = t < 0.5 ? mix(hi, mid, t * 2) : mix(mid, lo, (t - 0.5) * 2);
            var partial = (i === shown - 1) ? (fc - (shown - 1)) : 1;
            var size = R * (0.5 + s[2] * 0.5) * Math.max(0.2, partial);
            p.fill(col[0], col[1], col[2], 235);
            p.ellipse(lx, ly, size, size * 0.9);
        }
        // fine ink contour (lobed, thin, confident)
        p.noFill();
        p.stroke(INK[0], INK[1], INK[2], 230);
        p.strokeWeight(Math.max(1.0, R * 0.03));
        var lobes = 9;
        p.beginShape();
        for (var a = 0; a <= lobes; a++) {
            var sa = sd[(off + a) % sd.length];
            var aa = (a / lobes) * Math.PI * 2;
            var rr = R * (0.82 + sa[0] * 0.28) * g;
            var x = cx + Math.cos(aa) * rr, y = cy + Math.sin(aa) * rr * 0.92;
            p.curveVertex(x, y); if (a === 0) p.curveVertex(x, y);
        }
        p.endShape(p.CLOSE);
        // veining: a central vein + a few side veins
        if (g > 0.35) {
            p.stroke(INK[0], INK[1], INK[2], 175);
            p.strokeWeight(Math.max(0.7, R * 0.016));
            p.line(cx, cy + R * 0.5 * g, cx - R * 0.06, cy - R * 0.55 * g);
            for (var v = 0; v < 4; v++) {
                var vt = (v + 1) / 5;
                var vy = cy + R * (0.5 - vt * 1.05) * g;
                var vlen = R * 0.34 * (1 - vt) * g;
                p.line(cx, vy, cx - vlen, vy - vlen * 0.5);
                p.line(cx, vy, cx + vlen, vy - vlen * 0.5);
            }
        }
        // light stipple shading on the lower-right
        if (g > 0.5) {
            p.noStroke(); p.fill(INK[0], INK[1], INK[2], 90);
            for (var d = 0; d < 14; d++) {
                var sd2 = sd[(off + 40 + d) % sd.length];
                var dx = cx + (0.1 + sd2[0] * 0.5) * R, dy = cy + (0.1 + sd2[1] * 0.5) * R;
                p.ellipse(dx, dy, R * 0.03, R * 0.03);
            }
        }
        p.pop();
    }

    function chip(p, x, y, text, sizePx) {
        p.push();
        p.textSize(sizePx);
        var w = p.textWidth(text) + sizePx * 1.4, h = sizePx * 1.7;
        p.rectMode(p.CENTER);
        p.stroke(INK[0], INK[1], INK[2]); p.strokeWeight(1.1);
        p.fill(250, 247, 238, 245);
        p.rect(x, y, w, h, h / 2);
        p.noStroke(); p.fill(INK[0], INK[1], INK[2]);
        p.textAlign(p.CENTER, p.CENTER); p.text(text, x, y);
        p.pop();
    }

    function branch(p, x0, y0, dir, len, droop, grow, thick) {
        var g = ease(grow);
        var tipX = x0 + dir * len * g, tipY = y0 - droop * g;
        var ctrlX = x0 + dir * len * 0.45 * g, ctrlY = y0 - droop * 0.45 - len * 0.10 * g;
        // soft bark wash body
        p.noFill();
        p.stroke(BARK_WASH[0], BARK_WASH[1], BARK_WASH[2], 200);
        p.strokeWeight(thick * (0.5 + 0.5 * g));
        p.beginShape(); p.vertex(x0, y0); p.quadraticVertex(ctrlX, ctrlY, tipX, tipY); p.endShape();
        // fine ink contour over it
        p.stroke(INK[0], INK[1], INK[2], 210); p.strokeWeight(1.1);
        p.beginShape(); p.vertex(x0, y0); p.quadraticVertex(ctrlX, ctrlY, tipX, tipY); p.endShape();
        p.noStroke();
        return { x: tipX, y: tipY };
    }

    function draw(p, manager, ai, progress) {
        var C = window.ChartUtils, T = C.TYPO;
        var ox = manager.offsetX || 0, oy = manager.offsetY || 0;
        var W = manager.width || 600, H = manager.height || 520;
        var sd = seeds(manager);

        var science = (ai === 1);
        var phase = science ? (0.5 + progress * 0.5) : (progress * 0.5);
        var gg = clamp01(phase * 2);
        var climb = ease(phase);

        var TREE_H = H * 2.3;
        var cx = W / 2;
        var baseY = TREE_H * 0.97;
        var trunkTopFull = TREE_H * 0.13;
        var crownY = TREE_H * 0.095;
        var crownR = W * 0.16;
        var ROW_Y = [TREE_H * 0.30, TREE_H * 0.46, TREE_H * 0.62];

        var tf = ease(clamp01(gg / 0.82));
        var curTopY = baseY - tf * (baseY - trunkTopFull);
        var crownGrow = ease(clamp01((gg - 0.82) / 0.18));
        var rootGrow = ease(clamp01(gg / 0.10));

        var camBottom = baseY - H * 0.96;
        var camTopEnd = crownY - H * 0.42;
        var camTop = camBottom + (camTopEnd - camBottom) * climb;

        // ---- DIVE INTO THE CROWN: in the last stretch of section 1, push the
        //      camera INTO the crown (scale up) and fade to paper, so the intro
        //      dissolves straight into the science section. ----
        // longer, slower dive: begins earlier (0.62) and spans more of section 1
        var dive = science ? ease(clamp01((progress - 0.62) / 0.38)) : 0;
        var diveScale = 1 + dive * 3.0;            // zoom in toward the crown
        // fade trails the zoom so the viewer sees more of the zoom before it washes out
        var diveFade = ease(clamp01((dive - 0.45) / 0.55));

        p.push();
        // apply dive zoom centered on the crown, then the normal camera translate
        if (dive > 0) {
            var crownScreenY = (crownY) - camTop;   // crown's on-screen Y before scaling
            p.translate(ox + W / 2, oy + crownScreenY);
            p.scale(diveScale);
            p.translate(-(ox + W / 2), -(oy + crownScreenY));
        }
        p.translate(ox, oy - camTop);

        var wB = W * 0.208, wT = W * 0.072;
        function trunkW(yf) { var taper = yf < 0.72 ? 0 : (yf - 0.72) / 0.28; return wB - (wB - wT) * ease(taper); }
        function trunkX(yf) { return cx + Math.sin(yf * 1.6) * W * 0.010; }

        // faint ground wash
        if (Math.max(rootGrow, tf) > 0.02) {
            p.noStroke(); p.fill(BARK_WASH_LO[0], BARK_WASH_LO[1], BARK_WASH_LO[2], 40);
            p.ellipse(cx, baseY + 10, W * 0.5 * (0.3 + 0.7 * tf), H * 0.026);
        }

        // root flare: wash + fine contour
        if (rootGrow > 0.01) {
            var reach = [0.46, 0.30, 0.16];
            for (var s2 = -1; s2 <= 1; s2 += 2) {
                for (var ri = 0; ri < reach.length; ri++) {
                    var rx = cx + s2 * W * reach[ri] * rootGrow;
                    var ry = baseY + (14 - ri * 3) * rootGrow;
                    p.fill(BARK_WASH[0], BARK_WASH[1], BARK_WASH[2], 200);
                    p.stroke(INK[0], INK[1], INK[2], 200); p.strokeWeight(1.1);
                    p.beginShape();
                    p.vertex(cx, baseY - 26);
                    p.quadraticVertex(cx + s2 * W * reach[ri] * 0.5, baseY + 2, rx, ry);
                    p.quadraticVertex(cx + s2 * W * reach[ri] * 0.4, baseY - 2, cx + s2 * (wB * 0.4), baseY - 22);
                    p.endShape(p.CLOSE);
                    p.noStroke();
                }
            }
        }

        // trunk: bark wash body with a soft gradient + fine ink contour + light
        // longitudinal vein lines (fixed in world space -> scroll past)
        var yfTop = tf, STEPS = 24;
        if (tf > 0.005) {
            // gradient wash: lighter left, deeper right
            for (var col = 0; col < 6; col++) {
                var t0 = col / 6, t1 = (col + 1) / 6;
                var shade = mix(BARK_WASH, BARK_WASH_LO, t0);
                p.noStroke(); p.fill(shade[0], shade[1], shade[2], 230);
                p.beginShape();
                for (var i = 0; i <= STEPS; i++) { var yf = (i / STEPS) * yfTop, y = baseY - yf * (baseY - trunkTopFull); var lwL = trunkX(yf) - trunkW(yf) / 2; p.vertex(lwL + trunkW(yf) * t0, y); }
                for (var j = STEPS; j >= 0; j--) { var yf2 = (j / STEPS) * yfTop, y2 = baseY - yf2 * (baseY - trunkTopFull); var lwL2 = trunkX(yf2) - trunkW(yf2) / 2; p.vertex(lwL2 + trunkW(yf2) * t1, y2); }
                p.endShape(p.CLOSE);
            }
            // fine ink contour
            p.noFill(); p.stroke(INK[0], INK[1], INK[2], 220); p.strokeWeight(1.3);
            p.beginShape();
            for (var e = 0; e <= STEPS; e++) { var yfe = (e / STEPS) * yfTop, ye = baseY - yfe * (baseY - trunkTopFull); p.vertex(trunkX(yfe) - trunkW(yfe) / 2, ye); }
            p.endShape();
            p.beginShape();
            for (var f2 = 0; f2 <= STEPS; f2++) { var yff = (f2 / STEPS) * yfTop, yg = baseY - yff * (baseY - trunkTopFull); p.vertex(trunkX(yff) + trunkW(yff) / 2, yg); }
            p.endShape();
            // delicate longitudinal vein lines
            p.stroke(INK[0], INK[1], INK[2], 70); p.strokeWeight(0.8);
            for (var g2 = 0; g2 < 6; g2++) {
                var frac = 0.2 + g2 * 0.12;
                p.beginShape();
                for (var s3 = 0; s3 <= STEPS; s3++) { var yfs = (s3 / STEPS) * yfTop, ys = baseY - yfs * (baseY - trunkTopFull); p.vertex(trunkX(yfs) - trunkW(yfs) / 2 + trunkW(yfs) * frac, ys); }
                p.endShape();
            }
            p.noStroke();
        }

        // branches + botanical leaf clusters + chips
        for (var bi = 0; bi < BRANCHES.length; bi++) {
            var br = BRANCHES[bi];
            var by = ROW_Y[br.row];
            var f_i = (baseY - by) / (baseY - trunkTopFull);
            var bGrow = ease(clamp01((tf - f_i) / 0.16));
            if (bGrow <= 0.001) continue;
            var branchExtend = ease(clamp01(bGrow / 0.55));
            var foliageGrow = ease(clamp01((bGrow - 0.45) / 0.55));
            var attachX = trunkX(f_i) + br.side * trunkW(f_i) * 0.35;
            var targetTipX = br.side < 0 ? W * 0.16 : W * 0.84;   // shorter branches so labels sit fully on-screen
            var len = Math.abs(targetTipX - attachX);
            var tip = branch(p, attachX, by, br.side, len, H * 0.05, branchExtend, Math.max(3, W * 0.014));
            if (foliageGrow > 0.001) leafMass(p, tip.x + br.side * crownR * 0.18, tip.y - 6, crownR * 0.6, foliageGrow, sd, bi * 48, WASH_HI, WASH_MID, WASH_LO);
            if (foliageGrow > 0.75) chip(p, tip.x + br.side * crownR * 0.18, tip.y - 6, br.label, T.annotation + 5);
        }

        // crown — botanical clusters, circled in red annotation
        if (crownGrow > 0.005) {
            var hi = science ? WASH_SCI_HI : WASH_HI, md = science ? WASH_SCI_MID : WASH_MID, lo = science ? WASH_SCI_LO : WASH_LO;
            var layers = [[0, 0.12, 1.2], [-0.5, 0.04, 0.86], [0.5, 0.04, 0.86],
                          [-0.22, -0.3, 0.82], [0.22, -0.3, 0.82], [0, -0.06, 1.06], [-0.7, 0, 0.6], [0.7, 0, 0.6]];
            for (var L = 0; L < layers.length; L++) {
                var lg = ease(clamp01(crownGrow * 1.15 - L * 0.05));
                leafMass(p, cx + layers[L][0] * crownR * 1.5, crownY + layers[L][1] * crownR * 1.5, crownR * layers[L][2], lg, sd, 110 + L * 25, hi, md, lo);
            }
            if (science) {
                var ringA = ease(clamp01((phase - 0.55) / 0.3));
                p.noFill();
                p.stroke(ACCENT[0], ACCENT[1], ACCENT[2], 240 * ringA);
                p.strokeWeight(2.6);
                p.ellipse(cx, crownY - crownR * 0.02, crownR * 3.2, crownR * 2.7);
                var ay = crownY - crownR * 1.5;
                p.line(cx, ay - 26, cx, ay - 4); p.line(cx - 8, ay - 13, cx, ay - 4); p.line(cx + 8, ay - 13, cx, ay - 4);
                p.noStroke();
                // crown labels as readable pill chips (same treatment as branches),
                // only once the crown/ring is essentially present
                if (ringA > 0.4) {
                    var lh = crownR * 0.52, startLY = crownY - crownR * 0.02 - lh * (CROWN_LABELS.length - 1) / 2;
                    for (var c = 0; c < CROWN_LABELS.length; c++) chip(p, cx, startLY + c * lh, CROWN_LABELS[c], T.annotation + 5);
                }
            }
        }

        p.pop();

        var paper = [250, 247, 238], fadeH = H * 0.10;
        for (var fy = 0; fy < fadeH; fy++) {
            var aa2 = 200 * (1 - fy / fadeH);
            p.stroke(paper[0], paper[1], paper[2], aa2);
            p.line(ox, oy + fy, ox + W, oy + fy);
            p.line(ox, oy + H - fy, ox + W, oy + H - fy);
        }
        p.noStroke();

        // dive: wash the frame with shifting color hues as we plunge through the
        // canopy — deep green (inside the leaves) -> warm amber (light through
        // foliage) -> paper (emerging into the science). An atmospheric handoff.
        if (dive > 0.001) {
            // start tinting subtly as soon as the dive begins, well before full fade
            var hueA = ease(clamp01(dive / 0.5));         // green wash builds first
            var GREEN = [54, 116, 70], AMBER = [206, 178, 120], PAPER = [250, 247, 238];
            // pick the blend stage from the dive progress
            var stageCol;
            if (dive < 0.5) stageCol = mix(GREEN, AMBER, dive / 0.5);
            else stageCol = mix(AMBER, PAPER, (dive - 0.5) / 0.5);
            // overall opacity: light tint early, opaque by the end
            var washA = 90 * hueA + 165 * diveFade;
            p.noStroke();
            p.fill(stageCol[0], stageCol[1], stageCol[2], Math.min(255, washA));
            p.rect(ox, oy, W, H);
        }

        p.fill(110); p.textAlign(p.CENTER, p.BOTTOM); p.textSize(T.chartSub + 1);
        var caption = !science ? 'Scroll to climb the tree  ↑'
                     : (dive > 0.05 ? 'Diving into the science' : 'Near the crown  ·  keep climbing');
        p.fill(110, 110, 110, 255 * (1 - diveFade));
        p.text(caption, ox + W / 2, oy + H - 8);
    }

    window.VizTitle = { draw: draw };
})();
