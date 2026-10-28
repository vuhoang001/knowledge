---
title: Exercises — Bash
sidebar_key: bash-tutorials
sidebar_position: 0
description: "Labs you actually run — type along and you get exactly the output shown; practice text-processing pipelines, regex/sed, script writing, and an 8-step forensics chain."
tags: [tutorials, bash]
domain: devops
category: index
doc_type: index
updated: 2026-10-28
---

# Exercises — Bash

Labs you actually run: every command was run on a real machine while writing, and the output
is pasted verbatim. Type along and you'll get exactly that (small differences if your machine
uses GNU coreutils instead of uutils).

| # | Lab | What you practise | Level | Status |
|---|---|---|---|---|
| 1 | [Lab: text processing with pipelines](bash-lab-text-processing.md) | Answering real questions from a sample `access.log` with `grep`/`awk`/`sort`/`uniq` | beginner | 📝 output really run |
| 2 | [Lab: writing your first bash script](bash-lab-first-script.md) | From `hello.sh` to a script with parameters, `set -euo pipefail`, functions and `bash -x` debugging | beginner | 📝 output really run |
| 3 | [Lab: regex and sed](bash-lab-regex-va-sed.md) | Filtering lines with `grep -E`/`-F`, normalizing a CSV with `sed`, and the trap of a substitution bleeding across the whole line | intermediate | 📝 output really run |
| 4 | [Lab: mock CLI forensics check](bash-lab-forensics-mock.md) | An 8-step chain: `ps`/`chmod` → `grep` → `sed` → `awk` → a SHA-256 seal | advanced | 📝 output really run |

Symbols: ✅ run by hand and confirmed (`verified_at` has a date) · 📝 output really run while
writing, `verified_at` waits for the repo owner to run it again by hand.

## Order to work through the 4 labs

Follow the order above — lab 3 assumes lab 1 (text-processing) is done, and lab 4 is the final
synthesis, chaining all four skill groups (`process`, `regex`, `sed`, `awk`) into one long
pipeline, so save it for last.

## Related Topics

- [Bash](../index.md) — the topic this directory belongs to
- [Text processing with pipelines](../skills/text-processing.md) — the theory behind lab 1
- [Writing safe scripts](../skills/viet-script-an-toan.md) — the theory behind lab 2
- [Regex basics](../reference/regex-co-ban.md) — the theory behind lab 3
- [Process and job control](../reference/process-va-job-control.md) — part of the foundation for lab 4
