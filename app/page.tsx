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
import type {
  BatchWorkerRequest,
  BatchWorkerResponse,
} from "./batch-worker";

const COUNTRIES = COUNTRY_CATALOG;
const COUNTRY_MAP = COUNTRY_CATALOG_MAP;
const DEFAULT_IBAN = "DE89370400440532013000";
const COUNTRY_SCOPES = [
  ["all", "全部地区"],
  ["sepa", "SEPA"],
  ["Europe", "欧洲"],
  ["Asia", "亚洲"],
  ["Africa", "非洲"],
  ["Americas", "美洲"],
  ["Oceania", "大洋洲"],
  ["Polar", "极地"],
  ["Other", "其他区域"],
] as const;
type CountryScope = (typeof COUNTRY_SCOPES)[number][0];
const GENDER_OPTIONS = [
  ["random", "随机"],
  ["female", "女性"],
  ["male", "男性"],
] as const;
const AGE_MODES = [
  ["random", "随机"],
  ["exact", "指定"],
  ["range", "区间"],
] as const;
const SCENARIOS: Array<{ value: IdentityScenario; label: string; hint: string }> = [
  { value: "complete", label: "完整身份", hint: "全字段" },
  { value: "kyc", label: "KYC", hint: "证件与风控" },
  { value: "payments", label: "支付", hint: "账户与汇款" },
  { value: "payroll", label: "薪资", hint: "税务与雇佣" },
  { value: "ecommerce", label: "电商", hint: "配送与支付" },
  { value: "sepa", label: "SEPA", hint: "SCT 测试" },
  { value: "api-boundary", label: "边界值", hint: "异常输入" },
  { value: "database", label: "数据库", hint: "批量种子" },
];
const CASE_MODES: Array<{ value: IbanCaseMode; label: string }> = [
  { value: "valid", label: "合法 IBAN" },
  { value: "bad-checksum", label: "错误校验码" },
  { value: "wrong-length", label: "错误长度" },
  { value: "illegal-character", label: "非法字符" },
  { value: "bad-bban", label: "错误 BBAN" },
  { value: "lowercase", label: "小写兼容" },
  { value: "hyphenated", label: "连字符兼容" },
];
const VALIDATION_REASONS: Record<string, string> = {
  REGISTRY_FORMAT_AND_MOD97_VALID: "国家结构与 MOD-97 校验均通过",
  ILLEGAL_CHARACTERS: "包含 IBAN 不允许的字符",
  UNREGISTERED_COUNTRY: "国家代码不在当前 SWIFT 注册表中",
  INVALID_LENGTH: "长度不符合该国家规范",
  INVALID_BBAN_STRUCTURE: "BBAN 结构不符合该国家规范",
  INVALID_CHECKSUM: "MOD-97 校验码不正确",
  INVALID_IBAN: "IBAN 无效",
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

export default function Home() {
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
  const [geoError, setGeoError] = useState("");
  const batchWorkerRef = useRef<Worker | null>(null);
  const batchConfigurationRef = useRef("");
  const commandDialogRef = useRef<HTMLDivElement | null>(null);
  const commandTriggerRef = useRef<HTMLButtonElement | null>(null);

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
  const caseModeOptions = country.ibanSpec
    ? CASE_MODES
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
                  ? "校验通过"
                  : "格式测试值",
            };
          }
          if (item.value === "bad-checksum") {
            return {
              ...item,
              label:
                country.payment.validation === "checksum"
                  ? "错误校验码"
                  : "格式破坏（非法字符）",
            };
          }
          if (item.value === "bad-bban") {
            return { ...item, label: "错误路由 / 账户结构" };
          }
          return item;
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
          item.name.toLowerCase().includes(query) ||
          item.englishName.toLowerCase().includes(query) ||
          item.nativeName.toLowerCase().includes(query) ||
          item.currencies.some((currency) =>
            currency.toLowerCase().includes(query),
          ))
      );
    });
  }, [countryQuery, countryScope]);
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
      ? "全地区"
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
      title: "KYC 身份核验",
      description: `${country.code} · 单条完整身份`,
      scenario: "kyc",
      caseMode: "valid",
      count: 1,
    },
    {
      id: "payment-regression",
      icon: "↔",
      title: country.ibanSpec?.sepa ? "SEPA 支付回归" : "本地支付回归",
      description: `${
        country.ibanSpec?.sepa ? "EUR" : currencyChoice
      } · 10 条合法账户`,
      scenario: country.ibanSpec?.sepa ? "sepa" : "payments",
      caseMode: "valid",
      count: 10,
    },
    {
      id: "payment-failure",
      icon: "×",
      title: "支付失败用例",
      description: `${country.code} · ${
        country.payment.validation === "checksum" ? "错误校验码" : "格式负例"
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
      title: "数据库测试种子",
      description: `${country.code} · 100 条可导出`,
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
  const selectedExportMetadata = exportFileMetadata(exportFormat);
  const visibleProfiles = profiles.slice(batchPage * 25, batchPage * 25 + 25);

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
        setGeoError("");
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
        setGeoError("城市目录加载失败，可继续使用随机测试地区");
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

  const copyText = async (text: string, message = "已复制到剪贴板") => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(message);
    } catch {
      showToast("复制失败，请手动选择文本");
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
      }),
    );
    showToast("完整测试身份已生成");
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
        }),
      );
      showToast(
        `已生成 ${batchCount} 条完整测试身份${elapsedMs === undefined ? "" : ` · ${elapsedMs.toFixed(1)}ms`}`,
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
    showToast(`${metadata.label} 已导出`);
  };

  const shareConfiguration = async () => {
    const url = new URL(window.location.href);
    url.search = new URLSearchParams({
      country: countryCode,
      currency: currencyChoice,
      scenario,
      case: caseMode,
      seed,
    }).toString();
    await copyText(url.toString(), "可复现配置链接已复制");
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
    showToast(`${country.code} · ${preset.title} 已应用`);
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
      };
      if (saved.countryCode && COUNTRY_MAP.has(saved.countryCode)) {
        changeCountry(saved.countryCode);
      }
      if (saved.scenario) setScenario(saved.scenario);
      if (saved.batchCount) {
        setBatchCount(saved.batchCount);
        setGenerateMode(saved.batchCount > 1 ? "batch" : "single");
      }
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
      showToast("上次生成配置已恢复");
    } catch {
      showToast("没有可恢复的本地配置");
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
    showToast(`${country.code} 参数已重置`);
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
      <div className="segment-value" role="group" aria-label="IBAN 结构拆解">
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
    <main>
      <header className="site-header">
        <a className="brand" href="#" aria-label="IBAN DevTools 首页">
          <span className="brand-mark">IB</span>
          <span>IBAN <b>DevTools</b></span>
          <span className="version-badge">v2.0</span>
        </a>
        <div className="header-meta">
          <span className="local-badge"><i /> 100% 本地运行</span>
          <span className="standard-mark"><b>ISO</b> 13616</span>
          <button
            ref={commandTriggerRef}
            className="header-command"
            type="button"
            onClick={() => setCommandOpen(true)}
          >
            命令 <kbd>⌘K</kbd>
          </button>
          <button className="header-command" type="button" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>{theme === "light" ? "深色" : "浅色"}</button>
          <a className="header-link" href="#tool">开始使用 <span>↓</span></a>
        </div>
      </header>

      <section className="intro">
        <div>
          <p className="eyebrow">COMPLETE SYNTHETIC IDENTITY · IBAN</p>
          <h1>一个身份，<em>所有测试数据。</em></h1>
          <p className="lede">选择国家或地区、行政区、城市、性别与年龄，一次生成本地化身份、地址、税务与保险测试字段，以及 IBAN、ABA、加拿大路由、CLABE 或 CBU 等对应银行数据。</p>
          <div className="platform-row" role="group" aria-label="支持的部署平台">
            <span className="platform-label">DEPLOY ANYWHERE</span>
            <span className="platform-chip vercel-chip"><b>▲</b> Vercel</span>
            <span className="platform-chip cloudflare-chip"><b>☁</b> Cloudflare</span>
            <span className="platform-chip"><b>◇</b> Open Source</span>
          </div>
        </div>
        <div className="intro-stat" role="group" aria-label="性能指标">
          <span>COUNTRIES / AREAS</span>
          <strong>{COUNTRIES.length}</strong>
          <small>
            {IBAN_COUNTRIES.length} IBAN · {WORLD_GEO_COUNTS.cities.toLocaleString()} cities
          </small>
        </div>
      </section>

      <nav className="main-tabs" id="tool" aria-label="工具模式">
        <button className={tab === "generate" ? "active" : ""} onClick={() => setTab("generate")}>
          <span>01</span> 生成器
        </button>
        <button className={tab === "validate" ? "active" : ""} onClick={() => setTab("validate")}>
          <span>02</span> 校验与解析
        </button>
      </nav>

      {tab === "generate" ? (
        <section className="workspace">
          <aside className="config-panel">
            <div className="panel-heading">
              <div>
                <span className="step">PARAMETER STUDIO</span>
                <h2>精确生成配置</h2>
              </div>
              <span className="config-status">7 GROUPS</span>
            </div>

            <div className="config-summary">
              <span>{country.flag} {country.code}</span>
              <span>{regionChoiceLabel}</span>
              <span>{genderChoice === "random" ? "随机性别" : genderChoice === "female" ? "女性" : "男性"}</span>
              <span>
                {currencyChoice} · {generateMode === "single" ? "1 条" : `${batchCount} 条`}
              </span>
            </div>

            <section className="quick-start" aria-labelledby="quick-start-title">
              <div className="quick-start-heading">
                <div>
                  <span>QUICK START</span>
                  <strong id="quick-start-title">当前国家快捷场景</strong>
                </div>
                <small>{country.flag} {country.name} · 不会切换国家</small>
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
                    <em>{activePresetId === preset.id ? "已选择" : "应用"}</em>
                  </button>
                ))}
              </div>
              <div className="configuration-tools" aria-label="配置管理">
                <button type="button" onClick={restoreLastConfiguration}><span>↶</span> 恢复上次</button>
                <button type="button" onClick={resetConfiguration}><span>○</span> 重置参数</button>
              </div>
            </section>

            <section className="config-group">
              <div className="config-group-title">
                <span>01</span>
                <div><strong>地域参数</strong><small>决定身份、地址与本国支付规范</small></div>
              </div>

              <div className="field">
                <label htmlFor="country">国家 / 地区</label>
                <div className="country-discovery">
                  <input
                    aria-label="搜索国家"
                    value={countryQuery}
                    placeholder="搜索国家、代码或币种"
                    onChange={(event) => setCountryQuery(event.target.value)}
                  />
                  <div className="select-wrap country-scope-select">
                    <select
                      aria-label="按全球区域筛选"
                      value={countryScope}
                      onChange={(event) =>
                        setCountryScope(event.target.value as CountryScope)
                      }
                    >
                      {COUNTRY_SCOPES.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <span>⌄</span>
                  </div>
                </div>
                <div className="select-wrap">
                  <select id="country" value={countryCode} onChange={(event) => changeCountry(event.target.value)}>
                    {!filteredCountries.some((item) => item.code === country.code) && (
                      <option value={country.code}>{country.flag} {country.name} — {country.code}</option>
                    )}
                    {filteredCountries.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.flag} {item.name} — {item.code} · {item.currency}
                      </option>
                    ))}
                  </select>
                  <span>⌄</span>
                </div>
                <small>
                  {country.currencies.join(" / ")} · {country.ibanSpec
                    ? `${country.ibanSpec.length} 位 IBAN${country.ibanSpec.sepa ? " · SEPA" : ""}`
                    : `${country.payment.label} · 非 IBAN 国家`}
                  {" · "}{filteredCountries.length} 个匹配
                </small>
              </div>

              {country.currencies.length > 1 && (
                <div className="field">
                  <label htmlFor="identity-currency">测试结算币种</label>
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
                  <small>SIX ISO 4217 · 该市场支持多个流通币种</small>
                </div>
              )}

              <div className="two-column-fields">
                <div className="field">
                  <label htmlFor="identity-region">州 / 地区</label>
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
                      <option value="random">全部地区</option>
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
                  <label htmlFor="identity-city">城市</label>
                  {availableCities.length > 100 && (
                    <input
                      className="city-search-input"
                      aria-label="搜索当前地区城市"
                      value={cityQuery}
                      placeholder={`搜索 ${availableCities.length.toLocaleString()} 个城市`}
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
                          ? "正在加载城市目录…"
                          : usesSyntheticLocality
                            ? "合成测试城市（上游暂无城市记录）"
                          : regionChoice === "random" && geoData
                            ? "随机城市（先选地区可指定）"
                            : "随机城市"}
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
                      显示前 {visibleCityOptions.length} 个匹配项；输入名称可检索完整目录
                    </small>
                  )}
                  {usesSyntheticLocality && (
                    <small>
                      将使用带 “Test Locality” 标记的合成城市，并保留所选真实地区名称
                    </small>
                  )}
                </div>
              </div>
              <div className="geo-source-note">
                <strong>
                  {geoLoading
                    ? "正在按国家加载地理目录…"
                    : geoData?.country.code === countryCode
                      ? geoData.counts.cities > 0
                        ? `${geoData.counts.regions} 个地区 · ${geoData.counts.cities.toLocaleString()} 个城市`
                        : "该国家/地区在当前源中没有城市记录，将使用明确标记的测试占位地址"
                      : geoError}
                </strong>
                <span>全球按国家懒加载 · ODbL 社区目录 · 非政府实时名录</span>
              </div>
            </section>

            <section className="config-group">
              <div className="config-group-title">
                <span>02</span>
                <div><strong>测试场景</strong><small>按工作流组织数据与支付字段</small></div>
              </div>
              <div className="scenario-grid">
                {SCENARIOS.map((item) => (
                  <button
                    type="button"
                    key={item.value}
                    className={scenario === item.value ? "active" : ""}
                    onClick={() => setScenario(item.value)}
                  >
                    <strong>{item.label}</strong><small>{item.hint}</small>
                  </button>
                ))}
              </div>
            </section>

            <section className="config-group">
              <div className="config-group-title">
                <span>03</span>
                <div><strong>人口属性</strong><small>精确控制性别与年龄分布</small></div>
              </div>

              <div className="field">
                <label>性别</label>
                <div className="segmented segmented-three">
                  {GENDER_OPTIONS.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={genderChoice === value ? "active" : ""}
                      onClick={() => setGenderChoice(value as ProfileGender | "random")}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label>年龄策略</label>
                <div className="segmented segmented-three">
                  {AGE_MODES.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={ageMode === value ? "active" : ""}
                      onClick={() => setAgeMode(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {ageMode === "exact" && (
                <div className="field range-field">
                  <div className="range-label">
                    <label htmlFor="exact-age">指定年龄</label>
                    <output htmlFor="exact-age">{exactAge} 岁</output>
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
                    <label htmlFor="minimum-age">最小年龄</label>
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
                    <label htmlFor="maximum-age">最大年龄</label>
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
                <div><strong>身份与地址覆盖</strong><small>可选；留空使用本地化随机值</small></div>
                <b>{identityAdvancedOpen ? "−" : "+"}</b>
              </button>
              {identityAdvancedOpen && (
                <div className="optional-fields">
                  <div className="two-column-fields">
                    <div className="field">
                      <label htmlFor="first-name">名字</label>
                      <input id="first-name" value={firstNameOverride} placeholder="Localized" onChange={(event) => setFirstNameOverride(event.target.value)} />
                    </div>
                    <div className="field">
                      <label htmlFor="last-name">姓氏</label>
                      <input id="last-name" value={lastNameOverride} placeholder="Localized" onChange={(event) => setLastNameOverride(event.target.value)} />
                    </div>
                  </div>
                  <div className="two-column-fields">
                    <div className="field">
                      <label htmlFor="street-name">街道</label>
                      <input id="street-name" value={streetOverride} placeholder="自动选择" onChange={(event) => setStreetOverride(event.target.value)} />
                    </div>
                    <div className="field">
                      <label htmlFor="postal-code">邮编</label>
                      <input id="postal-code" value={postalCodeOverride} placeholder="自动匹配" onChange={(event) => setPostalCodeOverride(event.target.value)} />
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="config-group">
              <div className="config-group-title">
                <span>05</span>
                <div><strong>生成规模</strong><small>单条预览或批量导出</small></div>
              </div>
              <div className="field">
                <div className="segmented">
                  <button type="button" className={generateMode === "single" ? "active" : ""} onClick={() => changeGenerateMode("single")}>单条身份</button>
                  <button type="button" className={generateMode === "batch" ? "active" : ""} onClick={() => changeGenerateMode("batch")}>批量数据</button>
                </div>
              </div>
              {generateMode === "batch" && (
                <div className="field batch-count-field">
                  <div className="range-label">
                    <label htmlFor="batch-count">生成数量</label>
                    <output htmlFor="batch-count">{batchCount} 条</output>
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
                <div><strong>可复现性与格式</strong><small>固定种子可重复生成同一数据</small></div>
              </div>
              <div className="field seed-field">
                <label htmlFor="seed">随机种子（可选）</label>
                <div>
                  <input id="seed" value={seed} placeholder="例如 qa-regression-01" onChange={(event) => setSeed(event.target.value)} />
                  <button type="button" onClick={() => setSeed(`test-${Date.now().toString(36)}`)}>生成</button>
                </div>
              </div>
              <div className="field format-field">
                <div>
                  <label htmlFor={country.ibanSpec ? "format-toggle" : undefined}>
                    {country.ibanSpec ? "IBAN 显示空格" : "支付标识质量"}
                  </label>
                  <small>
                    {country.ibanSpec
                      ? formatted
                        ? "DE89 3704 …"
                        : "DE893704…"
                      : country.payment.validation === "checksum"
                        ? "包含已实现的校验算法"
                        : "格式测试值 · 不查询真实目录"}
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
                <span><b>07</b> 银行字段 / {country.ibanSpec ? "自定义 BBAN" : country.payment.label}</span>
                <b>{advancedOpen ? "−" : "+"}</b>
              </button>
              {advancedOpen && (
                <div className="advanced-fields">
                  <div className="field">
                    <label htmlFor="case-mode">测试用例</label>
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
                    <label htmlFor="bank-code">{country.payment.routingLabel}</label>
                    <input
                      id="bank-code"
                      value={bankCode}
                      maxLength={country.payment.bankCodeLen}
                      placeholder={`最多 ${country.payment.bankCodeLen} 位`}
                      onChange={(event) => setBankCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="account-number">Account Number</label>
                    <input
                      id="account-number"
                      value={account}
                      maxLength={country.payment.accountLen}
                      placeholder={`最多 ${country.payment.accountLen} 位`}
                      onChange={(event) => setAccount(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                    />
                  </div>
                  <p>
                    留空部分将随机补齐。
                    {country.payment.validation === "checksum"
                      ? " 可用校验算法会自动重新计算。"
                      : " 此市场当前仅生成格式测试值，不声明真实银行目录有效性。"}
                  </p>
                </div>
              )}
            </section>

            <button className="primary-action" disabled={isGenerating} onClick={generateMode === "single" ? regenerate : generateBatch}>
              <span>{isGenerating ? "正在后台生成…" : generateMode === "single" ? "生成完整测试身份" : `生成 ${batchCount} 条完整身份`}</span>
              <b>↗</b>
            </button>
            <div className="share-row">
              <button type="button" onClick={shareConfiguration}>复制配置链接</button>
              <span>配置可复现 · 本地无状态</span>
            </div>
          </aside>

          <div className="result-panel identity-results">
            {generateMode === "single" ? (
              <>
                <div className="result-topline">
                  <span className="step">OUTPUT / COMPLETE IDENTITY</span>
                  <span className={
                    activeProfile.banking.paymentIdentifier.validation === "negative-test-case"
                      ? "invalid-chip"
                      : "valid-chip"
                  }>
                    <i /> SYNTHETIC · {
                      activeProfile.banking.paymentIdentifier.validation === "checksum-valid"
                        ? "CHECKSUM PASS"
                        : activeProfile.banking.paymentIdentifier.validation === "format-only"
                          ? "FORMAT ONLY"
                          : "NEGATIVE CASE"
                    }
                  </span>
                </div>

                <div className="active-parameters" role="group" aria-label="本次生成参数">
                  <span>{country.flag} {activeProfile.country.name}</span>
                  <span>{activeProfile.address.region}</span>
                  <span>{activeProfile.address.city}</span>
                  <span>{activeProfile.personal.gender === "female" ? "女性" : "男性"}</span>
                  <span>{activeProfile.personal.age} 岁</span>
                  <span>{activeProfile.banking.currency}</span>
                  <span>{SCENARIOS.find((item) => item.value === scenario)?.label}</span>
                  {seed && <span className="seed-chip"># {seed}</span>}
                </div>

                <div className="profile-heading identity-profile-heading">
                  <div className="profile-avatar">{activeProfile.country.flag}</div>
                  <div>
                    <span>{activeProfile.country.code} TEST PERSON</span>
                    <h2>{activeProfile.personal.fullName}</h2>
                    <p>{activeProfile.personal.age} 岁 · {activeProfile.address.city} · {activeProfile.address.region}</p>
                  </div>
                  <button
                    onClick={() =>
                      copyText(JSON.stringify(activeProfile, null, 2), "完整身份 JSON 已复制")
                    }
                  >
                    复制完整 JSON
                  </button>
                </div>

                <div className="quality-grid" role="group" aria-label="数据质量摘要">
                  <div><span>PROFILE ID</span><strong>{activeProfile.id}</strong></div>
                  <div><span>LOCALIZATION</span><strong>{activeProfile.country.code} / {activeProfile.address.city}</strong></div>
                  <div><span>DATA GROUPS</span><strong>08 / {scenario.toUpperCase()}</strong></div>
                  <div>
                    <span>PAYMENT ID</span>
                    <strong className={
                      activeProfile.banking.paymentIdentifier.validation === "negative-test-case"
                        ? "negative-value"
                        : "quality-positive"
                    }>
                      {generatedValidation
                        ? generatedValidation.valid ? "MOD-97 PASS" : "EXPECTED FAIL"
                        : activeProfile.banking.paymentIdentifier.validation === "checksum-valid"
                          ? `${activeProfile.banking.paymentIdentifier.scheme} CHECK PASS`
                          : "FORMAT-ONLY FIXTURE"}
                    </strong>
                  </div>
                </div>

                <div className="iban-display identity-iban-display">
                  <span className="country-tag">
                    {country.flag} {country.code} · {activeProfile.banking.paymentIdentifier.label}
                  </span>
                  <p>{displayBankingValue(activeProfile)}</p>
                  <div className="result-actions">
                    <button onClick={() => copyText(displayBankingValue(activeProfile), `${activeProfile.banking.paymentIdentifier.label} 已复制`)}>
                      复制 {activeProfile.banking.paymentIdentifier.scheme} <span>⌘C</span>
                    </button>
                    <button className="icon-button" onClick={regenerate} aria-label="重新生成完整测试身份">↻</button>
                  </div>
                </div>

                <div className="profile-grid global-profile-grid">
                  <article className="profile-card">
                    <div className="profile-card-title"><span>01</span><h3>个人身份</h3></div>
                    <dl>
                      <div><dt>出生日期</dt><dd>{activeProfile.personal.birthDate}</dd></div>
                      <div><dt>年龄 / 性别</dt><dd>{activeProfile.personal.age} · {activeProfile.personal.gender === "female" ? "女性" : "男性"}</dd></div>
                      <div><dt>出生地</dt><dd>{activeProfile.personal.birthPlace}</dd></div>
                      <div><dt>测试证件号</dt><dd className="mono-value">{activeProfile.personal.documentNumber}</dd></div>
                    </dl>
                  </article>

                  <article className="profile-card">
                    <div className="profile-card-title"><span>02</span><h3>地址与联系</h3></div>
                    <dl>
                      <div><dt>完整地址</dt><dd>{activeProfile.address.formatted}</dd></div>
                      <div><dt>地区</dt><dd>{activeProfile.address.region}</dd></div>
                      <div><dt>手机号码</dt><dd>{activeProfile.contact.phone}</dd></div>
                      <div><dt>测试邮箱</dt><dd>{activeProfile.contact.email}</dd></div>
                    </dl>
                  </article>

                  <article className="profile-card">
                    <div className="profile-card-title"><span>03</span><h3>银行账户与银行卡</h3></div>
                    <dl>
                      <div><dt>银行</dt><dd>{activeProfile.banking.bankName}</dd></div>
                      <div><dt>支付标识类型</dt><dd>{activeProfile.banking.paymentIdentifier.label}</dd></div>
                      {activeProfile.banking.iban && <div><dt>BIC / SWIFT</dt><dd className="mono-value">{activeProfile.banking.bic}</dd></div>}
                      {activeProfile.banking.paymentIdentifier.routingNumber && (
                        <div><dt>{country.payment.routingLabel}</dt><dd className="mono-value">{activeProfile.banking.paymentIdentifier.routingNumber}</dd></div>
                      )}
                      <div><dt>银行账号</dt><dd className="mono-value">{activeProfile.banking.accountNumber}</dd></div>
                      <div><dt>沙盒卡号</dt><dd className="mono-value">{activeProfile.banking.card.number}</dd></div>
                      <div><dt>有效期 / CVC</dt><dd>{activeProfile.banking.card.expiry} · {activeProfile.banking.card.cvc}</dd></div>
                    </dl>
                  </article>

                  <article className="profile-card">
                    <div className="profile-card-title"><span>04</span><h3>税务、保险与雇佣</h3></div>
                    <dl>
                      <div><dt>{activeProfile.government.taxLabel}</dt><dd className="mono-value">{activeProfile.government.taxId}</dd></div>
                      <div><dt>税号质量</dt><dd className="positive-value">{activeProfile.government.taxStatus === "checksum-valid" ? "校验码通过" : "格式测试值"}</dd></div>
                      <div><dt>{activeProfile.government.insuranceLabel}</dt><dd className="mono-value">{activeProfile.government.insuranceNumber}</dd></div>
                      <div><dt>测试雇主</dt><dd>{activeProfile.employment.employer}</dd></div>
                      <div><dt>职位 / 工号</dt><dd>{activeProfile.employment.jobTitle} · {activeProfile.employment.employeeId}</dd></div>
                    </dl>
                  </article>

                  <article className="profile-card">
                    <div className="profile-card-title"><span>05</span><h3>KYC 与账户访问</h3></div>
                    <dl>
                      <div><dt>护照测试号</dt><dd className="mono-value">{activeProfile.personal.passportNumber}</dd></div>
                      <div><dt>风险等级</dt><dd>{activeProfile.personal.kycRiskLevel}</dd></div>
                      <div><dt>Locale / 时区</dt><dd>{activeProfile.personal.locale} · {activeProfile.personal.timezone}</dd></div>
                      <div><dt>测试用户名</dt><dd className="mono-value">{activeProfile.personal.username}</dd></div>
                    </dl>
                  </article>

                  <article className="profile-card">
                    <div className="profile-card-title"><span>06</span><h3>支付与本地清算</h3></div>
                    <dl>
                      <div><dt>Scheme / 币种</dt><dd>{activeProfile.payment.scheme} · {activeProfile.payment.currency}</dd></div>
                      <div><dt>金额 / Purpose</dt><dd>{activeProfile.payment.amount.toFixed(2)} · {activeProfile.payment.purposeCode}</dd></div>
                      <div><dt>End-to-End ID</dt><dd className="mono-value">{activeProfile.payment.endToEndId}</dd></div>
                      <div><dt>Creditor Reference</dt><dd className="mono-value">{activeProfile.payment.creditorReference}</dd></div>
                      <div><dt>收款人核验</dt><dd>{activeProfile.payment.verificationOfPayee}</dd></div>
                    </dl>
                  </article>

                  <article className="profile-card">
                    <div className="profile-card-title"><span>07</span><h3>企业与薪资</h3></div>
                    <dl>
                      <div><dt>公司</dt><dd>{activeProfile.business.companyName}</dd></div>
                      <div><dt>VAT ID</dt><dd className="mono-value">{activeProfile.business.vatId}</dd></div>
                      <div><dt>注册编号</dt><dd className="mono-value">{activeProfile.business.registrationNumber}</dd></div>
                      <div><dt>年薪</dt><dd>{activeProfile.employment.annualSalary.toLocaleString()} {activeProfile.banking.currency}</dd></div>
                      <div><dt>合同开始</dt><dd>{activeProfile.employment.contractStartDate}</dd></div>
                    </dl>
                  </article>
                </div>

                {country.ibanSpec && activeProfile.banking.iban ? (
                  <div className="structure compact-structure">
                    <div className="section-title">
                      <h3>IBAN 结构</h3>
                      <span>{activeProfile.banking.iban.length} characters</span>
                    </div>
                    {renderSegments(activeProfile.banking.iban, country.ibanSpec)}
                    <div className="legend">
                      <span><i className="dot-country" /> 国家代码</span>
                      <span><i className="dot-check" /> 校验码</span>
                      <span><i className="dot-bank" /> 银行代码</span>
                      {country.ibanSpec.branchCodeStart !== null && (
                        <span><i className="dot-branch" /> 分行代码</span>
                      )}
                      <span><i className="dot-account" /> 账号</span>
                    </div>
                  </div>
                ) : (
                  <div className="structure compact-structure national-structure">
                    <div className="section-title">
                      <h3>{activeProfile.banking.paymentIdentifier.label} 结构</h3>
                      <span>{activeProfile.banking.paymentIdentifier.validation}</span>
                    </div>
                    <div className="national-structure-grid">
                      <div><span>Scheme</span><strong>{activeProfile.banking.paymentIdentifier.scheme}</strong></div>
                      <div><span>Routing</span><strong>{activeProfile.banking.paymentIdentifier.routingNumber ?? "N/A"}</strong></div>
                      <div><span>Institution</span><strong>{activeProfile.banking.paymentIdentifier.institutionCode ?? "N/A"}</strong></div>
                      {activeProfile.banking.paymentIdentifier.branchCode && (
                        <div><span>Branch</span><strong>{activeProfile.banking.paymentIdentifier.branchCode}</strong></div>
                      )}
                      <div><span>Account</span><strong>{activeProfile.banking.paymentIdentifier.accountNumber}</strong></div>
                    </div>
                    <p className="structure-disclaimer">这是软件测试值，不会查询真实银行、分行或账户目录。</p>
                  </div>
                )}

                <div className="identity-export-bar">
                  <p><strong>一次生成，字段相互对应</strong> · 银行卡为公开沙盒测试卡，不可真实扣款</p>
                  <div>
                    {country.ibanSpec && (
                      <button onClick={() => copyText(countryRegex(country.ibanSpec!), "IBAN 正则已复制")}>复制正则</button>
                    )}
                    <select aria-label="导出格式" value={exportFormat} onChange={(event) => setExportFormat(event.target.value as ExportFormat)}>
                      {EXPORT_FORMATS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                    <button onClick={() => exportData()}>导出 ↓</button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="result-topline">
                  <span className="step">OUTPUT / COMPLETE IDENTITY BATCH</span>
                  <span className="batch-meta">{profiles.length > 1 ? profiles.length : batchCount} rows · {country.code}</span>
                </div>
                {profiles.length <= 1 ? (
                  <div className="empty-state">
                    <span>[ ]</span>
                    <h3>完整身份批次尚未生成</h3>
                    <p>选择数量后点击左侧按钮，每一行都会包含人物、地址、税务、保险与银行字段。</p>
                  </div>
                ) : (
                  <>
                    <div className="batch-toolbar identity-batch-toolbar">
                      <p><strong>{profiles.length}</strong> 条完整身份 <span>当前仅预览第 {batchPage + 1} 页，导出始终包含全部数据</span></p>
                      <div>
                        <button onClick={() => copyText(JSON.stringify(profiles, null, 2), "全部身份 JSON 已复制")}>复制全部</button>
                      </div>
                    </div>
                    <section className="batch-export-center" aria-labelledby="batch-export-title">
                      <div className="batch-export-heading">
                        <div>
                          <span>EXPORT ALL {profiles.length} IDENTITIES</span>
                          <h3 id="batch-export-title">批量导出中心</h3>
                          <p>导出完整嵌套身份、KYC、地址、银行、企业、薪资与支付字段，不受 25 条分页预览限制。</p>
                        </div>
                        <strong>{EXPORT_FORMATS.length} FORMATS</strong>
                      </div>

                      <div className="quick-export-grid" aria-label="常用批量导出格式">
                        {(["json", "csv", "ndjson"] as const).map((format) => {
                          const metadata = exportFileMetadata(format);
                          return (
                            <button type="button" key={format} onClick={() => exportData(format)}>
                              <span>{metadata.label}</span>
                              <small>{format === "json" ? "完整嵌套" : format === "csv" ? "完整扁平字段" : "每行一条"}</small>
                              <b>下载全部 {profiles.length} 条 ↓</b>
                            </button>
                          );
                        })}
                      </div>

                      <div className="advanced-export-row">
                        <label htmlFor="batch-export-format">
                          <span>更多开发者格式</span>
                          <small>{selectedExportMetadata.description}</small>
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
                          导出全部 {profiles.length} 条
                        </button>
                      </div>

                      <div className="export-coverage" role="list" aria-label="批量导出数据覆盖">
                        {["人物与证件", "地址与联系", "税务与保险", "银行与卡片", "企业与薪资", "支付与 SEPA"].map((label) => (
                          <span role="listitem" key={label}><i /> {label}</span>
                        ))}
                      </div>
                    </section>
                    <div className="identity-batch-list">
                      {visibleProfiles.map((profile, index) => (
                        <article className="identity-batch-row" key={profile.id}>
                          <span>{String(batchPage * 25 + index + 1).padStart(2, "0")}</span>
                          <div>
                            <strong>{profile.country.flag} {profile.personal.fullName}</strong>
                            <small>{profile.personal.age} 岁 · {profile.address.postalCode} {profile.address.city}</small>
                          </div>
                          <code>{profile.government.taxId}</code>
                          <code>{displayBankingValue(profile)}</code>
                          <button
                            onClick={() => copyText(JSON.stringify(profile, null, 2), `第 ${index + 1} 条身份已复制`)}
                            aria-label={`复制第 ${index + 1} 条完整身份`}
                          >
                            ⧉
                          </button>
                        </article>
                      ))}
                    </div>
                    {profiles.length > 25 && (
                      <div className="pagination">
                        <button type="button" disabled={batchPage === 0} onClick={() => setBatchPage((page) => Math.max(0, page - 1))}>上一页</button>
                        <span>{batchPage + 1} / {Math.ceil(profiles.length / 25)}</span>
                        <button type="button" disabled={batchPage >= Math.ceil(profiles.length / 25) - 1} onClick={() => setBatchPage((page) => page + 1)}>下一页</button>
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
                <span className="step">INSPECTOR</span>
                <h2>输入任意 IBAN</h2>
              </div>
            </div>
            <label htmlFor="validator">IBAN 字符串</label>
            <textarea
              id="validator"
              value={validatorInput}
              spellCheck={false}
              placeholder="例如 DE89 3704 0044 0532 0130 00"
              onChange={(event) => setValidatorInput(event.target.value)}
            />
            <div className="input-meta">
              <span>自动忽略空格与连字符</span>
              <span>{validation.compact.length} characters</span>
            </div>
            <div className="sample-row">
              <span>试试示例</span>
              {["DE89370400440532013000", "GB82WEST12345698765432", "NL91ABNA0417164300"].map((sample) => (
                <button key={sample} onClick={() => setValidatorInput(sample)}>{sample.slice(0, 2)}</button>
              ))}
            </div>
          </div>

          <div className={`validation-result ${validation.valid ? "is-valid" : "is-invalid"}`}>
            <div className="validation-status">
              <span className="status-icon">{validation.valid ? "✓" : "!"}</span>
              <div>
                <span className="step">VALIDATION RESULT</span>
                <h2>{validation.valid ? "合法 IBAN" : "无效 IBAN"}</h2>
                <p>{VALIDATION_REASONS[validation.reason] ?? validation.reason}</p>
              </div>
            </div>

            <div className="validation-checks" aria-label="分层校验结果">
              {[
                ["字符集", validation.checks.inputCharactersValid],
                ["国家注册", validation.checks.countryRegistered],
                ["长度", validation.checks.lengthValid],
                ["BBAN 结构", validation.checks.bbanValid],
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
                    <span>国家</span>
                    <strong>
                      {validation.country.flag}{" "}
                      {COUNTRY_MAP.get(validation.country.code)?.name ??
                        validation.country.name}
                    </strong>
                  </div>
                  <div><span>规范长度</span><strong>{validation.country.length} 位</strong></div>
                  <div><span>算法</span><strong>ISO 13616</strong></div>
                </div>
                <div className="structure inspector-structure">
                  <div className="section-title">
                    <h3>结构拆解</h3>
                    <button onClick={() => copyText(validation.compact)}>复制 Raw</button>
                  </div>
                  {renderSegments(validation.compact, validation.country)}
                  <div className="legend">
                    <span><i className="dot-country" /> 国家</span>
                    <span><i className="dot-check" /> 校验码</span>
                    <span><i className="dot-bank" /> 银行代码</span>
                    <span><i className="dot-account" /> 账号</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      <footer>
        <div className="footer-mark">IB</div>
        <p>本工具生成的跨国身份、IBAN、保险与银行卡字段仅供软件开发、测试和教学使用。格式或校验码通过不代表真实账户、真实个人或官方签发记录。</p>
        <a href="https://github.com/tianrking/iban-devtools" target="_blank" rel="noreferrer">SOURCE ON GITHUB ↗</a>
      </footer>

      {commandOpen && (
        <div className="command-backdrop" role="presentation" onMouseDown={() => setCommandOpen(false)}>
          <div
            ref={commandDialogRef}
            className="command-palette"
            role="dialog"
            aria-modal="true"
            aria-label="命令面板"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div><span>IBAN DEVTOOLS COMMANDS</span><button type="button" onClick={() => setCommandOpen(false)}>Esc</button></div>
            <button type="button" onClick={() => { setTab("generate"); regenerate(); setCommandOpen(false); }}><strong>生成一条完整身份</strong><kbd>↵</kbd></button>
            <button type="button" onClick={() => { setTab("validate"); setCommandOpen(false); }}><strong>打开 IBAN 校验器</strong><span>Inspect</span></button>
            <button type="button" onClick={() => { shareConfiguration(); setCommandOpen(false); }}><strong>复制当前配置链接</strong><span>Share</span></button>
            <button type="button" onClick={() => { setTheme(theme === "light" ? "dark" : "light"); setCommandOpen(false); }}><strong>切换外观模式</strong><span>{theme}</span></button>
          </div>
        </div>
      )}

      {tab === "generate" && (
        <div className="mobile-action-dock">
          <div>
            <span>{country.flag} {country.code} · {SCENARIOS.find((item) => item.value === scenario)?.label}</span>
            <small>{generateMode === "single" ? "单条身份" : `${batchCount} 条批量身份`}</small>
          </div>
          <button type="button" disabled={isGenerating} onClick={generateMode === "single" ? regenerate : generateBatch}>
            {isGenerating ? "生成中…" : "立即生成"}
          </button>
        </div>
      )}

      {toast && <div className="toast"><span>✓</span>{toast}</div>}
      <span className="sr-only" aria-live="polite">{toast}</span>
    </main>
  );
}
