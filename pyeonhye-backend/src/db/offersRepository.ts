import { db } from "./knex";
import { BRANDS, type Brand, type OfferInput, type OfferRecord, type PromoType } from "../domain/offers";
import type { Knex } from "knex";

interface OfferRow {
  id: string;
  brand: Brand;
  promoType: PromoType;
  title: string;
  description: string | null;
  price: number | null;
  originalPrice: number | null;
  imageUrl: string | null;
  sourceUrl: string;
  sourceOfferId: string | null;
  validFrom: string | null;
  validTo: string | null;
  scrapedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface OfferListParams {
  brand?: Brand;
  promoType?: PromoType;
  q?: string;
  page: number;
  limit: number;
  sort: "latest" | "oldest" | "popular" | "price_asc" | "price_desc";
}

export interface OfferListResult {
  items: OfferRecord[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface RefreshMeta {
  lastRefreshAt: string | null;
  totalOffers: number;
  byBrand: Array<{ brand: Brand; count: number }>;
}

function normalizeDate(value: string | Date | null | undefined): string {
  if (!value) {
    return "";
  }
  const asDate = value instanceof Date ? value : new Date(value);
  return Number.isNaN(asDate.getTime()) ? "" : asDate.toISOString();
}

function mapRowToOfferRecord(row: OfferRow): OfferRecord {
  return {
    id: row.id,
    brand: row.brand,
    promoType: row.promoType,
    title: row.title,
    description: row.description ?? undefined,
    price: row.price ?? undefined,
    originalPrice: row.originalPrice ?? undefined,
    imageUrl: row.imageUrl ?? undefined,
    sourceUrl: row.sourceUrl,
    sourceOfferId: row.sourceOfferId ?? undefined,
    validFrom: row.validFrom ?? undefined,
    validTo: row.validTo ?? undefined,
    scrapedAt: normalizeDate(row.scrapedAt),
    createdAt: normalizeDate(row.createdAt),
    updatedAt: normalizeDate(row.updatedAt)
  };
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function applyOfferOrder(query: Knex.QueryBuilder, sort: OfferListParams["sort"]): void {
  if (sort === "oldest") {
    query.orderBy("scraped_at", "asc");
    return;
  }

  if (sort === "popular") {
    query
      .orderByRaw("count(*) over (partition by lower(title)) desc")
      .orderBy("scraped_at", "desc")
      .orderBy("id", "asc");
    return;
  }

  if (sort === "price_asc") {
    query.orderByRaw("price asc nulls last").orderBy("scraped_at", "desc");
    return;
  }

  if (sort === "price_desc") {
    query.orderByRaw("price desc nulls last").orderBy("scraped_at", "desc");
    return;
  }

  query.orderBy("scraped_at", "desc");
}

export async function isDatabaseReachable(): Promise<boolean> {
  try {
    await db.raw("select 1");
    return true;
  } catch {
    return false;
  }
}

export async function hasAnyOffers(): Promise<boolean> {
  const row = await db("offers").count<{ count: string }>("* as count").first();
  return Number(row?.count ?? 0) > 0;
}

export async function listOffers(params: OfferListParams): Promise<OfferListResult> {
  const base = db("offers");

  if (params.brand) {
    base.where("brand", params.brand);
  }

  if (params.promoType) {
    base.where("promo_type", params.promoType);
  }

  if (params.q) {
    const pattern = `%${escapeLikePattern(params.q)}%`;
    base.where((builder) => {
      builder
        .whereRaw("title ILIKE ? ESCAPE '\\\\'", [pattern])
        .orWhereRaw("coalesce(description, '') ILIKE ? ESCAPE '\\\\'", [pattern]);
    });
  }

  const totalRow = await base.clone().clearSelect().clearOrder().count<{ count: string }>("* as count").first();
  const total = Number(totalRow?.count ?? 0);

  const rows = (await base
    .clone()
    .select<OfferRow[]>([
      "id",
      "brand",
      db.ref("promo_type").as("promoType"),
      "title",
      "description",
      "price",
      db.ref("original_price").as("originalPrice"),
      db.ref("image_url").as("imageUrl"),
      db.ref("source_url").as("sourceUrl"),
      db.ref("source_offer_id").as("sourceOfferId"),
      db.ref("valid_from").as("validFrom"),
      db.ref("valid_to").as("validTo"),
      db.ref("scraped_at").as("scrapedAt"),
      db.ref("created_at").as("createdAt"),
      db.ref("updated_at").as("updatedAt")
    ])
    .modify((query) => applyOfferOrder(query, params.sort))
    .limit(params.limit)
    .offset((params.page - 1) * params.limit)) as OfferRow[];

  return {
    items: rows.map(mapRowToOfferRecord),
    page: params.page,
    limit: params.limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / params.limit)
  };
}

export async function getOfferById(id: string): Promise<OfferRecord | null> {
  const row = (await db("offers")
    .select<OfferRow[]>([
      "id",
      "brand",
      db.ref("promo_type").as("promoType"),
      "title",
      "description",
      "price",
      db.ref("original_price").as("originalPrice"),
      db.ref("image_url").as("imageUrl"),
      db.ref("source_url").as("sourceUrl"),
      db.ref("source_offer_id").as("sourceOfferId"),
      db.ref("valid_from").as("validFrom"),
      db.ref("valid_to").as("validTo"),
      db.ref("scraped_at").as("scrapedAt"),
      db.ref("created_at").as("createdAt"),
      db.ref("updated_at").as("updatedAt")
    ])
    .where({ id })
    .first()) as OfferRow | undefined;

  if (!row) {
    return null;
  }

  return mapRowToOfferRecord(row);
}

export async function getBrandCounts(): Promise<Array<{ brand: Brand; count: number }>> {
  const rows = (await db("offers")
    .select("brand")
    .count<{ brand: Brand; count: string }[]>("* as count")
    .groupBy("brand")) as Array<{ brand: Brand; count: string }>;

  const counts = new Map<Brand, number>();
  for (const brand of BRANDS) {
    counts.set(brand, 0);
  }

  for (const row of rows) {
    counts.set(row.brand, Number(row.count));
  }

  return BRANDS.map((brand) => ({ brand, count: counts.get(brand) ?? 0 }));
}

export async function getRefreshMeta(): Promise<RefreshMeta> {
  const lastRefreshRow = await db("offers").max<{ max: Date | null }>({ max: "scraped_at" }).first();
  const totalRow = await db("offers").count<{ count: string }>("* as count").first();
  const byBrand = await getBrandCounts();

  return {
    lastRefreshAt: normalizeDate(lastRefreshRow?.max),
    totalOffers: Number(totalRow?.count ?? 0),
    byBrand
  };
}

export async function replaceOffers(offers: OfferInput[]): Promise<number> {
  const now = new Date().toISOString();
  const rows = offers.map((offer) => ({
    brand: offer.brand,
    promo_type: offer.promoType,
    title: offer.title,
    description: offer.description ?? null,
    price: typeof offer.price === "number" ? Math.round(offer.price) : null,
    original_price: typeof offer.originalPrice === "number" ? Math.round(offer.originalPrice) : null,
    image_url: offer.imageUrl ?? null,
    source_url: offer.sourceUrl,
    source_offer_id: offer.sourceOfferId ?? null,
    valid_from: offer.validFrom ?? null,
    valid_to: offer.validTo ?? null,
    scraped_at: now,
    created_at: now,
    updated_at: now
  }));

  await db.transaction(async (trx) => {
    await trx("offers").del();
    if (rows.length > 0) {
      await trx.batchInsert("offers", rows, 100);
    }
  });

  return rows.length;
}
