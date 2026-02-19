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

const SEVEN_MORE_URL = "https://www.7-eleven.co.kr/product/listMoreAjax.asp";
const PAGE_SIZE = 13;
const MAX_PAGE_GUARD = 30;

const TAB_CONFIGS = [
  { tab: "1", promoHint: "1+1" },
  { tab: "2", promoHint: "2+1" },
  { tab: "3", promoHint: "증정" },
  { tab: "4", promoHint: "할인" },
] as const;

export const parser: ParserConfig = {
  itemSelectors: ["#listUl > li", ".img_list_01 #listUl > li", ".img_list_01 li"],
  titleSelectors: [".name", ".tit_product", ".txt_product", "img[alt]"],
  promoSelectors: [".tag_list_01 li", ".img_list_tit_02"],
  descriptionSelectors: [".price span", ".price_list span", ".infowrap .price span"],
  linkSelectors: ["a.btn_product_01[href*='fncGoView']", "a[href]"],
};

function extractProductCode(href: string): string | undefined {
  const match = href.match(/fncGoView(?:Pre)?\('([^']+)'\)/i);
  return match?.[1];
}

function buildSourceUrl(code: string | undefined): string {
  if (!code) {
    return env.scrapeSources.SEVEN;
  }

  return `https://www.7-eleven.co.kr/product/presentView.asp?pCd=${code}`;
}

function parseSevenPage(html: string, promoHint: string): OfferInput[] {
  const $ = load(html);
  const offers: OfferInput[] = [];

  $("li").each((_, element) => {
    const item = $(element);
    const hasProductMarker =
      item.find(".name").length > 0 || item.find(".tit_product").length > 0 || item.find("a.btn_product_01").length > 0;
    if (!hasProductMarker) {
      return;
    }

    const title =
      cleanText(item.find(".name").first().text()) ||
      cleanText(item.find(".tit_product").first().text()) ||
      cleanText(item.find("img").first().attr("alt"));

    if (title.length < 2) {
      return;
    }

    const promoText = cleanText(item.find(".tag_list_01 li").first().text()) || promoHint;
    const priceText =
      cleanText(item.find(".price span").first().text()) ||
      cleanText(item.find(".price_list span").first().text());
    const price = parsePriceValue(priceText);
    const imageSrc = cleanText(item.find("img").first().attr("src"));
    const imageUrl = imageSrc ? toAbsoluteUrl(env.scrapeSources.SEVEN, imageSrc) : undefined;

    const linkHref = cleanText(item.find("a.btn_product_01").attr("href"));
    const productCode = extractProductCode(linkHref);

    offers.push({
      brand: "SEVEN",
      promoType: inferPromoType(`${promoText} ${title}`),
      title,
      description: priceText ? `${priceText}원` : undefined,
      price,
      imageUrl,
      sourceUrl: buildSourceUrl(productCode),
      sourceOfferId: productCode,
    });
  });

  return offers;
}

async function fetchSevenPage(tab: string, page: number): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.scrapeHttpTimeoutMs);

  const body = new URLSearchParams({
    intPageSize: String(PAGE_SIZE),
    intCurrPage: String(page),
    cateCd1: "",
    cateCd2: "",
    cateCd3: "",
    pTab: tab,
  });

  try {
    const response = await fetch(SEVEN_MORE_URL, {
      method: "POST",
      headers: defaultHeaders({
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "x-requested-with": "XMLHttpRequest",
        referer: env.scrapeSources.SEVEN,
      }),
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${SEVEN_MORE_URL}`);
    }

    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

export async function scrape(): Promise<OfferInput[]> {
  const collected: OfferInput[] = [];
  const seen = new Set<string>();
  const maxItems = Math.max(env.scrapeMaxItems, 1);
  const maxPerTab = Math.max(1, Math.ceil(maxItems / TAB_CONFIGS.length));

  for (const tabConfig of TAB_CONFIGS) {
    let collectedForTab = 0;

    for (let page = 1; page <= MAX_PAGE_GUARD; page += 1) {
      const html = await fetchSevenPage(tabConfig.tab, page);
      const parsed = parseSevenPage(html, tabConfig.promoHint);
      if (parsed.length === 0) {
        break;
      }

      let addedOnPage = 0;
      for (const offer of parsed) {
        const key = `${offer.promoType}|${offer.title}|${offer.sourceOfferId ?? ""}`;
        if (seen.has(key)) {
          continue;
        }

        seen.add(key);
        collected.push(offer);
        addedOnPage += 1;
        collectedForTab += 1;

        if (collected.length >= maxItems || collectedForTab >= maxPerTab) {
          break;
        }
      }

      if (collected.length >= maxItems || collectedForTab >= maxPerTab) {
        break;
      }

      if (addedOnPage === 0) {
        break;
      }
    }

    if (collected.length >= maxItems) {
      break;
    }
  }

  return dedupeOfferInputs(collected).slice(0, env.scrapeMaxItems);
}
