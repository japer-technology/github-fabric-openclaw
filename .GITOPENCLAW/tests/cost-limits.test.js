/**
 * Cost and resource boundaries tests — verify that Task 0.3 features are
 * structurally present and correctly configured.
 *
 * Run with: node --test .GITOPENCLAW/tests/cost-limits.test.js
 *        or: bun test .GITOPENCLAW/tests/cost-limits.test.js
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

// ── 1. Schema defines limits object ───────────────────────────────────────

describe("Limits schema", () => {
  it("schema defines limits as an optional object", () => {
    const schema = JSON.parse(readFile(".GITOPENCLAW/config/settings.schema.json"));
    const lim = schema.properties?.limits;
    assert.ok(lim, "Schema must define limits property");
    assert.strictEqual(lim.type, "object", "limits must be an object type");
  });

  it("schema defines maxTokensPerRun as an integer with minimum 1000", () => {
    const schema = JSON.parse(readFile(".GITOPENCLAW/config/settings.schema.json"));
    const prop = schema.properties?.limits?.properties?.maxTokensPerRun;
    assert.ok(prop, "Schema must define maxTokensPerRun");
    assert.strictEqual(prop.type, "integer");
    assert.strictEqual(prop.minimum, 1000);
  });

  it("schema defines maxToolCallsPerRun as an integer with minimum 1", () => {
    const schema = JSON.parse(readFile(".GITOPENCLAW/config/settings.schema.json"));
    const prop = schema.properties?.limits?.properties?.maxToolCallsPerRun;
    assert.ok(prop, "Schema must define maxToolCallsPerRun");
    assert.strictEqual(prop.type, "integer");
    assert.strictEqual(prop.minimum, 1);
  });

  it("schema defines workflowTimeoutMinutes as an integer with minimum 1 and maximum 360", () => {
    const schema = JSON.parse(readFile(".GITOPENCLAW/config/settings.schema.json"));
    const prop = schema.properties?.limits?.properties?.workflowTimeoutMinutes;
    assert.ok(prop, "Schema must define workflowTimeoutMinutes");
    assert.strictEqual(prop.type, "integer");
    assert.strictEqual(prop.minimum, 1);
    assert.strictEqual(prop.maximum, 360);
  });

  it("limits does not allow additional properties", () => {
    const schema = JSON.parse(readFile(".GITOPENCLAW/config/settings.schema.json"));
    const lim = schema.properties?.limits;
    assert.strictEqual(lim.additionalProperties, false);
  });
});

// ── 2. Settings.json includes limits ──────────────────────────────────────

describe("Limits in settings.json", () => {
  it("settings.json has a limits object", () => {
    const settings = JSON.parse(readFile(".GITOPENCLAW/config/settings.json"));
    assert.ok(settings.limits, "settings.json must include limits");
    assert.strictEqual(typeof settings.limits, "object");
  });

  it("limits has valid maxTokensPerRun", () => {
    const settings = JSON.parse(readFile(".GITOPENCLAW/config/settings.json"));
    assert.ok(Number.isInteger(settings.limits.maxTokensPerRun));
    assert.ok(settings.limits.maxTokensPerRun >= 1000);
  });

  it("limits has valid maxToolCallsPerRun", () => {
    const settings = JSON.parse(readFile(".GITOPENCLAW/config/settings.json"));
    assert.ok(Number.isInteger(settings.limits.maxToolCallsPerRun));
    assert.ok(settings.limits.maxToolCallsPerRun >= 1);
  });

  it("limits has valid workflowTimeoutMinutes", () => {
    const settings = JSON.parse(readFile(".GITOPENCLAW/config/settings.json"));
    assert.ok(Number.isInteger(settings.limits.workflowTimeoutMinutes));
    assert.ok(settings.limits.workflowTimeoutMinutes >= 1);
    assert.ok(settings.limits.workflowTimeoutMinutes <= 360);
  });
});

// ── 3. Preflight validates limits ─────────────────────────────────────────

describe("Preflight limits validation", () => {
  const preflight = readFile(".GITOPENCLAW/lifecycle/GITOPENCLAW-PREFLIGHT.ts");

  it("preflight checks limits if present", () => {
    assert.ok(
      preflight.includes("settings.limits"),
      "Preflight must validate limits section"
    );
  });

  it("preflight validates maxTokensPerRun", () => {
    assert.ok(
      preflight.includes("maxTokensPerRun"),
      "Preflight must validate maxTokensPerRun"
    );
    assert.ok(
      preflight.includes("1000"),
      "Preflight must enforce minimum 1000 for maxTokensPerRun"
    );
  });

  it("preflight validates maxToolCallsPerRun", () => {
    assert.ok(
      preflight.includes("maxToolCallsPerRun"),
      "Preflight must validate maxToolCallsPerRun"
    );
  });

  it("preflight validates workflowTimeoutMinutes range", () => {
    assert.ok(
      preflight.includes("workflowTimeoutMinutes"),
      "Preflight must validate workflowTimeoutMinutes"
    );
    assert.ok(
      preflight.includes("360"),
      "Preflight must enforce maximum 360 for workflowTimeoutMinutes"
    );
  });
});

// ── 4. Agent enforces limits ──────────────────────────────────────────────

describe("Agent limits enforcement", () => {
  const agent = readFile(".GITOPENCLAW/lifecycle/GITOPENCLAW-AGENT.ts");

  it("reads configuredLimits from settings", () => {
    assert.ok(
      agent.includes("configuredLimits"),
      "Agent must read limits from settings.json"
    );
    assert.ok(
      agent.includes("settings.limits"),
      "Agent must reference settings.limits"
    );
  });

  it("passes --timeout flag when workflowTimeoutMinutes is set", () => {
    assert.ok(
      agent.includes('"--timeout"'),
      "Agent must pass --timeout flag to openclaw agent"
    );
    assert.ok(
      agent.includes("configuredLimits?.workflowTimeoutMinutes"),
      "Agent must check workflowTimeoutMinutes before passing --timeout"
    );
  });

  it("converts workflowTimeoutMinutes to seconds for --timeout", () => {
    assert.ok(
      agent.includes("workflowTimeoutMinutes * 60"),
      "Agent must convert minutes to seconds when passing --timeout (multiply by 60)"
    );
  });

  it("sets timeoutSeconds in the runtime config", () => {
    assert.ok(
      agent.includes("timeoutSeconds"),
      "Runtime config must include agents.defaults.timeoutSeconds"
    );
  });

  it("extracts usage metadata from agent JSON output", () => {
    assert.ok(
      agent.includes("agentMeta"),
      "Agent must extract agentMeta from parsed output"
    );
    assert.ok(
      agent.includes("usage"),
      "Agent must extract usage from agentMeta"
    );
    assert.ok(
      agent.includes("tokensUsed"),
      "Agent must extract tokensUsed"
    );
    assert.ok(
      agent.includes("tokensInput"),
      "Agent must extract tokensInput"
    );
    assert.ok(
      agent.includes("tokensOutput"),
      "Agent must extract tokensOutput"
    );
  });

  it("counts tool calls from session transcript JSONL", () => {
    assert.ok(
      agent.includes("toolCallCount"),
      "Agent must count tool calls from session transcript"
    );
    assert.ok(
      agent.includes("transcriptPath"),
      "Agent must reference the transcript path for tool-call counting"
    );
  });

  it("appends usage entry to state/usage.log", () => {
    assert.ok(
      agent.includes("usageLogPath"),
      "Agent must reference usage.log path"
    );
    assert.ok(
      agent.includes("appendFileSync"),
      "Agent must use appendFileSync to write usage entries"
    );
    assert.ok(
      agent.includes("usageEntry"),
      "Agent must construct a usage entry"
    );
  });

  it("usage entry includes all required fields", () => {
    assert.ok(agent.includes("timestamp"), "Usage entry must include timestamp");
    assert.ok(agent.includes("issueNumber"), "Usage entry must include issueNumber");
    assert.ok(agent.includes("tokensUsed"), "Usage entry must include tokensUsed");
    assert.ok(agent.includes("tokensInput"), "Usage entry must include tokensInput");
    assert.ok(agent.includes("tokensOutput"), "Usage entry must include tokensOutput");
    assert.ok(agent.includes("cacheRead"), "Usage entry must include cacheRead");
    assert.ok(agent.includes("cacheWrite"), "Usage entry must include cacheWrite");
    assert.ok(agent.includes("durationMs"), "Usage entry must include durationMs");
    assert.ok(agent.includes("stopReason"), "Usage entry must include stopReason");
  });

  it("checks token budget and posts warning on violation", () => {
    assert.ok(
      agent.includes("Token Budget Exceeded"),
      "Agent must post a warning when token budget is exceeded"
    );
    assert.ok(
      agent.includes("maxTokensPerRun"),
      "Agent must reference maxTokensPerRun for budget check"
    );
  });

  it("checks tool-call limit and posts warning on violation", () => {
    assert.ok(
      agent.includes("Tool-Call Limit Exceeded"),
      "Agent must post a warning when tool-call limit is exceeded"
    );
    assert.ok(
      agent.includes("maxToolCallsPerRun"),
      "Agent must reference maxToolCallsPerRun for limit check"
    );
  });
});

// ── 5. Usage log git attributes ───────────────────────────────────────────

describe("Usage log git attributes", () => {
  it("state/.gitattributes exists", () => {
    assert.ok(
      fs.existsSync(path.join(GITOPENCLAW, "state", ".gitattributes")),
      ".gitattributes must exist in state/"
    );
  });

  it("state/.gitattributes sets merge=union for usage.log", () => {
    const attrs = readFile(".GITOPENCLAW/state/.gitattributes");
    assert.ok(
      attrs.includes("usage.log") && attrs.includes("merge=union"),
      ".gitattributes must set merge=union for usage.log"
    );
  });
});
