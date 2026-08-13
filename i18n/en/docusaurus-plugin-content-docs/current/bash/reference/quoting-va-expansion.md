---
title: Quoting and expansion
sidebar_position: 3
description: "Bash expands variables, then splits words, then matches globs — leaving a variable unquoted invites word splitting and globbing to wreck your code."
tags: [quoting, expansion, word-splitting, glob, bash]
domain: devops
category: concept
doc_type: reference
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-05
---

# Quoting and expansion

> **Takeaway:** Bash **expands variables first**, then does **word splitting** on `IFS`, then **globbing** — the last two steps operate on the *result* of the expansion. `"$var"` switches off exactly those last two steps. The one-line rule: **always double-quote a variable unless you deliberately want splitting or globbing.**

## Goals

- Tell the three quoting levels apart: `'...'`, `"..."`, and unquoted — they switch different expansion steps on and off.
- Understand the **order** of the expansion steps, and why word splitting + globbing happen *after* variable expansion.
- Know exactly when `"$var"` saves you and when dropping the quotes is a silent bug.

## Overview

When bash meets a command line, it doesn't hand it straight to the program. It runs an **expansion pipeline** in a fixed order:

1. **Brace expansion** — `{a,b,c}` → `a b c`
2. **Tilde expansion** — `~` → `$HOME`
3. **Parameter expansion** — `$var`, `${var}`
4. **Command substitution** — `$(...)`, `` `...` ``
5. **Arithmetic expansion** — `$(( ... ))`
6. **Word splitting** — split the result of the steps above on `IFS`
7. **Pathname expansion (globbing)** — `*`, `?`, `[...]` matching filenames

The crux is the order: **word splitting (6) and globbing (7) run AFTER parameter expansion (3).** That means bash expands `$var` into its contents *first*, and only then looks at those contents for spaces to split on and `*` to match files with. That's exactly why `"$var"` saves you: double quotes do **not** block step 3 (the variable still expands), but they **do** block steps 6 and 7 on the result.

The three quoting levels, in short:

| Form | Does `$var` expand? | word split? | glob? |
|---|---|---|---|
| `'...'` (single quotes) | ❌ absolutely literal | ❌ | ❌ |
| `"..."` (double quotes) | ✅ | ❌ | ❌ |
| unquoted | ✅ | ✅ | ✅ |

`"$var"` is the sweet spot: you keep the variable's value while locking out both traps behind it.

## Examples

> Really run 2026-08-05 · bash 5.3.9(1) on Ubuntu. Coreutils on this machine is uutils 0.8.0, not GNU — output may differ slightly from GNU coreutils.
>
> The examples run inside `env -i bash --noprofile --norc` so that `IFS` and the shell options are at clean defaults — an interactive shell may already have changed `IFS`, which would keep word splitting from reproducing correctly.

### 1. The three quoting levels

```bash
name="Bash"
echo 'single: $name khong no'
echo "double: $name co no"
echo brace: {a,b,c}
echo "arith: $(( 2 + 3 * 4 ))"
echo "cmdsub: $(date +%Y)"
```

```
single: $name khong no
double: Bash co no
brace: a b c
arith: 14
cmdsub: 2026
```

Single quotes keep `$name` as literal text; double quotes expand it. `{a,b,c}` expands even unquoted, because brace expansion is first in the pipeline.

### 2. Word splitting on IFS

`IFS` defaults to space + tab + newline. This is the crux, so look at the actual bytes:

```bash
printf '%s' "$IFS" | od -An -c
#       \t  \n     ← space, tab, newline
```

Put **several spaces** in a variable, then loop over it quoted and unquoted — counting the iterations shows the split:

```bash
var="hello    world"
i=0; for x in $var;   do i=$((i+1)); echo "  no-quote [$i] <$x>"; done
i=0; for x in "$var"; do i=$((i+1)); echo "  quote    [$i] <$x>"; done
```

```
  no-quote [1] <hello>
  no-quote [2] <world>
  quote    [1] <hello    world>
```

