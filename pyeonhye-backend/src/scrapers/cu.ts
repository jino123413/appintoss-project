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

const CU_EVENT_AJAX_URL = "https://cu.bgfretail.com/event/plusAjax.do";
const CU_DETAIL_BASE_URL = "https://cu.bgfretail.com/product/view.do?category=event&gdIdx=";
const PAGE_SIZE_HINT = 40;
const MAX_PAGE_GUARD = 30;
const SEARCH_CONDITIONS = ["23", "24"] as const;

export const parser: ParserConfig = {
  itemSelectors: [".prodListWrap li", "a[href*='javascript:view(']"],
  titleSelectors: ["p", ".name", ".tit", "a"],
  promoSelectors: [".event", ".badge", ".cate", ".label", "a"],
  descriptionSelectors: ["strong", ".price", ".txt", "a"],
  linkSelectors: ["a[href*='javascript:view(']", "a[href]"],
};

function extractDetailId(href: string): string | undefined {
  const match = href.match(/view\((\d+)\)/i);
  return match?.[1];
}

function normalizeTitle(raw: string): string {
  return cleanText(
    raw
      .replace(/[0-9]\s*\+\s*[0-9]/g, "")
      .replace(/\d{1,3}(?:,\d{3})*(?:\s*원)?/g, "")
      .replace(/[()\[\]]/g, " "),
  );
}

function parseCuPage(html: string): OfferInput[] {
  const $ = load(html);
  const offers: OfferInput[] = [];

  $("a[href*='javascript:view(']").each((_, element) => {
    const anchor = $(element);
    const href = cleanText(anchor.attr("href"));
    const detailId = extractDetailId(href);
    if (!detailId) {
      return;
    }

    const item = anchor.closest("li");
    const rawText = cleanText(item.text() || anchor.text());
    const fallbackTitle = normalizeTitle(rawText);
    const title = cleanText(item.find("p").first().text()) || fallbackTitle;
    if (title.length < 2) {
      return;
    }

    const promoText =
      cleanText(item.find(".event, .badge, .cate, .label").first().text()) ||
      rawText.match(/[0-9]\s*\+\s*[0-9]/)?.[0] ||
      "";

    const priceText = cleanText(item.find("strong").first().text());
    const price = parsePriceValue(priceText);
    const imageSrc = cleanText(item.find("img").first().attr("src"));
    const imageUrl = imageSrc ? toAbsoluteUrl(env.scrapeSources.CU, imageSrc) : undefined;
    const sourceUrl = `${CU_DETAIL_BASE_URL}${detailId}`;

    offers.push({
      brand: "CU",
      promoType: inferPromoType(`${promoText} ${title}`),
      title,
      description: priceText ? `${priceText}원` : undefined,
      price,
      imageUrl,
      sourceUrl,
      sourceOfferId: detailId,
    });
  });

  return offers;
}

async function fetchCuPage(pageIndex: number, searchCondition: string): Promise<string> {
  const body = new URLSearchParams({
    pageIndex: String(pageIndex),
    listType: "0",
    searchCondition,
    searchKeyword: "",
    searchMainCategory: "",
    searchSubCategory: "",
    searchUseYn: "N",
    codeParent: searchCondition,
    codeId: "",
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.scrapeHttpTimeoutMs);

  try {
    const response = await fetch(CU_EVENT_AJAX_URL, {
      method: "POST",
      headers: defaultHeaders({
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "x-requested-with": "XMLHttpRequest",
        referer: env.scrapeSources.CU,
      }),
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${CU_EVENT_AJAX_URL}`);
    }

    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

export async function scrape(): Promise<OfferInput[]> {
  const collected: OfferInput[] = [];
  const maxItems = Math.max(env.scrapeMaxItems, 1);
  const maxPerCondition = Math.max(1, Math.ceil(maxItems / SEARCH_CONDITIONS.length));

  for (const searchCondition of SEARCH_CONDITIONS) {
    let collectedForCondition = 0;

    for (let pageIndex = 1; pageIndex <= MAX_PAGE_GUARD; pageIndex += 1) {
      const html = await fetchCuPage(pageIndex, searchCondition);
      const pageOffers = parseCuPage(html);
      if (pageOffers.length === 0) {
        break;
      }

      for (const offer of pageOffers) {
        if (collectedForCondition >= maxPerCondition || collected.length >= maxItems) {
          break;
        }

        collected.push(offer);
        collectedForCondition += 1;
      }

      if (collected.length >= maxItems || collectedForCondition >= maxPerCondition) {
        break;
      }

      if (pageOffers.length < PAGE_SIZE_HINT) {
        break;
      }
    }

    if (collected.length >= maxItems) {
      break;
    }
  }

  return dedupeOfferInputs(collected).slice(0, env.scrapeMaxItems);
}
