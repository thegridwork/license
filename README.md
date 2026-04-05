# gridwork-license

MCP server that scans project dependencies for license compliance issues.

## What it does

- Scans node_modules and Python requirements for license information
- Classifies 60+ licenses by risk level (copyleft, weak-copyleft, permissive, public-domain, proprietary)
- Detects conflicts between dependency licenses and your project license
- Flags AGPL dependencies in non-AGPL projects (SaaS risk)
- Identifies unknown/undeclared licenses

## Install

```bash
npx gridwork-license
```

## MCP tools

| Tool | Description |
|------|-------------|
| `scan_licenses` | Full license scan with conflict detection |
| `quick_check` | Risk breakdown and conflict count |
| `classify_license` | Classify any license string |
| `find_copyleft` | Find all copyleft dependencies |

## Claude Desktop config

```json
{
  "mcpServers": {
    "gridwork-license": {
      "command": "npx",
      "args": ["-y", "gridwork-license"]
    }
  }
}
```

## License

MIT — [Gridwork](https://thegridwork.space)
