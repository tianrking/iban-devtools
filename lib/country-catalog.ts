import {
  IBAN_COUNTRIES,
  IBAN_COUNTRY_MAP,
  type IbanCountrySpec,
} from "./iban-core.ts";

export type NationalPaymentScheme =
  | "IBAN"
  | "ABA"
  | "CACPA"
  | "CLABE"
  | "LOCAL";

export type CountryCatalogSpec = {
  code: string;
  flag: string;
  name: string;
  currency: string;
  continent: "Americas" | "Global";
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
  geoDataPath: string | null;
};

type AmericasRawSpec = readonly [
  code: string,
  flag: string,
  name: string,
  currency: string,
  phonePrefix: string,
  locale: string,
  language: string,
  timezone: string,
  scheme?: Exclude<NationalPaymentScheme, "IBAN">,
];

const AMERICAS_RAW: AmericasRawSpec[] = [
  ["US", "🇺🇸", "美国", "USD", "+1", "en-US", "en", "America/New_York", "ABA"],
  ["CA", "🇨🇦", "加拿大", "CAD", "+1", "en-CA", "en", "America/Toronto", "CACPA"],
  ["MX", "🇲🇽", "墨西哥", "MXN", "+52", "es-MX", "es", "America/Mexico_City", "CLABE"],
  ["BZ", "🇧🇿", "伯利兹", "BZD", "+501", "en-BZ", "en", "America/Belize"],
  ["CR", "🇨🇷", "哥斯达黎加", "CRC", "+506", "es-CR", "es", "America/Costa_Rica"],
  ["SV", "🇸🇻", "萨尔瓦多", "USD", "+503", "es-SV", "es", "America/El_Salvador"],
  ["GT", "🇬🇹", "危地马拉", "GTQ", "+502", "es-GT", "es", "America/Guatemala"],
  ["HN", "🇭🇳", "洪都拉斯", "HNL", "+504", "es-HN", "es", "America/Tegucigalpa"],
  ["NI", "🇳🇮", "尼加拉瓜", "NIO", "+505", "es-NI", "es", "America/Managua"],
  ["PA", "🇵🇦", "巴拿马", "PAB", "+507", "es-PA", "es", "America/Panama"],
  ["AG", "🇦🇬", "安提瓜和巴布达", "XCD", "+1 268", "en-AG", "en", "America/Antigua"],
  ["BS", "🇧🇸", "巴哈马", "BSD", "+1 242", "en-BS", "en", "America/Nassau"],
  ["BB", "🇧🇧", "巴巴多斯", "BBD", "+1 246", "en-BB", "en", "America/Barbados"],
  ["CU", "🇨🇺", "古巴", "CUP", "+53", "es-CU", "es", "America/Havana"],
  ["DM", "🇩🇲", "多米尼克", "XCD", "+1 767", "en-DM", "en", "America/Dominica"],
  ["DO", "🇩🇴", "多米尼加共和国", "DOP", "+1 809", "es-DO", "es", "America/Santo_Domingo"],
  ["GD", "🇬🇩", "格林纳达", "XCD", "+1 473", "en-GD", "en", "America/Grenada"],
  ["HT", "🇭🇹", "海地", "HTG", "+509", "fr-HT", "fr", "America/Port-au-Prince"],
  ["JM", "🇯🇲", "牙买加", "JMD", "+1 876", "en-JM", "en", "America/Jamaica"],
  ["KN", "🇰🇳", "圣基茨和尼维斯", "XCD", "+1 869", "en-KN", "en", "America/St_Kitts"],
  ["LC", "🇱🇨", "圣卢西亚", "XCD", "+1 758", "en-LC", "en", "America/St_Lucia"],
  ["VC", "🇻🇨", "圣文森特和格林纳丁斯", "XCD", "+1 784", "en-VC", "en", "America/St_Vincent"],
  ["TT", "🇹🇹", "特立尼达和多巴哥", "TTD", "+1 868", "en-TT", "en", "America/Port_of_Spain"],
  ["AR", "🇦🇷", "阿根廷", "ARS", "+54", "es-AR", "es", "America/Argentina/Buenos_Aires"],
  ["BO", "🇧🇴", "玻利维亚", "BOB", "+591", "es-BO", "es", "America/La_Paz"],
  ["BR", "🇧🇷", "巴西", "BRL", "+55", "pt-BR", "pt", "America/Sao_Paulo"],
  ["CL", "🇨🇱", "智利", "CLP", "+56", "es-CL", "es", "America/Santiago"],
  ["CO", "🇨🇴", "哥伦比亚", "COP", "+57", "es-CO", "es", "America/Bogota"],
  ["EC", "🇪🇨", "厄瓜多尔", "USD", "+593", "es-EC", "es", "America/Guayaquil"],
  ["GY", "🇬🇾", "圭亚那", "GYD", "+592", "en-GY", "en", "America/Guyana"],
  ["PY", "🇵🇾", "巴拉圭", "PYG", "+595", "es-PY", "es", "America/Asuncion"],
  ["PE", "🇵🇪", "秘鲁", "PEN", "+51", "es-PE", "es", "America/Lima"],
  ["SR", "🇸🇷", "苏里南", "SRD", "+597", "nl-SR", "nl", "America/Paramaribo"],
  ["UY", "🇺🇾", "乌拉圭", "UYU", "+598", "es-UY", "es", "America/Montevideo"],
  ["VE", "🇻🇪", "委内瑞拉", "VES", "+58", "es-VE", "es", "America/Caracas"],
];

