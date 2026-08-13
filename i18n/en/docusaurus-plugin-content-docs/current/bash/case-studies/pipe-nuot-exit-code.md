---
title: A falsely green pipeline — the error in the middle is swallowed
sidebar_position: 2
description: "A pipeline's exit code is by default the last command's, so a failure in the middle is swallowed — the script reports success while the step that mattered has broken."
tags: [case-study, exit-code, pipefail, bash]
domain: devops
category: concept
doc_type: case-study
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-05
---

# A falsely green pipeline — the error in the middle is swallowed

> **A reconstructed situation**, not an incident that happened here. **Every command and every piece of output was really run on bash 5.3.9.**

> **Takeaway:** A pipeline's exit code is by default the exit code of the **last** command — so if the step that matters is in the **middle** of the pipe and it breaks, the pipeline is still "green" (exit 0). `set -e` can't save you, because it only looks at that final exit code. You need `set -o pipefail`.

## Context

A backup script with `set -e` at the top, which the author treated as "safe now — any error stops it". The core step is dumping the database and compressing it:

```bash
#!/usr/bin/env bash
set -e

pg_dump -h db.internal -U app appdb | gzip > backup.sql.gz
aws s3 cp backup.sql.gz s3://backups/appdb/
echo "Backup thanh cong"
```

It looks reasonable: `set -e` stops the script on an error, so if `pg_dump` dies the script will stop before uploading an empty file to S3. In reality, it doesn't.

## Symptoms

`pg_dump` fails (wrong argument, missing DB, lost connection) but the script **carries on**: it uploads `backup.sql.gz` — a nearly empty file — to S3, prints `Backup thanh cong`, and exits with code 0. Cron records a success. Six months later, when a restore is needed, you discover every backup is junk.

You don't need Postgres to reproduce the core of the problem — replace `pg_dump` with `false` (a command that always fails):

```bash
false | gzip > out.gz; echo "exit=$?"
```

Really run:

```
exit=0
```

The pipeline "succeeded" even though `false` failed. The compressed file even has a size — it compressed an empty stream:

```bash
stat -c '%s' out.gz
```

```
20
```

20 bytes: that's the gzip header of an empty file. Exactly what `backup.sql.gz` contains when `pg_dump` dies. A different variant shows the same thing — the middle command fails, the final `cat` succeeds, and the exit code comes back 0:

```bash
ls /khong-ton-tai-xyz 2>/dev/null | cat; echo "exit=$?"
```

```
exit=0
```

## The wrong first hypotheses

| Hypothesis | Why you'd think it | Why it's wrong |
|---|---|---|
| `gzip` is broken | The output file is empty/corrupt, so suspect the last thing in the pipe | `gzip` ran correctly — it successfully compressed the empty stream it received |
| The disk is full so the write was truncated | The file is unusually small | `df` shows free space; the file is small because the **input** was empty, not because the write was truncated |
| Wrong write permissions | The file has "no content" | It wrote fine, and exit 0 proves permissions weren't the issue |
| `set -e` got turned off somewhere | The script doesn't stop despite an error | `set -e` is still on — it simply **can't see** the error in the middle of the pipe |

All of them look at the last thing in the pipe or at the file-writing environment. The culprit is **the pipeline's exit-code semantics**.

## The real cause

The exit code of a pipeline `a | b | c` is by default the exit code of the **last command** (`c`). POSIX specifies it, and bash follows by default. `gzip` receives EOF early, finishes compressing, and exits 0 → the whole pipeline exits 0. `pg_dump`'s (or `false`'s) failure in the middle is **swallowed completely**.

Because `set -e` acts only on the whole pipeline's exit code, and that code is 0, `set -e` has nothing to catch:

```bash
bash -c 'set -e; false | gzip > out.gz; echo "sau pipe van chay, exit=$?"'
```

```
sau pipe van chay, exit=0
```

The line after the pipe still prints. `set -e` can't save you, because from its point of view there was no "error".

### A sibling variant: a variable assigned inside a `while` after a pipe, then lost

