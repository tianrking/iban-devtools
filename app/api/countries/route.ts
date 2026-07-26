import { IBAN_COUNTRIES } from "@/lib/iban-core";
import {
  AMERICAS_SOVEREIGN_CODES,
  COUNTRY_CATALOG,
  WORLD_GEO_COUNTS,
  WORLD_GEO_SOURCE,
} from "@/lib/country-catalog";

export const runtime = "edge";

export function GET() {
  return Response.json(
    {
      count: COUNTRY_CATALOG.length,
      isoCountriesAndAreas: COUNTRY_CATALOG.filter(
        (country) => country.isoStatus === "official",
      ).length,
      ibanCountries: IBAN_COUNTRIES.length,
      americasSovereignCountries: AMERICAS_SOVEREIGN_CODES.length,
      americasCountriesAndAreas: COUNTRY_CATALOG.filter(
        (country) => country.region === "Americas",
      ).length,
      geographicCoverage: WORLD_GEO_COUNTS,
      geographicSource: WORLD_GEO_SOURCE,
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
