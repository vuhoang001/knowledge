---
title: IAM fundamentals
sidebar_position: 1
description: "Nền IAM từ số không: principal, bốn khối user/group/role/policy, giải phẫu policy JSON và ARN, sáu loại policy, và cách chẩn đoán AccessDenied."
tags: [aws, iam, saa-c03, policy, role, arn, sts, principal, domain-1]
domain: cloud
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-08
---

# IAM fundamentals

> **Chốt:** Mọi lời gọi API của AWS đều mang theo câu hỏi *"**ai** muốn làm **gì** trên
> **cái nào**, trong **điều kiện nào**"*. IAM là hệ thống trả lời câu đó. Bốn ô in đậm
> chính là bốn trường bạn viết trong policy — `Principal`, `Action`, `Resource`,
> `Condition` — nên học IAM thực chất là học viết câu trả lời cho bốn ô này.

Tài liệu này là **tầng nền**: đọc xong mới đọc được
[Policy evaluation](iam-policy-evaluation.md) (cơ chế đánh giá) và làm được
[bộ bài tập](../tutorials/index.md).

## Mục tiêu

Đọc xong phải trả lời được, không cần tra:

- Khi nào dùng **user**, khi nào dùng **role** — và vì sao câu trả lời gần như luôn là role.
- Mỗi trường trong một policy JSON có tác dụng gì, bỏ đi thì mất gì.
- Một ARN gồm mấy phần, vì sao ARN của S3 có hai ô trống.
- Có bao nhiêu **loại** policy, loại nào **cấp** quyền, loại nào chỉ **lọc**.
- Gặp `AccessDenied` thì soát theo thứ tự nào.

## Tổng quan

### 1. Xác thực ⇄ phân quyền: hai câu hỏi khác nhau

| Câu hỏi | Tên | AWS trả lời bằng |
|---|---|---|
| *Bạn là ai?* | **authentication** | access key, session token, SAML/OIDC assertion, mật khẩu + MFA |
| *Bạn được làm gì?* | **authorization** | policy |

Hai tầng này **độc lập**. Xác thực thành công **không** nghĩa là được làm gì —
credential hợp lệ mà không policy nào cho phép thì mọi lệnh đều `AccessDenied`. Ngược lại,
policy cho `Action: "*"` cũng vô dụng nếu credential sai.

Phân biệt được hai tầng là phân biệt được hai thông báo lỗi hoàn toàn khác nhau:

```text i18n-prose
InvalidClientTokenId / SignatureDoesNotMatch   -> hong o AUTHENTICATION (credential)
AccessDenied / UnauthorizedOperation           -> hong o AUTHORIZATION (policy)
```

### 2. Principal — "ai" trong câu hỏi

**Principal** là thực thể đang gọi API. Có bốn loại, và chúng khác nhau ở chỗ credential
đến từ đâu:

| Principal | ARN trông như | Credential |
|---|---|---|
| **IAM user** | `arn:aws:iam::123456789012:user/alice` | access key dài hạn, hoặc mật khẩu + MFA |
| **Assumed role** | `arn:aws:sts::123456789012:assumed-role/deploy/session-1` | **tạm**, do STS phát, tự hết hạn |
| **AWS service** | `ec2.amazonaws.com`, `lambda.amazonaws.com` | service tự assume role bạn trao |
| **Root user** | `arn:aws:iam::123456789012:root` | mật khẩu chủ account |

Chú ý ARN của assumed role: nó thuộc service **`sts`**, không phải `iam`, và chứa **tên
session**. Đó là lý do CloudTrail phân biệt được hai người cùng dùng một role — qua tên
session, không qua tên role.

:::danger Root user

Root là chủ account, **không phải** IAM user, nên **không gắn policy được** để hãm nó.
Chỉ có một cách dùng đúng: **bật MFA, không tạo access key, không dùng cho việc thường
ngày.** Danh sách việc chỉ root làm được ở
[Access management](../../foundations/reference/access-management.md).

:::

### 3. Bốn khối của IAM

#### User — một danh tính lâu dài

Dùng cho **một con người cụ thể**, hoặc một ứng dụng **ngoài** AWS không nói được
OIDC/SAML. Có credential thường trú: mật khẩu (đăng nhập console) và/hoặc access key
(gọi API).

Giới hạn cần biết: **2 access key** mỗi user — đủ để rotate, không đủ để lười.

