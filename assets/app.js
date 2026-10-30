/* ============ BA Final Exam Prep — สคริปต์หลัก ============ */
(function () {
  'use strict';

  /* ---------- รายชื่อบท (ชื่อไฟล์ไม่รวม .html) ---------- */
  const CHAPTERS = [
    { file: '01-intro-business',      num: '01', title: 'พื้นฐานธุรกิจ & ความต้องการธุรกิจ', group: 'g1' },
    { file: '02-ba-role-bok',         num: '02', title: 'บทบาท Business Analyst & BOK',    group: 'g1' },
    { file: '03-five-models',         num: '03', title: '5 Aspects of Business Models',     group: 'g1' },
    { file: '04-types-of-bpm',        num: '04', title: 'Types of BPM & PPT & VA/BVA/NVA',  group: 'g2' },
    { file: '05-process-discovery',   num: '05', title: 'Process Discovery & คุณภาพโมเดล',  group: 'g2' },
    { file: '06-bpmn',                num: '06', title: 'BPMN — สอบเขียนข้อ 1',             group: 'g2' },
    { file: '07-sequence-diagram',    num: '07', title: 'Sequence Diagram',                 group: 'g2' },
    { file: '08-business-rules',      num: '08', title: 'Business Rules vs Processes',      group: 'g2' },
    { file: '09-process-analysis',    num: '09', title: 'Qualitative Process Analysis',     group: 'g3' },
    { file: '10-process-redesign',    num: '10', title: 'Process Redesign — สอบเขียนข้อ 2', group: 'g3' },
    { file: '11-time-calculation',    num: '11', title: 'การคำนวณเวลา — สอบเขียนข้อ 3',     group: 'g3' },
    { file: '12-elicitation',         num: '12', title: 'Elicitation Techniques',           group: 'g4' },
    { file: '13-business-requirements', num: '13', title: 'Business Requirements & Vision-Scope', group: 'g4' },
    { file: '14-voice-of-user',       num: '14', title: 'Voice of the User & User Classes', group: 'g4' },
    { file: '15-user-requirements',   num: '15', title: 'User Requirements: UC vs User Story', group: 'g4' },
    { file: '16-use-case-modeling',   num: '16', title: 'Use Case Modeling (UML)',          group: 'g4' },
    { file: '17-functional-requirements', num: '17', title: 'Functional Requirements & SRS & EARS', group: 'g4' },
    { file: '18-non-functional',      num: '18', title: 'Non-Functional Requirements',      group: 'g4' },
    { file: '19-hedgehog-continuum',  num: '19', title: 'Hedgehog & Requirement Continuum', group: 'g4' },
    { file: '20-exam-central',        num: '20', title: '🎯 ศูนย์กลางติวสอบ Final',        group: 'g5' },
    { file: '21-quiz-walkthrough',    num: '21', title: '📋 คลังโจทย์ควิซ 8-11 (เรียงทุกข้อ)', group: 'g5' },
  ];

  const GROUPS = {
    g1: 'ส่วนที่ 1 · ธุรกิจ & บทบาท BA',
    g2: 'ส่วนที่ 2 · Business Process Management',
    g3: 'ส่วนที่ 3 · วิเคราะห์ & ปรับปรุงกระบวนการ',
    g4: 'ส่วนที่ 4 · Requirements Engineering',
    g5: 'ส่วนที่ 5 · ติวสอบ',
  };

  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));

  /* ---------- หาไฟล์ปัจจุบัน ---------- */
  function currentFile() {
    const p = location.pathname.split('/').pop() || 'index.html';
    return p.replace(/\.html$/i, '');
  }

  /* ---------- localStorage progress ---------- */
  const KEY = 'ba-prep-done-v1';
  function loadDone() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveDone(o) {
    try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {}
  }

  /* ---------- สร้าง sidebar ---------- */
  function buildSidebar() {
    const sb = $('#sidebar');
    if (!sb) return;
    const cur = currentFile();
    let html = `
      <div class="brand">
        <div class="logo">BA</div>
        <div><b>BPM69 Final Prep</b><span>Business Analysis & Process Management</span></div>
      </div>
      <nav>`;
    let lastGroup = null;
    CHAPTERS.forEach(ch => {
      if (ch.group !== lastGroup) {
        html += `<div class="nav-group-title">${GROUPS[ch.group]}</div>`;
        lastGroup = ch.group;
      }
      const active = ch.file === cur ? ' class="active"' : '';
      html += `<a href="${ch.file}.html"${active}><span class="num">${ch.num}</span><span>${ch.title}</span></a>`;
    });
    html += `<div class="nav-group-title">อื่น ๆ</div>
      <a href="index.html"><span class="num">🏠</span><span>หน้าแรก / สารบัญ</span></a>
      </nav>`;
    sb.innerHTML = html;
  }

  /* ---------- ปุ่มเมนูมือถือ ---------- */
  function setupNav() {
    const burger = $('#burger'), overlay = $('#overlay');
    if (!burger) return;
    const close = () => document.body.classList.remove('nav-open');
    burger.addEventListener('click', () => document.body.classList.toggle('nav-open'));
    if (overlay) overlay.addEventListener('click', close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    $$('#sidebar a').forEach(a => a.addEventListener('click', close));
  }

  /* ---------- topbar breadcrumb ---------- */
  function buildCrumb() {
    const crumb = $('#crumb');
    if (!crumb) return;
    const cur = currentFile();
    const ch = CHAPTERS.find(c => c.file === cur);
    crumb.innerHTML = ch
      ? `<b>บทที่ ${ch.num}</b> · ${ch.title}`
      : `<b>หน้าแรก</b> · สารบัญทั้งหมด`;
  }

  /* ---------- pager ก่อนหน้า/ถัดไป ---------- */
  function buildPager() {
    const pager = $('#pager');
    if (!pager) return;
    const cur = currentFile();
    const i = CHAPTERS.findIndex(c => c.file === cur);
    if (i === -1) return;
    let html = '';
    if (i > 0) {
      const p = CHAPTERS[i - 1];
      html += `<a class="prev" href="${p.file}.html"><span class="dir">← บทก่อนหน้า</span><span class="ttl">${p.num}. ${p.title}</span></a>`;
    }
    if (i < CHAPTERS.length - 1) {
      const n = CHAPTERS[i + 1];
      html += `<a class="next" href="${n.file}.html"><span class="dir">บทถัดไป →</span><span class="ttl">${n.num}. ${n.title}</span></a>`;
    }
    pager.innerHTML = html;
  }

  /* ---------- ปุ่ม "อ่านแล้ว" ---------- */
  function setupDoneButton() {
    const btn = $('#doneBtn'), wrap = $('#doneWrap');
    if (!btn || !wrap) return;
    const cur = currentFile();
    const done = loadDone();
    const paint = () => {
      if (done[cur]) { btn.textContent = '✓ อ่านบทนี้แล้ว (กดเพื่อยกเลิก)'; btn.style.background = '#16a34a'; btn.style.color = '#fff'; }
      else { btn.textContent = '☑ ทำเครื่องหมายว่าอ่านแล้ว'; btn.style.background = ''; btn.style.color = ''; }
    };
    btn.addEventListener('click', () => {
      done[cur] = !done[cur];
      saveDone(done); paint(); markSidebarDone();
    });
    paint();
  }

  function markSidebarDone() {
    const done = loadDone();
    $$('#sidebar nav a').forEach(a => {
      const f = a.getAttribute('href').replace(/\.html$/, '');
      a.classList.toggle('done', !!done[f]);
    });
  }

  /* ---------- progress bar (หน้าแรก) ---------- */
  function setupHomeProgress() {
    const bar = $('#homeProgressBar'), label = $('#homeProgressLabel');
    if (!bar) return;
    const done = loadDone();
    const n = CHAPTERS.filter(c => done[c.file]).length;
    const pct = Math.round(n / CHAPTERS.length * 100);
    bar.style.width = pct + '%';
    label.textContent = `อ่านไปแล้ว ${n} / ${CHAPTERS.length} บท (${pct}%)`;
  }

  /* ---------- home: ปุ่ม resume ---------- */
  function setupResume() {
    const btn = $('#resumeBtn');
    if (!btn) return;
    const done = loadDone();
    const next = CHAPTERS.find(c => !done[c.file]) || CHAPTERS[0];
    btn.textContent = done && Object.keys(done).length
      ? `▶ ไปต่อบทถัดไป: ${next.num}. ${next.title}`
      : '▶ เริ่มอ่านบทแรก: 01. พื้นฐานธุรกิจ';
    btn.href = next.file + '.html';
  }

  /* ---------- interactive quiz ---------- */
  function setupQuiz() {
    $$('.quiz-q').forEach(q => {
      $$('.opt', q).forEach(btn => {
        btn.addEventListener('click', () => {
          if (q.classList.contains('revealed')) return;
          const correct = btn.getAttribute('data-c') === '1';
          btn.classList.add(correct ? 'correct' : 'wrong');
          if (!correct) {
            $$('.opt', q).forEach(b => { if (b.getAttribute('data-c') === '1') b.classList.add('correct'); });
          }
          q.classList.add('revealed');
        });
      });
    });
  }

  /* ---------- init ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    buildSidebar();
    setupNav();
    buildCrumb();
    buildPager();
    setupDoneButton();
    markSidebarDone();
    setupHomeProgress();
    setupResume();
    setupQuiz();
  });
})();
