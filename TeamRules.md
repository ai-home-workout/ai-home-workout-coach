# 득근득근 팀 규칙: Git · PR

`main`은 항상 `npm test`가 통과하고 `web`이 빌드되는 상태를 유지해요. 각자 **자기 이름 브랜치**에서 작업하고, 할 일 하나가 끝나면 PR로 `main`에 합쳐요. `main`에는 직접 푸시하지 않아요.

## 0. 처음 한 번

```bash
git clone https://github.com/ai-home-workout/ai-home-workout-coach.git
cd ai-home-workout-coach
npm install                  # 루트: 테스트 · 포맷 도구
cd web && npm install && cd ..
git switch -c soyoung0108    # 자기 브랜치 이름 (아래 표)
git push -u origin soyoung0108
```

| 이름   | 브랜치         |
| ------ | -------------- |
| 강소영 | `soyoung0108`  |
| 손연우 | `syw77`        |
| 김진성 | `jinsung2323`  |
| 최지민 | `qorhvkqorhvk` |

- 자기 브랜치에서만 커밋하고 푸시해요. 남의 브랜치에는 푸시하지 않아요.
- 공용 계약 변경처럼 따로 떼어 올려야 하는 작업만 `<아이디>/<작업>` 임시 브랜치(예: `syw77/contract-held-reason`)를 써요.

## 1. AI 도구로 작업하기

- 저장소를 연 뒤 AI에게 아무 말이나 걸면 로그인 화면이 떠요(`AGENTS.md`). 이름을 고르면 내 역할의 다음 할 일을 알려 줘요.
- Claude Code는 `CLAUDE.md`, 그 밖의 도구(Codex, Antigravity, Cursor 등)는 `AGENTS.md`를 읽어요. 도구가 자동으로 안 읽으면 "AGENTS.md 읽고 시작해"라고 말해요.
- AI가 만든 코드도 내가 설명할 수 있어야 해요. 멘토링과 최종 발표에서 질문을 받아요.

## 2. 매일 하는 일

**작업 시작 전: main 따라가기**

```bash
git switch syw77
git pull
git fetch origin
git merge origin/main        # 다른 사람이 끝낸 할 일 받기
```

- 하루 한 번 이상 `main`을 합쳐요.
- 개인 브랜치에는 `rebase`를 쓰지 않아요. 다시 올리려면 force push가 필요해서예요.

**작업 후: 내 브랜치에 푸시**

```bash
npm test
npm run format
git add .
git commit -m "[feat] 무릎 각도 계산 함수 구현"
git push
```

## 3. 커밋 메시지

`[타입] 요약` 형식으로 써요. 요약은 한국어로 짧게 써요.

| 타입         | 언제                       | 예                                    |
| ------------ | -------------------------- | ------------------------------------- |
| `[feat]`     | 새 기능                    | `[feat] 깊이 부족 규칙 추가`          |
| `[fix]`      | 버그 수정                  | `[fix] 반복이 두 번 세지는 문제 수정` |
| `[refactor]` | 동작은 같고 구조만 바꿈    | `[refactor] 각도 계산 분리`           |
| `[test]`     | 테스트, 픽스처             | `[test] 정면 무릎 모임 픽스처 추가`   |
| `[data]`     | 좌표 JSON, 라벨 CSV        | `[data] P01 측면 좌표 추가`           |
| `[docs]`     | 문서                       | `[docs] 라벨 기준 문서 수정`          |
| `[chore]`    | 설정, 패키지, 포맷 등 잡일 | `[chore] prettier 설정`               |

- 커밋 하나에는 변경 하나만 담아요.

## 4. PR: 내 브랜치 → main

**언제:** `docs/tasks.md`의 할 일 하나가 끝날 때마다 올려요. 너무 오래 쌓아 두지 않아요.

**올리기 전**

- `origin/main`을 먼저 합쳐서 충돌을 내 브랜치에서 풀어요.
- `npm test`가 통과하는지 확인해요. 웹을 고쳤으면 `cd web && npm run build`도요.
- `npm run format`으로 포맷을 맞춰요.

**작성**

- 제목은 커밋 메시지 형식을 따라요. 본문에는 할 일 번호(예: `B8`), 무엇을 바꿨는지, 어떻게 확인했는지를 적어요.

**리뷰와 머지**

- 자기 역할 폴더만 고쳤다면 본인이 머지해도 돼요.
- 남의 역할 폴더나 `shared/`를 건드렸다면 그 담당자의 승인을 받고 머지해요.
- 머지는 **Create a merge commit**으로 해요. Squash는 쓰지 않아요.
- 머지한 뒤에도 개인 브랜치는 **지우지 않아요.**
- 머지했으면 단톡방에 알려요.

## 5. 충돌

- 남의 파일에서 충돌이 나면 혼자 고치지 말고 그 파일 담당자와 같이 풀어요.
- `docs/tasks.md`는 여러 명이 체크하는 파일이라 충돌이 날 수 있어요. 자기 줄만 고쳤다면 양쪽 체크를 모두 살려서 풀면 돼요.

## 6. 공용 계약 변경

`shared/contracts.js`, `shared/README.md`는 네 명의 코드가 모두 기대는 파일이에요.

1. 단톡방에서 무엇을 왜 바꾸는지 말하고 모두 합의해요.
2. `main`에서 임시 브랜치(`<아이디>/contract-...`)를 만들어 그 파일만 고친 작은 PR을 올려요.
3. 모두 승인하면 머지하고 임시 브랜치는 지워요.
4. 머지했다고 단톡방에 알려요.

## 7. 금지

- `main`에 직접 푸시
- 남의 개인 브랜치에 푸시
- `git push --force`, 개인 브랜치 rebase
- 공용 계약을 혼자 바꾸기
- **영상 커밋** (얼굴이 나오는 개인정보예요. 데이터는 좌표로만 녹화해요), `node_modules/`, `dist/`, `.env`, 모델 파일(`*.task`) 커밋. `git add -f`는 쓰지 않아요.
