export type BrandTab = 'ALL' | 'CU' | 'GS25' | 'SEVEN' | 'EMART24';
export type StoreBrand = Exclude<BrandTab, 'ALL'>;

export type PromoFilter = 'ALL' | '1+1' | '2+1' | 'DISCOUNT';
export type PromoType = Exclude<PromoFilter, 'ALL'>;
export type PromoSort = 'POPULAR' | 'PRICE_ASC' | 'PRICE_DESC' | 'LATEST';

export type MainTab = 'list' | 'compare' | 'bookmark';

export interface PromoItem {
  id: string;
  name: string;
  brand: StoreBrand;
  promoType: PromoType;
  price?: number;
  originalPrice?: number;
  imageUrl?: string;
  category?: string;
  note?: string;
  updatedAt?: string;
}

export interface PromoCompareGroup {
  key: string;
  name: string;
  brands: number;
  items: PromoItem[];
}
