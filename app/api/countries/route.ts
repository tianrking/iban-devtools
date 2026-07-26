import { IBAN_COUNTRIES } from "@/lib/iban-core";
import {
  AMERICAS_SOVEREIGN_CODES,
  COUNTRY_CATALOG,
} from "@/lib/country-catalog";

export const runtime = "edge";

export function GET() {
  return Response.json(
    {
      count: COUNTRY_CATALOG.length,
      ibanCountries: IBAN_COUNTRIES.length,
      americasCountries: AMERICAS_SOVEREIGN_CODES.length,
      registryRelease: IBAN_COUNTRIES[0]?.registryRelease,
      data: COUNTRY_CATALOG,
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400",
      },
    },
  );
}
