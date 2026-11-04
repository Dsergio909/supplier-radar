/**
 * Supplier Radar demo — reading a document in the browser.
 *
 * Photos and scans go through Tesseract.js (OCR compiled to WebAssembly); PDFs
 * through pdf.js: a digital PDF already has its text, a scanned one is drawn
 * page by page and read like a photo. Everything runs on this page: the file is
 * never uploaded anywhere. The engine (≈9 MB with the Spanish model) is loaded
 * only the first time someone reads a document.
 *
 * A phone photo is prepared as a scanner app would: the sheet is found on the desk
 * and flattened, the lighting evened out (shade, dim rooms, security backgrounds),
 * form and table lines removed, a crooked page straightened and the text scaled to
 * the size OCR reads best. Then it is read three ways (the page, scattered text, and
 * the photo as it came); Documents.readAll puts the readings together and flags a
 * date they disagree on.
 *
 * The real version does the same with Google Drive's OCR (apps-script/Code.js).
 */
(function (root) {
  'use strict';

  var BASE = new URL('vendor/', document.baseURI).href;
  var WORK_SIDE = 2600;    // photos are first brought to this size to find the sheet
  var LINE_PX = 34;        // OCR reads best when a line of text is about this tall (≈ a 300 dpi scan)
  var MAX_PIXELS = 14e6;   // and the page is not huge (slow)
  var MAX_PAGES = 3;       // a supplier's PDF rarely needs more to say what it is
  var worker = null;
  var pdfjs = null;
  // Progress of the current reading: which of the passes is running.
  var report = null, pass = 0, PASSES = 3;
  // Pixels are read back often (lighting, lines, tilt): tell the browser so it keeps them in memory.
  var CTX = { willReadFrequently: true };

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('load')); };
      document.head.appendChild(s);
    });
  }

  function getWorker(progress) {
    report = progress || null;
    if (worker) return worker;
    worker = loadScript(BASE + 'tesseract/tesseract.min.js').then(function () {
      return root.Tesseract.createWorker('spa', 1, {
        workerPath: BASE + 'tesseract/worker.min.js',
        corePath: BASE + 'tesseract/core/',
        langPath: BASE + 'tesseract/lang/',
        workerBlobURL: false,
        cacheMethod: 'none',
        logger: function (m) {
          if (!report || !m || typeof m.progress !== 'number') return;
          if (/recogniz/.test(m.status)) report(m.status, Math.min(1, (pass + m.progress) / PASSES));
          else report(m.status, m.progress);
        }
      });
    });
    // Tesseract's own notes ("Estimating resolution as…") would fill the console: off.
    worker = worker.then(function (w) { return w.setParameters({ debug_file: '/dev/null' }).then(function () { return w; }); });
    worker.catch(function () { worker = null; });
    return worker;
  }

  function getPdf() {
    if (pdfjs) return pdfjs;
    pdfjs = import(BASE + 'pdfjs/pdf.min.mjs').then(function (lib) {
      lib.GlobalWorkerOptions.workerSrc = BASE + 'pdfjs/pdf.worker.min.mjs';
      return lib;
    });
    pdfjs.catch(function () { pdfjs = null; });
    return pdfjs;
  }

  function canvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  /** Solve the 8×8 system of a perspective transform: maps `to` corners onto `from` corners. */
  function homography(to, from) {
    var a = [], i, r, c;
    for (i = 0; i < 4; i++) {
      var u = to[i][0], v = to[i][1], x = from[i][0], y = from[i][1];
      a.push([u, v, 1, 0, 0, 0, -x * u, -x * v, x]);
      a.push([0, 0, 0, u, v, 1, -y * u, -y * v, y]);
    }
    for (c = 0; c < 8; c++) {
      var p = c;
      for (r = c + 1; r < 8; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
      var t = a[c]; a[c] = a[p]; a[p] = t;
      if (Math.abs(a[c][c]) < 1e-9) return null;
      for (r = 0; r < 8; r++) {
        if (r === c) continue;
        var f = a[r][c] / a[c][c];
        for (var k = c; k < 9; k++) a[r][k] -= f * a[c][k];
      }
    }
    return a.map(function (row, k) { return row[8] / row[k]; });
  }

  /**
   * The four corners of the sheet in a photo taken on a desk: the largest bright region,
   * if it looks like a sheet. Null for a scan or a screenshot (the page fills the image).
   */
  function findSheet(c) {
    var s = Math.min(1, 400 / Math.max(c.width, c.height));
    var w = Math.max(1, Math.round(c.width * s)), h = Math.max(1, Math.round(c.height * s));
    var t = canvas(w, h), ctx = t.getContext('2d', CTX);
    ctx.drawImage(c, 0, 0, w, h);
    var d = ctx.getImageData(0, 0, w, h).data, n = w * h, lum = new Uint8Array(n), hist = new Float64Array(256), i;
    for (i = 0; i < n; i++) { lum[i] = Math.round(0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]); hist[lum[i]]++; }
    // Otsu: the threshold that best splits paper from desk.
    var sum = 0, sumB = 0, wB = 0, best = 0, cut = 128;
    for (i = 0; i < 256; i++) sum += i * hist[i];
    for (i = 0; i < 256; i++) {
      wB += hist[i]; if (!wB) continue;
      var wF = n - wB; if (!wF) break;
      sumB += i * hist[i];
      var between = wB * wF * Math.pow(sumB / wB - (sum - sumB) / wF, 2);
      if (between > best) { best = between; cut = i; }
    }
    // A sheet in the shade is darker than the threshold at one end: grow from the bright part
    // into connected pixels down to a lower threshold (between the desk and the cut).
    var dark = 0, darkN = 0;
    for (i = 0; i < n; i++) if (lum[i] <= cut) { dark += lum[i]; darkN++; }
    var low = darkN ? cut - (cut - dark / darkN) * 0.55 : cut;
    var seen = new Uint8Array(n), biggest = [];
    for (i = 0; i < n; i++) {
      if (seen[i] || lum[i] <= cut) continue;
      var stack = [i], part = [];
      seen[i] = 1;
      while (stack.length) {
        var k = stack.pop(), x = k % w, y = (k - x) / w;
        part.push(k);
        if (x > 0 && !seen[k - 1] && lum[k - 1] > low) { seen[k - 1] = 1; stack.push(k - 1); }
        if (x < w - 1 && !seen[k + 1] && lum[k + 1] > low) { seen[k + 1] = 1; stack.push(k + 1); }
        if (y > 0 && !seen[k - w] && lum[k - w] > low) { seen[k - w] = 1; stack.push(k - w); }
        if (y < h - 1 && !seen[k + w] && lum[k + w] > low) { seen[k + w] = 1; stack.push(k + w); }
      }
      if (part.length > biggest.length) biggest = part;
    }
    if (biggest.length < 0.2 * n) return null;
    var tl = null, tr = null, br = null, bl = null;
    biggest.forEach(function (k) {
      var x = k % w, y = (k - x) / w;
      if (!tl || x + y < tl[0] + tl[1]) tl = [x, y];
      if (!br || x + y > br[0] + br[1]) br = [x, y];
      if (!tr || x - y > tr[0] - tr[1]) tr = [x, y];
      if (!bl || x - y < bl[0] - bl[1]) bl = [x, y];
    });
    var quad = [tl, tr, br, bl];
    var area = 0;
    for (i = 0; i < 4; i++) { var a = quad[i], b = quad[(i + 1) % 4]; area += a[0] * b[1] - b[0] * a[1]; }
    area = Math.abs(area) / 2;
    // A sheet: it does not fill the photo, and the bright region is close to that four-sided shape.
    if (area > 0.93 * n || biggest.length < 0.85 * area) return null;
    return quad.map(function (q) { return [(q[0] + 0.5) / s, (q[1] + 0.5) / s]; });
  }

  /** The sheet cut out and flattened, as a scanner app does; the image as it was if no sheet is found. */
  function flatten(c) {
    var q = findSheet(c);
    if (!q) return c;
    var dist = function (a, b) { return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2)); };
    var W = Math.round((dist(q[0], q[1]) + dist(q[3], q[2])) / 2), H = Math.round((dist(q[0], q[3]) + dist(q[1], q[2])) / 2);
    var m = homography([[0, 0], [W, 0], [W, H], [0, H]], q);
    if (!m || W < 200 || H < 200) return c;
    var sw = c.width, sh = c.height, src = c.getContext('2d', CTX).getImageData(0, 0, sw, sh).data;
    var out = canvas(W, H), octx = out.getContext('2d', CTX), img = octx.createImageData(W, H), d = img.data;
    for (var v = 0; v < H; v++) {
      for (var u = 0; u < W; u++) {
        var z = m[6] * u + m[7] * v + 1;
        var x = (m[0] * u + m[1] * v + m[2]) / z, y = (m[3] * u + m[4] * v + m[5]) / z;
        var x0 = Math.floor(x), y0 = Math.floor(y), o = (v * W + u) * 4;
        if (x0 < 0 || y0 < 0 || x0 >= sw - 1 || y0 >= sh - 1) { d[o] = d[o + 1] = d[o + 2] = d[o + 3] = 255; continue; }
        var fx = x - x0, fy = y - y0, p = (y0 * sw + x0) * 4;
        for (var ch = 0; ch < 3; ch++) {
          var top = src[p + ch] * (1 - fx) + src[p + 4 + ch] * fx;
          var bottom = src[p + sw * 4 + ch] * (1 - fx) + src[p + sw * 4 + 4 + ch] * fx;
          d[o + ch] = top * (1 - fy) + bottom * fy;
        }
        d[o + 3] = 255;
      }
    }
    octx.putImageData(img, 0, 0);
    return out;
  }

  /**
   * A grey copy with even lighting: each pixel divided by the paper's brightness around
   * it. Shadows, dim rooms, yellow light and security backgrounds fade; the ink stays.
   */
  function evenLight(src) {
    var w = src.width, h = src.height;
    // The paper's brightness: the picture shrunk to a few dozen pixels (averaging away
    // the letters) and blown back up.
    var small = canvas(Math.max(8, Math.round(w / 40)), Math.max(8, Math.round(h / 40)));
    var sctx = small.getContext('2d', CTX);
    sctx.imageSmoothingQuality = 'high';
    sctx.drawImage(src, 0, 0, small.width, small.height);
    // Letters pull the average down: lift each cell towards its brightest neighbour.
    var sd = sctx.getImageData(0, 0, small.width, small.height), sp = sd.data, sw = small.width, sh = small.height;
    var lum = new Float32Array(sw * sh), i, x, y;
    for (i = 0; i < sw * sh; i++) lum[i] = 0.299 * sp[i * 4] + 0.587 * sp[i * 4 + 1] + 0.114 * sp[i * 4 + 2];
    var lifted = new Float32Array(sw * sh);
    for (y = 0; y < sh; y++) for (x = 0; x < sw; x++) {
      var m = 0;
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
        var yy = Math.min(sh - 1, Math.max(0, y + dy)), xx = Math.min(sw - 1, Math.max(0, x + dx));
        if (lum[yy * sw + xx] > m) m = lum[yy * sw + xx];
      }
      lifted[y * sw + x] = m;
    }
    for (i = 0; i < sw * sh; i++) { sp[i * 4] = sp[i * 4 + 1] = sp[i * 4 + 2] = lifted[i]; sp[i * 4 + 3] = 255; }
    sctx.putImageData(sd, 0, 0);
    var bg = canvas(w, h).getContext('2d', CTX);
    bg.imageSmoothingQuality = 'high';
    bg.drawImage(small, 0, 0, w, h);
    var b = bg.getImageData(0, 0, w, h).data;
    var out = canvas(w, h), octx = out.getContext('2d', CTX);
    octx.drawImage(src, 0, 0);
    var img = octx.getImageData(0, 0, w, h), d = img.data;
    var hist = new Uint32Array(256);
    for (i = 0; i < d.length; i += 4) {
      var g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      var v = Math.min(255, Math.round((g / Math.max(24, b[i])) * 255));
      d[i] = v;
      hist[v]++;
    }
    // Contrast: the darkest ink to black and the paper to white. In a dim photo the ink
    // is only a little darker than the paper; stretched, it reads as well as a scan.
    var total = d.length / 4, seenPx = 0, ink = 0;
    for (ink = 0; ink < 256; ink++) { seenPx += hist[ink]; if (seenPx > total * 0.006) break; }
    ink = Math.min(ink, 150);
    var span = Math.max(40, 235 - ink);
    for (i = 0; i < d.length; i += 4) {
      var s = Math.max(0, Math.min(255, (d[i] - ink) * 255 / span));
      d[i] = d[i + 1] = d[i + 2] = s;
    }
    octx.putImageData(img, 0, 0);
    return out;
  }

  /**
   * Form and table lines removed: long straight runs of ink. OCR reads the digits of a
   * RUT's boxes ("|9|0|0|") as garbage when the boxes are there.
   */
  function withoutLines(c) {
    var w = c.width, h = c.height, ctx = c.getContext('2d', CTX);
    var img = ctx.getImageData(0, 0, w, h), d = img.data;
    var dark = new Uint8Array(w * h), i, x, y, run;
    for (i = 0; i < w * h; i++) dark[i] = d[i * 4] < 140 ? 1 : 0;
    var minH = Math.round(w * 0.035), minV = Math.round(h * 0.035), gap = Math.max(2, Math.round(w * 0.002));
    var wipe = new Uint8Array(w * h), ruled = new Uint8Array(w * h);
    // Horizontal rules (a row of boxes has tiny gaps between them: bridged).
    var mark = function (row, from, to) {
      if (from >= 0 && to - from + 1 >= minH) for (var k = from; k <= to; k++) ruled[row * w + k] = 1;
    };
    for (y = 0; y < h; y++) {
      var start = -1, last = -1;
      for (x = 0; x < w; x++) {
        if (!dark[y * w + x]) continue;
        if (start < 0 || x - last > gap) { mark(y, start, last); start = x; }
        last = x;
      }
      mark(y, start, last);
    }
    var near = function (yy, xx) {
      for (var t = -3; t <= 3; t++) { var r = yy + t; if (r >= 0 && r < h && ruled[r * w + xx]) return true; }
      return false;
    };
    for (i = 0; i < w * h; i++) if (ruled[i]) wipe[i] = 1;
    // Vertical rules: long ones, and the sides of boxes and cells (from one ruled line to the next).
    for (x = 0; x < w; x++) {
      run = 0;
      for (y = 0; y <= h; y++) {
        if (y < h && dark[y * w + x]) { run++; continue; }
        if (run >= minV || (run >= 8 && near(y - run, x) && near(y - 1, x))) for (var j = y - run; j < y; j++) wipe[j * w + x] = 1;
        run = 0;
      }
    }
    for (i = 0; i < w * h; i++) if (wipe[i]) { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 255; }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  /**
   * How many degrees the lines of text lean (a photo taken a little crooked), from the
   * angle at which rows of ink line up best, within ±15° (quarter turns are tried apart);
   * and how tall a line of text is, in pixels of `c`.
   */
  function skew(c) {
    var s = Math.min(1, 700 / Math.max(c.width, c.height));
    var w = Math.round(c.width * s), h = Math.round(c.height * s);
    var t = canvas(w, h), ctx = t.getContext('2d', CTX);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(c, 0, 0, w, h);
    var d = ctx.getImageData(0, 0, w, h).data, xs = [], ys = [];
    for (var y = 0; y < h; y += 1) for (var x = 0; x < w; x += 1) if (d[(y * w + x) * 4] < 110) { xs.push(x); ys.push(y); }
    if (xs.length < 200) return { angle: 0, line: 0 };
    var best = 0, bestScore = -1, bestBins = null;
    for (var a = -15; a <= 15; a += 0.5) {
      var r = a * Math.PI / 180, sin = Math.sin(r), cos = Math.cos(r);
      var bins = new Float32Array(h * 2 + w * 2), off = w + h;
      for (var i = 0; i < xs.length; i++) bins[Math.round(ys[i] * cos - xs[i] * sin) + off]++;
      var score = 0;
      for (var k = 0; k < bins.length; k++) score += bins[k] * bins[k];
      if (score > bestScore) { bestScore = score; best = a; bestBins = bins; }
    }
    // Lines of text: runs of rows with ink, at the best angle. The median height is the size of the print.
    var max = 0, runs = [], run = 0, j;
    for (j = 0; j < bestBins.length; j++) if (bestBins[j] > max) max = bestBins[j];
    for (j = 0; j <= bestBins.length; j++) {
      if (j < bestBins.length && bestBins[j] > max * 0.04) { run++; continue; }
      if (run >= 2) runs.push(run);
      run = 0;
    }
    runs.sort(function (x, y) { return x - y; });
    var line = runs.length >= 3 ? runs[Math.floor(runs.length / 2)] / s : 0;
    return { angle: best, line: line };
  }

  /**
   * The image ready for OCR: scaled to a size OCR reads well, turned `quarter` × 90°
   * (the canvas grows: nothing is cropped), lighting evened out, straightened, lines removed.
   */
  function resized(c, long) {
    var s = long / Math.max(c.width, c.height);
    if (Math.abs(s - 1) < 0.05) return c;
    var out = canvas(Math.round(c.width * s), Math.round(c.height * s)), ctx = out.getContext('2d', CTX);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(c, 0, 0, out.width, out.height);
    return out;
  }

  function turned(source, quarter) {
    var w = source.width, h = source.height;
    var scale = Math.min(1, WORK_SIDE / Math.max(w, h));
    w = Math.round(w * scale);
    h = Math.round(h * scale);
    var side = quarter % 2 === 1;
    var c = canvas(side ? h : w, side ? w : h);
    var ctx = c.getContext('2d', CTX);
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate(quarter * Math.PI / 2);
    ctx.drawImage(source, -w / 2, -h / 2, w, h);
    var flat = evenLight(flatten(c));
    var found = skew(flat), angle = found.angle;
    // Text scaled to the size OCR reads best: small print in a phone photo (a certificate's
    // issue date in a tiny header) is enlarged; large print is reduced, which is also faster.
    if (found.line) {
      var k = Math.max(0.5, Math.min(3, LINE_PX / found.line));
      k = Math.min(k, Math.sqrt(MAX_PIXELS / (flat.width * flat.height)));
      flat = resized(flat, Math.max(flat.width, flat.height) * k);
    }
    if (Math.abs(angle) >= 1) {
      var r = -angle * Math.PI / 180, cw = flat.width, ch = flat.height;
      var nw = Math.round(Math.abs(cw * Math.cos(r)) + Math.abs(ch * Math.sin(r)));
      var nh = Math.round(Math.abs(cw * Math.sin(r)) + Math.abs(ch * Math.cos(r)));
      var straight = canvas(nw, nh), sctx = straight.getContext('2d', CTX);
      sctx.fillStyle = '#fff';
      sctx.fillRect(0, 0, nw, nh);
      sctx.translate(nw / 2, nh / 2);
      sctx.rotate(r);
      sctx.drawImage(flat, -cw / 2, -ch / 2);
      flat = straight;
    }
    return withoutLines(flat);
  }

  function words(text) {
    return (String(text).match(/[A-Za-zÁÉÍÓÚÑáéíóúñ]{4,}/g) || []).length;
  }

  /** The picture only turned and scaled, with no clean-up (some photos read better as they are). */
  function plainTurned(source, quarter) {
    var s = Math.min(1, WORK_SIDE / Math.max(source.width, source.height));
    var w = Math.round(source.width * s), h = Math.round(source.height * s), side = quarter % 2 === 1;
    var c = canvas(side ? h : w, side ? w : h), ctx = c.getContext('2d', CTX);
    ctx.imageSmoothingQuality = 'high';
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate(quarter * Math.PI / 2);
    ctx.drawImage(source, -w / 2, -h / 2, w, h);
    return c;
  }

  /**
   * Read an image (or a drawn PDF page) the right way up: as it comes first; if it
   * reads badly (a phone photo taken sideways), the other three orientations.
   * Then two more readings of the same page (as scattered text, and the picture without
   * clean-up): each catches lines the others miss, such as a small header beside a title.
   * Resolves { text (the first reading), texts: [the three readings], quarter }.
   */
  function readImage(source, progress) {
    return getWorker(progress).then(function (w) {
      var best = null;
      var quarters = [0, 1, 2, 3];
      pass = 0;
      function next(i) {
        if (i >= quarters.length) return Promise.resolve(best);
        var page = turned(source, quarters[i]);
        return w.recognize(page).then(function (res) {
          var d = res.data;
          var score = d.confidence * Math.min(1, words(d.text) / 15);
          if (!best || score > best.score) best = { text: d.text, score: score, quarter: quarters[i], confidence: d.confidence, page: page };
          if (i === 0 && d.confidence >= 70 && words(d.text) >= 15) return best;
          return next(i + 1);
        });
      }
      var texts = [];
      return next(0).then(function () {
        texts.push(best.text);
        pass = 1;
        return w.setParameters({ tessedit_pageseg_mode: '11' });
      }).then(function () { return w.recognize(best.page); }).then(function (res) {
        texts.push(res.data.text);
        pass = 2;
        return w.setParameters({ tessedit_pageseg_mode: '3' });
      }).then(function () { return w.recognize(plainTurned(source, best.quarter)); }).then(function (res) {
        texts.push(res.data.text);
        return { text: best.text, texts: texts, quarter: best.quarter, confidence: best.confidence };
      }, function (err) {
        return w.setParameters({ tessedit_pageseg_mode: '3' }).then(function () { throw err; });
      });
    });
  }

  function fileToImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('image')); };
      img.src = url;
    });
  }

  function readPdf(file, progress) {
    return Promise.all([getPdf(), file.arrayBuffer()]).then(function (r) {
      return r[0].getDocument({ data: new Uint8Array(r[1]), isEvalSupported: false }).promise;
    }).then(function (doc) {
      var pages = Math.min(doc.numPages, MAX_PAGES);
      var parts = [[], [], []];
      var how = 'pdf-text';
      function page(n) {
        if (n > pages) {
          var texts = parts.map(function (t) { return t.join('\n'); }).filter(function (t) { return t.trim(); });
          return { text: texts[0] || '', texts: texts, how: how, pages: doc.numPages };
        }
        return doc.getPage(n).then(function (p) {
          return p.getTextContent().then(function (content) {
            // Keep the lines: each text item that ends a line becomes a line break.
            var text = content.items.map(function (it) { return it.str + (it.hasEOL ? '\n' : ' '); }).join('');
            if (text.replace(/[^A-Za-z]/g, '').length >= 40) { parts[0].push(text); return page(n + 1); }
            // A scanned page has no text layer: draw it and read it like a photo.
            how = 'pdf-ocr';
            var viewport = p.getViewport({ scale: 2 });
            var canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            return p.render({ canvasContext: canvas.getContext('2d', CTX), viewport: viewport }).promise
              .then(function () { return readImage(canvas, progress); })
              .then(function (read) { read.texts.forEach(function (t, i) { parts[i].push(t); }); return page(n + 1); });
          });
        });
      }
      return page(1);
    });
  }

  /**
   * Text of a photo, scan or PDF chosen by the person.
   * Resolves { text, texts (every reading, for Documents.readAll), how: 'ocr' | 'pdf-text' | 'pdf-ocr', quarter }.
   */
  function readFile(file, progress) {
    var isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (isPdf) return readPdf(file, progress);
    if (!/^image\//.test(file.type)) return Promise.reject(new Error('type'));
    return fileToImage(file).then(function (img) { return readImage(img, progress); })
      .then(function (read) { return { text: read.text, texts: read.texts, how: 'ocr', quarter: read.quarter }; });
  }

  /** The same for one of the demo's sample images (same origin). */
  function readUrl(url, progress) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('load');
      return r.blob();
    }).then(function (blob) {
      return readFile(new File([blob], url.split('/').pop(), { type: blob.type || 'image/jpeg' }), progress);
    });
  }

  // prepare: the image as OCR will see it (used by the tests to look at it).
  root.RadarOcr = { readFile: readFile, readUrl: readUrl, prepare: turned };
})(window);
