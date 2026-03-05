# .GITOPENCLAW 🦞 How to Be Like .GITCLAW

### The fork IS the installation — run OpenClaw from source, stay up to date forever

---

## The Core Idea

`.GITCLAW` proved something elegant: an AI agent can live inside a GitHub repository as a single drop-in folder. No servers, no databases, no infrastructure. Just a folder, a workflow, and an LLM API key.

`.GITOPENCLAW` does the same thing — but powered by the full OpenClaw runtime instead of Pi. And here is the critical difference in how it gets there:

> **You don't install OpenClaw. You fork it. The fork is the installation.**

When you fork `openclaw/openclaw`, you get the entire OpenClaw source code *and* the `.GITOPENCLAW` folder that lives inside it. The source code IS the runtime. There is no separate `npm install openclaw` step that downloads a published package from a registry. The code you forked is the code that runs.

This means your installation is always a working copy of the source — and you can keep it up to date by syncing your fork with upstream.

---

## How .GITCLAW Does It (The Baseline)

`.GITCLAW` follows a clean, minimal pattern:

| Step | What happens |
|---|---|
| **Engine** | Pi coding agent — installed from npm as `@mariozechner/pi-coding-agent` |
| **Installation** | `cd .GITCLAW && bun install` — downloads Pi from the npm registry |
| **Invocation** | `pi --mode json -p "prompt"` — spawns the Pi CLI binary from `node_modules` |
| **Updates** | Bump the version in `.GITCLAW/package.json` and reinstall |
| **Separation** | Pi source lives elsewhere (github.com/badlogic/pi-mono); `.GITCLAW` only has the package |

This is the classic dependency model: your project depends on a published package. You install it, use it, and update it by changing a version number.

It works. It's simple. But it means:

- You are always one `npm install` away from a working agent
- You depend on the npm registry being available
- You get whatever version was published — not the latest commit on `main`
- You cannot read, modify, or learn from the engine source without going to a separate repo

---

## How .GITOPENCLAW Does It (The Fork Model)

`.GITOPENCLAW` inverts the dependency relationship:

| Step | What happens |
|---|---|
| **Engine** | OpenClaw runtime — the full source code is in the same repository |
| **Installation** | Fork `openclaw/openclaw` — that's it. The source is your installation. |
| **Invocation** | Run OpenClaw from source via `bun` or build and run from `dist/` |
| **Updates** | Sync your fork with upstream: `git fetch upstream && git merge upstream/main` |
| **Separation** | There is none — `.GITOPENCLAW` and the OpenClaw source coexist in the same repo |

The key insight:

> **When you fork a repository that contains both the runtime source AND the agent folder, the fork gives you everything. No installation step. No registry. No version mismatch. The source you see is the source that runs.**

---

## Why the Fork Model Works

### 1. Zero Installation

There is no `npm install openclaw` step that downloads a pre-built package. The OpenClaw source code is already in your fork. The `package.json` at the repo root declares all the dependencies OpenClaw needs, and `pnpm install` (or `bun install`) at the repo root installs them.

`.GITOPENCLAW` lives inside this tree. When the GitHub Actions workflow runs, it checks out your fork, installs the repo dependencies, and runs the agent — all from source.

### 2. Always Up to Date

Published npm packages are snapshots. They capture the state of the code at a specific version. Between releases, the `main` branch may have dozens of improvements, fixes, and new features that haven't been published yet.

With the fork model, staying current is a git operation:

```bash
# One-time: add the upstream remote
git remote add upstream https://github.com/openclaw/openclaw.git

# Sync whenever you want the latest
git fetch upstream
git merge upstream/main
```

That's it. Your fork now has every commit from upstream, including changes to both the OpenClaw runtime and the `.GITOPENCLAW` folder. No version bumps, no registry lookups, no waiting for a release.

### 3. Full Transparency

When your agent calls a tool, processes a message, or stores a memory — you can read exactly how it works. The source is right there in your fork. `src/agents/`, `src/memory/`, `src/auto-reply/`, `src/channels/` — all of it.

With the npm model, you'd need to dig into `node_modules/openclaw/` or visit a separate repository. With the fork model, `git log`, `git blame`, and your editor's "Go to Definition" all work on the actual runtime code.

### 4. Customizable Without Diverging

