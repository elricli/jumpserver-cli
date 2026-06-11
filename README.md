# jumpserver-cli

OpenAPI-driven CLI for the JumpServer instance documented by `api.json`.

## Requirements

- Node.js 22 or newer
- TypeScript 7.0 Beta via `@typescript/native-preview@beta` and the `tsgo` CLI.

## Installation

After the package is published to npm:

```bash
npm install -g jumpserver-cli
jms --help
```

## Authentication

Access Key authentication is the primary API auth mode:

```bash
jms auth access-key \
  --host jumpserver.example.test \
  --access-key-id "..." \
  --access-key-secret "..." \
  --org "00000000-0000-0000-0000-000000000002"
```

Successful `auth access-key` validates the credentials by reading the current user profile, then persists the host, Access Key, and organization to the CLI config file. Later commands can use the saved auth settings directly:

```bash
jms users profile read
```

The signature follows the JumpServer documentation: `(request-target)`, `accept`, and `date` are signed with HMAC-SHA256 and sent as an HTTP Signature `Authorization` header.

Bearer and Private Token auth are also available:

```bash
export JMS_TOKEN="..."
export JMS_PRIVATE_TOKEN="..."
```

Successful `auth token` also persists the host and returned Bearer token. The config file path is resolved in this order:

1. `JMS_CONFIG`
2. `$XDG_CONFIG_HOME/jms/config.json`
3. `~/.config/jms/config.json`

Runtime precedence is: command-line flags, environment variables, saved config, then the built-in default host.

## Usage

```bash
npm install
npm run build

npx tsx src/cli.ts api list --search profile
npx tsx src/cli.ts api describe users_profile_read
npx tsx src/cli.ts users profile read --dry-run
npx tsx src/cli.ts assets favorite-assets read --path id=asset-1 --query search=prod --dry-run
```

`auth token` supports both interactive prompts and argument-driven usage:

```bash
npx tsx src/cli.ts auth token
npx tsx src/cli.ts auth token --host jumpserver.example.test --username alice --password 'secret'
npx tsx src/cli.ts auth token --host jumpserver.example.test --username alice --password 'secret' --token-only
npx tsx src/cli.ts auth access-key --host jumpserver.example.test --access-key-id "$JMS_ACCESS_KEY_ID" --access-key-secret "$JMS_ACCESS_KEY_SECRET"
```

Successful `auth token` and `auth access-key` commands print `认证完成` without dumping profile or token details. Use `--token-only` only when another agent or script needs the Bearer token value.

OpenAPI operations are exposed as gh/glab-style module commands. The command path is derived from the operation tag and action:

```bash
jms assets favorite-assets list
jms assets favorite-assets read --path id=asset-1
jms users profile password update --body '{"old_password":"old","new_password":"new","new_password_again":"new"}'
jms authentication connection-token client-url read --path id=token-1
```

The generic operationId form is available under `api call`:

```bash
npx tsx src/cli.ts api call assets_favorite-assets_read --path id=asset-1
```

API calls print successful JSON arrays and paginated `results` as ASCII tables by default, without truncating rows. Tables include a mycli/pgcli-style row count such as `2 rows in set`. Asset tables focus on useful fields such as ID, name, address, platform, protocols, type, connectivity, and active state; noisy fields such as raw nodes, labels, certificates, and automation config are hidden from the default view. Long cells are shortened to keep the table readable. Use `--json` when you need the raw complete response. Failed requests print a short error message to stderr.

Request options:

- `--path name=value`: path template parameter.
- `--query name=value`: query string parameter.
- `--param name=value`: path parameter if the name appears in the path template, otherwise query parameter.
- `--limit 20`: result count for APIs that declare limit/offset pagination.
- `--offset 40`: starting result offset for APIs that declare limit/offset pagination.
- `--body '{"name":"value"}'`: JSON body.
- `--body @payload.json`: JSON body from file.
- `--body -`: JSON body from stdin.
- `--header name=value`: extra request header.
- `--dry-run`: print a concise request preview without sending the request or exposing auth signatures.
- `--include-headers`: include the HTTP status line.
- `--json`: print the raw JSON response instead of the compact table.

## Verification

```bash
npm run verify
npm run build
```

To test locally without touching your real config:

```bash
export JMS_CONFIG="$(mktemp)"
npx tsx src/cli.ts auth access-key --host jumpserver.example.test --access-key-id "..." --access-key-secret "..."
npx tsx src/cli.ts users profile read --dry-run
cat "$JMS_CONFIG"
```

## Publishing

Before the first public release, choose a license and add it to `package.json` and a `LICENSE` file if the package should be open source.

This repository publishes to npm from the GitHub Release workflow in `.github/workflows/npm-publish.yml`. Configure the repository secret first:

1. Create an npm automation token from the npm account that owns the package.
2. Add it to GitHub repository secrets as `NPM_TOKEN`.
3. Create a GitHub Release whose tag matches `package.json` version, for example `v0.1.0`.

```bash
npm login
npm whoami
npm view jumpserver-cli name version # Expected to return 404 before the first publish.
npm run verify
npm pack --dry-run
```

`prepublishOnly` runs `npm run verify` before a real publish, and `prepack` builds `dist` before the tarball is created. Use `npm version patch`, `npm version minor`, or `npm version major` before publishing subsequent releases, then push the generated tag and publish a GitHub Release for that tag. Prereleases are published with the npm `next` dist-tag; normal releases use `latest`.

The workflow can also be run manually from GitHub Actions by choosing a tag such as `v0.1.0` and an npm dist-tag (`latest` or `next`).
