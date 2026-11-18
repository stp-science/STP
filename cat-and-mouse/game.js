const $ = id => document.getElementById(id);
const colors = ['#88969b','#b2a191','#949b7e','#9f91ac','#ac8d85','#7d9e9b'];
let used = new Set(), caughtMice = new Set(), animating = false, escapes = 0, catches = 0, soundOn = true, audioCtx;
for (let i = 1; i <= 6; i++) {
  const button = document.createElement('button');
  button.className = 'mouse-card';
  button.setAttribute('aria-label', 'Choose mouse ' + i);
  button.innerHTML = `<span class="number">${i}</span><svg viewBox="0 0 120 85" aria-hidden="true" style="color:${colors[i-1]}"><use href="#mouse" width="120" height="85"/></svg><b>Mouse ${i}</b><span class="outcome">Ready to run</span>`;
  button.onclick = () => chase(i);
  $('mice').append(button);
}
const mice = [...document.querySelectorAll('.mouse-card')];
function updateControls() {
  mice.forEach((button, i) => { button.disabled = animating || used.has(i + 1); });
  $('newGame').disabled = animating || used.size !== 6;
  $('progress').textContent = `${used.size} / 6 chosen`;
}
function pose(mouseX, mouseY, scale, catX, catY) {
  $('mousePosition').setAttribute('transform', `translate(${mouseX} ${mouseY}) scale(${scale})`);
  $('catPosition').setAttribute('transform', `translate(${catX} ${catY})`);
  $('catchPaw').setAttribute('transform', `translate(${catX} ${catY})`);
  $('catShadow').setAttribute('cx', catX + 90);
  $('mouseShadow').setAttribute('cx', mouseX + 45 * scale);
  $('mouseShadow').setAttribute('rx', 34 * scale);
}
function newGame() {
  if (animating || (used.size > 0 && used.size !== 6)) return;
  // Exactly two catches, assigned once. Selecting a mouse never draws another outcome.
  const order = [1,2,3,4,5,6];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  caughtMice = new Set(order.slice(0, 2));
  used = new Set(); escapes = catches = 0;
  $('escapes').textContent = $('catches').textContent = '0';
  $('arena').className = 'arena';
  resetMouse();
  $('catchPaw').setAttribute('visibility', 'hidden');
  $('mousePosition').setAttribute('visibility', 'visible');
  $('runnerNumber').textContent = '?';
  $('mousePosition').setAttribute('color', colors[0]);
  pose(350, 294, 1, 90, 228);
  mice.forEach((button, i) => {
    button.className = 'mouse-card';
    button.querySelector('.outcome').textContent = 'Ready to run';
    button.setAttribute('aria-label', 'Choose mouse ' + (i + 1));
  });
  $('result').textContent = 'Six mice. One hungry cat.';
  $('hint').textContent = 'Choose any mouse below to start the chase.';
  $('chooseHint').textContent = 'Each mouse can be selected once per game.';
  updateControls();
}
// All sounds are synthesised locally: animal calls and an original accelerating pulse.
const voices = new Set();
let suspenseAt = 0;
function audio() {
  if (!soundOn) return null;
  try {
    const ctx = audioCtx || (audioCtx = new (window.AudioContext || window.webkitAudioContext)());
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch { return null; }
}
function voice(points, duration, volume, type = 'sine', delay = 0, formant = 0) {
  const ctx = audio(); if (!ctx) return;
  const t = ctx.currentTime + delay, oscillator = ctx.createOscillator(), gain = ctx.createGain();
  oscillator.type = type;
  points.forEach(([offset, frequency], i) => {
    const param = oscillator.frequency;
    if (i === 0) param.setValueAtTime(frequency, t + offset);
    else param.exponentialRampToValueAtTime(frequency, t + offset);
  });
  if (formant) {
    const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.Q.value = 2;
    filter.frequency.setValueAtTime(formant, t);
    filter.frequency.exponentialRampToValueAtTime(formant * .55, t + duration);
    oscillator.connect(filter); filter.connect(gain);
  } else oscillator.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + .025);
  gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
  voices.add(oscillator);
  oscillator.onended = () => { voices.delete(oscillator); gain.disconnect(); };
  oscillator.start(t); oscillator.stop(t + duration + .02);
}
function meow(delay = 0) {
  voice([[0,430],[.13,710],[.28,640],[.68,300]], .72, .12, 'sawtooth', delay, 1400);
  voice([[0,215],[.13,355],[.28,320],[.68,150]], .72, .045, 'triangle', delay);
}
function squeak(delay = 0) {
  for (let i = 0; i < 3; i++)
    voice([[0,1700],[.035,2900],[.1,2050]], .12, .055, 'sine', delay + i * .15);
}
function mouseLaugh() {
  // Five breathy, high-pitched "he-he-he" syllables with rising/falling inflection.
  for (let i = 0; i < 5; i++) {
    const delay = i * .17, pitch = 1050 + (i % 2) * 170;
    voice([[0,pitch],[.045,pitch * 1.36],[.12,pitch * .9]], .14, .085, 'triangle', delay);
    voice([[0,pitch * 2],[.045,pitch * 2.5],[.12,pitch * 1.8]], .13, .035, 'sine', delay);
  }
}
function mouseYell() {
  // A sustained open-vowel squeal, falling in pitch: "aaaaah!".
  voice([[0,1150],[.1,1550],[.36,1200],[.72,700],[.98,450]], 1.05, .11, 'sawtooth', 0, 2400);
  voice([[0,575],[.1,775],[.36,600],[.72,350],[.98,225]], 1.05, .065, 'triangle');
}
function suspense(closeness) {
  const ctx = audio(); if (!ctx || ctx.currentTime < suspenseAt) return;
  const pace = .68 - .43 * closeness;
  suspenseAt = ctx.currentTime + pace;
  voice([[0,94],[.07,49],[.16,38]], .18, .10, 'triangle');
  voice([[0,77],[.06,40],[.13,31]], .15, .08, 'triangle', .12);
}
function stopSounds() {
  for (const oscillator of voices) { try { oscillator.stop(); } catch {} }
  voices.clear(); suspenseAt = 0;
}
function resetMouse() {
  $('arena').classList.remove('mouse-flipped');
  $('runnerSprite').setAttribute('href', '#mouse');
}
function flipMouse() {
  $('runnerSprite').setAttribute('href', '#deadMouse');
  $('arena').classList.add('mouse-flipped');
}
const mix = (a, b, t) => a + (b - a) * t;
const clamp = t => Math.max(0, Math.min(1, t));
function chase(number) {
  if (animating || used.has(number) || used.size === 6) return;
  stopSounds();
  animating = true; used.add(number);
  const caught = caughtMice.has(number), button = mice[number - 1];
  button.classList.add('used', 'racing');
  button.querySelector('.outcome').textContent = 'Chasing…';
  button.setAttribute('aria-label', `Mouse ${number}, selected`);
  updateControls();
  $('arena').className = 'arena running';
  resetMouse();
  meow();
  squeak(.18);
  $('catchPaw').setAttribute('visibility', 'hidden');
  $('mousePosition').setAttribute('visibility', 'visible');
  $('runnerNumber').textContent = number;
  $('mousePosition').setAttribute('color', colors[number - 1]);
  $('result').textContent = `Run, Mouse ${number}!`;
  $('hint').textContent = 'The cat is closing in…';
  $('chooseHint').textContent = 'The chase is on!';
  pose(350, 294, 1, 90, 228);
  const start = performance.now(), duration = 7000;
  let entering = false, pouncing = false;
  suspenseAt = 0;
  function frame(now) {
    const p = clamp((now - start) / duration);
    if (!caught) {
      if (p < .74) {
        const t = p / .74;
        pose(mix(350, 960, t), 294, 1, mix(90, 785, t), 228);
      } else {
        // Run into the opening's centre, shrinking into its depth rather than passing it.
        const t = (p - .74) / .26, scale = 1 - t;
        if (!entering) { entering = true; $('arena').classList.remove('running'); $('hint').textContent = 'Into the mouse hole…'; }
        const centreX = mix(1005, 1090, t), centreY = mix(326, 320, t);
        pose(centreX - 45 * scale, centreY - 32 * scale, scale, mix(785, 860, Math.min(t * 1.6, 1)), 228);
      }
    } else if (p < .72) {
      const t = p / .72;
      pose(mix(350, 820, t), 294, 1, mix(90, 620, t), 228);
    } else {
      const t = (p - .72) / .28;
      if (!pouncing) { pouncing = true; $('arena').classList.remove('running'); $('hint').textContent = 'The cat pounces!'; }
      const landing = clamp(t / .72), arc = Math.sin(Math.PI * landing);
      const catX = mix(620, 730, landing), catY = 228 - 52 * arc;
      pose(mix(820, 855, landing), 294, 1, catX, catY);
      // The extended foreground paw lands across the mouse; it stays visible underneath.
      $('catchPaw').setAttribute('visibility', t > .38 ? 'visible' : 'hidden');
      if (landing >= 1) flipMouse();
    }
    if (p < .92) suspense(clamp(p / .92));
    if (p < 1) requestAnimationFrame(frame); else finish(number, caught);
  }
  requestAnimationFrame(frame);
}
function finish(number, caught) {
  animating = false;
  stopSounds();
  $('arena').className = caught ? 'arena caught mouse-flipped' : 'arena escaped';
  const button = mice[number - 1];
  button.classList.remove('racing');
  button.querySelector('.outcome').textContent = caught ? 'Caught' : 'Escaped';
  button.setAttribute('aria-label', `Mouse ${number}, ${caught ? 'caught' : 'escaped'}, already selected`);
  if (caught) {
    catches++;
    pose(855, 294, 1, 730, 228);
    $('catchPaw').setAttribute('visibility', 'visible');
    $('result').textContent = `Caught! The cat caught Mouse ${number}.`;
    $('hint').textContent = 'Pinned under a paw — one point to the cat!';
    flipMouse();
    mouseYell(); meow(.85);
  } else {
    escapes++;
    pose(1090, 320, 0, 860, 228);
    $('mousePosition').setAttribute('visibility', 'hidden');
    $('result').textContent = `Mouse ${number} escaped!`;
    $('hint').textContent = 'Safely inside the hole. The cat was too late!';
    mouseLaugh();
  }
  $('escapes').textContent = escapes; $('catches').textContent = catches;
  if (used.size === 6) {
    $('chooseHint').textContent = 'All six chosen. Click New game to reshuffle.';
    $('hint').textContent += ' Game complete: four escapes and two catches.';
  } else $('chooseHint').textContent = 'Choose another mouse — grey mice have already had their turn.';
  updateControls();
}
$('newGame').onclick = newGame;
$('sound').onclick = () => {
  soundOn = !soundOn;
  $('sound').textContent = soundOn ? 'Sound on' : 'Sound off';
  $('sound').setAttribute('aria-pressed', soundOn);
  if (soundOn) meow(); else stopSounds();
};
$('full').onclick = async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch {}
};
newGame();
