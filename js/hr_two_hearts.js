// hr_two_hearts.js
// Section 4 — "Two hearts, diverging."
// Two pulsing hearts side by side: Chi meditation (left) vs Kundalini yoga
// (right). Each beats at the real average rate for the selected state, and the
// beat envelope is driven by stepping through that group's REAL beat-to-beat
// trace (representative subjects C1 and Y1 from hr_timeseries). A pre / during
// toggle lets the user watch the two responses diverge: switch to "during" and
// chi visibly slows while kundalini races. Self-contained (Canvas 2D); does not
// touch the p5 sketch pipeline or other sections.
(function () {
    var PALETTE = {
        paper: '#F6F4EC', ink: '#3a352c', soft: '#5a6b60', muted: '#8a9b8e',
        // Both groups share ONE neutral palette on purpose: color must not imply
        // a verdict (green=good / red=bad). The divergence is read from the beat
        // rate and labels, not color. Botanical ink + autumn wash, like the tree.
        wash: '#c98a3c',         // warm autumn amber wash (heart fill) — same for both
        washLo: '#9c5a2a',       // deeper amber (shadow)
        inkLine: '#4a4334',      // sepia ink contour, matches the tree linework
        glow: '#b8842f',         // shared amber glow for the beat
        track: 'rgba(120,140,110,0.18)'
    };

    function ready(fn) {
        if (document.readyState !== 'loading') fn();
        else document.addEventListener('DOMContentLoaded', fn);
    }

    ready(function () {
        var mount = document.getElementById('hrTwoHearts');
        if (!mount) return;

        fetch('data/meditation_data.json')
            .then(function (r) { return r.json(); })
            .then(function (d) { init(mount, d); })
            .catch(function (e) { console.error('two-hearts: data load failed', e); });
    });

    function bpmSeries(ts, key) {
        var arr = ts[key] || [];
        return arr.map(function (p) { return p.bpm; });
    }
    function timeSeries(ts, key) {
        var arr = ts[key] || [];
        return arr.map(function (p) { return p.t; });   // normalized time 0..1 across the recording
    }

    function init(mount, d) {
        var ts = d.hr_timeseries || {};
        var grp = {};
        (d.hr_group || []).forEach(function (g) { grp[g.group] = g; });

        // real beat-to-beat traces (representative subjects)
        var data = {
            chi: {
                name: 'Chi meditation', subject: 'C1', color: PALETTE.glow,
                pre: { bpm: grp.chi_meditation ? grp.chi_meditation.before : 81.4, trace: bpmSeries(ts, 'C1_pre_meditation'), times: timeSeries(ts, 'C1_pre_meditation') },
                during: { bpm: grp.chi_meditation ? grp.chi_meditation.after : 78.0, trace: bpmSeries(ts, 'C1_meditation'), times: timeSeries(ts, 'C1_meditation') }
            },
            kun: {
                name: 'Kundalini yoga', subject: 'Y1', color: PALETTE.glow,
                pre: { bpm: grp.kundalini_yoga ? grp.kundalini_yoga.before : 61.0, trace: bpmSeries(ts, 'Y1_pre_meditation'), times: timeSeries(ts, 'Y1_pre_meditation') },
                during: { bpm: grp.kundalini_yoga ? grp.kundalini_yoga.after : 92.0, trace: bpmSeries(ts, 'Y1_meditation'), times: timeSeries(ts, 'Y1_meditation') }
            }
        };

        var state = 'pre';   // 'pre' | 'during'

        // ---- build DOM ----
        mount.innerHTML = '';
        var toggle = document.createElement('div');
        toggle.className = 'th-toggle';
        toggle.innerHTML =
            '<button class="th-btn th-active" data-st="pre">Before meditation</button>' +
            '<button class="th-btn" data-st="during">During meditation</button>';
        mount.appendChild(toggle);

        var stage = document.createElement('div');
        stage.className = 'th-stage';
        stage.innerHTML =
            '<div class="th-heart" id="thChi"></div>' +
            '<div class="th-vs">vs</div>' +
            '<div class="th-heart" id="thKun"></div>';
        mount.appendChild(stage);

        var caption = document.createElement('p');
        caption.className = 'th-caption';
        mount.appendChild(caption);

        var note = document.createElement('p');
        note.className = 'th-note';
        note.textContent = 'Each heart beats at its group\u2019s measured rate. The pulse envelope follows a representative participant\u2019s real beat-to-beat recording (C1 for chi, Y1 for kundalini). Toggle the state to compare.';
        mount.appendChild(note);

        // midpoint of the two hearts' rates in each state: the slower heart
        // reads blue, the faster red — recomputed per state so the cue stays
        // correct when the roles flip between before and during.
        var pivots = {
            pre:    (data.chi.pre.bpm    + data.kun.pre.bpm)    / 2,
            during: (data.chi.during.bpm + data.kun.during.bpm) / 2
        };
        var chi = makeHeart(document.getElementById('thChi'), data.chi, pivots);
        var kun = makeHeart(document.getElementById('thKun'), data.kun, pivots);

        function setState(st) {
            state = st;
            Array.prototype.forEach.call(toggle.querySelectorAll('.th-btn'), function (b) {
                b.classList.toggle('th-active', b.getAttribute('data-st') === st);
            });
            chi.setState(st); kun.setState(st);
            var c = data.chi[st].bpm, k = data.kun[st].bpm;
            if (st === 'pre') {
                caption.innerHTML = 'Before practice, the two groups rest at different but steady rates \u2014 chi near <b>' + c.toFixed(0) + ' bpm</b>, kundalini near <b>' + k.toFixed(0) + ' bpm</b>.';
            } else {
                caption.innerHTML = 'During practice they diverge: chi <b>slows toward ' + c.toFixed(0) + ' bpm</b>, while kundalini <b>races to ' + k.toFixed(0) + ' bpm</b>. The same word, \u201cmeditation,\u201d two opposite physiologies.';
            }
        }

        toggle.addEventListener('click', function (e) {
            var b = e.target.closest('.th-btn'); if (!b) return;
            setState(b.getAttribute('data-st'));
        });

        setState('pre');

        // let in-page story buttons drive the toggle (kept in sync with the
        // built-in Before/During control via the shared setState).
        window.hrTwoHeartsSetState = setState;
        var goDuring = document.getElementById('hrToDuring');
        if (goDuring) goDuring.addEventListener('click', function () { setState('during'); });
        var goBefore = document.getElementById('hrToBefore');
        if (goBefore) goBefore.addEventListener('click', function () { setState('pre'); });

        // single rAF loop drives both hearts
        function loop(t) { chi.tick(t); kun.tick(t); requestAnimationFrame(loop); }
        requestAnimationFrame(loop);
    }

    // one pulsing heart with a live BPM readout + beat-to-beat sparkline.
    // `pivots` holds the midpoint of the two groups' rates in each state. In
    // EVERY state the slower of the two hearts leans a subtle Kentucky blue and
    // the faster a subtle cherry red — a quiet cue for who is calmer, not a
    // good/bad verdict. Because the roles flip between states (kundalini is the
    // slow one before, chi the slow one during), the colors swap on toggle.
    function makeHeart(el, info, pivots) {
        el.innerHTML =
            '<div class="th-name">' + info.name + ' <span class="th-sub">\u00b7 subject ' + info.subject + '</span></div>' +
            '<canvas class="th-canvas"></canvas>' +
            '<div class="th-bpm"><span class="th-bpm-num">--</span><span class="th-bpm-unit">bpm</span></div>' +
            '<canvas class="th-spark"></canvas>';
        var cv = el.querySelector('.th-canvas'), ctx = cv.getContext('2d');
        var sp = el.querySelector('.th-spark'), sctx = sp.getContext('2d');
        var numEl = el.querySelector('.th-bpm-num');
        var DPR = Math.min(2, window.devicePixelRatio || 1);

        // muted, autumn-desaturated versions of the two hues so the tint stays
        // subtle and never fights the paper / botanical look.
        var TINT_BLUE = '#3f6f9e';   // kentucky blue, softened
        var TINT_RED  = '#b0414c';   // cherry red, softened
        function paletteFor(st, bpm) {
            var pivot = pivots[st];
            var tint = bpm <= pivot ? TINT_BLUE : TINT_RED;   // slower=blue, faster=red
            var strength = Math.min(1, Math.abs(bpm - pivot) / 14);
            var wMix = 0.05 + strength * 0.16;   // very light on the heart fill
            var gMix = 0.18 + strength * 0.50;   // the glow + ripple carry the hue
            return {
                wash:   mixHex(PALETTE.wash,   tint, wMix),
                washLo: mixHex(PALETTE.washLo, tint, Math.min(1, wMix * 1.15)),
                glow:   mixHex(PALETTE.glow,   tint, gMix)
            };
        }

        var cur = { st: 'pre', bpm: info.pre.bpm, trace: info.pre.trace, times: info.pre.times,
                    color: PALETTE.glow, wash: PALETTE.wash, washLo: PALETTE.washLo,
                    lo: 60, hi: 90 };
        var beatPhase = 0, lastT = 0, traceI = 0;

        function size() {
            var colW = el.clientWidth;
            // heart canvas: capped + centered so a wider column lengthens the
            // CHART below without ballooning the heart drawing.
            var hw = Math.min(colW, 470), hh = Math.round(hw * 1.05);
            cv.width = hw * DPR; cv.height = hh * DPR;
            cv.style.width = hw + 'px'; cv.style.height = hh + 'px'; cv.style.margin = '0 auto';
            ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
            // time-series chart: stretch to the full (wider) column width
            var sw = colW, sh = 400;
            sp.width = sw * DPR; sp.height = sh * DPR; sp.style.width = sw + 'px'; sp.style.height = sh + 'px';
            sctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        }
        size(); window.addEventListener('resize', size);

        function setState(st) {
            cur.st = st;
            cur.bpm = info[st].bpm;
            cur.trace = info[st].trace && info[st].trace.length ? info[st].trace : [cur.bpm];
            cur.times = info[st].times && info[st].times.length ? info[st].times : [0];
            var pal = paletteFor(st, cur.bpm);
            cur.wash = pal.wash; cur.washLo = pal.washLo; cur.color = pal.glow;
            // stable y-range for the time-series axis (computed once per state)
            var vmn = Math.min.apply(null, cur.trace), vmx = Math.max.apply(null, cur.trace);
            if (!isFinite(vmn) || (vmx - vmn) < 4) { vmn = cur.bpm - 6; vmx = cur.bpm + 6; }
            var padv = Math.max(2, (vmx - vmn) * 0.18);
            cur.lo = Math.floor(vmn - padv); cur.hi = Math.ceil(vmx + padv);
            traceI = 0;
        }

        // Botanical heart at (cx,cy), scaled by s, contracted by `squeeze`
        // (0 relaxed -> 1 systole). Styled to match the page's botanical tree:
        // sepia ink contour, warm autumn-amber wash fill with soft vertical
        // shading, a central vein + side veins like a leaf, and light stipple.
        // BOTH hearts use the SAME palette on purpose so color implies no verdict;
        // the groups are told apart by label and beat rate, not color.
        function botanicalHeart(c, cx, cy, s, squeeze) {
            // systole gives a clear, organic squeeze (narrows + bulges a touch)
            var sx = s * (1 - squeeze * 0.12);
            var sy = s * (1 + squeeze * 0.05);   // slight vertical bulge as it contracts
            function X(v){ return cx + v * sx; }
            function Y(v){ return cy + v * sy; }

            // classic heart silhouette as a path (two lobes + point), in local units
            function heartShape() {
                c.beginPath();
                c.moveTo(X(0), Y(-5.5));
                // left lobe
                c.bezierCurveTo(X(-2.2), Y(-9.2), X(-8.5), Y(-8.4), X(-8.5), Y(-3.2));
                c.bezierCurveTo(X(-8.5), Y(1.6), X(-3.4), Y(5.6), X(0), Y(10.2));
                // right lobe (mirror)
                c.bezierCurveTo(X(3.4), Y(5.6), X(8.5), Y(1.6), X(8.5), Y(-3.2));
                c.bezierCurveTo(X(8.5), Y(-8.4), X(2.2), Y(-9.2), X(0), Y(-5.5));
                c.closePath();
            }

            // soft amber wash fill with a gentle top->bottom shade (like a leaf wash)
            heartShape();
            var g = c.createLinearGradient(0, Y(-9), 0, Y(10));
            g.addColorStop(0, mixHex(cur.wash, '#ffffff', 0.18));
            g.addColorStop(0.55, cur.wash);
            g.addColorStop(1, cur.washLo);
            c.fillStyle = g; c.fill();

            // brighten slightly with the beat (felt as a flush, same hue for both)
            if (squeeze > 0.01) {
                heartShape();
                c.fillStyle = hexA('#ffffff', squeeze * 0.12); c.fill();
            }

            // fine sepia ink contour, like the tree's leaf outlines
            heartShape();
            c.lineJoin = 'round';
            c.strokeStyle = PALETTE.inkLine;
            c.lineWidth = Math.max(1.1, s * 0.10);
            c.stroke();

            // leaf-style veins: a central vein down to the point + side veins
            c.strokeStyle = hexA(PALETTE.inkLine, 0.55);
            c.lineWidth = Math.max(0.7, s * 0.05);
            c.beginPath();
            c.moveTo(X(0), Y(-5.0)); c.lineTo(X(0), Y(9.4));     // midrib
            c.stroke();
            c.lineWidth = Math.max(0.5, s * 0.035);
            for (var k = 0; k < 4; k++) {
                var t = (k + 1) / 5;
                var vy = -3.5 + t * 11;            // down the midrib
                var len = 3.4 * (1 - t * 0.55);    // shorter toward the point
                c.beginPath();
                c.moveTo(X(0), Y(vy));
                c.lineTo(X(-len), Y(vy - len * 0.55));
                c.moveTo(X(0), Y(vy));
                c.lineTo(X(len), Y(vy - len * 0.55));
                c.stroke();
            }

            // light stipple shading lower-right (matches the tree's stipple)
            c.fillStyle = hexA(cur.washLo, 0.5);
            for (var d = 0; d < 12; d++) {
                var a = (d / 12) * Math.PI * 2;
                var rr = 2 + (d % 4);
                c.beginPath();
                c.arc(X(1.6 + Math.cos(a) * rr * 0.4), Y(2.2 + Math.sin(a) * rr * 0.5), Math.max(0.6, s*0.04), 0, Math.PI*2);
                c.fill();
            }

            // small soft highlight upper-left (paper sheen)
            heartShape();
            c.save(); c.clip();
            var hl = c.createRadialGradient(X(-3), Y(-3.5), 0.4*s, X(-3), Y(-3.5), 4*s);
            hl.addColorStop(0, hexA('#ffffff', 0.22));
            hl.addColorStop(1, hexA('#ffffff', 0));
            c.fillStyle = hl; c.fillRect(X(-9), Y(-10), 18*sx, 22*sy);
            c.restore();
        }

        // dark silhouette of the heart for the soft drop shadow
        function botanicalHeartShadow(c, cx, cy, s) {
            function X(v){ return cx + v * s; }
            function Y(v){ return cy + v * s; }
            c.beginPath();
            c.moveTo(X(0), Y(-5.5));
            c.bezierCurveTo(X(-2.2), Y(-9.2), X(-8.5), Y(-8.4), X(-8.5), Y(-3.2));
            c.bezierCurveTo(X(-8.5), Y(1.6), X(-3.4), Y(5.6), X(0), Y(10.2));
            c.bezierCurveTo(X(3.4), Y(5.6), X(8.5), Y(1.6), X(8.5), Y(-3.2));
            c.bezierCurveTo(X(8.5), Y(-8.4), X(2.2), Y(-9.2), X(0), Y(-5.5));
            c.closePath();
            c.fillStyle = '#000000'; c.fill();
        }

        // bare heart silhouette path (no fill/stroke) — reused for the
        // heart-shaped radiant glow and the expanding heart ripple.
        function heartPath(c, cx, cy, sx, sy) {
            function X(v){ return cx + v * sx; }
            function Y(v){ return cy + v * sy; }
            c.beginPath();
            c.moveTo(X(0), Y(-5.5));
            c.bezierCurveTo(X(-2.2), Y(-9.2), X(-8.5), Y(-8.4), X(-8.5), Y(-3.2));
            c.bezierCurveTo(X(-8.5), Y(1.6), X(-3.4), Y(5.6), X(0), Y(10.2));
            c.bezierCurveTo(X(3.4), Y(5.6), X(8.5), Y(1.6), X(8.5), Y(-3.2));
            c.bezierCurveTo(X(8.5), Y(-8.4), X(2.2), Y(-9.2), X(0), Y(-5.5));
            c.closePath();
        }


        function tick(t) {
            if (!lastT) lastT = t;
            var dt = Math.min(0.05, (t - lastT) / 1000); lastT = t;

            // advance beat phase at the current BPM
            var beatsPerSec = cur.bpm / 60;
            beatPhase += dt * beatsPerSec;
            if (beatPhase >= 1) {
                beatPhase -= 1;
                // walk forward through the real recording each beat: drives the
                // live bpm readout and the marker position on the time-series.
                if (cur.trace.length) {
                    traceI = (traceI + 1) % cur.trace.length;
                    numEl.textContent = Math.round(cur.trace[traceI]);
                }
            }

            // beat envelope: SNAPPY systolic attack (a sharp "thump") then a
            // brisk relaxation and a soft decay tail back to baseline.
            var ph = beatPhase;
            var env;
            if (ph < 0.085) {                              // sharp attack — fast rise to full
                var ta = ph / 0.085;
                env = ta * (2 - ta);                       // ease-out: shoots up immediately
            } else if (ph < 0.30) {                        // brisk early relaxation
                env = 1 - ((ph - 0.085) / 0.215) * 0.86;
            } else {                                       // gentle decay tail
                env = 0.14 * Math.exp(-(ph - 0.30) * 6.5);
            }
            var w = cv.clientWidth, h = cv.clientHeight;
            // slightly smaller base leaves room for a bigger swell without the
            // heart's point clipping the canvas bottom on a strong beat.
            var baseS = Math.min(w, h) / 66;
            var s = baseS * (1 + env * 0.38);              // bigger swell per beat

            ctx.clearRect(0, 0, w, h);
            var cx = w / 2, cy = h / 2;

            // ---- heart-shaped radiant (replaces the old circular glow) ----
            // a soft aura that follows the organ's own silhouette and pulses
            // with the beat. Blurred heart fills, kept inside the canvas so the
            // edges stay clean.
            ctx.save();
            ctx.filter = 'blur(' + (baseS * 1.0) + 'px)';
            heartPath(ctx, cx, cy, s * 1.08, s * 1.08);            // broad soft aura
            ctx.fillStyle = hexA(cur.color, 0.07 + env * 0.09);
            ctx.fill();
            ctx.filter = 'blur(' + (baseS * 0.55) + 'px)';
            heartPath(ctx, cx, cy, s * 1.02, s * 1.02);            // tighter inner glow
            ctx.fillStyle = hexA(cur.color, 0.13 + env * 0.17);
            ctx.fill();
            ctx.restore();

            // ---- expanding heart-shaped ripple — one wavefront per beat ----
            // launched by the systolic thump; fades to nothing as it grows, so
            // it never shows a hard edge even when it runs past the canvas.
            var rp = ph < 1 ? ph : 0;
            var rpE = 1 - (1 - rp) * (1 - rp);                     // ease-out
            var ripScale = baseS * (1.15 + rpE * 0.6);
            var ripA = 0.32 * Math.pow(1 - rp, 1.8);               // strong at launch, fades
            if (ripA > 0.003) {
                ctx.save();
                ctx.strokeStyle = hexA(cur.color, ripA);
                ctx.lineWidth = Math.max(1, baseS * 0.5 * (1 - rp));
                heartPath(ctx, cx, cy, ripScale, ripScale);
                ctx.stroke();
                ctx.restore();
            }
            // soft drop shadow under the organ
            ctx.save();
            ctx.translate(baseS * 0.5, baseS * 1.4);
            ctx.globalAlpha = 0.16;
            ctx.filter = 'blur(2px)';
            botanicalHeartShadow(ctx, cx, cy, baseS);
            ctx.restore();
            // the anatomical organ, contracting on the beat (env drives systole)
            botanicalHeart(ctx, cx, cy, baseS, env);

            drawSpark();
        }

        function drawSpark() {
            var w = sp.clientWidth, h = sp.clientHeight;
            sctx.clearRect(0, 0, w, h);
            var mL = 48, mR = 12, mT = 14, mB = 42;        // margins for the axes/labels
            var plotW = w - mL - mR, plotH = h - mT - mB;
            if (plotW <= 4 || plotH <= 4) return;
            var lo = cur.lo, hi = cur.hi, rng = Math.max(1, hi - lo);
            var labelCol = hexA(PALETTE.ink, 0.95);        // dark, readable annotations
            var axisLine = hexA(PALETTE.soft, 0.6);        // soft axis + tick marks
            var gridCol  = hexA(PALETTE.muted, 0.18);

            sctx.font = '13px "Times New Roman", Times, serif';

            // y-axis gridlines + bpm tick labels (low, mid, high)
            var ticks = [lo, Math.round((lo + hi) / 2), hi];
            sctx.textAlign = 'right'; sctx.textBaseline = 'middle';
            for (var t = 0; t < ticks.length; t++) {
                var yy = mT + plotH - ((ticks[t] - lo) / rng) * plotH;
                sctx.strokeStyle = gridCol; sctx.lineWidth = 1;
                sctx.beginPath(); sctx.moveTo(mL, yy); sctx.lineTo(w - mR, yy); sctx.stroke();
                sctx.fillStyle = labelCol; sctx.fillText(ticks[t], mL - 7, yy);
            }

            // y-axis title (rotated)
            sctx.save();
            sctx.translate(12, mT + plotH / 2); sctx.rotate(-Math.PI / 2);
            sctx.textAlign = 'center'; sctx.textBaseline = 'middle';
            sctx.fillStyle = labelCol; sctx.fillText('bpm', 0, 0);
            sctx.restore();

            // L-shaped axis lines
            sctx.strokeStyle = axisLine; sctx.lineWidth = 1;
            sctx.beginPath();
            sctx.moveTo(mL, mT); sctx.lineTo(mL, mT + plotH); sctx.lineTo(w - mR, mT + plotH);
            sctx.stroke();

            // x-axis tick labels — TIME across the recording. Each point's own
            // measured time (normalized 0 = start, 1 = end of the recording) is
            // the x position, so the curve appears exactly as it was recorded.
            var xPct = [0, 25, 50, 75, 100];
            sctx.textAlign = 'center'; sctx.textBaseline = 'alphabetic';
            for (var xt = 0; xt < xPct.length; xt++) {
                var xx = mL + plotW * (xPct[xt] / 100);
                sctx.strokeStyle = axisLine; sctx.lineWidth = 1;
                sctx.beginPath(); sctx.moveTo(xx, mT + plotH); sctx.lineTo(xx, mT + plotH + 5); sctx.stroke();
                sctx.fillStyle = labelCol; sctx.fillText(xPct[xt] + '%', xx, mT + plotH + 18);
            }
            // x-axis title (extra gap below the tick labels)
            sctx.fillStyle = labelCol;
            sctx.fillText('time (% of session)', mL + plotW / 2, mT + plotH + 34);

            // bpm-over-time curve. A faint "ghost" of the whole recording sits
            // underneath for context; the bright line is REVEALED progressively
            // as the beat walks through the session (left -> right), then loops.
            var tr = cur.trace, tm = cur.times, N = tr.length;
            if (N >= 2 && tm && tm.length === N) {
                // faint ghost of the full recording
                sctx.strokeStyle = hexA(cur.color, 0.16); sctx.lineWidth = 1.2;
                sctx.lineJoin = 'round'; sctx.beginPath();
                for (var i = 0; i < N; i++) {
                    var gx = mL + plotW * Math.max(0, Math.min(1, tm[i]));
                    var gy = mT + plotH - ((Math.max(lo, Math.min(hi, tr[i])) - lo) / rng) * plotH;
                    if (i === 0) sctx.moveTo(gx, gy); else sctx.lineTo(gx, gy);
                }
                sctx.stroke();

                // progress: one trace point per beat, smoothed within the beat by
                // beatPhase so the leading edge glides instead of jumping.
                var prog = Math.max(0, Math.min(N - 1, traceI + beatPhase));
                var k = Math.floor(prog), f = prog - k;
                var leadT, leadV;
                if (k >= N - 1) { leadT = tm[N - 1]; leadV = tr[N - 1]; }
                else { leadT = tm[k] + (tm[k + 1] - tm[k]) * f; leadV = tr[k] + (tr[k + 1] - tr[k]) * f; }

                // the revealed (growing) portion of the line
                sctx.strokeStyle = hexA(cur.color, 0.9); sctx.lineWidth = 1.8;
                sctx.beginPath();
                sctx.moveTo(mL + plotW * Math.max(0, Math.min(1, tm[0])),
                            mT + plotH - ((Math.max(lo, Math.min(hi, tr[0])) - lo) / rng) * plotH);
                for (var j = 1; j <= k; j++) {
                    sctx.lineTo(mL + plotW * Math.max(0, Math.min(1, tm[j])),
                                mT + plotH - ((Math.max(lo, Math.min(hi, tr[j])) - lo) / rng) * plotH);
                }
                var lx = mL + plotW * Math.max(0, Math.min(1, leadT));
                var ly = mT + plotH - ((Math.max(lo, Math.min(hi, leadV)) - lo) / rng) * plotH;
                sctx.lineTo(lx, ly);
                sctx.stroke();

                // live marker riding the leading edge as it progresses
                sctx.fillStyle = hexA(cur.color, 0.30);
                sctx.beginPath(); sctx.arc(lx, ly, 6, 0, Math.PI * 2); sctx.fill();
                sctx.fillStyle = cur.color;
                sctx.beginPath(); sctx.arc(lx, ly, 3, 0, Math.PI * 2); sctx.fill();
            }
        }

        setState('pre');
        return { tick: tick, setState: setState };
    }

    function hexA(col, a) {
        var c = col.charAt(0) === '#' ? parseHex(col) : parseRgb(col);
        return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
    }
    function parseRgb(s) {
        var m = s.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
        return m ? [+m[1], +m[2], +m[3]] : [0, 0, 0];
    }
    function parseHex(hex) {
        var h = hex.replace('#', '');
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
    }
    function anyColor(s) { return s.charAt(0) === '#' ? parseHex(s) : parseRgb(s); }
    function mixHex(a, b, t) {
        var ca = anyColor(a), cb = anyColor(b);
        var r = Math.round(ca[0] + (cb[0] - ca[0]) * t);
        var g = Math.round(ca[1] + (cb[1] - ca[1]) * t);
        var bl = Math.round(ca[2] + (cb[2] - ca[2]) * t);
        return 'rgb(' + r + ',' + g + ',' + bl + ')';
    }
})();
