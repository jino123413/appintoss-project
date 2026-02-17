import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DeviceViewport } from './components/DeviceViewport';
import { useInterstitialAd, useJsonStorage } from './hooks';

const AD_GROUP_ID = 'ait-ad-test-interstitial-id';
const APP_SALT = 'today-quote-v1';

const CATEGORY_LIST = ['사랑', '용기', '위로', '유머'] as const;
type QuoteCategory = (typeof CATEGORY_LIST)[number];
type SourceType = '영화' | '드라마' | '책' | '인물';

interface QuoteItem {
  id: string;
  text: string;
  category: QuoteCategory;
  sourceType: SourceType;
  sourceName: string;
  author: string;
  detail: string;
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastVisitDate: string;
}

const DEFAULT_STREAK: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastVisitDate: '',
};

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getYesterday(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1);
  date.setDate(date.getDate() - 1);
  return formatDate(date);
}

function hashCode(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function generateQuotePool(): QuoteItem[] {
  const starters = [
    '멈추지 않는 마음은',
    '작은 용기는',
    '오늘의 선택은',
    '흔들리는 순간에도',
    '한 걸음의 진심은',
    '너를 향한 시선은',
    '포기하지 않는 태도는',
    '차분한 숨 고르기는',
    '늦은 출발도',
    '조용한 결심은',
  ];

  const middles = [
    '내일을 바꾸는 문장이 된다',
    '결국 너를 가장 멀리 데려간다',
    '언제나 기회를 다시 만든다',
    '결말보다 과정을 빛나게 한다',
    '불안보다 믿음을 크게 만든다',
    '어제의 두려움을 가볍게 넘긴다',
    '지금의 너를 단단하게 붙잡는다',
    '작은 실패를 성장으로 바꾼다',
    '관계를 따뜻하게 이어 준다',
    '평범한 하루를 특별하게 만든다',
  ];

  const endings = [
    '그리고 그 변화는 조용히 시작된다.',
    '그래서 오늘은 충분히 의미 있다.',
    '결국 답은 멀지 않은 곳에 있다.',
    '그 한 줄이 너를 다시 일으킨다.',
    '내일의 너는 오늘의 너를 고마워할 것이다.',
    '지금 이 순간이 다음 장면의 시작이다.',
  ];

  const sourceNames = [
    '새벽의 장면',
    '다시 걷는 날',
    '온도의 문장',
    '조용한 파도',
    '작은 기적',
    '긴 하루의 끝',
    '바람의 쪽지',
    '숲의 대화',
  ];

  const authors = [
    '김하늘',
    '박지훈',
    '이서윤',
    '최민재',
    '정다은',
    '한도윤',
    '오유진',
    '신현우',
  ];

  const items: QuoteItem[] = [];
  for (let i = 0; i < starters.length; i += 1) {
    for (let j = 0; j < middles.length; j += 1) {
      for (let k = 0; k < endings.length; k += 1) {
        const idx = items.length;
        const category = CATEGORY_LIST[(i + j + k) % CATEGORY_LIST.length] as QuoteCategory;
        const sourceTypeIndex = (i + j + k) % 4;
        const sourceType: SourceType =
          sourceTypeIndex === 0
            ? '영화'
            : sourceTypeIndex === 1
              ? '드라마'
              : sourceTypeIndex === 2
                ? '책'
                : '인물';

        items.push({
          id: `quote-${idx + 1}`,
          text: `${starters[i]} ${middles[j]}. ${endings[k]}`,
          category,
          sourceType,
          sourceName: `${sourceNames[idx % sourceNames.length]} ${Math.floor(idx / 8) + 1}`,
          author: authors[(i + j + k) % authors.length],
          detail: `${category} 카테고리의 오늘 확장 해석: ${starters[i]} ${middles[j]}라는 흐름을 기억해 보세요.`,
        });
      }
    }
  }

  return items;
}

function getDailyQuote(pool: QuoteItem[], dateString: string, retryCount: number): QuoteItem {
  const base = hashCode(`${APP_SALT}:${dateString}`);
  const index = (base + retryCount * 97) % pool.length;
  return pool[index] ?? pool[0];
}

type TabType = 'today' | 'book' | 'streak';
type BookFilter = '전체' | QuoteCategory;

const App: React.FC = () => {
  const [now, setNow] = useState(() => new Date());
  const [tab, setTab] = useState<TabType>('today');
  const [bookFilter, setBookFilter] = useState<BookFilter>('전체');
  const [streakTouched, setStreakTouched] = useState(false);

  const quotePool = useMemo(() => generateQuotePool(), []);
  const quoteMap = useMemo(() => {
    const map = new Map<string, QuoteItem>();
    quotePool.forEach((item) => {
      map.set(item.id, item);
    });
    return map;
  }, [quotePool]);

  const todayString = useMemo(() => formatDate(now), [now]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const { value: likedIds, save: saveLikedIds, loading: likedLoading } = useJsonStorage<string[]>(
    'today-quote-liked-ids',
    []
  );
  const { value: retryByDate, save: saveRetryByDate, loading: retryLoading } = useJsonStorage<
    Record<string, number>
  >('today-quote-retry-by-date', {});
  const { value: detailUnlocked, save: saveDetailUnlocked, loading: detailLoading } = useJsonStorage<
    Record<string, boolean>
  >('today-quote-detail-unlocked', {});
  const { value: bonusUnlocked, save: saveBonusUnlocked, loading: bonusLoading } = useJsonStorage<
    Record<string, boolean>
  >('today-quote-bonus-unlocked', {});
  const { value: streakData, save: saveStreakData, loading: streakLoading } = useJsonStorage<StreakData>(
    'today-quote-streak-data',
    DEFAULT_STREAK
  );

  const { showAd } = useInterstitialAd(AD_GROUP_ID);

  const isDataLoading = likedLoading || retryLoading || detailLoading || bonusLoading || streakLoading;

  useEffect(() => {
    if (streakLoading || streakTouched) {
      return;
    }

    const lastDate = streakData.lastVisitDate;
    if (lastDate === todayString) {
      setStreakTouched(true);
      return;
    }

    const yesterday = getYesterday(todayString);
    const nextCurrent = lastDate === yesterday ? streakData.currentStreak + 1 : 1;
    const nextLongest = Math.max(streakData.longestStreak, nextCurrent);

    saveStreakData({
      currentStreak: nextCurrent,
      longestStreak: nextLongest,
      lastVisitDate: todayString,
    });
    setStreakTouched(true);
  }, [saveStreakData, streakData, streakLoading, streakTouched, todayString]);

  const retryCount = retryByDate[todayString] ?? 0;
  const todayQuote = useMemo(() => getDailyQuote(quotePool, todayString, retryCount), [quotePool, retryCount, todayString]);

  const hiddenQuote = useMemo(() => getDailyQuote(quotePool, `${todayString}:hidden`, 0), [quotePool, todayString]);

  const isLikedToday = likedIds.includes(todayQuote.id);
  const isDetailOpen = detailUnlocked[todayString] ?? false;
  const isBonusOpen = bonusUnlocked[todayString] ?? false;
  const isHiddenUnlockedByStreak = streakData.currentStreak >= 30;

  const likedQuotes = useMemo(() => {
    const result: QuoteItem[] = [];
    likedIds.forEach((id) => {
      const found = quoteMap.get(id);
      if (found) {
        result.push(found);
      }
    });
    return result;
  }, [likedIds, quoteMap]);

  const filteredBook = useMemo(() => {
    if (bookFilter === '전체') {
      return likedQuotes;
    }
    return likedQuotes.filter((item) => item.category === bookFilter);
  }, [bookFilter, likedQuotes]);

  const handleToggleLike = useCallback(() => {
    const nextSet = new Set(likedIds);
    if (nextSet.has(todayQuote.id)) {
      nextSet.delete(todayQuote.id);
    } else {
      nextSet.add(todayQuote.id);
    }
    saveLikedIds(Array.from(nextSet));
  }, [likedIds, saveLikedIds, todayQuote.id]);

  const handleRetry = useCallback(() => {
    showAd({
      onDismiss: () => {
        saveRetryByDate({
          ...retryByDate,
          [todayString]: retryCount + 1,
        });
      },
    });
  }, [retryByDate, retryCount, saveRetryByDate, showAd, todayString]);

  const handleUnlockDetail = useCallback(() => {
    showAd({
      onDismiss: () => {
        saveDetailUnlocked({
          ...detailUnlocked,
          [todayString]: true,
        });
      },
    });
  }, [detailUnlocked, saveDetailUnlocked, showAd, todayString]);

  const handleUnlockBonus = useCallback(() => {
    showAd({
      onDismiss: () => {
        saveBonusUnlocked({
          ...bonusUnlocked,
          [todayString]: true,
        });
      },
    });
  }, [bonusUnlocked, saveBonusUnlocked, showAd, todayString]);

  if (isDataLoading) {
    return (
      <>
        <DeviceViewport />
        <div className="app-shell">
          <div className="loading-box">문장 서재를 준비하고 있어요...</div>
        </div>
      </>
    );
  }

  const progress = Math.min(100, Math.round((streakData.currentStreak / 30) * 100));

  return (
    <>
      <DeviceViewport />
      <div className="app-shell">
        <header className="header">
          <div>
            <p className="header-sub">오늘의 문장 서재</p>
            <h1 className="header-title">오늘의 명대사</h1>
          </div>
          {streakData.currentStreak > 0 && (
            <div className="streak-pill">{streakData.currentStreak}일 연속</div>
          )}
        </header>

        <nav className="tab-nav">
          <button
            className={`tab-btn ${tab === 'today' ? 'active' : ''}`}
            onClick={() => setTab('today')}
            aria-pressed={tab === 'today'}
          >
            오늘 문장
          </button>
          <button
            className={`tab-btn ${tab === 'book' ? 'active' : ''}`}
            onClick={() => setTab('book')}
            aria-pressed={tab === 'book'}
          >
            내 명대사북
          </button>
          <button
            className={`tab-btn ${tab === 'streak' ? 'active' : ''}`}
            onClick={() => setTab('streak')}
            aria-pressed={tab === 'streak'}
          >
            연속 기록
          </button>
        </nav>

        <main className="content">
          {tab === 'today' && (
            <>
              <section className="quote-card">
                <div className="card-top">
                  <span className="chip">{todayQuote.category}</span>
                  <button className="like-btn" onClick={handleToggleLike} aria-pressed={isLikedToday}>
                    <i className={isLikedToday ? 'ri-heart-fill' : 'ri-heart-line'} />
                    {isLikedToday ? '저장됨' : '명대사북 저장'}
                  </button>
                </div>
                <p className="quote-text">“{todayQuote.text}”</p>
                <p className="quote-source">
                  출처: {todayQuote.sourceType} · {todayQuote.sourceName} · {todayQuote.author}
                </p>
              </section>

              <section className="ad-card">
                <button className="action-btn" onClick={handleRetry}>
                  <span className="ad-badge">AD</span>
                  다시하기
                </button>
                <p className="ad-notice">광고 시청 후 다른 오늘의 문장을 볼 수 있어요.</p>
              </section>

              <section className="detail-card">
                <h2>세부 기능</h2>
                {isDetailOpen ? (
                  <p className="detail-text">{todayQuote.detail}</p>
                ) : (
                  <>
                    <button className="action-btn" onClick={handleUnlockDetail}>
                      <span className="ad-badge">AD</span>
                      세부 기능 보기
                    </button>
                    <p className="ad-notice">광고 시청 후 확장 해석을 확인할 수 있어요.</p>
                  </>
                )}
              </section>

              <section className="hidden-card">
                <h2>히든 명대사</h2>
                {isHiddenUnlockedByStreak || isBonusOpen ? (
                  <>
                    <p className="hidden-state">{isHiddenUnlockedByStreak ? '30일 달성 해금' : '오늘 미리보기 해금'}</p>
                    <p className="quote-text">“{hiddenQuote.text}”</p>
                  </>
                ) : (
                  <>
                    <button className="action-btn" onClick={handleUnlockBonus}>
                      <span className="ad-badge">AD</span>
                      추가 콘텐츠 열기
                    </button>
                    <p className="ad-notice">광고 시청 후 오늘의 히든 문장을 미리 볼 수 있어요.</p>
                  </>
                )}
              </section>
            </>
          )}

          {tab === 'book' && (
            <section className="book-card">
              <h2>내 명대사북</h2>
              <div className="filter-row">
                {(['전체', ...CATEGORY_LIST] as BookFilter[]).map((item) => (
                  <button
                    key={item}
                    className={`filter-btn ${bookFilter === item ? 'active' : ''}`}
                    onClick={() => setBookFilter(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>

              {filteredBook.length === 0 ? (
                <p className="empty-text">아직 저장한 문장이 없어요. 오늘 문장에서 좋아요를 눌러보세요.</p>
              ) : (
                <ul className="book-list">
                  {filteredBook.map((item) => (
                    <li key={item.id} className="book-item">
                      <p className="book-quote">“{item.text}”</p>
                      <p className="book-meta">{item.category} · {item.sourceType} · {item.sourceName}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {tab === 'streak' && (
            <section className="streak-card">
              <h2>30일 문장 여정</h2>
              <p className="streak-main">현재 {streakData.currentStreak}일 연속</p>
              <p className="streak-sub">최고 기록 {streakData.longestStreak}일 · 오늘 방문 완료</p>

              <div className="progress-wrap" aria-label="30일 스트릭 진행도">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <p className="progress-label">{progress}% 달성</p>

              {streakData.currentStreak >= 30 ? (
                <div className="unlock-box">히든 명대사가 해금되었어요.</div>
              ) : (
                <div className="unlock-box">{30 - streakData.currentStreak}일 더 방문하면 히든 명대사가 열려요.</div>
              )}
            </section>
          )}
        </main>
      </div>
    </>
  );
};

export default App;
