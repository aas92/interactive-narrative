/* page_effects.js
 * Page-level visual behaviors, moved out of the index.html inline <script> blocks.
 * (The ScrollDemoConfig block stays inline in index.html because it must run before
 *  the scroller script loads.)
 */

/* ---- ambient motes canvas ---- */
        (function() {
            var LEAVES_ENABLED = false;
            var cv = document.getElementById('motes'),
                ctx = cv.getContext('2d');
            var MOTE_RGB = (getComputedStyle(document.documentElement)
                .getPropertyValue('--mote').trim() || '120,140,110');
            var motes = [],
                DPR = Math.min(2, window.devicePixelRatio || 1);

            function resize() {
                cv.width = innerWidth * DPR;
                cv.height = innerHeight * DPR;
                cv.style.width = innerWidth + 'px';
                cv.style.height = innerHeight + 'px';
                ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
                var n = Math.round((innerWidth * innerHeight) / 42000);
                motes = [];
                for (var i = 0; i < n; i++) motes.push(newMote(true));
            }

            function newMote(anywhere) {
                return {
                    x: Math.random() * innerWidth,
                    y: anywhere ? Math.random() * innerHeight : innerHeight + 10,
                    r: 0.6 + Math.random() * 2.2,
                    vx: (Math.random() - 0.5) * 0.12,
                    vy: -(0.08 + Math.random() * 0.28),
                    a: 0.06 + Math.random() * 0.20,
                    tw: Math.random() * Math.PI * 2
                };
            }
            var FALL = [
                [196, 86, 42],
                [214, 142, 48],
                [168, 58, 40],
                [138, 110, 52],
                [122, 142, 66]
            ];
            var leaves = [];

            function spawnLeaf(targets) {
                var bar = targets[Math.floor(Math.random() * targets.length)];
                if (!bar || bar.w < 6) return;
                var landX = bar.x + Math.random() * bar.w;
                var landY = bar.y + bar.h * (0.3 + Math.random() * 0.4);
                leaves.push({
                    x: Math.random() * innerWidth,
                    y: -20 - Math.random() * 80,
                    tx: landX,
                    ty: landY,
                    vy: 0.65 + Math.random() * 0.85,
                    sway: Math.random() * 6.28,
                    rot: Math.random() * 6.28,
                    vr: (Math.random() - 0.5) * 0.08,
                    swayAmp: 0.7 + Math.random() * 0.8,
                    size: 7 + Math.random() * 7,
                    col: FALL[Math.floor(Math.random() * FALL.length)],
                    life: 0
                });
            }

            function leafTick() {
                if (!LEAVES_ENABLED) {
                    if (leaves.length) leaves.length = 0;
                    return;
                }
                var lt = window.__leafTargets;
                var fresh = lt && (((window.performance ? performance.now() : Date.now()) - (lt.stamp || 0)) < 250);
                var live = fresh && lt.active && lt.bars && lt.bars.length;
                if (live) {
                    var rate = lt.filling ? 3 : 1;
                    var cap = lt.filling ? 120 : 40;
                    if (leaves.length < cap && (lt.filling || (Math.random() < 0.4))) {
                        for (var s = 0; s < rate; s++) spawnLeaf(lt.bars);
                    }
                } else if (leaves.length) {
                    leaves.length = 0;
                }
                for (var i = leaves.length - 1; i >= 0; i--) {
                    var lf = leaves[i];
                    lf.life++;
                    lf.sway += 0.035;
                    lf.rot += lf.vr;
                    lf.y += lf.vy;
                    lf.x += Math.sin(lf.sway) * lf.swayAmp + (lf.tx - lf.x) * 0.006;
                    var done = lf.y >= lf.ty;
                    if (done) {
                        leaves.splice(i, 1);
                        continue;
                    }
                    var a = Math.min(1, lf.life / 10) * 0.92;
                    ctx.save();
                    ctx.translate(lf.x, lf.y);
                    ctx.rotate(lf.rot);
                    ctx.fillStyle = 'rgba(' + lf.col[0] + ',' + lf.col[1] + ',' + lf.col[2] + ',' + a.toFixed(3) + ')';
                    ctx.beginPath();
                    ctx.ellipse(0, 0, lf.size, lf.size * 0.6, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(' + (lf.col[0] * 0.6 | 0) + ',' + (lf.col[1] * 0.6 | 0) + ',' + (lf.col[2] * 0.55 | 0) + ',' + a.toFixed(3) + ')';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(-lf.size * 0.4, 0);
                    ctx.lineTo(lf.size * 0.4, 0);
                    ctx.stroke();
                    ctx.restore();
                }
            }

            function tick(t) {
                ctx.clearRect(0, 0, innerWidth, innerHeight);
                for (var i = 0; i < motes.length; i++) {
                    var m = motes[i];
                    m.x += m.vx;
                    m.y += m.vy;
                    m.tw += 0.02;
                    if (m.y < -10 || m.x < -10 || m.x > innerWidth + 10) motes[i] = newMote(false);
                    var alpha = m.a * (0.6 + 0.4 * Math.sin(m.tw));
                    ctx.beginPath();
                    ctx.fillStyle = 'rgba(' + MOTE_RGB + ',' + alpha.toFixed(3) + ')';
                    ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
                    ctx.fill();
                }
                leafTick();
                requestAnimationFrame(tick);
            }
            resize();
            addEventListener('resize', resize);
            requestAnimationFrame(tick);
            var hero = document.getElementById('hero');

            function onScroll() {
                var h = innerHeight;
                var p = Math.min(1, scrollY / (h * 0.32));
                hero.style.opacity = (1 - p).toFixed(3);
                hero.style.transform = 'translateY(' + (-p * 60).toFixed(1) + 'px)';
                hero.style.display = p >= 1 ? 'none' : 'flex';
            }
            addEventListener('scroll', onScroll, {
                passive: true
            });
            onScroll();
        })();
    


/* ---- scroll-driven transition grow ---- */
        (function() {
            var sec = document.querySelector('#sections .step[data-active-index="3"]');
            if (!sec) return;
            var ticking = false;

            function update() {
                var r = sec.getBoundingClientRect();
                var vh = window.innerHeight || document.documentElement.clientHeight;
                var center = r.top + r.height / 2;
                var g = 1 - Math.min(1, Math.abs(center - vh / 2) / (vh * 0.72));
                if (g < 0) g = 0;
                g = g * g * (3 - 2 * g); // smoothstep: gentle ease in/out, no snap
                sec.style.setProperty('--grow', g.toFixed(3));
                ticking = false;
            }

            function onScroll() {
                if (!ticking) {
                    window.requestAnimationFrame(update);
                    ticking = true;
                }
            }
            window.addEventListener('scroll', onScroll, {
                passive: true
            });
            window.addEventListener('resize', onScroll, {
                passive: true
            });
            update();
        })();
    

