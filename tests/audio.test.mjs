import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

// Audio policy is deterministic and browser-free; scene transitions use a tiny fake audio port.
register('./ts-resolve.mjs', import.meta.url);
const { migrateSettings, setAudioOn, audioOn, soundOn, setSoundOn, onAudioSettings, language, setLanguage, reloadLanguage, QUICK_TITLE_KEY, RESUME_SETTINGS_KEY } = await import('../src/game/settings.ts');
const { default: GameClock } = await import('../src/systems/GameClock.ts');
const { EffectLimiter, play, tone, noise } = await import('../src/game/audio.ts');
const { createPenSound } = await import('../src/game/pen.ts');
const { crossfadeLoop } = await import('../src/game/crowd.ts');
const { default: Ambience, murmurVolume, roomMix } = await import('../src/systems/Ambience.ts');

test('legacy Sound off migrates all three buses off; fresh/invalid saves default on', () => {
  for (const value of [{ soundOn: false }, { soundOn: true }, {}, null, 12, 'bad']) {
    const result = migrateSettings(value);
    const expected = value?.soundOn !== false;
    for (const bus of ['ambience', 'effects', 'music']) assert.equal(result[bus], expected);
  }
});

test('individual choices survive migration and keep the legacy effects alias', () => {
  const saved = { soundOn: false, ambience: true, effects: false, music: true, language: 'ms', prayerReminders: false };
  assert.deepEqual(migrateSettings(saved), saved);
  assert.equal(migrateSettings({ effects: true, soundOn: false }).soundOn, true);
  assert.equal(migrateSettings({ ambience: 'false', music: 0 }).ambience, true);
  assert.equal(migrateSettings({ language: 'xx' }).language, 'en');
});

test('switches persist independently, notify audio immediately, and preserve Sound callers', () => {
  const previous = globalThis.localStorage;
  let saved;
  globalThis.localStorage = { setItem: (key, value) => { assert.equal(key, 'eczema-care-hero-settings-v1'); saved = JSON.parse(value); } };
  let notifications = 0;
  const off = onAudioSettings(() => notifications++);
  try {
    setAudioOn('ambience', false);
    setAudioOn('music', true);
    setSoundOn(false);
    assert.equal(soundOn(), false);
    assert.equal(audioOn('ambience'), false);
    assert.equal(audioOn('music'), true);
    assert.deepEqual(migrateSettings(saved), saved);
    assert.equal(notifications, 3);
  } finally {
    off();
    setAudioOn('ambience', true);
    setSoundOn(true);
    if (previous === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previous;
  }
});

test('crowd gain is silent before opening, increases gently, and is bounded', () => {
  assert.equal(murmurVolume(20, false), 0);
  for (const n of [-1, 0, NaN, Infinity]) assert.equal(murmurVolume(n), 0);
  assert.ok(murmurVolume(1) > 0);
  for (let n = 1; n < 20; n++) assert.ok(murmurVolume(n + 1) >= murmurVolume(n));
  assert.ok(murmurVolume(2) < murmurVolume(8));
  assert.equal(murmurVolume(10000), 0.14);
});

test('language changes request a one-time return to clinic settings, while title changes stay on title', () => {
  const previousWindow = globalThis.window;
  const previousSession = globalThis.sessionStorage;
  const previousLanguage = language();
  const values = new Map();
  let reloads = 0;
  globalThis.window = { location: { reload: () => reloads++ } };
  globalThis.sessionStorage = { setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) };
  try {
    setLanguage('en');
    reloadLanguage('ms', true);
    assert.equal(language(), 'ms');
    assert.equal(values.get(RESUME_SETTINGS_KEY), '1');
    assert.equal(values.get(QUICK_TITLE_KEY), '1');
    reloadLanguage('ms', true);
    assert.equal(reloads, 1);
    reloadLanguage('en');
    assert.equal(reloads, 2);
    assert.equal(values.has(RESUME_SETTINGS_KEY), false);
  } finally {
    setLanguage(previousLanguage);
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousSession === undefined) delete globalThis.sessionStorage;
    else globalThis.sessionStorage = previousSession;
  }
});

