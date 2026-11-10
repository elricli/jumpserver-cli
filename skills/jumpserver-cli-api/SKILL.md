---
name: jumpserver-cli-api
description: Use when calling JumpServer OpenAPI operations through jumpserver-cli, discovering operation names, building request parameters, or using dry-run output.
---

# JumpServer CLI API Calls

The CLI exposes JumpServer OpenAPI operations as gh/glab-style module commands and also supports direct operationId calls.

## Discover

```bash
jms api list --search profile
jms api describe users_profile_read
```

## Call Operations

Prefer module commands when they exist:

```bash
jms users profile read
jms assets match --name web --address 10.0 --platform Linux --limit 20
jms assets databases list --all --json
jms assets hosts list --search prod --all --limit 50
jms assets hosts match --limit 20
jms assets favorite-assets read --path id=asset-1
jms users profile password update --body '{"old_password":"old","new_password":"new","new_password_again":"new"}'
```

Use `api call` when an operationId is easier:

```bash
jms api call assets_favorite-assets_read --path id=asset-1
```

## Request Options

- `--path name=value`: path template parameter.
- `--search value`, `--name value`, and other operation-specific options: query parameters declared by that OpenAPI operation.
- `--query-host value` and similar `--query-*` options: query parameters whose names conflict with global or request options.
- `--query name=value`: deprecated legacy query syntax; it prints a warning and will be removed in the next version.
- `--param name=value`: path parameter if declared, otherwise query parameter.
- `--limit 20` and `--offset 40`: pagination controls shown only for operations that declare them.
- `--all`: fetch all pages of GET operations that declare limit/offset pagination. `--limit` sets page size (default: 100); `--offset` chooses the starting offset.
- `--body '{"name":"value"}'`, `--body @payload.json`, or `--body -`.
- `--dry-run`: inspect the request without sending it.
- `--json`: print raw JSON instead of the compact table.

## Asset Lists

Use `assets list`, `assets databases list`, `assets hosts list`, and the corresponding commands for other asset types to query the asset collection API. They accept the same filters as `match`. These are convenience commands derived from asset match operations and are separate from the OpenAPI Operation Catalog.

Asset `match` without pagination options uses the server's capped suggestions API. Passing `--limit`, `--offset`, or `--all` uses the corresponding collection API to avoid that cap. Collection requests require the target installation's asset-list permissions; connection token workflows use Permitted Assets instead.

`--all` aggregates results into one response. Paginated JSON has the collected `results`, their `count`, and `null` for `next` and `previous`. A failed or non-advancing page fails the command without printing partial results.

## Output

Default table output is for quick inspection. Use `--json` when another tool or agent needs complete response data.
