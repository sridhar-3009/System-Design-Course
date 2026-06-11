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
   Hero canvas — Canvas 2D network animation (no Three.js needed)
   Inspired by the Gradient Descent reference project
   ============================================================ */
(function () {
  'use strict';

  function initHeroCanvas() {
    var canvas = document.getElementById('system3d');
    if (!canvas) return;
    var hero = canvas.closest('.hero') || document.body;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    /* Node layout (normalized 0–1) */
    var ND = [
      { nx: 0.17, ny: 0.28, r: 9,  color: '#7C3AED' },
      { nx: 0.34, ny: 0.19, r: 11, color: '#9F67F8' },
      { nx: 0.52, ny: 0.34, r: 8,  color: '#F59E0B' },
      { nx: 0.67, ny: 0.22, r: 10, color: '#7C3AED' },
      { nx: 0.82, ny: 0.16, r: 7,  color: '#10B981' },
      { nx: 0.24, ny: 0.64, r: 8,  color: '#10B981' },
      { nx: 0.55, ny: 0.68, r: 10, color: '#7C3AED' },
      { nx: 0.78, ny: 0.66, r: 7,  color: '#F59E0B' }
    ];
    var EDGES = [[0,1],[1,2],[2,3],[3,4],[0,5],[1,6],[2,6],[3,7],[5,6],[6,7]];

    var W = 0, H = 0, dpr = 1;
    var nodes = [], packets = [];
    var mouse = { x: 0.5, y: 0.5 };
    var raf;

    function buildGeometry() {
      nodes = ND.map(function (d) {
        return {
          x: d.nx * W, y: d.ny * H,
          r: d.r, color: d.color,
          phase: Math.random() * Math.PI * 2
        };
      });
      packets = EDGES.map(function (e, i) {
        return {
          from: e[0], to: e[1],
          t: (i * 0.13) % 1,
          speed: 0.09 + (i % 5) * 0.018,
          color: ND[e[0]].color
        };
      });
    }

    function resize() {
      var rect = hero.getBoundingClientRect();
      W = Math.max(400, rect.width);
      H = Math.max(500, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width  = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width  = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildGeometry();
    }

    function hex2rgb(hex) {
      var r = parseInt(hex.slice(1,3), 16);
      var g = parseInt(hex.slice(3,5), 16);
      var b = parseInt(hex.slice(5,7), 16);
      return { r: r, g: g, b: b };
    }

    function drawFrame(now) {
      var t = now * 0.001;

      ctx.clearRect(0, 0, W, H);

      /* Subtle background particle field */
      ctx.save();
      for (var pi = 0; pi < 55; pi++) {
        var px = ((pi * 137.508 * W) % W);
        var py = ((pi * 97.31  * H) % H);
        var pa = 0.06 + 0.04 * Math.sin(t * 0.8 + pi * 2.1);
        ctx.fillStyle = 'rgba(167,139,250,' + pa + ')';
        ctx.beginPath();
        ctx.arc(px, py, 1 + (pi % 3) * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      /* Parallax offset */
      var ox = (mouse.x - 0.5) * 50;
      var oy = (mouse.y - 0.5) * 25;

      /* --- Draw edges --- */
      ctx.save();
      ctx.setLineDash([8, 6]);
      EDGES.forEach(function (e) {
        var a = nodes[e[0]], b = nodes[e[1]];
        ctx.beginPath();
        ctx.moveTo(a.x + ox * 0.55, a.y + oy * 0.55);
        ctx.lineTo(b.x + ox * 0.55, b.y + oy * 0.55);
        ctx.strokeStyle = 'rgba(167,139,250,0.28)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.restore();

      /* --- Draw packets --- */
      packets.forEach(function (pk) {
        pk.t = (pk.t + pk.speed * 0.004) % 1;
        var a = nodes[pk.from], b = nodes[pk.to];
        var ax = a.x + ox * 0.55, ay = a.y + oy * 0.55;
        var bx = b.x + ox * 0.55, by = b.y + oy * 0.55;
        var ease = pk.t < 0.5 ? 2*pk.t*pk.t : -1+(4-2*pk.t)*pk.t;
        var px = ax + (bx - ax) * ease;
        var py = ay + (by - ay) * ease;
        var alpha = pk.t < 0.08 ? pk.t/0.08 : pk.t > 0.9 ? (1-pk.t)/0.1 : 1;

        var rgb = hex2rgb(pk.color);
        /* Glow */
        var grd = ctx.createRadialGradient(px, py, 0, px, py, 14);
        grd.addColorStop(0, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + (alpha * 0.7) + ')');
        grd.addColorStop(1, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(px, py, 14, 0, Math.PI * 2);
        ctx.fill();
        /* Core */
        ctx.fillStyle = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + alpha + ')';
        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });

      /* --- Draw nodes --- */
      nodes.forEach(function (n) {
        var nx = n.x + ox * 0.55;
        var ny = n.y + oy * 0.55;
        var pulse = 1 + Math.sin(t * 1.7 + n.phase) * 0.11;
        var nr = n.r * pulse;
        var rgb = hex2rgb(n.color);

        /* Outer glow */
        var grd = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr * 3.5);
        grd.addColorStop(0,   'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0.55)');
        grd.addColorStop(0.4, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0.18)');
        grd.addColorStop(1,   'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(nx, ny, nr * 3.5, 0, Math.PI * 2);
        ctx.fill();

        /* Node body */
        ctx.fillStyle = n.color;
        ctx.beginPath();
        ctx.arc(nx, ny, nr, 0, Math.PI * 2);
        ctx.fill();

        /* Specular highlight */
        ctx.fillStyle = 'rgba(255,255,255,0.42)';
        ctx.beginPath();
        ctx.arc(nx - nr * 0.28, ny - nr * 0.28, nr * 0.32, 0, Math.PI * 2);
        ctx.fill();
      });

      raf = requestAnimationFrame(drawFrame);
    }

    function onPointerMove(e) {
      var rect = hero.getBoundingClientRect();
      mouse.x = (e.clientX - rect.left) / rect.width;
      mouse.y = (e.clientY - rect.top)  / rect.height;
    }

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
    hero.addEventListener('pointermove', onPointerMove, { passive: true });

    resize();
    raf = requestAnimationFrame(drawFrame);
  }


  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeroCanvas);
  } else {
    initHeroCanvas();
  }
})();
