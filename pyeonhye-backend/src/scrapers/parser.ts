import { load, type Cheerio, type CheerioAPI } from "cheerio";
import { env } from "../config";
import { type Brand, type OfferInput, type PromoType } from "../domain/offers";

export interface ParserConfig {
  itemSelectors: string[];
  titleSelectors: string[];
  promoSelectors: string[];
  descriptionSelectors: string[];
  linkSelectors?: string[];
}

export const defaultUserAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export function defaultHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    "user-agent": defaultUserAgent,
    "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    ...extra,
  };
}

export function cleanText(value: string | undefined): string {
  if (!value) {
    return "";
  }

  return value.replace(/\s+/g, " ").trim();
}

export function parsePriceValue(value: string | number | undefined | null): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const cleaned = value.replace(/[^\d.-]/g, "");
  if (!cleaned) {
    return undefined;
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? Math.round(parsed) : undefined;
}

export function inferPromoType(raw: string): PromoType {
  const compact = cleanText(raw).toLowerCase().replace(/\s+/g, "");

  if (/(1\+1|oneplusone|원플러스원)/.test(compact)) {
    return "ONE_PLUS_ONE";
  }

  if (/(2\+1|twoplusone|투플러스원)/.test(compact)) {
    return "TWO_PLUS_ONE";
  }

  if (/(discount|sale|off|coupon|할인|세일)/.test(compact)) {
    return "DISCOUNT";
  }

  if (/(gift|freebie|present|증정|덤)/.test(compact)) {
    return "GIFT";
  }

  if (/(event|promo|promotion|행사|3\+1|threeplusone)/.test(compact)) {
    return "EVENT";
  }

  return "UNKNOWN";
}

function pickText(node: Cheerio<any>, selectors: string[]): string {
  for (const selector of selectors) {
    const text = cleanText(node.find(selector).first().text());
    if (text) {
      return text;
    }
  }

  return cleanText(node.text());
}

function pickAttr(node: Cheerio<any>, selectors: string[], attr: string): string {
  for (const selector of selectors) {
    const value = node.find(selector).first().attr(attr);
    if (value) {
      return cleanText(value);
    }
  }

  return "";
}

export function toAbsoluteUrl(baseUrl: string, href: string): string {
  if (!href) {
    return baseUrl;
  }

  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return baseUrl;
  }
}

function extractSourceOfferId(urlValue: string): string | undefined {
  try {
    const parsed = new URL(urlValue);
    const searchKeys = ["goodsCode", "seq", "id", "no", "productCd", "prdId", "gdIdx", "pCd"];

    for (const key of searchKeys) {
      const value = parsed.searchParams.get(key);
      if (value) {
        return value.slice(0, 255);
      }
    }

    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length === 0) {
      return undefined;
    }

    return parts[parts.length - 1].slice(0, 255);
  } catch {
    return undefined;
  }
}

function dedupeOffers(offers: OfferInput[]): OfferInput[] {
  const seen = new Set<string>();
  const deduped: OfferInput[] = [];

  for (const offer of offers) {
    const key = [offer.brand, offer.promoType, offer.title.toLowerCase(), offer.sourceOfferId ?? "", offer.sourceUrl].join("::");
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(offer);
  }

  return deduped;
}

function pickWorkingSelector($: CheerioAPI, selectors: string[]): string | null {
  for (const selector of selectors) {
    if ($(selector).length > 0) {
      return selector;
    }
  }

  return null;
}

function isLikelyOfferTitle(title: string): boolean {
  if (title.length < 2 || title.length > 140) {
    return false;
  }

  if (!/[\p{L}\p{N}]/u.test(title)) {
    return false;
  }

  const blockedPatterns = [
    /바로가기/i,
    /로그인/i,
    /고객센터/i,
    /매장찾기/i,
    /브랜드/i,
    /서비스안내/i,
    /family site/i,
    /quick menu/i,
    /copyright/i,
    /all rights reserved/i,
  ];

  return !blockedPatterns.some((pattern) => pattern.test(title));
}

function looksLikeOfferContext(text: string): boolean {
  const compact = cleanText(text);

  if (inferPromoType(compact) !== "UNKNOWN") {
    return true;
  }

  return /\d{1,3}(?:,\d{3})+/.test(compact);
}

async function fetchDocument(url: string): Promise<CheerioAPI> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.scrapeHttpTimeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: defaultHeaders(),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${url}`);
    }

    const html = await response.text();
    return load(html);
  } finally {
    clearTimeout(timeout);
  }
}

export async function scrapeWithParser(brand: Brand, sourceUrl: string, parser: ParserConfig): Promise<OfferInput[]> {
  const $ = await fetchDocument(sourceUrl);
  const selector = pickWorkingSelector($, parser.itemSelectors);
  if (!selector) {
    return [];
  }

  const linkSelectors = parser.linkSelectors ?? ["a[href]"];
  const nodes = $(selector).toArray().slice(0, env.scrapeMaxItems);
  const offers: OfferInput[] = [];

  for (const node of nodes) {
    const item = $(node);
    const title = cleanText(pickText(item, parser.titleSelectors));
    if (!isLikelyOfferTitle(title)) {
      continue;
    }

    const promoText = cleanText(pickText(item, parser.promoSelectors));
    const description = cleanText(pickText(item, parser.descriptionSelectors));
    const offerContext = `${promoText} ${description} ${title}`;
    if (!looksLikeOfferContext(offerContext)) {
      continue;
    }

    const href = pickAttr(item, linkSelectors, "href");
    const absoluteUrl = toAbsoluteUrl(sourceUrl, href);

    offers.push({
      brand,
      promoType: inferPromoType(offerContext),
      title,
      description: description || undefined,
      sourceUrl: absoluteUrl,
      sourceOfferId: extractSourceOfferId(absoluteUrl),
    });
  }

  return dedupeOffers(offers);
}

export function dedupeOfferInputs(offers: OfferInput[]): OfferInput[] {
  return dedupeOffers(offers);
}
