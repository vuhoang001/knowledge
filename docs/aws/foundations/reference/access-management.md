---
title: Access management
sidebar_position: 7
description: "User, group, role, policy — và vì sao quyền của một user thường không nằm ở user. Kèm output thật cho thấy emulator local KHÔNG đánh giá policy."
tags: [aws, clf-c02, iam, mfa, root-user, least-privilege, identity-center, domain-2]
domain: cloud
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-06
---

# Access management

> **Chốt:** IAM là **xác thực** (bạn là ai) cộng **phân quyền** (bạn được làm gì). Hai luật
> nhớ suốt kỳ thi: **mặc định là deny**, và **explicit deny thắng mọi allow**. Còn về
> root user: chỉ có **một** câu trả lời đúng — bật MFA, không tạo access key, không dùng
> cho việc thường ngày.

## Mục tiêu

Task 2.3 đòi: access key và password policy, nơi lưu credential, các phương thức xác thực
(MFA, IAM Identity Center, cross-account role), định nghĩa group/user/policy theo
**least privilege**, **việc chỉ root làm được**, cách bảo vệ root, và **federated identity**.

## Tổng quan

### Bốn khối của IAM

| Khối | Là gì | Dùng cho |
|---|---|---|
| **User** | Một danh tính lâu dài, có credential riêng | Một con người cụ thể, hoặc một ứng dụng ngoài AWS |
| **Group** | Tập user, **chỉ để gắn policy** | Phân quyền theo vai trò — không lồng group vào group được |
| **Role** | Danh tính **không có credential thường trực**, ai cũng có thể *assume* | EC2/Lambda gọi service khác; cross-account; federation |
| **Policy** | Văn bản JSON nói *được/không được* làm gì với tài nguyên nào | Gắn vào user, group, role, hoặc chính tài nguyên |

**Role là khối đáng hiểu nhất.** Nó phát credential **tạm thời**, hết hạn tự động — nên
không có gì để lộ lâu dài. Vì thế mọi câu hỏi dạng *"ứng dụng trên EC2 cần đọc S3, cách
nào an toàn nhất"* đều có đáp án **role**, không bao giờ là "lưu access key vào file cấu
hình trên instance".

### Hai luật đánh giá policy

1. **Deny mặc định.** Không có allow nào thì không được làm gì.
2. **Explicit deny luôn thắng.** Một deny ở bất kỳ policy nào — identity policy, resource
   policy, hay [SCP](security-governance-compliance.md) — phủ quyết mọi allow.

Hệ quả cho đề: thêm một allow **không** mở được thứ đang bị deny tường minh.

### Managed policy ⇄ custom policy

| Loại | Ai viết | Khi nào |
|---|---|---|
| **AWS managed** | AWS, cập nhật theo service mới (`ReadOnlyAccess`, `AdministratorAccess`) | Bắt đầu nhanh, trường hợp phổ biến |
| **Customer managed** | Bạn, dùng lại được nhiều nơi | Cần đúng least privilege |
| **Inline** | Bạn, nhúng vào **một** danh tính duy nhất | Quan hệ một-một không muốn dùng lại |

### Root user: danh sách việc chỉ nó làm được

| Việc chỉ root làm được |
|---|
| Đổi tên/địa chỉ email tài khoản, đổi gói hỗ trợ |
| Đóng tài khoản AWS |
| Đổi phương thức thanh toán, xem một số thông tin thanh toán |
| Khôi phục quyền IAM khi admin tự khoá mình ra ngoài |
| Đăng ký GovCloud, bật một số quyền truy cập billing cho IAM |

Cách bảo vệ, theo đúng thứ tự đề hay hỏi:

1. **Bật MFA** cho root.
2. **Không tạo access key** cho root — nếu đã có thì **xoá**.
3. Tạo một IAM user (hoặc danh tính qua Identity Center) có quyền admin để dùng hằng ngày.
4. Mật khẩu mạnh, khoá khôi phục giữ an toàn.

### Xác thực: ba con đường

| Cách | Nghĩa | Khi nào trong đề |
|---|---|---|
| **IAM user + password/access key** | Danh tính sống trong AWS | Số ít, hoặc ứng dụng ngoài |
| **IAM Identity Center** (trước là AWS SSO) | Một chỗ đăng nhập cho **nhiều account** và nhiều app, nối được với Active Directory hay IdP ngoài | *multiple AWS accounts*, *single sign-on*, *centrally manage access* |
| **Federation / Cognito** | Dùng danh tính có sẵn: AD, SAML IdP, Google/Facebook | *existing corporate directory* → Identity Center/Directory Service · *end users of a mobile app* → **Cognito** |

**Cognito là cho người dùng của ứng dụng bạn**, không phải cho nhân viên. Đây là ranh giới
đề hay hỏi: nhân viên công ty → Identity Center; hàng triệu người dùng app → Cognito.

### Nơi lưu credential

| Service | Dùng cho | Khác biệt quyết định |
|---|---|---|
| **AWS Secrets Manager** | Mật khẩu DB, khoá API | **Tự động rotate**; có phí theo secret |
| **AWS Systems Manager Parameter Store** | Tham số cấu hình, cả loại `SecureString` | Mức standard **miễn phí**; không tự rotate |

Trong đề: có chữ **rotate** thì là Secrets Manager; chỉ cần "lưu cấu hình, chi phí thấp
nhất" thì là Parameter Store.

### Least privilege, cụ thể

Cấp **vừa đủ quyền để làm xong việc**, không hơn. Hai thói quen đi kèm:

