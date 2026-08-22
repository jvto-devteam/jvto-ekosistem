# Shared Modules

This document describes the shared modules extracted from jvto-ekosistem for use in both jvto-ekosistem and llm-wiki.

## Overview

Three modules live in `scripts/lib/shared/` and provide reusable utilities for:
1. **change-tracker**: Canonical hashing and manifest diffing
2. **entity-resolver**: Cross-repo entity registry and reference management
3. **schema-validator**: JSON-LD @graph validation rules

These modules eliminate duplication between:
- **jvto-ekosistem**: Booking sync, schema validation, entity building
- **llm-wiki**: Ingestion tracking, entity management, content validation

---

## Module: change-tracker.mjs

**Purpose**: Deterministic hashing and manifest diffing for detecting data changes.

**Location**: `scripts/lib/shared/change-tracker.mjs`

**Key Exports**:

### `canonicalize(value): any`
Recursively normalize a value for hashing:
- Sort object keys alphabetically
- Recurse into nested objects and arrays
- Preserve primitives as-is

**Example**:
```javascript
const obj1 = { b: 2, a: 1 };
const obj2 = { a: 1, b: 2 };
const c1 = canonicalize(obj1);
const c2 = canonicalize(obj2);
// c1 === c2 (same order, same structure)
```

### `hashRecord(record): string`
Compute SHA-256 hex digest of a record.
- Canonicalizes before hashing → deterministic, order-independent
- Used by booking sync and llm-wiki ingestion

**Example**:
```javascript
const record = { booking_id: 1, guest: "Alice" };
const hash = hashRecord(record);
// hash: "a1b2c3..."
```

### `diffManifest(previousManifest, currentRecords, options): { added, updated, unchanged, removed, manifest }`
Compare previous state to current records.

**Parameters**:
- `previousManifest`: Object mapping record IDs to `{ hash, ...metadata }`
- `currentRecords`: Array of current record objects
- `options`: Configuration
  - `idField` (default: `"id"`): Key to extract record ID
  - `hashFn` (default: `hashRecord`): Custom hash function
  - `metadataFn` (default: `() => ({})`): Custom metadata extractor

**Returns**: Object with:
- `added`: Array of IDs new in current state
- `updated`: Array of IDs with changed hash
- `unchanged`: Array of IDs with same hash
- `removed`: Array of IDs gone from current state
- `manifest`: Next manifest state (for writing back)

**Example**:
```javascript
const previous = { "1": { hash: "abc123" } };
const current = [
  { id: "1", value: "changed" },  // hash differs
  { id: "2", value: "new" },       // new
];
const diff = diffManifest(previous, current);
// diff.updated: ["1"]
// diff.added: ["2"]
// diff.removed: []
```

**Used By**:
- `scripts/sync-booking-data.mjs`: Detect booking record changes
- `llm-wiki`: Track wiki page ingestion (future integration)

---

## Module: entity-resolver.mjs

**Purpose**: Load and resolve entities (organizations, people, credentials) across repos.

**Location**: `scripts/lib/shared/entity-resolver.mjs`

**Key Exports**:

### `loadRegistry(filepath, loader): Promise<{ data, byKey, byAlias, emitted }>`
Load an entity registry from file.

**Parameters**:
- `filepath`: Path to registry JSON file
- `loader`: Async function to load/parse (default: JSON)

**Returns**: Registry object with:
- `data`: Raw parsed registry
- `byKey`: Map of `key → record` for fast lookup
- `byAlias`: Map of `normalized-name → record` for alias resolution
- `emitted`: Map tracking which entities were emitted per route (internal)

**Registry File Format**:
```json
{
  "records": [
    {
      "key": "detik-news",
      "canonicalName": "Detik.com",
      "aliases": ["Detik"],
      "id": "https://detik.com",
      "definedOn": "/verify-jvto/legal",
      "schemaType": "NewsMediaOrganization",
      "sameAs": ["https://www.detik.com"]
    }
  ]
}
```

### `resolveEntity(registry, name): record | null`
Lookup entity by name or alias.

**Example**:
```javascript
const record = resolveEntity(registry, "Detik");
// → { key: "detik-news", canonicalName: "Detik.com", id: "https://detik.com", ... }
```

