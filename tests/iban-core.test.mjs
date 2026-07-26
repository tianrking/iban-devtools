import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import test from "node:test";
import {
  createRandomInt,
  generateSyntheticIdentity,
} from "../lib/global-test-data.ts";
import {
  generateIban,
  IBAN_BRANCH_LAYOUTS,
  IBAN_COUNTRIES,
  IBAN_COUNTRY_MAP,
  isSupportedCaseMode,
  mutateIban,
  validateIban,
} from "../lib/iban-core.ts";
import { COUNTRY_CATALOG_MAP } from "../lib/country-catalog.ts";
import { EXPORT_FORMATS, exportProfiles } from "../lib/exporters.ts";

const RELEASE_102_COUNTRY_CODES = (
  "AD AE AL AT AZ BA BE BG BH BI BR BY CH CR CY CZ DE DJ DK DO EE EG ES FI " +
  "FK FO FR GB GE GI GL GR GT HN HR HU IE IL IQ IS IT JO KW KZ LB LC LI LT " +
  "LU LV LY MC MD ME MK MN MR MT MU NI NL NO OM PK PL PS PT QA RO RS RU SA " +
  "SC SD SE SI SK SM SO ST SV TL TN TR UA VA VG XK YE"
).split(" ");

test("registry matches the 89 country formats in SWIFT Release 102", () => {
  const codes = IBAN_COUNTRIES.map((country) => country.code);
  assert.equal(IBAN_COUNTRIES.length, 89);
  assert.deepEqual(codes, RELEASE_102_COUNTRY_CODES);
  assert.equal(codes.includes("HN"), true);
  assert.equal(codes.includes("DZ"), false);

  const honduras = IBAN_COUNTRIES.find((country) => country.code === "HN");
  assert.equal(honduras.length, 28);
  assert.equal(honduras.structure, "4a20n");
  assert.equal(honduras.bankCodeLen, 4);
  assert.equal(honduras.accountStart, 4);
  assert.equal(honduras.accountLen, 20);
  assert.equal(validateIban("HN88CABF00000000000250005469").valid, true);
});

test("all registry structures match their declared IBAN length", () => {
  for (const country of IBAN_COUNTRIES) {
    assert.equal(country.bbanTemplate.length, country.length - 4, country.code);
  }
});

test("all 32 registered branch layouts remain explicit and non-overlapping", () => {
  assert.equal(Object.keys(IBAN_BRANCH_LAYOUTS).length, 32);

  for (const country of IBAN_COUNTRIES) {
    const layout = IBAN_BRANCH_LAYOUTS[country.code];
    if (!layout) {
      assert.equal(country.branchCodeStart, null, country.code);
      assert.equal(country.branchCodeLen, 0, country.code);
      continue;
    }

    assert.equal(country.bankCodeStart, layout.bankStart, country.code);
    assert.equal(country.bankCodeLen, layout.bankLen, country.code);
    assert.equal(country.branchCodeStart, layout.branchStart, country.code);
    assert.equal(country.branchCodeLen, layout.branchLen, country.code);
    assert.ok(
      layout.branchStart >= layout.bankStart + layout.bankLen,
      `${country.code}: bank/branch overlap`,
    );
    assert.ok(
      layout.branchStart + layout.branchLen <= country.bbanTemplate.length,
      `${country.code}: branch outside BBAN`,
    );
  }
});

test("registry decomposition and EPC SEPA flags match current source edge cases", () => {
  const finland = IBAN_COUNTRY_MAP.get("FI");
  const portugal = IBAN_COUNTRY_MAP.get("PT");
  const estonia = IBAN_COUNTRY_MAP.get("EE");

  assert.equal(finland.structure, "3n11n");
  assert.equal(finland.bankCodeLen, 3);
  assert.equal(finland.accountStart, 3);
  assert.equal(finland.accountLen, 11);
  assert.equal(portugal.structure, "4n4n11n2n");
  assert.equal(portugal.bankCodeLen, 4);
  assert.equal(portugal.accountStart, 8);
  assert.equal(portugal.accountLen, 11);
  assert.equal(estonia.structure, "2n14n");
  assert.equal(estonia.bankCodeLen, 2);
  assert.equal(estonia.branchCodeStart, null);
  assert.equal(estonia.accountStart, 2);
  assert.equal(estonia.accountLen, 14);

  for (const code of ["FO", "GL", "XK"]) {
    assert.equal(IBAN_COUNTRY_MAP.get(code).sepa, false, code);
  }
  assert.equal(IBAN_COUNTRY_MAP.get("PS").currency, "XXX");
});

test("every supported country generates deterministic MOD-97-valid values", () => {
  for (const country of IBAN_COUNTRIES) {
    const first = generateIban(country, createRandomInt(`registry:${country.code}`));
    const second = generateIban(country, createRandomInt(`registry:${country.code}`));
    assert.equal(first, second, country.code);
    assert.equal(first.length, country.length, country.code);
    assert.equal(validateIban(first).valid, true, country.code);
  }
});

