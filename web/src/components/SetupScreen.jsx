// 운동 설정 화면: 종목, 카메라 방향, 수준별 추천, 세트·횟수
import { useState } from 'react';
import { appConfig } from '../appConfig.js';
import { EXERCISES, LEVELS, LIMITS, clamp } from '../guide.js';

export default function SetupScreen({ onStart }) {
  const [exercise, setExercise] = useState('squat');
  const [view, setView] = useState('side');
  const [level, setLevel] = useState('beginner');
  const [sets, setSets] = useState(LEVELS.beginner.sets);
  const [reps, setReps] = useState(LEVELS.beginner.reps);
  const [source, setSource] = useState(appConfig.eventSource);

  const chooseLevel = (id) => {
    setLevel(id);
    setSets(LEVELS[id].sets);
    setReps(LEVELS[id].reps);
  };

  return (
    <section className="card">
      <h2>운동 설정</h2>

      <fieldset>
        <legend>종목</legend>
        {EXERCISES.map((ex) => (
          <label key={ex.id} className={ex.ready ? '' : 'disabled'}>
            <input
              type="radio"
              name="exercise"
              value={ex.id}
              checked={exercise === ex.id}
              disabled={!ex.ready}
              onChange={() => setExercise(ex.id)}
            />
            {ex.label}
            {!ex.ready && ' (준비 중)'}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>카메라 방향</legend>
        <label>
          <input
            type="radio"
            name="view"
            checked={view === 'side'}
            onChange={() => setView('side')}
          />
          측면 (깊이 · 상체 숙임 확인)
        </label>
        <label className="disabled">
          <input
            type="radio"
            name="view"
            checked={view === 'front'}
            disabled
            onChange={() => setView('front')}
          />
          정면 (무릎 모임 확인 · 준비 중)
        </label>
        <p className="note">
          카메라를 몸 옆 2~3m, 골반 높이에 두고 머리부터 발끝까지 보이게 서 주세요.
        </p>
      </fieldset>

      <fieldset>
        <legend>입력</legend>
        <label>
          <input
            type="radio"
            name="source"
            checked={source === 'camera'}
            onChange={() => setSource('camera')}
          />
          웹캠
        </label>
        <label>
          <input
            type="radio"
            name="source"
            checked={source === 'replay'}
            onChange={() => setSource('replay')}
          />
          좌표 재생 (합성 스쿼트 좌표를 판정 로직에 넣어요 · 시연 예비용)
        </label>
        <label>
          <input
            type="radio"
            name="source"
            checked={source === 'fake'}
            onChange={() => setSource('fake')}
          />
          가짜 이벤트 (판정 로직 없이 화면만 확인)
        </label>
      </fieldset>

      <fieldset>
        <legend>수준</legend>
        {Object.entries(LEVELS).map(([id, lv]) => (
          <label key={id}>
            <input
              type="radio"
              name="level"
              checked={level === id}
              onChange={() => chooseLevel(id)}
            />
            {lv.label} (추천 {lv.sets}세트 × {lv.reps}회)
          </label>
        ))}
      </fieldset>

      <div className="row">
        <label>
          세트 수
          <input
            type="number"
            min={LIMITS.sets.min}
            max={LIMITS.sets.max}
            value={sets}
            onChange={(e) => setSets(e.target.value)}
            onBlur={() => setSets(clamp(sets, LIMITS.sets))}
          />
        </label>
        <label>
          세트당 횟수
          <input
            type="number"
            min={LIMITS.reps.min}
            max={LIMITS.reps.max}
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            onBlur={() => setReps(clamp(reps, LIMITS.reps))}
          />
        </label>
      </div>

      <p className="note">추천 운동량은 일반적인 가이드예요. 의료적 처방이 아니에요.</p>

      <button
        className="primary"
        onClick={() =>
          onStart({
            exercise,
            view,
            source,
            sets: clamp(sets, LIMITS.sets),
            reps: clamp(reps, LIMITS.reps),
          })
        }
      >
        운동 시작
      </button>
    </section>
  );
}
