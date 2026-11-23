// 좌표 재생 이벤트 소스: 좌표 JSON을 실제 시간대로 판정 로직에 넣어요.
// 카메라 없이 판정 로직 연결을 확인하거나, 시연 때 웹캠이 안 될 때 예비로 써요.
// 기본은 합성 픽스처(fixtures/side_mixed.json)를 반복 재생해요.
import sample from '../../../fixtures/side_mixed.json';
import { drawPose } from './draw.js';
import { createJudgePipeline } from './pipeline.js';

/**
 * @param {{
 *   canvas?: HTMLCanvasElement|null, repsPerSet: number, sets: number,
 *   video?: { view: 'side'|'front', aspect?: number, frames: object[] },
 *   onStats?: (s: object) => void, onReady?: () => void,
 * }} options
 * @returns {{ start(onEvent: (e: object) => void): () => void }}
 */
export function createReplayEventSource({
  canvas,
  repsPerSet,
  sets,
  video = sample,
  onStats = () => {},
  onReady = () => {},
}) {
  return {
    start(onEvent) {
      const aspect = video.aspect ?? 1;
      const pipeline = createJudgePipeline({ view: video.view, aspect, repsPerSet, sets });
      const ctx = canvas?.getContext('2d') ?? null;
      if (canvas) {
        canvas.height = 720;
        canvas.width = Math.round(720 * aspect);
      }
      const duration = video.frames.at(-1).t + 1000; // 한 바퀴 끝나면 1초 쉬고 다시
      const t0 = performance.now();
      let index = 0;
      let loopOffset = 0;
      let rafId = 0;
      let lastStatsAt = 0;
      onReady();

      const loop = () => {
        rafId = requestAnimationFrame(loop);
        const now = performance.now() - t0;
        while (index < video.frames.length && video.frames[index].t + loopOffset <= now) {
          const f = video.frames[index];
          const frame = { t: f.t + loopOffset, landmarks: f.landmarks };
          for (const e of pipeline.push(frame)) onEvent(e);
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawPose(ctx, f.landmarks);
          }
          index += 1;
        }
        if (index >= video.frames.length && now >= loopOffset + duration) {
          index = 0;
          loopOffset += duration;
        }
        if (now - lastStatsAt > 250) {
          lastStatsAt = now;
          onStats({ fps: video.fps, latencyMs: 0, kneeDeg: pipeline.kneeDeg(), person: true });
        }
      };
      loop();
      return () => cancelAnimationFrame(rafId);
    },
  };
}
