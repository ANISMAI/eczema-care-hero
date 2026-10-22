import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

// Phase 5 acceptance checks that don't need a browser (brief section 11).
register('./ts-resolve.mjs', import.meta.url);
const { PATIENTS } = await import('../src/data/patients.ts').catch(() => ({ PATIENTS: null }));
const { PHASE5_SCENARIOS } = await import('../src/data/phase5/scenarios.ts');
const { PERSONALITIES } = await import('../src/data/phase5/personalities.ts');
const { pickScenario, visitFlavor, asksFollowUp } = await import('../src/data/phase5/select.ts');
const { textKeys, textEntry } = await import('../src/data/phase5/text.ts');
const { default: PatientHistory } = await import('../src/systems/PatientHistory.ts');

// the eight existing patient ids (data/patients.ts imports sprite data, so fall back to the list)
const IDS = PATIENTS?.map((p) => p.id) ?? ['amina', 'daniel', 'siti', 'sarah', 'wong', 'farid', 'rohana', 'suresh'];

const memory = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
};
const visit = (scenarioId, extra = {}) => ({ scenarioId, planKey: 'f02', followUp: true, shift: 1, doctorId: 'doctor-hijab', greeting: 'first.0', introIndex: 0, ...extra });
const DOC = { id: 'doctor-hijab', name: 'Dr. Nadia' };
const byId = (id) => PHASE5_SCENARIOS.find((s) => s.id === id);

test('all 8 existing patient ids have exactly one personality, and no new ids', () => {
  assert.equal(PERSONALITIES.length, 8);
  assert.deepEqual([...PERSONALITIES.map((p) => p.patientId)].sort(), [...IDS].sort());
  assert.equal(new Set(PERSONALITIES.map((p) => p.archetype)).size, 8);
});

test('there are 5 funny and 3 calm/serious scenarios, each with 2-4 turns of 2-3 choices', () => {
  assert.equal(PHASE5_SCENARIOS.filter((s) => s.mood === 'funny').length, 5);
  assert.equal(PHASE5_SCENARIOS.filter((s) => s.mood !== 'funny').length, 3);
  for (const s of PHASE5_SCENARIOS) {
    const turns = s.interview.turns;
    assert.ok(turns.length >= 2 && turns.length <= 4, `${s.id} turns`);
    for (const t of turns) {
      assert.ok(t.choices.length >= 2 && t.choices.length <= 3, `${s.id}/${t.id} choices`);
      assert.equal(t.choices.filter((c) => c.good).length, 1, `${s.id}/${t.id} one good reply`);
      for (const c of t.choices) if (!c.good) assert.ok(c.feedback, `${s.id}/${t.id}/${c.id} weak replies explain why`);
    }
  }
});

test('only the care scenario sends the patient to the Care Room (no forced treatment)', () => {
  for (const s of PHASE5_SCENARIOS) {
    const hasCare = s.steps.some((st) => st.kind === 'care');
    assert.equal(hasCare, s.outcome === 'care', s.id);
    assert.equal(!!s.care, s.outcome === 'care', s.id);
  }
});

test('the serious scenario has no comedic reactions and escalates', () => {
  const s = byId('s02-worsening');
  assert.equal(s.mood, 'serious');
  assert.equal(s.outcome, 'referral');
  for (const t of s.interview.turns) {
    assert.equal(t.reaction, undefined);
    for (const c of t.choices) assert.equal(c.reaction, undefined, `${t.id}/${c.id}`);
  }
  assert.equal(asksFollowUp(s), false);
  assert.equal(visitFlavor('rohana', s, null, DOC).serious, true);
});

test('every new text key has both English and Bahasa Melayu', () => {
  const keys = textKeys();
  assert.ok(keys.length > 300, `only ${keys.length} keys`);
  const incomplete = keys.filter((k) => !textEntry(k).en?.trim() || !textEntry(k).ms?.trim());
  assert.deepEqual(incomplete, []);
  for (const k of keys) assert.match(k, /^[a-z0-9]+(\.[A-Za-z0-9-]+)+$/, `structured key: ${k}`);
});

