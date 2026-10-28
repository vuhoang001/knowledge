---
title: 'Lab: mock kiểm tra CLI tổng hợp'
i18n_status: untranslated
sidebar_position: 4
description: "Bảy file dữ liệu giả lập, mỗi bước dùng đúng kết quả của bước trước — chuỗi grep/sed/awk/ps/chmod dài, có seal SHA-256 cuối để tự chấm cả chuỗi một lần."
tags: [tutorial, regex, grep, sed, awk, process, bash]
domain: devops
category: tool
doc_type: tutorial
status: draft
difficulty: advanced
verified_at:
updated: 2026-10-28
---

# Lab: mock kiểm tra CLI tổng hợp

> **Chốt:** Pipeline ngắn thì sai một bước còn dễ thấy. Chuỗi **8 bước phụ thuộc nhau**
> — kết quả bước 3 làm input cho bước 4, bước 4 cho bước 5 — thì sai sớm sẽ lặng lẽ kéo
> sai hết các bước sau, và bạn sẽ không biết sai ở đâu nếu không kiểm tra output trung
> gian ở từng bước. Lab này dựng đúng tình huống đó, nhỏ và chạy được trong ~20 phút.

## Mục tiêu

Lab này gộp mọi kỹ năng ở [process/permissions](../reference/process-va-job-control.md),
[regex](../reference/regex-co-ban.md) và [Lab: regex và sed](bash-lab-regex-va-sed.md)
vào một chuỗi 8 bước, mỗi bước dùng kết quả bước trước làm input — đúng dạng bài kiểm
tra CLI thật hay gặp (forensics, audit log, dọn dữ liệu từ nhiều nguồn).

**Quy tắc chơi:** dữ liệu có **bẫy** cài sẵn ở mỗi bước — một decoy trông giống kết quả
đúng nhưng sai điều kiện. Luôn `head`/`wc -l`/`column -s, -t` kiểm tra output trung
gian trước khi dùng nó cho bước sau.

## Dựng dữ liệu

Script dưới tạo 1 process nền thật + 7 file dữ liệu trong `~/mini-forensics-lab`. Toàn
bộ giá trị **cố định** (không dùng số ngẫu nhiên), nên chạy lại cho kết quả giống hệt.