### `entityReference(record): { "@id": string }`
Emit a bare reference (used on routes that don't own the entity).

**Example**:
```javascript
const ref = entityReference(detikRecord);
// → { "@id": "https://detik.com" }
```

### `entityFullNode(record, registry, route): object`
Emit full entity definition (used on the route that owns it).

**Handles**:
- Nested regulator/parent relationships (rendered inline to avoid singleton violations)
- `sameAs` links, schema type, canonical name

**Example**:
```javascript
const node = entityFullNode(hpwkiRecord, registry, "/verify-jvto/legal");
// → { "@id": "...", "@type": "Organization", name: "HPWKI", parentOrganization: { ... } }
```

### `emitEntity(registry, name, route): object | null`
Smart emit: returns full definition if the route owns the entity, reference otherwise.

**Behavior**:
- If not in registry → returns `null` (caller can fall back)
- If owned by another route → returns reference
- If owned by this route → returns full node (first time only, then caches as reference)

This prevents redundant definitions on the same route (e.g., HPWKI in both `memberOf` and `hasCredential.recognizedBy`).

**Example**:
```javascript
const org = emitEntity(registry, "HPWKI", "/verify-jvto/legal");
// First call: → { "@id": "...", "@type": "Organization", ... }
// Second call on same route: → { "@id": "..." }
// Any call on different route: → { "@id": "..." }
```

**Used By**:
- `scripts/lib/build-organization.mjs`: Emit memberOf/recognizedBy entities
- `scripts/lib/build-person.mjs`: Emit credentials, sameAs links
- `llm-wiki`: Link wiki entities to external registry (future)

---

## Module: schema-validator.mjs

**Purpose**: Reusable validation rules for JSON-LD @graph structures.

**Location**: `scripts/lib/shared/schema-validator.mjs`

**Key Exports**:

### Constants

#### `ORGANIZATION_CLASSES: Set<string>`
Schema.org org types that are singletons (max 1 per route).
```javascript
// ["Organization", "TravelAgency", "LocalBusiness"]
```

#### `ORGANIZATION_ANY: Set<string>`
All org-like types (any can appear in graph, but must have @id).
```javascript
// ["Organization", "TravelAgency", "LocalBusiness", "GovernmentOrganization", "NGO", "Corporation", "EducationalOrganization"]
```

### Validators

Each returns an array of violation strings (empty if no violations).

#### `checkNoMissingIds(graph, route): string[]`
Every node must have `@id`.

#### `checkNoDuplicateSingletons(graph, route): string[]`
At most one per route for each:
- Organization-class (org/travel/business)
- FAQPage
- WebPage-class (any @type ending with "Page" except FAQPage)

#### `checkNoZeroRatings(graph, route): string[]`
Aggregate and nested review ratings must be:
- reviewCount >= 1 (if present)
- ratingValue > 0
- Both numeric

#### `checkOrganizationIdentity(graph, route): string[]`
Every organization node (any type in ORGANIZATION_ANY) must have @id.

Prevents anonymous orgs that can't be linked across pages.

#### `checkDanglingReferences(graph, route, registryIds, options): string[]`
Detect broken @id references.

**Parameters**:
- `registryIds`: Set of known cross-route @ids (from entity registry)
- `options`: Configuration
  - `internalIdPrefix`: Internal domain (default: `"https://javavolcano-touroperator.com/"`)
  - `exemptedRefs`: Set of @ids to never flag (e.g., external PDP #webpage)

**Detects**:
- Internal URLs (domain + #) pointing to unknown @ids
- Not in current graph, not in registry, not exempted

**Example**:
```javascript
const violations = checkDanglingReferences(
  graph,
  "/tours/from-bali/bromo-3d2n",
  registryIds,
  {
    exemptedRefs: new Set([
      "https://javavolcano-touroperator.com/tours/from-bali/bromo-3d2n#webpage"
    ])
  }
);
```

### Convenience Export

#### `schemaValidators: { [name]: function }`
Object grouping all validators by name, for easy composition.

**Example**:
```javascript
const allViolations = [];
for (const validator of Object.values(schemaValidators)) {
  allViolations.push(...validator(graph, route));
}
```

**Used By**:
- `scripts/validate-schema.mjs`: Ekosistem validation gate
- `llm-wiki`: Wiki ingestion validation (future)

---

## Migration Guide: Using Shared Modules

### In jvto-ekosistem

**Before** (local implementation):
```javascript
import { hashBookingRecord } from "./lib/booking-sync/manifest.mjs";
```

**After** (shared):
```javascript
import { hashRecord } from "./lib/shared/change-tracker.mjs";
```

### In llm-wiki

**Add to scripts/lib/shared/** (symlink or copy from ekosistem):
```bash
ln -s ../../../jvto-ekosistem/scripts/lib/shared scripts/lib/shared
# or: cp -r ../jvto-ekosistem/scripts/lib/shared scripts/lib/shared
```

**Then use in ingestion**:
```javascript
import { hashRecord, diffManifest } from "./lib/shared/change-tracker.mjs";
import { loadRegistry, emitEntity } from "./lib/shared/entity-resolver.mjs";
```

---

## Cross-Repo Integration Points

### 1. Booking Sync (ekosistem) + Wiki Ingestion (llm-wiki)

**Current** (ekosistem only):
- `scripts/sync-booking-data.mjs` uses `diffManifest()` to track booking changes

**Future** (both repos):
- Wiki ingestion uses `diffManifest()` to detect new/changed wiki pages
- Same manifest format allows cross-repo sync status reporting

### 2. Entity Registry (ekosistem) + Wiki Entities (llm-wiki)

**Current** (ekosistem only):
- `external-entities.json` registry prevents anonymous orgs in schema
- Wiki has implicit crew registry in frontmatter

**Future** (unified):
- Publish ekosistem `external-entities.json` as canonical registry
- Wiki ingestion validates entity names against registry
- Contradictions flagged in CI

### 3. Schema Validation (ekosistem) + Wiki Quality (llm-wiki)

**Current** (ekosistem only):
- `validate-schema.mjs` checks JSON-LD @graph

**Future** (both repos):
- Wiki uses schema validators on compiled outputs
- Cross-repo validation: wiki entities → ekosistem schema → website

---

## Notes for Maintainers

### Versioning
Shared modules are part of jvto-ekosistem's semantic versioning.
When llm-wiki uses them (via symlink/import), pin to ekosistem version in docs.

### Testing
Each module has tests in `scripts/test/shared/` (created alongside implementation).
Before using in a new repo, run:
```bash
node scripts/test/shared/*.test.mjs
```

### Adding New Validators
Add to `schema-validator.mjs` and export from `schemaValidators` object.
Update docs above with new validator signature and behavior.
