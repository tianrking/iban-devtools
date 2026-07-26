export type TemplateChar = "n" | "a" | "c";
export type IbanCaseMode =
  | "valid"
  | "bad-checksum"
  | "wrong-length"
  | "illegal-character"
  | "bad-bban"
  | "lowercase"
  | "hyphenated";

export type IbanCountrySpec = {
  code: string;
  flag: string;
  name: string;
  length: number;
  bbanTemplate: string;
  structure: string;
  bankCodeStart: number;
  bankCodeLen: number;
  accountStart: number;
  accountLen: number;
  bankLabel: string;
  sepa: boolean;
  currency: string;
  registryRelease: string;
};

type RawSpec = readonly [
  code: string,
  flag: string,
  name: string,
  length: number,
  structure: string,
  bankCodeLen: number,
  accountStart: number,
  accountLen: number,
  sepa: boolean,
  currency: string,
];

const REGISTRY_RELEASE = "SWIFT IBAN Registry · Release 102 · June 2026";

const RAW_SPECS: RawSpec[] = [
  ["AD", "🇦🇩", "Andorra", 24, "8n12c", 4, 8, 12, true, "EUR"],
  ["AE", "🇦🇪", "United Arab Emirates", 23, "3n16n", 3, 3, 16, false, "AED"],
  ["AL", "🇦🇱", "Albania", 28, "8n16c", 8, 8, 16, true, "ALL"],
  ["AT", "🇦🇹", "奥地利", 20, "5n11n", 5, 5, 11, true, "EUR"],
  ["AZ", "🇦🇿", "Azerbaijan", 28, "4a20c", 4, 4, 20, false, "AZN"],
  ["BA", "🇧🇦", "Bosnia and Herzegovina", 20, "6n8n2n", 6, 6, 8, false, "BAM"],
  ["BE", "🇧🇪", "比利时", 16, "3n7n2n", 3, 3, 7, true, "EUR"],
  ["BG", "🇧🇬", "Bulgaria", 22, "4a4n2n8c", 4, 10, 8, true, "EUR"],
  ["BH", "🇧🇭", "Bahrain", 22, "4a14c", 4, 4, 14, false, "BHD"],
  ["BI", "🇧🇮", "Burundi", 27, "5n5n11n2n", 5, 10, 11, false, "BIF"],
  ["BR", "🇧🇷", "Brazil", 29, "8n5n10n1a1c", 8, 13, 10, false, "BRL"],
  ["BY", "🇧🇾", "Belarus", 28, "4c4n16c", 4, 8, 16, false, "BYN"],
  ["CH", "🇨🇭", "瑞士", 21, "5n12c", 5, 5, 12, true, "CHF"],
  ["CR", "🇨🇷", "Costa Rica", 22, "4n14n", 4, 4, 14, false, "CRC"],
  ["CY", "🇨🇾", "Cyprus", 28, "3n5n16c", 3, 8, 16, true, "EUR"],
  ["CZ", "🇨🇿", "Czechia", 24, "4n6n10n", 4, 10, 10, true, "CZK"],
  ["DE", "🇩🇪", "德国", 22, "8n10n", 8, 8, 10, true, "EUR"],
  ["DJ", "🇩🇯", "Djibouti", 27, "5n5n11n2n", 5, 10, 11, false, "DJF"],
  ["DK", "🇩🇰", "Denmark", 18, "4n9n1n", 4, 4, 10, true, "DKK"],
  ["DO", "🇩🇴", "Dominican Republic", 28, "4a20n", 4, 4, 20, false, "DOP"],
  ["DZ", "🇩🇿", "Algeria", 24, "20n", 3, 10, 10, false, "DZD"],
  ["EE", "🇪🇪", "Estonia", 20, "4n11n1n", 4, 4, 12, true, "EUR"],
  ["EG", "🇪🇬", "Egypt", 29, "4n4n17n", 4, 8, 17, false, "EGP"],
  ["ES", "🇪🇸", "西班牙", 24, "4n4n2n10n", 4, 10, 10, true, "EUR"],
  ["FI", "🇫🇮", "芬兰", 18, "6n7n1n", 6, 6, 8, true, "EUR"],
  ["FK", "🇫🇰", "Falkland Islands", 18, "2a12n", 2, 2, 12, false, "FKP"],
  ["FO", "🇫🇴", "Faroe Islands", 18, "4n9n1n", 4, 4, 10, true, "DKK"],
  ["FR", "🇫🇷", "法国", 27, "5n5n11c2n", 5, 10, 11, true, "EUR"],
  ["GB", "🇬🇧", "英国", 22, "4a6n8n", 4, 10, 8, true, "GBP"],
  ["GE", "🇬🇪", "Georgia", 22, "2a16n", 2, 2, 16, false, "GEL"],
  ["GI", "🇬🇮", "Gibraltar", 23, "4a15c", 4, 4, 15, true, "GIP"],
  ["GL", "🇬🇱", "Greenland", 18, "4n9n1n", 4, 4, 10, true, "DKK"],
  ["GR", "🇬🇷", "Greece", 27, "3n4n16c", 3, 7, 16, true, "EUR"],
  ["GT", "🇬🇹", "Guatemala", 28, "4c20c", 4, 4, 20, false, "GTQ"],
  ["HR", "🇭🇷", "Croatia", 21, "7n10n", 7, 7, 10, true, "EUR"],
  ["HU", "🇭🇺", "Hungary", 28, "7n1n15n1n", 7, 8, 16, true, "HUF"],
  ["IE", "🇮🇪", "爱尔兰", 22, "4a6n8n", 4, 10, 8, true, "EUR"],
  ["IL", "🇮🇱", "Israel", 23, "3n3n13n", 3, 6, 13, false, "ILS"],
  ["IQ", "🇮🇶", "Iraq", 23, "4a3n12n", 4, 7, 12, false, "IQD"],
  ["IS", "🇮🇸", "Iceland", 26, "4n2n6n10n", 4, 12, 10, true, "ISK"],
  ["IT", "🇮🇹", "意大利", 27, "1a5n5n12c", 5, 11, 12, true, "EUR"],
  ["JO", "🇯🇴", "Jordan", 30, "4a4n18c", 4, 8, 18, false, "JOD"],
  ["KW", "🇰🇼", "Kuwait", 30, "4a22c", 4, 4, 22, false, "KWD"],
  ["KZ", "🇰🇿", "Kazakhstan", 20, "3n13c", 3, 3, 13, false, "KZT"],
  ["LB", "🇱🇧", "Lebanon", 28, "4n20c", 4, 4, 20, false, "LBP"],
  ["LC", "🇱🇨", "Saint Lucia", 32, "4a24c", 4, 4, 24, false, "XCD"],
  ["LI", "🇱🇮", "Liechtenstein", 21, "5n12c", 5, 5, 12, true, "CHF"],
  ["LT", "🇱🇹", "Lithuania", 20, "5n11n", 5, 5, 11, true, "EUR"],
  ["LU", "🇱🇺", "卢森堡", 20, "3n13c", 3, 3, 13, true, "EUR"],
  ["LV", "🇱🇻", "Latvia", 21, "4a13c", 4, 4, 13, true, "EUR"],
  ["LY", "🇱🇾", "Libya", 25, "3n3n15n", 3, 6, 15, false, "LYD"],
  ["MC", "🇲🇨", "Monaco", 27, "5n5n11c2n", 5, 10, 11, true, "EUR"],
  ["MD", "🇲🇩", "Moldova", 24, "2c18c", 2, 2, 18, true, "MDL"],
  ["ME", "🇲🇪", "Montenegro", 22, "3n13n2n", 3, 3, 13, true, "EUR"],
  ["MK", "🇲🇰", "North Macedonia", 19, "3n10c2n", 3, 3, 10, true, "MKD"],
  ["MN", "🇲🇳", "Mongolia", 20, "4n12n", 4, 4, 12, false, "MNT"],
  ["MR", "🇲🇷", "Mauritania", 27, "5n5n11n2n", 5, 10, 11, false, "MRU"],
  ["MT", "🇲🇹", "Malta", 31, "4a5n18c", 4, 9, 18, true, "EUR"],
  ["MU", "🇲🇺", "Mauritius", 30, "4a4n15n3a", 4, 8, 15, false, "MUR"],
  ["NI", "🇳🇮", "Nicaragua", 28, "4a20n", 4, 4, 20, false, "NIO"],
  ["NL", "🇳🇱", "荷兰", 18, "4a10n", 4, 4, 10, true, "EUR"],
  ["NO", "🇳🇴", "挪威", 15, "4n6n1n", 4, 4, 7, true, "NOK"],
  ["OM", "🇴🇲", "Oman", 23, "3n16c", 3, 3, 16, false, "OMR"],
  ["PK", "🇵🇰", "Pakistan", 24, "4a16c", 4, 4, 16, false, "PKR"],
  ["PL", "🇵🇱", "波兰", 28, "8n16n", 8, 8, 16, true, "PLN"],
  ["PS", "🇵🇸", "Palestine", 29, "4a21c", 4, 4, 21, false, "ILS"],
  ["PT", "🇵🇹", "葡萄牙", 25, "8n2n11n", 4, 10, 11, true, "EUR"],
  ["QA", "🇶🇦", "Qatar", 29, "4a21c", 4, 4, 21, false, "QAR"],
  ["RO", "🇷🇴", "Romania", 24, "4a16c", 4, 4, 16, true, "RON"],
  ["RS", "🇷🇸", "Serbia", 22, "3n13n2n", 3, 3, 13, true, "RSD"],
  ["RU", "🇷🇺", "Russia", 33, "9n5n15c", 9, 14, 15, false, "RUB"],
  ["SA", "🇸🇦", "Saudi Arabia", 24, "2n18c", 2, 2, 18, false, "SAR"],
  ["SC", "🇸🇨", "Seychelles", 31, "4a4n16n3a", 4, 8, 16, false, "SCR"],
  ["SD", "🇸🇩", "Sudan", 18, "14n", 2, 2, 12, false, "SDG"],
  ["SE", "🇸🇪", "Sweden", 24, "3n16n1n", 3, 3, 17, true, "SEK"],
  ["SI", "🇸🇮", "Slovenia", 19, "5n8n2n", 5, 5, 8, true, "EUR"],
  ["SK", "🇸🇰", "Slovakia", 24, "4n6n10n", 4, 10, 10, true, "EUR"],
  ["SM", "🇸🇲", "San Marino", 27, "1a5n5n12c", 5, 11, 12, true, "EUR"],
  ["SO", "🇸🇴", "Somalia", 23, "4n3n12n", 4, 7, 12, false, "SOS"],
  ["ST", "🇸🇹", "São Tomé and Príncipe", 25, "8n11n2n", 8, 8, 13, false, "STN"],
  ["SV", "🇸🇻", "El Salvador", 28, "4a20n", 4, 4, 20, false, "USD"],
  ["TL", "🇹🇱", "Timor-Leste", 23, "3n14n2n", 3, 3, 14, false, "USD"],
  ["TN", "🇹🇳", "Tunisia", 24, "2n3n13n2n", 5, 5, 13, false, "TND"],
  ["TR", "🇹🇷", "Türkiye", 26, "5n1n16c", 5, 6, 16, false, "TRY"],
  ["UA", "🇺🇦", "Ukraine", 29, "6n19c", 6, 6, 19, false, "UAH"],
  ["VA", "🇻🇦", "Vatican City", 22, "3n15n", 3, 3, 15, true, "EUR"],
  ["VG", "🇻🇬", "British Virgin Islands", 24, "4a16n", 4, 4, 16, false, "USD"],
  ["XK", "🇽🇰", "Kosovo", 20, "4n10n2n", 4, 4, 12, true, "EUR"],
  ["YE", "🇾🇪", "Yemen", 30, "4a4n18c", 4, 8, 18, false, "YER"],
];

