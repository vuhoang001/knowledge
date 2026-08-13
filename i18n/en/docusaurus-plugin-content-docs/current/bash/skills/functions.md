---
title: Functions in bash
sidebar_position: 5
description: "A function returns a result via echo captured with dollar-parens, while return only carries an exit code from 0 to 255 — and always declare local or you'll trample outer variables."
tags: [functions, arguments, local, bash]
domain: devops
category: tool
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-05
---

# Functions in bash

> **Takeaway:** `return` in bash does **not** return data — it only returns an exit code from 0 to 255. To return a string or a number, `echo` it and capture it with `result=$(myfunc)`. And variables inside a function are **global** by default: forgetting `local` silently tramples the variable outside.

## Goals

- Define and call a function with the right syntax (no parentheses when calling).
- Understand that parameters arrive via `$1 $2 ... $@ $#`, not declared in the parentheses.
- Draw a firm line between the two ways of returning a result: `return` (exit code) vs `echo` (data).
- Use `local` so a function doesn't leak variables outward.
- Know that a function can shadow an external command, and that `command` calls the real one.

## Overview

Two ways to define one:

```bash
name() { ...; }        # the preferred form — POSIX, short
function name { ...; }  # the ksh form, longer, adds nothing
```

Use `name() { ...; }`. Call a function by its **bare name**, with no parentheses:

```bash
name        # correct
name()      # WRONG — this redefines the function as empty
```

Don't declare parameters in the parentheses — the parentheses are always empty. Parameters arrive at a function exactly as they arrive at a script: read via the positional variables.

| Variable | Meaning |
|---|---|
| `$1 $2 ...` | the 1st, 2nd, … parameter |
| `$#` | the number of parameters |
| `$@` | all parameters; `"$@"` preserves each parameter's boundaries |
| `$0` | the script's name (not the function's) |
| `shift` | drop `$1` and shuffle the remaining parameters down |

The two ways of returning a result — **this is what gets confused most:**

- `return n` → sets the function's **exit code** (0–255). Use it to report success/failure, read via `$?` or directly inside `if`. It does **not** carry data.
- `echo ...` → prints to stdout; the caller captures it with `$(...)`. This is how you actually "return" a string or number.

## Examples

> Really run 2026-08-05 · Ubuntu, bash 5.3.9(1).

### Worked example: to_upper returns a string via echo

```bash
to_upper() {
  echo "${1^^}"
}
result=$(to_upper "hello world")
echo "bat duoc: $result"
```

The real output:

```
bat duoc: HELLO WORLD
```

The string goes out through `echo` and `$(...)` catches it. This is the only way to return data.

### is_valid returns an exit code, used in an if

```bash
is_valid() {
  [[ "$1" =~ ^[0-9]+$ ]]
}
if is_valid "42"; then echo "42 la so"; fi
if is_valid "4a2"; then echo "4a2 la so"; else echo "4a2 KHONG phai so"; fi
```

The real output:

```
42 la so
4a2 KHONG phai so
```

The function has no explicit `return` — its exit code is the exit code of the last command (`[[ ... ]]`). `if` reads exactly that exit code.

### return only carries an exit code 0–255 — and it wraps

```bash
get_num() {
  return 300
}
get_num
echo "return 300 -> \$? = $?"    # 300 % 256 = 44

add() {
  echo $(( $1 + $2 ))
}
sum=$(add 40 60)
echo "add 40 60 = $sum"
```

The real output:

```
return 300 -> $? = 44
add 40 60 = 100
```

`return 300` wraps modulo 256 into 44 — proof that `return` is **not** for carrying a number back. To get the real number 100 you have to `echo` it and capture with `$(...)`.

### local saves the outer variable

```bash
name="ngoai"

clobber() {
  name="bi giam"
}
clobber
echo "sau clobber: name = $name"

name="ngoai"
safe() {
  local name="trong ham"
  echo "trong safe: name = $name"
}
safe
echo "sau safe:   name = $name"
```

The real output:

```
sau clobber: name = bi giam
trong safe: name = trong ham
sau safe:   name = ngoai
```

`clobber` doesn't declare `local`, so it assigns to **the actual global variable** `name` — trampling it. `safe` has `local`, so the variable inside the function is separate and the outer one survives.

### $@, $#, shift

```bash
show() {
  echo "so tham so \$# = $#"
  echo "tat ca \$@   = $@"
  echo "tham so 1    = $1"
  shift
  echo "sau shift, \$1 = $1"
}
show one "hai ba" four
```

The real output:

