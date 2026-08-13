---
title: Bash command cheatsheet
sidebar_position: 1
description: "A quick lookup table of bash commands by group — files, text, system, network, jobs, redirection and command-line shortcuts."
tags: [cheatsheet, commands, bash]
domain: devops
category: tool
doc_type: cheatsheet
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-05
---

# Bash command cheatsheet

> **Takeaway:** This is the table to consult while you're typing a command — the core syntax plus one line on what it's for. To learn the mechanisms properly, go to `reference/` and `skills/`.

## File operations

| Command | Syntax | What for / the trap |
|---|---|---|
| `cat` | `cat f1 f2` | Concatenate and print file contents. For large files use `less` rather than `cat`. |
| `cp` | `cp -r src/ dst/` | Copy; `-r` for directories, `-a` preserves metadata, `-i` asks before overwriting. |
| `mv` | `mv a b` | Move / rename. There's no `-r`; it overwrites silently, so add `-i` for safety. |
| `rm` | `rm -rf dir/` | Delete. `-rf` asks nothing and can't be undone — be careful with empty variables and `*`. |
| `touch` | `touch f` | Create an empty file or update the timestamp. |
| `ls` | `ls -lah` | List; `-l` detailed, `-a` including hidden files, `-h` readable sizes, `-t` sorted by time. |
| `find` | `find . -name '*.log' -mtime +7` | Find files by name/time/type; `-exec ... {} \;` runs a command on each result. |
| `head` | `head -n 20 f` | Print the first N lines (10 by default). |
| `tail` | `tail -f log` | Print the last N lines; `-f` follows a file being written (a log). |
| `chmod` | `chmod 755 f` / `chmod +x f` | Change permissions; octal numbers or `u/g/o + rwx`. |
| `chown` | `chown user:group f` | Change ownership; usually needs `sudo`, `-R` for recursion. |
| `ln` | `ln -s target link` | `-s` creates a symlink; without `-s` it's a hard link. |
| `mkdir` | `mkdir -p a/b/c` | Create a directory; `-p` creates the parent tree too and doesn't error if it exists. |
| `rmdir` | `rmdir d` | Delete an EMPTY directory; if it has contents use `rm -r`. |
| `du` | `du -sh dir/` | A directory's size; `-s` the total, `-h` readable. |
| `df` | `df -h` | Free disk space by mount point. |
| `file` | `file x` | Guess a file's real type from its content, not its extension. |
| `diff` | `diff -u a b` | Compare 2 files; `-u` for unified format (like git diff). |

## Text operations

| Command | Syntax | What for / the trap |
|---|---|---|
| `grep` | `grep -rin 'pat' .` | Find matching lines; `-r` recursive, `-i` case-insensitive, `-n` line numbers, `-v` inverted, `-l` filenames only. |
| `grep -E` | `grep -E 'a|b' f` | Extended regex (same as `egrep`); no escaping needed for `+ ? { } |`. |
| `sed` | `sed 's/a/b/g' f` | Substitute per line; `-i` edits in place, `-n '5p'` prints line 5. |
| `awk` | `awk '{print $2}' f` | Process by column; `-F,` sets the separator, `$0` is the whole line, `NR` the line number. |
| `cut` | `cut -d, -f1,3 f` | Slice columns; `-d` the delimiter, `-f` field numbers, `-c` by character. |
| `sort` | `sort -k2 -n -r f` | Sort; `-n` numeric, `-r` reversed, `-k` by column, `-u` deduplicated. |
| `uniq` | `sort f | uniq -c` | Collapse ADJACENT duplicate lines; `-c` counts. Requires a preceding `sort`. |
| `tr` | `tr 'a-z' 'A-Z'` | Translate/delete characters; `-d` deletes, `-s` squeezes repeats. Reads from stdin. |
| `wc` | `wc -l f` | Count; `-l` lines, `-w` words, `-c` bytes. |
| `nl` | `nl f` | Number the lines (skipping blank ones). |
| `tee` | `cmd | tee f` | Write stdin to a file AND to stdout; `-a` appends. |
| `fmt` | `fmt -w 80 f` | Re-wrap a paragraph to a column width. |

## Directories & navigation

| Command | Syntax | What for / the trap |
|---|---|---|
| `cd` | `cd path` / `cd` / `cd -` | Change directory; with no argument it goes to `$HOME`, `-` to the previous one. |
| `pwd` | `pwd` | Print the current absolute path. |
| `mkdir` | `mkdir -p a/b` | Create a directory along with its parent tree. |
| `pushd` | `pushd dir` | Change directory and push onto the stack. |
| `popd` | `popd` | Return to the directory on top of the stack. |

## System, network, SSH

