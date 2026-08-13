---
title: File permissions
sidebar_position: 5
description: "Permissions are three rwx groups for user/group/other — reading -rwxr-xr-x and changing it in octal covers nine tenths of the work."
tags: [permissions, chmod, chown, umask, bash]
domain: devops
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-05
---

# File permissions

> **Takeaway:** Every file has three permission groups — user (owner), group, other — each with three `rwx` bits. Being able to read the `-rwxr-xr-x` string in `ls -l` and change it in octal (`chmod 644`) covers nine tenths of the work. The nicest trap: `x` on a **directory** doesn't mean "execute", it means "may enter".

## Goals

- Look at `-rwxr-xr-x` and immediately unpack it: what kind of thing, and who can read/write/execute.
- Change permissions both ways: octal (`chmod 755`) and symbolic (`chmod u+x`).
- Understand why new files aren't world-writable by default (`umask`), and why `chmod 777` is nearly always a sign of doing something wrong.
- Tell `x` on a file apart from `x` on a directory — the classic confusion.

## Overview

The 10-character string at the start of an `ls -l` line, for example `-rwxr-xr-x`, breaks down as:

```
-      rwx        r-x        r-x
loại   user       group      other
```

- **The first character — the object's type:** `-` a regular file · `d` a directory · `l` a symlink (plus `c`, `b`, `s`, `p` for device/socket/pipe, rarely seen).
- **The remaining three groups of three bits** — in the order **user → group → other**:
  - `r` (read) = 4
  - `w` (write) = 2
  - `x` (execute) = 1
  - `-` = that bit is off.

Add the three bits within a group to get one octal digit. Three groups give three digits:

| Octal | String | Meaning | Used for |
|---|---|---|---|
| `644` | `rw-r--r--` | owner reads+writes, everyone else reads only | data files, ordinary config |
| `600` | `rw-------` | only the owner reads+writes | secrets, SSH keys, `.env` |
| `755` | `rwxr-xr-x` | owner does everything, everyone else reads+executes | scripts, programs, shared directories |
| `700` | `rwx------` | owner only, full rights | private directories/scripts |

A memory aid: `7=rwx`, `6=rw-`, `5=r-x`, `4=r--`, `0=---`.

