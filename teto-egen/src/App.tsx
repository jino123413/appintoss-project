import React, { useCallback, useMemo, useState } from 'react';
import { DeviceViewport } from './components/DeviceViewport';
import { useInterstitialAd, useJsonStorage } from './hooks';
import { QUESTIONS } from './data/questions';
import { HomeScreen, QuizScreen, ResultScreen } from './screens';
import { createAnalysis, getDateKey, getPreviousDateKey } from './utils/analysis';
import type { AnalysisResult, Axis, ProfileRecord, ProfileStore } from './types';

type Screen = 'home' | 'quiz' | 'result';

const AD_GROUP_ID = 'ait.v2.live.8466c7b823b74bfc';
const STORAGE_KEY = 'teto-egen-state';

const DEFAULT_STORE: ProfileStore = {
  lastVisit: '',
  streak: 0,
  records: [],
};

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('home');
  const [name, setName] = useState('');
  const [answers, setAnswers] = useState<Record<string, Axis | undefined>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [deepUnlocked, setDeepUnlocked] = useState(false);

  const { loading: adLoading, showAd } = useInterstitialAd(AD_GROUP_ID);
  const { value: store, save: saveStore } = useJsonStorage<ProfileStore>(STORAGE_KEY, DEFAULT_STORE);

  const currentQuestion = useMemo(() => QUESTIONS[questionIndex], [questionIndex]);

  const handleStart = useCallback(() => {
    if (!name.trim()) {
      return;
    }
    setAnswers({});
    setQuestionIndex(0);
    setResult(null);
    setErrorMessage('');
    setDeepUnlocked(false);
    setScreen('quiz');
  }, [name]);

  const handlePick = useCallback((questionId: string, value: Axis) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setErrorMessage('');
  }, []);

  const handleAnalyze = useCallback(() => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setScreen('home');
      return;
    }

    const pickedAnswers: Record<string, Axis> = {};
    for (const question of QUESTIONS) {
      const picked = answers[question.id];
      if (!picked) {
        setErrorMessage('모든 문항을 선택해 주세요.');
        return;
      }
      pickedAnswers[question.id] = picked;
    }

    const analysis = createAnalysis(trimmedName, pickedAnswers);
    const dateKey = getDateKey();

    const wasVisitedToday = store.lastVisit === dateKey;
    const wasVisitedYesterday = store.lastVisit === getPreviousDateKey(dateKey);
    const nextStreak = wasVisitedToday ? store.streak : wasVisitedYesterday ? store.streak + 1 : 1;

    const recordsWithoutToday = store.records.filter((item) => item.dateKey !== dateKey);
    const nextRecords: ProfileRecord[] = [
      { dateKey, name: trimmedName, tendency: analysis.tendency },
      ...recordsWithoutToday,
    ].slice(0, 7);

    saveStore({
      lastVisit: dateKey,
      streak: nextStreak,
      records: nextRecords,
    });

    setResult(analysis);
    setErrorMessage('');
    setDeepUnlocked(false);
    setScreen('result');
  }, [answers, name, saveStore, store.lastVisit, store.records, store.streak]);

  const handlePrev = useCallback(() => {
    if (questionIndex === 0) {
      setScreen('home');
      return;
    }
    setQuestionIndex((prev) => prev - 1);
    setErrorMessage('');
  }, [questionIndex]);

  const handleNext = useCallback(() => {
    const selected = answers[currentQuestion.id];
    if (!selected) {
      setErrorMessage('선택 후 이동해 주세요.');
      return;
    }

    if (questionIndex === QUESTIONS.length - 1) {
      handleAnalyze();
      return;
    }

    setQuestionIndex((prev) => prev + 1);
    setErrorMessage('');
  }, [answers, currentQuestion.id, handleAnalyze, questionIndex]);

  const handleUnlockDeepDive = useCallback(() => {
    showAd({
      onDismiss: () => {
        setDeepUnlocked(true);
      },
    });
  }, [showAd]);

  const handleRetry = useCallback(() => {
    setAnswers({});
    setQuestionIndex(0);
    setResult(null);
    setDeepUnlocked(false);
    setErrorMessage('');
    setScreen('home');
  }, []);

  return (
    <>
      <DeviceViewport />
      <div className="min-h-screen font-gmarket bg-[radial-gradient(circle_at_15%_12%,#eefaf6_0%,#f6fbfb_35%,#eff4f9_100%)] text-slate-900">
        <header className="sticky top-0 z-20 border-b border-white/80 bg-white/70 px-5 py-4 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-md items-center justify-end">
            {screen === 'quiz' && (
              <p className="text-xs font-semibold text-slate-500">
                {questionIndex + 1} / {QUESTIONS.length}
              </p>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-md px-5 pb-10 pt-5">
          {screen === 'home' && (
            <HomeScreen name={name} streak={store.streak} onNameChange={setName} onStart={handleStart} />
          )}

          {screen === 'quiz' && (
            <QuizScreen
              question={currentQuestion}
              questionIndex={questionIndex}
              totalQuestions={QUESTIONS.length}
              selectedValue={answers[currentQuestion.id]}
              errorMessage={errorMessage}
              onPick={handlePick}
              onPrev={handlePrev}
              onNext={handleNext}
            />
          )}

          {screen === 'result' && result && (
            <ResultScreen
              name={name.trim()}
              result={result}
              deepUnlocked={deepUnlocked}
              adLoading={adLoading}
              onUnlockDeep={handleUnlockDeepDive}
              onRetry={handleRetry}
            />
          )}
        </main>
      </div>
    </>
  );
};

export default App;