```
so tham so $# = 3
tat ca $@   = one hai ba four
tham so 1    = one
sau shift, $1 = hai ba
```

`"hai ba"` is **one** parameter (`$#` = 3), and after the `shift` it becomes `$1`.

### "$@" preserves boundaries, $@ doesn't

```bash
count_args() { echo "nhan $# tham so"; }
set -- "a b" c
echo -n 'voi $@:  '; count_args $@
echo -n 'voi "$@": '; count_args "$@"
```

The real output:

```
voi $@:  nhan 3 tham so
voi "$@": nhan 2 tham so
```

Unquoted `$@` splits `"a b"` into two words (3 parameters). `"$@"` keeps the boundaries right (2 parameters). **Always use `"$@"`** when forwarding parameters.

### A function shadows an external command, and command calls the real one

```bash
ls() { echo "ham ls gia da chay"; }
ls
command ls /tmp/bashlab-func >/dev/null && echo "command ls: goi binary that OK"
```

The real output:

```
ham ls gia da chay
command ls: goi binary that OK
```

Defining a function named `ls` shadows the real `ls` command. `command ls` bypasses the function and calls the binary on `PATH`.

## Trade-offs

| Approach | You get | You lose |
|---|---|---|
| `return n` | Fast, fits `if`/`&&`; the correct "success/failure" semantics | 0–255 only, wrapping modulo 256; carries no data |
| `echo` + `$(...)` | Returns any string or number | `$(...)` runs a subshell, and `echo` mixes into stdout — the function must print nothing extra to stdout |
| No `local` | Short; deliberate when you want to export a variable outward | Leaks and tramples global variables — a silent bug |
| `local` on every variable | Safe, the function becomes a sealed box | A few characters longer; sometimes you *want* to change an outer variable |
| `name() {}` | POSIX standard, portable | — |
| `function name {}` | Familiar to ksh people | Not portable to `sh`, and gains nothing |

## Common Mistakes

- **`return "chuoi"` to return data.** `return` only takes a number 0–255. `return 300` becomes 44. To return data, `echo` + `$(...)`.
- **Forgetting `local`.** Variables in a function are global by default; assigning inside tramples a same-named variable outside. Declare `local` for every internal variable.
- **Calling a function with parentheses: `myfunc()`.** That syntax *redefines* the function as empty. Call it by its bare name.
- **Declaring parameters in the parentheses: `myfunc(a, b)`.** Bash ignores it; the parentheses are always empty. Read them via `$1 $2`.
- **Using unquoted `$@` when forwarding.** Parameters containing whitespace get split. Always `"$@"`.
- **Stray `echo`s in a function you then capture with `$(...)`.** Every line printed to stdout ends up in the variable. For debugging, print to stderr: `echo "log" >&2`.
- **Defining a function after calling it.** Bash reads sequentially — the function has to be defined before the line that calls it.

## FAQ

<details>
<summary>How do I return several values from one function?</summary>

`echo` them separated by whitespace and `read` them back, or echo one line and split it. For example: `read -r a b < <(myfunc)`. Or use a pre-`declare`d global variable, or a nameref (`local -n out=$1`) so the function writes straight into a variable the caller names.

</details>

<details>
<summary>Does a function have an implicit "return" if I don't write one?</summary>

Yes. A function's exit code is the exit code of **the last command** run inside it. That's why `is_valid` above works without a `return` — the exit code of `[[ ... ]]` is the result.

</details>

<details>
<summary>Does local apply to functions called from inside?</summary>

Yes, and this is the easy trap: bash uses dynamic scope. A `local` variable in a parent function is **still visible** in a child function it calls. It's "local" to the call stack, not to lexical scope as in many other languages.

</details>

<details>
<summary>How do I call the real command when the name is shadowed by a function?</summary>

`command ls` bypasses functions and aliases and calls the external command or builtin. And `builtin cd` forces the builtin. An absolute path like `/bin/ls` also bypasses the function.

</details>

## Related Topics

- [Exit codes and control flow](../reference/exit-code-va-control-flow.md)
- [Variables, arrays and parameter expansion](variables-arrays-expansion.md)
- [Writing safe scripts](viet-script-an-toan.md)
- [Streams and redirection](../reference/streams-va-redirection.md)

## References

- Bash Reference Manual — Shell Functions: https://www.gnu.org/software/bash/manual/bash.html#Shell-Functions
- Bash Reference Manual — the `local`, `return`, `command`, `shift` builtins: https://www.gnu.org/software/bash/manual/bash.html#Bash-Builtins
- BashFAQ/084 — returning data from a function: https://mywiki.wooledge.org/BashFAQ/084
