/**
 * Become a Partner country-code picker: searchable flag + dial code.
 * Native <select> options can't show images and often break emoji flags on Windows.
 */
(function () {
  var DIAL_TO_ISO = {
    '+1': 'us',
    '+44': 'gb',
    '+91': 'in',
    '+61': 'au',
    '+49': 'de',
    '+33': 'fr',
    '+39': 'it',
    '+34': 'es',
    '+31': 'nl',
    '+46': 'se',
    '+47': 'no',
    '+45': 'dk',
    '+41': 'ch',
    '+43': 'at',
    '+32': 'be',
    '+351': 'pt',
    '+30': 'gr',
    '+48': 'pl',
    '+420': 'cz',
    '+36': 'hu',
    '+40': 'ro',
    '+359': 'bg',
    '+385': 'hr',
    '+386': 'si',
    '+421': 'sk',
    '+370': 'lt',
    '+371': 'lv',
    '+372': 'ee',
    '+353': 'ie',
    '+358': 'fi',
    '+7': 'ru',
    '+86': 'cn',
    '+81': 'jp',
    '+82': 'kr',
    '+65': 'sg',
    '+60': 'my',
    '+66': 'th',
    '+63': 'ph',
    '+62': 'id',
    '+84': 'vn',
    '+55': 'br',
    '+52': 'mx',
    '+54': 'ar',
    '+56': 'cl',
    '+57': 'co',
    '+51': 'pe',
    '+27': 'za',
    '+20': 'eg',
    '+234': 'ng',
    '+254': 'ke',
    '+971': 'ae',
    '+966': 'sa',
    '+974': 'qa',
    '+973': 'bh',
    '+965': 'kw',
    '+968': 'om',
    '+962': 'jo',
    '+961': 'lb',
    '+972': 'il',
    '+90': 'tr',
    '+98': 'ir',
    '+92': 'pk',
    '+880': 'bd',
    '+94': 'lk',
    '+977': 'np',
    '+975': 'bt',
    '+93': 'af',
    '+998': 'uz',
    '+996': 'kg',
    '+992': 'tj',
    '+993': 'tm',
    '+995': 'ge',
    '+374': 'am',
    '+994': 'az',
    '+976': 'mn',
    '+850': 'kp',
    '+886': 'tw',
    '+852': 'hk',
    '+853': 'mo',
    '+64': 'nz',
    '+679': 'fj',
    '+685': 'ws',
    '+676': 'to',
    '+678': 'vu',
    '+687': 'nc',
    '+689': 'pf',
    '+690': 'tk',
    '+691': 'fm',
    '+692': 'mh',
    '+1-242': 'bs',
    '+1-246': 'bb',
    '+1-264': 'ai',
    '+1-268': 'ag',
    '+1-284': 'vg',
    '+1-340': 'vi',
    '+1-345': 'ky',
    '+1-441': 'bm',
    '+1-473': 'gd',
    '+1-649': 'tc',
    '+1-664': 'ms',
    '+1-670': 'mp',
    '+1-671': 'gu',
    '+1-684': 'as',
    '+1-758': 'lc',
    '+1-767': 'dm',
    '+1-784': 'vc',
    '+1-787': 'pr',
    '+1-809': 'do',
    '+1-829': 'do',
    '+1-849': 'do',
    '+1-868': 'tt',
    '+1-869': 'kn',
    '+1-876': 'jm',
    '+1-939': 'pr',
  };

  var ISO_TO_NAME = {
    us: 'United States',
    gb: 'United Kingdom',
    in: 'India',
    au: 'Australia',
    de: 'Germany',
    fr: 'France',
    it: 'Italy',
    es: 'Spain',
    nl: 'Netherlands',
    se: 'Sweden',
    no: 'Norway',
    dk: 'Denmark',
    ch: 'Switzerland',
    at: 'Austria',
    be: 'Belgium',
    pt: 'Portugal',
    gr: 'Greece',
    pl: 'Poland',
    cz: 'Czech Republic',
    hu: 'Hungary',
    ro: 'Romania',
    bg: 'Bulgaria',
    hr: 'Croatia',
    si: 'Slovenia',
    sk: 'Slovakia',
    lt: 'Lithuania',
    lv: 'Latvia',
    ee: 'Estonia',
    ie: 'Ireland',
    fi: 'Finland',
    ru: 'Russia',
    cn: 'China',
    jp: 'Japan',
    kr: 'South Korea',
    sg: 'Singapore',
    my: 'Malaysia',
    th: 'Thailand',
    ph: 'Philippines',
    id: 'Indonesia',
    vn: 'Vietnam',
    br: 'Brazil',
    mx: 'Mexico',
    ar: 'Argentina',
    cl: 'Chile',
    co: 'Colombia',
    pe: 'Peru',
    za: 'South Africa',
    eg: 'Egypt',
    ng: 'Nigeria',
    ke: 'Kenya',
    ae: 'United Arab Emirates',
    sa: 'Saudi Arabia',
    qa: 'Qatar',
    bh: 'Bahrain',
    kw: 'Kuwait',
    om: 'Oman',
    jo: 'Jordan',
    lb: 'Lebanon',
    il: 'Israel',
    tr: 'Turkey',
    ir: 'Iran',
    pk: 'Pakistan',
    bd: 'Bangladesh',
    lk: 'Sri Lanka',
    np: 'Nepal',
    bt: 'Bhutan',
    af: 'Afghanistan',
    uz: 'Uzbekistan',
    kg: 'Kyrgyzstan',
    tj: 'Tajikistan',
    tm: 'Turkmenistan',
    ge: 'Georgia',
    am: 'Armenia',
    az: 'Azerbaijan',
    mn: 'Mongolia',
    kp: 'North Korea',
    tw: 'Taiwan',
    hk: 'Hong Kong',
    mo: 'Macau',
    nz: 'New Zealand',
    fj: 'Fiji',
    ws: 'Samoa',
    to: 'Tonga',
    vu: 'Vanuatu',
    nc: 'New Caledonia',
    pf: 'French Polynesia',
    tk: 'Tokelau',
    fm: 'Micronesia',
    mh: 'Marshall Islands',
    bs: 'Bahamas',
    bb: 'Barbados',
    ai: 'Anguilla',
    ag: 'Antigua and Barbuda',
    vg: 'British Virgin Islands',
    vi: 'US Virgin Islands',
    ky: 'Cayman Islands',
    bm: 'Bermuda',
    gd: 'Grenada',
    tc: 'Turks and Caicos',
    ms: 'Montserrat',
    mp: 'Northern Mariana Islands',
    gu: 'Guam',
    as: 'American Samoa',
    lc: 'Saint Lucia',
    dm: 'Dominica',
    vc: 'Saint Vincent',
    pr: 'Puerto Rico',
    do: 'Dominican Republic',
    tt: 'Trinidad and Tobago',
    kn: 'Saint Kitts and Nevis',
    jm: 'Jamaica',
  };

  function resolveIso(code) {
    var key = String(code || '').trim();
    if (DIAL_TO_ISO[key]) return DIAL_TO_ISO[key];
    if (key === '+1' || key.indexOf('+1-') === 0) return 'us';
    return '';
  }

  function countryName(iso) {
    return ISO_TO_NAME[String(iso || '').toLowerCase()] || '';
  }

  function flagUrl(iso) {
    return 'https://flagcdn.com/20x15/' + String(iso || '').toLowerCase() + '.png';
  }

  function appendFlag(parent, iso) {
    if (!iso || !parent) return;
    var img = document.createElement('img');
    img.src = flagUrl(iso);
    img.alt = '';
    img.width = 20;
    img.height = 15;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.onerror = function () {
      img.style.visibility = 'hidden';
    };
    parent.appendChild(img);
  }

  function ensureStyles() {
    if (document.getElementById('ejuno-cc-flag-styles')) return;
    var style = document.createElement('style');
    style.id = 'ejuno-cc-flag-styles';
    style.textContent =
      '.ejuno-cc-flag{position:relative;width:100%}' +
      '.ejuno-cc-flag__native{position:absolute!important;opacity:0!important;pointer-events:none!important;width:1px!important;height:1px!important}' +
      '.ejuno-cc-flag__btn{display:flex;align-items:center;gap:8px;width:100%;min-height:46px;padding:8px 34px 8px 12px;border:1px solid #d8d0c8;border-radius:10px;background:#fff url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\' viewBox=\'0 0 12 8\'%3E%3Cpath fill=\'%23666\' d=\'M1 1l5 5 5-5\'/%3E%3C/svg%3E") no-repeat right 12px center;color:#211d1a;font:inherit;font-size:14px;cursor:pointer;text-align:left;box-sizing:border-box}' +
      '.ejuno-cc-flag__btn img,.ejuno-cc-flag__opt img{width:20px;height:15px;object-fit:cover;border-radius:2px;flex-shrink:0;box-shadow:0 0 0 1px rgba(0,0,0,.08)}' +
      '.ejuno-cc-flag__btn span{white-space:nowrap}' +
      '.ejuno-cc-flag__panel{display:none;position:absolute;z-index:60;left:0;top:calc(100% + 4px);width:min(320px,78vw);max-height:300px;margin:0;padding:8px;background:#fff;border:1px solid #d8d0c8;border-radius:12px;box-shadow:0 12px 28px rgba(33,29,26,.14);box-sizing:border-box}' +
      '.ejuno-cc-flag.is-open .ejuno-cc-flag__panel{display:flex;flex-direction:column;gap:8px}' +
      '.ejuno-cc-flag__search{width:100%;min-height:40px;padding:8px 12px;border:1px solid #d8d0c8;border-radius:10px;background:#fff;color:#211d1a;font:inherit;font-size:14px;box-sizing:border-box}' +
      '.ejuno-cc-flag__search:focus{outline:none;border-color:rgba(155,80,104,.55);box-shadow:0 0 0 3px rgba(155,80,104,.12)}' +
      '.ejuno-cc-flag__list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px;overflow:auto;max-height:230px;-webkit-overflow-scrolling:touch}' +
      '.ejuno-cc-flag__opt{display:flex;align-items:center;gap:8px;width:100%;padding:8px 10px;border:1px solid transparent;border-radius:8px;background:transparent;color:#211d1a;font:inherit;font-size:14px;cursor:pointer;text-align:left;box-sizing:border-box}' +
      '.ejuno-cc-flag__opt-text{display:flex;flex-direction:column;align-items:flex-start;gap:1px;min-width:0}' +
      '.ejuno-cc-flag__opt-code{font-weight:600;white-space:nowrap}' +
      '.ejuno-cc-flag__opt-name{font-size:12px;color:#6d645d;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px}' +
      '.ejuno-cc-flag__opt:hover{background:rgba(155,80,104,.08);border-color:rgba(155,80,104,.22);color:#7a3d52}' +
      '.ejuno-cc-flag__opt.is-active{background:rgba(155,80,104,.18);border-color:rgba(155,80,104,.45);color:#7a3d52;font-weight:600}' +
      '.ejuno-cc-flag__opt.is-active:hover{background:rgba(155,80,104,.22);border-color:rgba(155,80,104,.55)}' +
      '.ejuno-cc-flag__opt.is-active .ejuno-cc-flag__opt-name{color:#7a3d52}' +
      '.ejuno-cc-flag__opt.is-hidden{display:none!important}' +
      '.ejuno-cc-flag__empty{display:none;padding:10px 8px;color:#6d645d;font-size:13px}' +
      '.ejuno-cc-flag__empty.is-visible{display:block}';
    document.head.appendChild(style);
  }

  function enhanceSelect(select) {
    if (!select || select.dataset.flagsReady === '1') return;
    ensureStyles();

    var wrap = select.closest('.phone-group > div') || select.parentElement;
    if (wrap && wrap.style) {
      wrap.style.flex = '0 0 148px';
      wrap.style.maxWidth = '148px';
    }

    var root = document.createElement('div');
    root.className = 'ejuno-cc-flag';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ejuno-cc-flag__btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');

    var panel = document.createElement('div');
    panel.className = 'ejuno-cc-flag__panel';

    var search = document.createElement('input');
    search.type = 'search';
    search.className = 'ejuno-cc-flag__search';
    search.placeholder = 'Search country or code';
    search.setAttribute('aria-label', 'Search country code');
    search.autocomplete = 'off';

    var list = document.createElement('div');
    list.className = 'ejuno-cc-flag__list';
    list.setAttribute('role', 'listbox');

    var empty = document.createElement('div');
    empty.className = 'ejuno-cc-flag__empty';
    empty.textContent = 'No matches';

    function renderButton(iso, code) {
      btn.innerHTML = '';
      appendFlag(btn, iso);
      var span = document.createElement('span');
      span.textContent = code;
      btn.appendChild(span);
    }

    function applySearchFilter() {
      var q = String(search.value || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
      var visible = 0;
      Array.prototype.forEach.call(list.querySelectorAll('.ejuno-cc-flag__opt'), function (el) {
        var hay = el.dataset.search || '';
        var match = !q || hay.indexOf(q) !== -1;
        el.classList.toggle('is-hidden', !match);
        if (match) visible += 1;
      });
      empty.classList.toggle('is-visible', visible === 0);
    }

    Array.prototype.forEach.call(select.options, function (opt) {
      var code = String(opt.value || '').trim();
      // Trello 675: options carry their own country, so shared codes (+1: US, Canada, ...) show the right flag and name.
      var iso = opt.getAttribute('data-iso') || resolveIso(code);
      var name = opt.getAttribute('data-name') || countryName(iso);
      opt.textContent = code;
      if (iso) opt.setAttribute('data-iso', iso);

      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'ejuno-cc-flag__opt';
      item.setAttribute('role', 'option');
      item.dataset.value = code;
      item.dataset.search = [code, name, iso].join(' ').toLowerCase();
      appendFlag(item, iso);

      var textWrap = document.createElement('span');
      textWrap.className = 'ejuno-cc-flag__opt-text';
      var codeEl = document.createElement('span');
      codeEl.className = 'ejuno-cc-flag__opt-code';
      codeEl.textContent = code;
      textWrap.appendChild(codeEl);
      if (name) {
        var nameEl = document.createElement('span');
        nameEl.className = 'ejuno-cc-flag__opt-name';
        nameEl.textContent = name;
        textWrap.appendChild(nameEl);
      }
      item.appendChild(textWrap);

      if (opt.selected) {
        item.classList.add('is-active');
        renderButton(iso, code);
      }

      item.addEventListener('click', function () {
        select.value = code;
        Array.prototype.forEach.call(list.querySelectorAll('.ejuno-cc-flag__opt'), function (el) {
          el.classList.toggle('is-active', el.dataset.value === code);
        });
        renderButton(iso, code);
        root.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
        search.value = '';
        applySearchFilter();
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });

      list.appendChild(item);
    });

    if (!btn.childNodes.length) {
      var current = select.options[select.selectedIndex] || select.options[0];
      if (current) {
        renderButton(resolveIso(current.value), current.value);
      }
    }

    function openPanel() {
      root.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      window.setTimeout(function () {
        search.focus();
        search.select();
      }, 0);
    }

    function closePanel() {
      root.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      search.value = '';
      applySearchFilter();
    }

    btn.addEventListener('click', function () {
      if (root.classList.contains('is-open')) closePanel();
      else openPanel();
    });

    search.addEventListener('input', applySearchFilter);
    search.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closePanel();
        btn.focus();
      }
    });

    document.addEventListener('click', function (e) {
      if (!root.contains(e.target)) closePanel();
    });

    panel.appendChild(search);
    panel.appendChild(list);
    panel.appendChild(empty);

    select.classList.add('ejuno-cc-flag__native');
    select.parentNode.insertBefore(root, select);
    root.appendChild(btn);
    root.appendChild(panel);
    root.appendChild(select);

    select.dataset.flagsReady = '1';
  }

  function run() {
    enhanceSelect(document.getElementById('country-code'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
