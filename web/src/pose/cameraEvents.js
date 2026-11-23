// 실제 카메라 이벤트 소스. fakeEvents.js와 같은 모양({ start(onEvent) → stop })이에요.
//
// 1) 웹캠 + MediaPipe로 프레임마다 { t, landmarks } (shared/README.md ①)를 만들어요(poseStream.js).
// 2) 프레임을 core의 판정기에 넣고, 반복 결과를 세트 관리에 넣어 나온 UI 이벤트를 onEvent로 넘겨요.
//     FPS와 입력→판정 지연(ms)을 onStats로 알려 줘요(목표 15 FPS 이상, 200ms 이내).
import { createJudgePipeline } from './pipeline.js';
import { startPoseStream } from './poseStream.js';

const NO_PERSON_HOLD_MS = 2000; // 사람이 이만큼 안 보이면 안내
const NO_PERSON_REPEAT_MS = 8000; // 같은 안내를 너무 자주 띄우지 않게

/**
 * @param {{
 *   video: HTMLVideoElement, canvas?: HTMLCanvasElement|null,
 *   view: 'side'|'front', repsPerSet: number, sets: number,
 *   modelUrl?: string,
 *   onStats?: (s: { fps: number, latencyMs: number, kneeDeg: number|null }) => void,
 *   onError?: (message: string) => void,
 *   onReady?: () => void,
 * }} options
 * @returns {{ start(onEvent: (e: object) => void): () => void }}
 */
export function createCameraEventSource({
  video,
  canvas,
  view,
  repsPerSet,
  sets,
  modelUrl,
  onStats = () => {},
  onError = () => {},
  onReady = () => {},
}) {
  return {
    start(onEvent) {
      let pipeline = null;
      let lastPersonAt = performance.now();
      let lastNoPersonHint = 0;

      return startPoseStream({
        video,
        canvas,
        modelUrl,
        onError,
        onReady: ({ aspect }) => {
          pipeline = createJudgePipeline({ view, aspect, repsPerSet, sets });
          lastPersonAt = performance.now();
          onReady();
        },
        onFrame: (frame, now) => {
          if (frame) {
            lastPersonAt = now;
            for (const e of pipeline.push(frame)) onEvent(e);
          } else if (
            now - lastPersonAt > NO_PERSON_HOLD_MS &&
            now - lastNoPersonHint > NO_PERSON_REPEAT_MS
          ) {
            lastNoPersonHint = now;
            onEvent({
              type: 'hold',
              reason: '사람이 보이지 않아요. 머리부터 발끝까지 화면에 들어오게 서 주세요',
            });
          }
        },
        onStats: (s) => onStats({ ...s, kneeDeg: pipeline?.kneeDeg() ?? null }),
      });
    },
  };
}
