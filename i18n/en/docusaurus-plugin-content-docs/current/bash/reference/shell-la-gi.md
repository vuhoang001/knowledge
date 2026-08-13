---
title: What a shell is
sidebar_position: 1
description: "A shell is a program that turns text into processes — bash, sh and zsh differ in which syntax actually runs."
tags: [shell, bash, process, shebang]
domain: devops
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-05
---

# What a shell is

> **Takeaway:** A shell is a program that reads a command line and then `fork+exec`s a process — it's the operating system's REPL, and which "shell" you're running decides which syntax is valid.

## Goal

Understand that a shell is a process that reads commands and creates child processes, and know why the same script behaves differently under `sh`, `bash` and `zsh` — so you don't lose an afternoon debugging over a shebang.

## Overview

A shell is not a terminal. The terminal is the window that draws characters; the shell is the program running **inside** it, doing exactly one loop: read a line → parse it → if it's a builtin, do it itself; if it's an external command, `fork` a child process and `exec` the executable → wait for it to finish → print the prompt and repeat. That's a REPL (read–eval–print loop) for the whole operating system.

The confusing part: there are two kinds of command.

| Kind | What it is | Example | Why the distinction matters |
|---|---|---|---|
| **builtin** | A function inside the shell process itself, spawning no child | `cd`, `type`, `echo` (the builtin one) | `cd` **has to** be a builtin — a child process cannot change its parent's directory |
| **external** | An executable file on disk, which the shell `fork+exec`s | `/bin/ls`, `/usr/bin/python3` | The shell has to search `$PATH` to find the file; running it costs a new process |

And "shell" is a whole family of different programs:

| Shell | Role | Trap |
|---|---|---|
| `bash` | The common interactive shell on Linux; many extensions beyond POSIX | `[[ ]]`, arrays, `${var:-default}` only exist here and in zsh |
| `sh` | The minimal POSIX standard. On Ubuntu `/bin/sh` **is dash** | Writing `#!/bin/sh` and then using bash syntax → dies immediately |
| `zsh` | The default on macOS; enormous number of interactive features | Syntax close to bash, but arrays index from 1 — subtle differences |
| `dash` | A small, fast POSIX shell used to run system scripts | No `[[ ]]`, no arrays — it reports a syntax error the moment it sees `(` |

### login / interactive / non-interactive → which files get read

Bash reads different startup files depending on how it was invoked — this is the reason behind "I edited `.bashrc` but my SSH login doesn't pick it up".

| Shell kind | When | Files read |
|---|---|---|
| **login** | SSH login, `bash -l`, a real TTY | `/etc/profile` → `~/.bash_profile` (or `~/.bash_login` / `~/.profile`) |
| **interactive non-login** | Opening a new terminal tab on the desktop | `~/.bashrc` |
| **non-interactive** | Running `bash script.sh` | Nothing (except `$BASH_ENV` if set) |

Practical trick: put your configuration in `~/.bashrc`, then have `~/.bash_profile` `source ~/.bashrc` — that way both login and non-login shells pick it up.

## Examples

Everything below: **Really run 2026-08-05 · bash 5.3.9(1) on Ubuntu. Coreutils on this machine is uutils 0.8.0, not GNU — output may differ slightly from GNU coreutils.**

### `type` distinguishes a builtin from an external command

```bash
type cd        # builtin
type -a echo   # every place this name points to
```

```text
cd is a shell builtin
echo is a shell builtin
echo is /usr/bin/echo
echo is /bin/echo
```

`type -a` lists **every** meaning of a name, in the order the shell picks them. Here `echo` is both a builtin (the one that runs) and two external files — knowing this keeps you from being surprised when `echo` in a script isn't the `echo` you assumed.

`type` is a bash builtin, so it's the most accurate. `command -v` is the POSIX-portable name. `which` is an **external file** searching `$PATH` — it knows nothing about builtins or aliases, so it lies often:

```bash
command -v cd        # -> cd
which cd             # which: no cd in (...) — not found, because cd isn't a file
type ls              # on this box ls is aliased
```

```text
cd
ls is an alias for lsd
```

### PATH lookup, in order

```bash
echo "$PATH"
type -a python3
```

```text
/home/hoanggggf/.local/bin:...:/usr/local/bin:/usr/bin:/bin:...
python3 is /usr/bin/python3
python3 is /bin/python3
```

The shell walks `$PATH` **left to right** and uses the first match. Putting your own directory at the front of `$PATH` is how you "override" a system command — and also how a dirty `PATH` makes you run the wrong binary.

### A script with a shebang

```bash
cat > greet.sh <<'EOF'
#!/usr/bin/env bash
name=${1:-world}
if [[ "$name" == "root" ]]; then
  echo "hello, superuser"
else
  echo "hello, $name"
fi
EOF
chmod +x greet.sh
./greet.sh Thang
```

```text
hello, Thang
```

The `#!` (shebang) on the first line tells the kernel which interpreter to run the file with. `chmod +x` turns on the execute permission — without it, `./greet.sh` reports *Permission denied*. This uses `${1:-world}` (a default value) and `[[ ]]` — both bash syntax, and both break under `sh`, as shown next.

