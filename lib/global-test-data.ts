import {
  calculateGermanTaxIdCheckDigit,
  validateGermanTaxId,
} from "./german-test-data.ts";
import {
  cleanIban,
  IBAN_COUNTRY_MAP,
  mod97,
  type IbanCountrySpec,
} from "./iban-core.ts";

export type ProfileGender = "male" | "female";
export type AgeChoice = number | "random" | { min: number; max: number };
export type RandomInt = (max: number) => number;
export type IdentityScenario =
  | "complete"
  | "kyc"
  | "payments"
  | "payroll"
  | "ecommerce"
  | "sepa"
  | "api-boundary"
  | "database";

export type IdentityCity = {
  name: string;
  region: string;
  postalCode: string;
  streets: string[];
};

export type IdentityCountrySpec = {
  code: string;
  name: string;
  flag: string;
  maleNames: string[];
  femaleNames: string[];
  lastNames: string[];
  cities: IdentityCity[];
  phonePrefix: string;
  emailDomain: string;
  taxLabel: string;
  insuranceLabel: string;
};

export type SyntheticIdentity = {
  id: string;
  meta: {
    schemaVersion: "2.0";
    scenario: IdentityScenario;
    seed: string | null;
    quality: "synthetic-test-data";
  };
  country: {
    code: string;
    name: string;
    flag: string;
  };
  personal: {
    firstName: string;
    lastName: string;
    fullName: string;
    gender: ProfileGender;
    age: number;
    birthDate: string;
    birthPlace: string;
    documentNumber: string;
    passportNumber: string;
    username: string;
    testPassword: string;
    locale: string;
    language: string;
    timezone: string;
    kycRiskLevel: "low" | "medium" | "high";
  };
  contact: {
    email: string;
    phone: string;
  };
  address: {
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
    region: string;
    country: string;
    formatted: string;
  };
  government: {
    taxLabel: string;
    taxId: string;
    taxStatus: "checksum-valid" | "format-only";
    insuranceLabel: string;
    insuranceNumber: string;
  };
  banking: {
    bankName: string;
    iban: string;
    accountNumber: string;
    bic: string;
    currency: string;
    accountType: "checking" | "savings";
    card: {
      label: string;
      number: string;
      expiry: string;
      cvc: string;
    };
  };
  employment: {
    employer: string;
    jobTitle: string;
    employeeId: string;
    annualSalary: number;
    contractStartDate: string;
  };
  business: {
    companyName: string;
    vatId: string;
    registrationNumber: string;
  };
  payment: {
    scheme: "SCT" | "LOCAL";
    amount: number;
    currency: string;
    endToEndId: string;
    creditorReference: string;
    purposeCode: string;
    remittanceInformation: string;
    verificationOfPayee: "match" | "close-match" | "no-match" | "unavailable";
    structuredAddress: {
      streetName: string;
      buildingNumber: string;
      postCode: string;
      townName: string;
      countrySubdivision: string;
      country: string;
    };
  };
};

