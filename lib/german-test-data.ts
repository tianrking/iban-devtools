export type GermanGender = "male" | "female";

export type GermanState = {
  code: string;
  name: string;
  city: string;
  postalCode: string;
  taxPrefix: string;
};

export type GermanTestProfile = {
  id: string;
  taxId: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  birthPlace: string;
  gender: GermanGender;
  address: {
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
    state: string;
  };
  phone: string;
  healthInsuranceNumber: string;
  bankIban: string;
  employerTaxNumber: string;
};

export const GERMAN_STATES: GermanState[] = [
  { code: "BW", name: "Baden-Württemberg", city: "Stuttgart", postalCode: "70173", taxPrefix: "28" },
  { code: "BY", name: "Bayern", city: "München", postalCode: "80331", taxPrefix: "9" },
  { code: "BE", name: "Berlin", city: "Berlin", postalCode: "10115", taxPrefix: "11" },
  { code: "BB", name: "Brandenburg", city: "Potsdam", postalCode: "14467", taxPrefix: "3" },
  { code: "HB", name: "Bremen", city: "Bremen", postalCode: "28195", taxPrefix: "24" },
  { code: "HH", name: "Hamburg", city: "Hamburg", postalCode: "20095", taxPrefix: "22" },
  { code: "HE", name: "Hessen", city: "Frankfurt am Main", postalCode: "60311", taxPrefix: "26" },
  { code: "MV", name: "Mecklenburg-Vorpommern", city: "Schwerin", postalCode: "19053", taxPrefix: "4" },
  { code: "NI", name: "Niedersachsen", city: "Hannover", postalCode: "30159", taxPrefix: "23" },
  { code: "NW", name: "Nordrhein-Westfalen", city: "Köln", postalCode: "50667", taxPrefix: "5" },
  { code: "RP", name: "Rheinland-Pfalz", city: "Mainz", postalCode: "55116", taxPrefix: "27" },
  { code: "SL", name: "Saarland", city: "Saarbrücken", postalCode: "66111", taxPrefix: "1" },
  { code: "SN", name: "Sachsen", city: "Dresden", postalCode: "01067", taxPrefix: "3" },
  { code: "ST", name: "Sachsen-Anhalt", city: "Magdeburg", postalCode: "39104", taxPrefix: "3" },
  { code: "SH", name: "Schleswig-Holstein", city: "Kiel", postalCode: "24103", taxPrefix: "21" },
  { code: "TH", name: "Thüringen", city: "Erfurt", postalCode: "99084", taxPrefix: "4" },
];

const MALE_NAMES = ["Felix", "Jonas", "Lukas", "Maximilian", "Niklas", "Paul", "Simon", "Tobias"];
const FEMALE_NAMES = ["Anna", "Clara", "Hannah", "Karin", "Laura", "Leonie", "Mia", "Sophie"];
const LAST_NAMES = ["Becker", "Fischer", "Hoffmann", "Klein", "Kramer", "Müller", "Neumann", "Schneider", "Wagner", "Weber"];
const STREETS = ["Bahnhofstraße", "Bergstraße", "Gartenweg", "Hauptstraße", "Lindenweg", "Rosenstraße", "Schillerstraße", "Waldweg"];

export const DEFAULT_GERMAN_PROFILE: GermanTestProfile = {
  id: "DE-TEST-001",
  taxId: "48954371207",
  firstName: "Klara",
  lastName: "Neumann",
  birthDate: "1988-04-17",
  birthPlace: "Stuttgart",
  gender: "female",
  address: {
    street: "Lindenweg",
    houseNumber: "24",
    postalCode: "70173",
    city: "Stuttgart",
    state: "Baden-Württemberg",
  },
  phone: "+49 151 382 74126",
  healthInsuranceNumber: "N170488123",
  bankIban: "DE41500105170123456789",
  employerTaxNumber: "2812345678901",
};

function randomInt(max: number) {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] % max;
  }
  return Math.floor(Math.random() * max);
}

function pick<T>(items: T[]) {
  return items[randomInt(items.length)];
}

function randomDigits(length: number) {
  return Array.from({ length }, () => String(randomInt(10))).join("");
}

