---
title: Exit codes and control flow
sidebar_position: 4
description: "Bash drives control flow with exit codes, not true/false — if cmd means did cmd succeed, and only 0 is true."
tags: [exit-code, control-flow, test, pipefail, bash]
domain: devops
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-05
---

# Exit codes and control flow

> **Takeaway:** Bash has no boolean for control flow — it only reads **exit codes**. `if cmd`
> doesn't ask "did cmd return `true`" but "did cmd **succeed**", and success means exit code
> `0`. This is the most upside-down part for anyone coming from another language:
> **`0` is true**, and every number other than `0` is false.

## Goals

- Understand what an exit code is, read it with `$?`, and why `0` = success.
- Read `if cmd; then`, `&&`, `||` with exit-code semantics rather than boolean ones.
- Know that `test` / `[ ]` / `[[ ]]` are all just commands that **return an exit code**.
- Grasp the `pipefail` trap: a pipeline's exit code is, by default, only the **last** command's.
- Know the common code conventions (1, 2, 126, 127, 130) so you can read errors quickly.

## Overview

Every command leaves behind an integer `0..255` when it finishes, called the **exit code** (or exit status).
The POSIX convention:

- `0` = **success**.
- non-`0` (1–255) = **failure**, and the number says what kind.

The special variable `$?` holds the exit code of the command that **just finished**. It changes after *every*
command, so if you want to reuse it, capture it immediately:

```bash
some_command
code=$?          # capture it right away, don't let another command overwrite it
```

All of bash's control flow is built on this number. `if`, `while`, `&&`, `||` all look only at a command's
exit code; there is no notion of a "boolean value" anywhere. That's why `if grep ...` is the standard
idiom — you're not comparing output, you're asking "did grep find anything" (found → `0` → the `then`
branch).

## Examples

> Really run 2026-08-05 · bash 5.3.9(1) on Ubuntu. Coreutils on this machine is uutils 0.8.0, not GNU — output may differ slightly from GNU coreutils.

**1. Exit codes and `$?` basics.** `true`/`false` are two commands that exist purely to return a code:

```bash
true;  echo "true -> $?"
false; echo "false -> $?"
ls /khong-ton-tai 2>/dev/null; echo "ls fail -> $?"
```

```
true -> $?=0
false -> $?=1
ls fail -> $?=2
```

`false` returns `1` (a generic error), while `ls` returns `2` — each command defines its own code table.

**2. `if` runs on exit codes, not booleans.** Using `grep -q` (silent, only sets the code):

```bash
printf 'apple\nbanana\ncherry\n' > fruit.txt
if grep -q banana fruit.txt; then echo "tim thay banana"; else echo "khong thay"; fi
if grep -q durian fruit.txt; then echo "tim thay durian"; else echo "khong thay durian"; fi
grep -q durian fruit.txt; echo "grep durian -> $?"
```

```
tim thay banana
khong thay durian
grep durian -> $?=1
```

`grep` returns `0` on a match and `1` when there's none — `if` turns that very number into a branch.

**3. `&&` and `||`, and the three-command chaining trap.**

```bash
true  && echo "chay vi true thanh cong"
false || echo "chay vi false that bai"
true && false || echo "cmd3 chay du cmd1 (true) da thanh cong"
```

```
chay vi true thanh cong
chay vi false that bai
cmd3 chay du cmd1 (true) da thanh cong
```

The third line is the classic trap: people read `cmd1 && cmd2 || cmd3` as "if cmd1 then cmd2
else cmd3", which is **wrong**. In reality `||` runs `cmd3` whenever the **left-hand side**
(`cmd1 && cmd2`) fails — including when `cmd1` succeeded but `cmd2` failed. Above, `true`
succeeds and `false` fails, so `cmd3` runs anyway.

**4. `test` / `[ ]` / `[[ ]]` are just commands returning an exit code.**

```bash
[[ 5 -gt 3 ]]; echo "[[ 5 -gt 3 ]] -> $?"
[[ 5 -gt 9 ]]; echo "[[ 5 -gt 9 ]] -> $?"
[ -f fruit.txt ]; echo "[ -f fruit.txt ] -> $?"
```

```
[[ 5 -gt 3 ]] -> $?=0
[[ 5 -gt 9 ]] -> $?=1
[ -f fruit.txt ] -> $?=0
```

A true condition → `0`, a false one → `1`. `[[ ]]` is a bash **builtin** (safer with empty variables
and whitespace), while `[ ]` is the classic `test`. For the detailed differences, see the test-operator cheatsheet.

**5. `pipefail` — a pipeline's exit code is, by default, only the last command's.**

```bash
false | true; echo "false | true -> $?"
true | false; echo "true | false -> $?"
set -o pipefail
false | true; echo "false | true (pipefail) -> $?"
set +o pipefail
```

```
false | true -> $?=0
true | false -> $?=1
false | true (pipefail) -> $?=1
```

By default `false | true` returns `0` — `false`'s failure is **swallowed** because bash only takes the
last command's code (`true`). Turn on `set -o pipefail` and the same pipeline returns `1`: the pipeline
fails if **any** command in it fails. This is why production scripts nearly always enable it.

**6. `126` versus `127` — can't execute versus not found.**

```bash
lenh-khong-ton-tai 2>/dev/null; echo "lenh khong tim thay -> $?"
echo -e '#!/bin/bash\necho hi' > noexec.sh; chmod -x noexec.sh
./noexec.sh 2>/dev/null; echo "khong co quyen exec -> $?"
```

```
lenh khong tim thay -> $?=127
khong co quyen exec -> $?=126
```

