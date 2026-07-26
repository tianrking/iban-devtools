import assert from "node:assert/strict";
import test from "node:test";
import {
  IDENTITY_COUNTRIES,
  generateSyntheticIdentity,
} from "../lib/global-test-data.ts";
import { validateGermanTaxId } from "../lib/german-test-data.ts";

test("provides localized complete identity data for every supported IBAN country", () => {
  assert.equal(IDENTITY_COUNTRIES.length, 15);

  for (const country of IDENTITY_COUNTRIES) {
    const city = country.cities[0];
    const iban = `${country.code}00${"0".repeat(24)}`;
    const profile = generateSyntheticIdentity({
      countryCode: country.code,
      iban,
      cityName: city.name,
      genderChoice: "female",
      ageChoice: 32,
    });

    assert.equal(profile.country.code, country.code);
    assert.equal(profile.personal.gender, "female");
    assert.equal(profile.personal.age, 32);
    assert.equal(profile.address.city, city.name);
    assert.equal(profile.banking.iban, iban);
    assert.match(profile.contact.email, /@example\./);
    assert.match(profile.government.insuranceNumber, /^(?:[A-Z]\d{9}|TEST-[A-Z]{2}-\d{8})$/);
    assert.match(profile.banking.card.number, /^(?:4|5)/);
  }
});

test("keeps German Steuer-ID checksum-valid inside the unified identity", () => {
  const profile = generateSyntheticIdentity({
    countryCode: "DE",
    iban: "DE89370400440532013000",
    cityName: "Berlin",
    genderChoice: "male",
    ageChoice: 41,
  });

  assert.equal(profile.government.taxStatus, "checksum-valid");
  assert.equal(validateGermanTaxId(profile.government.taxId), true);
});

test("replays the same complete identity when a seed is supplied", () => {
  const options = {
    countryCode: "FR",
    iban: "FR1420041010050500013M02606",
    cityName: "Lyon",
    genderChoice: "female",
    ageChoice: { min: 28, max: 35 },
    seed: "qa-regression-01",
    index: 4,
  };

  const first = generateSyntheticIdentity(options);
  const second = generateSyntheticIdentity(options);

  assert.deepEqual(first, second);
  assert.ok(first.personal.age >= 28);
  assert.ok(first.personal.age <= 35);
});

test("applies exact identity and address overrides", () => {
  const profile = generateSyntheticIdentity({
    countryCode: "NL",
    iban: "NL91ABNA0417164300",
    cityName: "Utrecht",
    genderChoice: "male",
    ageChoice: 30,
    firstNameOverride: "Test",
    lastNameOverride: "Runner",
    streetOverride: "Automation Lane",
    postalCodeOverride: "9999 ZZ",
    seed: "override-case",
  });

  assert.equal(profile.personal.fullName, "Test Runner");
  assert.equal(profile.address.street, "Automation Lane");
  assert.equal(profile.address.postalCode, "9999 ZZ");
  assert.match(profile.contact.email, /^test\.runner@/);
});
