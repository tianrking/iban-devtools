import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import test from "node:test";

import {
  AMERICAS_SOVEREIGN_CODES,
  COUNTRY_CATALOG,
  COUNTRY_CATALOG_MAP,
  WORLD_GEO_COUNTS,
} from "../lib/country-catalog.ts";
import {
  createRandomInt,
  generateSyntheticIdentity,
} from "../lib/global-test-data.ts";
import {
  expandGeoCity,
  findGeoRegion,
  selectGeoCity,
  selectGeoCityOrFixture,
  uniqueRegionCities,
} from "../lib/geo-data.ts";
import {
  generateNationalBanking,
  validateAbaRoutingNumber,
  validateCbu,
  validateClabe,
  validateIfscFormat,
} from "../lib/national-banking.ts";

const workspaceRoot = new URL("../", import.meta.url);
const worldDirectory = new URL("public/data/world/", workspaceRoot);
const expectedCounts = {
  countries: 250,
  countriesWithCities: 223,
  countriesWithoutCities: 27,
  regions: 5308,
  cities: 152970,
};
const maximumCountryFileBytes = 256 * 1024;
const maximumIndexFileBytes = 64 * 1024;
const maximumDirectoryBytes = 3 * 1024 * 1024;

test("catalog contains 249 official ISO entries plus user-assigned XK", () => {
  assert.equal(COUNTRY_CATALOG.length, 250);
  assert.equal(COUNTRY_CATALOG_MAP.size, 250);
  assert.equal(new Set(COUNTRY_CATALOG.map((country) => country.code)).size, 250);
  assert.deepEqual(WORLD_GEO_COUNTS, expectedCounts);

  const official = COUNTRY_CATALOG.filter(
    (country) => country.isoStatus === "official",
  );
  const userAssigned = COUNTRY_CATALOG.filter(
    (country) => country.isoStatus === "user-assigned",
  );

  assert.equal(official.length, 249);
  assert.deepEqual(userAssigned.map((country) => country.code), ["XK"]);
  for (const country of COUNTRY_CATALOG) {
    assert.match(country.code, /^[A-Z]{2}$/);
    assert.equal(
      country.geoDataPath,
      `/data/world/${country.code.toLowerCase()}.json`,
      country.code,
    );
  }
});