test('a follow-up is only offered after a recorded visit that asked for one', () => {
  for (let i = 0; i < 50; i++) assert.notEqual(pickScenario('wong', null, Math.random), 's03-follow-up');
  const h = new PatientHistory(memory());
  h.record('wong', visit('s01-dry-itchy'));
  const picks = new Set(Array.from({ length: 200 }, () => pickScenario('wong', h.get('wong'))));
  assert.ok(picks.has('s03-follow-up'));
  h.record('rohana', visit('s02-worsening', { followUp: false }));
  for (let i = 0; i < 100; i++) assert.notEqual(pickScenario('rohana', h.get('rohana')), 's03-follow-up');
});

test('the same scenario is not picked twice in a row when there is a choice', () => {
  const h = new PatientHistory(memory());
  h.record('daniel', visit('f01-over-researcher'));
  for (let i = 0; i < 200; i++) assert.notEqual(pickScenario('daniel', h.get('daniel')), 'f01-over-researcher');
});

test('greetings: first visit, then returning (same doctor) or casual, never the same line twice in a row', () => {
  const f01 = byId('f01-over-researcher');
  const first = visitFlavor('daniel', f01, null, DOC);
  assert.equal(first.pattern, 'first');
  assert.ok(!first.greeting.includes('{doctor}'));
  const h = new PatientHistory(memory());
  h.record('daniel', visit(f01.id, { greeting: first.greetingKey, introIndex: first.introIndex }));
  const again = visitFlavor('daniel', f01, h.get('daniel'), DOC);
  assert.equal(again.pattern, 'return');
  assert.ok(again.greeting.includes('Dr. Nadia'));
  assert.notEqual(again.intro, first.intro, 'opening joke varies');
  const otherDoctor = visitFlavor('daniel', byId('s01-dry-itchy'), h.get('daniel'), { id: 'doctor-man', name: 'Dr. Faris' });
  assert.equal(otherDoctor.pattern, 'casual');
  h.record('daniel', visit('s01-dry-itchy', { greeting: otherDoctor.greetingKey, doctorId: 'doctor-man' }));
  const casualAgain = visitFlavor('daniel', byId('s01-dry-itchy'), h.get('daniel'), { id: 'doctor-chinese-man', name: 'Dr. Ong' });
  assert.equal(casualAgain.pattern, 'casual');
  assert.notEqual(casualAgain.greeting, otherDoctor.greeting);
});

test('a follow-up recalls the plan of the visit that actually happened', () => {
  const h = new PatientHistory(memory());
  h.record('farid', visit('f02-storyteller', { planKey: 'f02' }));
  const f = visitFlavor('farid', byId('s03-follow-up'), h.get('farid'), DOC);
  assert.match(f.intro, /gloves/);
  assert.ok(!f.intro.includes('{lastPlan}'));
});

test('history from an unfinished shift is rolled back; a completed shift commits it', () => {
  const store = memory();
  const h = new PatientHistory(store);
  h.record('siti', visit('f05-curious'));
  assert.equal(h.get('siti').priorVisitCount, 1);
  h.discardPending(); // left mid-shift: the day restarts
  assert.equal(h.get('siti'), null);
  h.record('siti', visit('f05-curious'));
  h.commit(); // shift completed
  h.discardPending();
  assert.equal(new PatientHistory(store).get('siti').priorVisitCount, 1);
});

test('queue numbers are read out digit by digit in English and Bahasa Melayu', async () => {
  const { spokenDigits } = await import('../src/game/voice.ts');
  assert.equal(spokenDigits('001', 'en'), 'zero, zero, one');
  assert.equal(spokenDigits('001', 'ms'), 'kosong, kosong, satu');
  assert.equal(spokenDigits('109', 'ms'), 'satu, kosong, sembilan');
});
