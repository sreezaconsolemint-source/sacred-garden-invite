/* Generic Just For You invitation editor.
   Reads window.JFY_FORM (form schema) + window.JFY_DATA (sample), renders the form, shows a live
   phone preview of index.html and builds a shareable link with all details packed into #data=. */
(function () {
  'use strict';
  var F = window.JFY_FORM, SAMPLE = JSON.parse(JSON.stringify(window.JFY_DATA || {}));
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var form = $('#ed'), photos = {}, pvTimer = null, pvN = 0, DRAFT = F.draftKey || 'jfy-draft';
  var split = function (dt) { var m = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/.exec(dt || ''); return m ? [m[1], m[2] || ''] : ['', '']; };

  function fieldHTML(f, sub) {
    var opt = f.req ? ' *' : (f.opt === false ? '' : ' <i>(optional' + (f.hint ? ' — ' + esc(f.hint) : '') + ')</i>');
    if (f.req && f.hint) opt += ' <i>(' + esc(f.hint) + ')</i>';
    var a = (sub ? 'data-k' : 'name') + '="' + f.k + '"' + (f.max ? ' maxlength="' + f.max + '"' : '') + (f.ph ? ' placeholder="' + esc(f.ph) + '"' : '') + (f.req && !sub ? ' required' : '');
    switch (f.type) {
      case 'textarea': return '<label>' + esc(f.label) + opt + '<textarea ' + a + ' rows="' + (f.rows || 3) + '"></textarea></label>';
      case 'datetime': return '<div class="row2"><label>' + esc(f.label) + opt + '<input type="date" ' + a + '></label><label>Time <i>(optional)</i><input type="time" name="' + f.k + '__time"></label></div>';
      case 'toggle': return '<label class="tog"><input type="checkbox" name="' + f.k + '" checked><span></span>' + esc(f.label) + '</label>';
      case 'photo': return '<label class="photo">' + esc(f.label) + ' <i>(optional)</i><input type="file" accept="image/*" data-photo="' + f.k + '" data-max="' + (f.maxpx || 600) + '"><span class="photo__btn">Upload</span><button type="button" class="photo__x" data-clear="' + f.k + '" hidden>Remove — use our artwork</button></label>';
      case 'select': return '<label>' + esc(f.label) + opt + '<select ' + a + '>' + f.options.map(function (o) { return '<option>' + esc(o) + '</option>'; }).join('') + '</select></label>';
      case 'note': return '<p class="note">' + f.text + '</p>';
      default: return '<label>' + esc(f.label) + opt + '<input type="' + (f.type || 'text') + '" ' + a + (f.type === 'tel' ? ' inputmode="numeric"' : '') + '></label>';
    }
  }
  function build() {
    var h = '<p class="intro">' + (F.intro || 'Fill in your details — the preview updates as you type. Leave an optional field empty and it disappears from the invitation.') + '</p>';
    F.groups.forEach(function (g, gi) {
      h += '<details class="grp"' + (g.open ? ' open' : '') + '><summary>' + g.title + '</summary>';
      var row = [];
      g.fields.forEach(function (f) {
        if (f.type === 'list') { h += '<div class="list" data-list="' + f.k + '"></div><div class="evadd"><button type="button" class="btn btn--soft" data-add="' + f.k + '">＋ Add ' + esc(f.item) + '</button>' + (f.presets ? '<select data-preset="' + f.k + '" aria-label="Quick add"><option value="">Quick add…</option>' + f.presets.map(function (p) { return '<option>' + esc(p) + '</option>'; }).join('') + '</select>' : '') + '</div>'; return; }
        if (f.half) { row.push(fieldHTML(f)); if (row.length === 2) { h += '<div class="row2">' + row.join('') + '</div>'; row = []; } return; }
        if (row.length) { h += '<div class="row2">' + row.join('') + '</div>'; row = []; }
        h += fieldHTML(f);
      });
      if (row.length) h += '<div class="row2">' + row.join('') + '</div>';
      h += '</details>';
    });
    h += '<div class="actions"><button type="button" class="btn btn--ghost" id="resetBtn">Reset to sample</button><button type="button" class="btn btn--ghost" id="clearBtn">Clear all</button></div><p class="err" id="err" hidden></p><button type="button" class="btn btn--main" id="createBtn">✨ Create my invitation</button>';
    form.innerHTML = h;
  }
  var allFields = function () { var o = []; F.groups.forEach(function (g) { g.fields.forEach(function (f) { o.push(f); }); }); return o; };
  var lists = function () { return allFields().filter(function (f) { return f.type === 'list'; }); };

  function addItem(lf, it) {
    it = it || {};
    var box = $('[data-list="' + lf.k + '"]'), n = document.createElement('div'); n.className = 'ev';
    n.innerHTML = '<div class="ev__head"><b class="ev__no"></b><span><button type="button" class="ev__mv" data-mv="-1" aria-label="Move up">↑</button><button type="button" class="ev__mv" data-mv="1" aria-label="Move down">↓</button><button type="button" class="ev__del">Remove</button></span></div>' +
      '<div class="ev__f">' + lf.fields.map(function (f) { return fieldHTML(f, true); }).join('') + '</div>';
    // group half fields in rows
    var fs = $('.ev__f', n);
    lf.fields.forEach(function (f) {
      var el = $('[data-k="' + f.k + '"]', n); if (!el) return;
      if (f.type === 'datetime') { var dt = split(it[f.k]); el.value = dt[0]; var t = el.closest('.row2').querySelector('input[type=time]'); t.removeAttribute('name'); t.setAttribute('data-k', f.k + '__time'); t.value = dt[1]; }
      else if (f.type === 'time') el.value = it[f.k] || '';
      else el.value = it[f.k] == null ? '' : it[f.k];
    });
    $('.ev__del', n).onclick = function () { n.remove(); renumber(lf); schedule(); };
    $$('.ev__mv', n).forEach(function (b) { b.onclick = function () { var d = +b.dataset.mv, s = d < 0 ? n.previousElementSibling : n.nextElementSibling; if (!s) return; if (d < 0) box.insertBefore(n, s); else box.insertBefore(s, n); renumber(lf); schedule(); }; });
    box.appendChild(n); renumber(lf); return n;
  }
  function renumber(lf) { $$('[data-list="' + lf.k + '"] .ev').forEach(function (n, i) { $('.ev__no', n).textContent = lf.item.charAt(0).toUpperCase() + lf.item.slice(1) + ' ' + (i + 1); }); }

  function load(d) {
    allFields().forEach(function (f) {
      if (f.type === 'list' || f.type === 'note') return;
      if (f.type === 'photo') return;
      var el = form.elements[f.k]; if (!el) return;
      if (f.type === 'toggle') { el.checked = d[f.k] !== false; return; }
      if (f.type === 'datetime') { var dt = split(d[f.k]); el.value = dt[0]; form.elements[f.k + '__time'].value = dt[1]; return; }
      el.value = d[f.k] == null ? '' : d[f.k];
    });
    photos = {}; allFields().forEach(function (f) { if (f.type === 'photo' && d[f.k] && /^data:/.test(d[f.k])) photos[f.k] = d[f.k]; });
    syncPhotos();
    lists().forEach(function (lf) { $('[data-list="' + lf.k + '"]').innerHTML = ''; (d[lf.k] || []).forEach(function (it) { addItem(lf, it); }); });
  }
  function collect() {
    var d = {};
    allFields().forEach(function (f) {
      if (f.type === 'note') return;
      if (f.type === 'photo') { if (photos[f.k]) d[f.k] = photos[f.k]; return; }
      if (f.type === 'list') {
        d[f.k] = $$('[data-list="' + f.k + '"] .ev').map(function (n) {
          var it = {}, any = false;
          f.fields.forEach(function (sf) {
            var el = $('[data-k="' + sf.k + '"]', n); if (!el) return; var v = (el.value || '').trim();
            if (sf.type === 'datetime') { var t = $('[data-k="' + sf.k + '__time"]', n); if (v) v += t && t.value ? 'T' + t.value : ''; }
            if (v) { it[sf.k] = v; any = true; }
          });
          return any ? it : null;
        }).filter(Boolean);
        return;
      }
      var el = form.elements[f.k]; if (!el) return;
      if (f.type === 'toggle') { if (!el.checked) d[f.k] = false; return; }
      var v = (el.value || '').trim();
      if (f.type === 'datetime' && v) { var t = form.elements[f.k + '__time'].value; if (t) v += 'T' + t; }
      if (f.type === 'tel') v = v.replace(/\D/g, '');
      if (v) d[f.k] = v;
    });
    return d;
  }
  function schedule() { clearTimeout(pvTimer); pvTimer = setTimeout(preview, 600); }
  function preview() {
    var d = collect();
    try { localStorage.setItem(DRAFT, JSON.stringify(d)); } catch (e) { try { var lite = Object.assign({}, d); Object.keys(photos).forEach(function (k) { delete lite[k]; }); localStorage.setItem(DRAFT, JSON.stringify(lite)); } catch (_) {} }
    JFYCodec.encode(d).then(function (s) {
      var f = $('#pv'), y = 0; try { y = Math.round(f.contentWindow.scrollY || 0); } catch (_) {}
      f.src = 'index.html?skip=1&preview=1&music=0&y=' + y + '&r=' + (++pvN) + '#data=' + s;
    });
  }
  function syncPhotos() {
    $$('[data-photo]').forEach(function (inp) {
      var k = inp.getAttribute('data-photo'), lab = inp.closest('.photo');
      lab.classList.toggle('has', !!photos[k]); $('.photo__btn', lab).textContent = photos[k] ? '✓ Photo added' : 'Upload';
      $('[data-clear="' + k + '"]', lab).hidden = !photos[k];
    });
  }
  function showErr(t) { var e = $('#err'); e.textContent = t; e.hidden = !t; }

  build();
  form.addEventListener('input', schedule);
  form.addEventListener('change', schedule);
  $$('[data-photo]').forEach(function (inp) {
    inp.addEventListener('change', function () {
      var f = inp.files && inp.files[0]; if (!f) return;
      var k = inp.getAttribute('data-photo'), max = +inp.dataset.max || 600, img = new Image(), url = URL.createObjectURL(f);
      img.onload = function () {
        var s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        photos[k] = c.toDataURL('image/jpeg', 0.7); URL.revokeObjectURL(url); syncPhotos(); schedule();
      };
      img.onerror = function () { showErr('That file could not be read as an image.'); };
      img.src = url; inp.value = '';
    });
  });
  $$('[data-clear]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); delete photos[b.getAttribute('data-clear')]; syncPhotos(); schedule(); }); });
  lists().forEach(function (lf) {
    $('[data-add="' + lf.k + '"]').onclick = function () { var n = addItem(lf, {}); var i = $('input,textarea', n); if (i) i.focus(); schedule(); };
    var ps = $('[data-preset="' + lf.k + '"]'); if (ps) ps.onchange = function () { if (!this.value) return; var it = {}; it[lf.presetKey || 'name'] = this.value; addItem(lf, it); this.value = ''; schedule(); };
  });
  $('#resetBtn').onclick = function () { load(SAMPLE); preview(); };
  $('#clearBtn').onclick = function () { var e = {}; lists().forEach(function (l) { e[l.k] = []; }); load(e); preview(); };
  $('#createBtn').onclick = function () {
    var d = collect(), miss = [];
    allFields().forEach(function (f) { if (f.req && !d[f.k]) miss.push(f.label); });
    if (miss.length) {
      showErr('Please fill: ' + miss.join(', ')); document.body.classList.remove('v-preview');
      var first = allFields().filter(function (f) { return f.req && !d[f.k]; })[0], el = first && form.elements[first.k];
      if (el) { el.closest('details').open = true; el.focus(); } return;
    }
    showErr('');
    JFYCodec.encode(d).then(function (s) {
      var u = new URL('index.html', location.href); u.search = ''; u.hash = 'data=' + s;
      var link = u.toString(), head = F.shareText ? F.shareText(d) : 'You are invited 💌', msg = head + '\nOpen your invitation: ' + link;
      $('#shareUrl').value = link; $('#openLink').href = link;
      $('#waShare').href = 'https://wa.me/?text=' + encodeURIComponent(msg);
      $('#lenNote').textContent = link.length > 6000 ? 'Your photos make this link long (' + Math.round(link.length / 1000) + 'k characters). It works in browsers, but if WhatsApp cuts it, remove the photos and share again.' : '';
      var ns = $('#nativeShare'); ns.hidden = !navigator.share; ns.onclick = function () { navigator.share({ title: F.title || 'Invitation', text: head, url: link }).catch(function () {}); };
      $('#sheet').hidden = false;
    });
  };
  $('#copyBtn').onclick = function () {
    var i = $('#shareUrl'), b = this; i.select();
    var ok = function () { b.textContent = 'Copied ✓'; setTimeout(function () { b.textContent = 'Copy'; }, 1800); };
    if (navigator.clipboard) navigator.clipboard.writeText(i.value).then(ok, function () { document.execCommand('copy'); ok(); }); else { document.execCommand('copy'); ok(); }
  };
  $('#sheetX').onclick = function () { $('#sheet').hidden = true; };
  $$('.tab').forEach(function (t) { t.onclick = function () { $$('.tab').forEach(function (x) { x.classList.toggle('on', x === t); }); document.body.classList.toggle('v-preview', t.dataset.view === 'preview'); window.scrollTo(0, 0); }; });
  var m = /[#&]data=([^&]+)/.exec(location.hash), start = Promise.resolve(null);
  if (m) start = JFYCodec.decode(m[1]).catch(function () { return null; });
  start.then(function (d) {
    if (!d) { try { d = JSON.parse(localStorage.getItem(DRAFT) || 'null'); } catch (_) { d = null; } }
    load(d || SAMPLE); preview();
  });
})();