test("world index and all 250 compact country files are exactly consistent", async () => {
  const indexUrl = new URL("index.json", worldDirectory);
  const index = JSON.parse(await readFile(indexUrl, "utf8"));
  const directoryEntries = await readdir(worldDirectory);
  const countryFilenames = directoryEntries
    .filter((filename) => /^[a-z]{2}\.json$/.test(filename))
    .sort();
  const expectedFilenames = COUNTRY_CATALOG
    .map((country) => `${country.code.toLowerCase()}.json`)
    .sort();

  assert.deepEqual(index.counts, expectedCounts);
  assert.equal(index.meta.release, "v3.2-export.6");
  assert.equal(
    index.meta.sourceSha256,
    "c93ad3c0eeab9e11850020d214a0c25ee2b97113d637d052ffa3064860b0e234",
  );
  assert.equal(index.meta.license, "ODbL-1.0");
  assert.deepEqual(index.meta.currencySource, {
    source: "SIX ISO 4217 List One",
    sourceUrl:
      "https://www.six-group.com/dam/download/financial-information/data-center/iso-currrency/lists/list-one.xml",
    release: "2026-01-01",
    sourceSha256:
      "838dfb991648cf36df939edd5fe3811737962b75a32252847d239cedd1e291c9",
  });
  assert.equal(
    index.meta.quality,
    "community-maintained-reference-not-official",
  );
  assert.equal(index.countries.length, 250);
  assert.equal(new Set(index.countries.map((country) => country.code)).size, 250);
  assert.equal(new Set(index.countries.map((country) => country.path)).size, 250);
  assert.deepEqual(countryFilenames, expectedFilenames);
  assert.ok(
    (await stat(indexUrl)).size <= maximumIndexFileBytes,
    "world index must stay below 64 KiB",
  );

  let totalRegions = 0;
  let totalCities = 0;
  let totalBytes = 0;
  let compactStrings = 0;
  let timezoneTuples = 0;

  for (const indexCountry of index.countries) {
    const code = indexCountry.code;
    const catalogCountry = COUNTRY_CATALOG_MAP.get(code);
    assert.ok(catalogCountry, `${code}: catalog entry`);
    assert.equal(
      indexCountry.path,
      `/data/world/${code.toLowerCase()}.json`,
      `${code}: path`,
    );

    const fileUrl = new URL(`${code.toLowerCase()}.json`, worldDirectory);
    const fileStats = await stat(fileUrl);
    totalBytes += fileStats.size;
    assert.ok(
      fileStats.size <= maximumCountryFileBytes,
      `${code}: ${fileStats.size} bytes exceeds 256 KiB`,
    );

    const data = JSON.parse(await readFile(fileUrl, "utf8"));
    assert.equal(data.meta.schemaVersion, 1, `${code}: schema`);
    assert.equal(data.meta.release, index.meta.release, `${code}: release`);
    assert.equal(
      data.meta.sourceSha256,
      index.meta.sourceSha256,
      `${code}: source checksum`,
    );
    assert.equal(data.meta.license, "ODbL-1.0", `${code}: license`);
    assert.deepEqual(
      data.meta.currencySource,
      index.meta.currencySource,
      `${code}: currency source`,
    );
    assert.equal(data.country.code, code, `${code}: country code`);
    assert.equal(data.counts.regions, data.regions.length, `${code}: regions`);
    assert.equal(data.counts.regions, indexCountry.regions, `${code}: index regions`);
    assert.equal(data.counts.cities, indexCountry.cities, `${code}: index cities`);
    assert.deepEqual(
      catalogCountry.geoCoverage,
      data.counts,
      `${code}: catalog coverage`,
    );
    assert.deepEqual(
      catalogCountry.currencies,
      data.country.currencies,
      `${code}: currencies`,
    );
    assert.equal(
      catalogCountry.currency,
      catalogCountry.currencies[0],
      `${code}: primary currency`,
    );

    let countryCities = 0;
    for (const region of data.regions) {
      assert.equal(typeof region.code, "string", `${code}: region code`);
      assert.ok(region.name, `${code}: region name`);
      assert.ok(region.type, `${code}/${region.name}: region type`);
      assert.ok(region.timezone, `${code}/${region.name}: region timezone`);
      assert.ok(Array.isArray(region.cities), `${code}/${region.name}: cities`);

      for (const compactCity of region.cities) {
        const isCompactString = typeof compactCity === "string";
        const isTimezoneTuple =
          Array.isArray(compactCity) &&
          compactCity.length === 2 &&
          typeof compactCity[0] === "string" &&
          typeof compactCity[1] === "string";
        assert.ok(
          isCompactString || isTimezoneTuple,
          `${code}/${region.name}: invalid compact city`,
        );

        if (isCompactString) compactStrings += 1;
        if (isTimezoneTuple) timezoneTuples += 1;

        const city = expandGeoCity(compactCity, region.timezone);
        assert.ok(city.name, `${code}/${region.name}: city name`);
        assert.ok(city.timezone, `${code}/${region.name}/${city.name}: timezone`);
        if (isCompactString) {
          assert.equal(
            city.timezone,
            region.timezone,
            `${code}/${region.name}/${city.name}: inherited timezone`,
          );
        } else {
          assert.equal(
            city.timezone,
            compactCity[1],
            `${code}/${region.name}/${city.name}: timezone override`,
          );
        }
      }
      countryCities += region.cities.length;
    }

    assert.equal(data.counts.cities, countryCities, `${code}: city count`);
    totalRegions += data.counts.regions;
    totalCities += data.counts.cities;
  }

  assert.equal(totalRegions, expectedCounts.regions);
  assert.equal(totalCities, expectedCounts.cities);
  assert.ok(compactStrings > 100_000, "most cities should use compact strings");
  assert.ok(timezoneTuples > 0, "timezone override tuples must be exercised");
  assert.ok(
    totalBytes <= maximumDirectoryBytes,
    `${totalBytes} bytes exceeds the 3 MiB world-data budget`,
  );
});

