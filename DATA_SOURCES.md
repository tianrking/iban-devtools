# Data sources and accuracy

IBAN DevTools generates synthetic software-test fixtures. It does not claim that
generated people, addresses, tax identifiers, insurance identifiers, bank
accounts, cards, companies, or employment records exist.

## IBAN formats

National IBAN structures are based on the
[SWIFT IBAN Registry](https://www.swift.com/swift-resource/9606/download?language=en)
release named in `lib/iban-core.ts`. SWIFT is the official ISO 13616
registration authority.
The app currently implements 89 registered IBAN country/area formats. The other
selectable markets are not presented as IBAN markets.
Bank and branch identifiers are exposed separately only where Release 102
publishes a non-empty branch position and length (32 formats); nearby BBAN
components are not guessed to be branches.

The current SEPA filter is maintained separately from the IBAN format registry
and follows the European Payments Council's
[List of SEPA Scheme Countries v8.0](https://www.europeanpaymentscouncil.eu/sites/default/files/kb/file/2025-12/EPC409-09%20EPC%20List%20of%20SEPA%20Scheme%20Countries%20v8.0.pdf),
published `2025-12-24`.

Passing the structural and MOD-97 checks only proves that a value is
algorithmically well formed. It does not prove that a bank or account exists.

## Worldwide geographic directory

The selectable worldwide country, region, and city directory is derived from the
[Countries States Cities Database](https://github.com/dr5hn/countries-states-cities-database),
release `v3.2-export.6`, and is redistributed under the
[Open Database License 1.0](https://opendatacommons.org/licenses/odbl/1-0/).
The pinned snapshot contains:

- 249 [ISO 3166-1](https://www.iso.org/iso-3166-country-codes.html)
  country/area entries;
- Kosovo under the user-assigned code `XK`, for 250 selectable markets in total;
- 5,308 region/state/province records;
- 152,970 city records;
- 223 markets with at least one city record and 27 without city records.

The app ships a reduced, country-split derivative under `public/data/world/`.
Only the selected country's file is fetched by the browser. The generated
country metadata is stored in `lib/world-country-data.generated.ts`, and both
outputs are rebuilt with:

```bash
npm run geo:world
```

The underlying command is `scripts/build-world-geo-data.mjs`.
The generator pins and verifies the compressed source SHA-256
`c93ad3c0eeab9e11850020d214a0c25ee2b97113d637d052ffa3064860b0e234`
before writing any derivative files.

These numbers describe complete coverage of the pinned community snapshot, not
an official or exhaustive list of every settlement in the world. The source is
not a live government administrative register. Boundaries, administrative
levels, names, spelling, time zones, and city coverage can change or contain
errors. A city being present or absent is not an official statement. Markets
without city rows remain selectable but must use an explicitly synthetic
locality fallback.

The 27 entries without city rows in this pinned snapshot are:
`AI`, `AQ`, `BV`, `CC`, `CK`, `CW`, `CX`, `EH`, `FK`, `GI`, `GS`, `HM`, `IO`,
`MO`, `MP`, `MS`, `NF`, `NU`, `PN`, `SH`, `SJ`, `SX`, `TC`, `TK`, `UM`, `VA`,
and `VG`. Several are territories, remote islands, or polar areas; absence here
means only that the chosen upstream release contains no city rows for the
entry.

The geographic snapshot supplies country, region, and city names and time-zone
references. It does not establish a verified street or postal-code relationship
for each city. Generated street names, house numbers, and postal codes remain
synthetic fixtures. A result containing a real city or region name must not be
interpreted as a real or deliverable address.

## Country names and currencies

Chinese country/area display names are generated from the runtime's standard
region-name data instead of trusting the community source's translations.
Available currencies are derived from
[SIX ISO 4217 List One](https://www.six-group.com/en/products-services/financial-information/market-reference-data/data-standards.html),
published `2026-01-01`. SIX is the ISO 4217 Maintenance Agency. The pinned XML
SHA-256 is
`838dfb991648cf36df939edd5fe3811737962b75a32252847d239cedd1e291c9`.
For entities with multiple listed currencies, the default follows the country
directory's local preference only when that code is present in the SIX list;
users can explicitly select any listed alternative. SIX does not designate a
"primary" currency through XML ordering.
Kosovo is not an ISO 3166-1 assigned entry and uses the explicit project mapping
`XK → EUR`.

## National payment identifiers

Payment identifiers use explicit accuracy tiers:

1. **Registry structure and checksum**: the 89 IBAN formats use their registered
   national BBAN structures and MOD-97; United States ABA routing values,
   Mexico CLABE values, and Argentina CBU values use their implemented
   check-digit algorithms.
2. **Country-routed format fixture**: Canada plus the Australian BSB, Indian
   IFSC, China CNAPS, Japan Zengin, Hong Kong clearing-code, New Zealand,
   Singapore, and South African fixtures use country-specific routing labels
   and reviewed routing-component shapes. Their account lengths are
   bank-specific in reality and are project fixture choices, not claimed
   national account-length standards. Every value is marked `format-only`.
3. **Generic local fixture**: where no reviewed national format is implemented,
   the app emits a clearly labelled synthetic local account value and makes no
   national-format or checksum claim.

At this release the three tiers cover 92 checksum markets (89 IBAN plus `US`,
`MX`, and `AR`), 9 country-specific `format-only` markets, and 149 generic local
fixture markets. These counts are enforced by the automated coverage tests.

No generated routing, branch, institution, IBAN, CLABE, or local account value
is checked against a live bank directory. A checksum-valid result proves only
the implemented mathematical structure, not that an institution or account
exists.

Argentina CBU structure and both check digits follow the
[Banco Central de la República Argentina specification](https://www.bcra.gob.ar/archivos/Pdfs/Texord/t-snp-spd.pdf).

Names, streets, postal codes, phone numbers, tax identifiers, insurance
identifiers, identity documents, companies, and employment records are
synthetic fixtures. Where a country-specific algorithm is not implemented, the
field is explicitly marked `format-only` or synthetic.
