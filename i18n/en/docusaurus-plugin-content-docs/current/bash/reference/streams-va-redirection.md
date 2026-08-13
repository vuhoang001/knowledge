---
title: Streams and redirection
sidebar_position: 2
description: "Every command has three data streams stdin/stdout/stderr — redirection is reconnecting them, and the wrong order loses your error log."
tags: [streams, redirection, pipe, stdout, stderr, bash]
domain: devops
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-05
---

# Streams and redirection

> **Takeaway:** Every command has three data streams — stdin (fd 0), stdout (fd 1), stderr (fd 2). Redirection is just reconnecting those streams to a file or a pipe. The deadly trap: `cmd >file 2>&1` merges errors into the file, but flipping it to `cmd 2>&1 >file` still sprays stderr onto the terminal — because redirections are read left→right and `2>&1` copies fd 1's **current** destination, not its future one.

## Goals

- Understand why stdout and stderr are two separate streams, and when to split or merge them.
- Use `>`, `>>`, `<`, `2>`, `2>&1`, `&>`, `/dev/null` correctly.
- Never lose an error log to a wrongly ordered redirection.
- Chain commands with the `|` pipe, and keep a copy with `tee`.
- Feed input inline with a here-doc `<<EOF` and a here-string `<<<`.

## Overview

Three streams are attached to every process by default. An `fd` is a *file descriptor* — an integer the operating system uses to refer to one data stream.

| Stream | fd | Goes where by default | Used for |
|---|---|---|---|
| stdin | 0 | the keyboard | data going **into** the command |
| stdout | 1 | the terminal | **normal** results |
| stderr | 2 | the terminal | **error messages**, progress logs |

Why separate stdout from stderr? So you can **pipe the results onward without dragging error junk along**, while still **seeing errors right there on the terminal**. If errors also went to stdout, then `cmd | grep foo` would swallow the error lines into the filter too — and you'd lose the warning. Two separate streams give you the choice: keep, discard, or merge — as you like.

## Examples

> Really run 2026-08-05 · bash 5.3.9(1) on Ubuntu. Coreutils on this machine is uutils 0.8.0, not GNU — output may differ slightly from GNU coreutils.
> In this box `ls` is an alias for `lsd`; the examples call `command ls` to get real `ls` behaviour.

One command produces **both** streams: `ls` prints the names of existing files to stdout, and reports the missing one to stderr.

```bash
touch existing.txt
command ls existing.txt missing.txt
```

```
ls: cannot access 'missing.txt': No such file or directory
existing.txt
```

The error line (stderr) and the result line (stdout) are mixed together on the terminal. Now let's separate them.

**Swallow stderr, keep only stdout** — `2>/dev/null` throws the error line in the bin:

```bash
command ls existing.txt missing.txt 2>/dev/null
```

```
existing.txt
```

**Swallow stdout, keep only stderr** — `1>/dev/null` (shortened to `>/dev/null`):

```bash
command ls existing.txt missing.txt 1>/dev/null
```

```
ls: cannot access 'missing.txt': No such file or directory
```

### The ordering trap: `2>&1` before or after `>file`?

This is the most commonly botched part. The notation `2>&1` means *"point fd 2 at fd 1's **current** destination"*. Bash reads redirections **left to right**, so position decides everything.

**RIGHT** — `>out 2>&1`: fd 1 moves to the file first, then fd 2 copies that destination → both end up in the file:

```bash
command ls existing.txt missing.txt >out-correct.txt 2>&1
cat out-correct.txt
```

```
ls: cannot access 'missing.txt': No such file or directory
existing.txt
```

The terminal stays silent — not one error line escapes.

**WRONG** — `2>&1 >out`: fd 2 copies fd 1's destination while it is **still the terminal**, and only then does fd 1 move to the file. The result: stdout goes to the file, while **stderr still sprays onto the terminal**:

```bash
command ls existing.txt missing.txt 2>&1 >out-wrong.txt
```

```
ls: cannot access 'missing.txt': No such file or directory
```

```bash
cat out-wrong.txt
```

```
existing.txt
```

See it: the error line prints on screen, and the file has **only stdout**. If you thought that command had "merged everything into the log", you just lost your entire error log without knowing. Think of `2>&1` as *"copy fd 1's destination at this instant"*, not *"tie fd 2 to fd 1 forever"*.

**Merging both, more compactly** — `&>` (bash) does the job of `>file 2>&1` in a single token, with no ordering to worry about:

```bash
command ls existing.txt missing.txt &>out-both.txt
cat out-both.txt
```

```
ls: cannot access 'missing.txt': No such file or directory
existing.txt
```

### Overwrite, append, read

`>` overwrites (truncates the file to empty, then writes); `>>` appends to the end; `<` feeds a file in as stdin:

```bash
echo "dong 1" > log.txt
echo "dong 2" >> log.txt
cat log.txt
```

```
dong 1
dong 2
```

```bash
printf 'ba\nhai\nmot\n' > nums.txt
sort < nums.txt
```

```
ba
hai
mot
```

### Pipes and tee