test("standard display names and official ISO 4217 data correct known source errors", () => {
  const expectations = {
    AQ: ["南极洲", "XXX"],
    CG: ["刚果（布）", "XAF"],
    CW: ["库拉索", "XCG"],
    MF: ["法属圣马丁", "EUR"],
    SL: ["塞拉利昂", "SLE"],
    SX: ["荷属圣马丁", "XCG"],
    VG: ["英属维尔京群岛", "USD"],
    ZW: ["津巴布韦", "ZWG"],
  };
  for (const [code, [name, currency]] of Object.entries(expectations)) {
    const country = COUNTRY_CATALOG_MAP.get(code);
    assert.ok(country, code);
    assert.equal(country.name, name, code);
    assert.equal(country.currency, currency, code);
  }
  assert.deepEqual(COUNTRY_CATALOG_MAP.get("HT").currencies, ["HTG", "USD"]);
  assert.deepEqual(COUNTRY_CATALOG_MAP.get("PA").currencies, ["PAB", "USD"]);
  assert.deepEqual(COUNTRY_CATALOG_MAP.get("BT").currencies, ["BTN", "INR"]);
  assert.equal(COUNTRY_CATALOG_MAP.get("BT").currency, "BTN");
});

test("all 35 sovereign Americas codes remain present in the world catalog", () => {
  assert.equal(AMERICAS_SOVEREIGN_CODES.length, 35);
  assert.equal(new Set(AMERICAS_SOVEREIGN_CODES).size, 35);
  for (const code of AMERICAS_SOVEREIGN_CODES) {
    const country = COUNTRY_CATALOG_MAP.get(code);
    assert.ok(country, code);
    assert.equal(country.region, "Americas", code);
    assert.equal(country.geoDataPath, `/data/world/${code.toLowerCase()}.json`);
  }
});

test("US, Canada, Mexico and Argentina retain their national payment schemes", () => {
  const us = COUNTRY_CATALOG_MAP.get("US");
  const ca = COUNTRY_CATALOG_MAP.get("CA");
  const mx = COUNTRY_CATALOG_MAP.get("MX");
  const ar = COUNTRY_CATALOG_MAP.get("AR");
  assert.ok(us && ca && mx && ar);
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
  assert.equal(canadian.iban, null);
  assert.match(canadian.routingNumber ?? "", /^0\d{8}$/);
  assert.equal(canadian.validation, "format-only");

  const clabe = generateNationalBanking(mx, createRandomInt("clabe"));
  assert.equal(clabe.scheme, "CLABE");
  assert.equal(clabe.iban, null);
  assert.equal(validateClabe(clabe.value), true);

  const cbu = generateNationalBanking(ar, createRandomInt("cbu"));
  assert.equal(cbu.scheme, "CBU");
  assert.equal(cbu.iban, null);
  assert.equal(cbu.value.length, 22);
  assert.equal(validateCbu(cbu.value), true);
  assert.equal(validateCbu("0110138202011100377664"), true);
});

test("major non-IBAN markets expose their own format-only payment schemes", () => {
  const expectedSchemes = {
    AU: "BSB",
    CN: "CNAPS",
    HK: "HKICL",
    IN: "IFSC",
    JP: "ZENGIN",
    NZ: "NZ-ACCOUNT",
    SG: "SG-ACCOUNT",
    ZA: "ZA-BRANCH",
  };

  for (const [code, scheme] of Object.entries(expectedSchemes)) {
    const country = COUNTRY_CATALOG_MAP.get(code);
    assert.ok(country, code);
    assert.equal(country.payment.scheme, scheme, code);
    assert.equal(country.payment.validation, "format-only", code);
    const banking = generateNationalBanking(
      country,
      createRandomInt(`national-format:${code}`),
    );
    assert.equal(banking.scheme, scheme, code);
    assert.equal(banking.validation, "format-only", code);
  }

  const india = COUNTRY_CATALOG_MAP.get("IN");
  const ifsc = generateNationalBanking(india, createRandomInt("ifsc"));
  assert.ok(ifsc.routingNumber);
  assert.equal(validateIfscFormat(ifsc.routingNumber), true);
});

