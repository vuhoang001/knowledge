---
title: Where to start
sidebar_position: 0
description: "Build the lab in 5 minutes, then follow the path — from nothing installed to running your first exercise."
tags: [getting-started, setup, duckdb, dbt]
domain: data-engineering
category: concept
doc_type: index
status: stable
difficulty: beginner
verified_at:
updated: 2026-09-11
---

# Where to start

> **Bottom line:** this repo is written to be **run**, not read. Build the lab first — every number in
> every exercise comes from a set of 15 tables you can load yourself in five minutes.

You need no Kafka cluster, no warehouse, no cloud account. The whole data warehouse is **one file** on
your machine; delete it and you are back at zero.

## Step 1 — Check what you already have

```bash
python3 --version    # needs 3.9 or newer
git --version
```

No `python3`? Install it first: `sudo apt install python3 python3-venv` (Debian/Ubuntu) or
`brew install python` (macOS). Beyond those two, nothing else is needed.

## Step 2 — Build the lab

```bash
git clone https://github.com/vuhoang001/knowledge.git
cd knowledge
./lab-starter/setup.sh
```

The script does four things: create a venv → install `dbt-duckdb` → copy the 15 CSV files out to
`~/learn-lab/dbt` → run `dbt seed`. The first run takes 1–3 minutes because packages have to download.

Want the lab somewhere else? Pass a path: `./lab-starter/setup.sh ~/wherever/i/like`.

## Step 3 — Confirm it is right

The script prints this table at the end. If the four numbers match, your lab is **identical** to the one
used to write every exercise in this repo:

```text
┌────────┬─────────┬───────────┬──────────┐
│ so_don │ so_dong │ doanh_thu │ phi_ship │
│ int64  │  int64  │  int128   │  int128  │
├────────┼─────────┼───────────┼──────────┤
│     10 │      15 │  10215000 │   400000 │
└────────┴─────────┴───────────┴──────────┘
```

**These four numbers anchor the whole repo.** If an exercise gives you something different, the bug is
in your SQL, not in the data. Reset at any time:

```bash
cd ~/learn-lab/dbt && ./.venv/bin/dbt seed --full-refresh --profiles-dir .
```

## Step 4 — Run your first query

```bash
cd ~/learn-lab/dbt
./.venv/bin/python -c "
import duckdb
print(duckdb.connect('lab.duckdb').sql('''
  select ma_hang, sum(so_luong) sl, sum(so_luong*don_gia) tien
  from don_hang_chi_tiet group by 1 order by tien desc
'''))"
```

```text
┌─────────┬────────┬─────────┐
│ ma_hang │   sl   │  tien   │
│ varchar │ int128 │ int128  │
├─────────┼────────┼─────────┤
│ SP-C    │      4 │ 3600000 │
│ SP-A    │     22 │ 3300000 │
│ SP-B    │     10 │ 3000000 │
│ SP-D    │      7 │  315000 │
└─────────┴────────┴─────────┘
```

Get that table back and setup is done. From here every SQL statement in the repo can be pasted straight in.

## What order to go in

The repo has more than 230 files. Don't read them in sequence — follow this path:

| Order | Read | Why here |
|---|---|---|
| 1 | [Grain](data-modeling/reference/grain.md) | The concept everything else rests on. Get grain wrong and everything is wrong, with nothing reporting an error |
| 2 | [Facts and dimensions](data-modeling/reference/fact-and-dimension.md) | Two kinds of table, two different ways of thinking |
| 3 | [Building a star schema with DuckDB](data-modeling/tutorials/star-schema-duckdb.md) | The first really-run exercise — all four design steps end to end |
| 4 | [Foundations lab — four ways to inflate a number](data-modeling/tutorials/lab-nen-tang-grain-fact-dim.md) | Reproduce four classic bugs, then fix them yourself |
| 5 | [What dbt is](etl/dbt/reference/what-is-dbt.md) → [dbt lab](etl/dbt/tutorials/dbt-lab-duckdb.md) | The tool that builds models on the very seeds you just loaded |
| 6 | [26 exercises with answers](data-modeling/tutorials/bai-tap-co-dap-so.md) | Self-marking — answers given up front, solutions hidden |

Once those six are done, open the [full contents](index.md) and pick by need. The dependency order
between topics is at the bottom of that page.

**The tier-3 exercise sets** (135 exercises covering 29 techniques) use 10 more tables — already loaded
in step 2. The deliberate trap in each table is explained in the
[seed appendix](data-modeling/tutorials/bt-00-seed.md).

## How to read a file

Every file opens with a **Bottom line** — if you only remember one sentence six months from now, that
is the sentence.

Status markers used in the contents tables:

| | Meaning |
|---|---|
| ✅ | Really run by hand; the output in the file is real output |
| 📝 | Theory, **not** verified — read it sceptically |
| 🔄 | Being written |
| 🟡 | Skeleton only |
| ⬜ | Not written yet |
| 🗂️ | Contents page |

An empty `verified_at` in the frontmatter **means nobody has run it by hand**. That is deliberate:
unverified content is marked as such rather than blended in with content that has been run.

An empty **Result** box in an exercise means the same thing — that exercise has not really been run.

## When it breaks

| Symptom | Usual cause |
|---|---|
| `python3: command not found` | Python isn't installed. See step 1 |
| `ensurepip is not available` | The venv package is missing: `sudo apt install python3-venv` |
| `dbt debug` complains about the profile | You're running dbt outside the lab directory. `cd ~/learn-lab/dbt` and always pass `--profiles-dir .` |
| The four anchor numbers don't match | The seeds were edited. `dbt seed --full-refresh --profiles-dir .` |
| You want to start over | `rm -rf ~/learn-lab/dbt`, then run `./lab-starter/setup.sh` again |

The lab is deliberately **safe to break** — nothing in it can't be rebuilt with one command.

## Related Topics

- [Contents of `docs/`](index.md) — flat manifest of every file in the repo
- [Library by document type](catalog.md) — sliced by form instead of by topic
- [Seed appendix](data-modeling/tutorials/bt-00-seed.md) — the 15 source tables and the deliberate trap in each
