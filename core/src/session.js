// 세트 관리. 반복 결과를 받아 UI 이벤트(shared/README.md ③)를 만들어요.

const REST_MESSAGE = '오류가 계속돼요. 잠깐 쉬고 자세를 다시 확인해 봐요';

/**
 * - 정상 반복(valid)만 count에 더해요. 매 반복마다 'rep' 이벤트를 내요.
 * - held 반복은 'rep'(held: true) 다음에 'hold' 이벤트도 내요. 연속 오류 횟수를 늘리지도, 끊지도 않아요.
 * - 오류 반복이 consecutiveErrorsForRest번 연속되면 'rest' 이벤트를 내고 연속 횟수를 0으로 돌려요.
 * - 세트의 정상 횟수가 repsPerSet에 닿으면 'setDone'을 내고 다음 세트로 넘어가요(count는 0부터 다시).
 * @param {{ repsPerSet: number, sets: number, consecutiveErrorsForRest: number }} options
 * @returns {{ onRep(result: import('../../shared/contracts.js').RepResult): import('../../shared/contracts.js').UiEvent[], state(): { set: number, count: number, done: boolean } }}
 */
export function createSetTracker({ repsPerSet, sets, consecutiveErrorsForRest }) {
  let set = 1;
  let count = 0;
  let errorsInRow = 0;
  let done = false;

  return {
    onRep(result) {
      if (done) return [];
      const events = [];
      if (result.valid) {
        count += 1;
        errorsInRow = 0;
      }
      events.push({
        type: 'rep',
        count,
        valid: result.valid,
        errorTypes: [...result.errorTypes],
        held: result.held,
        reason: result.reason,
      });

      if (result.held) {
        events.push({ type: 'hold', reason: result.reason });
      } else if (!result.valid) {
        errorsInRow += 1;
        if (errorsInRow >= consecutiveErrorsForRest) {
          events.push({ type: 'rest', reason: REST_MESSAGE });
          errorsInRow = 0;
        }
      }

      if (count >= repsPerSet) {
        events.push({ type: 'setDone', set, totalSets: sets });
        if (set >= sets) {
          done = true;
        } else {
          set += 1;
          count = 0;
        }
      }
      return events;
    },
    state() {
      return { set, count, done };
    },
  };
}
