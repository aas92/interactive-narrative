## Narrative Visualization (Scrollytelling) Template

A minimal scaffold for scroll-driven p5.js visuals for **IMT 561 Data Visualization: Design and Development**. HTML sections in `index.html` drive the visual state via `js/helpers/sections.js`.

**Quick start**

VS Code Live Server extension:
1. Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension.
2. Open the repo folder in VS Code.
3. Click **Go Live** in the status bar (or right-click `index.html` → *Open with Live Server*).


**Structure**
- `index.html` — page sections and `window.ScrollDemoConfig`
- `css/` — layout and vis container styles
- `data/` — static data files (e.g. `words.tsv`)
- `js/helpers/` — `data_loader.js`, `scroller.js`, `visual_controller.js`, `sections.js`
- `js/sketches/sketch_manager.js` — p5 lifecycle; exposes `startP5()` → `{ setState, setData, ready, p5, data }`
- `js/sketches/sketch_renderer.js` — delegates draw calls to per-viz modules
- `js/sketches/viz/` — per-visual files (e.g. `viz_title.js`, `viz_scatter.js`, `viz_bar.js`)
- `js/sketches/examples/` — example renderer (`sketch_grid.js`)

**Building your story**

Each `<section>` in `index.html` is one scroll step. Add, remove, or reorder sections to shape your narrative. The `data-active-index` attribute on each section tells the sketch which visual state to show.

To add a new visualization for a section:
1. Create `js/sketches/viz/viz_foo.js` — expose `window.FooViz = { draw(p, manager, ai, progress) { ... } }`.
2. In `index.html`, load it with a `<script>` tag before `sketch_renderer.js`.
3. In `sketch_renderer.js`, call `window.FooViz.draw(...)` for the active index(es) you want it to handle.

The included `viz_title.js`, `viz_scatter.js`, and `viz_bar.js` are working examples to copy from.

**Using your own data**

Point to your own TSV in `index.html`:
```js
window.ScrollDemoConfig = { dataUrl: 'data/your_file.tsv' };
```
The file should have a header row; columns are accessible as named fields in your viz (e.g. `d.word`, `d.time`). Preprocessing happens in `js/helpers/data_loader.js` — extend `DataLoader.preprocess()` there if you need to derive new fields or types.

**Script load order in `index.html`**
helpers → viz modules/examples → `sketch_renderer.js` → `sketch_manager.js`

**Deploy**
GitHub Pages (`gh-pages` branch or `docs/`) or any static host.

**Acknowledgments**
Based on the scrollytelling template by [Jim Vallandingham](https://github.com/vlandham).