export const IDENTITY_COUNTRIES: IdentityCountrySpec[] = [
  {
    code: "DE", name: "德国", flag: "🇩🇪",
    maleNames: ["Felix", "Jonas", "Lukas", "Paul"], femaleNames: ["Anna", "Clara", "Hannah", "Sophie"],
    lastNames: ["Becker", "Fischer", "Hoffmann", "Neumann", "Schneider"],
    cities: [
      { name: "Berlin", region: "Berlin", postalCode: "10115", streets: ["Friedrichstraße", "Gartenstraße", "Invalidenstraße"] },
      { name: "Hamburg", region: "Hamburg", postalCode: "20095", streets: ["Mönckebergstraße", "Lindenweg", "Hauptstraße"] },
      { name: "München", region: "Bayern", postalCode: "80331", streets: ["Sendlinger Straße", "Leopoldstraße", "Rosenweg"] },
      { name: "Köln", region: "Nordrhein-Westfalen", postalCode: "50667", streets: ["Hohe Straße", "Domstraße", "Rheingasse"] },
    ],
    phonePrefix: "+49", emailDomain: "example.de", taxLabel: "Steuer-ID", insuranceLabel: "Krankenversicherungsnr.",
  },
  {
    code: "FR", name: "法国", flag: "🇫🇷",
    maleNames: ["Gabriel", "Hugo", "Louis", "Nathan"], femaleNames: ["Camille", "Chloé", "Emma", "Léa"],
    lastNames: ["Bernard", "Dubois", "Laurent", "Martin", "Petit"],
    cities: [
      { name: "Paris", region: "Île-de-France", postalCode: "75001", streets: ["Rue de Rivoli", "Rue Saint-Honoré", "Avenue de l'Opéra"] },
      { name: "Lyon", region: "Auvergne-Rhône-Alpes", postalCode: "69001", streets: ["Rue de la République", "Rue Victor-Hugo"] },
      { name: "Marseille", region: "Provence-Alpes-Côte d’Azur", postalCode: "13001", streets: ["La Canebière", "Rue Paradis"] },
    ],
    phonePrefix: "+33", emailDomain: "example.fr", taxLabel: "Numéro fiscal", insuranceLabel: "NIR de test",
  },
  {
    code: "GB", name: "英国", flag: "🇬🇧",
    maleNames: ["Arthur", "George", "Harry", "Oliver"], femaleNames: ["Amelia", "Charlotte", "Emily", "Olivia"],
    lastNames: ["Brown", "Evans", "Smith", "Taylor", "Wilson"],
    cities: [
      { name: "London", region: "England", postalCode: "EC1A 1BB", streets: ["King Street", "Baker Street", "High Street"] },
      { name: "Manchester", region: "England", postalCode: "M1 1AE", streets: ["Deansgate", "Oxford Road"] },
      { name: "Edinburgh", region: "Scotland", postalCode: "EH1 1YZ", streets: ["Princes Street", "George Street"] },
    ],
    phonePrefix: "+44", emailDomain: "example.co.uk", taxLabel: "NINO test value", insuranceLabel: "NHS test reference",
  },
  {
    code: "NL", name: "荷兰", flag: "🇳🇱",
    maleNames: ["Daan", "Finn", "Lars", "Sem"], femaleNames: ["Emma", "Julia", "Sanne", "Tess"],
    lastNames: ["Bakker", "De Jong", "De Vries", "Jansen", "Visser"],
    cities: [
      { name: "Amsterdam", region: "Noord-Holland", postalCode: "1012 AB", streets: ["Damrak", "Keizersgracht", "Prinsengracht"] },
      { name: "Rotterdam", region: "Zuid-Holland", postalCode: "3011 AA", streets: ["Coolsingel", "Blaak"] },
      { name: "Utrecht", region: "Utrecht", postalCode: "3511 AA", streets: ["Oudegracht", "Neude"] },
    ],
    phonePrefix: "+31", emailDomain: "example.nl", taxLabel: "BSN test value", insuranceLabel: "Zorgverzekering testnummer",
  },
  {
    code: "ES", name: "西班牙", flag: "🇪🇸",
    maleNames: ["Alejandro", "Daniel", "Hugo", "Pablo"], femaleNames: ["Carmen", "Lucía", "Marta", "Sofía"],
    lastNames: ["Fernández", "García", "López", "Martínez", "Sánchez"],
    cities: [
      { name: "Madrid", region: "Comunidad de Madrid", postalCode: "28001", streets: ["Calle de Alcalá", "Calle Mayor", "Gran Vía"] },
      { name: "Barcelona", region: "Catalunya", postalCode: "08001", streets: ["La Rambla", "Carrer de Mallorca"] },
      { name: "Valencia", region: "Comunitat Valenciana", postalCode: "46001", streets: ["Carrer de Colón", "Carrer de la Pau"] },
    ],
    phonePrefix: "+34", emailDomain: "example.es", taxLabel: "NIF", insuranceLabel: "Seguridad Social test",
  },
  {
    code: "IT", name: "意大利", flag: "🇮🇹",
    maleNames: ["Alessandro", "Lorenzo", "Luca", "Matteo"], femaleNames: ["Chiara", "Giulia", "Sara", "Sofia"],
    lastNames: ["Bianchi", "Colombo", "Ferrari", "Ricci", "Romano"],
    cities: [
      { name: "Roma", region: "Lazio", postalCode: "00186", streets: ["Via del Corso", "Via Nazionale", "Via Veneto"] },
      { name: "Milano", region: "Lombardia", postalCode: "20121", streets: ["Via Dante", "Corso Buenos Aires"] },
      { name: "Firenze", region: "Toscana", postalCode: "50122", streets: ["Via dei Calzaiuoli", "Via Roma"] },
    ],
    phonePrefix: "+39", emailDomain: "example.it", taxLabel: "Codice fiscale test", insuranceLabel: "Tessera sanitaria test",
  },
  {
    code: "CH", name: "瑞士", flag: "🇨🇭",
    maleNames: ["David", "Jan", "Luca", "Noah"], femaleNames: ["Anna", "Lea", "Lena", "Nina"],
    lastNames: ["Brunner", "Frei", "Keller", "Meier", "Müller"],
    cities: [
      { name: "Zürich", region: "Zürich", postalCode: "8001", streets: ["Bahnhofstrasse", "Limmatquai", "Rennweg"] },
      { name: "Genève", region: "Genève", postalCode: "1201", streets: ["Rue du Rhône", "Rue de Lausanne"] },
      { name: "Bern", region: "Bern", postalCode: "3011", streets: ["Marktgasse", "Kramgasse"] },
    ],
    phonePrefix: "+41", emailDomain: "example.ch", taxLabel: "AHV test value", insuranceLabel: "Krankenkasse testnummer",
  },
  {
    code: "BE", name: "比利时", flag: "🇧🇪",
    maleNames: ["Arthur", "Louis", "Lucas", "Victor"], femaleNames: ["Emma", "Louise", "Marie", "Noor"],
    lastNames: ["Dubois", "Jacobs", "Peeters", "Simon", "Willems"],
    cities: [
      { name: "Bruxelles", region: "Bruxelles-Capitale", postalCode: "1000", streets: ["Rue de la Loi", "Avenue Louise", "Rue Royale"] },
      { name: "Antwerpen", region: "Vlaanderen", postalCode: "2000", streets: ["Meir", "Nationalestraat"] },
      { name: "Gent", region: "Vlaanderen", postalCode: "9000", streets: ["Veldstraat", "Korenmarkt"] },
    ],
    phonePrefix: "+32", emailDomain: "example.be", taxLabel: "Numéro national test", insuranceLabel: "Mutualité testnummer",
  },
  {
    code: "AT", name: "奥地利", flag: "🇦🇹",
    maleNames: ["David", "Felix", "Jakob", "Lukas"], femaleNames: ["Anna", "Julia", "Laura", "Sophie"],
    lastNames: ["Bauer", "Gruber", "Hofer", "Huber", "Wagner"],
    cities: [
      { name: "Wien", region: "Wien", postalCode: "1010", streets: ["Kärntner Straße", "Mariahilfer Straße", "Wollzeile"] },
      { name: "Salzburg", region: "Salzburg", postalCode: "5020", streets: ["Getreidegasse", "Linzer Gasse"] },
      { name: "Graz", region: "Steiermark", postalCode: "8010", streets: ["Herrengasse", "Sackstraße"] },
    ],
    phonePrefix: "+43", emailDomain: "example.at", taxLabel: "Steuernummer test", insuranceLabel: "Sozialversicherungsnr. test",
  },
  {
    code: "IE", name: "爱尔兰", flag: "🇮🇪",
    maleNames: ["Cian", "Conor", "James", "Seán"], femaleNames: ["Aoife", "Emily", "Niamh", "Saoirse"],
    lastNames: ["Byrne", "Doyle", "Kelly", "Murphy", "Ryan"],
    cities: [
      { name: "Dublin", region: "Leinster", postalCode: "D02", streets: ["Grafton Street", "O'Connell Street", "Dame Street"] },
      { name: "Cork", region: "Munster", postalCode: "T12", streets: ["Patrick Street", "Oliver Plunkett Street"] },
      { name: "Galway", region: "Connacht", postalCode: "H91", streets: ["Shop Street", "Eyre Square"] },
    ],
    phonePrefix: "+353", emailDomain: "example.ie", taxLabel: "PPSN test value", insuranceLabel: "Health service test ID",
  },
  {
    code: "PL", name: "波兰", flag: "🇵🇱",
    maleNames: ["Jakub", "Jan", "Kacper", "Michał"], femaleNames: ["Anna", "Julia", "Maja", "Zofia"],
    lastNames: ["Kowalski", "Lewandowski", "Nowak", "Wójcik", "Zieliński"],
    cities: [
      { name: "Warszawa", region: "Mazowieckie", postalCode: "00-001", streets: ["Nowy Świat", "Marszałkowska", "Świętokrzyska"] },
      { name: "Kraków", region: "Małopolskie", postalCode: "31-001", streets: ["Floriańska", "Grodzka"] },
      { name: "Wrocław", region: "Dolnośląskie", postalCode: "50-001", streets: ["Świdnicka", "Oławska"] },
    ],
    phonePrefix: "+48", emailDomain: "example.pl", taxLabel: "PESEL test value", insuranceLabel: "NFZ test reference",
  },
  {
    code: "PT", name: "葡萄牙", flag: "🇵🇹",
    maleNames: ["Afonso", "João", "Miguel", "Tiago"], femaleNames: ["Ana", "Beatriz", "Inês", "Mariana"],
    lastNames: ["Costa", "Ferreira", "Oliveira", "Pereira", "Silva"],
    cities: [
      { name: "Lisboa", region: "Lisboa", postalCode: "1100-001", streets: ["Rua Augusta", "Avenida da Liberdade", "Rua do Ouro"] },
      { name: "Porto", region: "Porto", postalCode: "4000-001", streets: ["Rua de Santa Catarina", "Rua das Flores"] },
      { name: "Braga", region: "Braga", postalCode: "4700-001", streets: ["Avenida Central", "Rua do Souto"] },
    ],
    phonePrefix: "+351", emailDomain: "example.pt", taxLabel: "NIF", insuranceLabel: "SNS test number",
  },
  {
    code: "NO", name: "挪威", flag: "🇳🇴",
    maleNames: ["Emil", "Henrik", "Magnus", "Oliver"], femaleNames: ["Emma", "Ingrid", "Nora", "Sofie"],
    lastNames: ["Andersen", "Hansen", "Johansen", "Larsen", "Nilsen"],
    cities: [
      { name: "Oslo", region: "Oslo", postalCode: "0150", streets: ["Karl Johans gate", "Storgata", "Torggata"] },
      { name: "Bergen", region: "Vestland", postalCode: "5003", streets: ["Bryggen", "Strandgaten"] },
      { name: "Trondheim", region: "Trøndelag", postalCode: "7010", streets: ["Munkegata", "Olav Tryggvasons gate"] },
    ],
    phonePrefix: "+47", emailDomain: "example.no", taxLabel: "Fødselsnummer test", insuranceLabel: "Helse test-ID",
  },
  {
    code: "FI", name: "芬兰", flag: "🇫🇮",
    maleNames: ["Elias", "Leo", "Onni", "Ville"], femaleNames: ["Aino", "Ella", "Emilia", "Sofia"],
    lastNames: ["Heikkinen", "Korhonen", "Laine", "Nieminen", "Virtanen"],
    cities: [
      { name: "Helsinki", region: "Uusimaa", postalCode: "00100", streets: ["Mannerheimintie", "Aleksanterinkatu", "Esplanadi"] },
      { name: "Tampere", region: "Pirkanmaa", postalCode: "33100", streets: ["Hämeenkatu", "Kauppakatu"] },
      { name: "Turku", region: "Varsinais-Suomi", postalCode: "20100", streets: ["Aurakatu", "Yliopistonkatu"] },
    ],
    phonePrefix: "+358", emailDomain: "example.fi", taxLabel: "Henkilötunnus test", insuranceLabel: "Kela test reference",
  },
  {
    code: "LU", name: "卢森堡", flag: "🇱🇺",
    maleNames: ["Ben", "Léo", "Luc", "Tom"], femaleNames: ["Emma", "Julie", "Lara", "Sophie"],
    lastNames: ["Hoffmann", "Muller", "Schmit", "Thill", "Weber"],
    cities: [
      { name: "Luxembourg", region: "Luxembourg", postalCode: "L-1111", streets: ["Grand-Rue", "Avenue de la Liberté", "Rue du Marché-aux-Herbes"] },
      { name: "Esch-sur-Alzette", region: "Esch-sur-Alzette", postalCode: "L-4001", streets: ["Rue de l'Alzette", "Boulevard Kennedy"] },
      { name: "Differdange", region: "Differdange", postalCode: "L-4501", streets: ["Avenue de la Liberté", "Rue Emile Mark"] },
    ],
    phonePrefix: "+352", emailDomain: "example.lu", taxLabel: "Matricule test", insuranceLabel: "CNS test number",
  },
];

