// 평가 스크립트: 좌표 JSON 폴더와 라벨 CSV를 넣으면 지표를 한 번에 출력해요.
//
// 사용법:
//   npm run eval -- --coords fixtures --labels fixtures/labels_a.csv
//   npm run eval -- --coords data/coords --labels labels/soyoung0108.csv --config core/config/squat.json
//
// 출력: 반복 카운트 MAE, 오류 반복 기준 Precision/Recall/F1, 판정 보류 수, 영상별 표.
// 라벨이 없는 좌표 JSON은 건너뛰어요.

import { readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { parseArgs } from 'node:util';
import { judgeVideo } from '../core/index.js';
import { parseLabelsCsv } from './src/labels.js';
import { countMAE, matchReps, binaryMetrics } from './src/metrics.js';

const { values } = parseArgs({
  options: {
    coords: { type: 'string' },
    labels: { type: 'string' },
    config: { type: 'string', default: 'core/config/squat.json' },
  },
});

if (!values.coords || !values.labels) {
  console.error('사용법: npm run eval -- --coords <좌표 JSON 폴더> --labels <라벨 CSV>');
  process.exit(1);
}

const config = JSON.parse(readFileSync(values.config, 'utf8'));
const labels = parseLabelsCsv(readFileSync(values.labels, 'utf8'));
const labelsByVideo = Map.groupBy(labels, (r) => r.video);

const perVideo = [];
const countPairs = [];
const items = [];
// 라벨러가 "판단 불가"로 둔 반복(valid=0, 오류 유형 없음)은 P/R/F1에서 빼고 따로 세요
const unknown = { total: 0, held: 0, countedValid: 0 };
// 오류 유형별: 라벨에 그 오류가 있을 때 예측도 그 오류를 짚었는지
const byType = {};

for (const file of readdirSync(values.coords).filter((f) => f.endsWith('.json'))) {
  const doc = JSON.parse(readFileSync(join(values.coords, file), 'utf8'));
  if (!doc.frames) continue; // expected.json 같은 다른 JSON
  const videoLabels = (labelsByVideo.get(doc.video) ?? []).sort((a, b) => a.repIndex - b.repIndex);
  if (videoLabels.length === 0) continue;

  const results = judgeVideo(doc, config);
  countPairs.push({ predicted: results.length, actual: videoLabels.length });

  for (const m of matchReps(results, videoLabels)) {
    if (m.pred === null || m.label === null) continue; // 카운트 오차는 MAE에 이미 반영
    const r = results[m.pred];
    const label = videoLabels[m.label];
    if (!label.valid && label.errorTypes.length === 0) {
      unknown.total += 1;
      if (r.held) unknown.held += 1;
      if (r.valid) unknown.countedValid += 1;
      continue;
    }
    items.push({ predictedValid: r.valid, predictedHeld: r.held, actualValid: label.valid });
    for (const e of label.errorTypes) {
      byType[e] ??= { labeled: 0, found: 0 };
      byType[e].labeled += 1;
      if (r.errorTypes.includes(e)) byType[e].found += 1;
    }
  }
  perVideo.push({
    영상: basename(file),
    '라벨 반복': videoLabels.length,
    '예측 반복': results.length,
    '예측 정상': results.filter((r) => r.valid).length,
    보류: results.filter((r) => r.held).length,
  });
}

if (perVideo.length === 0) {
  console.error(
    '라벨과 이어지는 좌표 JSON이 없어요. 좌표 JSON의 video와 CSV의 video가 같은지 확인해요.',
  );
  process.exit(1);
}

const m = binaryMetrics(items);
const f = (v) => v.toFixed(3);
console.table(perVideo);
console.log(`영상 ${perVideo.length}개 · 짝지은 반복 ${items.length}개`);
console.log(`반복 카운트 MAE: ${f(countMAE(countPairs))} (목표 0.5 이하)`);
console.log(
  `오류 반복 기준  Precision ${f(m.precision)} · Recall ${f(m.recall)} · F1 ${f(m.f1)} (목표 F1 0.85 이상)`,
);
console.log(`TP ${m.tp} · FP ${m.fp} · FN ${m.fn} · TN ${m.tn} · 판정 보류 ${m.heldCount}`);
for (const [type, v] of Object.entries(byType)) {
  console.log(
    `  ${type}: 라벨 ${v.labeled}개 중 ${v.found}개를 같은 유형으로 짚음 (${f(v.found / v.labeled)})`,
  );
}
if (unknown.total) {
  console.log(
    `판단 불가 라벨 ${unknown.total}개: 보류로 판정 ${unknown.held}개 · 정상으로 세어 버림 ${unknown.countedValid}개 (0이어야 해요)`,
  );
}
