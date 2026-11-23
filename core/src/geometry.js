// 관절 좌표 계산. 순수 함수만 둬요.
//
// 화면 비율: MediaPipe의 x, y는 각각 화면 너비·높이로 나눈 값이라 16:9 화면에서는 x 1이 y 1보다 길어요.
// 각도를 제대로 재려면 x에 aspect(너비 ÷ 높이)를 곱해야 해요. aspect를 모르면 1로 둬요.
import { LM } from '../../shared/contracts.js';

const DEG = 180 / Math.PI;
const mid = (p, q) => ({
  x: (p.x + q.x) / 2,
  y: (p.y + q.y) / 2,
  visibility: Math.min(p.visibility ?? 1, q.visibility ?? 1),
});

/**
 * 세 점 a-b-c에서 b의 각도(도, 0~180). x, y만 써요.
 * @param {{x:number,y:number}} a
 * @param {{x:number,y:number}} b 꼭짓점
 * @param {{x:number,y:number}} c
 * @param {number} [aspect] 화면 너비 ÷ 높이
 * @returns {number}
 */
export function angleDeg(a, b, c, aspect = 1) {
  const v1x = (a.x - b.x) * aspect;
  const v1y = a.y - b.y;
  const v2x = (c.x - b.x) * aspect;
  const v2y = c.y - b.y;
  const len = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
  if (len === 0) return 180;
  const cos = (v1x * v2x + v1y * v2y) / len;
  return Math.acos(Math.min(1, Math.max(-1, cos))) * DEG;
}

const SIDES = {
  left: [LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE],
  right: [LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE],
};

/**
 * 무릎 각도(엉덩이-무릎-발목). side가 'auto'면 visibility 합이 큰 쪽을 써요.
 * @param {import('../../shared/contracts.js').Landmark[]} landmarks
 * @param {'left'|'right'|'auto'} [side]
 * @param {number} [aspect] 화면 너비 ÷ 높이
 * @returns {{ angle: number, side: 'left'|'right', visibility: number }} visibility는 세 관절 중 최솟값
 */
export function kneeAngle(landmarks, side = 'auto', aspect = 1) {
  if (side === 'auto') {
    const sum = (ids) => ids.reduce((s, i) => s + landmarks[i].visibility, 0);
    side = sum(SIDES.left) >= sum(SIDES.right) ? 'left' : 'right';
  }
  const [h, k, a] = SIDES[side].map((i) => landmarks[i]);
  return {
    angle: angleDeg(h, k, a, aspect),
    side,
    visibility: Math.min(h.visibility, k.visibility, a.visibility),
  };
}

/**
 * 상체 기울기: 골반 중점→어깨 중점 벡터가 수직(위쪽)과 이루는 각도(도). 서 있으면 0에 가까워요.
 * 앞뒤 구분 없이 크기만 돌려줘요.
 * @param {import('../../shared/contracts.js').Landmark[]} landmarks
 * @param {number} [aspect] 화면 너비 ÷ 높이
 * @returns {number}
 */
export function torsoLeanDeg(landmarks, aspect = 1) {
  const hip = mid(landmarks[LM.LEFT_HIP], landmarks[LM.RIGHT_HIP]);
  const sh = mid(landmarks[LM.LEFT_SHOULDER], landmarks[LM.RIGHT_SHOULDER]);
  const dx = Math.abs(sh.x - hip.x) * aspect;
  const dy = hip.y - sh.y; // 화면 y는 아래로 커지니까 위쪽이 양수
  return Math.atan2(dx, dy) * DEG;
}

/**
 * 정규화: 골반 중점을 원점으로 옮기고 몸통 길이(어깨 중점–골반 중점)를 1로 맞춰요.
 * x에는 aspect를 곱해 화면 비율을 바로잡아요. visibility는 그대로 둬요. 원본 frame은 바꾸지 않아요.
 * @param {import('../../shared/contracts.js').Frame} frame
 * @param {number} [aspect] 화면 너비 ÷ 높이
 * @returns {import('../../shared/contracts.js').Frame}
 */
export function normalizeFrame(frame, aspect = 1) {
  const L = frame.landmarks;
  const hip = mid(L[LM.LEFT_HIP], L[LM.RIGHT_HIP]);
  const sh = mid(L[LM.LEFT_SHOULDER], L[LM.RIGHT_SHOULDER]);
  const torso = Math.hypot((sh.x - hip.x) * aspect, sh.y - hip.y) || 1;
  return {
    t: frame.t,
    landmarks: L.map((p) => ({
      x: ((p.x - hip.x) * aspect) / torso,
      y: (p.y - hip.y) / torso,
      z: (p.z * aspect) / torso, // MediaPipe z는 x와 비슷한 단위예요
      visibility: p.visibility,
    })),
  };
}

/**
 * 관절 여러 개가 모두 minVisibility 이상인지
 * @param {import('../../shared/contracts.js').Landmark[]} landmarks
 * @param {number[]} ids
 * @param {number} minVisibility
 */
export function allVisible(landmarks, ids, minVisibility) {
  return ids.every((i) => landmarks[i].visibility >= minVisibility);
}

export { LM };
