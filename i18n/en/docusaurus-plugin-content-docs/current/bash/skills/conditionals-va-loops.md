---
title: Conditionals and loops
sidebar_position: 4
description: "In bash use [[ ]] instead of [ ], compare numbers with -eq and strings with the equals sign, and read a file line by line with while read rather than for line in cat."
tags: [conditionals, loops, test, if, for, while, bash]
domain: devops
category: tool
doc_type: skill
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-05
---

# Conditionals and loops

> **Takeaway:** In bash, default to `[[ ]]` rather than `[ ]` — it doesn't word-split the variables inside, so it doesn't break when a variable is empty. Compare numbers with `-eq`/`-lt` and strings with `=`/`!=`; mixing those two sets up is the classic mistake. And to read a file line by line use `while IFS= read -r line`, never `for line in $(cat file)`.

## Goal

Be able to write `if`/`case` and every kind of loop in bash without falling into the three most common traps: `[ ]` breaking on an empty variable, mixing up the numeric and string comparison operators, and word splitting when looping over a file's lines.

## Overview

`if` in bash does **not** check "true/false" the way other languages do — it runs a command and looks at the **exit code**: `0` is success (run the `then` branch), non-`0` is failure. `grep -q ...`, `[[ ... ]]`, `(( ... ))` are all just commands that return an exit code.

```bash
if lệnh; then ...; elif lệnh; then ...; else ...; fi
```

The three commonly used "condition commands":

| Syntax | What it is | When to use it |
|---|---|---|
| `[ ... ]` | `test`, a POSIX builtin | When it has to run on plain `sh`. Avoid it in bash. |
| `[[ ... ]]` | a bash keyword | **The default in bash** — safer and more capable. |
| `(( ... ))` | bash arithmetic | Every comparison and calculation on **numbers**. |

Why `[[ ]]` is safer than `[ ]`: inside `[[ ]]` bash does **not** word-split and does **not** glob-expand variables, so `[[ $x = y ]]` still works when `$x` is empty or contains a space. `[[ ]]` also supports `&&`, `||`, and `=~` (regex). In exchange it's a bashism — not portable to `sh`.

The `test` operators fall into three groups, and they **must not be mixed**:

- Files: `-f` (a regular file), `-d` (a directory), `-e` (exists), `-r`/`-w`/`-x` (readable/writable/executable).
- Strings: `-z` (empty), `-n` (non-empty), `=` / `!=` (equal/not equal), `=~` (regex match, `[[ ]]` only).
- Numbers: `-eq -ne -lt -le -gt -ge`.

To underline the central trap: **numbers use `-eq`/`-lt`, strings use `=`/`!=`**. Writing `[[ $a > $b ]]` doesn't compare numbers, it compares **strings** in lexicographic order. To compare numbers, use `(( a > b ))`.

## Examples

> Really run 2026-08-05 · Ubuntu, bash 5.3.9(1).

### `if` runs on the exit code

```bash
if grep -q alpha words.txt; then echo "co alpha"; else echo "khong"; fi
```

```
co alpha
```

### `[ ]` breaks on an empty variable — `[[ ]]` doesn't

```bash
x=""
bash -c 'x=""; if [ $x = y ]; then echo yes; else echo no; fi'   # [ ]
if [[ $x = y ]]; then echo yes; else echo "no (an toan)"; fi     # [[ ]]
```

```
bash: line 1: [: =: unary operator expected
no
no (an toan)
```

With `[ ]`, after word splitting `[ $x = y ]` becomes `[ = y ]` — `test` sees two operands and reports a syntax error. With `[[ ]]` the empty variable is preserved as an empty string and the comparison runs correctly.

### Numbers vs strings — the classic trap

```bash
a=10; b=9
if [[ $a -gt $b ]]; then echo "$a -gt $b (so: 10>9)"; fi
if [[ $a > $b ]]; then echo "..."; else echo "[[ $a > $b ]] chuoi: false"; fi
if (( a > b )); then echo "(( a > b )) so hoc: dung"; fi
```

```
10 -gt 9 (so: 10>9)
[[ 10 > 9 ]] chuoi: false
(( a > b )) so hoc: dung
```

`[[ 10 > 9 ]]` gives **false** because it's a string comparison: the character `"1"` sorts before `"9"`. This is the silent kind of bug — no error, just a wrong result. For numbers: `-gt` or `(( ))`.

### Regex with `=~`

```bash
email="ngoc@example.com"
if [[ $email =~ ^[^@]+@[^@]+$ ]]; then echo "khop email"; fi
```

```
khop email
```

### The kinds of loop

```bash
for i in {1..3}; do printf '%s ' "$i"; done; echo   # brace range
for i in $(seq 1 3); do printf '%s ' "$i"; done; echo
for ((i=0; i<3; i++)); do printf '%s ' "$i"; done; echo  # C-style
n=3; until (( n == 0 )); do printf '%s ' "$n"; ((n--)); done; echo
```

```
1 2 3 
1 2 3 
0 1 2 
3 2 1 
```

`break`/`continue`:

```bash
for i in 1 2 3 4 5; do
  (( i == 2 )) && continue
  (( i == 4 )) && break
  printf '%s ' "$i"
done; echo
```

```
1 3 
```

### Reading a file line by line: the WRONG way vs the RIGHT way

The file `words.txt` has a line containing a space:

