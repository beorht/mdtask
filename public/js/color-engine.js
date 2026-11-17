// Движок теории цвета для тренажёра «Цвет и палитра» (src/lib/palette-course/). UMD: работает и в браузере
// (живая подсказка по вычисленным цветам из iframe), и в Node (авторитетная проверка на сервере — цвета ролей
// берутся из движка каскада src/lib/css-course/cascade.js). Детерминированная математика цвета:
//   parse() — разбор #hex / rgb() / rgba() / hsl() → {r,g,b,a};
//   contrast() — контраст по WCAG (с учётом прозрачности, поверх белого листа);
//   deltaE() — цветовое расстояние (CIE76 в Lab): «похоже / различимо»;
//   hsl(), hueDistance(), temperature(), scheme() — для гармонии и настроения;
//   grade(colors, rules, labels) — проверка набора правил, по каждому pass/fail + русское объяснение.
// Правила теории, а не совпадение с эталоном: любая палитра, прошедшая правила, засчитывается.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ColorEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var NAMED = {
    black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000', blue: '#0000ff',
    gray: '#808080', grey: '#808080', silver: '#c0c0c0', maroon: '#800000', olive: '#808000',
    lime: '#00ff00', aqua: '#00ffff', teal: '#008080', navy: '#000080', fuchsia: '#ff00ff',
    purple: '#800080', orange: '#ffa500', transparent: 'rgba(0,0,0,0)',
  };

  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
  function round(n, k) { var p = Math.pow(10, k || 0); return Math.round(n * p) / p; }

  // «#rgb» / «#rrggbb» / «#rrggbbaa» / «rgb()» / «rgba()» / «hsl()» / имя → { r, g, b, a } или null.
  function parse(input) {
    if (input && typeof input === 'object' && 'r' in input && 'g' in input && 'b' in input) {
      return { r: input.r, g: input.g, b: input.b, a: input.a == null ? 1 : input.a };
    }
    if (typeof input !== 'string') return null;
    var v = input.trim().toLowerCase();
    if (!v) return null;
    if (NAMED[v]) v = NAMED[v];
    var m = /^#([0-9a-f]{3,8})$/.exec(v);
    if (m) {
      var hex = m[1];
      if (hex.length === 3 || hex.length === 4) hex = hex.split('').map(function (c) { return c + c; }).join('');
      if (hex.length !== 6 && hex.length !== 8) return null;
      var n = function (i) { return parseInt(hex.slice(i, i + 2), 16); };
      return { r: n(0), g: n(2), b: n(4), a: hex.length === 8 ? round(n(6) / 255, 3) : 1 };
    }
    m = /^(rgba?|hsla?)\(([^)]*)\)$/.exec(v);
    if (!m) return null;
    var parts = m[2].replace(/\s*\/\s*/, ' / ').split(/[\s,]+/).filter(function (p) { return p && p !== '/'; });
    if (parts.length < 3) return null;
    var alphaRaw = parts[3];
    var a = alphaRaw === undefined ? 1 : alphaRaw.indexOf('%') >= 0 ? parseFloat(alphaRaw) / 100 : parseFloat(alphaRaw);
    var rgb;
    if (m[1].indexOf('rgb') === 0) {
      rgb = parts.slice(0, 3).map(function (p) { return p.indexOf('%') >= 0 ? (parseFloat(p) * 255) / 100 : parseFloat(p); });
    } else {
      var h = parseFloat(parts[0]);
      rgb = hslToRgb(h, clamp(parseFloat(parts[1]) / 100, 0, 1), clamp(parseFloat(parts[2]) / 100, 0, 1));
    }
    if (rgb.some(function (x) { return !isFinite(x); }) || !isFinite(a)) return null;
    return { r: Math.round(clamp(rgb[0], 0, 255)), g: Math.round(clamp(rgb[1], 0, 255)), b: Math.round(clamp(rgb[2], 0, 255)), a: round(clamp(a, 0, 1), 3) };
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    var f = function (nn) {
      var k = (nn + h * 12) % 12;
      var aa = s * Math.min(l, 1 - l);
      return l - aa * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    return [f(0) * 255, f(8) * 255, f(4) * 255];
  }

  // Полупрозрачный цвет поверх фона (по умолчанию — белый лист страницы).
  function flatten(c, over) {
    if (!c) return null;
    if (c.a >= 1) return { r: c.r, g: c.g, b: c.b, a: 1 };
    var bg = over || { r: 255, g: 255, b: 255, a: 1 };
    bg = flatten(bg, { r: 255, g: 255, b: 255, a: 1 });
    var a = c.a;
    return { r: Math.round(c.r * a + bg.r * (1 - a)), g: Math.round(c.g * a + bg.g * (1 - a)), b: Math.round(c.b * a + bg.b * (1 - a)), a: 1 };
  }

  function luminance(c) {
    var f = flatten(c);
    var lin = [f.r, f.g, f.b].map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  }

  // Контраст по WCAG. fg может быть полупрозрачным — тогда он кладётся поверх фона.
  function contrast(fg, bg) {
    var cfg = parse(fg); var cbg = parse(bg);
    if (!cfg || !cbg) return null;
    var solidBg = flatten(cbg);
    var solidFg = flatten(cfg, solidBg);
    var l1 = luminance(solidFg); var l2 = luminance(solidBg);
    var hi = Math.max(l1, l2); var lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
  }

  function hsl(input) {
    var c = parse(input);
    if (!c) return null;
    var f = flatten(c);
    var r = f.r / 255; var g = f.g / 255; var b = f.b / 255;
    var max = Math.max(r, g, b); var min = Math.min(r, g, b);
    var l = (max + min) / 2; var s = 0; var h = 0;
    var d = max - min;
    if (d !== 0) {
      s = d / (1 - Math.abs(2 * l - 1));
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return { h: round(h, 1), s: round(s, 3), l: round(l, 3) };
  }

  function hueDistance(a, b) { var d = Math.abs(((a - b) % 360 + 360) % 360); return Math.min(d, 360 - d); }

  // sRGB → Lab (D65) и расстояние CIE76.
  function toLab(c) {
    var f = flatten(c);
    var rgb = [f.r, f.g, f.b].map(function (v) {
      v /= 255;
      return (v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92) * 100;
    });
    var x = (rgb[0] * 0.4124 + rgb[1] * 0.3576 + rgb[2] * 0.1805) / 95.047;
    var y = (rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722) / 100;
    var z = (rgb[0] * 0.0193 + rgb[1] * 0.1192 + rgb[2] * 0.9505) / 108.883;
    var g = function (t) { return t > 0.008856 ? Math.pow(t, 1 / 3) : 7.787 * t + 16 / 116; };
    x = g(x); y = g(y); z = g(z);
    return { L: 116 * y - 16, a: 500 * (x - y), b: 200 * (y - z) };
  }
  function deltaE(c1, c2) {
    var a = parse(c1); var b = parse(c2);
    if (!a || !b) return null;
    var l1 = toLab(a); var l2 = toLab(b);
    return Math.sqrt(Math.pow(l1.L - l2.L, 2) + Math.pow(l1.a - l2.a, 2) + Math.pow(l1.b - l2.b, 2));
  }

  // Тёплый / холодный / нейтральный (у малонасыщенных и очень тёмных/светлых — нейтральный).
  function temperature(input) {
    var c = hsl(input);
    if (!c) return 'neutral';
    if (c.s < 0.12 || c.l < 0.08 || c.l > 0.95) return 'neutral';
    return (c.h <= 75 || c.h >= 300) ? 'warm' : 'cool';
  }

  // Насыщенные оттенки набора (для схем гармонии): [{ key, h }].
  function chromaticHues(colors, keys) {
    var out = [];
    (keys || Object.keys(colors)).forEach(function (k) {
      var c = hsl(colors[k]);
      if (c && c.s >= 0.12 && c.l > 0.08 && c.l < 0.95) out.push({ key: k, h: c.h });
    });
    return out;
  }

  // Распознать схему набора оттенков (приблизительно, с допуском tol по кругу).
  function scheme(hues, tol) {
    tol = tol || 18;
    var hs = hues.slice().sort(function (a, b) { return a - b; });
    if (hs.length <= 1) return 'mono';
    var span = hueDistance(hs[0], hs[hs.length - 1]);
    var maxPair = 0;
    for (var i = 0; i < hs.length; i++) for (var j = i + 1; j < hs.length; j++) maxPair = Math.max(maxPair, hueDistance(hs[i], hs[j]));
    if (maxPair <= tol) return 'mono';
    if (hs.length === 2) return Math.abs(maxPair - 180) <= tol * 1.6 ? 'complementary' : (maxPair <= 60 + tol ? 'analogous' : 'other');
    if (span <= 90 + tol) return 'analogous';
    // триада ~120°
    var triad = hs.length === 3 && Math.abs(hueDistance(hs[0], hs[1]) - 120) <= tol * 1.6 && Math.abs(hueDistance(hs[1], hs[2]) - 120) <= tol * 1.6;
    if (triad) return 'triadic';
    return 'other';
  }

  var SCHEME_RU = { mono: 'монохромная', analogous: 'аналоговая', complementary: 'комплементарная', triadic: 'триада', other: 'набор' };

  // ─── Проверка правил ──────────────────────────────────────────────────────────────────────────────────
  function lab(labels, key) { return (labels && labels[key]) || key; }

  var CHECKS = {
    contrast: function (rule, colors, labels) {
      var ratio = contrast(colors[rule.fg], colors[rule.bg]);
      var need = rule.min || 4.5;
      if (ratio == null) return bad(rule, 'не задан цвет для «' + lab(labels, rule.fg) + '» или «' + lab(labels, rule.bg) + '»');
      var ok = ratio + 1e-6 >= need;
      var name = 'Читаемость: «' + lab(labels, rule.fg) + '» на «' + lab(labels, rule.bg) + '»';
      return { type: 'contrast', ok: ok, label: name,
        detail: ok ? 'контраст ' + ratio.toFixed(1) + ':1 — читается' : 'контраст всего ' + ratio.toFixed(1) + ':1, нужно ≥ ' + need + ':1 — текст плохо читается' };
    },
    distinct: function (rule, colors, labels) {
      var de = deltaE(colors[rule.a], colors[rule.b]);
      var need = rule.minDeltaE || 8;
      if (de == null) return bad(rule, 'не задан цвет для «' + lab(labels, rule.a) + '» или «' + lab(labels, rule.b) + '»');
      var ok = de + 1e-6 >= need;
      return { type: 'distinct', ok: ok, label: '«' + lab(labels, rule.a) + '» отличается от «' + lab(labels, rule.b) + '»',
        detail: ok ? 'хорошо различимы' : 'почти сливаются — сделайте их заметно разными по светлоте или оттенку' };
    },
    // Акцент заметно выделяется на фоне (и, при maxHues, не множьте акценты).
    accent: function (rule, colors, labels) {
      var ratio = contrast(colors[rule.accent], colors[rule.bg]);
      var need = rule.minContrast || 3;
      if (ratio == null) return bad(rule, 'не задан цвет для акцента или фона');
      var ok = ratio + 1e-6 >= need;
      return { type: 'accent', ok: ok, label: 'Акцент «' + lab(labels, rule.accent) + '» выделяется на фоне',
        detail: ok ? 'акцент заметен' : 'акцент сливается с фоном — возьмите более контрастный цвет' };
    },
    harmony: function (rule, colors, labels) {
      var hues = chromaticHues(colors, rule.roles).map(function (x) { return x.h; });
      if (hues.length < 2) return { type: 'harmony', ok: true, label: 'Гармония цветов', detail: 'недостаточно цветных оттенков для проверки — ок' };
      var got = scheme(hues, rule.tol);
      var want = rule.scheme || 'any';
      var ok = want === 'any' ? got !== 'other' : got === want;
      return { type: 'harmony', ok: ok, label: 'Гармония: ' + (want === 'any' ? 'цвета сочетаются' : SCHEME_RU[want] + ' схема'),
        detail: ok ? 'оттенки сочетаются (' + SCHEME_RU[got] + ')' : 'оттенки не складываются в ' + (want === 'any' ? 'единую схему' : SCHEME_RU[want] + ' схему') + ' — палитра распадается' };
    },
    temperature: function (rule, colors, labels) {
      var badOnes = (rule.roles || []).filter(function (k) { var t = temperature(colors[k]); return t !== 'neutral' && t !== rule.want; });
      var ok = badOnes.length === 0;
      var wantRu = rule.want === 'warm' ? 'тёплую' : 'холодную';
      return { type: 'temperature', ok: ok, label: 'Настроение: ' + wantRu + ' гамма',
        detail: ok ? 'гамма ' + wantRu : 'для этого макета ждём ' + wantRu + ' гамму — ' + badOnes.map(function (k) { return '«' + lab(labels, k) + '»'; }).join(', ') + ' выбивается' };
    },
    match: function (rule, colors, labels) {
      var de = deltaE(colors[rule.role], rule.target);
      var need = rule.maxDeltaE || 10;
      if (de == null) return bad(rule, 'не задан цвет для «' + lab(labels, rule.role) + '»');
      var ok = de <= need;
      return { type: 'match', ok: ok, label: '«' + lab(labels, rule.role) + '» близок к образцу',
        detail: ok ? 'совпадает с образцом' : 'пока далеко от нужного цвета' };
    },
  };
  function bad(rule, detail) { return { type: rule.type, ok: false, label: rule.type, detail: detail }; }

  // colors: { roleKey: 'rgb(...)'|'#...'|null }, rules: [...], labels: { roleKey: 'Фон карточки' }.
  function grade(colors, rules, labels) {
    var checks = (rules || []).map(function (rule) {
      var fn = CHECKS[rule.type];
      return fn ? fn(rule, colors, labels || {}) : { type: rule.type, ok: true, label: rule.type, detail: 'правило неизвестно — пропущено' };
    });
    return { success: checks.every(function (c) { return c.ok; }), checks: checks };
  }

  return {
    parse: parse, contrast: contrast, luminance: luminance, deltaE: deltaE,
    hsl: hsl, hueDistance: hueDistance, temperature: temperature, scheme: scheme,
    chromaticHues: chromaticHues, flatten: flatten, grade: grade, SCHEME_RU: SCHEME_RU,
  };
});
