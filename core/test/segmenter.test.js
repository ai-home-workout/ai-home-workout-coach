import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRepSegmenter, kneeAngle } from '../index.js';
import { loadConfig, loadExpected, loadFixture } from '../../shared/test/fixtures.js';

const config = loadConfig();

// 무릎 각도 곡선을 직접 만들어 넣어요 (B1과 상관없이 테스트할 수 있게)
function run(curve, stepMs = 1000 / 30) {
  const seg = createRepSegmenter(config);
  const out = [];
  curve.forEach((deg, i) => {
    const s = seg.push(i * stepMs, deg);
    if (s) out.push(s);
  });
  return out;
}
const rep = (min, n = 60) =>
  Array.from({ length: n }, (_, i) => 175 - (175 - min) * Math.sin((Math.PI * i) / (n - 1)));
const stand = (n = 15) => Array(n).fill(175);

test('반복 3회를 3개 구간으로 나눠요', () => {
  const curve = [
    ...stand(),
    ...rep(80),
    ...stand(),
    ...rep(85),
    ...stand(),
    ...rep(88),
    ...stand(),
  ];
  const segs = run(curve);
  assert.equal(segs.length, 3);
  for (const s of segs) {
    assert.ok(s.end > s.start);
    assert.ok(s.bottomKneeDeg <= 90);
    assert.ok(s.bottomT > s.start && s.bottomT < s.end);
  }
});

test('바닥 근처 흔들림(히스테리시스 안쪽)으로 반복이 쪼개지지 않아요', () => {
  const wobble = rep(80).map((d, i) => d + (i % 2 ? 4 : -4));
  assert.equal(run([...stand(), ...wobble, ...stand()]).length, 1);
});

test('경계값 근처에서 잠깐 내려갔다 오는 노이즈는 반복이 아니에요', () => {
  const blip = [...stand(), 158, 158, 166, ...stand()];
  assert.equal(run(blip).length, 0);
});

test('깊이 부족(125도) 반복도 구간으로는 잡아요', () => {
  assert.equal(run([...stand(), ...rep(125), ...stand()]).length, 1);
});

test('픽스처 영상마다 expected.json과 반복 수가 같아요', () => {
  for (const [name, reps] of Object.entries(loadExpected())) {
    const seg = createRepSegmenter(config);
    let n = 0;
    for (const f of loadFixture(name).frames) if (seg.push(f.t, kneeAngle(f.landmarks).angle)) n++;
    assert.equal(n, reps.length, name);
  }
});
