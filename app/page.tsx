"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_SYNTHETIC_IDENTITY,
  generateSyntheticIdentity,
  getIdentityCountry,
  type ProfileGender,
  type SyntheticIdentity,
} from "@/lib/global-test-data";

type TemplateChar = "n" | "a" | "c";

type CountrySpec = {
  code: string;
  flag: string;
  name: string;
  length: number;
  bbanTemplate: string;
  bankCodeStart: number;
  bankCodeLen: number;
  accountStart: number;
  accountLen: number;
  bankLabel: string;
};

const COUNTRIES: CountrySpec[] = [
  { code: "DE", flag: "🇩🇪", name: "德国", length: 22, bbanTemplate: "nnnnnnnnnnnnnnnnnn", bankCodeStart: 0, bankCodeLen: 8, accountStart: 8, accountLen: 10, bankLabel: "Bank Code (BLZ)" },
  { code: "FR", flag: "🇫🇷", name: "法国", length: 27, bbanTemplate: "nnnnnnnnnncccccccccccnn", bankCodeStart: 0, bankCodeLen: 5, accountStart: 10, accountLen: 11, bankLabel: "Bank Code" },
  { code: "GB", flag: "🇬🇧", name: "英国", length: 22, bbanTemplate: "aaaannnnnnnnnnnnnn", bankCodeStart: 0, bankCodeLen: 10, accountStart: 10, accountLen: 8, bankLabel: "Bank / Sort Code" },
  { code: "NL", flag: "🇳🇱", name: "荷兰", length: 18, bbanTemplate: "aaaannnnnnnnnn", bankCodeStart: 0, bankCodeLen: 4, accountStart: 4, accountLen: 10, bankLabel: "Bank Code" },
  { code: "ES", flag: "🇪🇸", name: "西班牙", length: 24, bbanTemplate: "nnnnnnnnnnnnnnnnnnnn", bankCodeStart: 0, bankCodeLen: 4, accountStart: 10, accountLen: 10, bankLabel: "Bank Code" },
  { code: "IT", flag: "🇮🇹", name: "意大利", length: 27, bbanTemplate: "annnnnnnnnncccccccccccc", bankCodeStart: 1, bankCodeLen: 5, accountStart: 11, accountLen: 12, bankLabel: "ABI Bank Code" },
  { code: "CH", flag: "🇨🇭", name: "瑞士", length: 21, bbanTemplate: "nnnnncccccccccccc", bankCodeStart: 0, bankCodeLen: 5, accountStart: 5, accountLen: 12, bankLabel: "Clearing Number" },
  { code: "BE", flag: "🇧🇪", name: "比利时", length: 16, bbanTemplate: "nnnnnnnnnnnn", bankCodeStart: 0, bankCodeLen: 3, accountStart: 3, accountLen: 7, bankLabel: "Bank Code" },
  { code: "AT", flag: "🇦🇹", name: "奥地利", length: 20, bbanTemplate: "nnnnnnnnnnnnnnnn", bankCodeStart: 0, bankCodeLen: 5, accountStart: 5, accountLen: 11, bankLabel: "Bank Code" },
  { code: "IE", flag: "🇮🇪", name: "爱尔兰", length: 22, bbanTemplate: "aaaannnnnnnnnnnnnn", bankCodeStart: 0, bankCodeLen: 10, accountStart: 10, accountLen: 8, bankLabel: "Bank / Sort Code" },
  { code: "PL", flag: "🇵🇱", name: "波兰", length: 28, bbanTemplate: "nnnnnnnnnnnnnnnnnnnnnnnn", bankCodeStart: 0, bankCodeLen: 8, accountStart: 8, accountLen: 16, bankLabel: "Bank / Branch Code" },
  { code: "PT", flag: "🇵🇹", name: "葡萄牙", length: 25, bbanTemplate: "nnnnnnnnnnnnnnnnnnnnn", bankCodeStart: 0, bankCodeLen: 8, accountStart: 10, accountLen: 11, bankLabel: "Bank / Branch Code" },
  { code: "NO", flag: "🇳🇴", name: "挪威", length: 15, bbanTemplate: "nnnnnnnnnnn", bankCodeStart: 0, bankCodeLen: 4, accountStart: 4, accountLen: 7, bankLabel: "Bank Code" },
  { code: "FI", flag: "🇫🇮", name: "芬兰", length: 18, bbanTemplate: "nnnnnnnnnnnnnn", bankCodeStart: 0, bankCodeLen: 6, accountStart: 6, accountLen: 8, bankLabel: "Bank Code" },
  { code: "LU", flag: "🇱🇺", name: "卢森堡", length: 20, bbanTemplate: "nnnccccccccccccc", bankCodeStart: 0, bankCodeLen: 3, accountStart: 3, accountLen: 13, bankLabel: "Bank Code" },
];

