// 운동 화면: UI 이벤트(shared/README.md ③)만 받아서 그려요.
import { useEffect, useRef, useState } from 'react';
import { errorLabels } from '../../../shared/contracts.js';
import { appConfig } from '../appConfig.js';
import { createFakeEventSource } from '../fakeEvents.js';
import { createCameraEventSource } from '../pose/cameraEvents.js';
import { createReplayEventSource } from '../pose/replayEvents.js';

export default function WorkoutScreen({ plan, onExit }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [source, setSource] = useState(plan.source ?? appConfig.eventSource);
  const [status, setStatus] = useState(source === 'camera' ? 'loading' : 'ready'); // loading | ready | error
  const [errorText, setErrorText] = useState(null);
  const [stats, setStats] = useState(null); // { fps, latencyMs, kneeDeg, person }
  const [set, setSet] = useState(1);
  const [count, setCount] = useState(0);
  const [totals, setTotals] = useState({ valid: 0, error: 0, held: 0 });
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [message, setMessage] = useState(null); // { kind: 'good'|'error'|'hold', text }
  const [rest, setRest] = useState(null);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const options = { repsPerSet: plan.reps, sets: plan.sets, view: plan.view };
    const eventSource =
      source === 'camera'
        ? createCameraEventSource({
            ...options,
            video: videoRef.current,
            canvas: canvasRef.current,
            modelUrl: appConfig.modelUrl,
            onReady: () => setStatus('ready'),
            onError: (text) => {
              setErrorText(text);
              setStatus('error');
            },
            onStats: setStats,
          })
        : source === 'replay'
          ? createReplayEventSource({ ...options, canvas: canvasRef.current, onStats: setStats })
          : createFakeEventSource(options);

    let comboNow = 0;
    const onEvent = (e) => {
      if (e.type === 'rep') {
        setCount(e.count);
        if (e.held) {
          setTotals((s) => ({ ...s, held: s.held + 1 }));
          return; // 보류는 콤보를 끊지 않아요 (안내는 뒤따르는 hold 이벤트로)
        }
        if (e.valid) {
          comboNow += 1;
          setTotals((s) => ({ ...s, valid: s.valid + 1 }));
          setMessage({ kind: 'good', text: '좋아요! 정확한 자세예요' });
        } else {
          comboNow = 0;
          setTotals((s) => ({ ...s, error: s.error + 1 }));
          setMessage({ kind: 'error', text: `${errorLabels(e.errorTypes)} · ${e.reason}` });
        }
        setCombo(comboNow);
        setBestCombo((b) => Math.max(b, comboNow));
      } else if (e.type === 'hold') {
        setMessage({ kind: 'hold', text: `판정 보류 · ${e.reason}` });
      } else if (e.type === 'rest') {
        setRest(e.reason);
      } else if (e.type === 'setDone') {
        if (e.set >= e.totalSets) setFinished(true);
        else setSet(e.set + 1);
        setCount(0);
      }
    };

    return eventSource.start(onEvent);
  }, [plan, source]);

  if (finished) {
    return (
      <section className="card">
        <h2>운동 완료!</h2>
        <p>
          정상 {totals.valid}회 · 오류 {totals.error}회 · 판정 보류 {totals.held}회
        </p>
        {appConfig.gameEnabled && <p>최고 콤보 {bestCombo}</p>}
        <button className="primary" onClick={onExit}>
          처음으로
        </button>
      </section>
    );
  }

  return (
    <section className="workout">
      <div className="camera">
        <video ref={videoRef} playsInline muted />
        <canvas ref={canvasRef} />
        {source === 'fake' && <span className="badge">가짜 이벤트 모드</span>}
        {source === 'replay' && <span className="badge">좌표 재생 모드 (합성 데이터)</span>}
        {source === 'camera' && status === 'loading' && (
          <div className="camera-status">카메라와 자세 인식 모델을 준비하고 있어요…</div>
        )}
        {source === 'camera' && status === 'error' && (
          <div className="camera-status">
            <p>{errorText}</p>
            <button onClick={() => setSource('replay')}>좌표 재생으로 시연하기</button>
          </div>
        )}
        {source !== 'fake' && appConfig.debug && stats && (
          <span className="debug">
            {stats.fps.toFixed(0)} FPS
            {source === 'camera' && ` · 지연 ${stats.latencyMs.toFixed(0)}ms`}
            {stats.kneeDeg !== null && ` · 무릎 ${stats.kneeDeg.toFixed(0)}°`}
          </span>
        )}
      </div>

      <div className="hud">
        <p className="set">
          {set} / {plan.sets} 세트
        </p>
        <p className="count">
          {count}
          <small> / {plan.reps}</small>
        </p>
        <p className="note">정확한 자세로 한 반복만 세요</p>
        {appConfig.gameEnabled && combo > 1 && <p className="combo">{combo} 콤보!</p>}
        {appConfig.feedbackEnabled && message && (
          <p className={`message ${message.kind}`}>{message.text}</p>
        )}
        <button onClick={onExit}>그만하기</button>
      </div>

      {rest && (
        <div className="overlay" role="dialog">
          <div className="card">
            <h2>잠깐 쉬어요</h2>
            <p>{rest}</p>
            <button className="primary" onClick={() => setRest(null)}>
              다시 시작
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
