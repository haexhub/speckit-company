import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const KNOWN_CAPABILITY_CLASSES = new Set([
  "filesystem",
  "shell",
  "network",
  "code",
  "secrets",
  "payment",
  "account",
]);
const KNOWN_OPERATING_MODES = new Set(["finite", "continuous"]);
const KNOWN_AUTONOMY_MODES = new Set(["full", "supervised", "interactive"]);
const KNOWN_RUNNER_TYPES = new Set(["ephemeral", "persistent", "scheduled"]);

/**
 * Validate a company org-spec directory.
 *
 * Expected layout:
 *   <orgDir>/constitution.md         (frontmatter + body)
 *   <orgDir>/agents/<role>.md        (frontmatter + persona body, one file per role)
 *
 * @param {string} orgDir
 * @param {object} [options]
 * @param {string} [options.catalogDir]   if set, agent tool/skill references
 *                                        are validated against the central catalog
 *
 * Returns an array of findings with shape:
 *   { severity: "error" | "warning" | "info", code: string, message: string, location?: string }
 */
export async function validateCompany(orgDir, options = {}) {
  const findings = [];

  if (!(await isDirectory(orgDir))) {
    findings.push({
      severity: "error",
      code: "E_MISSING_ORG_DIR",
      message: `Org directory not found: ${orgDir}`,
    });
    return { findings };
  }

  const constitution = await loadConstitution(orgDir, findings);
  if (!constitution) return { findings };

  validateConstitutionFields(constitution, findings);

  const agents = await loadAgents(orgDir, findings);
  if (agents.length === 0) return { findings };

  validateAgentFields(agents, constitution, findings);
  validateGraph(agents, findings);

  if (options.catalogDir) {
    await validateAgainstCatalog(agents, options.catalogDir, findings);
  }

  return { findings };
}

function expandWildcards(refs, catalogMap) {
  if (!Array.isArray(refs) || refs.length === 0) return [];
  if (refs.includes("*")) return [...catalogMap.keys()];
  return refs;
}

/**
 * Catalog reference validation — checks that every tool/binary/skill referenced
 * by agents resolves to an entry in the catalog. Wildcards (`["*"]`) are
 * expanded against the catalog before checks.
 *
 * Capability *enforcement* is intentionally NOT done here. The runtime
 * (haex-corp's capability-gate) decides at each tool invocation whether the
 * agent's granted capabilities cover the actual operation. Static enforcement
 * would have to predict subcommand requirements (git status vs. git push,
 * gh repo view vs. gh pr create) which is brittle and provides no real
 * security — runtime is the only meaningful gate.
 *
 * Manifest `required_capabilities` therefore stay as informational
 * documentation; this function does not enforce them.
 */
async function validateAgainstCatalog(agents, catalogDir, findings) {
  const catalog = await loadCatalogFromDisk(catalogDir);
  for (const agent of agents) {
    const role = agent.role ?? "?";

    const toolRefs = expandWildcards(agent.tools?.mcp ?? [], catalog.tools);
    for (const toolId of toolRefs) {
      if (!catalog.tools.get(toolId)) {
        findings.push({
          severity: "error",
          code: "E_UNKNOWN_TOOL_REFERENCE",
          message: `agent '${role}' references unknown tool '${toolId}' (not in catalog ${catalogDir})`,
          location: agent._file,
        });
      }
    }

    if (agent.nix_packages != null) {
      if (!Array.isArray(agent.nix_packages)) {
        findings.push({
          severity: "error",
          code: "E_NIX_PACKAGES_NOT_ARRAY",
          message: `agent '${role}' has nix_packages but it is not an array`,
          location: agent._file,
        });
      } else {
        for (const pkg of agent.nix_packages) {
          if (typeof pkg !== "string" || pkg.trim() === "") {
            findings.push({
              severity: "error",
              code: "E_NIX_PACKAGE_INVALID",
              message: `agent '${role}' nix_packages contains an invalid entry: ${JSON.stringify(pkg)}`,
              location: agent._file,
            });
          }
        }
      }
    }

    const skillRefs = expandWildcards(agent.skills ?? [], catalog.skills);
    for (const skillId of skillRefs) {
      if (!catalog.skills.has(skillId)) {
        findings.push({
          severity: "error",
          code: "E_UNKNOWN_SKILL_REFERENCE",
          message: `agent '${role}' references unknown skill '${skillId}' (not in catalog ${catalogDir})`,
          location: agent._file,
        });
      }
    }
  }
}

