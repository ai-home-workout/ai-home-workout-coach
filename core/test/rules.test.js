import { test } from 'node:test';
import assert from 'node:assert/strict';
import { judgeVideo, judgeRep } from '../index.js';
import { checkRepResult } from '../../shared/contracts.js';
import { loadConfig, loadExpected, loadFixture } from '../../shared/test/fixtures.js';

const config = loadConfig();
const expected = loadExpected();

function check(name) {
  const results = judgeVideo(loadFixture(name), config);
  assert.equal(results.length, expected[name].length, `${name} 반복 수`);
  results.forEach((r, i) => {
    const e = expected[name][i];
    assert.deepEqual(checkRepResult(r), [], `${name}[${i}] 형식`);
    assert.equal(r.held, e.held, `${name}[${i}] held`);
    assert.equal(r.valid, e.valid, `${name}[${i}] valid`);
    assert.deepEqual(
      [...r.errorTypes].sort(),
      [...e.errorTypes].sort(),
      `${name}[${i}] errorTypes`,
    );
    if (!r.valid) assert.ok(r.reason.length > 0, `${name}[${i}] 오류·보류면 reason이 있어요`);
  });
}

// 측면 오류 규칙
test('정상 반복은 모두 valid', () => check('side_good'));
test('깊이 부족', () => check('side_shallow'));
test('상체 과도 숙임', () => check('side_lean'));
test('날림 동작', () => check('side_fast'));
test('섞인 영상', () => check('side_mixed'));

// 판정 보류
test('관절이 가려진 반복은 보류(held)하고 정상으로 치지 않아요', () => check('side_occluded'));

test('측면 영상에서는 정면 전용 오류(knee_valgus)를 내지 않아요', () => {
  for (const r of judgeVideo(loadFixture('side_mixed'), config)) {
    assert.ok(!r.errorTypes.includes('knee_valgus'));
  }
});

test('정면: 무릎 간격이 발목 간격보다 많이 좁으면 무릎 모임, 깊이·상체는 보지 않아요', () => {
  const lm = (x, y) => ({ x, y, z: 0, visibility: 0.9 });
  const makeFrame = (t, kneeHalfWidth) => {
    const L = Array.from({ length: 33 }, () => lm(0.5, 0.5));
    L[11] = lm(0.45, 0.3);
    L[12] = lm(0.55, 0.3);
    L[23] = lm(0.45, 0.55);
    L[24] = lm(0.55, 0.55);
    L[25] = lm(0.5 - kneeHalfWidth, 0.7);
    L[26] = lm(0.5 + kneeHalfWidth, 0.7);
    L[27] = lm(0.42, 0.9);
    L[28] = lm(0.58, 0.9);
    return { t, landmarks: L };
  };
  const seg = { start: 0, end: 2000, bottomT: 1000, bottomKneeDeg: 150 }; // 깊이 부족처럼 보여도
  const valgus = judgeRep(
    [0, 1000, 2000].map((t) => makeFrame(t, 0.03)),
    seg,
    config,
    'front',
  );
  assert.deepEqual(valgus.errorTypes, ['knee_valgus']);
  const good = judgeRep(
    [0, 1000, 2000].map((t) => makeFrame(t, 0.08)),
    seg,
    config,
    'front',
  );
  assert.equal(good.valid, true);
});
