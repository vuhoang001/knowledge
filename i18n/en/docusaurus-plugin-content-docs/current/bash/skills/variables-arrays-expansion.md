---
title: Variables, arrays and parameter expansion
sidebar_position: 3
description: "The equals sign can't have spaces around it, always wrap a variable in double quotes, and parameter expansion can do defaults or substrings or replacement without calling sed."
tags: [variables, array, parameter-expansion, bash]
domain: devops
category: tool
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-05
---

# Variables, arrays and parameter expansion

> **Takeaway:** To assign a variable, write `x=1` — **no** spaces around `=`, because `x = 1` is read as running the command `x`. To read one, always `"$x"` in double quotes. And before reaching for `sed`/`cut`/`basename`, ask whether parameter expansion (`${v##*/}`, `${v%.*}`, `${v:-default}`) can already do it — it usually can, and faster, because it forks no process.

## Goals

- Assign and read variables correctly, and understand why `x = 1` is an error.
- Tell a shell variable from an environment variable — what a child process inherits and what it doesn't.
- Use indexed and associative arrays: counting elements, iterating, and the `[@]` vs `[*]` trap.
- Use parameter expansion for default values, substrings, and cutting/replacing strings without calling an external command.

## Overview

Variables in bash are **strings** by default and scoped to the whole shell. Three concepts that get mixed up:

| Kind | Declaration | Who can see it |
|---|---|---|
| Shell variable | `x=1` | the current shell only |
| Environment variable | `export x=1` | the current shell **and** every child process |
| Local variable | `local x=1` (inside a function) | that function only |

Parameter expansion is the `${...}` syntax — a small language living inside the shell for taking defaults, slicing substrings, stripping prefixes/suffixes, replacing strings and changing case. It **forks no process** the way `sed`/`cut` do, so it's both fast and free of external dependencies.

The big trap running through all of this: bash is extremely sensitive to **spaces** and **double quotes**. One misplaced space around `=` is an error; a missing double quote around `"$x"` is a silent bug the moment the value contains whitespace.

## Examples

> Label: **Really run 2026-08-05 · Ubuntu, bash 5.3.9(1)-release.** All the output below is pasted straight from the terminal.

### 1. Assigning a variable — the space trap

```bash
x=1
echo "  x=$x  ${x}=${x}"
x = 1            # with spaces around =
```

```text
=== gan bien ===
  x=1  ${x}=1
  --- x = 1 (co dau cach):
bash: line 7: x: command not found
  (exit 127)
```

`x = 1` gets split by bash into the command `x` with the arguments `=` and `1` → there's no command named `x` → `command not found`. An assignment is **always joined up**: `x=1`.

### 2. Shell variable vs environment variable vs local

```bash
myvar="chi shell nay"
export myexp="da export"
bash -c 'echo "  con thay: myexp=[$myexp] myvar=[$myvar]"'

f() { local loc="trong ham"; g="global tu ham"; echo "  $loc"; }
f
echo "  ngoai ham: loc=[${loc-KHONG THAY}] g=[$g]"
```

```text
=== shell var vs environment var ===
  con thay: myexp=[da export] myvar=[]
  trong ham
  ngoai ham: loc=[KHONG THAY] g=[global tu ham]
```

The child process (`bash -c ...`) only sees `myexp` because it was `export`ed; `myvar` is empty there. Inside the function, `loc` is declared `local` so it disappears when the function returns, while `g` (no `local`) leaks out into the global scope.

### 3. Arrays — indexed and associative

```bash
arr=(alpha beta gamma)
echo "  arr[0]=${arr[0]}"
echo "  moi phan tu: ${arr[@]}"
echo "  so phan tu: ${#arr[@]}"
saved=$IFS; IFS=,
echo "  \"\${arr[*]}\" (gop bang IFS=,): ${arr[*]}"
IFS=$saved
printf "  phan tu qua @: [%s]\n" "${arr[@]}"

declare -A cap
cap[vn]=hanoi
cap[jp]=tokyo
echo "  cap[jp]=${cap[jp]}"
echo "  keys=${!cap[@]}"
```

```text
=== mang (bash that) ===
  arr[0]=alpha
  moi phan tu: alpha beta gamma
  so phan tu: 3
  "${arr[*]}" (gop bang IFS=,): alpha,beta,gamma
  phan tu qua @: [alpha]
  phan tu qua @: [beta]
  phan tu qua @: [gamma]
--- associative array ---
  cap[jp]=tokyo
  keys=vn jp
```

