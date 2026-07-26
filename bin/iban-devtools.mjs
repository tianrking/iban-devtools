#!/usr/bin/env -S node --experimental-strip-types

import { readFile } from "node:fs/promises";
import {
  createRandomInt,
  generateSyntheticIdentity,
} from "../lib/global-test-data.ts";
import {
  isSupportedCaseMode,
  supportedCaseModes,
  validateIban,
} from "../lib/iban-core.ts";
import {
  COUNTRY_CATALOG,
  COUNTRY_CATALOG_MAP,
} from "../lib/country-catalog.ts";
import { selectGeoCityOrFixture } from "../lib/geo-data.ts";
import { generateNationalBanking } from "../lib/national-banking.ts";
import { exportProfiles } from "../lib/exporters.ts";

const [, , command = "generate", ...rawArgs] = process.argv;

function readArgs(args) {
  const values = {};
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith("--")) continue;
    const [key, inline] = token.slice(2).split("=", 2);
    values[key] = inline ?? args[index + 1] ?? "true";
    if (inline === undefined && args[index + 1] && !args[index + 1].startsWith("--")) {
      index += 1;
    }
  }
  return values;
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

async function loadCountryGeo(country) {
  try {
    const source = new URL(`../public${country.geoDataPath}`, import.meta.url);
    return JSON.parse(await readFile(source, "utf8"));
  } catch {
    return null;
  }
}

const args = readArgs(rawArgs);

if (command === "countries") {
  process.stdout.write(
    `${COUNTRY_CATALOG.map((country) =>
      `${country.code}\t${country.name}\t${country.payment.scheme}\t${country.currency}\t${country.region}\t${country.subregion}`,
    ).join("\n")}\n`,
  );
} else if (command === "validate") {
  const value = rawArgs.find((item) => !item.startsWith("--")) ?? args.iban;
  if (!value) {
    fail("Usage: iban-devtools validate <IBAN>");
  } else {
    const result = validateIban(value);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (!result.valid) process.exitCode = 2;
  }
} else if (command === "generate") {
  const countryCode = String(args.country ?? "DE").toUpperCase();
  const country = COUNTRY_CATALOG_MAP.get(countryCode);
  if (!country) {
    fail(`Unsupported country: ${countryCode}`);
  } else {
    const currency = String(args.currency ?? country.currency).toUpperCase();
    if (!country.currencies.includes(currency)) {
      fail(
        `Unsupported currency for ${countryCode}: ${currency}. Supported: ${country.currencies.join(", ")}`,
      );
    } else {
      const geoData = await loadCountryGeo(country);
      const count = Math.min(1000, Math.max(1, Number(args.count ?? 1)));
      const seed = String(args.seed ?? "");
      const caseMode = String(args.case ?? "valid");
      const scenario = String(args.scenario ?? "complete");
      const regionChoice = String(args.region ?? "random");
      const cityChoice = String(args.city ?? "random");
      if (!isSupportedCaseMode(caseMode, Boolean(country.ibanSpec))) {
        fail(
          `Unsupported case mode for ${countryCode}: ${caseMode}. Supported: ${supportedCaseModes(Boolean(country.ibanSpec)).join(", ")}`,
        );
      } else {
        const profiles = Array.from({ length: count }, (_, index) => {
          const bankingIdentity = generateNationalBanking(
            country,
            createRandomInt(seed ? `${seed}:iban:${index}` : undefined),
            { caseMode },
          );
          const geoCity = geoData
            ? selectGeoCityOrFixture(
                geoData,
                regionChoice,
                cityChoice,
                createRandomInt(seed ? `${seed}:city:${index}` : undefined),
              )
            : undefined;
          const explicitCity =
            !geoCity && args.city && args.region
              ? {
                  name: String(args.city),
                  region: String(args.region),
                  timezone: String(args.timezone ?? country.timezone),
                }
              : undefined;
          return generateSyntheticIdentity({
            countryCode,
            iban: bankingIdentity.iban ?? "",
            bankingIdentity,
            cityName: geoCity || explicitCity ? "random" : cityChoice,
            cityOverride: geoCity ?? explicitCity,
            currencyOverride: currency,
            scenario,
            seed,
            index,
          });
        });
        const format = String(args.format ?? "json");
        process.stdout.write(`${exportProfiles(profiles, format)}\n`);
      }
    }
  }
} else {
  fail(`Unknown command: ${command}

Commands:
  generate --country DE --region Berlin --city Berlin --currency EUR --count 10 --seed qa-01 --scenario kyc --format json
  validate DE89370400440532013000
  countries`);
}