test("payment accuracy tiers remain explicit across all 250 markets", () => {
  const checksum = COUNTRY_CATALOG.filter(
    (country) => country.payment.validation === "checksum",
  );
  const countrySpecificFormatOnly = COUNTRY_CATALOG.filter(
    (country) =>
      country.payment.validation === "format-only" &&
      country.payment.scheme !== "LOCAL",
  );
  const genericLocal = COUNTRY_CATALOG.filter(
    (country) => country.payment.scheme === "LOCAL",
  );

  assert.equal(checksum.length, 92);
  assert.equal(countrySpecificFormatOnly.length, 9);
  assert.equal(genericLocal.length, 149);
  assert.equal(
    checksum.length + countrySpecificFormatOnly.length + genericLocal.length,
    250,
  );
});

test("format-only negative fixtures actually violate their compact format", () => {
  for (const country of COUNTRY_CATALOG.filter(
    (item) => item.payment.validation === "format-only",
  )) {
    const fixture = generateNationalBanking(
      country,
      createRandomInt(`format-negative:${country.code}`),
      { caseMode: "bad-checksum" },
    );
    assert.match(fixture.value, /@/, country.code);
    assert.equal(fixture.validation, "negative-test-case", country.code);
  }
});

test("reviewed routing fixtures preserve institution and branch components", () => {
  const expectedParts = new Map([
    ["AU", [2, 4]],
    ["HK", [3, 3]],
    ["JP", [4, 3]],
    ["NZ", [2, 4]],
    ["SG", [4, 3]],
  ]);

  for (const [code, [institutionLength, branchLength]] of expectedParts) {
    const country = COUNTRY_CATALOG_MAP.get(code);
    const fixture = generateNationalBanking(
      country,
      createRandomInt(`routing-parts:${code}`),
    );
    assert.equal(fixture.institutionCode.length, institutionLength, code);
    assert.equal(fixture.branchCode.length, branchLength, code);
    assert.equal(
      `${fixture.institutionCode}${fixture.branchCode}`,
      fixture.routingNumber,
      code,
    );
  }

  const southAfrica = generateNationalBanking(
    COUNTRY_CATALOG_MAP.get("ZA"),
    createRandomInt("routing-parts:ZA"),
  );
  assert.equal(southAfrica.institutionCode, null);
  assert.equal(southAfrica.branchCode, southAfrica.routingNumber);
});

test("IBAN identities expose every registered branch component", () => {
  const countries = COUNTRY_CATALOG.filter(
    (country) =>
      country.ibanSpec && country.ibanSpec.branchCodeStart !== null,
  );
  assert.equal(countries.length, 32);

  for (const country of countries) {
    const fixture = generateNationalBanking(
      country,
      createRandomInt(`iban-branch:${country.code}`),
    );
    assert.equal(
      fixture.institutionCode.length,
      country.ibanSpec.bankCodeLen,
      country.code,
    );
    assert.equal(
      fixture.branchCode.length,
      country.ibanSpec.branchCodeLen,
      country.code,
    );
  }
});

test("ABA negative checksum changes the routing prefix in the exported value", () => {
  const fixture = generateNationalBanking(
    COUNTRY_CATALOG_MAP.get("US"),
    createRandomInt("aba-negative-routing"),
    { caseMode: "bad-checksum" },
  );
  assert.equal(fixture.value.slice(0, fixture.routingNumber.length), fixture.routingNumber);
  assert.equal(validateAbaRoutingNumber(fixture.routingNumber), false);
  assert.equal(validateAbaRoutingNumber(fixture.value.slice(0, 9)), false);
  assert.equal(fixture.validation, "negative-test-case");
});

