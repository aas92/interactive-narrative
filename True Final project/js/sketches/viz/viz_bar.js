// viz_bar.js
// Router for all bar-style charts. Switches on the active index (ai).
//   ai 1  -> conditions stacked (mindfulness vs other)
//   ai 2  -> completion rates grouped (mindfulness vs other)
//   ai 3  -> research volume by condition, colored by completion rate
//   ai 6  -> heart rate before/after by meditation group (grouped)
//   ai 11 -> stress tiers across health metrics (normalized, honest axis)
(function () {
    var U = function () { return window.ChartUtils; };

    function fmtGroup(g) {
        return ({
            chi_meditation: 'Chi', kundalini_yoga: 'Kundalini',
            mindfulness: 'Mindfulness', other: 'Other meditation'
        })[g] || g;
    }

    // ---- ai 1 : single-color "Meditation-Based Studies" by condition ----
    // Mindfulness and other meditation are treated as ONE category (total).
    function conditions(p, m, prog) {
        var C = U(), T = C.TYPO, f = C.frame(m);
        var d = (m.medData && m.medData.conditions) || [];
        if (!d.length) return;
        // sort descending by total so the psychological/emotional load reads top-down
        d = d.slice().sort(function (a, b) { return b.total - a.total; });
        C.title(p, f, 'What is meditation studied for?',
            'Meditation-Based Studies by condition (all meditation types combined)');
        var rev = C.reveal(prog);
        var maxV = Math.max.apply(null, d.map(function (r) { return r.total; }));
        var rowH = f.h / d.length, barH = rowH * 0.6;
        var col = C.VAR.meditationStudies;
        p.textSize(T.annotation);
        for (var i = 0; i < d.length; i++) {
            var r = d[i], y = f.y + i * rowH + (rowH - barH) / 2;
            var w = (r.total / maxV) * (f.w - 90) * rev;
            p.noStroke();
            p.fill(col[0], col[1], col[2]);
            p.rect(f.x + 84, y, w, barH, 2);
            p.fill(C.PALETTE.ink);
            p.textAlign(p.RIGHT, p.CENTER);
            p.textSize(T.annotation);
            p.text(r.condition, f.x + 78, y + barH / 2);
            p.fill(110);
            p.textAlign(p.LEFT, p.CENTER);
            p.textSize(T.valueLabel);
            p.text(r.total, f.x + 88 + w, y + barH / 2);
        }
        legend(p, f, [['Meditation-Based Studies', col]]);
    }

    // ---- ai 2 : grouped completion rate ----
    function completion(p, m, prog) {
        var C = U(), f = C.frame(m), d = (m.medData && m.medData.completion) || [];
        if (!d.length) return;
        // order: mindfulness first
        d = d.slice().sort(function (a, b) { return a.group === 'mindfulness' ? -1 : 1; });
        C.title(p, f, 'Do mindfulness trials get finished?',
            'Share of trials marked "Completed"');
        var rev = C.reveal(prog), bw = f.w / (d.length * 2);
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
        var C = U(), f = C.frame(m), d = (m.medData && m.medData.conditions) || [];
        if (!d.length) return;
        C.title(p, f, 'Where the research is concentrated',
            'Bar length = number of trials · color = mindfulness share');
        var rev = C.reveal(prog);
        var maxV = Math.max.apply(null, d.map(function (r) { return r.total; }));
        var rowH = f.h / d.length, barH = rowH * 0.62;
        p.textSize(11);
        for (var i = 0; i < d.length; i++) {
            var r = d[i], y = f.y + i * rowH + (rowH - barH) / 2;
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
        var C = U(), f = C.frame(m), d = (m.medData && m.medData.hr_group) || [];
        if (!d.length) return;
        C.title(p, f, 'Heart rate: before vs. during meditation',
            'Mean BPM by tradition — the effect is not uniform');
        var rev = C.reveal(prog);
        var all = [];
        d.forEach(function (r) { all.push(r.before, r.after); });
        var lo = Math.min.apply(null, all) - 5, hi = Math.max.apply(null, all) + 5;
        var groupW = f.w / d.length;
        for (var i = 0; i < d.length; i++) {
            var r = d[i], gx = f.x + i * groupW;
            var bw = groupW * 0.28;
            drawCol(p, f, gx + groupW * 0.22 - bw / 2, r.before, lo, hi, bw, C.PALETTE.slate, rev, 'before');
            drawCol(p, f, gx + groupW * 0.58 - bw / 2, r.after, lo, hi, bw, C.PALETTE.blue, rev, 'during');
            p.fill(90); p.textAlign(p.CENTER, p.TOP); p.textSize(12);
            p.text(fmtGroup(r.group) + '  (n=' + r.n + ')', gx + groupW / 2, f.y + f.h + 22);
        }
        axisY(p, f, lo, hi, 'BPM', 5);
        legend(p, f, [['Before', C.PALETTE.slate], ['During', C.PALETTE.blue]]);
    }

    // ---- ai 11 : stress tiers across normalized health metrics ----
    function stressTiers(p, m, prog) {
        var C = U(), f = C.frame(m), d = (m.medData && m.medData.stress_tiers) || [];
        if (!d.length) return;
        C.title(p, f, 'As stress rises, health markers worsen',
            'Each metric scaled 0–100% of its own range (honest comparison)');
        var rev = C.reveal(prog);
        var metrics = [
            { key: 'sleep_quality', label: 'Sleep quality', lo: 4, hi: 9, better: 'high' },
            { key: 'sleep_duration', label: 'Sleep hours', lo: 5.5, hi: 8.5, better: 'high' },
            { key: 'heart_rate', label: 'Resting HR', lo: 65, hi: 85, better: 'low' },
            { key: 'daily_steps', label: 'Daily steps', lo: 3000, hi: 10000, better: 'high' }
        ];
        var tierCols = [C.PALETTE.green, C.PALETTE.amber, C.PALETTE.red];
        var groupW = f.w / metrics.length;
        for (var mi = 0; mi < metrics.length; mi++) {
            var mt = metrics[mi], gx = f.x + mi * groupW;
            var bw = groupW * 0.22;
            for (var ti = 0; ti < d.length; ti++) {
                var raw = d[ti][mt.key];
                var norm = (raw - mt.lo) / (mt.hi - mt.lo);
                norm = Math.max(0, Math.min(1, norm));
                var h = norm * f.h * rev;
                var x = gx + groupW * (0.2 + ti * 0.25) - bw / 2;
                var col = tierCols[ti];
                p.noStroke(); p.fill(col[0], col[1], col[2]);
                p.rect(x, f.y + f.h - h, bw, h, 2);
                p.fill(C.PALETTE.ink); p.textAlign(p.CENTER, p.BOTTOM); p.textSize(9.5);
                p.text(fmtVal(mt.key, raw), x + bw / 2, f.y + f.h - h - 2);
            }
            p.fill(90); p.textAlign(p.CENTER, p.TOP); p.textSize(11);
            p.text(mt.label, gx + groupW / 2, f.y + f.h + 6);
        }
        legend(p, f, d.map(function (t, i) { return [t.tier, tierCols[i]]; }));
    }

    function fmtVal(key, v) {
        if (key === 'daily_steps') return Math.round(v / 100) / 10 + 'k';
        if (key === 'heart_rate') return Math.round(v);
        return (Math.round(v * 10) / 10);
    }

    // ---- shared drawing primitives ----
    function drawCol(p, f, x, val, lo, hi, bw, col, rev, lab) {
        var h = ((val - lo) / (hi - lo)) * f.h * rev;
        p.noStroke(); p.fill(col[0], col[1], col[2]);
        p.rect(x, f.y + f.h - h, bw, h, 3);
        p.fill(window.ChartUtils.PALETTE.ink);
        p.textAlign(p.CENTER, p.BOTTOM); p.textSize(window.ChartUtils.TYPO.valueLabel);
        p.text(val.toFixed(1), x + bw / 2, f.y + f.h - h - 3);
    }
    function axisY(p, f, lo, hi, label, ticks) {
        var C = U();
        p.stroke(C.PALETTE.grid[0], C.PALETTE.grid[1], C.PALETTE.grid[2]); p.strokeWeight(1);
        for (var i = 0; i <= ticks; i++) {
            var yy = f.y + f.h * i / ticks;
            p.line(f.x, yy, f.x + f.w, yy);
            p.noStroke(); p.fill(150); p.textAlign(p.RIGHT, p.CENTER); p.textSize(window.ChartUtils.TYPO.tick);
            var val = hi - (hi - lo) * i / ticks;
            p.text(Math.round(val), f.x - 6, yy);
            p.stroke(C.PALETTE.grid[0], C.PALETTE.grid[1], C.PALETTE.grid[2]);
        }
        p.noStroke();
    }
    function legend(p, f, items) {
        var C = U(), x = f.x, y = f.oy + f.H - 16;
        p.textSize(window.ChartUtils.TYPO.annotation); p.textAlign(p.LEFT, p.CENTER);
        for (var i = 0; i < items.length; i++) {
            var c = items[i][1];
            p.noStroke(); p.fill(c[0], c[1], c[2]);
            p.rect(x, y - 5, 11, 11, 2);
            p.fill(90); p.text(items[i][0], x + 16, y);
            x += 16 + p.textWidth(items[i][0]) + 22;
        }
    }
    function lerpCol(a, b, t) {
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    }

    window.VizBar = {
        draw: function (p, manager, ai, progress) {
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
