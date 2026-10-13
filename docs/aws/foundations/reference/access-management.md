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
updated: 2026-10-13
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

## Giải thích cặn kẽ

### User / group / role / policy — ví dụ công ty

Bốn khối trên khô khan. Đây là cách nhớ bằng một hình ảnh của một công ty:

| Khối IAM | Ví như | Giải thích |
|---|---|---|
| **User** | Một **nhân viên** cụ thể | Có tên riêng, có thẻ ra vào riêng (credential). Một người, một danh tính lâu dài. |
| **Group** | Một **phòng ban** | "Phòng Kế toán" không tự nó làm gì cả — nó chỉ là cái nhãn để nói *"ai ở trong đây thì có những quyền này"*. Thêm người vào phòng là họ tự có quyền của phòng; bỏ ra là mất. |
| **Role** | Một **chiếc áo bảo hộ treo ở cửa xưởng** | Không thuộc về ai. Ai cần vào xưởng thì **mặc tạm** chiếc áo đó vào — lúc mặc thì có đúng quyền gắn với chiếc áo, cởi ra thì hết. Không có thẻ cá nhân nào bị phát ra. Một EC2 instance, một Lambda, hay một người từ account khác đều có thể "mặc" cùng một role. |
| **Policy** | **Bảng nội quy** dán trên tường | Tự nó không trao quyền cho ai. Nó chỉ là tờ giấy ghi "được làm X, cấm làm Y". Phải **dán** (attach) nó lên một nhân viên, một phòng ban, hay một chiếc áo thì nó mới có hiệu lực. |

