# Changelog

## 0.1.9 — 2026-11-10

### Fixed

- Honor asset `match --limit` and `--offset` using the collection API to bypass JumpServer's fixed suggestion cap.

### Added

- Add asset `list` commands and `--all` pagination for limit/offset GET operations, preserving filters and signing every page.
- Add CI compatibility checks for Node.js 22.12.0 and the latest Node.js 22, 24, and 26 releases.

### Changed

- Move project guidance from `CONTEXT.md` to `AGENTS.md` and the concepts guide in `docs/`.
- Use Node.js 26 for development and npm releases, with the project version recorded in `.nvmrc`.
- Correct the minimum supported runtime to Node.js 22.12.0 to match Commander 15.

### Security

- Upgrade Vitest to 4.1.12 and refresh Vite and source-map-js to patched versions, resolving all current npm audit findings.

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
