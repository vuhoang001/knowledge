---
title: Test operator and expansion cheatsheet
sidebar_position: 2
description: "Quick lookup for file/string/number test operators, the difference between single and double brackets, parameter expansion, and the special variables."
tags: [cheatsheet, test, parameter-expansion, bash]
domain: devops
category: tool
doc_type: cheatsheet
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-05
---

# Test operator and expansion cheatsheet

> **Takeaway:** Compare numbers with `-eq`/`-lt`/…, compare strings with `=`/`!=`, and always prefer `[[ ]]` over `[ ]` because it isn't subject to word splitting or globbing.

## File tests

`[[ -f "$path" ]]` — true when the condition holds.

| Operator | True when |
|---|---|
| `-e f` | `f` exists (of any kind) |
| `-f f` | `f` exists and is a regular file |
| `-d f` | `f` exists and is a directory |
| `-r f` | `f` exists and is readable |
| `-w f` | `f` exists and is writable |
| `-x f` | `f` exists and is executable (for a directory: enterable) |
| `-s f` | `f` exists and its size is greater than 0 |
| `-L f` | `f` is a symbolic link |
| `-h f` | `f` is a symbolic link (same as `-L`) |
| `f1 -nt f2` | `f1` is newer than `f2`, or `f1` exists and `f2` doesn't |
| `f1 -ot f2` | `f1` is older than `f2`, or `f2` exists and `f1` doesn't |

## String tests

| Operator | True when |
|---|---|
| `-z s` | `s` is empty (length 0) |
| `-n s` | `s` is non-empty |
| `s1 = s2` | the two strings are equal (POSIX) |
| `s1 == s2` | equal; inside `[[ ]]` the right-hand side is a glob pattern |
| `s1 != s2` | not equal |
| `s1 < s2` | `s1` sorts first lexicographically (inside `[[ ]]`) |
| `s1 > s2` | `s1` sorts later lexicographically (inside `[[ ]]`) |
| `s =~ re` | `s` matches the regex `re` — **only inside `[[ ]]`**, and the regex is unquoted |

Inside `[ ]`, `<` and `>` are read as redirections — they have to be escaped as `\<`, `\>`. That's the reason to use `[[ ]]`.

## Number tests

| Operator | True when |
|---|---|
| `-eq` | equal |
| `-ne` | not equal |
| `-lt` | less than |
| `-le` | less than or equal |
| `-gt` | greater than |
| `-ge` | greater than or equal |

These operators are for **NUMBERS** (`[[ $a -lt $b ]]`). For string comparison use `=`/`!=`, not `-eq`. `[[ "01" -eq "1" ]]` is true (numeric) but `[[ "01" = "1" ]]` is false (string).

## `[ ]` vs `[[ ]]` vs `(( ))`

| | `[ ]` (test) | `[[ ]]` | `(( ))` |
|---|---|---|---|
| What it is | a POSIX command | a bash keyword | an arithmetic context |
| Word-splits variables | **yes** — must be quoted | no | no |
| Globs the right side of `==` | no | yes (a pattern) | — |
| Regex `=~` | no | yes | — |
| Logical operators | `-a` / `-o` (error-prone) | `&&` / `||` | `&&` / `||` |
| Numeric comparison | `-lt` … | `-lt` … | `<` `>` `==` (real arithmetic) |
| An empty variable | `[ $x = a ]` is a **syntax error** if `x` is empty | safe | an empty `$x` counts as 0 |

The `[ ]` trap: `[ $var = foo ]` with `var="a b"` expands into `[ a b = foo ]` → an error. Inside `[[ ]]` it's safe even unquoted. Use `(( ))` for arithmetic: `(( count > 10 ))`.

## Parameter expansion

Assume `v` is a variable and `p` a glob pattern.

| Syntax | Result |
|---|---|
| `${v:-x}` | returns `v`, or `x` if unset/empty (no assignment) |
| `${v:=x}` | returns `v`, or if unset/empty **assigns** `v=x` and returns that |
| `${v:+x}` | returns `x` if `v` has a value, otherwise empty |
| `${v:?msg}` | returns `v`, or if unset/empty prints `msg` to stderr and exits |
| `${v:off:len}` | a substring from position `off`, `len` characters long |
| `${#v}` | the length of `v` |
| `${v#p}` | strips the **shortest** match of `p` from the **front** |
| `${v##p}` | strips the **longest** match of `p` from the **front** (gives the basename) |
| `${v%p}` | strips the **shortest** match of `p` from the **end** |
| `${v%%p}` | strips the **longest** match of `p` from the **end** |
| `${v/p/s}` | replaces the **first** match of `p` with `s` |
| `${v//p/s}` | replaces **every** match of `p` with `s` |
| `${v^^}` | converts everything to UPPERCASE |
| `${v,,}` | converts everything to lowercase |

A memory aid: `#` is at the front (like the `#` starting a comment line), `%` is at the end (like a `%` after a number); doubling the character = the greediest match.

## Special variables

| Variable | Meaning |
|---|---|
| `$0` | the script's name (or the shell's) |
| `$1` | the 1st positional parameter (`$2`, `$3`, …) |
| `$#` | the number of positional parameters |
| `$@` | all parameters, as a list |
| `$*` | all parameters, as one string (joined by the first character of `IFS`) |
| `$?` | the exit code of the command that just ran |
| `$$` | the current shell's PID |
| `$!` | the PID of the most recent background command |
| `$_` | the last argument of the previous command |
| `"$@"` | each parameter as **one** separate word, whitespace preserved — **always use this one** |
| `$@` (unquoted) | word-split and globbed — breaks when a parameter contains whitespace |

The golden rule: to iterate arguments, use `for a in "$@"`, never `for a in $@`.

## Related Topics

- [Conditionals and loops](../skills/conditionals-va-loops.md)
- [Variables, arrays and parameter expansion](../skills/variables-arrays-expansion.md)
- [Exit codes and control flow](../reference/exit-code-va-control-flow.md)
- [Bash command cheatsheet](commands.md)
