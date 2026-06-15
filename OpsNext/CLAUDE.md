# OpsNext CRM — Claude Instructions

See [`AGENTS.md`](AGENTS.md) for the full AI agent instructions shared across all tools.

## Claude-Specific Notes

- This project uses `.claude/commands/speckit.*.md` as slash command prompt files.
- Settings: `.claude/settings.local.json`
- When starting any task, read `specs/tasks.md` to find current priorities.
- When implementing a feature, check `specs/features/` for an existing spec first.

## Repository Layout

```
OpsNext/
├── AGENTS.md             ← Universal AI entry point (read this first)
├── CLAUDE.md             ← Claude shim (this file)
├── specs/                ← Active SDD spec layer
│   ├── constitution.md   ← Architecture principles + coding standards
│   ├── product-spec.md   ← What to build (functional requirements summary)
│   ├── technical-plan.md ← How to build it (tech decisions summary)
│   ├── tasks.md          ← Active task backlog
│   ├── api/openapi.yaml  ← API contract (single source of truth)
│   ├── adr/              ← Architecture Decision Records
│   └── features/         ← Per-feature spec folders
├── templates/            ← Spec templates
├── docs/                 ← Detailed reference library (FRD, ARCHITECTURE, etc.)
├── .claude/
│   ├── commands/         ← Slash command prompt files (speckit.*.md)
│   └── settings.local.json
├── frontend/             ← Next.js 15 web app
├── backend/              ← Java 21 + Spring Boot 3 API
├── packages/             ← shared, config, db
└── infra/                ← Docker, K8s, Terraform
```
