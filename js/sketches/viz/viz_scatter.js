// viz_scatter.js — Scatter plots for sections 5 and 10
(function () {

    function drawHrScatter(p, manager) {
        // Section 5: HR pre vs during meditation (scatter with diagonal)
        var d = manager.medData && manager.medData.hr_scatter;
        if (!d) return;
        var ox = (manager.offsetX || 20) + 40;
        var oy = (manager.offsetY || 0) + 50;
        var w = (manager.width || 600) - 100;
        var h = (manager.height || 520) - 100;
        var minBPM = 55, maxBPM = 100;

        function xPos(v) { return ox + ((v - minBPM) / (maxBPM - minBPM)) * w; }
        function yPos(v) { return oy + h - ((v - minBPM) / (maxBPM - minBPM)) * h; }

        p.fill(30); p.noStroke(); p.textAlign(p.LEFT, p.TOP); p.textSize(14); p.textStyle(p.BOLD);
        p.text('Heart Rate: Pre vs. During Meditation', ox - 30, oy - 40);
        p.textStyle(p.NORMAL);

        p.stroke(200); p.strokeWeight(1);
        p.line(ox, oy, ox, oy + h);
        p.line(ox, oy + h, ox + w, oy + h);
        p.stroke(180); p.strokeWeight(1);
        p.drawingContext.setLineDash([5, 5]);
        p.line(xPos(minBPM), yPos(minBPM), xPos(maxBPM), yPos(maxBPM));
        p.drawingContext.setLineDash([]);

        p.noStroke(); p.fill(100); p.textSize(10); p.textAlign(p.CENTER, p.TOP);
        for (var v = 60; v <= 100; v += 10) {
            p.text(v, xPos(v), oy + h + 5);
            p.textAlign(p.RIGHT, p.CENTER);
            p.text(v, ox - 5, yPos(v));
            p.textAlign(p.CENTER, p.TOP);
        }
        p.textSize(11); p.fill(60);
        p.text('Pre-Meditation Mean BPM', ox + w / 2, oy + h + 22);
        p.push(); p.translate(ox - 35, oy + h / 2); p.rotate(-p.HALF_PI);
        p.textAlign(p.CENTER, p.CENTER); p.text('During Meditation Mean BPM', 0, 0);
        p.pop();

        p.noStroke();
        for (var i = 0; i < d.length; i++) {
            var pt = d[i];
            var ischi = pt.group.indexOf('chi') >= 0;
            p.fill(ischi ? p.color(31, 88, 152, 200) : p.color(183, 72, 31, 200));
            p.ellipse(xPos(pt.pre_bpm), yPos(pt.med_bpm), 12, 12);
        }
        var lx = ox + w - 150, ly = oy + 10;
        p.fill(31, 88, 152); p.ellipse(lx, ly, 10, 10);
        p.fill(50); p.textAlign(p.LEFT, p.CENTER); p.textSize(10);
        p.text('Chi Meditation', lx + 10, ly);
        p.fill(183, 72, 31); p.ellipse(lx, ly + 16, 10, 10);
        p.fill(50); p.text('Kundalini Yoga', lx + 10, ly + 16);
        p.fill(150); p.textSize(9); p.textAlign(p.LEFT, p.CENTER);
        p.text('No Change Line', xPos(88), yPos(90));
    }

    function drawStressSleep(p, manager) {
        // Section 10: Stress vs sleep quality bubble scatter
        var d = manager.medData && manager.medData.stress_sleep;
        if (!d) return;
        var ox = (manager.offsetX || 20) + 50;
        var oy = (manager.offsetY || 0) + 50;
        var w = (manager.width || 600) - 100;
        var h = (manager.height || 520) - 110;
        var minS = 2, maxS = 9, minSQ = 3, maxSQ = 10;

        p.fill(30); p.noStroke(); p.textAlign(p.LEFT, p.TOP); p.textSize(14); p.textStyle(p.BOLD);
        p.text('Stress vs. Sleep Quality (n=374)', ox - 30, oy - 40);
        p.textStyle(p.NORMAL);

        p.stroke(230); p.strokeWeight(0.5);
        for (var s = minS; s <= maxS; s++) {
            var xx = ox + ((s - minS) / (maxS - minS)) * w;
            p.line(xx, oy, xx, oy + h);
            p.noStroke(); p.fill(120); p.textAlign(p.CENTER, p.TOP); p.textSize(10);
            p.text(s, xx, oy + h + 5);
            p.stroke(230);
        }
        for (var sq = minSQ; sq <= maxSQ; sq++) {
            var yy = oy + h - ((sq - minSQ) / (maxSQ - minSQ)) * h;
            p.line(ox, yy, ox + w, yy);
            p.noStroke(); p.fill(120); p.textAlign(p.RIGHT, p.CENTER); p.textSize(10);
            p.text(sq, ox - 5, yy);
            p.stroke(230);
        }

        p.noStroke(); p.fill(60); p.textSize(11); p.textAlign(p.CENTER, p.TOP);
        p.text('Stress Level (self-reported, 1-10)', ox + w / 2, oy + h + 22);
        p.push(); p.translate(ox - 38, oy + h / 2); p.rotate(-p.HALF_PI);
        p.textAlign(p.CENTER, p.CENTER); p.text('Sleep Quality (1-10)', 0, 0);
        p.pop();

        var bins = {};
        for (var i = 0; i < d.length; i++) {
            var key = d[i].s + ',' + d[i].sq;
            bins[key] = (bins[key] || 0) + 1;
        }
        var maxCount = 0;
        for (var k in bins) { if (bins[k] > maxCount) maxCount = bins[k]; }
        p.noStroke();
        for (var k in bins) {
            var parts = k.split(',');
            var s = parseInt(parts[0]), sq = parseInt(parts[1]);
            var xx = ox + ((s - minS) / (maxS - minS)) * w;
            var yy = oy + h - ((sq - minSQ) / (maxSQ - minSQ)) * h;
            var sz = 8 + (bins[k] / maxCount) * 30;
            var alpha = 100 + (bins[k] / maxCount) * 155;
            p.fill(77, 140, 164, alpha);
            p.ellipse(xx, yy, sz, sz);
            if (bins[k] > 5) {
                p.fill(255); p.textAlign(p.CENTER, p.CENTER); p.textSize(8);
                p.text(bins[k], xx, yy);
            }
        }

        // Trend line
        p.stroke(220, 80, 60, 180); p.strokeWeight(2);
        var x1 = ox + ((3 - minS) / (maxS - minS)) * w;
        var y1 = oy + h - ((9 - minSQ) / (maxSQ - minSQ)) * h;
        var x2 = ox + ((8 - minS) / (maxS - minS)) * w;
        var y2 = oy + h - ((4.5 - minSQ) / (maxSQ - minSQ)) * h;
        p.line(x1, y1, x2, y2);
        p.noStroke(); p.fill(200, 80, 60); p.textSize(9); p.textAlign(p.LEFT, p.CENTER);
        p.text('r = -0.90', x2 + 5, y2);
    }

    window.VizScatter = {
        draw: function (p, manager, ai, progress) {
            p.push();
            if (ai === 5) drawHrScatter(p, manager);
            else if (ai === 10) drawStressSleep(p, manager);
            p.pop();
        }
    };
})();
