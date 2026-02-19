import type { FastifyBaseLogger } from "fastify";
import { DateTime } from "luxon";
import cron from "node-cron";
import type { ScrapeService } from "./scrapeService";

interface SchedulerOptions {
  enabled: boolean;
  scrapeService: ScrapeService;
  logger: FastifyBaseLogger;
}

const RETRY_DELAYS_MS = [0, 10 * 60 * 1000, 30 * 60 * 1000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runWithRetry(scrapeService: ScrapeService, logger: FastifyBaseLogger): Promise<void> {
  let lastError: unknown;

  for (let i = 0; i < RETRY_DELAYS_MS.length; i += 1) {
    const delay = RETRY_DELAYS_MS[i];
    const attempt = i + 1;

    if (delay > 0) {
      const nextAttemptAt = DateTime.now().setZone("Asia/Seoul").plus({ milliseconds: delay }).toISO();
      logger.warn({ attempt, nextAttemptAt }, "scheduled scrape retry queued");
      await sleep(delay);
    }

    try {
      await scrapeService.refreshOffers("schedule");
      logger.info({ attempt }, "scheduled scrape succeeded");
      return;
    } catch (error) {
      lastError = error;
      logger.error({ err: error, attempt }, "scheduled scrape attempt failed");
    }
  }

  throw lastError instanceof Error ? lastError : new Error("scheduled scrape failed");
}

export function startWeeklyScheduler(options: SchedulerOptions): () => void {
  if (!options.enabled) {
    options.logger.info("weekly scheduler disabled by env");
    return () => {};
  }

  const task = cron.schedule(
    "0 6 * * 1",
    async () => {
      try {
        await runWithRetry(options.scrapeService, options.logger);
      } catch (error) {
        options.logger.error({ err: error }, "all scheduled scrape retries failed, previous data kept");
      }
    },
    {
      timezone: "Asia/Seoul"
    }
  );

  task.start();
  options.logger.info("weekly scheduler started: Monday 06:00 Asia/Seoul");

  return () => {
    task.stop();
  };
}
