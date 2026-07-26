/// <reference lib="webworker" />

import {
  createRandomInt,
  generateSyntheticIdentity,
  type AgeChoice,
  type IdentityScenario,
  type ProfileGender,
  type SyntheticIdentity,
} from "@/lib/global-test-data";
import { type IbanCaseMode } from "@/lib/iban-core";
import { COUNTRY_CATALOG_MAP } from "@/lib/country-catalog";
import { generateNationalBanking } from "@/lib/national-banking";

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
  allowedGeoCities: Array<{
    name: string;
    region: string;
    timezone?: string;
  }>;
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
  const country = COUNTRY_CATALOG_MAP.get(input.countryCode);
  if (!country) {
    self.postMessage({ ok: false, error: "UNSUPPORTED_COUNTRY" } satisfies BatchWorkerResponse);
    return;
  }

  const started = performance.now();
  const profiles = Array.from({ length: input.count }, (_, index) => {
    const bankingIdentity = generateNationalBanking(
      country,
      createRandomInt(input.seed ? `${input.seed}:iban:${index}` : undefined),
      {
        bankCode: input.bankCode,
        account: input.account,
        caseMode: input.caseMode,
      },
    );
    const geoCity =
      input.allowedGeoCities[
        createRandomInt(input.seed ? `${input.seed}:city:${index}` : undefined)(
          input.allowedGeoCities.length,
        )
      ];
    const cityName =
      geoCity
        ? "random"
        :
      input.cityChoice !== "random"
        ? input.cityChoice
        : input.allowedCities[
            createRandomInt(input.seed ? `${input.seed}:city:${index}` : undefined)(
              input.allowedCities.length,
            )
          ] ?? "random";
    return generateSyntheticIdentity({
      countryCode: input.countryCode,
      iban: bankingIdentity.iban ?? "",
      bankingIdentity,
      cityName,
      cityOverride: geoCity,
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
