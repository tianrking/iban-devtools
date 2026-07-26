/// <reference lib="webworker" />

import {
  createRandomInt,
  generateSyntheticIdentity,
  type AgeChoice,
  type IdentityScenario,
  type ProfileGender,
  type SyntheticIdentity,
} from "@/lib/global-test-data";
import {
  generateIban,
  IBAN_COUNTRY_MAP,
  type IbanCaseMode,
} from "@/lib/iban-core";

export type BatchWorkerRequest = {
  countryCode: string;
  count: number;
  bankCode: string;
  account: string;
  seed: string;
  caseMode: IbanCaseMode;
  scenario: IdentityScenario;
  cityChoice: string;
  allowedCities: string[];
  genderChoice: ProfileGender | "random";
  ageChoice: AgeChoice;
  firstNameOverride: string;
  lastNameOverride: string;
  streetOverride: string;
  postalCodeOverride: string;
};

export type BatchWorkerResponse =
  | { ok: true; profiles: SyntheticIdentity[]; elapsedMs: number }
  | { ok: false; error: string };

self.addEventListener("message", (event: MessageEvent<BatchWorkerRequest>) => {
  const input = event.data;
  const country = IBAN_COUNTRY_MAP.get(input.countryCode);
  if (!country) {
    self.postMessage({ ok: false, error: "UNSUPPORTED_COUNTRY" } satisfies BatchWorkerResponse);
    return;
  }

  const started = performance.now();
  const profiles = Array.from({ length: input.count }, (_, index) => {
    const iban = generateIban(
      country,
      createRandomInt(input.seed ? `${input.seed}:iban:${index}` : undefined),
      {
        bankCode: input.bankCode,
        account: input.account,
        caseMode: input.caseMode,
      },
    );
    const cityName =
      input.cityChoice !== "random"
        ? input.cityChoice
        : input.allowedCities[
            createRandomInt(input.seed ? `${input.seed}:city:${index}` : undefined)(
              input.allowedCities.length,
            )
          ] ?? "random";
    return generateSyntheticIdentity({
      countryCode: input.countryCode,
      iban,
      cityName,
      genderChoice: input.genderChoice,
      ageChoice: input.ageChoice,
      firstNameOverride: input.firstNameOverride,
      lastNameOverride: input.lastNameOverride,
      streetOverride: input.streetOverride,
      postalCodeOverride: input.postalCodeOverride,
      scenario: input.scenario,
      seed: input.seed,
      index,
    });
  });

  self.postMessage({
    ok: true,
    profiles,
    elapsedMs: performance.now() - started,
  } satisfies BatchWorkerResponse);
});
