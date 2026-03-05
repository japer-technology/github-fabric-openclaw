# .GITOPENCLAW 🦞 Lifecycle

### These scripts orchestrate the agent workflow

The `lifecycle/` directory contains the TypeScript scripts that run during each
GitHub Actions workflow execution. They are invoked in strict order:

| Step | Script | Purpose |
|------|--------|---------|
| 1 | `GITOPENCLAW-ENABLED.ts` | Fail-closed guard — verifies sentinel file exists |
| 2 | `GITOPENCLAW-PREFLIGHT.ts` | Preflight validation — checks config, files, and secrets |
| 3 | `GITOPENCLAW-INDICATOR.ts` | Adds 👀 reaction to show the agent is working |
| 4 | _(bun install)_ | Install runtime dependencies |
| 5 | `GITOPENCLAW-AGENT.ts` | Core orchestrator — runs OpenClaw agent, posts reply |
