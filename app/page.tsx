"use client";

import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createRandomInt,
  DEFAULT_SYNTHETIC_IDENTITY,
  generateSyntheticIdentity,
  getIdentityCountry,
  type AgeChoice,
  type IdentityScenario,
  type ProfileGender,
  type SyntheticIdentity,
} from "@/lib/global-test-data";
import {
  cleanIban,
  countryRegex,
  formatIban,
  IBAN_COUNTRIES,
  isSupportedCaseMode,
  type IbanCaseMode,
  type IbanCountrySpec,
  validateIban,
} from "@/lib/iban-core";
import {
  COUNTRY_CATALOG,
  COUNTRY_CATALOG_MAP,
  WORLD_GEO_COUNTS,
} from "@/lib/country-catalog";
import { generateNationalBanking } from "@/lib/national-banking";
import {
  findGeoRegion,
  selectGeoCityOrFixture,
  type CountryGeoData,
  uniqueRegionCities,
} from "@/lib/geo-data";
import {
  EXPORT_FORMATS,
  exportFileMetadata,
  exportProfiles,
  type ExportFormat,
} from "@/lib/exporters";
import {
  createTranslator,
  DEFAULT_LOCALE,
  displayCountryName,
  formatLocaleNumber,
  isAppLocale,
  localeDirection,
  LOCALE_OPTIONS,
  LOCALE_STORAGE_KEY,
  resolveAppLocale,
  type AppLocale,
  type MessageKey,
} from "@/lib/i18n";
import type {
  BatchWorkerRequest,
  BatchWorkerResponse,
} from "./batch-worker";

const COUNTRIES = COUNTRY_CATALOG;
const COUNTRY_MAP = COUNTRY_CATALOG_MAP;
const DEFAULT_IBAN = "DE89370400440532013000";
const COUNTRY_SCOPES = [
  ["all", "regionAll"],
  ["sepa", "scenarioSepa"],
  ["Europe", "regionEurope"],
  ["Asia", "regionAsia"],
  ["Africa", "regionAfrica"],
  ["Americas", "regionAmericas"],
  ["Oceania", "regionOceania"],
  ["Polar", "regionPolar"],
  ["Other", "regionOther"],
] as const;
type CountryScope = (typeof COUNTRY_SCOPES)[number][0];
const GENDER_OPTIONS = [
  ["random", "random"],
  ["female", "female"],
  ["male", "male"],
] as const;
const AGE_MODES = [
  ["random", "random"],
  ["exact", "exact"],
  ["range", "range"],
] as const;
const SCENARIOS: Array<{
  value: IdentityScenario;
  labelKey: MessageKey;
  hintKey: MessageKey;
}> = [
  { value: "complete", labelKey: "scenarioComplete", hintKey: "scenarioCompleteHint" },
  { value: "kyc", labelKey: "scenarioKyc", hintKey: "scenarioKycHint" },
  { value: "payments", labelKey: "scenarioPayments", hintKey: "scenarioPaymentsHint" },
  { value: "payroll", labelKey: "scenarioPayroll", hintKey: "scenarioPayrollHint" },
  { value: "ecommerce", labelKey: "scenarioEcommerce", hintKey: "scenarioEcommerceHint" },
  { value: "sepa", labelKey: "scenarioSepa", hintKey: "scenarioSepaHint" },
  { value: "api-boundary", labelKey: "scenarioBoundary", hintKey: "scenarioBoundaryHint" },
  { value: "database", labelKey: "scenarioDatabase", hintKey: "scenarioDatabaseHint" },
];
const CASE_MODES: Array<{ value: IbanCaseMode; labelKey: MessageKey }> = [
  { value: "valid", labelKey: "caseValidIban" },
  { value: "bad-checksum", labelKey: "caseBadChecksum" },
  { value: "wrong-length", labelKey: "caseWrongLength" },
  { value: "illegal-character", labelKey: "caseIllegalCharacter" },
  { value: "bad-bban", labelKey: "caseBadBban" },
  { value: "lowercase", labelKey: "caseLowercase" },
  { value: "hyphenated", labelKey: "caseHyphenated" },
];
const VALIDATION_REASONS: Record<string, MessageKey> = {
  REGISTRY_FORMAT_AND_MOD97_VALID: "validationRegistryValid",
  ILLEGAL_CHARACTERS: "validationIllegalCharacters",
  UNREGISTERED_COUNTRY: "validationUnregisteredCountry",
  INVALID_LENGTH: "validationInvalidLength",
  INVALID_BBAN_STRUCTURE: "validationInvalidBban",
  INVALID_CHECKSUM: "validationInvalidChecksum",
  INVALID_IBAN: "validationInvalidIban",
};
const RISK_LABELS: Record<string, MessageKey> = {
  low: "riskLow",
  medium: "riskMedium",
  high: "riskHigh",
};
const VOP_LABELS: Record<string, MessageKey> = {
  match: "vopMatch",
  "close-match": "vopCloseMatch",
  "no-match": "vopNoMatch",
  unavailable: "vopUnavailable",
};
const EXPORT_DESCRIPTION_KEYS: Record<ExportFormat, MessageKey> = {
  json: "exportJsonDescription",
  ndjson: "exportNdjsonDescription",
  csv: "exportCsvDescription",
  typescript: "exportTypescriptDescription",
  zod: "exportZodDescription",
  "json-schema": "exportJsonSchemaDescription",
  playwright: "exportPlaywrightDescription",
  cypress: "exportCypressDescription",
  postman: "exportPostmanDescription",
  env: "exportEnvDescription",
  sql: "exportSqlDescription",
  python: "exportPythonDescription",
};

type QuickPreset = {
  id: "kyc" | "payment-regression" | "payment-failure" | "database";
  icon: string;
  title: string;
  description: string;
  scenario: IdentityScenario;
  caseMode: IbanCaseMode;
  count: number;
};

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function bidiIsolate(value: string) {
  return `\u2068${value}\u2069`;
}

