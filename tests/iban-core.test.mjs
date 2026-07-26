import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import test from "node:test";
import {
  createRandomInt,
  generateSyntheticIdentity,
} from "../lib/global-test-data.ts";
import {
  generateIban,
  IBAN_COUNTRIES,
  mutateIban,
  validateIban,
} from "../lib/iban-core.ts";
import { EXPORT_FORMATS, exportProfiles } from "../lib/exporters.ts";

test("all registry structures match their declared IBAN length", () => {
  assert.ok(IBAN_COUNTRIES.length >= 85);
  for (const country of IBAN_COUNTRIES) {
    assert.equal(country.bbanTemplate.length, country.length - 4, country.code);
  }
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
    assert.equal(profile.banking.currency, country.currency);
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
