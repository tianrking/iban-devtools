import {
  IBAN_COUNTRY_MAP,
  type IbanCountrySpec,
} from "./iban-core.ts";
import {
  WORLD_GEO_COUNTS,
  WORLD_GEO_SOURCE,
  WORLD_COUNTRY_DATA,
  type GeneratedWorldCountry,
} from "./world-country-data.generated.ts";

export { WORLD_GEO_COUNTS, WORLD_GEO_SOURCE };

export type NationalPaymentScheme =
  | "IBAN"
  | "ABA"
  | "CACPA"
  | "CLABE"
  | "CBU"
  | "BSB"
  | "CNAPS"
  | "HKICL"
  | "IFSC"
  | "ZENGIN"
  | "NZ-ACCOUNT"
  | "SG-ACCOUNT"
  | "ZA-BRANCH"
  | "LOCAL";

export type CountryCatalogSpec = {
  code: string;
  flag: string;
  name: string;
  englishName: string;
  nativeName: string;
  currency: string;
  currencies: string[];
  region: string;
  subregion: string;
  phonePrefix: string;
  locale: string;
  language: string;
  timezone: string;
  emailDomain: string;
  taxLabel: string;
  insuranceLabel: string;
  payment: {
    scheme: NationalPaymentScheme;
    label: string;
    routingLabel: string;
    bankCodeLen: number;
    accountLen: number;
    validation: "checksum" | "format-only";
  };
  ibanSpec: IbanCountrySpec | null;
  geoDataPath: string;
  geoCoverage: {
    regions: number;
    cities: number;
  };
  isoStatus: "official" | "user-assigned";
};

export const AMERICAS_SOVEREIGN_CODES = [
  "US", "CA", "MX", "BZ", "CR", "SV", "GT", "HN", "NI", "PA",
  "AG", "BS", "BB", "CU", "DM", "DO", "GD", "HT", "JM", "KN",
  "LC", "VC", "TT", "AR", "BO", "BR", "CL", "CO", "EC", "GY",
  "PY", "PE", "SR", "UY", "VE",
] as const;

const LANGUAGE_GROUPS: Record<string, string> = {
  es: "AR BO CL CO CR CU DO EC ES GQ GT HN MX NI PA PE PR PY SV UY VE",
  pt: "AO BR CV GW MZ PT ST TL",
  fr: "BE BF BI BJ BL CA CD CF CG CI CM DJ FR GA GF GN GP HT KM LU MC MF MG ML MQ MR MU NC NE PF PM RE RW SC SN TD TG VU WF YT",
  de: "AT CH DE LI",
  it: "IT SM VA",
  nl: "AW BE BQ CW NL SR SX",
  ru: "BY KG KZ RU",
  ar: "AE BH DJ DZ EG IQ JO KM KW LB LY MA MR OM PS QA SA SD SO SY TD TN YE",
  zh: "CN HK MO TW",
  ja: "JP",
  ko: "KP KR",
  hi: "IN",
  tr: "CY TR",
  pl: "PL",
  uk: "UA",
  fa: "AF IR",
};

const LANGUAGE_BY_COUNTRY = new Map<string, string>();
for (const [language, codes] of Object.entries(LANGUAGE_GROUPS)) {
  for (const code of codes.split(" ")) {
    LANGUAGE_BY_COUNTRY.set(code, language);
  }
}

type LocalPaymentOverride = Omit<
  CountryCatalogSpec["payment"],
  "validation"
>;

