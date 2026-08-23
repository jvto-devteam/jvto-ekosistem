# jvto-ekosistem — working notes

Conventions and traps in this repo. Every entry below cost a real mistake or a
real debugging session; read it before writing code here.

## Content pipeline

- `npm run render:web-content` reads **only** `*.source.json`, and it **deletes
  then rewrites** every `*.website-output.json`, `*.schema-output.json`, the
  knowledge feed, and `5-experience-engine/manifests/*`. Hand-patching any of
  those is erased on the next run.
- `public/llms.txt` comes from a separate command, `npm run render:llms`, which
  consumes the feed the previous step produces. **Order is mandatory:
  `render:web-content` first, then `render:llms`.** Never the reverse.
- Hand-authored and rendered by nothing: `organization.json`, `credentials.json`,
  `narrative-claims.json`, `trust-claims.json`, `destination-knowledge/*.json`,
  `tour-products/*.product-contract.json`, `4-operations-core/**`, `faqs/*.json`.
- Generated files carry a fresh `generated_at` on **every** run, so re-rendering
  always produces a diff even when nothing changed. Before committing a render,
  check whether the diff is content or only timestamps — a timestamp-only commit
  triggers a deploy for nothing.

## Fix at the source layer, then regenerate

When a merge conflicts in generated files, do not hand-merge them. Take either
side, then re-run the pipeline in its required order so everything is rebuilt
from the merged sources. A merge from `main` typically conflicts in 200+
`schema-output.json` files and zero source files; that is the normal shape.

## Testing

- `node:assert/strict`, no runner, no framework. Bare `{ }` blocks per scenario,
  inline fixtures using real production values, and a final
  `console.log("<file>.test.mjs: all assertions passed")`.
- **Every new test file must be appended by hand to the `&&` chain** in the
  relevant `test:*` script in `package.json`. Nothing globs them.

## Sync scripts (Idiom A)

`scripts/sync-booking-data.mjs` is the model. Export
`runSync({dryRun, now, archiveRoot, ...injectedIO})` with every I/O dependency
injectable, build paths from `archiveRoot` (never `__dirname`), `throw` rather
than `process.exit`, and end with the main-module guard.

- **A dry run and a no-change run must write zero bytes** so the workflow's
  git-status check finds nothing and makes no empty commit.
- **Never fold one sync's generators into another's runner.** `run-generators.mjs`
  belongs to booking-sync; llm-wiki has its own under
  `scripts/lib/llm-wiki-sync/`. Wiring them together made every booking sync try
  to load an llm-wiki snapshot, and rewrote ten booking artifacts on every
  llm-wiki sync.
- **Never hash a field the producer restamps.** The llm-wiki manifest carries
  `compiled_at`, refreshed on every compile even when inputs are identical.
  Fingerprint `input_hashes` + `outputs` instead, or the nightly job commits
  noise forever.
- Module constants stay **private**. `sync-booking-data.mjs` declares
  `const MASS_REMOVAL_THRESHOLD = 0.3` without exporting it; export only what
  another module or a test actually imports.

## Workflows

- **`actions/checkout` rejects any `path` outside `$GITHUB_WORKSPACE`.**
  `path: ../sibling-repo` fails with *"Repository path ... is not under ..."*.
  Check the second repo out into a gitignored subdirectory instead and point the
  script at it via an env var.
  Known instance still unfixed: `verify-evidence-hashes.yml` uses
  `path: ../jvto-web`, and `scripts/verify-evidence-hashes.mjs:42` hardcodes
  `path.resolve(ROOT, "..", "jvto-web")` — that workflow will fail the first time
  it fires. Fixing it needs both files changed.
- Sync workflows run on **stock Node with zero dependencies — no `npm ci`**.
- **`deploy-vps.yml` needs two edits, not one**, when a job writes new paths:
  add them to `paths-ignore` **and** to the `case` allowlist in the
  *Classify deployment mode* step. Miss the second and the commit falls through
  to `*)` = full deploy, which `cancel-in-progress: true` can use to kill a
  legitimate deploy in flight.
- A scheduled workflow proves nothing until it has actually run. Trigger it with
  `workflow_dispatch` and read the step results before calling it done.

## Data rules

- **Separate a historical record from a current assertion.** `superseded_unit:
  "Ditpamobvit"` and `superseded_number: "SE.1658/KSA.9/2024"` are *correct* —
  they record what was replaced. Only a present-tense claim carrying a retired
  term is a regression. A grep that does not make this distinction reports false
  positives; `scripts/test/llm-wiki-sync/anti-regression.test.mjs` encodes the
  correct check.
- **Ijen health screening is mandatory for every guest** (retired 2026-07-06).
  No "when required", "where applicable", or "if thresholds apply" framing.
  The one legitimate exception is
  `4-operations-core/trip-readiness/readiness-signals.json`, which distinguishes
  Ijen from non-Ijen routes.
- The credit product is **"Lifetime Package Credit"**. "Travel Credit" and
  "Lifetime Travel Credit" are retired.
- **SE.1658 and SE.35 are different instruments.** SE.1658 reopens the crater;
  SE.35 is what the health-certificate requirement rests on, corroborated by
  TIMES Indonesia, detikJatim and Liputan6. Never publish a validity window for
  the surat sehat — no source states one.
- Some source files store the same prose twice (a `body_md` block and a
  structured block). Edit both copies.

## llm-wiki sync specifics

- The upstream manifest lists `people.json`, `policies.json`, `destinations.json`,
  `products.json`, `operational.json` under `unmanaged_files`. **They are not
  compiler output and must never be synced.** Only the six artifacts in
  `sync_contract.required_files` are in scope.
- `trust-claims.json` is a **composition** of `claims.json` + `aeo-snippets.json`
  + `faq.json`. Overwriting it from `claims.json` alone deletes the
  `aeoSnippets[]` and `faq[]` blocks.
- **Evidence ids do not join on `proof_id`**, despite what the handoff says.
  Only one of the three documented pairs shares a spelling. The mapping is the
  explicit table in `scripts/lib/llm-wiki-sync/evidence-map.mjs`; its test fails
  loudly if either side renumbers.
- Two fields are frozen at their downstream value by owner decision and reported
  to `archive/llm-wiki-snapshot/conflicts.json`: the 2016 PT incorporation year
  and the `{PACKAGE_COUNT}` token. Do not let a sync resolve them.

## Verifying "is this symbol used anywhere?"

**Do not answer this with grep.** Four separate greps gave four wrong answers in
one session: one excluded the defining file, one missed multi-line `import`
blocks, one missed single-line ones, and one reported three live functions as
dead because they are imported under `as` aliases. Acting on that last result
would have deleted the core of the sync.

Parse the `import` blocks and normalise aliases before concluding anything is
unused. The same discipline applies to any "does X appear anywhere" question
where a wrong answer causes a deletion.

## Read the contract before building against it

The first llm-wiki sync implementation shipped eight generators writing to
directories that do not exist, five of them for files the upstream manifest
explicitly marks unmanaged, behind a gate that skipped two of the four checks the
manifest's own `failure_rule` demands. All of it was avoidable by opening
`_manifest.json` first. When a plan describes an external contract, open the
contract — the plan may be out of date or simply wrong.
