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
   Hero — Three.js 3D distributed system architecture
   Right-panel canvas. Click to trigger request animations.
   ============================================================ */
(function () {
  'use strict';

  function initHeroCanvas() {
    var canvas = document.getElementById('system3d');
    if (!canvas) return;
    var hero = canvas.closest('.hero') || document.body;

    /* ── Require Three.js ─────────────────────────────────── */
    if (!window.THREE) {
      /* Three.js not loaded yet — wait and retry */
      setTimeout(initHeroCanvas, 200);
      return;
    }
    var T = window.THREE;

    /* ── Scene ─────────────────────────────────────────────── */
    var scene = new T.Scene();
    scene.background = new T.Color(0x05030e);
    scene.fog = new T.FogExp2(0x05030e, 0.038);

    /* ── Camera ────────────────────────────────────────────── */
    var camera = new T.PerspectiveCamera(52, 1, 0.1, 100);
    camera.position.set(0, 0.5, 13);
    camera.lookAt(0, 0, 0);

    /* ── Renderer ──────────────────────────────────────────── */
    var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    /* ── Lighting ──────────────────────────────────────────── */
    scene.add(new T.AmbientLight(0x7C3AED, 0.5));
    var sun = new T.DirectionalLight(0xffffff, 0.7);
    sun.position.set(4, 8, 6);
    scene.add(sun);

    /* ── Grid floor ────────────────────────────────────────── */
    var grid = new T.GridHelper(22, 22, 0x3b1d8c, 0x1b1638);
    grid.position.y = -6;
    grid.material.opacity = 0.4;
    grid.material.transparent = true;
    scene.add(grid);

    /* ── Architecture definition ───────────────────────────── */
    var ARCH = [
      { id:'client', label:'CLIENT',        sub:'Browser / App',   color:'#06B6D4', hex:0x06B6D4, pos:[  0,  5.2, 0]   },
      { id:'cdn',    label:'CDN',            sub:'CloudFront',      color:'#8B5CF6', hex:0x8B5CF6, pos:[  0,  3.2,-0.3] },
      { id:'lb',     label:'LOAD BALANCER', sub:'nginx / HAProxy', color:'#7C3AED', hex:0x7C3AED, pos:[  0,  1.0, 0]   },
      { id:'app1',   label:'APP-1',          sub:'Node.js',         color:'#A78BFA', hex:0xA78BFA, pos:[-3.0,-1.2, 0.5] },
      { id:'app2',   label:'APP-2',          sub:'Node.js',         color:'#A78BFA', hex:0xA78BFA, pos:[  0, -1.2,-0.3] },
      { id:'app3',   label:'APP-3',          sub:'Node.js',         color:'#A78BFA', hex:0xA78BFA, pos:[ 3.0,-1.2, 0.5] },
      { id:'cache',  label:'REDIS',          sub:'L1 Cache',        color:'#F59E0B', hex:0xF59E0B, pos:[-2.2,-3.5, 0]   },
      { id:'db',     label:'POSTGRESQL',     sub:'Primary DB',      color:'#10B981', hex:0x10B981, pos:[ 2.2,-3.5, 0]   }
    ];
    var EDGES = [
      ['client','cdn'],['cdn','lb'],
      ['lb','app1'],['lb','app2'],['lb','app3'],
      ['app1','cache'],['app2','cache'],['app2','db'],['app3','db']
    ];

    var nodeMap  = {};
    var edgeCurves = [];
    var packets  = [];
    var reqCount = 0;
    var mouse    = { x:0, y:0 };
    var camAngle = 0;

    /* ── Helpers ───────────────────────────────────────────── */
    function hexColorStr(h) { /* '#RRGGBB' → 'r,g,b' */
      return parseInt(h.slice(1,3),16)+','+parseInt(h.slice(3,5),16)+','+parseInt(h.slice(5,7),16);
    }

    /* Canvas-texture label for each node */
    function makeLabel(label, sub, color) {
      var c = document.createElement('canvas');
      c.width = 288; c.height = 96;
      var cx = c.getContext('2d');
      /* background */
      cx.fillStyle = 'rgba(13,10,30,0.95)';
      cx.beginPath();
      if (cx.roundRect) cx.roundRect(0,0,288,96,10); else cx.rect(0,0,288,96);
      cx.fill();
      /* top bar */
      cx.fillStyle = color;
      cx.fillRect(0,0,288,4);
      /* border */
      cx.strokeStyle = color;
      cx.lineWidth = 1.5;
      cx.globalAlpha = 0.9;
      cx.beginPath();
      if (cx.roundRect) cx.roundRect(1,1,286,94,9); else cx.rect(1,1,286,94);
      cx.stroke();
      cx.globalAlpha = 1;
      /* label */
      cx.fillStyle = '#EDE9FE';
      cx.font = 'bold 18px monospace';
      cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.fillText(label, 144, 42);
      /* sub */
      cx.fillStyle = 'rgba(148,144,180,0.85)';
      cx.font = '13px monospace';
      cx.fillText(sub, 144, 68);
      return new T.CanvasTexture(c);
    }

    /* Glow sprite around node */
    function makeGlow(color, size) {
      var c = document.createElement('canvas');
      c.width = c.height = 128;
      var cx = c.getContext('2d');
      var rgb = hexColorStr(color);
      var g = cx.createRadialGradient(64,64,0,64,64,64);
      g.addColorStop(0,   'rgba('+rgb+',0.65)');
      g.addColorStop(0.35,'rgba('+rgb+',0.22)');
      g.addColorStop(1,   'rgba('+rgb+',0)');
      cx.fillStyle = g; cx.fillRect(0,0,128,128);
      var mat = new T.SpriteMaterial({
        map: new T.CanvasTexture(c),
        transparent: true, blending: T.AdditiveBlending, depthWrite: false
      });
      var sp = new T.Sprite(mat);
      sp.scale.set(size, size, 1);
      return sp;
    }

    /* Packet mesh (sphere + glow child) */
    function makePacket(hexColor) {
      var mesh = new T.Mesh(
        new T.SphereGeometry(0.14, 10, 10),
        new T.MeshBasicMaterial({ color: hexColor })
      );
      var glow = makeGlow('#'+hexColor.toString(16).padStart(6,'0'), 1.2);
      mesh.add(glow);
      return mesh;
    }

    /* ── Build scene objects ───────────────────────────────── */
    ARCH.forEach(function (d) {
      var group = new T.Group();
      group.position.set(d.pos[0], d.pos[1], d.pos[2]);

      /* Label plane */
      var tex  = makeLabel(d.label, d.sub, d.color);
      var plane = new T.Mesh(
        new T.PlaneGeometry(2.8, 0.95),
        new T.MeshBasicMaterial({ map: tex, transparent: true, side: T.DoubleSide, depthWrite: false })
      );
      group.add(plane);

      /* Glow behind */
      var glow = makeGlow(d.color, 4.2);
      glow.position.z = -0.05;
      group.add(glow);

      /* Point light */
      var light = new T.PointLight(d.hex, 0.85, 4.5);
      group.add(light);

      scene.add(group);
      nodeMap[d.id] = { group: group, pos: new T.Vector3(d.pos[0], d.pos[1], d.pos[2]), color: d.color, hex: d.hex, light: light };
    });

    /* Build edge curves + line meshes */
    EDGES.forEach(function (e) {
      var a = nodeMap[e[0]], b = nodeMap[e[1]];
      if (!a || !b) return;
      var mid = new T.Vector3(
        (a.pos.x + b.pos.x) * 0.5,
        (a.pos.y + b.pos.y) * 0.5,
        (a.pos.z + b.pos.z) * 0.5 + 0.4
      );
      var curve = new T.CatmullRomCurve3([a.pos.clone(), mid, b.pos.clone()]);
      var pts   = curve.getPoints(64);
      var line  = new T.Line(
        new T.BufferGeometry().setFromPoints(pts),
        new T.LineBasicMaterial({ color: 0x5b21b6, transparent: true, opacity: 0.4 })
      );
      scene.add(line);
      edgeCurves.push({ curve: curve, fromId: e[0], toId: e[1] });
    });

    /* Background particle cloud */
    var ptPositions = new Float32Array(240 * 3);
    for (var i = 0; i < 240; i++) {
      ptPositions[i*3]   = (Math.random()-0.5) * 20;
      ptPositions[i*3+1] = (Math.random()-0.5) * 14;
      ptPositions[i*3+2] = (Math.random()-0.5) * 8 - 2;
    }
    var ptGeo = new T.BufferGeometry();
    ptGeo.setAttribute('position', new T.BufferAttribute(ptPositions, 3));
    var ptCloud = new T.Points(ptGeo, new T.PointsMaterial({
      color: 0xA78BFA, size: 0.055, transparent: true, opacity: 0.55,
      blending: T.AdditiveBlending
    }));
    scene.add(ptCloud);

    /* ── Request spawner ───────────────────────────────────── */
    function spawnRequest() {
      reqCount++;
      var appId  = ['app1','app2','app3'][Math.floor(Math.random()*3)];
      var target = Math.random() < 0.55 ? 'cache' : 'db';
      var segs   = [
        { from:'client', to:'cdn',   hex:0x06B6D4 },
        { from:'cdn',    to:'lb',    hex:0x8B5CF6 },
        { from:'lb',     to:appId,   hex:0x7C3AED },
        { from:appId,    to:target,  hex: target==='cache' ? 0xF59E0B : 0x10B981 }
      ];
      segs.forEach(function (s, idx) {
        setTimeout(function () {
          var edge = null;
          for (var j = 0; j < edgeCurves.length; j++) {
            var ec = edgeCurves[j];
            if ((ec.fromId===s.from && ec.toId===s.to) || (ec.fromId===s.to && ec.toId===s.from)) {
              edge = ec; break;
            }
          }
          if (!edge) return;
          var mesh = makePacket(s.hex);
          scene.add(mesh);
          packets.push({ mesh: mesh, curve: edge.curve, t: 0, speed: 0.6 + Math.random()*0.25, rev: edge.fromId !== s.from });

          /* flash destination */
          setTimeout(function () {
            var n = nodeMap[s.to];
            if (n && n.light) { n.light.intensity = 3.5; setTimeout(function(){ n.light.intensity = 0.85; }, 320); }
          }, 550);
        }, idx * 350);
      });
    }

    /* ── Resize ────────────────────────────────────────────── */
    function resize() {
      var rect = canvas.getBoundingClientRect();
      var W = Math.max(1, rect.width  || canvas.offsetWidth  || 500);
      var H = Math.max(1, rect.height || canvas.offsetHeight || 700);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H, false);
    }

    window.addEventListener('resize', resize);
    resize();

    /* ── Input ─────────────────────────────────────────────── */
    canvas.addEventListener('click', spawnRequest);
    hero.addEventListener('click',   spawnRequest);
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width  - 0.5) * 2;
      mouse.y = ((e.clientY - r.top)  / r.height - 0.5) * 2;
    }, { passive: true });

    /* ── Render loop ───────────────────────────────────────── */
    var autoTimer = 0;
    var clock = new T.Clock();

    function animate() {
      requestAnimationFrame(animate);
      var dt = clock.getDelta();
      var et = clock.getElapsedTime();

      /* Camera gentle orbit + mouse tilt */
      camAngle += 0.0015;
      camera.position.x = Math.sin(camAngle) * 1.8 + mouse.x * 0.7;
      camera.position.y = 0.5 + mouse.y * -0.5;
      camera.position.z = Math.cos(camAngle) * 1.5 + 13;
      camera.lookAt(0, 0, 0);

      /* Rotate particle cloud slowly */
      ptCloud.rotation.y = et * 0.04;

      /* Node glow breathing */
      ARCH.forEach(function (d, idx) {
        var n = nodeMap[d.id];
        if (!n) return;
        var brightness = 0.5 + 0.35 * Math.sin(et * 1.3 + idx * 0.8);
        n.group.children.forEach(function (c) {
          if (c.isSprite) c.material.opacity = brightness;
        });
        /* Slight float */
        n.group.position.y = d.pos[1] + Math.sin(et * 0.9 + idx * 0.55) * 0.08;
      });

      /* Animate packets */
      for (var i = packets.length - 1; i >= 0; i--) {
        var pk = packets[i];
        pk.t = Math.min(1, pk.t + pk.speed * dt);
        var tE = pk.t < 0.5 ? 2*pk.t*pk.t : -1+(4-2*pk.t)*pk.t;
        var pos = pk.curve.getPoint(pk.rev ? 1-tE : tE);
        pk.mesh.position.copy(pos);
        pk.mesh.scale.setScalar(0.85 + Math.sin(pk.t * Math.PI) * 0.4);
        if (pk.t >= 1) { scene.remove(pk.mesh); packets.splice(i, 1); }
      }

      /* Auto-spawn */
      autoTimer += dt;
      if (autoTimer > 2.6) { autoTimer = 0; spawnRequest(); }

      renderer.render(scene, camera);
    }

    animate();

    /* Staggered initial burst */
    setTimeout(spawnRequest, 500);
    setTimeout(spawnRequest, 1100);
    setTimeout(spawnRequest, 1900);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeroCanvas);
  } else {
    initHeroCanvas();
  }
})();
