// 데이터 녹화 화면: 영상은 저장하지 않고 관절 좌표만 JSON으로 저장해요.
// 사용법은 docs/data-collection-guide.md를 봐요.
import { useCallback, useEffect, useRef, useState } from 'react';
import { checkVideoCoords } from '../../../shared/contracts.js';
import { appConfig } from '../appConfig.js';
import { downloadText } from '../download.js';
import { startPoseStream } from '../pose/poseStream.js';
import { TAKES, isParticipantId, takeId, takeName } from '../record/takes.js';

const COUNTDOWN_SEC = 5;
const MIN_DETECT_RATIO = 0.8; // 사람이 잡힌 프레임 비율이 이보다 낮으면 다시 찍기를 권해요

export default function RecordScreen() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const aspectRef = useRef(16 / 9);
  const rec = useRef({ active: false, t0: 0, frames: [], seen: 0 });

  const [camera, setCamera] = useState('loading'); // loading | ready | error
  const [cameraError, setCameraError] = useState(null);
  const [person, setPerson] = useState(false);
  const [participant, setParticipant] = useState(
    () => localStorage.getItem('record:participant') ?? '',
  );
  const [takeIndex, setTakeIndex] = useState(0);
  const [numbers, setNumbers] = useState({}); // takeId → 다음 번호
  const [saved, setSaved] = useState([]); // 저장한 파일 이름
  const [phase, setPhase] = useState('idle'); // idle | countdown | recording | review
  const [countdown, setCountdown] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [review, setReview] = useState(null); // { doc, detectRatio, problems }

  const take = TAKES[takeIndex];
  const number = numbers[takeId(take)] ?? 1;
  const name = isParticipantId(participant) ? takeName(participant, take, number) : null;

  useEffect(() => {
    return startPoseStream({
      video: videoRef.current,
      canvas: canvasRef.current,
      modelUrl: appConfig.modelUrl,
      onReady: ({ aspect }) => {
        aspectRef.current = aspect;
        setCamera('ready');
      },
      onError: (text) => {
        setCameraError(text);
        setCamera('error');
      },
      onFrame: (frame, now) => {
        setPerson(Boolean(frame));
        const r = rec.current;
        if (!r.active) return;
        r.seen += 1;
        if (frame)
          r.frames.push({ t: Math.round((now - r.t0) * 10) / 10, landmarks: frame.landmarks });
      },
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('record:participant', participant);
  }, [participant]);

  // 카운트다운 → 녹화 시작
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      rec.current = { active: true, t0: performance.now(), frames: [], seen: 0 };
      setElapsed(0);
      setPhase('recording');
      return;
    }
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, countdown]);

  // 녹화 시간 표시
  useEffect(() => {
    if (phase !== 'recording') return;
    const id = setInterval(() => setElapsed((performance.now() - rec.current.t0) / 1000), 200);
    return () => clearInterval(id);
  }, [phase]);

  const start = useCallback(() => {
    if (!name || camera !== 'ready') return;
    setReview(null);
    setCountdown(COUNTDOWN_SEC);
    setPhase('countdown');
  }, [name, camera]);

  const stop = useCallback(() => {
    const r = rec.current;
    r.active = false;
    const durationSec = (performance.now() - r.t0) / 1000;
    const frames = r.frames;
    const doc = {
      video: name,
      fps: Math.round((r.seen / durationSec) * 10) / 10,
      view: take.view,
      aspect: Math.round(aspectRef.current * 10000) / 10000,
      source: 'webcam-record',
      script: `${take.title}: ${take.script}`,
      recordedOn: new Date().toISOString().slice(0, 10),
      frames,
    };
    setReview({
      doc,
      detectRatio: r.seen ? frames.length / r.seen : 0,
      durationSec,
      problems: frames.length ? checkVideoCoords(doc) : ['사람이 한 번도 잡히지 않았어요'],
    });
    setPhase('review');
  }, [name, take]);

  const save = () => {
    downloadText(`${review.doc.video}.json`, JSON.stringify(review.doc));
    setSaved((s) => [...s, review.doc.video]);
    setNumbers((n) => ({ ...n, [takeId(take)]: number + 1 }));
    setReview(null);
    setPhase('idle');
  };

  const discard = () => {
    setReview(null);
    setPhase('idle');
  };

  // 스페이스: 시작 / 끝
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space' || e.target.tagName === 'INPUT') return;
      e.preventDefault();
      if (phase === 'idle') start();
      else if (phase === 'recording') stop();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, start, stop]);

  return (
    <section className="workout">
      <div className="camera">
        <video ref={videoRef} playsInline muted />
        <canvas ref={canvasRef} />
        <span className="badge">영상은 저장하지 않아요 · 관절 좌표만 저장</span>
        {camera === 'loading' && (
          <div className="camera-status">카메라와 자세 인식 모델을 준비하고 있어요…</div>
        )}
        {camera === 'error' && <div className="camera-status">{cameraError}</div>}
        {phase === 'countdown' && <div className="countdown">{countdown}</div>}
        {phase === 'recording' && (
          <span className="rec">
            ● 녹화 중 {elapsed.toFixed(1)}초 {person ? '' : '· 사람이 안 보여요!'}
          </span>
        )}
        {camera === 'ready' && phase === 'idle' && !person && (
          <div className="camera-status">머리부터 발끝까지 화면에 들어오게 서 주세요</div>
        )}
      </div>

      <div className="hud">
        <h2>데이터 녹화</h2>
        <label className="field">
          참여자 ID
          <input
            value={participant}
            placeholder="P01"
            disabled={phase !== 'idle'}
            onChange={(e) => setParticipant(e.target.value.trim().toUpperCase())}
          />
        </label>
        {participant && !isParticipantId(participant) && (
          <p className="message error">P01처럼 P와 숫자 두 자리로 써요 (실명 금지)</p>
        )}

        <label className="field">
          테이크
          <select
            value={takeIndex}
            disabled={phase !== 'idle'}
            onChange={(e) => setTakeIndex(Number(e.target.value))}
          >
            {TAKES.map((t, i) => (
              <option key={takeId(t)} value={i}>
                {t.view === 'side' ? '측면' : '정면'} · {t.title} ({t.reps}회)
              </option>
            ))}
          </select>
        </label>

        <div className="script">
          <strong>
            {take.view === 'side' ? '측면' : '정면'} · {take.title}
          </strong>
          <p>{take.script}</p>
          <p className="note">
            시작 전후 2초씩 가만히 서 있기 · 반복 사이 1~2초 서 있기
            <br />
            파일 이름: {name ? `${name}.json` : '(참여자 ID를 먼저 써요)'}
          </p>
        </div>

        {phase === 'idle' && (
          <button className="primary" disabled={!name || camera !== 'ready'} onClick={start}>
            녹화 시작 ({COUNTDOWN_SEC}초 뒤) · Space
          </button>
        )}
        {phase === 'countdown' && <button onClick={discard}>취소</button>}
        {phase === 'recording' && (
          <button className="primary" onClick={stop}>
            녹화 끝 · Space
          </button>
        )}
        {phase === 'review' && review && (
          <div className="review">
            <p>
              {review.durationSec.toFixed(1)}초 · 좌표 {review.doc.frames.length}프레임 · 약{' '}
              {review.doc.fps} FPS · 사람 인식 {(review.detectRatio * 100).toFixed(0)}%
            </p>
            {review.problems.length > 0 && (
              <p className="message error">형식 문제: {review.problems.slice(0, 3).join(', ')}</p>
            )}
            {review.detectRatio < MIN_DETECT_RATIO && take.kind !== 'occluded' && (
              <p className="message hold">사람이 잘 안 잡혔어요. 다시 찍는 걸 추천해요</p>
            )}
            <button className="primary" disabled={review.problems.length > 0} onClick={save}>
              저장 ({review.doc.video}.json 내려받기)
            </button>
            <button onClick={discard}>버리고 다시 찍기</button>
          </div>
        )}

        {saved.length > 0 && (
          <div className="saved">
            <strong>이번에 저장한 파일 ({saved.length})</strong>
            <ul>
              {saved.map((s) => (
                <li key={s}>{s}.json</li>
              ))}
            </ul>
            <p className="note">다운로드 폴더의 파일을 저장소 data/coords/로 옮겨요.</p>
          </div>
        )}
      </div>
    </section>
  );
}
