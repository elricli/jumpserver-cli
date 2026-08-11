# Changelog

## 0.1.8 — 2026-08-11

### Changed

- Replace the TypeScript 7 beta preview package and `tsgo` CLI with the official TypeScript 7.0.2 package and `tsc` CLI.

### Security

- Upgrade esbuild, PostCSS, and nanoid to patched releases that address the current npm audit findings.

## 0.1.7 — 2026-08-05

### Release note

The npm registry already contained `jumpserver-cli@0.1.6`, published from an earlier commit before the database-token fixes were completed. npm versions are immutable, so the corrected npm package is released as `0.1.7`. The same fixes are also available in the GitHub `v0.1.6` release.

### Fixed

- Resolve database account aliases from the permitted asset detail instead of guessing an account name.
- Resolve database protocols from permitted asset metadata, including PostgreSQL, instead of defaulting to MySQL.
- Generate protocol-specific connection commands and include the database name from the connection metadata.
- Preserve the executable bit on the rebuilt CLI entry point.