Need to tweak how the agent handles a specific tool? Adjust a prompt template? Modify a memory search strategy? In the fork model, you can make targeted changes to the OpenClaw source and still sync with upstream.

Git's merge machinery handles this well. Your local changes stay local. Upstream improvements merge in. Conflicts are visible and resolvable. The entire history is auditable.

---

## The Architecture: Side by Side

### .GITCLAW (Package Dependency Model)

```
your-repo/
├── .GITCLAW/
│   ├── package.json          ← declares dependency on Pi (npm package)
│   ├── node_modules/         ← Pi binary lives here after `bun install`
│   ├── lifecycle/
│   │   └── GITCLAW-AGENT.ts  ← spawns `pi` from node_modules/.bin/
│   └── state/
└── (your source code)
```

**Flow**: Fork/copy `.GITCLAW` → `bun install` fetches Pi from npm → agent runs Pi from `node_modules`

### .GITOPENCLAW (Fork-as-Installation Model)

```
your-fork-of-openclaw/
├── .GITOPENCLAW/
│   ├── lifecycle/
│   │   └── GITOPENCLAW-AGENT.ts  ← runs OpenClaw from the repo source
│   ├── config/
│   │   └── settings.json
│   └── state/
├── src/                          ← OpenClaw source code (part of your fork)
├── package.json                  ← OpenClaw's own dependencies
├── openclaw.mjs                  ← OpenClaw entry point
└── dist/                         ← Built output (after `pnpm build`)
```

**Flow**: Fork `openclaw/openclaw` → `pnpm install` at repo root → agent runs OpenClaw from source or `dist/`

The difference is structural: `.GITCLAW` *reaches outside itself* to fetch a dependency. `.GITOPENCLAW` *already lives inside* the dependency. The fork is the installation.

---

## What .GITOPENCLAW Inherits from .GITCLAW

The patterns that make `.GITCLAW` work are runtime-agnostic. `.GITOPENCLAW` preserves all of them:

| Pattern | .GITCLAW | .GITOPENCLAW |
|---|---|---|
| **Drop-in folder** | `.GITCLAW/` in any repo | `.GITOPENCLAW/` in any fork of OpenClaw |
| **Issue-driven conversation** | Issue → session → reply → commit | Identical |
| **Git-native state** | `state/issues/`, `state/sessions/` | Identical |
| **Fail-closed security** | `GITCLAW-ENABLED.md` sentinel | `GITOPENCLAW-ENABLED.md` sentinel |
| **👀 indicator** | Reaction while working | Identical |
| **Retry-on-conflict push** | `git pull --rebase` loop | Identical |
| **Multi-provider LLM** | Settings in `.pi/settings.json` | Settings in `config/settings.json` |
| **Collaborator gating** | Permission check before running | Identical |
| **Comment size limit** | 60K char cap | Identical |

The lifecycle scripts — guard, indicator, agent — follow the same pattern. The session model is the same. The workflow structure is the same. `.GITOPENCLAW` is `.GITCLAW`'s architecture with a more powerful engine underneath.

---

## What .GITOPENCLAW Adds Beyond .GITCLAW

Because the full OpenClaw runtime is available (not just a lightweight CLI), `.GITOPENCLAW` can do things `.GITCLAW` cannot:

| Capability | .GITCLAW (Pi) | .GITOPENCLAW (OpenClaw) |
|---|---|---|
| **Tools** | 7 (read, write, edit, bash, grep, find, ls) | 30+ (browser, web search, web fetch, memory, canvas, sub-agents, and more) |
| **Memory** | Append-only `memory.log` with grep-based recall | Hybrid SQLite BM25 + vector embeddings with semantic search |
| **Media** | Text only | Images, audio, video, PDFs — multimodal understanding |
| **Sub-agents** | Manual tmux spawning | Native sub-agent framework with depth limits and lane isolation |
| **Channels** | GitHub Issues only | 25+ channels (Slack, Discord, Telegram, and more) |
| **Plugins** | Markdown skills only | Full plugin SDK with manifests, hooks, config schemas, and channel adapters |
| **Thinking control** | Single `defaultThinkingLevel` setting | Per-query directives (`@think high`, `@reason on`, `@elevated`) |

See [GITOPENCLAW-Possibilities.md](../GITOPENCLAW-Possibilities.md) for the complete analysis.

---

## Getting Started: The Fork Path

### Step 1: Fork the OpenClaw Repository