test("negative and normalization cases report the expected validation layer", () => {
  const country = IBAN_COUNTRIES.find((item) => item.code === "DE");
  const valid = generateIban(country, createRandomInt("negative-cases"));
  assert.equal(validateIban(mutateIban(valid, "bad-checksum")).reason, "INVALID_CHECKSUM");
  assert.equal(validateIban(mutateIban(valid, "wrong-length")).reason, "INVALID_LENGTH");
  assert.equal(validateIban(mutateIban(valid, "illegal-character")).reason, "ILLEGAL_CHARACTERS");
  assert.equal(validateIban(mutateIban(valid, "bad-bban")).reason, "INVALID_BBAN_STRUCTURE");
  assert.equal(validateIban(mutateIban(valid, "lowercase")).valid, true);
  assert.equal(validateIban(mutateIban(valid, "hyphenated")).valid, true);
});

test("case modes reject inert lowercase and hyphen variants outside IBAN", () => {
  assert.equal(isSupportedCaseMode("lowercase", true), true);
  assert.equal(isSupportedCaseMode("hyphenated", true), true);
  assert.equal(isSupportedCaseMode("lowercase", false), false);
  assert.equal(isSupportedCaseMode("hyphenated", false), false);
  assert.equal(isSupportedCaseMode("not-a-mode", true), false);
});

test("every registry country can produce a complete localized synthetic identity", () => {
  for (const country of IBAN_COUNTRIES) {
    const iban = generateIban(country, createRandomInt(`identity:${country.code}`));
    const profile = generateSyntheticIdentity({
      countryCode: country.code,
      iban,
      seed: "complete-registry",
      scenario: "payments",
    });
    assert.equal(profile.country.code, country.code);
    assert.equal(
      profile.banking.currency,
      COUNTRY_CATALOG_MAP.get(country.code).currency,
    );
    assert.ok(profile.personal.fullName);
    assert.ok(profile.address.formatted);
    assert.ok(profile.payment.endToEndId);
  }
});

test("all developer export formats return usable output", () => {
  const country = IBAN_COUNTRIES.find((item) => item.code === "NL");
  const profile = generateSyntheticIdentity({
    countryCode: "NL",
    iban: generateIban(country, createRandomInt("exports")),
    seed: "exports",
  });
  for (const format of EXPORT_FORMATS) {
    const output = exportProfiles([profile], format.value);
    assert.ok(output.length > 40, format.value);
  }
});

test("batch exports include every profile and complete identity groups", () => {
  const country = IBAN_COUNTRIES.find((item) => item.code === "FR");
  const profiles = Array.from({ length: 3 }, (_, index) =>
    generateSyntheticIdentity({
      countryCode: "FR",
      iban: generateIban(country, createRandomInt(`batch-export:${index}`)),
      seed: "batch-export",
      scenario: "payments",
      index,
    }),
  );

  const json = JSON.parse(exportProfiles(profiles, "json"));
  assert.equal(json.length, 3);
  assert.deepEqual(json[2].business, profiles[2].business);
  assert.deepEqual(json[1].payment, profiles[1].payment);

  const ndjson = exportProfiles(profiles, "ndjson").trim().split("\n");
  assert.equal(ndjson.length, 3);
  assert.equal(JSON.parse(ndjson[2]).id, profiles[2].id);

  const csv = exportProfiles(profiles, "csv");
  const [header, ...rows] = csv.split("\n");
  assert.equal(rows.length, 3);
  for (const field of [
    "passportNumber",
    "kycRiskLevel",
    "companyName",
    "annualSalary",
    "verificationOfPayee",
    "profileJson",
  ]) {
    assert.ok(header.includes(field), field);
  }

  const postman = JSON.parse(exportProfiles(profiles, "postman"));
  const batchVariable = postman.values.find(
    (item) => item.key === "identities_json",
  );
  assert.equal(JSON.parse(batchVariable.value).length, 3);

  const sql = exportProfiles(profiles, "sql");
  assert.ok(sql.includes("profile_json"));
  assert.ok(sql.includes(profiles[2].business.companyName));

  const environment = exportProfiles(profiles, "env");
  assert.ok(environment.includes("TEST_IDENTITY_COUNT=3"));
  assert.ok(environment.includes("TEST_IDENTITIES_JSON="));
});

test("1000 IBAN values remain unique and generate within the performance budget", () => {
  const country = IBAN_COUNTRIES.find((item) => item.code === "DE");
  const started = performance.now();
  const values = Array.from({ length: 1000 }, (_, index) =>
    generateIban(country, createRandomInt(`performance:${index}`)),
  );
  const elapsed = performance.now() - started;
  assert.equal(new Set(values).size, 1000);
  assert.ok(elapsed < 250, `generation took ${elapsed.toFixed(1)}ms`);
});
