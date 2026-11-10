# Repository Guidelines

## Working Tree

- Maintain only one feature branch per worktree. Do not create or switch to another feature branch without explicit user authorization.
- Before merging, confirm that the branch contains only commits for the current feature. Stop immediately if unrelated history is present.

## Project Concepts

- Use the terms Operation Catalog, Operation Command, Target Host, Authentication Mode, Credential Source, Permitted Asset, and Connection Token consistently. Definitions are in [docs/concepts.md](docs/concepts.md).
- Keep the Target Host separate from an operation's query parameter named `host`.
- Resolve authentication as one complete mode from one Credential Source, in command-line, environment, then saved-config priority. Never combine partial credentials across sources.
- Use permitted account aliases and protocols from Permitted Asset metadata when creating Connection Tokens. Keep these temporary connection credentials distinct from API authentication tokens.

## CLI Operation Options

- Concrete OpenAPI operation commands must expose declared query parameters as direct CLI options whenever the names do not conflict with built-in request options.
- Convert OpenAPI query parameter names to kebab-case flags, then map them back to the original query names when building the request. For example, `is_active` becomes `--is-active` and is sent as `is_active=...`.
- Keep `--limit` and `--offset` as the pagination shortcuts for operations that declare those query parameters.
- Treat `--query name=value` as deprecated legacy syntax. It may parse for the current version only to emit a deprecation warning, and it should be removed in the next version.
- When adding or changing command generation, add tests for at least one concrete command path and prefer coverage that includes asset match commands such as `assets match`, `assets databases match`, and `assets hosts match`.
- Asset suggestions are capped by the server before pagination. Asset `match` with explicit pagination and asset `list` commands must use the collection API; keep the generated Operation Catalog faithful to the raw OpenAPI source.
- `--all` fetches every page of limit/offset GET operations, with `--limit` setting page size. Preserve filters, custom headers, and authentication on every page; fail explicitly if pagination stops advancing.

## Node.js Versions

- Use Node.js 26 for development and npm releases, as recorded in `.nvmrc` and used by the publish workflow.
- Keep the user runtime minimum at `>=22.12.0`, matching Commander 15. Keep `package.json`, `package-lock.json`, and README requirements aligned.
- Keep emitted JavaScript and runtime APIs compatible with Node.js 22.12.0 even when building on Node.js 26.
- CI checks the exact minimum 22.12.0 and the latest 22, 24, and 26 releases with verification, builds, a built-CLI check, and npm audit.

## Verification

- Run `npm run verify` and `npm run build` after code changes. Run `npm audit` after dependency changes and resolve reported vulnerabilities.
- Keep the raw `api.json` untracked. Use `npm run generate:operations` to regenerate the catalog and `npm run coverage:api` to compare it with a local OpenAPI export.
