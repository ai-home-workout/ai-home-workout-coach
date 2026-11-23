import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countMAE, matchReps, binaryMetrics, cohenKappa } from '../src/metrics.js';
import { parseLabelsCsv } from '../src/labels.js';
import { readText } from '../../shared/test/fixtures.js';

const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} vs ${b}`);

test('countMAE', () => {
  near(
    countMAE([
      { predicted: 10, actual: 10 },
      { predicted: 8, actual: 10 },
      { predicted: 11, actual: 10 },
    ]),
    1,
    'MAE',
  );
});

test('matchReps: 겹치는 구간끼리 1:1로 짝지어요', () => {
  const pred = [
    { start: 600, end: 2600 },
    { start: 3100, end: 4900 },
    { start: 20000, end: 21000 }, // 라벨에 없음
  ];
  const labels = [
    { startSec: 0.6, endSec: 2.6 },
    { startSec: 3.0, endSec: 5.0 },
    { startSec: 5.4, endSec: 7.4 }, // 예측에 없음
  ];
  const m = matchReps(pred, labels);
  const pairs = m.filter((x) => x.pred !== null && x.label !== null);
  assert.deepEqual(
    pairs.map((x) => [x.pred, x.label]),
    [
      [0, 0],
      [1, 1],
    ],
  );
  assert.ok(m.some((x) => x.pred === 2 && x.label === null));
  assert.ok(m.some((x) => x.pred === null && x.label === 2));
});

test('binaryMetrics: positive는 오류 반복', () => {
  const r = binaryMetrics([
    { predictedValid: false, predictedHeld: false, actualValid: false }, // tp
    { predictedValid: true, predictedHeld: false, actualValid: false }, // fn
    { predictedValid: false, predictedHeld: false, actualValid: true }, // fp
    { predictedValid: true, predictedHeld: false, actualValid: true }, // tn
    { predictedValid: false, predictedHeld: true, actualValid: true }, // held
  ]);
  assert.deepEqual(
    { tp: r.tp, fp: r.fp, fn: r.fn, tn: r.tn, heldCount: r.heldCount },
    { tp: 1, fp: 1, fn: 1, tn: 1, heldCount: 1 },
  );
  near(r.precision, 0.5, 'precision');
  near(r.recall, 0.5, 'recall');
  near(r.f1, 0.5, 'f1');
});

test('cohenKappa: 픽스처 라벨러 a, b (4개 중 1개 불일치)', () => {
  const a = parseLabelsCsv(readText('fixtures/labels_a.csv')).map((r) => r.valid);
  const b = parseLabelsCsv(readText('fixtures/labels_b.csv')).map((r) => r.valid);
  // a: [1,0,1,0], b: [1,0,1,1] → po=0.75, pe=0.5*0.75+0.5*0.25=0.5, kappa=0.5
  near(cohenKappa(a, b), 0.5, 'kappa');
  near(cohenKappa(a, a), 1, '완전 일치');
});
