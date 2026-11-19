(() => {
  const COLORS = ['#e6194b', '#3cb44b', '#f5a623', '#4363d8', '#f58231', '#911eb4',
                  '#16a5a5', '#d6338a', '#7a9a01', '#c0392b', '#2c7fb8', '#8e5a2b'];
  const DEFAULT = ['Aroha', 'Ben', 'Charlotte', 'Daniel', 'Ella', 'Finn', 'Grace', 'Hemi'];
  const STORE = 'stp-wheel-v1';

  const $ = (id) => document.getElementById(id);
  const canvas = $('wheel'), ctx = canvas.getContext('2d');
  const namesEl = $('names'), spinBtn = $('spinBtn');
  const dialog = $('winnerDialog');

  let angle = 0;           // current rotation (radians)
  let spinning = false;
  let results = [];
  let lastWinner = null;
  let audioCtx = null;

  // ---------- storage ----------
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE));
      if (s) {
        namesEl.value = s.names ?? DEFAULT.join('\n');
        results = s.results ?? [];
        $('removeWinner').checked = !!s.removeWinner;
        $('sound').checked = s.sound !== false;
        return;
      }
    } catch (e) {}
    namesEl.value = DEFAULT.join('\n');
  }
  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify({
        names: namesEl.value, results,
        removeWinner: $('removeWinner').checked, sound: $('sound').checked,
      }));
    } catch (e) {}
  }

  const getNames = () => namesEl.value.split('\n').map(s => s.trim()).filter(Boolean);
  const setNames = (arr) => { namesEl.value = arr.join('\n'); update(); };

  // ---------- drawing ----------
  function draw() {
    const names = getNames();
    const size = canvas.width, r = size / 2 - 8, c = size / 2;
    ctx.clearRect(0, 0, size, size);

    if (!names.length) {
      ctx.fillStyle = '#ccc';
      ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#555'; ctx.font = 'bold 36px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('Add some names →', c, c - 90);
      return;
    }

    const slice = (Math.PI * 2) / names.length;
    const fontSize = Math.max(14, Math.min(48, 520 / names.length + 10));

    names.forEach((name, i) => {
      const start = angle + i * slice;
      ctx.beginPath();
      ctx.moveTo(c, c);
      ctx.arc(c, c, r, start, start + slice);
      ctx.closePath();
      // avoid same colour on first/last neighbour
      let ci = i % COLORS.length;
      if (i === names.length - 1 && ci === 0 && names.length > 1) ci = 1;
      ctx.fillStyle = COLORS[ci];
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.8)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.translate(c, c);
      ctx.rotate(start + slice / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,.35)';
      ctx.shadowBlur = 4;
      let label = name;
      const maxW = r * 0.68;
      while (ctx.measureText(label).width > maxW && label.length > 1) label = label.slice(0, -1);
      if (label !== name) label = label.slice(0, -1) + '…';
      ctx.fillText(label, r - 24, 0);
      ctx.restore();
    });

    // outer ring
    ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.lineWidth = 8; ctx.strokeStyle = '#fff'; ctx.stroke();
  }

  // index of the slice under the pointer (pointer is at angle 0 = right side)
  function currentIndex() {
    const names = getNames();
    const slice = (Math.PI * 2) / names.length;
    const a = ((-angle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    return Math.floor(a / slice) % names.length;
  }

  // ---------- sound ----------
  function tick() {
    if (!$('sound').checked) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'square'; o.frequency.value = 900;
      g.gain.setValueAtTime(0.05, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.04);
      o.connect(g).connect(audioCtx.destination);
      o.start(); o.stop(audioCtx.currentTime + 0.05);
    } catch (e) {}
  }
  function fanfare() {
    if (!$('sound').checked || !audioCtx) return;
    [523, 659, 784, 1047].forEach((f, i) => {
      const t = audioCtx.currentTime + i * 0.12;
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g).connect(audioCtx.destination);
      o.start(t); o.stop(t + 0.4);
    });
  }

  // ---------- spin ----------
  function spin() {
    const names = getNames();
    if (spinning || names.length < 1) return;
    spinning = true;
    spinBtn.disabled = true;
    namesEl.disabled = true;

    const duration = 5000 + Math.random() * 2000;
    const total = Math.PI * 2 * (6 + Math.random() * 4) + Math.random() * Math.PI * 2;
    const start = angle, t0 = performance.now();
    let lastIdx = currentIndex();
    const ease = (t) => 1 - Math.pow(1 - t, 4);

    function frame(now) {
      const t = Math.min(1, (now - t0) / duration);
      angle = start + total * ease(t);
      draw();
      const idx = currentIndex();
      if (idx !== lastIdx) { tick(); lastIdx = idx; }
      if (t < 1) requestAnimationFrame(frame);
      else finish();
    }
    requestAnimationFrame(frame);
  }

  function finish() {
    spinning = false;
    spinBtn.disabled = false;
    namesEl.disabled = false;
    const names = getNames();
    const idx = currentIndex();
    lastWinner = { name: names[idx], index: idx };
    results.unshift(names[idx]);
    renderResults();
    fanfare();
    confetti();

    if ($('removeWinner').checked) {
      removeWinner();
      $('removeBtn').hidden = true;
    } else {
      $('removeBtn').hidden = false;
    }
    $('winnerName').textContent = lastWinner.name;
    dialog.showModal();
    save();
  }

  function removeWinner() {
    if (!lastWinner) return;
    const names = getNames();
    if (names[lastWinner.index] === lastWinner.name) names.splice(lastWinner.index, 1);
    else {
      const i = names.indexOf(lastWinner.name);
      if (i >= 0) names.splice(i, 1);
    }
    setNames(names);
    lastWinner = null;
  }

  // ---------- confetti ----------
  function confetti() {
    const cv = $('confetti'), cx = cv.getContext('2d');
    cv.width = innerWidth; cv.height = innerHeight;
    const parts = Array.from({ length: 180 }, () => ({
      x: innerWidth / 2, y: innerHeight / 3,
      vx: (Math.random() - 0.5) * 16, vy: Math.random() * -14 - 4,
      s: 6 + Math.random() * 6, r: Math.random() * 6,
      c: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));
    const t0 = performance.now();
    (function step(now) {
      cx.clearRect(0, 0, cv.width, cv.height);
      parts.forEach(p => {
        p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.r += 0.1;
        cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r);
        cx.fillStyle = p.c; cx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        cx.restore();
      });
      if (now - t0 < 3500) requestAnimationFrame(step);
      else cx.clearRect(0, 0, cv.width, cv.height);
    })(t0);
  }

  // ---------- UI ----------
  function renderResults() {
    const ol = $('results');
    ol.innerHTML = '';
    results.forEach(n => { const li = document.createElement('li'); li.textContent = n; ol.appendChild(li); });
    $('rcount').textContent = results.length;
  }
  function update() {
    $('count').textContent = getNames().length;
    draw();
    save();
  }

  namesEl.addEventListener('input', update);
  spinBtn.addEventListener('click', spin);
  canvas.addEventListener('click', spin);
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && document.activeElement !== namesEl && !dialog.open) {
      e.preventDefault(); spin();
    }
  });

  $('shuffleBtn').onclick = () => {
    const a = getNames();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    setNames(a);
  };
  $('sortBtn').onclick = () => setNames(getNames().sort((a, b) => a.localeCompare(b)));
  $('clearBtn').onclick = () => { if (confirm('Clear all names?')) setNames([]); };
  $('restoreBtn').onclick = () => {
    const cur = getNames();
    const back = [...results].reverse().filter(n => !cur.includes(n));
    setNames(cur.concat([...new Set(back)]));
  };
  $('clearResultsBtn').onclick = () => { results = []; renderResults(); save(); };
  $('closeBtn').onclick = () => dialog.close();
  $('removeBtn').onclick = () => { removeWinner(); dialog.close(); };
  $('removeWinner').onchange = save;
  $('sound').onchange = save;

  document.querySelectorAll('.tab').forEach(btn => btn.onclick = () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b === btn));
    $('tab-entries').classList.toggle('hidden', btn.dataset.tab !== 'entries');
    $('tab-results').classList.toggle('hidden', btn.dataset.tab !== 'results');
  });

  load();
  renderResults();
  update();
})();
