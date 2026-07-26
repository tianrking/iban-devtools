import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";

const RELEASE = "v3.2-export.6";
const EXPECTED_SOURCE_SHA256 =
  "c93ad3c0eeab9e11850020d214a0c25ee2b97113d637d052ffa3064860b0e234";
const SOURCE_URL =
  `https://github.com/dr5hn/countries-states-cities-database/releases/download/${RELEASE}/json-countries%2Bstates%2Bcities.json.gz`;
const CURRENCY_RELEASE = "2026-01-01";
const EXPECTED_CURRENCY_SHA256 =
  "838dfb991648cf36df939edd5fe3811737962b75a32252847d239cedd1e291c9";
const CURRENCY_SOURCE_URL =
  "https://www.six-group.com/dam/download/financial-information/data-center/iso-currrency/lists/list-one.xml";
const ISO_4217_ENTITY_ALIASES = {
  BO: "BOLIVIA (PLURINATIONAL STATE OF)",
  BN: "BRUNEI DARUSSALAM",
  CV: "CABO VERDE",
  CZ: "CZECHIA",
  CD: "CONGO (THE DEMOCRATIC REPUBLIC OF THE)",
  FK: "FALKLAND ISLANDS (THE) [MALVINAS]",
  FJ: "FIJI",
  HK: "HONG KONG",
  IR: "IRAN (ISLAMIC REPUBLIC OF)",
  CI: "CÔTE D'IVOIRE",
  LA: "LAO PEOPLE’S DEMOCRATIC REPUBLIC (THE)",
  MO: "MACAO",
  IM: "ISLE OF MAN",
  FM: "MICRONESIA (FEDERATED STATES OF)",
  MD: "MOLDOVA (THE REPUBLIC OF)",
  KP: "KOREA (THE DEMOCRATIC PEOPLE’S REPUBLIC OF)",
  PS: "PALESTINE, STATE OF",
  PN: "PITCAIRN",
  RU: "RUSSIAN FEDERATION (THE)",
  SH: "SAINT HELENA, ASCENSION AND TRISTAN DA CUNHA",
  GS: "SOUTH GEORGIA AND THE SOUTH SANDWICH ISLANDS",
  KR: "KOREA (THE REPUBLIC OF)",
  SJ: "SVALBARD AND JAN MAYEN",
  SY: "SYRIAN ARAB REPUBLIC",
  TW: "TAIWAN (PROVINCE OF CHINA)",
  TZ: "TANZANIA, UNITED REPUBLIC OF",
  TR: "TÜRKİYE",
  GB: "UNITED KINGDOM OF GREAT BRITAIN AND NORTHERN IRELAND (THE)",
  US: "UNITED STATES OF AMERICA (THE)",
  VA: "HOLY SEE (THE)",
  VE: "VENEZUELA (BOLIVARIAN REPUBLIC OF)",
  WF: "WALLIS AND FUTUNA",
};
const OUTPUT_DIRECTORY = new URL("../public/data/world/", import.meta.url);
const CATALOG_OUTPUT = new URL(
  "../lib/world-country-data.generated.ts",
  import.meta.url,
);

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const sourcePath = argumentValue("--source");
const currencySourcePath = argumentValue("--currency-source");

const compressed = sourcePath
  ? await readFile(sourcePath)
  : Buffer.from(await download(SOURCE_URL, "geographic"));
const sourceSha256 = createHash("sha256")
  .update(compressed)
  .digest("hex");
if (sourceSha256 !== EXPECTED_SOURCE_SHA256) {
  throw new Error(
    `Geographic source checksum mismatch: expected ${EXPECTED_SOURCE_SHA256}, received ${sourceSha256}.`,
  );
}
const sourceCountries = JSON.parse(gunzipSync(compressed).toString("utf8"));
const currencySource = currencySourcePath
  ? await readFile(currencySourcePath)
  : Buffer.from(await download(CURRENCY_SOURCE_URL, "currency"));
