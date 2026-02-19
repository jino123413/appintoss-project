import type { BrandTab, MainTab, PromoFilter, PromoSort, PromoType } from './types';

const rawAdGroupId = import.meta.env.VITE_AD_GROUP_ID?.trim();
export const AD_GROUP_ID = rawAdGroupId && rawAdGroupId.length > 0
  ? rawAdGroupId
  : 'ait.v2.live.012aa2a0d0b84229';

export const BOOKMARK_STORAGE_KEY = 'pyeonhye:bookmarks';

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || 'http://165.232.168.243';
export const API_BASE_URL = rawApiBaseUrl.replace(/\/$/, '');

export const BRAND_TABS: BrandTab[] = ['ALL', 'CU', 'GS25', 'SEVEN', 'EMART24'];
export const PROMO_FILTERS: PromoFilter[] = ['ALL', '1+1', '2+1', 'DISCOUNT'];

export const PROMO_SORTS: Array<{ key: PromoSort; label: string }> = [
  { key: 'POPULAR', label: '인기순' },
  { key: 'PRICE_ASC', label: '가격낮은순' },
  { key: 'PRICE_DESC', label: '가격높은순' },
  { key: 'LATEST', label: '최신순' },
];

export const MAIN_TABS: Array<{ key: MainTab; label: string }> = [
  { key: 'list', label: '목록' },
  { key: 'compare', label: '비교' },
  { key: 'bookmark', label: '북마크' },
];

export const PROMO_TYPE_PRIORITY: Record<PromoType, number> = {
  '1+1': 0,
  '2+1': 1,
  DISCOUNT: 2,
};
