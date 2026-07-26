import type { SyntheticIdentity } from "./global-test-data.ts";

export type ExportFormat =
  | "json"
  | "ndjson"
  | "csv"
  | "typescript"
  | "zod"
  | "json-schema"
  | "playwright"
  | "cypress"
  | "postman"
  | "env"
  | "sql"
  | "python";

export const EXPORT_FORMATS: Array<{
  value: ExportFormat;
  label: string;
  extension: string;
  mime: string;
  description: string;
}> = [
  { value: "json", label: "JSON", extension: "json", mime: "application/json", description: "完整嵌套数据，推荐 API 与通用测试" },
  { value: "ndjson", label: "NDJSON", extension: "ndjson", mime: "application/x-ndjson", description: "每行一条完整身份，适合流式导入" },
  { value: "csv", label: "CSV", extension: "csv", mime: "text/csv;charset=utf-8", description: "完整字段扁平化，适合表格和数据仓库" },
  { value: "typescript", label: "TypeScript", extension: "ts", mime: "text/typescript", description: "带自动推导类型的 fixtures" },
  { value: "zod", label: "Zod Schema", extension: "ts", mime: "text/typescript", description: "Schema 与整批 fixtures" },
  { value: "json-schema", label: "JSON Schema", extension: "schema.json", mime: "application/schema+json", description: "批次数组结构校验 Schema" },
  { value: "playwright", label: "Playwright fixture", extension: "ts", mime: "text/typescript", description: "按 worker 自动分配完整身份" },
  { value: "cypress", label: "Cypress fixture", extension: "json", mime: "application/json", description: "可直接放入 cypress/fixtures" },
  { value: "postman", label: "Postman Environment", extension: "postman_environment.json", mime: "application/json", description: "首条快捷变量与整批 JSON" },
  { value: "env", label: ".env", extension: "env", mime: "text/plain", description: "首条变量与整批 JSON 环境值" },
  { value: "sql", label: "SQL INSERT", extension: "sql", mime: "application/sql", description: "关键列与完整 JSON 文档" },
  { value: "python", label: "Python fixture", extension: "py", mime: "text/x-python", description: "标准库可直接载入的完整列表" },
];

