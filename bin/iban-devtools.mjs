#!/usr/bin/env -S node --experimental-strip-types

import {
  createRandomInt,
  generateSyntheticIdentity,
} from "../lib/global-test-data.ts";
import {
  generateIban,
  IBAN_COUNTRIES,
  IBAN_COUNTRY_MAP,
  validateIban,
} from "../lib/iban-core.ts";
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

const args = readArgs(rawArgs);

if (command === "countries") {
  process.stdout.write(
    `${IBAN_COUNTRIES.map((country) =>
      `${country.code}\t${country.name}\t${country.length}\t${country.currency}\t${country.sepa ? "SEPA" : "GLOBAL"}`,
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
  const country = IBAN_COUNTRY_MAP.get(countryCode);
  if (!country) {
    fail(`Unsupported country: ${countryCode}`);
  } else {
    const count = Math.min(1000, Math.max(1, Number(args.count ?? 1)));
    const seed = String(args.seed ?? "");
    const caseMode = String(args.case ?? "valid");
    const scenario = String(args.scenario ?? "complete");
    const profiles = Array.from({ length: count }, (_, index) => {
      const iban = generateIban(
        country,
        createRandomInt(seed ? `${seed}:iban:${index}` : undefined),
        { caseMode },
      );
      return generateSyntheticIdentity({
        countryCode,
        iban,
        scenario,
        seed,
        index,
      });
    });
    const format = String(args.format ?? "json");
    process.stdout.write(`${exportProfiles(profiles, format)}\n`);
  }
} else {
  fail(`Unknown command: ${command}

Commands:
  generate --country DE --count 10 --seed qa-01 --scenario kyc --format json
  validate DE89370400440532013000
  countries`);
}
