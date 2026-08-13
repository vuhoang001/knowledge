---
title: 'Lab: text processing with pipelines'
sidebar_position: 1
description: "A lab really run against a sample access.log — grep, awk, sort, uniq chained into a pipeline answering real questions, with the output pasted back."
tags: [tutorial, text-processing, awk, grep, bash]
domain: devops
category: tool
doc_type: tutorial
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-05
---

# Lab: text processing with pipelines

> **Takeaway:** Practise chaining `grep | awk | sort | uniq -c | sort -rn | head` into one pipeline that answers real questions about an access log — each command does one job, and `|` turns one command's output into the next one's input.

## Goals

After this lab you'll be able to:

- Count lines with `wc -l` and slice columns with `awk '{print $N}'`.
- Build the classic "count then rank" idiom: `sort | uniq -c | sort -rn | head`.
- Filter lines by condition with both `grep` (text matching) and `awk` (numeric comparison).
- Sum a numeric column with `awk '{sum+=$N} END{print sum}'`.

## Preparing the data

Create a scratch directory and a sample 18-line `access.log`, in the format `IP - - [date] "GET /path" status bytes`:

```bash
mkdir -p /tmp/bashlab-tut-text && cd /tmp/bashlab-tut-text
cat > access.log <<'EOF'
10.0.0.1 - - [05/Aug/2026:10:00:01 +0700] "GET /index.html" 200 1024
10.0.0.2 - - [05/Aug/2026:10:00:03 +0700] "GET /about.html" 200 512
10.0.0.1 - - [05/Aug/2026:10:00:05 +0700] "GET /style.css" 200 256
192.168.1.5 - - [05/Aug/2026:10:00:07 +0700] "GET /login" 401 128
10.0.0.1 - - [05/Aug/2026:10:00:09 +0700] "GET /missing" 404 64
10.0.0.3 - - [05/Aug/2026:10:00:11 +0700] "GET /index.html" 200 1024
192.168.1.5 - - [05/Aug/2026:10:00:13 +0700] "GET /admin" 403 96
10.0.0.1 - - [05/Aug/2026:10:00:15 +0700] "GET /api/data" 500 0
10.0.0.2 - - [05/Aug/2026:10:00:17 +0700] "GET /about.html" 200 512
10.0.0.1 - - [05/Aug/2026:10:00:19 +0700] "GET /index.html" 200 1024
10.0.0.4 - - [05/Aug/2026:10:00:21 +0700] "GET /contact" 200 300
192.168.1.5 - - [05/Aug/2026:10:00:23 +0700] "GET /secret" 404 64
10.0.0.1 - - [05/Aug/2026:10:00:25 +0700] "GET /style.css" 200 256
10.0.0.3 - - [05/Aug/2026:10:00:27 +0700] "GET /api/data" 500 0
10.0.0.2 - - [05/Aug/2026:10:00:29 +0700] "GET /index.html" 200 1024
10.0.0.1 - - [05/Aug/2026:10:00:31 +0700] "GET /logout" 302 48
192.168.1.5 - - [05/Aug/2026:10:00:33 +0700] "GET /admin" 403 96
10.0.0.4 - - [05/Aug/2026:10:00:35 +0700] "GET /contact" 200 300
EOF
cat access.log
```

Really run 2026-08-05 · bash 5.3.9(1), uutils coreutils 0.8.0, GNU awk 5.3.2, GNU sed 4.9.

```
10.0.0.1 - - [05/Aug/2026:10:00:01 +0700] "GET /index.html" 200 1024
10.0.0.2 - - [05/Aug/2026:10:00:03 +0700] "GET /about.html" 200 512
10.0.0.1 - - [05/Aug/2026:10:00:05 +0700] "GET /style.css" 200 256
192.168.1.5 - - [05/Aug/2026:10:00:07 +0700] "GET /login" 401 128
10.0.0.1 - - [05/Aug/2026:10:00:09 +0700] "GET /missing" 404 64
10.0.0.3 - - [05/Aug/2026:10:00:11 +0700] "GET /index.html" 200 1024
192.168.1.5 - - [05/Aug/2026:10:00:13 +0700] "GET /admin" 403 96
10.0.0.1 - - [05/Aug/2026:10:00:15 +0700] "GET /api/data" 500 0
10.0.0.2 - - [05/Aug/2026:10:00:17 +0700] "GET /about.html" 200 512
10.0.0.1 - - [05/Aug/2026:10:00:19 +0700] "GET /index.html" 200 1024
10.0.0.4 - - [05/Aug/2026:10:00:21 +0700] "GET /contact" 200 300
192.168.1.5 - - [05/Aug/2026:10:00:23 +0700] "GET /secret" 404 64
10.0.0.1 - - [05/Aug/2026:10:00:25 +0700] "GET /style.css" 200 256
10.0.0.3 - - [05/Aug/2026:10:00:27 +0700] "GET /api/data" 500 0
10.0.0.2 - - [05/Aug/2026:10:00:29 +0700] "GET /index.html" 200 1024
10.0.0.1 - - [05/Aug/2026:10:00:31 +0700] "GET /logout" 302 48
192.168.1.5 - - [05/Aug/2026:10:00:33 +0700] "GET /admin" 403 96
10.0.0.4 - - [05/Aug/2026:10:00:35 +0700] "GET /contact" 200 300
```