Indices start **at 0**. `${arr[@]}` is every element, `${#arr[@]}` is the element count. `"${arr[@]}"` keeps each element separate (correct when elements contain whitespace); `"${arr[*]}"` joins them all into **one** string separated by the first character of `IFS` — clearly visible on the comma-joined line. An associative array needs `declare -A`, and `${!cap[@]}` gets the list of keys.

### 4. Parameter expansion — default values and substrings

```bash
unset v
echo "  \${v:-x}     = ${v:-mac_dinh}   (v van rong: [${v-CHUA GAN}])"
echo "  \${v:=x}     = ${v:=da_gan}     (v gio la: [$v])"
w=co_gia_tri
echo "  \${w:+y}     = ${w:+CO_thi_dung_y}"
( unset e; echo "${e:?bien e bat buoc}" )
s="abcdefgh"
echo "  \${s:2:3}    = ${s:2:3}"
```

```text
=== parameter expansion default ===
  ${v:-x}     = mac_dinh   (v van rong: [CHUA GAN])
  ${v:=x}     = da_gan     (v gio la: [da_gan])
  ${w:+y}     = CO_thi_dung_y
  ${empty:?}  se bao loi:
(eval):9: e: bien e bat buoc
    (exit 1)
  ${s:2:3}    = cde   (substring offset 2 len 3)
```

- `${v:-x}` — use `x` if `v` is empty or unset, and **don't assign** (v is still empty afterwards).
- `${v:=x}` — as above but **also assigns** `v=x`.
- `${v:+x}` — use `x` if `v` **does** have a value (the inverse of `:-`).
- `${v:?msg}` — print `msg` to stderr and exit non-zero if `v` is empty; use it to enforce a required variable.
- `${v:offset:len}` — a substring, with the offset counted from 0.

### 5. String manipulation — cutting and replacing

```bash
p="a.b.c.txt"
echo "  \${p#*.}   xoa dau ngan  = ${p#*.}"
echo "  \${p##*.}  xoa dau dai   = ${p##*.}"
echo "  \${p%.*}   xoa cuoi ngan = ${p%.*}"
echo "  \${p%%.*}  xoa cuoi dai  = ${p%%.*}"
echo "  \${p/./-}  thay 1        = ${p/./-}"
echo "  \${p//./-} thay tat ca   = ${p//./-}"
echo "  \${#p}     do dai        = ${#p}"
u="Hello World"
echo "  \${u^^}    HOA           = ${u^^}"
echo "  \${u,,}    thuong        = ${u,,}"
```

```text
=== string manipulation (bash that) ===
  ${p#*.}   xoa dau ngan  = b.c.txt
  ${p##*.}  xoa dau dai   = txt
  ${p%.*}   xoa cuoi ngan = a.b.c
  ${p%%.*}  xoa cuoi dai  = a
  ${p/./-}  thay 1        = a-b.c.txt
  ${p//./-} thay tat ca   = a-b-c-txt
  ${#p}     do dai        = 9
  ${u^^}    HOA           = HELLO WORLD
  ${u,,}    thuong        = hello world
```

Remember it by the shape of the character: `#` sits on the left of the keyboard → strip from the **front**; `%` → strip from the **end**. Doubling it (`##`, `%%`) = match the **longest** (greedy), a single one = the shortest. `^^`/`,,` change case (bash ≥ 4 only).

### 6. Worked example — taking a file path apart with expansion alone

```bash
f="/var/log/nginx/access.log.gz"
echo "  full     = $f"
echo "  dirname  \${f%/*}   = ${f%/*}"
echo "  basename \${f##*/}  = ${f##*/}"
base="${f##*/}"
echo "  ten khong duoi \${base%.*}  = ${base%.*}"
echo "  duoi cuoi \${f##*.}         = ${f##*.}"
echo "  default: \${LOGDIR:-/tmp/logs} = ${LOGDIR:-/tmp/logs}"
files=("$f" /etc/hosts /tmp/x.csv)
echo "  demo mang: co ${#files[@]} file"
```

```text
=== VI DU XUYEN SUOT: tach 1 duong dan file ===
  full     = /var/log/nginx/access.log.gz
  dirname  ${f%/*}   = /var/log/nginx
  basename ${f##*/}  = access.log.gz
  ten khong duoi ${base%.*}  = access.log
  duoi cuoi ${f##*.}         = gz
  default cho bien rong: ${LOGDIR:-/tmp/logs} = /tmp/logs
  demo mang: co 3 file
```

