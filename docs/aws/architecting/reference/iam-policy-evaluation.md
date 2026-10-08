---
title: Policy evaluation
sidebar_position: 2
description: "Máy đánh giá quyền của IAM — thứ tự xét, vì sao boundary và SCP là phép giao, và ba chỗ quyền bị thu hẹp mà không ai gắn thêm Deny nào."
tags: [aws, saa-c03, iam, policy-evaluation, permission-boundary, scp, cross-account, pass-role, domain-1]
domain: cloud
category: concept
doc_type: reference
status: draft
difficulty: intermediate
verified_at:
updated: 2026-10-08
---

# Policy evaluation

> **Chốt:** Quyền hiệu lực là **phép giao**, không phải phép cộng. Một request được phép
> chỉ khi nó vượt qua **cả bốn** cửa — SCP, permission boundary, identity policy, resource
> policy — và **không** gặp `Deny` tường minh ở bất kỳ cửa nào. Thêm một `Allow` chưa bao
> giờ mở được thứ đang bị thu hẹp ở cửa khác.

[Access management](../../foundations/reference/access-management.md) ở tầng foundations
trả lời *IAM có những khối gì*. Tài liệu này trả lời câu khó hơn, và là câu SAA-C03
Domain 1 hỏi: **cho một request cụ thể, AWS quyết định cho qua hay không bằng cách nào.**

## Mục tiêu

Đọc xong phải trả lời được không cần tra: một user có `AdministratorAccess` mà gọi lệnh
vẫn `AccessDenied` thì có **bao nhiêu** chỗ có thể là nguyên nhân, và soát theo thứ tự nào.

## Tổng quan

### Năm luật quyết định mọi thứ

| # | Luật | Hệ quả thực tế |
|---|---|---|
| 1 | **Mặc định là deny** (implicit deny) | Không `Allow` nào khớp ⇒ từ chối. Không cần ai viết `Deny`. |
| 2 | **Explicit `Deny` luôn thắng** | Một `Deny` khớp là xong. Không `Allow` nào cứu được, kể cả `AdministratorAccess`. |
| 3 | **SCP và permission boundary chỉ LỌC, không CẤP** | Boundary cho `s3:*` mà identity policy không nói gì ⇒ vẫn không làm được gì. |
| 4 | **Cùng account:** identity *hoặc* resource policy allow là đủ.<br/>**Khác account:** cần **cả hai**. | Bucket policy một mình mở được cho principal cùng account; cross-account thì không. |
| 5 | **Role không có credential thường trú** | `AssumeRole` trả **ba** giá trị: AccessKeyId + SecretAccessKey + **SessionToken**. Thiếu token thứ ba là lỗi hay gặp nhất khi dùng tay. |

### Thứ tự xét — soát sự cố theo đúng thứ tự này

```text i18n-prose
request
  │
  ├─ 1. SCP (nếu account thuộc Organizations)      -> không qua thì dừng, log không nói rõ
  ├─ 2. Permission boundary (nếu principal có)     -> không qua thì dừng
  ├─ 3. Identity-based policy (user/group/role)    -+
  ├─ 4. Resource-based policy (bucket policy, …)   -+-> luật 4 ở trên
  ├─ 5. Session policy (nếu AssumeRole có truyền)  -> lại là phép giao nữa
  └─ Explicit Deny ở BẤT KỲ bước nào -> từ chối ngay, bỏ qua phần còn lại
```

Thứ tự này là lý do câu *"tôi là admin mà vẫn `AccessDenied`"* có **năm** nghi phạm, và
bốn trong năm cái **không nằm ở policy của user**. Đi soát từ policy của user trước là
cách chậm nhất.

### Ba chỗ quyền bị thu hẹp mà không ai gắn thêm `Deny`

Đây là phần trực giác sai nhiều nhất — cả ba đều là **phép giao**, không phải `Deny`:

| Cơ chế | Phạm vi | Công thức | Nhớ bằng |
|---|---|---|---|
| **SCP** | Mọi principal trong account thành viên của Organizations | quyền = SCP ∩ identity policy | *Trần của cả account.* Admin trong member account cũng không vượt. Không áp lên management account. |
| **Permission boundary** | Một user hoặc role cụ thể | quyền = boundary ∩ identity policy | *Hàng rào quanh một người.* Dùng để dev tự tạo role mà không tự cấp thêm quyền. |
| **Session policy** | Một session `AssumeRole` | quyền = session policy ∩ quyền của role | *Thu nhỏ tạm thời.* Cấp cho bên thứ ba ít quyền hơn chính role. |

Cả ba **không bao giờ cấp** quyền. Boundary allow `s3:*` trong khi identity policy chỉ
allow `dynamodb:*` ⇒ quyền hiệu lực là **`dynamodb:*`** bị boundary chặn hết, tức là
**không có quyền nào**. Giao của hai tập rời nhau là tập rỗng.

