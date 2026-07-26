import { generateGermanTaxId, validateGermanTaxId } from "./german-test-data.ts";

export type ProfileGender = "male" | "female";

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
  },
};

const COUNTRY_MAP = new Map(IDENTITY_COUNTRIES.map((country) => [country.code, country]));
const TEST_CARD_NUMBERS = [
  "4242 4242 4242 4242",
  "4000 0000 0000 0077",
  "5555 5555 5555 4444",
];
const JOB_TITLES = ["QA Engineer", "Frontend Developer", "Data Analyst", "Product Designer", "Test Automation Engineer"];

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

function randomLetters(length: number) {
  return Array.from({ length }, () => String.fromCharCode(65 + randomInt(26))).join("");
}

function slugifyName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z]/g, "")
    .toLowerCase();
}

function generateBirthDate(age: number) {
  const now = new Date();
  const month = randomInt(12);
  const day = 1 + randomInt(28);
  let year = now.getUTCFullYear() - age;
  if (month > now.getUTCMonth() || (month === now.getUTCMonth() && day > now.getUTCDate())) {
    year -= 1;
  }
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function generateTaxId(countryCode: string, gender: ProfileGender) {
  switch (countryCode) {
    case "DE":
      return generateGermanTaxId();
    case "GB":
      return `QQ${randomDigits(6)}${pick(["A", "B", "C", "D"])}`;
    case "ES": {
      const body = randomDigits(8);
      const letters = "TRWAGMYFPDXBNJZSQVHLCKE";
      return `${body}${letters[Number(body) % 23]}`;
    }
    case "IT":
      return `${randomLetters(6)}${randomDigits(2)}${pick(["A", "B", "C", "D", "E", "H", "L", "M", "P", "R", "S", "T"])}${randomDigits(2)}${randomLetters(1)}${randomDigits(3)}${randomLetters(1)}`;
    case "FR":
      return `${gender === "male" ? "1" : "2"}${randomDigits(12)}`;
    case "NL":
      return randomDigits(9);
    case "CH":
      return `756.${randomDigits(4)}.${randomDigits(4)}.${randomDigits(2)}`;
    case "BE":
      return randomDigits(11);
    case "AT":
      return randomDigits(9);
    case "IE":
      return `${randomDigits(7)}${randomLetters(1)}`;
    case "PL":
      return randomDigits(11);
    case "PT":
      return randomDigits(9);
    case "NO":
      return randomDigits(11);
    case "FI":
      return `${randomDigits(6)}A${randomDigits(3)}${randomLetters(1)}`;
    case "LU":
      return randomDigits(13);
    default:
      return `${countryCode}${randomDigits(10)}`;
  }
}

export function getIdentityCountry(countryCode: string) {
  return COUNTRY_MAP.get(countryCode) ?? IDENTITY_COUNTRIES[0];
}

export function generateSyntheticIdentity({
  countryCode,
  iban,
  cityName = "random",
  genderChoice = "random",
  ageChoice = "random",
  index = 0,
}: {
  countryCode: string;
  iban: string;
  cityName?: string;
  genderChoice?: ProfileGender | "random";
  ageChoice?: number | "random";
  index?: number;
}): SyntheticIdentity {
  const spec = getIdentityCountry(countryCode);
  const city =
    cityName === "random"
      ? pick(spec.cities)
      : spec.cities.find((item) => item.name === cityName) ?? spec.cities[0];
  const gender = genderChoice === "random"
    ? (randomInt(2) === 0 ? "male" : "female")
    : genderChoice;
  const age = ageChoice === "random" ? 18 + randomInt(63) : ageChoice;
  const firstName = pick(gender === "male" ? spec.maleNames : spec.femaleNames);
  const lastName = pick(spec.lastNames);
  const birthDate = generateBirthDate(age);
  const street = pick(city.streets);
  const houseNumber = String(1 + randomInt(180));
  const taxId = generateTaxId(spec.code, gender);

  return {
    id: `${spec.code}-TEST-${String(Date.now() + index).slice(-8)}`,
    country: { code: spec.code, name: spec.name, flag: spec.flag },
    personal: {
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      gender,
      age,
      birthDate,
      birthPlace: city.name,
      documentNumber: `TST${spec.code}${randomDigits(7)}`,
    },
    contact: {
      email: `${slugifyName(firstName)}.${slugifyName(lastName)}@${spec.emailDomain}`,
      phone: `${spec.phonePrefix} ${randomDigits(3)} ${randomDigits(3)} ${randomDigits(4)}`,
    },
    address: {
      street,
      houseNumber,
      postalCode: city.postalCode,
      city: city.name,
      region: city.region,
      country: spec.name,
      formatted: `${street} ${houseNumber}, ${city.postalCode} ${city.name}, ${spec.name}`,
    },
    government: {
      taxLabel: spec.taxLabel,
      taxId,
      taxStatus: spec.code === "DE" && validateGermanTaxId(taxId) ? "checksum-valid" : "format-only",
      insuranceLabel: spec.insuranceLabel,
      insuranceNumber: spec.code === "DE"
        ? `${lastName[0].toUpperCase()}${birthDate.slice(8, 10)}${birthDate.slice(5, 7)}${birthDate.slice(2, 4)}${randomDigits(3)}`
        : `TEST-${spec.code}-${randomDigits(8)}`,
    },
    banking: {
      bankName: `${spec.name} Test Bank`,
      iban,
      accountNumber: iban.slice(4),
      bic: `TSTB${spec.code}XXXXX`,
      card: {
        label: "Sandbox card",
        number: pick(TEST_CARD_NUMBERS),
        expiry: "12/34",
        cvc: "123",
      },
    },
    employment: {
      employer: `${city.name} Demo Labs`,
      jobTitle: pick(JOB_TITLES),
      employeeId: `EMP-${spec.code}-${randomDigits(6)}`,
    },
  };
}
