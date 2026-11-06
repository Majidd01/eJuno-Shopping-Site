(function (global) {
  var S =
    'stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"';

  function icon(svgInner) {
    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<svg class="ejuno-highlight-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">' +
      svgInner +
      '</svg>';
    return wrap.firstChild;
  }

  var ICONS = {
    sparkles:
      '<path ' +
      S +
      ' d="M12 3.5 13.2 7l3.3 1.2-3.3 1.2L12 12.6 10.8 9.4 7.5 8.2l3.3-1.2L12 3.5Z"/><path ' +
      S +
      ' d="M18.5 14.5l.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7.7-2.1Z"/>',
    concierge:
      '<path ' +
      S +
      ' d="M12 3a3.5 3.5 0 0 1 3.5 3.5V8H8.5V6.5A3.5 3.5 0 0 1 12 3Z"/><path ' +
      S +
      ' d="M6.5 9h11v10H6.5z"/><path ' +
      S +
      ' d="M9.5 13h5"/><path ' +
      S +
      ' d="M12 2v1"/>',
    bell:
      '<path ' +
      S +
      ' d="M12 4.5a4 4 0 0 1 4 4v2.5l1.2 2H6.8l1.2-2V8.5a4 4 0 0 1 4-4Z"/><path ' +
      S +
      ' d="M10 17a2 2 0 0 0 4 0"/>',
    home:
      '<path ' +
      S +
      ' d="M4.5 11 12 5l7.5 6"/><path ' +
      S +
      ' d="M6 10.5V19a1 1 0 0 0 1 1h4v-5h2v5h4a1 1 0 0 0 1-1v-8.5"/>',
    clean:
      '<path ' +
      S +
      ' d="M9 20h6"/><path ' +
      S +
      ' d="M12 4v12"/><path ' +
      S +
      ' d="M8.5 7.5 12 4l3.5 3.5"/><path ' +
      S +
      ' d="M6 16h12"/>',
    coffee:
      '<path ' +
      S +
      ' d="M6 9h10a2.5 2.5 0 0 1 0 5H8a2 2 0 0 1-2-2V9Z"/><path ' +
      S +
      ' d="M16 10h1.5a2 2 0 0 1 0 4H16"/><path ' +
      S +
      ' d="M8 20h6"/><path ' +
      S +
      ' d="M10 6V4"/>',
    laundry:
      '<rect ' +
      S +
      ' x="5" y="3" width="14" height="18" rx="2"/><circle ' +
      S +
      ' cx="12" cy="13" r="3.5"/><path ' +
      S +
      ' d="M8.5 6.5h2M13.5 6.5h2"/>',
    spa:
      '<path ' +
      S +
      ' d="M12 21c-4-2.8-6.5-6-6.5-9.5a6.5 6.5 0 1 1 13 0c0 3.5-2.5 6.7-6.5 9.5Z"/><path ' +
      S +
      ' d="M12 8v2"/><path ' +
      S +
      ' d="M9.5 10.5c.8-1.2 2.2-2 3.5-2s2.7.8 3.5 2"/>',
    yoga:
      '<circle ' +
      S +
      ' cx="12" cy="6" r="2"/><path ' +
      S +
      ' d="M8.5 20 12 12l3.5 8"/><path ' +
      S +
      ' d="M7 13.5h10"/>',
    utensils:
      '<path ' +
      S +
      ' d="M8 3v7"/><path ' +
      S +
      ' d="M6 3v4a2 2 0 0 0 4 0V3"/><path ' +
      S +
      ' d="M16 3v17"/><path ' +
      S +
      ' d="M14 3v4a2 2 0 0 0 4 0V3"/>',
    wine:
      '<path ' +
      S +
      ' d="M9 4h6l-1.2 8.2a3.8 3.8 0 0 1-3.6 0L9 4Z"/><path ' +
      S +
      ' d="M12 14.5V19"/><path ' +
      S +
      ' d="M9.5 19h5"/>',
    dumbbell:
      '<path ' +
      S +
      ' d="M6.5 9.5v5"/><path ' +
      S +
      ' d="M17.5 9.5v5"/><path ' +
      S +
      ' d="M4 10.5v3"/><path ' +
      S +
      ' d="M20 10.5v3"/><path ' +
      S +
      ' d="M8.5 12h7"/>',
    beach:
      '<path ' +
      S +
      ' d="M4 19c2.5-1.5 5-2 8-2s5.5.5 8 2"/><path ' +
      S +
      ' d="M12 5v8"/><path ' +
      S +
      ' d="M9 8h6"/><path ' +
      S +
      ' d="M12 3v2"/>',
    pool:
      '<path ' +
      S +
      ' d="M3 12c2.2 0 2.2-1.8 4.4-1.8S9.8 12 12 12s2.2-1.8 4.4-1.8S18.8 12 21 12"/><path ' +
      S +
      ' d="M3 16.5c2.2 0 2.2-1.8 4.4-1.8S9.8 16.5 12 16.5s2.2-1.8 4.4-1.8S18.8 16.5 21 16.5"/><path ' +
      S +
      ' d="M12 6v2"/><path ' +
      S +
      ' d="M10 4h4"/>',
    walk:
      '<circle ' +
      S +
      ' cx="12" cy="5.5" r="1.8"/><path ' +
      S +
      ' d="M10.5 20 12 13l1.5 7"/><path ' +
      S +
      ' d="M8.5 12.5 12 11l3.5 1.5"/>',
    flame:
      '<path ' +
      S +
      ' d="M12 21c3.8-2.2 6-5.4 6-9.2a5.2 5.2 0 0 0-9.2-3.2C7.5 10.8 6 13.2 6 15.5 6 18.5 8.5 20.8 12 21Z"/><path ' +
      S +
      ' d="M12 15.5c1-1.2 1.5-2.4 1.5-3.8"/>',
    landscape:
      '<circle ' +
      S +
      ' cx="18" cy="8" r="2"/><path ' +
      S +
      ' d="M3 19h18"/><path ' +
      S +
      ' d="M5.5 16.5 9 11l3.5 2.5L16 9l3.5 4.5"/>',
    town:
      '<path ' +
      S +
      ' d="M4 19V10l3.5-1.5V19"/><path ' +
      S +
      ' d="M10.5 19V6.5L14 5v14"/><path ' +
      S +
      ' d="M19.5 19V12L16 11v8"/><path ' +
      S +
      ' d="M3 19h18"/>',
    wifi:
      '<path ' +
      S +
      ' d="M5 10a11 11 0 0 1 14 0"/><path ' +
      S +
      ' d="M8.5 13.5a6 6 0 0 1 7 0"/><path ' +
      S +
      ' d="M12 17h.01"/><circle ' +
      S +
      ' cx="12" cy="17" r=".5" fill="currentColor" stroke="none"/>',
    snowflake:
      '<path ' +
      S +
      ' d="M12 4v16"/><path ' +
      S +
      ' d="M4.5 8.5 19.5 15.5"/><path ' +
      S +
      ' d="M19.5 8.5 4.5 15.5"/><path ' +
      S +
      ' d="M4 12h16"/>',
    heat:
      '<path ' +
      S +
      ' d="M6 8v10"/><path ' +
      S +
      ' d="M10 6v14"/><path ' +
      S +
      ' d="M14 8v10"/><path ' +
      S +
      ' d="M18 6v14"/><path ' +
      S +
      ' d="M4 19h16"/>',
    tv:
      '<rect ' +
      S +
      ' x="3.5" y="6" width="17" height="11" rx="1.5"/><path ' +
      S +
      ' d="M8.5 20h7"/><path ' +
      S +
      ' d="M12 17v3"/>',
    disc:
      '<circle ' +
      S +
      ' cx="12" cy="12" r="7"/><circle ' +
      S +
      ' cx="12" cy="12" r="2"/>',
    kids:
      '<circle ' +
      S +
      ' cx="9" cy="8" r="2"/><circle ' +
      S +
      ' cx="15.5" cy="9" r="1.6"/><path ' +
      S +
      ' d="M5.5 18.5c1.3-2.6 2.9-3.5 4-3.5s2.7.9 4 3.5"/><path ' +
      S +
      ' d="M13.5 17.5c.7-1.4 1.6-2 2.5-2"/>',
    bed:
      '<path ' +
      S +
      ' d="M4 12V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3"/><path ' +
      S +
      ' d="M4 16v3"/><path ' +
      S +
      ' d="M20 16v3"/><path ' +
      S +
      ' d="M4 12h16v4H4z"/>',
    paw:
      '<ellipse ' +
      S +
      ' cx="9" cy="9.5" rx="1.6" ry="1.8"/><ellipse ' +
      S +
      ' cx="15" cy="9.5" rx="1.6" ry="1.8"/><ellipse ' +
      S +
      ' cx="7" cy="13" rx="1.4" ry="1.6"/><ellipse ' +
      S +
      ' cx="17" cy="13" rx="1.4" ry="1.6"/><path ' +
      S +
      ' d="M12 14.2c-2.2 0-4 1.3-4 3.3 0 1.6 1.6 2.5 4 2.5s4-.9 4-2.5c0-2-1.8-3.3-4-3.3Z"/>',
    parking:
      '<rect ' +
      S +
      ' x="4" y="4" width="16" height="16" rx="2"/><path ' +
      S +
      ' d="M10 8h2.8a2.2 2.2 0 0 1 0 4.4H10V8Z"/><path ' +
      S +
      ' d="M10 12.4V16"/>',
    lock:
      '<rect ' +
      S +
      ' x="6" y="11" width="12" height="9" rx="1.5"/><path ' +
      S +
      ' d="M9 11V8.5a3 3 0 0 1 6 0V11"/>',
    bolt:
      '<path ' +
      S +
      ' d="M13 2.5 7.5 13H12l-1 8.5L17 11h-4.5L13 2.5Z"/>',
    rings:
      '<circle ' +
      S +
      ' cx="10" cy="14" r="3.5"/><circle ' +
      S +
      ' cx="14" cy="10" r="3.5"/>',
    tennis:
      '<circle ' +
      S +
      ' cx="12" cy="12" r="7"/><path ' +
      S +
      ' d="M12 5c2.5 2.8 2.5 10.2 0 14"/><path ' +
      S +
      ' d="M5 12c2.8-2.5 10.2-2.5 14 0"/>',
    golf:
      '<path ' +
      S +
      ' d="M12 4v14"/><path ' +
      S +
      ' d="M12 4 18 7"/><path ' +
      S +
      ' d="M8 20h8"/>',
    tree:
      '<path ' +
      S +
      ' d="M12 20v-3"/><path ' +
      S +
      ' d="M12 17c-2.5 0-4-1.8-4-4.2 0-1.8 1.2-3.3 3-3.8-.5-2.2 1-4 3-4s3.5 1.8 3 4c1.8.5 3 2 3 3.8 0 2.4-1.5 4.2-4 4.2Z"/>',
  };

  var KEY_MAP = [
    ['on-site concierge', 'bell'],
    ['concierge', 'concierge'],
    ['butler', 'concierge'],
    ['caretaker', 'home'],
    ['owner on site', 'home'],
    ['ground floor', 'home'],
    ['maid service', 'clean'],
    ['maid', 'clean'],
    ['breakfast', 'coffee'],
    ['chef', 'utensils'],
    ['cooking class', 'utensils'],
    ['laundry service', 'laundry'],
    ['laundry', 'laundry'],
    ['washing', 'laundry'],
    ['tumble', 'laundry'],
    ['dryer', 'laundry'],
    ['dishwasher', 'utensils'],
    ['microwave', 'utensils'],
    ['spa treatment', 'spa'],
    ['spa', 'spa'],
    ['yoga', 'yoga'],
    ['gym', 'dumbbell'],
    ['fitness', 'dumbbell'],
    ['wine tasting', 'wine'],
    ['wine', 'wine'],
    ['walk to restaurant', 'walk'],
    ['restaurant', 'utensils'],
    ['walking', 'walk'],
    ['hiking', 'walk'],
    ['cycling', 'walk'],
    ['beach nearby', 'beach'],
    ['beach', 'beach'],
    ['heated pool', 'pool'],
    ['private pool', 'pool'],
    ['pool', 'pool'],
    ['working fireplace', 'flame'],
    ['woodburner', 'flame'],
    ['fireplace', 'flame'],
    ['outstanding landscape', 'landscape'],
    ['landscape', 'landscape'],
    ['outdoor', 'tree'],
    ['rural', 'tree'],
    ['tourist town', 'town'],
    ['villages nearby', 'town'],
    ['village', 'town'],
    ['town', 'town'],
    ['wi-fi', 'wifi'],
    ['wifi', 'wifi'],
    ['internet', 'wifi'],
    ['air-con', 'snowflake'],
    ['heating', 'heat'],
    ['dvd', 'disc'],
    ['tv', 'tv'],
    ['ideal for kids', 'kids'],
    ['kid', 'kids'],
    ['baby', 'kids'],
    ['toddler', 'kids'],
    ['teen', 'kids'],
    ['crib', 'kids'],
    ['bedroom', 'bed'],
    ['pets', 'paw'],
    ['parking', 'parking'],
    ['safety', 'lock'],
    ['deposit box', 'lock'],
    ['electric car', 'bolt'],
    ['charger', 'bolt'],
    ['wedding', 'rings'],
    ['ceremony', 'rings'],
    ['church', 'rings'],
    ['chapel', 'rings'],
    ['golf', 'golf'],
    ['tennis', 'tennis'],
    ['table tennis', 'tennis'],
    ['historical', 'town'],
    ['fenced', 'home'],
    ['amusement', 'sparkles'],
    ['hairdryer', 'sparkles'],
    ['coffee', 'coffee'],
    ['chair', 'home'],
  ];

  function resolveIconKey(highlight) {
    var lower = String(highlight || '').toLowerCase();
    for (var i = 0; i < KEY_MAP.length; i++) {
      if (lower.indexOf(KEY_MAP[i][0]) >= 0) return KEY_MAP[i][1];
    }
    return 'sparkles';
  }

  function getHighlightIconElement(highlight) {
    var key = resolveIconKey(highlight);
    var markup = ICONS[key] || ICONS.sparkles;
    return icon(markup);
  }

  global.ejunoHighlightIcons = {
    resolveIconKey: resolveIconKey,
    getHighlightIconElement: getHighlightIconElement,
  };
})(typeof window !== 'undefined' ? window : this);
