# First Light Command — Deep Analysis & Issues

> Analysis of the `openclaw status --all` (and `openclaw doctor`) output when run for the first time in a `.GITOPENCLAW` CI environment (GitHub Actions runner).

---

## Observed Output (Problematic)

```
┌─────────────────┬──────────────────────────────────────────────────────────────────────────────┐
│ Gateway         │ local · ws://127.0.0.1:18789 (local loopback) · unreachable (connect failed: │
│                 │ connect ECONNREFUSED 127.0.0.1:18789)                                        │
│ Gateway self    │ unknown                                                                      │
│ Gateway service │ systemd not installed                                                        │
│ Node service    │ systemd not installed                                                        │
└─────────────────┴──────────────────────────────────────────────────────────────────────────────┘
✗ Config: /home/runner/.openclaw/openclaw.json
```

---

## Issue 1: Config Path — Wrong Location for `.GITOPENCLAW` Context

**Observation:** Config is resolved to `~/.openclaw/openclaw.json` (home directory).

**Problem:** In a `.GITOPENCLAW` repository context, configuration lives at `.GITOPENCLAW/config/settings.json` — inside the repository, committed to git, and versioned alongside the agent. The status/doctor output pointing to `~/.openclaw/openclaw.json` is misleading because:

1. That file doesn't exist on a fresh CI runner (hence the `✗` failure indicator).
2. The actual agent configuration is in `.GITOPENCLAW/config/settings.json`.
3. Users see a failure diagnostic for something that is expected and correct in the CI context.

**Source code:** `src/config/paths.ts` — `resolveCanonicalConfigPath()` always resolves to `$HOME/.openclaw/openclaw.json`. There is no awareness of `.GITOPENCLAW` repo-local config.

**Recommendation:** When running inside a repository with `.GITOPENCLAW/` and in a CI environment (`GITHUB_ACTIONS=true`), the status/diagnosis output should:

- Recognize that `.GITOPENCLAW/config/settings.json` is the authoritative config.
- Show the `.GITOPENCLAW` config path (or note that config is repo-managed) instead of flagging `~/.openclaw/openclaw.json` as missing.
- Downgrade the `✗` to an informational note: "Config: managed by .GITOPENCLAW/config/settings.json".

**Files to change:**

- `src/commands/status-all/diagnosis.ts` — config check (line 84)
- `src/commands/status-all.ts` — overview Config row (line 267)

---

## Issue 2: Gateway Unreachable — Not Logical on First Run / CI

**Observation:** `unreachable (connect failed: connect ECONNREFUSED 127.0.0.1:18789)`

**Problem:** On a fresh GitHub Actions runner (or any first-run scenario), no gateway process is running. The raw `ECONNREFUSED` error is:

1. **Expected behavior**, not an error — there's no local gateway in CI; `.GITOPENCLAW` runs commands inline via `--local` mode.
2. **Alarming to new users** — the verbose socket error looks like something is broken.
3. **Not actionable** — in CI, you can't (and shouldn't) start a persistent gateway process.

**Source code:** `src/gateway/probe.ts` line 108 — formats the connect error as `connect failed: ${connectError}`. This raw error propagates to `src/commands/status-all.ts` line 241 and `src/commands/status.command.ts` line 241.

**Recommendation:** When running in CI (`GITHUB_ACTIONS=true` or `CI=true`):

- Replace the raw error with a contextual message: `"not started (CI — commands run inline)"` or `"n/a (CI environment)"`.
- When not in CI but the error is ECONNREFUSED, show: `"not started"` instead of the full socket error, as ECONNREFUSED specifically means "no process listening" — it's not a network error, it's a "gateway not running" signal.

**Files to change:**

- `src/commands/status-all.ts` — gateway status formatting (lines 238-242)
- `src/commands/status.command.ts` — gateway status formatting (line 241)

---

## Issue 3: Service Checks — Irrelevant in CI / GitHub Actions

**Observation:** `Gateway service │ systemd not installed` and `Node service │ systemd not installed`

**Problem:** GitHub Actions runners manage process lifecycle themselves. Showing "systemd not installed" is:

1. **Irrelevant** — GitHub Actions handles job execution; there's no need for systemd, LaunchAgent, or Scheduled Task.
2. **Confusing** — implies something needs to be installed when nothing does.
3. **Noise** — takes up table rows with information that has zero value in this context.

**Source code:** `src/daemon/service.ts` — `resolveGatewayService()` returns the platform-specific service type (systemd on Linux). `src/commands/status-all.ts` lines 292-306 format `daemon.label not installed` when the service command is not found.

**Recommendation:** When running in CI (`GITHUB_ACTIONS=true` or `CI=true`):

- Show `"n/a (CI environment)"` or `"managed by GitHub Actions"` instead of `"systemd not installed"`.
- Alternatively, omit the service rows entirely in CI since they provide no value.

**Files to change:**

- `src/commands/status-all.ts` — daemon/service status rows (lines 292-306)
- `src/commands/status.command.ts` — daemon value formatting (lines 280-293)

---

## Issue 4: `.GITOPENCLAW` Config Should Be Canonical

**Observation:** The system looks for config at `~/.openclaw/openclaw.json` but `.GITOPENCLAW/config/settings.json` is the actual source of truth.

**Problem:** Two config systems exist without awareness of each other:

| Aspect      | `~/.openclaw/openclaw.json`      | `.GITOPENCLAW/config/settings.json`   |
| ----------- | -------------------------------- | ------------------------------------- |
| Location    | Home directory (ephemeral in CI) | Repository (committed to git)         |
| Persistence | Lost on runner teardown          | Permanent, versioned                  |
| Contents    | Gateway mode, channels, tokens   | Provider, model, trust policy, limits |
| Managed by  | `openclaw config set` CLI        | Git commits, Issue commands           |

**Recommendation:** The `.GITOPENCLAW` orchestrator should:

- Either set `OPENCLAW_CONFIG_PATH` to point to a synthesized config derived from `.GITOPENCLAW/config/settings.json`, or
- The status/doctor commands should detect `.GITOPENCLAW` context and report the repo-local config as primary.

---

## Summary of Required Changes

| #   | Issue                                       | Severity | Fix Complexity                                      |
| --- | ------------------------------------------- | -------- | --------------------------------------------------- |
| 1   | Config path wrong in `.GITOPENCLAW` context | High     | Medium — add `.GITOPENCLAW` awareness to diagnosis  |
| 2   | Gateway ECONNREFUSED alarming in CI         | Medium   | Low — improve status message for ECONNREFUSED in CI |
| 3   | "systemd not installed" irrelevant in CI    | Medium   | Low — detect CI and show appropriate message        |
| 4   | Two config systems without awareness        | High     | Medium — add `.GITOPENCLAW` config recognition      |

---

## Environment Detection Strategy

A single utility function should detect the `.GITOPENCLAW` CI context:

```typescript
/** Detect if running in a CI environment with .GITOPENCLAW present. */
export function resolveGitOpenClawCIContext(
  env = process.env,
  cwd = process.cwd(),
): {
  isCI: boolean;
  isGitOpenClaw: boolean;
  configPath: string | null;
} {
  const isCI = env.CI === "true" || env.GITHUB_ACTIONS === "true";
  const gitOpenClawDir = path.join(cwd, ".GITOPENCLAW");
  const isGitOpenClaw = fs.existsSync(gitOpenClawDir);
  const configPath =
    isGitOpenClaw && isCI ? path.join(gitOpenClawDir, "config", "settings.json") : null;
  return { isCI, isGitOpenClaw, configPath };
}
```

This allows all three issue areas (gateway, services, config) to adapt their output based on context.
