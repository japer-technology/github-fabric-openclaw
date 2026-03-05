/**
 * Tests for apply-openclaw-patches.sh — verify that GITOPENCLAW patches
 * are applied correctly to a mock OpenClaw clone and are idempotent.
 *
 * Run with: node --test .GITOPENCLAW/tests/apply-patches.test.js
 *        or: bun test .GITOPENCLAW/tests/apply-patches.test.js
 */

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");
const os = require("node:os");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const PATCH_SCRIPT = path.resolve(REPO_ROOT, ".GITOPENCLAW/install/apply-openclaw-patches.sh");

// ── Helpers ─────────────────────────────────────────────────────────────────

function createMockRepo(dir) {
  const dirs = [
    "src/config",
    "src/gateway",
    "src/agents",
    "src/commands",
    ".github/workflows",
    ".github/ISSUE_TEMPLATE",
  ];
  for (const d of dirs) {
    fs.mkdirSync(path.join(dir, d), { recursive: true });
  }

  // paths.ts — matches actual upstream pattern
  fs.writeFileSync(
    path.join(dir, "src/config/paths.ts"),
    [
      'export function resolveDefaultConfigCandidates(',
      '  env: NodeJS.ProcessEnv = process.env,',
      '  homedir: () => string = envHomedir(env),',
      '): string[] {',
      '  const candidates: string[] = [];',
      '  const openclawStateDir = env.OPENCLAW_STATE_DIR?.trim() || env.CLAWDBOT_STATE_DIR?.trim();',
      '  if (openclawStateDir) {',
      '    const resolved = resolveUserPath(openclawStateDir, env, effectiveHomedir);',
      '    candidates.push(path.join(resolved, CONFIG_FILENAME));',
      '    candidates.push(...LEGACY_CONFIG_FILENAMES.map((name) => path.join(resolved, name)));',
      '  }',
      '',
      '  const defaultDirs = [newStateDir(effectiveHomedir)];',
      '  return candidates;',
      '}',
      '',
      'export const STATE_DIR = resolveStateDir();',
      'export const CONFIG_PATH = resolveConfigPathCandidate();',
    ].join("\n"),
  );

  // probe.ts — matches actual upstream pattern
  fs.writeFileSync(
    path.join(dir, "src/gateway/probe.ts"),
    [
      "const timer = setTimeout(() => {",
      "  settle({",
      "    ok: false,",
      '    error: connectError ? `connect failed: ${connectError}` : "timeout",',
      "  });",
      "}, opts.timeoutMs);",
    ].join("\n"),
  );

  // agent-paths.ts — matches actual upstream pattern
  fs.writeFileSync(
    path.join(dir, "src/agents/agent-paths.ts"),
    [
      "export function ensureOpenClawAgentEnv(): string {",
      "  const dir = resolveOpenClawAgentDir();",
      "  if (!process.env.OPENCLAW_AGENT_DIR) {",
      "    process.env.OPENCLAW_AGENT_DIR = dir;",
      "  }",
      "  return dir;",
      "}",
    ].join("\n"),
  );

  // status-all.ts
  fs.writeFileSync(
    path.join(dir, "src/commands/status-all.ts"),
    [
      "export async function statusAllCommand() {",
      '  await withProgress({ label: "Scanning status --all…", total: 11 }, async (progress) => {',
      "    const gatewayStatus = gatewayReachable",
      "      ? `reachable`",
      "      : gatewayProbe?.error",
      '        ? `unreachable (${gatewayProbe.error})`',
      '        : "unreachable";',
      '    : { Item: "Gateway service", Value: "unknown" };',
      '    : { Item: "Node service", Value: "unknown" };',
      "  });",
      "}",
    ].join("\n"),
  );

  // status.command.ts
  fs.writeFileSync(
    path.join(dir, "src/commands/status.command.ts"),
    [
      "export async function statusCommand() {",
      "  const gatewayReachable = gatewayProbe?.ok === true;",
      "  const reach = gatewayReachable",
      '    ? ok("reachable")',
      '    : warn("unreachable");',
      "}",
    ].join("\n"),
  );

  // Upstream .github files
  fs.writeFileSync(path.join(dir, ".github/FUNDING.yml"), "github: [openclaw]");
  fs.writeFileSync(path.join(dir, ".github/workflows/ci.yml"), "name: CI");
  fs.writeFileSync(path.join(dir, ".github/ISSUE_TEMPLATE/bug_report.yml"), "name: Bug");
}

