// viz_scatter.js
// Router for scatter charts.
//   ai 5  -> HR before vs during meditation, per subject (diagonal = no change)
//   ai 10 -> stress vs sleep quality bubble scatter with trend line (r = -0.90)
// Jitter is cached on the manager so points don't vibrate frame-to-frame.
(function () {
    var U = function () { return window.ChartUtils; };

    function fmtGroup(g) {
        return ({ chi_meditation: 'Chi', kundalini_yoga: 'Kundalini' })[g] || g;
    }

    // ---- ai 5 : before vs during, per subject ----
    function hrScatter(p, m, prog) {
        var C = U(), f = C.frame(m), d = (m.medData && m.medData.hr_paired) || [];
        if (!d.length) return;
        C.title(p, f, 'Does meditation lower heart rate?',
            'Each dot = one person · below the line = HR dropped during meditation');
        var rev = C.reveal(prog);
        var all = [];
        d.forEach(function (r) { all.push(r.before, r.after); });
        var lo = Math.min.apply(null, all) - 6, hi = Math.max.apply(null, all) + 6;
        function sx(v) { return f.x + (v - lo) / (hi - lo) * f.w; }
        function sy(v) { return f.y + f.h - (v - lo) / (hi - lo) * f.h; }

        // grid
        gridBox(p, f);
        // diagonal no-change line
        p.stroke(150); p.strokeWeight(1.4); p.drawingContext.setLineDash([6, 5]);
        p.line(sx(lo), sy(lo), sx(hi), sy(hi));
        p.drawingContext.setLineDash([]);
        p.noStroke(); p.fill(140); p.textAlign(p.LEFT, p.BOTTOM); p.textSize(10);
        p.text('no change', sx(hi) - 70, sy(hi) + 14);

        var groups = { chi_meditation: C.PALETTE.blue, kundalini_yoga: C.PALETTE.amber };
        for (var i = 0; i < d.length; i++) {
            var r = d[i];
            var col = groups[r.group] || C.PALETTE.slate;
            var x = sx(r.before), y = sy(r.after);
            // animate from the diagonal outward
            var dy = sy(r.before);
            y = dy + (y - dy) * rev;
            var dropped = r.after < r.before;
            p.noStroke();
            p.fill(col[0], col[1], col[2], 210);
            p.ellipse(x, y, 12, 12);
            if (!dropped) { // outline rises (went up)
                p.noFill(); p.stroke(C.PALETTE.red[0], C.PALETTE.red[1], C.PALETTE.red[2]);
                p.strokeWeight(1.6); p.ellipse(x, y, 16, 16); p.noStroke();
            }
        }
        axisXY(p, f, lo, hi, lo, hi, 'before (BPM)', 'during (BPM)');
        legend(p, f, [['Chi', C.PALETTE.blue], ['Kundalini', C.PALETTE.amber],
            ['HR rose', C.PALETTE.red]]);
    }

    // ---- ai 10 : stress vs sleep quality bubble + trend ----
    function stressSleep(p, m, prog) {
        var C = U(), f = C.frame(m), d = (m.medData && m.medData.stress_sleep) || [];
        if (!d.length) return;
        var r = (m.medData && m.medData.stress_sleep_r);
        C.title(p, f, 'Stress vs. sleep quality',
            'n=374 individuals · Pearson r = ' + r + ' (strong negative)');
        var rev = C.reveal(prog);
        var loX = 2.5, hiX = 8.5, loY = 3.5, hiY = 9.5;
        function sx(v) { return f.x + (v - loX) / (hiX - loX) * f.w; }
        function sy(v) { return f.y + f.h - (v - loY) / (hiY - loY) * f.h; }
        gridBox(p, f);

        // cache jitter once
        if (!m._ssJit || m._ssJit.length !== d.length) {
            m._ssJit = d.map(function () {
                return { jx: (Math.random() - 0.5) * 0.6, jy: (Math.random() - 0.5) * 0.6 };
            });
        }
        // count overlaps for bubble size
        var key = {};
        d.forEach(function (pt) { var k = pt.stress + ',' + pt.quality; key[k] = (key[k] || 0) + 1; });

        var colByDis = { None: C.PALETTE.green, Insomnia: C.PALETTE.red, 'Sleep Apnea': C.PALETTE.amber };
        for (var i = 0; i < d.length; i++) {
            var pt = d[i], j = m._ssJit[i];
            var x = sx(pt.stress + j.jx), y = sy(pt.quality + j.jy);
            var col = colByDis[pt.disorder] || C.PALETTE.slate;
            p.noStroke();
            p.fill(col[0], col[1], col[2], 130 * rev + 20);
            p.ellipse(x, y, 9, 9);
        }
        // trend line via least squares on raw points
        var xs = d.map(function (q) { return q.stress; }), ys = d.map(function (q) { return q.quality; });
        var n = xs.length, mx = avg(xs), my = avg(ys);
        var b = sum(xs.map(function (xx, k) { return (xx - mx) * (ys[k] - my); })) /
            sum(xs.map(function (xx) { return (xx - mx) * (xx - mx); }));
        var a = my - b * mx;
        p.stroke(C.PALETTE.ink[0], C.PALETTE.ink[1], C.PALETTE.ink[2]); p.strokeWeight(2.2);
        p.line(sx(3), sy(a + b * 3), sx(8), sy(a + b * 8));
        p.noStroke();

        axisXY(p, f, loX, hiX, loY, hiY, 'stress level (1-10)', 'sleep quality (1-10)');
        legend(p, f, [['No disorder', C.PALETTE.green], ['Insomnia', C.PALETTE.red],
            ['Sleep apnea', C.PALETTE.amber]]);
    }

    // ---- primitives ----
    function gridBox(p, f) {
        var C = U();
        p.stroke(C.PALETTE.grid[0], C.PALETTE.grid[1], C.PALETTE.grid[2]); p.strokeWeight(1);
        for (var i = 0; i <= 5; i++) {
            p.line(f.x, f.y + f.h * i / 5, f.x + f.w, f.y + f.h * i / 5);
            p.line(f.x + f.w * i / 5, f.y, f.x + f.w * i / 5, f.y + f.h);
        }
        p.noStroke();
    }
    function axisXY(p, f, loX, hiX, loY, hiY, lx, ly) {
        p.noStroke(); p.fill(120); p.textSize(11);
        p.textAlign(p.CENTER, p.TOP); p.text(lx, f.x + f.w / 2, f.y + f.h + 24);
        p.push();
        p.translate(f.ox + 14, f.y + f.h / 2); p.rotate(-Math.PI / 2);
        p.textAlign(p.CENTER, p.CENTER); p.text(ly, 0, 0); p.pop();
    }
    function legend(p, f, items) {
        var x = f.x, y = f.oy + f.H - 16;
        p.textSize(11); p.textAlign(p.LEFT, p.CENTER);
        for (var i = 0; i < items.length; i++) {
            var c = items[i][1];
            p.noStroke(); p.fill(c[0], c[1], c[2]); p.rect(x, y - 5, 11, 11, 2);
            p.fill(90); p.text(items[i][0], x + 16, y);
            x += 16 + p.textWidth(items[i][0]) + 20;
        }
    }
    function avg(a) { return a.reduce(function (s, v) { return s + v; }, 0) / a.length; }
    function sum(a) { return a.reduce(function (s, v) { return s + v; }, 0); }

    window.VizScatter = {
        draw: function (p, manager, ai, progress) {
            if (!manager.medData) return;
            p.push();
            // HR scatter now lives in the heart-rate carousel (HTML section).
            if (ai === 6) stressSleep(p, manager, progress);
            p.pop();
        }
    };
})();