const COUNTRY_MAP = new Map(COUNTRIES.map((country) => [country.code, country]));
const DEFAULT_IBAN = "DE89370400440532013000";
const AGE_OPTIONS = Array.from({ length: 63 }, (_, index) => 18 + index);
const GENDER_OPTIONS = [
  ["random", "随机"],
  ["female", "女性"],
  ["male", "男性"],
] as const;

function randomInt(max: number) {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] % max;
  }
  return Math.floor(Math.random() * max);
}

function randomChar(type: TemplateChar) {
  if (type === "n") return String(randomInt(10));
  if (type === "a") return String.fromCharCode(65 + randomInt(26));
  return randomInt(2) === 0
    ? String(randomInt(10))
    : String.fromCharCode(65 + randomInt(26));
}

function charToNum(char: string) {
  const code = char.charCodeAt(0);
  return code >= 65 && code <= 90 ? String(code - 55) : char;
}

function mod97(numeric: string) {
  let checksum = 0;
  for (const digit of numeric) {
    checksum = (checksum * 10 + Number(digit)) % 97;
  }
  return checksum;
}

function calculateCheckDigits(countryCode: string, bban: string) {
  const prepared = `${bban}${countryCode}00`;
  const numeric = [...prepared].map(charToNum).join("");
  return String(98 - mod97(numeric)).padStart(2, "0");
}

function cleanIban(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function formatIban(value: string) {
  return cleanIban(value).replace(/(.{4})/g, "$1 ").trim();
}

function buildBban(spec: CountrySpec, bankCode = "", account = "") {
  const bban = [...spec.bbanTemplate].map((type) =>
    randomChar(type as TemplateChar),
  );

  const overlay = (raw: string, start: number, length: number) => {
    const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, length);
    [...clean].forEach((char, index) => {
      const type = spec.bbanTemplate[start + index] as TemplateChar;
      if (type === "n" && !/\d/.test(char)) return;
      if (type === "a" && !/[A-Z]/.test(char)) return;
      bban[start + index] = char;
    });
  };

  if (bankCode) overlay(bankCode, spec.bankCodeStart, spec.bankCodeLen);
  if (account) overlay(account, spec.accountStart, spec.accountLen);
  return bban.join("");
}

function generateIban(spec: CountrySpec, bankCode = "", account = "") {
  const bban = buildBban(spec, bankCode, account);
  return `${spec.code}${calculateCheckDigits(spec.code, bban)}${bban}`;
}

function validateIban(input: string) {
  const compact = cleanIban(input);
  const country = COUNTRY_MAP.get(compact.slice(0, 2));
  if (!country) {
    return { valid: false, reason: "暂不支持该国家代码", compact, country: null };
  }
  if (compact.length !== country.length) {
    return {
      valid: false,
      reason: `长度应为 ${country.length} 位，当前为 ${compact.length} 位`,
      compact,
      country,
    };
  }
  const bban = compact.slice(4);
  const pattern = country.bbanTemplate
    .replaceAll("n", "[0-9]")
    .replaceAll("a", "[A-Z]")
    .replaceAll("c", "[A-Z0-9]");
  if (!new RegExp(`^${pattern}$`).test(bban)) {
    return { valid: false, reason: "BBAN 结构不符合该国规范", compact, country };
  }
  const rearranged = `${compact.slice(4)}${compact.slice(0, 4)}`;
  const numeric = [...rearranged].map(charToNum).join("");
  const valid = mod97(numeric) === 1;
  return {
    valid,
    reason: valid ? "MOD-97 校验通过" : "校验码不正确",
    compact,
    country,
  };
}

