/**
 * Command parser tests — verify that Task 1.1 features are structurally
 * present and that the parseCommand function behaves correctly.
 *
 * Run with: node --test .GITOPENCLAW/tests/command-parser.test.js
 *        or: bun test .GITOPENCLAW/tests/command-parser.test.js
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const GITOPENCLAW = path.resolve(REPO_ROOT, ".GITOPENCLAW");

function readFile(relPath) {
  return fs.readFileSync(path.resolve(REPO_ROOT, relPath), "utf-8");
}

// ── 1. Module structure ───────────────────────────────────────────────────

void describe("Command parser module structure", () => {
  void it("command-parser.ts exists in lifecycle/", () => {
    assert.ok(
      fs.existsSync(path.join(GITOPENCLAW, "lifecycle", "command-parser.ts")),
      "command-parser.ts must exist in lifecycle/",
    );
  });

  void it("exports parseCommand function", () => {
    const src = readFile(".GITOPENCLAW/lifecycle/command-parser.ts");
    assert.ok(src.includes("export function parseCommand"), "Must export parseCommand function");
  });

  void it("exports SUPPORTED_COMMANDS constant", () => {
    const src = readFile(".GITOPENCLAW/lifecycle/command-parser.ts");
    assert.ok(
      src.includes("export const SUPPORTED_COMMANDS"),
      "Must export SUPPORTED_COMMANDS constant",
    );
  });

  void it("exports MUTATION_COMMANDS set", () => {
    const src = readFile(".GITOPENCLAW/lifecycle/command-parser.ts");
    assert.ok(src.includes("export const MUTATION_COMMANDS"), "Must export MUTATION_COMMANDS set");
  });

  void it("defines ParsedCommand interface", () => {
    const src = readFile(".GITOPENCLAW/lifecycle/command-parser.ts");
    assert.ok(src.includes("ParsedCommand"), "Must define ParsedCommand interface");
    assert.ok(src.includes("command: string"), "ParsedCommand must have command field");
    assert.ok(src.includes("args: string[]"), "ParsedCommand must have args field");
    assert.ok(src.includes("rawText: string"), "ParsedCommand must have rawText field");
  });

  void it("defines CommandDescriptor interface with mutation flag", () => {
    const src = readFile(".GITOPENCLAW/lifecycle/command-parser.ts");
    assert.ok(src.includes("CommandDescriptor"), "Must define CommandDescriptor interface");
    assert.ok(src.includes("mutation: boolean"), "CommandDescriptor must have mutation field");
  });
});

// ── 2. SUPPORTED_COMMANDS covers all expected commands ────────────────────

void describe("SUPPORTED_COMMANDS coverage", () => {
  const { SUPPORTED_COMMANDS } = require("../lifecycle/command-parser.ts");

  const expectedCommands = [
    // Core commands
    "setup",
    "onboard",
    "configure",
    "config",
    "doctor",
    "dashboard",
    "reset",
    "uninstall",
    "message",
    "memory",
    "agent",
    "agents",
    "status",
    "health",
    "sessions",
    "browser",
    // Sub-CLI commands
    "acp",
    "gateway",
    "daemon",
    "logs",
    "system",
    "models",
    "approvals",
    "nodes",
    "devices",
    "node",
    "sandbox",
    "tui",
    "cron",
    "dns",
    "docs",
    "hooks",
    "webhooks",
    "qr",
    "clawbot",
    "pairing",
    "plugins",
    "channels",
    "directory",
    "security",
    "secrets",
    "skills",
    "update",
    "completion",
    // Help (built-in)
    "help",
  ];

  for (const cmd of expectedCommands) {
    void it(`includes "${cmd}" command`, () => {
      assert.ok(cmd in SUPPORTED_COMMANDS, `SUPPORTED_COMMANDS must include "${cmd}"`);
    });
  }

  void it("every command has a description", () => {
    for (const [name, desc] of Object.entries(SUPPORTED_COMMANDS)) {
      assert.ok(
        typeof desc.description === "string" && desc.description.length > 0,
        `Command "${name}" must have a non-empty description`,
      );
    }
  });

  void it("every command has a mutation flag", () => {
    for (const [name, desc] of Object.entries(SUPPORTED_COMMANDS)) {
      assert.ok(
        typeof desc.mutation === "boolean",
        `Command "${name}" must have a boolean mutation flag`,
      );
    }
  });
});

// ── 3. parseCommand function logic (unit tests) ──────────────────────────

void describe("parseCommand logic", () => {
  const { parseCommand } = require("../lifecycle/command-parser.ts");

  // ── Slash command detection ──────────────────────────────────────────────

  void it("parses /status as a recognized command", () => {
    const result = parseCommand("/status");
    assert.strictEqual(result.command, "status");
    assert.deepStrictEqual(result.args, []);
    assert.strictEqual(result.rawText, "/status");
  });

  void it("parses /help as a recognized command", () => {
    const result = parseCommand("/help");
    assert.strictEqual(result.command, "help");
    assert.deepStrictEqual(result.args, []);
  });

  void it("parses /config set provider openai with arguments", () => {
    const result = parseCommand("/config set provider openai");
    assert.strictEqual(result.command, "config");
    assert.deepStrictEqual(result.args, ["set", "provider", "openai"]);
  });

  void it("parses /memory search query with arguments", () => {
    const result = parseCommand("/memory search some query");
    assert.strictEqual(result.command, "memory");
    assert.deepStrictEqual(result.args, ["search", "some", "query"]);
  });

  void it("parses /channels status with arguments", () => {
    const result = parseCommand("/channels status");
    assert.strictEqual(result.command, "channels");
    assert.deepStrictEqual(result.args, ["status"]);
  });

  void it("parses /sessions list with arguments", () => {
    const result = parseCommand("/sessions list");
    assert.strictEqual(result.command, "sessions");
    assert.deepStrictEqual(result.args, ["list"]);
  });

  void it("parses /models list with arguments", () => {
    const result = parseCommand("/models list");
    assert.strictEqual(result.command, "models");
    assert.deepStrictEqual(result.args, ["list"]);
  });

  void it("parses /cron create with arguments", () => {
    const result = parseCommand("/cron create");
    assert.strictEqual(result.command, "cron");
    assert.deepStrictEqual(result.args, ["create"]);
  });

  void it("parses /plugins install with arguments", () => {
    const result = parseCommand("/plugins install");
    assert.strictEqual(result.command, "plugins");
    assert.deepStrictEqual(result.args, ["install"]);
  });

  void it("parses /update as a recognized command", () => {
    const result = parseCommand("/update");
    assert.strictEqual(result.command, "update");
    assert.deepStrictEqual(result.args, []);
  });

  void it("parses /skills list with arguments", () => {
    const result = parseCommand("/skills list");
    assert.strictEqual(result.command, "skills");
    assert.deepStrictEqual(result.args, ["list"]);
  });

  void it("parses /acp as a recognized command", () => {
    const result = parseCommand("/acp");
    assert.strictEqual(result.command, "acp");
    assert.deepStrictEqual(result.args, []);
  });

  void it("parses /daemon status with arguments", () => {
    const result = parseCommand("/daemon status");
    assert.strictEqual(result.command, "daemon");
    assert.deepStrictEqual(result.args, ["status"]);
  });

  void it("parses /node list with arguments", () => {
    const result = parseCommand("/node list");
    assert.strictEqual(result.command, "node");
    assert.deepStrictEqual(result.args, ["list"]);
  });

  void it("parses /tui as a recognized command", () => {
    const result = parseCommand("/tui");
    assert.strictEqual(result.command, "tui");
    assert.deepStrictEqual(result.args, []);
  });

  void it("parses /qr as a recognized command", () => {
    const result = parseCommand("/qr");
    assert.strictEqual(result.command, "qr");
    assert.deepStrictEqual(result.args, []);
  });

  void it("parses /clawbot help with arguments", () => {
    const result = parseCommand("/clawbot help");
    assert.strictEqual(result.command, "clawbot");
    assert.deepStrictEqual(result.args, ["help"]);
  });

  void it("parses /doctor as a recognized command", () => {
    const result = parseCommand("/doctor");
    assert.strictEqual(result.command, "doctor");
    assert.deepStrictEqual(result.args, []);
  });

  // ── Natural language fallback ───────────────────────────────────────────

  void it("returns agent command for plain text (natural language)", () => {
    const result = parseCommand("Please explain how the routing works");
    assert.strictEqual(result.command, "agent");
    assert.deepStrictEqual(result.args, []);
    assert.strictEqual(result.rawText, "Please explain how the routing works");
  });

  void it("returns agent command for multiline text without slash prefix", () => {
    const result = parseCommand("Can you help me?\nI need to fix a bug.");
    assert.strictEqual(result.command, "agent");
    assert.deepStrictEqual(result.args, []);
  });

  void it("returns agent command for empty string", () => {
    const result = parseCommand("");
    assert.strictEqual(result.command, "agent");
    assert.deepStrictEqual(result.args, []);
  });

  void it("returns agent command for whitespace-only string", () => {
    const result = parseCommand("   \n   ");
    assert.strictEqual(result.command, "agent");
    assert.deepStrictEqual(result.args, []);
  });

  // ── Unknown command handling ────────────────────────────────────────────

  void it("returns unknown command name for unrecognized slash commands", () => {
    const result = parseCommand("/foobar do something");
    assert.strictEqual(result.command, "foobar");
    assert.deepStrictEqual(result.args, ["do", "something"]);
    assert.strictEqual(result.rawText, "/foobar do something");
  });

  void it("returns 'unknown' for bare slash", () => {
    const result = parseCommand("/");
    assert.strictEqual(result.command, "unknown");
    assert.deepStrictEqual(result.args, []);
  });

  // ── Edge cases ──────────────────────────────────────────────────────────

  void it("is case-insensitive for command names", () => {
    const result = parseCommand("/STATUS");
    assert.strictEqual(result.command, "status");
  });

  void it("ignores leading whitespace", () => {
    const result = parseCommand("  /status");
    assert.strictEqual(result.command, "status");
  });

  void it("only checks the first line for slash prefix", () => {
    const result = parseCommand("Some text\n/status");
    assert.strictEqual(result.command, "agent");
  });

  void it("preserves rawText in all cases", () => {
    const input = "/config set model gpt-4\n\nSome extra context";
    const result = parseCommand(input);
    assert.strictEqual(result.rawText, input);
    assert.strictEqual(result.command, "config");
    assert.deepStrictEqual(result.args, ["set", "model", "gpt-4"]);
  });

  void it("handles multiple spaces between arguments", () => {
    const result = parseCommand("/config   set   provider   openai");
    assert.strictEqual(result.command, "config");
    assert.deepStrictEqual(result.args, ["set", "provider", "openai"]);
  });
});

// ── 4. MUTATION_COMMANDS correctness ──────────────────────────────────────

void describe("MUTATION_COMMANDS", () => {
  const {
    SUPPORTED_COMMANDS,
    MUTATION_COMMANDS,
    isMutationInvocation,
  } = require("../lifecycle/command-parser.ts");

  void it("is a Set", () => {
    assert.ok(MUTATION_COMMANDS instanceof Set, "MUTATION_COMMANDS must be a Set");
  });

  void it("contains exactly the commands with mutation=true", () => {
    const expected = new Set(
      Object.entries(SUPPORTED_COMMANDS)
        .filter(([, desc]) => desc.mutation)
        .map(([name]) => name),
    );
    assert.deepStrictEqual(MUTATION_COMMANDS, expected);
  });

  void it("includes known mutation commands", () => {
    const knownMutation = ["config", "plugins", "update", "setup", "reset", "uninstall"];
    for (const cmd of knownMutation) {
      assert.ok(MUTATION_COMMANDS.has(cmd), `MUTATION_COMMANDS must include "${cmd}"`);
    }
  });

  void it("excludes known read-only commands", () => {
    const knownReadOnly = ["status", "help", "doctor", "sessions", "memory", "models", "skills"];
    for (const cmd of knownReadOnly) {
      assert.ok(!MUTATION_COMMANDS.has(cmd), `MUTATION_COMMANDS must not include "${cmd}"`);
    }
  });

  void it("treats /config get as read-only but /config set as mutation", () => {
    assert.equal(isMutationInvocation("config", ["get", "provider"]), false);
    assert.equal(isMutationInvocation("config", ["set", "provider", "openai"]), true);
  });

  void it("treats /plugins list as read-only but /plugins install as mutation", () => {
    assert.equal(isMutationInvocation("plugins", ["list"]), false);
    assert.equal(isMutationInvocation("plugins", ["install", "@openclaw/example"]), true);
  });
});

// ── 5. Agent integration — command parser wired into GITOPENCLAW-AGENT.ts ─

void describe("Agent command-parser integration", () => {
  const agent = readFile(".GITOPENCLAW/lifecycle/GITOPENCLAW-AGENT.ts");

  void it("imports parseCommand from command-parser.ts", () => {
    assert.ok(agent.includes("import { parseCommand"), "Agent must import parseCommand");
  });

  void it("imports mutation gating helper from command-parser.ts", () => {
    assert.ok(agent.includes("isMutationInvocation"), "Agent must import isMutationInvocation");
  });

  void it("calls parseCommand with the comment/prompt text", () => {
    assert.ok(agent.includes("parseCommand("), "Agent must call parseCommand");
  });

  void it("handles structured slash commands differently from natural language", () => {
    assert.ok(
      agent.includes('parsedCmd.command !== "agent"'),
      "Agent must check if the parsed command is a slash command vs natural language",
    );
  });

  void it("builds openclaw CLI invocation for structured commands", () => {
    assert.ok(
      agent.includes("openclaw") && agent.includes("parsedCmd.command"),
      "Agent must build openclaw CLI invocation for slash commands",
    );
  });

  void it("blocks mutation commands for semi-trusted users", () => {
    assert.ok(
      agent.includes("isMutationInvocation") && agent.includes("semi-trusted"),
      "Agent must check mutation commands against trust level",
    );
    assert.ok(
      agent.includes("Permission Denied"),
      "Agent must post a denial message for blocked mutation commands",
    );
  });

  void it("handles /help locally without shelling out to openclaw binary", () => {
    assert.ok(
      agent.includes('parsedCmd.command === "help"'),
      "Agent must handle /help as a special built-in command",
    );
    assert.ok(
      agent.includes("Available Slash Commands"),
      "Agent must generate a formatted list of available commands for /help",
    );
  });
});
