import test from 'node:test';
import assert from 'node:assert/strict';
import EventSchedule from '../src/events/EventSchedule.ts';
import { EVENT_CONFIG } from '../src/data/gameplay.ts';

const definitions = [
  { id: 'registration-error', room: 'reception' },
  { id: 'low-stock', room: 'storage' },
  { id: 'pharmacy-check', room: 'pharmacy' },
  { id: 'pharmacy-shelf', room: 'pharmacy' },
  { id: 'tray-cleaning', room: 'care', random: false },
  { id: 'cockroach-panic', room: 'lounge', category: 'comedy' },
  { id: 'printer-panic', room: 'office', category: 'comedy' },
];
const config = { ...EVENT_CONFIG, probability: 1 };
const all = () => true;
const schedule = () => new EventSchedule(config, 480, undefined, () => 0);

test('global cooldown uses game minutes and the first event waits until after opening', () => {
  const s = schedule();
  assert.equal(s.draw(465, definitions, all), null);
  assert.equal(s.draw(480, definitions, all), null);
  assert.equal(s.draw(524.99, definitions, all), null);
  assert.ok(s.draw(525, definitions, all));
  s.activated('registration-error', 525);
  assert.equal(s.draw(569.99, definitions, all), null);
  assert.equal(s.state.nextAt, 570);
});

test('per-event cooldown blocks even a forced QA selection, then allows a repeat', () => {
  const s = schedule();
  s.activated('cockroach-panic', 525);
  assert.equal(s.draw(570, definitions, all, 'cockroach-panic'), null);
  assert.equal(s.draw(704.99, definitions, all, 'cockroach-panic'), null);
  assert.equal(s.draw(715, definitions, all, 'cockroach-panic')?.id, 'cockroach-panic');
  s.activated('cockroach-panic', 715);
  assert.equal(s.state.occurrences['cockroach-panic'], 2);
});

test('there is no two-event cap during a long shift', () => {
  const s = schedule();
  let previous = null;
  for (const now of [525, 600, 675, 750, 825, 900, 975]) {
    const def = s.draw(now, definitions, all);
    assert.ok(def);
    assert.notEqual(def.id, previous);
    s.activated(def.id, now);
    previous = def.id;
  }
  assert.equal(Object.values(s.state.occurrences).reduce((a, b) => a + b), 7);
});

test('selection avoids the previous room where an eligible alternative exists', () => {
  const s = schedule();
  s.activated('pharmacy-check', 525);
  const def = s.draw(600, definitions, all);
  assert.ok(def);
  assert.notEqual(def.room, 'pharmacy');
});

test('a repeated condition request yields to a different eligible incident', () => {
  const s = schedule();
  s.activated('tray-cleaning', 525);
  s.request('tray-cleaning');
  assert.notEqual(s.draw(700, definitions, all)?.id, 'tray-cleaning');
});

test('global cooldown tuning also honors the upper bound', () => {
  const s = new EventSchedule(config, 480, undefined, () => 0.999999);
  assert.ok(s.state.nextAt > 569 && s.state.nextAt <= 570);
  s.activated('printer-panic', 600);
  assert.ok(s.state.nextAt > 689 && s.state.nextAt <= 690);
});

test('only a condition request can select a dirty-tray event', () => {
  const s = schedule();
  assert.equal(s.draw(525, definitions, all, 'tray-cleaning'), null);
  s.request('tray-cleaning');
  assert.equal(s.draw(535, definitions, all)?.id, 'tray-cleaning');
  s.activated('tray-cleaning', 535);
  assert.deepEqual(s.state.pending, []);
});

test('queued tray requests are bounded and drop out after staff cleanup', () => {
  const s = schedule();
  for (let i = 0; i < 100; i++) s.request('tray-cleaning');
  assert.deepEqual(s.state.pending, ['tray-cleaning']);
  s.draw(490, definitions, d => d.id !== 'tray-cleaning');
  assert.deepEqual(s.state.pending, []);
});

test('the existing tutorial cannot force a comedy incident', () => {
  const s = schedule();
  s.requestTutorial();
  const comedyOnly = definitions.filter(d => d.category === 'comedy');
  assert.equal(s.draw(525, comedyOnly, all), null);
  const def = s.draw(535, definitions, all);
  assert.ok(def);
  assert.notEqual(def.category, 'comedy');
});

test('saved scheduling state retains cooldowns, repeat counts and pending conditions', () => {
  const s = schedule();
  s.activated('printer-panic', 525);
  s.request('tray-cleaning');
  const saved = JSON.parse(JSON.stringify(s.state));
  const restored = new EventSchedule(config, 480, saved, () => 0);
  assert.equal(restored.state.cooldownUntil['printer-panic'], 705);
  assert.equal(restored.state.occurrences['printer-panic'], 1);
  assert.deepEqual(restored.state.pending, ['tray-cleaning']);
});

test('patient-step opportunities wait for cooldown and do not build a backlog', () => {
  const s = new EventSchedule({ ...config, probability: 0 }, 480, undefined, () => 0);
  for (let i = 0; i < 50; i++) s.requestOpportunity();
  assert.equal(s.draw(520, definitions, all), null);
  const def = s.draw(525, definitions, all);
  assert.ok(def);
  s.activated(def.id, 525);
  assert.equal(s.state.opportunityPending, false);
});

test('routine incidents dominate weighted draws, without forcing comedy every shift', () => {
  let seed = 1234;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  let comedy = 0;
  for (let i = 0; i < 4000; i++) {
    const s = new EventSchedule(config, 480, undefined, random);
    const def = s.draw(600, definitions, all);
    assert.ok(def);
    if (def.category === 'comedy') comedy++;
  }
  assert.ok(comedy > 120 && comedy < 400, `comedy frequency: ${comedy}/4000`);
});

test('probability zero leaves random incidents off, while explicit condition requests remain separate', () => {
  const s = new EventSchedule({ ...config, probability: 0 }, 480, undefined, () => 0);
  assert.equal(s.draw(600, definitions, all), null);
  s.request('tray-cleaning');
  assert.equal(s.draw(610, definitions, all)?.id, 'tray-cleaning');
});
