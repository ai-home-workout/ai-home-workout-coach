import { test } from 'node:test';
import assert from 'node:assert/strict';
import { angleDeg, kneeAngle, torsoLeanDeg, normalizeFrame } from '../index.js';
import { LM } from '../../shared/contracts.js';
import { loadFixture } from '../../shared/test/fixtures.js';

const near = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg}: ${a} vs ${b}`);

test('angleDeg: 직각과 일직선', () => {
  near(angleDeg({ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 }), 90, 1e-6, '직각');
  near(angleDeg({ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }), 180, 1e-6, '일직선');
});

test('kneeAngle: 서 있을 때 170도 이상, 가장 깊을 때 100도 이하', () => {
  const { frames } = loadFixture('side_good');
  const angles = frames.map((f) => kneeAngle(f.landmarks).angle);
  assert.ok(angles[0] >= 170, `첫 프레임 ${angles[0]}`);
  assert.ok(Math.min(...angles) <= 100, `최소 ${Math.min(...angles)}`);
});

test('kneeAngle: auto는 visibility가 높은 쪽(픽스처에서는 left)을 골라요', () => {
  const { frames } = loadFixture('side_good');
  assert.equal(kneeAngle(frames[0].landmarks).side, 'left');
});

test('torsoLeanDeg: 서 있을 때 10도 이하, 상체 숙임 픽스처는 45도 초과', () => {
  assert.ok(torsoLeanDeg(loadFixture('side_good').frames[0].landmarks) <= 10);
  const lean = loadFixture('side_lean').frames.map((f) => torsoLeanDeg(f.landmarks));
  assert.ok(Math.max(...lean) > 45);
});

test('normalizeFrame: 골반 중점이 원점, 몸통 길이가 1', () => {
  const frame = loadFixture('side_good').frames[10];
  const n = normalizeFrame(frame);
  const L = n.landmarks;
  const mid = (a, b) => ({ x: (L[a].x + L[b].x) / 2, y: (L[a].y + L[b].y) / 2 });
  const hip = mid(LM.LEFT_HIP, LM.RIGHT_HIP);
  const sh = mid(LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER);
  near(hip.x, 0, 1e-9, '골반 x');
  near(hip.y, 0, 1e-9, '골반 y');
  near(Math.hypot(sh.x - hip.x, sh.y - hip.y), 1, 1e-9, '몸통 길이');
  assert.notEqual(n, frame, '원본을 바꾸지 않고 새 객체를 돌려줘요');
});

test('화면 비율(aspect)을 반영해요: 16:9에서 x 0.1은 y 0.1보다 길어요', () => {
  // 정규화 좌표로는 45도지만, 16:9 화면 픽셀로는 더 눕혀진 각도예요
  const a = { x: 0.1, y: 0 };
  const b = { x: 0, y: 0 };
  const c = { x: 0.1, y: 0.1 };
  near(angleDeg(a, b, c), 45, 1e-9, 'aspect 1');
  near(
    angleDeg(a, b, c, 16 / 9),
    (Math.atan2(0.1, 0.1 * (16 / 9)) * 180) / Math.PI,
    1e-9,
    'aspect 16:9',
  );
});
