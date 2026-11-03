/*
 * format.js: number formatting for the pages, the figures, the calibration scripts and the
 * checks (TP.fmt).
 *
 * Every page loads this file before site.js. The formatters are version 1's, moved here from
 * site.js unchanged, so that a script running in Node formats a number exactly as a page does.
 * notes/revamp/implementation-plan.md WO-I12 adds TP.fmt.byName for the ledger's rounding names.
 *
 * Usage: TP.fmt.int(12345.6) is "12,346"; TP.fmt.exp10(-3.5) is "3.2 × 10⁻⁴". No dependencies.
 */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};

  /* Number formatting. The two Intl formatters are made once: toLocaleString with options
     builds a new one on every call, which costs tens of microseconds, and figures format numbers
     on every input event. The output is the same. */
  var fmtInt = typeof Intl !== "undefined" ? new Intl.NumberFormat("en-US") : null;
  var fmtFrac = typeof Intl !== "undefined" ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 8 }) : null;
  TP.fmt = {
    int: function (v) { return fmtInt ? fmtInt.format(Math.round(v)) : Math.round(v).toLocaleString("en-US"); },
    pow2: function (v) { return v >= 1024 ? (v / 1024) + "k" : String(v); },
    sig: function (v, n) {
      if (v === 0) return "0";
      var p = Math.max(0, (n || 3) - 1 - Math.floor(Math.log10(Math.abs(v))));
      var r = +v.toFixed(Math.min(p, 8));
      return fmtFrac ? fmtFrac.format(r) : r.toLocaleString("en-US", { maximumFractionDigits: 8 });
    },
    times: function (v) { return TP.fmt.sig(v, 3) + "×"; },
    pct: function (v) { return Math.round(v * 100) + "%"; },
    /* 10 to the power e, as text: "10⁻⁵" when e is a whole number, else "2.0 × 10⁻⁴" (with
       no-break spaces around the times sign, so the number never wraps). */
    exp10: function (e) {
      var sup = function (k) {
        return String(k).replace(/[-0-9]/g, function (c) { return "⁻⁰¹²³⁴⁵⁶⁷⁸⁹".charAt(c === "-" ? 0 : +c + 1); });
      };
      var k = Math.round(e);
      if (Math.abs(e - k) < 1e-9) return "10" + sup(k);
      var p = Math.floor(e), m = Math.pow(10, e - p).toFixed(1);
      if (m === "10.0") { p += 1; m = "1.0"; }
      return m + "\u00a0×\u00a010" + sup(p);
    }
  };

  /* TP.fmt.byName(name) returns the formatter of one of the ledger's rounding names
     (implementation-plan.md WO-I12 and §5.4). A ledger row's printed text is
     TP.fmt.byName(row.rounding)(row.value), and the pages, the figures, the calibration scripts
     and the checks print a ledger number through the same function.

       int            a whole number with thousands separators, as TP.fmt.int: 12345.6 is "12,346"
       sig2, sig3     two or three significant figures, trailing zeros dropped, with thousands
                      separators: sig3 of 0.0562341 is "0.0562", of 45234 is "45,200", of 1.5 is "1.5"
       fixed1 to fixed4
                      that many decimals, trailing zeros kept: fixed2 of 0.5 is "0.50"
       pct0, pct1     a fraction as a percentage with no decimal or one: pct0 of 0.5 is "50%",
                      pct1 of 0.123 is "12.3%", pct1 of 0.5 is "50.0%"
       times2         two significant figures followed by a times sign: 3.16 is "3.2×"
       exp10          a power of ten with a superscript exponent, the mantissa rounded to two
                      significant figures: 0.001 is "10⁻³", 0.0032 is "3.2 × 10⁻³". A mantissa that
                      rounds to 1.0 prints as the bare power, so 0.00999 is "10⁻²". The times sign has
                      no-break spaces around it, as in TP.fmt.exp10, so the number never wraps.
       exp10dec       a power of ten whose exponent has at most two decimals, printed with that
                      exponent: 10^-1.5 is "10^−1.5" (a caret and a minus sign), 10^-3.25 is
                      "10^−3.25". A whole exponent, or a value that is no such power, prints as exp10.
       pow2           the nearest power of two with a superscript exponent: 1024 is "2¹⁰", 0.5 is "2⁻¹"
       none           no rounding, for a text value: "none" stays "none", and 4127 is "4127"

     Every formatter prints null and undefined as "none", passes a string through unchanged,
     prints NaN as "NaN" and an infinite value as "∞" or "-∞", and prints negative zero as 0.
     The digits are rounded by toFixed, toPrecision and toExponential, which ECMAScript specifies
     exactly, so Node and every browser print the same text, and the thousands separators are
     inserted afterwards. byName throws on an unknown name, and TP.fmt.byName.names lists the names.

     Two names differ from the version 1 formatter of the same name. byName("exp10") takes the
     value, where TP.fmt.exp10 takes its exponent. byName("pow2") prints 1024 as "2¹⁰", where
     TP.fmt.pow2, the axis tick format, prints "1k". */
  var SUPERSCRIPT = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  function superscript(k) {
    return String(k).replace(/[-0-9]/g, function (c) { return c === "-" ? "⁻" : SUPERSCRIPT.charAt(+c); });
  }
  /* A decimal numeral such as "-1234.50", with its whole part grouped in thousands. */
  function grouped(text) {
    var sign = text.charAt(0) === "-" ? "-" : "";
    var body = sign ? text.slice(1) : text, dot = body.indexOf(".");
    var whole = dot < 0 ? body : body.slice(0, dot), frac = dot < 0 ? "" : body.slice(dot);
    return sign + whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + frac;
  }
  /* toPrecision's result without an exponent: "4.52e+4" is "45200", "1.20e-7" is "0.000000120". */
  function plain(text) {
    var m = /^(-?)(\d+)(?:\.(\d+))?e([+-]\d+)$/.exec(text);
    if (!m) return text;
    var digits = m[2] + (m[3] || ""), point = m[2].length + Number(m[4]);
    var zeros = function (n) { return new Array(n + 1).join("0"); };
    if (point <= 0) return m[1] + "0." + zeros(-point) + digits;
    if (point >= digits.length) return m[1] + digits + zeros(point - digits.length);
    return m[1] + digits.slice(0, point) + "." + digits.slice(point);
  }
  function sigText(v, n) {
    var text = plain(v.toPrecision(n));
    if (text.indexOf(".") >= 0) text = text.replace(/\.?0+$/, "");
    return grouped(text);
  }
  function fixedText(v, n) { return grouped(v.toFixed(n)); }
  function exp10Text(v) {
    if (v === 0) return "0";
    if (v < 0) return "-" + exp10Text(-v);
    var m = /^(\d\.\d)e([+-]\d+)$/.exec(v.toExponential(1));
    var power = "10" + superscript(Number(m[2]));
    return m[1] === "1.0" ? power : m[1] + "\u00a0×\u00a0" + power;
  }
  /* 10^e for an exponent e with at most two decimals (the ranges and thresholds of the figures
     are set in decades and quarter decades), else exp10 */
  function exp10decText(v) {
    if (!(v > 0) || v === Infinity) return exp10Text(v);
    var e = Math.log(v) / Math.LN10, r = Math.round(e * 100) / 100;
    if (Math.abs(e - r) > 1e-9 || r === Math.round(r)) return exp10Text(v);
    return "10^" + (r < 0 ? "\u2212" : "") + String(Math.abs(r));
  }
  function pow2Text(v) {
    if (v === 0) return "0";
    if (v < 0) return "-" + pow2Text(-v);
    return "2" + superscript(Math.round(Math.log(v) / Math.LN2));
  }
  var ROUNDINGS = {
    int: function (v) { return TP.fmt.int(v); },
    sig2: function (v) { return sigText(v, 2); },
    sig3: function (v) { return sigText(v, 3); },
    fixed1: function (v) { return fixedText(v, 1); },
    fixed2: function (v) { return fixedText(v, 2); },
    fixed3: function (v) { return fixedText(v, 3); },
    fixed4: function (v) { return fixedText(v, 4); },
    pct0: function (v) { return fixedText(v * 100, 0) + "%"; },
    pct1: function (v) { return fixedText(v * 100, 1) + "%"; },
    times2: function (v) { return sigText(v, 2) + "×"; },
    exp10: exp10Text,
    exp10dec: exp10decText,
    pow2: pow2Text,
    none: function (v) { return String(v); }
  };
  var formatters = {};
  TP.fmt.byName = function (name) {
    if (!Object.prototype.hasOwnProperty.call(ROUNDINGS, name)) {
      throw new Error('TP.fmt.byName: unknown rounding name "' + name + '"; the names are ' +
        TP.fmt.byName.names.join(", "));
    }
    if (formatters[name]) return formatters[name];
    var round = ROUNDINGS[name];
    return (formatters[name] = function (v) {
      if (v === null || v === undefined) return "none";
      if (typeof v === "string") return v;
      if (typeof v !== "number") return String(v);
      if (v !== v) return "NaN";
      if (v === Infinity || v === -Infinity) return v > 0 ? "∞" : "-∞";
      var text = round(v === 0 ? 0 : v);
      /* a negative value that rounds to zero prints without its sign */
      return /^-0(\.0+)?(%|×)?$/.test(text) ? text.slice(1) : text;
    });
  };
  TP.fmt.byName.names = Object.keys(ROUNDINGS);
})(typeof window !== 'undefined' ? window : globalThis);
