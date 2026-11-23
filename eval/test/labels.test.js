import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLabelsCsv } from '../src/labels.js';
import { readText } from '../../shared/test/fixtures.js';

test('라벨 CSV를 읽어요', () => {
  const rows = parseLabelsCsv(readText('fixtures/labels_a.csv'));
  assert.equal(rows.length, 4);
  assert.deepEqual(rows[1], {
    video: 'side_mixed.mp4',
    repIndex: 2,
    startSec: 3,
    endSec: 5,
    valid: false,
    errorTypes: ['shallow_depth'],
    labeler: 'labeler_a',
  });
});

test('헤더가 다르면 에러', () => {
  assert.throws(() => parseLabelsCsv('a,b\n1,2'));
});
