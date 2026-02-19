import { useCallback, useEffect, useMemo, useState } from 'react';
import { DeviceViewport } from './components/DeviceViewport';
import { useInterstitialAd, useJsonStorage } from './hooks';
import {
  AD_GROUP_ID,
  API_BASE_URL,
  BOOKMARK_STORAGE_KEY,
  BRAND_TABS,
  MAIN_TABS,
  PROMO_FILTERS,
  PROMO_SORTS,
  PROMO_TYPE_PRIORITY,
} from './constants';
import type {
  BrandTab,
  MainTab,
  PromoCompareGroup,
  PromoFilter,
  PromoItem,
  PromoSort,
  PromoType,
  StoreBrand,
} from './types';

type JsonRecord = Record<string, unknown>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null;
}

function pickString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const parsed = Number(value.replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeBrand(value: unknown): StoreBrand | null {
  const token = pickString(value)?.toUpperCase().replace(/[\s-]/g, '');
  if (!token) {
    return null;
  }

  if (token.includes('EMART24') || token.includes('E24')) {
    return 'EMART24';
  }

  if (token.includes('SEVEN') || token.includes('7ELEVEN')) {
    return 'SEVEN';
  }

  if (token.includes('GS25') || token === 'GS') {
    return 'GS25';
  }

  if (token.includes('CU')) {
    return 'CU';
  }

  return null;
}

function normalizePromoType(value: unknown): PromoType | null {
  const token = pickString(value)?.toUpperCase().replace(/[\s_]/g, '');
  if (!token) {
    return null;
  }

  if (token.includes('1+1') || token.includes('ONEPLUSONE')) {
    return '1+1';
  }

  if (token.includes('2+1') || token.includes('TWOPLUSONE')) {
    return '2+1';
  }

  if (
    token.includes('DISCOUNT') ||
    token.includes('SALE') ||
    token.includes('EVENT') ||
    token.includes('GIFT') ||
    token.includes('UNKNOWN')
  ) {
    return 'DISCOUNT';
  }

  return null;
}

function normalizeItem(raw: unknown, index: number): PromoItem | null {
  if (!isJsonRecord(raw)) {
    return null;
  }

  const name =
    pickString(raw.name) ??
    pickString(raw.productName) ??
    pickString(raw.product) ??
    pickString(raw.title);

  const brand =
    normalizeBrand(raw.brand) ??
    normalizeBrand(raw.store) ??
    normalizeBrand(raw.brandName);

  const promoType =
    normalizePromoType(raw.promoType) ??
    normalizePromoType(raw.eventType) ??
    normalizePromoType(raw.promotionType);

  if (!name || !brand || !promoType) {
    return null;
  }

  const baseId =
    pickString(raw.id) ??
    pickString(raw.sku) ??
    pickString(raw.barcode) ??
    `${brand}-${promoType}-${name}-${index}`;

  return {
    id: baseId.toLowerCase(),
    name,
    brand,
    promoType,
    price: toNumber(raw.price ?? raw.salePrice ?? raw.sale_price),
    originalPrice: toNumber(raw.originalPrice ?? raw.listPrice ?? raw.original_price),
    imageUrl: pickString(raw.imageUrl ?? raw.image ?? raw.image_url ?? raw.thumbnail),
    category: pickString(raw.category),
    note: pickString(raw.note ?? raw.description),
    updatedAt: pickString(raw.updatedAt ?? raw.modifiedAt),
  };
}

function pickRawItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isJsonRecord(payload)) {
    return [];
  }

  const candidates = [payload.items, payload.data, payload.results, payload.promos];
  const found = candidates.find((candidate) => Array.isArray(candidate));
  return Array.isArray(found) ? found : [];
}

function buildPromoEndpoints(baseUrl: string): string[] {
  const normalized = baseUrl.replace(/\/$/, '');

  if (normalized.endsWith('/v1')) {
    const rootBase = normalized.replace(/\/v1$/, '');
    return [...new Set([`${normalized}/offers`, `${rootBase}/promos`, `${rootBase}/offers`])];
  }

  return [...new Set([`${normalized}/promos`, `${normalized}/v1/offers`, `${normalized}/offers`])];
}

