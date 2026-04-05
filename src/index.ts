#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { scanProject } from "./scanner.js";
import { classifyLicense } from "./licenses.js";
import type { ScanResult } from "./types.js";

const server = new McpServer({
  name: "@gridwork/license",
  version: "1.0.0",
});

// ── Tool: Full license scan ──
server.tool(
  "scan_licenses",
  "Scan a project's dependencies for license compliance issues. Detects copyleft conflicts, unknown licenses, and proprietary risks. Works with npm (node_modules), Python (requirements.txt), and more.",
  {
    path: z.string().describe("Absolute path to the project directory"),
    format: z.enum(["markdown", "json"]).default("markdown").describe("Output format"),
  },
  async ({ path: projectPath, format }) => {
    try {
      const result = scanProject(projectPath);
      if (format === "json") {
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      return { content: [{ type: "text", text: formatMarkdown(result) }] };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { content: [{ type: "text", text: `Scan failed: ${msg}` }], isError: true };
    }
  }
);

// ── Tool: Quick check ──
server.tool(
  "quick_check",
  "Quick license overview — counts and risk breakdown without full details.",
  {
    path: z.string().describe("Absolute path to the project directory"),
  },
  async ({ path: projectPath }) => {
    try {
      const result = scanProject(projectPath);
      const lines = [
        `## License Quick Check`,
        ``,
        `**Project license:** ${result.projectLicense || "Not detected"}`,
        `**Dependencies:** ${result.totalDependencies}`,
        `**Score:** ${result.score}/100 (${result.grade})`,
        `**Conflicts:** ${result.conflicts.length}`,
        ``,
        `### Risk breakdown`,
        ``,
        `| Risk | Count |`,
        `|------|-------|`,
        `| Copyleft | ${result.riskBreakdown.copyleft} |`,
        `| Weak copyleft | ${result.riskBreakdown["weak-copyleft"]} |`,
        `| Permissive | ${result.riskBreakdown.permissive} |`,
        `| Public domain | ${result.riskBreakdown["public-domain"]} |`,
        `| Proprietary | ${result.riskBreakdown.proprietary} |`,
        `| Unknown | ${result.riskBreakdown.unknown} |`,
        ``,
      ];

      if (result.conflicts.length > 0) {
        lines.push(`### Conflicts`);
        lines.push(``);
        for (const c of result.conflicts) {
          lines.push(`- **[${c.severity.toUpperCase()}]** ${c.dependency} (${c.depLicense}): ${c.issue}`);
        }
        lines.push(``);
      }

      lines.push(`Run \`scan_licenses\` for full dependency listing.`);
      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { content: [{ type: "text", text: `Check failed: ${msg}` }], isError: true };
    }
  }
);

// ── Tool: Classify a license ──
server.tool(
  "classify_license",
  "Classify a license string — returns risk level (copyleft, weak-copyleft, permissive, public-domain, proprietary, unknown) and SPDX identifier.",
  {
    license: z.string().describe("License name or SPDX identifier to classify (e.g., 'MIT', 'GPL-3.0', 'Apache 2.0')"),
  },
  async ({ license }) => {
    const result = classifyLicense(license);
    const lines = [
      `## License Classification: ${license}`,
      ``,
      `**Risk level:** ${result.risk}`,
      `**SPDX:** ${result.spdx || "Not matched"}`,
      ``,
    ];

    const riskDescriptions: Record<string, string> = {
      copyleft: "Derivative works must be released under the same license. Incompatible with proprietary or permissive projects that distribute binaries.",
      "weak-copyleft": "Copyleft applies to the library itself, not to your code that uses it. Safe if used as a library without modification.",
      permissive: "Minimal restrictions. Can be used in proprietary and open-source projects. Typically requires attribution.",
      "public-domain": "No restrictions. Can be used for any purpose without conditions.",
      proprietary: "Restrictive license. Review terms carefully for redistribution rights and usage limitations.",
      unknown: "License not recognized. Manual review required to determine compatibility and obligations.",
    };

    lines.push(`**What this means:** ${riskDescriptions[result.risk]}`);

    return { content: [{ type: "text", text: lines.join("\n") }] };
  }
);

// ── Tool: Find copyleft ──
server.tool(
  "find_copyleft",
  "Find all copyleft-licensed dependencies in a project. Useful for quickly identifying viral license obligations.",
  {
    path: z.string().describe("Absolute path to the project directory"),
  },
  async ({ path: projectPath }) => {
    try {
      const result = scanProject(projectPath);
      const copyleft = result.dependencies.filter(d => d.risk === "copyleft");
      const weakCopyleft = result.dependencies.filter(d => d.risk === "weak-copyleft");

      const lines = [
        `## Copyleft Dependencies`,
        ``,
        `**Project license:** ${result.projectLicense || "Not detected"}`,
        ``,
      ];

      if (copyleft.length === 0 && weakCopyleft.length === 0) {
        lines.push(`No copyleft dependencies found. All clear.`);
      } else {
        if (copyleft.length > 0) {
          lines.push(`### Strong copyleft (${copyleft.length})`);
          lines.push(`These require derivative works to use the same license.`);
          lines.push(``);
          for (const d of copyleft) {
            lines.push(`- **${d.name}@${d.version}** — ${d.license} (${d.spdx || "no SPDX"})`);
          }
          lines.push(``);
        }

        if (weakCopyleft.length > 0) {
          lines.push(`### Weak copyleft (${weakCopyleft.length})`);
          lines.push(`Generally safe if used as libraries. Modifications to the library must be shared.`);
          lines.push(``);
          for (const d of weakCopyleft) {
            lines.push(`- **${d.name}@${d.version}** — ${d.license} (${d.spdx || "no SPDX"})`);
          }
          lines.push(``);
        }
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { content: [{ type: "text", text: `Scan failed: ${msg}` }], isError: true };
    }
  }
);

// ── Markdown formatter ──
function formatMarkdown(result: ScanResult): string {
  const lines = [
    `## License Compliance Scan`,
    ``,
    `**Project:** ${result.projectPath}`,
    `**Project license:** ${result.projectLicense || "Not detected"}`,
    `**Dependencies:** ${result.totalDependencies}`,
    `**Score:** ${result.score}/100 (${result.grade})`,
    `**Scanned:** ${result.timestamp.split("T")[0]}`,
    ``,
    `---`,
    ``,
    result.summary,
    ``,
  ];

  // Risk breakdown
  lines.push(`### Risk breakdown`);
  lines.push(``);
  lines.push(`| Risk | Count | % |`);
  lines.push(`|------|-------|---|`);
  const total = result.totalDependencies || 1;
  for (const [risk, count] of Object.entries(result.riskBreakdown)) {
    if (count > 0) {
      lines.push(`| ${risk} | ${count} | ${Math.round((count / total) * 100)}% |`);
    }
  }
  lines.push(``);

  // Conflicts
  if (result.conflicts.length > 0) {
    lines.push(`### Conflicts (${result.conflicts.length})`);
    lines.push(``);
    for (const c of result.conflicts) {
      lines.push(`- **[${c.severity.toUpperCase()}]** ${c.dependency} (${c.depLicense})`);
      lines.push(`  ${c.issue}`);
    }
    lines.push(``);
  }

  // Top licenses
  const sorted = Object.entries(result.licenseCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  if (sorted.length > 0) {
    lines.push(`### Top licenses`);
    lines.push(``);
    for (const [license, count] of sorted) {
      lines.push(`- ${license}: ${count}`);
    }
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(`*Gridwork License Scanner — thegridwork.space*`);

  return lines.join("\n");
}

// ── Start server ──
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});
