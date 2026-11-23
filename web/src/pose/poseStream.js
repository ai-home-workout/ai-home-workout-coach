// 웹캠 → MediaPipe Pose Landmarker → 좌표 프레임(shared/README.md ①).
// 운동 화면(cameraEvents.js)과 데이터 녹화 화면(RecordScreen.jsx)이 같이 써요.
// 영상은 브라우저 밖으로 나가지 않고 저장하지도 않아요. 프레임마다 관절 좌표만 넘겨요.
import { PoseLandmarker } from '@mediapipe/tasks-vision';
import wasmLoaderPath from '@mediapipe/tasks-vision/vision_wasm_internal.js?url';
import wasmBinaryPath from '@mediapipe/tasks-vision/vision_wasm_internal.wasm?url';
import { drawPose } from './draw.js';

// 모델 파일은 처음 한 번 Google 서버에서 받아요(인터넷 필요). 오프라인 시연이 필요하면
// web/public/models/에 파일을 두고 ?model=/models/pose_landmarker_full.task 로 실행해요.
export const DEFAULT_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task';

async function createLandmarker(modelUrl) {
  const options = (delegate) => ({
    baseOptions: { modelAssetPath: modelUrl, delegate },
    runningMode: 'VIDEO',
    numPoses: 1,
  });
  const fileset = { wasmLoaderPath, wasmBinaryPath };
  try {
    return await PoseLandmarker.createFromOptions(fileset, options('GPU'));
  } catch {
    return await PoseLandmarker.createFromOptions(fileset, options('CPU')); // GPU가 안 되는 기기
  }
}

async function openCamera(video) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('이 브라우저에서는 카메라를 쓸 수 없어요. 최신 Chrome에서 열어 주세요');
  }
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: false,
    });
  } catch (err) {
    if (err?.name === 'NotAllowedError') {
      throw new Error('카메라 권한이 필요해요. 주소창의 카메라 아이콘에서 허용해 주세요');
    }
    if (err?.name === 'NotFoundError') throw new Error('연결된 카메라를 찾지 못했어요');
    throw new Error(`카메라를 열지 못했어요 (${err?.name ?? err})`);
  }
  video.srcObject = stream;
  await video.play();
  return stream;
}

/**
 * 웹캠 포즈 스트림을 시작해요.
 * - onReady({ aspect }): 카메라와 모델이 준비됨. aspect는 화면 너비 ÷ 높이
 * - onFrame(frame, now): 새 카메라 프레임마다. 사람이 안 잡히면 frame은 null.
 *   frame.t는 스트림 시작 기준 밀리초
 * - onStats({ fps, latencyMs }): 0.25초마다. latencyMs는 프레임 처리 시작 → onFrame 끝까지
 * @param {{
 *   video: HTMLVideoElement, canvas?: HTMLCanvasElement|null, modelUrl?: string,
 *   onFrame: (frame: object|null, now: number) => void,
 *   onReady?: (info: { aspect: number }) => void,
 *   onError?: (message: string) => void,
 *   onStats?: (s: { fps: number, latencyMs: number }) => void,
 * }} options
 * @returns {() => void} 멈추는 함수
 */
export function startPoseStream({
  video,
  canvas,
  modelUrl = DEFAULT_MODEL_URL,
  onFrame,
  onReady = () => {},
  onError = () => {},
  onStats = () => {},
}) {
  let stopped = false;
  let stream = null;
  let landmarker = null;
  let rafId = 0;

  (async () => {
    try {
      stream = await openCamera(video);
      if (stopped) return;
      landmarker = await createLandmarker(modelUrl ?? DEFAULT_MODEL_URL);
      if (stopped) return;
    } catch (err) {
      if (!stopped) onError(err.message);
      return;
    }
    const aspect = video.videoWidth / video.videoHeight || 16 / 9;
    onReady({ aspect });

    const ctx = canvas?.getContext('2d') ?? null;
    const t0 = performance.now();
    let lastVideoTime = -1;
    let lastTick = 0;
    let fps = 0;
    let latencyMs = 0;
    let lastStatsAt = 0;

    const loop = () => {
      if (stopped) return;
      rafId = requestAnimationFrame(loop);
      if (video.currentTime === lastVideoTime) return; // 새 카메라 프레임만 처리
      lastVideoTime = video.currentTime;

      const now = performance.now();
      const result = landmarker.detectForVideo(video, now);
      const lms = result.landmarks?.[0];
      const frame = lms
        ? {
            t: Math.round((now - t0) * 10) / 10,
            landmarks: lms.map((p) => ({
              x: p.x,
              y: p.y,
              z: p.z,
              visibility: p.visibility ?? 0,
            })),
          }
        : null;

      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (lms) drawPose(ctx, lms);
      }
      onFrame(frame, now);

      const done = performance.now();
      latencyMs = latencyMs ? latencyMs * 0.9 + (done - now) * 0.1 : done - now;
      if (lastTick) {
        const inst = 1000 / (now - lastTick);
        fps = fps ? fps * 0.9 + inst * 0.1 : inst;
      }
      lastTick = now;
      if (now - lastStatsAt > 250) {
        lastStatsAt = now;
        onStats({ fps, latencyMs });
      }
    };
    loop();
  })();

  return () => {
    stopped = true;
    cancelAnimationFrame(rafId);
    stream?.getTracks().forEach((t) => t.stop());
    landmarker?.close();
    if (video) video.srcObject = null;
  };
}
