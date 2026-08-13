---
title: The loop runs once with a literal asterisk
sidebar_position: 3
description: "When a glob matches no files, bash leaves the literal asterisk string in place, so a for loop runs exactly once with a meaningless value."
tags: [case-study, glob, nullglob, loops, bash]
domain: devops
category: concept
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-05
---

# The loop runs once with a literal asterisk

> **A reconstructed situation**, not an incident that happened here. **Every command and every piece of output was really run on bash 5.3.9.**

> **Takeaway:** By default in bash, a glob that matches no files does **not** become empty — it stays as the literal string `*.csv`, so `for f in *.csv` still runs exactly **one** iteration with `f` set to the literal pattern, and `process "$f"` goes off to operate on a file that doesn't exist.

## Context

A data-collection script, with the classic core:

```bash
for f in *.csv; do
  process "$f"
done
```

Run in a directory with a few `.csv` files it behaves as expected: one iteration per file. The script passed CI, passed staging, and ran weekly without trouble. Then one day it ran on a directory with **no** `.csv` files yet (the job ran ahead of the producer, or the directory had just been cleaned), and started producing baffling errors — or worse, creating a junk file named exactly `*.csv`.

## Symptoms

Really run in an empty directory, with `process` replaced by `echo` so you can see `f`'s value:

```
$ for f in *.csv; do echo "xu ly: [$f]"; done
xu ly: [*.csv]
```

The loop **runs exactly once**, and `f` is the literal string `*.csv` — not the empty list intuition expects. `process` will receive a "file" named `*.csv`.

Two variants with the same root, also really run in an empty directory:

```
$ ls *.csv
ls: cannot access '*.csv': No such file or directory
exit=2

$ rm *.csv
rm: cannot remove '*.csv': No such file or directory
exit=1
```

`ls`/`rm` receive the literal string `*.csv`, go looking for a file with that literal name, don't find it, and report an error. And if you're unlucky enough that the directory **does** contain a file named exactly `*.csv` (created by an earlier broken run), then `rm *.csv` deletes exactly that one — one file, not "every csv file".

## The wrong first hypotheses

| Suspicion | Why it sounds reasonable | Why it's wrong |
|---|---|---|
| There's some hidden `.csv` file | `ls` doesn't normally show hidden files | `ls -a` shows the directory really is empty; `f`'s value is `*.csv`, not a real filename |
| The `process` function has a bug | The error comes out of inside `process` | `echo "[$f]"` prints `[*.csv]` — the bug is in the value passed in, not in `process` |
| An environment variable / `$IFS` was changed | Word splitting gets blamed often | A clean shell behaves identically — nothing to do with splitting |
| `$f` lost its quotes somewhere | Familiarity with word-splitting bugs | `f` is already quoted as `"$f"`; the problem is that `f` itself holds the pattern |

All of them look for the bug in the wrong place. This isn't a bug in the script — it's glob's **default behaviour** when nothing matches.

## The real cause

Per POSIX, when a glob pattern matches no files, the shell leaves the pattern **unchanged**. Bash follows that rule by default. Check the switch that controls it, really run:

```
$ shopt nullglob
nullglob            	off
```

`nullglob` **off** means: a glob that doesn't match → keep the string as-is. So `for f in *.csv` with no matching files becomes `for f in '*.csv'` — a one-element list, so the loop runs once with that value. Nothing mysterious; just a default that runs counter to the intuition of "no match means skip".

## Why it was hard to spot

- **The script was correct for months.** The bug only shows at one boundary condition: a directory with no matching files. Tests and everyday runs always had files, so they never touched the boundary.
- **The error surfaces a layer below.** `process`/`rm`/`ls` are where the error is thrown, so the reflex is to debug them, never suspecting the input was already broken by the `for`.
- **There's no warning at all.** Bash is completely silent — no warning, no unusual exit code at the expansion step. Truly "silent, with no error raised".
- **Intuition from other languages.** In Python/JS, iterating an empty list runs zero iterations. Bash does the opposite, and that's an easy assumption to carry over.

## The fix

**Option 1 — turn on `nullglob`:** a non-matching glob becomes an empty list and the loop runs zero times. Really run, comparing before and after in an empty directory:

```
$ # TRUOC: nullglob off
$ for f in *.csv; do echo "chay voi f=[$f]"; done
chay voi f=[*.csv]

$ # SAU:
$ shopt -s nullglob
$ for f in *.csv; do echo "chay voi f=[$f]"; done
$   # (khong in gi = vong lap khong chay lan nao)
```

The trap: `nullglob` is a **global** switch for the rest of the script. Another glob in the same script that you *wanted* to error out on no match will now silently become empty. Turn it on deliberately, and consider `shopt -u nullglob` after the section that needs it.

**Option 2 — a guard at the top of the loop, touching no global switch:**

```
$ for f in *.csv; do [[ -e "$f" ]] || continue; echo "chay voi f=[$f]"; done
$   # (khong in gi = guard chan chuoi literal)
```

`[[ -e "$f" ]]` checks whether the file really exists; the literal string `*.csv` doesn't, so `continue` skips it. Local, with no effect on other globs.

**Option 3 — `failglob` when you want it to break loudly:**

```
$ shopt -s failglob
$ for f in *.csv; do echo "chay voi f=[$f]"; done
bash: line 14: no match: *.csv
exit=1
```

A non-matching glob → an immediate error, no iterations, nothing silent. Right when "there are no files to process" deserves to be treated as an abnormality worth stopping for.

## How to spot it early

- A loop `for x in *.ext; do ...` whose body does **not** check that the file exists (`[[ -e "$x" ]]`).
- An error operating on a file whose name is **exactly the pattern** (`*.csv`, `*.log`) — a sure sign the glob didn't match and drifted through unchanged.
- ShellCheck raising **SC2045** ("iterating over `ls` output is fragile") and the related glob warnings — run `shellcheck` on the script before trusting it.
- A new job, with a directory that may be empty on the first run: always ask yourself "what if nothing matches?".

## Related Topics

- [Quoting and expansion](../reference/quoting-va-expansion.md)
- [Conditionals and loops](../skills/conditionals-va-loops.md)
- [An unquoted variable — word splitting](bien-khong-nhay-word-splitting.md)
- [Writing safe scripts](../skills/viet-script-an-toan.md)