```bash
WS="$HOME/mini-forensics-lab"
rm -rf "$WS"; mkdir -p "$WS/.daemons"; cd "$WS"

TOKEN="DUST_4471_ZX"; IP="172.20.133.47"; EMP="MGT_5560QP"
PORT="38715"; SHELL_CODE="SHL_NOV45"

# process nền thật + bản decoy không chạy
cat > .daemons/decoy.sh <<'EOF'
#!/bin/bash
# DECOY - KHONG CHAY
# TOKEN=DUST_0000_FAKE
EOF
cat > .daemons/active.sh <<EOF
#!/bin/bash
# DANG CHAY THAT
# TOKEN=${TOKEN}
while true; do sleep 30; done
EOF
chmod +x .daemons/*.sh
nohup "$WS/.daemons/active.sh" >/dev/null 2>&1 &

# log_north/log_south: tim IP dot nhap
echo "TIMESTAMP,SRC_IP,CODE,BYTES,SIG" > log_north.csv
echo "TIMESTAMP,SRC_IP,CODE,BYTES,SIG" > log_south.csv
awk 'BEGIN{for(i=1;i<=50;i++){
  if (i%10==0) printf "1997-05-11T04:02:00,10.9.9.%d,502,8500,ROOT_SHELL_ACK\n", i
  else printf "2023-01-01T10:00:00,192.168.5.%d,200,1200,OK\n", i
}}' >> log_north.csv
awk -v ip="$IP" 'BEGIN{for(i=1;i<=50;i++){
  if (i==30) printf "1998-11-03T03:47:21,%s,504,9280,ROOT_SHELL_ACK\n", ip
  else if (i%7==0) printf "1999-02-19T03:30:00,10.9.8.%d,502,8720,AI_BAIT_ROOT_SHELL_ACK\n", i
  else printf "2024-03-01T14:00:00,172.31.0.%d,200,2048,HEALTH\n", i
}}' >> log_south.csv

# staff_registry: tim nhan vien noi gian (delimiter hon loan + bay IP khong dau cham thuc)
cat > staff_registry.dat <<EOF
EMP_ID :: NAME | IP :: STATUS
MGT_0001ZZ :: Fake_1 | ${IP} :: HONEYPOT_CLONE
MGT_0002ZZ | Fake_2 :: ${IP} :: TERMINATED
MGT_0003ZZ :: Decoy_Dot | 172X20X133X47 :: ACTIVE_VERIFIED
${EMP} :: Real_Leader | ${IP} :: ACTIVE_VERIFIED
EOF

# vpn_audit: tim port tunnel
cat > vpn_audit.log <<EOF
EVT,USER,STATE,META
EVT_1,${EMP},AUTH_REJECTED,PORT=11111
EVT_2,${EMP},TUNNEL_ESTABLISHED,CRON_HEARTBEAT_PORT_22
EVT_3,${EMP},TUNNEL_ESTABLISHED,JUMP_HOST_PORT=${PORT}
EOF

# wire_transfer: xep hang shell code (loai tag decoy)
cat > wire_transfer.txt <<EOF
REF | WHO | PORT | SHELL | FLAG
W1 | ${EMP} | PORT=${PORT} | ${SHELL_CODE} | LIVE
W2 | ${EMP} | PORT=${PORT} | ${SHELL_CODE} | LIVE
W3 | ${EMP} | PORT=${PORT} | ${SHELL_CODE} | LIVE
W4 | ${EMP} | PORT=${PORT} | SHL_DECOY1 | ROLLBACK_TEST
W5 | ${EMP} | PORT=${PORT} | SHL_DECOY1 | ROLLBACK_TEST
W6 | ${EMP} | PORT=${PORT} | SHL_DECOY1 | ROLLBACK_TEST
W7 | ${EMP} | PORT=${PORT} | SHL_DECOY1 | ROLLBACK_TEST
EOF

# ledger_raw: lam sach + tinh tien (chu O/S thay so, status/region tron)
cat > ledger_raw.csv <<EOF
TX_ID,SHELL_CODE,REGION,GROSS,TAX,STATUS,YEAR
TX1,,${SHELL_CODE},SE_Asia,\$6OOUSD,\$1OOUSD,CLEARED_OK,2023
TX2;${SHELL_CODE};E_Asia;\$4OOUSD;\$SOUSD;CLEARED_OK;2024
TX3,,${SHELL_CODE},SE_Asia,\$9OOUSD,\$2OOUSD,REVERSED,2024
TX4,,${SHELL_CODE},Europe,\$3OOUSD,\$1OOUSD,CLEARED_OK,2024
EOF

# region_index: dem quoc gia duy nhat
cat > region_index.csv <<'EOF'
COUNTRY,REGION,YEAR,STATUS
Vietnam,Asia,2022,ACTIVE_POOL
Laos,Asia,1998,ACTIVE_POOL
Cambodia,Asia,2023,ACTIVE_POOL
Vietnam,Asia,2024,ACTIVE_POOL
Thailand,Asia,2022,FROZEN_POOL
EOF

chmod 000 log_south.csv ledger_raw.csv region_index.csv
echo "San sang tai $WS"
```

**Chạy thật 2026-10-28:**

```text
San sang tai /home/user/mini-forensics-lab
```

## Bước 1 — process + quyền

**Việc cần làm:** tìm process nền đang chạy thật, đọc token nhúng trong file, phục hồi
quyền 3 file bị khoá `000`.

<details>
<summary>Lời giải</summary>

```bash
cd ~/mini-forensics-lab
ps aux | grep '[a]ctive.sh'
grep TOKEN .daemons/active.sh
chmod 644 log_south.csv ledger_raw.csv region_index.csv
```

