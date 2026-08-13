---
title: Finding files with find and xargs
sidebar_position: 2
description: "find is a loop over a directory tree, paired with xargs to run commands in bulk — always use -print0 and -0, because a filename with a space wrecks everything."
tags: [find, xargs, files, bash]
domain: devops
category: tool
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-05
---

# Finding files with find and xargs

> **Takeaway:** `find` is a recursive loop over a directory tree: *walk → filter → do something*. When you need to run a command in bulk on the results, chain it into `xargs`. And **always** pair `-print0` with `-0` — one filename with a space is enough for default `find | xargs` to cut a path in the wrong place and delete the wrong thing.

## Goals

After reading this you'll be able to reconstruct:

- `find`'s three-part syntax: `find <path> <conditions> <action>`.
- The commonly used conditions: name, type, time, size, depth, and how to combine them with `-a`/`-o`/`!`.
- The difference between `-exec cmd {} \;` (once per file) and `-exec cmd {} +` (batched).
- Why `-print0 | xargs -0` is the safe default, while `find | xargs` and `ls | xargs` are traps.

## Overview

`find` reads as three parts, left to right:

```
find   logs        -name '*.log' -type f        -exec wc -l {} +
       ^path        ^điều kiện (lọc)             ^hành động
```

- **path**: where the walk starts. `find` descends recursively into every subdirectory.
- **conditions**: the tests that filter it down. Several conditions side by side default to **AND**.
- **action**: what to do with each matching file. The default is `-print` if you write no action.

The commonly used tests:

| Test | Meaning |
|---|---|
| `-name '*.log'` | name matches a glob — **must be quoted**, see the trap below |
| `-iname '*.LOG'` | like `-name` but case-insensitive |
| `-type f` / `-type d` | regular files only / directories only |
| `-mtime -7` | modified **within** the last 7 days (`+7` = older than 7 days) |
| `-size +10M` | larger than 10 MB (`-size -1k` = smaller than 1 KB) |
| `-maxdepth 2` | don't descend more than 2 levels |
| `! -name '*.log'` | negation — everything that is **not** a `.log` |
| `\( A -o B \)` | OR, and remember to escape the parentheses for the shell |

`xargs` reads stdin, splits it into arguments, then appends them to a command and runs it. This is how you turn a list of filenames (from `find`, `grep -l`, …) into arguments for a command that doesn't read stdin (like `rm`, `wc`, `cp`).

## Examples

All the output below is **really run 2026-08-05 · bash 5.3.9(1) on Ubuntu.** `find` on this machine is bfs 4.1.1 (GNU find compatible), not GNU findutils — output may differ slightly.

Build the sample tree — deliberately including a file named `báo cáo.log` (with a space) to break `xargs` later on:

```bash
mkdir -p /tmp/bashlab-find && cd /tmp/bashlab-find
mkdir -p logs/app logs/sys src
printf 'a\nb\nc\n'  > logs/app/error.log
printf 'x\ny\n'     > logs/sys/kernel.log
printf 'z\n'        > logs/app/old.log
printf 'hello\n'    > "logs/app/báo cáo.log"   # a name with a space
printf 'code\n'     > src/main.py
touch -d '2026-08-04' logs/app/error.log       # modified recently
touch -d '2025-01-01' logs/app/old.log         # modified long ago
```

### 1. Filtering: every `*.log`

```console
$ find logs -type f -name '*.log'
logs/sys/kernel.log
logs/app/báo cáo.log
logs/app/old.log
logs/app/error.log
```

### 2. Adding a time condition: only files modified in the last 7 days

Conditions side by side are AND. `old.log` (set to 2025-01-01) is excluded:

```console
$ find logs -name '*.log' -mtime -7
logs/sys/kernel.log
logs/app/báo cáo.log
logs/app/error.log
```

### 3. The `-exec {} +` action — batching several files into one command

The worked example: find every `*.log` and count its lines. `{}` is where the filename goes, and `+` batches them all into **one** `wc` invocation (hence the `total` line):

```console
$ find logs -name '*.log' -type f -exec wc -l {} +
 2 logs/sys/kernel.log
 1 logs/app/báo cáo.log
 1 logs/app/old.log
 3 logs/app/error.log
 7 total
```

### 4. The `-exec {} \;` action — once per file

Change `+` to `\;` and `find` invokes the command **separately for each file**. Slower (many forked processes), but required when the command only accepts a single argument:

```console
$ find logs -name 'error.log' -exec wc -l {} \;
3 logs/app/error.log
```

> `\;` is one process per file; `+` packs as many files as possible into one process (like `xargs`, and much faster on large lists). Default to `+`; only use `\;` when you need one-file-at-a-time. Both `\;` and `{}` have to be escaped so the shell doesn't eat them.

### 5. Why you need `-print0 | xargs -0` — a demo of the broken file

This is why this whole page exists. `xargs` splits arguments on **whitespace** by default, so `báo cáo.log` gets torn into two tokens, `báo` and `cáo.log`:

```console
$ find logs -name '*.log' | xargs wc -l
 2 logs/sys/kernel.log
wc: logs/app/báo: No such file or directory
wc: cáo.log: No such file or directory
 1 logs/app/old.log
 3 logs/app/error.log
 6 total
```

In real life, if the command were `rm` instead of `wc`, it just tried to delete two non-existent paths — and worse, if a file really named `báo` happened to exist, it would delete the wrong thing.

