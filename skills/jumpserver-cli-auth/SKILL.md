---
name: jumpserver-cli-auth
description: Use when configuring JumpServer CLI authentication, saved credentials, Access Key auth, token auth, or isolated local config for tests.
---

# JumpServer CLI Authentication

Use `jms auth access-key` as the default login path for durable API access.

## Common Flows

Persist host, Access Key, and organization:

```bash
jms auth access-key \
  --host jumpserver.example.test \
  --access-key-id "$JMS_ACCESS_KEY_ID" \
  --access-key-secret "$JMS_ACCESS_KEY_SECRET" \
  --org "$JMS_ORG"
```

Use a saved config after login:

```bash
jms users profile read
```

Use Bearer or Private Token auth for scripts:

```bash
export JMS_TOKEN="..."
export JMS_PRIVATE_TOKEN="..."
```

## Config Isolation

For local tests, avoid touching the real config:

```bash
export JMS_CONFIG="$(mktemp)"
npx tsx src/cli.ts auth access-key --host jumpserver.example.test --access-key-id "..." --access-key-secret "..."
npx tsx src/cli.ts users profile read --dry-run
cat "$JMS_CONFIG"
```

## Notes

- Runtime precedence is command-line flags, environment variables, then saved config.
- `auth token --token-only` prints only the Bearer token for scripts.
- Successful auth prints `认证完成` and should not expose secrets.
