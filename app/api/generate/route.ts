import {
  createRandomInt,
  generateSyntheticIdentity,
  type IdentityScenario,
  type ProfileGender,
} from "@/lib/global-test-data";
import {
  generateIban,
  IBAN_COUNTRY_MAP,
  type IbanCaseMode,
} from "@/lib/iban-core";

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
};

function createResponse(input: GenerateRequest) {
  const countryCode = (input.country ?? "DE").toUpperCase();
  const country = IBAN_COUNTRY_MAP.get(countryCode);
  if (!country) {
    return Response.json(
      { error: "UNSUPPORTED_COUNTRY", supported: [...IBAN_COUNTRY_MAP.keys()] },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const count = Math.min(1000, Math.max(1, Number(input.count) || 1));
  const seed = String(input.seed ?? "");
  const scenario = input.scenario ?? "complete";
  const caseMode = input.caseMode ?? "valid";
  const profiles = Array.from({ length: count }, (_, index) => {
    const iban = generateIban(
      country,
      createRandomInt(seed ? `${seed}:iban:${index}` : undefined),
      { caseMode },
    );
    return generateSyntheticIdentity({
      countryCode,
      iban,
      cityName: input.city ?? "random",
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
        registryRelease: country.registryRelease,
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