export const DEFAULT_SYNTHETIC_IDENTITY: SyntheticIdentity = {
  id: "DE-TEST-00000001",
  meta: {
    schemaVersion: "2.0",
    scenario: "complete",
    seed: "default",
    quality: "synthetic-test-data",
  },
  country: { code: "DE", name: "德国", flag: "🇩🇪" },
  personal: {
    firstName: "Klara",
    lastName: "Neumann",
    fullName: "Klara Neumann",
    gender: "female",
    age: 38,
    birthDate: "1988-04-17",
    birthPlace: "Berlin",
    documentNumber: "TSTDE0000001",
    passportNumber: "DE-TST-000001",
    username: "klara.neumann",
    testPassword: "TestOnly!2026",
    locale: "de-DE",
    language: "de",
    timezone: "Europe/Berlin",
    kycRiskLevel: "low",
  },
  contact: {
    email: "klara.neumann@example.de",
    phone: "+49 151 382 7412",
  },
  address: {
    street: "Friedrichstraße",
    houseNumber: "24",
    postalCode: "10115",
    city: "Berlin",
    region: "Berlin",
    country: "德国",
    formatted: "Friedrichstraße 24, 10115 Berlin, 德国",
  },
  government: {
    taxLabel: "Steuer-ID",
    taxId: "48954371207",
    taxStatus: "checksum-valid",
    insuranceLabel: "Krankenversicherungsnr.",
    insuranceNumber: "N170488123",
  },
  banking: {
    bankName: "德国 Test Bank",
    iban: "DE89370400440532013000",
    accountNumber: "370400440532013000",
    bic: "TSTBDEXXXXX",
    currency: "EUR",
    accountType: "checking",
    card: {
      label: "Sandbox card",
      number: "4242 4242 4242 4242",
      expiry: "12/34",
      cvc: "123",
    },
  },
  employment: {
    employer: "Berlin Demo Labs",
    jobTitle: "QA Engineer",
    employeeId: "EMP-DE-000001",
    annualSalary: 68000,
    contractStartDate: "2023-04-01",
  },
  business: {
    companyName: "Berlin Demo Labs GmbH",
    vatId: "DETEST000001",
    registrationNumber: "HRB-TEST-000001",
  },
  payment: {
    scheme: "SCT",
    amount: 128.4,
    currency: "EUR",
    endToEndId: "E2E-DE-000001",
    creditorReference: "RF18539007547034",
    purposeCode: "GDDS",
    remittanceInformation: "Synthetic test payment",
    verificationOfPayee: "match",
    structuredAddress: {
      streetName: "Friedrichstraße",
      buildingNumber: "24",
      postCode: "10115",
      townName: "Berlin",
      countrySubdivision: "Berlin",
      country: "DE",
    },
  },
};

