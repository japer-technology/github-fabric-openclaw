/**
 * Trust-level gating tests — verify that Task 0.2 features are structurally
 * present and that the resolveTrustLevel function behaves correctly.
 *
 * Run with: node --test .GITOPENCLAW/tests/trust-level.test.js
 *        or: bun test .GITOPENCLAW/tests/trust-level.test.js
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

// ── 1. Schema defines trustPolicy ─────────────────────────────────────────

describe("Trust policy schema", () => {
  it("schema defines trustPolicy as an object", () => {
    const schema = JSON.parse(readFile(".GITOPENCLAW/config/settings.schema.json"));
    const tp = schema.properties?.trustPolicy;
    assert.ok(tp, "Schema must define trustPolicy property");
    assert.strictEqual(tp.type, "object", "trustPolicy must be an object type");
  });

  it("schema defines trustedUsers as an array of strings", () => {
    const schema = JSON.parse(readFile(".GITOPENCLAW/config/settings.schema.json"));
    const prop = schema.properties?.trustPolicy?.properties?.trustedUsers;
    assert.ok(prop, "Schema must define trustedUsers");
    assert.strictEqual(prop.type, "array");
    assert.strictEqual(prop.items.type, "string");
  });

  it("schema defines semiTrustedRoles as an array with enum constraint", () => {
    const schema = JSON.parse(readFile(".GITOPENCLAW/config/settings.schema.json"));
    const prop = schema.properties?.trustPolicy?.properties?.semiTrustedRoles;
    assert.ok(prop, "Schema must define semiTrustedRoles");
    assert.strictEqual(prop.type, "array");
    assert.ok(Array.isArray(prop.items.enum), "semiTrustedRoles items must have enum");
    assert.ok(prop.items.enum.includes("admin"), "Enum must include admin");
    assert.ok(prop.items.enum.includes("maintain"), "Enum must include maintain");
    assert.ok(prop.items.enum.includes("write"), "Enum must include write");
  });

  it("schema defines untrustedBehavior as an enum", () => {
    const schema = JSON.parse(readFile(".GITOPENCLAW/config/settings.schema.json"));
    const prop = schema.properties?.trustPolicy?.properties?.untrustedBehavior;
    assert.ok(prop, "Schema must define untrustedBehavior");
    assert.ok(Array.isArray(prop.enum), "untrustedBehavior must have enum");
    assert.ok(prop.enum.includes("read-only-response"));
    assert.ok(prop.enum.includes("block"));
  });
});

// ── 2. Settings.json includes trustPolicy ─────────────────────────────────

describe("Trust policy in settings.json", () => {
  it("settings.json has a trustPolicy object", () => {
    const settings = JSON.parse(readFile(".GITOPENCLAW/config/settings.json"));
    assert.ok(settings.trustPolicy, "settings.json must include trustPolicy");
    assert.strictEqual(typeof settings.trustPolicy, "object");
  });

  it("trustPolicy has trustedUsers array", () => {
    const settings = JSON.parse(readFile(".GITOPENCLAW/config/settings.json"));
    assert.ok(Array.isArray(settings.trustPolicy.trustedUsers));
  });

  it("trustPolicy has semiTrustedRoles array", () => {
    const settings = JSON.parse(readFile(".GITOPENCLAW/config/settings.json"));
    assert.ok(Array.isArray(settings.trustPolicy.semiTrustedRoles));
    assert.ok(settings.trustPolicy.semiTrustedRoles.includes("write"));
  });

  it("trustPolicy has valid untrustedBehavior", () => {
    const settings = JSON.parse(readFile(".GITOPENCLAW/config/settings.json"));
    assert.ok(["read-only-response", "block"].includes(settings.trustPolicy.untrustedBehavior));
  });
});

// ── 3. Trust-level resolution module exists ───────────────────────────────

describe("Trust-level module structure", () => {
  it("trust-level.ts exists in lifecycle/", () => {
    assert.ok(
      fs.existsSync(path.join(GITOPENCLAW, "lifecycle", "trust-level.ts")),
      "trust-level.ts must exist in lifecycle/"
    );
  });

  it("exports resolveTrustLevel function", () => {
    const src = readFile(".GITOPENCLAW/lifecycle/trust-level.ts");
    assert.ok(
      src.includes("export function resolveTrustLevel"),
      "Must export resolveTrustLevel function"
    );
  });

  it("defines TrustLevel type", () => {
    const src = readFile(".GITOPENCLAW/lifecycle/trust-level.ts");
    assert.ok(src.includes("TrustLevel"), "Must define TrustLevel type");
    assert.ok(src.includes('"trusted"'), "TrustLevel must include trusted");
    assert.ok(src.includes('"semi-trusted"'), "TrustLevel must include semi-trusted");
    assert.ok(src.includes('"untrusted"'), "TrustLevel must include untrusted");
  });

  it("defines TrustPolicy interface", () => {
    const src = readFile(".GITOPENCLAW/lifecycle/trust-level.ts");
    assert.ok(src.includes("TrustPolicy"), "Must define TrustPolicy interface");
    assert.ok(src.includes("trustedUsers"), "TrustPolicy must include trustedUsers");
    assert.ok(src.includes("semiTrustedRoles"), "TrustPolicy must include semiTrustedRoles");
    assert.ok(src.includes("untrustedBehavior"), "TrustPolicy must include untrustedBehavior");
  });
});

// ── 4. resolveTrustLevel function logic (unit tests) ──────────────────────

describe("resolveTrustLevel logic", () => {
  // Use require() to load the module — bun handles .ts transpilation automatically.
  const { resolveTrustLevel } = require("../lifecycle/trust-level.ts");

  it("returns 'trusted' when no trustPolicy is provided", () => {
    assert.strictEqual(resolveTrustLevel("alice", "write", undefined), "trusted");
  });

  it("returns 'trusted' when trustPolicy is null-ish", () => {
    assert.strictEqual(resolveTrustLevel("alice", "write", null), "trusted");
  });

  it("returns 'trusted' when actor is in trustedUsers", () => {
    const policy = { trustedUsers: ["alice", "bob"], semiTrustedRoles: ["write"] };
    assert.strictEqual(resolveTrustLevel("alice", "read", policy), "trusted");
  });

  it("returns 'trusted' for trustedUser even if permission would be semi-trusted", () => {
    const policy = { trustedUsers: ["alice"], semiTrustedRoles: ["write"] };
    assert.strictEqual(resolveTrustLevel("alice", "write", policy), "trusted");
  });

  it("returns 'semi-trusted' when actor permission is in semiTrustedRoles", () => {
    const policy = { trustedUsers: [], semiTrustedRoles: ["write"] };
    assert.strictEqual(resolveTrustLevel("charlie", "write", policy), "semi-trusted");
  });

  it("returns 'semi-trusted' for admin if admin is in semiTrustedRoles", () => {
    const policy = { trustedUsers: [], semiTrustedRoles: ["admin", "write"] };
    assert.strictEqual(resolveTrustLevel("charlie", "admin", policy), "semi-trusted");
  });

  it("returns 'untrusted' when actor is not trusted and permission is not semi-trusted", () => {
    const policy = { trustedUsers: ["alice"], semiTrustedRoles: ["write"] };
    assert.strictEqual(resolveTrustLevel("mallory", "read", policy), "untrusted");
  });

  it("returns 'untrusted' when actor has 'none' permission", () => {
    const policy = { trustedUsers: [], semiTrustedRoles: ["write"] };
    assert.strictEqual(resolveTrustLevel("stranger", "none", policy), "untrusted");
  });

  it("returns 'untrusted' when trustedUsers is empty and permission does not match", () => {
    const policy = { trustedUsers: [], semiTrustedRoles: ["admin"] };
    assert.strictEqual(resolveTrustLevel("dev", "write", policy), "untrusted");
  });

  it("handles missing trustedUsers gracefully", () => {
    const policy = { semiTrustedRoles: ["write"] };
    assert.strictEqual(resolveTrustLevel("alice", "write", policy), "semi-trusted");
    assert.strictEqual(resolveTrustLevel("alice", "read", policy), "untrusted");
  });

  it("handles missing semiTrustedRoles gracefully", () => {
    const policy = { trustedUsers: ["alice"] };
    assert.strictEqual(resolveTrustLevel("alice", "write", policy), "trusted");
    assert.strictEqual(resolveTrustLevel("bob", "write", policy), "untrusted");
  });

  it("handles empty policy object", () => {
    const policy = {};
    assert.strictEqual(resolveTrustLevel("alice", "write", policy), "untrusted");
  });
});

// ── 5. Agent integration — trust gating wired into GITOPENCLAW-AGENT.ts ──

describe("Agent trust-level integration", () => {
  const agent = readFile(".GITOPENCLAW/lifecycle/GITOPENCLAW-AGENT.ts");

  it("imports resolveTrustLevel from trust-level.ts", () => {
    assert.ok(
      agent.includes('import { resolveTrustLevel }'),
      "Agent must import resolveTrustLevel"
    );
  });

  it("reads GITHUB_ACTOR from the environment", () => {
    assert.ok(
      agent.includes("GITHUB_ACTOR"),
      "Agent must read GITHUB_ACTOR from the workflow environment"
    );
  });

  it("reads ACTOR_PERMISSION from the environment", () => {
    assert.ok(
      agent.includes("ACTOR_PERMISSION"),
      "Agent must read ACTOR_PERMISSION from the workflow environment"
    );
  });

  it("calls resolveTrustLevel with actor, permission, and policy", () => {
    assert.ok(
      agent.includes("resolveTrustLevel(actor, actorPermission, configuredTrustPolicy)"),
      "Agent must call resolveTrustLevel with the correct arguments"
    );
  });

  it("handles untrusted actors (block or read-only-response)", () => {
    assert.ok(
      agent.includes('trustLevel === "untrusted"'),
      "Agent must check for untrusted trust level"
    );
    assert.ok(
      agent.includes("Access Denied"),
      "Agent must post block message for untrusted actors"
    );
    assert.ok(
      agent.includes("Read-Only Mode"),
      "Agent must post read-only explanation for untrusted actors"
    );
  });

  it("handles semi-trusted actors with read-only directive", () => {
    assert.ok(
      agent.includes('trustLevel === "semi-trusted"'),
      "Agent must check for semi-trusted trust level"
    );
    assert.ok(
      agent.includes("You are operating in read-only mode"),
      "Agent must inject read-only directive for semi-trusted actors"
    );
  });

  it("writes tool-policy-override.json for semi-trusted actors", () => {
    assert.ok(
      agent.includes("tool-policy-override.json"),
      "Agent must write tool-policy override for semi-trusted actors"
    );
    assert.ok(
      agent.includes('"minimal"'),
      "Tool policy override must specify minimal profile"
    );
    assert.ok(
      agent.includes('"bash"') && agent.includes('"edit"') && agent.includes('"create"'),
      "Tool policy override must deny bash, edit, and create tools"
    );
  });

  it("cleans up tool-policy-override.json in the finally block", () => {
    assert.ok(
      agent.includes("unlinkSync"),
      "Agent must use unlinkSync for cleanup"
    );
    assert.ok(
      agent.includes("Cleaned up tool-policy-override.json"),
      "Agent must log cleanup of tool-policy-override.json"
    );
  });

  it("trust resolution runs before agent invocation", () => {
    const trustIdx = agent.indexOf("resolveTrustLevel(");
    const agentRunIdx = agent.indexOf("Bun.spawn(openclawArgs");
    assert.ok(trustIdx > 0 && agentRunIdx > 0);
    assert.ok(
      trustIdx < agentRunIdx,
      "Trust resolution must happen before agent invocation"
    );
  });
});

// ── 6. Workflow passes ACTOR_PERMISSION to the Run step ───────────────────

describe("Workflow trust-level wiring", () => {
  it("Authorize step exports actor_permission as a step output", () => {
    const workflow = readFile(".github/workflows/GITOPENCLAW-WORKFLOW-AGENT.yml");
    assert.ok(
      workflow.includes("actor_permission"),
      "Authorize step must output actor_permission"
    );
    assert.ok(
      workflow.includes("GITHUB_OUTPUT"),
      "Authorize step must write to GITHUB_OUTPUT"
    );
  });

  it("Authorize step has an id for step output reference", () => {
    const workflow = readFile(".github/workflows/GITOPENCLAW-WORKFLOW-AGENT.yml");
    assert.ok(
      workflow.includes("id: authorize"),
      "Authorize step must have id: authorize"
    );
  });

  it("Run step receives ACTOR_PERMISSION env var", () => {
    const workflow = readFile(".github/workflows/GITOPENCLAW-WORKFLOW-AGENT.yml");
    assert.ok(
      workflow.includes("ACTOR_PERMISSION"),
      "Run step must have ACTOR_PERMISSION in env"
    );
    assert.ok(
      workflow.includes("steps.authorize.outputs.actor_permission"),
      "ACTOR_PERMISSION must reference the Authorize step output"
    );
  });

  it("workflow template also exports actor_permission", () => {
    const template = readFile(".GITOPENCLAW/install/GITOPENCLAW-WORKFLOW-AGENT.yml");
    assert.ok(template.includes("actor_permission"));
    assert.ok(template.includes("GITHUB_OUTPUT"));
    assert.ok(template.includes("id: authorize"));
  });

  it("workflow template Run step also receives ACTOR_PERMISSION", () => {
    const template = readFile(".GITOPENCLAW/install/GITOPENCLAW-WORKFLOW-AGENT.yml");
    assert.ok(template.includes("ACTOR_PERMISSION"));
    assert.ok(template.includes("steps.authorize.outputs.actor_permission"));
  });
});

// ── 7. Preflight validates trustPolicy ────────────────────────────────────

describe("Preflight trustPolicy validation", () => {
  const preflight = readFile(".GITOPENCLAW/lifecycle/GITOPENCLAW-PREFLIGHT.ts");

  it("preflight checks trustPolicy if present", () => {
    assert.ok(
      preflight.includes("trustPolicy"),
      "Preflight must validate trustPolicy section"
    );
  });

  it("preflight validates trustedUsers is an array of strings", () => {
    assert.ok(
      preflight.includes("trustedUsers"),
      "Preflight must validate trustedUsers"
    );
  });

  it("preflight validates semiTrustedRoles against allowed values", () => {
    assert.ok(
      preflight.includes("semiTrustedRoles"),
      "Preflight must validate semiTrustedRoles"
    );
    assert.ok(
      preflight.includes('"admin"') && preflight.includes('"maintain"') && preflight.includes('"write"'),
      "Preflight must check semiTrustedRoles against valid permission levels"
    );
  });

  it("preflight validates untrustedBehavior enum values", () => {
    assert.ok(
      preflight.includes("untrustedBehavior"),
      "Preflight must validate untrustedBehavior"
    );
    assert.ok(
      preflight.includes("read-only-response") && preflight.includes("block"),
      "Preflight must check untrustedBehavior against valid enum values"
    );
  });
});