- Gắn policy vào **group**, không gắn lẻ vào từng user — sửa một chỗ, áp cho cả nhóm.
- Dùng **IAM Access Analyzer** và *last accessed information* để cắt quyền không dùng.

## Ví dụ

Chạy thật 06/10/2026 trên **emulator AWS local** ở `~/aws-lab` (cổng 4566),
`aws-cli/2.37.9`. Mọi lệnh gọi qua endpoint local, **không** gọi AWS thật.

Dựng đúng mô hình được khuyến nghị — policy gắn vào group, user chỉ thừa hưởng:

```bash
aws iam create-group --group-name ReadOnlyAnalysts
aws iam create-user  --user-name analyst-01
aws iam add-user-to-group --user-name analyst-01 --group-name ReadOnlyAnalysts
aws iam attach-group-policy --group-name ReadOnlyAnalysts \
  --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess
```

Giờ hỏi *"user này có policy gì"* theo cách trực giác nhất — và nhận về **rỗng**:

```bash
aws iam list-attached-user-policies --user-name analyst-01 --output text
```

Lệnh **không in ra dòng nào** — không phải lỗi, mà là câu trả lời: `analyst-01` không có
policy nào gắn trực tiếp. Quyền không nằm ở user. Nó nằm ở group:

```bash
aws iam list-groups-for-user --user-name analyst-01 --query 'Groups[].GroupName' --output text
aws iam list-attached-group-policies --group-name ReadOnlyAnalysts --output table
```

```text
ReadOnlyAnalysts
----------------------------------------------------------------
|                   ListAttachedGroupPolicies                  |
+--------------------------------------------------------------+
||                      AttachedPolicies                      ||
|+-----------------------------------------+------------------+|
||                PolicyArn                |   PolicyName     ||
|+-----------------------------------------+------------------+|
||  arn:aws:iam::aws:policy/ReadOnlyAccess |  ReadOnlyAccess  ||
|+-----------------------------------------+------------------+|
```

**Kết luận dùng được ngay:** kiểm quyền thực tế của một user phải đi qua **ba chỗ** —
policy gắn trực tiếp, policy qua group, và policy nhúng (inline). Một chỗ rỗng không nói
được gì.

### Và đây là chỗ lab local nói dối

Tạo access key cho `analyst-01` — danh tính chỉ có `ReadOnlyAccess` — rồi dùng chính key
đó để **ghi**:

```bash
aws iam create-access-key --user-name analyst-01
# dung key vua tao de goi tiep
aws s3 mb s3://test-least-privilege
aws iam create-user --user-name should-be-denied
```

```text
make_bucket: test-least-privilege
{
    "User": {
        "Path": "/",
        "UserName": "should-be-denied",
        "Arn": "arn:aws:iam::000000000000:user/should-be-denied",
        ...
    }
```

Cả hai lệnh **thành công**. Trên AWS thật, cả hai phải trả về
`AccessDenied` — `ReadOnlyAccess` không cho `s3:CreateBucket` lẫn `iam:CreateUser`.

**Emulator chấp nhận credential nhưng không đánh giá policy.** Nên nó dùng được để tập
*cú pháp* và *hình dạng* của IAM, và **không** dùng được để kiểm chứng rằng một policy
đã đủ chặt. Muốn kiểm việc đó thì dùng **IAM Policy Simulator** hoặc
`aws iam simulate-principal-policy` trên AWS thật.

Đây đúng là loại ảo giác đáng sợ nhất của lab mô phỏng: **xanh ở đây không chứng minh
được gì về least privilege.**

## Bẫy trong đề

| Bẫy | Vì sao sai |
|---|---|
| Lưu access key vào file cấu hình trên EC2 | Dùng **IAM role** gắn vào instance |
| Dùng root user cho việc thường ngày | Chỉ dùng root cho danh sách việc riêng của nó |
| Nghĩ thêm một allow sẽ mở được thứ đang bị deny | **Explicit deny luôn thắng** |
| Lồng group trong group | IAM group **không lồng được** |
| Chọn **Cognito** cho đăng nhập của nhân viên nhiều account | Đó là **IAM Identity Center** |
| Chọn **Parameter Store** cho "cần rotate mật khẩu DB tự động" | Đó là Secrets Manager |
| Tin rằng policy đã đúng vì lab local không báo lỗi | Xem mục [Ví dụ](#và-đây-là-chỗ-lab-local-nói-dối) |

## Đánh đổi

| Quyết định | Được | Mất |
|---|---|---|
| Role thay access key | Không có credential dài hạn để lộ | Phải hiểu trust policy; khó debug hơn |
| Identity Center thay IAM user | Một chỗ quản, tắt một người là tắt mọi account | Phải dựng và vận hành thêm một tầng |
| Managed policy thay custom | Nhanh, AWS tự cập nhật | Thường **rộng hơn mức cần** — ngược least privilege |
| Least privilege chặt | Giảm thiệt hại khi lộ | Ma sát vận hành; sẽ có lúc chặn chính nhóm mình |

## Related Topics

- [Shared responsibility model](shared-responsibility.md) — IAM là nửa không bao giờ chuyển sang AWS
- [Governance và compliance](security-governance-compliance.md) — SCP đặt trần trên IAM; KMS, Secrets Manager
- [Thành phần bảo mật](security-components.md) — Trusted Advisor báo root chưa bật MFA
- [Case study: access key của root lọt ra ngoài](../case-studies/root-access-key-lot-ra-ngoai.md)
- [AWS · Foundations](../index.md)
