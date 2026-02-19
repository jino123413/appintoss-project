import type { Brand, OfferInput } from "../domain/offers";

const fallbackOffers: Record<Brand, OfferInput[]> = {
  CU: [
    {
      brand: "CU",
      promoType: "ONE_PLUS_ONE",
      title: "CU sample 1+1 promotion",
      description: "Fallback sample offer when scraping fails.",
      sourceUrl: "https://cu.bgfretail.com/event/plus.do"
    },
    {
      brand: "CU",
      promoType: "DISCOUNT",
      title: "CU sample discount promotion",
      description: "Fallback sample offer when scraping returns no rows.",
      sourceUrl: "https://cu.bgfretail.com/event/plus.do"
    }
  ],
  GS25: [
    {
      brand: "GS25",
      promoType: "TWO_PLUS_ONE",
      title: "GS25 sample 2+1 promotion",
      description: "Fallback sample offer when scraping fails.",
      sourceUrl: "https://gs25.gsretail.com/gscvs/ko/products/event-goods"
    },
    {
      brand: "GS25",
      promoType: "DISCOUNT",
      title: "GS25 sample discount promotion",
      description: "Fallback sample offer when scraping returns no rows.",
      sourceUrl: "https://gs25.gsretail.com/gscvs/ko/products/event-goods"
    }
  ],
  SEVEN: [
    {
      brand: "SEVEN",
      promoType: "ONE_PLUS_ONE",
      title: "SEVEN sample 1+1 promotion",
      description: "Fallback sample offer when scraping fails.",
      sourceUrl: "https://www.7-eleven.co.kr/product/presentList.asp"
    },
    {
      brand: "SEVEN",
      promoType: "EVENT",
      title: "SEVEN sample event promotion",
      description: "Fallback sample offer when scraping returns no rows.",
      sourceUrl: "https://www.7-eleven.co.kr/product/presentList.asp"
    }
  ],
  EMART24: [
    {
      brand: "EMART24",
      promoType: "TWO_PLUS_ONE",
      title: "EMART24 sample 2+1 promotion",
      description: "Fallback sample offer when scraping fails.",
      sourceUrl: "https://www.emart24.co.kr/goods/event"
    },
    {
      brand: "EMART24",
      promoType: "EVENT",
      title: "EMART24 sample event promotion",
      description: "Fallback sample offer when scraping returns no rows.",
      sourceUrl: "https://www.emart24.co.kr/goods/event"
    }
  ]
};

export function getFallbackOffers(brand: Brand): OfferInput[] {
  return fallbackOffers[brand].map((offer) => ({ ...offer }));
}