| Command | Syntax | What for / the trap |
|---|---|---|
| `ps` | `ps aux` | List processes; filter with `ps aux | grep name`. |
| `top` | `top` / `htop` | Watch processes in real time; `htop` is easier on the eyes. |
| `kill` | `kill PID` | Send a signal (`TERM` by default); stop a process by PID. |
| `killall` | `killall name` | Kill by process NAME rather than PID. |
| `df` | `df -h` | Free disk space. |
| `du` | `du -sh .` | The current directory's size. |
| `uname` | `uname -a` | Kernel/OS information; `-r` the kernel version. |
| `date` | `date +%Y-%m-%d` | Print / format the date and time. |
| `cal` | `cal` | Print the month's calendar. |
| `ssh` | `ssh user@host -p 22` | Log in remotely; `-i key` specifies a private key. |
| `scp` | `scp f user@host:/path` | Copy a file over SSH; `-r` for directories. |
| `wget` | `wget -O f url` | Download a file; `-c` resumes a partial download, `-O` sets the output name. |
| `curl` | `curl -sSL url` | Make an HTTP call; `-o f` saves to a file, `-I` headers only, `-X POST -d` sends data. |
| `ping` | `ping -c 4 host` | Check connectivity; `-c` limits the packet count. |
| `dig` | `dig A example.com` | Query DNS; `+short` gives just the concise result. |
| `whois` | `whois domain` | Domain registration information. |
| `uptime` | `uptime` | How long the machine has been up, and the load average. |
| `whoami` | `whoami` | Print the current user. |
| `man` | `man cmd` | Read a command's documentation; `man -k word` searches by keyword. |
| `which` | `which cmd` / `type cmd` | Find a command's path; `type` also reports aliases/builtins/functions. |

## Compression

| Command | Syntax | What for / the trap |
|---|---|---|
| `gzip` | `gzip f` | Compress into `f.gz`; DELETES the original. `-k` keeps it. |
| `gunzip` | `gunzip f.gz` | Decompress a `.gz`. |
| `tar` | `tar -czf a.tgz dir/` | Archive + compress; `c` create, `x` extract, `t` list, `z` gzip, `f` the filename. |
| `zcat` | `zcat f.gz` | Print a `.gz`'s contents without decompressing to disk. |

## Jobs & processes

| Command | Syntax | What for / the trap |
|---|---|---|
| `&` | `cmd &` | Run in the background, returning the prompt immediately; logs still pour onto the terminal. |
| `jobs` | `jobs -l` | List the current shell's background jobs with their PIDs. |
| `fg` | `fg %1` | Bring a job to the foreground. |
| `bg` | `bg %1` | Resume a stopped job (`Ctrl-Z`) in the background. |
| `nohup` | `nohup cmd &` | Run regardless of the terminal closing; logs go to `nohup.out`. |
| `disown` | `disown %1` | Detach a job from the shell so it isn't killed on exit. |
| `kill` | `kill %1` / `kill PID` | Send `SIGTERM` — asking the process to stop cleanly. |
| `kill -9` | `kill -9 PID` | Send `SIGKILL` — forced immediate death, no cleanup. Only when `TERM` doesn't work. |

## Redirection & pipes, quickly

| Symbol | What for |
|---|---|
| `>` | Write stdout to a file, OVERWRITING. |
| `>>` | Write stdout to a file, APPENDING. |
| `<` | Take stdin from a file. |
| `2>` | Redirect stderr (for example `2> err.log`). |
| `2>&1` | Merge stderr into wherever stdout currently points. Place it AFTER `>`. |
| `&>` | Merge both stdout + stderr into a file (bash). |
| `|` | Connect this command's stdout to the next one's stdin. |
| `tee` | Fork in two: to a file and to stdout at once. |
| `/dev/null` | The black hole: `cmd > /dev/null 2>&1` discards all output. |
| `<<EOF` | Heredoc: feed several lines of text as stdin until `EOF`. |
| `<<<` | Here-string: feed one string as stdin, for example `grep x <<< "$var"`. |

## Command-line shortcuts

| Key | What for |
|---|---|
| `!!` | Repeat the command you just ran. |
| `!$` | Insert the LAST argument of the previous command. |
| `sudo !!` | Re-run the previous command with `sudo` (when you forgot). |
| `Ctrl-R` | Search backwards through the command history. |
| `Ctrl-C` | Interrupt (send `SIGINT` to) the running command. |
| `Ctrl-Z` | Suspend the command and push it into the background (use `fg`/`bg` to continue). |
| `Ctrl-A` / `Ctrl-E` | Jump to the start / end of the line. |
| `Ctrl-U` / `Ctrl-K` | Delete from the cursor to the start / to the end of the line. |
| `cd -` | Return to the directory you just left. |

## Related Topics

- [Text processing with pipelines](../skills/text-processing.md)
- [Finding files with find and xargs](../skills/find-va-xargs.md)
- [Processes and job control](../reference/process-va-job-control.md)
- [Streams and redirection](../reference/streams-va-redirection.md)
- [Test operator and expansion cheatsheet](test-operators-va-expansion.md)
