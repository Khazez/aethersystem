/* The cockpit around the sections: heading tape, block tape, annunciator line with UTC, and the display "page change"
   when a block takes the centre of the screen. Every block is a <section class="mfd" data-hdg="…" data-name="…">. */
(function(){
  var C = window.C = {}, NS = 'http://www.w3.org/2000/svg', $ = AE.$, $$ = AE.$$, reduce = AE.reduce;
  C.svg = function(host, w, h, label){ var s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 ' + w + ' ' + h); s.setAttribute('role', 'img'); s.setAttribute('aria-label', label); host.appendChild(s); return s; };
  C.el = function(parent, tag, at, txt){ var e = document.createElementNS(NS, tag); for (var k in at) e.setAttribute(k, at[k]); if (txt != null) e.textContent = txt; parent.appendChild(e); return e; };
  // a line that draws itself when its display page goes live; delay in seconds
  C.draw = function(e, delay){ var len = 400; try { len = e.getTotalLength(); } catch (x) {} e.style.setProperty('--len', len.toFixed(1)); e.style.setProperty('--dl', (delay || 0) + 's'); e.classList.add('draw'); return e; };

  C.start = function(pageName, fx){
    var blocks = $$('.mfd'); if (!blocks.length) return;
    document.body.classList.add('fx-' + (fx || 'scan'));   // each section changes its display pages in its own way
    // heading tape: ticks every 5°, numbers every 30°, drawn twice so it can wrap
    var hdg = document.createElement('div'); hdg.className = 'hdg'; hdg.setAttribute('aria-hidden', 'true'); document.body.appendChild(hdg);
    var read = document.createElement('div'); read.className = 'hdg-read'; read.setAttribute('aria-hidden', 'true'); document.body.appendChild(read);
    var PX = 6, W = 360 * PX * 2, hs = C.svg(hdg, W, 40, ''); hs.setAttribute('preserveAspectRatio', 'none'); hs.style.width = W + 'px';
    var NAMES = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };
    for (var d = 0; d < 720; d += 5){ var x = d * PX, big = d % 30 === 0; C.el(hs, 'line', { x1: x, y1: big ? 22 : 28, x2: x, y2: 38, class: 'sy th' + (big ? '' : ' d') });
      if (big){ var dd = d % 360; C.el(hs, 'text', { x: x, y: 16, 'text-anchor': 'middle', class: 'tx s' + (NAMES[dd] != null ? ' c' : '') }, NAMES[dd] != null ? NAMES[dd] : ('0' + dd / 10).slice(-2)); } }
    var bug = document.createElement('div'); bug.setAttribute('aria-hidden', 'true'); bug.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 62px);transform:translateX(-50%);width:0;height:0;border:7px solid transparent;border-top-color:#e05cd3;z-index:25;pointer-events:none'; document.body.appendChild(bug);
    // block tape on the right
    var tape = document.createElement('div'); tape.className = 'tape'; tape.setAttribute('aria-hidden', 'true');
    tape.innerHTML = '<div class="tape-in">' + blocks.map(function(b, i){ return '<div><span>' + b.dataset.name + '</span><b>' + ('0' + (i + 1)).slice(-2) + '0</b></div>'; }).join('') + '</div>';
    document.body.appendChild(tape); var box = document.createElement('div'); box.className = 'tape-box'; box.setAttribute('aria-hidden', 'true'); document.body.appendChild(box);
    var tin = $('.tape-in', tape), rows = $$('div', tin);
    // annunciator line
    var an = document.createElement('div'); an.className = 'annun'; an.innerHTML = '<span>AETHER · ' + pageName + '</span><span class="msg" aria-live="polite"></span><span class="utc"></span>'; document.body.appendChild(an);
    var msg = $('.msg', an), utc = $('.utc', an);
    function clock(){ var n = new Date(); utc.textContent = 'UTC ' + ('0' + n.getUTCHours()).slice(-2) + ':' + ('0' + n.getUTCMinutes()).slice(-2) + ':' + ('0' + n.getUTCSeconds()).slice(-2); } clock(); setInterval(clock, 1000);
    blocks.forEach(function(b){ var sc = document.createElement('div'); sc.className = 'scan'; sc.setAttribute('aria-hidden', 'true'); b.appendChild(sc); });
    var cur = -1, heading = +blocks[0].dataset.hdg || 0, shown = heading;
    AE.onScroll(function(){
      var mid = innerHeight * 0.5, pos = 0;
      blocks.forEach(function(b, i){ var r = b.getBoundingClientRect(); if (r.top <= mid) pos = i + AE.clamp((mid - r.top) / Math.max(1, r.height), 0, 0.999); });
      var i0 = Math.floor(pos), f = pos - i0, h0 = +blocks[i0].dataset.hdg || 0, h1 = blocks[i0 + 1] ? +blocks[i0 + 1].dataset.hdg : h0, dh = ((h1 - h0 + 540) % 360) - 180;
      heading = (h0 + dh * AE.smooth(0.55, 1, f) + 360) % 360;   // the turn happens as the next block comes in
      tin.style.transform = 'translateY(' + (-Math.max(0.5, pos) * 58).toFixed(1) + 'px)';   // a block filling the screen reads k + 0.5: its name then sits in the frame
      var k = Math.min(blocks.length - 1, Math.floor(pos));   // the block that holds the middle of the screen
      if (k !== cur){ cur = k; rows.forEach(function(r, j){ r.classList.toggle('on', j === k); }); blocks.forEach(function(b, j){ if (j === k){ b.classList.remove('live'); void b.offsetWidth; b.classList.add('live'); b.dispatchEvent(new Event('mfd:live')); } else if (b.classList.contains('live')){ b.classList.remove('live'); b.dispatchEvent(new Event('mfd:off')); } });
        msg.textContent = blocks[k].dataset.name; msg.classList.remove('flash'); void msg.offsetWidth; if (!reduce) msg.classList.add('flash'); }
    });
    AE.onFrame(function(){ var dh = ((heading - shown + 540) % 360) - 180; shown = (shown + dh * (reduce ? 1 : 0.12) + 360) % 360;
      hs.style.transform = 'translateX(' + (hdg.clientWidth / 2 - (shown + 360) * PX).toFixed(1) + 'px)'; read.textContent = 'HDG ' + ('00' + Math.round(shown) % 360).slice(-3) + '°'; });
    blocks.forEach(function(b){ b.classList.add('mfd-ready'); });

    /* one wheel gesture or key press = one display page: the page glides to the next block and stops on it exactly */
    AE.lenisOpts = { lerp: 0.1, smoothWheel: false };
    document.documentElement.classList.add('cockpit-snap');
    var busy = false, quietUntil = 0, acc = 0, lastWheel = 0;
    var ease = function(t){ return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
    function current(){ var y = scrollY + innerHeight * 0.5, k = 0; blocks.forEach(function(b, i){ if (y >= b.offsetTop) k = i; }); return k; }
    function go(i){ var end = document.documentElement.scrollHeight - innerHeight, y = i >= blocks.length ? end : blocks[Math.max(0, i)].offsetTop; busy = true;
      var done = function(){ busy = false; quietUntil = performance.now() + 420; };
      if (AE.lenis) AE.lenis.scrollTo(y, { duration: reduce ? 0.01 : 1.05, easing: ease, lock: true, force: true, onComplete: done }); else { scrollTo(0, y); done(); } }
    addEventListener('wheel', function(e){
      var n = blocks.length, lastTop = blocks[n - 1].offsetTop, dir = e.deltaY > 0 ? 1 : -1, beyond = scrollY > lastTop + 8;
      if (beyond && dir > 0) return;                                  // below the last block the footer scrolls as usual
      var k = current(), b = blocks[k], r = b.getBoundingClientRect();
      if (!beyond && b.offsetHeight > innerHeight + 4 && ((dir > 0 && r.bottom > innerHeight + 2) || (dir < 0 && r.top < -2))) return;   // a block taller than the screen scrolls through first
      e.preventDefault();
      var now = performance.now(); if (now - lastWheel > 220) acc = 0; lastWheel = now;
      if (busy || now < quietUntil) return;
      acc += e.deltaY; if (Math.abs(acc) < 24) return; acc = 0;
      go(beyond ? n - 1 : k + dir);
    }, { passive: false });
    var KEYS = { PageDown: 1, ArrowDown: 1, PageUp: -1, ArrowUp: -1 }; KEYS[' '] = 1;
    addEventListener('keydown', function(e){ if (/input|textarea|select/i.test((e.target || {}).tagName || '')) return; var k = KEYS[e.key]; if (!k) return;
      var n = blocks.length, beyond = scrollY > blocks[n - 1].offsetTop + 8; if (beyond && k > 0) return; e.preventDefault(); if (!busy) go(beyond ? n - 1 : current() + k); });
  };
})();
