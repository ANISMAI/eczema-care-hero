import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

// Audio policy is deterministic and browser-free; scene transitions use a tiny fake audio port.
register('./ts-resolve.mjs', import.meta.url);
const { migrateSettings, setAudioOn, audioOn, soundOn, setSoundOn, onAudioSettings } = await import('../src/game/settings.ts');
const { EffectLimiter, play, tone, noise } = await import('../src/game/audio.ts');
const { crowdPhrase } = await import('../src/game/crowd.ts');
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
  assert.equal(murmurVolume(10000), 0.075);
});

test('lobby is busiest, treatment quieter, private rooms quiet, arcade adds bleeps', () => {
  assert.deepEqual(roomMix('reception'), roomMix('waiting'));
  for (const room of ['consult', 'care']) assert.ok(roomMix(room).crowd < roomMix('waiting').crowd);
  for (const room of ['office', 'surau', 'lounge', 'toilet']) assert.ok(roomMix(room).crowd < roomMix('care').crowd);
  assert.equal(roomMix('arcade').arcade, 1);
  for (const room of ['office', 'reception', 'storage', null]) assert.equal(roomMix(room).arcade, 0);
  assert.ok(roomMix(null).crowd > 0);
});

test('effects throttle independently at the 80 ms boundary, with a slower scratch limit', () => {
  const limiter = new EffectLimiter();
  assert.equal(limiter.allow('good', 0), true);
  assert.equal(limiter.allow('good', 79), false);
  assert.equal(limiter.allow('coin', 79), true);
  assert.equal(limiter.allow('good', 80), true);
  assert.equal(limiter.allow('good', 81), false);
  assert.equal(limiter.allow('signature', 100, 130), true);
  assert.equal(limiter.allow('signature', 229, 130), false);
  assert.equal(limiter.allow('signature', 230, 130), true);
});

test('sound helpers are harmless without Web Audio or a gesture', () => {
  play('good')();
  tone(440, 0.1)();
  noise(0.1, { frequency: 500 })();
});

test('crowd phrases articulate short vowels with gaps and a falling final syllable', () => {
  for (const random of [() => 0, () => 0.99]) {
    const phrase = crowdPhrase(random);
    assert.ok(phrase.length >= 3 && phrase.length <= 6);
    for (const [i, syllable] of phrase.entries()) {
      assert.ok(syllable.duration >= 0.1 && syllable.duration <= 0.2);
      assert.equal(syllable.vowel.length, 3);
      assert.ok(syllable.vowel[0] >= 300 && syllable.vowel[2] <= 3000);
      if (i) assert.ok(syllable.at > phrase[i - 1].at + phrase[i - 1].duration + 0.02);
    }
    assert.ok(phrase.at(-1).pitch < phrase[0].pitch);
    assert.ok(phrase.at(-1).at + phrase.at(-1).duration < 1.8);
  }
});

test('ambience reuses nodes, ducks panels, stops on title, and retries after unlocking', () => {
  let ready = false;
  let allocations = 0;
  let stopped = 0;
  let spoken = 0;
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
    voice: () => {
      allocations++;
      const gain = { value: 0 };
      params.push(gain);
      return { gain: { gain }, speak: () => { spoken++; return 1; }, stop: () => stopped++ };
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
  assert.equal(allocations, 4);
  const lobbyCrowd = params[1].value;
  system.update(250, { ...state, room: 'office' });
  assert.ok(params[1].value < lobbyCrowd * 0.2);
  system.update(250, { ...state, panel: true });
  assert.ok(params[1].value < lobbyCrowd);
  for (let i = 0; i < 20; i++) system.update(250, state);
  assert.equal(allocations, 4);
  assert.ok(spoken > 0);
  system.update(250, { ...state, riding: true, speed: 200 });
  assert.ok(params[0].value > 0);
  system.update(250, { ...state, riding: true, speed: 0 });
  assert.equal(params[0].value, 0);
  system.update(250, { ...state, title: true });
  assert.equal(stopped, 4);
  system.update(250, { ...state, title: true });
  assert.equal(stopped, 4);
  const previousPhrases = spoken;
  system.update(250, { ...state, open: false });
  assert.equal(allocations, 8);
  for (const gain of params.slice(4)) assert.equal(gain.value, 0);
  assert.equal(spoken, previousPhrases);
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
      voice: () => ({ gain: { gain: {} }, speak: () => 1, stop() {} }),
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
