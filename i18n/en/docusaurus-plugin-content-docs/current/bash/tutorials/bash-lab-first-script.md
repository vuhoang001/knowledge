---
title: 'Lab: writing your first bash script'
sidebar_position: 2
description: "From a minimal hello script to one with parameters, the set -euo pipefail skeleton, functions and debugging with bash -x — every step really run, with the output pasted."
tags: [tutorial, scripting, set-e, debugging, bash]
domain: devops
category: tool
doc_type: tutorial
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-05
---

# Lab: writing your first bash script

> **Takeaway:** A working bash script needs three things everybody forgets: the execute bit
> (`chmod +x`), validation of the input arguments, and the `set -euo pipefail` skeleton so that
> errors shout instead of drifting past silently. This lab builds each of those by hand, really
> runs them, and shows both the broken and the working state.

## Goal

Go from a one-line `echo` to a small but solid script you'd reuse: with a shebang,
an execute bit, taking an argument and refusing empty input, the safety skeleton on to catch
a mistyped variable, a function + loop doing something real, and the ability to debug it when it breaks.

Every step below has a **Really run** block — that's the output exactly as the terminal
printed it on the lab machine, not an illustration.

Scratch space for the whole page:

```bash
mkdir -p /tmp/bashlab-tut-script && cd /tmp/bashlab-tut-script
```

## Step 1 — the minimal script

A `.sh` file needs only two lines: a **shebang** telling the kernel which interpreter to
use, and the body.

```bash
cat > hello.sh <<'EOF'
#!/usr/bin/env bash
echo "Xin chào từ script bash!"
EOF
```

`#!/usr/bin/env bash` finds `bash` on `PATH` instead of hardcoding `/bin/bash` —
suiting machines that keep bash elsewhere (macOS, Nix). The first trap: a newly created file
has **no** execute bit, so calling `./hello.sh` is refused.

**Really run** — 2026-08-05 · bash 5.3.9(1), uutils coreutils 0.8.0.

```console
$ command ls -l hello.sh
-rw-rw-r-- 1 hoanggggf hoanggggf 55 Aug  5 21:02 hello.sh

$ ./hello.sh
bash: line 2: ./hello.sh: Permission denied
$ echo $?
126
```

Exit code **126** means "the command was found but couldn't be executed" — here, a missing
execute permission. Add that bit and run again:

```console
$ chmod +x hello.sh
$ command ls -l hello.sh
-rwxrwxr-x 1 hoanggggf hoanggggf 55 Aug  5 21:02 hello.sh

$ ./hello.sh
Xin chào từ script bash!
$ echo $?
0
```

Note the three new `x` characters in `-rwxrwxr-x`. That's the entire difference between
"permission denied" and a working script.

> The `ls` alias on this machine points at `lsd`, so the page uses `command ls` to get
> the standard `ls` — that's how the permission column comes out readable as above.

## Step 2 — adding an argument and validating input

A useful script takes input. The positional parameters are `$1`, `$2`, … But the caller
*will* forget to pass one, so you have to check for emptiness before using it — otherwise the
script carries on with an empty string and produces nonsense.

The explicit way: check whether `${1:-}` is empty, print usage to **stderr**, and exit non-zero.

```bash
cat > greet.sh <<'EOF'
#!/usr/bin/env bash
if [[ -z "${1:-}" ]]; then
  echo "Cách dùng: $0 <tên>" >&2
  exit 2
fi
echo "Chào $1!"
EOF
chmod +x greet.sh
```

`${1:-}` means "the value of `$1`, or empty if unset" — written that way so this line
won't blow up even once `set -u` is on (Step 3). `>&2` pushes the error message to
stderr, separating it from the real output on stdout. `exit 2` tells the caller this was a
misuse error (the familiar convention: 2 = bad command-line syntax).

**Really run** — 2026-08-05 · bash 5.3.9(1), uutils coreutils 0.8.0.

```console
$ ./greet.sh Thắng
Chào Thắng!
$ echo $?
0

$ ./greet.sh
Cách dùng: ./greet.sh <tên>
$ echo $?
2
```

The missing-argument case exits **2** and doesn't print "Chào" — exactly as intended.

There's a shorter form for "this is mandatory, otherwise die": the expansion
`${1:?message}`. If `$1` is empty or unset, bash prints the message to
stderr itself and exits immediately.

```bash
cat > greet2.sh <<'EOF'
#!/usr/bin/env bash
name="${1:?cần một tên làm tham số}"
echo "Chào $name!"
EOF
chmod +x greet2.sh
```

```console
$ ./greet2.sh
./greet2.sh: line 2: 1: cần một tên làm tham số
$ echo $?
1
```