Unquoted: bash splits `$var` into **2 words** on `IFS`, and consecutive spaces collapse into a single split point (the extra whitespace is lost too). Quoted: **a single word**, all four spaces intact. `echo $var` on its own does *not* reveal this, because `echo` prints its arguments separated by one space — you need the loop to see it clearly.

### 3. A variable containing a space with `rm` (using `echo` instead of `rm` for safety)

```bash
touch "my file.txt" other.txt
f="my file.txt"
echo rm $f      # unquoted
echo rm "$f"    # quoted
```

```
rm my file.txt
rm my file.txt
```

The output looks the same but the **meaning is completely different**. Unquoted, `rm` receives **two** arguments: `my` and `file.txt` — it will try to delete two files that don't exist (or worse, delete the wrong thing if they happen to). Quoted, `rm` receives **one** argument, `my file.txt`, exactly as the file is named. This is a classic class of bug; see the [case study](../case-studies/bien-khong-nhay-word-splitting.md).

### 4. Globbing expands a variable containing `*`

```bash
star="*"
echo $star      # unquoted
echo "$star"    # quoted
```

```
my file.txt other.txt
*
```

Unquoted: bash expands `$star` to `*` (step 3), then globbing (step 7) matches `*` against every file in the directory → a file list. Quoted: globbing is off and `*` stays a literal character. If you meant to print an asterisk and forgot the quotes, you print the whole directory instead.

### 5. A glob that doesn't match stays literal

```bash
echo *.txt    # matching files exist
echo *.md     # no .md files at all
```

```
my file.txt other.txt
*.md
```

