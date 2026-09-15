/* Coupled autoregressive metapopulation model for the home-page figure.
   Six patches, shared noise + dispersal, redrawn on slider input. */
(function () {
  var plot = document.getElementById("plot");
  if (!plot) return;

  var N = 6, T = 240, A = 0.72;
  var W = 720, H = 300, BAND = H / N, AMP = 20;
  var COLORS = ["#4FA8C9", "#58B2C6", "#64BBBD", "#72C3B0", "#84CBA4", "#98D29A"];

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function gauss(rnd) {
    var u = 1 - rnd(), v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // Fixed draws so moving a slider morphs the same realization
  var rnd = mulberry32(20260913);
  var epsCommon = [], epsLocal = [], i, t, s, row;
  for (t = 0; t < T; t++) epsCommon.push(gauss(rnd));
  for (i = 0; i < N; i++) {
    row = [];
    for (s = 0; s < T; s++) row.push(gauss(rnd));
    epsLocal.push(row);
  }

  function simulate(rho, d) {
    var x = new Array(N).fill(0), nx = new Array(N), out = [], k, j, mean;
    for (k = 0; k < N; k++) out.push([]);
    var wc = Math.sqrt(rho), wl = Math.sqrt(1 - rho);
    for (k = 0; k < T; k++) {
      mean = 0;
      for (j = 0; j < N; j++) {
        nx[j] = A * x[j] + wl * epsLocal[j][k] + wc * epsCommon[k];
        mean += nx[j];
      }
      mean /= N;
      for (j = 0; j < N; j++) {
        x[j] = (1 - d) * nx[j] + d * mean;
        out[j].push(x[j]);
      }
    }
    return out;
  }

  function corr(a, b) {
    var n = a.length, ma = 0, mb = 0, k;
    for (k = 0; k < n; k++) { ma += a[k]; mb += b[k]; }
    ma /= n; mb /= n;
    var sa = 0, sb = 0, sab = 0, da, db;
    for (k = 0; k < n; k++) {
      da = a[k] - ma; db = b[k] - mb;
      sa += da * da; sb += db * db; sab += da * db;
    }
    var den = Math.sqrt(sa * sb);
    return den === 0 ? 0 : sab / den;
  }

  function meanPairwise(series) {
    var sum = 0, k = 0, a, b;
    for (a = 0; a < N; a++) for (b = a + 1; b < N; b++) { sum += corr(series[a], series[b]); k++; }
    return sum / k;
  }

  var NS = "http://www.w3.org/2000/svg";
  var tracesG = document.getElementById("traces");
  var baseG = document.getElementById("baselines");
  var valEl = document.getElementById("syncVal");
  var barEl = document.getElementById("syncBar");
  var dispEl = document.getElementById("disp");
  var moranEl = document.getElementById("moran");
  var paths = [];

  for (i = 0; i < N; i++) {
    var y = BAND * (i + 0.5);
    var base = document.createElementNS(NS, "line");
    base.setAttribute("x1", 0); base.setAttribute("x2", W);
    base.setAttribute("y1", y); base.setAttribute("y2", y);
    base.setAttribute("class", "base");
    baseG.appendChild(base);

    var p = document.createElementNS(NS, "path");
    p.setAttribute("class", "trace");
    p.setAttribute("stroke", COLORS[i]);
    p.setAttribute("pathLength", "1");
    tracesG.appendChild(p);
    paths.push(p);
  }

  function toPath(series, idx, scale) {
    var y0 = BAND * (idx + 0.5), d = "", k, x, y;
    for (k = 0; k < T; k++) {
      x = (k / (T - 1)) * W;
      y = y0 - series[k] * scale;
      d += (k === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1);
    }
    return d;
  }

  function render() {
    var series = simulate(parseFloat(moranEl.value), parseFloat(dispEl.value));
    var peak = 0, a, k;
    for (a = 0; a < N; a++) for (k = 0; k < T; k++) {
      var v = Math.abs(series[a][k]);
      if (v > peak) peak = v;
    }
    var scale = peak > 0 ? AMP / peak : 1;
    for (a = 0; a < N; a++) paths[a].setAttribute("d", toPath(series[a], a, scale));

    var r = meanPairwise(series);
    valEl.textContent = r.toFixed(2);
    barEl.style.width = Math.max(0, Math.min(1, r)) * 100 + "%";
  }

  function clearDash() {
    paths.forEach(function (p) {
      p.style.transition = "";
      p.style.strokeDasharray = "";
      p.style.strokeDashoffset = "";
    });
  }

  render();

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce) {
    paths.forEach(function (p, idx) {
      p.style.strokeDasharray = "1";
      p.style.strokeDashoffset = "1";
      requestAnimationFrame(function () {
        p.style.transition = "stroke-dashoffset 1.5s cubic-bezier(.22,.61,.36,1) " + (idx * 0.11) + "s";
        p.style.strokeDashoffset = "0";
      });
    });
    setTimeout(clearDash, 2600);
  }

  [dispEl, moranEl].forEach(function (el) {
    el.addEventListener("input", function () { clearDash(); render(); });
  });
})();
