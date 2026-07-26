import {
  cleanIban,
  generateIban,
  type IbanCaseMode,
} from "./iban-core.ts";
import type {
  CountryCatalogSpec,
  NationalPaymentScheme,
} from "./country-catalog.ts";
import type { RandomInt } from "./global-test-data.ts";

export type NationalBankingIdentity = {
  scheme: NationalPaymentScheme;
  label: string;
  value: string;
  routingNumber: string | null;
  institutionCode: string | null;
  branchCode: string | null;
  accountNumber: string;
  iban: string | null;
  validation: "checksum-valid" | "format-only" | "negative-test-case";
};

function randomDigits(length: number, randomInt: RandomInt) {
  return Array.from({ length }, () => String(randomInt(10))).join("");
}

function digitsOnly(value: string, length: number) {
  return value.replace(/\D/g, "").slice(0, length);
}

function fillDigits(value: string, length: number, randomInt: RandomInt) {
  return `${digitsOnly(value, length)}${randomDigits(length, randomInt)}`.slice(0, length);
}

function abaCheckDigit(firstEight: string) {
  const digits = [...firstEight].map(Number);
  const sum =
    3 * (digits[0] + digits[3] + digits[6]) +
    7 * (digits[1] + digits[4] + digits[7]) +
    digits[2] +
    digits[5];
  return String((10 - (sum % 10)) % 10);
}

function clabeCheckDigit(firstSeventeen: string) {
  const weights = [3, 7, 1];
  const sum = [...firstSeventeen].reduce(
    (total, digit, index) => total + ((Number(digit) * weights[index % 3]) % 10),
    0,
  );
  return String((10 - (sum % 10)) % 10);
}

function mutateLocalValue(value: string, mode: IbanCaseMode) {
  if (mode === "valid") return value;
  if (mode === "wrong-length") return value.slice(0, -1);
  if (mode === "illegal-character") return `${value.slice(0, 2)}@${value.slice(3)}`;
  if (mode === "lowercase") return value.toLowerCase();
  if (mode === "hyphenated") return value.replace(/(\d{3})(?=\d)/g, "$1-");
  const replacement = value.endsWith("0") ? "1" : "0";
  return `${value.slice(0, -1)}${replacement}`;
}

export function generateNationalBanking(
  country: CountryCatalogSpec,
  randomInt: RandomInt,
  {
    bankCode = "",
    account = "",
    caseMode = "valid",
  }: {
    bankCode?: string;
    account?: string;
    caseMode?: IbanCaseMode;
  } = {},
): NationalBankingIdentity {
  if (country.ibanSpec) {
    const iban = generateIban(country.ibanSpec, randomInt, {
      bankCode,
      account,
      caseMode,
    });
    return {
      scheme: "IBAN",
      label: "IBAN",
      value: iban,
      routingNumber: null,
      institutionCode: cleanIban(iban).slice(
        4 + country.ibanSpec.bankCodeStart,
        4 + country.ibanSpec.bankCodeStart + country.ibanSpec.bankCodeLen,
      ),
      branchCode: null,
      accountNumber: cleanIban(iban).slice(
        4 + country.ibanSpec.accountStart,
        4 + country.ibanSpec.accountStart + country.ibanSpec.accountLen,
      ),
      iban,
      validation: caseMode === "valid" ? "checksum-valid" : "negative-test-case",
    };
  }

  const accountNumber = fillDigits(account, country.payment.accountLen, randomInt);
  if (country.payment.scheme === "ABA") {
    const allowedPrefix = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "61", "62", "63", "64", "65", "66", "67", "68", "69", "70", "71", "72", "80"];
    const supplied = digitsOnly(bankCode, 8);
    const firstEight = supplied.length === 8
      ? supplied
      : `${allowedPrefix[randomInt(allowedPrefix.length)]}${randomDigits(6, randomInt)}`;
    const routingNumber = `${firstEight}${abaCheckDigit(firstEight)}`;
    const validValue = `${routingNumber}${accountNumber}`;
    return {
      scheme: "ABA",
      label: country.payment.label,
      value: mutateLocalValue(validValue, caseMode),
      routingNumber: mutateLocalValue(routingNumber, caseMode),
      institutionCode: routingNumber.slice(0, 4),
      branchCode: routingNumber.slice(4, 8),
      accountNumber,
      iban: null,
      validation: caseMode === "valid" ? "checksum-valid" : "negative-test-case",
    };
  }

  if (country.payment.scheme === "CACPA") {
    const supplied = digitsOnly(bankCode, 9);
    const routingNumber = supplied.length === 9
      ? supplied
      : `0${randomDigits(3, randomInt)}${randomDigits(5, randomInt)}`;
    const validValue = `${routingNumber}${accountNumber}`;
    return {
      scheme: "CACPA",
      label: country.payment.label,
      value: mutateLocalValue(validValue, caseMode),
      routingNumber: mutateLocalValue(routingNumber, caseMode),
      institutionCode: routingNumber.slice(1, 4),
      branchCode: routingNumber.slice(4),
      accountNumber,
      iban: null,
      validation: caseMode === "valid" ? "format-only" : "negative-test-case",
    };
  }

  if (country.payment.scheme === "CLABE") {
    const bankAndPlaza = fillDigits(bankCode, 6, randomInt);
    const firstSeventeen = `${bankAndPlaza}${accountNumber}`;
    const clabe = `${firstSeventeen}${clabeCheckDigit(firstSeventeen)}`;
    return {
      scheme: "CLABE",
      label: "CLABE",
      value: mutateLocalValue(clabe, caseMode),
      routingNumber: bankAndPlaza,
      institutionCode: bankAndPlaza.slice(0, 3),
      branchCode: bankAndPlaza.slice(3),
      accountNumber,
      iban: null,
      validation: caseMode === "valid" ? "checksum-valid" : "negative-test-case",
    };
  }

  const routingNumber = fillDigits(bankCode, country.payment.bankCodeLen, randomInt);
  const localValue = `${routingNumber}${accountNumber}`;
  return {
    scheme: "LOCAL",
    label: country.payment.label,
    value: mutateLocalValue(localValue, caseMode),
    routingNumber,
    institutionCode: routingNumber,
    branchCode: null,
    accountNumber,
    iban: null,
    validation: caseMode === "valid" ? "format-only" : "negative-test-case",
  };
}

export function validateAbaRoutingNumber(value: string) {
  if (!/^\d{9}$/.test(value)) return false;
  const firstEight = value.slice(0, 8);
  return value[8] === abaCheckDigit(firstEight);
}

export function validateClabe(value: string) {
  return /^\d{18}$/.test(value) && value[17] === clabeCheckDigit(value.slice(0, 17));
}