const COUNTRY_MAP = new Map(IDENTITY_COUNTRIES.map((country) => [country.code, country]));
const TEST_CARD_NUMBERS = [
  "4242 4242 4242 4242",
  "4000 0000 0000 0077",
  "5555 5555 5555 4444",
];
const JOB_TITLES = ["QA Engineer", "Frontend Developer", "Data Analyst", "Product Designer", "Test Automation Engineer"];
const KYC_RISK_LEVELS = ["low", "medium", "high"] as const;
const PURPOSE_CODES = ["GDDS", "SALA", "SUPP", "OTHR"];
const VOP_OUTCOMES = ["match", "close-match", "no-match", "unavailable"] as const;
const LOCALE_OVERRIDES: Record<string, [string, string, string]> = {
  DE: ["de-DE", "de", "Europe/Berlin"],
  FR: ["fr-FR", "fr", "Europe/Paris"],
  GB: ["en-GB", "en", "Europe/London"],
  NL: ["nl-NL", "nl", "Europe/Amsterdam"],
  ES: ["es-ES", "es", "Europe/Madrid"],
  IT: ["it-IT", "it", "Europe/Rome"],
  CH: ["de-CH", "de", "Europe/Zurich"],
  BE: ["nl-BE", "nl", "Europe/Brussels"],
  AT: ["de-AT", "de", "Europe/Vienna"],
  IE: ["en-IE", "en", "Europe/Dublin"],
  PL: ["pl-PL", "pl", "Europe/Warsaw"],
  PT: ["pt-PT", "pt", "Europe/Lisbon"],
  NO: ["nb-NO", "nb", "Europe/Oslo"],
  FI: ["fi-FI", "fi", "Europe/Helsinki"],
  LU: ["fr-LU", "fr", "Europe/Luxembourg"],
};

