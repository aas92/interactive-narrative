// viz_bar.js
// Router for all bar-style charts. Switches on the active index (ai).
//   ai 1  -> conditions stacked (mindfulness vs other)
//   ai 2  -> completion rates grouped (mindfulness vs other)
//   ai 3  -> research volume by condition, colored by completion rate
//   ai 6  -> heart rate before/after by meditation group (grouped)
//   ai 11 -> stress tiers across health metrics (normalized, honest axis)
(function() {
    var U = function() { return window.ChartUtils; };

    function fmtGroup(g) {
        return ({
            chi_meditation: 'Chi',
            kundalini_yoga: 'Kundalini',
            mindfulness: 'Mindfulness',
            other: 'Other meditation'
        })[g] || g;
    }

    // ---- ai 1 : single-color "Meditation-Based Studies" by condition ----
    // Mindfulness and other meditation are treated as ONE category (total).
    // ANIMATION: autumn leaves fall from the top of the frame (as if from the
    // tree we just climbed) and accumulate into each bar. The fill grows fast
    // while the reader is still reading, and once a bar reaches full length the
    // fall slows to a gentle, continuous trickle (it never fully stops). The bar
    // fill still maps exactly to (total / maxV) * reveal(prog), so the data and
    // reveal timing are unchanged.
    var FALL_LEAF = [ // typical autumn leaf colors
        [196, 86, 42], // burnt orange
        [214, 142, 48], // gold
        [168, 58, 40], // rust red
        [138, 110, 52], // brown-amber
        [122, 142, 66] // late-season green
    ];
    var FALL_BAR = [150, 126, 58]; // fall orange/greenish bar fill

    function conditions(p, m, prog) {
        var C = U(),
            T = C.TYPO,
            f = C.frame(m);
        var d = (m.medData && m.medData.conditions) || [];
        if (!d.length) return;
        // sort descending by total so the psychological/emotional load reads top-down
        d = d.slice().sort(function(a, b) { return b.total - a.total; });
        C.title(p, f, 'Meditation-Based Studies by Condition', null, 24);
        var maxV = Math.max.apply(null, d.map(function(r) { return r.total; }));
        var rowH = f.h / d.length,
            barH = rowH * 0.6;
        var col = FALL_BAR;
        var x0 = f.x + 128,
            trackW = f.w - 136;

        // leaf-fall particle system + self-running fill state (persists on manager)
        var sys = leafFill_init(m, d.length);

        // ---- SELF-RUNNING FILL (independent of scroll) ----
        // The bars fill on their own once the section is on screen. We start a
        // frame-count clock the first time this chart is drawn while in view, and
        // ease the fill to full over a fixed duration. Scroll no longer controls
        // the fill amount — `prog` is only used to know the section is visible.
        if (prog > 0.02 && sys.startFrame < 0) sys.startFrame = p.frameCount;
        var FILL_FRAMES = 165; // ~2.75s (2x faster fill)
        var rawT = sys.startFrame < 0 ? 0 : (p.frameCount - sys.startFrame) / FILL_FRAMES;
        var fillT = Math.max(0, Math.min(1, rawT));
        var rev = fillT * fillT * (3 - 2 * fillT); // smoothstep ease

        p.textSize(T.annotation + 4); // larger, more legible bar labels
        for (var i = 0; i < d.length; i++) {
            var r = d[i],
                y = f.y + i * rowH + (rowH - barH) / 2;
            var wFull = (r.total / maxV) * trackW; // full bar width for this row
            var w = wFull * rev; // self-fill driven width

            // the leaf-filled bar: solid fall-tone fill plus settled autumn-leaf
            // texture on top. (Unfilled paper-tone track removed per request.)
            p.noStroke();
            p.fill(col[0], col[1], col[2]);
            p.rect(x0, y, w, barH, 2);
            leafFill_settledTexture(p, sys, i, x0, y, w, barH);

            // labels (bigger fonts)
            p.fill(C.PALETTE.ink);
            p.textAlign(p.RIGHT, p.CENTER);
            p.textStyle(p.BOLD);
            p.textSize(T.annotation + 8);
            p.text(r.condition, x0 - 8, y + barH / 2);
            p.textStyle(p.NORMAL);
            p.fill(90);
            p.textAlign(p.LEFT, p.CENTER);
            p.textSize(T.valueLabel + 4);
            p.text(r.total, x0 + 6 + w, y + barH / 2);
        }

        // ---- publish bar targets to the full-page leaf layer ----
        // The falling leaves are rendered on the site-wide #motes canvas (which
        // spans the whole screen) so they can fall through the page background and
        // land in the bars. Here we publish each bar's target rect in PAGE
        // coordinates (canvas offset + local position) plus the current fill, and
        // the leaf layer (in index.html) reads this every frame.
        var canvasEl = (p.canvas) ? p.canvas : (m.p5canvas || null);
        var rectTop = 0,
            rectLeft = 0;
        if (canvasEl && canvasEl.getBoundingClientRect) {
            var bb = canvasEl.getBoundingClientRect();
            rectTop = bb.top;
            rectLeft = bb.left;
        }
        var targets = [];
        for (var ti = 0; ti < d.length; ti++) {
            var ry = f.y + ti * rowH + (rowH - barH) / 2;
            targets.push({
                x: rectLeft + x0,
                y: rectTop + ry,
                w: (d[ti].total / maxV) * trackW * rev, // current filled width
                h: barH
            });
        }
        window.__leafTargets = {
            active: prog > 0.02 && rev < 1.5, // leaf layer runs while section is engaged
            filling: rev < 0.999,
            bars: targets,
            stamp: (window.performance ? performance.now() : Date.now())
        };

        /*legend(p, f, [
            ['Meditation-Based Studies', col]
        ]);*/
    }

    // ---- leaf-fall helpers (scoped to the conditions chart) ----
    // State lives on the manager so particles persist across draw() frames.
    function leafFill_init(m, rows) {
        if (!m._leafFill) {
            m._leafFill = { leaves: [], rows: rows, seeds: [], startFrame: -1 };
            for (var s = 0; s < 96; s++) m._leafFill.seeds.push(Math.random());
        }
        return m._leafFill;
    }
    // settled-leaf texture: autumn flecks riding on the filled portion of a bar
    function leafFill_settledTexture(p, sys, row, x0, y, w, barH) {
        if (w < 6) return;
        p.noStroke();
        var n = Math.floor(w / 15);
        for (var k = 0; k < n; k++) {
            var s = sys.seeds[(row * 17 + k) % sys.seeds.length];
            var lc = FALL_LEAF[(row * 3 + k) % FALL_LEAF.length];
            var lx = x0 + ((k + 0.5) / n) * w + (s - 0.5) * 6;
            var ly = y + barH * (0.26 + (sys.seeds[(k * 5) % sys.seeds.length]) * 0.52);
            p.fill(lc[0], lc[1], lc[2], 165);
            p.push();
            p.translate(lx, ly);
            p.rotate(s * 6.28);
            p.ellipse(0, 0, barH * 0.34, barH * 0.2);
            p.pop();
        }
    }
    // ---- ai 2 : grouped completion rate ----
    function completion(p, m, prog) {
        var C = U(),
            f = C.frame(m),
            d = (m.medData && m.medData.completion) || [];
        if (!d.length) return;
        // order: mindfulness first
        d = d.slice().sort(function(a, b) { return a.group === 'mindfulness' ? -1 : 1; });
        C.title(p, f, 'Do mindfulness trials get finished?',
            'Share of trials marked "Completed"');
        var rev = C.reveal(prog),
            bw = f.w / (d.length * 2);
        for (var i = 0; i < d.length; i++) {
            var r = d[i];
            var x = f.x + f.w * (i + 0.5) / d.length - bw / 2;
            var h = (r.rate / 100) * f.h * rev;
            p.noStroke();
            var col = r.group === 'mindfulness' ? C.PALETTE.green : C.PALETTE.slate;
            p.fill(col[0], col[1], col[2]);
            p.rect(x, f.y + f.h - h, bw, h, 3);
            p.fill(C.PALETTE.ink);
            p.textAlign(p.CENTER, p.BOTTOM);
            p.textSize(15);
            p.text(r.rate.toFixed(1) + '%', x + bw / 2, f.y + f.h - h - 4);
            p.textSize(12);
            p.fill(90);
            p.textAlign(p.CENTER, p.TOP);
            p.text(fmtGroup(r.group), x + bw / 2, f.y + f.h + 6);
            p.fill(150);
            p.text('n=' + r.total, x + bw / 2, f.y + f.h + 22);
        }
        axisY(p, f, 0, 100, '% completed', 5);
    }

    // ---- ai 3 : volume by condition, colored by completion rate ----
    function volumeQuality(p, m, prog) {
        var C = U(),
            f = C.frame(m),
            d = (m.medData && m.medData.conditions) || [];
        if (!d.length) return;
        C.title(p, f, 'Where the research is concentrated',
            'Bar length = number of trials · color = mindfulness share');
        var rev = C.reveal(prog);
        var maxV = Math.max.apply(null, d.map(function(r) { return r.total; }));
        var rowH = f.h / d.length,
            barH = rowH * 0.62;
        p.textSize(11);
        for (var i = 0; i < d.length; i++) {
            var r = d[i],
                y = f.y + i * rowH + (rowH - barH) / 2;
            var share = r.total ? r.mindfulness / r.total : 0;
            var w = (r.total / maxV) * (f.w - 70) * rev;
            // green where mindfulness share is high, slate where low
            var col = lerpCol(C.PALETTE.slate, C.PALETTE.green, Math.min(1, share / 0.5));
            p.noStroke();
            p.fill(col[0], col[1], col[2]);
            p.rect(f.x + 64, y, w, barH, 2);
            p.fill(C.PALETTE.ink);
            p.textAlign(p.RIGHT, p.CENTER);
            p.text(r.condition, f.x + 58, y + barH / 2);
            p.fill(110);
            p.textAlign(p.LEFT, p.CENTER);
            p.text(Math.round(share * 100) + '% mindful', f.x + 70 + w, y + barH / 2);
        }
    }

    // ---- ai 6 : HR before/after grouped by meditation group ----
    function hrGroup(p, m, prog) {
        var C = U(),
            f = C.frame(m),
            d = (m.medData && m.medData.hr_group) || [];
        if (!d.length) return;
        C.title(p, f, 'Heart rate: before vs. during meditation',
            'Mean BPM by tradition — the effect is not uniform');
        var rev = C.reveal(prog);
        var all = [];
        d.forEach(function(r) { all.push(r.before, r.after); });
        var lo = Math.min.apply(null, all) - 5,
            hi = Math.max.apply(null, all) + 5;
        var groupW = f.w / d.length;
        for (var i = 0; i < d.length; i++) {
            var r = d[i],
                gx = f.x + i * groupW;
            var bw = groupW * 0.28;
            drawCol(p, f, gx + groupW * 0.22 - bw / 2, r.before, lo, hi, bw, C.PALETTE.slate, rev, 'before');
            drawCol(p, f, gx + groupW * 0.58 - bw / 2, r.after, lo, hi, bw, C.PALETTE.blue, rev, 'during');
            p.fill(90);
            p.textAlign(p.CENTER, p.TOP);
            p.textSize(12);
            p.text(fmtGroup(r.group) + '  (n=' + r.n + ')', gx + groupW / 2, f.y + f.h + 22);
        }
        axisY(p, f, lo, hi, 'BPM', 5);
        legend(p, f, [
            ['Before', C.PALETTE.slate],
            ['During', C.PALETTE.blue]
        ]);
    }

    // ---- ai 11 : stress tiers across normalized health metrics ----
    function stressTiers(p, m, prog) {
        var C = U(),
            f = C.frame(m),
            d = (m.medData && m.medData.stress_tiers) || [];
        if (!d.length) return;
        C.title(p, f, 'As stress rises, health markers get worse.');
        var rev = C.reveal(prog);
        var metrics = [
            { key: 'sleep_quality',  label: 'Sleep quality', lo: 4,    hi: 9,     better: 'high', axisLabel: 'Sleep Score' },
            { key: 'sleep_duration', label: 'Sleep hours',   lo: 5.5,  hi: 8.5,   better: 'high', axisLabel: 'Hours of Sleep'        },
            { key: 'heart_rate',     label: 'Resting HR',    lo: 65,   hi: 85,    better: 'low',  axisLabel: 'Resting Heart Rate'        },
            { key: 'daily_steps',    label: 'Daily steps',   lo: 3000, hi: 10000, better: 'high', axisLabel: 'Steps'      }
        ];
        var tierCols = [[44, 123, 182], [253, 174, 97], [215, 48, 39]];
        var groupW = f.w / metrics.length;
        for (var mi = 0; mi < metrics.length; mi++) {
            var mt = metrics[mi],
                gx = f.x + mi * groupW;
            var bw = groupW * 0.22;
            for (var ti = 0; ti < d.length; ti++) {
                var raw = d[ti][mt.key];
                var norm = (raw - mt.lo) / (mt.hi - mt.lo);
                norm = Math.max(0, Math.min(1, norm));
                var h = norm * f.h * rev;
                var x = gx + groupW * (0.2 + ti * 0.25) - bw / 2;
                var col = tierCols[ti];
                p.noStroke();
                p.fill(col[0], col[1], col[2]);
                p.rect(x, f.y + f.h - h, bw, h, 2);
                p.fill(C.PALETTE.ink);
                p.textAlign(p.CENTER, p.BOTTOM);
                p.textSize(14);
                p.text(fmtVal(mt.key, raw), x + bw / 2, f.y + f.h - h - 2);
            }
            p.fill(90);
            p.textAlign(p.CENTER, p.TOP);
            p.textSize(14);
            // p.text(mt.label, gx + groupW / 2, f.y + f.h + 6); // redundant — described by y-axis labels
            // mini y-axis for this metric group
            var axX = gx + 4;
            var axisTicks = [mt.lo, (mt.lo + mt.hi) / 2, mt.hi];
            for (var ai = 0; ai < axisTicks.length; ai++) {
                var tv = axisTicks[ai];
                var ty = f.y + f.h - ((tv - mt.lo) / (mt.hi - mt.lo)) * f.h;
                var tLabel = mt.key === 'daily_steps' ? Math.round(tv / 1000) + 'k' : tv;
                p.stroke(0); p.strokeWeight(0.5);
                p.line(axX - 3, ty, axX + 3, ty);
                p.noStroke(); p.fill(0);
                p.textSize(8); p.textAlign(p.RIGHT, p.CENTER);
                p.text(tLabel, axX - 5, ty);
            }
            p.stroke(0); p.strokeWeight(0.5);
            p.line(axX, f.y, axX, f.y + f.h);
            p.noStroke();
            p.push();
            p.noStroke(); p.fill(0);
            p.textSize(14); p.textAlign(p.CENTER, p.BASELINE);
            p.translate(axX - 20, f.y + f.h / 2);
            p.rotate(-Math.PI / 2);
            p.text(mt.axisLabel, 0, 0);
            p.pop();
        }
        var tierN = [141, 113, 120];
        legend(p, f, d.map(function(t, i) { return [t.tier.replace(' ', ' Stress ') + '  (n=' + tierN[i] + ')', tierCols[i]]; }));
    }

    function fmtVal(key, v) {
        if (key === 'daily_steps') return Math.round(v / 100) / 10 + 'k';
        if (key === 'heart_rate') return Math.round(v);
        return (Math.round(v * 10) / 10);
    }

    // ---- shared drawing primitives ----
    function drawCol(p, f, x, val, lo, hi, bw, col, rev, lab) {
        var h = ((val - lo) / (hi - lo)) * f.h * rev;
        p.noStroke();
        p.fill(col[0], col[1], col[2]);
        p.rect(x, f.y + f.h - h, bw, h, 3);
        p.fill(window.ChartUtils.PALETTE.ink);
        p.textAlign(p.CENTER, p.BOTTOM);
        p.textSize(window.ChartUtils.TYPO.valueLabel);
        p.text(val.toFixed(1), x + bw / 2, f.y + f.h - h - 3);
    }

    function axisY(p, f, lo, hi, label, ticks) {
        var C = U();
        p.stroke(C.PALETTE.grid[0], C.PALETTE.grid[1], C.PALETTE.grid[2]);
        p.strokeWeight(1);
        for (var i = 0; i <= ticks; i++) {
            var yy = f.y + f.h * i / ticks;
            p.line(f.x, yy, f.x + f.w, yy);
            p.noStroke();
            p.fill(150);
            p.textAlign(p.RIGHT, p.CENTER);
            p.textSize(window.ChartUtils.TYPO.tick);
            var val = hi - (hi - lo) * i / ticks;
            p.text(Math.round(val), f.x - 6, yy);
            p.stroke(C.PALETTE.grid[0], C.PALETTE.grid[1], C.PALETTE.grid[2]);
        }
        p.noStroke();
    }

    function legend(p, f, items) {
        var C = U(),
            x = f.x,
            y = f.oy + f.H - 16;
        p.textSize(window.ChartUtils.TYPO.annotation + 6);
        p.textAlign(p.LEFT, p.CENTER);
        for (var i = 0; i < items.length; i++) {
            var c = items[i][1];
            p.noStroke();
            p.fill(c[0], c[1], c[2]);
            p.rect(x, y - 7, 14, 14, 2);
            p.fill(90);
            p.text(items[i][0], x + 20, y);
            x += 16 + p.textWidth(items[i][0]) + 22;
        }
    }

    function lerpCol(a, b, t) {
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    }

    window.VizBar = {
        draw: function(p, manager, ai, progress) {
            if (!manager.medData) return;
            p.push();
            // mindfulness & other meditation are treated as one; the
            // split-based charts (completion, volume, hrGroup) are retired.
            if (ai === 2) conditions(p, manager, progress);
            else if (ai === 7) stressTiers(p, manager, progress);
            p.pop();
        }
    };
})();