const currencySourceSha256 = createHash("sha256")
  .update(currencySource)
  .digest("hex");
if (currencySourceSha256 !== EXPECTED_CURRENCY_SHA256) {
  throw new Error(
    `ISO 4217 source checksum mismatch: expected ${EXPECTED_CURRENCY_SHA256}, received ${currencySourceSha256}.`,
  );
}
const currencyByEntity = parseIso4217(currencySource.toString("utf8"));
const chineseRegionNames = new Intl.DisplayNames(["zh-CN"], {
  type: "region",
});

if (sourceCountries.length < 249) {
  throw new Error(
    `Expected a global country directory, received ${sourceCountries.length} entries.`,
  );
}

await mkdir(OUTPUT_DIRECTORY, { recursive: true });

let totalRegions = 0;
let totalCities = 0;
let countriesWithCities = 0;
const catalog = [];
const indexCountries = [];

for (const country of sourceCountries) {
  const currencySpec = currencyForCountry(country, currencyByEntity);
  const regions = country.states.map((state) => ({
    code: state.iso2,
    name: state.name,
    type: state.type || "region",
    timezone: state.timezone || country.timezones?.[0]?.zoneName || "UTC",
    cities: state.cities.map((city) => {
      const regionTimezone =
        state.timezone || country.timezones?.[0]?.zoneName || "UTC";
      const cityTimezone = city.timezone || regionTimezone;
      return cityTimezone === regionTimezone
        ? city.name
        : [city.name, cityTimezone];
    }),
  }));
  const cityCount = regions.reduce(
    (sum, region) => sum + region.cities.length,
    0,
  );
  totalRegions += regions.length;
  totalCities += cityCount;
  if (cityCount > 0) countriesWithCities += 1;

  const code = country.iso2;
  const path = `/data/world/${code.toLowerCase()}.json`;
  const output = {
    meta: {
      schemaVersion: 1,
      source: "Countries States Cities Database",
      sourceUrl:
        "https://github.com/dr5hn/countries-states-cities-database",
      release: RELEASE,
      sourceSha256,
      currencySource: {
        source: "SIX ISO 4217 List One",
        sourceUrl: CURRENCY_SOURCE_URL,
        release: CURRENCY_RELEASE,
        sourceSha256: currencySourceSha256,
      },
      license: "ODbL-1.0",
      generatedAt: "2026-07-26",
      quality: "community-maintained-reference-not-official",
    },
    country: {
      code,
      name: country.name,
      nativeName: country.native,
      capital: country.capital,
      currency: currencySpec.primary,
      currencies: currencySpec.all,
      phoneCode: country.phonecode,
      timezone: country.timezones?.[0]?.zoneName || "UTC",
    },
    counts: {
      regions: regions.length,
      cities: cityCount,
    },
    regions,
  };

  await writeFile(
    new URL(`${code.toLowerCase()}.json`, OUTPUT_DIRECTORY),
    `${JSON.stringify(output)}\n`,
  );

  catalog.push({
    code,
    flag: country.emoji,
    name:
      code === "XK"
        ? "科索沃"
        : chineseRegionNames.of(code) ||
          country.translations?.["zh-CN"] ||
          country.name,
    englishName: country.name,
    nativeName: country.native || country.name,
    currency: currencySpec.primary,
    currencies: currencySpec.all,
    phonePrefix: country.phonecode ? `+${country.phonecode}` : "+000",
    timezone: country.timezones?.[0]?.zoneName || "UTC",
    region: country.region || "Other",
    subregion: country.subregion || "Other",
    nationality: country.nationality || "",
    geoDataPath: path,
    regions: regions.length,
    cities: cityCount,
  });
  indexCountries.push({
    code,
    name: country.name,
    path,
    regions: regions.length,
    cities: cityCount,
  });
}

catalog.sort((left, right) => left.code.localeCompare(right.code));
indexCountries.sort((left, right) => left.code.localeCompare(right.code));

