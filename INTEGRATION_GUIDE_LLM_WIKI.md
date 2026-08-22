# Integration Guide: Using Shared Modules in llm-wiki

## Overview

The shared modules created in jvto-ekosistem are now available for use in llm-wiki. This guide explains how to integrate them and what benefits they provide.

## Shared Modules Summary

Three modules live in `jvto-ekosistem/scripts/lib/shared/`:

1. **change-tracker.mjs** — Canonical hashing and manifest diffing
2. **entity-resolver.mjs** — Cross-repo entity registry and references
3. **schema-validator.mjs** — JSON-LD @graph validation rules

## Integration Steps for llm-wiki

### Option A: Symlink (Recommended for Active Development)

Create a symbolic link from llm-wiki to ekosistem's shared modules:

```bash
cd /path/to/llm-wiki
mkdir -p scripts/lib
ln -s ../../../jvto-ekosistem/scripts/lib/shared scripts/lib/shared
```

**Pros**: Changes in ekosistem immediately available in llm-wiki
**Cons**: Requires both repos in same parent directory

### Option B: Copy (Recommended for Production Releases)

Copy the shared modules when releasing a new version:

```bash
cd /path/to/llm-wiki
mkdir -p scripts/lib/shared
cp -r ../jvto-ekosistem/scripts/lib/shared/* scripts/lib/shared/
```

**Pros**: Independent, no cross-repo dependency
**Cons**: Requires manual updates when ekosistem changes

### Option C: NPM Package (Future)

Once modules stabilize, publish as `@jvto/shared-modules` npm package:

```bash
npm install @jvto/shared-modules
```

Update imports:

```javascript
import { hashRecord, diffManifest } from "@jvto/shared-modules/change-tracker";
```

## Use Cases in llm-wiki

### 1. Wiki Ingestion Tracking

**Current State**: Manual wiki/log.md append

**With shared modules**:

```javascript
import { hashRecord, diffManifest } from "./lib/shared/change-tracker.mjs";
import path from "path";
import { readFile, writeFile } from "fs/promises";

const previousManifest = JSON.parse(await readFile("wiki/.manifest.json", "utf8"));
const wikiPages = await loadWikiPages();

const diff = diffManifest(previousManifest, wikiPages, {
  idField: "slug",
  metadataFn: (page) => ({
    title: page.title,
    lastUpdated: page.frontmatter.last_updated,
  }),
});

console.log(`Ingested: ${diff.added.length} new, ${diff.updated.length} updated`);
await writeFile("wiki/.manifest.json", JSON.stringify(diff.manifest, null, 2));
```

### 2. Entity Registry Validation

**Current State**: Implicit crew/person registry in wiki frontmatter

**With shared modules**:

```javascript
import { loadRegistry, resolveEntity } from "./lib/shared/entity-resolver.mjs";

// Load ekosistem's canonical entity registry
const registry = await loadRegistry(
  "../jvto-ekosistem/1-knowledge-and-evidence-core/organization-identity/external-entities.json"
);

// Validate wiki references
for (const page of wikiPages) {
  const citations = page.frontmatter.sources ?? [];
  for (const citation of citations) {
    const entity = resolveEntity(registry, citation);
    if (!entity) {
      console.warn(`Page ${page.slug}: citation "${citation}" not in registry`);
    }
  }
}
```

### 3. Schema Validation for Wiki Outputs

**Current State**: Manual quality checks

**With shared modules**:

```javascript
import { schemaValidators } from "./lib/shared/schema-validator.mjs";

// Validate compiled output before publishing
const schemaOutput = JSON.parse(await readFile("output/website/schema/homepage-schema.json"));
const route = "/";
const violations = [];

for (const [name, validator] of Object.entries(schemaValidators)) {
  violations.push(...validator(schemaOutput, route));
}

if (violations.length > 0) {
  console.error(`Schema validation failed for ${route}:`);
  violations.forEach(v => console.error(`  - ${v}`));
  process.exit(1);
}
```

## Integration Points

### Cross-Repo Data Flow

```
llm-wiki/wiki/
  ├─ sources/       (raw ingestion)
  ├─ people/        (crew profiles)
  └─ destinations/  (destination data)
        ↓
   (ingest script using change-tracker + entity-resolver)
        ↓
llm-wiki/output/
  └─ website/
      └─ schema/*.json (compiled schemas)
        ↓
   (validate using schema-validator)
        ↓
jvto-ekosistem/
  ├─ 1-knowledge-and-evidence-core/
  │  └─ external-entities.json  (canonical registry)
  └─ 5-experience-engine/
     └─ json-ld/pages/*.json    (final schemas)
```

### Data Sync Workflow

1. **llm-wiki ingestion** (daily/on-demand)
   - Use `change-tracker.diffManifest()` to detect new/changed wiki pages
   - Use `entity-resolver.loadRegistry()` to validate entity references
   - Write manifest to `wiki/.manifest.json`

2. **Compile to outputs** (triggered by ingestion)
   - Generate website copy, FAQs, schema
   - Use `schema-validator` checks before writing

3. **Publish to ekosistem** (manual promotion)
   - Copy validated outputs to ekosistem as sources
   - Ekosistem runs its own `validate:schema` check
   - Ekosistem publishes to website via jvto-web

## Testing Shared Modules

Each shared module has tests in ekosistem:

```bash
node scripts/test/shared/change-tracker.test.mjs
node scripts/test/shared/entity-resolver.test.mjs
node scripts/test/shared/schema-validator.test.mjs
```

Before using in llm-wiki, run all tests to ensure compatibility:

```bash
# In jvto-ekosistem
for test in scripts/test/shared/*.test.mjs; do
  node "$test" || exit 1
done
echo "All shared module tests passed"
```

## Versioning and Maintenance

### Semantic Versioning

Shared modules follow ekosistem's semver:
- **Major**: Breaking API changes (e.g., validator signature change)
- **Minor**: New validators, new options to existing functions
- **Patch**: Bug fixes, performance improvements

### Update Checklist

When pulling updates from ekosistem (symlink or copy):

1. Run shared module tests
2. Run llm-wiki's ingestion pipeline
3. Verify output matches previous state (except for legitimate diffs)
4. Commit with message: `chore: update shared modules from jvto-ekosistem@<version>`

### Breaking Changes

If ekosistem releases a breaking change to shared modules:

1. Ekosistem creates a new major version tag (e.g., `v2.0.0`)
2. llm-wiki maintainers decide: upgrade immediately or pin to old version
3. If upgrading, update integration code in llm-wiki
4. Document migration steps in PR

## Common Integration Patterns

### Pattern 1: Ingest Wiki Pages, Track Changes

```javascript
import { hashRecord, diffManifest } from "./lib/shared/change-tracker.mjs";

const previousManifest = loadManifest() || {};
const currentPages = await collectWikiPages();

const { added, updated, unchanged, removed, manifest } = diffManifest(
  previousManifest,
  currentPages,
  { idField: "slug" }
);

if (added.length > 0) {
  console.log(`New pages: ${added.join(", ")}`);
  // process new pages
}

if (updated.length > 0) {
  console.log(`Updated pages: ${updated.join(", ")}`);
  // re-compile updated pages
}

await saveManifest(manifest);
```

### Pattern 2: Validate Entity References

```javascript
import { loadRegistry, resolveEntity } from "./lib/shared/entity-resolver.mjs";

const registry = await loadRegistry("path/to/external-entities.json");
const errors = [];

for (const page of pages) {
  for (const source of page.frontmatter.sources) {
    if (!resolveEntity(registry, source)) {
      errors.push(`${page.slug}: unknown source "${source}"`);
    }
  }
}

if (errors.length > 0) {
  throw new Error(`Entity validation failed:\n${errors.join("\n")}`);
}
```

### Pattern 3: Validate Output Schema

```javascript
import { schemaValidators } from "./lib/shared/schema-validator.mjs";

const graph = JSON.parse(compiledSchema).json_ld;
const route = page.slug;
const violations = [];

// Run all validators
for (const validator of Object.values(schemaValidators)) {
  violations.push(...validator(graph, route));
}

if (violations.length > 0) {
  throw new Error(`Schema validation failed for ${route}:\n${violations.join("\n")}`);
}
```

## Troubleshooting

### Import Errors

**Problem**: `Cannot find module './lib/shared/change-tracker.mjs'`

**Solution**: Check symlink or copy is in place:

```bash
ls -la scripts/lib/shared/
# Should show: change-tracker.mjs, entity-resolver.mjs, schema-validator.mjs
```

### Hash Mismatch

**Problem**: Same record produces different hashes in llm-wiki vs ekosistem

**Solution**: Ensure both use the same canonicalize logic (part of change-tracker). Hash mismatch indicates different data serialization — check for:
- Different object key order (shouldn't matter, canonicalize sorts)
- Different field types (e.g., string vs number)
- Unicode normalization differences

Debug:

```javascript
import { canonicalize } from "./lib/shared/change-tracker.mjs";

const c1 = canonicalize(record);
const c2 = canonicalize(referenceRecord);
console.log("Match:", JSON.stringify(c1) === JSON.stringify(c2));
```

### Registry Not Found

**Problem**: `loadRegistry()` can't find external-entities.json

**Solution**: Ensure file path is correct relative to working directory or provide absolute path:

```javascript
const registry = await loadRegistry(
  path.join(process.cwd(), "../jvto-ekosistem/1-knowledge-and-evidence-core/organization-identity/external-entities.json")
);
```

## Next Steps

1. **Immediate** (next sprint):
   - Set up symlink/copy of shared modules in llm-wiki
   - Run shared module tests
   - Document integration in llm-wiki's README

2. **Short-term** (1-2 months):
   - Integrate `change-tracker` into wiki ingestion workflow
   - Add entity validation using `entity-resolver`
   - Add schema validation to output compilation

3. **Medium-term** (3-6 months):
   - Add GitHub Actions CI check: validate wiki entities against ekosistem registry
   - Create CI check: validate compiled wiki outputs against schema rules
   - Publish automated reports of schema violations

4. **Long-term** (6+ months):
   - Publish shared modules as npm package
   - Add llm-wiki as upstream consumer in ekosistem's CI
   - Implement bi-directional sync: llm-wiki → ekosistem → website

## Support and Questions

For questions about shared modules:
1. Check SHARED_MODULES.md in ekosistem/docs/
2. Review test files in ekosistem/scripts/test/shared/
3. Open issue in jvto-ekosistem with label `shared-modules`
4. Reference this guide in llm-wiki when creating integration PRs
