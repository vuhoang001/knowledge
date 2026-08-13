---
title: Case study — Bash
sidebar_key: bash-case-studies
sidebar_position: 0
description: "Four classic ways a script breaks, each with real symptoms, the wrong first hypothesis, and the fix."
tags: [case-study, bash]
domain: devops
category: index
doc_type: index
updated: 2026-08-05
---

# Case study — Bash

Four ways scripts break that anyone writing bash long enough will hit. Each one follows the
same thread: **symptom → the wrong first hypothesis → the real cause → the fix → how to spot
it early**.

> **Reconstructed situations**, not incidents that happened in this knowledge base. In exchange,
> **every command and every piece of output was really run on bash 5.3.9** — type them again and
> you get the same thing.

| # | Incident | Lesson | Related technique |
|---|---|---|---|
| 1 | [A filename with a space deletes a whole directory](bien-khong-nhay-word-splitting.md) | An unquoted variable is word-split into several arguments | [Quoting and expansion](../reference/quoting-va-expansion.md) |
| 2 | [A falsely green pipeline — the error in the middle is swallowed](pipe-nuot-exit-code.md) | A pipeline's exit code is the last command's; without `pipefail` you're blind | [Exit codes and control flow](../reference/exit-code-va-control-flow.md) |
| 3 | [The loop runs once with a literal asterisk](glob-khong-khop.md) | When a glob doesn't match, bash leaves the pattern as-is rather than returning nothing | [Conditionals and loops](../skills/conditionals-va-loops.md) |
| 4 | [set -e is on but the script keeps going](set-e-khong-bat.md) | `set -e` has a long list of exceptions; it can't be trusted on its own | [Writing safe scripts](../skills/viet-script-an-toan.md) |

## Related Topics

- [Bash](../index.md) — the topic this directory belongs to
- [Writing safe scripts](../skills/viet-script-an-toan.md) — how to block all four of these from the start
