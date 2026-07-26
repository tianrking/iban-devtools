import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  AMERICAS_SOVEREIGN_CODES,
  COUNTRY_CATALOG_MAP,
} from "../lib/country-catalog.ts";
import {
  createRandomInt,
  generateSyntheticIdentity,
} from "../lib/global-test-data.ts";
import {
  generateNationalBanking,
  validateAbaRoutingNumber,
  validateClabe,
} from "../lib/national-banking.ts";

const workspaceRoot = new URL("../", import.meta.url);

test("catalog covers all 35 sovereign countries in the Americas", () => {
  assert.equal(AMERICAS_SOVEREIGN_CODES.length, 35);
  assert.equal(new Set(AMERICAS_SOVEREIGN_CODES).size, 35);
  for (const code of AMERICAS_SOVEREIGN_CODES) {
    const country = COUNTRY_CATALOG_MAP.get(code);
    assert.ok(country, code);
    assert.equal(country.continent, "Americas", code);
    assert.ok(country.geoDataPath, code);
  }
});

test("country-split Americas directory is internally consistent", async () => {
  const index = JSON.parse(
    await readFile(new URL("public/data/americas/index.json", workspaceRoot), "utf8"),
  );
  assert.equal(index.counts.countries, 35);
  assert.equal(index.meta.release, "v3.2-export.6");
  assert.equal(index.meta.license, "ODbL-1.0");
  assert.equal(index.meta.quality, "community-maintained-reference-not-official");

  let regions = 0;
  let cities = 0;
  for (const code of AMERICAS_SOVEREIGN_CODES) {
    const data = JSON.parse(
      await readFile(
        new URL(`public/data/americas/${code.toLowerCase()}.json`, workspaceRoot),
        "utf8",
      ),
    );
    assert.equal(data.country.code, code);
    assert.equal(data.counts.regions, data.regions.length);
    assert.equal(
      data.counts.cities,
      data.regions.reduce((sum, region) => sum + region.cities.length, 0),
    );
    for (const region of data.regions) {
      assert.ok(region.name, `${code}: region name`);
      for (const city of region.cities) {
        assert.ok(city.name, `${code}/${region.name}: city name`);
        assert.ok(city.timezone, `${code}/${region.name}/${city.name}: timezone`);
      }
    }
    regions += data.counts.regions;
    cities += data.counts.cities;
  }
  assert.equal(regions, index.counts.regions);
  assert.equal(cities, index.counts.cities);
  assert.ok(cities > 40_000);
});

test("US, Canada and Mexico use their national payment identifiers, not fake IBANs", () => {
  const us = COUNTRY_CATALOG_MAP.get("US");
  const ca = COUNTRY_CATALOG_MAP.get("CA");
  const mx = COUNTRY_CATALOG_MAP.get("MX");
  assert.ok(us && ca && mx);
  assert.equal(us.ibanSpec, null);
  assert.equal(ca.ibanSpec, null);
  assert.equal(mx.ibanSpec, null);

  const aba = generateNationalBanking(us, createRandomInt("aba"));
  assert.equal(aba.scheme, "ABA");
  assert.equal(aba.iban, null);
  assert.ok(aba.routingNumber);
  assert.equal(aba.value.length, 21);
  assert.equal(validateAbaRoutingNumber(aba.routingNumber), true);

  const canadian = generateNationalBanking(ca, createRandomInt("canada"));
  assert.equal(canadian.scheme, "CACPA");
  assert.match(canadian.routingNumber ?? "", /^0\d{8}$/);
  assert.equal(canadian.validation, "format-only");

  const clabe = generateNationalBanking(mx, createRandomInt("clabe"));
  assert.equal(clabe.scheme, "CLABE");
  assert.equal(clabe.iban, null);
  assert.equal(validateClabe(clabe.value), true);
});

test("every Americas country can generate a complete exportable identity", () => {
  for (const code of AMERICAS_SOVEREIGN_CODES) {
    const country = COUNTRY_CATALOG_MAP.get(code);
    assert.ok(country);
    const bankingIdentity = generateNationalBanking(
      country,
      createRandomInt(`banking:${code}`),
    );
    const profile = generateSyntheticIdentity({
      countryCode: code,
      iban: bankingIdentity.iban ?? "",
      bankingIdentity,
      cityOverride: {
        name: "Fixture City",
        region: "Fixture Region",
        timezone: country.timezone,
      },
      seed: `profile:${code}`,
    });
    assert.equal(profile.country.code, code);
    assert.equal(profile.banking.paymentIdentifier.scheme, country.payment.scheme);
    assert.ok(profile.banking.paymentIdentifier.value);
    assert.equal(Boolean(profile.banking.iban), Boolean(country.ibanSpec));
  }
});
