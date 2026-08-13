---
title: Text processing with pipelines
sidebar_position: 1
description: "Each command does one job and the pipe joins them — nine tenths of text processing is grep filtering lines, cut or awk slicing columns, then sort with uniq counting."
tags: [text-processing, grep, awk, sed, sort, uniq, bash]
domain: devops
category: tool
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-05
---

# Text processing with pipelines

> **Takeaway:** Each command does exactly one job, and `|` connects the previous command's stdout to the next one's stdin. Nine tenths of text processing fits in: `grep` filters lines → `cut`/`awk` slices columns → `sort | uniq -c` counts. Memorise the idiom `sort | uniq -c | sort -rn` and you're halfway there.

## Goal

Given a log file, a CSV, a text dump — be able to answer questions like "which lines match?", "which column?", "what appears most often?" with a pipeline built on the spot, without opening an editor or writing a script.

This page assumes you've got [streams and redirection](../reference/streams-va-redirection.md) (stdin/stdout/stderr, `|`, `>`) and [quoting](../reference/quoting-va-expansion.md) (when a pattern needs single quotes) down. Here we only discuss "which commands do I chain for situation X".

## Overview

Each command has one main job. Don't try to memorise every flag — remember the job, look the flags up when you need them.

| Command | Main job | Common flags | The trap, in one line |
|---|---|---|---|
| `grep` | Filter **lines** matching a pattern | `-i -v -r -w -c -o -n -E` | Defaults to BRE — `+ ? {}` must be escaped or use `-E` |
| `cut` | Slice **columns** on a fixed delimiter | `-d -f` | Doesn't collapse repeated delimiters → breaks on space-aligned columns |
| `awk` | Work by **field**, do arithmetic | `-F` `$1 $NF NR NF` | The multi-tool; runs of whitespace count as one separator (exactly what `cut` lacks) |
| `sed` | Substitute / delete / print lines | `s/x/y/g` `-n` `p` `d` | `s///` without `g` only changes the first match per line |
| `sort` | Sort lines | `-n -r -k -t -u` | Compares **strings** by default: `10` comes before `9` if you forget `-n` |
| `uniq` | Collapse/count **adjacent** duplicate lines | `-c -d -u` | **You must `sort` first** — it only looks at neighbouring lines |
| `tr` | Translate/delete **characters** | `-d -s` | Doesn't understand regex, only character sets |
| `wc` | Count lines/words/bytes | `-l -w -c` | `-c` is bytes, `-m` is characters (they differ in UTF-8) |
| `head`/`tail` | Take the first/last N lines | `-n` `tail -f` | `tail -f` follows a file being written and never exits on its own |

## Examples

*Really run 2026-08-05 · Ubuntu, bash 5.3.9(1), GNU awk 5.3.2, GNU sed 4.9, coreutils uutils 0.8.0.*

The worked problem: we have an access.log and need two answers — **the top 5 IPs by request count** and **how many times each status code appears**. Build the pipeline step by step, reading the output before chaining the next piece.

Sample data (made up, 15 lines, combined log format):

```
203.0.113.5 - - [05/Aug/2026:10:00:01 +0700] "GET /index.html HTTP/1.1" 200 1043
198.51.100.22 - - [05/Aug/2026:10:00:02 +0700] "GET /style.css HTTP/1.1" 200 512
203.0.113.5 - - [05/Aug/2026:10:00:03 +0700] "GET /app.js HTTP/1.1" 200 8021
10.0.0.7 - - [05/Aug/2026:10:00:05 +0700] "POST /api/login HTTP/1.1" 401 91
...
198.51.100.22 - - [05/Aug/2026:10:00:22 +0700] "GET /style.css HTTP/1.1" 304 0
```

### Question 1 — the top 5 IPs

The IP is the first column, separated by a space. Build it up.

**Step 1** — `cut` takes column 1:

```bash
cut -d' ' -f1 access.log
```

```
203.0.113.5
198.51.100.22
203.0.113.5
10.0.0.7
203.0.113.5
...
```

