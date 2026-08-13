---
title: Writing safe scripts
sidebar_position: 6
description: "The first four lines of every script — shebang, set -euo pipefail, double-quoting every variable, and a cleanup trap — block most of the classic script failures."
tags: [scripting, set-e, pipefail, trap, shellcheck, bash]
domain: devops
category: tool
doc_type: skill
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-05
---

# Writing safe scripts

> **Takeaway:** The first four lines — `#!/usr/bin/env bash`, `set -euo pipefail`, `"$var"` everywhere, `trap 'cleanup' EXIT` — block most of the classic script failures. But `set -e` has many holes (inside `if`, after `||`, mid-pipe), so don't trust it absolutely: careful writing is still required, and run `shellcheck` to catch the rest.

## Goals

- Know the safety skeleton that goes at the top of every script and what **each flag** does.
- Understand why `set -e` isn't a silver bullet — it goes quiet in exactly the places you tend to get wrong.
- Use `trap` + `mktemp` for cleanup you can rely on, however the script exits.
- Validate input arguments so the script dies early with a clear message instead of running half-way.
- Use `shellcheck`, `bash -n`, `bash -x` to catch mistakes before they bite.

## Overview

A bash script by default runs on the philosophy "carry on no matter what happens". A command fails
half-way? It shrugs and runs the next one — with wrong data. A variable name typo? It expands to an
empty string, and `rm -rf "$dir/"` becomes `rm -rf /`. A pipeline fails in the middle? The exit code is
still 0, because bash only takes the code of the **last** command in the pipe.

The first four lines invert those defaults:

```bash
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'          # optional — see Trade-offs
```

- **`#!/usr/bin/env bash`** — the shebang. It finds `bash` on `PATH` instead of hardcoding
  `/bin/bash`. This matters on macOS (where `/bin/bash` is the ancient 3.2; the current one lives
  elsewhere) and on NixOS. With no shebang, the script runs under the system `sh` — which may be
  `dash`, with no arrays and no `[[ ]]`.
- **`set -e`** (errexit) — exit as soon as a command returns a non-zero exit code. This is the
  most valuable one and also **the leakiest** — see the traps below.
- **`set -u`** (nounset) — using an undeclared variable is an error. This catches variable-name
  typos, the quietest and most dangerous thing in bash.
- **`set -o pipefail`** — a pipeline takes the exit code of the **first failing** command rather
  than the last one. Without it, `curl ... | grep ...` reports success even though `curl` died.

Those three flags combine into `set -euo pipefail`. Add double quotes around every variable and a
cleanup `trap`, and that's the whole skeleton.

## Examples

> Really run 2026-08-05 · Ubuntu, bash 5.3.9(1). Scratch space in `/tmp/bashlab-safe`.

### `set -u` catches a mistyped variable

This is the biggest reason to turn `set -u` on. Without it, `$naem` expands to empty and the script
carries on with wrong data.

```bash
set -euo pipefail
name="Alice"
echo "Xin chao $naem"    # typo: naem instead of name
echo "khong bao gio toi day"
```

```text
bash: line 4: naem: unbound variable
exit code: 1
```

The script dies right at the typo and doesn't print the following line. Without `set -u` it would
print `Xin chao ` and carry on — silently.

### `pipefail` gives back the exit code the pipe swallowed

```bash
# WITHOUT pipefail
set -e; false | echo "ok"; echo "exit=$?"
```

```text
ok
exit=0
```

```bash
# WITH pipefail
set -eo pipefail; false | echo "ok"; echo "exit=$?"
```

```text
ok
script exit: 1
```

Without `pipefail`, `false` (the failure) is hidden by `echo` (a success) at the end of the pipe —
exit=0, and `set -e` never fires. With `pipefail` the failing exit code surfaces and the script dies.
The details are in the case study [The pipe swallows the exit code](../case-studies/pipe-nuot-exit-code.md).

### Where `set -e` does NOT catch — the core trap

This is the most important part of the whole page. `set -e` goes quiet in exactly the places we tend
to put commands that might fail:

```bash
set -e
if false; then :; fi              # false inside an if doesn't cause an exit
echo "A: qua duoc if false"
false || echo "B: qua duoc ||"
out=$(false; echo "sau false")    # command subst: a non-final command isn't caught
echo "C: out=[$out]"
false                             # this is the one that exits
echo "D: KHONG in"
```

```text
A: qua duoc if false
B: qua duoc || 
C: out=[sau false]
exit cuoi: 1
```