Each line has these columns (split on whitespace): `$1` = the IP, `$7` = `"GET`… — actually `$6="GET`, `$7=/path"`, `$(NF-1)` = the status, `$NF` = the bytes. Using `$(NF-1)` and `$NF` counts from the end, so a path containing a space can't throw the column numbers off.

## Exercise 1 — how many requests in total?

Each request is one line, so counting lines is all it takes. The `< access.log` keeps `wc` from printing the filename too:

```bash
wc -l < access.log
```

```
18
```

Exactly the number of lines we just created. Typing `wc -l access.log` (without the redirect) would output `18 access.log` — with a redundant filename.

## Exercise 2 — which IP calls most often?

This is the "count then rank" idiom. Slice out the IP column (`$1`), `sort` to bring identical lines together, `uniq -c` to count each group, then `sort -rn` to order descending by number:

```bash
awk '{print $1}' access.log | sort | uniq -c | sort -rn | head
```

```
      7 10.0.0.1
      4 192.168.1.5
      3 10.0.0.2
      2 10.0.0.4
      2 10.0.0.3
```

`uniq -c` **requires** a preceding `sort`, because it only collapses duplicates that are **adjacent**. On `sort -rn`: `-n` compares numerically (otherwise `10` sorts before `7`), and `-r` reverses so the largest is first.

## Exercise 3 — how many times does each status code appear?

The same idiom, just a different column. The status is the second-to-last column, taken with `$(NF-1)`:

```bash
awk '{print $(NF-1)}' access.log | sort | uniq -c | sort -rn
```

```
     10 200
      2 500
      2 404
      2 403
      1 401
      1 302
```

`NF` is the current line's column count, so `$(NF-1)` is the second-to-last column — an approach immune to paths of varying length. 10 successful requests, 6 errors, 1 redirect, 1 authentication (401).

## Exercise 4 — only the failed requests (4xx and 5xx)

Two ways; pick by need.

**The grep way** — match a 4xx/5xx status by regex near the end of the line (` [45]` + 2 digits + whitespace + the trailing bytes):

```bash
grep -E ' [45][0-9]{2} [0-9]+$' access.log
```

```
192.168.1.5 - - [05/Aug/2026:10:00:07 +0700] "GET /login" 401 128
10.0.0.1 - - [05/Aug/2026:10:00:09 +0700] "GET /missing" 404 64
192.168.1.5 - - [05/Aug/2026:10:00:13 +0700] "GET /admin" 403 96
10.0.0.1 - - [05/Aug/2026:10:00:15 +0700] "GET /api/data" 500 0
192.168.1.5 - - [05/Aug/2026:10:00:23 +0700] "GET /secret" 404 64
10.0.0.3 - - [05/Aug/2026:10:00:27 +0700] "GET /api/data" 500 0
192.168.1.5 - - [05/Aug/2026:10:00:33 +0700] "GET /admin" 403 96
```

**The awk way** — compare numerically and directly (`status >= 400`), which is tidier when you want a threshold, and convenient for printing exactly the columns you need. The `gsub` strips the `"` still stuck to the path:

```bash
awk '$(NF-1) >= 400 {gsub(/"/, "", $7); print $1, $7, $(NF-1)}' access.log
```

```
192.168.1.5 /login 401
10.0.0.1 /missing 404
192.168.1.5 /admin 403
10.0.0.1 /api/data 500
192.168.1.5 /secret 404
10.0.0.3 /api/data 500
192.168.1.5 /admin 403
```

`grep` matches text, so it's fast and short when the condition is "contains this pattern"; `awk` understands numbers, so it's more natural for "this column ≥ 400" and it can also pick which columns to print.

## Exercise 5 — total bytes served

The bytes column is `$NF` (the last one). Accumulate into a `sum` variable and print it in the `END` block after the whole file has been read:

```bash
awk '{sum += $NF} END {print sum}' access.log
```

```
6728
```

`sum` defaults to 0 when unassigned, so there's no need to initialise it. `END{}` runs exactly once, after the last line — that's where to print an aggregate result.

## Check yourself

Build a pipeline for each answer yourself, then open the solution to compare.

1. How many requests returned **exactly** status 404?
2. How many requests in total did the IP `192.168.1.5` make?
3. What's the average bytes for the status 200 requests alone?

<details>
<summary>Answers</summary>

```bash
# 1) only status == 404
awk '$(NF-1) == 404' access.log | wc -l
# -> 2

# 2) requests from one specific IP (^ anchors the start so it can't mismatch)
grep -c '^192.168.1.5 ' access.log
# -> 4

# 3) average bytes of 200 requests: accumulate then divide by the line count
awk '$(NF-1) == 200 {sum += $NF; n++} END {print sum/n}' access.log
# -> 623.2
```

Question 3 reads as: only for lines with status 200, add the bytes to `sum` and increment the counter `n`; finally print `sum/n`. There are 10 requests with status 200 totalling 6232 bytes → an average of 623.2.

</details>

## Related Topics

- [Text processing with pipelines](../skills/text-processing.md)
- [Streams and redirection](../reference/streams-va-redirection.md)
- [Lab: your first script](bash-lab-first-script.md)
- [Bash command cheatsheet](../cheatsheets/commands.md)
