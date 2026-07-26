import { readFile } from "node:fs/promises";

const registryUrl =
  "https://www.swift.com/standards/data-standards/iban-international-bank-account-number";
const source = await readFile(new URL("../lib/iban-core.ts", import.meta.url), "utf8");
const localRelease = source.match(/Release\s+(\d+)/i)?.[1];

if (!localRelease) {
  throw new Error("Unable to read the local SWIFT registry release.");
}

const response = await fetch(registryUrl, {
  headers: { "User-Agent": "iban-devtools-registry-check/2.0" },
});
if (!response.ok) {
  throw new Error(`SWIFT registry check failed with HTTP ${response.status}.`);
}

const page = await response.text();
const releases = [...page.matchAll(/release[^0-9]{0,20}(\d{2,4})/gi)].map(
  (match) => Number(match[1]),
);
const remoteRelease = Math.max(...releases.filter((value) => value < 1000));

if (Number.isFinite(remoteRelease) && remoteRelease > Number(localRelease)) {
  throw new Error(
    `IBAN registry update available: local release ${localRelease}, remote release ${remoteRelease}.`,
  );
}

process.stdout.write(
  `Local IBAN registry release ${localRelease}; no newer numbered release detected.\n`,
);
