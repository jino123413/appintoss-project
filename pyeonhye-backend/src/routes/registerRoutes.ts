import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config";
import {
  getBrandCounts,
  getOfferById,
  getRefreshMeta,
  isDatabaseReachable,
  listOffers,
  type OfferListParams,
} from "../db/offersRepository";
import { isBrand, isPromoType, type Brand, type PromoType } from "../domain/offers";
import type { ScrapeService } from "../services/scrapeService";

interface OffersQuery {
  brand?: string;
  promoType?: string;
  q?: string;
  page?: string;
  limit?: string;
  sort?: string;
}

interface OfferParams {
  id: string;
}

type PromoDisplayType = "1+1" | "2+1" | "DISCOUNT";

interface PromosResponseItem {
  id: string;
  name: string;
  brand: Brand;
  promoType: PromoDisplayType;
  note: string | undefined;
  price: number | undefined;
  originalPrice: number | undefined;
  imageUrl: string | undefined;
  sourceUrl: string | undefined;
  updatedAt: string;
}

interface PromosResponse {
  items: PromosResponseItem[];
  total: number;
  refreshedAt: string | null;
}

interface PromosCacheEntry {
  expiresAt: number;
  payload: PromosResponse;
}

interface PromosCacheStats {
  hitCount: number;
  missCount: number;
  staleCount: number;
  writeCount: number;
  clearCount: number;
  lastClearedAt: string | null;
}

function parsePositiveInt(input: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(input);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const rounded = Math.floor(parsed);
  if (rounded < min) {
    return min;
  }
  if (rounded > max) {
    return max;
  }

  return rounded;
}

function extractBearerToken(authorization?: string): string {
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return "";
  }

  return authorization.slice("Bearer ".length).trim();
}

function toPromoDisplayType(promoType: PromoType): PromoDisplayType {
  if (promoType === "ONE_PLUS_ONE") {
    return "1+1";
  }

  if (promoType === "TWO_PLUS_ONE") {
    return "2+1";
  }

  return "DISCOUNT";
}

function parsePromoTypeAlias(rawPromoType?: string): PromoType | undefined | null {
  if (!rawPromoType) {
    return undefined;
  }

  const rawToken = rawPromoType.trim();
  if (!rawToken) {
    return undefined;
  }

  const upper = rawToken.toUpperCase();
  if (isPromoType(upper)) {
    return upper;
  }

  const compact = upper.replace(/[\s_-]/g, "");
  if (compact === "1+1" || compact === "ONEPLUSONE") {
    return "ONE_PLUS_ONE";
  }

  if (compact === "2+1" || compact === "TWOPLUSONE") {
    return "TWO_PLUS_ONE";
  }

  if (compact === "DISCOUNT" || compact === "SALE") {
    return "DISCOUNT";
  }

  if (compact === "GIFT") {
    return "GIFT";
  }

  if (compact === "EVENT") {
    return "EVENT";
  }

  if (compact === "UNKNOWN") {
    return "UNKNOWN";
  }

  return null;
}

function parseSort(rawSort?: string): OfferListParams["sort"] | null {
  if (!rawSort) {
    return "latest";
  }

  const normalized = rawSort.trim().toLowerCase();
  if (!normalized) {
    return "latest";
  }

  if (normalized === "latest" || normalized === "oldest") {
    return normalized;
  }

  if (normalized === "popular" || normalized === "hot") {
    return "popular";
  }

  if (normalized === "price_asc" || normalized === "priceasc" || normalized === "price-low" || normalized === "price_low") {
    return "price_asc";
  }

  if (normalized === "price_desc" || normalized === "pricedesc" || normalized === "price-high" || normalized === "price_high") {
    return "price_desc";
  }

  return null;
}

function buildPromosCacheKey(params: {
  brand?: Brand;
  promoType?: PromoType;
  q?: string;
  sort: OfferListParams["sort"];
}): string {
  return [params.brand ?? "", params.promoType ?? "", params.q ?? "", params.sort].join("|");
}

