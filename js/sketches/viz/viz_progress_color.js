// viz_progress_color.js — Time series (7), HRV strip (8), Box plot (12)
(function () {

    function drawHrTimeseries(p, manager) {
        // Section 7: HR time series, full-viz layout
        var d = manager.medData && manager.medData.hr_timeseries;
        if (!d || !d.length) return;
        var ox = (manager.offsetX || 20) + 50;
        var oy = (manager.offsetY || 0) + 30;
        var w = (manager.width || 600) - 80;
        var totalH = (manager.height || 520) - 60;
        var chartH = totalH / 2 - 20;
        var colors = [p.color(77, 184, 164), p.color(224, 123, 84)];

        p.fill(30); p.noStroke(); p.textAlign(p.LEFT, p.TOP); p.textSize(14); p.textStyle(p.BOLD);
        p.text('Heart Rate During Meditation — Beat by Beat', ox - 30, oy - 20);
        p.textStyle(p.NORMAL);

        for (var s = 0; s < d.length && s < 2; s++) {
            var subj = d[s];
            var pts = subj.points;
            if (!pts || !pts.length) continue;
            var baseY = oy + s * (chartH + 40);
            var minBPM = 50, maxBPM = 110;
            var maxMin = 0;
            for (var j = 0; j < pts.length; j++) { if (pts[j].min > maxMin) maxMin = pts[j].min; }
            if (maxMin < 1) maxMin = 55;

            p.noStroke(); p.fill(60); p.textSize(11); p.textAlign(p.LEFT, p.TOP);
            p.text('Subject ' + subj.subject + ' (' + subj.group.replace(/_/g,' ') + ')', ox, baseY);

            p.stroke(235); p.strokeWeight(0.5);
            for (var bpm = 60; bpm <= 100; bpm += 10) {
                var yy = baseY + 16 + chartH - ((bpm - minBPM) / (maxBPM - minBPM)) * chartH;
                p.line(ox, yy, ox + w, yy);
                p.noStroke(); p.fill(140); p.textAlign(p.RIGHT, p.CENTER); p.textSize(9);
                p.text(bpm, ox - 4, yy);
                p.stroke(235);
            }

            p.noFill(); p.stroke(colors[s]); p.strokeWeight(1.5);
            p.beginShape();
            for (var j = 0; j < pts.length; j++) {
                var xx = ox + (pts[j].min / maxMin) * w;
                var yy = baseY + 16 + chartH - ((pts[j].bpm - minBPM) / (maxBPM - minBPM)) * chartH;
                yy = Math.max(baseY + 16, Math.min(baseY + 16 + chartH, yy));
                p.vertex(xx, yy);
            }
            p.endShape();

            p.noStroke(); p.fill(120); p.textAlign(p.CENTER, p.TOP); p.textSize(9);
            for (var m = 0; m <= maxMin; m += 10) {
                p.text(m + 'min', ox + (m / maxMin) * w, baseY + 16 + chartH + 4);
            }
        }
    }

    function drawHrv(p, manager) {
        // Section 8: HRV comparison — pre vs during dot strips
        var d = manager.medData && manager.medData.hrv;
        if (!d) return;
        var ox = (manager.offsetX || 20) + 60;
        var oy = (manager.offsetY || 0) + 60;
        var w = (manager.width || 600) - 120;
        var h = (manager.height || 520) - 140;

        var pre = d.pre_meditation || [];
        var med = d.during_meditation || [];
        var maxV = 20;

        p.fill(30); p.noStroke(); p.textAlign(p.LEFT, p.TOP); p.textSize(14); p.textStyle(p.BOLD);
        p.text('Heart Rate Variability (Std Dev BPM)', ox - 40, oy - 50);
        p.textStyle(p.NORMAL); p.textSize(11); p.fill(100);
        p.text('Each dot = one subject\'s beat-to-beat standard deviation', ox - 40, oy - 32);

        var stripH = h / 2 - 30;
        var labels = ['Pre-Meditation', 'During Meditation'];
        var datasets = [pre, med];
        var cols = [p.color(111, 168, 220, 200), p.color(224, 123, 84, 200)];

        for (var g = 0; g < 2; g++) {
            var baseY = oy + g * (stripH + 60);
            var data = datasets[g];
            p.noStroke(); p.fill(50); p.textAlign(p.LEFT, p.TOP); p.textSize(12); p.textStyle(p.BOLD);
            p.text(labels[g] + ' (n=' + data.length + ')', ox, baseY - 14);
            p.textStyle(p.NORMAL);
            p.stroke(200); p.strokeWeight(1);
            p.line(ox, baseY + stripH, ox + w, baseY + stripH);
            p.noStroke(); p.fill(120); p.textAlign(p.CENTER, p.TOP); p.textSize(9);
            for (var v = 0; v <= maxV; v += 5) {
                var xx = ox + (v / maxV) * w;
                p.text(v, xx, baseY + stripH + 4);
                p.stroke(240); p.line(xx, baseY, xx, baseY + stripH); p.noStroke();
            }
            p.noStroke();
            for (var i = 0; i < data.length; i++) {
                var xx = ox + (Math.min(data[i], maxV) / maxV) * w;
                var jy = baseY + 10 + (i / data.length) * (stripH - 20);
                p.fill(cols[g]);
                p.ellipse(xx, jy, 14, 14);
                p.fill(40); p.textAlign(p.CENTER, p.CENTER); p.textSize(7);
                p.text(data[i].toFixed(1), xx, jy);
            }
            var mean = g === 0 ? d.pre_stats.mean : d.med_stats.mean;
            var mx = ox + (mean / maxV) * w;
            p.stroke(50); p.strokeWeight(2);
            p.line(mx, baseY, mx, baseY + stripH);
            p.noStroke(); p.fill(30); p.textAlign(p.CENTER, p.BOTTOM); p.textSize(10);
            p.text('mean: ' + mean, mx, baseY - 2);
        }
    }

    function drawSleepDisorder(p, manager) {
        // Section 12: Sleep quality by disorder box plot
        var d = manager.medData && manager.medData.sleep_disorder;
        if (!d || !d.length) return;
        var ox = (manager.offsetX || 20) + 60;
        var oy = (manager.offsetY || 0) + 50;
        var w = (manager.width || 600) - 120;
        var h = (manager.height || 520) - 120;
        var n = d.length;
        var groupW = w / n;
        var boxW = Math.min(groupW * 0.5, 80);
        var minV = 3, maxV = 10;

        function yPos(v) { return oy + h - ((v - minV) / (maxV - minV)) * h; }

        p.fill(30); p.noStroke();
        p.textAlign(p.LEFT, p.TOP); p.textSize(14); p.textStyle(p.BOLD);
        p.text('Sleep Quality by Disorder Status', ox - 40, oy - 40);
        p.textStyle(p.NORMAL);

        p.stroke(230); p.strokeWeight(0.5);
        for (var v = 4; v <= 10; v++) {
            var yy = yPos(v);
            p.line(ox, yy, ox + w, yy);
            p.noStroke(); p.fill(120); p.textAlign(p.RIGHT, p.CENTER); p.textSize(10);
            p.text(v, ox - 8, yy);
            p.stroke(230);
        }
        p.noStroke(); p.fill(60); p.textSize(11);
        p.push();
        p.translate(ox - 45, oy + h / 2);
        p.rotate(-p.HALF_PI);
        p.textAlign(p.CENTER, p.CENTER);
        p.text('Sleep Quality (1-10)', 0, 0);
        p.pop();

        var boxColors = [
            p.color(77, 184, 164, 160),
            p.color(224, 180, 80, 160),
            p.color(220, 120, 100, 160)
        ];

        for (var i = 0; i < n; i++) {
            var item = d[i];
            var cx = ox + i * groupW + groupW / 2;
            var bx = cx - boxW / 2;

            p.stroke(100); p.strokeWeight(1.5);
            p.line(cx, yPos(item.min), cx, yPos(item.q1));
            p.line(cx, yPos(item.q3), cx, yPos(item.max));
            var capW = boxW * 0.4;
            p.line(cx - capW / 2, yPos(item.min), cx + capW / 2, yPos(item.min));
            p.line(cx - capW / 2, yPos(item.max), cx + capW / 2, yPos(item.max));

            p.fill(boxColors[i]);
            p.stroke(80); p.strokeWeight(1);
            var boxTop = yPos(item.q3);
            var boxBot = yPos(item.q1);
            p.rect(bx, boxTop, boxW, boxBot - boxTop);

            p.stroke(40); p.strokeWeight(2);
            var medY = yPos(item.median);
            p.line(bx, medY, bx + boxW, medY);

            p.noStroke();
            var vals = item.values || [];
            for (var j = 0; j < vals.length; j++) {
                var jx = cx + (Math.random() - 0.5) * boxW * 1.2;
                var jy = yPos(vals[j]) + (Math.random() - 0.5) * 4;
                p.fill(boxColors[i].levels[0], boxColors[i].levels[1], boxColors[i].levels[2], 50);
                p.ellipse(jx, jy, 4, 4);
            }

            p.noStroke(); p.fill(40);
            p.textAlign(p.CENTER, p.TOP); p.textSize(12); p.textStyle(p.BOLD);
            p.text(item.disorder, cx, oy + h + 8);
            p.textStyle(p.NORMAL); p.textSize(10); p.fill(100);
            p.text('n=' + item.n, cx, oy + h + 24);
            p.fill(60); p.textSize(9); p.textAlign(p.CENTER, p.BOTTOM);
            p.text('mean: ' + item.mean, cx, yPos(item.mean) - 10);
        }
    }

    window.VizProgressColor = {
        draw: function (p, manager, ai, progress) {
            p.push();
            if (ai === 7) drawHrTimeseries(p, manager);
            else if (ai === 8) drawHrv(p, manager);
            else if (ai === 12) drawSleepDisorder(p, manager);
            p.pop();
        }
    };
})();
