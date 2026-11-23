// 가짜 UI 이벤트 스트림. 판정 로직 없이 화면을 만들고 시연할 수 있어요.
// 이벤트 형식은 shared/README.md ③과 같아야 해요.
import { checkUiEvent } from '../../shared/contracts.js';

const ERRORS = [
  { errorTypes: ['shallow_depth'], reason: '조금 더 깊이 앉아 주세요' },
  { errorTypes: ['excessive_lean'], reason: '상체를 조금 더 세워 주세요' },
  { errorTypes: ['too_fast'], reason: '천천히, 끝까지 내려갔다 올라와요' },
];

/**
 * @param {{ repsPerSet: number, sets: number, intervalMs?: number }} options
 * @returns {{ start(onEvent: (e: object) => void): () => void }} start는 멈추는 함수를 돌려줘요
 */
export function createFakeEventSource({ repsPerSet, sets, intervalMs = 1800 }) {
  return {
    start(onEvent) {
      let set = 1;
      let count = 0;
      let errorsInRow = 0;
      const emit = (e) => {
        const problems = checkUiEvent(e);
        if (problems.length) console.warn('계약에 맞지 않는 이벤트', e, problems);
        onEvent(e);
      };
      const timer = setInterval(() => {
        const roll = Math.random();
        if (roll < 0.1) {
          const reason = '무릎이 가려졌어요. 몸 전체가 화면에 들어오게 서 주세요';
          emit({ type: 'rep', count, valid: false, errorTypes: [], held: true, reason });
          emit({ type: 'hold', reason });
          return;
        }
        if (roll < 0.35) {
          const err = ERRORS[Math.floor(Math.random() * ERRORS.length)];
          emit({ type: 'rep', count, valid: false, held: false, ...err });
          if (++errorsInRow >= 3) {
            emit({ type: 'rest', reason: '오류가 계속돼요. 잠깐 쉬고 자세를 다시 확인해요' });
            errorsInRow = 0;
          }
          return;
        }
        count += 1;
        errorsInRow = 0;
        emit({ type: 'rep', count, valid: true, errorTypes: [], held: false, reason: '' });
        if (count >= repsPerSet) {
          emit({ type: 'setDone', set, totalSets: sets });
          if (set >= sets) clearInterval(timer);
          set += 1;
          count = 0;
        }
      }, intervalMs);
      return () => clearInterval(timer);
    },
  };
}
