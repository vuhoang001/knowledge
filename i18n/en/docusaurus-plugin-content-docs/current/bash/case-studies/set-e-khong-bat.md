---
title: 'set -e is on but the script keeps going after an error'
sidebar_position: 4
description: "set -e doesn't fire inside if, while, after and-and or or-or, in a function called in a condition, or for a non-final command in a pipe — so a script you thought was safe never stops."
tags: [case-study, set-e, exit-code, scripting, bash]
domain: devops
category: concept
doc_type: case-study
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-05
---

# set -e is on but the script keeps going after an error

> **A reconstructed situation**, not an incident that happened here. **Every command and every piece of output was really run on bash 5.3.9.**

> **Takeaway:** `set -e` only stops when the failing command is a *simple command* in a position that is **not being checked**. Put the command inside `if`/`while`, after `||`/`&&`, in the middle of a pipe, or inside a function called in a condition — and `set -e` silently ignores it. Don't trust `set -e` alone; explicit error checking plus `pipefail` plus `trap ... ERR`.

## Context

A deploy script opening with `set -e`. The author was reassured: "any error stops it, so we'll never deploy on a broken build." The script calls the build in a function, checks the result with an `if`, and uses `cmd || fallback` in a few places for brevity. Run label: **Really run 2026-08-05 · bash 5.3.9(1).**

## Symptoms

The build fails half-way, but the script runs to the end and **deploys the broken artifact**. In several cases the final exit code is even 0, so CI reports green too. `set -e` is clearly on — and it isn't stopping.

Reconstructing each case. The control first: a simple command failing in an ordinary position **does** stop.

```bash
$ cat > cok.sh <<'EOF'
set -e
false
echo "KHONG in dong nay"
EOF
$ bash cok.sh; echo "exit=$?"
exit=1
```

Exactly as expected — "KHONG in dong nay" isn't printed, exit=1. Now the five cases that do **not** stop.

**Case 1 — a command in an `if` condition:**

```bash
$ cat > c1.sh <<'EOF'
set -e
if false; then echo "khong vao"; fi
echo "van chay sau if"
EOF
$ bash c1.sh; echo "exit=$?"
van chay sau if
exit=0
```

**Case 2 — after `||` and `&&`:**

```bash
$ cat > c2.sh <<'EOF'
set -e
false || true
echo "van chay sau ||"
true && false
echo "van chay sau && (a=true, b=false)"
EOF
$ bash c2.sh; echo "exit=$?"
van chay sau ||
van chay sau && (a=true, b=false)
exit=1
```

Neither `false || true` nor `true && false` stops the script (exit=1 comes from the final `false`, but the echo line after it still prints — the script never stopped mid-way).

**Case 3 — a non-final command in a pipe (without `pipefail`):**

```bash
$ cat > c3.sh <<'EOF'
set -e
false | cat
echo "van chay sau pipe (khong pipefail)"
EOF
$ bash c3.sh; echo "exit=$?"
van chay sau pipe (khong pipefail)
exit=0
```

`set -e` only looks at the exit code at the **end of the pipe** (`cat`, a success). Turning on `pipefail` changes it:

```bash
$ cat > c3b.sh <<'EOF'
set -e
set -o pipefail
false | cat
echo "KHONG in dong nay vi pipefail dung set -e"
EOF
$ bash c3b.sh; echo "exit=$?"
exit=1
```

**Case 4 — a function called in a condition context:** inside the function, `set -e` is disabled.

```bash
$ cat > c4.sh <<'EOF'
set -e
f() { false; echo "van chay TRONG f sau false"; }
if f; then echo "f tra ve 0"; fi
echo "van chay sau if f"
EOF
$ bash c4.sh; echo "exit=$?"
van chay TRONG f sau false
f tra ve 0
van chay sau if f
exit=0
```

The `false` inside `f` stops nothing, because `f` is called in an `if` condition. `f` returns 0 (the exit code of its last command, the `echo`), so the `if` takes the then branch too.

**Case 5 — command substitution:** this one has nuance, and bash 5.3 behaves differently from what people usually assume. The assignment `x=$(false)` **at top level does stop**:

```bash
$ cat > c5a.sh <<'EOF'
set -e
x=$(false)
echo "van chay? x='$x'"
EOF
$ bash c5a.sh; echo "exit=$?"
exit=1
```

"van chay" isn't printed — it stopped. But put `$(false)` **inline inside another command**, or `local x=$(false)` **inside a function**, and it carries on:

