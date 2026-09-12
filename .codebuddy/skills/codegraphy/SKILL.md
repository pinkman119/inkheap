---
name: codegraphy
description: Navigate this workspace through the CodeGraphy Relationship Graph instead of blind file search. Use when locating where a symbol/file is defined, finding callers, callees, dependencies, dependents or impact surface, tracing imports/references/inheritance, finding entry points, or when grep/glob across the large backend-node and frontend trees would be slow or noisy. Covers the `codegraphy` CLI (status, index, nodes, search, edges, dependencies, dependents, path, scope, filter, plugins) and its bounded JSON output contract.
---

# CodeGraphy

CodeGraphy represents a workspace as a **Relationship Graph**. Nodes identify Files, Folders, Packages, AST Symbols, and plugin-defined concepts. Directed Edges identify relationships such as imports, reexports, calls, references, inheritance, and containment. Edge direction and type explain why two Nodes are connected.

The graph is navigation evidence. Static relationships can identify ownership and possible change surfaces, but they do not prove runtime behavior. Source, tests, generated behavior, dynamic dispatch, and unsupported language semantics can add facts that are absent from the graph.

## When to reach for the graph

Prefer `codegraphy` over `grep`/glob crawling when the question is structural:

- "Where is X defined?" / "Who uses X?" / "What does this file depend on?"
- "What will break if I change X?" (dependents / incoming relationships)
- "How does A reach B?" (bounded path)
- "What are the entry points / hubs in this package?"
- Any navigation over this repo's large trees (`backend-node/` NestJS, `frontend/` Vue).

Fall back to `search_content` / `read_file` for literal text, log messages, comments, config values, or when the graph has no cache yet.

## This workspace