### `iam:PassRole` — quyền leo thang bị xem nhẹ nhất

Khi bạn bảo một service *"hãy chạy bằng role này"* (gắn role vào EC2, đặt role cho
Lambda, cho ECS task), AWS kiểm **hai** quyền:

1. Quyền gọi chính API đó — `lambda:CreateFunction`.
2. **`iam:PassRole`** cho đúng role đang trao.

Thiếu điều 2 thì lệnh thất bại dù điều 1 đã đủ. Và quan trọng hơn: **ai có
`iam:PassRole` rộng thì có quyền tương đương role rộng nhất họ trao được** — họ tạo một
Lambda mang role admin rồi chạy code trong đó. Vì vậy `iam:PassRole` với `Resource: "*"`
phải được cấp như cấp admin, không phải như một quyền phụ.

Cùng loại: `iam:CreatePolicyVersion` (viết lại nội dung policy đang được gắn),
`iam:AttachUserPolicy`, `iam:UpdateAssumeRolePolicy`.

### Trust policy — policy duy nhất quyết định *ai được vào*

Trust policy là **resource-based policy của role**. Hai điều kiện phải đủ cùng lúc:

- Trust policy của role phải `Allow` principal đó `sts:AssumeRole`.
- Nếu trust policy ghi **account root** (`arn:aws:iam::<account>:root`) thay vì đích danh
  principal, thì principal còn cần `sts:AssumeRole` trong identity policy của mình.

Ghi đích danh ARN của user/role trong trust policy thì không cần điều kiện thứ hai.
Cross-account thì luôn cần cả hai phía — đúng luật 4.

### Confused deputy, và hai condition key ngăn nó

Khi trust policy mở cho một **service** (`"Service": "glue.amazonaws.com"`), bạn đang nói
*"service này được assume role của tôi"* — nhưng service đó cũng phục vụ account khác.
Không có điều kiện gì thì một người lạ có thể nhờ chính service đó dùng role của bạn.

```json
{
  "Effect": "Allow",
  "Principal": {"Service": "glue.amazonaws.com"},
  "Action": "sts:AssumeRole",
  "Condition": {
    "StringEquals": {"aws:SourceAccount": "<your-account-id>"},
    "ArnLike":      {"aws:SourceArn": "arn:aws:glue:<region>:<account-id>:job/*"}
  }
}
```

`aws:SourceAccount` + `aws:SourceArn` khoá lại *"chỉ khi lời gọi phát sinh từ tài nguyên
của chính tôi"*. Đây là mẫu bắt buộc cho mọi service role, không phải tuỳ chọn.

### Bẫy toán tử: `ForAllValues` trên tập rỗng

Hai toán tử nhiều giá trị, nghĩa **ngược nhau**, và một cái có cửa hậu:

| Toán tử | Đúng khi |
|---|---|
| `ForAnyValue:` | **ít nhất một** giá trị trong request khớp |
| `ForAllValues:` | **mọi** giá trị trong request đều khớp — **và tập rỗng cũng thoả** |

Dòng in đậm là cái bẫy. Policy dưới đây *trông như* bắt buộc gắn tag, thực tế cho qua
request **không gửi tag nào**:

```json
{
  "Effect": "Allow",
  "Action": "ec2:RunInstances",
  "Resource": "*",
  "Condition": {
    "ForAllValues:StringEquals": {"aws:TagKeys": ["Project", "Owner"]}
  }
}
```

Vì không có tag nào ⇒ "mọi tag đều nằm trong danh sách" là **đúng**. Sửa bằng cách bắt
key phải có mặt:

```json
"Condition": {
  "ForAllValues:StringEquals": {"aws:TagKeys": ["Project", "Owner"]},
  "Null": {"aws:TagKeys": "false"}
}
```

`Null: "false"` nghĩa *"key này phải tồn tại trong request"*. Thiếu nó là lỗi thật, hay
gặp trong code review, và không có lệnh nào báo đỏ.

### Condition key hay hỏng trong đề

| Key | Dùng để |
|---|---|
| `aws:PrincipalOrgID` | Mở cho cả Organizations mà không liệt kê từng account ID |
| `aws:SourceAccount` · `aws:SourceArn` | Chống confused deputy ở service role |
| `aws:MultiFactorAuthPresent` | Bắt MFA cho hành động nguy hiểm, break-glass role |
| `aws:SecureTransport` | Chặn truy cập không TLS (`Deny` khi `false`) |
| `aws:RequestedRegion` | Khoá region được dùng — thường đặt ở SCP |
| `aws:PrincipalTag` ⇄ `aws:ResourceTag` | Tag-based access control: một policy cho nhiều team |

## Ví dụ