function expandStructure(structure: string) {
  const tokens = [...structure.matchAll(/(\d+)([nac])/g)];
  return tokens
    .map(([, count, type]) => type.repeat(Number(count)))
    .join("");
}

export const IBAN_COUNTRIES: IbanCountrySpec[] = RAW_SPECS.map(
  ([
    code,
    flag,
    name,
    length,
    structure,
    bankCodeLen,
    accountStart,
    accountLen,
    sepa,
    currency,
  ]) => ({
    code,
    flag,
    name,
    length,
    structure,
    bbanTemplate: expandStructure(structure),
    bankCodeStart: code === "IT" || code === "SM" ? 1 : 0,
    bankCodeLen,
    accountStart,
    accountLen,
    bankLabel: "Bank / Institution Code",
    sepa,
    currency,
    registryRelease: REGISTRY_RELEASE,
  }),
);

export const IBAN_COUNTRY_MAP = new Map(
  IBAN_COUNTRIES.map((country) => [country.code, country]),
);

export function cleanIban(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function formatIban(value: string) {
  return cleanIban(value).replace(/(.{4})/g, "$1 ").trim();
}

export function charToNum(char: string) {
  const code = char.charCodeAt(0);
  return code >= 65 && code <= 90 ? String(code - 55) : char;
}

export function mod97(numeric: string) {
  let checksum = 0;
  for (const digit of numeric) {
    checksum = (checksum * 10 + Number(digit)) % 97;
  }
  return checksum;
}

export function calculateCheckDigits(countryCode: string, bban: string) {
  const numeric = [...`${bban}${countryCode}00`].map(charToNum).join("");
  return String(98 - mod97(numeric)).padStart(2, "0");
}

function randomChar(type: TemplateChar, randomInt: (max: number) => number) {
  if (type === "n") return String(randomInt(10));
  if (type === "a") return String.fromCharCode(65 + randomInt(26));
  return randomInt(2) === 0
    ? String(randomInt(10))
    : String.fromCharCode(65 + randomInt(26));
}

function overlayBban(
  bban: string[],
  spec: IbanCountrySpec,
  raw: string,
  start: number,
  length: number,
) {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, length);
  [...clean].forEach((char, index) => {
    const type = spec.bbanTemplate[start + index] as TemplateChar;
    if (type === "n" && !/\d/.test(char)) return;
    if (type === "a" && !/[A-Z]/.test(char)) return;
    bban[start + index] = char;
  });
}