That gives one IP per line, still with duplicates. `cut` works here because the IP column is always separated from what follows by exactly **one** space — a fixed delimiter with no doubled spaces.

**Step 2** — `sort` brings identical IPs next to each other (a hard requirement for `uniq`):

```bash
cut -d' ' -f1 access.log | sort
```

```
10.0.0.7
10.0.0.7
10.0.0.7
172.16.0.99
172.16.0.99
198.51.100.22
198.51.100.22
198.51.100.22
198.51.100.22
203.0.113.5
203.0.113.5
203.0.113.5
203.0.113.5
203.0.113.5
203.0.113.5
```

**Step 3** — `uniq -c` collapses adjacent duplicates and counts them:

```bash
cut -d' ' -f1 access.log | sort | uniq -c
```

```
      3 10.0.0.7
      2 172.16.0.99
      4 198.51.100.22
      6 203.0.113.5
```

**Step 4** — sort descending numerically (`-rn`) and take the first 5:

```bash
cut -d' ' -f1 access.log | sort | uniq -c | sort -rn | head -n 5
```

```
      6 203.0.113.5
      4 198.51.100.22
      3 10.0.0.7
      2 172.16.0.99
```

This is the classic idiom **`sort | uniq -c | sort -rn`** — count frequencies, then rank them. The `-n` is mandatory: without it `10` sorts before `4` because they're compared as strings.

### Question 2 — counting each status code

The status code isn't at a position you can safely `cut`: the `"GET /... HTTP/1.1"` part has a varying number of spaces (the path may contain spaces, methods differ in length). This is where you switch to `awk`, counting by fixed fields. In a combined log the status code is column 9:

```bash
awk '{print $9}' access.log
```

```
200
200
200
401
404
...
304
```

`awk` splits on **runs** of whitespace (several spaces in a row = one separator), so `$9` always lands on the status code even when the preceding columns are misaligned. Chain on the counting idiom:

```bash
awk '{print $9}' access.log | sort | uniq -c | sort -rn
```

```
      8 200
      2 404
      2 403
      1 500
      1 401
      1 304
```

To quickly count **one** specific code, you don't need a pipeline at all — `grep -c` is enough:

```bash
grep -c ' 404 ' access.log
```

```
2
```

`awk` can also compute as it scans. The total bytes of successful requests:

```bash
awk '$9 == 200 {sum += $10} END {print sum}' access.log
```

```
112088
```

And filtering the failed requests (status ≥ 400) with their IP — a pure awk pattern, no grep needed:

```bash
awk '$9 >= 400 {print $1, $9}' access.log
```

```
10.0.0.7 401
203.0.113.5 404
172.16.0.99 403
198.51.100.22 404
172.16.0.99 403
203.0.113.5 500
```

## Trade-offs

- **`cut` vs `awk` for slicing columns.** `cut` is shorter to type and fast, but only correct when the delimiter is exactly one fixed character. Space-aligned columns → `cut` breaks, use `awk`. The rule: clean CSV/TSV → `cut`; aligned logs, arithmetic, or fields counted from the end (`$NF`) → `awk`.
- **`grep` vs `awk` for filtering.** Filtering on the line's content: `grep` is shorter. Filtering on the value of **one specific column** (status ≥ 400, column 3 equals "error"): `awk` is more precise, because grep doesn't know where columns begin and can easily match a string in a different column.
- **Pipeline vs script.** A 4–5 command pipeline is still readable and built on the spot. Past 5–6 commands, or when you need loops and complex conditions → write one `awk` block or move to Python. Don't cram everything onto one line to the point where you can't read it back.
- **`sort` is the bottleneck.** `sort` has to read all its input and hold it in memory or temp files before emitting anything — it can't stream. On a huge file that's where it gets slow and RAM-hungry; consider `awk` with an associative array to count without sorting.

## Common Mistakes