This is the big trap: when **nothing matches**, bash (by default) **raises no error** and returns **the unexpanded pattern itself**. A loop `for f in *.md` will run exactly once with `$f` equal to the literal string `*.md` — not "zero times". See [the glob that doesn't match](../case-studies/glob-khong-khop.md).

### 6. Command substitution is word-split too when unquoted

```bash
v="a b"
i=0; for x in $(echo "$v");   do i=$((i+1)); echo "  [$i] <$x>"; done
i=0; for x in "$(echo "$v")"; do i=$((i+1)); echo "  [$i] <$x>"; done
echo "backtick: `echo old`"
echo "dollar:   $(echo new)"
```

```
  [1] <a>
  [2] <b>
  [1] <a b>
backtick: old
dollar:   new
```

The result of `$(...)` goes through the same pipeline as a variable: unquoted, it gets split on `IFS`. Use `$(...)` rather than `` `...` `` — the old syntax nests badly and makes escapes hard to read.

### 7. Variable boundaries with `${var}`, and proof of the expansion order

```bash
pre="my"
echo "a[$pre_file]b"     # bash looks for a variable named "pre_file" -> empty
echo "a[${pre}_file]b"   # {} cuts the boundary -> "my_file"

g="*.txt"
echo $g                  # the variable expands to "*.txt" FIRST, globbing runs AFTER
```

```
a[]b
a[my_file]b
my file.txt other.txt
```

The first two lines: without `{}`, bash treats `pre_file` as a variable name (empty). `${pre}_file` marks the boundary explicitly. The last line is proof of the ordering: `$g` expands into the string `*.txt`, and *then* the globbing step matches it against files — if globbing ran before variable expansion, `$g` could never have become a pattern.

## Trade-offs

| Choice | You get | You lose / when to deliberately drop it |
|---|---|---|
| `"$var"` (the default you should use) | Safe with spaces, `*`, odd characters | No splitting — if you *want* to split a string into several arguments, don't quote |
| `$var` unquoted | Word splitting + globbing when you want them | A silent bug the moment the value contains an unexpected space or glob |
| `'...'` single quotes | Absolutely literal, safest for fixed strings | Nothing expands — useless when you need `$var` |
| `$(...)` | Readable, nests properly | (no real downside versus backticks) |
| Dropping the quotes around `$(cmd)` to split the output | Several tokens from one line | You lose control if the output contains an unexpected space — consider `mapfile`/`read -a` |

## Common Mistakes

- **`for f in $(ls)`** — `ls`'s output is word-split on `IFS`, and breaks immediately on a filename with a space. Use the glob directly: `for f in *`.
- **`rm $file`** instead of `rm "$file"` — a filename with a space becomes several arguments. The most dangerous class of accidental-deletion bug.
- **`if [ $x = "y" ]`** with `$x` empty or containing a space → the `[` syntax breaks. Always `[ "$x" = "y" ]` (or use `[[ ]]`).
- **Thinking `'...'` expands variables** — single quotes *never* expand `$`. `echo 'PATH=$PATH'` prints it literally.
- **Thinking a non-matching glob returns nothing** — by default it returns the literal pattern. The loop `for f in *.md` runs with `$f="*.md"` when there are no `.md` files. Turn on `shopt -s nullglob` if you want nothing.
- **Using `${var}` everywhere "to be safe"** — you only need `{}` when the boundary is ambiguous (`${pre}_file`). Sprinkling it everywhere makes the code noisy; the thing that's *actually* safe is double quotes, not braces.

## FAQ

<details>
<summary>What's the difference between `"$var"` and `$&#123;var&#125;`?</summary>

Two independent things. `${var}` is only a **syntactic boundary** — needed when the character after the variable name could be read as part of the name (`${pre}_file`). It does **not** protect against word splitting or globbing. `"$var"` (double quotes) is what switches word splitting + globbing off. If you want both, write `"${var}"`. If you can only pick one to prevent bugs, pick **the double quotes**.

</details>

<details>
<summary>So is it ever right to drop the quotes around a variable?</summary>

Yes, when you **deliberately** want splitting or globbing. For example a variable holding several flags: `opts="-l -a"; ls $opts` — you want it to become two separate arguments. But it's a double-edged knife; for data that genuinely has many tokens, `mapfile` or an array (`arr=(-l -a); ls "${arr[@]}"`) is safer because it doesn't depend on the value being free of unintended spaces and globs.

</details>

<details>
<summary>Why does `echo $var` with a two-word variable still print normally?</summary>

Because `echo` prints its arguments separated by a single space, so `echo hello world` (two arguments) and `echo "hello world"` (one argument) *look* identical on screen. The word splitting still happened — you just can't see the consequence. To see it, count the arguments with a `for` loop, or use `printf '<%s>\n' $var` to put each argument on its own line.

</details>

<details>
<summary>How do I turn globbing off completely?</summary>

`set -f` (or `set -o noglob`) disables pathname expansion for the whole shell. Useful in a script that handles patterns as data (say, passing `*` to another program) where you don't want bash to "help". Turn it back on with `set +f`. In the other direction, `shopt -s nullglob` makes a non-matching glob return **nothing** instead of the literal pattern — fixing exactly the trap in example 5.

</details>

## Related Topics

- [What a shell is](shell-la-gi.md)
- [Streams and redirection](streams-va-redirection.md)
- [Variables, arrays and expansion](../skills/variables-arrays-expansion.md)
- [An unquoted variable — word splitting](../case-studies/bien-khong-nhay-word-splitting.md)
- [The glob that doesn't match](../case-studies/glob-khong-khop.md)

## References

- Bash Reference Manual — [Shell Expansions](https://www.gnu.org/software/bash/manual/html_node/Shell-Expansions.html) (the official pipeline order)
- Bash Reference Manual — [Word Splitting](https://www.gnu.org/software/bash/manual/html_node/Word-Splitting.html)
- Bash Reference Manual — [Filename Expansion](https://www.gnu.org/software/bash/manual/html_node/Filename-Expansion.html) (`nullglob`, `failglob`)
- Greg's Wiki — [Quotes](https://mywiki.wooledge.org/Quotes) and [BashPitfalls](https://mywiki.wooledge.org/BashPitfalls)