export function registerRoutes(app: FastifyInstance, scrapeService: ScrapeService): void {
  const promosCache = new Map<string, PromosCacheEntry>();
  const promosCacheStats: PromosCacheStats = {
    hitCount: 0,
    missCount: 0,
    staleCount: 0,
    writeCount: 0,
    clearCount: 0,
    lastClearedAt: null
  };

  const clearPromosCache = () => {
    promosCache.clear();
    promosCacheStats.clearCount += 1;
    promosCacheStats.lastClearedAt = new Date().toISOString();
  };

  app.get("/health", async (_request, reply) => {
    const dbHealthy = await isDatabaseReachable();
    if (!dbHealthy) {
      return reply.status(503).send({
        status: "error",
        database: "unreachable",
        now: new Date().toISOString()
      });
    }

    return reply.send({
      status: "ok",
      database: "reachable",
      now: new Date().toISOString()
    });
  });

  app.get("/v1/brands", async () => {
    const brands = await getBrandCounts();
    return { brands };
  });

  app.get("/v1/meta/refresh", async () => {
    const meta = await getRefreshMeta();
    const totalLookups = promosCacheStats.hitCount + promosCacheStats.missCount;
    const hitRate = totalLookups === 0
      ? null
      : Number(((promosCacheStats.hitCount / totalLookups) * 100).toFixed(2));

    return {
      ...meta,
      inMemoryLastRun: scrapeService.getLastRun(),
      promosCache: {
        enabled: env.promosCacheTtlMs > 0,
        ttlMs: env.promosCacheTtlMs,
        entries: promosCache.size,
        hitCount: promosCacheStats.hitCount,
        missCount: promosCacheStats.missCount,
        staleCount: promosCacheStats.staleCount,
        writeCount: promosCacheStats.writeCount,
        clearCount: promosCacheStats.clearCount,
        hitRatePercent: hitRate,
        lastClearedAt: promosCacheStats.lastClearedAt
      }
    };
  });

  app.get("/promos", async (request: FastifyRequest<{ Querystring: OffersQuery }>, reply: FastifyReply) => {
    const rawBrand = request.query.brand?.trim().toUpperCase();
    let brand: Brand | undefined;

    if (rawBrand) {
      if (!isBrand(rawBrand)) {
        return reply.status(400).send({
          message: "Invalid brand. Allowed: CU, GS25, SEVEN, EMART24"
        });
      }
      brand = rawBrand;
    }

    const promoType = parsePromoTypeAlias(request.query.promoType);
    if (promoType === null) {
      return reply.status(400).send({
        message: "Invalid promoType. Allowed: 1+1, 2+1, DISCOUNT, ONE_PLUS_ONE, TWO_PLUS_ONE, GIFT, EVENT, UNKNOWN"
      });
    }

    const sort = parseSort(request.query.sort);
    if (sort === null) {
      return reply.status(400).send({
        message: "Invalid sort. Allowed: latest, oldest, popular, price_asc, price_desc"
      });
    }

    const q = request.query.q?.trim() || undefined;
    const cacheTtlMs = env.promosCacheTtlMs;
    const cacheKey = buildPromosCacheKey({
      brand,
      promoType: promoType ?? undefined,
      q: q?.toLowerCase(),
      sort
    });

    if (cacheTtlMs > 0) {
      const now = Date.now();
      const cached = promosCache.get(cacheKey);
      if (cached && cached.expiresAt > now) {
        promosCacheStats.hitCount += 1;
        return reply.send(cached.payload);
      }
      promosCacheStats.missCount += 1;
      if (cached) {
        promosCacheStats.staleCount += 1;
        promosCache.delete(cacheKey);
      }
    }

    const result = await listOffers({
      brand,
      promoType: promoType ?? undefined,
      q,
      page: 1,
      limit: 5000,
      sort
    });

    const payload: PromosResponse = {
      items: result.items.map((offer) => ({
        id: offer.id,
        name: offer.title,
        brand: offer.brand,
        promoType: toPromoDisplayType(offer.promoType),
        note: offer.description,
        price: offer.price,
        originalPrice: offer.originalPrice,
        imageUrl: offer.imageUrl,
        sourceUrl: offer.sourceUrl,
        updatedAt: offer.scrapedAt
      })),
      total: result.total,
      refreshedAt: result.items[0]?.scrapedAt ?? null
    };

    if (cacheTtlMs > 0) {
      promosCache.set(cacheKey, {
        expiresAt: Date.now() + cacheTtlMs,
        payload
      });
      promosCacheStats.writeCount += 1;
    }

    return reply.send(payload);
  });

  app.get("/v1/offers", async (request: FastifyRequest<{ Querystring: OffersQuery }>, reply: FastifyReply) => {
    const rawBrand = request.query.brand?.trim().toUpperCase();
    let brand: Brand | undefined;
    let promoType: PromoType | undefined;

    if (rawBrand) {
      if (!isBrand(rawBrand)) {
        return reply.status(400).send({
          message: "Invalid brand. Allowed: CU, GS25, SEVEN, EMART24"
        });
      }
      brand = rawBrand;
    }

    const normalizedPromoType = parsePromoTypeAlias(request.query.promoType);
    if (normalizedPromoType === null) {
      return reply.status(400).send({
        message: "Invalid promoType. Allowed: ONE_PLUS_ONE, TWO_PLUS_ONE, DISCOUNT, GIFT, EVENT, UNKNOWN"
      });
    }
    promoType = normalizedPromoType;

    const sort = parseSort(request.query.sort);
    if (sort === null) {
      return reply.status(400).send({
        message: "Invalid sort. Allowed: latest, oldest, popular, price_asc, price_desc"
      });
    }

    const page = parsePositiveInt(request.query.page, 1, 1, 1000000);
    const limit = parsePositiveInt(request.query.limit, 20, 1, 100);
    const q = request.query.q?.trim() || undefined;

    const result = await listOffers({
      brand,
      promoType,
      q,
      page,
      limit,
      sort
    });

    return reply.send(result);
  });

  app.get("/v1/offers/:id", async (request: FastifyRequest<{ Params: OfferParams }>, reply: FastifyReply) => {
    const offer = await getOfferById(request.params.id);
    if (!offer) {
      return reply.status(404).send({ message: "Offer not found" });
    }

    return reply.send(offer);
  });

  app.post("/v1/admin/scrape", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!env.adminBearerToken) {
      return reply.status(503).send({ message: "ADMIN_BEARER_TOKEN is not configured" });
    }

    const token = extractBearerToken(request.headers.authorization);
    if (!token || token !== env.adminBearerToken) {
      return reply.status(401).send({ message: "Unauthorized" });
    }

    const result = await scrapeService.refreshOffers("manual");
    clearPromosCache();
    return reply.send({ ok: true, result });
  });
}
