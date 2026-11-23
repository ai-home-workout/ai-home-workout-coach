// 평가 지표. 순수 함수만 둬요.

const safeDiv = (a, b) => (b === 0 ? 0 : a / b);

/**
 * 반복 카운트 MAE: 영상마다 |예측 반복 수 − 라벨 반복 수|의 평균.
 * 반복 수는 정상·오류 구분 없이 "반복 구간 개수"예요.
 * @param {{ predicted: number, actual: number }[]} pairs 영상별
 * @returns {number}
 */
export function countMAE(pairs) {
  return safeDiv(
    pairs.reduce((s, p) => s + Math.abs(p.predicted - p.actual), 0),
    pairs.length,
  );
}

/** 두 시간 구간의 IoU (단위는 같아야 해요) */
export function intervalIoU(aStart, aEnd, bStart, bEnd) {
  const inter = Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
  const union = Math.max(aEnd, bEnd) - Math.min(aStart, bStart);
  return safeDiv(inter, union);
}

/**
 * 예측 반복과 라벨 반복 짝짓기: 시간 구간 IoU(겹친 길이 ÷ 합친 길이)가 minIoU 이상인 것끼리
 * 1:1로 짝지어요(IoU가 큰 쌍부터). 짝이 없는 예측/라벨도 결과에 남겨요(반대쪽은 null).
 * @param {{ start: number, end: number }[]} predicted ms
 * @param {{ startSec: number, endSec: number }[]} labels 초
 * @param {number} [minIoU]
 * @returns {{ pred: number|null, label: number|null, iou: number }[]} 각 배열의 인덱스
 */
export function matchReps(predicted, labels, minIoU = 0.3) {
  const candidates = [];
  predicted.forEach((p, i) => {
    labels.forEach((l, j) => {
      const iou = intervalIoU(p.start, p.end, l.startSec * 1000, l.endSec * 1000);
      if (iou >= minIoU) candidates.push({ pred: i, label: j, iou });
    });
  });
  candidates.sort((a, b) => b.iou - a.iou);

  const usedPred = new Set();
  const usedLabel = new Set();
  const out = [];
  for (const c of candidates) {
    if (usedPred.has(c.pred) || usedLabel.has(c.label)) continue;
    usedPred.add(c.pred);
    usedLabel.add(c.label);
    out.push(c);
  }
  predicted.forEach((_, i) => {
    if (!usedPred.has(i)) out.push({ pred: i, label: null, iou: 0 });
  });
  labels.forEach((_, j) => {
    if (!usedLabel.has(j)) out.push({ pred: null, label: j, iou: 0 });
  });
  return out;
}

/**
 * 이진 분류 지표. positive 클래스는 "오류 반복"(valid=false)이에요.
 * recall이 낮으면 틀린 자세를 정상으로 세어 준 경우가 많다는 뜻이에요.
 * held 예측은 오류로 판정한 것으로 치지 않고 따로 세요(heldCount, 지표 계산에서 제외).
 * 분모가 0이면 그 지표는 0으로 둬요.
 * @param {{ predictedValid: boolean, predictedHeld: boolean, actualValid: boolean }[]} items 짝지어진 반복들
 * @returns {{ tp: number, fp: number, fn: number, tn: number, heldCount: number, precision: number, recall: number, f1: number }}
 */
export function binaryMetrics(items) {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;
  let heldCount = 0;
  for (const it of items) {
    if (it.predictedHeld) {
      heldCount += 1;
      continue;
    }
    const predError = !it.predictedValid;
    const actualError = !it.actualValid;
    if (predError && actualError) tp += 1;
    else if (predError) fp += 1;
    else if (actualError) fn += 1;
    else tn += 1;
  }
  const precision = safeDiv(tp, tp + fp);
  const recall = safeDiv(tp, tp + fn);
  const f1 = safeDiv(2 * precision * recall, precision + recall);
  return { tp, fp, fn, tn, heldCount, precision, recall, f1 };
}

/**
 * Cohen's kappa: 두 라벨러의 valid(1/0) 판정 일치도.
 * 두 사람이 모두 한 가지로만 답해 우연 일치가 1이면, 완전히 일치할 때 1, 아니면 0으로 둬요.
 * @param {boolean[]} a
 * @param {boolean[]} b 같은 길이, 같은 반복 순서
 * @returns {number}
 */
export function cohenKappa(a, b) {
  if (a.length !== b.length) throw new Error('두 라벨 배열의 길이가 달라요');
  const n = a.length;
  if (n === 0) return 0;
  const po = a.filter((v, i) => v === b[i]).length / n;
  const pa = a.filter(Boolean).length / n;
  const pb = b.filter(Boolean).length / n;
  const pe = pa * pb + (1 - pa) * (1 - pb);
  if (pe === 1) return po === 1 ? 1 : 0;
  return (po - pe) / (1 - pe);
}
