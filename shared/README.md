# 공용 계약: 데이터 형식 4종

네 명이 각자 만든 코드가 이 형식으로 맞물려요. **바꾸려면 먼저 팀 합의**가 필요해요(`TeamRules.md` 6절).
JS에서 쓰는 상수와 검사 함수는 `shared/contracts.js`에 있어요.

```
[웹캠] ──MediaPipe──▶ ① 좌표 프레임 ──core──▶ ② 반복 결과 ──core──▶ ③ UI 이벤트 ──▶ [web 화면]
[영상] ──extract────▶ ① 좌표 JSON   ──core──▶ ② 반복 결과 ──eval◀── ④ 라벨 CSV
```

## ① 좌표 프레임 / 좌표 JSON

웹(MediaPipe JS)과 Python 추출 스크립트가 **같은 형식**으로 내보내요.

```json
{ "t": 1234.5, "landmarks": [{ "x": 0.51, "y": 0.42, "z": -0.1, "visibility": 0.98 }] }
```

- `t`: 밀리초 타임스탬프(영상 시작 기준)
- `landmarks`: MediaPipe 순서 그대로 **33개**. `x`, `y`는 화면 기준 0~1 정규화 좌표(왼쪽 위가 0), `y`는 아래로 갈수록 커요.
- 정규화(골반 원점, 몸통 길이 1)는 `core`가 해요. 파일에는 MediaPipe 원래 값을 그대로 둬요.

영상 하나는 JSON 파일 하나예요.

```json
{ "video": "P01_side_good_01", "fps": 30, "view": "side", "aspect": 1.7778, "frames": [ ... ] }
```

- `view`: `"side"`(측면) 또는 `"front"`(정면). 카메라 방향에 따라 확인할 수 있는 오류가 달라요.
- `video`: 녹화 이름(웹 앱 녹화) 또는 영상 파일 이름(Python 추출). 라벨 CSV의 `video`와 같아야 이어져요.
- `aspect`(선택): 화면 너비 ÷ 높이(16:9면 1.7778). MediaPipe의 x, y는 너비·높이로 각각 나눈 값이라, 각도를 바르게 재려면 이 값이 필요해요. 없으면 1로 봐요.
- 그 밖의 선택 필드: `source`(`webcam-record` 등), `script`(녹화 안내 문구), `recordedOn`(날짜). 판정에는 쓰지 않아요.
- 파일 이름 규칙: `<참여자ID>_<view>_<내용>_<번호>.json` (예: `P01_side_good_01.json`)

## ② 반복 결과 (판정 로직 → 평가 · 세트 관리)

```json
{
  "start": 1200,
  "end": 3400,
  "valid": false,
  "errorTypes": ["shallow_depth"],
  "held": false,
  "reason": "무릎이 충분히 굽혀지지 않았어요"
}
```

- `start`, `end`: 반복 시작·끝 시각(밀리초, 프레임의 `t` 기준)
- `valid`: 정상이면 `true`. **`held`가 `true`면 `valid`는 항상 `false`**예요(정상으로 치지 않음).
- `errorTypes`: 아래 오류 유형 ID 배열. 정상이면 빈 배열.
- `held`: 판정 보류(관절이 가려짐, 화면 밖, 현재 방향으로 확인 불가)
- `reason`: 사용자에게 보여 줄 수 있는 한국어 설명. 정상이면 빈 문자열.

### 오류 유형 ID

| ID               | 이름           | 확인 가능한 방향 |
| ---------------- | -------------- | ---------------- |
| `knee_valgus`    | 무릎 모임      | 정면             |
| `shallow_depth`  | 깊이 부족      | 측면             |
| `excessive_lean` | 상체 과도 숙임 | 측면             |
| `too_fast`       | 날림 동작      | 모두             |

## ③ UI 이벤트 (판정 로직 → 화면)

```json
{ "type": "rep", "count": 7, "valid": true, "errorTypes": [], "held": false }
```

| `type`    | 언제                       | 추가 필드                                                   |
| --------- | -------------------------- | ----------------------------------------------------------- |
| `rep`     | 반복 하나가 끝남           | `count`(정상 누적), `valid`, `errorTypes`, `held`, `reason` |
| `hold`    | 판정 보류 안내가 필요함    | `reason`                                                    |
| `rest`    | 오류가 연속돼 휴식 권유    | `reason`                                                    |
| `setDone` | 세트의 정상 횟수를 다 채움 | `set`(끝난 세트 번호, 1부터), `totalSets`                   |

- 화면은 **이 이벤트만** 받아서 그려요. `web/src/fakeEvents.js`의 가짜 스트림으로 판정 로직 없이 화면을 만들 수 있어요.

## ④ 라벨 CSV

```
video,rep_index,start_sec,end_sec,valid,error_type,labeler
P01_side_good_01,1,1.20,3.40,1,,soyoung0108
P01_side_shallow_01,2,4.10,6.00,0,shallow_depth,soyoung0108
P01_side_occluded_01,3,8.00,9.90,0,,soyoung0108
```

- `rep_index`: 1부터. `valid`: `1` 또는 `0`
- `error_type`: 오류 유형 ID. 여러 개면 `|`로 이어요(`shallow_depth|excessive_lean`). 정상이면 비워요.
- `labeler`: 라벨러 GitHub 아이디. 파일도 라벨러별로 따로 써요(`labels/<아이디>.csv`).
- `valid=0`이고 `error_type`이 비어 있으면 **판단 불가**(가려짐 · 화면 밖)예요. 평가에서 P/R/F1과 따로 세요.
- 기준은 `docs/data-collection-guide.md`를 따라요.
