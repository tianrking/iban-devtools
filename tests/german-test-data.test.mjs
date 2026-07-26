import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_GERMAN_PROFILE,
  generateGermanTaxId,
  generateGermanTestProfile,
  validateGermanTaxId,
} from "../lib/german-test-data.ts";

test("generates checksum-valid German tax IDs with the official classic structure", () => {
  assert.equal(validateGermanTaxId(DEFAULT_GERMAN_PROFILE.taxId), true);

  const taxIds = Array.from({ length: 1_000 }, generateGermanTaxId);
  assert.equal(taxIds.every(validateGermanTaxId), true);
  assert.equal(taxIds.length, 1_000);
});

test("generates a complete synthetic German profile for the selected state and gender", () => {
  const profile = generateGermanTestProfile("HH", "female");

  assert.equal(validateGermanTaxId(profile.taxId), true);
  assert.equal(profile.gender, "female");
  assert.equal(profile.address.state, "Hamburg");
  assert.match(profile.bankIban, /^DE\d{20}$/);
  assert.match(profile.healthInsuranceNumber, /^[A-Z]\d{9}$/);
  assert.match(profile.employerTaxNumber, /^\d{13}$/);
});