export function buildBban(
  spec: IbanCountrySpec,
  randomInt: (max: number) => number,
  bankCode = "",
  account = "",
) {
  const bban = [...spec.bbanTemplate].map((type) =>
    randomChar(type as TemplateChar, randomInt),
  );
  if (bankCode) {
    overlayBban(bban, spec, bankCode, spec.bankCodeStart, spec.bankCodeLen);
  }
  if (account) {
    overlayBban(bban, spec, account, spec.accountStart, spec.accountLen);
  }
  return bban.join("");
}

export function mutateIban(value: string, mode: IbanCaseMode) {
  if (mode === "valid") return value;
  if (mode === "bad-checksum") {
    const replacement = value.slice(2, 4) === "00" ? "01" : "00";
    return `${value.slice(0, 2)}${replacement}${value.slice(4)}`;
  }
  if (mode === "wrong-length") return value.slice(0, -1);
  if (mode === "illegal-character") {
    return `${value.slice(0, 7)}@${value.slice(8)}`;
  }
  if (mode === "bad-bban") {
    const spec = IBAN_COUNTRY_MAP.get(value.slice(0, 2));
    if (!spec) return value;
    const index = spec.bbanTemplate.indexOf("n");
    return index >= 0
      ? `${value.slice(0, index + 4)}Z${value.slice(index + 5)}`
      : `${value.slice(0, 4)}0${value.slice(5)}`;
  }
  if (mode === "lowercase") return value.toLowerCase();
  if (mode === "hyphenated") return formatIban(value).replaceAll(" ", "-");
  return value;
}

