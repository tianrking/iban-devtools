export type GeoCity = {
  name: string;
  timezone: string;
};

export type GeoRegion = {
  code: string;
  name: string;
  type: string;
  timezone: string;
  cities: GeoCity[];
};

export type CountryGeoData = {
  meta: {
    source: string;
    sourceUrl: string;
    release: string;
    license: "ODbL-1.0";
    quality: "community-maintained-reference-not-official";
  };
  country: {
    code: string;
    name: string;
    nativeName: string;
    capital: string;
    currency: string;
    phoneCode: string;
    timezone: string;
  };
  counts: {
    regions: number;
    cities: number;
  };
  regions: GeoRegion[];
};
