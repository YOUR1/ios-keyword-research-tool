# ode-scout Sidecar

This folder stores persistent memory for the **Scout** agent.

## Purpose

Scout needs to remember discovered keywords, tracked trends, and scan history
between sessions to provide continuity and avoid re-discovering the same signals.

## Files

- `memories.md` - Discovered keywords, trend history, scan results
- `instructions.md` - Protocols, collaboration rules, startup behavior

## Runtime Access

After BMAD installation, this folder will be accessible at:
`{project-root}/_bmad/_memory/ode-scout/`
