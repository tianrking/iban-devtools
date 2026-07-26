import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("https://iban.example/", {
      headers: { accept: "text/html", host: "iban.example" },
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

test("server-renders the complete IBAN tool", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>IBAN DevTools/);
  assert.match(html, /IBAN 测试数据/);
  assert.match(html, /生成器/);
  assert.match(html, /校验与解析/);
  assert.match(html, /德国测试身份/);
  assert.match(html, /100% 本地运行/);
  assert.match(html, /仅供软件开发、测试和教学使用/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("ships portable deployment configuration and social metadata", async () => {
  const [layout, page, germanData, vercelConfig, wranglerConfig, packageJson] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/german-test-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../vercel.json", import.meta.url), "utf8"),
    readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /og\.png/);
  assert.match(vercelConfig, /"framework": "nextjs"/);
  assert.match(wranglerConfig, /"binding": "ASSETS"/);
  assert.match(packageJson, /"build:cloudflare"/);
  assert.match(packageJson, /"build:vercel"/);
  assert.match(page, /STEUERLICHE IDENTIFIKATIONSNUMMER/);
  assert.match(germanData, /calculateGermanTaxIdCheckDigit/);
  assert.match(germanData, /generateGermanTestProfile/);
});