`dirname`, `basename`, splitting off the extension, and a default value — with no external command called at all. `${f##*.}` takes the extension (the suffix), `${f%.*}` drops the suffix, `${f##*/}` is the basename, `${f%/*}` is the dirname.

## Trade-offs

| Choice | When | Trade-off |
|---|---|---|
| Parameter expansion (`${f##*/}`) | simple string cutting/replacing, running inside a loop | fast, no fork; but the syntax is hard to read and it's glob-only (no regex) |
| `basename`/`dirname`/`sed`/`cut` | you need regex, or you want readable code | clearer, but forks a process per call — slow across thousands of iterations |
| `"${arr[@]}"` | iterating elements, preserving whitespace | correct — nearly always what you want |
| `"${arr[*]}"` | you need one joined string | only when joining is the intent; it's easy to lose element boundaries |
| `${v:-x}` (no assignment) | a temporary default for one read | changes no state |
| `${v:=x}` (assigns too) | you want the default to stick for later reads | has a side effect — easy to forget it changed the variable |

## Common Mistakes

- **Spaces around `=`.** `x = 1` reports `command not found`; `x =1` and `x= 1` are wrong in other ways. An assignment must be joined: `x=1`.
- **Forgetting the double quotes.** `cp $src $dst` breaks the moment a path contains whitespace — it splits into several arguments. Always `cp "$src" "$dst"`.
- **`${arr[*]}` instead of `${arr[@]}` when iterating.** `for x in "${arr[*]}"` runs **once** with the whole array joined into one string. Iterating requires `"${arr[@]}"`.
- **Assuming `${v:=x}` changes nothing.** It **assigns** `v=x` as well — completely different from `${v:-x}`. Misreading these two is a silent bug.
- **Confusing `#` with `%`.** `${f#*/}` strips from the front, `${f%/*}` strips from the end. Swap them and you get the wrong result with no error.
- **Running under `sh` instead of `bash`.** `${u^^}`, `declare -A`, arrays… are bashisms. Under `dash`/`sh` (or with a `#!/bin/sh` shebang) they either silently misbehave or report `bad substitution`.

## FAQ

<details>
<summary>When do I use <code>$&#123;x&#125;</code> instead of <code>$x</code>?</summary>

When you need an explicit boundary so bash doesn't read the variable name as extending into the next character: `"${x}_backup"` — written as `"$x_backup"`, bash looks for a variable named `x_backup`. With parameter expansion (`${x:-y}`, `${x##*/}`) the braces are mandatory.

</details>

<details>
<summary>Are bash arrays 1-based or 0-based? I've seen it written both ways.</summary>

Bash indexed arrays are **0-based**: `${arr[0]}` is the first element. It's zsh that's 1-based — which is why the same script gives different results when run under the wrong shell. Check with `echo "${arr[0]}"`: if it comes out empty while the array has elements, you're in zsh.

</details>

<details>
<summary>How do I get a file's extension without calling an external command?</summary>

`${f##*.}` gives the extension (greedily stripping up to the last dot), `${f%.*}` gives the name without the suffix. The trap: for a file with no dot at all, `${f##*.}` returns **the whole name** (there's nothing to match) — test `[[ "$f" == *.* ]]` first if you need certainty.

</details>

<details>
<summary>What's the difference between <code>$&#123;v:-x&#125;</code> and <code>$&#123;v-x&#125;</code>?</summary>

With the `:` it applies both when `v` is **empty** and when it's **unset**. Without the `:` (`${v-x}`) it applies only when `v` is **unset** — if `v=""` (set but empty) it returns the empty string and doesn't use the default. Most of the time you want the version with the `:`.

</details>

## Related Topics

- [Quoting and expansion](../reference/quoting-va-expansion.md)
- [Functions in bash](functions.md)
- [Conditionals and loops](conditionals-va-loops.md)
- [Test operator and expansion cheatsheet](../cheatsheets/test-operators-va-expansion.md)

## References

- Bash Reference Manual — Shell Parameters & Shell Parameter Expansion: https://www.gnu.org/software/bash/manual/bash.html#Shell-Parameter-Expansion
- Bash Reference Manual — Arrays: https://www.gnu.org/software/bash/manual/bash.html#Arrays
- `man bash`, the *Parameter Expansion* section (the version on this machine: bash 5.3.9)
