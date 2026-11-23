// 테스트용 합성 스쿼트 좌표 JSON과 라벨 CSV를 만들어요.  실행: npm run fixtures
// 실제 사람 데이터가 아니라 무릎 각도 곡선에서 계산한 막대 인형이에요. 판정 로직과 평가 코드를
// 실제 촬영 전에 개발·테스트하는 용도예요. 측면(사람이 화면 오른쪽(+x)을 보는 방향)만 있어요.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FPS = 15;
const STAND_MS = 600;
const PAUSE_MS = 400;
const STAND_KNEE = 175;

// 같은 결과가 나오도록 고정 시드 난수
let seed = 42;
const rand = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296 - 0.5;
const r3 = (v) => Math.round(v * 1000) / 1000;
const rad = (deg) => (deg * Math.PI) / 180;

const GOOD = { durMs: 2000, minKnee: 80, lean: 0.6 };
const SHALLOW = { durMs: 2000, minKnee: 125, lean: 0.6 };
const LEAN = { durMs: 2000, minKnee: 80, lean: 1.5 };
const FAST = { durMs: 450, minKnee: 85, lean: 0.6 };
const OCCLUDED = { ...GOOD, occlude: true };

// 이름 → 반복 목록과 기대 판정
const FIXTURES = {
  side_good: [GOOD, GOOD, GOOD],
  side_shallow: [SHALLOW, SHALLOW, SHALLOW],
  side_lean: [LEAN, LEAN, LEAN],
  side_fast: [FAST, FAST, FAST],
  side_occluded: [GOOD, OCCLUDED, GOOD],
  side_mixed: [GOOD, SHALLOW, GOOD, LEAN],
};

function expectedOf(rep) {
  if (rep.occlude) return { valid: false, errorTypes: [], held: true };
  const errorTypes = [];
  if (rep.minKnee > 100) errorTypes.push('shallow_depth');
  if (rep.lean * ((180 - rep.minKnee) / 2) > 45) errorTypes.push('excessive_lean');
  if (rep.durMs < 800) errorTypes.push('too_fast');
  return { valid: errorTypes.length === 0, errorTypes, held: false };
}

/** 무릎 각도와 상체 기울기로 33개 관절 좌표 계산 */
function pose(kneeDeg, leanFactor, occlude) {
  const a = rad((180 - kneeDeg) / 2); // 정강이가 앞으로 기운 각도
  const b = a * leanFactor; // 상체가 앞으로 기운 각도
  const ankle = [0.5, 0.88];
  const knee = [ankle[0] + 0.2 * Math.sin(a), ankle[1] - 0.2 * Math.cos(a)];
  const hip = [knee[0] - 0.2 * Math.sin(a), knee[1] - 0.2 * Math.cos(a)];
  const shoulder = [hip[0] + 0.28 * Math.sin(b), hip[1] - 0.28 * Math.cos(b)];
  const nose = [shoulder[0] + 0.03 + 0.1 * Math.sin(b), shoulder[1] - 0.1 * Math.cos(b)];
  const elbow = [shoulder[0] + 0.12, shoulder[1] + 0.02];
  const wrist = [shoulder[0] + 0.24, shoulder[1]];
  const heel = [ankle[0] - 0.03, ankle[1] + 0.02];
  const toe = [ankle[0] + 0.08, ankle[1] + 0.03];

  const at = (p, dx = 0, dy = 0) => [p[0] + dx, p[1] + dy];
  // MediaPipe 순서 0~32. 짝수/홀수로 왼쪽/오른쪽이 섞여 있어요.
  const base = [
    nose,
    ...[0, 1, 2, 3, 4, 5].map((i) => at(nose, -0.005 * (i % 3), -0.01)), // 1~6 눈
    at(nose, -0.04, 0),
    at(nose, -0.04, 0), // 7, 8 귀
    at(nose, 0.005, 0.02),
    at(nose, 0.005, 0.02), // 9, 10 입
    shoulder,
    shoulder,
    elbow,
    elbow,
    wrist,
    wrist,
    ...[17, 18, 19, 20, 21, 22].map(() => at(wrist, 0.02, 0)), // 손
    hip,
    hip,
    knee,
    knee,
    ankle,
    ankle,
    heel,
    heel,
    toe,
    toe,
  ];
  return base.map(([x, y], i) => {
    const isLeft = i % 2 === 1 && i >= 11; // 왼쪽이 카메라에 가까운 쪽
    const lowerBody = i >= 25;
    let visibility = isLeft || i < 11 ? 0.95 : 0.8;
    if (occlude && lowerBody) visibility = 0.2;
    return {
      x: r3(x + (isLeft ? 0.004 : -0.004) + rand() * 0.004),
      y: r3(y + rand() * 0.004),
      z: r3(isLeft ? -0.05 : 0.05),
      visibility: r3(visibility),
    };
  });
}

