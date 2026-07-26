import type { SyntheticIdentity } from "./global-test-data.ts";

export type ExportFormat =
  | "json"
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
}> = [
  { value: "json", label: "JSON", extension: "json", mime: "application/json" },
  { value: "csv", label: "CSV", extension: "csv", mime: "text/csv;charset=utf-8" },
  { value: "typescript", label: "TypeScript", extension: "ts", mime: "text/typescript" },
  { value: "zod", label: "Zod Schema", extension: "ts", mime: "text/typescript" },
  { value: "json-schema", label: "JSON Schema", extension: "schema.json", mime: "application/schema+json" },
  { value: "playwright", label: "Playwright fixture", extension: "ts", mime: "text/typescript" },
  { value: "cypress", label: "Cypress fixture", extension: "json", mime: "application/json" },
  { value: "postman", label: "Postman Environment", extension: "postman_environment.json", mime: "application/json" },
  { value: "env", label: ".env", extension: "env", mime: "text/plain" },
  { value: "sql", label: "SQL INSERT", extension: "sql", mime: "application/sql" },
  { value: "python", label: "Python fixture", extension: "py", mime: "text/x-python" },
];

function csvEscape(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function sqlEscape(value: unknown) {
  return `'${String(value ?? "").replaceAll("'", "''")}'`;
}

function profileRows(profiles: SyntheticIdentity[]) {
  return profiles.map((profile) => ({
    id: profile.id,
    scenario: profile.meta.scenario,
    country: profile.country.code,
    fullName: profile.personal.fullName,
    birthDate: profile.personal.birthDate,
    age: profile.personal.age,
    gender: profile.personal.gender,
    email: profile.contact.email,
    phone: profile.contact.phone,
    address: profile.address.formatted,
    postalCode: profile.address.postalCode,
    city: profile.address.city,
    region: profile.address.region,
    taxId: profile.government.taxId,
    insuranceNumber: profile.government.insuranceNumber,
    iban: profile.banking.iban,
    bic: profile.banking.bic,
    currency: profile.banking.currency,
    cardNumber: profile.banking.card.number,
    employer: profile.employment.employer,
    jobTitle: profile.employment.jobTitle,
    endToEndId: profile.payment.endToEndId,
    creditorReference: profile.payment.creditorReference,
  }));
}

const TYPESCRIPT_INTERFACE = `export interface SyntheticIdentity {
  id: string;
  meta: { schemaVersion: "2.0"; scenario: string; seed: string | null; quality: "synthetic-test-data" };
  country: { code: string; name: string; flag: string };
  personal: { fullName: string; gender: "male" | "female"; age: number; birthDate: string; documentNumber: string; passportNumber: string; locale: string; timezone: string };
  contact: { email: string; phone: string };
  address: { formatted: string; postalCode: string; city: string; region: string; country: string };
  government: { taxLabel: string; taxId: string; taxStatus: "checksum-valid" | "format-only"; insuranceLabel: string; insuranceNumber: string };
  banking: { bankName: string; iban: string; bic: string; currency: string; accountType: "checking" | "savings"; card: { number: string; expiry: string; cvc: string } };
  payment: { scheme: "SCT" | "LOCAL"; amount: number; currency: string; endToEndId: string; creditorReference: string; purposeCode: string; verificationOfPayee: string };
}`;

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
  banking: z.object({ iban: z.string(), bic: z.string(), currency: z.string().length(3), accountType: z.enum(["checking", "savings"]) }).passthrough(),
  payment: z.object({ scheme: z.enum(["SCT", "LOCAL"]), amount: z.number(), currency: z.string(), endToEndId: z.string(), creditorReference: z.string(), purposeCode: z.string(), verificationOfPayee: z.string() }).passthrough(),
}).passthrough();

export const fixtures = syntheticIdentitySchema.array().parse(${JSON.stringify(profiles, null, 2)});`;
}

function jsonSchemaExport() {
  return JSON.stringify({
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "IBAN DevTools Synthetic Identity",
    type: "object",
    required: ["id", "meta", "country", "personal", "contact", "address", "government", "banking", "payment"],
    properties: {
      id: { type: "string" },
      meta: { type: "object", properties: { schemaVersion: { const: "2.0" }, scenario: { type: "string" }, seed: { type: ["string", "null"] }, quality: { const: "synthetic-test-data" } } },
      country: { type: "object", properties: { code: { type: "string", minLength: 2, maxLength: 2 }, name: { type: "string" } } },
      personal: { type: "object", properties: { fullName: { type: "string" }, gender: { enum: ["male", "female"] }, age: { type: "integer", minimum: 18, maximum: 80 }, birthDate: { type: "string", format: "date" } } },
      contact: { type: "object", properties: { email: { type: "string", format: "email" }, phone: { type: "string" } } },
      address: { type: "object" },
      government: { type: "object" },
      banking: { type: "object", properties: { iban: { type: "string" }, bic: { type: "string" }, currency: { type: "string" } } },
      payment: { type: "object" },
    },
  }, null, 2);
}

export function exportProfiles(
  profiles: SyntheticIdentity[],
  format: ExportFormat,
) {
  const rows = profileRows(profiles);
  if (format === "json") return JSON.stringify(profiles, null, 2);
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
    return `${TYPESCRIPT_INTERFACE}\n\nexport const fixtures: SyntheticIdentity[] = ${JSON.stringify(profiles, null, 2)};\n`;
  }
  if (format === "zod") return zodExport(profiles);
  if (format === "json-schema") return jsonSchemaExport();
  if (format === "playwright") {
    return `import { test as base } from "@playwright/test";\n\n${TYPESCRIPT_INTERFACE}\n\nconst identities = ${JSON.stringify(profiles, null, 2)} satisfies SyntheticIdentity[];\n\nexport const test = base.extend<{ identity: SyntheticIdentity }>({\n  identity: async ({}, use, testInfo) => {\n    await use(identities[testInfo.workerIndex % identities.length]);\n  },\n});\n`;
  }
  if (format === "cypress") return JSON.stringify({ identities: profiles }, null, 2);
  if (format === "postman") {
    const profile = profiles[0];
    return JSON.stringify({
      name: "IBAN DevTools Synthetic Identity",
      values: [
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
      `TEST_IDENTITY_ID=${profile?.id ?? ""}`,
      `TEST_FULL_NAME=${profile?.personal.fullName ?? ""}`,
      `TEST_EMAIL=${profile?.contact.email ?? ""}`,
      `TEST_IBAN=${profile?.banking.iban ?? ""}`,
      `TEST_BIC=${profile?.banking.bic ?? ""}`,
      `TEST_TAX_ID=${profile?.government.taxId ?? ""}`,
      `TEST_END_TO_END_ID=${profile?.payment.endToEndId ?? ""}`,
    ].join("\n");
  }
  if (format === "sql") {
    const values = rows.map((row) =>
      `(${[
        row.id,
        row.country,
        row.fullName,
        row.email,
        row.iban,
        row.bic,
        row.taxId,
        row.address,
      ].map(sqlEscape).join(", ")})`,
    );
    return `INSERT INTO synthetic_identities\n  (id, country_code, full_name, email, iban, bic, tax_id, formatted_address)\nVALUES\n  ${values.join(",\n  ")};\n`;
  }
  return `# Generated by IBAN DevTools\nidentities = ${JSON.stringify(profiles, null, 2).replaceAll("null", "None").replaceAll("true", "True").replaceAll("false", "False")}\n`;
}

export function exportFileMetadata(format: ExportFormat) {
  return EXPORT_FORMATS.find((item) => item.value === format) ?? EXPORT_FORMATS[0];
}
