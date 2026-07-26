# Data sources and accuracy

IBAN DevTools generates synthetic software-test fixtures. It does not claim that
generated people, addresses, tax identifiers, insurance identifiers, bank
accounts, cards, companies, or employment records exist.

## IBAN formats

National IBAN structures are based on the SWIFT IBAN Registry release named in
`lib/iban-core.ts`. SWIFT is the official ISO 13616 registration authority.
Passing the structural and MOD-97 checks only proves that a value is
algorithmically well formed. It does not prove that a bank or account exists.

## Americas geographic directory

The selectable Americas region/city directory is derived from the
[Countries States Cities Database](https://github.com/dr5hn/countries-states-cities-database),
release `v3.2-export.6`, and is redistributed under the
[Open Database License 1.0](https://opendatacommons.org/licenses/odbl/1-0/).
The app ships a country-split, reduced derivative containing region names, city
names, and time zones. The build script is
`scripts/build-americas-geo-data.mjs`.

This is a broad, community-maintained reference dataset, not a live government
administrative register. Boundaries, naming, spelling, and city coverage can
change or contain errors. A city being present or absent is not an official
statement.

## National payment identifiers

- United States: generated routing numbers use the nine-digit ABA checksum
  structure. They are synthetic and are not checked against the Federal Reserve
  routing directory.
- Canada: generated electronic routing values use
  `0 + institution number (3) + branch transit number (5)`. They are
  format-only synthetic values.
- Mexico: generated CLABE values use the 18-digit structure and check-digit
  algorithm. They are synthetic and are not checked against a bank directory.
- Other non-IBAN Americas markets currently expose clearly labelled local
  format-only test values. No checksum or bank-directory validity is claimed.

Names, streets, postal codes, tax identifiers, and insurance values are
synthetic fixtures. Where a country-specific algorithm is not implemented, the
field is explicitly marked `format-only`.
