import { createReadStream, existsSync, statSync } from "node:fs";
import { mkdir, readdir } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { test, expect, type Page } from "@playwright/test";

const FRONTEND_DIST_DIR = resolve(process.cwd(), "../pyeonhye/dist/web");
const OUTPUT_DIR = resolve(process.cwd(), "../pyeonhye/docs/ux-captures");
const HOST = "127.0.0.1";
const PORT = 4317;

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".json": "application/json; charset=utf-8",
};

const IMG_COKE = "https://tqklhszfkvzk6518638.edge.naverncp.com/product/8801047161677.png";
const IMG_SNACK = "https://image.woodongs.com/imgsvr/item/GD_8800317670086_001.jpg";
const IMG_EMART = "https://msave.emart24.co.kr/cmsbo/upload/nHq/plu_image/500x500/1500000189402.JPG";

const MOCK_ITEMS = [
  {
    id: "cu-coke-500",
    name: "코카콜라 500ml",
    brand: "CU",
    promoType: "1+1",
    price: 2400,
    originalPrice: 2400,
    imageUrl: IMG_COKE,
    note: "탄산음료",
    updatedAt: "2026-02-19T09:00:00.000Z",
  },
  {
    id: "gs-coke-500",
    name: "코카콜라 500ml",
    brand: "GS25",
    promoType: "2+1",
    price: 2400,
    originalPrice: 2400,
    imageUrl: IMG_SNACK,
    note: "탄산음료",
    updatedAt: "2026-02-19T09:00:00.000Z",
  },
  {
    id: "seven-coke-500",
    name: "코카콜라 500ml",
    brand: "SEVEN",
    promoType: "DISCOUNT",
    price: 2200,
    originalPrice: 2400,
    imageUrl: IMG_COKE,
    note: "탄산음료",
    updatedAt: "2026-02-19T09:00:00.000Z",
  },
  {
    id: "e24-coke-500",
    name: "코카콜라 500ml",
    brand: "EMART24",
    promoType: "1+1",
    price: 2300,
    originalPrice: 2400,
    imageUrl: IMG_EMART,
    note: "탄산음료",
    updatedAt: "2026-02-19T09:00:00.000Z",
  },
  {
    id: "cu-sandwich",
    name: "햄치즈 샌드위치",
    brand: "CU",
    promoType: "2+1",
    price: 2900,
    originalPrice: 2900,
    imageUrl: IMG_SNACK,
    note: "간편식",
    updatedAt: "2026-02-18T08:00:00.000Z",
  },
  {
    id: "gs-sandwich",
    name: "햄치즈 샌드위치",
    brand: "GS25",
    promoType: "1+1",
    price: 2800,
    originalPrice: 2900,
    imageUrl: IMG_SNACK,
    note: "간편식",
    updatedAt: "2026-02-18T08:00:00.000Z",
  },
  {
    id: "seven-cupnoodle",
    name: "컵누들 매콤한맛",
    brand: "SEVEN",
    promoType: "DISCOUNT",
    price: 1700,
    originalPrice: 1900,
    imageUrl: IMG_COKE,
    note: "라면",
    updatedAt: "2026-02-17T08:00:00.000Z",
  },
  {
    id: "e24-water",
    name: "생수 2L",
    brand: "EMART24",
    promoType: "1+1",
    price: 1200,
    originalPrice: 1200,
    imageUrl: IMG_EMART,
    note: "음료",
    updatedAt: "2026-02-16T08:00:00.000Z",
  },
];

function sendFile(filePath: string, response: ServerResponse): void {
  const extension = extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[extension] ?? "application/octet-stream";
  response.writeHead(200, { "content-type": contentType });
  createReadStream(filePath).pipe(response);
}

function resolveRequestPath(urlPath: string): string {
  const normalizedPath = normalize(urlPath.replace(/^\/+/, ""));
  const requestedPath = resolve(FRONTEND_DIST_DIR, normalizedPath);
  if (!requestedPath.startsWith(FRONTEND_DIST_DIR)) {
    return join(FRONTEND_DIST_DIR, "index.html");
  }

  if (existsSync(requestedPath) && statSync(requestedPath).isFile()) {
    return requestedPath;
  }

  return join(FRONTEND_DIST_DIR, "index.html");
}

function createStaticServer() {
  return createServer((request: IncomingMessage, response: ServerResponse) => {
    const requestUrl = new URL(request.url ?? "/", `http://${HOST}:${PORT}`);
    const filePath = resolveRequestPath(requestUrl.pathname);
    sendFile(filePath, response);
  });
}

async function cleanOldCaptures(): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const entries = await readdir(OUTPUT_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    if (!entry.name.endsWith(".png")) {
      continue;
    }
    // Keep removal non-destructive by overwriting on capture; no deletion needed.
  }
}

async function capture(page: Page, filename: string): Promise<void> {
  await page.screenshot({
    path: join(OUTPUT_DIR, filename),
    fullPage: true,
  });
}

test.describe("ux flow capture", () => {
  let server: ReturnType<typeof createStaticServer> | null = null;

  test.beforeAll(async () => {
    if (!existsSync(FRONTEND_DIST_DIR)) {
      throw new Error(`frontend dist not found: ${FRONTEND_DIST_DIR}`);
    }

    await cleanOldCaptures();
    server = createStaticServer();

    await new Promise<void>((resolvePromise, reject) => {
      server?.once("error", reject);
      server?.listen(PORT, HOST, () => resolvePromise());
    });
  });

  test.afterAll(async () => {
    if (!server) {
      return;
    }

    await new Promise<void>((resolvePromise) => {
      server?.close(() => resolvePromise());
    });
  });

  test("home -> sort -> compare -> bookmark flow", async ({ page }) => {
    await page.route("http://localhost:3000/**", async (route) => {
      const url = new URL(route.request().url());
      const path = url.pathname;

      if (path.endsWith("/promos") || path.endsWith("/offers") || path.endsWith("/v1/offers")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json; charset=utf-8",
          body: JSON.stringify({
            items: MOCK_ITEMS,
            total: MOCK_ITEMS.length,
            refreshedAt: "2026-02-19T10:00:00.000Z",
          }),
        });
        return;
      }

      await route.fulfill({
        status: 404,
        contentType: "application/json; charset=utf-8",
        body: JSON.stringify({ message: "mocked route not found" }),
      });
    });

    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto(`http://${HOST}:${PORT}`, { waitUntil: "networkidle" });
    await expect(page.locator("[data-testid^='promo-card-']").first()).toBeVisible();

    await capture(page, "01-home-list.png");

    await page.getByTestId("sort-price_asc").click();
    await page.waitForTimeout(250);
    await capture(page, "02-sort-price-asc.png");

    await page.getByTestId("tab-compare").click();
    await expect(page.getByTestId("panel-compare")).toBeVisible();
    await capture(page, "03-compare-list.png");

    await page.locator("[data-testid^='compare-toggle-']").first().click();
    await page.waitForTimeout(250);
    await capture(page, "04-compare-expanded.png");

    await page.getByTestId("tab-list").click();
    await page.locator("[data-testid^='bookmark-toggle-']").first().click();
    await page.getByTestId("tab-bookmark").click();
    await expect(page.getByTestId("panel-bookmark")).toBeVisible();
    await capture(page, "05-bookmark-list.png");

    await page.getByTestId("bookmark-refresh-check").click();
    await page.waitForTimeout(300);
    await capture(page, "06-bookmark-refresh-result.png");
  });
});
