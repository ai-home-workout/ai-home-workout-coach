// 좌표 녹화 계획표. docs/data-collection-guide.md의 표와 같아요(바꾸면 둘 다 고쳐요).
// 한 "테이크"가 좌표 JSON 파일 하나예요. 파일 이름: <참여자ID>_<view>_<kind>_<번호>.json

export const TAKES = [
  {
    view: 'side',
    kind: 'good',
    reps: 10,
    title: '정상 스쿼트',
    script: '평소처럼 정확한 자세로 10회',
  },
  {
    view: 'side',
    kind: 'shallow',
    reps: 5,
    title: '깊이 부족',
    script: '허벅지가 바닥과 수평이 되기 전에 올라오기 5회',
  },
  {
    view: 'side',
    kind: 'lean',
    reps: 5,
    title: '상체 과도 숙임',
    script: '깊이 앉되 상체를 45° 넘게 앞으로 숙이기 5회',
  },
  {
    view: 'side',
    kind: 'fast',
    reps: 5,
    title: '날림 동작',
    script: '빠르게, 바닥에서 튕기듯 올라오기 5회 (다치지 않게 깊이는 평소보다 얕아도 돼요)',
  },
  {
    view: 'side',
    kind: 'mixed',
    reps: 10,
    title: '섞어서',
    script:
      '정상 → 얕게 → 정상 → 숙이기 → 빠르게 → 정상 → 얕게 → 정상 → 숙이기 → 정상 (순서대로 10회)',
  },
  {
    view: 'side',
    kind: 'occluded',
    reps: 5,
    title: '가려짐',
    script: '카메라를 조금 낮추거나 다가가서 발·무릎이 화면 밖으로 나가게 하고 정상 5회',
  },
  {
    view: 'front',
    kind: 'good',
    reps: 10,
    title: '정면 정상 (선택)',
    script: '카메라를 바라보고 정상 10회 · 멘토링 후 정면 판정용',
    optional: true,
  },
  {
    view: 'front',
    kind: 'valgus',
    reps: 5,
    title: '정면 무릎 모임 (선택)',
    script: '앉을 때 무릎을 안쪽으로 모으기 5회 · 멘토링 후 정면 판정용',
    optional: true,
  },
];

export const takeId = (take) => `${take.view}_${take.kind}`;

/** P01 + take + 번호 → P01_side_good_01 */
export const takeName = (participant, take, number) =>
  `${participant}_${take.view}_${take.kind}_${String(number).padStart(2, '0')}`;

export const isParticipantId = (s) => /^P\d{2}$/.test(s);