const index = {
  meta: {
    source: "Countries States Cities Database",
    sourceUrl:
      "https://github.com/dr5hn/countries-states-cities-database",
    release: RELEASE,
    sourceSha256,
    currencySource: {
      source: "SIX ISO 4217 List One",
      sourceUrl: CURRENCY_SOURCE_URL,
      release: CURRENCY_RELEASE,
      sourceSha256: currencySourceSha256,
    },
    license: "ODbL-1.0",
    quality: "community-maintained-reference-not-official",
  },
  counts: {
    countries: sourceCountries.length,
    countriesWithCities,
    countriesWithoutCities: sourceCountries.length - countriesWithCities,
    regions: totalRegions,
    cities: totalCities,
  },
  countries: indexCountries,
};

await writeFile(
  new URL("index.json", OUTPUT_DIRECTORY),
  `${JSON.stringify(index, null, 2)}\n`,
);

const generatedCatalog = `// Generated by scripts/build-world-geo-data.mjs.
// Source: Countries States Cities Database ${RELEASE}, ODbL-1.0.
// Do not edit this file manually.

export type GeneratedWorldCountry = {
  code: string;
  flag: string;
  name: string;
  englishName: string;
  nativeName: string;
  currency: string;
  currencies: string[];
  phonePrefix: string;
  timezone: string;
  region: string;
  subregion: string;
  nationality: string;
  geoDataPath: string;
  regions: number;
  cities: number;
};

export const WORLD_GEO_COUNTS = ${JSON.stringify(index.counts, null, 2)} as const;

export const WORLD_GEO_SOURCE = ${JSON.stringify(index.meta, null, 2)} as const;

export const WORLD_COUNTRY_DATA: GeneratedWorldCountry[] = ${JSON.stringify(catalog, null, 2)};
`;

await writeFile(CATALOG_OUTPUT, generatedCatalog);

console.log(
  `Generated ${sourceCountries.length} countries/areas, ${totalRegions} regions, ${totalCities} cities from ${RELEASE}.`,
);

async function download(url, label) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Unable to download ${label} source: HTTP ${response.status}`,
    );
  }
  return response.arrayBuffer();
}

function normalizeEntityName(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\b(THE|OF|AND)\b/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

function parseIso4217(xml) {
  const entries = new Map();
  for (const match of xml.matchAll(/<CcyNtry>([\s\S]*?)<\/CcyNtry>/g)) {
    const body = match[1];
    const entity = body.match(/<CtryNm>(.*?)<\/CtryNm>/)?.[1];
    if (!entity) continue;
    const currency = body.match(/<Ccy>(.*?)<\/Ccy>/)?.[1] ?? "XXX";
    const isFund = /<CcyNm[^>]*IsFund="true"/.test(body);
    const key = normalizeEntityName(entity);
    const current = entries.get(key) ?? [];
    current.push({ currency, isFund });
    entries.set(key, current);
  }
  return entries;
}

function currencyForCountry(country, currencyEntries) {
  if (country.iso2 === "XK") {
    return { primary: "EUR", all: ["EUR"] };
  }
  const entityName =
    ISO_4217_ENTITY_ALIASES[country.iso2] ?? country.name;
  const entries = currencyEntries.get(normalizeEntityName(entityName));
  if (!entries) {
    throw new Error(
      `No ISO 4217 entity match for ${country.iso2} ${country.name}.`,
    );
  }
  const legalTender = entries
    .filter((entry) => !entry.isFund)
    .map((entry) => entry.currency);
  const all = [...new Set(legalTender.length > 0 ? legalTender : ["XXX"])];
  const countryPreference = String(country.currency ?? "").toUpperCase();
  const primary = all.includes(countryPreference)
    ? countryPreference
    : all[0];
  return {
    primary,
    all: [primary, ...all.filter((currency) => currency !== primary)],
  };
}
