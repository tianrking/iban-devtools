import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { COUNTRY_CATALOG } from "../lib/country-catalog.ts";
import {
  createTranslator,
  DEFAULT_LOCALE,
  displayCountryName,
  getMessages,
  isAppLocale,
  localeDirection,
  resolveAppLocale,
  SUPPORTED_LOCALES,
} from "../lib/i18n.ts";

const EXPECTED_LOCALES = ["en", "es", "fr", "ar", "zh-TW", "zh-CN"];

function placeholders(value) {
  return [...value.matchAll(/\{([a-zA-Z0-9]+)\}/g)]
    .map((match) => match[1])
    .sort();
}

test("defines the six requested locales with English as the stable default", () => {
  assert.deepEqual([...SUPPORTED_LOCALES], EXPECTED_LOCALES);
  assert.equal(DEFAULT_LOCALE, "en");
  assert.equal(resolveAppLocale(undefined, undefined), "en");
  assert.equal(resolveAppLocale("invalid", "fr"), "fr");
  assert.equal(resolveAppLocale("ar", "fr"), "ar");
  assert.equal(resolveAppLocale("invalid", "invalid"), "en");
  assert.equal(isAppLocale("zh-TW"), true);
  assert.equal(isAppLocale("zh-Hant"), false);
});

test("PWA metadata uses the same English LTR default", async () => {
  const manifest = JSON.parse(
    await readFile(
      new URL("../public/manifest.webmanifest", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(manifest.lang, "en");
  assert.equal(manifest.dir, "ltr");
  assert.match(manifest.description, /Generate and validate/);
});

test("translation dictionaries are complete, non-empty and preserve interpolation contracts", () => {
  const english = getMessages("en");
  const englishKeys = Object.keys(english).sort();

  for (const locale of SUPPORTED_LOCALES) {
    const localized = getMessages(locale);
    assert.deepEqual(Object.keys(localized).sort(), englishKeys, locale);
    for (const key of englishKeys) {
      assert.equal(typeof localized[key], "string", `${locale}.${key}`);
      assert.ok(localized[key].trim(), `${locale}.${key}`);
      assert.deepEqual(
        placeholders(localized[key]),
        placeholders(english[key]),
        `${locale}.${key} placeholders`,
      );
    }
  }
});

test("translation interpolation and text direction remain deterministic", () => {
  assert.equal(
    createTranslator("fr")("exported", { format: "JSON" }),
    "JSON exporté",
  );
  assert.equal(
    createTranslator("ar")("matches", { count: 250 }),
    "250 نتيجة",
  );
  for (const locale of SUPPORTED_LOCALES) {
    assert.equal(localeDirection(locale), locale === "ar" ? "rtl" : "ltr");
  }
});

test("country names localize in every language without changing catalog data", () => {
  const germanNames = {
    en: "Germany",
    es: "Alemania",
    fr: "Allemagne",
    ar: "ألمانيا",
    "zh-TW": "德國",
    "zh-CN": "德国",
  };

  for (const locale of SUPPORTED_LOCALES) {
    assert.equal(displayCountryName("DE", locale), germanNames[locale]);
    for (const country of COUNTRY_CATALOG) {
      assert.ok(
        displayCountryName(country.code, locale, country.englishName).trim(),
        `${country.code}/${locale}`,
      );
    }
  }

  assert.equal(displayCountryName("XK", "ar"), "كوسوفو");
  assert.ok(
    COUNTRY_CATALOG.every((country) => country.name === country.englishName),
    "generated and exported country names should stay stable English",
  );
});