Bài tập chạy thật cho toàn bộ tài liệu này nằm ở
[**thư mục bài tập**](../tutorials/index.md) — ba bậc: cú pháp trên emulator, logic đánh
giá trên AWS thật, rồi mẫu production.

Một kết quả đã đo tay đáng đưa lên đây vì nó định hình cách học. Trên emulator AWS local,
**cùng một policy cho hai câu trả lời ngược nhau** tuỳ đường bạn hỏi:

| Đường hỏi | Với một principal chỉ có `Deny s3:*` | Đúng không |
|---|---|---|
| `aws iam simulate-principal-policy` | `explicitDeny` | ✅ |
| Gọi API thật (`aws s3 ls` bằng khoá đó) | **thành công**, `rc=0` | ❌ |

⇒ Emulator **có** máy đánh giá policy nhưng **không mắc nó vào đường xử lý request**. Hệ
quả cho việc học tài liệu này rất cụ thể: `simulate-principal-policy` ở đó đánh giá đúng
cả `Resource` scoping, policy qua group, `explicitDeny` ⇄ `implicitDeny` **và permission
boundary** — nên **phần lớn logic trên trang này học được miễn phí**. Thứ duy nhất phải
mang sang AWS thật là **enforcement**, cùng với bốn lệnh emulator không hỗ trợ
(`simulate-custom-policy`, `generate-credential-report`,
`get-account-authorization-details`, `generate-service-last-accessed-details`).

Bảng đo đầy đủ và output thật:
[bài tập cơ bản](../tutorials/bt-01-co-ban.md#e3-tự-đo-xem-emulator-đỡ-được-lệnh-nào).

:::warning Một chỗ lệch âm thầm của emulator

`put-user-permissions-boundary` **có hiệu lực** trong mô phỏng, nhưng
`get-user --query User.PermissionsBoundary` đọc lại trả về `null`. Tức là kiểm kê boundary
bằng `get-user` trên emulator sẽ báo *"không có boundary nào"* trong khi có. AWS thật trả
về `PermissionsBoundaryArn` đầy đủ.

:::

Dù sao thì **IAM trên AWS thật cũng miễn phí** — API, role, policy, Policy Simulator,
credential report, Access Advisor đều $0 — nên không có lý do tiền nào để tránh bậc hai.

## Bẫy trong đề

| Bẫy | Vì sao sai |
|---|---|
| Thêm `Allow` để mở thứ đang bị `Deny` tường minh | Luật 2 — `Deny` thắng, vĩnh viễn |
| Nghĩ permission boundary **cấp** quyền | Luật 3 — nó là phép giao, không cấp gì |
| Nghĩ SCP cấp quyền cho member account | Cũng luật 3 — SCP là trần, không phải nguồn |
| Cross-account chỉ sửa bucket policy | Luật 4 — khác account cần **cả hai** phía |
| Cấp `iam:PassRole` `Resource: "*"` như quyền phụ | Tương đương cấp admin |
| Trust policy mở cho service mà không có `aws:SourceArn` | Confused deputy |
| `ForAllValues` để "bắt buộc phải có tag" | Tập rỗng thoả; thiếu `Null` check |
| Dùng credential tạm mà quên `SessionToken` | Luật 5 — ba giá trị, không phải hai |
| Tin policy đã chặt vì lab emulator không báo lỗi | Emulator không đánh giá policy |

## Đánh đổi

| Quyết định | Được | Mất |
|---|---|---|
| Permission boundary cho mọi role dev tự tạo | Dev tự phục vụ mà không leo thang được | Thêm một tầng phải giải thích; lỗi `AccessDenied` khó đọc hơn |
| SCP siết region, siết service | Trần cứng cả tổ chức, admin cũng không vượt | Cần Organizations; chặn sai thì không ai trong account sửa được |
| Least privilege dựng từ CloudTrail | Có bằng chứng, cắt đúng quyền không dùng | Chỉ thấy quyền **đã** dùng — action theo quý sẽ bị cắt oan |
| Tag-based access control | Một policy cho N team, không nhân bản policy | Phụ thuộc tag đúng; tag sai là quyền sai, mà tag ai cũng sửa được |
| Mô phỏng trước khi apply | Bắt lỗi trước khi nó thành sự cố | Simulator **không** biết SCP và boundary — xanh ở đó vẫn có thể đỏ thật |

## Related Topics

- [Access management](../../foundations/reference/access-management.md) — bốn khối IAM, root user, Identity Center. Tầng nền của tài liệu này
- [Governance và compliance](../../foundations/reference/security-governance-compliance.md) — SCP và Organizations ở mức nhận diện service
- [Bài tập IAM](../tutorials/index.md) — ba bậc, chạy thật
- [Architecting (SAA-C03)](../index.md) — tầng chứa tài liệu này
