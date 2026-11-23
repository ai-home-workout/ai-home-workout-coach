# 종목별 설정

임계값은 코드에 박지 않고 여기에 둬요. 값은 라벨 데이터로 조정해요(`npm run eval`로 확인).

| 키                                           | 뜻                                                                         |
| -------------------------------------------- | -------------------------------------------------------------------------- |
| `minVisibility`                              | 이 값보다 visibility가 낮은 관절은 "안 보임"으로 봐요                      |
| `segment.startBelowKneeDeg`                  | 무릎 각도가 이 값 아래로 내려가면 반복 시작                                |
| `segment.endAboveKneeDeg`                    | 시작한 뒤 이 값 위로 올라오면 반복 끝 (시작값보다 커야 해요: 히스테리시스) |
| `segment.minSegmentMs`                       | 이보다 짧은 구간은 노이즈로 보고 버려요                                    |
| `rules.shallow_depth.maxBottomKneeDeg`       | 반복 중 가장 작은 무릎 각도가 이 값보다 크면 깊이 부족                     |
| `rules.excessive_lean.maxTorsoLeanDeg`       | 상체가 수직에서 이 각도보다 많이 기울면 과도 숙임                          |
| `rules.knee_valgus.minKneeToAnkleWidthRatio` | (정면) 무릎 간격 ÷ 발목 간격이 이 값보다 작으면 무릎 모임                  |
| `rules.too_fast.minRepMs`                    | 반복 시간이 이보다 짧으면 날림 동작                                        |
| `hold.minVisibleFrameRatio`                  | 반복 구간에서 필요한 관절이 보인 프레임 비율이 이보다 낮으면 판정 보류     |
| `safety.consecutiveErrorsForRest`            | 오류가 이만큼 연속되면 휴식 권유                                           |
