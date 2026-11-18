const $ = id => document.getElementById(id);
const colors = ['#88969b','#b2a191','#949b7e','#9f91ac','#ac8d85','#7d9e9b'];
let used = new Set(), caughtMice = new Set(), animating = false, escapes = 0, catches = 0, soundOn = false, audioCtx;
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
function tone(frequency, duration = .12) {
  if (!soundOn) return;
  try {
    const ctx = audioCtx || (audioCtx = new (window.AudioContext || window.webkitAudioContext)());
    ctx.resume();
    const oscillator = ctx.createOscillator(), gain = ctx.createGain();
    oscillator.connect(gain); gain.connect(ctx.destination);
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(.035, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + duration);
    oscillator.start(); oscillator.stop(ctx.currentTime + duration);
  } catch {}
}
const mix = (a, b, t) => a + (b - a) * t;
const clamp = t => Math.max(0, Math.min(1, t));
function chase(number) {
  if (animating || used.has(number) || used.size === 6) return;
  animating = true; used.add(number);
  const caught = caughtMice.has(number), button = mice[number - 1];
  button.classList.add('used', 'racing');
  button.querySelector('.outcome').textContent = 'Chasing…';
  button.setAttribute('aria-label', `Mouse ${number}, selected`);
  updateControls();
  $('arena').className = 'arena running';
  $('catchPaw').setAttribute('visibility', 'hidden');
  $('mousePosition').setAttribute('visibility', 'visible');
  $('runnerNumber').textContent = number;
  $('mousePosition').setAttribute('color', colors[number - 1]);
  $('result').textContent = `Run, Mouse ${number}!`;
  $('hint').textContent = 'The cat is closing in…';
  $('chooseHint').textContent = 'The chase is on!';
  pose(350, 294, 1, 90, 228);
  const start = performance.now(), duration = 3900;
  let beat = 0, entering = false, pouncing = false;
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
    }
    if (p > beat && p < .8) { tone(170 + 120 * p, .07); beat += .08; }
    if (p < 1) requestAnimationFrame(frame); else finish(number, caught);
  }
  requestAnimationFrame(frame);
}
function finish(number, caught) {
  animating = false;
  $('arena').className = caught ? 'arena caught' : 'arena escaped';
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
    tone(180, .4);
  } else {
    escapes++;
    pose(1090, 320, 0, 860, 228);
    $('mousePosition').setAttribute('visibility', 'hidden');
    $('result').textContent = `Mouse ${number} escaped!`;
    $('hint').textContent = 'Safely inside the hole. The cat was too late!';
    tone(660, .2); setTimeout(() => tone(880, .25), 180);
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
  $('sound').setAttribute('aria-pressed', soundOn); tone(440);
};
$('full').onclick = async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch {}
};
newGame();
