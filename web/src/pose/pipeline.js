// 좌표 프레임 → 판정 → 세트 관리 → UI 이벤트. 카메라와 좌표 재생이 같이 써요.
import { createSquatJudge, createSetTracker } from '../../../core/index.js';
import squatConfig from '../../../core/config/squat.json';

/**
 * @param {{ view: 'side'|'front', aspect: number, repsPerSet: number, sets: number }} options
 * @returns {{ push(frame: object): object[], kneeDeg(): number|null }}
 */
export function createJudgePipeline({ view, aspect, repsPerSet, sets }) {
  const judge = createSquatJudge(squatConfig, { view, aspect });
  const tracker = createSetTracker({
    repsPerSet,
    sets,
    consecutiveErrorsForRest: squatConfig.safety.consecutiveErrorsForRest,
  });
  return {
    push(frame) {
      const rep = judge.push(frame);
      return rep ? tracker.onRep(rep) : [];
    },
    kneeDeg() {
      return judge.last()?.kneeDeg ?? null;
    },
  };
}