function countryRegex(spec: CountrySpec) {
  const bban = spec.bbanTemplate
    .replaceAll("n", "\\d")
    .replaceAll("a", "[A-Z]")
    .replaceAll("c", "[A-Z0-9]");
  return `^${spec.code}\\d{2}${bban}$`;
}

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
  const [cityChoice, setCityChoice] = useState("random");
  const [genderChoice, setGenderChoice] = useState<ProfileGender | "random">("random");
  const [ageChoice, setAgeChoice] = useState<number | "random">("random");
  const [formatted, setFormatted] = useState(true);
  const [bankCode, setBankCode] = useState("");
  const [account, setAccount] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [batchCount, setBatchCount] = useState(10);
  const [profiles, setProfiles] = useState<SyntheticIdentity[]>([
    DEFAULT_SYNTHETIC_IDENTITY,
  ]);
  const [validatorInput, setValidatorInput] = useState(DEFAULT_IBAN);
  const [toast, setToast] = useState("");

  const country = COUNTRY_MAP.get(countryCode) ?? COUNTRIES[0];
  const identityCountry = getIdentityCountry(countryCode);
  const activeProfile = profiles[0] ?? DEFAULT_SYNTHETIC_IDENTITY;
  const validation = useMemo(() => validateIban(validatorInput), [validatorInput]);
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

  const regenerate = () => {
    const next = generateIban(country, bankCode, account);
    setProfiles([
      generateSyntheticIdentity({
        countryCode,
        iban: next,
        cityName: cityChoice,
        genderChoice,
        ageChoice,
      }),
    ]);
    showToast("完整测试身份已生成");
  };

  const changeCountry = (code: string) => {
    const nextCountry = COUNTRY_MAP.get(code) ?? COUNTRIES[0];
    const nextIban = generateIban(nextCountry);
    setCountryCode(code);
    setCityChoice("random");
    setBankCode("");
    setAccount("");
    setProfiles([
      generateSyntheticIdentity({
        countryCode: code,
        iban: nextIban,
        genderChoice,
        ageChoice,
      }),
    ]);
  };

  const generateBatch = () => {
    const nextProfiles = Array.from({ length: batchCount }, (_, index) => {
      const nextIban = generateIban(country, bankCode, account);
      return generateSyntheticIdentity({
        countryCode,
        iban: nextIban,
        cityName: cityChoice,
        genderChoice,
        ageChoice,
        index,
      });
    });
    setProfiles(nextProfiles);
    showToast(`已生成 ${batchCount} 条完整测试身份`);
  };

  const changeGenerateMode = (mode: "single" | "batch") => {
    setGenerateMode(mode);
    if (mode === "single" && profiles.length > 1) {
      setProfiles([
        generateSyntheticIdentity({
          countryCode,
          iban: generateIban(country, bankCode, account),
          cityName: cityChoice,
          genderChoice,
          ageChoice,
        }),
      ]);
    }
  };

  const displayIban = (value: string) => (formatted ? formatIban(value) : value);

  const exportJson = () => {
    downloadFile(
      JSON.stringify(profiles, null, 2),
      `test-identities-${country.code.toLowerCase()}.json`,
      "application/json",
    );
    showToast("完整身份 JSON 已导出");
  };

  const exportCsv = () => {
    const escapeCsv = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const header = [
      "id",
      "country",
      "taxId",
      "fullName",
      "birthDate",
      "age",
      "gender",
      "email",
      "phone",
      "address",
      "postalCode",
      "city",
      "region",
      "insuranceNumber",
      "iban",
      "bic",
      "cardNumber",
      "employer",
      "jobTitle",
    ].join(",");
    const rows = profiles.map((profile) =>
      [
        profile.id,
        profile.country.code,
        profile.government.taxId,
        profile.personal.fullName,
        profile.personal.birthDate,
        String(profile.personal.age),
        profile.personal.gender,
        profile.contact.email,
        profile.contact.phone,
        profile.address.formatted,
        profile.address.postalCode,
        profile.address.city,
        profile.address.region,
        profile.government.insuranceNumber,
        profile.banking.iban,
        profile.banking.bic,
        profile.banking.card.number,
        profile.employment.employer,
        profile.employment.jobTitle,
      ].map(escapeCsv).join(","),
    );
    downloadFile(
      [header, ...rows].join("\n"),
      `test-identities-${country.code.toLowerCase()}.csv`,
      "text/csv;charset=utf-8",
    );
    showToast("完整身份 CSV 已导出");
  };

  const renderSegments = (value: string, spec: CountrySpec) => {
    const compact = cleanIban(value);
    const bban = compact.slice(4);
    const beforeBank = bban.slice(0, spec.bankCodeStart);
    const bank = bban.slice(spec.bankCodeStart, spec.bankCodeStart + spec.bankCodeLen);
    const between = bban.slice(spec.bankCodeStart + spec.bankCodeLen, spec.accountStart);
    const accountValue = bban.slice(spec.accountStart, spec.accountStart + spec.accountLen);
    const after = bban.slice(spec.accountStart + spec.accountLen);
    return (
      <div className="segment-value" aria-label="IBAN 结构拆解">
        <span className="segment-country">{compact.slice(0, 2)}</span>
        <span className="segment-check">{compact.slice(2, 4)}</span>
        {beforeBank && <span className="segment-extra">{beforeBank}</span>}
        <span className="segment-bank">{bank}</span>
        {between && <span className="segment-extra">{between}</span>}
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
          <span className="version-badge">v1.0</span>
        </a>
        <div className="header-meta">
          <span className="local-badge"><i /> 100% 本地运行</span>
          <span className="standard-mark"><b>ISO</b> 13616</span>
          <a className="header-link" href="#tool">开始使用 <span>↓</span></a>
        </div>
      </header>

      <section className="intro">
        <div>
          <p className="eyebrow">COMPLETE SYNTHETIC IDENTITY · IBAN</p>
          <h1>一个身份，<em>所有测试数据。</em></h1>
          <p className="lede">选择国家、城市、性别与年龄，一次生成本地化姓名、地址、联系方式、税务与保险字段、银行账户、IBAN 和沙盒银行卡。</p>
          <div className="platform-row" aria-label="支持的部署平台">
            <span className="platform-label">DEPLOY ANYWHERE</span>
            <span className="platform-chip vercel-chip"><b>▲</b> Vercel</span>
            <span className="platform-chip cloudflare-chip"><b>☁</b> Cloudflare</span>
            <span className="platform-chip"><b>◇</b> Open Source</span>
          </div>
        </div>
        <div className="intro-stat" aria-label="性能指标">
          <span>COUNTRIES</span>
          <strong>15</strong>
          <small>one complete profile</small>
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
                <span className="step">CONFIG</span>
                <h2>生成配置</h2>
              </div>
              <span className="config-status">Ready</span>
            </div>

            <div className="field">
              <label htmlFor="country">国家 / 地区</label>
              <div className="select-wrap">
                <select id="country" value={countryCode} onChange={(event) => changeCountry(event.target.value)}>
                  {COUNTRIES.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.flag} {item.name} — {item.code}
                    </option>
                  ))}
                </select>
                <span>⌄</span>
              </div>
              <small>{country.length} 位 IBAN · 同步本地化身份字段</small>
            </div>

            <div className="field">
              <label htmlFor="identity-city">地区 / 城市</label>
              <div className="select-wrap">
                <select
                  id="identity-city"
                  value={cityChoice}
                  onChange={(event) => setCityChoice(event.target.value)}
                >
                  <option value="random">🎲 随机城市</option>
                  {identityCountry.cities.map((city) => (
                    <option key={city.name} value={city.name}>
                      {city.name} — {city.region}
                    </option>
                  ))}
                </select>
                <span>⌄</span>
              </div>
            </div>

            <div className="identity-filter-row">
              <div className="field">
                <label>性别</label>
                <div className="segmented segmented-three">
                  {GENDER_OPTIONS.map(([value, label]) => (
                    <button
                      key={value}
                      className={genderChoice === value ? "active" : ""}
                      onClick={() => setGenderChoice(value as ProfileGender | "random")}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label htmlFor="identity-age">年龄</label>
                <div className="select-wrap">
                  <select
                    id="identity-age"
                    value={ageChoice}
                    onChange={(event) =>
                      setAgeChoice(event.target.value === "random" ? "random" : Number(event.target.value))
                    }
                  >
                    <option value="random">随机 18–80</option>
                    {AGE_OPTIONS.map((age) => (
                      <option key={age} value={age}>{age} 岁</option>
                    ))}
                  </select>
                  <span>⌄</span>
                </div>
              </div>
            </div>

            <div className="field">
              <label>生成模式</label>
              <div className="segmented">
                <button className={generateMode === "single" ? "active" : ""} onClick={() => changeGenerateMode("single")}>
                  单条
                </button>
                <button className={generateMode === "batch" ? "active" : ""} onClick={() => changeGenerateMode("batch")}>
                  批量
                </button>
              </div>
            </div>

            <div className="field format-field">
              <div>
                <label htmlFor="format-toggle">显示空格</label>
                <small>{formatted ? "DE89 3704 …" : "DE893704…"}</small>
              </div>
              <button
                id="format-toggle"
                className={`toggle ${formatted ? "on" : ""}`}
                onClick={() => setFormatted(!formatted)}
                role="switch"
                aria-checked={formatted}
              >
                <span />
              </button>
            </div>

            {generateMode === "batch" && (
              <div className="field">
                <label>生成数量</label>
                <div className="count-options">
                  {[5, 10, 20, 25, 50].map((count) => (
                    <button key={count} className={batchCount === count ? "active" : ""} onClick={() => setBatchCount(count)}>
                      {count}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="advanced">
              <button className="advanced-trigger" onClick={() => setAdvancedOpen(!advancedOpen)} aria-expanded={advancedOpen}>
                <span>高级：自定义 BBAN</span>
                <b>{advancedOpen ? "−" : "+"}</b>
              </button>
              {advancedOpen && (
                <div className="advanced-fields">
                  <div className="field">
                    <label htmlFor="bank-code">{country.bankLabel}</label>
                    <input
                      id="bank-code"
                      value={bankCode}
                      maxLength={country.bankCodeLen}
                      placeholder={`最多 ${country.bankCodeLen} 位`}
                      onChange={(event) => setBankCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="account-number">Account Number</label>
                    <input
                      id="account-number"
                      value={account}
                      maxLength={country.accountLen}
                      placeholder={`最多 ${country.accountLen} 位`}
                      onChange={(event) => setAccount(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                    />
                  </div>
                  <p>留空部分将随机补齐，校验码会自动重新计算。</p>
                </div>
              )}
            </div>

            <button className="primary-action" onClick={generateMode === "single" ? regenerate : generateBatch}>
              <span>{generateMode === "single" ? "生成完整测试身份" : `生成 ${batchCount} 条完整身份`}</span>
              <b>↗</b>
            </button>
          </aside>

          <div className="result-panel identity-results">
            {generateMode === "single" ? (
              <>
                <div className="result-topline">
                  <span className="step">OUTPUT / COMPLETE IDENTITY</span>
                  <span className="valid-chip"><i /> SYNTHETIC · LOCAL</span>
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

                <div className="iban-display identity-iban-display">
                  <span className="country-tag">{country.flag} {country.code} · MOD-97 VALID</span>
                  <p>{displayIban(activeProfile.banking.iban)}</p>
                  <div className="result-actions">
                    <button onClick={() => copyText(displayIban(activeProfile.banking.iban), "IBAN 已复制")}>
                      复制 IBAN <span>⌘C</span>
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
                      <div><dt>BIC / SWIFT</dt><dd className="mono-value">{activeProfile.banking.bic}</dd></div>
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
                </div>

                <div className="structure compact-structure">
                  <div className="section-title">
                    <h3>IBAN 结构</h3>
                    <span>{activeProfile.banking.iban.length} characters</span>
                  </div>
                  {renderSegments(activeProfile.banking.iban, country)}
                  <div className="legend">
                    <span><i className="dot-country" /> 国家代码</span>
                    <span><i className="dot-check" /> 校验码</span>
                    <span><i className="dot-bank" /> 银行代码</span>
                    <span><i className="dot-account" /> 账号</span>
                  </div>
                </div>

                <div className="identity-export-bar">
                  <p><strong>一次生成，字段相互对应</strong> · 银行卡为公开沙盒测试卡，不可真实扣款</p>
                  <div>
                    <button onClick={() => copyText(countryRegex(country), "IBAN 正则已复制")}>复制正则</button>
                    <button onClick={exportJson}>JSON ↓</button>
                    <button onClick={exportCsv}>CSV ↓</button>
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
                      <p><strong>{profiles.length}</strong> 条完整身份 <span>IBAN 全部通过 MOD-97</span></p>
                      <div>
                        <button onClick={() => copyText(JSON.stringify(profiles, null, 2), "全部身份 JSON 已复制")}>复制全部</button>
                        <button onClick={exportJson}>JSON ↓</button>
                        <button onClick={exportCsv}>CSV ↓</button>
                      </div>
                    </div>
                    <div className="identity-batch-list">
                      {profiles.map((profile, index) => (
                        <article className="identity-batch-row" key={profile.id}>
                          <span>{String(index + 1).padStart(2, "0")}</span>
                          <div>
                            <strong>{profile.country.flag} {profile.personal.fullName}</strong>
                            <small>{profile.personal.age} 岁 · {profile.address.postalCode} {profile.address.city}</small>
                          </div>
                          <code>{profile.government.taxId}</code>
                          <code>{displayIban(profile.banking.iban)}</code>
                          <button
                            onClick={() => copyText(JSON.stringify(profile, null, 2), `第 ${index + 1} 条身份已复制`)}
                            aria-label={`复制第 ${index + 1} 条完整身份`}
                          >
                            ⧉
                          </button>
                        </article>
                      ))}
                    </div>
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
                <p>{validation.reason}</p>
              </div>
            </div>

            {validation.country && validation.compact.length >= 4 && (
              <>
                <div className="inspector-spec">
                  <div><span>国家</span><strong>{validation.country.flag} {validation.country.name}</strong></div>
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

      {toast && <div className="toast"><span>✓</span>{toast}</div>}
      <span className="sr-only" aria-live="polite">{toast}</span>
    </main>
  );
}