Điểm mấu chốt từ hình ảnh này: **quyền của một nhân viên hiếm khi ghi trên người anh ta**.
Nó ghi trên bảng nội quy dán ở phòng ban anh ta thuộc về. Đó chính xác là lý do mục
[Ví dụ](#ví-dụ) bên dưới, khi hỏi "user này có policy gì" trực tiếp trên user, lại trả về
rỗng — vì bảng nội quy dán ở group, không dán ở user.

Và vì **role không phát credential thường trực** (không có "thẻ cá nhân"), nó là lựa chọn
an toàn nhất mỗi khi một máy hay một service cần quyền: không có gì để đánh rơi, không có
gì để kẻ xấu nhặt được dùng mãi về sau.

### Giải phẫu một policy JSON

Một policy là văn bản JSON. Không cần thuộc cú pháp cho CLF-C02, nhưng phải đọc hiểu được
**bốn phần** của một câu lệnh (statement) trong đó. Nghĩ về nó như một câu tiếng Việt đủ
bốn thành phần:

> **[Cho phép / Cấm]** ai đó **[làm hành động gì]** lên **[tài nguyên nào]**, **[với điều
> kiện gì]**.

| Phần | Câu hỏi nó trả lời | Ví dụ dễ hiểu |
|---|---|---|
| **Effect** | Cho phép hay cấm? | `Allow` (cho phép) hoặc `Deny` (cấm). Chỉ có hai giá trị này. |
| **Action** | Được làm **hành động** gì? | `s3:GetObject` = đọc file trong S3. `s3:PutObject` = ghi file. `iam:CreateUser` = tạo user. Dấu `*` nghĩa là "mọi hành động". |
| **Resource** | Trên **tài nguyên** nào? | Chỉ bucket `report-2026` chứ không phải mọi bucket; chỉ một bảng DynamoDB cụ thể. Dấu `*` nghĩa là "mọi tài nguyên". |
| **Condition** | **Khi nào** mới áp dụng? (tùy chọn) | "Chỉ khi request đến từ dải IP của văn phòng", "chỉ khi đã đăng nhập bằng MFA", "chỉ trong giờ hành chính". Có thể bỏ trống. |

Ghép lại, một policy đọc thành câu: *"**Cho phép** (Effect) đọc file (Action `s3:GetObject`)
trong bucket báo cáo (Resource), nhưng **chỉ khi** người gọi đã bật MFA (Condition)."*

Vì sao đáng hiểu bốn phần này cho một kỳ thi mức foundation: nhiều câu hỏi mô tả một nhu
cầu bằng tiếng Anh ("cho phép đọc nhưng không cho xóa", "chỉ từ một IP nhất định") rồi hỏi
IAM có làm được không — đáp án gần như luôn là **có**, và chỗ thực hiện chính là
**Action** (đọc ≠ xóa) và **Condition** (ràng IP).

### Luồng IAM Role cho EC2 → S3, từng bước

Đây là tình huống kinh điển nhất của IAM trong đề: *"Một ứng dụng chạy trên EC2 cần đọc
dữ liệu từ S3. Làm sao an toàn nhất?"* Đáp án sai mà ai cũng dễ chọn là "tạo access key,
để vào file cấu hình trên instance". Đáp án đúng là **IAM role**. Đây là vì sao, và cơ chế
chạy từng bước:

1. **Tạo một role** (chiếc áo bảo hộ) và dán lên nó một policy cho phép đọc S3
   (`s3:GetObject` trên bucket cần đọc).
2. **Gắn role vào EC2 instance** (qua một thứ gọi là *instance profile* — bạn không cần
   nhớ tên này cho CLF-C02, chỉ cần biết "role được gắn lên instance").
3. Khi ứng dụng trên instance cần gọi S3, nó **không** cần access key sẵn trong máy. Thay
   vào đó, một dịch vụ chạy ngầm trên instance (instance metadata) **tự động lấy về một bộ
   credential tạm thời** từ AWS STS, gắn với role đó.
4. Bộ credential tạm này **có hạn sử dụng ngắn** (vài giờ) và **tự xoay vòng** (rotate):
   trước khi hết hạn, instance tự xin bộ mới. Ứng dụng không hề biết chuyện này xảy ra —
   SDK của AWS lo hết.
5. Nếu credential tạm có bị lộ, nó **hết hạn gần như ngay**, nên thiệt hại tối thiểu.

So sánh thẳng vì sao role thắng access key nhúng cứng:

| | Access key nhúng vào instance | IAM role gắn vào instance |
|---|---|---|
| Credential nằm ở đâu | Nằm cứng trong file trên máy | Không có gì nằm cứng; cấp phát tạm theo yêu cầu |
| Thời hạn | **Vĩnh viễn** cho tới khi bạn nhớ ra để xoá | Vài giờ, **tự xoay vòng** |
| Lộ ra ngoài thì sao | Kẻ xấu dùng mãi tới khi bị phát hiện | Hết hạn gần như ngay |
| Đổi key định kỳ | Phải tự làm tay, dễ quên | AWS lo, không cần làm gì |

Câu thần chú cho phòng thi: **máy cần nói chuyện với service AWS → dùng role, không bao giờ
nhúng key.**

### Authentication vs authorization

Hai từ này nghe giống nhau nhưng là hai bước khác hẳn, và IAM làm **cả hai**:

| | Authentication (xác thực) | Authorization (phân quyền) |
|---|---|---|
| Trả lời câu hỏi | **Bạn là ai?** | **Bạn được làm gì?** |
| Xảy ra khi | Lúc đăng nhập / lúc gọi API | Sau khi đã biết bạn là ai, mỗi lần bạn xin làm một việc |
| Cơ chế | Password, MFA, access key, token tạm | Đánh giá các policy gắn với danh tính đó |
| Ví như | **Bảo vệ kiểm thẻ ra vào** ở cổng | **Bảng nội quy** quyết định bạn vào được phòng nào |

Thứ tự luôn là: xác thực trước (chứng minh bạn là ai), rồi mới phân quyền (xét bạn được làm
gì). Một danh tính xác thực thành công vẫn có thể bị **từ chối** mọi hành động nếu không
policy nào cho phép — đúng với luật "deny mặc định".

### Khi nào dùng IAM Identity Center (SSO)

IAM user là đủ khi bạn có **một** account và **ít** người. Nhưng thực tế công ty thường
có **nhiều account AWS** (một cho dev, một cho prod, một cho mỗi nhóm...) và nhân viên vào
ra liên tục. Quản lý IAM user riêng trong từng account là ác mộng: một nhân viên nghỉ việc,
bạn phải vào **từng** account để xoá.

**IAM Identity Center** giải quyết bằng một chỗ đăng nhập duy nhất cho tất cả:

- Nhân viên đăng nhập **một lần**, truy cập được mọi account và app được cấp — đây chính là
  *single sign-on*.
- Thêm/bớt quyền, hay cho một người nghỉ việc, làm ở **một chỗ** → áp cho mọi account.
- Nối được với thư mục nhân sự sẵn có (Active Directory, hay IdP ngoài qua SAML) → không
  phải tạo lại danh tính.

Nhận diện trong đề: thấy *"multiple AWS accounts"*, *"single sign-on"*, *"centrally manage
access for employees"*, *"existing corporate directory"* → nghĩ ngay **IAM Identity
Center**. Nhớ phân biệt với **Cognito** (dành cho người dùng của ứng dụng bạn, không phải
nhân viên).

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

### Logic đánh giá quyền: allow và deny gặp nhau

Hai luật ở phần tổng quan ("deny mặc định", "explicit deny thắng") nghe gọn, nhưng dễ nhầm
khi một danh tính có **nhiều** policy mâu thuẫn. Đây là trình tự AWS luôn chạy, và một ví
dụ đi xuyên nó.

Trình tự đánh giá (đơn giản hóa cho mức foundation):

1. **Bắt đầu từ deny mặc định** — không có gì được phép cho tới khi chứng minh ngược lại.
2. **Có explicit deny nào không?** Nếu có **bất kỳ** câu `Deny` nào khớp hành động này ở
   **bất kỳ** policy — kết quả là **DENY**, dừng lại, không xét tiếp. Deny luôn thắng.
3. **Có explicit allow nào không?** Nếu không có deny và có ít nhất một câu `Allow` khớp —
   kết quả là **ALLOW**.
4. **Không allow, không deny?** Rơi về deny mặc định ở bước 1 — **DENY**.

Ví dụ cụ thể. User `analyst-01` được gắn hai policy:

- Policy A (qua group): **Allow** `s3:*` trên mọi bucket — "được làm mọi thứ với S3".
- Policy B (gắn trực tiếp): **Deny** `s3:DeleteObject` trên bucket `report-2026` — "cấm
  xóa file trong bucket báo cáo".

Giờ xét ba yêu cầu:

| User muốn làm | Có allow? | Có deny? | Kết quả | Vì sao |
|---|---|---|---|---|
| Đọc file trong `report-2026` (`s3:GetObject`) | Có (Policy A) | Không | **ALLOW** | Allow khớp, không deny nào chặn |
| **Xóa** file trong `report-2026` (`s3:DeleteObject`) | Có (Policy A nói `s3:*`) | **Có** (Policy B) | **DENY** | Explicit deny ở Policy B phủ quyết allow rộng ở Policy A |
| Gọi DynamoDB (`dynamodb:GetItem`) | Không | Không | **DENY** | Không allow nào khớp → rơi về deny mặc định |

Dòng giữa là cái bẫy kinh điển: user **có** một allow rộng (`s3:*`, nghe như "làm được tất")
nhưng vẫn **không** xóa được, vì **một** câu deny tường minh thắng. Hệ quả cho đề: nếu đề
hỏi "thêm allow nào để user xóa được file?" thì **không có allow nào cứu được** — phải gỡ
câu **deny** đi.

## Ví dụ cụ thể: tình huống đề thi mẫu

**Tình huống 1.** *Một ứng dụng chạy trên EC2 cần đọc object từ một S3 bucket. Giải pháp
nào theo đúng best practice bảo mật của AWS?*

> **Đáp án:** Tạo một **IAM role** với quyền đọc S3 và gắn role đó vào EC2 instance. Lời
> giải: role cấp credential tạm, tự xoay vòng, không có gì để lộ lâu dài. Mọi phương án
> "tạo access key và lưu vào instance / file cấu hình / biến môi trường" đều **sai** — đó
> là credential dài hạn nhúng cứng. Xem [luồng EC2 → S3](#luồng-iam-role-cho-ec2--s3-từng-bước).

**Tình huống 2.** *Một công ty có 12 tài khoản AWS và muốn nhân viên đăng nhập một lần để
truy cập tất cả, quản lý quyền tập trung, nối với Active Directory sẵn có. Dùng gì?*

> **Đáp án:** **IAM Identity Center** (trước là AWS SSO). Lời giải: dấu hiệu *nhiều account*
> + *single sign-on* + *quản lý tập trung* + *corporate directory* luôn trỏ về Identity
> Center. Chọn **Cognito** là bẫy — Cognito cho người dùng ứng dụng, không cho nhân viên.
> Chọn "tạo IAM user trong từng account" là đúng kỹ thuật nhưng ngược với "quản lý tập trung".

**Tình huống 3.** *Một IAM user được gán policy cho phép `s3:*`. Một policy khác gán vào
cùng user có câu `Deny` cho `s3:DeleteObject`. User có xóa được object không?*

> **Đáp án:** **Không**. Lời giải: **explicit deny luôn thắng mọi allow**, bất kể allow có
> rộng tới đâu. Thêm allow nữa cũng vô ích; phải gỡ câu deny. Xem
> [logic đánh giá quyền](#logic-đánh-giá-quyền-allow-và-deny-gặp-nhau).

**Tình huống 4.** *Phải làm gì đầu tiên để bảo vệ tài khoản AWS mới tạo?*

> **Đáp án:** **Bật MFA cho root user** và **không tạo access key cho root**. Lời giải:
> root có toàn quyền tuyệt đối, lộ là mất tài khoản. Tạo một IAM user (hoặc danh tính qua
> Identity Center) có quyền admin để dùng hằng ngày, cất root đi cho các
> [việc chỉ root làm được](#root-user-danh-sách-việc-chỉ-nó-làm-được).

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
- [Policy evaluation](../../architecting/reference/iam-policy-evaluation.md) — tầng sâu hơn: thứ tự xét, permission boundary, SCP, `PassRole`
- [Bài tập IAM](../../architecting/tutorials/index.md) — ba bậc thực hành, bậc đầu chạy được trên emulator
- [AWS · Foundations](../index.md)
