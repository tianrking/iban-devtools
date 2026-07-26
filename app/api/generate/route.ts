import {
  createRandomInt,
  generateSyntheticIdentity,
  type IdentityScenario,
  type ProfileGender,
} from "@/lib/global-test-data";
import { type IbanCaseMode } from "@/lib/iban-core";
import { COUNTRY_CATALOG_MAP } from "@/lib/country-catalog";
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
  caseMode?: IbanCaseMode;
  gender?: ProfileGender | "random";
  age?: number;
  city?: string;
  region?: string;
  timezone?: string;
};

function createResponse(input: GenerateRequest) {
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
  const caseMode = input.caseMode ?? "valid";
  const profiles = Array.from({ length: count }, (_, index) => {
    const bankingIdentity = generateNationalBanking(
      country,
      createRandomInt(seed ? `${seed}:iban:${index}` : undefined),
      { caseMode },
    );
    return generateSyntheticIdentity({
      countryCode,
      iban: bankingIdentity.iban ?? "",
      bankingIdentity,
      cityName: input.city ?? "random",
      cityOverride:
        input.city && input.region
          ? {
              name: input.city,
              region: input.region,
              timezone: input.timezone,
            }
          : undefined,
      genderChoice: input.gender ?? "random",
      ageChoice: input.age ?? "random",
      scenario,
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
        registryRelease: country.ibanSpec?.registryRelease ?? null,
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
    caseMode: (params.get("case") as IbanCaseMode | null) ?? undefined,
    gender: (params.get("gender") as ProfileGender | "random" | null) ?? undefined,
    age: params.has("age") ? Number(params.get("age")) : undefined,
    city: params.get("city") ?? undefined,
    region: params.get("region") ?? undefined,
    timezone: params.get("timezone") ?? undefined,
  });
}

export async function POST(request: Request) {
  try {
    return createResponse((await request.json()) as GenerateRequest);
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
