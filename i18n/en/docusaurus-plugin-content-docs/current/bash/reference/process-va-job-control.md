---
title: Processes and job control
sidebar_position: 6
description: "An & only pushes a job into the current shell's background, so logging out kills it — to make it survive you need nohup or disown; kill by default asks politely, -9 forces it."
tags: [process, job-control, signal, kill, nohup, bash]
domain: devops
category: concept
doc_type: reference
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-05
---

# Processes and job control

> **Takeaway:** `cmd &` only pushes a job into the background of the **current shell** — that job is the shell's child, so when the shell dies (logout, closing the terminal) it receives SIGHUP and dies with it. To make it survive, use `nohup` or `disown`. And `kill` by default sends SIGTERM — *asking* the process to stop, giving it a chance to clean up; `kill -9` sends SIGKILL — forced, with no cleanup and nothing a process can do to block it. Always try SIGTERM first; `-9` is the last resort.

## Goals

After this page you'll be able to tell apart:

- **Foreground vs background**, `&`, `jobs`, `fg`, `bg`, and how a job number `%1` differs from a PID.
- Why a background job **dies on logout**, and the two ways to keep it alive: how `nohup` and `disown` differ.
- Viewing processes with `ps`, `pgrep`, `top`.
- The four signals worth memorising — SIGTERM, SIGKILL, SIGHUP, SIGINT — and why the order to try them is TERM first, KILL after.

## Overview

Every command you run is a **process**, identified by a **PID** (a system-wide number). When you add `&`, the shell runs the command in the **background** and records it in that shell's own **job table** — each job gets a **job number** like `%1`, `%2`, meaningful only in the shell currently open.

| Concept | Scope | Example reference |
|---|---|---|
| **PID** | System-wide, every process | `kill 128505` |
| **Job number** | The current shell only | `kill %1`, `fg %1` |

This is the easy thing to confuse: `%1` is **not** a PID. `%1` is "the first job in this shell"; close the shell and the job table is gone, `%1` means nothing, but the process (if still alive) keeps its PID.

A **signal** is how you send a notification to a process. `kill` doesn't "kill" — it *sends a signal*; the command name is misleading. The default signal is SIGTERM (15), meaning "please stop".

## Examples

> Really run 2026-08-05 · bash 5.3.9(1) on Ubuntu. Coreutils on this machine is uutils 0.8.0, not GNU — output may differ slightly from GNU coreutils.
> Scratch space: `mkdir -p /tmp/bashlab-proc && cd /tmp/bashlab-proc`.

### Worked example: push to background → find the PID → kill by job number

```bash
sleep 300 &          # push it into the background
jobs                 # list this shell's jobs
jobs -l              # with PIDs
ps -ef | grep '[s]leep 300'   # see the global PID
kill %1              # send SIGTERM to job %1
jobs                 # confirm it stopped
```

The real output:

```text
--- jobs ---
[1]+  Running                    sleep 300 &
--- jobs -l (PID) ---
[1]+ 124718 Running                    sleep 300 &
--- ps thay PID ---
hoanggg+  124718  124717  0 20:45 ?  00:00:00 sleep 300
--- kill %1 ---
--- jobs sau kill ---
[1]+  Terminated                 sleep 300
```

