# JVTO Operating Ecosystem

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Status](https://img.shields.io/badge/status-active-4caf50)](https://github.com/jvto-devteam/jvto-ekosistem)

JVTO Operating Ecosystem is the canonical source-of-truth workspace for JVTO’s public knowledge, product contracts, operations data, and generated experience outputs.

This repository is not a standalone customer-facing app. It is a structured content and data platform that prepares source facts, validation rules, product definitions, journey data, and rendered outputs used by downstream channels such as the website and AI-facing experiences.

## Table of contents

- [What this project does](#what-this-project-does)
- [Relationship with jvto-web](#relationship-with-jvto-web)
- [Why it is useful](#why-it-is-useful)
- [Repository structure](#repository-structure)
- [Getting started](#getting-started)
- [Common tasks](#common-tasks)
- [Documentation and support](#documentation-and-support)
- [Maintainers and contribution](#maintainers-and-contribution)

## What this project does

This repo is organized around five core domains:

1. `1-knowledge-and-evidence-core`
2. `2-product-and-commercial-core`
3. `3-booking-and-journey-core`
4. `4-operations-core`
5. `5-experience-engine`

These are not just folders — they are operating boundaries for JVTO’s business model and content pipeline.

In practical terms, this project:

- stores and version-controls public facts and evidence;
- defines product and commercial rules for tours and packages;
- captures customer journey and booking data contracts;
- tracks operational readiness and execution status;
- generates website pages, schema markup, route manifests, and experience outputs from the source cores.

The project is intentionally designed to separate stable public truth from dynamic operational state and channel-specific output.

For the repository’s architectural rationale, see:

- [docs/architecture.md](docs/architecture.md)
- [docs/domain-boundaries.md](docs/domain-boundaries.md)

## Relationship with jvto-web

This repository is meant to be the authoritative content and contract layer for the public site. The separate website application lives in [jvto-devteam/jvto-web](https://github.com/jvto-devteam/jvto-web) and consumes generated output from this repo rather than maintaining its own independent public-content source of truth.

The current design is intentionally one-way:

- upstream knowledge sources flow into this repository;
- this repo compiles the canonical facts into website and schema outputs;
- the website app reads those generated payloads and renders the browser experience.

In other words, the effective content chain is:

`llm-wiki (upstream content vault) -> jvto-ekosistem (canonical compiler and domain source) -> jvto-web (presentation layer)`

This matches the architecture documented in the repo and reflects the project’s published direction: keep public facts centralized here, while the web repo remains the presentation layer and application shell.

### Current status of the llm-wiki dependency

The dependency is not symmetrical across both repos:

- `jvto-web` no longer depends on `llm-wiki` directly. The web app reads generated ecosystem content through its own content adapters and rendering pipelines.
- `jvto-ekosistem` still contains an active sync path from `llm-wiki` via `scripts/sync-knowledge-from-llm-wiki.mjs` and `scripts/lib/llm-wiki-sync/`.
- That sync is valuable as an upstream ingestion and validation layer, but it is not the same as a runtime dependency for the web application itself.

This means the current architecture is best described as:

- `llm-wiki` = upstream source and content vault
- `jvto-ekosistem` = canonical consolidation and enforcement layer
- `jvto-web` = consumer of compiled ecosystem output

The recommended operating stance is not to cut the dependency immediately, but to keep it as a controlled, opt-in ingestion path until the team decides the ecosystem is fully consolidated and the sync can be retired without changing downstream output. In practical terms, the safe default is to keep the sync available for manual or scheduled use while avoiding automatic dependency on it unless the content is still genuinely required.

## Why it is useful

This repository helps teams keep the business logic and public content aligned across multiple surfaces.

### Core benefits

- Single source of truth for facts and contracts
- Structured, versioned content instead of scattered hardcoded copy
- Cleaner separation between static knowledge and dynamic journey/operations data
- Generated outputs for SEO, JSON-LD, public website pages, and AI-readable content
- Easier auditing and validation of content drift, schema compliance, and evidence integrity

### Intended downstream usage

The project is designed to support consumption by systems such as:

- the public website application in [jvto-devteam/jvto-web](https://github.com/jvto-devteam/jvto-web), which reads generated website and schema payloads from this repo
- SEO and structured data output
- AI knowledge feeds and answer generation
- booking and staff operations tooling
- internal dashboards and content workflows

## Repository structure

```text
jvto-ekosistem/
├── 1-knowledge-and-evidence-core/
│   ├── travel-guide/
│   ├── why-jvto/
│   ├── policies/
│   ├── destinations/
│   ├── credentials-and-public-evidence/
│   ├── people-and-crew/
│   └── ...
├── 2-product-and-commercial-core/
│   ├── tour-products/
│   ├── pricing/
│   └── ...
├── 3-booking-and-journey-core/
│   ├── booking-journey/
│   ├── package-readiness/
│   └── ...
├── 4-operations-core/
│   ├── trip-readiness/
│   ├── readiness-signals/
│   └── ...
├── 5-experience-engine/
│   ├── public-website/
│   ├── json-ld/
│   ├── manifests/
│   └── ...
├── archive/
├── docs/
├── public/
├── scripts/
├── schemas/
├── server.mjs
├── package.json
├── README.md
├── .gitignore
└── ...
```

### Notable files

- [package.json](package.json) — scripts and project metadata
- [server.mjs](server.mjs) — local preview server for generated page/schema output
- [scripts/render-web-content-sources.mjs](scripts/render-web-content-sources.mjs) — generates website output and schema artifacts
- [scripts/validate-schema.mjs](scripts/validate-schema.mjs) — validates structured outputs
- [docs/architecture.md](docs/architecture.md) — architecture and strategic direction
- [docs/domain-boundaries.md](docs/domain-boundaries.md) — boundary model for each core

## Getting started

### Prerequisites

- Node.js 18 or newer
- npm
- Git

### Install dependencies

```bash
git clone https://github.com/jvto-devteam/jvto-ekosistem.git
cd jvto-ekosistem
npm install
```

### Start the local preview server

```bash
npm run start
```

This runs the Node preview server defined in [server.mjs](server.mjs), which exposes local project browsing and route JSON preview endpoints.

### Render generated website content

```bash
npm run render:web-content
```

This compiles website and schema outputs from the source files under the core directories and writes them into `5-experience-engine/...`.

### Render LLM output

```bash
npm run render:llms
```

### Validation

```bash
npm run validate:schema
```

This checks schema and content integrity as defined in the project scripts.

### Example validation and test commands

```bash
npm run test:schema
npm run test:booking-sync
npm run test:llm-wiki-sync
npm run test:review-schema
```

### Upstream sync status (current state)

The project includes a dedicated upstream sync path for trust and knowledge bundles from `llm-wiki`, but this should be treated as a controlled integration rather than a permanent runtime requirement.

```bash
# Run the llm-wiki sync directly
npm run sync:llm-wiki

# Dry-run the sync to inspect whether upstream content changed without writing
npm run sync:llm-wiki:dry-run
```

This sync is useful while the ecosystem is still consolidating source truth. The recommended pattern is to keep it available, validate it, and only retire it once the canonical data in `jvto-ekosistem` is fully sufficient for downstream consumers such as `jvto-web`.

## Common tasks

The repository includes several project-specific workflows for rendering and sync:

```bash
# Render website-generated outputs
npm run render:web-content

# Regenerate schema outputs
npm run render:review-schema

# Render llms.txt output
npm run render:llms

# Watch source changes and rebuild web content
npm run watch:web-content

# Run schema validation
npm run validate:schema

# Sync booking data
npm run sync:booking

# Dry run booking sync
npm run sync:booking:dry-run

# Sync Google review data
npm run sync:google-reviews

# Optional upstream knowledge sync from llm-wiki (kept as a controlled integration)
npm run sync:llm-wiki
npm run sync:llm-wiki:dry-run
```

## Documentation and support

Useful references in this repository:

- [docs/architecture.md](docs/architecture.md)
- [docs/domain-boundaries.md](docs/domain-boundaries.md)
- [docs/operating-ecosystem-execution-roadmap-2026-08-12.md](docs/operating-ecosystem-execution-roadmap-2026-08-12.md)
- [docs/data-inventory.md](docs/data-inventory.md)
- [docs/content-data-report.md](docs/content-data-report.md)
- [docs/package-data-report.md](docs/package-data-report.md)

If you need support or want to report a problem:

- open a GitHub issue in this repository;
- review the project docs before making changes;
- use the repo’s generated outputs and validation scripts as the source of truth during debugging.

## Maintainers and contribution

This project is maintained by the JVTO Dev Team and the `jvto-devteam` GitHub organization.

Contribution flow:

- keep changes scoped to the relevant ecosystem core;
- preserve the domain boundaries described in [docs/domain-boundaries.md](docs/domain-boundaries.md);
- prefer updating source data or contracts rather than patching generated output files by hand;
- validate with the relevant existing npm scripts before finalizing changes.

### Contribution principles

- keep source truth in the core folders;
- do not make generated artifacts a competing source of truth;
- make changes in the smallest relevant domain boundary;
- run the relevant validation scripts when editing shared content or schema logic.

## Project status

This repository is actively used as a structured operating data layer for JVTO. It is still evolving from source data and contract work into broader application and automation use cases, but it already includes render pipelines, validation scripts, and output generation for core experience surfaces.

For additional implementation context, start with:

- [docs/architecture.md](docs/architecture.md)
- [docs/domain-boundaries.md](docs/domain-boundaries.md)
- [package.json](package.json)