The fix: `find ... -print0` separates its results with a **NUL byte** (a character that can never appear in a filename), and `xargs -0` splits on exactly that NUL:

```console
$ find logs -name '*.log' -print0 | xargs -0 wc -l
 2 logs/sys/kernel.log
 1 logs/app/báo cáo.log
 1 logs/app/old.log
 3 logs/app/error.log
 7 total
```

All 4 files, `báo cáo.log` intact, and the right `total`.

### 6. The unquoted-glob trap — the shell expands it before `find` sees it

Run in `bash` (the lab's login shell is zsh, which reacts slightly differently — see Common Mistakes). The CWD already contains `top.log`:

```console
$ find . -name *.log        # KHÔNG nháy
./top.log
$ find . -name '*.log'      # CÓ nháy
./top.log
./logs/sys/kernel.log
./logs/app/báo cáo.log
./logs/app/old.log
./logs/app/error.log
```

Unquoted, bash expands `*.log` into `top.log` **in the current directory** *before* `find` runs, so `find` receives `-name top.log` and finds exactly one file. Quote it and `find` receives the actual string `*.log` and does the matching itself across the whole tree.

## Trade-offs

| Choice | When |
|---|---|
| `-exec {} +` | The default. Large lists, commands taking many arguments. Fastest. |
| `-exec {} \;` | The command takes only one file, or you need `{}` in the middle rather than at the end. |
| `find -print0 \| xargs -0` | When you need `xargs`'s flags: `-P` for parallelism, `-n1`, `-I{}`. Still filename-safe. |
| `find \| xargs` (without `-0`) | **Almost never.** Only acceptable when you're certain no filename contains a space or newline — which you rarely are. |

- `-exec {} +` and `xargs -0` are equivalent in speed and filename safety. The difference: `xargs` also gives you `-P` (parallelism) and `-I{}`; `-exec +` is more compact and needs no pipe.
- `-delete` is convenient but can't be undone. Run it with `-print` first, check the list is right, and only then change it to `-delete`.

## Common Mistakes

- **`find . -name *.log` unquoted.** The shell expands the glob first and `find` receives the wrong argument (see example 6). Always `-name '*.log'`.
- **`ls | xargs` with names containing spaces.** The same disease as `find | xargs`: `ls` prints names separated by newlines but `xargs` splits on whitespace too, so a name with a space breaks. Don't parse `ls` output in a script — use `find -print0`.
- **Forgetting `-type f`.** `-name '*.log'` also matches a directory named `*.log`. If you mean to operate on files, add `-type f`.
- **This lab runs zsh, not bash.** In zsh, `find . -name *.log` with no `.log` file in the CWD reports `no matches found` and **doesn't run find at all** (zsh defaults to `nomatch`). The same command, two shells, two behaviours — which is exactly why you quote: quoted, the result is the same on every shell.
- **Confusing `-mtime -7` with `+7`.** `-7` is *newer* than 7 days; `+7` is *older* than 7 days; `7` (no sign) is exactly the 7th day.

## FAQ

<details>
<summary>How do -print0 and -0 differ from -exec &#123;&#125; + ? Which do I pick?</summary>

Both are filename-safe and both batch several files into one command invocation. Use `-exec {} +` when you just need to run a command directly. Use `find -print0 | xargs -0` when you need `xargs` flags that `-exec` doesn't have: `-P4` (run 4 processes in parallel), `-n1` (one file per invocation), or `-I{}` (insert the name in the middle of the command).

</details>

<details>
<summary>Why NUL rather than a newline as the separator?</summary>

Because a filename on Linux is allowed to contain **any** byte except exactly two things: `/` and the NUL byte (`\0`). Newlines, spaces and tabs are all legal in a filename, so any separator that's a printable character could collide with the name's own content. NUL is the only byte that can never be inside a name, which makes `-print0`/`-0` the only unambiguous way to separate them.

</details>

<details>
<summary>What if I want the filename in the middle of the command rather than at the end?</summary>

`xargs` appends arguments to the **end** of the command by default. When you need it in the middle (for example `mv <file> backup/`), use `-I{}`:

```bash
find logs -name '*.log' -print0 | xargs -0 -I{} mv {} /tmp/backup/
```

Note that `-I{}` implicitly turns on `-n1` (one file at a time), so you lose the batching advantage — slower on large lists.

</details>

<details>
<summary>What does find's "paths must precede expression" error mean?</summary>

You put a path (or a glob the shell expanded into several paths) **after** the conditions. Usually it's a forgotten quote on `-name`: the shell expanded `*.log` into several names, the first was taken as a path, and `find` has nowhere to put the rest. Quoting it as `-name '*.log'` fixes it.

</details>

## Related Topics

- [Quoting and expansion](../reference/quoting-va-expansion.md) — why `'*.log'` needs quoting, and when the shell expands a glob
- [Text processing with pipelines](text-processing.md) — what you usually run on the files `find` produces
- [A filename with a space deletes a whole directory](../case-studies/bien-khong-nhay-word-splitting.md) — the same root disease as `find | xargs` without `-print0`
- [Bash command cheatsheet](../cheatsheets/commands.md) — quick lookup for `find`/`xargs` and their common flags

## References

- `man find` — the `EXPRESSIONS` section, and the comparison of `-exec ... ;` with `-exec ... +`
- `man xargs` — the `-0`, `-I`, `-n`, `-P` flags
- GNU Findutils manual: https://www.gnu.org/software/findutils/manual/html_mono/find.html