The first three `false`s do **not** cause an exit; only the last one (standing alone) does. `set -e`
is disabled inside: the condition of `if`/`while`/`until`, any command on the left of `&&`/`||`, any
command that isn't the last in a chain or pipe, and (classically) inside command substitution.
This is why you shouldn't treat `set -e` as an absolute shield. See the case study
[set -e doesn't catch it](../case-studies/set-e-khong-bat.md).

### `trap cleanup EXIT` — cleanup however you exit

A script creates a temp file then fails half-way. Without a `trap`, the temp file is left as litter.
With a `trap`, it disappears even when `set -e` kicks the script out mid-way:

```bash
#!/usr/bin/env bash
set -euo pipefail

tmp=$(mktemp)
trap 'echo "  [cleanup] xoa $tmp"; rm -f "$tmp"' EXIT

echo "  tao temp: $tmp"
echo "du lieu" > "$tmp"
ls -l "$tmp" | awk '{print "  ton tai:", $NF}'

false          # failure half-way -> set -e exits
echo "  KHONG bao gio in dong nay"
```

```text
  tao temp: /tmp/tmp.0F7X3trkDq
  ton tai: /tmp/tmp.0F7X3trkDq
  [cleanup] xoa /tmp/tmp.0F7X3trkDq
script exit: 1
so file tmp.* con lai: 0
```

`trap ... EXIT` runs when the shell exits for **any** reason — success, `set -e`,
`exit`, or Ctrl-C. It's the only reliable way to delete temp files / kill background jobs / release locks.
Don't put the `rm` at the end of the script: if the script dies before that, the `rm` line never runs.

`mktemp` (and `mktemp -d` for a directory) generates a unique kernel-assigned name — avoiding the name
collisions, race conditions and symlink attacks that a fixed name like `/tmp/mytemp` invites.

### A complete script: the safety skeleton + trap + argument checking

Putting it all together. This script validates its arguments, creates a scratch area, and cleans up via `trap`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# check the arguments
[[ $# -lt 1 ]] && { echo "usage: $0 <ten-file>" >&2; exit 2; }
src=${1:?can duong dan file nguon}

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

cp "$src" "$work/"
count=$(ls -1 "$work" | wc -l)
echo "da sao chep $count file vao vung tam"
echo "OK: backup xong cho $src"
```

The success case:

```text
=== CASE 1: thanh cong ===
da sao chep 1 file vao vung tam
OK: backup xong cho input.txt
exit: 0
```

The missing-argument case — dies early, clear message, exit code 2:

```text
=== CASE 2: thieu tham so ===
usage: ./backup.sh <ten-file>
exit: 2
```

The two layers of checking complement each other: `[[ $# -lt 1 ]]` gives a friendly `usage` message; and
`${1:?can duong dan file nguon}` is the final backstop — if something slips through anyway, bash itself
prints `bash: 1: can duong dan file nguon` and exits. Choose an exit code that is neither 0 nor 1 (here
`2`) so "misuse" is distinguishable from "runtime failure".

### `bash -n` (syntax check) and `bash -x` (trace)

`bash -n` parses without **running** — catching a missing `fi`, `done` or unbalanced bracket before the
script does anything dangerous:

```text
syntax-err.sh: line 5: syntax error: unexpected end of file from `if' command on line 2
exit: 2
```

`bash -x` prints each command (after expansion) before running it — the number one debugging weapon when
you can't work out why a variable holds a strange value:

```text
+ x=2
+ y=3
+ echo 5
5
```

### ShellCheck

`shellcheck` is a linter that automatically catches most of the mistakes above: unquoted variables, `$(ls)`
in a `for`, using an unassigned variable. **`shellcheck` isn't installed on the machine this page was run
on** (`command -v shellcheck` returns nothing), so the section below is **illustrative, not run** — the real
output depends on the version. Install it with `sudo apt install shellcheck`.

For a deliberately wrong script:

```bash
#!/usr/bin/env bash
rm -rf $dir/temp          # $dir unquoted and unset
for f in $(ls *.txt); do  # parsing ls -> endlessly many bugs
  echo $f
done
```

ShellCheck would report roughly this (illustrative, not run):

```text
In bad.sh line 2:
rm -rf $dir/temp
       ^--^ SC2154: dir is referenced but not assigned.
       ^--^ SC2086: Double quote to prevent globbing and word splitting.

In bad.sh line 3:
for f in $(ls *.txt); do
         ^--------^ SC2045: Iterating over ls output is fragile. Use globs.
```

Running `shellcheck script.sh` as a step in your workflow (or in CI) catches what the eye misses — it
knows about `set -e`'s holes too.

## Trade-offs

| Choice | You get | You lose / the trap |
|---|---|---|
| `set -e` | Early exit on failure, no carrying on with wrong data | Silent inside `if`/`while`/`\|\|`/mid-pipe/command subst. It doesn't replace explicit error checking for code that matters |
| `set -u` | Catches variable-name typos immediately | Optional variables must be written `${VAR:-default}` or it dies. `"$@"` with 0 arguments is still safe, but `$1` isn't |
| `set -o pipefail` | No swallowed exit codes in a pipe | `cmd \| head` now reports error 141 (SIGPIPE) because `head` closes the pipe early — sometimes needing special handling |
| `IFS=$'\n\t'` | Removes space from word splitting, safer with filenames containing spaces | Changes a baseline behaviour, easy to surprise you where splitting on space **was** intended. Optional, not mandatory |
| `trap ... EXIT` | Reliable cleanup however you exit | Have only one EXIT handler; a later `trap` overwrites an earlier one. The handler runs in a failure context, so keep it simple |
| ShellCheck in CI | Automatic bug catching, including holes `set -e` can't see | One more step; occasionally a warning needs `# shellcheck disable=` when you meant it |

Rule of thumb: `set -euo pipefail` is the right default for a new script. `IFS` is a judgment call. And
don't let `set -e` lull you to sleep — for dangerous operations (deleting, overwriting, deploying), still
check the exit code explicitly with `if ! cmd; then ...`.

## Common Mistakes

- **Trusting `set -e` to catch every failure.** It doesn't catch inside `if`, after `||`/`&&`, in a
  non-final command in a pipe (unless `pipefail` is on), or inside command substitution. Code that
  matters still needs explicit checks.
- **Not quoting variables.** `rm -rf $dir/` with `$dir` empty (because `set -u` isn't on) or containing
  a space is a disaster. Always `"$var"`, `"$@"` (not `$*`). See
  [Quoting and expansion](../reference/quoting-va-expansion.md).
- **Using a fixed temp name** like `/tmp/myapp.tmp`. It collides when run in parallel, and opens the door
  to a symlink attack. Always `mktemp` / `mktemp -d`.
- **Putting the cleanup `rm` at the end of the script** instead of in a `trap`. If the script dies
  half-way (very likely with `set -e`), the cleanup line never runs → temp litter.
- **Not checking `${1}`.** With `set -u`, a missing `$1` is an error but the message is cryptic.
  Add `${1:?...}` or check `$#` to get a clear `usage` message.
- **Omitting the shebang, or using `#!/bin/sh`** and then using bash features (`[[ ]]`, arrays).
  `sh` may be `dash` — the script dies with a baffling syntax error.
- **Exit code 1 for everything.** Use different codes (2 for argument errors, …) so the caller can tell
  them apart. See [Exit codes and control flow](../reference/exit-code-va-control-flow.md).

## FAQ

<details>
<summary>Should I always turn <code>set -euo pipefail</code> on?</summary>

For scripts you write and control: yes, it's a good default. For a script that gets sourced into someone
else's interactive shell, or a long stable script where `set -e` causes surprise exits at places you
deliberately let a command fail: it's a judgment call. `set -e` has a reputation for "saving your life and
surprising you" in equal measure. Many old hands turn on `set -uo pipefail` but replace `set -e` with
explicit error checks where it matters. There's no absolutely right answer — what matters is knowing where
it goes quiet.

</details>

<details>
<summary>Why is <code>IFS=$'\n\t'</code> optional when the other three flags are recommended?</summary>

Changing `IFS` removes the space from word splitting, which is safer when looping over filenames containing
spaces. But it changes a baseline behaviour that a lot of code (including libraries you source) implicitly
relies on. The three `set` flags only make bash **stricter** — they rarely break correct code. `IFS`
changes the semantics of string splitting, which is more likely to surprise you. If you use it, set it early
and know exactly what you're doing.

</details>

<details>
<summary>What about <code>trap</code>ping several signals at once?</summary>

`trap 'cleanup' EXIT` is enough for most cases, because EXIT runs whatever the reason for exiting,
including after receiving SIGINT/SIGTERM (bash runs EXIT after the signal handler). If you need a specific
reaction to Ctrl-C (say, printing "cancelling…"), add `trap 'echo huy; exit 130' INT`.
But remember: each `trap` for a signal **overwrites** that signal's previous handler, so gather the cleanup
logic into a single `cleanup()` function and point every trap at it.

</details>

<details>
<summary>What if ShellCheck flags a line I wrote deliberately?</summary>

Add a `# shellcheck disable=SCxxxx` comment right above that line, with the specific code. Don't
disable it for the whole file. For example when you **really** want word splitting: `# shellcheck disable=SC2086`.
Having to write the code out forces you to confirm that you understand the warning and are ignoring it
deliberately — different from disabling it blindly.

</details>

## Related Topics

- [Exit codes and control flow](../reference/exit-code-va-control-flow.md)
- [Quoting and expansion](../reference/quoting-va-expansion.md)
- [Functions in bash](functions.md)
- [set -e doesn't catch it](../case-studies/set-e-khong-bat.md)
- [The pipe swallows the exit code](../case-studies/pipe-nuot-exit-code.md)
- [Lab: your first script](../tutorials/bash-lab-first-script.md)

## References

- [Bash Reference Manual — The Set Builtin](https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html)
- [Bash Reference Manual — Bourne Shell Builtins (trap)](https://www.gnu.org/software/bash/manual/html_node/Bourne-Shell-Builtins.html)
- [ShellCheck](https://www.shellcheck.net/)
- [BashFAQ/105 — Why doesn't set -e do what I expected?](https://mywiki.wooledge.org/BashFAQ/105)
- [mktemp(1) man page](https://man7.org/linux/man-pages/man1/mktemp.1.html)
