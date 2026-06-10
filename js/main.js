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
    var btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
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
