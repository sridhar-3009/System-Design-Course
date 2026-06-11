/* ============================================================
   System Design Illustrated — demos.js
   Interactive Canvas animations for topic pages.
   Pure Canvas 2D — no external libraries.
   ============================================================ */
(function () {
  'use strict';

  /* ── Shared utilities ───────────────────────────────────── */
  function raf(fn) { return requestAnimationFrame(fn); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function ease(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }

  function setupHiDPI(canvas) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var rect = canvas.getBoundingClientRect();
    var w = rect.width || canvas.offsetWidth || 600;
    var h = rect.height || canvas.offsetHeight || 300;
    canvas.width  = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h, dpr: dpr };
  }

  /* Draw a rounded rect */
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x+w, y, x+w, y+r, r);
    ctx.lineTo(x+w, y+h-r);
    ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
    ctx.lineTo(x+r, y+h);
    ctx.arcTo(x, y+h, x, y+h-r, r);
    ctx.lineTo(x, y+r);
    ctx.arcTo(x, y, x+r, y, r);
    ctx.closePath();
  }

  /* Draw node box with glow */
  function drawNode(ctx, x, y, w, h, label, sublabel, color, alpha, glowStrength) {
    ctx.save();
    ctx.globalAlpha = alpha || 1;

    /* Glow halo */
    if (glowStrength > 0) {
      var grd = ctx.createRadialGradient(x + w/2, y + h/2, 0, x + w/2, y + h/2, w * 0.8);
      grd.addColorStop(0, color + Math.round((glowStrength * 0.35) * 255).toString(16).padStart(2,'0'));
      grd.addColorStop(1, color + '00');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.ellipse(x + w/2, y + h/2, w * 0.8, h * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    /* Box */
    rrect(ctx, x, y, w, h, 7);
    ctx.fillStyle = 'rgba(19,15,38,0.92)';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    /* Top accent bar */
    rrect(ctx, x, y, w, 3, 1);
    ctx.fillStyle = color;
    ctx.fill();

    /* Label */
    ctx.fillStyle = '#EDE9FE';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w/2, sublabel ? y + h/2 - 7 : y + h/2);

    if (sublabel) {
      ctx.fillStyle = 'rgba(148,144,180,0.85)';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillText(sublabel, x + w/2, y + h/2 + 8);
    }

    ctx.restore();
  }

  /* Draw arrow */
  function drawArrow(ctx, x1, y1, x2, y2, color, alpha, dashed) {
    ctx.save();
    ctx.globalAlpha = alpha || 0.55;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    if (dashed) ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
    /* Arrowhead */
    var angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 8 * Math.cos(angle - 0.4), y2 - 8 * Math.sin(angle - 0.4));
    ctx.lineTo(x2 - 8 * Math.cos(angle + 0.4), y2 - 8 * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /* Animated packet dot */
  function drawPacket(ctx, x, y, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    var grd = ctx.createRadialGradient(x, y, 0, x, y, 9);
    grd.addColorStop(0, color + 'dd');
    grd.addColorStop(1, color + '00');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  /* ── DEMO 1: Scale Simulator (Topic 01) ──────────────────── */
  function initScaleSimulator() {
    var wrap = document.getElementById('demo-scale');
    if (!wrap) return;

    var html = '<div class="demo-shell" id="demo-scale-shell">' +
      '<div class="demo-header"><span class="demo-label">INTERACTIVE DEMO</span>' +
      '<span class="demo-title">Scaling Simulator</span></div>' +
      '<canvas id="demo-scale-canvas" class="demo-canvas" style="height:260px"></canvas>' +
      '<div class="demo-controls">' +
        '<div class="demo-ctrl">' +
          '<label class="ctrl-label">Servers <span id="scale-srv-val" class="ctrl-val">3</span></label>' +
          '<input type="range" id="scale-srv" min="1" max="8" value="3" class="ctrl-slider">' +
        '</div>' +
        '<div class="demo-ctrl">' +
          '<label class="ctrl-label">Requests/sec <span id="scale-rps-val" class="ctrl-val">800</span></label>' +
          '<input type="range" id="scale-rps" min="100" max="4000" step="100" value="800" class="ctrl-slider">' +
        '</div>' +
        '<div class="demo-stats">' +
          '<div class="demo-stat"><span class="ds-label">P99 Latency</span><span id="scale-lat" class="ds-val green">12ms</span></div>' +
          '<div class="demo-stat"><span class="ds-label">Error Rate</span><span id="scale-err" class="ds-val green">0.0%</span></div>' +
          '<div class="demo-stat"><span class="ds-label">Throughput</span><span id="scale-tput" class="ds-val green">800 rps</span></div>' +
        '</div>' +
      '</div>' +
    '</div>';
    wrap.innerHTML = html;

    var canvas = document.getElementById('demo-scale-canvas');
    var sd = setupHiDPI(canvas);
    var ctx = sd.ctx, W = sd.w, H = sd.h;
    window.addEventListener('resize', function () {
      sd = setupHiDPI(canvas);
      ctx = sd.ctx; W = sd.w; H = sd.h;
    });

    var srvSlider = document.getElementById('scale-srv');
    var rpsSlider = document.getElementById('scale-rps');
    var srvVal   = document.getElementById('scale-srv-val');
    var rpsVal   = document.getElementById('scale-rps-val');
    var latEl    = document.getElementById('scale-lat');
    var errEl    = document.getElementById('scale-err');
    var tputEl   = document.getElementById('scale-tput');

    /* Packets flying at servers */
    var packets = [];
    var servers = [];
    var t0 = performance.now();
    var lastSpawn = 0;

    function getState() {
      var srv = parseInt(srvSlider.value);
      var rps = parseInt(rpsSlider.value);
      var cap = srv * 600;
      var load = rps / cap;
      var lat  = load < 0.6 ? 10 + load * 20 : load < 0.9 ? 50 + (load-0.6)/0.3*200 : 500 + (load-0.9)/0.1*2000;
      var err  = load < 0.7 ? 0 : load < 0.95 ? (load-0.7)/0.25*5 : 5 + (load-0.95)/0.05*45;
      var tput = load <= 1 ? rps : Math.round(cap * 0.9);
      return { srv: srv, rps: rps, load: load, lat: Math.round(lat), err: err.toFixed(1), tput: tput };
    }

    function color(load) {
      if (load < 0.6) return '#10B981';
      if (load < 0.85) return '#F59E0B';
      return '#EF4444';
    }

    function updateStats() {
      var s = getState();
      srvVal.textContent = s.srv;
      rpsVal.textContent = s.rps;
      latEl.textContent  = s.lat + 'ms';
      latEl.className    = 'ds-val ' + (s.load < 0.6 ? 'green' : s.load < 0.85 ? 'amber' : 'red');
      errEl.textContent  = s.err + '%';
      errEl.className    = 'ds-val ' + (parseFloat(s.err) < 0.5 ? 'green' : parseFloat(s.err) < 5 ? 'amber' : 'red');
      tputEl.textContent = s.tput + ' rps';
      tputEl.className   = 'ds-val ' + (s.load <= 1 ? 'green' : 'amber');
    }

    srvSlider.addEventListener('input', updateStats);
    rpsSlider.addEventListener('input', updateStats);
    updateStats();

    function tick(now) {
      var s = getState();
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(5,3,14,0.96)';
      ctx.fillRect(0, 0, W, H);

      /* Build server positions */
      var N = s.srv;
      var sW = Math.min(72, (W - 40) / N - 12);
      var sH = 48;
      var totalW = N * (sW + 10) - 10;
      var sx0 = (W - totalW) / 2;
      var sy = H / 2 - sH / 2;
      servers = [];
      for (var i = 0; i < N; i++) {
        servers.push({ x: sx0 + i * (sW + 10), y: sy, w: sW, h: sH });
      }

      /* Load balancer */
      var lbW = 90, lbH = 38, lbX = W/2 - lbW/2, lbY = 28;
      drawNode(ctx, lbX, lbY, lbW, lbH, 'LOAD BALANCER', null, '#7C3AED', 1, 0.2);

      /* Arrows LB → servers */
      for (var i = 0; i < N; i++) {
        var sx = servers[i].x + servers[i].w / 2;
        drawArrow(ctx, lbX + lbW/2, lbY + lbH, sx, sy, 'rgba(124,58,237,0.5)', 1, false);
      }

      /* Servers */
      for (var i = 0; i < N; i++) {
        var sv = servers[i];
        var perServerLoad = clamp(s.rps / (N * 600), 0, 1.4);
        var c = color(perServerLoad);
        var glow = perServerLoad > 0.85 ? (perServerLoad - 0.85) / 0.5 * 0.8 : 0;

        /* Fill bar inside server */
        drawNode(ctx, sv.x, sv.y, sv.w, sv.h, 'SRV ' + (i+1), null, c, 1, glow);

        /* Load fill */
        var fH = Math.min(sv.h - 4, (sv.h - 4) * Math.min(perServerLoad, 1));
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = c;
        rrect(ctx, sv.x + 2, sv.y + sv.h - 2 - fH, sv.w - 4, fH, 3);
        ctx.fill();
        ctx.restore();
      }

      /* Spawn packets */
      var spawnInterval = Math.max(30, 1000 / (s.rps / 8));
      if (now - lastSpawn > spawnInterval && servers.length) {
        var tgt = servers[Math.floor(Math.random() * servers.length)];
        packets.push({
          x: lbX + lbW/2, y: lbY + lbH,
          tx: tgt.x + tgt.w/2, ty: tgt.y,
          t: 0, color: s.load > 0.9 && Math.random() < 0.3 ? '#EF4444' : '#7C3AED'
        });
        lastSpawn = now;
      }

      /* Draw packets */
      for (var i = packets.length - 1; i >= 0; i--) {
        var p = packets[i];
        p.t = Math.min(1, p.t + 0.04);
        var ex = ease(p.t);
        drawPacket(ctx, lerp(p.x, p.tx, ex), lerp(p.y, p.ty, ex), p.color, 1 - Math.abs(p.t - 0.5) * 0.3);
        if (p.t >= 1) packets.splice(i, 1);
      }

      /* Status text */
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(148,144,180,0.7)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText('CAPACITY: ' + N * 600 + ' rps  |  LOAD: ' + Math.round(s.load * 100) + '%', 8, H - 6);

      raf(tick);
    }
    raf(tick);
  }

  /* ── DEMO 2: Load Balancer (Topic 05) ────────────────────── */
  function initLoadBalancerDemo() {
    var wrap = document.getElementById('demo-lb');
    if (!wrap) return;

    var html = '<div class="demo-shell">' +
      '<div class="demo-header"><span class="demo-label">INTERACTIVE DEMO</span>' +
      '<span class="demo-title">Load Balancing Algorithms</span></div>' +
      '<canvas id="demo-lb-canvas" class="demo-canvas" style="height:280px"></canvas>' +
      '<div class="demo-controls">' +
        '<div class="demo-ctrl">' +
          '<label class="ctrl-label">Algorithm</label>' +
          '<select id="lb-algo" class="ctrl-select">' +
            '<option value="rr">Round Robin</option>' +
            '<option value="lc">Least Connections</option>' +
            '<option value="rand">Random</option>' +
            '<option value="weighted">Weighted</option>' +
          '</select>' +
        '</div>' +
        '<div class="demo-ctrl">' +
          '<button id="lb-send" class="demo-btn">Send Request</button>' +
          '<button id="lb-burst" class="demo-btn accent">Send 10</button>' +
          '<button id="lb-reset" class="demo-btn muted">Reset</button>' +
        '</div>' +
        '<div class="demo-stats">' +
          '<div class="demo-stat"><span class="ds-label">Server A</span><span id="lb-cnt-a" class="ds-val purple">0 req</span></div>' +
          '<div class="demo-stat"><span class="ds-label">Server B</span><span id="lb-cnt-b" class="ds-val purple">0 req</span></div>' +
          '<div class="demo-stat"><span class="ds-label">Server C</span><span id="lb-cnt-c" class="ds-val purple">0 req</span></div>' +
        '</div>' +
      '</div>' +
    '</div>';
    wrap.innerHTML = html;

    var canvas = document.getElementById('demo-lb-canvas');
    var sd = setupHiDPI(canvas);
    var ctx = sd.ctx, W = sd.w, H = sd.h;

    var algo    = document.getElementById('lb-algo');
    var sendBtn = document.getElementById('lb-send');
    var burstBtn= document.getElementById('lb-burst');
    var resetBtn= document.getElementById('lb-reset');
    var cntEls  = [
      document.getElementById('lb-cnt-a'),
      document.getElementById('lb-cnt-b'),
      document.getElementById('lb-cnt-c')
    ];

    var srvColors = ['#7C3AED','#10B981','#F59E0B'];
    var srvLabels = ['SERVER A','SERVER B','SERVER C'];
    var weights   = [3, 1, 2];
    var counts    = [0, 0, 0];
    var conns     = [0, 0, 0];
    var rrIdx     = 0;
    var packets   = [];
    var flashes   = [0, 0, 0];

    /* Server layout */
    var srvW = 80, srvH = 50;
    var lbW = 100, lbH = 40;
    var lbX, lbY, srvs;

    function layout() {
      W = canvas.offsetWidth || 600;
      H = canvas.offsetHeight || 280;
      lbX = W / 2 - lbW / 2;
      lbY = 32;
      var gap = (W - 3 * srvW) / 4;
      srvs = [0,1,2].map(function(i){ return { x: gap + i * (srvW + gap), y: H - srvH - 30 }; });
    }
    layout();

    function pick() {
      var a = algo.value;
      if (a === 'rr') {
        var idx = rrIdx % 3; rrIdx++; return idx;
      }
      if (a === 'lc') {
        var min = Math.min.apply(null, conns);
        return conns.indexOf(min);
      }
      if (a === 'rand') {
        return Math.floor(Math.random() * 3);
      }
      if (a === 'weighted') {
        var total = weights[0]+weights[1]+weights[2];
        var r = Math.random() * total;
        return r < weights[0] ? 0 : r < weights[0]+weights[1] ? 1 : 2;
      }
      return 0;
    }

    function sendReq() {
      if (!srvs) return;
      var idx = pick();
      counts[idx]++;
      conns[idx]++;
      setTimeout(function(){ conns[idx] = Math.max(0, conns[idx]-1); }, 800);
      var s = srvs[idx];
      packets.push({
        x: lbX + lbW/2, y: lbY + lbH,
        tx: s.x + srvW/2, ty: s.y,
        t: 0, idx: idx
      });
      flashes[idx] = 1;
      setTimeout(function(){ flashes[idx] = 0; }, 300);
      cntEls[idx].textContent = counts[idx] + ' req';
    }

    sendBtn.addEventListener('click', sendReq);
    burstBtn.addEventListener('click', function(){
      for(var i=0;i<10;i++) setTimeout(sendReq, i*60);
    });
    resetBtn.addEventListener('click', function(){
      counts = [0,0,0]; conns = [0,0,0]; rrIdx = 0;
      cntEls.forEach(function(el,i){ el.textContent='0 req'; });
      packets = [];
    });

    function tick() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(5,3,14,0.96)';
      ctx.fillRect(0, 0, W, H);

      if (!srvs) { raf(tick); return; }

      /* LB node */
      drawNode(ctx, lbX, lbY, lbW, lbH, 'LOAD BALANCER', algo.options[algo.selectedIndex].text.toUpperCase(), '#7C3AED', 1, 0.15);

      /* Arrows */
      for (var i = 0; i < 3; i++) {
        var s = srvs[i];
        drawArrow(ctx, lbX + lbW/2, lbY + lbH, s.x + srvW/2, s.y, srvColors[i], 0.4, false);
      }

      /* Servers */
      for (var i = 0; i < 3; i++) {
        var s = srvs[i];
        var glow = flashes[i] * 0.8;
        var maxCnt = Math.max.apply(null, counts) || 1;
        drawNode(ctx, s.x, s.y, srvW, srvH, srvLabels[i], counts[i]+' req', srvColors[i], 1, glow);

        /* Load bar */
        var frac = counts[i] / maxCnt;
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = srvColors[i];
        rrect(ctx, s.x + 2, s.y + srvH - 2 - (srvH-4)*frac, srvW - 4, (srvH-4)*frac, 3);
        ctx.fill();
        ctx.restore();

        /* Weighted label */
        if (algo.value === 'weighted') {
          ctx.font = '9px "JetBrains Mono",monospace';
          ctx.fillStyle = 'rgba(148,144,180,0.7)';
          ctx.textAlign = 'center';
          ctx.fillText('weight: ' + weights[i], s.x + srvW/2, s.y + srvH + 14);
        }
      }

      /* Packets */
      for (var i = packets.length - 1; i >= 0; i--) {
        var p = packets[i];
        p.t = Math.min(1, p.t + 0.045);
        var ex = ease(p.t);
        drawPacket(ctx, lerp(p.x, p.tx, ex), lerp(p.y, p.ty, ex), srvColors[p.idx], 1 - p.t * 0.5);
        if (p.t >= 1) packets.splice(i, 1);
      }

      raf(tick);
    }
    raf(tick);
  }

  /* ── DEMO 3: Cache Simulator (Topic 06) ──────────────────── */
  function initCacheDemo() {
    var wrap = document.getElementById('demo-cache');
    if (!wrap) return;

    var CACHE_SIZE = 6;
    var cache = []; /* { key, ts } */
    var hits = 0, misses = 0;
    var lastReq = null, lastResult = null, resultTimer = 0;

    var URLS = [
      '/user/42', '/user/7', '/product/101', '/product/42',
      '/post/9', '/post/7', '/user/42', '/product/101',
      '/home', '/search?q=redis', '/user/42', '/post/9'
    ];

    var html = '<div class="demo-shell">' +
      '<div class="demo-header"><span class="demo-label">INTERACTIVE DEMO</span>' +
      '<span class="demo-title">Cache Hit / Miss Visualizer</span></div>' +
      '<canvas id="demo-cache-canvas" class="demo-canvas" style="height:240px"></canvas>' +
      '<div class="demo-controls">' +
        '<div class="demo-ctrl" style="flex-direction:row;flex-wrap:wrap;gap:8px">' +
          URLS.slice(0,8).map(function(u){
            return '<button class="demo-btn cache-req-btn" data-key="'+u+'">GET '+u+'</button>';
          }).join('') +
        '</div>' +
        '<div class="demo-stats">' +
          '<div class="demo-stat"><span class="ds-label">Cache Hits</span><span id="cache-hits" class="ds-val green">0</span></div>' +
          '<div class="demo-stat"><span class="ds-label">Cache Misses</span><span id="cache-misses" class="ds-val red">0</span></div>' +
          '<div class="demo-stat"><span class="ds-label">Hit Rate</span><span id="cache-rate" class="ds-val purple">—</span></div>' +
          '<div class="demo-stat"><span class="ds-label">Last Latency</span><span id="cache-lat" class="ds-val green">—</span></div>' +
        '</div>' +
      '</div>' +
    '</div>';
    wrap.innerHTML = html;

    var canvas = document.getElementById('demo-cache-canvas');
    var sd = setupHiDPI(canvas);
    var ctx = sd.ctx, W = sd.w, H = sd.h;

    document.querySelectorAll('.cache-req-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        var key = btn.getAttribute('data-key');
        var idx = cache.findIndex(function(c){ return c.key === key; });
        if (idx >= 0) {
          hits++;
          lastResult = 'HIT';
          document.getElementById('cache-lat').textContent = '2ms';
          document.getElementById('cache-lat').className = 'ds-val green';
          /* Move to front (LRU) */
          var item = cache.splice(idx, 1)[0];
          cache.unshift(item);
        } else {
          misses++;
          lastResult = 'MISS';
          document.getElementById('cache-lat').textContent = '85ms';
          document.getElementById('cache-lat').className = 'ds-val amber';
          cache.unshift({ key: key, ts: Date.now() });
          if (cache.length > CACHE_SIZE) cache.pop();
        }
        lastReq = key;
        resultTimer = 60;
        var total = hits + misses;
        document.getElementById('cache-hits').textContent = hits;
        document.getElementById('cache-misses').textContent = misses;
        document.getElementById('cache-rate').textContent = Math.round(hits/total*100) + '%';
        document.getElementById('cache-rate').className = 'ds-val ' + (hits/total > 0.7 ? 'green' : hits/total > 0.4 ? 'amber' : 'red');
      });
    });

    function tick() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(5,3,14,0.96)';
      ctx.fillRect(0, 0, W, H);

      /* Title labels */
      var colW = W / 3;
      var titles = ['L1 CACHE', 'DB (slow path)', 'EVICTION'];
      var tColors = ['#10B981', '#7C3AED', '#EF4444'];
      titles.forEach(function(title, i){
        ctx.font = '9px "JetBrains Mono",monospace';
        ctx.fillStyle = tColors[i];
        ctx.textAlign = 'center';
        ctx.fillText(title, colW * i + colW/2, 18);
      });

      /* Cache slots */
      var slotH = 30, slotW = colW - 24, slotX = 12, slotY = 30;
      for (var i = 0; i < CACHE_SIZE; i++) {
        var item = cache[i];
        var isLast = i === CACHE_SIZE - 1;
        var filled = !!item;
        var isActive = filled && item.key === lastReq && resultTimer > 0;
        var color = isActive ? (lastResult === 'HIT' ? '#10B981' : '#F59E0B') : (filled ? '#7C3AED' : 'rgba(124,58,237,0.15)');

        rrect(ctx, slotX, slotY + i * (slotH + 4), slotW, slotH - 2, 4);
        ctx.fillStyle = filled ? 'rgba(124,58,237,0.12)' : 'rgba(124,58,237,0.04)';
        ctx.fill();
        ctx.strokeStyle = isActive ? color : (filled ? 'rgba(124,58,237,0.4)' : 'rgba(124,58,237,0.15)');
        ctx.lineWidth = isActive ? 2 : 1;
        ctx.stroke();

        if (filled) {
          ctx.font = (isActive ? 'bold ' : '') + '10px "JetBrains Mono",monospace';
          ctx.fillStyle = isActive ? color : 'rgba(237,233,254,0.8)';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(item.key, slotX + 8, slotY + i*(slotH+4) + slotH/2 - 1);
        } else {
          ctx.font = '9px "JetBrains Mono",monospace';
          ctx.fillStyle = 'rgba(92,87,122,0.6)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('empty', slotX + slotW/2, slotY + i*(slotH+4) + slotH/2 - 1);
        }

        /* LRU position label */
        ctx.font = '8px "JetBrains Mono",monospace';
        ctx.fillStyle = 'rgba(92,87,122,0.5)';
        ctx.textAlign = 'right';
        ctx.fillText(i===0 ? 'MRU' : i===CACHE_SIZE-1 ? 'LRU' : '', slotX+slotW-4, slotY+i*(slotH+4)+slotH/2-1);
      }

      /* DB box */
      var dbX = colW + 8, dbY = 30, dbW = colW - 16, dbH = 120;
      drawNode(ctx, dbX, dbY, dbW, dbH, 'DATABASE', 'PostgreSQL', '#3B82F6', 1, lastResult==='MISS' && resultTimer>0 ? 0.5 : 0.05);
      ctx.font = '9px "JetBrains Mono",monospace';
      ctx.fillStyle = 'rgba(148,144,180,0.6)';
      ctx.textAlign = 'center';
      ctx.fillText('~85ms avg', dbX + dbW/2, dbY + dbH + 14);

      /* Eviction zone (last slot indicator) */
      var evX = colW * 2 + 8, evY = 30, evW = colW - 16;
      rrect(ctx, evX, evY, evW, 80, 6);
      ctx.fillStyle = 'rgba(239,68,68,0.06)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(239,68,68,0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.font = '9px "JetBrains Mono",monospace';
      ctx.fillStyle = 'rgba(239,68,68,0.7)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('LRU slot evicted', evX+evW/2, evY+25);
      ctx.fillText('when cache full', evX+evW/2, evY+45);
      ctx.fillStyle = 'rgba(92,87,122,0.5)';
      ctx.fillText('size: ' + CACHE_SIZE + ' entries', evX+evW/2, evY+65);

      /* Hit/miss flash banner */
      if (resultTimer > 0) {
        var flashAlpha = Math.min(1, resultTimer / 20) * 0.92;
        ctx.save();
        ctx.globalAlpha = flashAlpha;
        var bColor = lastResult === 'HIT' ? '#10B981' : '#F59E0B';
        ctx.fillStyle = 'rgba(5,3,14,0.9)';
        ctx.strokeStyle = bColor;
        ctx.lineWidth = 2;
        rrect(ctx, W/2-70, H-52, 140, 34, 6);
        ctx.fill(); ctx.stroke();
        ctx.font = 'bold 14px "JetBrains Mono",monospace';
        ctx.fillStyle = bColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(lastResult + (lastResult==='HIT' ? ' ⚡ 2ms' : '  DB 85ms'), W/2, H-35);
        ctx.restore();
        resultTimer--;
      }

      raf(tick);
    }
    raf(tick);
  }

  /* ── DEMO 4: DB Replication (Topic 07) ───────────────────── */
  function initReplicationDemo() {
    var wrap = document.getElementById('demo-replication');
    if (!wrap) return;

    var replMode = 'async';
    var lagMs    = 150;
    var writes   = [];
    var replQueue= [];
    var log      = [];

    var html = '<div class="demo-shell">' +
      '<div class="demo-header"><span class="demo-label">INTERACTIVE DEMO</span>' +
      '<span class="demo-title">Database Replication Visualizer</span></div>' +
      '<canvas id="demo-repl-canvas" class="demo-canvas" style="height:240px"></canvas>' +
      '<div class="demo-controls">' +
        '<div class="demo-ctrl">' +
          '<label class="ctrl-label">Replication Mode</label>' +
          '<select id="repl-mode" class="ctrl-select">' +
            '<option value="async">Async (fast writes, lag risk)</option>' +
            '<option value="sync">Sync (safe, slower writes)</option>' +
            '<option value="semisync">Semi-sync (one ack)</option>' +
          '</select>' +
        '</div>' +
        '<div class="demo-ctrl">' +
          '<label class="ctrl-label">Network Lag <span id="repl-lag-val" class="ctrl-val">150ms</span></label>' +
          '<input type="range" id="repl-lag" min="10" max="800" value="150" class="ctrl-slider">' +
        '</div>' +
        '<div class="demo-ctrl">' +
          '<button id="repl-write" class="demo-btn accent">Write to Primary</button>' +
          '<button id="repl-burst" class="demo-btn">5 Writes</button>' +
          '<button id="repl-fail" class="demo-btn red">Simulate Failover</button>' +
        '</div>' +
        '<div class="demo-stats">' +
          '<div class="demo-stat"><span class="ds-label">Primary Writes</span><span id="repl-pw" class="ds-val green">0</span></div>' +
          '<div class="demo-stat"><span class="ds-label">Replica 1</span><span id="repl-r1" class="ds-val purple">0</span></div>' +
          '<div class="demo-stat"><span class="ds-label">Replica 2</span><span id="repl-r2" class="ds-val purple">0</span></div>' +
          '<div class="demo-stat"><span class="ds-label">Lag</span><span id="repl-lag-stat" class="ds-val green">0ms</span></div>' +
        '</div>' +
      '</div>' +
    '</div>';
    wrap.innerHTML = html;

    var canvas = document.getElementById('demo-repl-canvas');
    var sd = setupHiDPI(canvas);
    var ctx = sd.ctx, W = sd.w, H = sd.h;

    var modeEl   = document.getElementById('repl-mode');
    var lagSlider= document.getElementById('repl-lag');
    var lagValEl = document.getElementById('repl-lag-val');
    var pwEl     = document.getElementById('repl-pw');
    var r1El     = document.getElementById('repl-r1');
    var r2El     = document.getElementById('repl-r2');
    var lagStatEl= document.getElementById('repl-lag-stat');

    var primaryWrites = 0, r1Writes = 0, r2Writes = 0;
    var flashes = { p:0, r1:0, r2:0 };
    var failover = false;
    var pkts = [];

    lagSlider.addEventListener('input', function(){
      lagMs = parseInt(lagSlider.value);
      lagValEl.textContent = lagMs + 'ms';
      lagStatEl.textContent = modeEl.value === 'sync' ? '0ms (sync)' : lagMs + 'ms';
    });
    modeEl.addEventListener('change', function(){
      lagStatEl.textContent = modeEl.value==='sync' ? '0ms (sync)' : lagMs+'ms';
      lagStatEl.className   = 'ds-val ' + (modeEl.value==='sync' ? 'green' : lagMs<100?'green':lagMs<400?'amber':'red');
    });

    function doWrite() {
      if (failover) return;
      primaryWrites++;
      pwEl.textContent = primaryWrites;
      flashes.p = 40;
      var delay1 = modeEl.value==='sync' ? 0 : lagMs;
      var delay2 = modeEl.value==='sync' ? 0 : lagMs + Math.round(Math.random()*60);

      var W2 = canvas.offsetWidth || W, H2 = canvas.offsetHeight || H;
      var pX = W2*0.2, pY = H2/2-20;
      var r1X= W2*0.65, r1Y=H2/2-55;
      var r2X= W2*0.65, r2Y=H2/2+15;
      pkts.push({ x:pX+48, y:pY+20, tx:r1X, ty:r1Y+20, t:0, target:'r1', delay:delay1, elapsed:0 });
      pkts.push({ x:pX+48, y:pY+20, tx:r2X, ty:r2Y+20, t:0, target:'r2', delay:delay2, elapsed:0 });

      if (modeEl.value!=='sync') {
        setTimeout(function(){ r1Writes++; r1El.textContent=r1Writes; flashes.r1=30; }, delay1+200);
        setTimeout(function(){ r2Writes++; r2El.textContent=r2Writes; flashes.r2=30; }, delay2+200);
      } else {
        r1Writes++; r1El.textContent=r1Writes;
        r2Writes++; r2El.textContent=r2Writes;
        flashes.r1=30; flashes.r2=30;
      }
    }

    document.getElementById('repl-write').addEventListener('click', doWrite);
    document.getElementById('repl-burst').addEventListener('click', function(){
      for(var i=0;i<5;i++) setTimeout(doWrite, i*180);
    });
    document.getElementById('repl-fail').addEventListener('click', function(){
      failover = !failover;
      this.textContent = failover ? 'Recover Primary' : 'Simulate Failover';
      this.classList.toggle('active', failover);
    });

    function tick(now) {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(5,3,14,0.96)';
      ctx.fillRect(0, 0, W, H);

      var pW=96, pH=44;
      var pX=W*0.1, pY=H/2-pH/2;
      var r1X=W*0.58, r1Y=H/2-pH-12;
      var r2X=W*0.58, r2Y=H/2+12;
      var rW=96, rH=44;

      /* Primary */
      drawNode(ctx, pX, pY, pW, pH, failover?'PRIMARY (DOWN)':'PRIMARY', 'Read/Write', failover?'#EF4444':'#7C3AED', 1, flashes.p/40*0.7 + (failover?0.4:0));
      if (flashes.p>0) flashes.p--;

      /* Replicas */
      drawNode(ctx, r1X, r1Y, rW, rH, 'REPLICA 1', 'Read-only', '#10B981', 1, flashes.r1/30*0.6);
      drawNode(ctx, r2X, r2Y, rW, rH, 'REPLICA 2', 'Read-only', '#10B981', 1, flashes.r2/30*0.6);
      if (flashes.r1>0) flashes.r1--;
      if (flashes.r2>0) flashes.r2--;

      /* Connection lines */
      var lineColor = modeEl.value==='sync' ? 'rgba(16,185,129,0.5)' : 'rgba(124,58,237,0.4)';
      drawArrow(ctx, pX+pW, pY+pH/2, r1X, r1Y+rH/2, lineColor, 1, modeEl.value==='async');
      drawArrow(ctx, pX+pW, pY+pH/2, r2X, r2Y+rH/2, lineColor, 1, modeEl.value==='async');

      /* Mode badge */
      ctx.font = 'bold 10px "JetBrains Mono",monospace';
      var modeColor = modeEl.value==='sync'?'#10B981':modeEl.value==='semisync'?'#F59E0B':'#7C3AED';
      ctx.fillStyle = modeColor;
      ctx.textAlign = 'center';
      ctx.fillText(modeEl.value.toUpperCase() + ' REPLICATION', W/2, H - 14);

      /* Lag indicator */
      if (modeEl.value !== 'sync') {
        var lagColor = lagMs<100?'#10B981':lagMs<400?'#F59E0B':'#EF4444';
        ctx.font = '9px "JetBrains Mono",monospace';
        ctx.fillStyle = lagColor;
        ctx.fillText('lag: ' + lagMs + 'ms', r1X + rW + 10, r1Y + rH/2 + 2);
        ctx.fillText('lag: ' + (lagMs + 30) + 'ms', r2X + rW + 10, r2Y + rH/2 + 2);
      }

      /* Packets */
      for (var i = pkts.length-1; i>=0; i--) {
        var p = pkts[i];
        if (p.delay > 0) { p.delay -= 16; continue; }
        p.t = Math.min(1, p.t + 0.03);
        var ex = ease(p.t);
        drawPacket(ctx, lerp(p.x, p.tx, ex), lerp(p.y, p.ty, ex), '#A78BFA', 1-p.t*0.4);
        if (p.t >= 1) pkts.splice(i,1);
      }

      raf(tick);
    }
    raf(tick);
  }

  /* ── DEMO 5: Rate Limiter (Topic 11 / bonus) ─────────────── */
  function initRateLimiterDemo() {
    var wrap = document.getElementById('demo-ratelimit');
    if (!wrap) return;

    var WINDOW = 10; /* seconds */
    var limit  = 5;
    var requests = []; /* timestamps */
    var blocked  = 0;
    var allowed  = 0;
    var bucketTokens = 10;
    var mode = 'fixed';

    var html = '<div class="demo-shell">' +
      '<div class="demo-header"><span class="demo-label">INTERACTIVE DEMO</span>' +
      '<span class="demo-title">Rate Limiter Algorithms</span></div>' +
      '<canvas id="demo-rl-canvas" class="demo-canvas" style="height:220px"></canvas>' +
      '<div class="demo-controls">' +
        '<div class="demo-ctrl">' +
          '<label class="ctrl-label">Algorithm</label>' +
          '<select id="rl-algo" class="ctrl-select">' +
            '<option value="fixed">Fixed Window</option>' +
            '<option value="sliding">Sliding Window</option>' +
            '<option value="token">Token Bucket</option>' +
          '</select>' +
        '</div>' +
        '<div class="demo-ctrl">' +
          '<label class="ctrl-label">Limit <span id="rl-limit-val" class="ctrl-val">5/10s</span></label>' +
          '<input type="range" id="rl-limit" min="1" max="15" value="5" class="ctrl-slider">' +
        '</div>' +
        '<div class="demo-ctrl">' +
          '<button id="rl-req" class="demo-btn accent">Send Request</button>' +
          '<button id="rl-spam" class="demo-btn red">Spam 10x</button>' +
          '<button id="rl-reset" class="demo-btn muted">Reset</button>' +
        '</div>' +
        '<div class="demo-stats">' +
          '<div class="demo-stat"><span class="ds-label">Allowed</span><span id="rl-allowed" class="ds-val green">0</span></div>' +
          '<div class="demo-stat"><span class="ds-label">Blocked (429)</span><span id="rl-blocked" class="ds-val red">0</span></div>' +
          '<div class="demo-stat"><span class="ds-label">Window Used</span><span id="rl-used" class="ds-val purple">0 / 5</span></div>' +
        '</div>' +
      '</div>' +
    '</div>';
    wrap.innerHTML = html;

    var canvas = document.getElementById('demo-rl-canvas');
    var sd = setupHiDPI(canvas);
    var ctx = sd.ctx, W = sd.w, H = sd.h;

    var algoEl  = document.getElementById('rl-algo');
    var limEl   = document.getElementById('rl-limit');
    var limValEl= document.getElementById('rl-limit-val');
    var allowedEl= document.getElementById('rl-allowed');
    var blockedEl= document.getElementById('rl-blocked');
    var usedEl  = document.getElementById('rl-used');

    limEl.addEventListener('input', function(){
      limit = parseInt(limEl.value);
      limValEl.textContent = limit + '/10s';
      bucketTokens = Math.min(bucketTokens, limit * 2);
    });

    var flashes = []; /* { x,y,color,alpha,label } */
    var lastTokenRefill = Date.now();

    function isAllowed() {
      var now = Date.now();
      mode = algoEl.value;
      if (mode === 'fixed') {
        var windowStart = Math.floor(now / (WINDOW*1000)) * (WINDOW*1000);
        var count = requests.filter(function(t){ return t >= windowStart; }).length;
        return count < limit;
      }
      if (mode === 'sliding') {
        var count = requests.filter(function(t){ return t >= now - WINDOW*1000; }).length;
        return count < limit;
      }
      if (mode === 'token') {
        return bucketTokens >= 1;
      }
    }

    function sendReq() {
      var now = Date.now();
      var ok = isAllowed();
      if (ok) {
        requests.push(now);
        if (mode === 'token') bucketTokens = Math.max(0, bucketTokens - 1);
        allowed++;
        allowedEl.textContent = allowed;
        flashes.push({ t:1, color:'#10B981', label:'200 OK' });
      } else {
        blocked++;
        blockedEl.textContent = blocked;
        flashes.push({ t:1, color:'#EF4444', label:'429 TOO MANY' });
      }
    }

    document.getElementById('rl-req').addEventListener('click', sendReq);
    document.getElementById('rl-spam').addEventListener('click', function(){
      for(var i=0;i<10;i++) setTimeout(sendReq, i*80);
    });
    document.getElementById('rl-reset').addEventListener('click', function(){
      requests=[]; blocked=0; allowed=0; bucketTokens=limit*2;
      flashes=[];
      allowedEl.textContent='0'; blockedEl.textContent='0';
    });

    function tick() {
      var now = Date.now();
      mode = algoEl.value;

      /* Token refill */
      if (mode==='token') {
        var elapsed = (now - lastTokenRefill) / 1000;
        if (elapsed > 1) {
          bucketTokens = Math.min(limit*2, bucketTokens + Math.floor(elapsed * limit/WINDOW * 3));
          lastTokenRefill = now;
        }
      }

      /* Current usage */
      var windowStart = mode==='fixed' ? Math.floor(now/(WINDOW*1000))*(WINDOW*1000) : now - WINDOW*1000;
      var curCount = requests.filter(function(t){ return t >= windowStart; }).length;
      usedEl.textContent = (mode==='token' ? Math.floor(bucketTokens) : curCount) + ' / ' + limit;
      usedEl.className = 'ds-val ' + (curCount >= limit ? 'red' : curCount > limit*0.7 ? 'amber' : 'green');

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(5,3,14,0.96)';
      ctx.fillRect(0, 0, W, H);

      if (mode === 'token') {
        /* Token bucket visualization */
        var bW = 120, bH = 160, bX = W/2-bW/2, bY = H/2-bH/2 - 10;
        ctx.strokeStyle = '#7C3AED'; ctx.lineWidth = 2;
        rrect(ctx, bX, bY, bW, bH, 6); ctx.stroke();
        ctx.fillStyle = 'rgba(124,58,237,0.06)'; ctx.fill();

        var maxTokens = limit * 2;
        var frac = bucketTokens / maxTokens;
        var fH = (bH - 6) * frac;
        ctx.fillStyle = 'rgba(124,58,237,0.35)';
        rrect(ctx, bX+3, bY+bH-3-fH, bW-6, fH, 3); ctx.fill();

        ctx.font = 'bold 22px "JetBrains Mono",monospace';
        ctx.fillStyle = '#A78BFA';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(Math.floor(bucketTokens), bX+bW/2, bY+bH/2);
        ctx.font = '10px "JetBrains Mono",monospace';
        ctx.fillStyle = 'rgba(148,144,180,0.7)';
        ctx.fillText('tokens', bX+bW/2, bY+bH/2+20);
        ctx.fillText('BUCKET', bX+bW/2, bY-14);

        /* Refill arrow */
        ctx.font = '9px "JetBrains Mono",monospace';
        ctx.fillStyle = '#10B981';
        ctx.fillText('+ ' + Math.round(limit/WINDOW*3) + '/s refill', bX+bW/2, bY+bH+18);

      } else {
        /* Timeline visualization */
        var tlX = 20, tlY = H/2 - 14, tlW = W - 40, tlH = 28;
        /* Window rect */
        ctx.fillStyle = 'rgba(124,58,237,0.08)';
        rrect(ctx, tlX, tlY, tlW, tlH, 4); ctx.fill();
        ctx.strokeStyle = 'rgba(124,58,237,0.3)'; ctx.lineWidth=1;
        ctx.stroke();

        /* Request dots on timeline */
        var visible = requests.filter(function(t){ return t >= windowStart; });
        visible.forEach(function(t){
          var frac = (t - windowStart) / (WINDOW * 1000);
          var x = tlX + frac * tlW;
          ctx.fillStyle = '#A78BFA';
          ctx.beginPath(); ctx.arc(x, tlY + tlH/2, 4, 0, Math.PI*2); ctx.fill();
        });

        /* Limit line */
        var limitX = tlX + (limit/limit)*tlW;
        ctx.strokeStyle = curCount>=limit ? '#EF4444' : '#10B981';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4,4]);
        ctx.beginPath(); ctx.moveTo(tlX, tlY-16); ctx.lineTo(tlX+tlW, tlY-16); ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = '9px "JetBrains Mono",monospace';
        ctx.fillStyle = curCount>=limit ? '#EF4444' : '#10B981';
        ctx.textAlign = 'right';
        ctx.fillText('LIMIT: '+limit, tlX+tlW, tlY-20);

        ctx.font = '9px "JetBrains Mono",monospace';
        ctx.fillStyle = 'rgba(148,144,180,0.6)';
        ctx.textAlign = 'left';
        ctx.fillText(mode==='fixed' ? 'FIXED WINDOW ('+WINDOW+'s)' : 'SLIDING WINDOW ('+WINDOW+'s)', tlX, tlY+tlH+16);

        /* Count */
        ctx.font = 'bold 28px "JetBrains Mono",monospace';
        ctx.fillStyle = curCount>=limit ? '#EF4444' : '#A78BFA';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(curCount + ' / ' + limit, W/2, H/2 - 70);
        ctx.font = '9px "JetBrains Mono",monospace';
        ctx.fillStyle = 'rgba(148,144,180,0.55)';
        ctx.fillText('requests in window', W/2, H/2 - 44);
      }

      /* Flash messages */
      for (var i=flashes.length-1;i>=0;i--) {
        var f = flashes[i];
        f.t = Math.max(0, f.t - 0.025);
        ctx.save();
        ctx.globalAlpha = f.t;
        ctx.font = 'bold 13px "JetBrains Mono",monospace';
        ctx.fillStyle = f.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(f.label, W/2, H - 28);
        ctx.restore();
        if (f.t <= 0) flashes.splice(i,1);
      }

      raf(tick);
    }
    raf(tick);
  }

  /* ── Bootstrap all demos ────────────────────────────────── */
  function init() {
    initScaleSimulator();
    initLoadBalancerDemo();
    initCacheDemo();
    initReplicationDemo();
    initRateLimiterDemo();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
