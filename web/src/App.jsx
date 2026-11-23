import { useState } from 'react';
import LabelScreen from './components/LabelScreen.jsx';
import RecordScreen from './components/RecordScreen.jsx';
import SetupScreen from './components/SetupScreen.jsx';
import WorkoutScreen from './components/WorkoutScreen.jsx';

const TABS = [
  { id: 'workout', label: '운동' },
  { id: 'record', label: '데이터 녹화' },
  { id: 'label', label: '라벨링' },
];

// 첫 탭은 URL로 고를 수 있어요: ?tab=record, ?tab=label
const initialTab = new URLSearchParams(globalThis.location?.search ?? '').get('tab') ?? 'workout';

export default function App() {
  const [tab, setTab] = useState(TABS.some((t) => t.id === initialTab) ? initialTab : 'workout');
  const [plan, setPlan] = useState(null); // { exercise, view, source, sets, reps }

  return (
    <main className="app">
      <header className="app-header">
        <div>
          <h1>득근득근</h1>
          <p>올바른 자세만 세는 AI 운동 코치</p>
        </div>
        <nav className="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? 'active' : ''}
              onClick={() => {
                setTab(t.id);
                setPlan(null);
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      {tab === 'record' && <RecordScreen />}
      {tab === 'label' && <LabelScreen />}
      {tab === 'workout' &&
        (plan ? (
          <WorkoutScreen plan={plan} onExit={() => setPlan(null)} />
        ) : (
          <SetupScreen onStart={setPlan} />
        ))}
    </main>
  );
}
