import type { LicenseRisk } from "./types.js";

// License classification database
const LICENSE_DB: Record<string, { risk: LicenseRisk; spdx: string }> = {
  // Copyleft (viral — derivative works must use same license)
  "gpl-2.0": { risk: "copyleft", spdx: "GPL-2.0-only" },
  "gpl-2.0-only": { risk: "copyleft", spdx: "GPL-2.0-only" },
  "gpl-2.0-or-later": { risk: "copyleft", spdx: "GPL-2.0-or-later" },
  "gpl-3.0": { risk: "copyleft", spdx: "GPL-3.0-only" },
  "gpl-3.0-only": { risk: "copyleft", spdx: "GPL-3.0-only" },
  "gpl-3.0-or-later": { risk: "copyleft", spdx: "GPL-3.0-or-later" },
  "agpl-3.0": { risk: "copyleft", spdx: "AGPL-3.0-only" },
  "agpl-3.0-only": { risk: "copyleft", spdx: "AGPL-3.0-only" },
  "agpl-3.0-or-later": { risk: "copyleft", spdx: "AGPL-3.0-or-later" },
  "sspl-1.0": { risk: "copyleft", spdx: "SSPL-1.0" },
  "eupl-1.2": { risk: "copyleft", spdx: "EUPL-1.2" },
  "osl-3.0": { risk: "copyleft", spdx: "OSL-3.0" },
  "cpal-1.0": { risk: "copyleft", spdx: "CPAL-1.0" },

  // Weak copyleft (copyleft applies to the library itself, not your code)
  "lgpl-2.1": { risk: "weak-copyleft", spdx: "LGPL-2.1-only" },
  "lgpl-2.1-only": { risk: "weak-copyleft", spdx: "LGPL-2.1-only" },
  "lgpl-2.1-or-later": { risk: "weak-copyleft", spdx: "LGPL-2.1-or-later" },
  "lgpl-3.0": { risk: "weak-copyleft", spdx: "LGPL-3.0-only" },
  "lgpl-3.0-only": { risk: "weak-copyleft", spdx: "LGPL-3.0-only" },
  "lgpl-3.0-or-later": { risk: "weak-copyleft", spdx: "LGPL-3.0-or-later" },
  "mpl-2.0": { risk: "weak-copyleft", spdx: "MPL-2.0" },
  "epl-1.0": { risk: "weak-copyleft", spdx: "EPL-1.0" },
  "epl-2.0": { risk: "weak-copyleft", spdx: "EPL-2.0" },
  "cddl-1.0": { risk: "weak-copyleft", spdx: "CDDL-1.0" },
  "cecill-2.1": { risk: "weak-copyleft", spdx: "CECILL-2.1" },

  // Permissive (minimal restrictions)
  "mit": { risk: "permissive", spdx: "MIT" },
  "isc": { risk: "permissive", spdx: "ISC" },
  "bsd-2-clause": { risk: "permissive", spdx: "BSD-2-Clause" },
  "bsd-3-clause": { risk: "permissive", spdx: "BSD-3-Clause" },
  "apache-2.0": { risk: "permissive", spdx: "Apache-2.0" },
  "artistic-2.0": { risk: "permissive", spdx: "Artistic-2.0" },
  "zlib": { risk: "permissive", spdx: "Zlib" },
  "x11": { risk: "permissive", spdx: "X11" },
  "bsl-1.0": { risk: "permissive", spdx: "BSL-1.0" },
  "postgresql": { risk: "permissive", spdx: "PostgreSQL" },
  "ncsa": { risk: "permissive", spdx: "NCSA" },
  "ftl": { risk: "permissive", spdx: "FTL" },
  "python-2.0": { risk: "permissive", spdx: "PSF-2.0" },
  "psf-2.0": { risk: "permissive", spdx: "PSF-2.0" },
  "ruby": { risk: "permissive", spdx: "Ruby" },
  "unicode-dfs-2016": { risk: "permissive", spdx: "Unicode-DFS-2016" },
  "0bsd": { risk: "permissive", spdx: "0BSD" },
  "blueoak-1.0.0": { risk: "permissive", spdx: "BlueOak-1.0.0" },

  // Public domain
  "unlicense": { risk: "public-domain", spdx: "Unlicense" },
  "cc0-1.0": { risk: "public-domain", spdx: "CC0-1.0" },
  "wtfpl": { risk: "public-domain", spdx: "WTFPL" },

  // Proprietary / restrictive
  "proprietary": { risk: "proprietary", spdx: "LicenseRef-Proprietary" },
  "commercial": { risk: "proprietary", spdx: "LicenseRef-Commercial" },
  "busl-1.1": { risk: "proprietary", spdx: "BUSL-1.1" },
  "elastic-2.0": { risk: "proprietary", spdx: "Elastic-2.0" },
};

