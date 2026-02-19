import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./config";
import { registerRoutes } from "./routes/registerRoutes";
import { ScrapeService } from "./services/scrapeService";

function parseCorsOrigin(value: string): true | string[] {
  const normalized = value.trim();
  if (!normalized || normalized === "*") {
    return true;
  }

  const origins = normalized
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : true;
}

export function buildApp() {
  const app = Fastify({
    logger: {
      level: env.logLevel
    }
  });

  app.register(cors, {
    origin: parseCorsOrigin(env.corsOrigin),
    methods: ["GET", "POST", "OPTIONS"]
  });

  const scrapeService = new ScrapeService(app.log);
  registerRoutes(app, scrapeService);

  return {
    app,
    scrapeService
  };
}