- Graph Cache: `.codegraphy/graph.sqlite`, persisted Graph Scope in `.codegraphy/settings.json`.
- Graph Scope is configured for agent use: `file`, `symbol*`, `variable*`, `package` nodes are visible; all edge types that this codebase produces (`import`, `type-import`, `call`, `contains`, `inherit`, `implements`, `overrides`, `reference`, `include`, `nests`, `using`) are enabled.
- Expected scale: ~326 indexed files, ~2.8k nodes, ~1.7k edges.
- **TS/JS imports resolve to Symbol Nodes, not File Nodes.** `dependents <file>` therefore under-reports in `backend-node/` and `frontend/`. To answer "who uses this", first `codegraphy search <Name>` to get the exact Symbol ID (form `path#Name:kind`), then `codegraphy dependents "<symbol-id>"`.
- Windows quirk in this CLI version: File Nodes are also stored with `\` separators, so `codegraphy nodes` lists some files twice. `search`, `dependencies`, and `dependents` behave correctly with `/`-separated paths — use one canonical `/` path form.
- Prefer `codegraphy index` only when `codegraphy status` reports `missing`/`stale`. The CLI's incremental Indexing is the supported path; if query results look empty after an incremental run, rebuild from scratch (`codegraphy index` after removing `.codegraphy/graph.sqlite`).

## Graph lifecycle and freshness

`codegraphy index` discovers eligible workspace files, runs built-in and enabled Plugin analysis, and creates or incrementally updates `.codegraphy/graph.sqlite`. The Graph Cache stores complete indexed facts before Graph Scope and path Filters shape query results.

`codegraphy watch` performs that synchronization and remains in the foreground with the workspace engine resident in memory. Workspace events are debounced into serialized incremental updates, while file creation, deletion, renaming, Git ignore changes, and workspace settings changes can trigger rediscovery. Cache artifacts and active Filter matches are skipped. Changes that arrive during an update remain pending for another batch, simultaneous Graph Cache writers are coordinated, and interrupting the watcher persists its pending batch before shutdown.

This is a CLI lifecycle: the VS Code Extension changes cached source facts only after an explicit Index or Re-index Workspace action. **The agent must run `codegraphy index` itself** after meaningful edits if it wants structural answers about the new code.

`codegraphy filter` changes persisted path exclusions. Adding an active Filter narrows queries immediately; removing or disabling one can expose files that were not indexed and therefore requires another Index. `codegraphy scope` changes which Node Types and Edge Types appear in the shaped graph. `codegraphy plugins` controls installed Plugin registration and activation.

Query with any read-only graph command after a Graph Cache exists. A `graph_cache_not_found` result means that no indexed snapshot is available. `codegraphy status` reports missing, stale, and fresh cache conditions. `codegraphy doctor` checks runtime, settings, cache, and Plugin health and includes recovery information for unhealthy checks.

Most Symbols and Relationships are cached. Search also reads current source text from eligible indexed File Nodes. A single response can therefore contain live source-text matches and cached Symbol matches whose cache state is `fresh` or `stale`. Indexing and live updates are what make changed AST and Relationship facts current; the watcher does not change the already-live source-text behavior.

## Query surfaces

| Command | Information returned |
|---|---|
| `search <text>` | One ranked result set merging live source locations, cached AST Symbols, and indexed Nodes. |
| `nodes` | A paginated Node inventory from the shaped graph. |
| `edges` | A paginated Relationship inventory from the shaped graph. |
| `dependencies <target>` | Outgoing Relationships from a File path or exact Node ID. |
| `dependents <target>` | Incoming Relationships to a File path or exact Node ID. |
| `path <from> <to>` | A bounded Relationship route between two File paths or exact Node IDs. |

`nodes` and `edges` report the persisted Graph Scope. `search`, `path`, and the targeted relationship commands use the complete cached Node and Edge Types unless an invocation explicitly projects a dimension with `--node-type` or `--edge-type`. Path Filters still apply. `--filter`, `--node-type`, and `--edge-type` are one-off query projections and do not modify `.codegraphy/settings.json`.

Common options on read-only query commands: `--limit <count>` (default 100), `--offset <count>` (zero-based), plus repeatable/comma-separated `--filter`, `--node-type`, `--edge-type`.

## Search and target identity

Search literal matching is case-insensitive. `*` is a line-local wildcard over source, names, and paths. Search is lexical rather than a semantic-answer engine. Source matches include File path, line, column, excerpt, and live freshness. Symbol matches include an exact Symbol ID and source location. Node matches include exact Node identity.

An exact File path or Symbol ID from these results can address `dependencies`, `dependents`, and `path`; a display label is not necessarily a Node ID.

Search, inventories, and relationship reports are bounded. Pagination uses `page` metadata recording offset, limit, returned count, total count, and `nextOffset` when another page exists. `path` reports traversal limits and a `complete` boolean; `complete: false` means the configured search bound was reached before the entire search space was exhausted.

## Machine-readable contract

Normal command results are JSON envelopes: `{"ok":true,"command":"...","data":...}` on stdout, and `{"ok":false,"command":"...","error":{"code":"...","message":"..."}}` on stderr with a nonzero exit status. `--verbose` adds lifecycle diagnostics to stderr without changing the data envelope.

Common error codes distinguish invalid arguments (`invalid_arguments`), missing or stale workspace state, an exact target that is absent, malformed settings, and operational failures.

Windows note: in PowerShell, stderr from a native command renders as noisy `NativeCommandError` text. Add `2>$null` when a failure is expected, or read `$LASTEXITCODE` instead of trusting the console output.

Workspace selection: commands operate on the current directory; use the global `codegraphy -C <path> ...` option for another workspace. From the repo root, the CLI already resolves `inkheap/.codegraphy`.

## Interpretation limits

- Graph coverage depends on eligible files, the indexing file budget (`maxFiles` in `.codegraphy/settings.json`), enabled Plugins, supported languages, and analyzer capabilities.
- Persisted Filters and Graph Scope can intentionally hide facts from broad inventories.
- Live text and cached structural facts can have different freshness in the same result.
- Imports, calls, references, and inferred or plugin-defined Edges have different semantics; an Edge Type should be interpreted rather than treated as generic proximity.
- Incoming Relationships suggest consumers or possible impact, while outgoing Relationships suggest dependencies; neither alone defines the complete edit set.
- Hubs, barrels, generated files, tests, and shared utilities can have many legitimate Relationships and can dominate broad graph results.
- Bounded or paginated output is not evidence that omitted results do not exist.

Current command syntax, options, and examples are available from `codegraphy --help` and `codegraphy <command> --help`.

## Typical workflow

1. `codegraphy status` — if missing/stale, run `codegraphy index`.
2. `codegraphy search <term>` — find the exact File path or Symbol ID.
3. `codegraphy dependencies <target>` / `codegraphy dependents <target>` — resolve outgoing and incoming relationships.
4. `codegraphy path <from> <to>` — confirm a route when chaining modules.
5. Verify anything that matters by reading the actual source with `read_file`.
