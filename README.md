# jumpserver-cli

OpenAPI-driven CLI for JumpServer.

> Development status: this project is still under active development. Command names, output formats, and packaged skills may change before a stable release.

## Requirements

- Node.js 22 or newer
- TypeScript 7.0 Beta via `@typescript/native-preview@beta` and the `tsgo` CLI.

## Installation

Install the latest release from npm:

```bash
npm install -g jumpserver-cli
jms --help
```

## Agent Skills

Reusable agent skills are published in this repository under `skills/<skill-name>/SKILL.md`.

Install all project skills:

```bash
npx skills add elricli/jumpserver-cli --skill '*'
```

Install individual skills:

```bash
npx skills add elricli/jumpserver-cli --skill jumpserver-cli-auth
npx skills add elricli/jumpserver-cli --skill jumpserver-cli-api
npx skills add elricli/jumpserver-cli --skill jumpserver-cli-database-token
```

For local development, install from the working tree:

```bash
npx skills add ./skills --skill '*'
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

Runtime precedence is: command-line flags, environment variables, then saved config. A host is required unless it has already been saved by `auth token` or `auth access-key`.

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

## Connection Tokens

Create database connection tokens and print database client commands:

```bash
jms assets databases token "prod-*"
jms assets databases token "prod-*" --dsn
jms assets databases token --all --limit 50
```

Create host SSH connection tokens and print SSH commands:

```bash
jms assets hosts token "prod-*"
jms assets hosts token "prod-*" --ssh-command
jms assets hosts token --all --limit 50
```

`assets hosts token` uses JumpServer's SSH Guide connection method (`ssh_guide`). The default table includes the temporary Token SSH command, and when the current profile username is available it also prints the direct asset/account username command. Use `--login-username` to override the JumpServer login username used in that direct command.

In interactive database and host asset selectors, press `/` to enter a new search term. The selector reloads results from JumpServer with that search query instead of filtering only the currently loaded page.

## Verification

```bash
npm run verify
npm run build
```

The raw Swagger/OpenAPI export is intentionally not tracked or published. If you need to refresh the command catalog, place a local `api.json` in the repository root and run:

```bash
npm run generate:operations
```

To test locally without touching your real config:

```bash
export JMS_CONFIG="$(mktemp)"
npx tsx src/cli.ts auth access-key --host jumpserver.example.test --access-key-id "..." --access-key-secret "..."
npx tsx src/cli.ts users profile read --dry-run
cat "$JMS_CONFIG"
```

## Publishing

This repository publishes to npm from `.github/workflows/npm-publish.yml`. The workflow can run from a GitHub Release or be triggered manually from GitHub Actions.

Required repository secret:

- `NPM_TOKEN`: npm automation token from the npm account that owns the package.

```bash
npm run verify
npm pack --dry-run
npm view jumpserver-cli version dist-tags
```

`prepublishOnly` runs `npm run verify` before a real publish, and `prepack` builds `dist` before the tarball is created. The build clears `dist` first and does not generate JavaScript sourcemaps, so published packages contain runtime JavaScript, declarations, `README.md`, and `LICENSE` without `.map` files.

Use `npm version patch`, `npm version minor`, or `npm version major` before publishing, then push the generated tag. The workflow can be run manually by choosing that tag, for example `v0.1.1`, and an npm dist-tag (`latest` or `next`). Prerelease GitHub Releases publish with `next`; normal releases publish with `latest`.
