---
title: Bash
description: Shell scripting from the fundamentals to a working script — streams, quoting, exit codes, and the traps that break a script silently.
tags: [bash, shell, scripting, devops]
domain: devops
category: technology
doc_type: index
status: draft
difficulty: beginner
updated: 2026-08-05
---

# Bash

**This is a technology, but the slowest-depreciating part of it is the *concepts*.** You can
forget `awk` syntax, but understanding *how a command line becomes a process*, *how the three
streams connect to each other*, *why not double-quoting breaks things* — those have held from
bash 1989 until now, and they hold on zsh and sh too.

> This knowledge base is rewritten from [behitek/hoc-bash](https://github.com/behitek/hoc-bash) —
> but that source **lists commands**, whereas here each entry answers *why* and *where the trap
> is*. Bash isn't hard because there are many commands; it's hard because it **fails silently**:
> the script still exits 0 while the step that mattered has failed. The four
> [case studies](case-studies/index.md) are four flavours of that silence.

## Contents

The five standard groups — **every topic in this knowledge base uses exactly this set**.

### [Reference](reference/index.md) — what it is, why, what the trade-offs are

| # | Document | Answers the question | Level |
|---|---|---|---|
| 1 | [What a shell is](reference/shell-la-gi.md) | The shell turns text into processes; bash vs sh vs zsh | beginner |
| 2 | [Streams and redirection](reference/streams-va-redirection.md) | stdin/stdout/stderr and how to reconnect them | beginner |
| 3 | [Quoting and expansion](reference/quoting-va-expansion.md) | Word splitting, globbing, and why always `"$var"` | intermediate |
| 4 | [Exit codes and control flow](reference/exit-code-va-control-flow.md) | `if` runs on success/failure, not true/false | beginner |
| 5 | [File permissions](reference/file-permissions.md) | Reading `-rwxr-xr-x`, changing it in octal | beginner |
| 6 | [Processes and job control](reference/process-va-job-control.md) | `&`, `nohup`, signals, `kill` | intermediate |

### [Skills](skills/index.md) — what to do when you hit situation X

| # | Skill | Answers the question | Level |
|---|---|---|---|
| 1 | [Text processing with pipelines](skills/text-processing.md) | Composing `grep`/`awk`/`sed`/`sort`/`uniq` | intermediate |
| 2 | [Finding files with find and xargs](skills/find-va-xargs.md) | Walking a tree, running in bulk, safe with names containing spaces | intermediate |
| 3 | [Variables, arrays and parameter expansion](skills/variables-arrays-expansion.md) | Defaults, substrings, string replacement without `sed` | intermediate |
| 4 | [Conditionals and loops](skills/conditionals-va-loops.md) | `[[ ]]`, `case`, and reading a file properly with `while read` | beginner |
| 5 | [Functions in bash](skills/functions.md) | `echo` returns data, `return` returns an exit code, `local` | intermediate |
| 6 | [Writing safe scripts](skills/viet-script-an-toan.md) | `set -euo pipefail`, quoting, `trap` — the skeleton of every script | advanced |

### The other three groups

| Group | Contents |
|---|---|
| [Exercises](tutorials/index.md) | **2 labs you actually run** — a pipeline over `access.log`, and writing a script from `hello` up to having a `trap` |
| [Cheatsheet](cheatsheets/index.md) | [Commands by group](cheatsheets/commands.md) · [Test operators and expansion](cheatsheets/test-operators-va-expansion.md) |
| [Case study](case-studies/index.md) | **4 cases** — word splitting, the pipe swallowing an exit code, a glob that doesn't match, `set -e` not catching |

**Reference or Skill?** Reference answers *"what it is"*; Skills answer *"how do I handle
situation X"*. Both `text-processing` and `viet-script-an-toan` assume you already know
quoting and exit codes — so they're skills, not fundamentals.

## Learning Path

```text i18n-prose
What a shell is          ← start here
      ↓
Streams and redirection   ·   File permissions
      ↓
Quoting and expansion     ← where most bugs come from
      ↓
Exit codes and control flow
      ↓
Conditionals, loops · Variables, arrays · Functions
      ↓
Lab: text processing   ·   Lab: your first script   ← you actually run things here
      ↓
Writing safe scripts (set -euo pipefail, trap)
      ↓
Read the four case studies — to spot the trap BEFORE it bites
```

**The shortest path to something usable:** Shell → Streams → Quoting → Exit codes → the script lab.

## Why quoting and exit codes are the core

Knowing ten more commands does **not** save you from the two most expensive bash mistakes,
because neither of them **reports an error**:

- Not double-quoting a variable → a filename with a space breaks the loop, and `rm` deletes the
  wrong thing. The SQL is right, the syntax is right, it runs clean — until that one fateful file.
- A pipeline without `set -o pipefail` → a command in the middle of the pipe fails but the script
  exits 0, reporting success while the backup is empty.

This is why the five groups above put [Quoting](reference/quoting-va-expansion.md) and
[Exit codes](reference/exit-code-va-control-flow.md) at the foundation, and give four whole case
studies to the silent failure modes.

## Related Topics

- [Glossary](../glossary/index.md)