function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = randomInt(index + 1);
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function calculateGermanTaxIdCheckDigit(prefix: string) {
  let product = 10;
  for (const character of prefix) {
    let sum = (Number(character) + product) % 10;
    if (sum === 0) sum = 10;
    product = (2 * sum) % 11;
  }
  const checkDigit = 11 - product;
  return checkDigit === 10 ? 0 : checkDigit;
}

export function validateGermanTaxId(value: string) {
  const compact = value.replace(/\D/g, "");
  if (!/^[1-9]\d{10}$/.test(compact)) return false;

  const frequencies = Array.from({ length: 10 }, (_, digit) =>
    [...compact.slice(0, 10)].filter((valueDigit) => Number(valueDigit) === digit).length,
  ).sort((left, right) => left - right);
  const hasClassicStructure =
    frequencies.filter((count) => count === 0).length === 1 &&
    frequencies.filter((count) => count === 1).length === 8 &&
    frequencies.filter((count) => count === 2).length === 1;

  return (
    hasClassicStructure &&
    calculateGermanTaxIdCheckDigit(compact.slice(0, 10)) === Number(compact.at(-1))
  );
}

export function generateGermanTaxId() {
  const digits = Array.from({ length: 10 }, (_, index) => index);
  const missingDigit = randomInt(10);
  let duplicateDigit = randomInt(10);
  while (duplicateDigit === missingDigit) duplicateDigit = randomInt(10);

  const pool = [...digits.filter((digit) => digit !== missingDigit), duplicateDigit];
  let prefix = "";
  do {
    prefix = shuffle(pool).join("");
  } while (prefix.startsWith("0"));

  return `${prefix}${calculateGermanTaxIdCheckDigit(prefix)}`;
}

function calculateIbanCheckDigits(countryCode: string, bban: string) {
  const prepared = `${bban}${countryCode}00`;
  let remainder = 0;
  for (const character of prepared) {
    const numeric = /[A-Z]/.test(character)
      ? String(character.charCodeAt(0) - 55)
      : character;
    for (const digit of numeric) {
      remainder = (remainder * 10 + Number(digit)) % 97;
    }
  }
  return String(98 - remainder).padStart(2, "0");
}

function generateGermanIban() {
  const bban = `${randomDigits(8)}${randomDigits(10)}`;
  return `DE${calculateIbanCheckDigits("DE", bban)}${bban}`;
}

function generateBirthDate() {
  const year = new Date().getUTCFullYear() - (19 + randomInt(62));
  const month = 1 + randomInt(12);
  const day = 1 + randomInt(28);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatGermanPhone() {
  return `+49 15${randomInt(10)} ${randomDigits(3)} ${randomDigits(5)}`;
}

export function generateGermanTestProfile(
  stateCode = "random",
  genderChoice: GermanGender | "random" = "random",
  index = 0,
): GermanTestProfile {
  const state =
    stateCode === "random"
      ? pick(GERMAN_STATES)
      : GERMAN_STATES.find((item) => item.code === stateCode) ?? GERMAN_STATES[0];
  const gender = genderChoice === "random"
    ? (randomInt(2) === 0 ? "male" : "female")
    : genderChoice;
  const firstName = pick(gender === "male" ? MALE_NAMES : FEMALE_NAMES);
  const lastName = pick(LAST_NAMES);
  const birthDate = generateBirthDate();
  const insuranceDate = birthDate.slice(8, 10) + birthDate.slice(5, 7) + birthDate.slice(2, 4);

  return {
    id: `DE-TEST-${String(Date.now() + index).slice(-8)}`,
    taxId: generateGermanTaxId(),
    firstName,
    lastName,
    birthDate,
    birthPlace: state.city,
    gender,
    address: {
      street: pick(STREETS),
      houseNumber: String(1 + randomInt(180)),
      postalCode: state.postalCode,
      city: state.city,
      state: state.name,
    },
    phone: formatGermanPhone(),
    healthInsuranceNumber: `${lastName[0].toUpperCase()}${insuranceDate}${randomDigits(3)}`,
    bankIban: generateGermanIban(),
    employerTaxNumber: `${state.taxPrefix}${randomDigits(13 - state.taxPrefix.length)}`,
  };
}
