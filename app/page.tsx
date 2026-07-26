"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_GERMAN_PROFILE,
  GERMAN_STATES,
  generateGermanTestProfile,
  validateGermanTaxId,
  type GermanGender,
  type GermanTestProfile,
} from "@/lib/german-test-data";

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
  const [tab, setTab] = useState<"generate" | "validate" | "german">("generate");
  const [generateMode, setGenerateMode] = useState<"single" | "batch">("single");
  const [countryCode, setCountryCode] = useState("DE");
  const [formatted, setFormatted] = useState(true);
  const [bankCode, setBankCode] = useState("");
  const [account, setAccount] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [iban, setIban] = useState(DEFAULT_IBAN);
  const [batchCount, setBatchCount] = useState(10);
  const [batch, setBatch] = useState<string[]>([]);
  const [validatorInput, setValidatorInput] = useState(DEFAULT_IBAN);
  const [germanCount, setGermanCount] = useState(1);
  const [germanState, setGermanState] = useState("random");
  const [germanGender, setGermanGender] = useState<GermanGender | "random">("random");
  const [germanProfiles, setGermanProfiles] = useState<GermanTestProfile[]>([
    DEFAULT_GERMAN_PROFILE,
  ]);
  const [toast, setToast] = useState("");

  const country = COUNTRY_MAP.get(countryCode) ?? COUNTRIES[0];
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
    setIban(next);
  };

  const changeCountry = (code: string) => {
    const nextCountry = COUNTRY_MAP.get(code) ?? COUNTRIES[0];
    setCountryCode(code);
    setBankCode("");
    setAccount("");
    setIban(generateIban(nextCountry));
    setBatch([]);
  };

  const generateBatch = () => {
    const next = Array.from({ length: batchCount }, () =>
      generateIban(country, bankCode, account),
    );
    setBatch(next);
    showToast(`已生成 ${batchCount} 条测试数据`);
  };

  const displayIban = (value: string) => (formatted ? formatIban(value) : value);
  const germanProfile = germanProfiles[0] ?? DEFAULT_GERMAN_PROFILE;

  const exportJson = () => {
    const data = batch.map((value, index) => ({
      id: index + 1,
      country: country.code,
      iban: formatted ? formatIban(value) : value,
      valid: true,
    }));
    downloadFile(JSON.stringify(data, null, 2), `iban-${country.code.toLowerCase()}.json`, "application/json");
    showToast("JSON 已导出");
  };

  const exportCsv = () => {
    const rows = ["id,country,iban,valid", ...batch.map((value, index) =>
      `${index + 1},${country.code},"${formatted ? formatIban(value) : value}",true`,
    )];
    downloadFile(rows.join("\n"), `iban-${country.code.toLowerCase()}.csv`, "text/csv;charset=utf-8");
    showToast("CSV 已导出");
  };

  const generateGermanProfiles = () => {
    const profiles = Array.from({ length: germanCount }, (_, index) =>
      generateGermanTestProfile(germanState, germanGender, index),
    );
    setGermanProfiles(profiles);
    showToast(`已生成 ${germanCount} 条德国测试身份`);
  };

  const exportGermanJson = () => {
    downloadFile(
      JSON.stringify(germanProfiles, null, 2),
      "german-test-identities.json",
      "application/json",
    );
    showToast("德国测试身份 JSON 已导出");
  };

  const exportGermanCsv = () => {
    const escapeCsv = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const header = [
      "id",
      "taxId",
      "firstName",
      "lastName",
      "birthDate",
      "gender",
      "birthPlace",
      "street",
      "houseNumber",
      "postalCode",
      "city",
      "state",
      "phone",
      "healthInsuranceNumber",
      "bankIban",
      "employerTaxNumber",
    ].join(",");
    const rows = germanProfiles.map((profile) =>
      [
        profile.id,
        profile.taxId,
        profile.firstName,
        profile.lastName,
        profile.birthDate,
        profile.gender,
        profile.birthPlace,
        profile.address.street,
        profile.address.houseNumber,
        profile.address.postalCode,
        profile.address.city,
        profile.address.state,
        profile.phone,
        profile.healthInsuranceNumber,
        profile.bankIban,
        profile.employerTaxNumber,
      ].map(escapeCsv).join(","),
    );
    downloadFile(
      [header, ...rows].join("\n"),
      "german-test-identities.csv",
      "text/csv;charset=utf-8",
    );
    showToast("德国测试身份 CSV 已导出");
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
          <p className="eyebrow">ISO 13616 · MOD-97</p>
          <h1>IBAN 测试数据，<em>即刻可用。</em></h1>
          <p className="lede">在浏览器内生成、批量导出并校验合法格式的 IBAN。无请求、无存储，专为开发与自动化测试设计。</p>
          <div className="platform-row" aria-label="支持的部署平台">
            <span className="platform-label">DEPLOY ANYWHERE</span>
            <span className="platform-chip vercel-chip"><b>▲</b> Vercel</span>
            <span className="platform-chip cloudflare-chip"><b>☁</b> Cloudflare</span>
            <span className="platform-chip"><b>◇</b> Open Source</span>
          </div>
        </div>
        <div className="intro-stat" aria-label="性能指标">
          <span>GENERATION</span>
          <strong>&lt; 1ms</strong>
          <small>per IBAN · local</small>
        </div>
      </section>

      <nav className="main-tabs" id="tool" aria-label="工具模式">
        <button className={tab === "generate" ? "active" : ""} onClick={() => setTab("generate")}>
          <span>01</span> 生成器
        </button>
        <button className={tab === "validate" ? "active" : ""} onClick={() => setTab("validate")}>
          <span>02</span> 校验与解析
        </button>
        <button className={tab === "german" ? "active" : ""} onClick={() => setTab("german")}>
          <span>03</span> 德国测试身份
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
              <small>{country.length} 位 · BBAN {country.bbanTemplate.length} 位</small>
            </div>

            <div className="field">
              <label>生成模式</label>
              <div className="segmented">
                <button className={generateMode === "single" ? "active" : ""} onClick={() => setGenerateMode("single")}>
                  单条
                </button>
                <button className={generateMode === "batch" ? "active" : ""} onClick={() => setGenerateMode("batch")}>
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
                  {[5, 10, 50, 100, 1000].map((count) => (
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
              <span>{generateMode === "single" ? "生成新 IBAN" : `生成 ${batchCount} 条 IBAN`}</span>
              <b>↗</b>
            </button>
          </aside>

          <div className="result-panel">
            {generateMode === "single" ? (
              <>
                <div className="result-topline">
                  <span className="step">OUTPUT / SINGLE</span>
                  <span className="valid-chip"><i /> MOD-97 VALID</span>
                </div>
                <div className="iban-display">
                  <span className="country-tag">{country.flag} {country.code}</span>
                  <p>{displayIban(iban)}</p>
                  <div className="result-actions">
                    <button onClick={() => copyText(displayIban(iban))}>复制 <span>⌘C</span></button>
                    <button className="icon-button" onClick={regenerate} aria-label="重新生成">↻</button>
                  </div>
                </div>

                <div className="structure">
                  <div className="section-title">
                    <h3>结构解析</h3>
                    <span>{iban.length} characters</span>
                  </div>
                  {renderSegments(iban, country)}
                  <div className="legend">
                    <span><i className="dot-country" /> 国家代码</span>
                    <span><i className="dot-check" /> 校验码</span>
                    <span><i className="dot-bank" /> 银行代码</span>
                    <span><i className="dot-account" /> 账号</span>
                    <span><i className="dot-extra" /> 其他 BBAN</span>
                  </div>
                </div>

                <div className="regex-card">
                  <div>
                    <span className="step">FORMAT REGEX</span>
                    <code>/{countryRegex(country)}/</code>
                  </div>
                  <button onClick={() => copyText(countryRegex(country), "正则表达式已复制")}>复制正则</button>
                </div>
              </>
            ) : (
              <>
                <div className="result-topline">
                  <span className="step">OUTPUT / BATCH</span>
                  <span className="batch-meta">{batch.length || batchCount} rows · {country.code}</span>
                </div>
                {batch.length === 0 ? (
                  <div className="empty-state">
                    <span>[ ]</span>
                    <h3>批量数据尚未生成</h3>
                    <p>选择数量后点击左侧按钮，结果会在这里出现。</p>
                  </div>
                ) : (
                  <>
                    <div className="batch-toolbar">
                      <p><strong>{batch.length}</strong> 条结果 <span>全部通过 MOD-97</span></p>
                      <div>
                        <button onClick={() => copyText(batch.map(displayIban).join("\n"), "全部 IBAN 已复制")}>复制全部</button>
                        <button onClick={exportJson}>JSON ↓</button>
                        <button onClick={exportCsv}>CSV ↓</button>
                      </div>
                    </div>
                    <div className="batch-list">
                      {batch.map((value, index) => (
                        <div className="batch-row" key={`${value}-${index}`}>
                          <span>{String(index + 1).padStart(2, "0")}</span>
                          <code>{displayIban(value)}</code>
                          <button onClick={() => copyText(displayIban(value))} aria-label={`复制第 ${index + 1} 条`}>⧉</button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </section>
      ) : tab === "validate" ? (
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
      ) : (
        <section className="workspace identity-workspace">
          <aside className="config-panel">
            <div className="panel-heading">
              <div>
                <span className="step">DE TEST DATA</span>
                <h2>身份生成配置</h2>
              </div>
              <span className="config-status">Local</span>
            </div>

            <div className="field">
              <label htmlFor="german-state">指定联邦州</label>
              <div className="select-wrap">
                <select
                  id="german-state"
                  value={germanState}
                  onChange={(event) => setGermanState(event.target.value)}
                >
                  <option value="random">🎲 随机联邦州</option>
                  {GERMAN_STATES.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name} — {state.code}
                    </option>
                  ))}
                </select>
                <span>⌄</span>
              </div>
              <small>覆盖德国全部 16 个联邦州</small>
            </div>

            <div className="field">
              <label>性别</label>
              <div className="segmented segmented-three">
                {[
                  ["random", "随机"],
                  ["female", "女性"],
                  ["male", "男性"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    className={germanGender === value ? "active" : ""}
                    onClick={() => setGermanGender(value as GermanGender | "random")}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>生成数量</label>
              <div className="count-options">
                {[1, 5, 10, 25, 50].map((count) => (
                  <button
                    key={count}
                    className={germanCount === count ? "active" : ""}
                    onClick={() => setGermanCount(count)}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            <div className="identity-algorithm">
              <span className="step">CHECKSUM</span>
              <strong>ISO/IEC 7064</strong>
              <p>Steuer-ID 使用 MOD 11,10 校验；德国 IBAN 使用 MOD-97 校验。</p>
            </div>

            <button className="primary-action" onClick={generateGermanProfiles}>
              <span>生成 {germanCount} 条测试身份</span>
              <b>↗</b>
            </button>
          </aside>

          <div className="result-panel identity-results">
            <div className="result-topline">
              <span className="step">
                OUTPUT / {germanProfiles.length === 1 ? "PROFILE" : "BATCH"}
              </span>
              <span className="valid-chip"><i /> SYNTHETIC DATA</span>
            </div>

            {germanProfiles.length === 1 ? (
              <>
                <div className="tax-id-hero">
                  <div>
                    <span>STEUERLICHE IDENTIFIKATIONSNUMMER</span>
                    <p>{germanProfile.taxId}</p>
                  </div>
                  <div className="tax-id-actions">
                    <span className={validateGermanTaxId(germanProfile.taxId) ? "verified" : ""}>
                      ✓ MOD 11,10
                    </span>
                    <button onClick={() => copyText(germanProfile.taxId, "Steuer-ID 已复制")}>
                      复制税号
                    </button>
                    <button onClick={generateGermanProfiles} aria-label="重新生成德国测试身份">↻</button>
                  </div>
                </div>

                <div className="profile-heading">
                  <div className="profile-avatar">
                    {germanProfile.firstName[0]}{germanProfile.lastName[0]}
                  </div>
                  <div>
                    <span>TEST PERSON</span>
                    <h2>{germanProfile.firstName} {germanProfile.lastName}</h2>
                    <p>{germanProfile.address.city} · {germanProfile.address.state}</p>
                  </div>
                  <button
                    onClick={() =>
                      copyText(JSON.stringify(germanProfile, null, 2), "完整 JSON 已复制")
                    }
                  >
                    复制 JSON
                  </button>
                </div>

                <div className="profile-grid">
                  <article className="profile-card">
                    <div className="profile-card-title"><span>01</span><h3>个人信息</h3></div>
                    <dl>
                      <div><dt>出生日期</dt><dd>{germanProfile.birthDate}</dd></div>
                      <div><dt>性别</dt><dd>{germanProfile.gender === "female" ? "weiblich" : "männlich"}</dd></div>
                      <div><dt>出生地</dt><dd>{germanProfile.birthPlace}</dd></div>
                    </dl>
                  </article>

                  <article className="profile-card">
                    <div className="profile-card-title"><span>02</span><h3>地址与联系</h3></div>
                    <dl>
                      <div><dt>地址</dt><dd>{germanProfile.address.street} {germanProfile.address.houseNumber}</dd></div>
                      <div><dt>城市邮编</dt><dd>{germanProfile.address.postalCode} {germanProfile.address.city}</dd></div>
                      <div><dt>手机号码</dt><dd>{germanProfile.phone}</dd></div>
                    </dl>
                  </article>

                  <article className="profile-card">
                    <div className="profile-card-title"><span>03</span><h3>银行与保险</h3></div>
                    <dl>
                      <div><dt>德国 IBAN</dt><dd className="mono-value">{formatIban(germanProfile.bankIban)}</dd></div>
                      <div><dt>IBAN 校验</dt><dd className="positive-value">MOD-97 通过</dd></div>
                      <div><dt>保险测试号</dt><dd>{germanProfile.healthInsuranceNumber}</dd></div>
                    </dl>
                  </article>

                  <article className="profile-card">
                    <div className="profile-card-title"><span>04</span><h3>雇主测试数据</h3></div>
                    <dl>
                      <div><dt>联邦州</dt><dd>{germanProfile.address.state}</dd></div>
                      <div><dt>标准税号</dt><dd className="mono-value">{germanProfile.employerTaxNumber}</dd></div>
                      <div><dt>数据标识</dt><dd>{germanProfile.id}</dd></div>
                    </dl>
                  </article>
                </div>

                <div className="identity-export-bar">
                  <p><strong>仅供开发测试</strong> · 所有字段均由浏览器即时合成</p>
                  <div>
                    <button onClick={exportGermanJson}>JSON ↓</button>
                    <button onClick={exportGermanCsv}>CSV ↓</button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="batch-toolbar identity-batch-toolbar">
                  <p><strong>{germanProfiles.length}</strong> 条德国测试身份 <span>Steuer-ID 校验通过</span></p>
                  <div>
                    <button onClick={() => copyText(JSON.stringify(germanProfiles, null, 2), "全部数据已复制")}>
                      复制全部
                    </button>
                    <button onClick={exportGermanJson}>JSON ↓</button>
                    <button onClick={exportGermanCsv}>CSV ↓</button>
                  </div>
                </div>
                <div className="identity-batch-list">
                  {germanProfiles.map((profile, index) => (
                    <article key={profile.id} className="identity-batch-row">
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <strong>{profile.firstName} {profile.lastName}</strong>
                        <small>{profile.address.postalCode} {profile.address.city}</small>
                      </div>
                      <code>{profile.taxId}</code>
                      <code>{formatIban(profile.bankIban)}</code>
                      <button
                        onClick={() => copyText(JSON.stringify(profile, null, 2), `第 ${index + 1} 条 JSON 已复制`)}
                        aria-label={`复制第 ${index + 1} 条德国测试身份`}
                      >
                        ⧉
                      </button>
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      <footer>
        <div className="footer-mark">IB</div>
        <p>本工具生成的 IBAN 与德国身份字段仅供软件开发、测试和教学使用。格式与校验码通过不代表真实银行账户、真实个人或官方签发记录。</p>
        <a href="https://github.com/tianrking/iban-devtools" target="_blank" rel="noreferrer">SOURCE ON GITHUB ↗</a>
      </footer>

      {toast && <div className="toast"><span>✓</span>{toast}</div>}
      <span className="sr-only" aria-live="polite">{toast}</span>
    </main>
  );
}
