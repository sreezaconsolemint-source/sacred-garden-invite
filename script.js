/* The Sacred Garden — invitation runtime: fills data, envelope intro, music, countdown, timeline, RSVP. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var Q = new URLSearchParams(location.search);
  var PREVIEW = Q.has('preview'), SKIP = Q.has('skip') || PREVIEW, MUSIC_OFF = Q.get('music') === '0';
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  function parseDate(s) { var m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(s || ''); return m ? new Date(+m[1], m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)) : null; }
  function fmtTime(t) { var m = /^(\d{1,2}):(\d{2})/.exec(t || ''); if (!m) return t || ''; var h = +m[1], ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + (m[2] !== '00' ? ':' + m[2] : '') + ' ' + ap; }

  function derive(d) {
    var o = Object.assign({}, d), dt = parseDate(d.event_date);
    o.date_short = dt ? pad(dt.getDate()) + '.' + pad(dt.getMonth() + 1) + '.' + String(dt.getFullYear()).slice(2) : '';
    var g = (d.groom_name || '').trim(), b = (d.bride_name || '').trim();
    o.names_and = g && b ? g + ' and ' + b : g || b;
    o.monogram = (g ? g.charAt(0).toUpperCase() : '') + (g && b ? '&' : '') + (b ? b.charAt(0).toUpperCase() : '');
    var rb = parseDate(d.rsvp_deadline); o.rsvp_by = rb ? 'Kindly reply before ' + MONTHS[rb.getMonth()] + ' ' + pad(rb.getDate()) : '';
    return o;
  }

  function fitNames() {
    $$('.hero-names .fit').forEach(function (s) {
      s.style.fontSize = ''; if (!s.textContent) return;
      var max = Math.min(document.documentElement.clientWidth, 450) - 24, r = document.createRange(); r.selectNodeContents(s);
      var w = r.getBoundingClientRect().width; if (w > max) s.style.fontSize = Math.max(30, Math.floor(80 * max / w)) + 'px';
    });
  }
  function render(d) {
    $$('[data-bind]').forEach(function (el) {
      var k = el.getAttribute('data-bind'), v = d[k];
      v = v == null ? '' : String(v).trim();
      if (v && el.hasAttribute('data-prefix')) v = el.getAttribute('data-prefix') + v;
      if (el.hasAttribute('data-ml')) el.innerHTML = esc(v).replace(/\n/g, '<br>'); else el.textContent = v;
      if (el.hasAttribute('data-opt')) el.hidden = !v;
    });
    $$('[data-src-k]').forEach(function (el) { var v = d[el.getAttribute('data-src-k')]; if (v) el.src = v; });
    document.title = (d.names_and ? d.names_and.replace(' and ', ' & ') + ' — ' : '') + 'Wedding Invitation';

    /* names: shrink very long names so they never overflow the screen */
    fitNames();

    /* timeline */
    var tl = $('#tl'), evs = (d.events || []).filter(function (e) { return e && (e.name || e.time); });
    $$('.tl__dot,.tl__time,.tl__name', tl).forEach(function (n) { n.remove(); });
    var OFF = [0, 82, 159, 236, 314], dotTop = function (i) { return 161 + (i < 5 ? OFF[i] : 314 + (i - 4) * 78); };
    evs.forEach(function (e, i) {
      var y = dotTop(i), dot = document.createElement('div'); dot.className = 'tl__dot'; dot.style.top = y + 'px'; tl.appendChild(dot);
      var t = document.createElement('div'); t.className = 'tl__time'; t.setAttribute('data-anim', 'fadein'); t.style.cssText = 'top:' + (y - 19.5) + 'px;--dur:1.5s;--delay:' + (Math.min(i, 4) * 0.1) + 's'; t.textContent = fmtTime(e.time); tl.appendChild(t);
      var n = document.createElement('div'); n.className = 'tl__name'; n.setAttribute('data-anim', 'fadein'); n.style.cssText = '--dur:1.5s;--delay:' + (Math.min(i, 4) * 0.1) + 's'; n.textContent = e.name || ''; tl.appendChild(n);
      n.style.top = (y + 4 - n.offsetHeight / 2) + 'px';
    });
    var last = evs.length ? dotTop(evs.length - 1) : 161;
    $('#tlLine').style.height = (last - 161 + 7) + 'px';
    $('#tlLine').hidden = $('#tlRose').hidden = evs.length < 1;
    $('#tlRose').dataset.travel = last - 161;
    var sh = Math.max(570, last + 95); $('#s-sched').style.height = sh + 'px'; $('.paper--sched').style.height = (sh + 30) + 'px';
    $('#s-sched').hidden = !evs.length && !d.schedule_title;

    /* notes */
    ['dress_code', 'gift_note'].forEach(function (k) { $('[data-opt-wrap="' + k + '"]').hidden = !d[k]; });
    var notesOn = !!(d.dress_code || d.gift_note); $('#s-notes').hidden = !notesOn;
    if (notesOn) { var nh = $('#notes').offsetHeight; $('#s-notes').style.height = Math.max(300, 92 + nh + 96) + 'px'; $('.paper--notes').style.height = Math.max(260, 92 + nh + 96 - 39) + 'px'; }

    /* venue & map */
    var hasVenue = !!(d.venue || d.venue_address);
    $('#s-loc').hidden = $('#s-map').hidden = !hasVenue;
    if (hasVenue) {
      var q = encodeURIComponent([d.venue, d.venue_address].filter(Boolean).join(', '));
      var mf = $('#mapFrame'), src = 'https://maps.google.com/maps?q=' + q + '&z=15&output=embed';
      if (mf.getAttribute('src') !== src) mf.setAttribute('src', src);
      $('#mapOpen').href = d.venue_map_url || '#'; $('#mapOpen').hidden = !d.venue_map_url;
    }
    $('#rsvpOpen').hidden = $('.rsvp-chev').hidden = $('.rsvp-click').hidden = false;
    $('#credit').hidden = !d.music_url;
  }

  /* ---------- entrance animations ---------- */
  function observe() {
    $$('[data-anim]').forEach(function (el) {
      var s = el.style; if (el.dataset.dur) s.setProperty('--dur', el.dataset.dur + 's'); if (el.dataset.delay) s.setProperty('--delay', el.dataset.delay + 's');
      if (el.dataset.dist) s.setProperty('--dist', el.dataset.dist + 'px'); if (el.dataset.scale) s.setProperty('--scale', el.dataset.scale);
    });
    if (!('IntersectionObserver' in window)) { $$('[data-anim]').forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    $$('[data-anim]').forEach(function (e) { io.observe(e); });
    var io2 = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add(e.target.id === 's-count' ? 'x' : 'seen'); if (e.target.id === 's-count') $('#cd').classList.add('on'); io2.unobserve(e.target); } }); }, { threshold: 0.25 });
    io2.observe($('#s-loc')); io2.observe($('#s-count'));
  }

  /* ---------- rose that walks down the timeline with scroll ---------- */
  function roseLoop() {
    var rose = $('#tlRose'), sec = $('#s-sched'), ticking = false;
    function upd() {
      ticking = false; var travel = +rose.dataset.travel || 0, r = sec.getBoundingClientRect();
      var start = window.innerHeight * 0.72, p = (start - (r.top + 140)) * 0.78;
      rose.style.transform = 'translateY(' + Math.max(0, Math.min(travel, p)) + 'px)';
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
    window.addEventListener('resize', upd); upd();
  }

  /* ---------- countdown with flip ---------- */
  function countdown(d) {
    var target = parseDate(d.event_date), box = $('#cd'), done = $('#cdDone');
    if (!target) { box.hidden = true; $('.s-count .sec-title').hidden = true; $('#s-count').hidden = true; return; }
    var prev = {};
    function set(id, v) {
      var n = $('#' + id + ' .cd__n'); v = pad(v);
      if (prev[id] === undefined) { n.textContent = v; prev[id] = v; return; }
      if (prev[id] === v) return; prev[id] = v;
      n.classList.add('out');
      setTimeout(function () { n.textContent = v; n.classList.remove('out'); n.classList.add('in'); void n.offsetWidth; n.classList.remove('in'); }, 280);
    }
    function tick() {
      var ms = target - new Date();
      if (ms <= 0) { box.hidden = true; done.hidden = false; return; }
      var s = Math.floor(ms / 1000);
      set('cd-d', Math.floor(s / 86400)); set('cd-h', Math.floor(s % 86400 / 3600)); set('cd-m', Math.floor(s % 3600 / 60)); set('cd-s', s % 60);
    }
    tick(); setInterval(tick, 1000);
  }

  /* ---------- music ---------- */
  var audio = $('#bgm'), btn = $('#audioBtn');
  function setMusic(d) {
    if (!d.music_url || MUSIC_OFF) { btn.remove(); return false; }
    audio.src = d.music_url; return true;
  }
  function play() { var p = audio.play(); if (p && p.catch) p.catch(function () { btn.classList.add('paused'); }); }
  btn.addEventListener('click', function () { if (audio.paused) { play(); btn.classList.remove('paused'); btn.setAttribute('aria-label', 'Pause music'); } else { audio.pause(); btn.classList.add('paused'); btn.setAttribute('aria-label', 'Play music'); } });

  /* ---------- envelope intro ---------- */
  function reveal() { document.body.classList.remove('is-locked'); document.body.classList.add('revealed'); if (btn.isConnected && audio.src) btn.classList.add('show'); }
  function intro(hasMusic) {
    var el = $('#intro'), started = false;
    if (SKIP) { el.remove(); reveal(); return; }
    function open() {
      if (started) return; started = true;
      el.classList.add('opening'); if (hasMusic) { audio.volume = 1; play(); }
      setTimeout(function () { el.classList.add('gone'); reveal(); }, 3200);
      setTimeout(function () { el.remove(); }, 4700);
    }
    el.addEventListener('click', open);
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  }

  /* ---------- RSVP popup -> WhatsApp ---------- */
  function rsvp(d) {
    var pop = $('#pop'), f = $('#rsvpForm');
    function openPop() { pop.hidden = false; document.body.style.overflow = 'hidden'; $('#popOk').hidden = true; }
    function close() { pop.hidden = true; document.body.style.overflow = ''; }
    $('#rsvpOpen').addEventListener('click', openPop);
    $('#popX').addEventListener('click', close);
    pop.addEventListener('click', function (e) { if (e.target === pop) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !pop.hidden) close(); });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = f.name.value.trim(), att = (f.querySelector('input[name=att]:checked') || {}).value;
      $('#popErr').hidden = !!(name && att); if (!name || !att) return;
      var lines = ['RSVP for ' + (d.names_and || 'your wedding'), 'Name: ' + name, 'Attending: ' + att];
      if (f.guests.value.trim()) lines.push('Guests: ' + f.guests.value.trim());
      if (f.song.value.trim()) lines.push('Song request: ' + f.song.value.trim());
      if (f.kids.value.trim()) lines.push('Children: ' + f.kids.value.trim());
      var num = String(d.rsvp_whatsapp || '').replace(/\D/g, '');
      var url = 'https://wa.me/' + num + '?text=' + encodeURIComponent(lines.join('\n'));
      $('#popOk').hidden = false; window.open(url, '_blank', 'noopener');
    });
  }

  (window.JFY_READY || Promise.resolve()).then(function () {
    var d = derive(window.JFY_DATA || {});
    var go = function () {
      render(d); observe(); roseLoop(); countdown(d); rsvp(d);
      var hasMusic = setMusic(d); intro(hasMusic);
      var y = +Q.get('y'); if (y) setTimeout(function () { window.scrollTo(0, y); }, 60);
    };
    if (document.fonts && document.fonts.ready) { Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 1500); })]).then(go); } else go();
    window.addEventListener('resize', fitNames);
  });
  window.addEventListener('message', function (e) { if (e.data && e.data.type === 'jfy:data') { window.JFY_DATA = e.data.data; location.reload(); } });
})();
