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
