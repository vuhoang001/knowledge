---
title: "Security group không chặn được một IP"
i18n_status: untranslated
sidebar_position: 1
description: "Thêm rule mãi mà IP kia vẫn vào được — vì API của security group không có tham số Action. Output thật chứng minh điều đó, không phải quy ước mềm."
tags: [aws, clf-c02, security-group, network-acl, vpc, case-study]
domain: cloud
category: concept
doc_type: case-study
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-06
---

# Security group không chặn được một IP

**Nhãn: tình huống dựng lại.** Không phải sự cố thật của chủ repo — nhưng phần output CLI
bên dưới là **chạy thật**, trên emulator AWS local ở `~/aws-lab` ngày 06/10/2026,
`aws-cli/2.37.9`.

## Bối cảnh

Một web server trong VPC, security group `kb-web` mở cổng 443 cho cả internet. Log cho
thấy một IP — `203.0.113.7` — đang dò liên tục. Yêu cầu: **chặn đúng IP đó**, giữ nguyên
443 cho mọi người còn lại.

## Triệu chứng

Người xử lý mở security group, thấy nó đang có một rule allow 443 từ `0.0.0.0/0`, và đi
tìm chỗ thêm một rule "deny cho `203.0.113.7`". Không tìm thấy trong Console. Thử bằng CLI
thì nhận lỗi trước cả khi request đi tới AWS:

```bash
aws ec2 authorize-security-group-ingress --group-id $SG \
  --ip-permissions '[{"IpProtocol":"tcp","FromPort":443,"ToPort":443,
    "IpRanges":[{"CidrIp":"203.0.113.7/32","Description":"deny this"}],"Action":"deny"}]'
```

```text
aws: [ERROR]: An error occurred (ParamValidation): Parameter validation failed:
Unknown parameter in IpPermissions[0]: "Action", must be one of: IpProtocol, FromPort,
ToPort, UserIdGroupPairs, IpRanges, Ipv6Ranges, PrefixListIds
```

Đọc kỹ dòng lỗi: nó **liệt kê toàn bộ tham số được phép**, và trong danh sách đó **không
có `Action`**. Không có chỗ nào để nói "không cho".

## Giả thuyết sai lúc đầu

| Đã nghi | Vì sao sai |
|---|---|
| "Rule mới bị rule `0.0.0.0/0` cũ che" | Security group **hợp** mọi rule lại, không có thứ tự ưu tiên — không có chuyện che |
| "Phải xoá rule `0.0.0.0/0` rồi liệt kê allow từng dải trừ IP đó" | Làm được nhưng vô lý: phải liệt kê gần hết không gian IPv4 |
| "Thiếu quyền IAM nên không thêm được" | Lỗi là **ParamValidation** ở phía client — request chưa rời máy |

Chỗ mất thời gian nằm ở giả thuyết đầu: nó hợp lý với trực giác firewall truyền thống, nơi
rule có số thứ tự và có deny.

## Nguyên nhân thật

**Security group chỉ biểu đạt được allow.** Đó là tính chất của mô hình, không phải giới
hạn của Console: những gì không được allow thì mặc định đã bị chặn, nên không có khái niệm
"deny" để thêm. Muốn **loại trừ** một nguồn cụ thể khỏi thứ đang được allow rộng thì phải
dùng công cụ có deny — **network ACL**, ở cấp subnet.

Cùng một ý định, đặt vào NACL thì API nhận ngay:

```bash
aws ec2 create-network-acl-entry --network-acl-id $NACL --rule-number 90 \
  --protocol tcp --port-range From=443,To=443 \
  --cidr-block 203.0.113.7/32 --rule-action deny --ingress
aws ec2 describe-network-acls --network-acl-ids $NACL \
  --query 'NetworkAcls[0].Entries[?RuleNumber==`90`]'
```

```text
[
    {
        "CidrBlock": "203.0.113.7/32",
        "Egress": false,
        "PortRange": {
            "From": 443,
            "To": 443
        },
        "Protocol": "6",
        "RuleAction": "deny",
        "RuleNumber": 90
    }
]
```

`RuleAction: deny` tồn tại ở đây và không tồn tại ở kia. **Hai công cụ, hai khả năng biểu
đạt khác nhau** — đó là toàn bộ nội dung của case này.

## Vì sao không có phép thử nào bắt được sớm

| Phép thử | Kết quả | Vì sao không bắt được |
|---|---|---|
| Xem lại rule của SG trong Console | "Trông đúng" | Rule allow 443 đúng thật; cái thiếu là thứ **không thể tồn tại** ở đây |
| `describe-security-groups` | Trả về bình thường | Không có gì sai để báo |
| Thử lại bằng Console | Không thấy nút deny | Dễ đọc thành "chưa tìm ra chỗ", không phải "không có" |

Loại lỗi này không hiện ra dưới dạng cấu hình sai. Nó hiện ra dưới dạng **một việc không
làm được bằng công cụ đang cầm**, và cảm giác chủ quan là "mình chưa tìm đúng chỗ".

## Cách sửa

1. Giữ security group như cũ: allow 443 từ `0.0.0.0/0`.
2. Thêm **NACL entry deny** cho `203.0.113.7/32` ở subnet chứa web server, **số rule nhỏ**
   hơn rule allow — NACL khớp theo thứ tự tăng dần và **dừng ở rule khớp đầu tiên**.
3. Nhớ **NACL là stateless**: nếu đã deny inbound thì không cần deny outbound, nhưng với
   mọi rule *allow* thì phải mở **cả hai chiều**, không thì kết nối treo im lặng.
4. Nếu thứ cần chặn là tấn công tầng ứng dụng (SQL injection, bot, rate) thì công cụ đúng
   là **AWS WAF**, không phải NACL.

## Dấu hiệu nhận ra sớm

Một câu hỏi tự đặt, trả lời được trong mười giây:

> Mình đang cần **mở** cho ai, hay cần **loại trừ** ai?

**Mở** → security group. **Loại trừ** → NACL. Và trong đề thi, cụm *"block a specific IP
address"* hay *"deny traffic from"* là tín hiệu gần như chắc chắn của NACL.

## Related Topics

- [Network](../reference/networking.md) — VPC, subnet, bảng đối chiếu SG ⇄ NACL đầy đủ
- [Thành phần bảo mật](../reference/security-components.md) — bốn tầng chặn: SG, NACL, WAF, Shield
- [Case study — Foundations](index.md)
