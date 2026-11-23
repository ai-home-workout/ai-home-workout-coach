import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSetTracker } from '../index.js';
import { checkUiEvent } from '../../shared/contracts.js';

const ok = { start: 0, end: 1, valid: true, errorTypes: [], held: false, reason: '' };
const bad = { ...ok, valid: false, errorTypes: ['shallow_depth'], reason: '더 앉아 주세요' };
const held = { ...ok, valid: false, held: true, reason: '무릎이 가려졌어요' };

const opts = { repsPerSet: 3, sets: 2, consecutiveErrorsForRest: 3 };
const all = (tracker, reps) => reps.flatMap((r) => tracker.onRep(r));

test('정상 반복만 카운트해요', () => {
  const ev = all(createSetTracker(opts), [ok, bad, ok]);
  const reps = ev.filter((e) => e.type === 'rep');
  assert.deepEqual(
    reps.map((e) => e.count),
    [1, 1, 2],
  );
  for (const e of ev) assert.deepEqual(checkUiEvent(e), []);
});

test('세트를 채우면 setDone, 다음 세트는 0부터', () => {
  const t = createSetTracker(opts);
  const ev = all(t, [ok, ok, ok, ok]);
  assert.deepEqual(
    ev.find((e) => e.type === 'setDone'),
    { type: 'setDone', set: 1, totalSets: 2 },
  );
  assert.equal(ev.at(-1).count, 1);
  assert.deepEqual(t.state(), { set: 2, count: 1, done: false });
});

test('오류 3번 연속이면 rest', () => {
  const ev = all(createSetTracker(opts), [bad, bad, bad]);
  assert.equal(ev.filter((e) => e.type === 'rest').length, 1);
});

test('보류는 rep(held)과 hold를 내고, 연속 오류를 끊지도 늘리지도 않아요', () => {
  const ev = all(createSetTracker(opts), [bad, bad, held, bad]);
  assert.ok(ev.some((e) => e.type === 'hold'));
  assert.equal(ev.filter((e) => e.type === 'rest').length, 1);
});

test('마지막 세트를 끝내면 done', () => {
  const t = createSetTracker(opts);
  all(t, [ok, ok, ok, ok, ok, ok]);
  assert.equal(t.state().done, true);
});
