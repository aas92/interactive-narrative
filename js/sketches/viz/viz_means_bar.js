// viz_means_bar.js
// Grouped vertical bar chart: mean STAI-State anxiety by exercise condition.
// Exposes window.MeansBarViz with draw(p, manager, ai, progress).
// Y-axis truncated 30–42 with a break indicator near the baseline.
(function () {
    var LO = 30, HI = 42;

    function yPos(f, val) {
        return f.y + f.h - ((val - LO) / (HI - LO)) * f.h;
    }

    function draw(p, manager, ai, progress) {
        if (!manager.medData || !manager.medData.stai_means) return;
        var C = window.ChartUtils;
        var T = C.TYPO;
        var f = C.frame(manager);
        var d = manager.medData.stai_means;
        var rev = C.reveal(progress);

        C.title(p, f,
            'Mean state anxiety after a single exercise',
            'STAI-State score (lower = less anxious) · 95 % CI whiskers');

        var bw = (f.w / d.length) * 0.45;
        var colControl = C.PALETTE.slate;
        var colMindful = C.PALETTE.green;

        p.push();

        // --- y-axis grid lines & tick labels ---
        var ticks = [30, 32, 34, 36, 38, 40, 42];
        for (var ti = 0; ti < ticks.length; ti++) {
            var tv = ticks[ti];
            var ty = yPos(f, tv);
            p.stroke(C.PALETTE.grid[0], C.PALETTE.grid[1], C.PALETTE.grid[2]);
            p.strokeWeight(1);
            p.line(f.x, ty, f.x + f.w, ty);
            p.noStroke();
            p.fill(150);
            p.textAlign(p.RIGHT, p.CENTER);
            p.textSize(T.tick);
            p.text(tv, f.x - 6, ty);
        }

        // --- y-axis label ---
        p.push();
        p.noStroke();
        p.fill(90);
        p.textSize(T.axisTitle);
        p.textAlign(p.CENTER, p.CENTER);
        p.translate(f.ox + 12, f.y + f.h / 2);
        p.rotate(-Math.PI / 2);
        p.text('STAI-State (30–42)', 0, 0);
        p.pop();

        // --- axis break indicator (zigzag near baseline) ---
        var breakY = f.y + f.h + 8;
        p.stroke(80); p.strokeWeight(1.5);
        p.noFill();
        p.beginShape();
        p.vertex(f.x - 10, breakY - 4);
        p.vertex(f.x - 6,  breakY + 4);
        p.vertex(f.x - 2,  breakY - 4);
        p.vertex(f.x + 2,  breakY + 4);
        p.endShape();
        p.noStroke();

        // --- bars, whiskers, labels ---
        for (var i = 0; i < d.length; i++) {
            var r = d[i];
            var cx = f.x + (i + 0.5) * (f.w / d.length);
            var x  = cx - bw / 2;
            var col = r.is_control ? colControl : colMindful;

            // bar (grows up from baseline with reveal)
            var barTop    = yPos(f, r.mean);
            var baselineY = yPos(f, LO);
            var barH = (baselineY - barTop) * rev;
            p.noStroke();
            p.fill(col[0], col[1], col[2]);
            p.rect(x, baselineY - barH, bw, barH, 3);

            // value label above bar
            p.fill(C.PALETTE.ink);
            p.textAlign(p.CENTER, p.BOTTOM);
            p.textSize(T.valueLabel);
            p.text(r.mean.toFixed(1), cx, baselineY - barH - 3);

            // 95 % CI whiskers
            var ciTop    = yPos(f, r.ci_upper);
            var ciBottom = yPos(f, r.ci_lower);
            var capW = bw * 0.35;
            p.stroke(col[0], col[1], col[2]);
            p.strokeWeight(1.5);
            p.line(cx, ciTop, cx, ciBottom);
            p.line(cx - capW, ciTop,    cx + capW, ciTop);
            p.line(cx - capW, ciBottom, cx + capW, ciBottom);
            p.noStroke();

            // x-axis label
            p.fill(90);
            p.textAlign(p.CENTER, p.TOP);
            p.textSize(T.annotation);
            p.text(r.label, cx, f.y + f.h + 6);
        }

        p.pop();
    }

    window.MeansBarViz = { draw: draw };
})();
