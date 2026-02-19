import { load } from "cheerio";
import { env } from "../config";
import type { OfferInput, PromoType } from "../domain/offers";
import { cleanText, dedupeOfferInputs, defaultHeaders, inferPromoType, parsePriceValue, toAbsoluteUrl, type ParserConfig } from "./parser";

const GS25_SEARCH_URL = "https://gs25.gsretail.com/gscvs/ko/products/event-goods-search";

interface GS25Result {
  goodsNm?: string;
  price?: number | string;
  priceOld?: number | string;
  eventTypeNm?: string;
  eventTypeSp?: {
    code?: string;
    codeLowerCase?: string;
  };
  attFileNm?: string;
  attFileId?: string;
  giftGoodsNm?: string;
  giftPrice?: number | string;
}

interface GS25ResponsePayload {
  results?: GS25Result[];
  pagination?: {
    totalNumberOfResults?: number;
    numberOfPages?: number;
  };
}

interface GS25SessionContext {
  csrfToken: string;
  cookie: string;
}

export const parser: ParserConfig = {
  itemSelectors: [".tblwrap .prod_list li", ".mdprod_list li", ".prod_box"],
  titleSelectors: [".tit", ".prod_info .tit", ".img img", "img[alt]", "a"],
  promoSelectors: [".flag_box .flg01 span", ".flag_box p span", ".flag_box", ".flg01 span", ".flg02 span"],
  descriptionSelectors: [".price .cost", ".price", ".dum_txt .name", ".dum_txt .price", "p"],
  linkSelectors: ["a[href]"],
};

function parseGs25Payload(text: string): GS25ResponsePayload {
  const once = JSON.parse(text) as unknown;
  const resolved = typeof once === "string" ? (JSON.parse(once) as unknown) : once;

  if (!resolved || typeof resolved !== "object") {
    throw new Error("GS25 payload shape is invalid");
  }

  return resolved as GS25ResponsePayload;
}

function mapPromoType(result: GS25Result): PromoType {
  const code = cleanText(result.eventTypeSp?.code);

  if (code === "ONE_TO_ONE") {
    return "ONE_PLUS_ONE";
  }

  if (code === "TWO_TO_ONE") {
    return "TWO_PLUS_ONE";
  }

  if (code === "GIFT") {
    return "GIFT";
  }

  if (code === "DISCOUNT") {
    return "DISCOUNT";
  }

  return inferPromoType(`${result.eventTypeNm ?? ""} ${code}`);
}

function extractSourceOfferId(result: GS25Result): string | undefined {
  const imageUrl = cleanText(result.attFileNm);
  const imageMatch = imageUrl.match(/GD_(\d+)_/i) || imageUrl.match(/\/(\d{8,})\.(?:jpg|png|jpeg)/i);
  if (imageMatch?.[1]) {
    return imageMatch[1].slice(0, 255);
  }

  const fallback = cleanText(result.attFileId);
  if (fallback) {
    return fallback.slice(0, 255);
  }

  return undefined;
}

function toPriceText(value: number | string | undefined): string {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return `${numeric.toLocaleString("ko-KR")}원`;
  }

  const text = cleanText(String(value));
  return text ? `${text}원` : "";
}

function buildDescription(result: GS25Result): string | undefined {
  const segments: string[] = [];

  const giftName = cleanText(result.giftGoodsNm);
  if (giftName) {
    segments.push(`덤: ${giftName}`);
  }

  const giftPriceText = toPriceText(result.giftPrice);
  if (giftPriceText) {
    segments.push(`덤가: ${giftPriceText}`);
  }

  return segments.length > 0 ? segments.join(" | ") : undefined;
}

async function createSessionContext(): Promise<GS25SessionContext> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.scrapeHttpTimeoutMs);

  try {
    const response = await fetch(env.scrapeSources.GS25, {
      method: "GET",
      headers: defaultHeaders(),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${env.scrapeSources.GS25}`);
    }

    const html = await response.text();
    const $ = load(html);
    const csrfToken = cleanText($("input[name='CSRFToken']").attr("value"));
    if (!csrfToken) {
      throw new Error("GS25 CSRF token was not found");
    }

    const cookies = response.headers.getSetCookie?.() ?? [];
    const cookie = cookies.map((cookieLine) => cookieLine.split(";")[0]).join("; ");

    return {
      csrfToken,
      cookie,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchGs25Page(session: GS25SessionContext, pageNum: number, pageSize: number): Promise<GS25Result[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.scrapeHttpTimeoutMs);

  const body = new URLSearchParams({
    pageNum: String(pageNum),
    pageSize: String(pageSize),
    searchType: "",
    searchWord: "",
    parameterList: "TOTAL",
    CSRFToken: session.csrfToken,
  });

  try {
    const response = await fetch(GS25_SEARCH_URL, {
      method: "POST",
      headers: defaultHeaders({
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "x-requested-with": "XMLHttpRequest",
        referer: env.scrapeSources.GS25,
        ...(session.cookie ? { cookie: session.cookie } : {}),
      }),
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${GS25_SEARCH_URL}`);
    }

    const text = await response.text();
    const payload = parseGs25Payload(text);
    return Array.isArray(payload.results) ? payload.results : [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function scrape(): Promise<OfferInput[]> {
  const session = await createSessionContext();
  const collected: OfferInput[] = [];

  const maxItems = Math.max(env.scrapeMaxItems, 1);
  const pageSize = Math.min(200, maxItems);
  const maxPages = Math.ceil(maxItems / pageSize) + 2;

  for (let pageNum = 1; pageNum <= maxPages; pageNum += 1) {
    const rows = await fetchGs25Page(session, pageNum, pageSize);
    if (rows.length === 0) {
      break;
    }

    for (const row of rows) {
      const title = cleanText(row.goodsNm);
      if (title.length < 2) {
        continue;
      }

      collected.push({
        brand: "GS25",
        promoType: mapPromoType(row),
        title,
        description: buildDescription(row),
        price: parsePriceValue(row.price),
        originalPrice: parsePriceValue(row.priceOld),
        imageUrl: cleanText(row.attFileNm) ? toAbsoluteUrl(env.scrapeSources.GS25, cleanText(row.attFileNm)) : undefined,
        sourceUrl: env.scrapeSources.GS25,
        sourceOfferId: extractSourceOfferId(row),
      });

      if (collected.length >= maxItems) {
        break;
      }
    }

    if (collected.length >= maxItems || rows.length < pageSize) {
      break;
    }
  }

  return dedupeOfferInputs(collected).slice(0, env.scrapeMaxItems);
}