test("every world market can generate a deterministic complete identity", () => {
  for (const country of COUNTRY_CATALOG) {
    const bankingIdentity = generateNationalBanking(
      country,
      createRandomInt(`banking:${country.code}`),
    );
    const options = {
      countryCode: country.code,
      iban: bankingIdentity.iban ?? "",
      bankingIdentity,
      cityOverride: {
        name: "Fixture City",
        region: "Fixture Region",
        timezone: country.timezone,
      },
      seed: `profile:${country.code}`,
    };
    const profile = generateSyntheticIdentity(options);
    const replay = generateSyntheticIdentity(options);

    assert.deepEqual(replay, profile, `${country.code}: deterministic profile`);
    assert.equal(profile.country.code, country.code);
    assert.equal(profile.address.city, "Fixture City");
    assert.equal(
      profile.banking.paymentIdentifier.scheme,
      country.payment.scheme,
      country.code,
    );
    assert.ok(profile.banking.paymentIdentifier.value, country.code);
    assert.equal(Boolean(profile.banking.iban), Boolean(country.ibanSpec));
    assert.ok(profile.personal.fullName, country.code);
    assert.ok(profile.address.formatted, country.code);
    assert.match(
      profile.contact.email,
      /^[a-z0-9]+\.[a-z0-9]+@[a-z]{2}\.example$/,
      country.code,
    );
  }
});

test("East Asian profiles use local-script names and family-name-first display", () => {
  for (const code of ["CN", "JP", "KR"]) {
    const profile = generateSyntheticIdentity({
      countryCode: code,
      seed: `local-script:${code}`,
    });
    assert.match(profile.personal.firstName, /[^\u0000-\u007f]/, code);
    assert.equal(
      profile.personal.fullName,
      `${profile.personal.lastName} ${profile.personal.firstName}`,
      code,
    );
  }
});

test("selectGeoCity is deterministic and weights random selection by city count", () => {
  const fixture = {
    meta: {
      source: "fixture",
      sourceUrl: "fixture",
      release: "fixture",
      sourceSha256: "fixture",
      license: "ODbL-1.0",
      quality: "community-maintained-reference-not-official",
    },
    country: {
      code: "ZZ",
      name: "Fixture",
      nativeName: "Fixture",
      capital: "Tiny City",
      currency: "TST",
      phoneCode: "0",
      timezone: "Etc/UTC",
    },
    counts: { regions: 2, cities: 4 },
    regions: [
      {
        code: "T",
        name: "Tiny",
        type: "region",
        timezone: "Etc/UTC",
        cities: ["Tiny City"],
      },
      {
        code: "L",
        name: "Large",
        type: "region",
        timezone: "Europe/Paris",
        cities: [
          "Large One",
          ["Large Two", "Europe/London"],
          "Large Three",
        ],
      },
    ],
  };

  assert.equal(
    selectGeoCity(fixture, "random", "random", () => 0)?.region,
    "Tiny",
  );
  assert.equal(
    selectGeoCity(fixture, "random", "random", () => 1)?.name,
    "Large One",
  );
  assert.equal(
    selectGeoCity(fixture, "random", "random", () => 3)?.name,
    "Large Three",
  );
  assert.deepEqual(
    selectGeoCity(fixture, "random", "Large Two", () => 0),
    { name: "Large Two", timezone: "Europe/London", region: "Large" },
  );
  assert.equal(findGeoRegion(fixture, "L")?.name, "Large");
  assert.equal(
    selectGeoCity(fixture, "L", "random", () => 0)?.name,
    "Large One",
  );

  const first = selectGeoCity(
    fixture,
    "random",
    "random",
    createRandomInt("deterministic-city"),
  );
  const replay = selectGeoCity(
    fixture,
    "random",
    "random",
    createRandomInt("deterministic-city"),
  );
  assert.deepEqual(replay, first);

  const randomInt = createRandomInt("weighted-city-distribution");
  let largeSelections = 0;
  const sampleSize = 4_000;
  for (let index = 0; index < sampleSize; index += 1) {
    if (selectGeoCity(fixture, "random", "random", randomInt)?.region === "Large") {
      largeSelections += 1;
    }
  }
  const largeRatio = largeSelections / sampleSize;
  assert.ok(
    largeRatio > 0.7 && largeRatio < 0.8,
    `expected about 75% Large selections, received ${(largeRatio * 100).toFixed(2)}%`,
  );
});