test('the saved clock can restore the morning checklist time during a language reload', () => {
  const previous = globalThis.localStorage;
  try {
    for (const [value, expected] of [['473', 473], ['465', 465], ['464', 480], ['bad', 480]]) {
      globalThis.localStorage = { getItem: () => value };
      const clock = new GameClock({ onPrayerTime() {}, onShiftOver() {} });
      assert.equal(clock.minutesOfDay, expected);
    }
  } finally {
    if (previous === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previous;
  }
});

test('lobby is busiest, treatment quieter, private rooms quiet, arcade adds bleeps', () => {
  assert.deepEqual(roomMix('reception'), roomMix('waiting'));
  for (const room of ['consult', 'care']) assert.ok(roomMix(room).crowd < roomMix('waiting').crowd);
  for (const room of ['office', 'surau', 'lounge', 'toilet']) assert.ok(roomMix(room).crowd < roomMix('care').crowd);
  assert.equal(roomMix('arcade').arcade, 1);
  for (const room of ['office', 'reception', 'storage', null]) assert.equal(roomMix(room).arcade, 0);
  assert.ok(roomMix(null).crowd > 0);
});

test('effects throttle independently at the 80 ms boundary', () => {
  const limiter = new EffectLimiter();
  assert.equal(limiter.allow('good', 0), true);
  assert.equal(limiter.allow('good', 79), false);
  assert.equal(limiter.allow('coin', 79), true);
  assert.equal(limiter.allow('good', 80), true);
  assert.equal(limiter.allow('good', 81), false);
});

test('sound helpers are harmless without Web Audio or a gesture', () => {
  play('good')();
  tone(440, 0.1)();
  noise(0.1, { frequency: 500 })();
  const pen = createPenSound();
  pen.move(0.5);
  pen.stop();
  pen.destroy();
  pen.move(1);
  pen.destroy();
});

test('recording loop overlaps stereo channels and wraps through adjacent original samples', () => {
  const left = Float32Array.from({ length: 1000 }, (_, i) => 0.2 + Math.sin(i / 13) * 0.1);
  const right = Float32Array.from({ length: 1000 }, (_, i) => 0.3 + Math.cos(i / 17) * 0.1);
  const original = left.slice();
  const output = crossfadeLoop([left, right], 100);
  assert.equal(output.length, 2);
  for (const [channel, source] of [[output[0], left], [output[1], right]]) {
    assert.equal(channel.length, 880);
    assert.equal(channel[0], source[120]);
    assert.equal(channel.at(-1), source[119]);
    assert.equal(channel[760], source[880]);
    // The repeat boundary has exactly the same step as these adjacent source samples.
    assert.equal(channel[0] - channel.at(-1), source[120] - source[119]);
  }
  assert.deepEqual(left, original);
});

test('recording loop trims quiet end padding, keeps internal pauses and prevents clipping', () => {
  const samples = new Float32Array(1000);
  samples.fill(0.2, 100, 900);
  samples.fill(0, 450, 500);
  const [loop] = crossfadeLoop([samples], 100);
  assert.equal(loop.length, 680);
  assert.equal(loop[450 - 100 - 120], 0);
  const [loud] = crossfadeLoop([new Float32Array(1000).fill(1)], 100);
  assert.ok(Math.max(...loud) <= 0.980001);
  assert.deepEqual(crossfadeLoop([new Float32Array(10)], 100)[0], new Float32Array(10));
  assert.equal(crossfadeLoop([new Float32Array(2)], 100)[0].length, 2);
});

test('ambience reuses nodes, ducks panels, stops on title, and retries after unlocking', () => {
  let ready = false;
  let allocations = 0;
  let stopped = 0;
  const params = [];
  const audio = {
    ready: () => ready,
    loop: (bus, frequency, noisy) => {
      assert.equal(bus, 'effects');
      assert.equal(frequency, 95);
      assert.notEqual(noisy, true); // there must be no continuous noise or AC bed
      allocations++;
      const gain = { value: 0 };
      params.push(gain);
      return { gain: { gain }, filter: { frequency: { value: 0 } }, oscillator: { frequency: { value: 0 } }, stop: () => stopped++ };
    },
    crowd: () => {
      allocations++;
      const gain = { value: 0 };
      params.push(gain);
      return { gain: { gain }, stop: () => stopped++ };
    },
    ramp: (param, value) => { param.value = value; },
    play: () => () => {},
  };
  const system = new Ambience(audio);
  const state = { title: false, open: true, visitors: 8, room: 'waiting', panel: false, riding: false, speed: 0 };
  system.update(250, state);
  assert.equal(allocations, 0);
  ready = true;
  system.update(250, state);
  assert.equal(allocations, 2);
  const lobbyCrowd = params[1].value;
  system.update(250, { ...state, room: 'office' });
  assert.ok(params[1].value < lobbyCrowd * 0.2);
  system.update(250, { ...state, panel: true });
  assert.ok(params[1].value < lobbyCrowd);
  for (let i = 0; i < 20; i++) system.update(250, state);
  assert.equal(allocations, 2);
  system.update(250, { ...state, riding: true, speed: 200 });
  assert.ok(params[0].value > 0);
  system.update(250, { ...state, riding: true, speed: 0 });
  assert.equal(params[0].value, 0);
  system.update(250, { ...state, title: true });
  assert.equal(stopped, 2);
  system.update(250, { ...state, title: true });
  assert.equal(stopped, 2);
  system.update(250, { ...state, open: false });
  assert.equal(allocations, 3); // motor only; no crowd asset is requested before opening
  assert.equal(params[2].value, 0);
  system.stop();
});

test('random clinic sounds only occur while open and route through the ambience bus', () => {
  const original = Math.random;
  Math.random = () => 0;
  try {
    const played = [];
    const system = new Ambience({
      ready: () => true,
      loop: () => ({ gain: { gain: {} }, filter: { frequency: {} }, oscillator: { frequency: {} }, stop() {} }),
      crowd: () => ({ gain: { gain: {} }, stop() {} }),
      ramp() {},
      play: (...args) => { played.push(args); return () => {}; },
    });
    const state = { title: false, open: false, visitors: 8, room: 'waiting', panel: false, riding: false, speed: 0 };
    for (let i = 0; i < 100; i++) system.update(250, state);
    assert.equal(played.length, 0);
    for (let i = 0; i < 23; i++) system.update(250, { ...state, open: true });
    assert.equal(played.length, 0);
    system.update(250, { ...state, open: true });
    assert.deepEqual(played[0], ['chair', 'ambience', 0.9]);
    system.update(250, { ...state, open: true, room: 'arcade' });
    assert.equal(played.at(-1)[0], 'chair');
    for (let i = 0; i < 12; i++) system.update(250, { ...state, open: true, room: 'arcade' });
    assert.ok(played.some(([name, bus]) => name === 'beep' && bus === 'ambience'));
    system.stop();
  } finally { Math.random = original; }
});

test('a pending recording load retries without recreating the motor or using synthetic voices', () => {
  let motorCount = 0;
  let requests = 0;
  let loaded = false;
  const system = new Ambience({
    ready: () => true,
    loop: () => { motorCount++; return { gain: { gain: {} }, oscillator: { frequency: {} }, stop() {} }; },
    crowd: () => { requests++; return loaded ? { gain: { gain: {} }, stop() {} } : null; },
    ramp() {},
    play: () => () => {},
  });
  const state = { title: false, open: false, visitors: 3, room: 'waiting', panel: false, riding: false, speed: 0 };
  system.update(250, state);
  assert.equal(requests, 0);
  system.update(250, { ...state, open: true, visitors: 0 });
  assert.equal(requests, 0);
  system.update(250, { ...state, open: true });
  assert.equal(requests, 1);
  loaded = true;
  system.update(250, { ...state, open: true });
  for (let i = 0; i < 5; i++) system.update(250, { ...state, open: true });
  assert.equal(requests, 2);
  assert.equal(motorCount, 1);
  system.stop();
});