// Common aliases
const ALIASES: Record<string, string> = {
  "apache 2.0": "apache-2.0",
  "apache license 2.0": "apache-2.0",
  "apache-2": "apache-2.0",
  "apache2": "apache-2.0",
  "bsd": "bsd-3-clause",
  "bsd license": "bsd-3-clause",
  "new bsd": "bsd-3-clause",
  "simplified bsd": "bsd-2-clause",
  "gpl": "gpl-3.0",
  "gplv2": "gpl-2.0",
  "gplv3": "gpl-3.0",
  "gpl v2": "gpl-2.0",
  "gpl v3": "gpl-3.0",
  "gnu gpl v3": "gpl-3.0",
  "lgpl": "lgpl-3.0",
  "lgplv2": "lgpl-2.1",
  "lgplv3": "lgpl-3.0",
  "agpl": "agpl-3.0",
  "agplv3": "agpl-3.0",
  "mpl": "mpl-2.0",
  "mpl 2.0": "mpl-2.0",
  "mozilla public license 2.0": "mpl-2.0",
  "public domain": "unlicense",
  "cc0": "cc0-1.0",
  "the unlicense": "unlicense",
  "sspl": "sspl-1.0",
  "server side public license": "sspl-1.0",
  "elastic license 2.0": "elastic-2.0",
  "business source license 1.1": "busl-1.1",
  "python software foundation license": "psf-2.0",
};

export function classifyLicense(raw: string): { risk: LicenseRisk; spdx: string | null } {
  const normalized = raw.toLowerCase().trim().replace(/\s+/g, " ");

  // Direct match
  const direct = LICENSE_DB[normalized];
  if (direct) return direct;

  // Alias match
  const alias = ALIASES[normalized];
  if (alias) {
    const aliased = LICENSE_DB[alias];
    if (aliased) return aliased;
  }

  // Fuzzy match: check if the raw string contains a known license name
  for (const [key, value] of Object.entries(LICENSE_DB)) {
    if (normalized.includes(key)) return value;
  }

  // Common patterns
  if (/\bgpl\b/i.test(normalized) && /\b3\b/.test(normalized)) return LICENSE_DB["gpl-3.0"]!;
  if (/\bgpl\b/i.test(normalized) && /\b2\b/.test(normalized)) return LICENSE_DB["gpl-2.0"]!;
  if (/\bagpl\b/i.test(normalized)) return LICENSE_DB["agpl-3.0"]!;
  if (/\blgpl\b/i.test(normalized)) return LICENSE_DB["lgpl-3.0"]!;
  if (/\bmit\b/i.test(normalized)) return LICENSE_DB["mit"]!;
  if (/\bapache\b/i.test(normalized)) return LICENSE_DB["apache-2.0"]!;
  if (/\bbsd\b/i.test(normalized)) return LICENSE_DB["bsd-3-clause"]!;
  if (/\bmpl\b/i.test(normalized)) return LICENSE_DB["mpl-2.0"]!;

  return { risk: "unknown", spdx: null };
}

// Copyleft licenses that conflict with proprietary or permissive project licenses
const COPYLEFT_INCOMPATIBLE_WITH: Set<string> = new Set([
  "mit", "isc", "bsd-2-clause", "bsd-3-clause", "apache-2.0", "proprietary", "commercial",
]);

export function checkConflict(
  depLicense: string,
  depRisk: LicenseRisk,
  projectLicense: string,
): { conflict: boolean; issue: string; severity: "critical" | "major" | "minor" } | null {
  const projNorm = projectLicense.toLowerCase().trim();
  const projClass = classifyLicense(projNorm);

  if (depRisk === "unknown") {
    return { conflict: true, issue: "License is unknown or undeclared. Cannot verify compatibility.", severity: "major" };
  }

  if (depRisk === "copyleft" && projClass.risk === "proprietary") {
    return { conflict: true, issue: `Copyleft license (${depLicense}) in a proprietary project. Copyleft requires derivative works to be released under the same license.`, severity: "critical" };
  }

  if (depRisk === "copyleft" && projClass.risk === "permissive") {
    return { conflict: true, issue: `Copyleft license (${depLicense}) in a permissive-licensed project (${projectLicense}). The copyleft terms may override your project license for distributed binaries.`, severity: "critical" };
  }

  if (depLicense.toLowerCase().includes("agpl") && !projNorm.includes("agpl")) {
    return { conflict: true, issue: `AGPL dependency detected. AGPL requires source disclosure for network use (SaaS). If your project is a web service, you must release your source code.`, severity: "critical" };
  }

  if (depRisk === "proprietary") {
    return { conflict: true, issue: `Proprietary/restrictive license (${depLicense}). Review terms for redistribution rights.`, severity: "major" };
  }

  if (depRisk === "weak-copyleft") {
    return { conflict: false, issue: `Weak copyleft (${depLicense}). Generally safe if used as a library without modification. Modifications to the library itself must be shared.`, severity: "minor" };
  }

  return null;
}
