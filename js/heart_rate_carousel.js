// heart_rate_carousel.js
// Section 4 — interactive heart-rate story carousel (Chart.js).
//   • auto-rotates every 3s · hover scales the active card 3% and pauses
//   • tabs + dots let the viewer hold any story
//   • three NON-overlapping stories drawn from the project's HR data
// Colors use the Okabe–Ito color-blind-safe palette; sizes are central (FS).
(function () {
    var FS = { title: 19, sub: 14, axisTitle: 13, tick: 12, annotation: 13, tab: 14 };
    var C = {
        chi: '#56B4E9', kundalini: '#D55E00', during: '#009E73',
        baseline: '#999999', ink: '#2D3741', grid: '#E1E4E8'
    };
    var FONT = '"Times New Roman", Times, serif';

    function downsample(arr, n) {
        if (!arr || arr.length <= n) return arr || [];
        var step = arr.length / n, out = [];
        for (var i = 0; i < n; i++) out.push(arr[Math.floor(i * step)]);
        return out;
    }

    function init(med) {
        var hrGroup = med.hr_group || [];
        var chiG = hrGroup.find(function (r) { return r.group === 'chi_meditation'; }) || { before: 0, after: 0 };
        var kunG = hrGroup.find(function (r) { return r.group === 'kundalini_yoga'; }) || { before: 0, after: 0 };
        var paired = med.hr_paired || [];
        var chiD = paired.filter(function (r) { return r.group === 'chi_meditation'; }).map(function (r) { return r.delta; });
        var kunD = paired.filter(function (r) { return r.group === 'kundalini_yoga'; }).map(function (r) { return r.delta; });
        var ts = med.hr_timeseries || {};
        var med44 = downsample(ts.C1_meditation, 44).map(function (p) { return { x: p.t, y: p.bpm }; });
        var pre44 = downsample(ts.C1_pre_meditation, 44).map(function (p) { return { x: p.t, y: p.bpm }; });

        function base(o) {
            o = o || {};
            var sc = {
                x: { title: { display: !!o.xTitle, text: o.xTitle || '', font: { family: FONT, size: FS.axisTitle } },
                     ticks: { font: { family: FONT, size: FS.tick } }, grid: { color: C.grid },
                     type: o.xLinear ? 'linear' : 'category' },
                y: { title: { display: !!o.yTitle, text: o.yTitle || '', font: { family: FONT, size: FS.axisTitle } },
                     ticks: { font: { family: FONT, size: FS.tick }, display: !o.hideY }, grid: { color: C.grid },
                     suggestedMin: o.suggestedMin }
            };
            if (o.hideY) { sc.y.min = -0.6; sc.y.max = 1.6; }
            return { responsive: true, maintainAspectRatio: false, animation: { duration: 500 },
                plugins: { legend: { labels: { font: { family: FONT, size: FS.tick }, usePointStyle: true } } }, scales: sc };
        }

        var stories = [
            { tab: 'Direction',
              title: 'Meditation moves heart rate both ways',
              sub: 'Average resting heart rate, before vs. after a session',
              take: 'Chi meditation slowed the heart (' + chiG.before + ' \u2192 ' + chiG.after + ' bpm). Kundalini yoga raised it sharply (' + kunG.before + ' \u2192 ' + kunG.after + ' bpm). The practice decides the direction.',
              build: function (ctx) {
                  return new Chart(ctx, { type: 'bar',
                      data: { labels: ['Before', 'After'], datasets: [
                          { label: 'Chi meditation', data: [chiG.before, chiG.after], backgroundColor: C.chi },
                          { label: 'Kundalini yoga', data: [kunG.before, kunG.after], backgroundColor: C.kundalini } ] },
                      options: base({ yTitle: 'Heart rate (bpm)', suggestedMin: 55 }) });
              } },
            { tab: 'Individual spread',
              title: 'The same practice, different bodies',
              sub: 'Change in heart rate per participant (after \u2212 before), one dot = one person',
              take: 'Group averages hide the spread. Most Chi participants dropped, but one rose. Every Kundalini participant rose, by widely different amounts. Response is individual.',
              build: function (ctx) {
                  function pts(arr, off) { return arr.map(function (d) { return { x: d, y: off }; }); }
                  return new Chart(ctx, { type: 'scatter',
                      data: { datasets: [
                          { label: 'Chi meditation', data: pts(chiD, -0.15), backgroundColor: C.chi, pointRadius: 6 },
                          { label: 'Kundalini yoga', data: pts(kunD, 0.15), backgroundColor: C.kundalini, pointRadius: 6 } ] },
                      options: base({ xTitle: 'Heart-rate change (bpm)', hideY: true }) });
              } },
            { tab: 'Over time',
              title: 'A heartbeat has texture, not just endpoints',
              sub: "One participant\u2019s beat-to-beat heart rate: baseline vs. during meditation",
              take: 'Endpoints miss the story inside the session. The baseline trace swings wider; the meditation trace is lower and steadier in stretches \u2014 calm is a pattern over time.',
              build: function (ctx) {
                  return new Chart(ctx, { type: 'line',
                      data: { datasets: [
                          { label: 'Before meditation', data: pre44, borderColor: C.baseline, borderWidth: 1.4, pointRadius: 0, tension: .3 },
                          { label: 'During meditation', data: med44, borderColor: C.during, borderWidth: 1.8, pointRadius: 0, tension: .3 } ] },
                      options: base({ xTitle: 'Session progress', yTitle: 'Heart rate (bpm)', xLinear: true }) });
              } }
        ];

        var idx = 0, chart = null, timer = null, held = false;
        var tabsEl = document.getElementById('hrTabs'), dotsEl = document.getElementById('hrDots');
        var card = document.getElementById('hrCard');
        if (!tabsEl || !card) return;

        stories.forEach(function (s, i) {
            var b = document.createElement('button');
            b.className = 'hr-tab'; b.textContent = s.tab; b.setAttribute('role', 'tab');
            b.onclick = function () { hold(); show(i); }; tabsEl.appendChild(b);
            var d = document.createElement('span'); d.className = 'hr-dot';
            d.onclick = function () { hold(); show(i); }; dotsEl.appendChild(d);
        });

        function show(i) {
            idx = i; var s = stories[i];
            document.getElementById('hrTitle').textContent = s.title;
            document.getElementById('hrSub').textContent = s.sub;
            document.getElementById('hrTake').textContent = s.take;
            if (chart) chart.destroy();
            chart = s.build(document.getElementById('hrChart').getContext('2d'));
            Array.prototype.forEach.call(tabsEl.children, function (t, k) { t.setAttribute('aria-selected', k === i); });
            Array.prototype.forEach.call(dotsEl.children, function (t, k) { t.setAttribute('aria-current', k === i); });
        }
        function next() { show((idx + 1) % stories.length); }
        function start() { if (!timer && !held) timer = setInterval(next, 3000); }
        function stop() { clearInterval(timer); timer = null; }
        function hold() { held = true; stop(); }

        card.addEventListener('mouseenter', stop);
        card.addEventListener('mouseleave', function () { if (!held) start(); });

        show(0); start();
    }

    function boot() {
        if (typeof Chart === 'undefined') { setTimeout(boot, 150); return; }
        fetch('data/meditation_data.json')
            .then(function (r) { return r.json(); })
            .then(init)
            .catch(function (e) { console.error('hr carousel: data load failed', e); });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
