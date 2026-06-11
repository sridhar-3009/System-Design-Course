/* ============================================================
   System Design Illustrated — main.js
   Theme toggle · scroll reveal · progress · completion · quiz
   ============================================================ */

(function () {
  'use strict';

  var THEME_KEY = 'sdi-theme';
  var DONE_KEY = 'sdi-completed';

  /* ---------- Theme toggle ---------- */
  function getTheme() {
    try { return localStorage.getItem(THEME_KEY) || 'dark'; } catch (e) { return 'dark'; }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    /* Icons swapped via CSS [data-theme="dark"] .icon-moon/sun rules */
  }

  function initTheme() {
    applyTheme(getTheme());
    var btn = document.getElementById('themeToggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var next = getTheme() === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
      applyTheme(next);
    });
  }

  /* ---------- Scroll reveal ---------- */
  function initReveal() {
    var els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Reading progress bar ---------- */
  function initProgressBar() {
    var bar = document.querySelector('.reading-progress');
    if (!bar) return;
    function update() {
      var doc = document.documentElement;
      var total = doc.scrollHeight - window.innerHeight;
      var pct = total > 0 ? (window.scrollY / total) * 100 : 0;
      bar.style.width = Math.min(100, Math.max(0, pct)) + '%';
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------- Completion tracking ---------- */
  function getCompleted() {
    try {
      var raw = localStorage.getItem(DONE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function markCompleted(id) {
    var done = getCompleted();
    if (done.indexOf(id) === -1) {
      done.push(id);
      try { localStorage.setItem(DONE_KEY, JSON.stringify(done)); } catch (e) {}
    }
  }

  function initCompletionTracking() {
    var topicId = document.body.getAttribute('data-topic');
    if (!topicId) return;
    var fired = false;
    function check() {
      if (fired) return;
      var doc = document.documentElement;
      var total = doc.scrollHeight - window.innerHeight;
      if (total <= 0) return;
      if (window.scrollY / total >= 0.9) {
        fired = true;
        markCompleted(topicId);
        window.removeEventListener('scroll', check);
      }
    }
    window.addEventListener('scroll', check, { passive: true });
  }

  /* ---------- Show ✓ badges on index topic cards ---------- */
  function initDoneBadges() {
    var cards = document.querySelectorAll('.topic-card[data-topic]');
    if (!cards.length) return;
    var done = getCompleted();
    cards.forEach(function (card) {
      if (done.indexOf(card.getAttribute('data-topic')) !== -1 &&
          !card.querySelector('.done-badge')) {
        var badge = document.createElement('span');
        badge.className = 'done-badge';
        badge.textContent = '✓';
        badge.setAttribute('title', 'Completed');
        card.appendChild(badge);
      }
    });
  }

  /* ---------- Quiz logic ---------- */
  function initQuizzes() {
    document.querySelectorAll('.quiz').forEach(function (quiz) {
      var options = quiz.querySelectorAll('.quiz-option');
      var feedback = quiz.querySelector('.quiz-feedback');
      var answered = false;
      options.forEach(function (opt) {
        opt.addEventListener('click', function () {
          if (answered) return;
          answered = true;
          var isCorrect = opt.getAttribute('data-correct') === 'true';
          opt.classList.add(isCorrect ? 'correct' : 'incorrect');
          options.forEach(function (o) {
            o.disabled = true;
            if (o.getAttribute('data-correct') === 'true') o.classList.add('correct');
          });
          if (feedback) feedback.classList.add('show');
        });
      });
    });
  }

  /* ---------- Boot ---------- */
  function boot() {
    initTheme();
    initReveal();
    initProgressBar();
    initCompletionTracking();
    initDoneBadges();
    initQuizzes();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

/* ---------- Accordion Q&A (expansion pack) ---------- */
(function () {
  'use strict';
  function initQA() {
    document.querySelectorAll('.qa-question').forEach(function (q) {
      q.addEventListener('click', function () {
        var item = q.parentElement;
        var wasOpen = item.classList.contains('open');
        document.querySelectorAll('.qa-item.open').forEach(function (i) { i.classList.remove('open'); });
        if (!wasOpen) item.classList.add('open');
      });
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initQA);
  } else {
    initQA();
  }
})();

/* ============================================================
   3D card tilt effect — pointer drives perspective rotation
   ============================================================ */
(function () {
  'use strict';
  function initTilt() {
    document.querySelectorAll('.topic-card').forEach(function (card) {
      var raf;
      card.addEventListener('mousemove', function (e) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          var r = card.getBoundingClientRect();
          var x = (e.clientX - r.left) / r.width - 0.5;
          var y = (e.clientY - r.top) / r.height - 0.5;
          card.style.setProperty('--ry', (x * 18).toFixed(1) + 'deg');
          card.style.setProperty('--rx', (-y * 13).toFixed(1) + 'deg');
        });
      });
      card.addEventListener('mouseleave', function () {
        cancelAnimationFrame(raf);
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* Theme toggle: swap moon/sun SVG icons */
  function patchThemeIcons() {
    var btn = document.getElementById('themeToggle');
    if (!btn) return;
    if (!btn.querySelector('.icon-moon') && !btn.querySelector('.icon-sun')) {
      btn.innerHTML =
        '<svg class="icon-moon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>' +
        '<svg class="icon-sun" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
    }
    function syncIcons(theme) {
      var moon = btn.querySelector('.icon-moon');
      var sun  = btn.querySelector('.icon-sun');
      if (moon) moon.style.display = theme === 'dark' ? 'none' : 'block';
      if (sun)  sun.style.display  = theme === 'dark' ? 'block' : 'none';
    }
    syncIcons(document.documentElement.getAttribute('data-theme') || 'dark');
    btn.addEventListener('click', function () {
      setTimeout(function () {
        syncIcons(document.documentElement.getAttribute('data-theme') || 'dark');
      }, 0);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initTilt(); patchThemeIcons(); });
  } else {
    initTilt(); patchThemeIcons();
  }
})();

/* ============================================================
   SVG packet animation — moves .pkt circles along their nearest
   <line> element using cx/cy interpolation via requestAnimationFrame
   ============================================================ */
(function () {
  'use strict';

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  function distSq(cx, cy, lx, ly) {
    return (cx - lx) * (cx - lx) + (cy - ly) * (cy - ly);
  }

  function closestLine(cx, cy, lines) {
    var best = null, bestDist = Infinity;
    lines.forEach(function (l) {
      var x1 = parseFloat(l.getAttribute('x1'));
      var y1 = parseFloat(l.getAttribute('y1'));
      var x2 = parseFloat(l.getAttribute('x2'));
      var y2 = parseFloat(l.getAttribute('y2'));
      var d = Math.min(distSq(cx, cy, x1, y1), distSq(cx, cy, x2, y2));
      if (d < bestDist) { bestDist = d; best = l; }
    });
    return best;
  }

  function initDiagramPackets() {
    document.querySelectorAll('.diagram-box svg, .hero-svg').forEach(function (svg) {
      var pkts = Array.from(svg.querySelectorAll('.pkt'));
      var lines = Array.from(svg.querySelectorAll('line'));
      if (!pkts.length || !lines.length) return;

      var animData = pkts.map(function (pkt, i) {
        var cx0 = parseFloat(pkt.getAttribute('cx') || 0);
        var cy0 = parseFloat(pkt.getAttribute('cy') || 0);
        var line = closestLine(cx0, cy0, lines);
        if (!line) return null;
        var x1 = parseFloat(line.getAttribute('x1'));
        var y1 = parseFloat(line.getAttribute('y1'));
        var x2 = parseFloat(line.getAttribute('x2'));
        var y2 = parseFloat(line.getAttribute('y2'));
        var phaseShift = i * 0.37;
        var speed = 0.28 + (i % 5) * 0.055;
        return { pkt: pkt, x1: x1, y1: y1, x2: x2, y2: y2, phase: phaseShift, speed: speed };
      }).filter(Boolean);

      if (!animData.length) return;

      /* Stop CSS animation that used translateX (was wrong) */
      pkts.forEach(function (p) {
        p.classList.remove('pkt-1', 'pkt-2');
        p.style.animation = 'none';
        p.setAttribute('opacity', '0');
      });

      var t0 = performance.now();

      function tick(now) {
        var elapsed = (now - t0) * 0.001;
        animData.forEach(function (a) {
          var raw = (elapsed * a.speed + a.phase) % 1;
          /* fade in/out at ends */
          var alpha = raw < 0.08 ? raw / 0.08 : raw > 0.9 ? (1 - raw) / 0.1 : 1;
          var ease = easeInOut(raw);
          a.pkt.setAttribute('cx', a.x1 + (a.x2 - a.x1) * ease);
          a.pkt.setAttribute('cy', a.y1 + (a.y2 - a.y1) * ease);
          a.pkt.setAttribute('opacity', (alpha * 0.9).toFixed(3));
        });
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDiagramPackets);
  } else {
    initDiagramPackets();
  }
})();

/* ============================================================
   Hero canvas — labeled distributed system architecture
   Client → CDN → Load Balancer → App Servers → Cache + DB
   Click anywhere to trigger animated requests
   ============================================================ */
(function () {
  'use strict';

  function initHeroCanvas() {
    var canvas = document.getElementById('system3d');
    if (!canvas) return;
    var hero = canvas.closest('.hero') || document.body;
    var ctx  = canvas.getContext('2d');
    if (!ctx) return;

    var W = 0, H = 0, dpr = 1;
    var mouse = { x: 0.5, y: 0.5 };
    var raf;
    var reqCount = 0;
    var packets  = [];
    /* Active node flash: idx -> alpha 0..1 */
    var flashes  = {};
    var t0       = performance.now();

    /* ---- Layout helpers ---- */
    var NW = 96, NH = 38; /* node box size */

    function N(id, label, sub, color, xf, yf) {
      return { id: id, label: label, sub: sub, color: color, xf: xf, yf: yf };
    }

    /* Node definitions (fractional positions) */
    var ARCH = [
      N('client', 'CLIENT',       'Browser',    '#06B6D4', 0.5,  0.08),
      N('cdn',    'CDN',          'CloudFront', '#8B5CF6', 0.5,  0.22),
      N('lb',     'LOAD BALANCER','nginx',      '#7C3AED', 0.5,  0.37),
      N('app1',   'APP-1',        'Node.js',    '#A78BFA', 0.25, 0.54),
      N('app2',   'APP-2',        'Node.js',    '#A78BFA', 0.5,  0.54),
      N('app3',   'APP-3',        'Node.js',    '#A78BFA', 0.75, 0.54),
      N('cache',  'REDIS',        'L1 Cache',   '#F59E0B', 0.31, 0.74),
      N('db',     'POSTGRESQL',   'Primary DB', '#10B981', 0.69, 0.74)
    ];

    /* Directed edges: [from-id, to-id] */
    var EDGES = [
      ['client','cdn'],
      ['cdn','lb'],
      ['lb','app1'],['lb','app2'],['lb','app3'],
      ['app1','cache'],['app2','cache'],
      ['app2','db'],  ['app3','db'],
      ['cache','db']
    ];

    var nodes = {}; /* id → {x,y,w,h,...} */

    function lerp(a, b, t) { return a + (b-a)*t; }
    function ease(t) { return t<0.5 ? 2*t*t : -1+(4-2*t)*t; }

    function rrect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
      ctx.arcTo(x+w,y,x+w,y+r,r); ctx.lineTo(x+w,y+h-r);
      ctx.arcTo(x+w,y+h,x+w-r,y+h,r); ctx.lineTo(x+r,y+h);
      ctx.arcTo(x,y+h,x,y+h-r,r); ctx.lineTo(x,y+r);
      ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
    }

    function buildLayout() {
      ARCH.forEach(function (d) {
        nodes[d.id] = {
          x: d.xf * W - NW/2,
          y: d.yf * H - NH/2,
          w: NW, h: NH,
          cx: d.xf * W, cy: d.yf * H,
          label: d.label, sub: d.sub, color: d.color, id: d.id
        };
      });
    }

    function drawNode(n, flashA) {
      var x=n.x, y=n.y, w=n.w, h=n.h;

      /* Glow halo */
      var ga = 0.15 + flashA * 0.6;
      var grd = ctx.createRadialGradient(n.cx, n.cy, 0, n.cx, n.cy, w * 0.8);
      grd.addColorStop(0, n.color + Math.round(ga*255).toString(16).padStart(2,'0'));
      grd.addColorStop(1, n.color + '00');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.ellipse(n.cx, n.cy, w*0.9, h*1.4, 0, 0, Math.PI*2);
      ctx.fill();

      /* Box */
      rrect(x, y, w, h, 6);
      ctx.fillStyle = flashA > 0.1
        ? 'rgba(19,15,38,' + (0.85 + flashA*0.1) + ')'
        : 'rgba(19,15,38,0.88)';
      ctx.fill();
      ctx.strokeStyle = flashA > 0.3 ? '#fff' : n.color;
      ctx.lineWidth   = flashA > 0.3 ? 1.8 : 1.2;
      ctx.stroke();

      /* Top color bar */
      rrect(x, y, w, 3, 1);
      ctx.fillStyle = n.color; ctx.fill();

      /* Label */
      ctx.fillStyle = flashA > 0.4 ? '#fff' : 'rgba(237,233,254,0.9)';
      ctx.font = 'bold 10px "JetBrains Mono",monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(n.label, n.cx, n.cy - 5);

      /* Sub-label */
      ctx.fillStyle = 'rgba(148,144,180,0.7)';
      ctx.font = '8px "JetBrains Mono",monospace';
      ctx.fillText(n.sub, n.cx, n.cy + 8);
    }

    function drawEdge(fromId, toId) {
      var a = nodes[fromId], b = nodes[toId];
      if (!a || !b) return;
      ctx.save();
      ctx.strokeStyle = 'rgba(124,58,237,0.28)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([6,5]);
      ctx.beginPath();
      ctx.moveTo(a.cx, a.y + a.h);
      /* Bezier for non-vertical edges */
      var dy = b.cy - a.cy;
      var cx1 = a.cx, cy1 = a.cy + dy*0.45;
      var cx2 = b.cx, cy2 = b.cy - dy*0.45;
      ctx.bezierCurveTo(cx1, cy1, cx2, cy2, b.cx, b.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    function spawnRequest(triggerColor) {
      reqCount++;
      var color = triggerColor || '#7C3AED';
      var isCacheHit = Math.random() < 0.55;

      /* Route: client→cdn→lb→appX→(cache or db) */
      var appId = ['app1','app2','app3'][Math.floor(Math.random()*3)];
      var target = isCacheHit ? 'cache' : 'db';

      var segments = [
        {from:'client', to:'cdn',   color:'#06B6D4'},
        {from:'cdn',    to:'lb',    color:'#8B5CF6'},
        {from:'lb',     to:appId,   color:'#7C3AED'},
        {from:appId,    to:target,  color: isCacheHit ? '#F59E0B' : '#10B981'}
      ];

      var delay = 0;
      segments.forEach(function (seg, idx) {
        setTimeout(function () {
          var a = nodes[seg.from], b = nodes[seg.to];
          if (!a || !b) return;
          packets.push({
            x: a.cx, y: a.cy, tx: b.cx, ty: b.cy,
            t: 0, color: seg.color,
            fromId: seg.from, toId: seg.to
          });
          flashes[seg.from] = 1;
          setTimeout(function () { flashes[seg.to] = 1; }, 280);
        }, delay);
        delay += 320;
      });
    }

    function drawPacket(px, py, color, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha;
      var grd = ctx.createRadialGradient(px, py, 0, px, py, 12);
      grd.addColorStop(0, color + 'cc');
      grd.addColorStop(1, color + '00');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(px, py, 12, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(px, py, 3.8, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }

    function drawFrame(now) {
      var t = (now - t0) * 0.001;

      ctx.clearRect(0, 0, W, H);

      /* Particle field */
      for (var pi = 0; pi < 60; pi++) {
        var ppx = (pi * 137.508 * W * 0.01) % W;
        var ppy = (pi * 97.31  * H * 0.01) % H;
        var pa  = 0.05 + 0.03 * Math.sin(t * 0.7 + pi * 1.9);
        ctx.fillStyle = 'rgba(167,139,250,' + pa + ')';
        ctx.beginPath();
        ctx.arc(ppx, ppy, 1 + (pi%3)*0.4, 0, Math.PI*2);
        ctx.fill();
      }

      /* Grid lines (subtle) */
      ctx.save();
      ctx.strokeStyle = 'rgba(124,58,237,0.06)';
      ctx.lineWidth = 0.5;
      for (var gx = 0; gx < W; gx += 60) {
        ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,H); ctx.stroke();
      }
      for (var gy = 0; gy < H; gy += 60) {
        ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(W,gy); ctx.stroke();
      }
      ctx.restore();

      /* Parallax offset */
      var ox = (mouse.x - 0.5) * 32;
      var oy = (mouse.y - 0.5) * 16;

      /* Apply parallax temporarily */
      ctx.save();
      ctx.translate(ox, oy);

      /* Edges */
      EDGES.forEach(function (e) { drawEdge(e[0], e[1]); });

      /* Packets */
      for (var i = packets.length - 1; i >= 0; i--) {
        var pk = packets[i];
        pk.t = Math.min(1, pk.t + 0.038);
        var ex = ease(pk.t);
        var alpha = pk.t < 0.08 ? pk.t/0.08 : pk.t > 0.88 ? (1-pk.t)/0.12 : 1;
        drawPacket(lerp(pk.x, pk.tx, ex), lerp(pk.y, pk.ty, ex), pk.color, alpha);
        if (pk.t >= 1) packets.splice(i, 1);
      }

      /* Decay flashes */
      Object.keys(flashes).forEach(function (id) {
        flashes[id] = Math.max(0, flashes[id] - 0.025);
        if (flashes[id] <= 0) delete flashes[id];
      });

      /* Nodes */
      ARCH.forEach(function (d) {
        var n = nodes[d.id];
        if (!n) return;
        var fa = flashes[d.id] || 0;
        /* Breathing pulse when idle */
        var pulse = 0.05 + 0.05 * Math.sin(t * 1.2 + d.xf * 6);
        drawNode(n, fa > 0 ? fa : pulse);
      });

      ctx.restore(); /* end parallax */

      /* HUD — request counter */
      ctx.font = '11px "JetBrains Mono",monospace';
      ctx.fillStyle = 'rgba(167,139,250,0.55)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText('REQUESTS: ' + reqCount, 14, H - 14);
      ctx.textAlign = 'right';
      ctx.fillText('CLICK TO SEND REQUEST', W - 14, H - 14);

      /* Auto-spawn every ~2s */
      if (Math.random() < 0.008) spawnRequest();

      raf = requestAnimationFrame(drawFrame);
    }

    function resize() {
      var rect = hero.getBoundingClientRect();
      W = Math.max(400, rect.width);
      H = Math.max(520, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width  = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width  = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildLayout();
    }

    /* Click → send request */
    hero.addEventListener('click', function (e) {
      spawnRequest('#A78BFA');
    });
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) / r.width;
      mouse.y = (e.clientY - r.top)  / r.height;
    }, { passive: true });

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        cancelAnimationFrame(raf);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        resize();
        raf = requestAnimationFrame(drawFrame);
      }, 120);
    });

    resize();
    /* Initial burst of requests to show it off */
    setTimeout(function () { spawnRequest('#06B6D4'); }, 600);
    setTimeout(function () { spawnRequest('#7C3AED'); }, 1400);
    setTimeout(function () { spawnRequest('#10B981'); }, 2200);
    raf = requestAnimationFrame(drawFrame);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeroCanvas);
  } else {
    initHeroCanvas();
  }
})();
