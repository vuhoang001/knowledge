---
title: Bài tập — IAM
sidebar_key: aws-architecting-tutorials
sidebar_position: 0
description: "Ba bậc IAM: cú pháp trên emulator, logic đánh giá trên AWS thật, rồi mẫu production. IAM trên AWS thật miễn phí nên hai bậc sau không tốn tiền."
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
Lý thuyết (doc reference)            ~30 phut, tra loi duoc 5 cau tu kiem
10 Co ban      I1 -> I8              1 buoi   — thuoc tay cu phap
   I9 bai bay                        10 phut  — thay gioi han emulator
--- xong 3 viec an toan tien roi moi qua AWS that ---
20 Trung binh  I10 -> I20            2 buoi
30 Production  P1 -> P8              3-4 buoi (P5 can account thu hai)
```

🔴 **Vì sao bậc 10 không đủ.** Đã đo tay: emulator nhận `put-user-permissions-boundary`
rồi bỏ qua khi xét request, và **không hỗ trợ** `simulate-custom-policy`,
`simulate-principal-policy`, `generate-credential-report` — đúng ba lệnh dùng để kiểm
chứng quyền. Bảng đo đầy đủ ở
[Cơ bản](bt-01-co-ban.md#lệnh-iam-nào-emulator-đỡ-được).

Bài nào **dự đoán sai** thì ghi lại riêng. Bài làm trúng không dạy gì thêm.

## Related Topics

- [Policy evaluation](../reference/iam-policy-evaluation.md) — lý thuyết của cả ba bậc
- [Architecting (SAA-C03)](../index.md) — tầng chứa thư mục này
- [Access management](../../foundations/reference/access-management.md) — bốn khối IAM ở tầng foundations
