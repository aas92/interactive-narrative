// viz_histogram.js
// Grouped histogram: STAI-State score distribution for control vs. body-scan.
// Exposes window.HistogramViz with draw(p, manager, ai, progress).
(function () {
    var LO = 0, HI = 28;

    function yPos(f, val) {
        return f.y + f.h - ((val - LO) / (HI - LO)) * f.h;
    }

    function draw(p, manager, ai, progress) {
        if (!manager.medData || !manager.medData.stai_histogram) return;
        var C = window.ChartUtils;
        var T = C.TYPO;
        var f = C.frame(manager);
        var d = manager.medData.stai_histogram;
        var rev = C.reveal(progress);

        C.title(p, f,
            'Where people landed after the exercise',
            'Distribution of STAI-State scores by condition');

        var colControl  = C.PALETTE.slate;
        var colBodyscan = C.PALETTE.green;

        var binW = f.w / d.length;
        var bw   = binW * 0.38;

        p.push();

        // --- y-axis grid lines & tick labels ---
        var ticks = [0, 5, 10, 15, 20, 25];
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
            p.text(tv + '%', f.x - 6, ty);
        }

        // --- y-axis label ---
        p.push();
        p.noStroke();
        p.fill(90);
        p.textSize(T.axisTitle);
        p.textAlign(p.CENTER, p.CENTER);
        p.translate(f.ox + 12, f.y + f.h / 2);
        p.rotate(-Math.PI / 2);
        p.text('% of participants in condition', 0, 0);
        p.pop();

        // --- bars and x-axis bin labels ---
        var baselineY = yPos(f, LO);
        for (var i = 0; i < d.length; i++) {
            var r = d[i];
            var gx = f.x + i * binW + binW / 2;

            // control bar (left)
            var cx1 = gx - bw * 0.55;
            var h1  = ((r.control_pct - LO) / (HI - LO)) * f.h * rev;
            p.noStroke();
            p.fill(colControl[0], colControl[1], colControl[2]);
            p.rect(cx1 - bw / 2, baselineY - h1, bw, h1, 2);

            // bodyscan bar (right)
            var cx2 = gx + bw * 0.55;
            var h2  = ((r.bodyscan_pct - LO) / (HI - LO)) * f.h * rev;
            p.fill(colBodyscan[0], colBodyscan[1], colBodyscan[2]);
            p.rect(cx2 - bw / 2, baselineY - h2, bw, h2, 2);

            // bin label
            p.noStroke();
            p.fill(90);
            p.textAlign(p.CENTER, p.TOP);
            p.textSize(T.tick);
            p.text(r.bin, gx, f.y + f.h + 6);
        }

        // --- x-axis title ---
        p.noStroke();
        p.fill(90);
        p.textSize(T.axisTitle);
        p.textAlign(p.CENTER, p.TOP);
        p.text('STAI-State total (20 = lowest, 80 = highest)', f.x + f.w / 2, f.y + f.h + 22);

        // --- legend (top-right, same vertical band as title) ---
        var items = [
            ['Control (n=482, mean = 39.0)',   colControl],
            ['Body scan (n=451, mean = 33.6)', colBodyscan]
        ];
        p.textSize(T.annotation);
        p.textAlign(p.LEFT, p.CENTER);
        // measure total width so we can right-align against the frame edge
        var legendW = 0;
        for (var j = 0; j < items.length; j++) {
            legendW += 16 + p.textWidth(items[j][0]) + 22;
        }
        var lx = f.ox + f.W - 8 - legendW;
        var ly = f.oy + 20;
        for (var j = 0; j < items.length; j++) {
            var c = items[j][1];
            p.noStroke();
            p.fill(c[0], c[1], c[2]);
            p.rect(lx, ly - 5, 11, 11, 2);
            p.fill(90);
            p.text(items[j][0], lx + 16, ly);
            lx += 16 + p.textWidth(items[j][0]) + 22;
        }

        p.pop();
    }

    window.HistogramViz = { draw: draw };
})();