🔴 **Production thì gần như không nên có IAM user cho người.** Thay bằng **IAM Identity
Center** (trước gọi AWS SSO): một chỗ đăng nhập cho nhiều account, nối được với AD hoặc
IdP ngoài, và phát credential **tạm**. Tắt một người ở IdP là tắt mọi account cùng lúc.

#### Group — tập user, chỉ để gắn policy

| Group làm được | Group **không** làm được |
|---|---|
| Chứa nhiều user | **Lồng group trong group** |
| Gắn policy, mọi user trong group thừa hưởng | Là principal — không gắn group vào `Principal` của policy |
| | Có credential |

Group là công cụ **tổ chức**, không phải danh tính. Hệ quả thực tế: hỏi *"user này có
policy gì"* bằng `list-attached-user-policies` sẽ ra **rỗng** nếu quyền nằm ở group —
xem [bài A4](../tutorials/bt-01-co-ban.md#a4-group-và-chỗ-quyền-thật-sự-nằm).

⇒ Kiểm quyền thật của một user phải đi qua **ba** chỗ: policy gắn trực tiếp, policy qua
group, policy inline.

#### Role — danh tính không có credential thường trú

Đây là khối quan trọng nhất, và là đáp án của phần lớn câu hỏi *"cách nào an toàn nhất"*.

Role **không có** access key. Ai muốn dùng thì phải **assume** nó, và nhận về credential
**tạm** tự hết hạn. Không có gì để lộ lâu dài.

Mỗi role mang **hai** policy, và lẫn hai cái này là lỗi phổ biến:

| Policy trên role | Trả lời câu | Sửa bằng lệnh |
|---|---|---|
| **Trust policy** (= resource-based policy của role) | *ai được vào role này* | `update-assume-role-policy` |
| **Permission policy** | *role này làm được gì* | `attach-role-policy` / `put-role-policy` |

Ba hoàn cảnh dùng role:

```text i18n-prose
1. Service goi service   EC2/Lambda/ECS can doc S3
                         -> trust policy cho "Service": "ec2.amazonaws.com"
2. Cross-account         user o account A doc bucket cua account B
                         -> trust policy cho "AWS": "arn:aws:iam::<A>:root"
3. Federation            nguoi dang nhap bang Google/AD/Okta, CI chay tren GitHub
                         -> trust policy cho "Federated": "<oidc-provider>"
```

:::tip Instance profile — cái vỏ bọc role cho EC2

EC2 **không** nhận role trực tiếp; nó nhận **instance profile**, là vỏ bọc chứa đúng một
role. Lambda, ECS task, CodeBuild thì nhận role thẳng. Console tạo instance profile ngầm
nên nhiều người không biết nó tồn tại, rồi dựng bằng CLI/Terraform là gặp lỗi
*"Invalid IAM Instance Profile name"* dù role có thật.

:::

#### Policy — văn bản JSON nói được/không được

Ba cách gắn, khác nhau ở chỗ policy **sống ở đâu**:

| Loại | Có ARN riêng | Dùng lại | Có version |
|---|---|---|---|
| **AWS managed** (`arn:aws:iam::aws:policy/ReadOnlyAccess`) | ✅ | mọi account | AWS quản |
| **Customer managed** (`arn:aws:iam::<account>:policy/…`) | ✅ | trong account | ✅ tối đa 5 |
| **Inline** (nhúng vào một danh tính) | ❌ | ❌ chết cùng danh tính | ❌ |

⚠️ **AWS managed policy thường rộng hơn mức cần** — tiện để bắt đầu, ngược least
privilege. `ReadOnlyAccess` cho `s3:GetObject` trên **`*`**, nên nó **phủ** mất mọi policy
hẹp bạn viết công phu. Đây là cách least privilege hỏng phổ biến nhất: không phải vì
policy bạn viết sai, mà vì còn một managed policy rộng treo ở group mà bạn quên.

### 4. Giải phẫu một policy JSON

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadPublicPrefix",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::my-bucket",
        "arn:aws:s3:::my-bucket/public/*"
      ],
      "Condition": {
        "Bool": {"aws:SecureTransport": "true"}
      }
    }
  ]
}
```

| Trường | Bắt buộc | Nghĩa |
|---|---|---|
| `Version` | ✅ | Phiên bản **ngôn ngữ policy**, không phải ngày viết. Luôn `"2012-10-17"`; bản cũ `"2008-10-17"` không hỗ trợ biến policy |
| `Statement` | ✅ | Mảng các "câu". Một policy thường nhiều câu |
| `Sid` | ❌ | Nhãn của câu. Hiện trong `MatchedStatements` của simulator ⇒ nên có |
| `Effect` | ✅ | `Allow` hoặc `Deny` |
| `Action` | ✅* | Hành động: `<service>:<Operation>`, hỗ trợ `*` (`s3:Get*`) |
| `Resource` | ✅* | ARN tài nguyên bị tác động |
| `Principal` | chỉ resource-based | **Ai** — chỉ có ở resource-based policy và trust policy |
| `Condition` | ❌ | Điều kiện phải thoả thì câu mới áp |

\* `Action` có thể thay bằng `NotAction`, `Resource` bằng `NotResource` — nghĩa là
*"mọi thứ TRỪ…"*. Dùng chủ yếu trong `Deny` và SCP; `NotAction` + `Allow` là mẫu nguy
hiểm, vì nó cấp mọi thứ trừ một danh sách, kể cả service AWS ra mắt sau này.

Đọc một statement như một câu tiếng Việt, luôn theo thứ tự đó:

> **Effect** `Allow` — **Action** `s3:GetObject` — **Resource** `my-bucket/public/*` —
> **Condition** chỉ khi đi qua TLS

:::warning `Resource` của S3 có hai dạng, không thay nhau được

```text i18n-prose
arn:aws:s3:::my-bucket        <- hanh dong tren BUCKET  (s3:ListBucket, s3:GetBucketPolicy)
arn:aws:s3:::my-bucket/*      <- hanh dong tren OBJECT  (s3:GetObject, s3:PutObject)
```

Viết `s3:ListBucket` với ARN object là lỗi im lặng kinh điển: policy hợp lệ, lưu được,
nhưng `aws s3 ls` vẫn `AccessDenied`.

:::

### 5. Giải phẫu ARN

ARN (Amazon Resource Name) là địa chỉ của một tài nguyên, luôn **6 phần** cách nhau `:`

```text i18n-prose
arn : aws : s3 :              :              : my-bucket/public/*
 1     2     3        4              5                  6
 |     |     |        |              |                  +- tai nguyen
 |     |     |        |              +- account id      <- S3 de TRONG
 |     |     |        +- region                         <- S3 de TRONG
 |     |     +- service
 |     +- partition: aws | aws-cn | aws-us-gov
 +- luon la "arn"
```

`:::` **không phải lỗi gõ** — đó là hai ô trống liền nhau. S3 bỏ trống region và account
vì **tên bucket là duy nhất toàn cầu**. Hầu hết service khác thì không:

```text i18n-prose
arn:aws:s3:::my-bucket                                  <- S3: 2 o trong
arn:aws:iam::123456789012:user/alice                    <- IAM: trong region (IAM la global)
arn:aws:ec2:ap-southeast-1:123456789012:instance/i-abc  <- EC2: du ca 6 o
arn:aws:sts::123456789012:assumed-role/deploy/sess-1    <- session cua role
```

Ký tự đại diện trong phần tài nguyên:

| Viết | Khớp |
|---|---|
| `my-bucket/public/*` | mọi object dưới `public/`, kể cả thư mục con |
| `my-bucket/public/a.txt` | đúng một object |
| `role/dev-*` | mọi role tên bắt đầu bằng `dev-` |
| `*` | mọi tài nguyên — dùng khi service không có ARN riêng (`sts:GetCallerIdentity`) |

### 6. Credential: loại nào, sống bao lâu

| Loại | Prefix | Hạn | Cần `SessionToken` |
|---|---|---|---|
| Access key của IAM user | `AKIA…` | **vô hạn** cho tới khi xoá | ❌ |
| Credential từ `AssumeRole` | `ASIA…` | 15 phút – 12 giờ | ✅ |
| Credential từ `GetSessionToken` | `ASIA…` | 15 phút – 36 giờ | ✅ |
| Credential của Identity Center | `ASIA…` | theo cấu hình session | ✅ |

Nhận ra prefix là đọc log nhanh hơn: `AKIA` = khoá dài hạn (rủi ro), `ASIA` = khoá tạm
(tốt). Và chuỗi prefix của ID: `AIDA` user · `AGPA` group · `AROA` role · `ANPA` policy ·
`AIPA` instance profile.

Credential tạm có **ba** phần, không phải hai:

```bash
export AWS_ACCESS_KEY_ID=ASIA...
export AWS_SECRET_ACCESS_KEY=...
export AWS_SESSION_TOKEN=...        # thieu dong nay -> InvalidClientTokenId
```

Thiếu `AWS_SESSION_TOKEN` là lỗi hay gặp nhất khi dùng role bằng tay, và thông báo lỗi
không hề gợi ý rằng bạn quên biến thứ ba.

### 7. Request context — AWS biết gì về mỗi lời gọi

Mỗi request mang theo một tập **condition key** mà policy đọc được. Đây là nguồn của mọi
`Condition`:

| Key | Mang gì |
|---|---|
| `aws:PrincipalArn` · `aws:PrincipalAccount` · `aws:PrincipalOrgID` | ai gọi |
| `aws:PrincipalTag/<Key>` | tag của principal |
| `aws:RequestedRegion` | gọi vào region nào |
| `aws:SecureTransport` | có TLS hay không |
| `aws:SourceIp` · `aws:VpcSourceIp` | gọi từ đâu |
| `aws:MultiFactorAuthPresent` · `aws:MultiFactorAuthAge` | có MFA, và cách đây bao lâu |
| `aws:ResourceTag/<Key>` | tag của tài nguyên bị tác động |
| `aws:RequestTag/<Key>` · `aws:TagKeys` | tag gửi kèm trong request tạo mới |
| `aws:CurrentTime` · `aws:TokenIssueTime` | thời điểm |
| `<service>:…` ví dụ `s3:prefix`, `iam:PassedToService` | key riêng từng service |

:::danger Key không có mặt thì điều kiện không khớp

Một số key **chỉ xuất hiện trong một số request**. `aws:MultiFactorAuthPresent` không có
trong lời gọi gián tiếp của service; `aws:TagKeys` không có nếu request không gửi tag nào.
Key vắng mặt ⇒ điều kiện **không thoả** ⇒ `Allow` không áp, hoặc tệ hơn với `ForAllValues`
thì điều kiện **thoả nhầm** (tập rỗng).

Khoá lại bằng `Null`:

```json
"Condition": {
  "ForAllValues:StringEquals": {"aws:TagKeys": ["Project", "Owner"]},
  "Null": {"aws:TagKeys": "false"}
}
```

`"Null": {"<key>": "false"}` đọc là *"key này **phải** tồn tại trong request"*.

:::

### 8. Sáu loại policy — loại nào cấp, loại nào lọc

Đây là bảng quan trọng nhất của cả tài liệu:

| Loại policy | Gắn vào | **Cấp** quyền | Phạm vi |
|---|---|---|---|
| **Identity-based** | user, group, role | ✅ **có** | principal đó |
| **Resource-based** (bucket policy, trust policy, KMS key policy…) | tài nguyên | ✅ **có** | tài nguyên đó |
| **Permission boundary** | user, role | ❌ chỉ lọc | principal đó |
| **SCP** (Organizations) | OU / account | ❌ chỉ lọc | mọi principal trong account |
| **Session policy** | truyền lúc `AssumeRole` | ❌ chỉ lọc | một session |
| **ACL** (S3, cũ) | tài nguyên | ✅ có | — nên tránh, dùng policy |

**Chỉ hai dòng đầu cấp quyền.** Ba dòng giữa là **phép giao** — chúng thu hẹp, không bao
giờ mở rộng. Hệ quả cụ thể: boundary cho `s3:*` mà identity policy không nói gì về S3 ⇒
vẫn **không có** quyền S3. Giao của hai tập rời nhau là tập rỗng.

Nhớ bằng một câu: **identity + resource mở cửa; boundary + SCP + session policy chỉ hạ
thấp trần cửa.**

Cách bốn cửa kết hợp, và thứ tự xét, là nội dung của
[Policy evaluation](iam-policy-evaluation.md).

### 9. Chẩn đoán `AccessDenied` — soát theo thứ tự

`AccessDenied` có **năm** nghi phạm, và bốn trong năm **không nằm ở policy của user**.
Soát từ policy user trước là cách chậm nhất:

```text i18n-prose
1. SCP cua Organizations       <- simulator KHONG thay duoc cai nay
2. Permission boundary         <- get-user/get-role de kiem
3. Identity policy             <- 3 cho: truc tiep, qua group, inline
4. Resource policy             <- bucket policy, trust policy, KMS key policy
5. Session policy              <- neu dang dung credential tam
```

Hai công cụ trả lời nhanh hơn đọc JSON:

```bash
# policy hien tai cho phep gi — ba ket qua: allowed / implicitDeny / explicitDeny
aws iam simulate-principal-policy \
  --policy-source-arn <principal-arn> \
  --action-names s3:GetObject --resource-arns <resource-arn>

# mot so service tra ve thong bao ma hoa, giai ra se biet statement nao tu choi
aws sts decode-authorization-message --encoded-message <string>
```

| Kết quả simulator | Nghĩa | Sửa bằng |
|---|---|---|
| `allowed` | có `Allow` khớp, không `Deny` nào khớp | — |
| `implicitDeny` | **không** `Allow` nào khớp (thiếu quyền) | thêm `Allow` |
| `explicitDeny` | có `Deny` khớp (bị cấm) | **phải bỏ `Deny`** — thêm `Allow` vô dụng |

Phân biệt `implicitDeny` ⇄ `explicitDeny` là phân biệt *"thiếu quyền"* ⇄ *"bị cấm"* — hai
sự cố nhìn **giống nhau** trong thông báo lỗi mà cách sửa ngược nhau.

## Ví dụ

Toàn bộ tài liệu này có bài tập chạy thật ở
[**bậc cơ bản**](../tutorials/bt-01-co-ban.md) — 26 bài trên emulator local, miễn phí,
lời giải kèm output thật. Bản đồ giữa mục ở trên và bài tập:

| Mục ở trên | Bài tập |
|---|---|
| §3 User, access key | A1 · A2 · A3 |
| §3 Group — quyền không nằm ở user | **A4** |
| §3 Policy — ba loại | B1 · B2 · B5 |
| §4 Giải phẫu policy, `Resource` hai dạng của S3 | B1 · **B3** · D3 · D4 |
| §4 `Condition` | B6 |
| §3 Role, instance profile, trust policy | C1 · C2 · C5 |
| §6 Credential tạm, `SessionToken` | C3 · C4 |
| §8 Boundary là phép giao | **D5** |
| §9 Ba kết quả của simulator | **D1** · D2 |

Bốn bài in đậm là bốn bài dạy được điều mà đọc không thay thế nổi.

## Bẫy trong đề

| Bẫy | Vì sao sai |
|---|---|
| Lưu access key vào file cấu hình trên EC2 | Dùng **IAM role** + instance profile |
| Dùng root user cho việc thường ngày | Root không gắn policy được để hãm — chỉ MFA + không tạo khoá |
| Lồng group trong group | IAM group **không lồng được** |
| Gắn group vào `Principal` của policy | Group **không phải** principal |
| Nghĩ permission boundary hoặc SCP **cấp** quyền | Cả hai chỉ **lọc** — §8 |
| Thêm `Allow` để mở thứ đang bị `Deny` tường minh | `Deny` thắng vĩnh viễn |
| `s3:ListBucket` với ARN object (`bucket/*`) | `ListBucket` là hành động trên **bucket** |
| Dùng credential tạm mà quên `AWS_SESSION_TOKEN` | Credential tạm có **ba** phần |
| `Version` ghi ngày hôm nay | Đó là phiên bản **ngôn ngữ**, luôn `2012-10-17` |
| Chọn **Cognito** cho đăng nhập của nhân viên nhiều account | Đó là **IAM Identity Center** |
| `NotAction` + `Allow` để "cho hết trừ vài cái" | Cấp cả service AWS ra mắt sau này |

## Đánh đổi

| Quyết định | Được | Mất |
|---|---|---|
| Role thay access key | Không có credential dài hạn để lộ | Phải hiểu trust policy; khó debug hơn |
| Identity Center thay IAM user | Một chỗ quản, tắt một người là tắt mọi account | Phải dựng và vận hành thêm một tầng |
| AWS managed policy thay customer managed | Nhanh, AWS tự cập nhật theo service mới | **Rộng hơn mức cần** — và phủ mất policy hẹp của bạn |
| Inline thay managed policy | Quan hệ một-một rõ ràng, chết cùng danh tính | Không dùng lại, không version, không rollback |
| Policy gắn vào group | Sửa một chỗ áp cho cả nhóm | Kiểm quyền một user phải soát ba chỗ |
| Nhiều statement nhỏ thay một statement lớn | Đọc được, `Sid` chỉ đúng chỗ khớp | Chạm trần 6144 byte/policy sớm hơn |

## Related Topics

- [Access management](../../foundations/reference/access-management.md) — tầng CLF-C02: root user, Identity Center, Secrets Manager
- [Policy evaluation](iam-policy-evaluation.md) — bước tiếp: bốn cửa, thứ tự xét, `PassRole`, confused deputy
- [Bài tập IAM](../tutorials/index.md) — 60 bài có lời giải, ba bậc
- [Architecting (SAA-C03)](../index.md) — tầng chứa tài liệu này
