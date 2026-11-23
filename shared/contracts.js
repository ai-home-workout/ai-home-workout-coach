// 공용 계약: 데이터 형식 4종의 상수, 타입, 검사 함수.
// 형식 설명은 shared/README.md. 이 파일은 팀 합의 없이 바꾸지 않아요 (TeamRules.md 6절).
// DOM, MediaPipe, React에 의존하지 않아요.

/** MediaPipe Pose 관절 개수 */
export const LANDMARK_COUNT = 33;

/** MediaPipe Pose 관절 번호 (자주 쓰는 것만) */
export const LM = Object.freeze({
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
});

/** 카메라 방향 */
export const VIEWS = Object.freeze(['side', 'front']);

/** 오류 유형: ID → 화면 이름, 확인 가능한 방향 */
export const ERROR_TYPES = Object.freeze({
  knee_valgus: { label: '무릎 모임', views: ['front'] },
  shallow_depth: { label: '깊이 부족', views: ['side'] },
  excessive_lean: { label: '상체 과도 숙임', views: ['side'] },
  too_fast: { label: '날림 동작', views: ['side', 'front'] },
});

/** UI 이벤트 종류 */
export const EVENT_TYPES = Object.freeze(['rep', 'hold', 'rest', 'setDone']);

/** 라벨 CSV 열 순서 */
export const LABEL_CSV_COLUMNS = Object.freeze([
  'video',
  'rep_index',
  'start_sec',
  'end_sec',
  'valid',
  'error_type',
  'labeler',
]);

/**
 * @typedef {{ x: number, y: number, z: number, visibility: number }} Landmark
 * @typedef {{ t: number, landmarks: Landmark[] }} Frame
 * @typedef {{ video: string, fps: number, view: 'side'|'front', aspect?: number, frames: Frame[] }} VideoCoords
 * @typedef {{ start: number, end: number, valid: boolean, errorTypes: string[], held: boolean, reason: string }} RepResult
 * @typedef {{ type: 'rep', count: number, valid: boolean, errorTypes: string[], held: boolean, reason: string }
 *   | { type: 'hold', reason: string }
 *   | { type: 'rest', reason: string }
 *   | { type: 'setDone', set: number, totalSets: number }} UiEvent
 */

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** @returns {string[]} 문제 목록 (비어 있으면 통과) */
export function checkFrame(frame) {
  const problems = [];
  if (!frame || typeof frame !== 'object') return ['프레임이 객체가 아니에요'];
  if (!isNum(frame.t)) problems.push('t가 숫자가 아니에요');
  if (!Array.isArray(frame.landmarks) || frame.landmarks.length !== LANDMARK_COUNT) {
    problems.push(`landmarks가 ${LANDMARK_COUNT}개가 아니에요`);
    return problems;
  }
  frame.landmarks.forEach((lm, i) => {
    for (const key of ['x', 'y', 'z', 'visibility']) {
      if (!isNum(lm?.[key])) problems.push(`landmarks[${i}].${key}가 숫자가 아니에요`);
    }
  });
  return problems;
}

/** @returns {string[]} */
export function checkVideoCoords(doc) {
  const problems = [];
  if (typeof doc?.video !== 'string') problems.push('video가 문자열이 아니에요');
  if (!isNum(doc?.fps) || doc.fps <= 0) problems.push('fps가 양수가 아니에요');
  if (!VIEWS.includes(doc?.view)) problems.push(`view는 ${VIEWS.join(', ')} 중 하나예요`);
  if (doc?.aspect !== undefined && (!isNum(doc.aspect) || doc.aspect <= 0)) {
    problems.push('aspect는 양수여야 해요 (화면 너비 ÷ 높이)');
  }
  if (!Array.isArray(doc?.frames)) return [...problems, 'frames가 배열이 아니에요'];
  doc.frames.forEach((f, i) => {
    for (const p of checkFrame(f)) problems.push(`frames[${i}]: ${p}`);
    if (i > 0 && isNum(f?.t) && f.t <= doc.frames[i - 1].t) {
      problems.push(`frames[${i}]: t가 앞 프레임보다 크지 않아요`);
    }
  });
  return problems;
}

/** @returns {string[]} */
export function checkRepResult(r) {
  const problems = [];
  if (!isNum(r?.start) || !isNum(r?.end)) problems.push('start, end가 숫자가 아니에요');
  else if (r.end < r.start) problems.push('end가 start보다 앞이에요');
  if (typeof r?.valid !== 'boolean') problems.push('valid가 boolean이 아니에요');
  if (typeof r?.held !== 'boolean') problems.push('held가 boolean이 아니에요');
  if (r?.held && r?.valid) problems.push('held가 true면 valid는 false여야 해요');
  if (!Array.isArray(r?.errorTypes)) problems.push('errorTypes가 배열이 아니에요');
  else {
    for (const e of r.errorTypes) if (!(e in ERROR_TYPES)) problems.push(`모르는 오류 유형: ${e}`);
    if (r.valid && r.errorTypes.length > 0) problems.push('valid인데 errorTypes가 있어요');
  }
  if (typeof r?.reason !== 'string') problems.push('reason이 문자열이 아니에요');
  return problems;
}

/** @returns {string[]} */
export function checkUiEvent(e) {
  if (!EVENT_TYPES.includes(e?.type)) return [`type은 ${EVENT_TYPES.join(', ')} 중 하나예요`];
  const problems = [];
  if (e.type === 'rep') {
    if (!Number.isInteger(e.count) || e.count < 0) problems.push('count가 0 이상 정수가 아니에요');
    if (typeof e.valid !== 'boolean') problems.push('valid가 boolean이 아니에요');
    if (typeof e.held !== 'boolean') problems.push('held가 boolean이 아니에요');
    if (!Array.isArray(e.errorTypes)) problems.push('errorTypes가 배열이 아니에요');
  } else if (e.type === 'setDone') {
    if (!Number.isInteger(e.set) || e.set < 1) problems.push('set이 1 이상 정수가 아니에요');
    if (!Number.isInteger(e.totalSets)) problems.push('totalSets가 정수가 아니에요');
  } else if (typeof e.reason !== 'string') {
    problems.push('reason이 문자열이 아니에요');
  }
  return problems;
}

/** 오류 유형 ID 배열 → 화면 문구 ("깊이 부족, 상체 과도 숙임") */
export function errorLabels(errorTypes) {
  return errorTypes.map((id) => ERROR_TYPES[id]?.label ?? id).join(', ');
}
