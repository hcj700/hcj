/* AI 요약보고서: 현재 성과 데이터를 Claude에 보내 사업단장 보고용 요약을 생성 */
(function (global) {
  'use strict';
  var A = global.AID, esc = A.esc, fmt = A.fmt;
  var STANDALONE = !!global.AID_STANDALONE;          // 단일 HTML(로컬 파일) 모드
  var KEY_LS = 'aid-ai-key', MODEL_LS = 'aid-ai-model';
  var DEFAULT_MODEL = 'claude-sonnet-5-5';
  var CACHE = {};                                    // 같은 데이터면 재사용
  var lastText = '';
  var COLOR = { high: 'var(--red)', medium: 'var(--yellow)', low: 'var(--gray)' };
  var LEVEL = { high: '높음', medium: '중간', low: '낮음' };

  function lsGet(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function lsSet(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) {} }
  function stamp(d) {
    var p = A.pad; d = d || new Date();
    return d.getFullYear() + '.' + p(d.getMonth() + 1) + '.' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function r1(n) { return n == null ? null : Math.round(n * 10) / 10; }

  // ---------- AI에 보낼 데이터(수치만) ----------
  function buildPayload(DATA) {
    var m = DATA.meta, R = A.compute(DATA, new Date());
    return {
      기관: m.university + ' ' + m.unit,
      사업연도: m.yearLabel,
      측정기간: m.periodStart + ' ~ ' + m.periodEnd,
      기간경과율: r1(R.elapsed),
      마감까지_남은일수: R.daysLeft,
      종합: { 현재지표값: r1(R.totCur), 목표지표값: r1(R.totTgt), 진척률: r1(R.totRate) },
      '1차년도_평균달성도': r1(R.y1Avg),
      상태기준: R.th,
      지표: R.inds.map(function (i) {
        return {
          지표명: i.name, 현재지표값: r1(i.cur), '2차년도_목표지표값': r1(i.tgt), 진척률: r1(i.rate), 상태: i.st.label,
          '1차년도': { 목표: i.y1Target, 실적: i.y1Actual, 달성도: i.y1Rate },
          '2차목표_minus_1차실적': r1(i.tgt - i.y1Actual),
          세부지수: i.subs.map(function (s) {
            var proj = (s.has && s.kind === 'count' && R.elapsed > 5) ? r1(s.rate / R.elapsed * 100) : null;
            return {
              명칭: s.name, 단위: s.unit, 비중: s.weight, '2차년도_목표': s.target26, '3차년도_목표': s.target27,
              현재값: s.has ? s.current : '미입력', 진척률: r1(s.rate), 상태: s.st.label,
              측정유형: s.kind === 'year' ? '연말측정' : (s.kind === 'point' ? '시점측정' : '누적집계'),
              추세연장_예상진척률: proj, 관리부서: s.dept, 비고: s.note
            };
          })
        };
      }),
      등록된_확인필요사항: (DATA.actions || []).map(function (a) { return a.kind + ' | ' + a.title + ' | ' + a.desc; })
    };
  }

  // ---------- 호출 ----------
  // 서버 호출: Python 서버는 JSON, Netlify는 스트리밍(SSE)으로 응답
  function callServer(payload, force, onProgress) {
    return fetch('/api/ai-summary', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payload: payload, force: !!force })
    }).then(function (r) {
      var ct = r.headers.get('content-type') || '';
      if (ct.indexOf('text/event-stream') < 0 || !r.body) {
        return r.json().then(function (j) { if (!r.ok || !j.ok) throw new Error(j.error || ('HTTP ' + r.status)); return j; },
          function () { throw new Error('서버 응답을 해석하지 못했습니다(HTTP ' + r.status + ').'); });
      }
      var reader = r.body.getReader(), dec = new TextDecoder(), buf = '', text = '', meta = null, err = null;
      function pump() {
        return reader.read().then(function (x) {
          if (x.done) {
            if (err) throw new Error(err);
            if (!meta) throw new Error('AI 응답이 중간에 끊겼습니다. 다시 시도해 주십시오.');
            return { ok: true, text: text, model: meta.model, generatedAt: meta.generatedAt };
          }
          buf += dec.decode(x.value, { stream: true });
          var parts = buf.split('\n\n'); buf = parts.pop();
          parts.forEach(function (p) {
            p.split('\n').forEach(function (line) {
              if (line.indexOf('data:') !== 0) return;
              var j; try { j = JSON.parse(line.slice(5)); } catch (e) { return; }
              if (j.t) { text += j.t; if (onProgress) onProgress(text.length); }
              if (j.error) err = j.error;
              if (j.done) meta = j;
            });
          });
          return pump();
        });
      }
      return pump();
    }, function () { throw new Error('서버에 연결하지 못했습니다. 인터넷 연결을 확인해 주십시오.'); });
  }
  function callDirect(payload) {
    var P = global.AID_AI_PROMPT, key = lsGet(KEY_LS), model = lsGet(MODEL_LS) || DEFAULT_MODEL;
    var user = P.user.replace('{asof}', stamp()).replace('{payload}', JSON.stringify(payload, null, 1));
    return fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({ model: model, max_tokens: 2000, system: P.system, messages: [{ role: 'user', content: user }] })
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) throw new Error((j && j.error && j.error.message) || ('HTTP ' + r.status));
        var text = (j.content || []).filter(function (c) { return c.type === 'text'; }).map(function (c) { return c.text; }).join('');
        return { ok: true, text: text, model: j.model || model, generatedAt: stamp() };
      });
    }, function () { throw new Error('AI 서비스에 연결하지 못했습니다. 인터넷 연결을 확인해 주십시오.'); });
  }
  function status() {
    if (STANDALONE) return Promise.resolve({ enabled: !!lsGet(KEY_LS), model: lsGet(MODEL_LS) || DEFAULT_MODEL, mode: 'local' });
    return fetch('/api/ai-status', { cache: 'no-store' }).then(function (r) { return r.json(); })
      .then(function (j) { j.mode = 'server'; return j; })
      .catch(function () { return { enabled: false, mode: 'server' }; });
  }

  function parse(text) {
    var s = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    var a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a < 0 || b <= a) return null;
    try { return JSON.parse(s.slice(a, b + 1)); } catch (e) { return null; }
  }
  function arr(x) { return Array.isArray(x) ? x : (x ? [x] : []); }

  // ---------- 화면 ----------
  function kpiRow(DATA) {
    var R = A.compute(DATA, new Date());
    return '<div class="rp-kpis">' +
      '<div><small>종합 진척률</small><b>' + fmt(R.totRate, 1) + '%</b></div>' +
      '<div><small>기간 경과율</small><b>' + fmt(R.elapsed, 1) + '%</b></div>' +
      '<div><small>1차년도 평균 달성도</small><b style="color:var(--ok)">' + fmt(R.y1Avg, 1) + '%</b></div>' +
      '<div><small>집중 관리 / 전체</small><b style="color:var(--red)">' + R.alerts.length + ' / ' + R.subCount + '</b></div></div>';
  }

  function renderResult(el, DATA, res) {
    var j = parse(res.text), html = [], t = [];
    var m = DATA.meta;
    t.push('[' + m.university + ' ' + m.unit + '] AI 요약보고 — 자율성과지표 추진현황');
    t.push('생성: ' + res.generatedAt + ' / 모델: ' + res.model + ' / ※ AI 작성 초안으로 검토 후 활용');
    t.push('');
    if (!j) {
      html.push('<div class="ai-badge">AI 분석</div><div class="rp-conclusion" style="white-space:pre-wrap">' + esc(res.text) + '</div>');
      t.push(res.text);
    } else {
      html.push('<div class="ai-head"><span class="ai-badge">AI 분석</span><p class="ai-headline">' + esc(j.headline || '') + '</p></div>');
      html.push('<div class="rp-conclusion"><b>결론</b> — ' + esc(j.conclusion || '') + '</div>');
      html.push(kpiRow(DATA));
      t.push('■ ' + (j.headline || ''));
      t.push('■ 결론: ' + (j.conclusion || ''));
      t.push('');

      var st = arr(j.strengths);
      html.push('<section class="rp-sec"><h3><span class="no">1</span>주요 성과</h3><ul>' +
        (st.length ? st.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') : '<li>-</li>') + '</ul></section>');
      t.push('1. 주요 성과'); st.forEach(function (x) { t.push('  - ' + x); }); t.push('');

      var rk = arr(j.risks);
      html.push('<section class="rp-sec"><h3><span class="no">2</span>리스크</h3><ul class="ai-risks">' + rk.map(function (x) {
        var lv = (x && x.level) || 'medium';
        return '<li><span class="ai-lv"><span class="dot" style="background:' + (COLOR[lv] || COLOR.medium) + '"></span>' + (LEVEL[lv] || lv) + '</span>' +
          '<div><b>' + esc(x.item || x) + '</b><span class="m">' + esc(x.detail || '') + '</span></div></li>';
      }).join('') + '</ul></section>');
      t.push('2. 리스크'); rk.forEach(function (x) { t.push('  - [' + (LEVEL[x.level] || x.level || '') + '] ' + (x.item || x) + ' — ' + (x.detail || '')); }); t.push('');

      var ac = arr(j.actions);
      html.push('<section class="rp-sec"><h3><span class="no">3</span>조치 제안</h3><div class="tbl-wrap"><table><thead><tr><th>담당</th><th>조치 내용</th><th>권장 시한</th></tr></thead><tbody>' +
        ac.map(function (x) {
          return '<tr><td style="white-space:nowrap;font-weight:600;color:var(--strong)">' + esc(x.owner || '-') + '</td><td>' + esc(x.task || x) + '</td><td style="white-space:nowrap">' + esc(x.due || '-') + '</td></tr>';
        }).join('') + '</tbody></table></div></section>');
      t.push('3. 조치 제안'); ac.forEach(function (x) { t.push('  - [' + (x.owner || '-') + '] ' + (x.task || x) + (x.due ? ' (' + x.due + ')' : '')); }); t.push('');

      html.push('<section class="rp-sec"><h3><span class="no">4</span>학년도 말 전망</h3><p class="ai-p">' + esc(j.outlook || '-') + '</p></section>');
      t.push('4. 학년도 말 전망'); t.push('  ' + (j.outlook || '-')); t.push('');

      var dn = arr(j.data_notes);
      if (dn.length) {
        html.push('<section class="rp-sec"><h3><span class="no">5</span>보고 전 데이터 확인 사항</h3><ul>' + dn.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></section>');
        t.push('5. 보고 전 데이터 확인 사항'); dn.forEach(function (x) { t.push('  - ' + x); });
      }
    }
    html.push('<p class="ai-meta">AI 생성 ' + esc(res.generatedAt) + ' · 모델 ' + esc(res.model) + (res.cached ? ' · 같은 데이터의 이전 결과' : '') +
      ' · AI가 작성한 초안이므로 수치와 표현을 검토한 뒤 활용하십시오.' +
      (STANDALONE ? ' <button type="button" class="link-btn" data-ai="reset-key">API 키 변경</button>' : '') + '</p>');
    el.innerHTML = html.join('');
    lastText = t.join('\n');
  }

  function renderLoading(el) {
    el.setAttribute('aria-busy', 'true');
    el.innerHTML = '<div class="ai-loading"><span class="spinner" aria-hidden="true"></span><b>AI가 현황을 분석하고 있습니다</b>' +
      '<span>지표 4개 · 세부지수 11개의 진척률과 기간 경과율을 비교해 보고서를 작성 중입니다. 보통 10~30초 걸립니다.</span>' +
      '<span class="ai-progress mono" aria-hidden="true"></span></div>';
  }
  function renderError(el, msg) {
    el.innerHTML = '<div class="ai-empty"><b>AI 요약을 만들지 못했습니다</b><p>' + esc(msg) + '</p>' +
      '<div class="row-actions"><button type="button" class="btn" data-ai="retry">다시 시도</button>' +
      '<button type="button" class="btn ghost" data-ai="auto">자동 집계 보고 보기</button>' +
      (STANDALONE ? '<button type="button" class="btn ghost" data-ai="reset-key">API 키 변경</button>' : '') + '</div></div>';
  }
  function renderSetup(el) {
    if (STANDALONE) {
      el.innerHTML = '<div class="ai-empty"><b>AI 요약보고서 사용 설정</b>' +
        '<p>AI 분석은 Anthropic의 Claude API를 사용합니다. API 키를 한 번 입력하면 이 PC의 브라우저에만 저장되며, 보고서 생성 시 성과 수치만 전송됩니다(개인정보 제외). 인터넷 연결이 필요합니다.</p>' +
        '<form class="ai-form" data-ai="setup">' +
        '<label class="f">Claude API 키<input class="in" type="password" name="key" placeholder="sk-ant-..." autocomplete="off" required></label>' +
        '<label class="f">모델<input class="in" name="model" value="' + esc(lsGet(MODEL_LS) || DEFAULT_MODEL) + '"></label>' +
        '<div class="row-actions"><button type="submit" class="btn">저장하고 분석 시작</button>' +
        '<button type="button" class="btn ghost" data-ai="auto">자동 집계 보고 보기</button></div></form>' +
        '<p class="ai-meta">API 키는 Anthropic 콘솔(console.anthropic.com)에서 발급합니다. 공용 PC에서는 사용 후 "API 키 변경"에서 키를 지워 주십시오.</p></div>';
    } else {
      el.innerHTML = '<div class="ai-empty"><b>AI 요약보고서가 아직 설정되지 않았습니다</b>' +
        '<p>사이트 관리자가 Claude API 키를 등록하면 사용할 수 있습니다. (Netlify: 사이트 설정 → 환경변수 <code>ANTHROPIC_API_KEY</code> 등록 후 재배포 / 학내 서버: <code>config.json</code>의 <code>anthropic_api_key</code> 입력 후 재시작) 설정 전에는 자동 집계 보고를 이용해 주십시오.</p>' +
        '<div class="row-actions"><button type="button" class="btn" data-ai="auto">자동 집계 보고 보기</button></div></div>';
    }
  }

  var busy = false, ctx = null;
  function run(el, DATA, force, onAuto) {
    ctx = { el: el, DATA: DATA, onAuto: onAuto };
    if (busy) return;
    status().then(function (s) {
      if (!s.enabled) { renderSetup(el); lastText = ''; return; }
      var payload = buildPayload(DATA);
      var sig = JSON.stringify(payload).replace(/"기간경과율":[\d.]+|"마감까지_남은일수":\d+/g, '');
      if (!force && CACHE[sig]) { renderResult(el, DATA, Object.assign({}, CACHE[sig], { cached: true })); return; }
      busy = true; renderLoading(el);
      (STANDALONE ? callDirect(payload) : callServer(payload, force, function (n) {
        var pe = el.querySelector('.ai-progress'); if (pe) pe.textContent = '응답 수신 중 · ' + n.toLocaleString('ko-KR') + '자';
      })).then(function (res) {
        CACHE[sig] = res; renderResult(el, DATA, res);
      }).catch(function (e) { lastText = ''; renderError(el, e.message); })
        .then(function () { busy = false; el.removeAttribute('aria-busy'); });
    });
  }

  // 팝업 안의 버튼 처리(위임)
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-ai]');
    if (!b || !ctx || b.tagName === 'FORM') return;
    var act = b.getAttribute('data-ai');
    if (act === 'retry') run(ctx.el, ctx.DATA, true, ctx.onAuto);
    else if (act === 'auto' && ctx.onAuto) ctx.onAuto();
    else if (act === 'reset-key') { lsSet(KEY_LS, ''); renderSetup(ctx.el); lastText = ''; }
  });
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (!f.matches || !f.matches('form[data-ai="setup"]')) return;
    e.preventDefault();
    lsSet(KEY_LS, f.key.value.trim()); lsSet(MODEL_LS, f.model.value.trim() || DEFAULT_MODEL);
    if (ctx) run(ctx.el, ctx.DATA, true, ctx.onAuto);
  });

  global.AIReport = { run: run, text: function () { return lastText; }, isBusy: function () { return busy; } };
})(window);