async function fetchPromos(baseUrl: string): Promise<PromoItem[]> {
  let lastError: Error | null = null;

  for (const endpoint of buildPromoEndpoints(baseUrl)) {
    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status} from ${endpoint}`);
        continue;
      }

      const payload: unknown = await response.json();
      return pickRawItems(payload)
        .map((item, index) => normalizeItem(item, index))
        .filter((item): item is PromoItem => item !== null);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('failed to fetch promotions');
    }
  }

  throw lastError ?? new Error('no promo endpoint is reachable');
}

function matchesFilters(item: PromoItem, brand: BrandTab, promoFilter: PromoFilter, keyword: string): boolean {
  if (brand !== 'ALL' && item.brand !== brand) {
    return false;
  }

  if (promoFilter !== 'ALL' && item.promoType !== promoFilter) {
    return false;
  }

  if (!keyword) {
    return true;
  }

  const target = keyword.toLowerCase();
  const haystack = [item.name, item.category, item.note, item.brand, item.promoType]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLowerCase();

  return haystack.includes(target);
}

function getCompareKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatPrice(price?: number): string {
  return typeof price === 'number' ? `${price.toLocaleString('ko-KR')}원` : '-';
}

function toTimestamp(value?: string): number {
  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortPromoItems(
  items: PromoItem[],
  sort: PromoSort,
  popularityByName: ReadonlyMap<string, number>,
): PromoItem[] {
  const sorted = [...items];

  sorted.sort((a, b) => {
    if (sort === 'PRICE_ASC') {
      const left = a.price ?? Number.MAX_SAFE_INTEGER;
      const right = b.price ?? Number.MAX_SAFE_INTEGER;
      return left - right || a.name.localeCompare(b.name, 'ko');
    }

    if (sort === 'PRICE_DESC') {
      const left = a.price ?? -1;
      const right = b.price ?? -1;
      return right - left || a.name.localeCompare(b.name, 'ko');
    }

    if (sort === 'LATEST') {
      const left = toTimestamp(a.updatedAt);
      const right = toTimestamp(b.updatedAt);
      return right - left || a.name.localeCompare(b.name, 'ko');
    }

    const countA = popularityByName.get(getCompareKey(a.name)) ?? 1;
    const countB = popularityByName.get(getCompareKey(b.name)) ?? 1;
    if (countA !== countB) {
      return countB - countA;
    }

    const typeA = PROMO_TYPE_PRIORITY[a.promoType];
    const typeB = PROMO_TYPE_PRIORITY[b.promoType];
    if (typeA !== typeB) {
      return typeA - typeB;
    }

    const priceA = a.price ?? Number.MAX_SAFE_INTEGER;
    const priceB = b.price ?? Number.MAX_SAFE_INTEGER;
    return priceA - priceB || a.name.localeCompare(b.name, 'ko');
  });

  return sorted;
}

function PromoCard({
  item,
  isBookmarked,
  onToggleBookmark,
}: {
  item: PromoItem;
  isBookmarked: boolean;
  onToggleBookmark: (id: string) => void;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" data-testid={`promo-card-${item.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="h-full w-full object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-400">
                <i className="ri-image-line" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-teal-700">{item.brand}</p>
            <h3 className="truncate text-[15px] font-bold text-slate-900">{item.name}</h3>
            {item.note ? <p className="mt-1 line-clamp-1 text-xs text-slate-500">{item.note}</p> : null}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onToggleBookmark(item.id)}
          data-testid={`bookmark-toggle-${item.id}`}
          className={`h-8 w-8 rounded-full border text-sm ${isBookmarked ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500'}`}
          aria-label={isBookmarked ? '북마크 해제' : '북마크 추가'}
        >
          <i className={isBookmarked ? 'ri-bookmark-fill' : 'ri-bookmark-line'} />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold">
        <span className="rounded-md bg-slate-900 px-2 py-1 text-white">{item.promoType}</span>
        {item.category ? <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">{item.category}</span> : null}
      </div>

      <div className="mt-3 text-sm text-slate-700">
        <p>행사가 {formatPrice(item.price)}</p>
        {item.originalPrice ? <p className="text-xs text-slate-500">정가 {formatPrice(item.originalPrice)}</p> : null}
      </div>
    </article>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<MainTab>('list');
  const [brandTab, setBrandTab] = useState<BrandTab>('ALL');
  const [promoFilter, setPromoFilter] = useState<PromoFilter>('ALL');
  const [promoSort, setPromoSort] = useState<PromoSort>('POPULAR');
  const [keyword, setKeyword] = useState('');
  const [promos, setPromos] = useState<PromoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [compareExpanded, setCompareExpanded] = useState<Record<string, boolean>>({});
  const [compareEntryAdShown, setCompareEntryAdShown] = useState(false);
  const [bookmarkCheckMessage, setBookmarkCheckMessage] = useState('');
  const [bookmarkCheckLoading, setBookmarkCheckLoading] = useState(false);

  const {
    value: storedBookmarkIds,
    save: saveBookmarkIds,
    loading: bookmarkLoading,
  } = useJsonStorage<string[]>(BOOKMARK_STORAGE_KEY, []);
  const bookmarkIds = Array.isArray(storedBookmarkIds) ? storedBookmarkIds : [];
  const bookmarkSet = useMemo(() => new Set(bookmarkIds), [bookmarkIds]);

  const { loading: adLoading, showAd } = useInterstitialAd(AD_GROUP_ID);

  const loadPromos = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const next = await fetchPromos(API_BASE_URL);
      setPromos(next);
    } catch {
      setPromos([]);
      setError('행사 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPromos();
  }, [loadPromos]);

  const normalizedKeyword = keyword.trim().toLowerCase();

  const filteredPromos = useMemo(
    () => promos.filter((item) => matchesFilters(item, brandTab, promoFilter, normalizedKeyword)),
    [promos, brandTab, promoFilter, normalizedKeyword],
  );

  const popularityByName = useMemo(() => {
    const map = new Map<string, number>();
    filteredPromos.forEach((item) => {
      const key = getCompareKey(item.name);
      if (!key) {
        return;
      }
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [filteredPromos]);

  const displayedPromos = useMemo(
    () => sortPromoItems(filteredPromos, promoSort, popularityByName),
    [filteredPromos, promoSort, popularityByName],
  );

  const compareGroups = useMemo<PromoCompareGroup[]>(() => {
    const grouped = new Map<string, PromoItem[]>();

    filteredPromos.forEach((item) => {
      const key = getCompareKey(item.name);
      if (!key) {
        return;
      }
      const current = grouped.get(key) ?? [];
      current.push(item);
      grouped.set(key, current);
    });

    return [...grouped.entries()]
      .map(([key, items]) => {
        const sorted = [...items].sort((a, b) => {
          const typeGap = PROMO_TYPE_PRIORITY[a.promoType] - PROMO_TYPE_PRIORITY[b.promoType];
          if (typeGap !== 0) {
            return typeGap;
          }
          return (a.price ?? Number.MAX_SAFE_INTEGER) - (b.price ?? Number.MAX_SAFE_INTEGER);
        });

        return {
          key,
          name: sorted[0]?.name ?? key,
          brands: new Set(sorted.map((item) => item.brand)).size,
          items: sorted,
        };
      })
      .filter((group) => group.items.length > 1)
      .sort((a, b) => b.brands - a.brands || a.name.localeCompare(b.name, 'ko'));
  }, [filteredPromos]);

  const bookmarkedPromos = useMemo(() => promos.filter((item) => bookmarkSet.has(item.id)), [promos, bookmarkSet]);

  const filteredBookmarks = useMemo(
    () => bookmarkedPromos.filter((item) => matchesFilters(item, brandTab, promoFilter, normalizedKeyword)),
    [bookmarkedPromos, brandTab, promoFilter, normalizedKeyword],
  );

  const displayedBookmarks = useMemo(
    () => sortPromoItems(filteredBookmarks, promoSort, popularityByName),
    [filteredBookmarks, promoSort, popularityByName],
  );

  const toggleBookmark = useCallback(
    (id: string) => {
      const next = bookmarkSet.has(id)
        ? bookmarkIds.filter((bookmarkId) => bookmarkId !== id)
        : [...bookmarkIds, id];
      void saveBookmarkIds(next);
    },
    [bookmarkIds, bookmarkSet, saveBookmarkIds],
  );

  const openMainTab = (tab: MainTab) => {
    if (tab !== 'compare' || compareEntryAdShown) {
      setActiveTab(tab);
      return;
    }

    showAd({
      onDismiss: () => {
        setCompareEntryAdShown(true);
        setActiveTab('compare');
      },
    });
  };

  const toggleCompareDetail = (groupKey: string) => {
    if (compareExpanded[groupKey]) {
      setCompareExpanded((prev) => ({ ...prev, [groupKey]: false }));
      return;
    }

    showAd({
      onDismiss: () => {
        setCompareExpanded((prev) => ({ ...prev, [groupKey]: true }));
      },
    });
  };

  const runBookmarkRefreshCheck = useCallback(async () => {
    if (bookmarkIds.length === 0) {
      setBookmarkCheckMessage('북마크된 상품이 없습니다.');
      return;
    }

    setBookmarkCheckLoading(true);
    const previousMap = new Map(promos.map((item) => [item.id, item]));

    try {
      const next = await fetchPromos(API_BASE_URL);
      setPromos(next);
      const nextMap = new Map(next.map((item) => [item.id, item]));

      const removedCount = bookmarkIds.filter((id) => !nextMap.has(id)).length;
      const changedCount = bookmarkIds.filter((id) => {
        const before = previousMap.get(id);
        const after = nextMap.get(id);
        if (!before || !after) {
          return false;
        }

        return (
          before.promoType !== after.promoType ||
          before.price !== after.price ||
          before.originalPrice !== after.originalPrice ||
          before.updatedAt !== after.updatedAt
        );
      }).length;

      setBookmarkCheckMessage(`갱신 완료 · 변경 ${changedCount}개 · 종료 ${removedCount}개`);
    } catch {
      setBookmarkCheckMessage('북마크 갱신 체크에 실패했습니다.');
    } finally {
      setBookmarkCheckLoading(false);
    }
  }, [bookmarkIds, promos]);

  const handleBookmarkRefreshCheck = () => {
    showAd({
      onDismiss: () => {
        void runBookmarkRefreshCheck();
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-gmarket text-slate-900" style={{ minHeight: 'var(--min-height, 100vh)' }}>
      <DeviceViewport />

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">편혜</h1>
          <button
            type="button"
            onClick={() => void loadPromos()}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600"
            aria-label="새로고침"
            data-testid="refresh-button"
          >
            <i className="ri-refresh-line" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-3 px-4 pb-8 pt-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <i className="ri-search-line text-slate-400" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="상품명 검색"
              className="w-full border-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
              aria-label="상품명 검색"
              data-testid="search-input"
            />
          </div>
        </section>

        <section className="space-y-2" aria-label="브랜드 필터">
          <p className="sr-only">브랜드 필터</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {BRAND_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setBrandTab(tab)}
                data-testid={`brand-${tab.toLowerCase()}`}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${brandTab === tab ? 'bg-teal-600 text-white' : 'bg-white text-slate-600'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2" aria-label="행사유형 필터">
          <p className="sr-only">행사유형 필터</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {PROMO_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setPromoFilter(filter)}
                data-testid={`promo-filter-${filter.toLowerCase().replace('+', 'p')}`}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${promoFilter === filter ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}
              >
                {filter}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2" aria-label="정렬 기준">
          <p className="sr-only">정렬 기준</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {PROMO_SORTS.map((sortOption) => (
              <button
                key={sortOption.key}
                type="button"
                onClick={() => setPromoSort(sortOption.key)}
                data-testid={`sort-${sortOption.key.toLowerCase()}`}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${promoSort === sortOption.key ? 'bg-teal-600 text-white' : 'bg-white text-slate-600'}`}
              >
                {sortOption.label}
              </button>
            ))}
          </div>
        </section>

        <nav className="grid grid-cols-3 gap-1 rounded-2xl border border-slate-200 bg-white p-1">
          {MAIN_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => openMainTab(tab.key)}
              data-testid={`tab-${tab.key}`}
              className={`rounded-xl px-2 py-2 text-sm font-semibold ${activeTab === tab.key ? 'bg-teal-600 text-white' : 'text-slate-600'}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {loading || bookmarkLoading ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            데이터를 불러오는 중...
          </section>
        ) : null}

        {!loading && error ? (
          <section className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
            <p>{error}</p>
          </section>
        ) : null}

        {!loading && !error && activeTab === 'list' ? (
          <section className="space-y-3" data-testid="panel-list">
            {displayedPromos.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                조건에 맞는 행사상품이 없습니다.
              </div>
            ) : (
              displayedPromos.map((item) => (
                <PromoCard
                  key={item.id}
                  item={item}
                  isBookmarked={bookmarkSet.has(item.id)}
                  onToggleBookmark={toggleBookmark}
                />
              ))
            )}
          </section>
        ) : null}

        {!loading && !error && activeTab === 'compare' ? (
          <section className="space-y-3" data-testid="panel-compare">
            {compareGroups.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                비교 가능한 동일 상품이 아직 없습니다.
              </div>
            ) : (
              compareGroups.map((group) => {
                const expanded = Boolean(compareExpanded[group.key]);
                return (
                  <article key={group.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">{group.name}</h3>
                        <p className="mt-1 text-xs text-slate-500">{group.brands}개 브랜드</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleCompareDetail(group.key)}
                        data-testid={`compare-toggle-${group.key}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600"
                      >
                        {expanded ? '접기' : '상세'}
                        {!expanded ? (
                          <span className="rounded bg-slate-900 px-1 py-0.5 text-[10px] text-white">AD</span>
                        ) : null}
                      </button>
                    </div>

                    {expanded ? (
                      <ul className="mt-3 space-y-2">
                        {group.items.map((item) => (
                          <li key={`${group.key}-${item.id}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-800">
                                  {item.brand} · {item.promoType}
                                </p>
                                <p className="text-xs text-slate-500">
                                  행사가 {formatPrice(item.price)}
                                  {item.originalPrice ? ` / 정가 ${formatPrice(item.originalPrice)}` : ''}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleBookmark(item.id)}
                                className={`h-7 w-7 rounded-full border text-sm ${bookmarkSet.has(item.id) ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500'}`}
                                aria-label={bookmarkSet.has(item.id) ? '북마크 해제' : '북마크 추가'}
                              >
                                <i className={bookmarkSet.has(item.id) ? 'ri-bookmark-fill' : 'ri-bookmark-line'} />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                );
              })
            )}
          </section>
        ) : null}

        {!loading && !error && activeTab === 'bookmark' ? (
          <section className="space-y-3" data-testid="panel-bookmark">
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3">
              <p className="text-xs text-slate-500">북마크 {bookmarkedPromos.length}개</p>
              <button
                type="button"
                onClick={handleBookmarkRefreshCheck}
                disabled={bookmarkCheckLoading || adLoading}
                data-testid="bookmark-refresh-check"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-60"
              >
                갱신 체크
                <span className="rounded bg-slate-900 px-1 py-0.5 text-[10px] text-white">AD</span>
              </button>
            </div>

            {bookmarkCheckMessage ? (
              <p className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                {bookmarkCheckMessage}
              </p>
            ) : null}

            {displayedBookmarks.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                조건에 맞는 북마크가 없습니다.
              </div>
            ) : (
              displayedBookmarks.map((item) => (
                <PromoCard
                  key={item.id}
                  item={item}
                  isBookmarked={bookmarkSet.has(item.id)}
                  onToggleBookmark={toggleBookmark}
                />
              ))
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
}
