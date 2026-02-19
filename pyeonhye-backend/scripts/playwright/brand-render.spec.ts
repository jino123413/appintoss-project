import { expect, test, type Locator } from '@playwright/test';
import { env } from '../../src/config';
import { parser as cuParser } from '../../src/scrapers/cu';
import { parser as emart24Parser } from '../../src/scrapers/emart24';
import { parser as gs25Parser } from '../../src/scrapers/gs25';
import type { ParserConfig } from '../../src/scrapers/parser';
import { parser as sevenParser } from '../../src/scrapers/seven';

type BrandName = 'CU' | 'GS25' | 'SEVEN' | 'EMART24';

interface BrandCheckConfig {
  brand: BrandName;
  sourceUrl: string;
  parser: ParserConfig;
}

const WARNING_UNKNOWN_RATIO = Number(process.env.PW_WARNING_UNKNOWN_RATIO ?? '0.85');
const WARNING_NOISE_RATIO = Number(process.env.PW_WARNING_NOISE_RATIO ?? '0.10');
const MAX_ITEMS_TO_CHECK = Number(process.env.PW_MAX_ITEMS_TO_CHECK ?? '80');
const PICK_TEXT_TIMEOUT_MS = Number(process.env.PW_PICK_TEXT_TIMEOUT_MS ?? '800');

const noisePatterns = [/login/i, /customer/i, /store/i, /about/i, /brand/i, /quick/i, /menu/i, /family site/i];

const brandConfigs: BrandCheckConfig[] = [
  { brand: 'CU', sourceUrl: env.scrapeSources.CU, parser: cuParser },
  { brand: 'GS25', sourceUrl: env.scrapeSources.GS25, parser: gs25Parser },
  { brand: 'SEVEN', sourceUrl: env.scrapeSources.SEVEN, parser: sevenParser },
  { brand: 'EMART24', sourceUrl: env.scrapeSources.EMART24, parser: emart24Parser },
];

function cleanText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

async function pickText(locator: Locator, selectors: string[], useFallbackNodeText = false): Promise<string> {
  for (const selector of selectors) {
    const nested = locator.locator(selector).first();
    const exists = await nested.count();
    if (exists === 0) {
      continue;
    }

    const text = cleanText(await nested.innerText({ timeout: PICK_TEXT_TIMEOUT_MS }).catch(() => ''));
    if (text) {
      return text;
    }
  }

  if (!useFallbackNodeText) {
    return '';
  }

  return cleanText(await locator.innerText({ timeout: PICK_TEXT_TIMEOUT_MS }).catch(() => ''));
}

function inferPromoType(raw: string): 'ONE_PLUS_ONE' | 'TWO_PLUS_ONE' | 'DISCOUNT' | 'GIFT' | 'EVENT' | 'UNKNOWN' {
  const compact = raw.toLowerCase().replace(/\s+/g, '');

  if (/(1\+1|oneplusone)/.test(compact)) {
    return 'ONE_PLUS_ONE';
  }

  if (/(2\+1|twoplusone)/.test(compact)) {
    return 'TWO_PLUS_ONE';
  }

  if (/(discount|sale|off|coupon|할인|세일)/.test(compact)) {
    return 'DISCOUNT';
  }

  if (/(gift|freebie|present|증정|덤)/.test(compact)) {
    return 'GIFT';
  }

  if (/(event|promo|promotion|행사)/.test(compact)) {
    return 'EVENT';
  }

  return 'UNKNOWN';
}

test.describe('scrape target render and selector sanity', () => {
  test.describe.configure({ mode: 'serial' });

  for (const config of brandConfigs) {
    test(`${config.brand} page render + selector coverage`, async ({ page }, testInfo) => {
      page.setDefaultTimeout(10_000);

      const response = await page.goto(config.sourceUrl, {
        waitUntil: 'domcontentloaded',
        timeout: env.scrapeHttpTimeoutMs,
      });

      expect(response, 'page response should exist').toBeTruthy();
      expect(response?.ok(), 'page should return 2xx').toBeTruthy();

      await page.waitForTimeout(400);

      let workingSelector: string | null = null;
      let matchedCount = 0;

      for (const selector of config.parser.itemSelectors) {
        const count = await page.locator(selector).count();
        if (count > 0) {
          workingSelector = selector;
          matchedCount = count;
          break;
        }
      }

      expect(workingSelector, 'at least one item selector should match').not.toBeNull();
      expect(matchedCount, 'matched items should be greater than 5').toBeGreaterThan(5);

      const itemLocator = page.locator(workingSelector!);
      const inspectCount = Math.min(matchedCount, MAX_ITEMS_TO_CHECK);

      let classifiedCount = 0;
      let titleCount = 0;
      let promoTextCount = 0;
      let unknownCount = 0;
      let noiseCount = 0;
      const samples: string[] = [];

      for (let i = 0; i < inspectCount; i += 1) {
        const row = itemLocator.nth(i);
        const title = await pickText(row, config.parser.titleSelectors);
        const promoText = await pickText(row, config.parser.promoSelectors);

        if (!title && !promoText) {
          continue;
        }

        classifiedCount += 1;

        if (title) {
          titleCount += 1;
          if (samples.length < 5) {
            samples.push(title);
          }
          if (noisePatterns.some((pattern) => pattern.test(title))) {
            noiseCount += 1;
          }
        }

        if (promoText) {
          promoTextCount += 1;
        }

        const inferred = inferPromoType(`${promoText} ${title}`);
        if (inferred === 'UNKNOWN') {
          unknownCount += 1;
        }
      }

      const titleCoverage = classifiedCount > 0 ? titleCount / classifiedCount : 0;
      const promoCoverage = classifiedCount > 0 ? promoTextCount / classifiedCount : 0;
      const unknownRatio = classifiedCount > 0 ? unknownCount / classifiedCount : 0;
      const noiseRatio = classifiedCount > 0 ? noiseCount / classifiedCount : 0;

      expect(classifiedCount, 'classified rows should be >= 10').toBeGreaterThanOrEqual(10);
      expect(titleCoverage, 'title selector coverage should be >= 0.5').toBeGreaterThanOrEqual(0.5);

      const summary = [
        `[${config.brand}]`,
        `selector=${workingSelector}`,
        `matched=${matchedCount}`,
        `checked=${inspectCount}`,
        `classified=${classifiedCount}`,
        `titleCoverage=${titleCoverage.toFixed(2)}`,
        `promoCoverage=${promoCoverage.toFixed(2)}`,
        `unknownRatio=${unknownRatio.toFixed(2)}`,
        `noiseRatio=${noiseRatio.toFixed(2)}`,
        `sample=${samples.join(' | ')}`,
      ].join(' ');

      console.log(summary);

      if (unknownRatio > WARNING_UNKNOWN_RATIO) {
        testInfo.annotations.push({
          type: 'warning',
          description: `${config.brand} unknown ratio is high (${unknownRatio.toFixed(2)} > ${WARNING_UNKNOWN_RATIO})`,
        });
      }

      if (noiseRatio > WARNING_NOISE_RATIO) {
        testInfo.annotations.push({
          type: 'warning',
          description: `${config.brand} noise ratio is high (${noiseRatio.toFixed(2)} > ${WARNING_NOISE_RATIO})`,
        });
      }

      await page.screenshot({
        path: testInfo.outputPath(`${config.brand.toLowerCase()}-source.png`),
      });
    });
  }
});