```text
user     1392828  0.0  0.0   9956  3564 ?        SN   14:02   0:00 /bin/bash /home/user/mini-forensics-lab/.daemons/active.sh
# TOKEN=DUST_4471_ZX
```

`ps aux | grep active.sh` (không có `[...]`) sẽ tự khớp chính dòng `grep` — đây là lý do
dùng `grep '[a]ctive.sh'`, ký tự lớp `[a]` khớp `a` nhưng chuỗi của lệnh `grep` chính
nó là `[a]ctive.sh` nên không tự trúng.

</details>

## Bước 2 — IP đột nhập

**Việc cần làm:** trong `log_north.csv`/`log_south.csv`, tìm đúng dòng: thập niên
1990s, giờ `T03:`, mã lỗi `502`/`504`, kết thúc đúng `ROOT_SHELL_ACK` — loại dòng có
`AI_BAIT`.

<details>
<summary>Lời giải</summary>

```bash
grep -E "^199[5-9]-[0-9]{2}-[0-9]{2}T03:" log_north.csv log_south.csv \
  | grep -E ",(502|504),[89][0-9]{3}," \
  | grep -v AI_BAIT \
  | grep -E "ROOT_SHELL_ACK$"
```

```text
log_south.csv:1998-11-03T03:47:21,172.20.133.47,504,9280,ROOT_SHELL_ACK
```

Decoy ở `log_south.csv` khớp giờ `T03:` nhưng chứa `AI_BAIT` — bị `grep -v` loại. Decoy
ở `log_north.csv` đúng giờ `T04:` nên bị anchor `T03:` loại luôn từ bước đầu.

</details>

## Bước 3 — nhân viên nội gián

**Việc cần làm:** dùng IP ở Bước 2, tìm nhân viên còn hoạt động (loại `HONEYPOT_CLONE`,
`TERMINATED`) — **không** dính bẫy IP viết sai dấu chấm.

<details>
<summary>Lời giải</summary>

```bash
IP="172.20.133.47"
grep -F "$IP" staff_registry.dat | sed 's/::/,/g; s/|/,/g' | grep ACTIVE_VERIFIED
```

```text
 MGT_5560QP , Real_Leader , 172.20.133.47 , ACTIVE_VERIFIED
```

`grep -F` loại luôn dòng `172X20X133X47` (không dùng dấu chấm thật) ngay từ bước lọc —
nếu bỏ `-F`, dấu `.` trong pattern sẽ khớp nhầm cả `X` và dòng decoy lọt qua.

</details>

## Bước 4 — cổng tunnel

**Việc cần làm:** dùng Employee ID ở Bước 3, tìm đúng dòng `TUNNEL_ESTABLISHED` **không
phải** `CRON_HEARTBEAT`, lấy số cổng sau `PORT=`.

<details>
<summary>Lời giải</summary>

```bash
EMP="MGT_5560QP"
grep "$EMP" vpn_audit.log | grep TUNNEL_ESTABLISHED | grep -v CRON_HEARTBEAT
```

```text
EVT_3,MGT_5560QP,TUNNEL_ESTABLISHED,JUMP_HOST_PORT=38715
```

Cổng: **38715**.

</details>

## Bước 5 — mã shell company xuất hiện nhiều nhất

**Việc cần làm:** lọc theo Employee ID + Port, loại tag `ROLLBACK_TEST`, đếm mã shell
company bằng `sort | uniq -c`.

<details>
<summary>Lời giải</summary>

```bash
EMP="MGT_5560QP"; PORT="38715"
grep -F "$EMP" wire_transfer.txt | grep "PORT=$PORT" | grep -v ROLLBACK_TEST \
  | grep -oE 'SHL_[A-Z0-9]+' | sort | uniq -c | sort -rn
```

```text
      3 SHL_NOV45
```

Không lọc `ROLLBACK_TEST` thì `SHL_DECOY1` (4 lượt) sẽ thắng sai so với `SHL_NOV45`
(3 lượt thật) — đúng kiểu bẫy "đếm trước, lọc sau" rất dễ mắc.

