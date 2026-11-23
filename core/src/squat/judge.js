// 실시간 · 오프라인 판정 연결부. 관절 계산 · 반복 분할 · 규칙 판정을 이어 붙이기만 해요.
import { kneeAngle } from '../geometry.js';
import { createRepSegmenter } from './segmenter.js';
import { judgeRep } from './rules.js';

const BUFFER_MS = 15000; // 반복 하나가 이보다 길면 앞부분은 버려요
const SIDE_SMOOTHING = 0.1; // 왼쪽/오른쪽 선택이 프레임마다 뒤바뀌지 않게 visibility를 평균 내요

/**
 * 실시간용: 프레임을 하나씩 넣으면 반복이 끝났을 때 반복 결과를 돌려줘요.
 * @param {object} config core/config/squat.json
 * @param {{ view?: 'side'|'front', aspect?: number }} [options] aspect: 화면 너비 ÷ 높이
 * @returns {{
 *   push(frame: import('../../../shared/contracts.js').Frame): import('../../../shared/contracts.js').RepResult|null,
 *   reset(): void,
 *   last(): { kneeDeg: number, side: 'left'|'right' } | null
 * }}
 */
export function createSquatJudge(config, { view = 'side', aspect = 1 } = {}) {
  const segmenter = createRepSegmenter(config);
  let buffer = [];
  let visLeft = 0;
  let visRight = 0;
  let lastInfo = null;

  return {
    push(frame) {
      buffer.push(frame);
      while (buffer.length && frame.t - buffer[0].t > BUFFER_MS) buffer.shift();

      const left = kneeAngle(frame.landmarks, 'left', aspect);
      const right = kneeAngle(frame.landmarks, 'right', aspect);
      visLeft += SIDE_SMOOTHING * (left.visibility - visLeft);
      visRight += SIDE_SMOOTHING * (right.visibility - visRight);
      const side = visLeft >= visRight ? 'left' : 'right';
      // 측면은 카메라에 가까운 쪽, 정면은 두 무릎 평균
      const kneeDeg =
        view === 'front'
          ? (left.angle + right.angle) / 2
          : side === 'left'
            ? left.angle
            : right.angle;
      lastInfo = { kneeDeg, side };

      const seg = segmenter.push(frame.t, kneeDeg);
      if (!seg) return null;
      const repFrames = buffer.filter((f) => f.t >= seg.start && f.t <= seg.end);
      return judgeRep(repFrames, seg, config, view, { aspect });
    },
    reset() {
      segmenter.reset();
      buffer = [];
      visLeft = 0;
      visRight = 0;
      lastInfo = null;
    },
    /** 화면에 보여 줄 현재 무릎 각도 (디버그 · 임계값 조정용) */
    last() {
      return lastInfo;
    },
  };
}

/**
 * 오프라인용: 영상 하나의 좌표 JSON을 넣으면 반복 결과 배열을 돌려줘요.
 * @param {import('../../../shared/contracts.js').VideoCoords} video
 * @param {object} config
 * @returns {import('../../../shared/contracts.js').RepResult[]}
 */
export function judgeVideo(video, config) {
  const judge = createSquatJudge(config, {
    view: video.view ?? 'side',
    aspect: video.aspect ?? 1,
  });
  const results = [];
  for (const frame of video.frames) {
    const r = judge.push(frame);
    if (r) results.push(r);
  }
  return results;
}