export default function Home() {
  const [locale, setLocale] = useState<AppLocale>(DEFAULT_LOCALE);
  const [localeReady, setLocaleReady] = useState(false);
  const [tab, setTab] = useState<"generate" | "validate">("generate");
  const [generateMode, setGenerateMode] = useState<"single" | "batch">("single");
  const [countryCode, setCountryCode] = useState("DE");
  const [currencyChoice, setCurrencyChoice] = useState("EUR");
  const [regionChoice, setRegionChoice] = useState("random");
  const [cityChoice, setCityChoice] = useState("random");
  const [genderChoice, setGenderChoice] = useState<ProfileGender | "random">("random");
  const [ageMode, setAgeMode] = useState<"random" | "exact" | "range">("random");
  const [exactAge, setExactAge] = useState(32);
  const [minimumAge, setMinimumAge] = useState(25);
  const [maximumAge, setMaximumAge] = useState(45);
  const [firstNameOverride, setFirstNameOverride] = useState("");
  const [lastNameOverride, setLastNameOverride] = useState("");
  const [streetOverride, setStreetOverride] = useState("");
  const [postalCodeOverride, setPostalCodeOverride] = useState("");
  const [seed, setSeed] = useState("");
  const [scenario, setScenario] = useState<IdentityScenario>("complete");
  const [caseMode, setCaseMode] = useState<IbanCaseMode>("valid");
  const [formatted, setFormatted] = useState(true);
  const [bankCode, setBankCode] = useState("");
  const [account, setAccount] = useState("");
  const [identityAdvancedOpen, setIdentityAdvancedOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [batchCount, setBatchCount] = useState(10);
  const [batchPage, setBatchPage] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [countryQuery, setCountryQuery] = useState("");
  const [countryScope, setCountryScope] = useState<CountryScope>("all");
  const [cityQuery, setCityQuery] = useState("");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("json");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [commandOpen, setCommandOpen] = useState(false);
  const [profiles, setProfiles] = useState<SyntheticIdentity[]>([
    DEFAULT_SYNTHETIC_IDENTITY,
  ]);
  const [validatorInput, setValidatorInput] = useState(DEFAULT_IBAN);
  const [toast, setToast] = useState("");
  const [geoData, setGeoData] = useState<CountryGeoData | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState(false);
  const batchWorkerRef = useRef<Worker | null>(null);
  const batchConfigurationRef = useRef("");
  const commandDialogRef = useRef<HTMLDivElement | null>(null);
  const commandTriggerRef = useRef<HTMLButtonElement | null>(null);
  const t = useMemo(() => createTranslator(locale), [locale]);
  const number = (value: number) => formatLocaleNumber(value, locale);

  const batchConfigurationSignature = JSON.stringify([
    generateMode,
    countryCode,
    currencyChoice,
    regionChoice,
    cityChoice,
    genderChoice,
    ageMode,
    exactAge,
    minimumAge,
    maximumAge,
    batchCount,
    scenario,
    caseMode,
    bankCode,
    account,
    seed,
    firstNameOverride,
    lastNameOverride,
    streetOverride,
    postalCodeOverride,
  ]);
  const country = COUNTRY_MAP.get(countryCode) ?? COUNTRIES[0];
  const countryName = displayCountryName(
    country.code,
    locale,
    country.englishName,
  );
  const caseModeOptions = country.ibanSpec
    ? CASE_MODES.map((item) => ({
        ...item,
        label: t(item.labelKey),
      }))
    : CASE_MODES
        .filter(
          (item) =>
            item.value !== "lowercase" &&
            item.value !== "hyphenated",
        )
        .map((item) => {
          if (item.value === "valid") {
            return {
              ...item,
              label:
                country.payment.validation === "checksum"
                  ? t("caseValidChecksum")
                  : t("caseFormatFixture"),
            };
          }
          if (item.value === "bad-checksum") {
            return {
              ...item,
              label:
                country.payment.validation === "checksum"
                  ? t("caseBadChecksum")
                  : t("caseBrokenFormat"),
            };
          }
          if (item.value === "bad-bban") {
            return { ...item, label: t("caseBadRouting") };
          }
          return { ...item, label: t(item.labelKey) };
        });
  const filteredCountries = useMemo(() => {
    const query = countryQuery.trim().toLowerCase();
    return COUNTRIES.filter((item) => {
      const inScope =
        countryScope === "all" ||
        (countryScope === "sepa"
          ? Boolean(item.ibanSpec?.sepa)
          : item.region === countryScope);
      return (
        inScope &&
        (!query ||
          item.code.toLowerCase().includes(query) ||
          displayCountryName(item.code, locale, item.englishName)
            .toLocaleLowerCase(locale)
            .includes(query) ||
          item.name.toLowerCase().includes(query) ||
          item.englishName.toLowerCase().includes(query) ||
          item.nativeName.toLowerCase().includes(query) ||
          item.currencies.some((currency) =>
            currency.toLowerCase().includes(query),
          ))
      );
    });
  }, [countryQuery, countryScope, locale]);
  const identityCountry = getIdentityCountry(countryCode);
  const regionOptions = useMemo(
    () => {
      if (geoData?.country.code === countryCode) {
        const nameCounts = new Map<string, number>();
        for (const region of geoData.regions) {
          nameCounts.set(
            region.name,
            (nameCounts.get(region.name) ?? 0) + 1,
          );
        }
        return geoData.regions.map((region) => ({
          value: region.code,
          label:
            (nameCounts.get(region.name) ?? 0) > 1
              ? `${region.name} · ${region.code}`
              : region.name,
        }));
      }
      return [...new Set(identityCountry.cities.map((city) => city.region))].map(
        (region) => ({ value: region, label: region }),
      );
    },
    [countryCode, geoData, identityCountry],
  );
  const regionChoiceLabel =
    regionChoice === "random"
      ? t("allRegions")
      : regionOptions.find((region) => region.value === regionChoice)?.label ??
        regionChoice;
  const availableCities = useMemo(
    () => {
      if (geoData?.country.code === countryCode) {
        if (regionChoice === "random") return [];
        const region = findGeoRegion(geoData, regionChoice);
        return region ? uniqueRegionCities(region) : [];
      }
      return regionChoice === "random"
        ? identityCountry.cities
        : identityCountry.cities.filter((city) => city.region === regionChoice);
    },
    [countryCode, geoData, identityCountry, regionChoice],
  );
  const visibleCityOptions = useMemo(() => {
    const query = cityQuery.trim().toLocaleLowerCase();
    const matches = query
      ? availableCities.filter((city) =>
          city.name.toLocaleLowerCase().includes(query),
        )
      : availableCities;
    const limited = matches.slice(0, 100);
    if (
      cityChoice !== "random" &&
      !limited.some((city) => city.name === cityChoice)
    ) {
      const selected = availableCities.find((city) => city.name === cityChoice);
      if (selected) return [selected, ...limited];
    }
    return limited;
  }, [availableCities, cityChoice, cityQuery]);
  const usesSyntheticLocality =
    geoData?.country.code === countryCode &&
    !geoLoading &&
    (geoData.counts.cities === 0 ||
      (regionChoice !== "random" &&
        (findGeoRegion(geoData, regionChoice)?.cities.length ?? 0) === 0));
  const resolvedAgeChoice: AgeChoice =
    ageMode === "random"
      ? "random"
      : ageMode === "exact"
        ? exactAge
        : { min: minimumAge, max: maximumAge };
  const activeProfile = profiles[0] ?? DEFAULT_SYNTHETIC_IDENTITY;
  const quickPresets: QuickPreset[] = [
    {
      id: "kyc",
      icon: "ID",
      title: t("presetKycTitle"),
      description: t("presetSingleComplete", { country: country.code }),
      scenario: "kyc",
      caseMode: "valid",
      count: 1,
    },
    {
      id: "payment-regression",
      icon: "↔",
      title: country.ibanSpec?.sepa
        ? t("presetSepaRegression")
        : t("presetLocalRegression"),
      description: t("presetValidAccounts", {
        currency: country.ibanSpec?.sepa ? "EUR" : currencyChoice,
      }),
      scenario: country.ibanSpec?.sepa ? "sepa" : "payments",
      caseMode: "valid",
      count: 10,
    },
    {
      id: "payment-failure",
      icon: "×",
      title: t("presetFailureTitle"),
      description: `${country.code} · ${
        country.payment.validation === "checksum"
          ? t("presetBadChecksum")
          : t("presetNegativeFormat")
      }`,
      scenario: "payments",
      caseMode:
        country.payment.validation === "checksum"
          ? "bad-checksum"
          : "bad-bban",
      count: 1,
    },
    {
      id: "database",
      icon: "DB",
      title: t("presetDatabaseTitle"),
      description: t("presetExportable", { country: country.code }),
      scenario: "database",
      caseMode: "valid",
      count: 100,
    },
  ];
  const activePresetId = quickPresets.find(
    (preset) =>
      preset.scenario === scenario &&
      preset.caseMode === caseMode &&
      preset.count === (generateMode === "single" ? 1 : batchCount),
  )?.id;
  const validation = useMemo(() => validateIban(validatorInput), [validatorInput]);
  const generatedValidation = useMemo(
    () =>
      activeProfile.banking.iban
        ? validateIban(activeProfile.banking.iban)
        : null,
    [activeProfile.banking.iban],
  );
  const visibleProfiles = profiles.slice(batchPage * 25, batchPage * 25 + 25);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedLocale = params.get("lang");
    let savedLocale: string | null = null;
    try {
      savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY);
    } catch {
      savedLocale = null;
    }
    const resolvedLocale = resolveAppLocale(sharedLocale, savedLocale);
    const timer = window.setTimeout(() => {
      setLocale(resolvedLocale);
      setLocaleReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!localeReady) return;
    const direction = localeDirection(locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = direction;
    document.documentElement.dataset.locale = locale;
    document.title = t("appTitle");
    const description = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    description?.setAttribute("content", t("appDescription"));
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // The language still works when storage is unavailable.
    }
  }, [locale, localeReady, t]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(
    () => () => {
      batchWorkerRef.current?.terminate();
    },
    [],
  );

  useEffect(() => {
    batchConfigurationRef.current = batchConfigurationSignature;
    if (!batchWorkerRef.current) return;
    batchWorkerRef.current.terminate();
    batchWorkerRef.current = null;
    setIsGenerating(false);
  }, [batchConfigurationSignature]);

  useEffect(() => {
    if (!country.geoDataPath) return;
    const controller = new AbortController();
    Promise.resolve()
      .then(() => {
        setGeoLoading(true);
        setGeoError(false);
        return fetch(country.geoDataPath!, { signal: controller.signal });
      })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP_${response.status}`);
        return response.json() as Promise<CountryGeoData>;
      })
      .then((data) => {
        setGeoData(data);
        setGeoLoading(false);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setGeoData(null);
        setGeoError(true);
        setGeoLoading(false);
      });
    return () => controller.abort();
  }, [country.geoDataPath]);

  const syncSingleProfileToGeo = useEffectEvent(
    (data: CountryGeoData) => {
      if (generateMode !== "single") return;
      const selectedCity = selectGeoCityOrFixture(
        data,
        regionChoice,
        cityChoice,
        createRandomInt(seed ? `${seed}:city:0` : undefined),
      );
      const bankingIdentity = generateNationalBanking(
        country,
        createRandomInt(seed ? `${seed}:iban:0` : undefined),
        { bankCode, account, caseMode },
      );
      setProfiles((current) => {
        if (
          current.length !== 1 ||
          current[0].country.code !== countryCode
        ) {
          return current;
        }
        return [
          generateSyntheticIdentity({
            countryCode,
            iban: bankingIdentity.iban ?? "",
            bankingIdentity,
            cityName: selectedCity ? "random" : cityChoice,
            cityOverride: selectedCity,
            genderChoice,
            ageChoice: resolvedAgeChoice,
            firstNameOverride,
            lastNameOverride,
            streetOverride,
            postalCodeOverride,
            currencyOverride: currencyChoice,
            seed,
            scenario,
          }),
        ];
      });
    },
  );

  useEffect(() => {
    if (geoData?.country.code !== countryCode) return;
    const timer = window.setTimeout(() => {
      syncSingleProfileToGeo(geoData);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [countryCode, geoData]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedCountry = params.get("country");
    const sharedScenario = params.get("scenario") as IdentityScenario | null;
    const sharedCase = params.get("case") as IbanCaseMode | null;
    const sharedSeed = params.get("seed") ?? "";
    const sharedCurrency = params.get("currency") ?? "";
    const sharedSpec = sharedCountry
      ? (COUNTRY_MAP.get(sharedCountry) ?? COUNTRY_MAP.get("DE")!)
      : COUNTRY_MAP.get("DE")!;
    const resolvedSharedCase = isSupportedCaseMode(
      sharedCase,
      Boolean(sharedSpec.ibanSpec),
    )
      ? sharedCase
      : "valid";
    const timer = window.setTimeout(() => {
      if (sharedCountry && COUNTRY_MAP.has(sharedCountry)) {
        const resolvedSharedScenario =
          sharedScenario && SCENARIOS.some((item) => item.value === sharedScenario)
            ? sharedScenario
            : "complete";
        const resolvedSharedCurrency = sharedSpec.currencies.includes(
          sharedCurrency,
        )
          ? sharedCurrency
          : sharedSpec.currency;
        const bankingIdentity = generateNationalBanking(
          sharedSpec,
          createRandomInt(sharedSeed ? `${sharedSeed}:iban:0` : undefined),
          { caseMode: resolvedSharedCase },
        );
        setCountryCode(sharedCountry);
        setCurrencyChoice(resolvedSharedCurrency);
        setProfiles([
          generateSyntheticIdentity({
            countryCode: sharedCountry,
            iban: bankingIdentity.iban ?? "",
            bankingIdentity,
            scenario: resolvedSharedScenario,
            currencyOverride: resolvedSharedCurrency,
            seed: sharedSeed,
          }),
        ]);
      }
      if (sharedScenario && SCENARIOS.some((item) => item.value === sharedScenario)) {
        setScenario(sharedScenario);
      }
      if (
        sharedCase &&
        isSupportedCaseMode(sharedCase, Boolean(sharedSpec.ibanSpec))
      ) {
        setCaseMode(resolvedSharedCase);
      }
      if (sharedSeed) setSeed(sharedSeed);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!commandOpen || !commandDialogRef.current) return;
    const dialog = commandDialogRef.current;
    const commandTrigger = commandTriggerRef.current;
    const previousFocus = document.activeElement;
    const background = Array.from(
      document.querySelectorAll<HTMLElement>(
        "main > :not(.command-backdrop)",
      ),
    );
    background.forEach((element) => {
      element.inert = true;
    });

    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    focusable[0]?.focus();

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener("keydown", trapFocus);

    return () => {
      dialog.removeEventListener("keydown", trapFocus);
      background.forEach((element) => {
        element.inert = false;
      });
      if (previousFocus instanceof HTMLElement) {
        previousFocus.focus();
      } else {
        commandTrigger?.focus();
      }
    };
  }, [commandOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
      if (event.key === "Escape") setCommandOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  };

  const changeLocale = (nextLocale: AppLocale) => {
    setLocale(nextLocale);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", nextLocale);
    window.history.replaceState(null, "", url);
  };

  const copyText = async (text: string, message = t("copied")) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(message);
    } catch {
      showToast(t("copyFailed"));
    }
  };

  const resolveGeoCity = (index = 0) => {
    if (geoData?.country.code !== countryCode) return undefined;
    const randomInt = createRandomInt(seed ? `${seed}:city:${index}` : undefined);
    return selectGeoCityOrFixture(
      geoData,
      regionChoice,
      cityChoice,
      randomInt,
    );
  };

  const createProfile = (
    index = 0,
    overrides: {
      scenario?: IdentityScenario;
      caseMode?: IbanCaseMode;
    } = {},
  ) => {
    const resolvedScenario = overrides.scenario ?? scenario;
    const resolvedCaseMode = overrides.caseMode ?? caseMode;
    const bankingIdentity = generateNationalBanking(
      country,
      createRandomInt(seed ? `${seed}:iban:${index}` : undefined),
      { bankCode, account, caseMode: resolvedCaseMode },
    );
    const cityOverride = resolveGeoCity(index);
    const cityName =
      cityOverride
        ? "random"
        : cityChoice !== "random" || regionChoice === "random"
        ? cityChoice
        : availableCities[
            createRandomInt(seed ? `${seed}:city:${index}` : undefined)(
              availableCities.length,
            )
          ]?.name ?? "random";
    return generateSyntheticIdentity({
      countryCode,
      iban: bankingIdentity.iban ?? "",
      bankingIdentity,
      cityName,
      cityOverride,
      genderChoice,
      ageChoice: resolvedAgeChoice,
      firstNameOverride,
      lastNameOverride,
      streetOverride,
      postalCodeOverride,
      currencyOverride: currencyChoice,
      seed,
      index,
      scenario: resolvedScenario,
    });
  };

  const regenerate = () => {
    setProfiles([createProfile()]);
    localStorage.setItem(
      "iban-devtools:last-config",
      JSON.stringify({
        countryCode,
        currencyChoice,
        scenario,
        caseMode,
        batchCount: 1,
        seed,
        locale,
      }),
    );
    showToast(t("identityGenerated"));
  };

  const changeCountry = (code: string) => {
    const nextCountry = COUNTRY_MAP.get(code) ?? COUNTRIES[0];
    const nextBanking = generateNationalBanking(
      nextCountry,
      createRandomInt(seed ? `${seed}:iban:0` : undefined),
      { caseMode: "valid" },
    );
    setCountryCode(code);
    setCaseMode("valid");
    setCurrencyChoice(nextCountry.currency);
    setRegionChoice("random");
    setCityChoice("random");
    setCityQuery("");
    setBankCode("");
    setAccount("");
    setStreetOverride("");
    setPostalCodeOverride("");
    setProfiles([
      generateSyntheticIdentity({
        countryCode: code,
        iban: nextBanking.iban ?? "",
        bankingIdentity: nextBanking,
        genderChoice,
        ageChoice: resolvedAgeChoice,
        firstNameOverride,
        lastNameOverride,
        currencyOverride: nextCountry.currency,
        seed,
        scenario,
      }),
    ]);
  };

  const generateBatch = () => {
    const finish = (nextProfiles: SyntheticIdentity[], elapsedMs?: number) => {
      setProfiles(nextProfiles);
      setBatchPage(0);
      setIsGenerating(false);
      localStorage.setItem(
        "iban-devtools:last-config",
        JSON.stringify({
          countryCode,
          currencyChoice,
          scenario,
          caseMode,
          batchCount,
          seed,
          locale,
        }),
      );
      const timing =
        elapsedMs === undefined ? "" : ` · ${elapsedMs.toFixed(1)}ms`;
      showToast(
        t("batchGenerated", {
          count: number(batchCount),
          timing,
        }),
      );
    };
    const fallback = () => {
      finish(
        Array.from({ length: batchCount }, (_, index) => createProfile(index)),
      );
    };

    setIsGenerating(true);
    if (typeof Worker === "undefined") {
      fallback();
      return;
    }

    const worker = new Worker(new URL("./batch-worker.ts", import.meta.url), {
      type: "module",
    });
    const requestSignature = batchConfigurationSignature;
    batchWorkerRef.current?.terminate();
    batchWorkerRef.current = worker;
    const request: BatchWorkerRequest = {
      countryCode,
      count: batchCount,
      bankCode,
      account,
      seed,
      caseMode,
      scenario,
      cityChoice,
      regionChoice,
      geoDataPath: country.geoDataPath,
      currencyChoice,
      genderChoice,
      ageChoice: resolvedAgeChoice,
      firstNameOverride,
      lastNameOverride,
      streetOverride,
      postalCodeOverride,
    };
    worker.onmessage = (event: MessageEvent<BatchWorkerResponse>) => {
      if (
        batchWorkerRef.current !== worker ||
        batchConfigurationRef.current !== requestSignature
      ) {
        worker.terminate();
        return;
      }
      if (event.data.ok) {
        finish(event.data.profiles, event.data.elapsedMs);
      } else {
        fallback();
      }
      batchWorkerRef.current = null;
      worker.terminate();
    };
    worker.onerror = () => {
      if (
        batchWorkerRef.current !== worker ||
        batchConfigurationRef.current !== requestSignature
      ) {
        worker.terminate();
        return;
      }
      batchWorkerRef.current = null;
      worker.terminate();
      fallback();
    };
    worker.postMessage(request);
  };

  const changeGenerateMode = (mode: "single" | "batch") => {
    setGenerateMode(mode);
    if (mode === "single" && profiles.length > 1) {
      setProfiles([
        createProfile(),
      ]);
    }
  };

  const displayIban = (value: string) =>
    formatted && caseMode === "valid" ? formatIban(value) : value;
  const displayBankingValue = (profile: SyntheticIdentity) =>
    profile.banking.iban
      ? displayIban(profile.banking.iban)
      : profile.banking.paymentIdentifier.value;

  const exportData = (format = exportFormat) => {
    const metadata = exportFileMetadata(format);
    downloadFile(
      exportProfiles(profiles, format),
      `synthetic-identities-${country.code.toLowerCase()}.${metadata.extension}`,
      metadata.mime,
    );
    showToast(t("exported", { format: metadata.label }));
  };

  const shareConfiguration = async () => {
    const url = new URL(window.location.href);
    url.search = new URLSearchParams({
      country: countryCode,
      currency: currencyChoice,
      scenario,
      case: caseMode,
      seed,
      lang: locale,
    }).toString();
    await copyText(url.toString(), t("sharedLinkCopied"));
  };

  const applyPreset = (preset: QuickPreset) => {
    setScenario(preset.scenario);
    setCaseMode(preset.caseMode);
    setBatchCount(preset.count);
    setGenerateMode(preset.count > 1 ? "batch" : "single");
    setBatchPage(0);
    setProfiles([
      createProfile(0, {
        scenario: preset.scenario,
        caseMode: preset.caseMode,
      }),
    ]);
    showToast(
      t("presetApplied", {
        country: country.code,
        preset: preset.title,
      }),
    );
  };

  const restoreLastConfiguration = () => {
    try {
      const raw = localStorage.getItem("iban-devtools:last-config");
      if (!raw) throw new Error("NO_SAVED_CONFIGURATION");
      const saved = JSON.parse(raw) as {
        countryCode?: string;
        currencyChoice?: string;
        scenario?: IdentityScenario;
        caseMode?: IbanCaseMode;
        batchCount?: number;
        seed?: string;
        locale?: AppLocale;
      };
      if (saved.countryCode && COUNTRY_MAP.has(saved.countryCode)) {
        changeCountry(saved.countryCode);
      }
      if (saved.scenario) setScenario(saved.scenario);
      if (saved.batchCount) {
        setBatchCount(saved.batchCount);
        setGenerateMode(saved.batchCount > 1 ? "batch" : "single");
      }
      if (isAppLocale(saved.locale)) changeLocale(saved.locale);
      setSeed(saved.seed ?? "");
      const restoredCountryCode =
        saved.countryCode && COUNTRY_MAP.has(saved.countryCode)
          ? saved.countryCode
          : countryCode;
      const restoredCountry = COUNTRY_MAP.get(restoredCountryCode) ?? country;
      const restoredSeed = saved.seed ?? "";
      const restoredScenario = saved.scenario ?? "complete";
      const restoredCaseMode = isSupportedCaseMode(
        saved.caseMode,
        Boolean(restoredCountry.ibanSpec),
      )
        ? saved.caseMode
        : "valid";
      setCaseMode(restoredCaseMode);
      const restoredCurrency =
        saved.currencyChoice &&
        restoredCountry.currencies.includes(saved.currencyChoice)
          ? saved.currencyChoice
          : restoredCountry.currency;
      setCurrencyChoice(restoredCurrency);
      const restoredBanking = generateNationalBanking(
        restoredCountry,
        createRandomInt(restoredSeed ? `${restoredSeed}:iban:0` : undefined),
        { caseMode: restoredCaseMode },
      );
      setProfiles([
        generateSyntheticIdentity({
          countryCode: restoredCountryCode,
          iban: restoredBanking.iban ?? "",
          bankingIdentity: restoredBanking,
          currencyOverride: restoredCurrency,
          scenario: restoredScenario,
          seed: restoredSeed,
        }),
      ]);
      setBatchPage(0);
      showToast(t("restored"));
    } catch {
      showToast(t("nothingToRestore"));
    }
  };

  const resetConfiguration = () => {
    setRegionChoice("random");
    setCityChoice("random");
    setCityQuery("");
    setGenderChoice("random");
    setAgeMode("random");
    setExactAge(32);
    setMinimumAge(25);
    setMaximumAge(45);
    setFirstNameOverride("");
    setLastNameOverride("");
    setStreetOverride("");
    setPostalCodeOverride("");
    setSeed("");
    setScenario("complete");
    setCaseMode("valid");
    setBankCode("");
    setAccount("");
    setGenerateMode("single");
    setBatchCount(10);
    setFormatted(true);
    setCurrencyChoice(country.currency);
    const resetBanking = generateNationalBanking(
      country,
      createRandomInt(),
      { caseMode: "valid" },
    );
    setProfiles([
      generateSyntheticIdentity({
        countryCode,
        iban: resetBanking.iban ?? "",
        bankingIdentity: resetBanking,
        currencyOverride: country.currency,
        scenario: "complete",
      }),
    ]);
    setBatchPage(0);
    showToast(t("resetDone", { country: country.code }));
  };

  const renderSegments = (value: string, spec: IbanCountrySpec) => {
    const compact = cleanIban(value);
    const bban = compact.slice(4);
    const beforeBank = bban.slice(0, spec.bankCodeStart);
    const bank = bban.slice(spec.bankCodeStart, spec.bankCodeStart + spec.bankCodeLen);
    const bankEnd = spec.bankCodeStart + spec.bankCodeLen;
    const branch =
      spec.branchCodeStart === null
        ? ""
        : bban.slice(
            spec.branchCodeStart,
            spec.branchCodeStart + spec.branchCodeLen,
          );
    const beforeBranch =
      spec.branchCodeStart === null
        ? ""
        : bban.slice(bankEnd, spec.branchCodeStart);
    const routingEnd =
      spec.branchCodeStart === null
        ? bankEnd
        : spec.branchCodeStart + spec.branchCodeLen;
    const beforeAccount = bban.slice(routingEnd, spec.accountStart);
    const accountValue = bban.slice(spec.accountStart, spec.accountStart + spec.accountLen);
    const after = bban.slice(spec.accountStart + spec.accountLen);
    return (
      <div
        className="segment-value"
        role="group"
        aria-label={t("ibanBreakdown")}
        dir="ltr"
      >
        <span className="segment-country">{compact.slice(0, 2)}</span>
        <span className="segment-check">{compact.slice(2, 4)}</span>
        {beforeBank && <span className="segment-extra">{beforeBank}</span>}
        <span className="segment-bank">{bank}</span>
        {beforeBranch && <span className="segment-extra">{beforeBranch}</span>}
        {branch && <span className="segment-branch">{branch}</span>}
        {beforeAccount && <span className="segment-extra">{beforeAccount}</span>}
        <span className="segment-account">{accountValue}</span>
        {after && <span className="segment-extra">{after}</span>}
      </div>
    );
  };

  return (
    <main lang={locale} dir={localeDirection(locale)}>
      <header className="site-header">
        <a className="brand" href="#" aria-label={t("brandHome")}>
          <span className="brand-mark">IB</span>
          <span>IBAN <b>DevTools</b></span>
          <span className="version-badge">v2.0</span>
        </a>
        <div className="header-meta">
          <span className="local-badge"><i /> {t("localOnly")}</span>
          <span className="standard-mark"><b>ISO</b> 13616</span>
          <label className="language-select">
            <span className="sr-only">{t("language")}</span>
            <select
              aria-label={t("language")}
              value={locale}
              onChange={(event) =>
                changeLocale(event.target.value as AppLocale)
              }
            >
              {LOCALE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <b aria-hidden="true">
              {LOCALE_OPTIONS.find((option) => option.value === locale)
                ?.shortLabel ?? "EN"}
            </b>
            <i aria-hidden="true">⌄</i>
          </label>
          <button
            ref={commandTriggerRef}
            className="header-command"
            type="button"
            onClick={() => setCommandOpen(true)}
          >
            {t("command")} <kbd>⌘K</kbd>
          </button>
          <button className="header-command" type="button" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>{theme === "light" ? t("darkTheme") : t("lightTheme")}</button>
          <a className="header-link" href="#tool">{t("getStarted")} <span>↓</span></a>
        </div>
      </header>

      <section className="intro">
        <div>
          <p className="eyebrow">{t("heroEyebrow")}</p>
          <h1>{t("heroLead")} <em>{t("heroEmphasis")}</em></h1>
          <p className="lede">{t("heroDescription")}</p>
          <div className="platform-row" role="group" aria-label={t("supportedPlatforms")}>
            <span className="platform-label">{t("deployAnywhere")}</span>
            <span className="platform-chip vercel-chip"><b>▲</b> Vercel</span>
            <span className="platform-chip cloudflare-chip"><b>☁</b> Cloudflare</span>
            <span className="platform-chip"><b>◇</b> {t("openSource")}</span>
          </div>
        </div>
        <div className="intro-stat" role="group" aria-label={t("performanceMetrics")}>
          <span>{t("countriesAreas")}</span>
          <strong>{number(COUNTRIES.length)}</strong>
          <small>
            {number(IBAN_COUNTRIES.length)} IBAN · {number(WORLD_GEO_COUNTS.cities)} {t("cities")}
          </small>
        </div>
      </section>

      <nav className="main-tabs" id="tool" aria-label={t("toolModes")}>
        <button className={tab === "generate" ? "active" : ""} onClick={() => setTab("generate")}>
          <span>01</span> {t("generator")}
        </button>
        <button className={tab === "validate" ? "active" : ""} onClick={() => setTab("validate")}>
          <span>02</span> {t("validator")}
        </button>
      </nav>

      {tab === "generate" ? (
        <section className="workspace">
          <aside className="config-panel">
            <div className="panel-heading">
              <div>
                <span className="step">{t("parameterStudio")}</span>
                <h2>{t("preciseConfiguration")}</h2>
              </div>
              <span className="config-status">7 {t("groups")}</span>
            </div>

            <div className="config-summary">
              <span>{country.flag} {country.code}</span>
              <span>{regionChoiceLabel}</span>
              <span>{genderChoice === "random" ? t("randomGender") : genderChoice === "female" ? t("female") : t("male")}</span>
              <span>
                {currencyChoice} · {number(generateMode === "single" ? 1 : batchCount)} {generateMode === "single" ? t("item") : t("items")}
              </span>
            </div>

            <section className="quick-start" aria-labelledby="quick-start-title">
              <div className="quick-start-heading">
                <div>
                  <span>{t("quickStart")}</span>
                  <strong id="quick-start-title">{t("quickStartTitle")}</strong>
                </div>
                <small>{country.flag} {countryName} · {t("keepsCountry")}</small>
              </div>
              <div className="preset-strip">
                {quickPresets.map((preset) => (
                  <button
                    type="button"
                    key={preset.id}
                    className={activePresetId === preset.id ? "active" : ""}
                    aria-pressed={activePresetId === preset.id}
                    onClick={() => applyPreset(preset)}
                  >
                    <span className="preset-icon">{preset.icon}</span>
                    <span>
                      <strong>{preset.title}</strong>
                      <small>{preset.description}</small>
                    </span>
                    <em>{activePresetId === preset.id ? t("selected") : t("apply")}</em>
                  </button>
                ))}
              </div>
              <div className="configuration-tools" aria-label={t("configurationManagement")}>
                <button type="button" onClick={restoreLastConfiguration}><span className="rtl-mirror">↶</span> {t("restoreLast")}</button>
                <button type="button" onClick={resetConfiguration}><span>○</span> {t("resetParameters")}</button>
              </div>
            </section>

            <section className="config-group">
              <div className="config-group-title">
                <span>01</span>
                <div><strong>{t("geographyTitle")}</strong><small>{t("geographyHint")}</small></div>
              </div>

              <div className="field">
                <label htmlFor="country">{t("countryRegion")}</label>
                <div className="country-discovery">
                  <input
                    aria-label={t("searchCountry")}
                    value={countryQuery}
                    placeholder={t("searchCountryPlaceholder")}
                    onChange={(event) => setCountryQuery(event.target.value)}
                  />
                  <div className="select-wrap country-scope-select">
                    <select
                      aria-label={t("filterWorldRegion")}
                      value={countryScope}
                      onChange={(event) =>
                        setCountryScope(event.target.value as CountryScope)
                      }
                    >
                      {COUNTRY_SCOPES.map(([value, label]) => (
                        <option key={value} value={value}>{t(label)}</option>
                      ))}
                    </select>
                    <span>⌄</span>
                  </div>
                </div>
                <div className="select-wrap">
                  <select id="country" value={countryCode} onChange={(event) => changeCountry(event.target.value)}>
                    {!filteredCountries.some((item) => item.code === country.code) && (
                      <option value={country.code}>{country.flag} {countryName} — {bidiIsolate(country.code)}</option>
                    )}
                    {filteredCountries.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.flag} {displayCountryName(item.code, locale, item.englishName)} — {bidiIsolate(`${item.code} · ${item.currency}`)}
                      </option>
                    ))}
                  </select>
                  <span>⌄</span>
                </div>
                <small>
                  {country.currencies.join(" / ")} · {country.ibanSpec
                    ? `${t("ibanLength", { count: number(country.ibanSpec.length) })}${country.ibanSpec.sepa ? " · SEPA" : ""}`
                    : t("nonIbanCountry", { label: country.payment.label })}
                  {" · "}{t("matches", { count: number(filteredCountries.length) })}
                </small>
              </div>

              {country.currencies.length > 1 && (
                <div className="field">
                  <label htmlFor="identity-currency">{t("settlementCurrency")}</label>
                  <div className="select-wrap">
                    <select
                      id="identity-currency"
                      value={currencyChoice}
                      onChange={(event) => setCurrencyChoice(event.target.value)}
                    >
                      {country.currencies.map((currency) => (
                        <option key={currency} value={currency}>
                          {currency}
                        </option>
                      ))}
                    </select>
                    <span>⌄</span>
                  </div>
                  <small>{t("multipleCurrencies")}</small>
                </div>
              )}

              <div className="two-column-fields">
                <div className="field">
                  <label htmlFor="identity-region">{t("stateRegion")}</label>
                  <div className="select-wrap">
                    <select
                      id="identity-region"
                      value={regionChoice}
                      onChange={(event) => {
                        setRegionChoice(event.target.value);
                        setCityChoice("random");
                        setCityQuery("");
                      }}
                    >
                      <option value="random">{t("allRegions")}</option>
                      {regionOptions.map((region) => (
                        <option key={region.value} value={region.value}>
                          {region.label}
                        </option>
                      ))}
                    </select>
                    <span>⌄</span>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="identity-city">{t("city")}</label>
                  {availableCities.length > 100 && (
                    <input
                      className="city-search-input"
                      aria-label={t("searchCurrentCities")}
                      value={cityQuery}
                      placeholder={t("searchCitiesPlaceholder", {
                        count: number(availableCities.length),
                      })}
                      onChange={(event) => setCityQuery(event.target.value)}
                    />
                  )}
                  <div className="select-wrap">
                    <select
                      id="identity-city"
                      value={cityChoice}
                      onChange={(event) => setCityChoice(event.target.value)}
                    >
                      <option value="random">
                        {geoLoading
                          ? t("loadingCityDirectory")
                          : usesSyntheticLocality
                            ? t("syntheticCity")
                          : regionChoice === "random" && geoData
                            ? t("randomCitySelectRegion")
                            : t("randomCity")}
                      </option>
                      {visibleCityOptions.map((city) => (
                        <option
                          key={city.name}
                          value={city.name}
                        >
                          {city.name}
                        </option>
                      ))}
                    </select>
                    <span>⌄</span>
                  </div>
                  {availableCities.length > 100 && (
                    <small>
                      {t("cityMatchesNotice", {
                        count: number(visibleCityOptions.length),
                      })}
                    </small>
                  )}
                  {usesSyntheticLocality && (
                    <small>{t("syntheticLocalityNotice")}</small>
                  )}
                </div>
              </div>
              <div className="geo-source-note">
                <strong>
                  {geoLoading
                    ? t("loadingGeography")
                    : geoData?.country.code === countryCode
                      ? geoData.counts.cities > 0
                        ? t("geographyCount", {
                            regions: number(geoData.counts.regions),
                            cities: number(geoData.counts.cities),
                          })
                        : t("noCityRecords")
                      : geoError
                        ? t("geographyLoadError")
                        : ""}
                </strong>
                <span>{t("geographySource")}</span>
              </div>
            </section>

            <section className="config-group">
              <div className="config-group-title">
                <span>02</span>
                <div><strong>{t("scenariosTitle")}</strong><small>{t("scenariosHint")}</small></div>
              </div>
              <div className="scenario-grid">
                {SCENARIOS.map((item) => (
                  <button
                    type="button"
                    key={item.value}
                    className={scenario === item.value ? "active" : ""}
                    onClick={() => setScenario(item.value)}
                  >
                    <strong>{t(item.labelKey)}</strong><small>{t(item.hintKey)}</small>
                  </button>
                ))}
              </div>
            </section>

            <section className="config-group">
              <div className="config-group-title">
                <span>03</span>
                <div><strong>{t("demographicsTitle")}</strong><small>{t("demographicsHint")}</small></div>
              </div>

              <div className="field">
                <label>{t("gender")}</label>
                <div className="segmented segmented-three">
                  {GENDER_OPTIONS.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={genderChoice === value ? "active" : ""}
                      onClick={() => setGenderChoice(value as ProfileGender | "random")}
                    >
                      {t(label)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label>{t("ageStrategy")}</label>
                <div className="segmented segmented-three">
                  {AGE_MODES.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={ageMode === value ? "active" : ""}
                      onClick={() => setAgeMode(value)}
                    >
                      {t(label)}
                    </button>
                  ))}
                </div>
              </div>

              {ageMode === "exact" && (
                <div className="field range-field">
                  <div className="range-label">
                    <label htmlFor="exact-age">{t("exactAge")}</label>
                    <output htmlFor="exact-age">{number(exactAge)} {t("years")}</output>
                  </div>
                  <input
                    id="exact-age"
                    type="range"
                    min="18"
                    max="80"
                    value={exactAge}
                    onChange={(event) => setExactAge(Number(event.target.value))}
                  />
                </div>
              )}

              {ageMode === "range" && (
                <div className="two-column-fields age-range-fields">
                  <div className="field">
                    <label htmlFor="minimum-age">{t("minimumAge")}</label>
                    <input
                      id="minimum-age"
                      type="number"
                      min="18"
                      max="80"
                      value={minimumAge}
                      onChange={(event) => setMinimumAge(Math.min(80, Math.max(18, Number(event.target.value))))}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="maximum-age">{t("maximumAge")}</label>
                    <input
                      id="maximum-age"
                      type="number"
                      min="18"
                      max="80"
                      value={maximumAge}
                      onChange={(event) => setMaximumAge(Math.min(80, Math.max(18, Number(event.target.value))))}
                    />
                  </div>
                </div>
              )}
            </section>

            <section className="config-group">
              <button
                className="config-group-toggle"
                type="button"
                onClick={() => setIdentityAdvancedOpen(!identityAdvancedOpen)}
                aria-expanded={identityAdvancedOpen}
              >
                <span>04</span>
                <div><strong>{t("identityOverridesTitle")}</strong><small>{t("identityOverridesHint")}</small></div>
                <b>{identityAdvancedOpen ? "−" : "+"}</b>
              </button>
              {identityAdvancedOpen && (
                <div className="optional-fields">
                  <div className="two-column-fields">
                    <div className="field">
                      <label htmlFor="first-name">{t("firstName")}</label>
                      <input id="first-name" value={firstNameOverride} placeholder={t("localizedPlaceholder")} onChange={(event) => setFirstNameOverride(event.target.value)} />
                    </div>
                    <div className="field">
                      <label htmlFor="last-name">{t("lastName")}</label>
                      <input id="last-name" value={lastNameOverride} placeholder={t("localizedPlaceholder")} onChange={(event) => setLastNameOverride(event.target.value)} />
                    </div>
                  </div>
                  <div className="two-column-fields">
                    <div className="field">
                      <label htmlFor="street-name">{t("street")}</label>
                      <input id="street-name" value={streetOverride} placeholder={t("chooseAutomatically")} onChange={(event) => setStreetOverride(event.target.value)} />
                    </div>
                    <div className="field">
                      <label htmlFor="postal-code">{t("postalCode")}</label>
                      <input id="postal-code" value={postalCodeOverride} placeholder={t("matchAutomatically")} onChange={(event) => setPostalCodeOverride(event.target.value)} />
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="config-group">
              <div className="config-group-title">
                <span>05</span>
                <div><strong>{t("scaleTitle")}</strong><small>{t("scaleHint")}</small></div>
              </div>
              <div className="field">
                <div className="segmented">
                  <button type="button" className={generateMode === "single" ? "active" : ""} onClick={() => changeGenerateMode("single")}>{t("singleIdentity")}</button>
                  <button type="button" className={generateMode === "batch" ? "active" : ""} onClick={() => changeGenerateMode("batch")}>{t("batchData")}</button>
                </div>
              </div>
              {generateMode === "batch" && (
                <div className="field batch-count-field">
                  <div className="range-label">
                    <label htmlFor="batch-count">{t("generationCount")}</label>
                    <output htmlFor="batch-count">{number(batchCount)} {t("items")}</output>
                  </div>
                  <input id="batch-count" type="range" min="1" max="1000" value={batchCount} onChange={(event) => setBatchCount(Number(event.target.value))} />
                  <div className="count-shortcuts">
                    {[5, 10, 100, 1000].map((count) => (
                      <button type="button" key={count} className={batchCount === count ? "active" : ""} onClick={() => setBatchCount(count)}>{count}</button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="config-group">
              <div className="config-group-title">
                <span>06</span>
                <div><strong>{t("reproducibilityTitle")}</strong><small>{t("reproducibilityHint")}</small></div>
              </div>
              <div className="field seed-field">
                <label htmlFor="seed">{t("randomSeed")}</label>
                <div>
                  <input id="seed" value={seed} placeholder={t("seedPlaceholder")} onChange={(event) => setSeed(event.target.value)} />
                  <button type="button" onClick={() => setSeed(`test-${Date.now().toString(36)}`)}>{t("createSeed")}</button>
                </div>
              </div>
              <div className="field format-field">
                <div>
                  <label htmlFor={country.ibanSpec ? "format-toggle" : undefined}>
                    {country.ibanSpec ? t("ibanSpacing") : t("paymentQuality")}
                  </label>
                  <small>
                    {country.ibanSpec
                      ? formatted
                        ? "DE89 3704 …"
                        : "DE893704…"
                      : country.payment.validation === "checksum"
                        ? t("checksumImplemented")
                        : t("formatOnlyNoLookup")}
                  </small>
                </div>
                {country.ibanSpec && (
                  <button
                    id="format-toggle"
                    type="button"
                    className={`toggle ${formatted ? "on" : ""}`}
                    onClick={() => setFormatted(!formatted)}
                    role="switch"
                    aria-checked={formatted}
                  >
                    <span />
                  </button>
                )}
              </div>
            </section>

            <section className="config-group config-group-last">
              <button className="advanced-trigger" onClick={() => setAdvancedOpen(!advancedOpen)} aria-expanded={advancedOpen}>
                <span><b>07</b> {t("bankingFields", { label: country.ibanSpec ? t("customBban") : country.payment.label })}</span>
                <b>{advancedOpen ? "−" : "+"}</b>
              </button>
              {advancedOpen && (
                <div className="advanced-fields">
                  <div className="field">
                    <label htmlFor="case-mode">{t("testCase")}</label>
                    <div className="select-wrap">
                      <select id="case-mode" value={caseMode} onChange={(event) => setCaseMode(event.target.value as IbanCaseMode)}>
                        {caseModeOptions.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                      <span>⌄</span>
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="bank-code">{t("bankCode")} · {country.payment.routingLabel}</label>
                    <input
                      id="bank-code"
                      dir="ltr"
                      value={bankCode}
                      maxLength={country.payment.bankCodeLen}
                      placeholder={t("maxCharacters", {
                        count: country.payment.bankCodeLen,
                      })}
                      onChange={(event) => setBankCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="account-number">{t("accountNumber")}</label>
                    <input
                      id="account-number"
                      dir="ltr"
                      value={account}
                      maxLength={country.payment.accountLen}
                      placeholder={t("maxCharacters", {
                        count: country.payment.accountLen,
                      })}
                      onChange={(event) => setAccount(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                    />
                  </div>
                  <p>{t("customBankingHint", {
                    detail:
                      country.payment.validation === "checksum"
                        ? t("recalculatesChecksum")
                        : t("formatOnlyDisclaimer"),
                  })}</p>
                </div>
              )}
            </section>

            <button className="primary-action" disabled={isGenerating} onClick={generateMode === "single" ? regenerate : generateBatch}>
              <span>{isGenerating ? t("generatingBackground") : generateMode === "single" ? t("generateCompleteIdentity") : t("generateCountIdentities", { count: number(batchCount) })}</span>
              <b className="rtl-mirror">↗</b>
            </button>
            <div className="share-row">
              <button type="button" onClick={shareConfiguration}>{t("copyConfigurationLink")}</button>
              <span>{t("reproducibleLocal")}</span>
            </div>
          </aside>

          <div className="result-panel identity-results">
            {generateMode === "single" ? (
              <>
                <div className="result-topline">
                  <span className="step">{t("generatedIdentity")}</span>
                  <span className={
                    activeProfile.banking.paymentIdentifier.validation === "negative-test-case"
                      ? "invalid-chip"
                      : "valid-chip"
                  }>
                    <i /> {t("synthetic")} · {
                      activeProfile.banking.paymentIdentifier.validation === "checksum-valid"
                        ? t("checksumValid")
                        : activeProfile.banking.paymentIdentifier.validation === "format-only"
                          ? t("formatFixture")
                          : t("negativeTestCase")
                    }
                  </span>
                </div>

                <div className="active-parameters" role="group" aria-label={t("generationParameters")}>
                  <span>{country.flag} {countryName}</span>
                  <span><bdi>{activeProfile.address.region}</bdi></span>
                  <span><bdi>{activeProfile.address.city}</bdi></span>
                  <span>{activeProfile.personal.gender === "female" ? t("female") : t("male")}</span>
                  <span>{number(activeProfile.personal.age)} {t("years")}</span>
                  <span>{activeProfile.banking.currency}</span>
                  <span>{t(SCENARIOS.find((item) => item.value === scenario)?.labelKey ?? "scenarioComplete")}</span>
                  {seed && <span className="seed-chip"># {seed}</span>}
                </div>

                <div className="profile-heading identity-profile-heading">
                  <div className="profile-avatar">{activeProfile.country.flag}</div>
                  <div>
                    <span>{activeProfile.country.code} {t("testPerson")}</span>
                    <h2><bdi>{activeProfile.personal.fullName}</bdi></h2>
                    <p>{number(activeProfile.personal.age)} {t("years")} · <bdi>{activeProfile.address.city}</bdi> · <bdi>{activeProfile.address.region}</bdi></p>
                  </div>
                  <button
                    onClick={() =>
                      copyText(JSON.stringify(activeProfile, null, 2), t("identityJsonCopied"))
                    }
                  >
                    {t("copyCompleteJson")}
                  </button>
                </div>

                <div className="quality-grid" role="group" aria-label={t("dataQualitySummary")}>
                  <div><span>{t("profileId")}</span><strong>{activeProfile.id}</strong></div>
                  <div><span>{t("localization")}</span><strong>{activeProfile.country.code} / {activeProfile.address.city}</strong></div>
                  <div><span>{t("dataGroups")}</span><strong>08 / {scenario.toUpperCase()}</strong></div>
                  <div>
                    <span>{t("paymentId")}</span>
                    <strong className={
                      activeProfile.banking.paymentIdentifier.validation === "negative-test-case"
                        ? "negative-value"
                        : "quality-positive"
                    }>
                      {generatedValidation
                        ? generatedValidation.valid ? t("mod97Pass") : t("expectedFailure")
                        : activeProfile.banking.paymentIdentifier.validation === "checksum-valid"
                          ? `${activeProfile.banking.paymentIdentifier.scheme} · ${t("checksumValid")}`
                          : t("formatOnlyFixture")}
                    </strong>
                  </div>
                </div>

                <div className="iban-display identity-iban-display">
                  <span className="country-tag">
                    {country.flag} {country.code} · {activeProfile.banking.paymentIdentifier.label}
                  </span>
                  <p dir="ltr">{displayBankingValue(activeProfile)}</p>
                  <div className="result-actions">
                    <button onClick={() => copyText(displayBankingValue(activeProfile), t("bankingCopied", { label: activeProfile.banking.paymentIdentifier.label }))}>
                      {t("copyScheme", { scheme: activeProfile.banking.paymentIdentifier.scheme })} <span>⌘C</span>
                    </button>
                    <button className="icon-button" onClick={regenerate} aria-label={t("regenerateIdentity")}>↻</button>
                  </div>
                </div>

                <div className="profile-grid global-profile-grid">
                  <article className="profile-card">
                    <div className="profile-card-title"><span>01</span><h3>{t("personalIdentity")}</h3></div>
                    <dl>
                      <div><dt>{t("dateOfBirth")}</dt><dd className="technical-value">{activeProfile.personal.birthDate}</dd></div>
                      <div><dt>{t("ageGender")}</dt><dd>{number(activeProfile.personal.age)} · {activeProfile.personal.gender === "female" ? t("female") : t("male")}</dd></div>
                      <div><dt>{t("placeOfBirth")}</dt><dd><bdi>{activeProfile.personal.birthPlace}</bdi></dd></div>
                      <div><dt>{t("testDocumentNumber")}</dt><dd className="mono-value">{activeProfile.personal.documentNumber}</dd></div>
                    </dl>
                  </article>

                  <article className="profile-card">
                    <div className="profile-card-title"><span>02</span><h3>{t("addressContact")}</h3></div>
                    <dl>
                      <div><dt>{t("fullAddress")}</dt><dd><bdi>{activeProfile.address.formatted}</bdi></dd></div>
                      <div><dt>{t("region")}</dt><dd><bdi>{activeProfile.address.region}</bdi></dd></div>
                      <div><dt>{t("phoneNumber")}</dt><dd className="technical-value">{activeProfile.contact.phone}</dd></div>
                      <div><dt>{t("testEmail")}</dt><dd className="technical-value">{activeProfile.contact.email}</dd></div>
                    </dl>
                  </article>

                  <article className="profile-card">
                    <div className="profile-card-title"><span>03</span><h3>{t("bankingCards")}</h3></div>
                    <dl>
                      <div><dt>{t("bank")}</dt><dd><bdi>{activeProfile.banking.bankName}</bdi></dd></div>
                      <div><dt>{t("paymentIdentifierType")}</dt><dd>{activeProfile.banking.paymentIdentifier.label}</dd></div>
                      {activeProfile.banking.iban && <div><dt>BIC / SWIFT</dt><dd className="mono-value">{activeProfile.banking.bic}</dd></div>}
                      {activeProfile.banking.paymentIdentifier.routingNumber && (
                        <div><dt>{country.payment.routingLabel}</dt><dd className="mono-value">{activeProfile.banking.paymentIdentifier.routingNumber}</dd></div>
                      )}
                      <div><dt>{t("bankAccount")}</dt><dd className="mono-value">{activeProfile.banking.accountNumber}</dd></div>
                      <div><dt>{t("sandboxCard")}</dt><dd className="mono-value">{activeProfile.banking.card.number}</dd></div>
                      <div><dt>{t("expiryCvc")}</dt><dd className="technical-value">{activeProfile.banking.card.expiry} · {activeProfile.banking.card.cvc}</dd></div>
                    </dl>
                  </article>

                  <article className="profile-card">
                    <div className="profile-card-title"><span>04</span><h3>{t("taxInsuranceEmployment")}</h3></div>
                    <dl>
                      <div><dt>{activeProfile.government.taxLabel}</dt><dd className="mono-value">{activeProfile.government.taxId}</dd></div>
                      <div><dt>{t("taxIdQuality")}</dt><dd className="positive-value">{activeProfile.government.taxStatus === "checksum-valid" ? t("checksumValid") : t("formatFixture")}</dd></div>
                      <div><dt>{activeProfile.government.insuranceLabel}</dt><dd className="mono-value">{activeProfile.government.insuranceNumber}</dd></div>
                      <div><dt>{t("testEmployer")}</dt><dd><bdi>{activeProfile.employment.employer}</bdi></dd></div>
                      <div><dt>{t("jobEmployeeId")}</dt><dd><bdi>{activeProfile.employment.jobTitle}</bdi> · <bdi className="technical-value">{activeProfile.employment.employeeId}</bdi></dd></div>
                    </dl>
                  </article>

                  <article className="profile-card">
                    <div className="profile-card-title"><span>05</span><h3>{t("kycAccess")}</h3></div>
                    <dl>
                      <div><dt>{t("testPassport")}</dt><dd className="mono-value">{activeProfile.personal.passportNumber}</dd></div>
                      <div><dt>{t("riskLevel")}</dt><dd>{t(RISK_LABELS[activeProfile.personal.kycRiskLevel] ?? "riskLow")}</dd></div>
                      <div><dt>{t("localeTimezone")}</dt><dd className="technical-value">{activeProfile.personal.locale} · {activeProfile.personal.timezone}</dd></div>
                      <div><dt>{t("testUsername")}</dt><dd className="mono-value">{activeProfile.personal.username}</dd></div>
                    </dl>
                  </article>

                  <article className="profile-card">
                    <div className="profile-card-title"><span>06</span><h3>{t("paymentsClearing")}</h3></div>
                    <dl>
                      <div><dt>{t("schemeCurrency")}</dt><dd className="technical-value">{activeProfile.payment.scheme} · {activeProfile.payment.currency}</dd></div>
                      <div><dt>{t("amountPurpose")}</dt><dd className="technical-value">{activeProfile.payment.amount.toFixed(2)} · {activeProfile.payment.purposeCode}</dd></div>
                      <div><dt>End-to-End ID</dt><dd className="mono-value">{activeProfile.payment.endToEndId}</dd></div>
                      <div><dt>Creditor Reference</dt><dd className="mono-value">{activeProfile.payment.creditorReference}</dd></div>
                      <div><dt>{t("payeeVerification")}</dt><dd>{t(VOP_LABELS[activeProfile.payment.verificationOfPayee] ?? "vopUnavailable")}</dd></div>
                    </dl>
                  </article>

                  <article className="profile-card">
                    <div className="profile-card-title"><span>07</span><h3>{t("businessPayroll")}</h3></div>
                    <dl>
                      <div><dt>{t("company")}</dt><dd><bdi>{activeProfile.business.companyName}</bdi></dd></div>
                      <div><dt>VAT ID</dt><dd className="mono-value">{activeProfile.business.vatId}</dd></div>
                      <div><dt>{t("registrationNumber")}</dt><dd className="mono-value">{activeProfile.business.registrationNumber}</dd></div>
                      <div><dt>{t("annualSalary")}</dt><dd className="technical-value">{number(activeProfile.employment.annualSalary)} {activeProfile.banking.currency}</dd></div>
                      <div><dt>{t("contractStart")}</dt><dd className="technical-value">{activeProfile.employment.contractStartDate}</dd></div>
                    </dl>
                  </article>
                </div>

                {country.ibanSpec && activeProfile.banking.iban ? (
                  <div className="structure compact-structure">
                    <div className="section-title">
                      <h3>{t("ibanStructure")}</h3>
                      <span>{number(activeProfile.banking.iban.length)} {t("characters")}</span>
                    </div>
                    {renderSegments(activeProfile.banking.iban, country.ibanSpec)}
                    <div className="legend">
                      <span><i className="dot-country" /> {t("countryCode")}</span>
                      <span><i className="dot-check" /> {t("checkDigits")}</span>
                      <span><i className="dot-bank" /> {t("bankCode")}</span>
                      {country.ibanSpec.branchCodeStart !== null && (
                        <span><i className="dot-branch" /> {t("branchCode")}</span>
                      )}
                      <span><i className="dot-account" /> {t("account")}</span>
                    </div>
                  </div>
                ) : (
                  <div className="structure compact-structure national-structure">
                    <div className="section-title">
                      <h3>{t("structure", { label: activeProfile.banking.paymentIdentifier.label })}</h3>
                      <span>{activeProfile.banking.paymentIdentifier.validation}</span>
                    </div>
                    <div className="national-structure-grid">
                      <div><span>Scheme</span><strong>{activeProfile.banking.paymentIdentifier.scheme}</strong></div>
                      <div><span>{t("routing")}</span><strong>{activeProfile.banking.paymentIdentifier.routingNumber ?? "N/A"}</strong></div>
                      <div><span>{t("institution")}</span><strong>{activeProfile.banking.paymentIdentifier.institutionCode ?? "N/A"}</strong></div>
                      {activeProfile.banking.paymentIdentifier.branchCode && (
                        <div><span>{t("branch")}</span><strong>{activeProfile.banking.paymentIdentifier.branchCode}</strong></div>
                      )}
                      <div><span>{t("account")}</span><strong>{activeProfile.banking.paymentIdentifier.accountNumber}</strong></div>
                    </div>
                    <p className="structure-disclaimer">{t("testValueDisclaimer")}</p>
                  </div>
                )}

                <div className="identity-export-bar">
                  <p><strong>{t("correlatedGeneration")}</strong> · {t("sandboxCardDisclaimer")}</p>
                  <div>
                    {country.ibanSpec && (
                      <button onClick={() => copyText(countryRegex(country.ibanSpec!), t("regexCopied"))}>{t("copyRegex")}</button>
                    )}
                    <select aria-label={t("exportFormat")} value={exportFormat} onChange={(event) => setExportFormat(event.target.value as ExportFormat)}>
                      {EXPORT_FORMATS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                    <button onClick={() => exportData()}>{t("export")} ↓</button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="result-topline">
                  <span className="step">{t("batchOutput")}</span>
                  <span className="batch-meta">{number(profiles.length > 1 ? profiles.length : batchCount)} {t("rows")} · {country.code}</span>
                </div>
                {profiles.length <= 1 ? (
                  <div className="empty-state">
                    <span>[ ]</span>
                    <h3>{t("batchNotGenerated")}</h3>
                    <p>{t("batchEmptyHint")}</p>
                  </div>
                ) : (
                  <>
                    <div className="batch-toolbar identity-batch-toolbar">
                      <p><strong>{t("completeIdentities", { count: number(profiles.length) })}</strong> <span>{t("previewPage", { page: number(batchPage + 1) })}</span></p>
                      <div>
                        <button onClick={() => copyText(JSON.stringify(profiles, null, 2), t("allJsonCopied"))}>{t("copyAll")}</button>
                      </div>
                    </div>
                    <section className="batch-export-center" aria-labelledby="batch-export-title">
                      <div className="batch-export-heading">
                        <div>
                          <span>{t("exportAllHeading", { count: number(profiles.length) })}</span>
                          <h3 id="batch-export-title">{t("batchExportCenter")}</h3>
                          <p>{t("batchExportDescription")}</p>
                        </div>
                        <strong>{number(EXPORT_FORMATS.length)} {t("exportFormat").toUpperCase()}</strong>
                      </div>

                      <div className="quick-export-grid" aria-label={t("commonBatchFormats")}>
                        {(["json", "csv", "ndjson"] as const).map((format) => {
                          const metadata = exportFileMetadata(format);
                          return (
                            <button type="button" key={format} onClick={() => exportData(format)}>
                              <span>{metadata.label}</span>
                              <small>{format === "json" ? t("nestedComplete") : format === "csv" ? t("flatComplete") : t("onePerLine")}</small>
                              <b>{t("downloadAll", { count: number(profiles.length) })}</b>
                            </button>
                          );
                        })}
                      </div>

                      <div className="advanced-export-row">
                        <label htmlFor="batch-export-format">
                          <span>{t("moreDeveloperFormats")}</span>
                          <small>{t(EXPORT_DESCRIPTION_KEYS[exportFormat])}</small>
                        </label>
                        <select
                          id="batch-export-format"
                          value={exportFormat}
                          onChange={(event) => setExportFormat(event.target.value as ExportFormat)}
                        >
                          {EXPORT_FORMATS.map((item) => (
                            <option key={item.value} value={item.value}>{item.label}</option>
                          ))}
                        </select>
                        <button type="button" onClick={() => exportData()}>
                          {t("exportAll", { count: number(profiles.length) })}
                        </button>
                      </div>

                      <div className="export-coverage" role="list" aria-label={t("batchExportCoverage")}>
                        {(["coveragePerson", "coverageAddress", "coverageTax", "coverageBanking", "coverageBusiness", "coveragePayments"] as const).map((label) => (
                          <span role="listitem" key={label}><i /> {t(label)}</span>
                        ))}
                      </div>
                    </section>
                    <div className="identity-batch-list">
                      {visibleProfiles.map((profile, index) => (
                        <article className="identity-batch-row" key={profile.id}>
                          <span>{String(batchPage * 25 + index + 1).padStart(2, "0")}</span>
                          <div>
                            <strong>{profile.country.flag} <bdi>{profile.personal.fullName}</bdi></strong>
                            <small>{number(profile.personal.age)} {t("years")} · <bdi>{profile.address.postalCode} {profile.address.city}</bdi></small>
                          </div>
                          <code>{profile.government.taxId}</code>
                          <code>{displayBankingValue(profile)}</code>
                          <button
                            onClick={() => copyText(JSON.stringify(profile, null, 2), t("itemCopied", { index: number(batchPage * 25 + index + 1) }))}
                            aria-label={t("copyIdentityAt", { index: number(batchPage * 25 + index + 1) })}
                          >
                            ⧉
                          </button>
                        </article>
                      ))}
                    </div>
                    {profiles.length > 25 && (
                      <div className="pagination">
                        <button type="button" disabled={batchPage === 0} onClick={() => setBatchPage((page) => Math.max(0, page - 1))}>{t("previousPage")}</button>
                        <span>{batchPage + 1} / {Math.ceil(profiles.length / 25)}</span>
                        <button type="button" disabled={batchPage >= Math.ceil(profiles.length / 25) - 1} onClick={() => setBatchPage((page) => page + 1)}>{t("nextPage")}</button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </section>
      ) : (
        <section className="validator-layout">
          <div className="validator-input-card">
            <div className="panel-heading">
              <div>
                <span className="step">{t("inspector")}</span>
                <h2>{t("enterAnyIban")}</h2>
              </div>
            </div>
            <label htmlFor="validator">{t("ibanString")}</label>
            <textarea
              id="validator"
              dir="ltr"
              value={validatorInput}
              spellCheck={false}
              placeholder={t("ibanPlaceholder")}
              onChange={(event) => setValidatorInput(event.target.value)}
            />
            <div className="input-meta">
              <span>{t("separatorsIgnored")}</span>
              <span>{number(validation.compact.length)} {t("characters")}</span>
            </div>
            <div className="sample-row">
              <span>{t("tryExamples")}</span>
              {["DE89370400440532013000", "GB82WEST12345698765432", "NL91ABNA0417164300"].map((sample) => (
                <button key={sample} onClick={() => setValidatorInput(sample)}>{sample.slice(0, 2)}</button>
              ))}
            </div>
          </div>

          <div className={`validation-result ${validation.valid ? "is-valid" : "is-invalid"}`}>
            <div className="validation-status">
              <span className="status-icon">{validation.valid ? "✓" : "!"}</span>
              <div>
                <span className="step">{t("validationResult")}</span>
                <h2>{validation.valid ? t("validIban") : t("invalidIban")}</h2>
                <p>{VALIDATION_REASONS[validation.reason] ? t(VALIDATION_REASONS[validation.reason]) : validation.reason}</p>
              </div>
            </div>

            <div className="validation-checks" aria-label={t("layeredValidation")}>
              {[
                [t("checkCharacterSet"), validation.checks.inputCharactersValid],
                [t("checkCountryRegistry"), validation.checks.countryRegistered],
                [t("checkLength"), validation.checks.lengthValid],
                [t("checkBban"), validation.checks.bbanValid],
                ["MOD-97", validation.checks.checksumValid],
              ].map(([label, passed]) => (
                <div key={String(label)} className={passed ? "passed" : "failed"}>
                  <span>{passed ? "✓" : "×"}</span><strong>{label}</strong>
                </div>
              ))}
            </div>

            {validation.country && validation.compact.length >= 4 && (
              <>
                <div className="inspector-spec">
                  <div>
                    <span>{t("country")}</span>
                    <strong>
                      {validation.country.flag}{" "}
                      {displayCountryName(
                        validation.country.code,
                        locale,
                        COUNTRY_MAP.get(validation.country.code)?.englishName ??
                          validation.country.name,
                      )}
                    </strong>
                  </div>
                  <div><span>{t("canonicalLength")}</span><strong>{number(validation.country.length)} {t("characters")}</strong></div>
                  <div><span>{t("algorithm")}</span><strong>ISO 13616</strong></div>
                </div>
                <div className="structure inspector-structure">
                  <div className="section-title">
                    <h3>{t("structureBreakdown")}</h3>
                    <button onClick={() => copyText(validation.compact)}>{t("copyRaw")}</button>
                  </div>
                  {renderSegments(validation.compact, validation.country)}
                  <div className="legend">
                    <span><i className="dot-country" /> {t("country")}</span>
                    <span><i className="dot-check" /> {t("checkDigits")}</span>
                    <span><i className="dot-bank" /> {t("bankCode")}</span>
                    <span><i className="dot-account" /> {t("account")}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      <footer>
        <div className="footer-mark">IB</div>
        <p>{t("disclaimer")}</p>
        <a href="https://github.com/tianrking/iban-devtools" target="_blank" rel="noreferrer">{t("sourceOnGithub")}</a>
      </footer>

      {commandOpen && (
        <div className="command-backdrop" role="presentation" onMouseDown={() => setCommandOpen(false)}>
          <div
            ref={commandDialogRef}
            className="command-palette"
            role="dialog"
            aria-modal="true"
            aria-label={t("commandPalette")}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div><span>{t("commandPalette").toUpperCase()}</span><button type="button" onClick={() => setCommandOpen(false)}>Esc</button></div>
            <button type="button" onClick={() => { setTab("generate"); regenerate(); setCommandOpen(false); }}><strong>{t("generateOneCommand")}</strong><kbd>↵</kbd></button>
            <button type="button" onClick={() => { setTab("validate"); setCommandOpen(false); }}><strong>{t("openValidatorCommand")}</strong><span>{t("inspect")}</span></button>
            <button type="button" onClick={() => { shareConfiguration(); setCommandOpen(false); }}><strong>{t("copyLinkCommand")}</strong><span>{t("share")}</span></button>
            <button type="button" onClick={() => { setTheme(theme === "light" ? "dark" : "light"); setCommandOpen(false); }}><strong>{t("switchThemeCommand")}</strong><span>{theme === "light" ? t("lightTheme") : t("darkTheme")}</span></button>
          </div>
        </div>
      )}

      {tab === "generate" && (
        <div className="mobile-action-dock">
          <div>
            <span>{country.flag} {country.code} · {t(SCENARIOS.find((item) => item.value === scenario)?.labelKey ?? "scenarioComplete")}</span>
            <small>{generateMode === "single" ? t("singleIdentity") : t("completeIdentities", { count: number(batchCount) })}</small>
          </div>
          <button type="button" disabled={isGenerating} onClick={generateMode === "single" ? regenerate : generateBatch}>
            {isGenerating ? t("generating") : t("generateNow")}
          </button>
        </div>
      )}

      {toast && <div className="toast"><span>✓</span>{toast}</div>}
      <span className="sr-only" aria-live="polite">{toast}</span>
    </main>
  );
}
