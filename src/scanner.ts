import * as fs from "fs";
import * as path from "path";
import type { DependencyLicense, LicenseConflict, ScanResult } from "./types.js";
import { classifyLicense, checkConflict } from "./licenses.js";

function readJSON(filePath: string): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function readLines(filePath: string): string[] {
  try {
    return fs.readFileSync(filePath, "utf-8").split("\n").filter(l => l.trim() && !l.startsWith("#"));
  } catch {
    return [];
  }
}

function detectProjectLicense(projectPath: string): string | null {
  // Check package.json
  const pkg = readJSON(path.join(projectPath, "package.json"));
  if (pkg && typeof pkg.license === "string") return pkg.license;

  // Check pyproject.toml for license
  try {
    const pyproject = fs.readFileSync(path.join(projectPath, "pyproject.toml"), "utf-8");
    const match = pyproject.match(/license\s*=\s*["']([^"']+)["']/i)
      || pyproject.match(/license\s*=\s*\{text\s*=\s*["']([^"']+)["']\}/i);
    if (match) return match[1];
  } catch {}

  // Check Cargo.toml
  try {
    const cargo = fs.readFileSync(path.join(projectPath, "Cargo.toml"), "utf-8");
    const match = cargo.match(/license\s*=\s*["']([^"']+)["']/);
    if (match) return match[1];
  } catch {}

  // Check LICENSE file
  try {
    const licenseFile = fs.readFileSync(path.join(projectPath, "LICENSE"), "utf-8").slice(0, 500);
    if (/MIT License/i.test(licenseFile)) return "MIT";
    if (/Apache License.*2\.0/i.test(licenseFile)) return "Apache-2.0";
    if (/GNU GENERAL PUBLIC LICENSE.*Version 3/i.test(licenseFile)) return "GPL-3.0";
    if (/GNU GENERAL PUBLIC LICENSE.*Version 2/i.test(licenseFile)) return "GPL-2.0";
    if (/BSD 3-Clause/i.test(licenseFile)) return "BSD-3-Clause";
    if (/BSD 2-Clause/i.test(licenseFile)) return "BSD-2-Clause";
    if (/ISC License/i.test(licenseFile)) return "ISC";
  } catch {}

  return null;
}

function scanNodeDeps(projectPath: string): DependencyLicense[] {
  const deps: DependencyLicense[] = [];
  const nmPath = path.join(projectPath, "node_modules");

  if (!fs.existsSync(nmPath)) return deps;

  // Read top-level node_modules
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(nmPath, { withFileTypes: true });
  } catch {
    return deps;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith(".")) continue;

    // Handle scoped packages
    if (entry.name.startsWith("@")) {
      try {
        const scoped = fs.readdirSync(path.join(nmPath, entry.name), { withFileTypes: true });
        for (const sub of scoped) {
          if (!sub.isDirectory()) continue;
          const pkg = readJSON(path.join(nmPath, entry.name, sub.name, "package.json"));
          if (pkg) {
            const license = typeof pkg.license === "string" ? pkg.license
              : typeof pkg.license === "object" && pkg.license && typeof (pkg.license as Record<string, string>).type === "string" ? (pkg.license as Record<string, string>).type
              : "UNKNOWN";
            const classified = classifyLicense(license);
            deps.push({
              name: `${entry.name}/${sub.name}`,
              version: typeof pkg.version === "string" ? pkg.version : "unknown",
              license,
              risk: classified.risk,
              spdx: classified.spdx,
              source: "package.json",
            });
          }
        }
      } catch {}
      continue;
    }

    const pkg = readJSON(path.join(nmPath, entry.name, "package.json"));
    if (pkg) {
      const license = typeof pkg.license === "string" ? pkg.license
        : typeof pkg.license === "object" && pkg.license && typeof (pkg.license as Record<string, string>).type === "string" ? (pkg.license as Record<string, string>).type
        : "UNKNOWN";
      const classified = classifyLicense(license);
      deps.push({
        name: entry.name,
        version: typeof pkg.version === "string" ? pkg.version : "unknown",
        license,
        risk: classified.risk,
        spdx: classified.spdx,
        source: "package.json",
      });
    }
  }

  return deps;
}

function scanPythonDeps(projectPath: string): DependencyLicense[] {
  const deps: DependencyLicense[] = [];

  // Check requirements.txt — we can only get package names, not licenses
  const reqFiles = ["requirements.txt", "requirements.in", "requirements-dev.txt"];
  for (const reqFile of reqFiles) {
    const lines = readLines(path.join(projectPath, reqFile));
    for (const line of lines) {
      const match = line.match(/^([a-zA-Z0-9_-]+)\s*([>=<~!]+\s*[\d.]+)?/);
      if (match) {
        deps.push({
          name: match[1],
          version: match[2] ? match[2].replace(/[>=<~!\s]/g, "") : "unknown",
          license: "REQUIRES-CHECK",
          risk: "unknown",
          spdx: null,
          source: "requirements.txt",
        });
      }
    }
  }

  return deps;
}

export function scanProject(projectPath: string): ScanResult {
  const resolvedPath = path.resolve(projectPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Directory not found: ${resolvedPath}`);
  }

  const projectLicense = detectProjectLicense(resolvedPath);
  const nodeDeps = scanNodeDeps(resolvedPath);
  const pythonDeps = scanPythonDeps(resolvedPath);
  const allDeps = [...nodeDeps, ...pythonDeps];

  // Count licenses
  const licenseCounts: Record<string, number> = {};
  const riskBreakdown: Record<string, number> = {
    copyleft: 0, "weak-copyleft": 0, permissive: 0, "public-domain": 0, proprietary: 0, unknown: 0,
  };

  for (const dep of allDeps) {
    licenseCounts[dep.license] = (licenseCounts[dep.license] || 0) + 1;
    riskBreakdown[dep.risk] = (riskBreakdown[dep.risk] || 0) + 1;
  }

  // Find conflicts
  const conflicts: LicenseConflict[] = [];
  if (projectLicense) {
    for (const dep of allDeps) {
      const result = checkConflict(dep.license, dep.risk, projectLicense);
      if (result && result.conflict) {
        conflicts.push({
          dependency: `${dep.name}@${dep.version}`,
          depLicense: dep.license,
          projectLicense,
          issue: result.issue,
          severity: result.severity,
        });
      }
    }
  }

  // Score
  const criticalConflicts = conflicts.filter(c => c.severity === "critical").length;
  const majorConflicts = conflicts.filter(c => c.severity === "major").length;
  const unknownCount = riskBreakdown.unknown || 0;
  const deductions = criticalConflicts * 20 + majorConflicts * 10 + unknownCount * 2;
  const score = Math.max(0, Math.min(100, 100 - deductions));
  const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 50 ? "D" : "F";

  const summary = allDeps.length === 0
    ? "No dependencies found to scan."
    : `${allDeps.length} dependencies scanned. ${conflicts.length} conflict${conflicts.length !== 1 ? "s" : ""} found. ${unknownCount} unknown license${unknownCount !== 1 ? "s" : ""}.`;

  return {
    projectPath: resolvedPath,
    projectLicense,
    timestamp: new Date().toISOString(),
    totalDependencies: allDeps.length,
    licenseCounts,
    riskBreakdown: riskBreakdown as ScanResult["riskBreakdown"],
    dependencies: allDeps,
    conflicts,
    score,
    grade,
    summary,
  };
}