**`exit n`** inside a script ends the script with code `n`. Common conventions:

| Code | Meaning |
|---|---|
| `0` | success |
| `1` | generic, unclassified error |
| `2` | misuse (bad syntax, missing argument) |
| `126` | the command was found but **couldn't be executed** (no exec permission) |
| `127` | the command was **not found** (wrong name, not on `PATH`) |
| `130` | killed by **Ctrl-C** (`128 + SIGINT(2)`) |

Seeing `128 + n` tells you signal `n` killed it — `137` = `128 + 9` (SIGKILL, usually the OOM killer).

## Trade-offs

- **`0` = true is deeply counter-intuitive** but consistent with "one kind of success, many kinds of
  failure" — only one code says "fine", leaving `1..255` to distinguish each kind of breakage. In
  exchange, beginners tend to write a redundant `if [ $? == 0 ]` instead of `if cmd`.
- **`pipefail` is stricter but can produce "fake failures".** For instance `cmd | head` can make `cmd`
  receive SIGPIPE and return a non-`0` code when `head` closes early — with `pipefail` the pipeline
  becomes a "failure" even though you deliberately only wanted the first few lines. Weigh it per pipeline.
- **`[[ ]]` is safer than `[ ]`** (no need to quote variables, has `=~`, `&&`) but it's a bashism —
  it won't run on pure POSIX `sh`/dash. A script that needs portability has to go back to `[ ]`.

## Common Mistakes

- **Reading `cmd1 && cmd2 || cmd3` as if/else.** If `cmd2` fails, `cmd3` runs anyway even though `cmd1`
  succeeded — see example 3. For a real if/else, use `if ... then ... else ... fi`.
- **Capturing `$?` too late.** `$?` changes after every command, `echo` included. `cmd; echo "..."; if [ $? ...]`
  is checking `echo`'s code, not `cmd`'s. Assign `code=$?` on the line right after `cmd`.
- **Assuming a pipeline reports failure when a middle command breaks.** It doesn't; by default only the
  last command counts — `curl ... | jq ...` can still return `0` when `curl` died. Turn on `set -o pipefail`.
- **Forgetting that non-zero means "failure" while many commands use non-zero as a normal signal.** `grep`
  returns `1` for "not found" — completely legitimate. With `set -e` on, a harmless non-matching `grep`
  can kill the whole script (see the set -e case study).
- **Comparing numbers with `==` inside `[ ]`.** `[ 5 -gt 3 ]` is the right form for numbers; `==`/`<` inside
  `[ ]` compare strings. `[[ ]]` is more forgiving but you should still use `-gt`, `-eq` for numbers.

## FAQ

<details>
<summary>Why is `0` "true" in bash and `1` "false", the opposite of every other language?</summary>

Because bash doesn't evaluate a **boolean value**, it evaluates **whether a process succeeded**.
A program has only one way to "finish fine" (`exit 0`) but countless ways to break (file
not found, bad argument, out of memory…), so non-zero is reserved for encoding the *kind* of failure.
`if`/`&&`/`||` are built on "success" semantics, so `0` naturally becomes the "true" branch.

</details>

<details>
<summary>How do `test`, `[ ]` and `[[ ]]` differ, and when do I use which?</summary>

`test EXPR` and `[ EXPR ]` are **the same command** (POSIX `test`; `[` is just another name for it that
requires a closing `]`). `[[ EXPR ]]` is a **bash builtin**: it doesn't word-split or glob variables, so it's
safer with whitespace and empty variables, and it supports `&&`, `||`, `=~` (regex). Use `[[ ]]` for bash
scripts; only fall back to `[ ]` when you need to run on pure POSIX `sh`/dash. The full operator table is in
the test-operators cheatsheet.

</details>

<details>
<summary>I turned on `set -o pipefail` and now the pipeline `cmd | head` reports an error — why?</summary>

When `head` has taken enough lines and closes the read end, `cmd` writing to the closed pipe receives `SIGPIPE`
and finishes with code `141` (`128 + 13`). By default that code is hidden by the last command (`head`, `0`);
with `pipefail` it surfaces and the pipeline becomes a "failure". This is correct behaviour but annoying — for
pipelines that deliberately cut off early, you can split `head` out, or accept it and check
`PIPESTATUS` to tell a real error apart.

</details>

<details>
<summary>How do I tell whether a script was Ctrl-C'd by the user or killed by the system?</summary>

The convention for a signal-terminated exit code is `128 + signal_number`. `130` = `128 + 2` (SIGINT, Ctrl-C);
`137` = `128 + 9` (SIGKILL, usually the OOM killer); `143` = `128 + 15` (SIGTERM, a normal
`kill`). A code `> 128` almost certainly means the process was signalled rather than
exiting on its own.

</details>

## Related Topics

- [Conditionals and loops](../skills/conditionals-va-loops.md)
- [Writing safe scripts](../skills/viet-script-an-toan.md)
- [Test operator cheatsheet](../cheatsheets/test-operators-va-expansion.md)
- [The pipe swallows the exit code](../case-studies/pipe-nuot-exit-code.md)
- [set -e doesn't catch it](../case-studies/set-e-khong-bat.md)

## References

- `man bash` — the *EXIT STATUS*, *Pipelines*, *Compound Commands* (`[[ ]]`) and `set` (`pipefail`) sections.
- `help test`, `help [[`, `help set` — builtin help inside bash.
- Advanced Bash-Scripting Guide — *Exit Codes With Special Meanings* (the 1/2/126/127/130 table).
