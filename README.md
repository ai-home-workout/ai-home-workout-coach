# 실시간 홈트레이닝 AI 운동 코치

Real-time AI Home Workout Coach · 2026 AI P-실무프로젝트(캡스톤디자인) SW 2분반 4조 **득근득근**

웹캠 영상에서 관절 좌표를 추출해 **올바른 자세일 때만 1회로 카운트**하고, 틀리면 어느 관절이 왜 틀렸는지 실시간으로 알려 주는 온디바이스 코칭 시스템이에요. 영상은 브라우저 밖으로 나가지 않아요.

## 빠른 시작

필요한 것: Node 22 이상, Chrome, (좌표 추출만) Python 3.11 이상

```bash
npm install
npm test                 # 공용 계약 · 판정 로직 · 평가 테스트
cd web && npm install && npm run dev   # http://localhost:5173
```

웹 앱에는 탭이 세 개 있어요.

| 탭          | 하는 일                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------ |
| 운동        | 세트 · 횟수를 정하고 운동하면 정자세만 세고 교정 피드백을 줘요                                   |
| 데이터 녹화 | 웹캠에서 관절 좌표만 JSON으로 저장해요(영상은 저장하지 않아요). `?tab=record`                    |
| 라벨링      | 좌표 JSON을 막대 인형으로 재생하며 반복 구간 · 정상/오류를 표시하고 CSV로 내보내요. `?tab=label` |

녹화 · 라벨링 방법은 [docs/data-collection-guide.md](docs/data-collection-guide.md)에 있어요.

운동 탭의 입력은 설정 화면에서 골라요.

| 입력        | 설명                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------- |
| 웹캠        | MediaPipe로 관절을 뽑아 판정 로직에 넣어요. 처음 한 번 모델을 내려받아요(인터넷 필요)             |
| 좌표 재생   | 합성 스쿼트 좌표(`fixtures/side_mixed.json`)를 판정 로직에 넣어요. 카메라 없이 확인 · 시연 예비용 |
| 가짜 이벤트 | 판정 로직 없이 무작위 이벤트로 화면만 확인해요                                                    |

URL 옵션: `?feedback=0`(교정 피드백 끄기), `?game=0`(게임 요소 끄기), `?debug=0`(FPS · 각도 표시 끄기), `?source=replay|fake`(입력 기본값)

평가:

```bash
npm run eval -- --coords data/coords --labels labels/<아이디>.csv   # 카운트 MAE, P/R/F1
npm run kappa -- labels/<A>.csv labels/<B>.csv                        # 라벨러 일치도
npm run check:coords -- data/coords                                   # 좌표 JSON 형식 검사
```

좌표 추출(Python, 영상이 있을 때만):

```bash
python -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate
pip install -r extract/requirements.txt
python -m unittest discover extract
python extract/extract_pose.py <영상 또는 폴더> -o data/coords/
```

MediaPipe 모델 파일은 저장소에 넣지 않아요. [Pose Landmarker 모델](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker#models)에서 `pose_landmarker_full.task`를 받아 `models/`에 둬요.

## 폴더 구조

```
shared/     공용 계약: 데이터 형식 4종, 오류 유형, UI 이벤트 (README.md에 형식 설명)
core/       판정 로직 (JS 순수 함수, 브라우저·Node 공용)
  config/   종목별 임계값
eval/       평가 스크립트: 카운트 MAE, Precision/Recall/F1, Cohen's kappa
extract/    영상 → 좌표 JSON (Python MediaPipe)
web/        React PWA (MediaPipe Tasks JS)
fixtures/   테스트용 합성 좌표 JSON과 라벨 CSV (npm run fixtures로 재생성)
data/coords 웹 앱으로 녹화한 좌표 JSON (영상은 저장하지 않아요)
labels/     라벨러별 라벨 CSV
docs/       할 일(tasks.md), 라벨 기준, 멘토링 회의록
progress/   사람별 진행 기록
```

## 팀

| 이름   | GitHub                                          |
| ------ | ----------------------------------------------- |
| 강소영 | [soyoung0108](https://github.com/soyoung0108)   |
| 손연우 | [SYW77](https://github.com/SYW77)               |
| 김진성 | [Jinsung2323](https://github.com/Jinsung2323)   |
| 최지민 | [qorhvkqorhvk](https://github.com/qorhvkqorhvk) |

작업 규칙은 [TeamRules.md](TeamRules.md), AI 도구 지침은 [AGENTS.md](AGENTS.md), 할 일은 [docs/tasks.md](docs/tasks.md)에 있어요.
