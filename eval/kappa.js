// 두 라벨러의 일치도(Cohen's kappa)를 계산해요.
// 사용법: npm run kappa -- labels/soyoung0108.csv labels/SYW77.csv
// 같은 영상·같은 rep_index끼리 짝지어요. 한쪽에만 있는 반복은 따로 알려 줘요.
import { readFileSync } from 'node:fs';
import { parseLabelsCsv } from './src/labels.js';
import { cohenKappa } from './src/metrics.js';

const [fileA, fileB] = process.argv.slice(2);
if (!fileA || !fileB) {
  console.error('사용법: npm run kappa -- <라벨러 A CSV> <라벨러 B CSV>');
  process.exit(1);
}
const key = (r) => `${r.video}#${r.repIndex}`;
const a = new Map(parseLabelsCsv(readFileSync(fileA, 'utf8')).map((r) => [key(r), r]));
const b = new Map(parseLabelsCsv(readFileSync(fileB, 'utf8')).map((r) => [key(r), r]));

const shared = [...a.keys()].filter((k) => b.has(k));
const onlyA = [...a.keys()].filter((k) => !b.has(k));
const onlyB = [...b.keys()].filter((k) => !a.has(k));
const va = shared.map((k) => a.get(k).valid);
const vb = shared.map((k) => b.get(k).valid);

console.log(
  `같이 라벨링한 반복 ${shared.length}개 · 단순 일치율 ${(va.filter((v, i) => v === vb[i]).length / shared.length).toFixed(3)}`,
);
console.log(`Cohen's kappa (정상/오류): ${cohenKappa(va, vb).toFixed(3)}`);
const diff = shared.filter((k, i) => va[i] !== vb[i]);
if (diff.length) console.log(`판정이 다른 반복: ${diff.join(', ')}`);
if (onlyA.length || onlyB.length) {
  console.log(
    `한쪽에만 있는 반복 (반복 경계를 다시 맞춰요): A ${onlyA.join(', ') || '없음'} / B ${onlyB.join(', ') || '없음'}`,
  );
}
