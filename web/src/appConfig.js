// 앱 설정. 사용자 평가에서 조건을 바꿀 때는 이 파일 하나(또는 URL 쿼리)만 바꿔요.
//   ?feedback=0  교정 피드백 끄기 (카운트는 그대로)
//   ?game=0      게임 요소 끄기 (두 조건에 똑같이 적용해요)
//   ?source=replay|fake  설정 화면의 입력 기본값 (기본은 camera: 웹캠 + 판정 로직)
//   ?model=<URL>  포즈 모델 파일 위치 (오프라인 시연용)
//   ?debug=0      FPS · 지연 · 무릎 각도 표시 끄기
const params = new URLSearchParams(globalThis.location?.search ?? '');
const flag = (key, fallback) => (params.has(key) ? params.get(key) !== '0' : fallback);

export const appConfig = Object.freeze({
  feedbackEnabled: flag('feedback', true),
  gameEnabled: flag('game', true),
  eventSource: ['replay', 'fake'].includes(params.get('source')) ? params.get('source') : 'camera',
  modelUrl: params.get('model') ?? undefined,
  debug: flag('debug', true),
});