- **Using `uniq` without a `sort` first.** `uniq` only collapses **adjacent** lines. `cut ... | uniq -c` with no sort will count wrong, because the duplicates are scattered. Always `sort | uniq`.
- **`sort` without `-n` on numbers.** It compares strings by default: `100` sorts before `9`. Count frequencies and forget `-rn` and your ranking is nonsense.
- **`cut -d' '` on columns aligned with several spaces.** `cut` treats every space as a delimiter, so two spaces in a row create an empty field in between:

  ```bash
  printf 'alice   30   hanoi\n' | cut -d' ' -f2   # gives an EMPTY line
  printf 'alice   30   hanoi\n' | awk '{print $2}' # gives "30"
  ```

  ```
  
  30
  ```

- **Forgetting that grep defaults to BRE.** `+ ? { } |` are **ordinary** characters in BRE, not operators. `grep 'a+'` searches for the string `a+`, not "one or more a":

  ```bash
  printf 'aaa\na+b\n' | grep 'a+'      # only matches the line with a real +
  printf 'aaa\na+b\n' | grep -E 'a+'   # matches both
  ```

  ```
  a+b
  aaa
  a+b
  ```

  If you want `+ ? |` as operators, add `-E` (ERE) or escape them as `\+` in BRE.
- **`sed 's/x/y/'` without the `g`.** Without the `g` flag, `sed` only replaces **the first match on each line**. `echo 'foo=1;foo=2' | sed 's/foo/bar/'` changes only the first `foo`.

## FAQ

<details>
<summary>When do I use cut and when awk?</summary>

If the delimiter is exactly one fixed, non-repeating character (CSV with `,`, `/etc/passwd` with `:`) → `cut -d',' -f2,7` is nice and short. The moment there are doubled spaces, or you need a column counted from the end (`$NF`), or filtering by a column's value, or summing/counting → `awk`. In practice many people just use `awk '{print $2}'` for everything, because it never breaks on whitespace.

</details>

<details>
<summary>Why is uniq counting wrong even though I'm using it?</summary>

Because you haven't sorted. `uniq` collapses lines that are **identical and adjacent**. If three `10.0.0.7` lines are scattered at lines 4, 9 and 14, then `uniq -c` reports three separate groups of 1 each. Always put `sort` immediately before: `sort | uniq -c`. (If you only need the count and not the ordering, `awk '{c[$1]++} END{for(k in c)print c[k],k}'` does it in one pass with no sort.)

</details>

<details>
<summary>My grep doesn't understand (foo|bar) — what's wrong?</summary>

`grep` defaults to BRE, where `|` and `()` are ordinary characters. Use `grep -E 'foo|bar'` (ERE) or `grep 'foo\|bar'` (escaped in BRE). Generally, if your pattern uses `+ ? | ( ) { }` as operators, just add `-E` and save yourself the headache.

</details>

<details>
<summary>How do I count requests in real time while the log is being written?</summary>

`tail -f access.log | grep --line-buffered ' 500 '` — `tail -f` follows the end of the file and emits new lines immediately. You need `--line-buffered` on grep so it emits line by line instead of filling a buffer. Note this pipeline **never exits on its own**, you have to Ctrl-C; and `sort`/`uniq` are unusable here because they need to read all their input.

</details>

## Related Topics

- [Streams and redirection](../reference/streams-va-redirection.md) — stdin/stdout/stderr and how `|` connects them
- [Quoting and expansion](../reference/quoting-va-expansion.md) — when a grep/sed pattern needs single quotes
- [Finding files with find and xargs](find-va-xargs.md) — feeding files into a pipeline, not just content
- [Lab: text processing](../tutorials/bash-lab-text-processing.md) — the practice exercise with answers
- [Bash command cheatsheet](../cheatsheets/commands.md) — quick flag lookup

## References

- `man grep`, `man awk`, `man sed`, `man sort`, `man uniq`, `man cut`, `man tr`, `man wc`
- GNU Coreutils manual — sort, uniq, cut, tr, wc
- The AWK Programming Language (Aho, Kernighan, Weinberger) — the original book on awk