Reading it step by step: `jobs` gives `[1]+ Running` — the `+` marks the "current" job (the default for `fg`/`bg`/`kill %` when you don't give a number). `jobs -l` reveals PID **124718**. `ps -ef` confirms the same PID from the system-wide view — the third column (`124717`) is the PPID, i.e. the parent shell. `kill %1` sends SIGTERM; the final `jobs` prints `Terminated` — the job is dead.

> **The `[s]leep` trick:** write `grep '[s]leep 300'` rather than `grep sleep` so the `grep` line doesn't match itself — the character class `[s]` matches `s`, but the grep string as it appears in `ps` is `[s]leep`, so it can't self-match.

### `ps`: narrow by default, wide with `-ef`

Bare `ps` only lists the processes of the **current terminal**. The commonly used variants:

| Command | What you get |
|---|---|
| `ps` | This terminal's processes |
| `ps -ef` | **Every** process, in full (PID, PPID, command) |
| `ps -u $USER` | All of your processes |
| `pgrep -a sleep` | A quick search by name, with the command line |

`pgrep` for real:

```text
$ pgrep -a sleep
127892 sleep 250
$ pgrep sleep        # chỉ PID
127892
```

### Foreground / background: `fg`, `bg`, Ctrl-Z, Ctrl-C

The four operations below are **interactive and illustrative** (Ctrl-Z / Ctrl-C need a real terminal and can't be run in a non-interactive environment):

```text
$ sleep 300          # đang chạy foreground, chiếm terminal
^Z                   # Ctrl-Z: gửi SIGTSTP → job DỪNG (stopped), trả prompt
[1]+  Stopped        sleep 300
$ bg %1              # cho chạy tiếp ở BACKGROUND
$ fg %1              # kéo lại FOREGROUND
^C                   # Ctrl-C: gửi SIGINT tới job foreground → kết thúc
```

Telling the two key combinations apart:

- **Ctrl-Z** = SIGTSTP → **stop** (stopped, not dead). Use it when you accidentally ran something long in the foreground and want to suspend it, do something else, then `bg`/`fg` later.
- **Ctrl-C** = SIGINT → **interrupt** (usually death). It's "cancel what's running".

### Why a background job dies on logout — and how to keep it alive

A background job is the **shell's child**. When the shell exits it sends **SIGHUP** (hangup) down to its children → the background job dies with it. Two ways out of that fate:

**`disown` — remove the job from the shell's table:**

```text
$ sleep 200 &
PID job: 127393
$ disown %1
jobs sau disown:
[bang job cua shell da rong]
```

After `disown`, `jobs` is empty — the shell no longer "owns" it, so on logout it won't send SIGHUP to it. But since it's off the job table, **you can no longer use `%1`** — to kill it you need the PID.

**`nohup` — wrap it from the start, ignoring SIGHUP + redirecting output:**

```text
$ nohup sleep 240 >/dev/null 2>nohup.err &
nohup sleep 240, PID=128505 — bo qua SIGHUP, doc lap voi shell
$ ps -o pid,stat,comm -p 128505
    PID STAT COMMAND
 128505 S    sleep
```

`nohup` does two things: it makes the process **ignore SIGHUP**, and (since the process loses its terminal) it writes output to `nohup.out` if you don't redirect it.

**Which to pick:**

| Situation | Use |
|---|---|
| You know up front it'll run long and you want to leave the terminal | `nohup cmd &` (decided from the start) |
| You already ran `cmd &` and now want to rescue it | `disown %1` (rescues a running job) |
| You need it to survive *and* to be able to look at it and come back | `tmux` / `screen` (better than both — its own page) |

### Signals: SIGTERM vs SIGKILL — evidence from a real run

The signal numbers (really run via `kill -l TERM` etc.):

| Signal | Number | Meaning | Can it be blocked/trapped? |
|---|---|---|---|
| SIGHUP | 1 | Shell/terminal closed | Yes |
| SIGINT | 2 | Ctrl-C, interrupt | Yes |
| SIGKILL | 9 | Forced death | **No** |
| SIGTERM | 15 | Please stop (`kill`'s default) | Yes |

Because SIGTERM **can be trapped**, a process may ignore it. A real demo — a script with `trap "..." TERM` refuses to die on SIGTERM, but has no answer to SIGKILL:

```text
=== SIGTERM vs SIGKILL: process bat SIGTERM de tu choi dung ===
pid la 128514
gui SIGTERM (15):
process 128514 VAN SONG — no trap SIGTERM
gui SIGKILL (9) — khong the trap:
bash: line 27: 128514 Killed
process 128514 da chet
```

That's exactly why the standard procedure is: **`kill PID` (SIGTERM) first** — giving the process a chance to close files, flush buffers, write logs, remove locks. Only if it's stubborn do you reach for `kill -9 PID` (SIGKILL). Reversing the order = lost data, leftover lock files, a corrupt DB.

The forms of the call:

```bash
kill 128514        # = kill -15, send SIGTERM by PID
kill -9 128514     # SIGKILL
kill %1            # by job number
killall sleep      # by NAME (every process with that name)
pkill -f "sleep 300"   # by pattern against the full command line
```

### `top` / `htop`

`top` (preinstalled) and `htop` (nicer, needs installing) are **interactive** screens tracking CPU/RAM/PID in real time; inside `top` press `k` then enter a PID to kill it. Use them to see "what's eating the CPU"; no output is pasted here because it's interactive and changes constantly.

## Trade-offs

| Choice | You get | You lose / the trap |
|---|---|---|
| `cmd &` | Fast, one character | Dies on logout; output still pours onto the terminal |
| `nohup cmd &` | Survives logout, output collected into a file | You have to remember to redirect, and you lose interactivity |
| `disown` | Can rescue an already-running job | You lose `%n` and have to manage it by PID |
| `tmux`/`screen` | Survives *and* you can come back to it | You have to learn the tool and install it |
| SIGTERM (`kill`) | Clean, allows cleanup | The process can ignore it / hang |
| SIGKILL (`-9`) | Certain death | No cleanup → locks, half-written data, zombie children |

## Common Mistakes

- **Confusing `%1` with a PID.** `kill 1` sends to **init/systemd** (PID 1), not job 1 — extremely dangerous on a real machine. A job number needs the `%`: `kill %1`.
- **Reaching for `kill -9` as the first reflex.** It steals the chance to clean up → stuck lock files, half-written data, orphaned children. `-9` is the **last resort**.
- **Thinking `cmd &` means "runs in the background forever".** It doesn't — it's tied to the shell, and logout kills it. To make it last: `nohup`/`disown`/`tmux`.
- **`grep` matching itself** in `ps -ef | grep sleep` (you see the grep line too). Use `grep '[s]leep'` or `pgrep`.
- **`killall` matches by name** → easy to kill several same-named processes by mistake. Check with `pgrep -a name` before firing.
- **Forgetting where `nohup`'s output goes** — into `nohup.out` in the current directory if you don't redirect it.

## FAQ

<details>
<summary>What's the difference between `kill %1` and `kill <PID>`? When must I use the PID?</summary>

`%1` is only understood in **the shell running that job**. In another terminal, or after a `disown`, or for a process spawned by someone or something else — `%1` is meaningless and you need the **PID** (the system-wide number, from `ps`/`pgrep`/`jobs -l`/`$!`). `$!` is the PID of **the most recent** background command.

</details>

<details>
<summary>Why can't SIGKILL be trapped when SIGTERM can?</summary>

The kernel deliberately makes SIGKILL (9) and SIGSTOP impossible for a process to catch, block or ignore — otherwise a buggy or malicious process could make itself immortal. With SIGTERM (15) the process **is allowed** to install a handler (`trap`) to clean up before exiting — that's a feature, not a hole. The price: a process can abuse it to ignore SIGTERM, which is exactly why `-9` exists as a backstop.

</details>

<details>
<summary>`nohup` or `disown` — how do I choose correctly?</summary>

Decide by timing: if you **know up front** it'll run long and you'll leave the terminal → `nohup cmd &` from the start (with the bonus of output collected into a file). If you **already** typed `cmd &` and only then realised you need to leave → `disown %1` to take it off the job table so it doesn't get SIGHUP. Neither lets you *go back* and watch the process — for that, use `tmux`/`screen`.

</details>

<details>
<summary>My job says "Stopped" rather than "Running" — what does that mean?</summary>

`Stopped` = the process is **suspended** (usually by Ctrl-Z sending SIGTSTP), still alive but getting no CPU. To resume it: `bg %1` (in the background) or `fg %1` (pull it to the foreground). Don't confuse it with `Terminated`/`Done` — those mean it's dead.

</details>

## Related Topics

- [What a shell is](shell-la-gi.md)
- [Exit codes and control flow](exit-code-va-control-flow.md)
- [File permissions](file-permissions.md)
- [Writing safe scripts](../skills/viet-script-an-toan.md)
- [Bash command cheatsheet](../cheatsheets/commands.md)

## References

- `man 7 signal` — the list of signals and their semantics.
- `man kill`, `man ps`, `man pgrep`, `help jobs` (a bash builtin).
- `man nohup`, `help disown`.
