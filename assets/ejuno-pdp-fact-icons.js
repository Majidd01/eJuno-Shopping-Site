(function (global) {
  var NS = 'http://www.w3.org/2000/svg';
  var S =
    'stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"';

  function svg(inner) {
    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<svg class="ejuno-pdp-fact-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      inner +
      '</svg>';
    return wrap.firstChild;
  }

  var ICONS = {
    guests:
      '<circle ' +
      S +
      ' cx="9" cy="8.5" r="2"/><circle ' +
      S +
      ' cx="15.5" cy="9" r="1.7"/><path ' +
      S +
      ' d="M5.5 18.5c1.2-2.4 2.7-3.2 3.8-3.2s2.6.8 3.7 3.2"/><path ' +
      S +
      ' d="M13.5 17.5c.7-1.3 1.5-1.8 2.4-1.8"/>',
    bedrooms:
      '<path ' +
      S +
      ' d="M4 13V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path ' +
      S +
      ' d="M4 17v2M20 17v2M4 13h16v4H4z"/>',
    bathrooms:
      '<path ' +
      S +
      ' d="M6 12h12v6a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-6z"/><path ' +
      S +
      ' d="M8 12V8a2 2 0 0 1 2-2h1"/><path ' +
      S +
      ' d="M16 12V9"/>',
    setting:
      '<path ' +
      S +
      ' d="M12 21s-6-4.5-6-10a6 6 0 1 1 12 0c0 5.5-6 10-6 10z"/><circle ' +
      S +
      ' cx="12" cy="11" r="2"/>',
    style:
      '<path ' +
      S +
      ' d="M5 19V10l7-5 7 5v9"/><path ' +
      S +
      ' d="M9 19v-6h6v6"/>',
    reception:
      '<path ' +
      S +
      ' d="M4 10h16"/><path ' +
      S +
      ' d="M6 10V7l6-3 6 3v3"/><path ' +
      S +
      ' d="M8 20h8"/><path ' +
      S +
      ' d="M10 14h4"/>',
    stay:
      '<path ' +
      S +
      ' d="M4 10.5 12 5l8 5.5V19a1 1 0 0 1-1 1h-4v-5h-2v5H5a1 1 0 0 1-1-1v-8.5z"/>',
    season:
      '<circle ' +
      S +
      ' cx="12" cy="12" r="8"/><path ' +
      S +
      ' d="M12 8v4l2.5 2.5"/>',
    detail:
      '<circle ' +
      S +
      ' cx="12" cy="12" r="8"/><path ' +
      S +
      ' d="M12 10v6M12 8h.01"/>',
  };

  function keyFromLabel(label) {
    var l = String(label || '').toLowerCase();
    if (l.indexOf('guest') >= 0) return 'guests';
    if (l.indexOf('bedroom') >= 0) return 'bedrooms';
    if (l.indexOf('bath') >= 0) return 'bathrooms';
    if (l.indexOf('setting') >= 0 || l.indexOf('location') >= 0) return 'setting';
    if (l.indexOf('style') >= 0) return 'style';
    if (l.indexOf('reception') >= 0) return 'reception';
    if (l.indexOf('stay') >= 0 || l.indexOf('accommodation') >= 0) return 'stay';
    if (l.indexOf('season') >= 0) return 'season';
    if (l.indexOf('amenit') >= 0) return 'detail';
    if (l.indexOf('type') >= 0) return 'style';
    return 'detail';
  }

  function getIcon(key) {
    return svg(ICONS[key] || ICONS.detail);
  }

  global.ejunoPdpFactIcons = {
    keyFromLabel: keyFromLabel,
    getIcon: getIcon,
  };
})(typeof window !== 'undefined' ? window : this);
