// viz_title.js — Section 0: title screen with breathing animation
(function () {
    window.VizTitle = {
        draw: function (p, manager, ai, progress) {
            var cx = (manager.offsetX || 0) + (manager.width || 600) / 2;
            var cy = (manager.offsetY || 0) + (manager.height || 520) / 2.5;
            p.push();
            p.noStroke();
            // Breathing circle animation
            var breathe = Math.sin(p.frameCount * 0.03) * 20 + 120;
            p.fill(77, 184, 164, 40);
            p.ellipse(cx, cy + 40, breathe * 2, breathe * 2);
            p.fill(77, 184, 164, 60);
            p.ellipse(cx, cy + 40, breathe * 1.2, breathe * 1.2);
            // Title text
            p.fill(30);
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(24);
            p.textStyle(p.BOLD);
            p.text('Is Mindfulness an', cx, cy - 10);
            p.text('Effective Treatment?', cx, cy + 22);
            p.textSize(13);
            p.textStyle(p.NORMAL);
            p.fill(120);
            p.text('Scroll to explore the evidence', cx, cy + 64);
            p.pop();
        }
    };
})();
