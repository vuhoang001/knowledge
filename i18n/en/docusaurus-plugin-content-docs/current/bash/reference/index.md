---
title: Reference — Bash
sidebar_key: bash-reference
sidebar_position: 0
description: "What it is, why, and what the trade-offs are. Read this group before writing your first line of script."
tags: [reference, bash]
domain: devops
category: index
doc_type: index
updated: 2026-08-05
---

# Reference — Bash

Explains *what it is, why, and what the trade-offs are*. Six foundational concepts — hold
these and every command and script afterwards is readable; skip them and you'll keep pasting
commands off the internet and wondering why things break.

| # | Document | Answers the question | Level | Status |
|---|---|---|---|---|
| 1 | [What a shell is](shell-la-gi.md) | The shell turns text into processes — where bash, sh and zsh differ | beginner | 📝 theory |
| 2 | [Streams and redirection](streams-va-redirection.md) | The three streams stdin/stdout/stderr and reconnecting them with `>`, `2>&1`, pipes | beginner | 📝 theory |
| 3 | [Quoting and expansion](quoting-va-expansion.md) | Single/double quotes, word splitting, globbing, and the order bash expands things in | intermediate | 📝 theory |
| 4 | [Exit codes and control flow](exit-code-va-control-flow.md) | Why `if cmd` runs on success/failure rather than true/false | beginner | 📝 theory |
| 5 | [File permissions](file-permissions.md) | Reading `-rwxr-xr-x`, changing it in octal, and `chmod`/`chown`/`umask` | beginner | 📝 theory |
| 6 | [Processes and job control](process-va-job-control.md) | `&`, `jobs`, `nohup`, signals and `kill` — how a background job lives and dies | intermediate | 📝 theory |

Symbols: ✅ run by hand and confirmed (`verified_at` has a date) · 📝 theory — every piece of
output **was really run** while writing, but `verified_at` is still empty, waiting for the repo
owner to run it again by hand.

## Related Topics

- [Bash](../index.md) — the topic this directory belongs to
- [Skills](../skills/index.md) — applying these concepts to concrete situations
