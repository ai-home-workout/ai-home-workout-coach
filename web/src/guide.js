// 수준별 운동량 가이드 (운동 경험자 검토 후 확정). 의료적 처방이 아니에요.
export const LEVELS = {
  beginner: { label: '초급', sets: 3, reps: 10 },
  experienced: { label: '경력', sets: 4, reps: 15 },
};

export const LIMITS = { sets: { min: 1, max: 10 }, reps: { min: 1, max: 30 } };

export const EXERCISES = [
  { id: 'squat', label: '스쿼트', ready: true },
  { id: 'pushup', label: '푸쉬업', ready: false },
  { id: 'lunge', label: '런지', ready: false },
];

export const clamp = (v, { min, max }) =>
  Math.min(max, Math.max(min, Math.round(Number(v) || min)));
