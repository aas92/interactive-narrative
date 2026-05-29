// sketch_renderer.js

// Responsible for rendering the main visualization based on the current active index
(function () {
    window.Renderer = {

        setData: function (manager) {
            var self = this;

            manager.offsetX = (manager.margin && manager.margin.left) || 20;
            manager.offsetY = (manager.margin && manager.margin.top) || 0;

            function computeLayout(data) {
                manager.data = data;
            }

            computeLayout([]);

            // Load the pre-processed meditation dataset and attach to manager
            return fetch('data/meditation_data.json')
                .then(function (r) { return r.json(); })
                .then(function (json) {
                    manager.medData = json;
                    return manager.data;
                })
                .catch(function (err) {
                    console.error('sketch_renderer: failed to load meditation_data.json', err);
                    manager.medData = {};
                    return manager.data;
                });
        },

        draw: function (p, manager, ai, progress) {

            // Section 0 — Title
            if (ai === 0) {
                window.VizTitle.draw(p, manager, ai, progress);
                return;
            }

            // Sections 1, 2, 3, 6, 11 — bar-based charts
            if (ai === 1 || ai === 2 || ai === 3 || ai === 6 || ai === 11) {
                window.VizBar.draw(p, manager, ai, progress);
                return;
            }

            // Sections 5, 10 — scatter plots
            if (ai === 5 || ai === 10) {
                window.VizScatter.draw(p, manager, ai, progress);
                return;
            }

            // Sections 7, 8, 12 — time series, HRV strip, box plot
            if (ai === 7 || ai === 8 || ai === 12) {
                window.VizProgressColor.draw(p, manager, ai, progress);
                return;
            }

            // Sections 4, 9, 13, 14, 15 are full-text — no visualization
        }
    };
})();