Rooted in the same "each side of a pipe runs separately", a trap that often comes along with it: counting lines with a `while` after a pipe.

```bash
bash -c 'count=0; seq 1 5 | while read x; do count=$((count+1)); done; echo "count = $count"'
```

```
count = 0
```

`count` is still 0 even though the loop ran 5 times. The reason: each side of a pipe runs in its own **subshell**. The `while` side incremented `count` inside its subshell; the subshell exits, the variable vanishes, and the parent shell's `count` is unchanged. (Note: bash has `shopt -s lastpipe` to run the last side in the parent shell — but it only takes effect when job control is off, so don't rely on it.)

## Why it was hard to spot

- **No error is printed at all.** Exit 0, no stderr from the pipeline, cron reports green. There's nothing to raise suspicion.
- **`set -e` creates a false sense of safety.** Everyone thinks "we have `set -e`, errors stop it by themselves" — true for a single command, false for a pipeline.
- **The output file exists and has a size.** 20 bytes looks more like "a small file" than "a corrupt file"; `ls -l` gives nothing away.
- **The obvious suspect is the last one.** The output is broken → you look at the command that produced the output (`gzip`), while the error is in the first one.
- **The symptom is out of phase in time.** The backup breaks today, and only shows up when a restore is needed months later.

## The fix

**1. Turn on `set -o pipefail`.** With `pipefail`, the pipeline's exit code is the exit code of the **last non-zero** command — meaning any side that fails makes the whole pipeline fail.

```bash
bash -c 'set -o pipefail; false | gzip > out.gz; echo "exit=$?"'
```

```
exit=1
```

Now combine it with `set -e` and the script stops at the right moment:

```bash
bash -c 'set -e -o pipefail; false | gzip > out.gz; echo "dong nay KHONG in ra"'; echo "script chet, exit=$?"
```

```
script chet, exit=1
```

The echo inside the pipe doesn't print — the script dies right at the pipeline. This is the combo to put at the top of every script:

```bash
set -euo pipefail
```

**2. To know which side failed, read `${PIPESTATUS[@]}`.** That array holds the exit code of **each** side of the pipeline that just ran, in order:

```bash
bash -c 'false | gzip > out.gz; echo "PIPESTATUS = ${PIPESTATUS[@]}"'
```

```
PIPESTATUS = 1 0
```

`1 0` = the first side (`false`) failed, the second (`gzip`) was fine. Use it to log precisely which step died.

**3. For the `while` losing its variable, avoid the pipe — feed the source in with a redirect or process substitution.** Then the `while` runs in the main shell, not a subshell:

```bash
# process substitution
bash -c 'count=0; while read x; do count=$((count+1)); done < <(seq 1 5); echo "count = $count"'
```

```
count = 5
```

```bash
# or read from a file
bash -c 'seq 1 5 > nums.txt; count=0; while read x; do count=$((count+1)); done < nums.txt; echo "count = $count"'
```

```
count = 5
```

Both give `count = 5` — the variable keeps its value because there's no subshell any more.

## How to spot it early

- Any pipeline where a **non-final command** is the step that matters: `pg_dump | gzip`, `curl | tar`, `generate | tee`, `mysqldump | ssh`. The first side is the one to worry about, yet the exit code listens to the last.
- A script **without `set -o pipefail`** at the top (quick check: `grep pipefail script.sh`).
- A variable assigned inside a `while ... done` placed **after a pipe** reads back as empty or 0 outside.
- An output file that "succeeded" but has a **suspiciously small size** — with gzip, around 20 bytes (the header of an empty stream).
- Cron/CI reports green but the produced artifact is unusable — the classic sign of a swallowed exit code.

## Related Topics

- [Exit codes and control flow](../reference/exit-code-va-control-flow.md)
- [Writing safe scripts](../skills/viet-script-an-toan.md)
- [Streams and redirection](../reference/streams-va-redirection.md)
- [set -e doesn't catch it](set-e-khong-bat.md)
