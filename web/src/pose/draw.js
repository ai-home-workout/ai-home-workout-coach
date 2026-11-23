// 관절을 막대 인형으로 그려요. 운동 화면, 좌표 재생, 녹화, 라벨링 화면이 같이 써요.
import { DrawingUtils, PoseLandmarker } from '@mediapipe/tasks-vision';

const drawers = new WeakMap();

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x:number,y:number,z?:number,visibility?:number}[]} landmarks 0~1 정규화 좌표 33개
 * @param {{ minVisibility?: number }} [options] 이보다 visibility가 낮은 관절은 흐리게 그려요
 */
export function drawPose(ctx, landmarks, { minVisibility = 0.5 } = {}) {
  let drawer = drawers.get(ctx);
  if (!drawer) {
    drawer = new DrawingUtils(ctx);
    drawers.set(ctx, drawer);
  }
  drawer.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
    color: '#ffffff',
    lineWidth: 3,
  });
  drawer.drawLandmarks(landmarks, {
    color: (data) => ((data.from?.visibility ?? 1) < minVisibility ? '#ff9f43' : '#2f6fed'),
    radius: 4,
  });
}
