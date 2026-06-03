// viz_chart_utils.js — shared helpers for the data charts.
//
// CHANGES (per project revision):
//   • Color-blind-safe palette (Okabe–Ito). Each VARIABLE gets ONE unique color.
//   • Central TYPO object: every chart text size is tuned in ONE place here.
//   • Base font is Times New Roman, 14px (applyFont).
(function() {
    // --- Okabe–Ito color-blind-safe base hues (as RGB triples) ---
    var OI = {
        black: [0, 0, 0],
        orange: [230, 159, 0],
        sky: [86, 180, 233],
        green: [0, 158, 115],
        yellow: [240, 228, 66],
        blue: [0, 114, 178],
        vermil: [213, 94, 0],
        purple: [204, 121, 167]
    };

    window.ChartUtils = {
        OI: OI,

        // Legacy alias keys (kept so existing viz code keeps working) — all remapped
        // to color-blind-safe values.
        PALETTE: {
            blue: OI.blue,
            green: OI.green,
            red: OI.vermil,
            amber: OI.orange,
            slate: [120, 134, 150],
            sky: OI.sky,
            purple: OI.purple,
            ink: [45, 55, 65],
            grid: [225, 228, 232]
        },

        // ONE unique color per VARIABLE in the project. Reference these by meaning.
        VAR: {
            meditationStudies: OI.blue, // single-color "Meditation-Based Studies"
            chi: OI.sky, // Chi meditation
            kundalini: OI.vermil, // Kundalini yoga
            before: [120, 134, 150], // baseline / pre
            during: OI.green, // during meditation
            hrRose: OI.purple, // heart rate increased
            tierLow: OI.green,
            tierMid: OI.orange,
            tierHigh: OI.vermil,
            disorderNone: OI.green,
            disorderInsomnia: OI.vermil,
            disorderApnea: OI.orange
        },

        // CENTRAL TEXT SIZES — adjust chart typography here, in one place only.
        TYPO: {
            base: 14, // project body spec (Times New Roman 14)
            chartTitle: 17,
            chartSub: 12,
            axisTitle: 12,
            tick: 10,
            annotation: 11,
            valueLabel: 12
        },

        font: '"Times New Roman", Times, serif',

        // Apply the project font to a p5 instance (called by the renderer each draw).
        applyFont: function(p) {
            try { p.textFont(window.ChartUtils.font); } catch (e) { /* ignore */ }
        },

        // standard plot frame: returns inner rect {x,y,w,h}
        frame: function(manager) {
            var pad = { l: 56, r: 24, t: 54, b: 48 };
            var x = (manager.offsetX || 0);
            var y = (manager.offsetY || 0);
            var W = (manager.width || 600);
            var H = (manager.height || 520);
            return {
                x: x + pad.l,
                y: y + pad.t,
                w: W - pad.l - pad.r,
                h: H - pad.t - pad.b,
                ox: x,
                oy: y,
                W: W,
                H: H
            };
        },

        title: function(p, f, text, sub, sizeOverride) {
            var T = window.ChartUtils.TYPO;
            p.noStroke();
            p.fill(window.ChartUtils.PALETTE.ink);
            p.textAlign(p.LEFT, p.TOP);
            p.textStyle(p.BOLD);
            p.textSize(sizeOverride || T.chartTitle);
            p.text(text, f.ox + 8, f.oy + 8);
            p.textStyle(p.NORMAL);
            if (sub) {
                p.fill(120);
                p.textSize(T.chartSub);
                p.text(sub, f.ox + 8, f.oy + 30);
            }
        },

        reveal: function(progress) {
            var t = Math.max(0, Math.min(1, (progress - 0.05) / 0.45));
            return t * t * (3 - 2 * t);
        }
    };
})();