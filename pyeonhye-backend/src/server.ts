import { buildApp } from "./app";
import { env } from "./config";
import { hasAnyOffers } from "./db/offersRepository";
import { db } from "./db/knex";
import { runMigrations } from "./db/migrate";
import { startWeeklyScheduler } from "./services/scheduler";

async function bootstrap(): Promise<void> {
  const { app, scrapeService } = buildApp();

  await runMigrations();

  const existingOffers = await hasAnyOffers();
  if (!existingOffers) {
    try {
      await scrapeService.refreshOffers("bootstrap");
      app.log.info("bootstrap scrape completed because offers table was empty");
    } catch (error) {
      app.log.error({ err: error }, "bootstrap scrape failed, API will still start with existing DB state");
    }
  }

  const stopScheduler = startWeeklyScheduler({
    enabled: env.schedulerEnabled,
    scrapeService,
    logger: app.log
  });

  const shutdown = async (signal: NodeJS.Signals) => {
    app.log.info({ signal }, "shutdown signal received");
    stopScheduler();
    await app.close();
    await db.destroy();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  await app.listen({
    host: "0.0.0.0",
    port: env.port
  });

  app.log.info({ port: env.port }, "pyeonhye backend started");
}

bootstrap().catch(async (error: unknown) => {
  console.error(error);
  await db.destroy();
  process.exit(1);
});
