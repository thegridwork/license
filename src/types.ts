export type LicenseRisk = "copyleft" | "weak-copyleft" | "permissive" | "public-domain" | "proprietary" | "unknown";

export type Compatibility = "compatible" | "conflict" | "review" | "unknown";

export interface DependencyLicense {
  name: string;
  version: string;
  license: string;
  risk: LicenseRisk;
  spdx: string | null;
  source: "package.json" | "requirements.txt" | "pyproject.toml" | "Pipfile" | "go.mod" | "Cargo.toml" | "Gemfile" | "pom.xml" | "build.gradle";
}

export interface LicenseConflict {
  dependency: string;
  depLicense: string;
  projectLicense: string;
  issue: string;
  severity: "critical" | "major" | "minor";
}

export interface ScanResult {
  projectPath: string;
  projectLicense: string | null;
  timestamp: string;
  totalDependencies: number;
  licenseCounts: Record<string, number>;
  riskBreakdown: Record<LicenseRisk, number>;
  dependencies: DependencyLicense[];
  conflicts: LicenseConflict[];
  score: number;
  grade: string;
  summary: string;
}
