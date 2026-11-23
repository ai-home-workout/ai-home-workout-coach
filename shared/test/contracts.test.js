import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkVideoCoords,
  checkRepResult,
  checkUiEvent,
  errorLabels,
  LABEL_CSV_COLUMNS,
} from '../contracts.js';
import { FIXTURE_NAMES, loadFixture, loadExpected, readText } from './fixtures.js';

test('픽스처 좌표 JSON이 계약 형식을 지켜요', () => {
  for (const name of FIXTURE_NAMES) {
    assert.deepEqual(checkVideoCoords(loadFixture(name)), [], name);
  }
});

test('expected.json의 기대 결과가 반복 결과 형식을 지켜요', () => {
  for (const [name, reps] of Object.entries(loadExpected())) {
    for (const r of reps) assert.deepEqual(checkRepResult({ ...r, reason: '' }), [], name);
  }
});

test('held인데 valid면 잡아내요', () => {
  const bad = { start: 0, end: 1, valid: true, errorTypes: [], held: true, reason: '' };
  assert.ok(checkRepResult(bad).length > 0);
});

test('UI 이벤트 검사', () => {
  assert.deepEqual(
    checkUiEvent({ type: 'rep', count: 7, valid: true, errorTypes: [], held: false, reason: '' }),
    [],
  );
  assert.deepEqual(checkUiEvent({ type: 'setDone', set: 1, totalSets: 4 }), []);
  assert.deepEqual(checkUiEvent({ type: 'rest', reason: '잠깐 쉬어요' }), []);
  assert.ok(checkUiEvent({ type: 'combo' }).length > 0);
});

test('라벨 CSV 픽스처 헤더가 계약과 같아요', () => {
  for (const f of ['fixtures/labels_a.csv', 'fixtures/labels_b.csv']) {
    assert.equal(readText(f).split('\n')[0], LABEL_CSV_COLUMNS.join(','));
  }
});

test('오류 유형 이름', () => {
  assert.equal(errorLabels(['shallow_depth', 'excessive_lean']), '깊이 부족, 상체 과도 숙임');
});
