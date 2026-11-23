// 반복 구간 분할. 무릎 각도 시계열을 하나씩 받아 반복 하나가 끝나면 구간을 돌려줘요.

/**
 * @typedef {{ start: number, end: number, bottomT: number, bottomKneeDeg: number }} Segment
 *   start/end: 반복 시작·끝 시각(ms), bottomT: 가장 깊이 앉은 시각, bottomKneeDeg: 그때 무릎 각도
 */

/**
 * 히스테리시스 분할기.
 * - 서 있는 상태에서 무릎 각도가 config.segment.startBelowKneeDeg 아래로 내려가면 반복 시작
 * - 그 뒤 config.segment.endAboveKneeDeg 위로 올라오면 반복 끝 → Segment 반환
 *   (시작 기준과 끝 기준을 다르게 둬서, 경계 근처에서 흔들려도 반복이 쪼개지지 않아요)
 * - 길이가 config.segment.minSegmentMs보다 짧으면 노이즈로 보고 버려요(null)
 * @param {object} config core/config/squat.json
 * @returns {{ push(t: number, kneeDeg: number): Segment|null, reset(): void }}
 */
export function createRepSegmenter(config) {
  const { startBelowKneeDeg, endAboveKneeDeg, minSegmentMs } = config.segment;
  if (endAboveKneeDeg <= startBelowKneeDeg) {
    throw new Error('segment.endAboveKneeDeg는 startBelowKneeDeg보다 커야 해요(히스테리시스)');
  }
  /** @type {Segment|null} */
  let current = null;

  return {
    push(t, kneeDeg) {
      if (!Number.isFinite(kneeDeg)) return null;
      if (!current) {
        if (kneeDeg < startBelowKneeDeg) {
          current = { start: t, end: t, bottomT: t, bottomKneeDeg: kneeDeg };
        }
        return null;
      }
      if (kneeDeg < current.bottomKneeDeg) {
        current.bottomKneeDeg = kneeDeg;
        current.bottomT = t;
      }
      if (kneeDeg > endAboveKneeDeg) {
        const seg = { ...current, end: t };
        current = null;
        return seg.end - seg.start >= minSegmentMs ? seg : null;
      }
      return null;
    },
    reset() {
      current = null;
    },
  };
}
