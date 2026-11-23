// 라벨링 화면: 녹화한 좌표 JSON을 막대 인형으로 재생하면서 반복 구간과 정상/오류를 표시해요.
// 결과는 labels/<GitHub아이디>.csv (shared/README.md ④). 사용법은 docs/data-collection-guide.md.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ERROR_TYPES, LABEL_CSV_COLUMNS, checkVideoCoords } from '../../../shared/contracts.js';
import { parseLabelsCsv } from '../../../eval/src/labels.js';
import { downloadText } from '../download.js';
import { drawPose } from '../pose/draw.js';

const SPEEDS = [0.25, 0.5, 1];
const storageKey = (labeler) => `labels:${labeler}`;

/** frames에서 t 이하인 마지막 프레임 번호 */
function frameIndexAt(frames, t) {
  let lo = 0;
  let hi = frames.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (frames[mid].t <= t) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

function toCsv(rows) {
  const sorted = [...rows].sort((a, b) =>
    a.video === b.video ? a.startSec - b.startSec : a.video.localeCompare(b.video),
  );
  const counter = {};
  const lines = sorted.map((r) => {
    counter[r.video] = (counter[r.video] ?? 0) + 1;
    return [
      r.video,
      counter[r.video],
      r.startSec.toFixed(2),
      r.endSec.toFixed(2),
      r.valid ? 1 : 0,
      r.errorTypes.join('|'),
      r.labeler,
    ].join(',');
  });
  return [LABEL_CSV_COLUMNS.join(','), ...lines].join('\n') + '\n';
}

const emptyDraft = () => ({ start: null, end: null, errors: [], unknown: false });

export default function LabelScreen() {
  const canvasRef = useRef(null);
  const [labeler, setLabeler] = useState(() => localStorage.getItem('label:labeler') ?? '');
  const [videos, setVideos] = useState({}); // name → doc
  const [current, setCurrent] = useState(null);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(0.5);
  const [rows, setRows] = useState([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [notice, setNotice] = useState(null);

  const doc = current ? videos[current] : null;
  const frames = doc?.frames ?? [];
  const duration = frames.length ? frames.at(-1).t : 0;
  const errorOptions = Object.entries(ERROR_TYPES).filter(([, e]) =>
    e.views.includes(doc?.view ?? 'side'),
  );

  // 라벨러별 저장
  useEffect(() => {
    localStorage.setItem('label:labeler', labeler);
    if (!labeler) return setRows([]);
    try {
      setRows(JSON.parse(localStorage.getItem(storageKey(labeler)) ?? '[]'));
    } catch {
      setRows([]);
    }
  }, [labeler]);
  const saveRows = (next) => {
    setRows(next);
    if (labeler) localStorage.setItem(storageKey(labeler), JSON.stringify(next));
  };

  // 그리기
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !doc) return;
    const aspect = doc.aspect ?? 1;
    canvas.height = 540;
    canvas.width = Math.round(540 * aspect);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (frames.length) drawPose(ctx, frames[frameIndexAt(frames, t)].landmarks);
  }, [doc, frames, t]);

  // 재생
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let id = 0;
    const tick = (now) => {
      const dt = (now - last) * speed;
      last = now;
      let stop = false;
      setT((prev) => {
        const next = prev + dt;
        if (next >= duration) {
          stop = true;
          return duration;
        }
        return next;
      });
      if (stop) setPlaying(false);
      else id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [playing, speed, duration]);

  const step = useCallback(
    (n) => {
      if (!frames.length) return;
      const i = Math.min(frames.length - 1, Math.max(0, frameIndexAt(frames, t) + n));
      setPlaying(false);
      setT(frames[i].t);
    },
    [frames, t],
  );

  const addRep = useCallback(() => {
    if (!labeler) return setNotice('라벨러(GitHub 아이디)를 먼저 써요');
    if (draft.start === null || draft.end === null) return setNotice('시작(S)과 끝(E)을 표시해요');
    if (draft.end <= draft.start) return setNotice('끝이 시작보다 뒤여야 해요');
    const valid = !draft.unknown && draft.errors.length === 0;
    saveRows([
      ...rows,
      {
        video: current,
        startSec: draft.start / 1000,
        endSec: draft.end / 1000,
        valid,
        errorTypes: draft.unknown ? [] : draft.errors,
        labeler,
      },
    ]);
    setDraft(emptyDraft());
    setNotice(null);
  }, [labeler, draft, rows, current]);

  // 키보드
  useEffect(() => {
    const onKey = (e) => {
      if (!doc || ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (!playing && t >= duration) setT(0);
        setPlaying((p) => !p);
      } else if (e.code === 'ArrowRight') step(e.shiftKey ? 15 : 1);
      else if (e.code === 'ArrowLeft') step(e.shiftKey ? -15 : -1);
      else if (e.code === 'KeyS') setDraft((d) => ({ ...d, start: t }));
      else if (e.code === 'KeyE') setDraft((d) => ({ ...d, end: t }));
      else if (e.code === 'Enter') addRep();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doc, playing, t, duration, step, addRep]);

  const openFiles = async (fileList) => {
    const loaded = {};
    const problems = [];
    for (const file of fileList) {
      try {
        const d = JSON.parse(await file.text());
        const p = checkVideoCoords(d);
        if (p.length) problems.push(`${file.name}: ${p[0]}`);
        else loaded[d.video] = d;
      } catch {
        problems.push(`${file.name}: JSON이 아니에요`);
      }
    }
    setVideos((v) => ({ ...v, ...loaded }));
    const first = Object.keys(loaded)[0];
    if (first && !current) {
      setCurrent(first);
      setT(0);
    }
    setNotice(problems.length ? problems.join(' / ') : null);
  };

  const importCsv = async (file) => {
    try {
      const imported = parseLabelsCsv(await file.text()).map((r) => ({
        video: r.video,
        startSec: r.startSec,
        endSec: r.endSec,
        valid: r.valid,
        errorTypes: r.errorTypes,
        labeler: r.labeler,
      }));
      saveRows(imported);
      setNotice(`라벨 ${imported.length}개를 불러왔어요 (지금 라벨을 덮어썼어요)`);
    } catch (err) {
      setNotice(err.message);
    }
  };

  const videoRows = useMemo(
    () => rows.filter((r) => r.video === current).sort((a, b) => a.startSec - b.startSec),
    [rows, current],
  );
  const pct = (ms) => `${duration ? (ms / duration) * 100 : 0}%`;
  const toggleError = (id) =>
    setDraft((d) => ({
      ...d,
      unknown: false,
      errors: d.errors.includes(id) ? d.errors.filter((e) => e !== id) : [...d.errors, id],
    }));

  return (
    <section className="labeler">
      <div className="card toolbar">
        <label className="field">
          라벨러 (GitHub 아이디)
          <input value={labeler} onChange={(e) => setLabeler(e.target.value.trim())} />
        </label>
        <label className="field">
          좌표 JSON 열기
          <input
            type="file"
            accept=".json"
            multiple
            onChange={(e) => openFiles([...e.target.files])}
          />
        </label>
        <label className="field">
          영상
          <select
            value={current ?? ''}
            onChange={(e) => {
              setCurrent(e.target.value);
              setT(0);
              setPlaying(false);
              setDraft(emptyDraft());
            }}
          >
            {Object.keys(videos).map((v) => (
              <option key={v} value={v}>
                {v} ({rows.filter((r) => r.video === v).length})
              </option>
            ))}
          </select>
        </label>
        <div className="field">
          라벨 파일
          <div className="row">
            <button
              disabled={!labeler || rows.length === 0}
              onClick={() => downloadText(`${labeler}.csv`, toCsv(rows), 'text/csv')}
            >
              CSV 내려받기 ({rows.length})
            </button>
            <label className="button">
              CSV 불러오기
              <input
                type="file"
                accept=".csv"
                hidden
                onChange={(e) => e.target.files[0] && importCsv(e.target.files[0])}
              />
            </label>
          </div>
        </div>
      </div>

      {notice && <p className="message hold">{notice}</p>}

      {doc ? (
        <div className="workout">
          <div>
            <div className="stage">
              <canvas ref={canvasRef} />
              <span className="badge">
                {(t / 1000).toFixed(2)}초 / {(duration / 1000).toFixed(2)}초 ·{' '}
                {doc.view === 'side' ? '측면' : '정면'}
              </span>
            </div>
            <div className="timeline">
              {videoRows.map((r, i) => (
                <span
                  key={i}
                  className={`bar ${r.valid ? 'good' : 'bad'}`}
                  style={{
                    left: pct(r.startSec * 1000),
                    width: pct((r.endSec - r.startSec) * 1000),
                  }}
                />
              ))}
              {draft.start !== null && (
                <span
                  className="bar draft"
                  style={{
                    left: pct(draft.start),
                    width: pct(Math.max(0, (draft.end ?? t) - draft.start)),
                  }}
                />
              )}
              <input
                type="range"
                min={0}
                max={duration}
                step={1}
                value={t}
                onChange={(e) => {
                  setPlaying(false);
                  setT(Number(e.target.value));
                }}
              />
            </div>
            <div className="row controls">
              <button onClick={() => step(-1)}>◀ 1프레임</button>
              <button
                className="primary"
                onClick={() => {
                  if (!playing && t >= duration) setT(0);
                  setPlaying((p) => !p);
                }}
              >
                {playing ? '일시정지' : '재생'} (Space)
              </button>
              <button onClick={() => step(1)}>1프레임 ▶</button>
              <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
                {SPEEDS.map((s) => (
                  <option key={s} value={s}>
                    {s}배속
                  </option>
                ))}
              </select>
            </div>
            <p className="note">
              단축키: Space 재생 · ←/→ 1프레임 (Shift: 1초) · S 시작 · E 끝 · Enter 반복 추가
            </p>
          </div>

          <div className="hud">
            <h2>반복 추가</h2>
            <div className="row">
              <button onClick={() => setDraft((d) => ({ ...d, start: t }))}>
                시작 S {draft.start !== null && `(${(draft.start / 1000).toFixed(2)})`}
              </button>
              <button onClick={() => setDraft((d) => ({ ...d, end: t }))}>
                끝 E {draft.end !== null && `(${(draft.end / 1000).toFixed(2)})`}
              </button>
            </div>
            <fieldset>
              <legend>오류 (없으면 정상)</legend>
              {errorOptions.map(([id, e]) => (
                <label key={id}>
                  <input
                    type="checkbox"
                    checked={draft.errors.includes(id)}
                    onChange={() => toggleError(id)}
                  />
                  {e.label}
                </label>
              ))}
              <label>
                <input
                  type="checkbox"
                  checked={draft.unknown}
                  onChange={() => setDraft((d) => ({ ...d, unknown: !d.unknown, errors: [] }))}
                />
                판단 불가 (가려짐 · 화면 밖)
              </label>
            </fieldset>
            <button className="primary" onClick={addRep}>
              반복 추가 (Enter) ·{' '}
              {draft.unknown ? '판단 불가' : draft.errors.length ? '오류' : '정상'}
            </button>

            <h3>이 영상의 반복 ({videoRows.length})</h3>
            <ol className="rep-list">
              {videoRows.map((r) => (
                <li key={`${r.startSec}-${r.endSec}`}>
                  <button className="link" onClick={() => setT(r.startSec * 1000)}>
                    {r.startSec.toFixed(2)}~{r.endSec.toFixed(2)}초
                  </button>{' '}
                  {r.valid
                    ? '정상'
                    : r.errorTypes.length
                      ? r.errorTypes.map((e) => ERROR_TYPES[e]?.label ?? e).join(', ')
                      : '판단 불가'}{' '}
                  <button className="link" onClick={() => saveRows(rows.filter((x) => x !== r))}>
                    삭제
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : (
        <p className="card">
          녹화한 좌표 JSON 파일(data/coords/)을 열어요. 여러 개를 한 번에 열 수 있어요.
        </p>
      )}
    </section>
  );
}
