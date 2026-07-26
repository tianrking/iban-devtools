export type CompactGeoCity = string | [name: string, timezone: string];

export type GeoCity = {
  name: string;
  timezone: string;
};

export type GeoRegion = {
  code: string;
  name: string;
  type: string;
  timezone: string;
  cities: CompactGeoCity[];
};

export type CountryGeoData = {
  meta: {
    source: string;
    sourceUrl: string;
    release: string;
    sourceSha256: string;
    license: "ODbL-1.0";
    quality: "community-maintained-reference-not-official";
  };
  country: {
    code: string;
    name: string;
    nativeName: string;
    capital: string;
    currency: string;
    currencies: string[];
    phoneCode: string;
    timezone: string;
  };
  counts: {
    regions: number;
    cities: number;
  };
  regions: GeoRegion[];
};

export function expandGeoCity(
  city: CompactGeoCity,
  regionTimezone: string,
): GeoCity {
  return typeof city === "string"
    ? { name: city, timezone: regionTimezone }
    : { name: city[0], timezone: city[1] };
}

export type GeoCitySelection = GeoCity & {
  region: string;
  synthetic?: true;
};

export function findGeoRegion(
  data: CountryGeoData,
  regionChoice: string,
): GeoRegion | undefined {
  if (regionChoice === "random") return undefined;
  return data.regions.find(
    (region) =>
      region.code === regionChoice || region.name === regionChoice,
  );
}

export function uniqueRegionCities(region: GeoRegion): GeoCity[] {
  const names = new Set<string>();
  const cities: GeoCity[] = [];
  for (const item of region.cities) {
    const city = expandGeoCity(item, region.timezone);
    if (names.has(city.name)) continue;
    names.add(city.name);
    cities.push(city);
  }
  return cities;
}

export function selectGeoCity(
  data: CountryGeoData,
  regionChoice: string,
  cityChoice: string,
  randomInt: (max: number) => number,
): GeoCitySelection | undefined {
  const regions =
    regionChoice === "random"
      ? data.regions
      : [findGeoRegion(data, regionChoice)].filter(
          (region): region is GeoRegion => Boolean(region),
        );

  if (cityChoice !== "random") {
    for (const region of regions) {
      const city = uniqueRegionCities(region)
        .find((item) => item.name === cityChoice);
      if (city) return { ...city, region: region.name };
    }
    return undefined;
  }

  const regionCities = regions.map((region) => ({
    region,
    cities: uniqueRegionCities(region),
  }));
  const cityCount = regionCities.reduce(
    (total, entry) => total + entry.cities.length,
    0,
  );
  if (cityCount === 0) return undefined;

  let target = randomInt(cityCount);
  for (const { region, cities } of regionCities) {
    if (target < cities.length) {
      const city = cities[target];
      return { ...city, region: region.name };
    }
    target -= cities.length;
  }
  return undefined;
}

export function selectGeoCityOrFixture(
  data: CountryGeoData,
  regionChoice: string,
  cityChoice: string,
  randomInt: (max: number) => number,
): GeoCitySelection | undefined {
  const city = selectGeoCity(
    data,
    regionChoice,
    cityChoice,
    randomInt,
  );
  if (city || cityChoice !== "random") return city;

  const regions =
    regionChoice === "random"
      ? data.regions
      : [findGeoRegion(data, regionChoice)].filter(
          (region): region is GeoRegion => Boolean(region),
        );
  if (regions.length > 0) {
    const region = regions[randomInt(regions.length)];
    return {
      name: `${region.name} Test Locality`,
      region: region.name,
      timezone: region.timezone,
      synthetic: true,
    };
  }

  return {
    name: `${data.country.code} Test Locality`,
    region: `${data.country.code} Synthetic Region`,
    timezone: data.country.timezone,
    synthetic: true,
  };
}