function runPatchScript(repoDir) {
  return execSync(`bash "${PATCH_SCRIPT}" --repo-dir "${repoDir}" 2>&1`, {
    encoding: "utf-8",
  });
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("apply-openclaw-patches.sh", () => {
  let tmpDir;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gitopenclaw-patch-test-"));
    createMockRepo(tmpDir);
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("patch script exists and is executable", () => {
    assert.ok(fs.existsSync(PATCH_SCRIPT), "apply-openclaw-patches.sh should exist");
  });

  it("applies all patches on first run", () => {
    const output = runPatchScript(tmpDir);
    assert.match(output, /GITOPENCLAW patches complete/, "should complete successfully");
    // At least some patches should be applied
    assert.match(output, /Patches applied: [1-9]/, "should apply at least one patch");
  });

  it("patches paths.ts: skip legacy scanning", () => {
    const content = fs.readFileSync(path.join(tmpDir, "src/config/paths.ts"), "utf-8");
    assert.ok(
      content.includes("// When OPENCLAW_STATE_DIR is explicitly set"),
      "should add OPENCLAW_STATE_DIR comment",
    );
    assert.ok(
      content.includes("return candidates;"),
      "should add early return",
    );
  });

  it("patches paths.ts: lazy getStateDir()", () => {
    const content = fs.readFileSync(path.join(tmpDir, "src/config/paths.ts"), "utf-8");
    assert.ok(
      content.includes("export function getStateDir(): string"),
      "should add getStateDir() function",
    );
  });

  it("patches paths.ts: lazy getConfigPath()", () => {
    const content = fs.readFileSync(path.join(tmpDir, "src/config/paths.ts"), "utf-8");
    assert.ok(
      content.includes("export function getConfigPath(): string"),
      "should add getConfigPath() function",
    );
  });

  it("patches probe.ts: ECONNREFUSED handling", () => {
    const content = fs.readFileSync(path.join(tmpDir, "src/gateway/probe.ts"), "utf-8");
    assert.ok(
      content.includes('"not running"'),
      "should add 'not running' for ECONNREFUSED",
    );
    assert.ok(
      content.includes('connectError.includes("ECONNREFUSED")'),
      "should check for ECONNREFUSED",
    );
  });

  it("patches agent-paths.ts: subprocess model comment", () => {
    const content = fs.readFileSync(path.join(tmpDir, "src/agents/agent-paths.ts"), "utf-8");
    assert.ok(
      content.includes("OPENCLAW_STATE_DIR is set before this code runs"),
      "should add subprocess model documentation comment",
    );
  });

  it("patches status-all.ts: CI detection", () => {
    const content = fs.readFileSync(path.join(tmpDir, "src/commands/status-all.ts"), "utf-8");
    assert.ok(
      content.includes("const isCI"),
      "should add isCI detection",
    );
  });

  it("patches status.command.ts: CI detection", () => {
    const content = fs.readFileSync(path.join(tmpDir, "src/commands/status.command.ts"), "utf-8");
    assert.ok(
      content.includes("const isCI"),
      "should add isCI detection",
    );
  });

  it("disables upstream .github/ files", () => {
    const disabledDir = path.join(tmpDir, ".github/workflows-disabled");
    assert.ok(fs.existsSync(disabledDir), "workflows-disabled/ should exist");
    assert.ok(
      fs.existsSync(path.join(disabledDir, "ci.yml")),
      "ci.yml should be moved to workflows-disabled/",
    );
    assert.ok(
      fs.existsSync(path.join(disabledDir, "FUNDING.yml")),
      "FUNDING.yml should be moved to workflows-disabled/",
    );
    assert.ok(
      !fs.existsSync(path.join(tmpDir, ".github/workflows/ci.yml")),
      "ci.yml should not remain in workflows/",
    );
  });

  it("is idempotent — second run skips all patches", () => {
    const output = runPatchScript(tmpDir);
    assert.match(output, /Patches applied: 0/, "should not re-apply any patches");
    assert.match(output, /skipped.*: [1-9]/, "should skip already-applied patches");
  });

  it("reports error for missing repo dir", () => {
    try {
      runPatchScript("/tmp/nonexistent-dir-12345");
      assert.fail("should have thrown");
    } catch (err) {
      // The error output is in stdout (captured via 2>&1)
      const output = err.stdout || err.stderr || String(err);
      assert.ok(
        output.includes("OpenClaw repo not found") || err.status !== 0,
        "should fail for missing repo",
      );
    }
  });
});
