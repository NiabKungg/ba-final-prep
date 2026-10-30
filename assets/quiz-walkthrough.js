/* ============================================================
   quiz-walkthrough.js — เรนเดอร์คลังโจทย์ควิซ 8-11 จาก quiz-data.js
   - โจทย์ซ้าย (ตัวเลือกพร้อมเครื่องหมายถูก) / ความรู้ขวา
   - ตัวกรองตามควิซ + โหมดซ่อนคำตอบฝึกทำเอง
   ============================================================ */
'use strict';
(function () {
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function render() {
    var list = document.getElementById('quizList');
    if (!list || typeof QUIZ_DATA === 'undefined') return;
    var total = 0;
    QUIZ_DATA.forEach(function (qz) {
      qz.qs.forEach(function (q, i) {
        total += 1;
        var art = el('article', 'qw-item');
        art.dataset.quiz = String(qz.quiz);
        art.id = 'qz' + qz.quiz + '-' + (i + 1);

        /* ---------- ฝั่งโจทย์ ---------- */
        var left = el('div', 'qw-q');
        var meta = el('div', 'qw-meta');
        meta.append(
          el('span', 'qw-badge', 'Quiz ' + qz.quiz + ' · ' + qz.title),
          el('span', 'qw-pts', 'ข้อ ' + (i + 1) + ' · ' + q.pts + (q.pts > 1 ? ' คะแนน' : ' คะแนน'))
        );
        left.append(meta);
        left.append(el('p', 'qw-text', q.q));

        var ol = el('ol', 'qw-opts');
        var nOk = 0;
        q.opts.forEach(function (o, oi) {
          var li = el('li', o[1] ? 'ok' : 'no');
          li.append(el('span', 'qw-idx', String(oi + 1)));
          li.append(el('span', 'qw-opt', o[0]));
          if (o[1]) { li.append(el('span', 'mark', '✓ คำตอบ')); nOk += 1; }
          ol.append(li);
        });
        left.append(ol);
        left.append(el('p', 'qw-ansline', '✔ เลือก ' + nOk + ' คำตอบ: ข้อ ' +
          q.opts.map(function (o, oi) { return o[1] ? (oi + 1) : null; }).filter(Boolean).join(', ')));

        /* ---------- ฝั่งความรู้ ---------- */
        var right = el('aside', 'qw-know');
        right.append(el('div', 'know-title', '🧠 ความรู้ที่ใช้ทำข้อนี้'));
        right.append(el('p', null, q.know));
        if (q.link) {
          var a = el('a', 'know-link', '📖 อ่านละเอียดเพิ่มใน ' + (q.linkName || 'บทเรียนที่เกี่ยวข้อง'));
          a.href = q.link;
          right.append(a);
        }
        art.append(left, right);
        list.append(art);
      });
      /* หัวข้อคั่นชื่อควิซ — ใส่ไว้ก่อนข้อแรกของควิซนั้น */
    });
    var lbl = document.getElementById('qwTotal');
    if (lbl) lbl.textContent = total + ' ข้อ (ควิซ 8: 10 · ควิซ 9: 13 · ควิซ 10: 10 · ควิซ 11: 10)';

    /* แทรกหัวข้อคั่นระหว่างควิซ */
    var sections = [];
    QUIZ_DATA.forEach(function (qz) {
      var first = list.querySelector('.qw-item[data-quiz="' + qz.quiz + '"]');
      if (first) sections.push({ qz: qz, node: first });
    });
    sections.forEach(function (s) {
      var h = el('h2', 'qw-sep', '📝 Quiz ' + s.qz.quiz + ' — ' + s.qz.title);
      h.id = 'quiz' + s.qz.quiz;
      s.node.parentNode.insertBefore(h, s.node);
    });
  }

  /* ---------- ตัวกรอง ---------- */
  function setupFilters() {
    var bar = document.getElementById('qwFilters');
    var list = document.getElementById('quizList');
    if (!bar || !list) return;
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-q]');
      if (!b) return;
      bar.querySelectorAll('button').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      var q = b.getAttribute('data-q');
      list.querySelectorAll('.qw-item').forEach(function (item) {
        item.style.display = (q === 'all' || item.dataset.quiz === q) ? '' : 'none';
      });
      list.querySelectorAll('.qw-sep').forEach(function (h) {
        var quiz = h.id.replace('quiz', '');
        var any = list.querySelector('.qw-item[data-quiz="' + quiz + '"]:not([style*="none"])');
        h.style.display = any ? '' : 'none';
      });
    });
    /* โหมดซ่อนคำตอบ */
    var hideBtn = document.getElementById('qwHide');
    if (hideBtn) {
      hideBtn.addEventListener('click', function () {
        list.classList.toggle('hide-ans');
        hideBtn.textContent = list.classList.contains('hide-ans')
          ? '👁️ แสดงคำตอบ (กำลังซ่อน — ลองทำเองก่อน!)'
          : '🙈 ซ่อนคำตอบ (ฝึกทำเอง)';
      });
    }
  }

  /* สคริปต์โหลดท้าย body → แสดงผลทันที เพื่อให้ tts.js (โหลดถัดไป) เห็นโจทย์ครบก่อนใส่ปุ่ม 🔊 */
  render();
  setupFilters();
})();
