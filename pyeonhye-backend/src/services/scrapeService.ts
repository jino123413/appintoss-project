import type { FastifyBaseLogger } from "fastify";
import type { Brand, OfferInput } from "../domain/offers";
import { replaceOffers } from "../db/offersRepository";
import { scraperModules } from "../scrapers";
import { getFallbackOffers } from "../scrapers/fallback";
import { dedupeOfferInputs } from "../scrapers/parser";

export type ScrapeTrigger = "manual" | "schedule" | "bootstrap";

export interface ScrapeRunResult {
  trigger: ScrapeTrigger;
  startedAt: string;
  endedAt: string;
  insertedCount: number;
  fallbackBrands: Brand[];
  warnings: string[];
}

export class ScrapeService {
  private inFlight: Promise<ScrapeRunResult> | null = null;
  private lastRun: ScrapeRunResult | null = null;

  public constructor(private readonly logger: FastifyBaseLogger) {}

  public getLastRun(): ScrapeRunResult | null {
    return this.lastRun;
  }

  public async refreshOffers(trigger: ScrapeTrigger): Promise<ScrapeRunResult> {
    if (this.inFlight) {
      this.logger.info({ trigger }, "scrape already running; reusing in-flight run");
      return this.inFlight;
    }

    this.inFlight = this.execute(trigger).finally(() => {
      this.inFlight = null;
    });

    return this.inFlight;
  }

  private async execute(trigger: ScrapeTrigger): Promise<ScrapeRunResult> {
    const startedAt = new Date().toISOString();
    const fallbackBrands: Brand[] = [];
    const warnings: string[] = [];
    const combinedOffers: OfferInput[] = [];
    let hasRealScrapedOffers = false;

    for (const module of scraperModules) {
      try {
        const offers = await module.scrape();
        if (offers.length === 0) {
          fallbackBrands.push(module.brand);
          warnings.push(`${module.brand}: no offers from scraper, inserted fallback sample offers`);
          combinedOffers.push(...getFallbackOffers(module.brand));
          continue;
        }

        hasRealScrapedOffers = true;
        combinedOffers.push(...offers);
      } catch (error) {
        fallbackBrands.push(module.brand);
        warnings.push(`${module.brand}: scraper failed, inserted fallback sample offers`);
        this.logger.error({ err: error, brand: module.brand }, "scraper failed");
        combinedOffers.push(...getFallbackOffers(module.brand));
      }
    }

    const deduped = dedupeOfferInputs(combinedOffers);
    if (deduped.length === 0) {
      throw new Error("Scrape produced no offers after fallback logic");
    }
    if (!hasRealScrapedOffers && trigger !== "bootstrap") {
      throw new Error("All brand scrapers failed or returned empty results; keeping previous data");
    }

    const insertedCount = await replaceOffers(deduped);
    const endedAt = new Date().toISOString();

    const result: ScrapeRunResult = {
      trigger,
      startedAt,
      endedAt,
      insertedCount,
      fallbackBrands,
      warnings
    };

    this.lastRun = result;
    this.logger.info({ trigger, insertedCount, fallbackBrands }, "scrape run completed");

    return result;
  }
}
