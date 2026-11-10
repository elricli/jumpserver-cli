# JumpServer CLI concepts

These terms describe operation discovery, authentication, and asset connections throughout the project.

## Operation Catalog

The normalized set of JumpServer OpenAPI operations that the CLI can describe and invoke. The generated catalog retains the semantics of the source OpenAPI document. Convenience asset `list` commands are derived from asset `match` operations without changing that catalog.

## Operation Command

A hierarchical CLI command that invokes an entry in the Operation Catalog, such as `jms assets hosts match`. The generic `jms api call <operationId>` form invokes an operation by its catalog identifier.

## Target Host

The JumpServer installation that receives an Operation Command request. The global `--host` option selects this installation. An operation's query parameter named `host` is separate and is exposed as `--query-host` to avoid the collision.

## Authentication Mode

Exactly one credential form used for a request: Access Key, Bearer Token, Private Token, or none. Incomplete credentials and conflicting modes are rejected explicitly.

## Credential Source

One atomic origin for an Authentication Mode: command-line options, environment variables, or saved configuration. The highest-priority source that supplies credentials determines the complete mode. Fields from different sources are never combined into one credential.

## Permitted Asset

An asset the current JumpServer user is authorized to connect to, including database and host assets. Token workflows load permitted asset details to select authorized account aliases and protocols. Inventory search results alone do not establish connection permission.

## Connection Token

A time-limited JumpServer credential created for connecting to one Permitted Asset through a selected account and protocol. It authenticates an asset connection and is separate from the credentials used for JumpServer API requests.