const LOCAL_PAYMENT_OVERRIDES: Record<string, LocalPaymentOverride> = {
  AU: {
    scheme: "BSB",
    label: "BSB + account test value",
    routingLabel: "BSB",
    bankCodeLen: 6,
    accountLen: 9,
  },
  CN: {
    scheme: "CNAPS",
    label: "CNAPS + account test value",
    routingLabel: "CNAPS bank code",
    bankCodeLen: 12,
    accountLen: 19,
  },
  HK: {
    scheme: "HKICL",
    label: "Bank + branch + account test value",
    routingLabel: "Bank + branch code",
    bankCodeLen: 6,
    accountLen: 9,
  },
  IN: {
    scheme: "IFSC",
    label: "IFSC + account format fixture",
    routingLabel: "IFSC-style institution code",
    bankCodeLen: 11,
    accountLen: 18,
  },
  JP: {
    scheme: "ZENGIN",
    label: "Zengin bank + branch + account fixture",
    routingLabel: "Bank + branch code",
    bankCodeLen: 7,
    accountLen: 8,
  },
  NZ: {
    scheme: "NZ-ACCOUNT",
    label: "NZ bank + branch + account fixture",
    routingLabel: "Bank + branch code",
    bankCodeLen: 6,
    accountLen: 10,
  },
  SG: {
    scheme: "SG-ACCOUNT",
    label: "Bank + branch + account test value",
    routingLabel: "Bank + branch code",
    bankCodeLen: 7,
    accountLen: 12,
  },
  ZA: {
    scheme: "ZA-BRANCH",
    label: "Branch + account test value",
    routingLabel: "Branch code",
    bankCodeLen: 6,
    accountLen: 11,
  },
};

function paymentSpec(
  code: string,
  ibanSpec: IbanCountrySpec | null,
): CountryCatalogSpec["payment"] {
  if (ibanSpec) {
    return {
      scheme: "IBAN",
      label: "IBAN",
      routingLabel: ibanSpec.bankLabel,
      bankCodeLen: ibanSpec.bankCodeLen,
      accountLen: ibanSpec.accountLen,
      validation: "checksum",
    };
  }
  if (code === "US") {
    return {
      scheme: "ABA",
      label: "ABA routing + account",
      routingLabel: "ABA routing number",
      bankCodeLen: 9,
      accountLen: 12,
      validation: "checksum",
    };
  }
  if (code === "CA") {
    return {
      scheme: "CACPA",
      label: "Canadian routing + account",
      routingLabel: "Electronic routing number",
      bankCodeLen: 9,
      accountLen: 12,
      validation: "format-only",
    };
  }
  if (code === "MX") {
    return {
      scheme: "CLABE",
      label: "CLABE",
      routingLabel: "Bank + plaza code",
      bankCodeLen: 6,
      accountLen: 11,
      validation: "checksum",
    };
  }
  if (code === "AR") {
    return {
      scheme: "CBU",
      label: "CBU",
      routingLabel: "Bank + branch block",
      bankCodeLen: 7,
      accountLen: 13,
      validation: "checksum",
    };
  }
  const local = LOCAL_PAYMENT_OVERRIDES[code];
  return {
    scheme: local?.scheme ?? "LOCAL",
    label: local?.label ?? "Local bank account test value",
    routingLabel: local?.routingLabel ?? "Institution / branch code",
    bankCodeLen: local?.bankCodeLen ?? 6,
    accountLen: local?.accountLen ?? 12,
    validation: "format-only",
  };
}

function catalogEntry(source: GeneratedWorldCountry): CountryCatalogSpec {
  const ibanSpec = IBAN_COUNTRY_MAP.get(source.code) ?? null;
  const language = LANGUAGE_BY_COUNTRY.get(source.code) ?? "en";
  return {
    code: source.code,
    flag: source.flag,
    name: source.name,
    englishName: source.englishName,
    nativeName: source.nativeName,
    currency: source.currency,
    currencies: source.currencies,
    region: source.region,
    subregion: source.subregion,
    phonePrefix: source.phonePrefix,
    locale: `${language}-${source.code}`,
    language,
    timezone: source.timezone,
    emailDomain: `${source.code.toLowerCase()}.example`,
    taxLabel: `${source.code} tax identifier (synthetic format-only)`,
    insuranceLabel: `${source.code} insurance reference (synthetic format-only)`,
    payment: paymentSpec(source.code, ibanSpec),
    ibanSpec,
    geoDataPath: source.geoDataPath,
    geoCoverage: {
      regions: source.regions,
      cities: source.cities,
    },
    isoStatus: source.code === "XK" ? "user-assigned" : "official",
  };
}

export const COUNTRY_CATALOG: CountryCatalogSpec[] =
  WORLD_COUNTRY_DATA.map(catalogEntry);

export const COUNTRY_CATALOG_MAP = new Map(
  COUNTRY_CATALOG.map((country) => [country.code, country]),
);

export function getCountryCatalogSpec(code: string) {
  return COUNTRY_CATALOG_MAP.get(code.toUpperCase());
}
