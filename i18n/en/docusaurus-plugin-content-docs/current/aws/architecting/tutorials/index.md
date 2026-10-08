---
title: Bài tập — IAM
i18n_status: untranslated
sidebar_key: aws-architecting-tutorials
sidebar_position: 0
description: "60 bài IAM có lời giải, ba bậc: emulator (26 bài, output thật), AWS thật (20 bài), production (14 bài). IAM trên AWS thật miễn phí nên cả ba bậc gần như $0."
tags: [tutorial, aws, iam, saa-c03]
domain: cloud
category: index
doc_type: index
updated: 2026-10-08
---

# Bài tập — IAM

Ba bậc, mỗi bậc chạy ở một chỗ khác nhau — và chỗ chạy là thứ quyết định bậc đó học được
gì. Emulator dạy cú pháp; chỉ AWS thật dạy được logic.

| # | Tài liệu | Chạy ở đâu | Trả lời câu hỏi | Trạng thái |
|---|---|---|---|---|
| 10 | [Cơ bản](bt-01-co-ban.md) | emulator local, miễn phí | 9 bài: user, group, role, policy, `assume-role` — kèm bảng đo lệnh nào emulator đỡ được | 📝 có output thật |
| 20 | [Trung bình](bt-02-trung-binh.md) | **AWS thật**, $0 | 11 bài: Policy Simulator, explicit deny, boundary là phép giao, `PassRole`, bẫy `ForAllValues` | 📝 có ô dán output |
| 30 | [Production](bt-03-production.md) | **AWS thật**, $0 | 8 bài: bỏ khoá tĩnh, OIDC cho CI, least privilege từ CloudTrail, SCP, break-glass | 📝 có ô dán output |

## Thứ tự làm

```text
Ly thuyet (reference)        ~30 phut  tra loi duoc 5 cau tu kiem
10 Co ban  A1-A6 B1-B6       1 buoi    danh tinh + policy, thuoc tay cu phap
           C1-C5             1 buoi    role, instance profile, STS
           D1-D6             1 buoi    MO PHONG — phan quan trong nhat
           E1-E3             30 phut   bay: mo phong dung ma API cho qua
--- xong 3 viec an toan tien roi moi qua AWS that ---
20 Trung binh  I1-I20        2-3 buoi
30 Production  P1-P14        3-4 buoi  (P9, P13 can account thu hai)
```

🔴 **Vì sao bậc 10 làm được nhiều hơn tưởng.** Đã đo tay 08/10/2026:
`simulate-principal-policy` **chạy được** trên emulator và **đánh giá đúng** — kể cả
`Resource` scoping, policy qua group, `explicitDeny` ⇄ `implicitDeny`, và permission
boundary. Nên phần lớn logic học xong **miễn phí** ở bậc 10.

**Thứ duy nhất emulator không làm được là thực thi:** cùng một principal có `Deny s3:*`,
`simulate-principal-policy` trả `explicitDeny` (đúng) nhưng gọi `aws s3 ls` thật thì
**thành công** (sai). Đó là nội dung bài
[E1](bt-01-co-ban.md#e1-bài-bẫy-lớn-mô-phỏng-nói-deny-api-vẫn-cho-qua), và là lý do bậc 20
tồn tại. Bảng đo đầy đủ:
[E3](bt-01-co-ban.md#e3-tự-đo-xem-emulator-đỡ-được-lệnh-nào).

Bài nào **dự đoán sai** thì ghi lại riêng. Bài làm trúng không dạy gì thêm.

## Related Topics

- [Policy evaluation](../reference/iam-policy-evaluation.md) — lý thuyết của cả ba bậc
- [Architecting (SAA-C03)](../index.md) — tầng chứa thư mục này
- [Access management](../../foundations/reference/access-management.md) — bốn khối IAM ở tầng foundations