```
alpha one
beta two three
gamma
```

```bash
# WRONG
for line in $(cat words.txt); do echo "[$line]"; done
# RIGHT
while IFS= read -r line; do echo "[$line]"; done < words.txt
```

```
=== SAI: for line in $(cat words.txt) ===
[alpha]
[one]
[beta]
[two]
[three]
[gamma]

=== DUNG: while IFS= read -r line ===
[alpha one]
[beta two three]
[gamma]
```

`for line in $(cat file)` does **not** iterate by line — it takes `cat`'s output and word-splits it on **all** whitespace (space, tab, newline), so `"beta two three"` gets torn into three. `while IFS= read -r line` reads each line correctly: `IFS=` disables stripping of leading/trailing whitespace, and `-r` stops backslashes from becoming escapes. This is the only correct way to walk lines.

### Worked example: walk a file list, check existence, classify with `case`

The file `files.txt` (one line has a space in the name):

```
config.yaml
data report.csv
notes.txt
```

```bash
while IFS= read -r f; do
  if [[ -f $f ]]; then
    case "$f" in
      *.yaml|*.yml) kind="config" ;;
      *.csv)        kind="du lieu" ;;
      *.txt)        kind="ghi chu" ;;
      *)            kind="khac" ;;
    esac
    echo "CO   $f -> $kind"
  else
    echo "THIEU $f"
  fi
done < files.txt
```

```
CO   config.yaml -> config
CO   data report.csv -> du lieu
CO   notes.txt -> ghi chu
```

All three together: `while read` reads the line `data report.csv` correctly (without tearing it), `[[ -f ]]` checks existence, and `case` classifies by pattern far more neatly than several nested `if`s.

## Trade-offs

| Choice | You get | You lose |
|---|---|---|
| `[[ ]]` (bash) | No word splitting of variables, has `=~`/`&&`/`||`, safe with empty variables | A bashism — won't run on plain `sh` |
| `[ ]` (POSIX) | Portable to every POSIX shell | Breaks on empty or multi-word variables unless carefully quoted |
| `(( ))` for numbers | Natural mathematical syntax, correct numeric comparison | Integers only; no floating point |
| `case` | Many pattern branches, clearly laid out | Only matches glob patterns, not regex |
| `while read` | Reads lines correctly, including lines with spaces | Wordier than `for`; runs in a subshell if placed after a pipe |

## Common Mistakes

- **Using `>` or `<` to compare numbers inside `[[ ]]`.** `[[ 10 > 9 ]]` is a string comparison and gives false. For numbers: `-gt` or `(( ))`.
- **`[ $x = y ]` without quotes.** Breaks when `$x` is empty or multi-word. Use `[[ ]]`, or if you must use `[ ]`, quote it: `[ "$x" = y ]`.
- **`for line in $(cat file)`.** Word-splits on all whitespace, not by line. Always `while IFS= read -r line; do ...; done < file`.
- **Forgetting `-r` on `read`.** Without `-r`, backslashes are swallowed as escapes and filenames or paths containing `\` are corrupted.
- **Using `=` for numbers.** `[[ $n = 0 ]]` compares strings: `"00"` differs from `"0"`. For numbers: `[[ $n -eq 0 ]]` or `(( n == 0 ))`.

## FAQ

<details>
<summary>How do `[ ]` and `[[ ]]` differ, and when do I have to use `[ ]`?</summary>

`[[ ]]` is a bash keyword: no word splitting, no glob expansion of the variables inside, and support for `=~`, `&&`, `||`. `[ ]` is the POSIX `test` command, whose operands are word-split like ordinary arguments, so they need careful quoting. Only use `[ ]` when the script has to run on plain `sh` (dash, busybox). In bash: always `[[ ]]`.

</details>

<details>
<summary>Why is `for line in $(cat file)` wrong when `while read` is right?</summary>

`$(cat file)` produces one string, and then `for ... in` word-splits that string on `IFS` — which by default includes space, tab and newline. So each **word** becomes an element, not each line. `while IFS= read -r line` calls `read` once per line: `IFS=` preserves the whitespace and `-r` preserves backslashes. That's the correct line boundary.

</details>

<details>
<summary>For numeric comparison, should I use `[[ -gt ]]` or `(( > ))`?</summary>

Both are correct for integers. `(( a > b ))` reads more naturally and allows full expressions (`(( a + 1 > b ))`), so prefer it for arithmetic and numeric comparison. `[[ $a -gt $b ]]` is handy when you're already inside a `[[ ]]` condition chain mixed with string or file tests. Never use `>` inside `[[ ]]` for numbers — that's a string comparison.

</details>

## Related Topics

- [Exit codes and control flow](../reference/exit-code-va-control-flow.md)
- [Quoting and expansion](../reference/quoting-va-expansion.md)
- [Variables, arrays and parameter expansion](variables-arrays-expansion.md)
- [Test operator and expansion cheatsheet](../cheatsheets/test-operators-va-expansion.md)
- [The glob that doesn't match](../case-studies/glob-khong-khop.md)

## References

- `man bash` — the *CONDITIONAL EXPRESSIONS* and *Compound Commands* sections (`[[`, `((`, `case`, `for`, `while`, `until`).
- `help test`, `help read`, `help case` — builtin help right inside bash.
- Bash Reference Manual §3.2.5 (Conditional Constructs), §3.5.7 (Word Splitting).