**`x` on a directory is COMPLETELY different from `x` on a file.** On a file, `x` = "may be executed as a program". On a directory, `x` = "may **enter / access** what's inside" (traverse). Without `x` on a directory you can't read a file inside it even with `r`, and you can't `cd` into it. See the [Examples](#examples).

## Examples

*Really run 2026-08-05 · bash 5.3.9(1) on Ubuntu. Coreutils on this machine is uutils 0.8.0, not GNU — output may differ slightly from GNU coreutils.*
This box has `ls`→`lsd` aliased, so we have to call `command ls -l` to get the standard coreutils `-rwxr-xr-x` format.

### chmod in octal

```bash
$ touch data.csv
$ command ls -l data.csv
-rw-rw-r-- 1 hoanggggf hoanggggf 0 Aug  5 20:48 data.csv

$ chmod 644 data.csv; command ls -l data.csv
-rw-r--r-- 1 hoanggggf hoanggggf 0 Aug  5 20:48 data.csv

$ chmod 600 data.csv; command ls -l data.csv
-rw------- 1 hoanggggf hoanggggf 0 Aug  5 20:48 data.csv

$ chmod 755 data.csv; command ls -l data.csv
-rwxr-xr-x 1 hoanggggf hoanggggf 0 Aug  5 20:48 data.csv

$ chmod 700 data.csv; command ls -l data.csv
-rwx------ 1 hoanggggf hoanggggf 0 Aug  5 20:48 data.csv
```

A single `chmod 644` sets **all three groups at once** — which is why octal is fast and unambiguous when you want to set an absolute state.

### chmod in symbolic form

Symbolic form edits **relatively** (adding to or removing from the current state), which reads well when you only want to touch one bit:

```bash
$ chmod 644 data.csv; command ls -l data.csv
-rw-r--r-- 1 hoanggggf hoanggggf 0 Aug  5 20:48 data.csv

$ chmod u+x data.csv; command ls -l data.csv     # add x for the user
-rwxr--r-- 1 hoanggggf hoanggggf 0 Aug  5 20:48 data.csv

$ chmod go-r data.csv; command ls -l data.csv     # remove r from group + other
-rwx------ 1 hoanggggf hoanggggf 0 Aug  5 20:48 data.csv

$ chmod a+r data.csv; command ls -l data.csv       # a = all, add r for every group
-rwxr--r-- 1 hoanggggf hoanggggf 0 Aug  5 20:48 data.csv
```

The syntax: `[ugoa][+-=][rwx]`. `u`=user, `g`=group, `o`=other, `a`=all. `+` adds, `-` removes, `=` sets exactly.

### Worked example: the script that won't run because the execute bit is missing

This is a daily occurrence. You've just created a script, you run it, and it says "permission denied".

```bash
$ cat > hello.sh <<'EOF'
#!/usr/bin/env bash
echo "hello tu script"
EOF

$ command ls -l hello.sh
-rw-rw-r-- 1 hoanggggf hoanggggf 43 Aug  5 20:48 hello.sh
```

Not one `x` character — the file isn't marked executable. Try running it:

```bash
$ ./hello.sh
(eval):9: permission denied: ./hello.sh
[exit code: 126]
```

**Exit code 126 = "the command was found but there's no permission to run it"** (as opposed to 127 = "command not found"). Fix it by turning on the execute bit and running again:

```bash
$ chmod +x hello.sh
$ command ls -l hello.sh
-rwxrwxr-x 1 hoanggggf hoanggggf 43 Aug  5 20:48 hello.sh

$ ./hello.sh
hello tu script
```

Now there's an `x` in all three groups and the script runs. (If you want only the owner to be able to run it, use `chmod u+x` instead of `chmod +x`.)

### The execute bit on a DIRECTORY means "may enter"

Remove `x` from a directory and watch what happens even though the file inside is still `r`:

```bash
$ mkdir -p vault && echo "bi mat" > vault/secret.txt
$ chmod 644 vault          # rw-r--r--: the directory NO LONGER has x
$ command ls -ld vault
drw-r--r-- 2 hoanggggf hoanggggf 60 Aug  5 20:48 vault

$ cat vault/secret.txt
cat: vault/secret.txt: Permission denied
```

Without `x` on the directory you can't **access** the file inside — even though the file itself allows reading. Give `x` back:

```bash
$ chmod 755 vault
$ command ls -ld vault
drwxr-xr-x 2 hoanggggf hoanggggf 60 Aug  5 20:48 vault

$ cat vault/secret.txt
bi mat
```

The lesson: for a directory, `r` = "can list the filenames", `x` = "can enter / access the paths inside". To use a directory normally you need **both**; missing `x` leaves it crippled.

### umask: why a new file isn't 666

In theory a new file starts from `666` (`rw-rw-rw-`, never with `x` on creation) and a directory from `777`. `umask` is the mask that **turns bits off**:

```bash
$ umask
002

$ touch file-002.txt
$ command ls -l file-002.txt
-rw-rw-r-- 1 hoanggggf hoanggggf 0 Aug  5 20:48 file-002.txt   # 666 - 002 = 664
```

Change the umask to `022` (the common default on many Linux distributions) and a new file comes out `644`:

```bash
$ umask 022
$ touch file-022.txt
$ command ls -l file-022.txt
-rw-r--r-- 1 hoanggggf hoanggggf 0 Aug  5 20:48 file-022.txt   # 666 - 022 = 644

$ mkdir dir-022
$ command ls -ld dir-022
drwxr-xr-x 2 hoanggggf hoanggggf 40 Aug  5 20:48 dir-022        # 777 - 022 = 755
```

`umask 022` is why new files usually come out `644` rather than `666`: it **turns off the write bit for group and other** on every new file. It's the default fence that keeps you from accidentally creating a file anyone can write.

### chown: changing the owner (usually needs root)

`chown user:group file` changes ownership. Changing it **to another user** needs root — can't be run here, illustrative values:

```bash
# needs root, illustrative values, not run
$ sudo chown alice:developers data.csv
```

Changing it back to **yourself** doesn't need root, and really runs:

```bash
$ touch owned.txt
$ command ls -l owned.txt
-rw-rw-r-- 1 hoanggggf hoanggggf 0 Aug  5 20:48 owned.txt

$ chown "$(whoami)":"$(id -gn)" owned.txt
$ command ls -l owned.txt
-rw-rw-r-- 1 hoanggggf hoanggggf 0 Aug  5 20:48 owned.txt       # owner/group unchanged, still hoanggggf
```

## Trade-offs

- **Octal vs symbolic.** Octal (`chmod 644`) sets an **absolute** state — fast, unambiguous, and easy to use in a script because the result doesn't depend on the previous permissions. Symbolic (`chmod u+x`) edits **relatively** — it states the intent clearly when you're touching one bit, but the result depends on the current state. Use octal when you mean "set exactly this", symbolic when you mean "add/remove exactly this".
- **A strict vs loose umask.** `022` is safe (nobody but the owner can write) but when working as a team in a shared directory, the group can't write the files you create — you have to adjust by hand. `002` lets the group write (convenient for a team) but is looser. Choose by context; don't let the default decide for you.
- **`chmod +x` for everyone vs `u+x` for the owner alone.** `+x` (with no group named) turns on execute for group and other too — usually more than you wanted. A private script only needs `u+x`.

## Common Mistakes

- **`chmod 777` "to make it run".** `777` = `rwxrwxrwx` = anyone can read/write/execute → no protection left at all. Any user or process on the machine can modify or replace the file. It's nearly always a sign of misdiagnosing the problem: what you actually need is usually just `+x` on one file, or `x` on one directory, not throwing it open to the world. If you're about to type `777`, stop and ask "who actually needs to write?".
- **Forgetting `x` on a directory.** Granting `r` on a directory but forgetting `x` → you can list the names but can't open any file inside. A usable directory needs both `r` and `x`.
- **Confusing 126 with 127.** Running `./script.sh` and getting permission denied (exit 126) means **the execute bit is missing** — `chmod +x`. Exit 127 is **command not found** (wrong path / not installed) — a completely different thing, so don't go chmod-ing.
- **A recursive `chmod` over a directory.** `chmod -R 644 thumuc/` removes `x` from **the subdirectories too** → you can no longer enter them. For a mixed tree, use `find thumuc -type f -exec chmod 644 {} +` and `find thumuc -type d -exec chmod 755 {} +` to treat files and directories separately.
- **Fixing permissions when the problem is ownership.** Not being able to write a file isn't always about `w` — sometimes the file belongs to another user. Read the owner/group columns in `ls -l` carefully before reaching for `chmod`.

## FAQ

<details>
<summary>What's the difference between chmod and chown?</summary>

`chmod` changes **permissions** (`rwx` — who may do what). `chown` changes **ownership** (owner/group — *who* that user/group is). They work together: the "user" group's `rw-` permission only means something once you know who the owner is. Changing permissions hardly ever needs root; changing the owner to somebody else does.

</details>

<details>
<summary>Why does a new file never have the execute bit, even with a loose umask?</summary>

The starting point when creating a file is `666`, not `777` — the system deliberately does **not** grant `x` to new files, regardless of umask. That's why you always have to `chmod +x` a new script by hand. Only directories start from `777` (with `x`), because a directory needs `x` to be accessible at all.

</details>

<details>
<summary>What's the fourth digit in chmod (as in 4755, 2755, 1777)?</summary>

The digit in front of the three permission digits holds the **special bits**: `4`=setuid, `2`=setgid, `1`=sticky bit. For example `1777` on `/tmp` is the sticky bit — anyone can write there, but only each file's owner can delete that file. setuid/setgid make a program run with the file owner's or group's rights; that's a topic of its own and an attack surface to be careful with — use it only when you really understand it.

</details>

<details>
<summary>How do I quickly read `-rwxr-xr-x` as octal?</summary>

Split it into three clusters after the type character: `rwx`=4+2+1=7, `r-x`=4+0+1=5, `r-x`=5. Put them together: `755`. In reverse, `644` → split into `6=rw-`, `4=r--`, `4=r--` → `rw-r--r--`. Do it a few times and the `7=rwx / 6=rw- / 5=r-x / 4=r--` table sticks.

</details>

## Related Topics

- [What a shell is](shell-la-gi.md)
- [Processes and job control](process-va-job-control.md)
- [Writing safe scripts](../skills/viet-script-an-toan.md)
- [Bash command cheatsheet](../cheatsheets/commands.md)

## References

- `man chmod`, `man chown`, `man umask` — the GNU coreutils man pages.
- `info coreutils 'File permissions'` — the detailed chapter on the permission model.
