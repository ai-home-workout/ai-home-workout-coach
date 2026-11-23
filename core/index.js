// core 공개 API. web과 eval은 이 파일에서만 import해요.
export { angleDeg, kneeAngle, torsoLeanDeg, normalizeFrame } from './src/geometry.js';
export { createRepSegmenter } from './src/squat/segmenter.js';
export { judgeRep } from './src/squat/rules.js';
export { createSquatJudge, judgeVideo } from './src/squat/judge.js';
export { createSetTracker } from './src/session.js';
