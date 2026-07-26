import { IBAN_COUNTRIES } from "@/lib/iban-core";

export const runtime = "edge";

export function GET() {
  return Response.json(
    {
      count: IBAN_COUNTRIES.length,
      registryRelease: IBAN_COUNTRIES[0]?.registryRelease,
      data: IBAN_COUNTRIES,
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400",
      },
    },
  );
}
