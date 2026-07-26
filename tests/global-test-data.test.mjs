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
