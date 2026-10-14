/* Shared behaviour of the inner pages, the same as on the home page: smooth scrolling (Lenis), the header menu,
   clouds drawn in code between blocks, gentle reveals, words that light up with the scroll, the block rail, and the
   frame engine with the settings the owner approved (direct scroll mapping, neighbour blending, frames after load). */
(function(){
  var AE = window.AE = {};
  var reduce = AE.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = AE.$ = function(s, r){ return (r || document).querySelector(s); };
  var $$ = AE.$$ = function(s, r){ return [].slice.call((r || document).querySelectorAll(s)); };
  var clamp = AE.clamp = function(v, a, b){ return Math.min(b, Math.max(a, v)); };
  var smooth = AE.smooth = function(a, b, v){ var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  AE.mix = function(a, b, t){ return a + (b - a) * t; };
  var mulberry = AE.mulberry = function(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  var afterLoad = AE.afterLoad = function(fn){ if (document.readyState === 'complete') fn(); else addEventListener('load', fn, { once: true }); };
  AE.prog = function(el){ var r = el.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1); };
  AE.entry = function(el){ var r = el.getBoundingClientRect(); return clamp(1 - r.top / innerHeight, 0, 1); };
  AE.inView = function(el){ var r = el.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; };
  AE.says = function(sec, p){ $$('.say', sec).forEach(function(el){ el.classList.toggle('on', p >= +el.dataset.from && p < +el.dataset.to); }); };
  var scrollFns = [], frameFns = [], sizeFns = [];
  AE.onScroll = function(f){ scrollFns.push(f); }; AE.onFrame = function(f){ frameFns.push(f); }; AE.onSize = function(f){ sizeFns.push(f); };
  AE.lenis = null;
  AE.goTo = function(target, frac){ var el = typeof target === 'string' ? $(target) : target, y = el.offsetTop + (frac || 0) * Math.max(0, el.offsetHeight - innerHeight);
    if (AE.lenis) AE.lenis.scrollTo(y, { duration: 1.4 }); else scrollTo(0, y); };

  /* header: language list, phone menu, Escape closes both */
  function header(){
    var lb = $('#langBtn'), lm = $('#langMenu'), bg = $('#burger'), mn = $('#mnav');
    if (lb) lb.addEventListener('click', function(){ lm.hidden = !lm.hidden; lb.setAttribute('aria-expanded', lm.hidden ? 'false' : 'true'); });
    if (bg) bg.addEventListener('click', function(){ mn.hidden = !mn.hidden; bg.setAttribute('aria-expanded', mn.hidden ? 'false' : 'true'); });
    document.addEventListener('keydown', function(e){ if (e.key !== 'Escape') return; if (lm){ lm.hidden = true; lb.setAttribute('aria-expanded', 'false'); } if (mn){ mn.hidden = true; bg.setAttribute('aria-expanded', 'false'); } });
    $$('a[href^="#"]').forEach(function(a){ a.addEventListener('click', function(e){ var t = $(a.getAttribute('href')); if (!t) return; e.preventDefault(); if (mn) mn.hidden = true; AE.goTo(t, +(a.dataset.frac || 0)); }); });
  }

  /* gentle reveal */
  function reveal(){ var ro = new IntersectionObserver(function(es){ es.forEach(function(e){ if (e.isIntersecting){ e.target.classList.add('in'); ro.unobserve(e.target); } }); }, { threshold: 0.15 });
    $$('.rv').forEach(function(el){ ro.observe(el); }); }

  /* clouds: the live site's recipe (soft multi-blob sprites, light, slightly cool), flown through */
  function cloudTexture(seed){
    var c = document.createElement('canvas'), S = 256; c.width = c.height = S; var g = c.getContext('2d'), rnd = mulberry(seed);
    var l = 0.93 + rnd() * 0.07, tint = 'rgba(' + Math.round(236 * l + 14) + ',' + Math.round(242 * l + 11) + ',' + Math.round(248 * l + 7) + ',';
    for (var i = 0; i < 26; i++){
      var x = S / 2 + (rnd() - 0.5) * S * 0.58, y = S / 2 + (rnd() - 0.5) * S * 0.44, r = S * (0.09 + rnd() * 0.19);
      var gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, tint + '0.36)'); gr.addColorStop(0.55, tint + '0.14)'); gr.addColorStop(1, tint + '0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    g.globalCompositeOperation = 'source-atop';
    var sh = g.createLinearGradient(0, S * 0.35, 0, S * 0.8); sh.addColorStop(0, 'rgba(160,176,192,0)'); sh.addColorStop(1, 'rgba(160,176,192,0.2)');
    g.fillStyle = sh; g.fillRect(0, 0, S, S); return c;
  }
  var TEX = null;
  AE.cloudPuffs = function(seed, count, depth){ var rnd = mulberry(seed), out = []; if (!TEX){ TEX = []; for (var k = 0; k < 6; k++) TEX.push(cloudTexture(11 + k * 17)); }
    for (var i = 0; i < count; i++) out.push({ x: (rnd() - 0.5) * 2.6, y: (rnd() - 0.5) * 1.5, z: 0.25 + rnd() * depth, s: 0.55 + rnd() * 0.9, asp: 0.6 + rnd() * 0.3, rot: rnd() * 6.28, spin: (rnd() - 0.5) * 0.08, tex: i % 6, op: 0.45 + rnd() * 0.45 });
    out.sort(function(a, b){ return b.z - a.z; }); return out; };
  // draws one frame of puffs seen from camZ; wrap > 0 makes an endless field (ambient flight), life fades the whole layer
  AE.drawPuffs = function(ctx, W, H, puffs, camZ, life, time, wrap, cyFrac, near){
    near = near || 0.06;
    var cx = W / 2, cy = H * (cyFrac || 0.5);
    for (var i = 0; i < puffs.length; i++){
      var p = puffs[i], z = p.z; if (wrap){ z = ((p.z - camZ) % wrap + wrap) % wrap; } else z = p.z - camZ;
      var d = z; if (d < 0.06 || d > 3.4) continue;
      var k = 1 / d, size = p.s * W * 0.5 * k; if (size > W * 3.2) continue;
      var a = p.op * life * clamp((3.4 - d) / 0.9, 0, 1) * clamp((d - near) / 0.4, 0, 1); if (a < 0.01) continue;
      var x = cx + (p.x + Math.sin(time * 0.00012 + p.rot) * 0.03) * W * 0.5 * k, y = cy + p.y * H * 0.55 * k;
      ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(p.rot + time * 0.000001 * p.spin * 1000); ctx.scale(1, p.asp);
      ctx.drawImage(TEX[p.tex], -size / 2, -size / 2, size, size); ctx.restore();
    }
  };
  function cloudGaps(){
    var gaps = $$('[data-clouds]'); if (!gaps.length) return;
    var cv = document.createElement('canvas'); cv.id = 'clouds'; cv.setAttribute('aria-hidden', 'true'); document.body.appendChild(cv);
    var ctx = cv.getContext('2d'), puffs = AE.cloudPuffs(7, innerWidth < 760 ? 46 : 84, 4.2), q = -1;
    AE.onSize(function(){ cv.width = innerWidth; cv.height = innerHeight; });
    AE.onScroll(function(){ q = -1; gaps.forEach(function(g){ var r = g.getBoundingClientRect(), v = (innerHeight - r.top) / (innerHeight + r.height); if (v > 0 && v < 1) q = v; }); if (reduce) q = -1; cv.style.visibility = q >= 0 ? 'visible' : 'hidden'; });
    AE.onFrame(function(now){ if (q < 0) return; var W = cv.width, H = cv.height; ctx.clearRect(0, 0, W, H);
      AE.drawPuffs(ctx, W, H, puffs, q * 4.0, smooth(0.18, 0.34, q) * (1 - smooth(0.7, 0.88, q)), now, 0);
      var white = 0.97 * smooth(0.26, 0.47, q) * (1 - smooth(0.53, 0.76, q)); if (white > 0.005){ ctx.globalAlpha = white; ctx.fillStyle = '#e9eef2'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; } });
  }

  /* words that light up as the block scrolls past */
  AE.litText = function(el, hl){
    var words = el.textContent.trim().split(/\s+/); el.innerHTML = words.map(function(w){ return '<span class="w' + (hl && hl.test(w) ? ' hl' : '') + '">' + w + '</span>'; }).join(' ');
    var spans = $$('.w', el), shown = -1;
    return function(p){ var n = Math.round(clamp(p, 0, 1) * spans.length); if (n === shown) return; shown = n; spans.forEach(function(s, i){ s.classList.toggle('on', i < n); }); };
  };

  /* the page's blocks as a rail on the right */
  function rail(){
    var secs = $$('[data-rail]'); if (secs.length < 2) return;
    var nav = document.createElement('nav'); nav.className = 'rail'; nav.setAttribute('aria-label', 'Блоки страницы');
    nav.innerHTML = secs.map(function(s, i){ return '<button type="button"><span>' + (i + 1) + ' · ' + s.dataset.rail + '</span><i></i></button>'; }).join(''); document.body.appendChild(nav);
    var btns = $$('button', nav), cur = -1; btns.forEach(function(b, i){ b.addEventListener('click', function(){ AE.goTo(secs[i], 0); }); });
    AE.onScroll(function(){ var mid = innerHeight / 2, k = -1; secs.forEach(function(s, i){ var r = s.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) k = i; }); if (k !== cur){ cur = k; btns.forEach(function(b, i){ b.classList.toggle('on', i === k); }); } });
  }

  /* cards that stack: the ones underneath shrink a little and dim */
  function stacks(){ $$('.stack').forEach(function(st){ var cards = $$('.card', st); cards.forEach(function(c, i){ c.style.setProperty('--i', i); });
    AE.onScroll(function(){ cards.forEach(function(c, i){ var next = cards[i + 1]; if (!next){ c.style.transform = ''; c.style.filter = ''; return; }
      var r = c.getBoundingClientRect(), rn = next.getBoundingClientRect(), cover = clamp(1 - (rn.top - r.top) / Math.max(1, r.height), 0, 1);
      c.style.transform = 'scale(' + (1 - cover * 0.05).toFixed(4) + ')'; c.style.filter = 'brightness(' + (1 - cover * 0.45).toFixed(3) + ')'; }); }); }); }

  /* frame scenes: the approved settings */
  function order(n){ var out = [0, n - 1], seen = { 0: 1 }, spans = [[0, n - 1]]; seen[n - 1] = 1;
    while (spans.length){ var next = []; spans.forEach(function(s){ if (s[1] - s[0] <= 1) return; var m = (s[0] + s[1]) >> 1; if (!seen[m]){ seen[m] = 1; out.push(m); } next.push([s[0], m], [m, s[1]]); }); spans = next; }
    return out; }
  AE.Seq = function(o){
    var s = { pos: 0, drawn: -1, shown: -1, frames: new Array(o.n), ok: new Array(o.n).fill(false), started: false }, cv = o.canvas, ctx = cv.getContext('2d');
    s.start = function(){ if (s.started) return; s.started = true; var q = order(o.n), busy = 0, cap = 1;
      function more(){ cap = 6; pump(); }
      function pump(){ while (busy < cap && q.length){ (function(i){ busy++; var im = new Image(); im.decoding = 'async';
        im.onload = function(){ busy--; s.frames[i] = im; s.ok[i] = true; if (s.shown < 0 || Math.abs(i - s.pos) <= Math.abs(s.shown - s.pos) + 1) s.draw(); if (i === 0) afterLoad(more); else pump(); };
        im.onerror = function(){ busy--; if (i === 0) afterLoad(more); else pump(); };
        im.src = o.dir + 'f' + ('00' + i).slice(-3) + o.ext; })(q.shift()); } }
      pump(); };
    function nearest(i){ if (s.ok[i]) return i; for (var d = 1; d < 25; d++){ if (s.ok[i - d]) return i - d; if (s.ok[i + d]) return i + d; } return s.shown; }
    function paint(im, alpha){ var cw = cv.width, ch = cv.height, wide = cw > ch * 1.05, nw = im.naturalWidth, nh = im.naturalHeight, sc = o.fit === 'contain' ? Math.min(cw / nw, ch / nh) * (o.scale || 1) : Math.max(cw / nw, ch / nh) * (wide && o.nudge ? 1 + o.nudge : 1);
      var w = nw * sc, h = nh * sc, dx = wide && o.nudge ? cw * o.nudge : 0, dy = !wide && o.lift ? ch * o.lift : 0; ctx.globalAlpha = alpha; ctx.drawImage(im, (cw - w) / 2 + dx, (ch - h) / 2 + dy, w, h); }
    s.draw = function(){ var i0 = Math.floor(s.pos), t = s.pos - i0, a = nearest(i0); if (a < 0 || a === undefined || !s.frames[a]) return; var blend = a === i0 && t > 0.004 && s.ok[i0 + 1];
      if (o.fit === 'contain'){ ctx.clearRect(0, 0, cv.width, cv.height); ctx.globalCompositeOperation = 'lighter'; paint(s.frames[a], blend ? 1 - t : 1); if (blend) paint(s.frames[i0 + 1], t); ctx.globalCompositeOperation = 'source-over'; }
      else { paint(s.frames[a], 1); if (blend) paint(s.frames[i0 + 1], t); }
      ctx.globalAlpha = 1; s.shown = a; s.drawn = s.pos; };
    s.set = function(p){ s.pos = clamp(p, 0, 1) * (o.n - 1); if (Math.abs(s.pos - s.drawn) > 0.002) s.draw(); };
    s.size = function(){ var r = cv.getBoundingClientRect(); cv.width = Math.max(1, Math.round(r.width)); cv.height = Math.max(1, Math.round(r.height)); s.shown = -1; s.draw(); };
    return s;
  };

  /* glow sprites and a 3D projector for the scenes drawn in code */
  AE.glow = function(rgb){ var c = document.createElement('canvas'), s = 64; c.width = c.height = s; var g = c.getContext('2d'), gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gr.addColorStop(0, 'rgba(' + rgb + ',1)'); gr.addColorStop(0.16, 'rgba(' + rgb + ',0.6)'); gr.addColorStop(0.45, 'rgba(' + rgb + ',0.13)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); return c; };
  AE.camera = function(){ var c = { yaw: 0, pitch: 0.3, dist: 900, f: 1, cx: 0, cy: 0 };
    c.P = function(x, y, z){ var cy = Math.cos(c.yaw), sy = Math.sin(c.yaw), cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
      var x1 = x * cy - z * sy, z1 = x * sy + z * cy, y1 = y * cp + z1 * sp, z2 = z1 * cp - y * sp, d = z2 + c.dist; if (d < 40) return null; var k = c.f / d; return [c.cx + x1 * k, c.cy - y1 * k, k, d]; };
    return c; };
  AE.poly = function(ctx, pts, close){ var started = false; ctx.beginPath(); for (var i = 0; i < pts.length; i++){ var s = pts[i]; if (!s){ started = false; continue; } if (!started){ ctx.moveTo(s[0], s[1]); started = true; } else ctx.lineTo(s[0], s[1]); } if (close && pts[0]) ctx.closePath(); ctx.stroke(); };
  AE.sprite = function(ctx, img, s, size, alpha){ if (!s || alpha < 0.01) return; ctx.globalAlpha = Math.min(1, alpha); ctx.drawImage(img, s[0] - size / 2, s[1] - size / 2, size, size); };
  AE.canvasSize = function(cv, small){ var r = cv.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, small ? 1.5 : 1.75); cv.width = Math.round(Math.max(1, r.width) * d); cv.height = Math.round(Math.max(1, r.height) * d); return { W: Math.max(1, r.width), H: Math.max(1, r.height), DPR: d }; };

  /* a page always opens at its beginning: the preview window can carry the previous page's scroll position over,
     sometimes a moment after loading. Until the visitor touches the page, any such jump is undone. A link with
     #anchor is left alone. */
  function fromTop(){
    if (location.hash) return;
    try { history.scrollRestoration = 'manual'; } catch (e) {}
    var touched = false, mark = function(){ touched = true; };
    ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function(t){ addEventListener(t, mark, { once: true, passive: true }); });
    var top = function(){ if (touched || scrollY < 2) return; if (AE.lenis) AE.lenis.scrollTo(0, { immediate: true, force: true }); else scrollTo(0, 0); };
    top(); [80, 300, 800, 1600].forEach(function(t){ setTimeout(top, t); }); addEventListener('load', top);
  }
  /* back to the top: appears once the page has been scrolled more than a screen down */
  function toTop(){
    var b = document.createElement('button'); b.type = 'button'; b.className = 'totop'; b.setAttribute('aria-label', 'Наверх'); b.title = 'Наверх';
    b.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13V3.5M3.5 8 8 3.5 12.5 8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square"/></svg>';
    document.body.appendChild(b);
    b.addEventListener('click', function(){
      if (AE.lenis) AE.lenis.scrollTo(0, { duration: reduce ? 0.01 : 1.4, lock: true, force: true }); else scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      var brand = $('.brand'); if (brand) brand.focus({ preventScroll: true });   // keyboard focus goes back up with the page
    });
    AE.onScroll(function(){ b.classList.toggle('on', scrollY > innerHeight * 1.1); });
  }

  /* start: once the page has registered its scenes */
  AE.start = function(){
    header(); reveal(); cloudGaps(); rail(); stacks();
    function scroll(){ scrollFns.forEach(function(f){ f(); }); }
    function size(){ sizeFns.forEach(function(f){ f(); }); scroll(); }
    addEventListener('resize', size);
    if (!reduce && window.Lenis){ try { AE.lenis = new Lenis(AE.lenisOpts || { lerp: 0.12, smoothWheel: true }); AE.lenis.on('scroll', scroll); } catch (e) { AE.lenis = null; } }   // a page may ask for its own settings (the cockpit pages step by block)
    if (!AE.lenis) addEventListener('scroll', scroll, { passive: true });
    size(); fromTop(); toTop();
    (function tick(now){ if (AE.lenis) AE.lenis.raf(now); for (var i = 0; i < frameFns.length; i++) frameFns[i](now); requestAnimationFrame(tick); })(performance.now());
  };
})();

/* подчёркивание в шапке: едет за курсором, при уходе мыши возвращается к текущему разделу */
(function(){
  var nav = document.querySelector('.nav'); if (!nav) return;
  var links = [].slice.call(nav.querySelectorAll('a')); if (!links.length) return;
  var ink = document.createElement('i'); ink.className = 'nav-ink'; ink.setAttribute('aria-hidden', 'true'); nav.appendChild(ink);
  var home = nav.querySelector('a[aria-current="page"]'), cur = null;
  function move(a){ cur = a || null;
    if (!a){ ink.style.opacity = '0'; return; }
    var r = a.getBoundingClientRect(), n = nav.getBoundingClientRect();
    ink.style.width = r.width.toFixed(1) + 'px'; ink.style.transform = 'translateX(' + (r.left - n.left).toFixed(1) + 'px)'; ink.style.opacity = '1'; }
  links.forEach(function(a){ a.addEventListener('pointerenter', function(){ move(a); }); a.addEventListener('focus', function(){ move(a); }); });
  nav.addEventListener('pointerleave', function(){ move(home); });
  nav.addEventListener('focusout', function(){ setTimeout(function(){ if (!nav.contains(document.activeElement)) move(home); }, 0); });
  addEventListener('resize', function(){ move(cur || home); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ move(cur || home); });
  move(home);
})();
