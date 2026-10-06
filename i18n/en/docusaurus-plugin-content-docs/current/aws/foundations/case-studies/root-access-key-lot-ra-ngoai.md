---
title: "Access key của root user lọt ra ngoài"
i18n_status: untranslated
sidebar_position: 3
description: "Hoá đơn nhảy, và không có policy nào gắn được để hãm lại — vì root không phải IAM user. Output thật chứng minh, kèm hai lệnh kiểm trong mười giây."
tags: [aws, clf-c02, root-user, iam, mfa, budgets, case-study]
domain: cloud
category: concept
doc_type: case-study
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-06
---

# Access key của root user lọt ra ngoài

**Nhãn: tình huống dựng lại.** Phần output CLI là **chạy thật** trên emulator AWS local ở
`~/aws-lab` ngày 06/10/2026 (`aws-cli/2.37.9`). Phần hoá đơn là **minh hoạ, chưa chạy** —
không có tiền thật nào bị tiêu ở đây.

## Bối cảnh

Một account AWS mở để học. Người dùng tạo **access key cho root user** vì đó là thứ Console
đưa ra sớm nhất và script chạy được ngay. Key được dán vào một file cấu hình, file đi theo
một commit, repo để public.

## Triệu chứng

*(Con số dưới là minh hoạ, chưa chạy.)* Vài giờ sau: hàng chục EC2 instance `p`-class ở ba
Region chưa từng dùng, và một Budgets alert vượt ngưỡng. Phản xạ đầu tiên của người xử lý là
**hãm quyền của cái key đang bị dùng** — gắn một policy chỉ-đọc cho nó, giữ nguyên để điều
tra.

Không làm được:

```bash
aws iam get-user --user-name root
```

```text
aws: [ERROR]: An error occurred (NoSuchEntity) when calling the GetUser operation:
The user with name root cannot be found.
```

```bash
aws iam attach-user-policy --user-name root \
  --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess
```

```text
aws: [ERROR]: An error occurred (NoSuchEntity) when calling the AttachUserPolicy operation:
The user with name root cannot be found.
```

Cùng một lỗi hai lần: **không có thực thể nào tên `root` trong IAM.**

## Giả thuyết sai lúc đầu

| Đã nghi | Vì sao sai |
|---|---|
| "Gõ sai tên — chắc là `Root` hoặc email của account" | Không có cách viết nào đúng; root **không nằm trong IAM** |
| "Thiếu quyền nên không gắn được policy" | Lỗi là `NoSuchEntity`, không phải `AccessDenied` |
| "Dùng SCP để hãm root của account này" | SCP **không áp lên root của management account**; và account đơn lẻ thì chưa có Organizations |
| "Đổi mật khẩu root là key hết hiệu lực" | Mật khẩu và access key là **hai credential độc lập** — đổi cái này không ảnh hưởng cái kia |

Giả thuyết cuối là chỗ mất thời gian thật, và là chỗ nguy hiểm nhất: đổi mật khẩu cho cảm
giác "đã xử lý" trong khi key vẫn đang hoạt động.

## Nguyên nhân thật

**Root user không phải một IAM user.** Nó là chủ sở hữu account, nằm *ngoài* IAM, và **có
toàn quyền không giới hạn, không gỡ bớt được bằng policy**. Đó là lý do mọi tài liệu AWS
nói cùng một câu: **root không được có access key.**

Hệ quả xếp theo đúng thứ tự xảy ra:

1. Key của root = toàn quyền trên account, **không có giới hạn nào gắn thêm được**.
2. Không có "least privilege" cho root — khái niệm đó cần một policy để gắn.
3. Cách duy nhất để chặn là **xoá/vô hiệu hoá chính cái key đó**.
4. Và chỉ **root** làm được việc xoá key của root.

## Vì sao không có phép thử nào bắt được sớm

| Phép thử | Kết quả | Vì sao không bắt được |
|---|---|---|
| `aws sts get-caller-identity` | Trả về ARN hợp lệ | Key hoạt động đúng — đó là vấn đề, không phải lỗi |
| Review IAM user và policy | Sạch sẽ | Không có IAM user nào liên quan; root không hiện ở đó |
| Quét secret trong repo | Thấy — **nếu có quét** | Phải bật từ trước; sau khi commit thì đã muộn |
| Xem hoá đơn hằng tháng | Thấy **cuối tháng** | Quá muộn — đây là lý do Budgets phải đặt từ ngày đầu |

Điểm chung: **không có cấu hình nào sai để phát hiện.** Hệ thống hoạt động đúng như thiết
kế; thứ sai là một quyết định đã đưa ra nhiều tuần trước đó.

## Cách sửa

Thứ tự này là thứ tự cần làm, không phải danh sách để chọn:

1. **Đăng nhập bằng root, xoá access key của root.** Chỉ root làm được.
2. **Bật MFA cho root** rồi đổi mật khẩu root.
3. Rà [CloudTrail](../reference/security-governance-compliance.md) xem key đã làm những gì,
   ở Region nào — kể cả Region không dùng.
4. Xoá tài nguyên lạ; mở case với AWS Support về phần phí phát sinh do lạm dụng.
5. Dựng lại cách truy cập đúng: một **IAM user**/danh tính qua Identity Center có quyền
   admin, hoặc **IAM role** cho ứng dụng — xem
   [access-management](../reference/access-management.md).
6. Đặt **AWS Budgets** ngưỡng nhỏ và **Cost Anomaly Detection** —
   [billing-and-cost-management](../reference/billing-and-cost-management.md).

## Dấu hiệu nhận ra sớm

Hai số trả lời được bằng một lệnh, và cả hai phải đúng giá trị mong muốn:

```bash
aws iam get-account-summary \
  --query 'SummaryMap.{AccountMFAEnabled:AccountMFAEnabled,AccountAccessKeysPresent:AccountAccessKeysPresent}'
```

```text
{
    "AccountMFAEnabled": 0,
    "AccountAccessKeysPresent": 0
}
```

Đọc hai số này đúng chiều:

| Trường | Giá trị mong muốn | Nghĩa |
|---|---|---|
| `AccountAccessKeysPresent` | **0** | Root **không có** access key — đúng |
| `AccountMFAEnabled` | **1** | Root **đã bật** MFA |

Output ở trên là từ một account emulator vừa dựng: `AccessKeysPresent: 0` đúng như mong
muốn, nhưng `MFAEnabled: 0` thì **chưa đạt** — và đó chính xác là trạng thái mặc định của
mọi account AWS mới. **Việc đầu tiên trên một account mới là sửa số thứ hai thành 1.**

**Trusted Advisor** cũng kiểm đúng hai thứ này ở trục security, và báo ngay cả ở mức
support thấp — xem [security-components](../reference/security-components.md).

## Related Topics

- [Access management](../reference/access-management.md) — root user, MFA, role, least privilege
- [Billing và cost management](../reference/billing-and-cost-management.md) — Budgets, Cost Anomaly Detection
- [Thành phần bảo mật](../reference/security-components.md) — Trusted Advisor kiểm MFA của root
- [Case study — Foundations](index.md)
