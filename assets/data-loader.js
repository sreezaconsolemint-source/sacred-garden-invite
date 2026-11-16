/* Loads invitation data. #data=<encoded JSON> (made by edit.html) replaces the demo text; artwork & music defaults stay. */
(function () {
  var S = window.JFY_DATA || {}, KEEP = ['couple_photo', 'hero_image', 'music_url', 'music_credit'];
  var m = /[#&]data=([^&]+)/.exec(location.hash);
  window.JFY_READY = (m && window.JFYCodec ? JFYCodec.decode(m[1]).then(function (d) {
    KEEP.forEach(function (k) { if (d[k] == null || d[k] === '') d[k] = S[k]; });
    if (d.music_enabled === false) d.music_url = '';
    window.JFY_DATA = d;
  }) : Promise.resolve()).catch(function (e) { console.warn('Invitation data could not be read, showing the demo.', e); });
})();
