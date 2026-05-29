// viz_bar.js — Bar-based charts for sections 1, 2, 3, 6, 11
// Routes internally on `ai` to draw the right chart.
(function () {

    function drawConditionsBar(p, manager) {
        // Section 1: Mindfulness vs Other Interventions by Condition (stacked)
        var d = manager.medData && manager.medData.conditions;
        if (!d || !d.length) return;
        var ox = manager.offsetX || 20;
        var oy = (manager.offsetY || 0) + 40;
        var w = (manager.width || 600) - 20;
        var h = (manager.height || 520) - 80;
        var n = d.length;
        var rowH = h / n;
        var labelW = 160;
        var barMax = w - labelW - 40;
        var maxVal = 0;
        for (var i = 0; i < n; i++) { if (d[i].total > maxVal) maxVal = d[i].total; }

        p.fill(30); p.noStroke();
        p.textAlign(p.LEFT, p.TOP); p.textSize(14); p.textStyle(p.BOLD);
        p.text('Mindfulness vs. Other Meditation Practices by Condition', ox, oy - 30);
        p.textStyle(p.NORMAL);

        for (var i = 0; i < n; i++) {
            var y = oy + i * rowH;
            var item = d[i];
            p.fill(50); p.textAlign(p.RIGHT, p.CENTER); p.textSize(16);
            p.text(item.condition, ox + labelW - 10, y + rowH / 2);
            var otherW = (item.other / maxVal) * barMax;
            p.fill(97, 97, 97);
            p.rect(ox + labelW, y + 6, otherW, rowH - 12, 2);
            var mindW = (item.mindfulness / maxVal) * barMax;
            p.fill(52, 131, 117, 200);
            p.rect(ox + labelW + otherW, y + 6, mindW, rowH - 12, 2);
            p.fill(80); p.textAlign(p.LEFT, p.CENTER); p.textSize(10);
            p.text(item.total, ox + labelW + otherW + mindW + 5, y + rowH / 2);
        }
        var lx = ox + labelW + barMax - 200;
        var ly = oy + n * rowH + 10;
        p.fill(97, 97, 97); p.rect(lx, ly, 12, 12, 2);
        p.fill(50); p.textAlign(p.LEFT, p.CENTER); p.textSize(14);
        p.text('Other Meditation', lx + 16, ly + 6);
        p.fill(52, 131, 117); p.rect(lx + 124, ly, 12, 12, 2);
        p.fill(50); p.text('Mindfulness-Based', lx + 136, ly + 6);
    }

    function drawCompletion(p, manager) {
        // Section 2: Completion rate grouped horizontal bar
        var d = manager.medData && manager.medData.completion;
        if (!d || !d.length) return;
        var ox = manager.offsetX || 20;
        var oy = (manager.offsetY || 0) + 40;
        var w = (manager.width || 600) - 20;
        var h = (manager.height || 520) - 80;
        var n = d.length;
        var rowH = h / n;
        var labelW = 160;
        var barMax = w - labelW - 60;

        p.fill(30); p.noStroke();
        p.textAlign(p.LEFT, p.TOP); p.textSize(14); p.textStyle(p.BOLD);
        p.text('Clinical Trial Completion Rate by Condition', ox, oy - 30);
        p.textStyle(p.NORMAL);

        for (var i = 0; i < n; i++) {
            var y = oy + i * rowH;
            var item = d[i];
            var halfH = (rowH - 14) / 2;
            p.fill(50); p.textAlign(p.RIGHT, p.CENTER); p.textSize(11);
            p.text(item.condition, ox + labelW - 10, y + rowH / 2);
            var mW = (item.mindfulness_rate / 100) * barMax;
            p.fill(77, 184, 164, 220);
            p.rect(ox + labelW, y + 4, mW, halfH, 2);
            p.fill(50); p.textAlign(p.LEFT, p.CENTER); p.textSize(9);
            p.text(item.mindfulness_rate + '%', ox + labelW + mW + 4, y + 4 + halfH / 2);
            var oW = (item.other_rate / 100) * barMax;
            p.fill(97, 97, 97);
            p.rect(ox + labelW, y + 4 + halfH + 2, oW, halfH, 2);
            p.fill(80); p.textSize(9);
            p.text(item.other_rate + '%', ox + labelW + oW + 4, y + 4 + halfH + 2 + halfH / 2);
        }
        var lx = ox + labelW;
        var ly = oy + n * rowH + 8;
        p.fill(77, 184, 164); p.rect(lx, ly, 12, 12, 2);
        p.fill(50); p.textAlign(p.LEFT, p.CENTER); p.textSize(10);
        p.text('Mindfulness', lx + 16, ly + 6);
        p.fill(97); p.rect(lx + 100, ly, 12, 12, 2);
        p.fill(50); p.text('Non-Mindfulness', lx + 116, ly + 6);
    }

    function drawVolumeQuality(p, manager) {
        // Section 3: Volume x Quality bar with color-encoded completion rate
        var comp = manager.medData && manager.medData.completion;
        var cond = manager.medData && manager.medData.conditions;
        if (!comp || !cond) return;
        var ox = manager.offsetX || 20;
        var oy = (manager.offsetY || 0) + 40;
        var w = (manager.width || 600) - 20;
        var h = (manager.height || 520) - 80;

        var items = [];
        for (var i = 0; i < cond.length; i++) {
            var c = comp[i] || {};
            items.push({ condition: cond[i].condition, count: cond[i].mindfulness, rate: c.mindfulness_rate || 0 });
        }
        items.sort(function (a, b) { return b.count - a.count; });
        var n = items.length;
        var rowH = h / n;
        var labelW = 160;
        var maxCount = items[0].count;
        var barMax = w - labelW - 100;

        p.fill(30); p.noStroke();
        p.textAlign(p.LEFT, p.TOP); p.textSize(14); p.textStyle(p.BOLD);
        p.text('Mindfulness Studies — Volume × Completion', ox, oy - 30);
        p.textStyle(p.NORMAL);

        for (var i = 0; i < n; i++) {
            var y = oy + i * rowH;
            var item = items[i];
            p.fill(50); p.textAlign(p.RIGHT, p.CENTER); p.textSize(11);
            p.text(item.condition, ox + labelW - 10, y + rowH / 2);
            var t = Math.max(0, Math.min(1, (item.rate - 40) / 40));
            var cr = Math.round(200 - t * 170);
            var cg = Math.round(80 + t * 100);
            var cb = Math.round(80 - t * 30);
            var bw = (item.count / maxCount) * barMax;
            p.fill(cr, cg, cb, 220);
            p.rect(ox + labelW, y + 6, bw, rowH - 12, 3);
            p.fill(50); p.textAlign(p.LEFT, p.CENTER); p.textSize(9);
            p.text(item.count + ' studies | ' + item.rate + '% done', ox + labelW + bw + 5, y + rowH / 2);
        }
        var ly = oy + n * rowH + 12;
        p.textAlign(p.LEFT, p.TOP); p.textSize(10); p.fill(80);
        p.text('Bar color: completion rate', ox + labelW, ly);
        for (var j = 0; j < 60; j++) {
            var t2 = j / 59;
            p.fill(200 - t2 * 170, 80 + t2 * 100, 80 - t2 * 30);
            p.rect(ox + labelW + 170 + j * 2, ly, 2, 12);
        }
        p.fill(80); p.textSize(14);
        p.text('40%', ox + labelW + 170, ly + 14);
        p.text('80%', ox + labelW + 170 + 110, ly + 14);
    }

    function drawHrByGroup(p, manager) {
        // Section 6: Heart rate by meditation type (grouped vertical bar)
        var d = manager.medData && manager.medData.hr_by_group;
        if (!d || !d.length) return;
        var ox = (manager.offsetX || 20) + 60;
        var oy = (manager.offsetY || 0) + 50;
        var w = (manager.width || 600) - 120;
        var h = (manager.height || 520) - 120;
        var n = d.length;
        var groupW = w / n;
        var barW = groupW * 0.3;
        var minBPM = 60, maxBPM = 90;

        p.fill(30); p.noStroke(); p.textAlign(p.LEFT, p.TOP); p.textSize(14); p.textStyle(p.BOLD);
        p.text('Mean Heart Rate by Meditation Group', ox - 40, oy - 40);
        p.textStyle(p.NORMAL);

        p.stroke(220); p.strokeWeight(1);
        for (var v = minBPM; v <= maxBPM; v += 5) {
            var yy = oy + h - ((v - minBPM) / (maxBPM - minBPM)) * h;
            p.line(ox, yy, ox + w, yy);
            p.noStroke(); p.fill(100); p.textAlign(p.RIGHT, p.CENTER); p.textSize(10);
            p.text(v, ox - 5, yy);
            p.stroke(220);
        }

        for (var i = 0; i < n; i++) {
            var item = d[i];
            var cx = ox + i * groupW + groupW / 2;
            var preH = ((item.pre_mean - minBPM) / (maxBPM - minBPM)) * h;
            p.noStroke(); p.fill(111, 168, 220, 220);
            p.rect(cx - barW - 2, oy + h - preH, barW, preH, 3);
            var medH = ((item.med_mean - minBPM) / (maxBPM - minBPM)) * h;
            p.fill(224, 123, 84, 220);
            p.rect(cx + 2, oy + h - medH, barW, medH, 3);
            p.fill(50); p.textAlign(p.CENTER, p.TOP); p.textSize(11);
            p.text(item.group, cx, oy + h + 8);
            p.textSize(12); p.fill(80);
            p.text(item.pre_mean, cx - barW / 2 - 2, oy + h - preH - 14);
            p.text(item.med_mean, cx + barW / 2 + 2, oy + h - medH - 14);
            p.fill(120);
            p.text('n=' + item.n, cx, oy + h + 22);
        }
        var lx = ox + w - 160, ly = oy;
        p.fill(111, 168, 220); p.rect(lx, ly, 12, 12, 2);
        p.fill(50); p.textAlign(p.LEFT, p.CENTER); p.textSize(14);
        p.text('Pre-Meditation', lx + 16, ly + 6);
        p.fill(224, 123, 84); p.rect(lx, ly + 18, 12, 12, 2);
        p.fill(50); p.text('During Meditation', lx + 16, ly + 24);
    }

    function drawStressHealth(p, manager) {
        // Section 11: Stress tier vs health metrics grouped bar
        var d = manager.medData && manager.medData.stress_health;
        if (!d || !d.length) return;
        var ox = (manager.offsetX || 20) + 10;
        var oy = (manager.offsetY || 0) + 50;
        var w = (manager.width || 600) - 30;
        var h = (manager.height || 520) - 100;

        p.fill(30); p.noStroke(); p.textAlign(p.LEFT, p.TOP); p.textSize(13); p.textStyle(p.BOLD);
        p.text('Health Metrics by Stress Tier (n=374)', ox, oy - 40);
        p.textStyle(p.NORMAL);

        var metrics = [
            { key: 'sleep_quality', label: 'Sleep Quality', min: 4, max: 9 },
            { key: 'sleep_duration', label: 'Sleep Hours', min: 5.5, max: 8 },
            { key: 'heart_rate', label: 'Heart Rate', min: 65, max: 85 },
            { key: 'systolic_bp', label: 'Systolic BP', min: 115, max: 140 }
        ];
        var n = d.length;
        var mCount = metrics.length;
        var panelH = (h - 20) / mCount;
        var tierColors = [
            p.color(77, 184, 164, 220),
            p.color(140, 200, 180, 220),
            p.color(230, 170, 100, 220),
            p.color(220, 90, 60, 220)
        ];
        var barArea = w - 120;
        var barW = barArea / n - 8;

        for (var m = 0; m < mCount; m++) {
            var met = metrics[m];
            var baseY = oy + m * panelH;
            p.noStroke(); p.fill(50); p.textAlign(p.LEFT, p.CENTER); p.textSize(11); p.textStyle(p.BOLD);
            p.text(met.label, ox, baseY + panelH / 2);
            p.textStyle(p.NORMAL);
            for (var t = 0; t < n; t++) {
                var val = d[t][met.key];
                var barH = ((val - met.min) / (met.max - met.min)) * (panelH - 20);
                barH = Math.max(4, Math.min(panelH - 20, barH));
                var bx = ox + 110 + t * (barW + 8);
                var by = baseY + panelH - 10 - barH;
                p.fill(tierColors[t]);
                p.rect(bx, by, barW, barH, 3);
                p.fill(40); p.textAlign(p.CENTER, p.BOTTOM); p.textSize(9);
                p.text(val, bx + barW / 2, by - 2);
                if (m === mCount - 1) {
                    p.fill(80); p.textAlign(p.CENTER, p.TOP); p.textSize(8);
                    p.text(d[t].tier, bx + barW / 2, baseY + panelH - 6);
                }
            }
        }
    }

    window.VizBar = {
        draw: function (p, manager, ai, progress) {
            p.push();
            if (ai === 1) drawConditionsBar(p, manager);
            else if (ai === 2) drawCompletion(p, manager);
            else if (ai === 3) drawVolumeQuality(p, manager);
            else if (ai === 6) drawHrByGroup(p, manager);
            else if (ai === 11) drawStressHealth(p, manager);
            p.pop();
        }
    };
})();
