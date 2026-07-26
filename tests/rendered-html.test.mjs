import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`https://iban.example${path}`, {
      headers: {
        accept: path.startsWith("/api/") ? "application/json" : "text/html",
        host: "iban.example",
      },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("validator API uses stable English country metadata", async () => {
  const response = await render(
    "/api/validate?iban=DE89370400440532013000",
  );
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.valid, true);
  assert.equal(result.country.code, "DE");
  assert.equal(result.country.name, "Germany");
});

test("server-renders the complete IBAN tool", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>IBAN DevTools/);
  assert.match(html, /<html[^>]*lang="en"[^>]*dir="ltr"/);
  assert.match(html, /One identity/);
  assert.match(html, /Generator/);
  assert.match(html, /Validate &amp; inspect/);
  assert.match(html, /Bank account &amp; card/);
  assert.match(html, /Generate complete test identity/);
  assert.match(html, /Precise generation settings/);
  assert.match(html, /Random seed/);
  assert.match(html, /Identity &amp; address overrides/);
  assert.match(html, /100% local/);
  assert.match(html, /software development, testing and education only/);
  assert.match(html, /English/);
  assert.match(html, /Español/);
  assert.match(html, /Français/);
  assert.match(html, /العربية/);
  assert.match(html, /繁體中文/);
  assert.match(html, /简体中文/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("ships portable deployment configuration and social metadata", async () => {
  const [layout, page, globalData, germanData, serviceWorker, vercelConfig, wranglerConfig, packageJson] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/global-test-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/german-test-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
    readFile(new URL("../vercel.json", import.meta.url), "utf8"),
    readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /og\.png/);
  assert.match(layout, /export const metadata/);
  assert.doesNotMatch(layout, /next\/headers|generateMetadata/);
  assert.match(vercelConfig, /"framework": "nextjs"/);
  assert.match(wranglerConfig, /"binding": "ASSETS"/);
  assert.match(packageJson, /"build:cloudflare"/);
  assert.match(packageJson, /"build:vercel"/);
  assert.match(page, /generateCompleteIdentity/);
  assert.doesNotMatch(page, /[一-龥]/);
  assert.match(globalData, /generateSyntheticIdentity/);
  assert.match(globalData, /IDENTITY_COUNTRIES/);
  assert.match(germanData, /calculateGermanTaxIdCheckDigit/);
  assert.doesNotMatch(serviceWorker, /await cache\.put/);
  assert.match(serviceWorker, /event\.request\.mode === "navigate"/);
  assert.match(serviceWorker, /Response\.error\(\)/);
});
