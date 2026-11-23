// 규칙 baseline (오류 규칙, 판정 보류). 반복 구간 하나를 받아 반복 결과를 만들어요.
import { ERROR_TYPES, LM } from '../../../shared/contracts.js';
import { torsoLeanDeg } from '../geometry.js';

/** 오류별 사용자 안내 문구 */
export const ERROR_MESSAGES = Object.freeze({
  shallow_depth: '조금 더 깊이 앉아 주세요 (허벅지가 바닥과 수평이 될 때까지)',
  excessive_lean: '상체를 조금 더 세워 주세요',
  knee_valgus: '무릎이 안쪽으로 모이지 않게 발끝 방향으로 밀어 주세요',
  too_fast: '천천히, 끝까지 내려갔다 올라와요',
});

const SIDE_JOINTS = {
  left: { shoulder: LM.LEFT_SHOULDER, hip: LM.LEFT_HIP, knee: LM.LEFT_KNEE, ankle: LM.LEFT_ANKLE },
  right: {
    shoulder: LM.RIGHT_SHOULDER,
    hip: LM.RIGHT_HIP,
    knee: LM.RIGHT_KNEE,
    ankle: LM.RIGHT_ANKLE,
  },
};
const JOINT_NAMES = { shoulder: '어깨', hip: '엉덩이', knee: '무릎', ankle: '발목' };

/** 방향별로 판정에 필요한 관절: { 이름: [관절 번호…] } */
function requiredJoints(frames, view) {
  if (view === 'front') {
    return {
      hip: [LM.LEFT_HIP, LM.RIGHT_HIP],
      knee: [LM.LEFT_KNEE, LM.RIGHT_KNEE],
      ankle: [LM.LEFT_ANKLE, LM.RIGHT_ANKLE],
    };
  }
  // 측면: 카메라에 가까운 쪽(구간 전체 visibility 합이 큰 쪽) 하나만 봐요
  const score = (side) =>
    frames.reduce(
      (s, f) =>
        s + Object.values(SIDE_JOINTS[side]).reduce((a, i) => a + f.landmarks[i].visibility, 0),
      0,
    );
  const side = score('left') >= score('right') ? 'left' : 'right';
  return Object.fromEntries(Object.entries(SIDE_JOINTS[side]).map(([name, i]) => [name, [i]]));
}

/**
 * 판정 보류 검사. 필요한 관절이 보인 프레임 비율이 기준보다 낮으면 안내 문구를 돌려줘요.
 * @returns {string|null} 보류 사유 (보류가 아니면 null)
 */
function holdReason(frames, view, config) {
  if (frames.length === 0) return '동작을 확인하지 못했어요. 카메라 앞에 다시 서 주세요';
  const joints = requiredJoints(frames, view);
  const min = config.minVisibility;
  const visible = (f, ids) => ids.every((i) => f.landmarks[i].visibility >= min);
  const okFrames = frames.filter((f) => Object.values(joints).every((ids) => visible(f, ids)));
  if (okFrames.length / frames.length >= config.hold.minVisibleFrameRatio) return null;

  // 가장 자주 안 보인 관절을 알려 줘요
  let worst = 'knee';
  let worstMissing = -1;
  for (const [name, ids] of Object.entries(joints)) {
    const missing = frames.filter((f) => !visible(f, ids)).length;
    if (missing > worstMissing) {
      worst = name;
      worstMissing = missing;
    }
  }
  return `${JOINT_NAMES[worst]}이 잘 보이지 않아 판정하지 못했어요. 머리부터 발끝까지 화면에 들어오게 서 주세요`;
}

/** 가장 깊이 앉은 시각에 가장 가까운 프레임 */
function bottomFrame(frames, segment) {
  return frames.reduce((best, f) =>
    Math.abs(f.t - segment.bottomT) < Math.abs(best.t - segment.bottomT) ? f : best,
  );
}

/**
 * 반복 하나 판정.
 * - 측면(view 'side'): shallow_depth, excessive_lean, too_fast
 * - 정면(view 'front'): knee_valgus, too_fast  (깊이·상체 숙임은 정면에서 확인할 수 없어요)
 * - 필요한 관절이 보인 프레임 비율이 config.hold.minVisibleFrameRatio보다 낮으면
 *   held: true, valid: false, reason에 안내 문구
 * - reason은 사용자에게 보여 줄 한국어 문장. 정상이면 ''.
 * @param {import('../../../shared/contracts.js').Frame[]} frames 구간 안의 프레임 (start~end)
 * @param {import('./segmenter.js').Segment} segment
 * @param {object} config core/config/squat.json
 * @param {'side'|'front'} view
 * @param {{ aspect?: number }} [options] aspect: 화면 너비 ÷ 높이
 * @returns {import('../../../shared/contracts.js').RepResult}
 */
export function judgeRep(frames, segment, config, view, { aspect = 1 } = {}) {
  const base = { start: segment.start, end: segment.end };

  const hold = holdReason(frames, view, config);
  if (hold) return { ...base, valid: false, errorTypes: [], held: true, reason: hold };

  const { rules } = config;
  const errorTypes = [];

  if (view === 'side') {
    if (segment.bottomKneeDeg > rules.shallow_depth.maxBottomKneeDeg) {
      errorTypes.push('shallow_depth');
    }
    const maxLean = Math.max(...frames.map((f) => torsoLeanDeg(f.landmarks, aspect)));
    if (maxLean > rules.excessive_lean.maxTorsoLeanDeg) errorTypes.push('excessive_lean');
  } else if (view === 'front') {
    // 가장 깊이 앉은 순간의 무릎 간격 ÷ 발목 간격
    const L = bottomFrame(frames, segment).landmarks;
    const kneeW = Math.abs(L[LM.LEFT_KNEE].x - L[LM.RIGHT_KNEE].x);
    const ankleW = Math.abs(L[LM.LEFT_ANKLE].x - L[LM.RIGHT_ANKLE].x);
    if (ankleW > 0 && kneeW / ankleW < rules.knee_valgus.minKneeToAnkleWidthRatio) {
      errorTypes.push('knee_valgus');
    }
  }

  if (segment.end - segment.start < rules.too_fast.minRepMs) errorTypes.push('too_fast');

  return {
    ...base,
    valid: errorTypes.length === 0,
    errorTypes,
    held: false,
    reason: errorTypes.map((e) => ERROR_MESSAGES[e]).join(' · '),
  };
}

export { ERROR_TYPES };