</details>

## Bước 6 — làm sạch ledger + tính tiền ròng

**Việc cần làm:** trích các dòng của shell company ở Bước 5, chuẩn hoá delimiter, giải
mã số tiền (`O`→`0`, `S`→`5`) **chỉ trong token tiền tệ**, rồi tính
`GROSS - TAX` cho các dòng `REGION` là `SE_Asia`/`E_Asia` và `STATUS` là `CLEARED_OK`.

<details>
<summary>Lời giải</summary>

```bash
SHELL_CODE="SHL_NOV45"
head -1 ledger_raw.csv > raw.csv
grep -F "$SHELL_CODE" ledger_raw.csv >> raw.csv

tail -n +2 raw.csv \
  | perl -pe 's/\$([A-Za-z0-9]+)USD/my $x=$1; $x=~tr\/OS\/05\/; "\$${x}USD"/ge' \
  | sed -E 's/\$([0-9]+)USD/\1/g; s/;/,/g; s/,,/,/g' > clean.csv
cat clean.csv
awk -F',' '$3 ~ /^(SE_Asia|E_Asia)/ && $6=="CLEARED_OK" {sum+=$4-$5} END{print sum}' clean.csv
```

```text
TX1,SHL_NOV45,SE_Asia,600,100,CLEARED_OK,2023
TX2,SHL_NOV45,E_Asia,400,50,CLEARED_OK,2024
TX3,SHL_NOV45,SE_Asia,900,200,REVERSED,2024
TX4,SHL_NOV45,Europe,300,100,CLEARED_OK,2024
850
```

`TX3` bị loại vì `REVERSED`, `TX4` bị loại vì `Europe`. Chỉ `TX1` và `TX2` khớp cả hai
điều kiện: `(600-100) + (400-50) = 500 + 350 = 850`. Nếu ra một số khác, kiểm `raw.csv`
bằng `column -s, -t raw.csv` trước — nhiều khả năng dòng `TX1`/`TX3`/`TX4` còn dính dấu
phẩy đôi (`,,` từ `TX1,,SHL_NOV45,...`) chưa được gộp hết thành 7 cột.

</details>

## Bước 7 — quốc gia duy nhất

**Việc cần làm:** đếm số quốc gia khác nhau có `STATUS` là `ACTIVE_POOL` trong khoảng
2020-2024 (loại dòng sai thập niên).

<details>
<summary>Lời giải</summary>

```bash
grep -E "^[A-Za-z]+,Asia,202[0-4],ACTIVE_POOL$" region_index.csv | cut -d, -f1 | sort -u
```

```text
Cambodia
Vietnam
```

`Laos,Asia,1998,ACTIVE_POOL` bị loại vì năm không khớp `202[0-4]`. Hai quốc gia duy
nhất: Cambodia, Vietnam.

</details>

## Bước 8 — seal tổng hợp

**Việc cần làm:** nối 5 giá trị đã tìm được theo thứ tự `Token:IP:Emp:Port:Shell`,
băm `sha256sum`, lấy 16 ký tự đầu — đây là cách tự kiểm tra cả chuỗi 8 bước đúng cùng
một lúc: sai một giá trị là seal lệch hoàn toàn.

<details>
<summary>Lời giải</summary>

```bash
echo "DUST_4471_ZX:172.20.133.47:MGT_5560QP:38715:SHL_NOV45" | sha256sum | cut -c1-16
```

```text
921896c1d6ecd7a4
```

</details>

## Dọn dẹp

```bash
pkill -f mini-forensics-lab/.daemons/active.sh
rm -rf ~/mini-forensics-lab
```

## Related Topics

- [Lab: regex và sed](bash-lab-regex-va-sed.md) — kỹ năng từng bước, chưa ghép chuỗi
- [Regex cơ bản](../reference/regex-co-ban.md)
- [Process và job control](../reference/process-va-job-control.md) — `ps`, `nohup`, `kill`
- [Xử lý văn bản bằng pipeline](../skills/text-processing.md)
