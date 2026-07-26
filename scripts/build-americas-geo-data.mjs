import { mkdir, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";

const RELEASE = "v3.2-export.6";
const SOURCE_URL =
  `https://github.com/dr5hn/countries-states-cities-database/releases/download/${RELEASE}/json-countries%2Bstates%2Bcities.json.gz`;
const OUTPUT_DIRECTORY = new URL("../public/data/americas/", import.meta.url);
const AMERICAS_CODES = new Set([
  "US", "CA", "MX", "BZ", "CR", "SV", "GT", "HN", "NI", "PA",
  "AG", "BS", "BB", "CU", "DM", "DO", "GD", "HT", "JM", "KN",
  "LC", "VC", "TT", "AR", "BO", "BR", "CL", "CO", "EC", "GY",
  "PY", "PE", "SR", "UY", "VE",
]);

const response = await fetch(SOURCE_URL);
if (!response.ok) {
  throw new Error(`Unable to download geographic source: HTTP ${response.status}`);
}

const compressed = Buffer.from(await response.arrayBuffer());
const sourceCountries = JSON.parse(gunzipSync(compressed).toString("utf8"));
const countries = sourceCountries.filter((country) =>
  AMERICAS_CODES.has(country.iso2),
);

if (countries.length !== AMERICAS_CODES.size) {
  const found = new Set(countries.map((country) => country.iso2));
  throw new Error(
    `Geographic source is missing: ${[...AMERICAS_CODES].filter((code) => !found.has(code)).join(", ")}`,
  );
}

await mkdir(OUTPUT_DIRECTORY, { recursive: true });

let totalRegions = 0;
let totalCities = 0;
for (const country of countries) {
  const regions = country.states.map((state) => ({
    code: state.iso2,
    name: state.name,
    type: state.type || "region",
    timezone: state.timezone || country.timezones?.[0]?.zoneName || "UTC",
    cities: state.cities.map((city) => ({
      name: city.name,
      timezone: city.timezone || state.timezone || country.timezones?.[0]?.zoneName || "UTC",
    })),
  }));
  const cityCount = regions.reduce((sum, region) => sum + region.cities.length, 0);
  totalRegions += regions.length;
  totalCities += cityCount;

  const output = {
    meta: {
      schemaVersion: 1,
      source: "Countries States Cities Database",
      sourceUrl: "https://github.com/dr5hn/countries-states-cities-database",
      release: RELEASE,
      license: "ODbL-1.0",
      generatedAt: "2026-07-26",
      quality: "community-maintained-reference-not-official",
    },
    country: {
      code: country.iso2,
      name: country.name,
      nativeName: country.native,
      capital: country.capital,
      currency: country.currency,
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
    new URL(`${country.iso2.toLowerCase()}.json`, OUTPUT_DIRECTORY),
    `${JSON.stringify(output)}\n`,
  );
}

const index = {
  meta: {
    source: "Countries States Cities Database",
    sourceUrl: "https://github.com/dr5hn/countries-states-cities-database",
    release: RELEASE,
    license: "ODbL-1.0",
    quality: "community-maintained-reference-not-official",
  },
  counts: {
    countries: countries.length,
    regions: totalRegions,
    cities: totalCities,
  },
  countries: countries
    .map((country) => ({
      code: country.iso2,
      name: country.name,
      path: `/data/americas/${country.iso2.toLowerCase()}.json`,
      regions: country.states.length,
      cities: country.states.reduce((sum, state) => sum + state.cities.length, 0),
    }))
    .sort((left, right) => left.code.localeCompare(right.code)),
};

await writeFile(
  new URL("index.json", OUTPUT_DIRECTORY),
  `${JSON.stringify(index, null, 2)}\n`,
);

console.log(
  `Generated ${countries.length} countries, ${totalRegions} regions, ${totalCities} cities from ${RELEASE}.`,
);
