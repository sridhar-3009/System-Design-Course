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
    try { return localStorage.getItem(THEME_KEY) || 'light'; } catch (e) { return 'light'; }
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
    syncIcons(document.documentElement.getAttribute('data-theme') || 'light');
    btn.addEventListener('click', function () {
      setTimeout(function () {
        syncIcons(document.documentElement.getAttribute('data-theme') || 'light');
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
   Monochrome 3D hero — Three.js scene with DOM fallback
   ============================================================ */
(function () {
  'use strict';

  function initSystem3D() {
    var canvas = document.getElementById('system3d');
    if (!canvas) return;

    if (!window.THREE) {
      canvas.classList.add('system-3d-fallback');
      return;
    }

    var THREE = window.THREE;
    var hero = canvas.closest('.hero') || document.body;
    var scene = new THREE.Scene();
    var renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    var group = new THREE.Group();
    var nodes = [];
    var packets = [];
    var pointer = { x: 0, y: 0 };
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    scene.add(group);
    camera.position.set(0, 0.2, 8);

    scene.add(new THREE.AmbientLight(0xffffff, 1.8));
    var keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(4, 5, 8);
    scene.add(keyLight);

    var lineMaterial = new THREE.LineBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.46 });
    var nodePalette = [0x7c3aed, 0x06b6d4, 0x10b981, 0xf59e0b, 0xec4899];
    var nodeMaterials = nodePalette.map(function (color) {
      return new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.38,
        metalness: 0.18,
        emissive: color,
        emissiveIntensity: 0.09
      });
    });
    var nodeMaterial = new THREE.MeshStandardMaterial({
      color: 0x7c3aed,
      roughness: 0.42,
      metalness: 0.2,
      emissive: 0x2a0a66
    });
    var darkNodeMaterial = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.55,
      metalness: 0.1
    });
    var packetMaterial = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.28,
      metalness: 0.45,
      emissive: 0x6b3a00
    });

    var positions = [
      [-2.9, 1.15, 0.25],
      [-1.1, 1.65, -0.55],
      [0.75, 0.85, 0.45],
      [2.55, 1.35, -0.35],
      [-2.15, -0.72, -0.25],
      [-0.2, -1.1, 0.55],
      [1.9, -0.75, -0.2],
      [3.15, -1.2, 0.35]
    ];
    var links = [
      [0, 1], [1, 2], [2, 3],
      [0, 4], [1, 5], [2, 5],
      [3, 6], [4, 5], [5, 6], [6, 7]
    ];

    positions.forEach(function (pos, index) {
      var geometry = new THREE.IcosahedronGeometry(index % 3 === 0 ? 0.2 : 0.15, 1);
      var mesh = new THREE.Mesh(geometry, index % 4 === 0 ? darkNodeMaterial : (nodeMaterials[index % nodeMaterials.length] || nodeMaterial));
      mesh.position.set(pos[0], pos[1], pos[2]);
      nodes.push(mesh);
      group.add(mesh);
    });

    links.forEach(function (link, index) {
      var start = nodes[link[0]].position;
      var end = nodes[link[1]].position;
      var geometry = new THREE.BufferGeometry().setFromPoints([start.clone(), end.clone()]);
      var line = new THREE.Line(geometry, lineMaterial);
      group.add(line);

      var packet = new THREE.Mesh(new THREE.SphereGeometry(0.055, 18, 18), packetMaterial);
      packet.userData = {
        start: start.clone(),
        end: end.clone(),
        speed: 0.18 + (index % 4) * 0.035,
        offset: index * 0.11
      };
      packets.push(packet);
      group.add(packet);
    });

    var ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide
    });
    for (var i = 0; i < 3; i += 1) {
      var ring = new THREE.Mesh(new THREE.TorusGeometry(1.5 + i * 0.8, 0.006, 8, 96), ringMaterial);
      ring.rotation.x = Math.PI / 2.7;
      ring.rotation.y = i * 0.45;
      group.add(ring);
    }

    function resize() {
      var rect = hero.getBoundingClientRect();
      var width = Math.max(320, rect.width);
      var height = Math.max(420, rect.height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      group.scale.setScalar(width < 760 ? 0.74 : 1);
    }

    function onPointerMove(event) {
      var rect = hero.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 0.55;
      pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 0.35;
    }

    function animate(now) {
      var t = now * 0.001;
      group.rotation.y += ((pointer.x + Math.sin(t * 0.22) * 0.12) - group.rotation.y) * 0.035;
      group.rotation.x += ((-pointer.y + Math.sin(t * 0.18) * 0.06) - group.rotation.x) * 0.035;

      nodes.forEach(function (node, index) {
        var pulse = 1 + Math.sin(t * 1.8 + index) * 0.08;
        node.scale.setScalar(pulse);
        node.rotation.x += 0.006;
        node.rotation.y += 0.009;
      });

      packets.forEach(function (packet) {
        var u = (t * packet.userData.speed + packet.userData.offset) % 1;
        packet.position.lerpVectors(packet.userData.start, packet.userData.end, u);
      });

      renderer.render(scene, camera);
      if (!reduceMotion) window.requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resize);
    hero.addEventListener('pointermove', onPointerMove, { passive: true });
    resize();
    animate(0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSystem3D);
  } else {
    initSystem3D();
  }
})();
