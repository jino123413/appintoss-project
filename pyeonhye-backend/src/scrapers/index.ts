import type { Brand, OfferInput } from "../domain/offers";
import * as cuScraper from "./cu";
import * as gs25Scraper from "./gs25";
import * as sevenScraper from "./seven";
import * as emart24Scraper from "./emart24";

export interface ScraperModule {
  brand: Brand;
  scrape: () => Promise<OfferInput[]>;
}

export const scraperModules: ScraperModule[] = [
  { brand: "CU", scrape: cuScraper.scrape },
  { brand: "GS25", scrape: gs25Scraper.scrape },
  { brand: "SEVEN", scrape: sevenScraper.scrape },
  { brand: "EMART24", scrape: emart24Scraper.scrape }
];
