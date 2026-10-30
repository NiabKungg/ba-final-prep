/* ============================================================
   tts.js — ระบบเสียงช่วยอ่าน (Web Speech API + Google TTS ออนไลน์)
   - ปุ่ม 🔊 หน้าทุกหัวข้อใหญ่ (h2), หัวข้อย่อย (h3), กล่องเนื้อหา และข้อสอบ
   - แถบควบคุมลอย: เลือกเสียงไทย/อังกฤษ, ความเร็ว, พัก/เล่นต่อ, หยุด, อ่านทั้งหน้า
   - เอนจิน 2 ทาง:
       1) เสียงในเครื่อง (speechSynthesis) — ถ้าเครื่องมีภาษาไทยจะใช้ทันที (ออฟไลน์ได้)
       2) 🌐 เสียงไทยออนไลน์ (Google TTS) — สำรองเมื่อเครื่องไม่มีเสียงไทย
          ใช้ได้เลยไม่ต้องติดตั้งอะไร (ต้องต่ออินเทอร์เน็ต)
   - อ่านอัตโนมัติแยกภาษาเป็นท่อน ๆ: ท่อนไทยใช้เสียงไทย ท่อนอังกฤษใช้เสียงอังกฤษ
   ============================================================ */
'use strict';
(function () {
  if (!document.querySelector('main.content')) return;

  var LS_KEY = 'ba-prep-tts-v1';
  var THAI_RE = /[\u0E00-\u0E7F]/;
  var EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{FE00}-\u{FE0F}\u{200D}\u{2764}]/gu;
  var GTTS = 'https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&ttsspeed=1&tl=';
  var ONLINE_TH = '__online_th__';
  var ONLINE_EN = '__online_en__';
  var MAXLEN = 170; /* ความยาวสูงสุดต่อท่อนสำหรับ TTS ออนไลน์ */

  var hasLocalTTS = ('speechSynthesis' in window) && typeof SpeechSynthesisUtterance !== 'undefined';
  var state = {
    voiceTh: null, voiceEn: null, rate: 1,
    chunks: [], idx: 0, playing: false, paused: false, stopped: true,
    target: null, label: '', epoch: 0,
    onlineFail: 0,
  };
  var el = {};
  var audio = new Audio();
  audio.preload = 'auto';

  /* ---------- ค่าที่บันทึกไว้ ---------- */
  function loadPrefs() {
    try {
      var p = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      if (p.rate) state.rate = p.rate;
      state._savedTh = p.th || '';
      state._savedEn = p.en || '';
    } catch (e) { /* ข้าม */ }
  }
  function savePrefs() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        th: state.voiceTh || '', en: state.voiceEn || '', rate: state.rate,
      }));
    } catch (e) { /* ข้าม */ }
  }

  /* ---------- รายชื่อเสียงในเครื่อง ---------- */
  function allVoices() {
    if (!hasLocalTTS) return [];
    var vs = speechSynthesis.getVoices();
    var uniq = new Map();
    vs.forEach(function (v) { if (!uniq.has(v.name)) uniq.set(v.name, v); });
    return Array.from(uniq.values());
  }
  function fillSelect(sel, options, savedName) {
    sel.innerHTML = '';
    options.forEach(function (o) {
      var opt = document.createElement('option');
      opt.value = o.value;
      opt.textContent = o.label;
      sel.appendChild(opt);
    });
    if (savedName && options.some(function (o) { return o.value === savedName; })) sel.value = savedName;
  }
  function voiceLabel(v) {
    return (/^th/i.test(v.lang) ? '🇹🇭 ' : '') + v.name + ' (' + v.lang + (v.localService ? '' : ' เน็ต') + ')';
  }
  function refreshVoices() {
    var list = allVoices();
    var th = list.filter(function (v) { return /^th/i.test(v.lang); });
    var en = list.filter(function (v) { return /^en/i.test(v.lang); });
    var rest = list.filter(function (v) { return !/^th/i.test(v.lang) && !/^en/i.test(v.lang); });

    var thOpts = [{ value: ONLINE_TH, label: '🌐 ออนไลน์: Google เสียงไทย (ต้องมีเน็ต)' }]
      .concat(th, en, rest).map(function (o) { return o.value ? o : { value: o.name, label: voiceLabel(o) }; });
    var enOpts = [{ value: ONLINE_EN, label: '🌐 ออนไลน์: Google อังกฤษ (ต้องมีเน็ต)' }]
      .concat(en, th).map(function (o) { return o.value ? o : { value: o.name, label: voiceLabel(o) }; });

    fillSelect(el.selTh, thOpts, state._savedTh);
    fillSelect(el.selEn, enOpts, state._savedEn);

    /* ค่าเริ่มต้น: ถ้าเครื่องมีเสียงไทย → ใช้ของเครื่อง / ไม่มี → ออนไลน์ */
    if (!state._savedTh || !thOpts.some(function (o) { return o.value === state._savedTh; })) {
      el.selTh.value = th.length ? th[0].name : ONLINE_TH;
    }
    if (!state._savedEn || !enOpts.some(function (o) { return o.value === state._savedEn; })) {
      el.selEn.value = en.length ? en[0].name : ONLINE_EN;
    }
    state.voiceTh = el.selTh.value;
    state.voiceEn = el.selEn.value;
    updateHint(th.length > 0);
  }
  function updateHint(hasThaiLocal) {
    if (hasThaiLocal) {
      el.hint.innerHTML = '';
    } else {
      el.hint.innerHTML = 'ℹ️ เครื่องนี้ไม่มีเสียงไทยในตัว — ใช้ตัวเลือก 🌐 ออนไลน์ได้ทันที ' +
        '<span class="tts-more" title="วิธีติดตั้งเสียงไทยในเครื่อง: Windows → Settings › Time &amp; language › Speech › Add voices › Thai · Android → การตั้งค่า › การจัดการ › ข้อความเป็นคำพูด › ติดตั้งข้อมูลเสียงภาษาไทย · iOS → การตั้งค่า › การช่วยการเข้าถึง › เนื้อหาที่พูด › เสียง">(ดูวิธีติดตั้งเสียงไทยถาวร ?)</span>';
    }
  }

  /* ---------- ดึงข้อความจาก DOM ให้อ่านได้ลื่น ---------- */
  var BLOCK_TAGS = { DIV: 1, P: 1, LI: 1, UL: 1, OL: 1, TR: 1, H1: 1, H2: 1, H3: 1, H4: 1, SECTION: 1, FIGURE: 1, FIGCAPTION: 1, BR: 1, SUMMARY: 1, DETAILS: 1, TABLE: 1, BLOCKQUOTE: 1 };
  function extractText(node, out) {
    node.childNodes.forEach(function (n) {
      if (n.nodeType === 3) { out.push(n.textContent); return; }
      if (n.nodeType !== 1) return;
      var tag = n.tagName;
      if (tag === 'SVG') { out.push(' '); return; }           /* ภาพวาด: อ่านเฉพาะคำบรรยายใต้ภาพ (figcaption) */
      if (BLOCK_TAGS[tag]) out.push('\n');
      extractText(n, out);
      if (BLOCK_TAGS[tag]) out.push('\n');
      if (tag === 'TD' || tag === 'TH') out.push(' , ');
      if (tag === 'LI') out.push(' , '); /* จุดพักเสียงเล็ก ๆ หลังแต่ละรายการ */
    });
  }
  function cleanText(root) {
    var clone = root.cloneNode(true);
    /* เอาออก: ปุ่ม ฟอร์ม เส้นทางเดินหน้า-หลัง ฯลฯ */
    clone.querySelectorAll('script, style, input, button, select, label, .tts-btn, .pager, #doneWrap, .tts-bar, .nav, .arrow').forEach(function (n) { n.remove(); });
    /* ข้อสอบที่ยังไม่เฉลย → ไม่อ่านคำอธิบายที่ซ่อน */
    clone.querySelectorAll('.quiz-q:not(.revealed) .explain').forEach(function (n) { n.remove(); });
    /* กล่องพับที่ยังไม่กาง → อ่านแค่หัวเรื่อง */
    clone.querySelectorAll('details:not([open])').forEach(function (d) {
      var s = d.querySelector('summary');
      d.innerHTML = '';
      if (s) d.appendChild(s.cloneNode(true));
    });
    var out = [];
    extractText(clone, out);
    var text = out.join('');
    text = text.replace(EMOJI_RE, ' ');
    text = text.replace(/[\t\r]+/g, ' ');
    text = text.replace(/[ \u00A0]+/g, ' ');
    text = text.replace(/ ,\s*,/g, ' ,');
    text = text.replace(/\s*,\s*\n/g, '\n');
    text = text.replace(/ ?\n ?/g, '\n');
    text = text.replace(/\n{2,}/g, '\n').trim();
    return text;
  }

  /* ---------- หั่นข้อความเป็นท่อน ๆ ---------- */
  function chunkText(text) {
    var parts = text.split(/\n+/).flatMap(function (para) {
      var sents = para.split(/(?<=[\.!?;:ๆ])\s+/);
      var out = [];
      sents.forEach(function (sRaw) {
        var s = sRaw.trim();
        if (!s) return;
        if (s.length <= MAXLEN) { out.push(s); return; }
        var rest = s;
        while (rest.length > MAXLEN) {
          var cut = rest.lastIndexOf(' ', 150);
          if (cut < 50) cut = MAXLEN;
          out.push(rest.slice(0, cut).trim());
          rest = rest.slice(cut).trim();
        }
        if (rest) out.push(rest);
      });
      return out;
    });
    var merged = [];
    parts.forEach(function (p) {
      if (merged.length && (merged[merged.length - 1] + ' ' + p).length <= MAXLEN) {
        merged[merged.length - 1] += ' ' + p;
      } else merged.push(p);
    });
    return merged.filter(Boolean).map(function (t) { return { text: t, thai: THAI_RE.test(t) }; });
  }

  /* ---------- เริ่มอ่าน ---------- */
  /* build = element หรือ function ที่คืน element สด ๆ (เรียกตอนกดปุ่ม เพื่อให้ได้
     สถานะล่าสุดของหน้า เช่น details ที่เพิ่งกาง/ข้อสอบที่เพิ่งเฉลย) */
  function startRead(build, label, startIdx, key) {
    var target = typeof build === 'function' ? build() : build;
    var text = cleanText(target);
    if (!text) { setStatus('ไม่พบข้อความให้อ่าน'); return; }
    stopAudio();
    if (hasLocalTTS) speechSynthesis.cancel();
    state.epoch += 1;
    state.stopped = false; state.playing = true; state.paused = false;
    state.build = typeof build === 'function' ? build : null;
    state.key = key || target;
    state.label = label;
    state.chunks = chunkText(text);
    state.idx = Math.min(startIdx || 0, Math.max(0, state.chunks.length - 1));
    var anchor = target.__anchor || target;
    markReading(anchor);
    if (!startIdx) {
      try { anchor.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { /* ข้าม */ }
    }
    el.pauseBtn.textContent = '⏸ พัก';
    speakChunk(state.idx, state.epoch);
  }

  function speakChunk(i, epoch) {
    if (state.stopped || epoch !== state.epoch) return;
    if (i >= state.chunks.length) { finish(); return; }
    state.idx = i;
    var c = state.chunks[i];
    setStatus('กำลังอ่าน (' + (i + 1) + '/' + state.chunks.length + '): ' + state.label);
    var vSel = c.thai ? state.voiceTh : state.voiceEn;
    var useOnline = (vSel === ONLINE_TH) || (vSel === ONLINE_EN) || !hasLocalTTS;
    if (useOnline) speakOnline(c, vSel, epoch);
    else speakLocal(c, vSel, epoch);
  }

  /* ---- เอนจินที่ 1: เสียงในเครื่อง ---- */
  function speakLocal(c, voiceName, epoch) {
    var u = new SpeechSynthesisUtterance(c.text);
    var v = allVoices().find(function (x) { return x.name === voiceName; });
    if (v) u.voice = v;
    u.lang = c.thai ? 'th-TH' : 'en-US';
    u.rate = state.rate;
    u.onend = function () {
      if (epoch !== state.epoch || state.stopped || state.paused) return;
      setTimeout(function () { speakChunk(state.idx + 1, epoch); }, 60);
    };
    u.onerror = function (e) {
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      /* เสียงในเครื่องพังกลางทาง → สลับไปออนไลน์ให้ท่อนนี้ */
      if (epoch === state.epoch && !state.stopped) speakOnline(c, c.thai ? ONLINE_TH : ONLINE_EN, epoch);
    };
    speechSynthesis.speak(u);
  }

  /* ---- เอนจินที่ 2: Google TTS ออนไลน์ (รองรับภาษาไทย) ---- */
  function speakOnline(c, voiceSel, epoch) {
    var lang = voiceSel === ONLINE_EN ? 'en' : (c.thai ? 'th' : 'en');
    var url = GTTS + lang + '&q=' + encodeURIComponent(c.text);
    audio.playbackRate = state.rate;
    audio.oncanplaythrough = null;
    audio.onloadeddata = function () {
      if (epoch !== state.epoch || state.stopped) return;
      audio.play().catch(function () {
        /* เบราว์เซอร์บล็อกเสียงอัตโนมัติ (ไม่มีการกดจริง) — แจ้งผู้ใช้ให้กดอีกครั้ง */
        if (epoch === state.epoch && !state.stopped) {
          setStatus('⏳ เสียงถูกเบราว์เซอร์รักษาความปลอดภัย — กดปุ่ม 🔊 ฟัง อีกครั้งเพื่อเล่นเสียง');
        }
      });
    };
    audio.onerror = function () {
      if (epoch !== state.epoch || state.stopped) return;
      state.onlineFail += 1;
      setStatus('⚠️ โหลดเสียงออนไลน์ไม่ได้ (ท่อน ' + (state.idx + 1) + ') — ตรวจอินเทอร์เน็ต หรือเลือกเสียงอื่น');
      setTimeout(function () {
        if (epoch === state.epoch && !state.stopped) speakChunk(state.idx + 1, epoch);
      }, 900);
    };
    audio.onended = function () {
      if (epoch !== state.epoch || state.stopped || state.paused) return;
      setTimeout(function () { speakChunk(state.idx + 1, epoch); }, 120);
    };
    audio.src = url;
    audio.load();
  }

  function stopAudio() {
    audio.onended = audio.onerror = audio.onloadeddata = null;
    audio.pause();
    audio.removeAttribute('src');
    try { audio.load(); } catch (e) { /* ข้าม */ }
  }
  function stopAll() {
    state.epoch += 1;
    state.stopped = true; state.playing = false; state.paused = false;
    stopAudio();
    if (hasLocalTTS) speechSynthesis.cancel();
    clearReading();
    setStatus('หยุดแล้ว');
    el.pauseBtn.textContent = '⏸ พัก';
  }
  function togglePause() {
    if (!state.playing) return;
    if (state.paused) {
      state.paused = false;
      el.pauseBtn.textContent = '⏸ พัก';
      setStatus('กำลังอ่าน: ' + state.label);
      if (audio.src) { audio.play().catch(function () {}); }
      if (hasLocalTTS) speechSynthesis.resume();
    } else {
      state.paused = true;
      el.pauseBtn.textContent = '▶ เล่นต่อ';
      setStatus('พักการอ่านอยู่');
      if (audio.src) audio.pause();
      if (hasLocalTTS) speechSynthesis.pause();
    }
  }
  function finish() {
    state.playing = false; state.paused = false; state.stopped = true;
    clearReading();
    setStatus('อ่านจบแล้ว ✓');
    el.pauseBtn.textContent = '⏸ พัก';
  }
  function setStatus(t) { el.status.textContent = t; }
  function markReading(t) { clearReading(); t.classList.add('tts-reading'); }
  function clearReading() {
    document.querySelectorAll('.tts-reading').forEach(function (n) { n.classList.remove('tts-reading'); });
  }

  /* ---------- ปุ่ม 🔊 ---------- */
  function makeBtn(key, build, label) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'tts-btn';
    b.textContent = '🔊 ฟัง';
    b.setAttribute('aria-label', 'อ่านออกเสียง: ' + label);
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      e.preventDefault();
      if (state.playing && state.key === key) stopAll();
      else startRead(build, label, 0, key);
    });
    return b;
  }
  /* เนื้อหาของหัวข้อ = โหนดทั้งหมดถัดจากหัวเรื่อง จนถึงหัวเรื่องระดับเดียวกัน/สูงกว่า */
  function sectionContent(h, stopTags) {
    var box = document.createElement('div');
    var node = h.nextElementSibling;
    while (node && stopTags.indexOf(node.tagName) === -1) {
      box.appendChild(node.cloneNode(true));
      node = node.nextElementSibling;
    }
    var head = document.createElement(h.tagName);
    head.textContent = h.textContent;
    box.prepend(head);
    return box;
  }
  function injectButtons() {
    var main = document.querySelector('main.content');
    if (!main) return;
    /* h2 = section ใหญ่ — สร้างเนื้อหาสดใหม่ทุกครั้งที่กด (ได้สถานะ details/เฉลยล่าสุด) */
    main.querySelectorAll('h2').forEach(function (h2) {
      var name = h2.textContent.replace(EMOJI_RE, '').trim().slice(0, 60);
      h2.appendChild(makeBtn(h2, function () {
        var box = sectionContent(h2, ['H1', 'H2']);
        box.__anchor = h2;
        return box;
      }, name));
    });
    /* h3 = หัวข้อย่อย */
    main.querySelectorAll('h3').forEach(function (h3) {
      var name = h3.textContent.replace(EMOJI_RE, '').trim().slice(0, 60);
      h3.appendChild(makeBtn(h3, function () {
        var box = sectionContent(h3, ['H1', 'H2', 'H3']);
        box.__anchor = h3;
        return box;
      }, name));
    });
    /* กล่องเนื้อหา (.box) */
    main.querySelectorAll('.box .box-title').forEach(function (t) {
      var boxEl = t.closest('.box');
      var name = t.textContent.replace(EMOJI_RE, '').trim().slice(0, 50);
      t.appendChild(makeBtn(boxEl, boxEl, name));
    });
    /* การ์ดข้อสอบ (.quiz-q) */
    main.querySelectorAll('.quiz-q .q-text').forEach(function (q) {
      var card = q.closest('.quiz-q');
      q.appendChild(makeBtn(card, q.textContent.replace(EMOJI_RE, '').trim().slice(0, 50)));
    });
    /* การ์ดโจทย์คลังควิซ (.qw-item) */
    main.querySelectorAll('.qw-item .qw-text').forEach(function (q) {
      var card = q.closest('.qw-item');
      var label = q.textContent.replace(EMOJI_RE, '').trim().slice(0, 50);
      q.appendChild(makeBtn(card, card, label));
    });
    /* ตัวอย่างโจทย์ละเอียด (.steps) */
    main.querySelectorAll('ol.steps').forEach(function (s) {
      s.parentNode.insertBefore(makeBtn(s, s, 'ขั้นตอนทำโจทย์'), s);
    });
  }

  /* ---------- แถบควบคุมลอย ---------- */
  function buildBar() {
    var bar = document.createElement('div');
    bar.className = 'tts-bar';
    bar.innerHTML =
      '<div class="tts-bar-head">' +
      '  <span class="tts-bar-title">🔊 เสียงช่วยอ่าน</span>' +
      '  <button type="button" class="tts-fold" aria-label="ย่อ/กางแถบควบคุม">▾</button>' +
      '</div>' +
      '<div class="tts-bar-body">' +
      '  <div class="tts-status" role="status">พร้อม — กดปุ่ม 🔊 ฟัง ที่หัวข้อที่ต้องการฟัง</div>' +
      '  <div class="tts-row">' +
      '    <label>เสียงไทย <select class="tts-vth" id="tts-vth" aria-label="เลือกเสียงภาษาไทย"></select></label>' +
      '    <label>เสียงอังกฤษ <select class="tts-ven" id="tts-ven" aria-label="เลือกเสียงภาษาอังกฤษ"></select></label>' +
      '  </div>' +
      '  <div class="tts-row">' +
      '    <label>ความเร็ว' +
      '      <select class="tts-rate" id="tts-rate" aria-label="เลือกความเร็วการอ่าน">' +
      '        <option value="0.75">ช้า 0.75×</option>' +
      '        <option value="0.9">ช้านิด 0.9×</option>' +
      '        <option value="1" selected>ปกติ 1×</option>' +
      '        <option value="1.15">เร็วนิด 1.15×</option>' +
      '        <option value="1.3">เร็ว 1.3×</option>' +
      '        <option value="1.5">เร็วมาก 1.5×</option>' +
      '      </select>' +
      '    </label>' +
      '    <button type="button" class="tts-pause">⏸ พัก</button>' +
      '    <button type="button" class="tts-stop">⏹ หยุด</button>' +
      '    <button type="button" class="tts-all">📖 อ่านทั้งหน้า</button>' +
      '  </div>' +
      '  <div class="tts-hint"></div>' +
      '</div>';
    document.body.appendChild(bar);
    el.bar = bar;
    el.status = bar.querySelector('.tts-status');
    el.hint = bar.querySelector('.tts-hint');
    el.selTh = bar.querySelector('.tts-vth');
    el.selEn = bar.querySelector('.tts-ven');
    el.selRate = bar.querySelector('.tts-rate');
    el.pauseBtn = bar.querySelector('.tts-pause');
    bar.querySelector('.tts-fold').addEventListener('click', function () { bar.classList.toggle('min'); });
    el.pauseBtn.addEventListener('click', togglePause);
    bar.querySelector('.tts-stop').addEventListener('click', stopAll);
    bar.querySelector('.tts-all').addEventListener('click', function () {
      if (state.playing && state.key === '__all__') stopAll();
      else startRead(function () { return document.querySelector('main.content'); }, 'ทั้งหน้า', 0, '__all__');
    });
    el.selRate.value = String(state.rate);
    el.selRate.addEventListener('change', function () {
      state.rate = parseFloat(el.selRate.value) || 1;
      savePrefs();
      audio.playbackRate = state.rate;
      /* ถ้ากำลังอ่านอยู่ รีสตาร์ต "ท่อนปัจจุบัน" ให้ความเร็วใหม่มีผลทันที */
      if (state.playing && !state.paused && state.build) {
        startRead(state.build, state.label, state.idx, state.key);
      }
    });
    el.selTh.addEventListener('change', function () { state.voiceTh = el.selTh.value; savePrefs(); });
    el.selEn.addEventListener('change', function () { state.voiceEn = el.selEn.value; savePrefs(); });
  }

  /* ---------- เริ่มทำงาน ---------- */
  loadPrefs();
  buildBar();
  injectButtons();
  if (hasLocalTTS) {
    refreshVoices();
    if (typeof speechSynthesis.addEventListener === 'function') {
      speechSynthesis.addEventListener('voiceschanged', refreshVoices);
    } else {
      speechSynthesis.onvoiceschanged = refreshVoices;
    }
    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      if (allVoices().length || tries > 10) clearInterval(timer);
      else refreshVoices();
    }, 400);
  } else {
    refreshVoices();
  }
  window.addEventListener('beforeunload', function () {
    stopAudio();
    if (hasLocalTTS) speechSynthesis.cancel();
  });
})();