function csvEscape(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function sqlEscape(value: unknown) {
  return `'${String(value ?? "").replaceAll("'", "''")}'`;
}

function dotenvEscape(value: string) {
  return `"${value
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\n", "\\n")}"`;
}

function profileRows(profiles: SyntheticIdentity[]) {
  return profiles.map((profile) => ({
    id: profile.id,
    schemaVersion: profile.meta.schemaVersion,
    scenario: profile.meta.scenario,
    seed: profile.meta.seed,
    quality: profile.meta.quality,
    countryCode: profile.country.code,
    countryName: profile.country.name,
    countryFlag: profile.country.flag,
    firstName: profile.personal.firstName,
    lastName: profile.personal.lastName,
    fullName: profile.personal.fullName,
    gender: profile.personal.gender,
    age: profile.personal.age,
    birthDate: profile.personal.birthDate,
    birthPlace: profile.personal.birthPlace,
    documentNumber: profile.personal.documentNumber,
    passportNumber: profile.personal.passportNumber,
    username: profile.personal.username,
    testPassword: profile.personal.testPassword,
    locale: profile.personal.locale,
    language: profile.personal.language,
    timezone: profile.personal.timezone,
    kycRiskLevel: profile.personal.kycRiskLevel,
    email: profile.contact.email,
    phone: profile.contact.phone,
    street: profile.address.street,
    houseNumber: profile.address.houseNumber,
    postalCode: profile.address.postalCode,
    city: profile.address.city,
    region: profile.address.region,
    addressCountry: profile.address.country,
    formattedAddress: profile.address.formatted,
    taxLabel: profile.government.taxLabel,
    taxId: profile.government.taxId,
    taxStatus: profile.government.taxStatus,
    insuranceLabel: profile.government.insuranceLabel,
    insuranceNumber: profile.government.insuranceNumber,
    bankName: profile.banking.bankName,
    iban: profile.banking.iban,
    paymentIdentifierScheme: profile.banking.paymentIdentifier.scheme,
    paymentIdentifierLabel: profile.banking.paymentIdentifier.label,
    paymentIdentifier: profile.banking.paymentIdentifier.value,
    routingNumber: profile.banking.paymentIdentifier.routingNumber,
    institutionCode: profile.banking.paymentIdentifier.institutionCode,
    branchCode: profile.banking.paymentIdentifier.branchCode,
    paymentIdentifierValidation: profile.banking.paymentIdentifier.validation,
    accountNumber: profile.banking.accountNumber,
    bic: profile.banking.bic,
    currency: profile.banking.currency,
    accountType: profile.banking.accountType,
    cardLabel: profile.banking.card.label,
    cardNumber: profile.banking.card.number,
    cardExpiry: profile.banking.card.expiry,
    cardCvc: profile.banking.card.cvc,
    employer: profile.employment.employer,
    jobTitle: profile.employment.jobTitle,
    employeeId: profile.employment.employeeId,
    annualSalary: profile.employment.annualSalary,
    contractStartDate: profile.employment.contractStartDate,
    companyName: profile.business.companyName,
    vatId: profile.business.vatId,
    registrationNumber: profile.business.registrationNumber,
    paymentScheme: profile.payment.scheme,
    paymentAmount: profile.payment.amount,
    paymentCurrency: profile.payment.currency,
    endToEndId: profile.payment.endToEndId,
    creditorReference: profile.payment.creditorReference,
    purposeCode: profile.payment.purposeCode,
    remittanceInformation: profile.payment.remittanceInformation,
    verificationOfPayee: profile.payment.verificationOfPayee,
    paymentStreetName: profile.payment.structuredAddress.streetName,
    paymentBuildingNumber: profile.payment.structuredAddress.buildingNumber,
    paymentPostCode: profile.payment.structuredAddress.postCode,
    paymentTownName: profile.payment.structuredAddress.townName,
    paymentCountrySubdivision:
      profile.payment.structuredAddress.countrySubdivision,
    paymentCountry: profile.payment.structuredAddress.country,
    profileJson: JSON.stringify(profile),
  }));
}

function zodExport(profiles: SyntheticIdentity[]) {
  return `import { z } from "zod";

export const syntheticIdentitySchema = z.object({
  id: z.string(),
  meta: z.object({
    schemaVersion: z.literal("2.0"),
    scenario: z.string(),
    seed: z.string().nullable(),
    quality: z.literal("synthetic-test-data"),
  }),
  country: z.object({ code: z.string().length(2), name: z.string(), flag: z.string() }),
  personal: z.object({
    fullName: z.string(),
    gender: z.enum(["male", "female"]),
    age: z.number().int().min(18).max(80),
    birthDate: z.string(),
    documentNumber: z.string(),
    passportNumber: z.string(),
    locale: z.string(),
    timezone: z.string(),
  }).passthrough(),
  contact: z.object({ email: z.string().email(), phone: z.string() }),
  address: z.object({ formatted: z.string(), postalCode: z.string(), city: z.string(), region: z.string(), country: z.string() }).passthrough(),
  government: z.object({ taxLabel: z.string(), taxId: z.string(), taxStatus: z.enum(["checksum-valid", "format-only"]), insuranceLabel: z.string(), insuranceNumber: z.string() }),
  banking: z.object({
    iban: z.string(),
    paymentIdentifier: z.object({
      scheme: z.enum(["IBAN", "ABA", "CACPA", "CLABE", "LOCAL"]),
      label: z.string(),
      value: z.string(),
      validation: z.enum(["checksum-valid", "format-only", "negative-test-case"]),
    }).passthrough(),
    bic: z.string(),
    currency: z.string().length(3),
    accountType: z.enum(["checking", "savings"]),
  }).passthrough(),
  payment: z.object({ scheme: z.enum(["SCT", "LOCAL"]), amount: z.number(), currency: z.string(), endToEndId: z.string(), creditorReference: z.string(), purposeCode: z.string(), verificationOfPayee: z.string() }).passthrough(),
}).passthrough();

export const fixtures = syntheticIdentitySchema.array().parse(${JSON.stringify(profiles, null, 2)});`;
}

function jsonSchemaExport() {
  return JSON.stringify({
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "IBAN DevTools Synthetic Identity Batch",
    type: "array",
    items: { $ref: "#/$defs/syntheticIdentity" },
    $defs: {
      syntheticIdentity: {
        type: "object",
        additionalProperties: true,
        required: [
          "id",
          "meta",
          "country",
          "personal",
          "contact",
          "address",
          "government",
          "banking",
          "employment",
          "business",
          "payment",
        ],
        properties: {
          id: { type: "string" },
          meta: {
            type: "object",
            properties: {
              schemaVersion: { const: "2.0" },
              scenario: { type: "string" },
              seed: { type: ["string", "null"] },
              quality: { const: "synthetic-test-data" },
            },
          },
          country: {
            type: "object",
            properties: {
              code: { type: "string", minLength: 2, maxLength: 2 },
              name: { type: "string" },
            },
          },
          personal: {
            type: "object",
            properties: {
              fullName: { type: "string" },
              gender: { enum: ["male", "female"] },
              age: { type: "integer", minimum: 18, maximum: 80 },
              birthDate: { type: "string", format: "date" },
              documentNumber: { type: "string" },
              passportNumber: { type: "string" },
              kycRiskLevel: { enum: ["low", "medium", "high"] },
            },
          },
          contact: {
            type: "object",
            properties: {
              email: { type: "string", format: "email" },
              phone: { type: "string" },
            },
          },
          address: { type: "object" },
          government: { type: "object" },
          banking: {
            type: "object",
            properties: {
              iban: { type: "string" },
              paymentIdentifier: {
                type: "object",
                properties: {
                  scheme: { enum: ["IBAN", "ABA", "CACPA", "CLABE", "LOCAL"] },
                  label: { type: "string" },
                  value: { type: "string" },
                  validation: {
                    enum: ["checksum-valid", "format-only", "negative-test-case"],
                  },
                },
              },
              bic: { type: "string" },
              currency: { type: "string" },
            },
          },
          employment: { type: "object" },
          business: { type: "object" },
          payment: { type: "object" },
        },
      },
    },
  }, null, 2);
}

export function exportProfiles(
  profiles: SyntheticIdentity[],
  format: ExportFormat,
) {
  const rows = profileRows(profiles);
  if (format === "json") return JSON.stringify(profiles, null, 2);
  if (format === "ndjson") {
    return `${profiles.map((profile) => JSON.stringify(profile)).join("\n")}\n`;
  }
  if (format === "csv") {
    const keys = Object.keys(rows[0] ?? {});
    return [
      keys.join(","),
      ...rows.map((row) =>
        keys.map((key) => csvEscape(row[key as keyof typeof row])).join(","),
      ),
    ].join("\n");
  }
  if (format === "typescript") {
    return `export const fixtures = ${JSON.stringify(profiles, null, 2)} as const;

export type SyntheticIdentity = (typeof fixtures)[number];
`;
  }
  if (format === "zod") return zodExport(profiles);
  if (format === "json-schema") return jsonSchemaExport();
  if (format === "playwright") {
    return `import { test as base } from "@playwright/test";

const identities = ${JSON.stringify(profiles, null, 2)} as const;
type SyntheticIdentity = (typeof identities)[number];

export const test = base.extend<{ identity: SyntheticIdentity }>({
  identity: async ({}, use, testInfo) => {
    await use(identities[testInfo.workerIndex % identities.length]);
  },
});
`;
  }
  if (format === "cypress") return JSON.stringify({ identities: profiles }, null, 2);
  if (format === "postman") {
    const profile = profiles[0];
    return JSON.stringify({
      name: "IBAN DevTools Synthetic Identity",
      values: [
        ["identity_count", String(profiles.length)],
        ["identities_json", JSON.stringify(profiles)],
        ["identity_id", profile?.id],
        ["full_name", profile?.personal.fullName],
        ["email", profile?.contact.email],
        ["iban", profile?.banking.iban],
        ["bic", profile?.banking.bic],
        ["tax_id", profile?.government.taxId],
        ["end_to_end_id", profile?.payment.endToEndId],
      ].map(([key, value]) => ({ key, value, enabled: true, type: "default" })),
      _postman_variable_scope: "environment",
      _postman_exported_using: "IBAN DevTools",
    }, null, 2);
  }
  if (format === "env") {
    const profile = profiles[0];
    return [
      `TEST_IDENTITY_COUNT=${profiles.length}`,
      `TEST_IDENTITIES_JSON=${dotenvEscape(JSON.stringify(profiles))}`,
      `TEST_IDENTITY_ID=${profile?.id ?? ""}`,
      `TEST_FULL_NAME=${dotenvEscape(profile?.personal.fullName ?? "")}`,
      `TEST_EMAIL=${dotenvEscape(profile?.contact.email ?? "")}`,
      `TEST_IBAN=${profile?.banking.iban ?? ""}`,
      `TEST_BIC=${profile?.banking.bic ?? ""}`,
      `TEST_TAX_ID=${profile?.government.taxId ?? ""}`,
      `TEST_END_TO_END_ID=${profile?.payment.endToEndId ?? ""}`,
    ].join("\n");
  }
  if (format === "sql") {
    const values = profiles.map((profile) =>
      `(${[
        profile.id,
        profile.country.code,
        profile.personal.fullName,
        profile.contact.email,
        profile.banking.iban,
        profile.banking.bic,
        profile.government.taxId,
        profile.address.formatted,
        JSON.stringify(profile),
      ].map(sqlEscape).join(", ")})`,
    );
    return `INSERT INTO synthetic_identities
  (id, country_code, full_name, email, iban, bic, tax_id, formatted_address, profile_json)
VALUES
  ${values.join(",\n  ")};
`;
  }
  return `# Generated by IBAN DevTools
import json

identities = json.loads(r'''${JSON.stringify(profiles)}''')
`;
}

export function exportFileMetadata(format: ExportFormat) {
  return EXPORT_FORMATS.find((item) => item.value === format) ?? EXPORT_FORMATS[0];
}
