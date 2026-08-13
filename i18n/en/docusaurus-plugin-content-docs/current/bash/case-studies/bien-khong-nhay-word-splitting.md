---
title: A filename with a space deletes a whole directory
sidebar_position: 1
description: "A variable holding a filename with a space, left unquoted, is word-split into several arguments — a for loop over ls plus rm dollar-f deletes the wrong thing."
tags: [case-study, quoting, word-splitting, bash]
domain: devops
category: concept
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-05
---

# A filename with a space deletes a whole directory

> **A reconstructed situation**, not an incident that happened here. **Every command and every piece of output was really run on bash 5.3.9.**

> **Takeaway:** An unquoted `$var` in an argument position gets cut on `IFS` by the shell and then re-globbed. One name → several arguments. Sooner or later there's a file with a space in its name, and that's the day your `rm` script deletes something else.

## Context

A cron script cleaning up old logs, running smoothly for months:

```bash
for f in $(ls *.log); do rm $f; done
```

It was right for the wrong reason: **no log file had ever had a space in its name**. Each name was a
single "word", so word splitting cut nothing and globbing expanded nothing further. The bug lay dormant.

Then a reporting job started writing out `báo cáo tháng 8.log`.

## Symptoms

Reconstructing that exact directory — a few ordinary logs, one file with a space in its name, and
(unluckily) an innocent bystander named `báo`:

```
=== truoc khi chay vong lap loi ===
app.log
báo
báo cáo tháng 8.log
error.log
```

Run the old loop as it was:

```bash
for f in $(ls *.log); do rm $f; done
```

The real result:

```
rm: cannot remove 'cáo': No such file or directory
rm: cannot remove 'tháng': No such file or directory
rm: cannot remove '8.log': No such file or directory

=== sau khi chay ===
báo cáo tháng 8.log
```

> Really run 2026-08-05 · bash 5.3.9(1), uutils coreutils 0.8.0.

Read that output carefully, because it's bad in three ways at once:

- The file that *should* have been deleted — `báo cáo tháng 8.log` — **is still there**. Nobody managed to touch it.
- `app.log` and `error.log` were deleted just like every other day (they're absent from what remains).
- The innocent file **`báo` is gone** — deleted by `rm báo`, even though it isn't a `.log` at all.
- Three `No such file` errors, for `cáo`, `tháng` and `8.log`.

Replacing `rm` with `echo "rm $f"` shows what the shell is actually calling:

```
rm app.log
rm báo
rm cáo
rm tháng
rm 8.log
rm error.log
```

One name, `báo cáo tháng 8.log`, expanded into **four** arguments: `báo`, `cáo`, `tháng`,
`8.log`.

## The wrong first hypotheses

| Suspect | Verdict |
|---|---|
| The filename's encoding is broken (bad UTF-8) | Wrong. `command ls -1` prints a readable `báo cáo tháng 8.log`, with no odd characters. |
| The uutils build of `rm` is buggy and misreads its arguments | Wrong. `rm` receives exactly what it was handed — `cáo` and `tháng` genuinely don't exist, so the error is correct. |
| A bad disk / inode, hence "No such file" | Wrong. The file is right there and `ls` sees it. The error comes from the name being cut before it ever reached `rm`. |
| The glob `*.log` matched the wrong things | Wrong. `*.log` matched the right file; the problem happens after that, at the unquoted `$f`. |

All four suspects look towards `rm`, the disk, the encoding — that is, towards **the system**. The
culprit is **quoting**, one layer up, before the command even got to run.

## The real cause

Two quoting bugs stacked on top of each other.

**Bug 1 — `for f in $(ls *.log)`:** `ls`'s output is one string, and the shell cuts it on
`IFS` (which by default includes space, tab and newline) into "words". A name with a space is cut right
here.

```
$ printf '%q\n' "$IFS"
\ $'\t'$'\n'$'\0'
```

The default `IFS` contains a space — that's the knife.

**Bug 2 — `rm $f`:** even if `f` had managed to hold a name with a space intact, the unquoted `$f`
gets word-split **again** in `rm`'s argument position. The proof: quoting it stops the cutting entirely.

```
name="báo cáo tháng 8.log"
-- khong nhay, IFS mac dinh --
  <báo cáo tháng 8.log>
-- co nhay --
  <báo cáo tháng 8.log>
```

The loop `for x in $name` (unquoted) gives **one** result here only because `name` is a plain variable
that never went through `ls` — but in the original script, `$(ls)` had already done the cutting. The key
point: **every unquoted `$var` in an argument position is another chance for the shell to cut it again.**

## Why it was hard to spot

- **Months of running correctly.** The tests were written with `foo.log`, `bar.log` — no name with a
  space, so word splitting was a no-op. The tests stayed green forever.
- **The eye skips over it.** `rm $f` looks identical to `rm "$f"`; the difference is exactly two quote
  characters. Nothing turns red.
- **The error is out of phase with the culprit.** What blows up is `rm: No such file` for `cáo` and
  `tháng` — names you never typed. The first instinct is to go inspect `rm`, the disk, the encoding; nobody
  goes straight to two missing quotes.
- **It silently deletes the wrong thing.** The file `báo` was deleted with **no** error at all — it really
  existed, so `rm báo` succeeded. That damage is quieter than any error message.

## The fix

Glob directly (drop `ls` entirely), double-quote the variable, and add `--` so a name starting with `-`
isn't read as a flag:

```bash
for f in *.log; do rm -- "$f"; done
```

Rebuild the same old directory and really run it:

```
=== truoc ===
app.log
báo
báo cáo tháng 8.log
error.log

=== cach sua: for f in *.log; do echo rm -- "$f"; done ===
rm -- <app.log>
rm -- <báo cáo tháng 8.log>
rm -- <error.log>

=== sau ===
báo
```

> Really run 2026-08-05 · bash 5.3.9(1), uutils coreutils 0.8.0.

Before/after side by side:

| | Old loop `$(ls)` + `rm $f` | Fixed loop `*.log` + `rm -- "$f"` |
|---|---|---|
| Arguments per name containing a space | 4 fragments (`báo` `cáo` `tháng` `8.log`) | 1 whole name |
| `báo cáo tháng 8.log` | Couldn't be deleted | Deleted correctly |
| The innocent file `báo` | Deleted by mistake | Untouched |
| `No such file` errors | 3 lines | 0 lines |

The glob `*.log` returns the list of names directly, with **no** intermediate string, so there's nowhere
for a cut to happen. Quoting `"$f"` blocks the second cut. And `báo` is untouched because it doesn't match `*.log`.

One side note: if the glob matches nothing, bash by default leaves `*.log` as a literal. A real script
should turn on `shopt -s nullglob` so the loop runs 0 times instead of trying `rm -- '*.log'`.

## How to spot it early

Things you can check by eye or with a tool:

- Any **unquoted** `$var` in an argument position — especially `rm $f`, `cp $x $y`,
  `[ $a = $b ]`. The defensive rule: **always** `"$var"` unless you deliberately want splitting.
- `for x in $(ls ...)` — the classic antipattern. To walk files, use a glob (`for f in
  *.log`), don't parse `ls`. (`ls` is for humans to look at, not for scripts to read.)
- Run **ShellCheck**: `rm $f` earns **SC2086** (*Double quote to prevent globbing and word
  splitting*), and `for f in $(ls ...)` earns **SC2045** (*Iterating over ls output is
  fragile*). Wiring ShellCheck into CI catches this whole class of bug before merge.
- Test deliberately with a name that **has a space** (`touch "a b.log"`). Test only with
  `foo.log` and the bug sleeps forever.

## Related Topics

- [Quoting and expansion](../reference/quoting-va-expansion.md)
- [Conditionals and loops](../skills/conditionals-va-loops.md)
- [Finding files with find and xargs](../skills/find-va-xargs.md)
- [Writing safe scripts](../skills/viet-script-an-toan.md)
