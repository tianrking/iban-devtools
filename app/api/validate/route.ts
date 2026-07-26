import { validateIban } from "@/lib/iban-core";

export const runtime = "edge";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function response(iban: unknown) {
  if (typeof iban !== "string" || !iban.trim()) {
    return Response.json(
      { error: "IBAN_REQUIRED" },
      { status: 400, headers: CORS_HEADERS },
    );
  }
  return Response.json(validateIban(iban), {
    headers: { ...CORS_HEADERS, "Cache-Control": "no-store" },
  });
}

export function GET(request: Request) {
  return response(new URL(request.url).searchParams.get("iban"));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { iban?: unknown };
    return response(body.iban);
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
