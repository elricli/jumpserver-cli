# JumpServer CLI

This context describes how the CLI names JumpServer operations, authentication, and asset connections.

## Language

**Operation Catalog**:
The normalized set of JumpServer OpenAPI operations that the CLI can describe and invoke.
_Avoid_: Endpoint list, generated snapshot

**Operation Command**:
The hierarchical CLI command that invokes one entry in the Operation Catalog.
_Avoid_: Endpoint command, API wrapper

**Target Host**:
The JumpServer installation that receives an Operation Command request. It is distinct from an operation's query parameter named `host`.
_Avoid_: Query host, base URL

**Authentication Mode**:
Exactly one credential form used for a request: Access Key, Bearer Token, Private Token, or none.
_Avoid_: Auth fields, credential bag

**Credential Source**:
One atomic origin for an Authentication Mode: command-line options, environment variables, or saved configuration.
_Avoid_: Merged credentials

**Permitted Asset**:
An asset the current JumpServer user is authorized to connect to, including database and host assets.
_Avoid_: Search result, inventory row

**Connection Token**:
A time-limited JumpServer credential created for connecting to one Permitted Asset through a selected account and protocol.
_Avoid_: Login token, API token