export const AMERICAS_SOVEREIGN_CODES = AMERICAS_RAW.map(([code]) => code);
const AMERICAS_MAP = new Map(AMERICAS_RAW.map((item) => [item[0], item]));

function paymentSpec(
  scheme: NationalPaymentScheme,
  ibanSpec: IbanCountrySpec | null,
): CountryCatalogSpec["payment"] {
  if (scheme === "IBAN" && ibanSpec) {
    return {
      scheme,
      label: "IBAN",
      routingLabel: ibanSpec.bankLabel,
      bankCodeLen: ibanSpec.bankCodeLen,
      accountLen: ibanSpec.accountLen,
      validation: "checksum",
    };
  }
  if (scheme === "ABA") {
    return {
      scheme,
      label: "ABA routing + account",
      routingLabel: "ABA routing number",
      bankCodeLen: 9,
      accountLen: 12,
      validation: "checksum",
    };
  }
  if (scheme === "CACPA") {
    return {
      scheme,
      label: "Canadian routing + account",
      routingLabel: "Electronic routing number",
      bankCodeLen: 9,
      accountLen: 12,
      validation: "format-only",
    };
  }
  if (scheme === "CLABE") {
    return {
      scheme,
      label: "CLABE",
      routingLabel: "Bank + plaza code",
      bankCodeLen: 6,
      accountLen: 11,
      validation: "checksum",
    };
  }
  return {
    scheme,
    label: "Local bank account test value",
    routingLabel: "Institution / branch code",
    bankCodeLen: 6,
    accountLen: 12,
    validation: "format-only",
  };
}

function globalCatalogEntry(ibanSpec: IbanCountrySpec): CountryCatalogSpec {
  const americas = AMERICAS_MAP.get(ibanSpec.code);
  if (americas) return americasCatalogEntry(americas);
  return {
    code: ibanSpec.code,
    flag: ibanSpec.flag,
    name: ibanSpec.name,
    currency: ibanSpec.currency,
    continent: "Global",
    phonePrefix: "+999",
    locale: `en-${ibanSpec.code}`,
    language: "en",
    timezone: "UTC",
    emailDomain: `example.${ibanSpec.code.toLowerCase()}`,
    taxLabel: `${ibanSpec.code} tax identifier (format-only)`,
    insuranceLabel: `${ibanSpec.code} insurance reference (format-only)`,
    payment: paymentSpec("IBAN", ibanSpec),
    ibanSpec,
    geoDataPath: null,
  };
}

function americasCatalogEntry(raw: AmericasRawSpec): CountryCatalogSpec {
  const [code, flag, name, currency, phonePrefix, locale, language, timezone, fallbackScheme] = raw;
  const ibanSpec = IBAN_COUNTRY_MAP.get(code) ?? null;
  const scheme: NationalPaymentScheme = ibanSpec ? "IBAN" : (fallbackScheme ?? "LOCAL");
  return {
    code,
    flag,
    name,
    currency,
    continent: "Americas",
    phonePrefix,
    locale,
    language,
    timezone,
    emailDomain: `example.${code.toLowerCase()}`,
    taxLabel: `${code} tax identifier (synthetic format-only)`,
    insuranceLabel: `${code} insurance reference (synthetic format-only)`,
    payment: paymentSpec(scheme, ibanSpec),
    ibanSpec,
    geoDataPath: `/data/americas/${code.toLowerCase()}.json`,
  };
}

const nonIbanAmericas = AMERICAS_RAW
  .filter(([code]) => !IBAN_COUNTRY_MAP.has(code))
  .map(americasCatalogEntry);

export const COUNTRY_CATALOG: CountryCatalogSpec[] = [
  ...IBAN_COUNTRIES.map(globalCatalogEntry),
  ...nonIbanAmericas,
].sort((left, right) => left.code.localeCompare(right.code));

export const COUNTRY_CATALOG_MAP = new Map(
  COUNTRY_CATALOG.map((country) => [country.code, country]),
);

export function getCountryCatalogSpec(code: string) {
  return COUNTRY_CATALOG_MAP.get(code.toUpperCase());
}