Go to [github.com/openclaw/openclaw](https://github.com/openclaw/openclaw) and click **Fork**. This gives you:

- The full OpenClaw source code
- The `.GITOPENCLAW/` folder with lifecycle scripts, config, and state directories
- All existing documentation and tests
- A git remote you can sync with upstream

### Step 2: Enable the Agent

The fail-closed guard requires the sentinel file to exist. Verify it's present:

```bash
ls .GITOPENCLAW/GITOPENCLAW-ENABLED.md
```

If it's missing, create it (see [GITOPENCLAW-ENABLED.md](../GITOPENCLAW-ENABLED.md) for the format).

### Step 3: Run the Installer

```bash
bun .GITOPENCLAW/install/GITOPENCLAW-INSTALLER.ts
```

This copies the workflow and issue templates into `.github/workflows/` and `.github/ISSUE_TEMPLATE/`.

### Step 4: Install Dependencies

```bash
# Install OpenClaw's dependencies at the repo root
pnpm install
```

No separate `cd .GITOPENCLAW && bun install` needed — the OpenClaw runtime dependencies are already declared at the repo root. The `.GITOPENCLAW/package.json` can reference the local source instead of pulling from npm.

### Step 5: Add Your API Key

Go to **Settings → Secrets and variables → Actions → New repository secret**.

| Provider | Secret name |
|---|---|
| **Anthropic** | `ANTHROPIC_API_KEY` |
| **OpenAI** | `OPENAI_API_KEY` |

### Step 6: Commit and Push

```bash
git add -A
git commit -m "chore: enable gitopenclaw"
git push
```

### Step 7: Open an Issue

Create a GitHub issue. The agent wakes up, thinks, and replies.

---

## Staying Up to Date

### Syncing with Upstream

```bash
# Add upstream (one-time)
git remote add upstream https://github.com/openclaw/openclaw.git

# Fetch and merge latest changes
git fetch upstream
git merge upstream/main

# Push the sync to your fork
git push origin main
```

This pulls in:

- **OpenClaw runtime improvements** — new tools, better memory, performance fixes
- **`.GITOPENCLAW` updates** — improved lifecycle scripts, new configuration options, docs
- **Dependency updates** — security patches, compatibility fixes

### Handling Conflicts

If you've customized files that upstream also changed, git will flag conflicts. Resolve them the same way you'd resolve any merge conflict. The common cases:

| File | Likely conflict? | Resolution |
|---|---|---|
| `.GITOPENCLAW/config/settings.json` | Low — upstream won't change your config | Keep yours |
| `.GITOPENCLAW/AGENTS.md` | Low — your agent identity is yours | Keep yours |
| `.GITOPENCLAW/state/*` | None — state is unique to your fork | Keep yours |
| `src/*` (OpenClaw source) | Possible if you customized the runtime | Merge carefully |
| `package.json` | Possible on dependency changes | Accept upstream, verify |

### Fork vs. Published Package: A Comparison

| Dimension | npm Package (`openclaw@2026.x.x`) | Fork of `openclaw/openclaw` |
|---|---|---|
| **Freshness** | Published releases only | Every commit on `main` |
| **Update method** | Bump version in `package.json` | `git fetch upstream && git merge` |
| **Registry dependency** | Requires npm | Requires only GitHub |
| **Source visibility** | Need to inspect `node_modules/` | Source is right there in the repo |
| **Customization** | Override via config/plugins only | Can modify the source directly |
| **Auditability** | Trust the published build | Full git history, every line diffable |
| **CI cold start** | `npm install` downloads from registry | `pnpm install` installs declared deps locally |

---

## The Philosophy

`.GITCLAW` showed that an AI agent can be a folder in a repo. `.GITOPENCLAW` shows that the agent's *engine* can be the repo itself.

When the installation is a fork:

- **There is no version lag.** You have the source. You have the latest. You choose when to sync.
- **There is no black box.** The code that powers your agent is the code you can read, search, and modify.
- **There is no separate install.** Fork, enable, push, open an issue. Four steps.
- **There is no fragile dependency chain.** No registry outages, no broken publishes, no version conflicts. Just git.

`.GITCLAW` is an agent that lives in your repo. `.GITOPENCLAW` is an agent whose entire runtime lives in your repo.

The claw goes deeper. 🦞

---

_Last updated: 2026-02-21_