```bash
$ cat > c5b.sh <<'EOF'
set -e
echo "ket qua: $(false)"
echo "van chay sau echo chua \$(false)"
EOF
$ bash c5b.sh; echo "exit=$?"
ket qua: 
van chay sau echo chua $(false)
exit=0

$ cat > c5c.sh <<'EOF'
set -e
f() { local x=$(false); echo "van chay TRONG f sau local x=\$(false)"; }
f
echo "van chay sau f"
EOF
$ bash c5c.sh; echo "exit=$?"
van chay TRONG f sau local x=$(false)
van chay sau f
exit=0
```

`local x=$(false)` is the classic trap: the exit code is swallowed by `local` (a builtin that succeeds), and `set -e` only sees `local` returning 0.

## The wrong first hypotheses

| Suspect | Check | Result |
|---|---|---|
| `set -e` was never turned on | `set -o \| grep errexit` → `errexit on` | Genuinely on, not the cause |
| A bug in this bash version | Run on several machines, same behaviour; matches the POSIX/bash spec | Not a bug — it's *by design* |
| The command doesn't really return an error | `false; echo $?` → `1`; the command really does fail | The command really fails and `set -e` still ignores it |
| `local x=$(...)` preserves the error | Case 5c carries on, exit=0 | `local` swallows the exit code — hypothesis wrong |

## The real cause

The `set -e` (errexit) specification has a **long list of exceptions**. It only makes the shell exit when a *simple command*, *pipeline* or *compound command* fails while **not** inside one of these contexts:

- The operand of `if`, `elif`, `while`, `until`.
- The **non-final** part of an `&&` or `||` chain.
- **Any command in a pipe except the last** (unless `pipefail` is on).
- A command negated with `!`.
- **Inside a function or `( )` called in any of the contexts above** — `set -e` is "contextually disabled" for that entire function body.

Put differently: `set -e` is designed **not** to get in the way when you are *actively checking* the exit code. The problem is that the boundary of "actively checking" is much wider than intuition suggests, and it **propagates down** into function bodies.

## Why it was hard to spot

- The control case (bare `false`) **does** stop, so a quick test reinforces the false belief that "`set -e` works".
- Several cases give a final exit code of 0 (cases 1, 3, 4, 5b, 5c) → CI reports green and nobody looks again.
- The nuance of command substitution (`x=$(false)` stops, but `local x=$(false)` doesn't) makes reasoning in your head nearly impossible — you have to actually run it to know.
- The function trap is the worst: `f` behaves correctly when called directly (`f` on its own line does stop), but change it to `if f` and all of `set -e` inside is silently disabled.

## The fix

Don't depend on `set -e` alone. Four cumulative layers:

1. **`set -o pipefail`** — so an error mid-pipe isn't swallowed (case 3).
2. **Explicit error checks** in the positions `set -e` skips: `cmd || { echo "loi X"; exit 1; }`.
3. **`trap ... ERR`** to catch and log, rather than exiting silently.
4. Avoid the one-line `local x=$(cmd)`; split it into `local x; x=$(cmd)` so `set -e` sees `cmd`'s exit code.

Really running the version with `trap ERR` + an explicit check:

```bash
$ cat > cfix.sh <<'EOF'
set -e
set -o pipefail
trap 'echo "loi dong $LINENO (exit=$?)"' ERR
build() { return 1; }
build || { echo "build fail, dung deploy"; exit 1; }
echo "deploy (khong nen den day)"
EOF
$ bash cfix.sh; echo "exit=$?"
build fail, dung deploy
exit=1
```

"deploy" isn't printed, exit=1 — the error was caught and the deploy blocked, exactly as intended.

## How to spot it early

- A script with **only** `set -e` and no `pipefail`, no `trap ERR`, and no explicit checks.
- An important command (build, migrate, health-check) sitting inside an `if`, after `||`/`&&`, mid-pipe, or inside `$( )`.
- A function called as `if f`/`while f` whose body relies on `set -e` to stop.
- `local x=$(cmd)` where `cmd` can fail.
- A final exit code of 0 while the log shows traces of an error along the way — the classic sign of "carried on after a failure".

## Related Topics

- [Exit codes and control flow](../reference/exit-code-va-control-flow.md)
- [Writing safe scripts](../skills/viet-script-an-toan.md)
- [The pipe swallows the exit code](pipe-nuot-exit-code.md)
- [Functions in bash](../skills/functions.md)
