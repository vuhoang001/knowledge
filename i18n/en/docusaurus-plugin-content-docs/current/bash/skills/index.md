---
title: Skills — Bash
sidebar_key: bash-skills
sidebar_position: 0
description: "What to do when you hit situation X — assumes you've got the Reference group down, focuses on applying the techniques."
tags: [skills, bash]
domain: devops
category: index
doc_type: index
updated: 2026-08-05
---

# Skills — Bash

Every file starts from *"I understand the concept, now how do I handle this job"*. It assumes
you've read the [Reference](../reference/index.md) group — especially quoting and exit codes.

| # | Skill | Answers the question | Level | Status |
|---|---|---|---|---|
| 1 | [Text processing with pipelines](text-processing.md) | Composing `grep`/`awk`/`sed`/`sort`/`uniq` to answer questions from logs and files | intermediate | 📝 theory |
| 2 | [Finding files with find and xargs](find-va-xargs.md) | Walking a directory tree, running commands in bulk, safely with names containing spaces | intermediate | 📝 theory |
| 3 | [Variables, arrays and parameter expansion](variables-arrays-expansion.md) | Assigning variables, arrays, defaults and slicing strings without calling `sed` | intermediate | 📝 theory |
| 4 | [Conditionals and loops](conditionals-va-loops.md) | `if`/`case`, `for`/`while`, `[[ ]]`, and reading a file line by line properly | beginner | 📝 theory |
| 5 | [Functions in bash](functions.md) | Parameters, returning results via `echo` vs an exit code, and `local` | intermediate | 📝 theory |
| 6 | [Writing safe scripts](viet-script-an-toan.md) | `set -euo pipefail`, quoting, `trap` for cleanup — the skeleton of every script | advanced | 📝 theory |

Symbols: ✅ run by hand and confirmed · 📝 theory — the output was really run, `verified_at` waits for the repo owner.

## Related Topics

- [Bash](../index.md) — the topic this directory belongs to
- [Reference](../reference/index.md) — the conceptual base for this group
- [Exercises](../tutorials/index.md) — hands-on practice for these skills
