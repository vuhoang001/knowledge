---
title: AI-generated content wrote the wrong Trino catalog name
sidebar_position: 1
description: An afternoon lost to trusting AI-generated documentation — wrong in exactly the hardest place to verify, the environment details.
tags: [dbt, trino, case-study, verified-at, ai-generated]
domain: data-engineering
category: technology
doc_type: case-study
status: stable
difficulty: beginner
verified_at:
updated: 2026-09-11
---

# AI-generated content wrote the wrong Trino catalog name

> **Takeaway:** AI-generated content reads very convincingly and is wrong in exactly the hardest place to
> verify — the environment's specific details. This is why every file in this knowledge base has a
> `verified_at`, and empty means not yet trustworthy.

**Date:** 2026-07-30 · **Cost:** about an afternoon

## Context

Building the dbt module, needing to configure `profiles.yml` to point at Trino. The first draft of the
documentation, AI-generated, said:

> *"`profiles.yml` points at `<host>:8080`, catalog `iceberg`"*

Followed exactly. `dbt debug` failed.

## The wrong first hypotheses

Suspected the dbt configuration — wrong `profiles.yml` syntax, wrong `--profiles-dir`, wrong adapter
version, missing permissions. Lost an afternoon going round in circles inside dbt.

**The bug was somewhere completely different.**

## What was actually wrong

Running `SHOW CATALOGS` on that cluster:

```
<catalog_1>
<catalog_2>
<catalog_3>
system
```

> The real names have been redacted — they were internal project names, and **keeping them would be
> useless to you anyway**: your cluster will return different ones. What matters is the *shape* of what
> happened, not those particular strings.

**There is no catalog named `iceberg` at all.** The AI invented that name — it's the name *commonly seen*
in Trino documentation online (it is in fact a **connector** name), not the real catalog name of any
environment. What a catalog is called is chosen by whoever built the cluster.

## Why it was hard to catch

| What the AI got wrong | Catchable? |
|---|---|
| Wrong SQL syntax | ✅ it errors the moment you run it |
| A function name that doesn't exist | ✅ errors immediately |
| **The environment's catalog / host / schema names** | ❌ reads perfectly plausibly, only wrong when really run |

The third kind is the most dangerous because it is **formally correct**. Nobody reads `catalog: iceberg`
and feels suspicious — and yet that's exactly the wrong line.

## The lesson — which isn't about dbt

The lesson is about this knowledge base itself, not about dbt or Trino:

- **An empty `verified_at` means nobody has really run it.** Read it with suspicion.
- **Environment details must be verified by running a command, not by reading.** `SHOW CATALOGS`,
  `SHOW SCHEMAS`, `dbt debug` — run first, copy the output back, and only then write it into the documentation.
- This is why the knowledge base's hard rules #1 and #2 exist: never fill in `verified_at` yourself, never
  paste invented output.

## Related Topics

- [dbt](../index.md) — the topic this case study belongs to
- [Trino](../../../query-engines/trino/index.md) — the system whose catalog name was written wrongly
- [What dbt is](../reference/what-is-dbt.md) — the connection configuration section
