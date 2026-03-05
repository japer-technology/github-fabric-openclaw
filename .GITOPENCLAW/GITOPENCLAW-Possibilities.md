# .GITOPENCLAW Possibilities

<p align="center">
  <picture>
    <img src="GITOPENCLAW-LOGO.png" alt="GitOpenClaw" width="500">
  </picture>
</p>

### An analysis of how to bring .GITOPENCLAW up to and past the .GITCLAW level of AI Agent implementation

---

## Executive Summary

`.GITCLAW` is a fully functional AI agent that lives inside a GitHub repository. It uses the lightweight [Pi coding agent](https://github.com/badlogic/pi-mono) as its engine and turns GitHub Issues into multi-turn conversations, with all state committed to git. It is deliberately minimal: a single `package.json` dependency, a handful of TypeScript lifecycle scripts, and a skill system made of Markdown files.

`.GITOPENCLAW` aims to do the same thing, but powered by the full **OpenClaw** runtime instead of Pi. OpenClaw is not a lightweight CLI tool; it is a production-grade multi-channel AI gateway with 25+ messaging integrations, a WebSocket control plane, a plugin/extension architecture, hybrid vector+BM25 memory, sub-agent orchestration, multi-lane execution, browser automation, TTS, and far more.

This difference in scale is both the challenge and the opportunity. Where `.GITCLAW` wraps a thin CLI, `.GITOPENCLAW` can call on a rich, battle-tested runtime. The question is how to harness that power within the constraints of a GitHub Actions runner while preserving the drop-in simplicity that makes `.GITCLAW` work.

This document analyzes what `.GITCLAW` has today, what `.GITOPENCLAW/1st-attempt` explored, and lays out a concrete path to bring `.GITOPENCLAW` up to parity with `.GITCLAW` and then far beyond it.

---

## 1. What .GITCLAW Has Today (The Baseline)

### 1.1 Architecture

| Layer | Implementation |
|---|---|
| **Engine** | `@mariozechner/pi-coding-agent` (Pi CLI, invoked via `bun`/`npx`) |
| **Orchestrator** | `lifecycle/GITCLAW-AGENT.ts` — fetches issue, resolves session, runs Pi, extracts reply, commits, pushes, comments |
| **Guard** | `lifecycle/GITCLAW-ENABLED.ts` — fail-closed sentinel check |
| **Indicator** | `lifecycle/GITCLAW-INDICATOR.ts` — adds/removes 👀 reaction |
| **Installer** | `install/GITCLAW-INSTALLER.ts` + `GITCLAW-INSTALLER.yml` — copies workflows, templates, config |
| **Workflow** | `GITCLAW-WORKFLOW-AGENT.yml` — triggers on `issues.opened` and `issue_comment.created` |
| **State** | `state/issues/<n>.json` → `state/sessions/<session>.jsonl` (git-committed) |
| **Skills** | `.pi/skills/` — Markdown-based modular capabilities |
| **Personality** | `AGENTS.md` + `.pi/BOOTSTRAP.md` + `.pi/APPEND_SYSTEM.md` |
| **Memory** | `state/memory.log` — append-only log with `merge=union` git attribute |
| **Tests** | `tests/phase0.test.js` — structural validation of all Phase 0 features |

### 1.2 Key Design Properties

1. **Zero infrastructure** — GitHub Actions + git + LLM API key
2. **Drop-in folder** — copy `.GITCLAW/`, push, done
3. **Issue-driven conversation** — each issue is a stable session key
4. **Git-native state** — sessions, mappings, memory all committed
5. **Multi-turn resumption** — `--session <path>` continues conversations
6. **Conflict-resilient push** — retry loop with `git pull --rebase`
7. **Fail-closed security** — sentinel file + collaborator gating
8. **Multi-provider LLM** — Anthropic, OpenAI, Google, xAI, Mistral, Groq, OpenRouter
9. **Hatching ritual** — personality bootstrap via issue template
10. **60K char comment limit** — safe truncation for GitHub API

### 1.3 What .GITCLAW Roadmap Plans (Phases 1-6)

The `.GITCLAW/docs/GITCLAW-Roadmap.md` lays out:

- **Phase 1**: Pull request lifecycle (PR triggers, reviews, check runs, status checks)
- **Phase 2**: Project management and triage (labels, projects v2, milestones, discussions)
- **Phase 3**: Releases and versioning (changelogs, tags, GitHub Releases)
- **Phase 4**: Security and compliance (CodeQL, Dependabot, secret scanning, CODEOWNERS)
- **Phase 5**: Advanced workflow and identity (GitHub Apps, OIDC, environments, dispatch)
- **Phase 6**: Artifacts and observability (reports, metrics, cost tracking)

These phases represent where `.GITCLAW` *wants to go*. `.GITOPENCLAW` can leapfrog many of them because OpenClaw already has the underlying capabilities built.

---

## 2. What .GITOPENCLAW/1st-attempt Explored

The `1st-attempt` directory contains two research documents:

### 2.1 `magic.md` — Where the LLM Magic Lives

A focused map of the OpenClaw directories that drive model reasoning, tool use, context building, and reply delivery. Key findings:

- **Core execution path**: `src/auto-reply/reply` → `src/agents/pi-embedded-runner` → `src/agents/tools` → `src/channels`/`src/gateway`
- **Pivotal directories**: `src/auto-reply`, `src/agents`, `src/memory`, `src/media-understanding`, `src/link-understanding`, `src/routing`, `src/channels`, `src/gateway`, `src/plugins`, `src/plugin-sdk`
- **Mental model**: "auto-reply decides what to do, pi-embedded-runner does the model work, tools/memory/media amplify capability, and channels/gateway/routing deliver the result"

### 2.2 `libraries.md` — External Dependencies

A comprehensive inventory of all OpenClaw dependencies across Node.js, Swift (macOS), and Android. This reveals the breadth of the platform: 100+ Node.js libraries spanning AI providers, messaging SDKs, browser automation, image processing, vector search, crypto, and more.

### 2.3 Assessment

The 1st attempt did excellent reconnaissance. It identified the right source directories and understood the execution flow. What it did not do is map those capabilities to a concrete `.GITOPENCLAW` implementation plan. That is what this document provides.

---

## 3. The Fundamental Difference: Pi vs OpenClaw

Understanding this difference is essential for the entire strategy.

| Dimension | Pi (used by .GITCLAW) | OpenClaw (available to .GITOPENCLAW) |
|---|---|---|
| **Nature** | Lightweight terminal coding agent CLI | Full multi-channel AI gateway with rich runtime |
| **Invocation** | `pi --mode json -p "prompt"` | `openclaw` CLI + embedded programmatic runtime |
| **Tool surface** | 7 built-in tools (read, write, edit, bash, grep, find, ls) | 30+ tools (browser, memory, web-fetch, web-search, TTS, canvas, subagent, cron, messaging, etc.) |
| **Memory** | Append-only `memory.log` (grep-based) | Hybrid SQLite BM25 + vector embeddings with temporal decay and MMR |
| **Session model** | JSONL files with tree structure | JSONL sessions + metadata + overrides + provenance tracking |
| **LLM providers** | 17+ via Pi's provider system | Same 17+ plus Bedrock, Vertex, LiteLLM, Ollama, Hugging Face, custom proxies |
| **Channels** | None (stdin/stdout/JSON only) | 25+ (WhatsApp, Telegram, Discord, Slack, Signal, iMessage, Line, Matrix, etc.) |
| **Plugins** | Extensions via TypeScript modules | Full plugin SDK with manifest, hooks, config schema, channel adapters |
| **Sub-agents** | Spawn via tmux (manual) | Native sub-agent framework with depth limits, model override, lane isolation |
| **Media** | None | Image, audio, video, PDF extraction and multimodal preprocessing |
| **Gateway** | None | WebSocket server with 25+ RPC endpoints, auth rotation, rate limiting |
| **Thinking control** | `defaultThinkingLevel` in settings | Per-query directives (`@think high`, `@reason on`, `@elevated`) |

**The key insight**: OpenClaw is not just "a better Pi." It is a fundamentally different kind of system. Pi is a conversation loop with tools. OpenClaw is a platform with agents, channels, plugins, memory, media processing, and a control plane. `.GITOPENCLAW` can leverage all of this.

---

## 4. Parity Plan: Matching .GITCLAW Feature-for-Feature

Before going beyond `.GITCLAW`, `.GITOPENCLAW` must first match it. Here is the concrete implementation plan for each `.GITCLAW` feature, translated to OpenClaw equivalents.

### 4.1 Lifecycle Scripts

| .GITCLAW | .GITOPENCLAW Equivalent |
|---|---|
| `GITCLAW-ENABLED.ts` (sentinel guard) | `GITOPENCLAW-ENABLED.ts` — identical pattern, check for `GITOPENCLAW-ENABLED.md` |
| `GITCLAW-INDICATOR.ts` (👀 reaction) | `GITOPENCLAW-INDICATOR.ts` — identical pattern using `gh` CLI |
| `GITCLAW-AGENT.ts` (orchestrator) | `GITOPENCLAW-AGENT.ts` — the core rewrite; invokes OpenClaw instead of Pi |

The guard and indicator scripts are runtime-agnostic; they only use `gh` CLI and `fs`. They can be adapted with minimal changes (rename paths/references).

The agent orchestrator is where the real work happens. Instead of spawning `pi --mode json`, it must invoke OpenClaw's agent runtime. Two approaches:

**Approach A: CLI invocation** — Run `openclaw message send` or a dedicated CLI command, similar to how `.GITCLAW` runs `pi`. This keeps the orchestrator as a thin shell script wrapper.

**Approach B: Programmatic SDK** — Import OpenClaw's agent runtime directly in TypeScript and call the embedded runner. This gives full control over tool selection, memory, thinking directives, and output formatting.

**Recommendation**: Start with Approach A for parity, then evolve to Approach B for advanced features. Approach A is simpler, mirrors `.GITCLAW`'s architecture, and proves the concept faster.

### 4.2 Session Continuity

`.GITCLAW` uses Pi's `--session <path>` and `--session-dir <dir>` flags for session persistence. OpenClaw has a richer session system under `src/sessions/` with metadata, overrides, and provenance tracking.

**Implementation**:
- Store sessions under `.GITOPENCLAW/state/sessions/`
- Use OpenClaw's session management to create/resume sessions
- Maintain the same `state/issues/<n>.json` → `state/sessions/<session>` mapping pattern
- Commit session state to git just like `.GITCLAW`

### 4.3 Memory

`.GITCLAW` uses a simple `memory.log` append-only file. OpenClaw has a production-grade memory system with SQLite-backed hybrid search (BM25 full-text + vector embeddings).

**Phase 1 (parity)**: Use OpenClaw's memory system but persist the SQLite database in `.GITOPENCLAW/state/memory/`. Commit it to git (SQLite files are binary but small for conversation-scale data).

**Phase 2 (beyond)**: Enable vector embeddings for semantic memory search. This is a capability `.GITCLAW` cannot match — the agent could recall contextually relevant information from past conversations, not just keyword matches.

### 4.4 Skill System

`.GITCLAW` uses Pi's skill system (Markdown files in `.pi/skills/` following the Agent Skills standard). OpenClaw has a full plugin SDK with manifest files, hooks, config schemas, and channel adapters.

**Implementation**: `.GITOPENCLAW` can support both:
1. **Pi-compatible skills** — Markdown files that work the same way (backward compatible)
2. **OpenClaw plugins** — Full TypeScript plugins that register tools, hooks, and custom behaviors

This dual approach means `.GITOPENCLAW` inherits all of `.GITCLAW`'s existing skills while opening the door to far richer plugin-based capabilities.

### 4.5 Installer and Workflow

The installer pattern is directly portable. `.GITOPENCLAW` needs:
- `GITOPENCLAW-INSTALLER.ts` — copies workflow, templates, config
- `GITOPENCLAW-INSTALLER.yml` — bootstrap workflow (bun → npm conversion)
- `GITOPENCLAW-WORKFLOW-AGENT.yml` — the main agent workflow

The key difference in the workflow: instead of installing `@mariozechner/pi-coding-agent`, install `openclaw` (or the specific OpenClaw packages needed).

### 4.6 Tests

`.GITCLAW` has a thorough `phase0.test.js` that validates structural integrity. `.GITOPENCLAW` should mirror this with `phase0.test.js` validating its own structure, plus additional tests for OpenClaw-specific features.

---

## 5. Beyond .GITCLAW: What OpenClaw Unlocks

This is where `.GITOPENCLAW` diverges from `.GITCLAW` and becomes something fundamentally more powerful.

### 5.1 Rich Tool Surface (Immediate)

`.GITCLAW` gives the agent 7 tools (read, write, edit, bash, grep, find, ls). `.GITOPENCLAW` can expose 30+ tools out of the box:

| Tool Category | What It Enables |
|---|---|
| **Browser automation** | Agent can visit URLs, take screenshots, fill forms, scrape data |
| **Web search** | Agent can search the internet for documentation, APIs, solutions |
| **Web fetch** | Agent can read external URLs, API docs, package registries |
| **Memory search** | Semantic recall from past conversations using vector similarity |
| **Image understanding** | Agent can analyze screenshots, diagrams, architecture images |
| **Canvas/A2UI** | Agent can generate structured interactive UI elements |
| **Sub-agents** | Spawn child agents for parallel task execution |
| **Cron scheduling** | Schedule periodic agent tasks (e.g., weekly triage) |
| **TTS** | Text-to-speech for accessibility or audio summaries |

This means that from day one, a `.GITOPENCLAW`-powered agent can do things `.GITCLAW` will need months of development to achieve.

### 5.2 Multi-Channel Awareness (Medium-term)

OpenClaw's core strength is multi-channel messaging. While `.GITOPENCLAW` runs in GitHub Actions, it can be configured to also send notifications or responses to:
- **Slack** — post agent updates to a team channel
- **Discord** — mirror issue conversations to a Discord server
- **Telegram** — send agent alerts to a Telegram bot
- **Email** — via webhook integrations

This transforms the agent from "an issue bot" to "a team communication hub triggered by GitHub events."

### 5.3 Advanced Memory (Medium-term)

OpenClaw's memory system (`src/memory/`) supports:
- **Hybrid search**: BM25 full-text + vector embeddings
- **Multi-provider embeddings**: OpenAI, Google, Voyage AI, local models
- **Temporal decay**: Recent memories rank higher
- **MMR (Maximal Marginal Relevance)**: Diverse recall, not just top-k similarity

For `.GITOPENCLAW`, this means:
- The agent can remember decisions from 100 issues ago and recall them semantically
- Cross-issue context becomes automatic (no manual `/search` needed)
- Project knowledge accumulates and becomes searchable

### 5.4 Plugin-Based Extensibility (Medium-term)

OpenClaw's plugin SDK (`src/plugin-sdk/`) enables:
- **Custom tools** registered via `openclaw.plugin.json`
- **Lifecycle hooks** — pre/post agent start, tool call, compaction, message handling
- **Channel adapters** — custom messaging integrations
- **Config schemas** — validated plugin configuration

For `.GITOPENCLAW`, each new GitHub integration (PR reviews, security scanning, project management) could be a standalone plugin, installable independently. Users pick the capabilities they want.

### 5.5 Sub-Agent Orchestration (Advanced)

OpenClaw supports native sub-agent spawning with depth limits, model override, and lane isolation. This enables:

- **Parallel investigation**: Triage agent spawns a code-review sub-agent and a security-scan sub-agent simultaneously
- **Model specialization**: Use a fast/cheap model for triage, expensive model for deep analysis
- **Task decomposition**: Break a complex issue into sub-tasks, each handled by a specialized sub-agent

`.GITCLAW` has no sub-agent capability. This is a quantum leap.

### 5.6 Media Understanding (Advanced)

OpenClaw's media pipeline (`src/media-understanding/`) can process:
- Images (screenshots, diagrams, photos)
- Audio (voice messages, recordings)
- Video (screen recordings)
- PDFs (documentation, specs)

For `.GITOPENCLAW`, this means users can attach images to issues and the agent understands them. Paste a screenshot of an error, attach an architecture diagram, or upload a PDF spec — the agent processes it all.

### 5.7 Gateway Mode (Future)

OpenClaw's gateway (`src/gateway/`) provides a WebSocket server with 25+ RPC endpoints. While GitHub Actions is ephemeral, a future `.GITOPENCLAW` could:
- Start a gateway within the Actions runner for the duration of the workflow
- Expose it via a tunnel (e.g., Cloudflare Tunnel) for real-time interaction during long tasks
- Enable a web UI where users can watch the agent work in real time

This is far beyond what `.GITCLAW` or any Pi-based system can offer.

### 5.8 Thinking Directives (Immediate)

OpenClaw supports per-query thinking control:
- `@think high` / `@think medium` / `@think low`
- `@reason on` / `@reason off`
- `@verbose on` / `@verbose off`
- `@elevated` for elevated reasoning

`.GITOPENCLAW` could parse issue labels or comment prefixes to set thinking levels. A `deep-think` label on an issue would trigger `@think high`. Quick questions default to `@think low`.

---

## 6. Implementation Roadmap

### Phase 0: Parity with .GITCLAW

**Goal**: A working `.GITOPENCLAW` folder that matches `.GITCLAW`'s functionality using OpenClaw as the engine.

| Task | Priority | Complexity |
|---|---|---|
| Create `GITOPENCLAW-ENABLED.ts` (sentinel guard) | P0 | Low |
| Create `GITOPENCLAW-INDICATOR.ts` (👀 reaction) | P0 | Low |
| Create `GITOPENCLAW-AGENT.ts` (core orchestrator using OpenClaw) | P0 | High |
| Create `GITOPENCLAW-WORKFLOW-AGENT.yml` (Actions workflow) | P0 | Medium |
| Create `GITOPENCLAW-INSTALLER.ts` (setup script) | P0 | Medium |
| Set up `.pi/settings.json` or equivalent OpenClaw config | P0 | Low |
| Implement issue → session mapping (`state/issues/`, `state/sessions/`) | P0 | Medium |
| Create `AGENTS.md` with identity system | P0 | Low |
| Create `GITOPENCLAW-ENABLED.md` sentinel | P0 | Low |
| Create `phase0.test.js` structural tests | P0 | Medium |
| Create `package.json` with OpenClaw dependency | P0 | Low |

### Phase 1: OpenClaw Advantages

**Goal**: Leverage capabilities that Pi/`.GITCLAW` does not have.

| Task | Priority | Complexity |
|---|---|---|
| Enable rich tool surface (browser, web search, web fetch) | P1 | Medium |
| Enable image understanding for issue attachments | P1 | Medium |
| Enable advanced memory with vector embeddings | P1 | High |
| Add thinking directive support via issue labels | P1 | Low |
| Add sub-agent support for complex multi-step tasks | P1 | High |

### Phase 2: GitHub Platform Integration

**Goal**: Match `.GITCLAW` Roadmap Phases 1-3 using OpenClaw's built-in capabilities.

| Task | Priority | Complexity |
|---|---|---|
| PR lifecycle triggers and reviews | P2 | High |
| Label-driven agent dispatch | P2 | Medium |
| Scheduled runs (cron triggers via OpenClaw's croner) | P2 | Medium |
| Release notes generation | P2 | Medium |
| Slash command parsing | P2 | Low |

### Phase 3: Multi-Channel and Plugin Ecosystem

**Goal**: Go far beyond what `.GITCLAW` can achieve.

| Task | Priority | Complexity |
|---|---|---|
| Multi-channel notifications (Slack, Discord, Telegram) | P3 | High |
| Plugin SDK integration for community extensions | P3 | High |
| Gateway mode for real-time interaction during workflows | P3 | Very High |
| Cross-repo agent orchestration | P3 | Very High |

---

## 7. Technical Decisions

### 7.1 How to Invoke OpenClaw from GitHub Actions

**Option A: Global CLI install**
```bash
npm install -g openclaw
openclaw agent --message "$PROMPT" --session "$SESSION_PATH"
```
Pros: Simple, mirrors `.GITCLAW`'s Pi invocation.
Cons: Requires `npm install -g` in CI, version pinning is manual.

**Option B: Local `package.json` dependency**
```json
{
  "dependencies": {
    "openclaw": "2026.2.20"
  }
}
```
Then invoke via `npx openclaw` or `./node_modules/.bin/openclaw`.
Pros: Version-locked, reproducible, mirrors `.GITCLAW`'s approach.
Cons: Larger install footprint than Pi.

**Option C: Programmatic import**
```typescript
import { createAgent } from "openclaw/agent";
const agent = createAgent({ provider, model, tools, memory });
const reply = await agent.run(prompt, { session });
```
Pros: Maximum control, no subprocess overhead, full access to OpenClaw internals.
Cons: Tighter coupling, more complex orchestrator.

**Recommendation**: Start with Option B for parity (matches `.GITCLAW` pattern), then migrate to Option C for advanced features.

### 7.2 Session Storage

Keep the same pattern as `.GITCLAW`:
```
.GITOPENCLAW/state/
  issues/
    1.json          # maps issue #1 → session
  sessions/
    2026-02-20T..._abc123.jsonl
  memory/
    index.sqlite    # OpenClaw memory database
```

The SQLite memory database is a binary file, but at conversation scale it stays small (< 10 MB for thousands of entries). Git handles this fine.

### 7.3 Configuration

OpenClaw's configuration is richer than Pi's. Instead of a single `settings.json`, `.GITOPENCLAW` should use:

```
.GITOPENCLAW/
  config/
    settings.json       # Provider, model, thinking level
    tools.json          # Tool allowlist/denylist
    memory.json         # Memory configuration
    channels.json       # Optional multi-channel config
  plugins/              # Community or custom plugins
```

### 7.4 Dependency Size

Pi is a single npm package (~10 MB installed). OpenClaw is a full application with many dependencies (~200+ MB installed). This affects:
- **CI install time**: Budget 60-90 seconds for `npm install`
- **Cache strategy**: Use `actions/cache` for `node_modules` to speed up repeat runs
- **Selective install**: Consider `--omit=dev` and optional dependency exclusions

---

## 8. What .GITOPENCLAW Can Do That .GITCLAW Never Will

| Capability | Why .GITCLAW Cannot | Why .GITOPENCLAW Can |
|---|---|---|
| **Semantic memory search** | Pi uses grep on a flat log file | OpenClaw has vector embeddings + BM25 hybrid search |
| **Image understanding** | Pi has no media pipeline | OpenClaw preprocesses images, audio, video, PDFs |
| **Sub-agent orchestration** | Pi requires manual tmux spawning | OpenClaw has native sub-agent framework with lane isolation |
| **Multi-channel notifications** | Pi is stdin/stdout only | OpenClaw has 25+ channel adapters |
| **Browser automation** | Pi has no browser tool | OpenClaw has Playwright-based browser automation |
| **Web search and fetch** | Pi has no internet access tools | OpenClaw has web-search and web-fetch tools |
| **Real-time gateway** | Pi has no server mode | OpenClaw has a WebSocket gateway with 25+ RPC endpoints |
| **Plugin ecosystem** | Pi extensions are file-based | OpenClaw has a full plugin SDK with manifests, hooks, and config |
| **Thinking directives** | Pi has a single thinking level | OpenClaw supports per-query `@think`, `@reason`, `@elevated` |
| **Canvas/UI generation** | Pi is text-only | OpenClaw can generate interactive UI elements via A2UI |
| **TTS output** | Pi is text-only | OpenClaw has text-to-speech integration |
| **Cron scheduling** | Pi has no scheduler | OpenClaw has croner-based cron scheduling |

---

## 9. Risk Analysis

### 9.1 Complexity Risk

OpenClaw is a large, complex system. Running it in a GitHub Actions runner is non-trivial. Mitigations:
- Start with CLI invocation (thin wrapper), not full gateway mode
- Use a minimal tool set initially, expand incrementally
- Test extensively in CI before enabling for real issues

### 9.2 Install Time Risk

OpenClaw's dependencies are large. Mitigations:
- Cache `node_modules` via `actions/cache`
- Use `--omit=dev` to skip development dependencies
- Consider a pre-built Docker image for faster cold starts

### 9.3 Cost Risk

OpenClaw's richer tool surface (browser, web search, media) means more API calls and longer execution times. Mitigations:
- Tool allowlists to limit which tools the agent can use per workflow
- Token usage tracking committed to state
- Model tier selection based on task complexity

### 9.4 Compatibility Risk

OpenClaw is a living codebase that evolves rapidly. Mitigations:
- Pin OpenClaw version in `package.json`
- Test against specific versions before upgrading
- Maintain a compatibility matrix

---

## 10. Summary

`.GITCLAW` proved the concept: an AI agent that lives in a GitHub repo, converses through issues, and stores everything in git. It works because Pi is small, focused, and reliable.

`.GITOPENCLAW` takes that concept and supercharges it. By calling on the OpenClaw runtime — untouched and unforked — it inherits a massive capability surface:

1. **30+ tools** instead of 7
2. **Semantic memory** instead of grep-based recall
3. **Multi-channel awareness** instead of issue-only interaction
4. **Sub-agent orchestration** instead of single-threaded execution
5. **Media understanding** instead of text-only input
6. **Plugin ecosystem** instead of file-based skills only
7. **Gateway capabilities** for real-time interaction
8. **Thinking directives** for per-task reasoning control

The path is clear:
1. **Phase 0**: Build the `.GITOPENCLAW` scaffold — lifecycle scripts, workflow, installer, tests — matching `.GITCLAW`'s structure but invoking OpenClaw
2. **Phase 1**: Enable OpenClaw-exclusive features (rich tools, memory, media, sub-agents)
3. **Phase 2**: Integrate with GitHub platform features (PRs, labels, releases, security)
4. **Phase 3**: Go multi-channel and build the plugin ecosystem

`.GITCLAW` is a clever use of a coding agent CLI. `.GITOPENCLAW` is the realization that a full AI platform can live inside a single folder in your repository.

The claw is just getting started.

---

_Last updated: 2026-02-20_