Shorter, but the exit code is **1** (bash's own choice) and the message is less friendly
than usage text you write yourself. Use `${1:?}` for quick internal scripts; write the `if` +
usage block when other people will run it.

## Step 3 — the safety skeleton

Bash is very forgiving by default: an unset variable becomes an empty string, and a command
failing half-way doesn't stop the rest. That turns a typo into a silent bug. The standard line
to open every script with:

```bash
set -euo pipefail
```

- `set -e` — exit as soon as a command returns a non-zero code.
- `set -u` — treat using an unset variable as an error (instead of silently becoming empty).
- `set -o pipefail` — the pipe fails if **any** stage fails, not just the last one.

Watch `set -u` catch a mistyped variable. This script means to print `$greeting` but the
typo drops the `i`, making it `$greetng`:

```bash
cat > safe.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

greeting="Xin chào"
echo "$greetng thế giới"
EOF
chmod +x safe.sh
```

**Really run** — 2026-08-05 · bash 5.3.9(1), uutils coreutils 0.8.0.

```console
$ ./safe.sh
./safe.sh: line 5: greetng: unbound variable
$ echo $?
1
```

Bash points at the exact line and the exact wrong variable name. Now take `set -u` out and repeat
the same typo:

```bash
cat > unsafe.sh <<'EOF'
#!/usr/bin/env bash
greeting="Xin chào"
echo "$greetng thế giới"
EOF
chmod +x unsafe.sh
```

```console
$ ./unsafe.sh
 thế giới
$ echo $?
0
```

No error, exit **0**, a "success" — but "Xin chào" has vanished and nobody
says a word. This is exactly the kind of bug that eats an afternoon. `set -u` turns it into an
error you see immediately.

<details>
<summary>Why you don't always turn all three on</summary>

`set -e` has some irritating exceptions: it does **not** fire for a command in
an `if` condition, in an `&&`/`||`, or with a `!` in front. For a script
with complex branching logic, many people replace `set -e` with explicit exit-code
checks (`if ! cmd; then ...`). But for small scripts, `set -euo
pipefail` is the right default — turn it on first and refine only when it genuinely gets in the way.

</details>

## Step 4 — a function + loop doing something real

Put it together into something useful: count the lines of every `*.txt` file in a
directory and total them up. Use a **function** for the counting and a **`for` loop** to
walk them.

Build a few sample files — note that `c.txt` deliberately has **no** trailing newline:

```bash
printf 'một\nhai\nba\n' > a.txt
printf 'x\ny\n' > b.txt
printf 'chỉ một dòng không newline cuối' > c.txt
```

```bash
cat > count-lines.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

dir="${1:?cần thư mục làm tham số}"

dem_dong() {
  local file="$1"
  # grep -c '' counts the last line even without a newline; wc -l doesn't
  grep -c '' "$file"
}

shopt -s nullglob
tong=0
for f in "$dir"/*.txt; do
  n=$(dem_dong "$f")
  printf '%-8s %3d dòng\n' "$(basename "$f")" "$n"
  tong=$(( tong + n ))
done
printf '%-8s %3d dòng\n' "TỔNG" "$tong"
EOF
chmod +x count-lines.sh
```

Three details worth remembering:

- `local file="$1"` — a variable inside a function must be declared `local`, otherwise it
  leaks into the global scope and overwrites a same-named variable outside.
- `shopt -s nullglob` — if the directory has **no** `.txt` at all, bash by default leaves
  the string `*.txt` in place and the loop runs once with a phantom filename. `nullglob`
  makes an empty glob expand to **no** elements at all, and the loop is skipped entirely.
- `grep -c ''` instead of `wc -l`: `wc -l` counts newline characters, so a last line missing
  its newline (`c.txt`) is undercounted. `grep -c ''` matches every line, including a truncated last one.

**Really run** — 2026-08-05 · bash 5.3.9(1), uutils coreutils 0.8.0.

```console
$ ./count-lines.sh .
a.txt      3 dòng
b.txt      2 dòng
c.txt      1 dòng
TỔNG     6 dòng
$ echo $?
0
```

`c.txt` counts as **1 line** despite the missing trailing newline — exactly why `grep -c ''` was chosen.
With `wc -l` it would come out 0 and the total would be wrong. This trap comes back to bite you every time you handle
a file produced by another program.

## Step 5 — debugging

Two switches that go with every bash debugging session: `bash -n` checks the syntax
**without running**, and `bash -x` prints each command before executing it.

Build a broken script — missing the `fi` that closes the `if` block:

```bash
cat > broken.sh <<'EOF'
#!/usr/bin/env bash
x=5
if [[ "$x" -gt 3 ]]; then
  echo "lớn hơn 3"
EOF
```

`bash -n` (no-exec) finds the syntax error without running a single line — safe to
run on a script that's still half-finished:

**Really run** — 2026-08-05 · bash 5.3.9(1), uutils coreutils 0.8.0.

```console
$ bash -n broken.sh
broken.sh: line 5: syntax error: unexpected end of file from `if' command on line 3
$ echo $?
2

$ bash -n count-lines.sh
$ echo $?
0
```

The broken script: it points at the exact line and says the `if` on line 3 was never closed. The good script: silent,
exit 0. Running `bash -n` before committing a script is a cheap habit that blocks a whole class of silly mistakes.

And when a script *runs* but produces the wrong result, `bash -x` (xtrace) prints each command
with its variables already expanded, prefixed with `+`:

```console
$ bash -x greet.sh Thắng
+ [[ -z Thắng ]]
+ echo 'Chào Thắng!'
Chào Thắng!
$ echo $?
0
```

You can see clearly that the condition `[[ -z Thắng ]]` was evaluated (with `$1`'s value already
substituted in) and then the `echo`. On a long script, `bash -x` tells you exactly what value each variable held
at each step — something static reading can't guess. Turn it on mid-script with
`set -x` and off with `set +x` if you only want to trace one section.

## Related Topics

- [Writing safe scripts](../skills/viet-script-an-toan.md)
- [Functions in bash](../skills/functions.md)
- [Exit codes and control flow](../reference/exit-code-va-control-flow.md)
- [Lab: text processing](bash-lab-text-processing.md)
