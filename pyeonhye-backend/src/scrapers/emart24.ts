import { load } from "cheerio";
import { env } from "../config";
import type { OfferInput } from "../domain/offers";
import {
  cleanText,
  dedupeOfferInputs,
  defaultHeaders,
  inferPromoType,
  parsePriceValue,
  toAbsoluteUrl,
  type ParserConfig,
} from "./parser";

const EMART24_PROMO_CLASS_HINTS = [
  { className: "onepl", label: "1+1" },
  { className: "twopl", label: "2+1" },
  { className: "threepl", label: "3+1" },
  { className: "sale", label: "세일" },
  { className: "gift", label: "증정" },
] as const;

const EMART24_CATEGORIES = [
  { seq: "1", promoHint: "1+1" },
  { seq: "2", promoHint: "2+1" },
  { seq: "3", promoHint: "3+1" },
  { seq: "4", promoHint: "세일" },
  { seq: "12", promoHint: "행사" },
] as const;

export const parser: ParserConfig = {
  itemSelectors: [".itemList .itemWrap", ".itemWrap"],
  titleSelectors: [".itemtitle a"],
  promoSelectors: [".itemTit .floatR", ".itemTit span[class*='pl']", ".itemTit span"],
  descriptionSelectors: [".price", ".itemtitle a"],
  linkSelectors: [".itemtitle a[href]", "a[href]"],
};

function inferPromoText(item: any, promoHint: string): string {
  for (const hint of EMART24_PROMO_CLASS_HINTS) {
    if (item.find(`.itemTit .${hint.className}`).length > 0) {
      return hint.label;
    }
  }

  const renderedPromo = cleanText(item.find(".itemTit .floatR").first().text());
  if (!renderedPromo) {
    return promoHint;
  }

  return inferPromoType(renderedPromo) === "UNKNOWN" ? promoHint : renderedPromo;
}

function extractSourceOfferId(item: any): string | undefined {
  const imageUrl = cleanText(item.find(".itemSpImg img").first().attr("src"));
  const imageMatch = imageUrl.match(/\/(\d{8,})\.(?:jpg|jpeg|png)/i);
  if (imageMatch?.[1]) {
    return imageMatch[1].slice(0, 255);
  }

  return undefined;
}

function buildCategoryUrl(categorySeq: string): string {
  const url = new URL(env.scrapeSources.EMART24);
  url.searchParams.set("search", "");
  url.searchParams.set("category_seq", categorySeq);
  url.searchParams.set("base_category_seq", "");
  url.searchParams.set("align", "");
  return url.toString();
}

async function fetchCategoryHtml(url: string): Promise<string> {
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

    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function parseCategoryHtml(html: string, sourceUrl: string, promoHint: string): OfferInput[] {
  const $ = load(html);
  const offers: OfferInput[] = [];

  $(".itemList .itemWrap").each((_, element) => {
    const item = $(element);

    const title = cleanText(item.find(".itemtitle a").first().text());
    if (title.length < 2) {
      return;
    }

    const promoText = inferPromoText(item, promoHint);
    const priceText = cleanText(item.find(".price").first().text());
    const price = parsePriceValue(priceText);
    const imageSrc = cleanText(item.find(".itemSpImg img").first().attr("src"));
    const imageUrl = imageSrc ? toAbsoluteUrl(sourceUrl, imageSrc) : undefined;
    const href = cleanText(item.find(".itemtitle a").first().attr("href"));
    const linkUrl = href && href !== "#none" ? toAbsoluteUrl(sourceUrl, href) : sourceUrl;

    offers.push({
      brand: "EMART24",
      promoType: inferPromoType(`${promoText} ${title}`),
      title,
      description: priceText ? (priceText.includes("원") ? priceText : `${priceText}원`) : undefined,
      price,
      imageUrl,
      sourceUrl: linkUrl,
      sourceOfferId: extractSourceOfferId(item),
    });
  });

  return offers;
}

export async function scrape(): Promise<OfferInput[]> {
  const collected: OfferInput[] = [];
  const maxItems = Math.max(env.scrapeMaxItems, 1);
  const maxPerCategory = Math.max(1, Math.ceil(maxItems / EMART24_CATEGORIES.length));

  for (const category of EMART24_CATEGORIES) {
    const url = buildCategoryUrl(category.seq);
    const html = await fetchCategoryHtml(url);
    const parsed = parseCategoryHtml(html, url, category.promoHint);

    let added = 0;
    for (const offer of parsed) {
      if (collected.length >= maxItems || added >= maxPerCategory) {
        break;
      }

      collected.push(offer);
      added += 1;
    }

    if (collected.length >= maxItems) {
      break;
    }
  }

  return dedupeOfferInputs(collected).slice(0, env.scrapeMaxItems);
}