test("region codes disambiguate duplicate names and city options are unique", async () => {
  const spain = JSON.parse(
    await readFile(new URL("es.json", worldDirectory), "utf8"),
  );
  const duplicateName = spain.regions.find(
    (region, index, regions) =>
      regions.findIndex((candidate) => candidate.name === region.name) !== index,
  )?.name;
  const duplicateRegions = spain.regions.filter(
    (region) => region.name === duplicateName,
  );

  assert.ok(duplicateRegions.length > 1);
  assert.notEqual(duplicateRegions[0].code, duplicateRegions[1].code);
  assert.equal(
    findGeoRegion(spain, duplicateRegions[1].code)?.code,
    duplicateRegions[1].code,
  );

  for (const region of spain.regions) {
    const cities = uniqueRegionCities(region);
    assert.equal(
      new Set(cities.map((city) => city.name)).size,
      cities.length,
    );
  }
});

test("random city selection does not overweight duplicate source rows", () => {
  const fixture = {
    meta: {
      source: "fixture",
      sourceUrl: "fixture",
      release: "fixture",
      sourceSha256: "fixture",
      license: "ODbL-1.0",
      quality: "community-maintained-reference-not-official",
    },
    country: {
      code: "ZZ",
      name: "Fixture",
      nativeName: "Fixture",
      capital: "Alpha",
      currency: "TST",
      currencies: ["TST"],
      phoneCode: "0",
      timezone: "Etc/UTC",
    },
    counts: { regions: 1, cities: 3 },
    regions: [
      {
        code: "R",
        name: "Region",
        type: "region",
        timezone: "Etc/UTC",
        cities: ["Alpha", "Alpha", "Beta"],
      },
    ],
  };

  assert.equal(selectGeoCity(fixture, "R", "random", () => 0)?.name, "Alpha");
  assert.equal(selectGeoCity(fixture, "R", "random", () => 1)?.name, "Beta");
});

test("empty geographic entries retain real regions with explicit synthetic localities", async () => {
  const anguilla = JSON.parse(
    await readFile(new URL("ai.json", worldDirectory), "utf8"),
  );
  const antarctica = JSON.parse(
    await readFile(new URL("aq.json", worldDirectory), "utf8"),
  );

  const anguillaFixture = selectGeoCityOrFixture(
    anguilla,
    anguilla.regions[0].name,
    "random",
    () => 0,
  );
  const antarcticaFixture = selectGeoCityOrFixture(
    antarctica,
    "random",
    "random",
    () => 0,
  );

  assert.equal(anguillaFixture.region, anguilla.regions[0].name);
  assert.match(anguillaFixture.name, / Test Locality$/);
  assert.equal(anguillaFixture.synthetic, true);
  assert.equal(antarcticaFixture.region, "AQ Synthetic Region");
  assert.equal(antarcticaFixture.name, "AQ Test Locality");
  assert.equal(antarcticaFixture.synthetic, true);
});

test("batch worker loads geo data itself without cloning flattened city arrays", async () => {
  const [pageSource, workerSource] = await Promise.all([
    readFile(new URL("app/page.tsx", workspaceRoot), "utf8"),
    readFile(new URL("app/batch-worker.ts", workspaceRoot), "utf8"),
  ]);

  assert.doesNotMatch(pageSource, /\ballowedGeoCities\b/);
  assert.doesNotMatch(workerSource, /\ballowedGeoCities\b/);
  assert.doesNotMatch(pageSource, /geoData\.regions\.flatMap\s*\(/);
  assert.match(workerSource, /fetch\(input\.geoDataPath\)/);
  assert.match(workerSource, /selectGeoCityOrFixture\(/);
  assert.match(pageSource, /batchConfigurationRef\.current !== requestSignature/);
});
