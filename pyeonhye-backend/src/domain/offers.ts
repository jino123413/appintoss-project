export const BRANDS = ["CU", "GS25", "SEVEN", "EMART24"] as const;
export type Brand = (typeof BRANDS)[number];

export const PROMO_TYPES = ["ONE_PLUS_ONE", "TWO_PLUS_ONE", "DISCOUNT", "GIFT", "EVENT", "UNKNOWN"] as const;
export type PromoType = (typeof PROMO_TYPES)[number];

export interface OfferInput {
  brand: Brand;
  promoType: PromoType;
  title: string;
  description?: string;
  price?: number;
  originalPrice?: number;
  imageUrl?: string;
  sourceUrl: string;
  sourceOfferId?: string;
  validFrom?: string;
  validTo?: string;
}

export interface OfferRecord extends OfferInput {
  id: string;
  scrapedAt: string;
  createdAt: string;
  updatedAt: string;
}

const brandSet = new Set<string>(BRANDS);
const promoTypeSet = new Set<string>(PROMO_TYPES);

export function isBrand(value: string): value is Brand {
  return brandSet.has(value);
}

export function isPromoType(value: string): value is PromoType {
  return promoTypeSet.has(value);
}
