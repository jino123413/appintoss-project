import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DeviceViewport } from './components/DeviceViewport';
import { useInterstitialAd, useJsonStorage } from './hooks';

type Phase = 'input' | 'reveal' | 'result';
type Axis = 'teto' | 'egen';
type Tendency = '테토' | '에겐' | '밸런스';
type LayerTone = 'warm' | 'cool' | 'neutral';

interface QuestionOption {
  value: Axis;
  label: string;
}

interface Question {
  id: string;
  prompt: string;
  options: [QuestionOption, QuestionOption];
}

interface LayerInsight {
  title: string;
  description: string;
  tone: LayerTone;
}

interface AnalysisResult {
  tendency: Tendency;
  headline: string;
  summary: string;
  axisPosition: number;
  layers: LayerInsight[];
  deepDive: string[];
}

interface ProfileRecord {
  dateKey: string;
  name: string;
  tendency: Tendency;
}

interface ProfileStore {
  lastVisit: string;
  streak: number;
  records: ProfileRecord[];
}

const AD_GROUP_ID = 'ait-ad-test-interstitial-id';
const STORAGE_KEY = 'teto-egen-state';

const DEFAULT_STORE: ProfileStore = {
  lastVisit: '',
  streak: 0,
  records: [],
};

const QUESTIONS: Question[] = [
  {
    id: 'q1',
    prompt: '새로운 모임에서의 첫 반응은?',
    options: [
      { value: 'teto', label: '먼저 분위기를 띄운다' },
      { value: 'egen', label: '상황을 읽고 타이밍을 본다' },
    ],
  },
  {
    id: 'q2',
    prompt: '갈등이 생기면 보통 어떻게 풀까?',
    options: [
      { value: 'teto', label: '핵심만 바로 말한다' },
      { value: 'egen', label: '감정선을 먼저 정리한다' },
    ],
  },
  {
    id: 'q3',
    prompt: '즉흥 제안을 받으면?',
    options: [
      { value: 'teto', label: '일단 해보고 조정한다' },
      { value: 'egen', label: '흐름과 맥락을 살핀다' },
    ],
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function hashText(input: string) {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return Math.abs(hash);
}

function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getPreviousDateKey(dateKey: string) {
  const parsed = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  parsed.setDate(parsed.getDate() - 1);
  return getDateKey(parsed);
}

function formatDateLabel(dateKey: string) {
  const [year, month, day] = dateKey.split('-');
  if (!year || !month || !day) {
    return dateKey;
  }
  return `${month}.${day}`;
}

function createAnalysis(name: string, answers: Record<string, Axis>, dateKey: string): AnalysisResult {
  const answerScore = QUESTIONS.reduce((acc, question) => {
    return acc + (answers[question.id] === 'teto' ? 1 : -1);
  }, 0);

  const nameBias = (hashText(name) % 5) - 2;
  const dateBias = (hashText(`${name}:${dateKey}`) % 3) - 1;
  const total = answerScore + nameBias + dateBias;

  let tendency: Tendency = '밸런스';
  if (total >= 2) {
    tendency = '테토';
  } else if (total <= -2) {
    tendency = '에겐';
  }

  const axisPosition =
    tendency === '밸런스'
      ? 50 + ((hashText(`${dateKey}:${name}`) % 9) - 4)
      : clamp(50 + total * 9, 12, 88);

  if (tendency === '테토') {
    return {
      tendency,
      headline: '결정의 결이 빠른 테토 축입니다',
      summary: '오늘은 추진력이 앞에 서고, 판단은 선명하게 정리되는 날이에요.',
      axisPosition,
      layers: [
        { title: '표층', description: '반응 속도가 빠르고 선택이 분명해요.', tone: 'warm' },
        { title: '중층', description: '대화에서 결론을 먼저 세우는 경향이 강해요.', tone: 'warm' },
        { title: '심층', description: '기회를 잡는 감각이 살아 있어요.', tone: 'neutral' },
        { title: '핵', description: '오늘의 중심축은 실행력입니다.', tone: 'warm' },
      ],
      deepDive: [
        '관계에서 중요한 문장은 짧고 분명하게 전하면 좋아요.',
        '오늘의 강점은 속도, 보완점은 상대 템포 확인이에요.',
        '저녁으로 갈수록 직관보다 맥락 점검이 더 유리해요.',
      ],
    };
  }

  if (tendency === '에겐') {
    return {
      tendency,
      headline: '맥락을 읽는 에겐 축이 강하게 잡혔어요',
      summary: '오늘은 분위기와 결을 맞추는 능력이 특히 돋보이는 날이에요.',
      axisPosition,
      layers: [
        { title: '표층', description: '상대 반응을 먼저 읽고 움직여요.', tone: 'cool' },
        { title: '중층', description: '대화의 온도를 섬세하게 조절해요.', tone: 'cool' },
        { title: '심층', description: '긴 호흡의 신뢰를 쌓는 타입이에요.', tone: 'neutral' },
        { title: '핵', description: '오늘의 중심축은 조율력입니다.', tone: 'cool' },
      ],
      deepDive: [
        '질문을 한 번 더 던지면 관계 밀도가 올라가요.',
        '오늘의 강점은 공감, 보완점은 결정 지연 방지예요.',
        '중요한 선택은 오후보다 오전에 정리하면 더 깔끔해요.',
      ],
    };
  }

  return {
    tendency,
    headline: '테토와 에겐 결이 고르게 섞인 상태예요',
    summary: '오늘은 추진과 조율이 균형을 이루는 밸런스 데이예요.',
    axisPosition,
    layers: [
      { title: '표층', description: '상황에 따라 템포를 유연하게 바꿔요.', tone: 'neutral' },
      { title: '중층', description: '의견을 밀어야 할 때와 들을 때를 구분해요.', tone: 'neutral' },
      { title: '심층', description: '관계 피로를 줄이는 조정 감각이 있어요.', tone: 'cool' },
      { title: '핵', description: '오늘의 중심축은 균형감입니다.', tone: 'warm' },
    ],
    deepDive: [
      '중요한 대화에서는 시작은 공감, 마무리는 결론으로 닫아보세요.',
      '오늘의 강점은 유연성, 보완점은 우선순위 고정이에요.',
      '저녁 일정은 한 가지 목표만 남기면 피로가 줄어들어요.',
    ],
  };
}

function getLayerToneClass(tone: LayerTone) {
  switch (tone) {
    case 'warm':
      return 'border-[#007779] bg-[#EAF5F3]';
    case 'cool':
      return 'border-[#0B3A5C] bg-[#EEF1F6]';
    default:
      return 'border-[#CBD6E3] bg-[#F8F5EC]';
  }
}

const App: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('input');
  const [name, setName] = useState('');
  const [answers, setAnswers] = useState<Record<string, Axis | undefined>>({});
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [deepUnlocked, setDeepUnlocked] = useState(false);
  const revealTimerRef = useRef<number | undefined>(undefined);

  const { loading: adLoading, showAd } = useInterstitialAd(AD_GROUP_ID);
  const { value: store, save: saveStore, loading: storeLoading } = useJsonStorage<ProfileStore>(
    STORAGE_KEY,
    DEFAULT_STORE,
  );

  const canAnalyze = useMemo(() => {
    const hasName = name.trim().length > 0;
    const hasAllAnswers = QUESTIONS.every((question) => Boolean(answers[question.id]));
    return hasName && hasAllAnswers && !storeLoading;
  }, [answers, name, storeLoading]);

  const handlePick = useCallback((questionId: string, value: Axis) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  }, []);

  const handleAnalyze = useCallback(() => {
    const trimmedName = name.trim();
    if (trimmedName.length < 1) {
      setErrorMessage('이름을 먼저 입력해 주세요.');
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

    const dateKey = getDateKey();
    const analysis = createAnalysis(trimmedName, pickedAnswers, dateKey);

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
    setPhase('reveal');

    if (revealTimerRef.current) {
      window.clearTimeout(revealTimerRef.current);
    }

    revealTimerRef.current = window.setTimeout(() => {
      setPhase('result');
    }, 1700);
  }, [answers, name, saveStore, store.lastVisit, store.records, store.streak]);

  const handleUnlockDeepDive = useCallback(() => {
    showAd({
      onDismiss: () => {
        setDeepUnlocked(true);
      },
    });
  }, [showAd]);

  const handleRetry = useCallback(() => {
    setPhase('input');
    setResult(null);
    setDeepUnlocked(false);
    setErrorMessage('');
  }, []);

  useEffect(() => {
    return () => {
      if (revealTimerRef.current) {
        window.clearTimeout(revealTimerRef.current);
      }
    };
  }, []);

  return (
    <>
      <DeviceViewport />
      <div className="min-h-screen font-gmarket bg-[radial-gradient(circle_at_12%_20%,#FDF4DE_0%,#F6ECDA_34%,#EDF4F2_65%,#FDF4DE_100%)] text-slate-900">
        <header className="sticky top-0 z-20 border-b border-white/70 bg-white/75 px-5 py-4 backdrop-blur-md">
          <p className="text-xs text-[#0B3A5C]">정체성 결 실험</p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <h1 className="text-lg font-bold leading-tight">넌 테토야 에겐이야</h1>
            <span className="rounded-full bg-[#E7F2F0] px-3 py-1 text-xs font-medium text-[#0B3A5C]">
              연속 {store.streak}일
            </span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-md px-5 pb-12 pt-5">
          {phase === 'input' && (
            <section className="space-y-4">
              <article className="rounded-3xl border border-white/70 bg-white/90 p-4 shadow-sm">
                <p className="text-sm text-slate-600">오늘의 이름 결</p>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={12}
                  placeholder="이름을 입력해 주세요"
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none transition focus:border-[#007779]"
                />
                <p className="mt-2 text-xs text-slate-500">같은 이름도 날짜가 바뀌면 결이 살짝 달라질 수 있어요.</p>
              </article>

              {QUESTIONS.map((question, index) => (
                <article key={question.id} className="rounded-3xl border border-white/70 bg-white/90 p-4 shadow-sm">
                  <p className="text-xs text-slate-500">문항 {index + 1}</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{question.prompt}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {question.options.map((option) => {
                      const selected = answers[question.id] === option.value;
                      return (
                        <button
                          type="button"
                          key={option.value}
                          onClick={() => handlePick(question.id, option.value)}
                          className={`rounded-2xl border px-3 py-3 text-sm transition ${
                            selected
                              ? 'border-[#007779] bg-[#007779] text-white'
                              : 'border-slate-200 bg-white text-slate-700'
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </article>
              ))}

              {errorMessage && <p className="px-1 text-sm text-rose-600">{errorMessage}</p>}

              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!canAnalyze}
                className="w-full rounded-2xl bg-[#0B3A5C] px-4 py-3 text-base font-medium text-white transition disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                오늘 성향 분석하기
              </button>
            </section>
          )}

          {phase === 'reveal' && (
            <section className="rounded-3xl border border-white/70 bg-white/90 px-6 py-12 text-center shadow-sm">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#D6EBE7] border-t-[#007779]" />
              <p className="mt-5 text-sm text-slate-500">지층 결을 해석하고 있어요...</p>
              <p className="mt-2 text-base font-medium text-slate-900">오늘의 테토/에겐 축을 정리 중</p>
            </section>
          )}

          {phase === 'result' && result && (
            <section className="space-y-4">
              <article className="overflow-hidden rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm">
                <p className="text-xs text-slate-500">오늘의 중심축</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">{result.tendency}</h2>
                <p className="mt-2 text-sm font-medium text-slate-800">{result.headline}</p>
                <p className="mt-2 text-sm text-slate-600">{result.summary}</p>

                <div className="mt-5">
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                    <span>테토 결</span>
                    <span>에겐 결</span>
                  </div>
                  <div className="relative h-3 rounded-full bg-gradient-to-r from-[#0B3A5C] via-[#007779] to-[#8DBBB4]">
                    <span
                      className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-white bg-slate-900 shadow"
                      style={{ left: `${result.axisPosition}%`, transform: 'translate(-50%, -50%)' }}
                    />
                  </div>
                </div>
              </article>

              <article className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">지층 단면</p>
                <div className="mt-3 space-y-2">
                  {result.layers.map((layer) => (
                    <div
                      key={layer.title}
                      className={`rounded-2xl border-l-4 px-3 py-3 ${getLayerToneClass(layer.tone)}`}
                    >
                      <p className="text-xs font-semibold text-slate-500">{layer.title}</p>
                      <p className="mt-1 text-sm text-slate-800">{layer.description}</p>
                    </div>
                  ))}
                </div>
              </article>

              {!deepUnlocked && (
                <article className="rounded-3xl border border-[#BFDCD8] bg-[#EEF7F5] p-5 shadow-sm">
                  <div className="mb-2 inline-flex rounded-full bg-[#0B3A5C] px-2 py-1 text-[11px] font-semibold text-white">
                    AD
                  </div>
                  <p className="text-sm font-semibold text-slate-900">심층 단면 리포트</p>
                  <p className="mt-1 text-xs text-slate-600">광고 시청 후 열람할 수 있어요.</p>
                  <button
                    type="button"
                    onClick={handleUnlockDeepDive}
                    className="mt-3 w-full rounded-2xl bg-[#007779] px-4 py-3 text-sm font-medium text-white"
                    disabled={adLoading}
                  >
                    {adLoading ? '광고 준비 중...' : '심층 단면 열기'}
                  </button>
                </article>
              )}

              {deepUnlocked && (
                <article className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm">
                  <p className="text-sm font-semibold text-slate-900">심층 단면 리포트</p>
                  <div className="mt-3 space-y-2">
                    {result.deepDive.map((line) => (
                      <p key={line} className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        {line}
                      </p>
                    ))}
                  </div>
                </article>
              )}

              {store.records.length > 0 && (
                <article className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm">
                  <p className="text-sm font-semibold text-slate-900">최근 기록</p>
                  <div className="mt-3 grid grid-cols-1 gap-2">
                    {store.records.slice(0, 4).map((item) => (
                      <div
                        key={`${item.dateKey}-${item.name}-${item.tendency}`}
                        className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-sm"
                      >
                        <span className="font-medium text-slate-800">{item.name}</span>
                        <span className="text-slate-500">{formatDateLabel(item.dateKey)}</span>
                        <span className="rounded-full bg-slate-200 px-2 py-1 text-xs text-slate-700">{item.tendency}</span>
                      </div>
                    ))}
                  </div>
                </article>
              )}

              <button
                type="button"
                onClick={handleRetry}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700"
              >
                다시 분석하기
              </button>
            </section>
          )}
        </main>
      </div>
    </>
  );
};

export default App;