async function loadCatalogFromDisk(catalogDir) {
  const tools = new Map();
  const skills = new Map();
  const toolsDir = path.join(catalogDir, "tools");
  const skillsDir = path.join(catalogDir, "skills");
  if (await isDirectory(toolsDir)) {
    const files = (await readdir(toolsDir)).filter(
      (f) => f.endsWith(".yml") || f.endsWith(".yaml")
    );
    for (const file of files) {
      const raw = await readFile(path.join(toolsDir, file), "utf8");
      const spec = parseYaml(raw);
      if (spec?.id) tools.set(spec.id, spec);
    }
  }
  if (await isDirectory(skillsDir)) {
    const files = (await readdir(skillsDir)).filter((f) => f.endsWith(".md"));
    for (const file of files) {
      const raw = await readFile(path.join(skillsDir, file), "utf8");
      const fm = parseFrontmatter(raw);
      if (fm?.id) skills.set(fm.id, fm);
    }
  }
  return { tools, skills };
}

async function isDirectory(p) {
  try {
    const s = await stat(p);
    return s.isDirectory();
  } catch {
    return false;
  }
}

async function loadConstitution(orgDir, findings) {
  const constitutionPath = path.join(orgDir, "constitution.md");
  let raw;
  try {
    raw = await readFile(constitutionPath, "utf8");
  } catch (err) {
    findings.push({
      severity: "error",
      code: "E_MISSING_CONSTITUTION",
      message: `Constitution missing or unreadable: ${err.message}`,
      location: constitutionPath,
    });
    return null;
  }
  const fm = parseFrontmatter(raw);
  if (!fm) {
    findings.push({
      severity: "error",
      code: "E_INVALID_CONSTITUTION",
      message: "Constitution has no YAML frontmatter",
      location: constitutionPath,
    });
    return null;
  }
  fm._file = constitutionPath;
  return fm;
}

function validateConstitutionFields(constitution, findings) {
  const loc = constitution._file;

  if (constitution.operating_mode && !KNOWN_OPERATING_MODES.has(constitution.operating_mode)) {
    findings.push({
      severity: "error",
      code: "E_INVALID_OPERATING_MODE",
      message: `Unknown operating_mode: ${constitution.operating_mode}`,
      location: loc,
    });
  }
  if (constitution.default_autonomy && !KNOWN_AUTONOMY_MODES.has(constitution.default_autonomy)) {
    findings.push({
      severity: "error",
      code: "E_INVALID_AUTONOMY",
      message: `Unknown default_autonomy: ${constitution.default_autonomy}`,
      location: loc,
    });
  }
  if (constitution.operating_mode === "continuous" && !constitution.reporting_cadence) {
    findings.push({
      severity: "error",
      code: "E_CONTINUOUS_WITHOUT_CADENCE",
      message: "operating_mode=continuous requires reporting_cadence",
      location: loc,
    });
  }
}

async function loadAgents(orgDir, findings) {
  const agentsDir = path.join(orgDir, "agents");
  let files;
  try {
    files = (await readdir(agentsDir)).filter((f) => f.endsWith(".md"));
  } catch {
    findings.push({
      severity: "error",
      code: "E_MISSING_AGENTS_DIR",
      message: `agents/ directory not found in ${orgDir}`,
    });
    return [];
  }
  if (files.length === 0) {
    findings.push({
      severity: "error",
      code: "E_NO_AGENTS",
      message: "agents/ directory is empty",
    });
    return [];
  }

  const agents = [];
  for (const file of files) {
    const filePath = path.join(agentsDir, file);
    try {
      const raw = await readFile(filePath, "utf8");
      const fm = parseFrontmatter(raw);
      if (!fm) {
        findings.push({
          severity: "error",
          code: "E_INVALID_AGENT",
          message: "agent file has no YAML frontmatter",
          location: filePath,
        });
        continue;
      }
      agents.push({ ...fm, _file: filePath });
    } catch (err) {
      findings.push({
        severity: "error",
        code: "E_INVALID_AGENT",
        message: `failed to parse: ${err.message}`,
        location: filePath,
      });
    }
  }
  return agents;
}

