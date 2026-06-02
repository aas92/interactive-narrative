// sketch_renderer.js
// Routes each scroll section's active index to the right visualization and
// loads the pre-processed meditation dataset onto the manager.
//
// Section / active-index map (after the requested revisions):
//   0  Tree of meditation — religious / pre-scientific roots   -> VizTitle
//   1  Tree of meditation — science-based crown (red circle)    -> VizTitle
//   2  Meditation-Based Studies by condition (single color)     -> VizBar
//   3  Bridge text (no viz)
//   4  Heart-rate CAROUSEL (HTML/Chart.js, 3 stories) — no p5 viz
//   5  Bridge text (no viz)
//   6  Stress vs. sleep quality (r = -0.90)                      -> VizScatter
//   7  Stress tiers across health metrics                       -> VizBar
//   8       STAI mean anxiety by condition                       -> MeansBarViz
//   9       STAI score distribution histogram                    -> HistogramViz
//   10,11   Conclusion / Sources / Authors (no viz)
(function () {
    window.Renderer = {

        setData: function (manager) {
            manager.offsetX = (manager.margin && manager.margin.left) || 20;
            manager.offsetY = (manager.margin && manager.margin.top) || 0;
            manager.data = [];

            return fetch('data/meditation_data.json')
                .then(function (r) { return r.json(); })
                .then(function (json) {
                    manager.medData = json;
                    return fetch('data/stai_means.tsv').then(function (r) { return r.text(); });
                })
                .then(function (tsv) {
                    manager.medData.stai_means = window.DataLoader.parseGenericTSV(
                        tsv,
                        ['mean', 'ci_lower', 'ci_upper', 'n'],
                        ['is_control']
                    );
                    return fetch('data/stai_histogram.tsv').then(function (r) { return r.text(); });
                })
                .then(function (tsv) {
                    manager.medData.stai_histogram = window.DataLoader.parseGenericTSV(
                        tsv,
                        ['bin_low', 'bin_high', 'control_pct', 'bodyscan_pct'],
                        []
                    );
                    return manager.data;
                })
                .catch(function (err) {
                    console.error('sketch_renderer: failed to load meditation_data.json', err);
                    manager.medData = {};
                    return manager.data;
                });
        },

        draw: function (p, manager, ai, progress) {
            // apply the project font (Times New Roman) to every chart
            if (window.ChartUtils && window.ChartUtils.applyFont) window.ChartUtils.applyFont(p);

            // 0,1 — growing tree of meditation
            if (ai === 0 || ai === 1) { window.VizTitle.draw(p, manager, ai, progress); return; }

            // 2,7 — bar-family charts (conditions, stress tiers)
            if (ai === 2 || ai === 7) { window.VizBar.draw(p, manager, ai, progress); return; }

            // 6 — stress vs sleep scatter
            if (ai === 6) { window.VizScatter.draw(p, manager, ai, progress); return; }

            // 8 — STAI mean anxiety by condition
            if (ai === 8) { window.MeansBarViz.draw(p, manager, ai, progress); return; }

            // 9 — STAI score distribution histogram
            if (ai === 9) { window.HistogramViz.draw(p, manager, ai, progress); return; }

            // 3,4,5,10,11 — full-text / carousel sections: no p5 visualization
        }
    };
})();
