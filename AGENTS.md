# Repository Guidelines

## CLI Operation Options

- Concrete OpenAPI operation commands must expose declared query parameters as direct CLI options whenever the names do not conflict with built-in request options.
- Convert OpenAPI query parameter names to kebab-case flags, then map them back to the original query names when building the request. For example, `is_active` becomes `--is-active` and is sent as `is_active=...`.
- Keep `--limit` and `--offset` as the pagination shortcuts for operations that declare those query parameters.
- Treat `--query name=value` as deprecated legacy syntax. It may parse for the current version only to emit a deprecation warning, and it should be removed in the next version.
- When adding or changing command generation, add tests for at least one concrete command path and prefer coverage that includes asset match commands such as `assets match`, `assets databases match`, and `assets hosts match`.