function validateAgentFields(agents, constitution, findings) {
  for (const agent of agents) {
    if (!agent.role) {
      findings.push({
        severity: "error",
        code: "E_AGENT_MISSING_ROLE",
        message: "agent has no role field",
        location: agent._file,
      });
      continue;
    }
    if (agent.runner_type && !KNOWN_RUNNER_TYPES.has(agent.runner_type)) {
      findings.push({
        severity: "error",
        code: "E_INVALID_RUNNER_TYPE",
        message: `unknown runner_type: ${agent.runner_type}`,
        location: agent._file,
      });
    }
    const capabilities = agent.capabilities || [];
    for (const cap of capabilities) {
      const cls = capabilityClass(cap);
      if (!KNOWN_CAPABILITY_CLASSES.has(cls)) {
        findings.push({
          severity: "error",
          code: "E_UNKNOWN_CAPABILITY",
          message: `unknown capability class: ${cap}`,
          location: agent._file,
        });
        continue;
      }
      if (cls === "payment" && !hasBudget(constitution)) {
        findings.push({
          severity: "error",
          code: "E_PAYMENT_WITHOUT_BUDGET",
          message: `agent has payment capability '${cap}' but constitution has no budget set`,
          location: agent._file,
        });
      }
    }
  }
}

function capabilityClass(cap) {
  const idx = cap.indexOf(":");
  return idx >= 0 ? cap.slice(0, idx) : cap;
}

function hasBudget(constitution) {
  const b = constitution.budget;
  return b != null && (b.max_usd_per_task != null || b.max_usd_per_day != null);
}

function validateGraph(agents, findings) {
  const roleSet = new Set(agents.map((a) => a.role));

  // Roots
  const roots = agents.filter((a) => a.reports_to == null || a.reports_to === "");
  if (roots.length === 0) {
    findings.push({
      severity: "error",
      code: "E_NO_CEO",
      message: "no agent has null reports_to (no CEO/root)",
    });
  } else if (roots.length > 1) {
    findings.push({
      severity: "error",
      code: "E_MULTIPLE_ROOTS",
      message: `multiple agents have null reports_to: ${roots.map((r) => r.role).join(", ")}`,
    });
  }

  // Dangling reports_to
  for (const a of agents) {
    if (a.reports_to != null && a.reports_to !== "" && !roleSet.has(a.reports_to)) {
      findings.push({
        severity: "error",
        code: "E_DANGLING_REPORTS_TO",
        message: `${a.role} reports_to non-existent role '${a.reports_to}'`,
        location: a._file,
      });
    }
  }

  // Cycle detection — only via existing-target edges
  const parent = new Map();
  for (const a of agents) {
    if (a.reports_to != null && a.reports_to !== "" && roleSet.has(a.reports_to)) {
      parent.set(a.role, a.reports_to);
    }
  }
  const cycleMembers = findCycleMembers(parent);
  if (cycleMembers.size > 0) {
    findings.push({
      severity: "error",
      code: "E_CYCLE",
      message: `cycle in reports_to graph involving: ${[...cycleMembers].join(", ")}`,
    });
  }
}

function findCycleMembers(parent) {
  const inCycle = new Set();
  for (const startRole of parent.keys()) {
    const path = [];
    const seen = new Set();
    let cur = startRole;
    while (cur != null) {
      if (seen.has(cur)) {
        // back-edge: collect from index of cur in path
        const idx = path.indexOf(cur);
        for (let i = idx; i < path.length; i++) inCycle.add(path[i]);
        break;
      }
      seen.add(cur);
      path.push(cur);
      cur = parent.get(cur) ?? null;
    }
  }
  return inCycle;
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  return parseYaml(match[1]);
}

// CLI entry
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const positional = [];
  let catalogDir = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--catalog") {
      catalogDir = args[++i];
    } else if (args[i].startsWith("--catalog=")) {
      catalogDir = args[i].slice("--catalog=".length);
    } else {
      positional.push(args[i]);
    }
  }
  const orgDir = positional[0];
  if (!orgDir) {
    console.error("Usage: validate.mjs <org-dir> [--catalog <catalog-dir>]");
    process.exit(2);
  }
  const { findings } = await validateCompany(orgDir, { catalogDir });
  if (findings.length === 0) {
    console.log("✓ Validation passed: 0 findings.");
    process.exit(0);
  }
  for (const f of findings) {
    const loc = f.location ? ` (${f.location})` : "";
    console.log(`[${f.severity.toUpperCase()}] ${f.code}: ${f.message}${loc}`);
  }
  const errors = findings.filter((f) => f.severity === "error").length;
  process.exit(errors > 0 ? 1 : 0);
}
