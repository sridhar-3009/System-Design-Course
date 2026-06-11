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

  /* ============================================================
     CAP Theorem Demo — #demo-cap
     ============================================================ */
  function initCAPDemo() {
    var wrap = document.getElementById('demo-cap');
    if (!wrap) return;
    wrap.innerHTML =
      '<div class="demo-shell">' +
        '<div class="demo-header"><span class="demo-label">INTERACTIVE DEMO</span>' +
        '<span class="demo-title">CAP Theorem: Partition Simulator</span></div>' +
        '<canvas id="demo-cap-canvas" class="demo-canvas" style="height:260px"></canvas>' +
        '<div class="demo-controls">' +
          '<div class="demo-ctrl">' +
            '<span class="ctrl-label">When partitioned, prioritise:</span>' +
            '<select id="cap-mode" class="ctrl-select">' +
              '<option value="cp">Consistency (CP) — reject stale reads</option>' +
              '<option value="ap">Availability (AP) — return stale data</option>' +
            '</select>' +
          '</div>' +
          '<div class="demo-ctrl" style="gap:8px">' +
            '<button id="cap-write" class="demo-btn accent">Write "v2"</button>' +
            '<button id="cap-read" class="demo-btn">Read</button>' +
            '<button id="cap-partition" class="demo-btn red">✂ Trigger Partition</button>' +
            '<button id="cap-heal" class="demo-btn" style="display:none">↺ Heal Network</button>' +
          '</div>' +
          '<div class="demo-stats">' +
            '<div class="demo-stat"><span class="ds-label">Writes</span><span id="cap-writes" class="ds-val green">0</span></div>' +
            '<div class="demo-stat"><span class="ds-label">Reads OK</span><span id="cap-reads-ok" class="ds-val green">0</span></div>' +
            '<div class="demo-stat"><span class="ds-label">Errors / Stale</span><span id="cap-errors" class="ds-val red">0</span></div>' +
            '<div class="demo-stat"><span class="ds-label">State</span><span id="cap-state" class="ds-val purple">Healthy</span></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    var canvas = document.getElementById('demo-cap-canvas');
    var sd = setupHiDPI(canvas); var ctx = sd.ctx, W = sd.w, H = sd.h;

    var partitioned = false, version = 1, staleReplicas = false;
    var writes = 0, readsOk = 0, errors = 0;
    var pkts = [], flashes = [];
    var modeEl = document.getElementById('cap-mode');
    var stateEl = document.getElementById('cap-state');

    function updateStats() {
      document.getElementById('cap-writes').textContent = writes;
      document.getElementById('cap-reads-ok').textContent = readsOk;
      document.getElementById('cap-errors').textContent = errors;
    }

    document.getElementById('cap-write').addEventListener('click', function() {
      version++; writes++; updateStats(); staleReplicas = partitioned;
      flashes.push({ label: 'WRITE v' + version, color: '#34D399', t: 60 });
      /* packet: client → node A */
      var cX=W*0.12, cY=H/2, n1X=W*0.38, n1Y=H*0.28;
      pkts.push({ x:cX+20, y:cY, tx:n1X, ty:n1Y+22, t:0, color:'#34D399', label:'write' });
      if (!partitioned) pkts.push({ x:n1X, y:n1Y+22, tx:W*0.62, ty:H*0.28+22, t:0, color:'#34D399', label:'sync' });
    });

    document.getElementById('cap-read').addEventListener('click', function() {
      var cp = modeEl.value === 'cp';
      if (partitioned && staleReplicas) {
        if (cp) { errors++; flashes.push({ label: 'ERROR: Consistency > Availability', color: '#F87171', t: 80 }); }
        else     { readsOk++; flashes.push({ label: 'STALE READ v'+(version-1)+' returned', color: '#FCD34D', t: 80 }); }
      } else {
        readsOk++;
        flashes.push({ label: 'READ v' + version + ' OK', color: '#34D399', t: 60 });
      }
      updateStats();
      pkts.push({ x:W*0.12+20, y:H/2, tx:W*0.62, ty:H*0.72+22, t:0, color:'#A78BFA', label:'read' });
    });

    document.getElementById('cap-partition').addEventListener('click', function() {
      partitioned = true; staleReplicas = false;
      this.style.display = 'none';
      document.getElementById('cap-heal').style.display = '';
      stateEl.textContent = 'PARTITIONED'; stateEl.className = 'ds-val red';
      flashes.push({ label: '✂ Network partition!', color: '#F87171', t: 90 });
    });
    document.getElementById('cap-heal').addEventListener('click', function() {
      partitioned = false; staleReplicas = false;
      this.style.display = 'none';
      document.getElementById('cap-partition').style.display = '';
      stateEl.textContent = 'Healthy'; stateEl.className = 'ds-val green';
      flashes.push({ label: '↺ Network healed', color: '#34D399', t: 60 });
    });

    var nodes = [
      { id:'leader', label:'NODE A', sub:'Leader', x:0.38, y:0.28, color:'#7C3AED' },
      { id:'r1',     label:'NODE B', sub:'Replica', x:0.62, y:0.28, color:'#10B981' },
      { id:'r2',     label:'NODE C', sub:'Replica', x:0.62, y:0.68, color:'#10B981' }
    ];
    var nW = 90, nH = 42;

    function tick() {
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle='rgba(5,3,14,0.96)'; ctx.fillRect(0,0,W,H);
      /* partition line */
      if (partitioned) {
        ctx.save(); ctx.strokeStyle='rgba(239,68,68,0.5)'; ctx.lineWidth=2;
        ctx.setLineDash([8,5]); ctx.beginPath();
        ctx.moveTo(W*0.54, H*0.05); ctx.lineTo(W*0.54, H*0.95);
        ctx.stroke(); ctx.restore();
        ctx.save(); ctx.font='bold 10px monospace'; ctx.fillStyle='rgba(239,68,68,0.7)'; ctx.textAlign='center';
        ctx.fillText('PARTITION', W*0.54, H*0.05+10); ctx.restore();
      }
      /* edges */
      nodes.forEach(function(a,ai) {
        nodes.forEach(function(b,bi) {
          if (bi<=ai) return;
          var cutA = partitioned && ((a.x < 0.54 && b.x >= 0.54) || (a.x >= 0.54 && b.x < 0.54));
          ctx.save(); ctx.beginPath();
          ctx.moveTo(a.x*W + nW/2, a.y*H + nH/2);
          ctx.lineTo(b.x*W + nW/2, b.y*H + nH/2);
          ctx.strokeStyle = cutA ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.12)';
          ctx.lineWidth = cutA ? 1 : 1.5;
          if (cutA) ctx.setLineDash([4,4]);
          ctx.stroke(); ctx.restore();
        });
      });
      /* nodes */
      nodes.forEach(function(n) {
        var stale = n.id !== 'leader' && partitioned && staleReplicas;
        drawNode(ctx, n.x*W, n.y*H, nW, nH, n.label, stale ? 'STALE v'+(version-1) : n.sub + ' v'+version, stale ? '#F59E0B' : n.color, 1, 0);
      });
      /* client */
      ctx.save(); rrect(ctx, W*0.03, H/2-21, 60, 42, 6); ctx.strokeStyle='rgba(139,92,246,0.6)'; ctx.lineWidth=1.5; ctx.stroke();
      ctx.fillStyle='rgba(124,58,237,0.12)'; ctx.fill();
      ctx.fillStyle='#C4B5FD'; ctx.font='bold 9px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('CLIENT', W*0.03+30, H/2); ctx.restore();
      /* version badge */
      ctx.save(); ctx.fillStyle='rgba(52,211,153,0.15)'; ctx.strokeStyle='rgba(52,211,153,0.35)'; ctx.lineWidth=1;
      rrect(ctx, W-70, 8, 60, 24, 12); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#34D399'; ctx.font='bold 10px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('ver = v'+version, W-40, 20); ctx.restore();
      /* packets */
      pkts = pkts.filter(function(p) {
        p.t = Math.min(1, p.t + 0.045);
        var ex=ease(p.t), x=lerp(p.x,p.tx,ex), y=lerp(p.y,p.ty,ex);
        ctx.save(); ctx.beginPath(); ctx.arc(x,y,5,0,Math.PI*2);
        ctx.fillStyle=p.color; ctx.shadowBlur=10; ctx.shadowColor=p.color; ctx.fill(); ctx.restore();
        return p.t < 1;
      });
      /* flashes */
      flashes.forEach(function(f,i) {
        ctx.save(); ctx.globalAlpha = Math.min(1, f.t/20);
        ctx.font='bold 13px monospace'; ctx.fillStyle=f.color; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(f.label, W/2, H-22); ctx.restore();
        f.t--;
      });
      flashes = flashes.filter(function(f){ return f.t > 0; });
      raf(tick);
    }
    raf(tick);
  }

  /* ============================================================
     Consistency Models Demo — #demo-consistency
     ============================================================ */
  function initConsistencyDemo() {
    var wrap = document.getElementById('demo-consistency');
    if (!wrap) return;
    wrap.innerHTML =
      '<div class="demo-shell">' +
        '<div class="demo-header"><span class="demo-label">INTERACTIVE DEMO</span>' +
        '<span class="demo-title">Consistency Models: Read Behaviour</span></div>' +
        '<canvas id="demo-cons-canvas" class="demo-canvas" style="height:240px"></canvas>' +
        '<div class="demo-controls">' +
          '<div class="demo-ctrl">' +
            '<span class="ctrl-label">Replication lag</span>' +
            '<input id="cons-lag" class="ctrl-slider" type="range" min="50" max="1200" value="300">' +
            '<span id="cons-lag-val" class="ctrl-val">300ms</span>' +
          '</div>' +
          '<div class="demo-ctrl">' +
            '<span class="ctrl-label">Model</span>' +
            '<select id="cons-mode" class="ctrl-select">' +
              '<option value="strong">Strong Consistency</option>' +
              '<option value="eventual" selected>Eventual Consistency</option>' +
              '<option value="read-your-writes">Read-Your-Writes</option>' +
            '</select>' +
          '</div>' +
          '<div class="demo-ctrl" style="gap:8px">' +
            '<button id="cons-write" class="demo-btn accent">Write "hello"</button>' +
            '<button id="cons-read" class="demo-btn">Read</button>' +
          '</div>' +
          '<div class="demo-stats">' +
            '<div class="demo-stat"><span class="ds-label">Lag</span><span id="cons-lag-stat" class="ds-val amber">300ms</span></div>' +
            '<div class="demo-stat"><span class="ds-label">Last Read</span><span id="cons-result" class="ds-val purple">—</span></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    var canvas = document.getElementById('demo-cons-canvas');
    var sd = setupHiDPI(canvas); var ctx = sd.ctx, W = sd.w, H = sd.h;

    var lagMs = 300, value = 'null', primaryVal = 'null', replicaVal = 'null';
    var pkts = [], flashes = [], replicaTimer = 0;
    var lagEl = document.getElementById('cons-lag');
    var lagValEl = document.getElementById('cons-lag-val');
    var modeEl = document.getElementById('cons-mode');

    lagEl.addEventListener('input', function(){
      lagMs = +lagEl.value;
      lagValEl.textContent = lagMs+'ms';
      document.getElementById('cons-lag-stat').textContent = lagMs+'ms';
      document.getElementById('cons-lag-stat').className = 'ds-val '+(lagMs<150?'green':lagMs<500?'amber':'red');
    });

    var nW = 104, nH = 44;
    /* layout: PRIMARY left-center, REPLICA right-center, CLIENT bottom-center */
    function px() { return W*0.08; }
    function rx() { return W*0.56; }
    function cxC() { return W*0.32; }

    document.getElementById('cons-write').addEventListener('click', function(){
      primaryVal = '"hello"'; value = '"hello"'; replicaTimer = lagMs;
      /* client → primary */
      pkts.push({ x:cxC()+nW/2, y:H*0.72, tx:px()+nW/2, ty:H*0.28+nH, t:0, color:'#34D399' });
    });
    document.getElementById('cons-read').addEventListener('click', function(){
      var mode = modeEl.value;
      var reading;
      if (mode === 'strong') {
        reading = primaryVal === '"hello"' ? '"hello" ✓ fresh' : 'null — blocked for sync';
      } else if (mode === 'eventual') {
        reading = replicaTimer > 0 ? 'null — still propagating' : replicaVal === primaryVal ? primaryVal : 'stale data';
      } else {
        reading = value;
      }
      document.getElementById('cons-result').textContent = reading;
      flashes.push({ label: 'READ → ' + reading, color: replicaTimer>0?'#FCD34D':'#34D399', t: 80 });
      /* client → replica (reads go to replica) */
      pkts.push({ x:cxC()+nW/2, y:H*0.72, tx:rx()+nW/2, ty:H*0.28+nH, t:0, color:'#A78BFA' });
    });

    var last = performance.now();
    function tick(now) {
      var dt = Math.min(60, now - last); last = now;
      if (replicaTimer > 0) {
        replicaTimer -= dt;
        if (replicaTimer <= 0) { replicaTimer = 0; replicaVal = primaryVal; }
      }
      ctx.clearRect(0,0,W,H); ctx.fillStyle='rgba(5,3,14,0.96)'; ctx.fillRect(0,0,W,H);

      /* connector lines */
      ctx.save(); ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=1; ctx.setLineDash([4,5]);
      /* primary → replica replication line */
      ctx.beginPath(); ctx.moveTo(px()+nW, H*0.28+nH/2); ctx.lineTo(rx(), H*0.28+nH/2);
      if (replicaTimer>0) ctx.strokeStyle='rgba(245,158,11,0.5)';
      ctx.stroke();
      /* client → primary */
      ctx.setLineDash([4,5]); ctx.strokeStyle='rgba(255,255,255,0.08)';
      ctx.beginPath(); ctx.moveTo(cxC()+nW/2, H*0.72); ctx.lineTo(px()+nW/2, H*0.28+nH); ctx.stroke();
      /* client → replica */
      ctx.beginPath(); ctx.moveTo(cxC()+nW/2, H*0.72); ctx.lineTo(rx()+nW/2, H*0.28+nH); ctx.stroke();
      ctx.restore();

      /* nodes */
      drawNode(ctx, px(), H*0.18, nW, nH, 'PRIMARY', 'v = '+primaryVal, '#7C3AED', 1, 0.15);
      drawNode(ctx, rx(), H*0.18, nW, nH, 'REPLICA', replicaTimer>0?'syncing…':('v = '+replicaVal), replicaTimer>0?'#F59E0B':'#10B981', 1, replicaTimer>0?0.4:0.05);

      /* replication arrow label */
      if (replicaTimer > 0) {
        var prog = 1 - replicaTimer/lagMs;
        var midX = px()+nW + (rx()-px()-nW)*prog;
        ctx.save(); ctx.beginPath(); ctx.arc(midX, H*0.18+nH/2, 5, 0, Math.PI*2);
        ctx.fillStyle='#F59E0B'; ctx.shadowBlur=8; ctx.shadowColor='#F59E0B'; ctx.fill(); ctx.restore();
        ctx.save(); ctx.fillStyle='rgba(245,158,11,0.7)'; ctx.font='9px monospace'; ctx.textAlign='center';
        ctx.fillText('replicating…', (px()+nW+rx())/2, H*0.18+nH+12); ctx.restore();
      }

      /* client */
      ctx.save(); rrect(ctx, cxC(), H*0.68, nW, nH, 6);
      ctx.strokeStyle='rgba(139,92,246,0.55)'; ctx.lineWidth=1.5; ctx.stroke();
      ctx.fillStyle='rgba(124,58,237,0.1)'; ctx.fill();
      ctx.fillStyle='#C4B5FD'; ctx.font='bold 9px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('CLIENT', cxC()+nW/2, H*0.68+nH/2); ctx.restore();

      pkts = pkts.filter(function(p){
        p.t = Math.min(1, p.t+0.05);
        var x=lerp(p.x,p.tx,ease(p.t)), y=lerp(p.y,p.ty,ease(p.t));
        ctx.save(); ctx.beginPath(); ctx.arc(x,y,5,0,Math.PI*2);
        ctx.fillStyle=p.color; ctx.shadowBlur=8; ctx.shadowColor=p.color; ctx.fill(); ctx.restore();
        return p.t<1;
      });
      flashes.forEach(function(f){ ctx.save(); ctx.globalAlpha=Math.min(1,f.t/20); ctx.font='bold 12px monospace'; ctx.fillStyle=f.color; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(f.label,W/2,H-20); ctx.restore(); f.t--; });
      flashes = flashes.filter(function(f){ return f.t>0; });
      raf(tick);
    }
    raf(tick);
  }

  /* ============================================================
     CDN Demo — #demo-cdn
     ============================================================ */
  function initCDNDemo() {
    var wrap = document.getElementById('demo-cdn');
    if (!wrap) return;
    wrap.innerHTML =
      '<div class="demo-shell">' +
        '<div class="demo-header"><span class="demo-label">INTERACTIVE DEMO</span>' +
        '<span class="demo-title">CDN: Edge Cache Routing</span></div>' +
        '<canvas id="demo-cdn-canvas" class="demo-canvas" style="height:260px"></canvas>' +
        '<div class="demo-controls">' +
          '<div class="demo-ctrl">' +
            '<span class="ctrl-label">User region</span>' +
            '<select id="cdn-region" class="ctrl-select">' +
              '<option value="0">US-West (San Francisco)</option>' +
              '<option value="1">US-East (New York)</option>' +
              '<option value="2">Europe (London)</option>' +
              '<option value="3">Asia (Singapore)</option>' +
              '<option value="4">South America (São Paulo)</option>' +
            '</select>' +
          '</div>' +
          '<div class="demo-ctrl" style="gap:8px">' +
            '<button id="cdn-fetch" class="demo-btn accent">Fetch /image.jpg</button>' +
            '<button id="cdn-purge" class="demo-btn red">Purge Cache</button>' +
          '</div>' +
          '<div class="demo-stats">' +
            '<div class="demo-stat"><span class="ds-label">Last latency</span><span id="cdn-lat" class="ds-val green">—</span></div>' +
            '<div class="demo-stat"><span class="ds-label">Served from</span><span id="cdn-from" class="ds-val purple">—</span></div>' +
            '<div class="demo-stat"><span class="ds-label">Edge hits</span><span id="cdn-hits" class="ds-val green">0</span></div>' +
            '<div class="demo-stat"><span class="ds-label">Origin fetches</span><span id="cdn-origin" class="ds-val amber">0</span></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    var canvas = document.getElementById('demo-cdn-canvas');
    var sd = setupHiDPI(canvas); var ctx = sd.ctx, W = sd.w, H = sd.h;

    var pops = [
      { label:'US-W', x:0.12, y:0.42, ms:18, cached:false, color:'#7C3AED' },
      { label:'US-E', x:0.28, y:0.28, ms:22, cached:false, color:'#7C3AED' },
      { label:'EU',   x:0.50, y:0.22, ms:35, cached:false, color:'#7C3AED' },
      { label:'ASIA', x:0.78, y:0.38, ms:28, cached:false, color:'#7C3AED' },
      { label:'BR',   x:0.30, y:0.70, ms:45, cached:false, color:'#7C3AED' }
    ];
    var origin = { x:0.50, y:0.55 };
    var pkts = [], flashes = [], edgeHits = 0, originFetches = 0;
    var regionEl = document.getElementById('cdn-region');

    document.getElementById('cdn-purge').addEventListener('click', function(){
      pops.forEach(function(p){ p.cached = false; });
      flashes.push({ label:'Cache purged — next request hits origin', color:'#F87171', t:80 });
    });

    document.getElementById('cdn-fetch').addEventListener('click', function(){
      var ri = +regionEl.value;
      var pop = pops[ri];
      if (pop.cached) {
        edgeHits++;
        document.getElementById('cdn-hits').textContent = edgeHits;
        document.getElementById('cdn-lat').textContent = pop.ms + 'ms';
        document.getElementById('cdn-lat').className = 'ds-val green';
        document.getElementById('cdn-from').textContent = pop.label + ' EDGE HIT';
        flashes.push({ label:'HIT at ' + pop.label + ' edge — ' + pop.ms + 'ms', color:'#34D399', t:80 });
        pkts.push({ x:W*(pop.x-0.06), y:H*pop.y, tx:W*(pop.x-0.06)-20, ty:H*pop.y-15, t:0, color:'#34D399' });
      } else {
        pop.cached = true;
        originFetches++;
        document.getElementById('cdn-origin').textContent = originFetches;
        var totalMs = pop.ms + 120;
        document.getElementById('cdn-lat').textContent = totalMs + 'ms';
        document.getElementById('cdn-lat').className = 'ds-val amber';
        document.getElementById('cdn-from').textContent = 'ORIGIN (miss at ' + pop.label + ')';
        flashes.push({ label:'MISS at ' + pop.label + ' — fetching origin (' + totalMs + 'ms)', color:'#FCD34D', t:90 });
        pkts.push({ x:W*pop.x+30, y:H*pop.y+18, tx:W*origin.x+30, ty:H*origin.y+18, t:0, color:'#F59E0B' });
        setTimeout(function(){
          pkts.push({ x:W*origin.x+30, y:H*origin.y+18, tx:W*pop.x+30, ty:H*pop.y+18, t:0, color:'#34D399' });
        }, 600);
      }
    });

    function tick() {
      ctx.clearRect(0,0,W,H); ctx.fillStyle='rgba(5,3,14,0.96)'; ctx.fillRect(0,0,W,H);
      /* lines from pops to origin */
      pops.forEach(function(p){
        ctx.save(); ctx.beginPath();
        ctx.moveTo(W*p.x+30, H*p.y+18);
        ctx.lineTo(W*origin.x+30, H*origin.y+18);
        ctx.strokeStyle='rgba(255,255,255,0.07)'; ctx.lineWidth=1;
        ctx.setLineDash([4,6]); ctx.stroke(); ctx.restore();
      });
      /* origin */
      drawNode(ctx, W*origin.x, H*origin.y, 70, 36, 'ORIGIN', 'server', '#EF4444', 1, 0.05);
      /* PoPs */
      var ri = +regionEl.value;
      pops.forEach(function(p, i){
        var active = i===ri;
        var col = p.cached ? '#10B981' : '#7C3AED';
        drawNode(ctx, W*p.x, H*p.y, 60, 36, p.label, p.cached?'CACHED':'EMPTY', col, 1, active?0.5:0.1);
      });
      pkts = pkts.filter(function(p){
        p.t = Math.min(1, p.t+0.04);
        var x=lerp(p.x,p.tx,ease(p.t)), y=lerp(p.y,p.ty,ease(p.t));
        ctx.save(); ctx.beginPath(); ctx.arc(x,y,5,0,Math.PI*2);
        ctx.fillStyle=p.color; ctx.shadowBlur=10; ctx.shadowColor=p.color; ctx.fill(); ctx.restore();
        return p.t<1;
      });
      flashes.forEach(function(f){ ctx.save(); ctx.globalAlpha=Math.min(1,f.t/20); ctx.font='bold 12px monospace'; ctx.fillStyle=f.color; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(f.label,W/2,H-20); ctx.restore(); f.t--; });
      flashes = flashes.filter(function(f){ return f.t>0; });
      raf(tick);
    }
    raf(tick);
  }

  /* ============================================================
     Message Queue Demo — #demo-queue
     ============================================================ */
  function initQueueDemo() {
    var wrap = document.getElementById('demo-queue');
    if (!wrap) return;
    wrap.innerHTML =
      '<div class="demo-shell">' +
        '<div class="demo-header"><span class="demo-label">INTERACTIVE DEMO</span>' +
        '<span class="demo-title">Message Queue: Producer / Consumer</span></div>' +
        '<canvas id="demo-queue-canvas" class="demo-canvas" style="height:240px"></canvas>' +
        '<div class="demo-controls">' +
          '<div class="demo-ctrl">' +
            '<span class="ctrl-label">Consumer speed</span>' +
            '<input id="q-speed" class="ctrl-slider" type="range" min="1" max="10" value="3">' +
            '<span id="q-speed-val" class="ctrl-val">3/s</span>' +
          '</div>' +
          '<div class="demo-ctrl" style="gap:8px">' +
            '<button id="q-produce" class="demo-btn accent">Produce 1</button>' +
            '<button id="q-burst" class="demo-btn">Burst ×10</button>' +
            '<button id="q-flood" class="demo-btn red">Flood ×50</button>' +
          '</div>' +
          '<div class="demo-stats">' +
            '<div class="demo-stat"><span class="ds-label">Queue depth</span><span id="q-depth" class="ds-val purple">0</span></div>' +
            '<div class="demo-stat"><span class="ds-label">Produced</span><span id="q-prod-count" class="ds-val green">0</span></div>' +
            '<div class="demo-stat"><span class="ds-label">Consumed</span><span id="q-cons-count" class="ds-val green">0</span></div>' +
            '<div class="demo-stat"><span class="ds-label">Status</span><span id="q-status" class="ds-val green">Healthy</span></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    var canvas = document.getElementById('demo-queue-canvas');
    var sd = setupHiDPI(canvas); var ctx = sd.ctx, W = sd.w, H = sd.h;

    var queue = [], produced = 0, consumed = 0, consumeSpeed = 3;
    var MAX_QUEUE = 40;
    var speedEl = document.getElementById('q-speed');
    var lastConsume = 0;
    var pkts = [], flashes = [];

    speedEl.addEventListener('input', function(){
      consumeSpeed = +speedEl.value;
      document.getElementById('q-speed-val').textContent = consumeSpeed + '/s';
    });

    function produce(n) {
      for (var i=0;i<n;i++) {
        if (queue.length < MAX_QUEUE) {
          queue.push({ id: ++produced, color: ['#7C3AED','#10B981','#3B82F6','#F59E0B'][produced%4] });
        }
      }
      document.getElementById('q-prod-count').textContent = produced;
      updateStats();
    }

    function updateStats() {
      document.getElementById('q-depth').textContent = queue.length;
      document.getElementById('q-depth').className = 'ds-val ' + (queue.length>MAX_QUEUE*0.7?'red':queue.length>MAX_QUEUE*0.4?'amber':'green');
      var status = queue.length > MAX_QUEUE * 0.8 ? 'BACKPRESSURE' : queue.length > MAX_QUEUE * 0.4 ? 'High load' : 'Healthy';
      document.getElementById('q-status').textContent = status;
      document.getElementById('q-status').className = 'ds-val '+(queue.length>MAX_QUEUE*0.8?'red':queue.length>MAX_QUEUE*0.4?'amber':'green');
    }

    document.getElementById('q-produce').addEventListener('click', function(){ produce(1); });
    document.getElementById('q-burst').addEventListener('click', function(){ produce(10); });
    document.getElementById('q-flood').addEventListener('click', function(){ produce(50); });

    var last = performance.now();
    function tick(now) {
      var dt = Math.min(60, now - last); last = now;
      lastConsume += dt;
      var consumeInterval = 1000 / consumeSpeed;
      if (lastConsume >= consumeInterval && queue.length > 0) {
        lastConsume = 0;
        var msg = queue.shift();
        consumed++;
        document.getElementById('q-cons-count').textContent = consumed;
        updateStats();
        var cX=W*0.8, cY=H/2;
        pkts.push({ x:W*0.6, y:H/2, tx:cX, ty:cY, t:0, color:msg.color });
      }

      ctx.clearRect(0,0,W,H); ctx.fillStyle='rgba(5,3,14,0.96)'; ctx.fillRect(0,0,W,H);

      /* Producer */
      drawNode(ctx, W*0.04, H/2-20, 72, 40, 'PRODUCER', 'publisher', '#7C3AED', 1, 0.05);
      /* Consumer */
      drawNode(ctx, W*0.78, H/2-20, 72, 40, 'CONSUMER', consumed+' done', '#10B981', 1, 0.05);

      /* Queue box */
      var qx=W*0.24, qy=H*0.2, qW=W*0.46, qH=H*0.6;
      ctx.save(); rrect(ctx,qx,qy,qW,qH,8); ctx.strokeStyle='rgba(255,255,255,0.12)'; ctx.lineWidth=1.5; ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,0.02)'; ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.font='bold 8px monospace'; ctx.textAlign='center';
      ctx.fillText('MESSAGE QUEUE (FIFO)', qx+qW/2, qy-10); ctx.restore();

      /* Messages in queue */
      var cols = Math.min(8, Math.ceil(Math.sqrt(MAX_QUEUE)));
      var mW=Math.floor((qW-20)/cols)-2, mH=18;
      queue.forEach(function(m,i) {
        var col=i%cols, row=Math.floor(i/cols);
        var mx=qx+10+col*(mW+2), my=qy+10+row*(mH+2);
        if (my+mH > qy+qH-5) return;
        ctx.save(); rrect(ctx,mx,my,mW,mH,3); ctx.fillStyle=m.color+'33'; ctx.fill();
        ctx.strokeStyle=m.color+'88'; ctx.lineWidth=1; ctx.stroke(); ctx.restore();
      });

      /* Fill level bar */
      var fillPct = queue.length / MAX_QUEUE;
      ctx.save();
      rrect(ctx,qx,qy+qH+4,qW,6,3); ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=1; ctx.stroke();
      rrect(ctx,qx,qy+qH+4,qW*fillPct,6,3);
      ctx.fillStyle = fillPct>0.8?'#EF4444':fillPct>0.5?'#F59E0B':'#10B981'; ctx.fill();
      ctx.restore();

      pkts = pkts.filter(function(p){
        p.t = Math.min(1, p.t+0.06);
        var x=lerp(p.x,p.tx,ease(p.t)), y=lerp(p.y,p.ty,ease(p.t));
        ctx.save(); ctx.beginPath(); ctx.arc(x,y,5,0,Math.PI*2);
        ctx.fillStyle=p.color; ctx.shadowBlur=8; ctx.shadowColor=p.color; ctx.fill(); ctx.restore();
        return p.t<1;
      });

      raf(tick);
    }
    raf(tick);
  }

  /* ============================================================
     Circuit Breaker Demo — #demo-circuit
     ============================================================ */
  function initCircuitBreakerDemo() {
    var wrap = document.getElementById('demo-circuit');
    if (!wrap) return;
    wrap.innerHTML =
      '<div class="demo-shell">' +
        '<div class="demo-header"><span class="demo-label">INTERACTIVE DEMO</span>' +
        '<span class="demo-title">Circuit Breaker Pattern</span></div>' +
        '<canvas id="demo-circuit-canvas" class="demo-canvas" style="height:240px"></canvas>' +
        '<div class="demo-controls">' +
          '<div class="demo-ctrl">' +
            '<span class="ctrl-label">Service B error rate</span>' +
            '<input id="cb-err" class="ctrl-slider" type="range" min="0" max="100" value="0">' +
            '<span id="cb-err-val" class="ctrl-val">0%</span>' +
          '</div>' +
          '<div class="demo-ctrl" style="gap:8px">' +
            '<button id="cb-call" class="demo-btn accent">Send Request</button>' +
            '<button id="cb-burst" class="demo-btn">Burst ×5</button>' +
            '<button id="cb-reset" class="demo-btn muted">Reset</button>' +
          '</div>' +
          '<div class="demo-stats">' +
            '<div class="demo-stat"><span class="ds-label">Circuit</span><span id="cb-state" class="ds-val green">CLOSED</span></div>' +
            '<div class="demo-stat"><span class="ds-label">Failures</span><span id="cb-fails" class="ds-val red">0</span></div>' +
            '<div class="demo-stat"><span class="ds-label">Success</span><span id="cb-ok" class="ds-val green">0</span></div>' +
            '<div class="demo-stat"><span class="ds-label">Short-circuit</span><span id="cb-short" class="ds-val amber">0</span></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    var canvas = document.getElementById('demo-circuit-canvas');
    var sd = setupHiDPI(canvas); var ctx = sd.ctx, W = sd.w, H = sd.h;

    var THRESHOLD = 3, HALF_OPEN_AFTER = 3000;
    var state = 'CLOSED'; /* CLOSED, OPEN, HALF_OPEN */
    var failCount = 0, successes = 0, failures = 0, shortCircuited = 0;
    var openTime = 0;
    var pkts = [], flashes = [];
    var errEl = document.getElementById('cb-err');

    errEl.addEventListener('input', function(){ document.getElementById('cb-err-val').textContent = errEl.value+'%'; });

    function updateState(s) {
      state = s;
      var el = document.getElementById('cb-state');
      el.textContent = s;
      el.className = 'ds-val ' + (s==='CLOSED'?'green':s==='OPEN'?'red':'amber');
    }

    function sendRequest() {
      var midY = H/2;
      if (state === 'OPEN') {
        shortCircuited++;
        document.getElementById('cb-short').textContent = shortCircuited;
        flashes.push({ label:'⚡ Short-circuited — fast fail', color:'#F59E0B', t:70 });
        return;
      }
      var errRate = +errEl.value / 100;
      var failed = Math.random() < errRate;
      if (failed) {
        failures++; failCount++;
        document.getElementById('cb-fails').textContent = failures;
        flashes.push({ label:'✕ Request failed ('+errEl.value+'% error rate)', color:'#F87171', t:70 });
        pkts.push({ x:sAx()+sNW, y:midY, tx:sBx(), ty:midY, t:0, color:'#EF4444' });
        if (failCount >= THRESHOLD) {
          updateState('OPEN'); openTime = performance.now();
          flashes.push({ label:'🔴 Circuit OPEN — fast-failing all requests', color:'#EF4444', t:120 });
        }
      } else {
        successes++;
        if(state==='HALF_OPEN') { failCount=0; updateState('CLOSED'); flashes.push({ label:'✓ Probe OK — circuit CLOSED', color:'#34D399', t:80 }); }
        document.getElementById('cb-ok').textContent = successes;
        flashes.push({ label:'✓ Request OK', color:'#34D399', t:60 });
        pkts.push({ x:sAx()+sNW, y:midY, tx:sBx(), ty:midY, t:0, color:'#34D399' });
      }
    }

    document.getElementById('cb-call').addEventListener('click', sendRequest);
    document.getElementById('cb-burst').addEventListener('click', function(){ for(var i=0;i<5;i++) setTimeout(sendRequest,i*150); });
    document.getElementById('cb-reset').addEventListener('click', function(){
      state='CLOSED'; failCount=0; successes=0; failures=0; shortCircuited=0;
      updateState('CLOSED');
      document.getElementById('cb-fails').textContent='0';
      document.getElementById('cb-ok').textContent='0';
      document.getElementById('cb-short').textContent='0';
    });

    var stateColors = { CLOSED:'#10B981', OPEN:'#EF4444', HALF_OPEN:'#F59E0B' };
    /* layout helpers — recomputed each frame in case canvas resizes */
    function sAx() { return W*0.05; }
    function cbx() { return W*0.37; }
    function sBx() { return W*0.70; }
    var sNW=110, sNH=52, cbW=100, cbH=56;

    function tick(now) {
      if (state === 'OPEN' && now - openTime > HALF_OPEN_AFTER) { updateState('HALF_OPEN'); }
      ctx.clearRect(0,0,W,H); ctx.fillStyle='rgba(5,3,14,0.96)'; ctx.fillRect(0,0,W,H);

      var midY = H/2;
      /* connection lines */
      ctx.save(); ctx.lineWidth=1.5; ctx.setLineDash([5,4]);
      ctx.strokeStyle='rgba(255,255,255,0.12)';
      ctx.beginPath(); ctx.moveTo(sAx()+sNW, midY); ctx.lineTo(cbx(), midY); ctx.stroke();
      ctx.strokeStyle = state==='OPEN' ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.12)';
      ctx.beginPath(); ctx.moveTo(cbx()+cbW, midY); ctx.lineTo(sBx(), midY); ctx.stroke();
      ctx.restore();

      /* Service A */
      drawNode(ctx, sAx(), midY-sNH/2, sNW, sNH, 'SERVICE A', 'caller', '#7C3AED', 1, 0.12);

      /* Circuit breaker box */
      var bx=cbx(), by=midY-cbH/2, bw=cbW, bh=cbH;
      ctx.save(); rrect(ctx,bx,by,bw,bh,10);
      ctx.fillStyle=stateColors[state]+'1A'; ctx.fill();
      ctx.strokeStyle=stateColors[state]+'99'; ctx.lineWidth=2; ctx.stroke();
      ctx.fillStyle=stateColors[state]; ctx.font='bold 8px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('CIRCUIT', bx+bw/2, by+bh/2-10);
      ctx.font='bold 13px monospace';
      ctx.fillText(state, bx+bw/2, by+bh/2+6); ctx.restore();
      /* failure progress bar */
      if (state==='CLOSED'||state==='HALF_OPEN') {
        ctx.save(); rrect(ctx,bx+6,by+bh+6,bw-12,7,3.5); ctx.strokeStyle='rgba(239,68,68,0.25)'; ctx.lineWidth=1; ctx.stroke();
        var fp=Math.min(1,failCount/THRESHOLD);
        if (fp>0) { rrect(ctx,bx+6,by+bh+6,(bw-12)*fp,7,3.5); ctx.fillStyle='#EF4444'; ctx.fill(); }
        ctx.fillStyle='rgba(239,68,68,0.5)'; ctx.font='8px monospace'; ctx.textAlign='center';
        ctx.fillText('fail '+failCount+'/'+THRESHOLD, bx+bw/2, by+bh+20); ctx.restore();
      }

      /* Service B */
      drawNode(ctx, sBx(), midY-sNH/2, sNW, sNH, 'SERVICE B', 'dependency', '#3B82F6', state==='OPEN'?0.3:1, 0.06);

      /* State label above circuit box */
      if (state === 'OPEN') {
        ctx.save(); ctx.fillStyle='rgba(239,68,68,0.7)'; ctx.font='9px monospace'; ctx.textAlign='center';
        ctx.fillText('blocking all requests', bx+bw/2, by-8); ctx.restore();
      } else if (state === 'HALF_OPEN') {
        ctx.save(); ctx.fillStyle='rgba(245,158,11,0.7)'; ctx.font='9px monospace'; ctx.textAlign='center';
        ctx.fillText('probing…', bx+bw/2, by-8); ctx.restore();
      }

      pkts = pkts.filter(function(p){
        p.t = Math.min(1, p.t+0.04);
        var x=lerp(p.x,p.tx,ease(p.t)), y=lerp(p.y,p.ty,ease(p.t));
        ctx.save(); ctx.beginPath(); ctx.arc(x,y,6,0,Math.PI*2);
        ctx.fillStyle=p.color; ctx.shadowBlur=12; ctx.shadowColor=p.color; ctx.fill(); ctx.restore();
        return p.t<1;
      });
      flashes.forEach(function(f){ ctx.save(); ctx.globalAlpha=Math.min(1,f.t/20); ctx.font='bold 13px monospace'; ctx.fillStyle=f.color; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(f.label,W/2,H-22); ctx.restore(); f.t--; });
      flashes=flashes.filter(function(f){ return f.t>0; });
      raf(tick);
    }
    raf(tick);
  }

  /* ============================================================
     Protocol Comparison Demo — #demo-protocol
     ============================================================ */
  function initProtocolDemo() {
    var wrap = document.getElementById('demo-protocol');
    if (!wrap) return;
    wrap.innerHTML =
      '<div class="demo-shell">' +
        '<div class="demo-header"><span class="demo-label">INTERACTIVE DEMO</span>' +
        '<span class="demo-title">REST vs WebSocket: Connection Overhead</span></div>' +
        '<canvas id="demo-proto-canvas" class="demo-canvas" style="height:240px"></canvas>' +
        '<div class="demo-controls">' +
          '<div class="demo-ctrl" style="gap:8px">' +
            '<button id="proto-rest" class="demo-btn accent">HTTP REST Request</button>' +
            '<button id="proto-ws-connect" class="demo-btn" id="proto-ws-connect">Open WebSocket</button>' +
            '<button id="proto-ws-send" class="demo-btn" disabled>Send WS Frame</button>' +
          '</div>' +
          '<div class="demo-stats">' +
            '<div class="demo-stat"><span class="ds-label">REST avg latency</span><span id="proto-rest-lat" class="ds-val amber">—</span></div>' +
            '<div class="demo-stat"><span class="ds-label">WS frame latency</span><span id="proto-ws-lat" class="ds-val green">—</span></div>' +
            '<div class="demo-stat"><span class="ds-label">REST requests</span><span id="proto-rest-n" class="ds-val purple">0</span></div>' +
            '<div class="demo-stat"><span class="ds-label">WS frames sent</span><span id="proto-ws-n" class="ds-val purple">0</span></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    var canvas = document.getElementById('demo-proto-canvas');
    var sd = setupHiDPI(canvas); var ctx = sd.ctx, W = sd.w, H = sd.h;

    var wsOpen = false, restN = 0, wsN = 0;
    var lanes = []; /* { label, segments, color, y } timeline lanes */
    var LANE_H = 22, laneY = 30;

    function addLane(label, color, segments) {
      lanes.push({ label: label, color: color, segments: segments, y: laneY, anim: 0 });
      laneY += LANE_H + 8;
      if (laneY > H - 30) { lanes.shift(); laneY -= LANE_H + 8; }
    }

    document.getElementById('proto-rest').addEventListener('click', function(){
      restN++;
      document.getElementById('proto-rest-n').textContent = restN;
      /* segments: TCP handshake, TLS, Request, Response */
      var segs = [
        { label:'TCP', ms:35, color:'#F59E0B' },
        { label:'TLS', ms:45, color:'#EF4444' },
        { label:'REQ', ms:20, color:'#7C3AED' },
        { label:'RES', ms:18, color:'#10B981' }
      ];
      var total = segs.reduce(function(a,s){ return a+s.ms; },0);
      document.getElementById('proto-rest-lat').textContent = total + 'ms';
      document.getElementById('proto-rest-lat').className = 'ds-val ' + (total<100?'amber':'red');
      addLane('REST #'+restN, '#7C3AED', segs);
    });

    var wsConnBtn = document.getElementById('proto-ws-connect');
    var wsSendBtn = document.getElementById('proto-ws-send');

    wsConnBtn.addEventListener('click', function(){
      if (!wsOpen) {
        wsOpen = true;
        wsConnBtn.textContent = 'Close WebSocket';
        wsSendBtn.disabled = false;
        var segs = [
          { label:'TCP', ms:35, color:'#F59E0B' },
          { label:'Upgrade', ms:25, color:'#3B82F6' },
          { label:'OPEN', ms:5, color:'#10B981' }
        ];
        addLane('WS Handshake', '#10B981', segs);
      } else {
        wsOpen = false;
        wsConnBtn.textContent = 'Open WebSocket';
        wsSendBtn.disabled = true;
        addLane('WS CLOSE', '#EF4444', [{ label:'FIN', ms:8, color:'#EF4444' }]);
      }
    });

    wsSendBtn.addEventListener('click', function(){
      if (!wsOpen) return;
      wsN++;
      document.getElementById('proto-ws-n').textContent = wsN;
      document.getElementById('proto-ws-lat').textContent = '2ms';
      var segs = [{ label:'FRAME', ms:2, color:'#10B981' }];
      addLane('WS msg #'+wsN, '#10B981', segs);
    });

    function tick() {
      ctx.clearRect(0,0,W,H); ctx.fillStyle='rgba(5,3,14,0.96)'; ctx.fillRect(0,0,W,H);

      /* timeline grid */
      ctx.save(); ctx.strokeStyle='rgba(255,255,255,0.06)'; ctx.lineWidth=1;
      for (var x=80; x<W; x+=40) {
        ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke();
      }
      ctx.restore();

      /* scale label */
      ctx.save(); ctx.fillStyle='rgba(255,255,255,0.2)'; ctx.font='9px monospace'; ctx.textAlign='left';
      for (var xi=80, t=0; xi<W; xi+=40, t+=25) {
        ctx.fillText(t+'ms', xi+2, H-6);
      }
      ctx.restore();

      lanes.forEach(function(lane) {
        lane.anim = Math.min(1, lane.anim + 0.04);
        var maxW = (W-90)*lane.anim;
        var totalMs = lane.segments.reduce(function(a,s){ return a+s.ms; },0);
        var x = 80;
        lane.segments.forEach(function(seg) {
          var segW = (seg.ms/totalMs)*maxW * (totalMs/200);
          segW = Math.max(4, segW);
          ctx.save(); rrect(ctx,x,lane.y,segW,LANE_H-2,3);
          ctx.fillStyle=seg.color+'44'; ctx.fill();
          ctx.strokeStyle=seg.color; ctx.lineWidth=1; ctx.stroke();
          if (segW > 20) {
            ctx.fillStyle=seg.color; ctx.font='bold 8px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
            ctx.fillText(seg.label, x+segW/2, lane.y+(LANE_H-2)/2);
          }
          ctx.restore();
          x += segW + 1;
        });
        ctx.save(); ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.font='9px monospace'; ctx.textAlign='right'; ctx.textBaseline='middle';
        ctx.fillText(lane.label, 76, lane.y+(LANE_H-2)/2); ctx.restore();
      });

      /* empty state hint */
      if (lanes.length === 0) {
        ctx.save();
        ctx.fillStyle='rgba(139,92,246,0.18)'; ctx.strokeStyle='rgba(139,92,246,0.35)'; ctx.lineWidth=1;
        ctx.setLineDash([5,4]);
        rrect(ctx, W/2-170, H/2-28, 340, 56, 10); ctx.fill(); ctx.stroke();
        ctx.fillStyle='rgba(196,181,253,0.85)'; ctx.font='bold 13px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('← Click "HTTP REST Request" to start', W/2, H/2-8);
        ctx.font='10px monospace'; ctx.fillStyle='rgba(196,181,253,0.5)';
        ctx.fillText('Each REST call = new TCP+TLS handshake overhead', W/2, H/2+12);
        ctx.restore();
      }

      /* WS persistent indicator */
      if (wsOpen) {
        ctx.save(); ctx.fillStyle='rgba(16,185,129,0.07)'; ctx.strokeStyle='rgba(16,185,129,0.35)'; ctx.lineWidth=1;
        ctx.setLineDash([4,3]);
        ctx.beginPath(); ctx.rect(80, 0, W-80, H-20); ctx.stroke(); ctx.fill();
        ctx.fillStyle='#10B981'; ctx.font='bold 9px monospace'; ctx.textAlign='right';
        ctx.fillText('WS OPEN — persistent connection', W-4, 12); ctx.restore();
      }
      raf(tick);
    }
    raf(tick);
  }

  /* ============================================================
     Capacity Estimator Demo — #demo-capacity
     ============================================================ */
  function initCapacityDemo() {
    var wrap = document.getElementById('demo-capacity');
    if (!wrap) return;
    wrap.innerHTML =
      '<div class="demo-shell">' +
        '<div class="demo-header"><span class="demo-label">INTERACTIVE DEMO</span>' +
        '<span class="demo-title">Back-of-Envelope Capacity Estimator</span></div>' +
        '<canvas id="demo-cap2-canvas" class="demo-canvas" style="height:260px"></canvas>' +
        '<div class="demo-controls">' +
          '<div class="demo-ctrl">' +
            '<span class="ctrl-label">Daily active users</span>' +
            '<input id="cap-dau" class="ctrl-slider" type="range" min="1" max="7" value="4">' +
            '<span id="cap-dau-val" class="ctrl-val">10M</span>' +
          '</div>' +
          '<div class="demo-ctrl">' +
            '<span class="ctrl-label">Requests per user/day</span>' +
            '<input id="cap-rpd" class="ctrl-slider" type="range" min="1" max="6" value="3">' +
            '<span id="cap-rpd-val" class="ctrl-val">10</span>' +
          '</div>' +
          '<div class="demo-ctrl">' +
            '<span class="ctrl-label">Avg response size</span>' +
            '<input id="cap-size" class="ctrl-slider" type="range" min="1" max="5" value="2">' +
            '<span id="cap-size-val" class="ctrl-val">50 KB</span>' +
          '</div>' +
        '</div>' +
      '</div>';

    var canvas = document.getElementById('demo-cap2-canvas');
    var sd = setupHiDPI(canvas); var ctx = sd.ctx, W = sd.w, H = sd.h;

    var DAU_VALS = [100e3, 1e6, 5e6, 10e6, 50e6, 100e6, 1e9];
    var RPD_VALS = [1, 3, 5, 10, 50, 100];
    var SIZE_VALS = [1e3, 50e3, 200e3, 1e6, 10e6];
    var SIZE_LBLS = ['1 KB','50 KB','200 KB','1 MB','10 MB'];
    var dauEl=document.getElementById('cap-dau'), rpdEl=document.getElementById('cap-rpd'), sizeEl=document.getElementById('cap-size');

    function fmt(n, unit) {
      if (n >= 1e12) return (n/1e12).toFixed(1) + ' T' + unit;
      if (n >= 1e9)  return (n/1e9).toFixed(1)  + ' G' + unit;
      if (n >= 1e6)  return (n/1e6).toFixed(1)  + ' M' + unit;
      if (n >= 1e3)  return (n/1e3).toFixed(1)  + ' K' + unit;
      return Math.round(n) + ' ' + unit;
    }
    function fmtDAU(v) {
      if(v>=1e9) return (v/1e9).toFixed(0)+'B'; if(v>=1e6) return (v/1e6).toFixed(0)+'M'; return (v/1e3).toFixed(0)+'K';
    }

    function calc() {
      var dau = DAU_VALS[+dauEl.value-1];
      var rpd = RPD_VALS[+rpdEl.value-1];
      var sz  = SIZE_VALS[+sizeEl.value-1];
      document.getElementById('cap-dau-val').textContent = fmtDAU(dau);
      document.getElementById('cap-rpd-val').textContent = rpd;
      document.getElementById('cap-size-val').textContent = SIZE_LBLS[+sizeEl.value-1];
      return {
        dau: dau, rpd: rpd, sz: sz,
        rps:  dau * rpd / 86400,
        bwDay: dau * rpd * sz,
        bwSec: dau * rpd * sz / 86400,
        storDay: dau * rpd * sz,
        storYear: dau * rpd * sz * 365,
        servers: Math.ceil(dau * rpd / 86400 / 1000)
      };
    }

    dauEl.addEventListener('input', calc);
    rpdEl.addEventListener('input', calc);
    sizeEl.addEventListener('input', calc);

    var ROW_H = 34;
    function tick() {
      var r = calc();
      ctx.clearRect(0,0,W,H); ctx.fillStyle='rgba(5,3,14,0.96)'; ctx.fillRect(0,0,W,H);

      var rows = [
        { label:'Requests/sec',    val: fmt(r.rps,'RPS'),       bar: Math.min(1,r.rps/100000),   color:'#7C3AED' },
        { label:'Bandwidth/sec',   val: fmt(r.bwSec,'B/s'),     bar: Math.min(1,r.bwSec/1e10),  color:'#3B82F6' },
        { label:'Storage/day',     val: fmt(r.storDay,'B'),     bar: Math.min(1,r.storDay/1e12), color:'#10B981' },
        { label:'Storage/year',    val: fmt(r.storYear,'B'),    bar: Math.min(1,r.storYear/1e14),color:'#F59E0B' },
        { label:'App servers est.',val: r.servers+' × 1k RPS',  bar: Math.min(1,r.servers/1000), color:'#EC4899' }
      ];

      ctx.save(); ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.font='bold 9px monospace';
      ctx.fillText('DAU: '+fmtDAU(r.dau)+'  ×  '+r.rpd+' req/day  ×  '+SIZE_LBLS[+sizeEl.value-1]+'/req', 16, 16);
      ctx.restore();

      rows.forEach(function(row, i) {
        var y = 30 + i*(ROW_H+4);
        var barMaxW = W - 200;
        /* label */
        ctx.save(); ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.font='10px monospace'; ctx.textAlign='left'; ctx.textBaseline='middle';
        ctx.fillText(row.label, 12, y+ROW_H/2); ctx.restore();
        /* bar bg */
        ctx.save(); rrect(ctx, 140, y, barMaxW, ROW_H-4, 4); ctx.fillStyle='rgba(255,255,255,0.04)'; ctx.fill(); ctx.restore();
        /* bar fill */
        ctx.save(); rrect(ctx, 140, y, Math.max(4, barMaxW*row.bar), ROW_H-4, 4);
        ctx.fillStyle=row.color+'44'; ctx.fill();
        ctx.strokeStyle=row.color+'88'; ctx.lineWidth=1; ctx.stroke(); ctx.restore();
        /* value */
        ctx.save(); ctx.fillStyle=row.color; ctx.font='bold 11px monospace'; ctx.textAlign='left'; ctx.textBaseline='middle';
        ctx.fillText(row.val, 148, y+ROW_H/2); ctx.restore();
      });
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
    initCAPDemo();
    initConsistencyDemo();
    initCDNDemo();
    initQueueDemo();
    initCircuitBreakerDemo();
    initProtocolDemo();
    initCapacityDemo();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