### The same script, `sh` versus `bash`

```bash
cat > arr.sh <<'EOF'
#!/bin/sh
arr=(a b c)
echo "${arr[1]}"
EOF
chmod +x arr.sh
./arr.sh      # the kernel reads the shebang -> runs it with /bin/sh = dash
bash arr.sh   # force it to run with bash
```

```text
./arr.sh: 2: Syntax error: "(" unexpected
exit=2
b
exit=0
```

This is the classic trap. The array `arr=(a b c)` is bash syntax. Because the shebang says `#!/bin/sh` and `/bin/sh` on Ubuntu is **dash**, dash errors out as soon as it sees `(`. Changing the shebang to `#!/usr/bin/env bash` makes it work. The same goes for `[[ ]]`:

```bash
sh   -c '[[ 1 == 1 ]] && echo ok'   # dash: [[: not found (exit 127)
bash -c '[[ 1 == 1 ]] && echo ok'   # ok
```

## Trade-offs

| Choice | You get | You lose |
|---|---|---|
| Shebang `#!/bin/sh` (POSIX) | Maximum portability, runs on every Unix, system scripts | No arrays, no `[[ ]]`, no `${var:-x}` — impoverished syntax |
| Shebang `#!/usr/bin/env bash` | All of bash's toys; `env` finds bash on `$PATH`, so it suits unfamiliar machines (macOS keeps bash in `/usr/local/bin`) | Depends on `$PATH`; requires bash to be installed |
| Shebang `#!/bin/bash` (hardcoded path) | Explicit, independent of `$PATH`, safer when running setuid | Dies on a system where bash isn't at `/bin/bash` |
| builtin | Fast, spawns no process, can change shell state (`cd`) | Few of them, fixed by the shell |
| external command | Countless tools, language-independent | Costs a `fork+exec` each time; has to be on `$PATH` |

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Writing `#!/bin/sh` but using arrays / `[[ ]]` | On Ubuntu `/bin/sh` is dash → `Syntax error: "(" unexpected`, the script dies |
| Assuming `sh script.sh` and `bash script.sh` are the same | `sh` ignores the shebang and forces a POSIX shell — bash syntax breaks even if the first line says `#!/bin/bash` |
| Using `which` to check a builtin or an alias | `which` is an external file, blind to builtins and aliases → reports "not found" even though the command works fine |
| Forgetting `chmod +x` and then running `./script.sh` | `Permission denied` — the file's contents are right and it still won't run |
| Believing `cd` in a child script can change the parent shell's directory | Impossible — `cd` is a builtin, each process has its own cwd, and a child can't change its parent's |
| Editing `~/.bashrc` and being surprised an SSH login ignores it | A login shell reads `~/.bash_profile`, not `~/.bashrc` |

## FAQ

<details>
<summary>What's the difference between a shell and a terminal?</summary>

The terminal (or terminal emulator: GNOME Terminal, iTerm, Kitty) is the program that draws characters and receives keystrokes. The shell (`bash`, `zsh`) is the program running inside it, doing the work of reading commands and creating processes. You can run a shell without a terminal (over an SSH pipe, from cron), and a terminal without a shell (running some other program directly).

</details>

<details>
<summary>Should I use `#!/usr/bin/env bash` or `#!/bin/bash`?</summary>

`#!/usr/bin/env bash` is more portable because `env` searches `$PATH` for bash — which matters on macOS/BSD where bash isn't at `/bin/bash`. In exchange it depends on `$PATH` and doesn't handle interpreter arguments well. `#!/bin/bash` is more certain for scripts running on a fixed Linux server, and mandatory when security is a concern (setuid). Default to `env`; only hardcode when you control the environment.

</details>

<details>
<summary>Why does `cd` have to be a builtin rather than an external program?</summary>

Changing the working directory (cwd) changes **process state**. If `cd` were an external file, the shell would have to `fork` a child to run it; the child would change its own cwd and then die — the parent shell's cwd wouldn't budge. For `cd` to have any effect, it has to run **inside** the shell process itself, i.e. be a builtin.

</details>

<details>
<summary>How do I tell which shell I'm in?</summary>

`echo "$0"` prints the name of the running shell (for example `-bash` for a login shell). `echo "$BASH_VERSION"` has a value under bash and is empty under dash/sh. Careful: `$SHELL` is only the **default login shell** from `/etc/passwd`, not the shell you're typing into — don't branch logic on it.

</details>

## Related Topics

- [Streams and redirection](streams-va-redirection.md)
- [Quoting and expansion](quoting-va-expansion.md)
- [Exit codes and control flow](exit-code-va-control-flow.md)
- [Writing safe scripts](../skills/viet-script-an-toan.md)
- [Bash command cheatsheet](../cheatsheets/commands.md)

## References

- `man bash` — the *INVOCATION* (login/interactive) and *SHELL BUILTIN COMMANDS* sections
- POSIX Shell Command Language: https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html
- `man 2 execve` — how the kernel handles the `#!` shebang line