function genericIdentityCountry(spec: IbanCountrySpec): IdentityCountrySpec {
  return {
    code: spec.code,
    name: spec.name,
    flag: spec.flag,
    maleNames: ["Alex", "Daniel", "Martin", "Noah"],
    femaleNames: ["Anna", "Emma", "Mia", "Sofia"],
    lastNames: ["Anders", "Martin", "Novak", "Silva", "Taylor"],
    cities: [
      {
        name: `${spec.code} Sandbox City`,
        region: `${spec.code} North Test Region`,
        postalCode: "00001",
        streets: ["Example Street", "Integration Avenue"],
      },
      {
        name: `${spec.code} Fixture City`,
        region: `${spec.code} Central Test Region`,
        postalCode: "00002",
        streets: ["Fixture Lane", "Automation Road"],
      },
      {
        name: `${spec.code} Boundary City`,
        region: `${spec.code} South Test Region`,
        postalCode: "99999",
        streets: ["Boundary Boulevard", "Mock Data Street"],
      },
    ],
    phonePrefix: "+999",
    emailDomain: `example.${spec.code.toLowerCase()}`,
    taxLabel: `${spec.code} tax identifier (format-only)`,
    insuranceLabel: `${spec.code} insurance reference (format-only)`,
  };
}

function secureRandomInt(max: number) {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] % max;
  }
  return Math.floor(Math.random() * max);
}

function hashSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createRandomInt(seed?: string): RandomInt {
  if (!seed) return secureRandomInt;
  let state = hashSeed(seed) || 0x6d2b79f5;
  return (max: number) => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    const normalized = ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    return Math.floor(normalized * max);
  };
}

function pick<T>(items: T[], randomInt: RandomInt) {
  return items[randomInt(items.length)];
}

function randomDigits(length: number, randomInt: RandomInt) {
  return Array.from({ length }, () => String(randomInt(10))).join("");
}

function randomLetters(length: number, randomInt: RandomInt) {
  return Array.from(
    { length },
    () => String.fromCharCode(65 + randomInt(26)),
  ).join("");
}

function slugifyName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z]/g, "")
    .toLowerCase();
}

function generateBirthDate(age: number, randomInt: RandomInt) {
  const now = new Date();
  const month = randomInt(12);
  const day = 1 + randomInt(28);
  let year = now.getUTCFullYear() - age;
  if (month > now.getUTCMonth() || (month === now.getUTCMonth() && day > now.getUTCDate())) {
    year -= 1;
  }
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function generateGermanTaxId(randomInt: RandomInt) {
  const digits = Array.from({ length: 10 }, (_, index) => index);
  const missingDigit = randomInt(10);
  let duplicateDigit = randomInt(10);
  while (duplicateDigit === missingDigit) duplicateDigit = randomInt(10);
  const pool = [...digits.filter((digit) => digit !== missingDigit), duplicateDigit];

  let prefix = "";
  do {
    const shuffled = [...pool];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const target = randomInt(index + 1);
      [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
    }
    prefix = shuffled.join("");
  } while (prefix.startsWith("0"));

  return `${prefix}${calculateGermanTaxIdCheckDigit(prefix)}`;
}

function generateTaxId(
  countryCode: string,
  gender: ProfileGender,
  randomInt: RandomInt,
) {
  switch (countryCode) {
    case "DE":
      return generateGermanTaxId(randomInt);
    case "GB":
      return `QQ${randomDigits(6, randomInt)}${pick(["A", "B", "C", "D"], randomInt)}`;
    case "ES": {
      const body = randomDigits(8, randomInt);
      const letters = "TRWAGMYFPDXBNJZSQVHLCKE";
      return `${body}${letters[Number(body) % 23]}`;
    }
    case "IT":
      return `${randomLetters(6, randomInt)}${randomDigits(2, randomInt)}${pick(["A", "B", "C", "D", "E", "H", "L", "M", "P", "R", "S", "T"], randomInt)}${randomDigits(2, randomInt)}${randomLetters(1, randomInt)}${randomDigits(3, randomInt)}${randomLetters(1, randomInt)}`;
    case "FR":
      return `${gender === "male" ? "1" : "2"}${randomDigits(12, randomInt)}`;
    case "NL":
      return randomDigits(9, randomInt);
    case "CH":
      return `756.${randomDigits(4, randomInt)}.${randomDigits(4, randomInt)}.${randomDigits(2, randomInt)}`;
    case "BE":
      return randomDigits(11, randomInt);
    case "AT":
      return randomDigits(9, randomInt);
    case "IE":
      return `${randomDigits(7, randomInt)}${randomLetters(1, randomInt)}`;
    case "PL":
      return randomDigits(11, randomInt);
    case "PT":
      return randomDigits(9, randomInt);
    case "NO":
      return randomDigits(11, randomInt);
    case "FI":
      return `${randomDigits(6, randomInt)}A${randomDigits(3, randomInt)}${randomLetters(1, randomInt)}`;
    case "LU":
      return randomDigits(13, randomInt);
    default:
      return `${countryCode}${randomDigits(10, randomInt)}`;
  }
}

function generateCreditorReference(randomInt: RandomInt) {
  const payload = randomDigits(12, randomInt);
  const checkDigits = String(98 - mod97(`${payload}271500`)).padStart(2, "0");
  return `RF${checkDigits}${payload}`;
}

function generateContractStartDate(randomInt: RandomInt) {
  const year = 2020 + randomInt(7);
  const month = 1 + randomInt(12);
  const day = 1 + randomInt(28);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getIdentityCountry(countryCode: string) {
  const localized = COUNTRY_MAP.get(countryCode);
  if (localized) return localized;
  const registrySpec = IBAN_COUNTRY_MAP.get(countryCode);
  return registrySpec ? genericIdentityCountry(registrySpec) : IDENTITY_COUNTRIES[0];
}

export function generateSyntheticIdentity({
  countryCode,
  iban,
  cityName = "random",
  genderChoice = "random",
  ageChoice = "random",
  firstNameOverride = "",
  lastNameOverride = "",
  streetOverride = "",
  postalCodeOverride = "",
  scenario = "complete",
  seed = "",
  index = 0,
}: {
  countryCode: string;
  iban: string;
  cityName?: string;
  genderChoice?: ProfileGender | "random";
  ageChoice?: AgeChoice;
  firstNameOverride?: string;
  lastNameOverride?: string;
  streetOverride?: string;
  postalCodeOverride?: string;
  scenario?: IdentityScenario;
  seed?: string;
  index?: number;
}): SyntheticIdentity {
  const randomInt = createRandomInt(seed ? `${seed}:identity:${index}` : undefined);
  const spec = getIdentityCountry(countryCode);
  const city =
    cityName === "random"
      ? pick(spec.cities, randomInt)
      : spec.cities.find((item) => item.name === cityName) ?? spec.cities[0];
  const gender = genderChoice === "random"
    ? (randomInt(2) === 0 ? "male" : "female")
    : genderChoice;
  const age =
    ageChoice === "random"
      ? 18 + randomInt(63)
      : typeof ageChoice === "number"
        ? ageChoice
        : Math.min(ageChoice.min, ageChoice.max) +
          randomInt(Math.abs(ageChoice.max - ageChoice.min) + 1);
  const firstName =
    firstNameOverride.trim() ||
    pick(gender === "male" ? spec.maleNames : spec.femaleNames, randomInt);
  const lastName = lastNameOverride.trim() || pick(spec.lastNames, randomInt);
  const birthDate = generateBirthDate(age, randomInt);
  const street = streetOverride.trim() || pick(city.streets, randomInt);
  const houseNumber = String(1 + randomInt(180));
  const postalCode = postalCodeOverride.trim() || city.postalCode;
  const taxId = generateTaxId(spec.code, gender, randomInt);
  const registrySpec = IBAN_COUNTRY_MAP.get(spec.code);
  const [locale, language, timezone] =
    LOCALE_OVERRIDES[spec.code] ?? [`en-${spec.code}`, "en", "UTC"];
  const username = `${slugifyName(firstName)}.${slugifyName(lastName)}`;
  const cleanBankIban = cleanIban(iban);
  const currency = scenario === "sepa" ? "EUR" : registrySpec?.currency ?? "EUR";
  const salary = 32000 + randomInt(88001);
  const creditorReference = generateCreditorReference(randomInt);
  const stableId = seed
    ? String(hashSeed(`${seed}:${index}`)).padStart(10, "0").slice(-8)
    : String(Date.now() + index).slice(-8);

  return {
    id: `${spec.code}-TEST-${stableId}`,
    meta: {
      schemaVersion: "2.0",
      scenario,
      seed: seed || null,
      quality: "synthetic-test-data",
    },
    country: { code: spec.code, name: spec.name, flag: spec.flag },
    personal: {
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      gender,
      age,
      birthDate,
      birthPlace: city.name,
      documentNumber: `TST${spec.code}${randomDigits(7, randomInt)}`,
      passportNumber: `${spec.code}-TST-${randomLetters(2, randomInt)}${randomDigits(6, randomInt)}`,
      username,
      testPassword: `TestOnly!${randomDigits(4, randomInt)}`,
      locale,
      language,
      timezone,
      kycRiskLevel: pick([...KYC_RISK_LEVELS], randomInt),
    },
    contact: {
      email: `${username}@${spec.emailDomain}`,
      phone: `${spec.phonePrefix} ${randomDigits(3, randomInt)} ${randomDigits(3, randomInt)} ${randomDigits(4, randomInt)}`,
    },
    address: {
      street,
      houseNumber,
      postalCode,
      city: city.name,
      region: city.region,
      country: spec.name,
      formatted: `${street} ${houseNumber}, ${postalCode} ${city.name}, ${spec.name}`,
    },
    government: {
      taxLabel: spec.taxLabel,
      taxId,
      taxStatus: spec.code === "DE" && validateGermanTaxId(taxId) ? "checksum-valid" : "format-only",
      insuranceLabel: spec.insuranceLabel,
      insuranceNumber: spec.code === "DE"
        ? `${lastName[0].toUpperCase()}${birthDate.slice(8, 10)}${birthDate.slice(5, 7)}${birthDate.slice(2, 4)}${randomDigits(3, randomInt)}`
        : `TEST-${spec.code}-${randomDigits(8, randomInt)}`,
    },
    banking: {
      bankName: `${spec.name} Test Bank`,
      iban,
      accountNumber: cleanBankIban.slice(4),
      bic: `TSTB${spec.code}XXXXX`,
      currency,
      accountType: pick(["checking", "savings"], randomInt),
      card: {
        label: "Sandbox card",
        number: pick(TEST_CARD_NUMBERS, randomInt),
        expiry: "12/34",
        cvc: "123",
      },
    },
    employment: {
      employer: `${city.name} Demo Labs`,
      jobTitle: pick(JOB_TITLES, randomInt),
      employeeId: `EMP-${spec.code}-${randomDigits(6, randomInt)}`,
      annualSalary: salary,
      contractStartDate: generateContractStartDate(randomInt),
    },
    business: {
      companyName: `${city.name} Demo Labs`,
      vatId: `${spec.code}TEST${randomDigits(8, randomInt)}`,
      registrationNumber: `REG-${spec.code}-${randomDigits(8, randomInt)}`,
    },
    payment: {
      scheme: registrySpec?.sepa ? "SCT" : "LOCAL",
      amount: Number((10 + randomInt(499001) / 100).toFixed(2)),
      currency,
      endToEndId: `E2E-${spec.code}-${randomDigits(10, randomInt)}`,
      creditorReference,
      purposeCode: pick(PURPOSE_CODES, randomInt),
      remittanceInformation: `Synthetic ${scenario} test payment`,
      verificationOfPayee: pick([...VOP_OUTCOMES], randomInt),
      structuredAddress: {
        streetName: street,
        buildingNumber: houseNumber,
        postCode: postalCode,
        townName: city.name,
        countrySubdivision: city.region,
        country: spec.code,
      },
    },
  };
}