function build(name, reps) {
  // 시간표: 서 있기 → (반복, 쉬기)… → 서 있기
  const segments = [];
  let t = STAND_MS;
  for (const rep of reps) {
    segments.push({ ...rep, start: t, end: t + rep.durMs });
    t += rep.durMs + PAUSE_MS;
  }
  const totalMs = t - PAUSE_MS + STAND_MS;

  const frames = [];
  for (let i = 0; i * (1000 / FPS) <= totalMs; i++) {
    const ms = i * (1000 / FPS);
    const seg = segments.find((s) => ms >= s.start && ms <= s.end);
    let knee = STAND_KNEE;
    let lean = GOOD.lean;
    let occlude = false;
    if (seg) {
      const p = (ms - seg.start) / (seg.end - seg.start);
      knee = STAND_KNEE - (STAND_KNEE - seg.minKnee) * Math.sin(Math.PI * p);
      lean = seg.lean;
      occlude = !!seg.occlude;
    }
    frames.push({ t: Math.round(ms * 10) / 10, landmarks: pose(knee, lean, occlude) });
  }

  const video = `${name}.mp4`;
  const doc = { video, fps: FPS, view: 'side', frames };
  const json =
    '{\n' +
    `  "video": ${JSON.stringify(video)},\n  "fps": ${FPS},\n  "view": "side",\n  "frames": [\n` +
    frames.map((f) => '    ' + JSON.stringify(f)).join(',\n') +
    '\n  ]\n}\n';
  writeFileSync(join(OUT, `${name}.json`), json);
  return { doc, segments };
}

const expected = {};
const labelRows = { a: [], b: [] };
for (const [name, reps] of Object.entries(FIXTURES)) {
  const { segments } = build(name, reps);
  expected[name] = segments.map((s) => ({ start: s.start, end: s.end, ...expectedOf(s) }));

  if (name === 'side_mixed') {
    segments.forEach((s, i) => {
      const e = expectedOf(s);
      const row = (labeler, valid, err) =>
        [
          `${name}.mp4`,
          i + 1,
          (s.start / 1000).toFixed(2),
          (s.end / 1000).toFixed(2),
          valid,
          err,
          labeler,
        ].join(',');
      labelRows.a.push(row('labeler_a', e.valid ? 1 : 0, e.errorTypes.join('|')));
      // 라벨러 b는 4번째 반복(상체 숙임)을 정상으로 봤다고 가정 → kappa 테스트용 불일치
      const disagree = i === 3;
      labelRows.b.push(
        row('labeler_b', disagree ? 1 : e.valid ? 1 : 0, disagree ? '' : e.errorTypes.join('|')),
      );
    });
  }
}

writeFileSync(join(OUT, 'expected.json'), JSON.stringify(expected, null, 2) + '\n');
const header = 'video,rep_index,start_sec,end_sec,valid,error_type,labeler';
writeFileSync(join(OUT, 'labels_a.csv'), [header, ...labelRows.a].join('\n') + '\n');
writeFileSync(join(OUT, 'labels_b.csv'), [header, ...labelRows.b].join('\n') + '\n');
console.log(
  `픽스처 ${Object.keys(FIXTURES).length}개, expected.json, labels_a.csv, labels_b.csv 생성`,
);