`|` connects the left command's **stdout** to the right command's **stdin**. `tee` sits in the middle of a pipe: it writes to a file **and** passes the data further down:

```bash
printf 'apple\nbanana\napple\ncherry\n' | sort | uniq -c | tee counts.txt
```

```
      2 apple
      1 banana
      1 cherry
```

The file `counts.txt` holds exactly the copy saved in parallel. Note that a pipe only carries **stdout**; to filter stderr through a pipe as well you need `2>&1 |` (or `|&` in bash).

### here-doc and here-string

A here-doc `<<EOF ... EOF` feeds several lines in as stdin. Unquoted → variables and `$(...)` are expanded:

```bash
cat <<EOF
Xin chao $USER
Hom nay la $(date +%Y-%m-%d)
EOF
```

```
Xin chao hoanggggf
Hom nay la 2026-08-05
```

Quoting the delimiter `<<'EOF'` → **disables** all expansion, content stays verbatim:

```bash
cat <<'EOF'
Khong expand: $USER va $(date)
EOF
```

```
Khong expand: $USER va $(date)
```

A here-string `<<<` feeds in **a single string** as stdin — tidier than `echo ... |`:

```bash
wc -w <<< "mot hai ba bon nam"
```

```
5
```

## Trade-offs

- **`&>` is compact but a bashism.** `&>file` and `|&` are bash/zsh extensions; a `#!/bin/sh` script (dash/POSIX) doesn't have them. If it has to run on every shell, write the long form `>file 2>&1`. You trade length for portability.
- **`>` overwriting is one keystroke away from data loss.** `> quan-trong.log` wipes the file clean before the command even runs. For safety use `>>`; to block overwriting turn on `set -o noclobber` (then `>|` to overwrite deliberately).
- **`tee` trades one read for two destinations.** Watching on screen while saving a log is very handy, but it adds a process and a disk write. On a hot pipe with large data, that's a real cost.
- **The here-string `<<<` adds a trailing newline.** Bash appends a `\n` to the end of a here-string; byte-sensitive commands (`wc -c`, hashing) will count one byte more than with `printf '%s'`.

## Common Mistakes

| Mistake | Consequence |
|---|---|
| `cmd 2>&1 >file` (order flipped) | stderr still goes to the terminal, the file holds only stdout — **the error log is lost** while you think it was saved |
| `cmd > file` and assuming errors are merged in | stderr was never redirected, it still goes to the terminal — the file is missing half the data |
| `cmd &>file` in a `#!/bin/sh` script | dash doesn't understand `&>`, giving strange behaviour or a syntax error |
| `> file.log` to "have a look" before running the command | the file is truncated immediately — the old contents are gone |
| `cmd 2>/dev/null` while debugging | it swallows the very error you need to read — a fake silence that looks like success |
| Piping through `grep` and losing the error lines | a pipe only carries stdout; stderr goes straight to the terminal, past the filter, and is easy to miss |
| `cmd | tee log` to "capture errors too" | `tee` only receives stdout; for errors too you need `cmd 2>&1 | tee log` |

## FAQ

<details>
<summary>Does `>/dev/null` also suppress a failing exit code?</summary>

No. Redirection only redirects **data**; it doesn't touch the exit code. From the real run above: `command ls ... &>/dev/null` swallows all output but `$?` is still `2`. To branch on success/failure, read the exit code — don't rely on whether anything was printed.

</details>

<details>
<summary>What's the difference between `>` and `1>`?</summary>

None. `>` is shorthand for `1>` — the default fd for output redirection is 1 (stdout). You write `1>` only for emphasis, to be clear when it sits next to a `2>`. Likewise `<` is `0<`.

</details>

<details>
<summary>Why does `cmd 2>&1 | grep x` catch errors when `cmd | grep x 2>&1` doesn't?</summary>

The pipe connects `cmd`'s stdout to `grep`. The `2>&1` has to go **before** the `|`, on `cmd`'s side, so that stderr is merged into stdout **before** that stream flows into the pipe. Putting `2>&1` after `grep` merges **grep's** stderr, not `cmd`'s — wrong address. Bash has the compact form `cmd |& grep x` which does this merge-then-pipe correctly.

</details>

<details>
<summary>here-doc or here-string — which one?</summary>

A here-doc `<<EOF` is for a **multi-line** block (config, a chunk of SQL, a letter). A here-string `<<<` is for **one short single-line string** — instead of `echo "..." |`, saving an `echo` process. Remember `<<<` adds a trailing newline; if the byte count has to be exact, use `printf '%s' ... |`.

</details>

## Related Topics

- [What a shell is](shell-la-gi.md)
- [Quoting and expansion](quoting-va-expansion.md)
- [Text processing](../skills/text-processing.md)
- [Exit codes and control flow](exit-code-va-control-flow.md)
- [The pipe swallows the exit code](../case-studies/pipe-nuot-exit-code.md)

## References

- Bash Reference Manual — [Redirections](https://www.gnu.org/software/bash/manual/html_node/Redirections.html)
- POSIX Shell Command Language — [Redirection](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html#tag_18_07)
