import dotenv from "dotenv";

dotenv.config();

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

export const env = {
  port: parseNumber(process.env.PORT, 3000),
  logLevel: process.env.LOG_LEVEL ?? "info",
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  databaseUrl: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/pyeonhye",
  adminBearerToken: process.env.ADMIN_BEARER_TOKEN ?? "",
  promosCacheTtlMs: parseNumber(process.env.PROMOS_CACHE_TTL_MS, 30000),
  schedulerEnabled: parseBoolean(process.env.SCHEDULER_ENABLED, true),
  scrapeHttpTimeoutMs: parseNumber(process.env.SCRAPE_HTTP_TIMEOUT_MS, 15000),
  scrapeMaxItems: parseNumber(process.env.SCRAPE_MAX_ITEMS, 120),
  scrapeSources: {
    CU: process.env.SCRAPE_CU_URL ?? "https://cu.bgfretail.com/event/plus.do",
    GS25: process.env.SCRAPE_GS25_URL ?? "https://gs25.gsretail.com/gscvs/ko/products/event-goods",
    SEVEN: process.env.SCRAPE_SEVEN_URL ?? "https://www.7-eleven.co.kr/product/presentList.asp",
    EMART24: process.env.SCRAPE_EMART24_URL ?? "https://www.emart24.co.kr/goods/event"
  }
};

export type AppEnv = typeof env;
