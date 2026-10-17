/* 공통 기능: 테마, 데이터 로드, 지표 계산 */
(function (global) {
  'use strict';

  // ---------- 테마 ----------
  var THEME_KEY = 'aid-dash-theme';
  function getSavedTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var btn = document.getElementById('themeBtn');
    if (btn) {
      var dark = theme === 'dark';
      btn.setAttribute('aria-pressed', String(dark));
      btn.setAttribute('aria-label', dark ? '일반 모드로 전환' : '다크 모드로 전환');
      btn.title = btn.getAttribute('aria-label');
      btn.querySelector('.txt').textContent = dark ? '일반 모드' : '다크 모드';
      btn.querySelector('.ico-moon').style.display = dark ? 'none' : '';
      btn.querySelector('.ico-sun').style.display = dark ? '' : 'none';
    }
  }
  function initTheme() {
    var saved = getSavedTheme();
    var theme = saved;
    if (theme !== 'dark' && theme !== 'light') {
      try { theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
      catch (e) { theme = 'light'; }
    }
    applyTheme(theme);
    var btn = document.getElementById('themeBtn');
    if (btn) btn.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
      applyTheme(next);
      if (typeof global.onThemeChange === 'function') global.onThemeChange();
    });
  }

  // ---------- 유틸 ----------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(n, d) {
    if (n == null || isNaN(n)) return '—';
    return Number(n).toLocaleString('ko-KR', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function autoDec(v) {
    if (v == null) return 0;
    if (Math.abs(v) < 1 && v !== 0) return 2;
    return Number.isInteger(v) ? 0 : 1;
  }
  function pad(n) { return String(n).padStart(2, '0'); }
  function parseDate(s, endOfDay) {
    var p = String(s).split('-').map(Number);
    return endOfDay ? new Date(p[0], p[1] - 1, p[2] + 1) : new Date(p[0], p[1] - 1, p[2]);
  }

  // ---------- 데이터 ----------
  function loadData() {
    return fetch('/api/data?_=' + Date.now(), { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  // ---------- 계산 ----------
  // 지표값 = Σ (현재값 / 3차년도 목표값 × 100) × 비중   (정의서 산출식)
  // 2차년도 목표 지표값 = Σ (2차년도 목표값 / 3차년도 목표값 × 100) × 비중
  function judge(rate, th) {
    th = th || { green: 90, yellow: 60, red: 30 };
    if (rate >= th.green) return { key: 'green', label: '우수', alert: false };
    if (rate >= th.yellow) return { key: 'yellow', label: '보통', alert: false };
    if (rate >= th.red) return { key: 'red', label: '부진', alert: true };
    return { key: 'red', label: '매우 부진', alert: true };
  }
  function compute(data, now) {
    now = now || new Date();
    var th = data.thresholds || { green: 90, yellow: 60, red: 30 };
    var pStart = parseDate(data.meta.periodStart, false);
    var pEnd = parseDate(data.meta.periodEnd, true);
    var elapsed = Math.max(0, Math.min(100, (now - pStart) / (pEnd - pStart) * 100));
    var daysLeft = Math.max(0, Math.floor((pEnd - now) / 86400000));

    var inds = data.indicators.map(function (ind) {
      var cur = 0, tgt = 0;
      var subs = ind.subs.map(function (s) {
        var w = s.weight / 100;
        tgt += (s.target26 / s.target27) * 100 * w;
        var has = s.current !== null && s.current !== undefined && s.current !== '';
        if (has) cur += (s.current / s.target27) * 100 * w;
        var rate = has ? s.current / s.target26 * 100 : null;
        var st;
        if (!has) st = { key: 'gray', label: '미입력', alert: false };
        else if (s.kind === 'year') st = { key: 'gray', label: '연말 측정(잠정)', alert: false };
        else st = judge(rate, th);
        return Object.assign({}, s, { has: has, rate: rate, st: st });
      });
      var rate = tgt > 0 ? cur / tgt * 100 : 0;
      var missing = subs.filter(function (s) { return !s.has; }).map(function (s) { return s.name; });
      return Object.assign({}, ind, { subs: subs, cur: cur, tgt: tgt, rate: rate, st: judge(rate, th), missing: missing });
    });
    var totCur = inds.reduce(function (a, x) { return a + x.cur; }, 0) / inds.length;
    var totTgt = inds.reduce(function (a, x) { return a + x.tgt; }, 0) / inds.length;
    var y1Avg = (typeof data.meta.y1AvgRate === 'number') ? data.meta.y1AvgRate
      : inds.reduce(function (a, x) { return a + (x.y1Rate || 0); }, 0) / inds.length; // 문서 공식값 우선
    var alerts = [];
    var subCount = 0;
    inds.forEach(function (i) { i.subs.forEach(function (s) { subCount++; if (s.st.alert) alerts.push(s.name); }); });
    return {
      th: th, elapsed: elapsed, daysLeft: daysLeft, inds: inds,
      totCur: totCur, totTgt: totTgt, totRate: totTgt > 0 ? totCur / totTgt * 100 : 0,
      y1Avg: y1Avg, alerts: alerts, subCount: subCount
    };
  }

  global.AID = {
    initTheme: initTheme, esc: esc, fmt: fmt, autoDec: autoDec, pad: pad,
    loadData: loadData, compute: compute, judge: judge
  };
})(window);
