import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

type Sample = {
  status: number;
  latencyMs: number;
  ok: boolean;
};

interface Metrics {
  count: number;
  okCount: number;
  errorCount: number;
  minMs: number;
  maxMs: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function computeMetrics(samples: Sample[]): Metrics {
  if (samples.length === 0) {
    return {
      count: 0,
      okCount: 0,
      errorCount: 0,
      minMs: 0,
      maxMs: 0,
      avgMs: 0,
      p50Ms: 0,
      p95Ms: 0,
    };
  }

  const latencies = samples.map((sample) => sample.latencyMs).sort((a, b) => a - b);
  const total = latencies.reduce((acc, value) => acc + value, 0);
  const percentile = (p: number): number => {
    const index = Math.max(0, Math.ceil(latencies.length * p) - 1);
    return latencies[index];
  };

  const okCount = samples.filter((sample) => sample.ok).length;

  return {
    count: samples.length,
    okCount,
    errorCount: samples.length - okCount,
    minMs: Number(latencies[0].toFixed(2)),
    maxMs: Number(latencies[latencies.length - 1].toFixed(2)),
    avgMs: Number((total / samples.length).toFixed(2)),
    p50Ms: Number(percentile(0.5).toFixed(2)),
    p95Ms: Number(percentile(0.95).toFixed(2)),
  };
}

async function requestOnce(url: string, timeoutMs: number): Promise<Sample> {
  const startedAt = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    const latencyMs = performance.now() - startedAt;
    return {
      status: response.status,
      latencyMs,
      ok: response.ok,
    };
  } catch {
    const latencyMs = performance.now() - startedAt;
    return {
      status: 0,
      latencyMs,
      ok: false,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function runSequential(url: string, count: number, timeoutMs: number): Promise<Sample[]> {
  const samples: Sample[] = [];

  for (let i = 0; i < count; i += 1) {
    samples.push(await requestOnce(url, timeoutMs));
  }

  return samples;
}

async function runConcurrent(
  url: string,
  count: number,
  concurrency: number,
  timeoutMs: number,
): Promise<{ samples: Sample[]; elapsedMs: number }> {
  const startedAt = performance.now();
  const samples: Sample[] = [];
  let issued = 0;

  const worker = async (): Promise<void> => {
    while (issued < count) {
      const current = issued;
      issued += 1;
      if (current >= count) {
        return;
      }

      const sample = await requestOnce(url, timeoutMs);
      samples.push(sample);
    }
  };

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  return {
    samples,
    elapsedMs: performance.now() - startedAt,
  };
}

async function main(): Promise<void> {
  const baseUrl = (process.env.PERF_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
  const path = process.env.PERF_PATH ?? "/promos?limit=50";
  const sampleCount = parsePositiveInt(process.env.PERF_REQUESTS, 40);
  const concurrency = parsePositiveInt(process.env.PERF_CONCURRENCY, 20);
  const timeoutMs = parsePositiveInt(process.env.PERF_TIMEOUT_MS, 10000);

  const targetUrl = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const sequentialSamples = await runSequential(targetUrl, sampleCount, timeoutMs);
  const sequential = computeMetrics(sequentialSamples);

  const concurrentResult = await runConcurrent(targetUrl, sampleCount, concurrency, timeoutMs);
  const concurrent = computeMetrics(concurrentResult.samples);
  const throughputRps = Number((sampleCount / (concurrentResult.elapsedMs / 1000)).toFixed(2));

  const createdAt = new Date();
  const createdAtIso = createdAt.toISOString();
  const stamp = createdAtIso.replace(/[:.]/g, "-");

  const payload = {
    createdAt: createdAtIso,
    targetUrl,
    sampleCount,
    concurrency,
    timeoutMs,
    sequential,
    concurrent: {
      ...concurrent,
      elapsedMs: Number(concurrentResult.elapsedMs.toFixed(2)),
      throughputRps,
    },
  };

  const outDir = resolve(process.cwd(), "test-results", "perf");
  await mkdir(outDir, { recursive: true });
  const outPath = resolve(outDir, `api-perf-${stamp}.json`);
  await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  console.log(`[perf] target=${targetUrl}`);
  console.log(
    `[perf] sequential count=${sequential.count} ok=${sequential.okCount} err=${sequential.errorCount} avg=${sequential.avgMs}ms p50=${sequential.p50Ms}ms p95=${sequential.p95Ms}ms max=${sequential.maxMs}ms`,
  );
  console.log(
    `[perf] concurrent count=${concurrent.count} ok=${concurrent.okCount} err=${concurrent.errorCount} avg=${concurrent.avgMs}ms p50=${concurrent.p50Ms}ms p95=${concurrent.p95Ms}ms max=${concurrent.maxMs}ms rps=${throughputRps}`,
  );
  if (sequential.errorCount > 0 || concurrent.errorCount > 0) {
    console.warn("[perf] warning=non-2xx responses or network failures detected; validate target health before comparing.");
  }
  console.log(`[perf] output=${outPath}`);
}

void main();