export function generateIban(
  spec: IbanCountrySpec,
  randomInt: (max: number) => number,
  options: {
    bankCode?: string;
    account?: string;
    caseMode?: IbanCaseMode;
  } = {},
) {
  const bban = buildBban(
    spec,
    randomInt,
    options.bankCode,
    options.account,
  );
  const valid = `${spec.code}${calculateCheckDigits(spec.code, bban)}${bban}`;
  return mutateIban(valid, options.caseMode ?? "valid");
}

function bbanRegex(spec: IbanCountrySpec) {
  return spec.bbanTemplate
    .replaceAll("n", "[0-9]")
    .replaceAll("a", "[A-Z]")
    .replaceAll("c", "[A-Z0-9]");
}

export function countryRegex(spec: IbanCountrySpec) {
  return `^${spec.code}\\d{2}${bbanRegex(spec)}$`;
}

export function validateIban(input: string) {
  const normalizedInput = input.trim();
  const compact = cleanIban(input);
  const country = IBAN_COUNTRY_MAP.get(compact.slice(0, 2)) ?? null;
  const inputCharactersValid = /^[A-Za-z0-9\s-]*$/.test(normalizedInput);
  const lengthValid = Boolean(country && compact.length === country.length);
  const bban = compact.slice(4);
  const bbanValid = Boolean(
    country && new RegExp(`^${bbanRegex(country)}$`).test(bban),
  );
  const numeric = [...`${compact.slice(4)}${compact.slice(0, 4)}`]
    .map(charToNum)
    .join("");
  const checksumValid =
    compact.length >= 4 && /^\d+$/.test(numeric) && mod97(numeric) === 1;
  const valid =
    Boolean(country) &&
    inputCharactersValid &&
    lengthValid &&
    bbanValid &&
    checksumValid;

  const errors: string[] = [];
  if (!inputCharactersValid) errors.push("ILLEGAL_CHARACTERS");
  if (!country) errors.push("UNREGISTERED_COUNTRY");
  if (country && !lengthValid) errors.push("INVALID_LENGTH");
  if (country && lengthValid && !bbanValid) errors.push("INVALID_BBAN_STRUCTURE");
  if (country && lengthValid && bbanValid && !checksumValid) {
    errors.push("INVALID_CHECKSUM");
  }

  return {
    valid,
    compact,
    country,
    checks: {
      inputCharactersValid,
      countryRegistered: Boolean(country),
      lengthValid,
      bbanValid,
      checksumValid,
    },
    errors,
    reason: valid
      ? "REGISTRY_FORMAT_AND_MOD97_VALID"
      : errors[0] ?? "INVALID_IBAN",
    authenticity: "UNKNOWN" as const,
  };
}
