import {
  createRandomInt,
  generateSyntheticIdentity,
  type IdentityScenario,
  type ProfileGender,
} from "@/lib/global-test-data";
import {
  isSupportedCaseMode,
  supportedCaseModes,
} from "@/lib/iban-core";
import { COUNTRY_CATALOG_MAP } from "@/lib/country-catalog";
import {
  selectGeoCityOrFixture,
  type CountryGeoData,
} from "@/lib/geo-data";
import { generateNationalBanking } from "@/lib/national-banking";

export const runtime = "edge";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

type GenerateRequest = {
  country?: string;
  count?: number;
  seed?: string;
  scenario?: IdentityScenario;
  caseMode?: unknown;
  gender?: ProfileGender | "random";
  age?: number;
  city?: string;
  region?: string;
  timezone?: string;
  currency?: string;
};

async function loadCountryGeo(
  geoDataPath: string,
  requestUrl: string,
): Promise<CountryGeoData | null> {
  try {
    const response = await fetch(new URL(geoDataPath, requestUrl));
    if (!response.ok) return null;
    return (await response.json()) as CountryGeoData;
  } catch {
    return null;
  }
}

async function createResponse(input: GenerateRequest, requestUrl: string) {
  const countryCode = (input.country ?? "DE").toUpperCase();
  const country = COUNTRY_CATALOG_MAP.get(countryCode);
  if (!country) {
    return Response.json(
      { error: "UNSUPPORTED_COUNTRY", supported: [...COUNTRY_CATALOG_MAP.keys()] },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const count = Math.min(1000, Math.max(1, Number(input.count) || 1));
  const seed = String(input.seed ?? "");
  const scenario = input.scenario ?? "complete";
  const requestedCaseMode = input.caseMode ?? "valid";
  if (!isSupportedCaseMode(requestedCaseMode, Boolean(country.ibanSpec))) {
    return Response.json(
      {
        error: "UNSUPPORTED_CASE_MODE_FOR_COUNTRY",
        country: countryCode,
        supported: supportedCaseModes(Boolean(country.ibanSpec)),
      },
      { status: 400, headers: CORS_HEADERS },
    );
  }
  const caseMode = requestedCaseMode;
  const currency = String(input.currency ?? country.currency).toUpperCase();
  if (!country.currencies.includes(currency)) {
    return Response.json(
      {
        error: "UNSUPPORTED_CURRENCY_FOR_COUNTRY",
        country: countryCode,
        supported: country.currencies,
      },
      { status: 400, headers: CORS_HEADERS },
    );
  }
  const geoData = await loadCountryGeo(country.geoDataPath, requestUrl);
  const profiles = Array.from({ length: count }, (_, index) => {
    const bankingIdentity = generateNationalBanking(
      country,
      createRandomInt(seed ? `${seed}:iban:${index}` : undefined),
      { caseMode },
    );
    const geoCity = geoData
      ? selectGeoCityOrFixture(
          geoData,
          input.region ?? "random",
          input.city ?? "random",
          createRandomInt(seed ? `${seed}:city:${index}` : undefined),
        )
      : undefined;
    const explicitCity =
      !geoCity && input.city && input.region
        ? {
            name: input.city,
            region: input.region,
            timezone: input.timezone ?? country.timezone,
          }
        : undefined;
    return generateSyntheticIdentity({
      countryCode,
      iban: bankingIdentity.iban ?? "",
      bankingIdentity,
      cityName: geoCity || explicitCity ? "random" : input.city ?? "random",
      cityOverride: geoCity ?? explicitCity,
      genderChoice: input.gender ?? "random",
      ageChoice: input.age ?? "random",
      scenario,
      currencyOverride: currency,
      seed,
      index,
    });
  });

  return Response.json(
    {
      meta: {
        count,
        country: countryCode,
        scenario,
        caseMode,
        paymentScheme: country.payment.scheme,
        currency,
        registryRelease: country.ibanSpec?.registryRelease ?? null,
        geographicSource: geoData
          ? {
              release: geoData.meta.release,
              quality: geoData.meta.quality,
              regions: geoData.counts.regions,
              cities: geoData.counts.cities,
            }
          : null,
        synthetic: true,
      },
      data: count === 1 ? profiles[0] : profiles,
    },
    { headers: { ...CORS_HEADERS, "Cache-Control": "no-store" } },
  );
}

export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  return createResponse({
    country: params.get("country") ?? undefined,
    count: Number(params.get("count") ?? 1),
    seed: params.get("seed") ?? undefined,
    scenario: (params.get("scenario") as IdentityScenario | null) ?? undefined,
    caseMode: params.get("case") ?? undefined,
    gender: (params.get("gender") as ProfileGender | "random" | null) ?? undefined,
    age: params.has("age") ? Number(params.get("age")) : undefined,
    city: params.get("city") ?? undefined,
    region: params.get("region") ?? undefined,
    timezone: params.get("timezone") ?? undefined,
    currency: params.get("currency") ?? undefined,
  }, request.url);
}

export async function POST(request: Request) {
  try {
    return createResponse(
      (await request.json()) as GenerateRequest,
      request.url,
    );
  } catch {
    return Response.json(
      { error: "INVALID_JSON_BODY" },
      { status: 400, headers: CORS_HEADERS },
    );
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
