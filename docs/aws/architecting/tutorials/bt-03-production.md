---
title: Bài tập — Production
sidebar_position: 30
description: "14 bài có lời giải đầy đủ config: bỏ khoá tĩnh, OIDC cho GitHub Actions, least privilege dựng từ CloudTrail, boundary chặn leo thang, SCP, break-glass có MFA, tag-based access control."
tags: [tutorial, aws, iam, saa-c03, oidc, least-privilege, scp, organizations, break-glass, access-analyzer, identity-center, domain-1]
domain: cloud
category: concept
doc_type: tutorial
status: draft
difficulty: advanced
verified_at:
updated: 2026-10-08
---

# Bài tập — Production

> **Chốt:** Hai bậc trước dạy *cơ chế*; bậc này dạy *quy trình*. Và quy trình production
> gọn lại thành một câu: **không có credential dài hạn ở đâu cả** — người đăng nhập qua
> Identity Center, máy trong AWS dùng role, máy ngoài AWS dùng OIDC. Mười bốn bài dưới đây
> là mười bốn cách thực hiện câu đó.

Bậc trước: [Trung bình](bt-02-trung-binh.md) ·
Lý thuyết: [Policy evaluation](../reference/iam-policy-evaluation.md)

Đây cũng là bậc trả lời hai cụm từ đề SAA-C03 hay dùng — *MOST secure* và
*LEAST operational overhead* — vì hai cụm đó thường trỏ về cùng một đáp án: bỏ khoá tĩnh.

:::info Lời giải ở đây là **config đầy đủ**, chưa chạy trên account của bạn

Bậc này ít output để chụp hơn — thứ cần giao là **policy, trust policy, SCP, workflow**
viết đúng. Lời giải cho nguyên văn những file đó, kèm chỗ dễ sai. Ô dán output vẫn có ở
những bài đo được.

:::

## Chi phí — hai dòng cần canh

| Thứ | Phí |
|---|---|
| IAM, Identity Center, Organizations, SCP, Policy Simulator, credential report | **$0** |
| IAM Access Analyzer — **external access** | **$0** · đủ cho bài P11 |
| IAM Access Analyzer — **unused access** | **có phí** theo role/tháng — kiểm giá hiện hành trước khi bật, tắt sau lab |
| CloudTrail — trail quản lý event **đầu tiên** mỗi account | **$0** · trail thứ hai và **data event** có phí |
| EventBridge rule + SNS cho alarm (bài P10) | gần $0 ở mức lab |

Hai dòng in đậm bật bằng một cú bấm và tính tiền theo thời gian chạy. Đó là toàn bộ rủi ro
tiền của trang này.

---

## Phần A — Bỏ credential dài hạn (4 bài)

### P1. Kiểm kê khoá tĩnh

**Đề:** Đếm mọi access key đang tồn tại trong account. Với từng cái, trả lời *"thay bằng
role được không"*.

<details>
<summary>Lời giải</summary>

```bash
for u in $(aws iam list-users --query 'Users[].UserName' --output text); do
  aws iam list-access-keys --user-name "$u" \
    --query "AccessKeyMetadata[].[UserName,AccessKeyId,Status,CreateDate]" --output text
done
```

Ghép thêm *lần dùng cuối* để biết cái nào xoá được ngay:

```bash
aws iam get-access-key-last-used --access-key-id <AKIA...> \
  --query 'AccessKeyLastUsed.[LastUsedDate,ServiceName]'
```

```text i18n-prose
(chưa chạy — dán bảng khoá của account bạn vào đây)
```

Mỗi dòng là một câu hỏi phải trả lời, không phải một dòng để đọc qua:

| Khoá này của ai | Thay bằng |
|---|---|
| Một con người | **IAM Identity Center** + `aws sso login` — xoá khoá |
| App chạy trên EC2 | **instance profile** — xoá khoá |
| App chạy trên ECS / EKS | **task role** / **IRSA** — xoá khoá |
| Lambda | **execution role** — xoá khoá |
| CI/CD ngoài AWS | **OIDC federation** (bài P2) — xoá khoá |
| Script trên laptop | Identity Center — xoá khoá |

Cột phải không có ô nào ghi *"giữ nguyên"*. Đó chính là kết luận của bài.

Trường hợp duy nhất còn lý do giữ khoá tĩnh: một hệ thống ngoài AWS **không** nói được
OIDC/SAML. Lúc đó khoá phải có lịch rotate tự động và chỉ gắn vào một user quyền cực hẹp.

</details>

### P2. OIDC cho GitHub Actions — bài giá trị nhất cả bậc

**Đề:** Cho workflow GitHub Actions lấy credential AWS **không** qua secret nào.

<details>
<summary>Lời giải — đầy đủ ba phần</summary>

**1. Đăng ký OIDC provider** (một lần cho mỗi account):

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com
```

**2. Trust policy của role:**

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::<account-id>:oidc-provider/token.actions.githubusercontent.com"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
        "token.actions.githubusercontent.com:sub": "repo:<org>/<repo>:ref:refs/heads/main"
      }
    }
  }]
}
```

**3. Workflow:**

```yaml
permissions:
  id-token: write        # thieu dong nay la khong co OIDC token
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::<account-id>:role/gha-deploy
          aws-region: ap-southeast-1
      - run: aws sts get-caller-identity
```

```text i18n-prose
(chưa chạy — dán output `aws sts get-caller-identity` chạy trong Actions vào đây;
 Arn phải là .../assumed-role/gha-deploy/<session>, KHÔNG phải :user/...)
```

🔴 **Chỗ duy nhất được phép sai là `sub`, và sai nó là mất cả bài:**

| Viết `sub` thành | Ai assume được role của bạn |
|---|---|
| `repo:<org>/<repo>:ref:refs/heads/main` | ✅ chỉ branch `main` của đúng repo đó |
| `repo:<org>/<repo>:*` | mọi branch **và mọi pull request** — người ngoài mở PR là chạy được |
| `StringLike` với `repo:<org>/*` | mọi repo trong org |
| bỏ hẳn điều kiện `sub` | **mọi repo GitHub trên thế giới** |

Dòng cuối không nói quá: provider `token.actions.githubusercontent.com` phục vụ toàn bộ
GitHub. Không khoá `sub` thì bạn vừa mở role cho tất cả. Đây đúng là confused deputy ở bài
[I20 bậc trung bình](bt-02-trung-binh.md), chỉ khác tên gọi.

Cần nhiều branch thì dùng `StringLike` **có giới hạn**, đừng dùng `*` trần:

```json
"StringLike": {
  "token.actions.githubusercontent.com:sub": "repo:<org>/<repo>:ref:refs/heads/release/*"
}
```

Deploy từ môi trường thì khoá theo environment, chặt hơn branch:
`repo:<org>/<repo>:environment:production`.

</details>

### P3. Vòng rotate khoá mà không gây downtime

**Đề:** Một khoá tĩnh **buộc phải** giữ. Thiết kế quy trình rotate không làm hỏng dịch vụ.

<details>
<summary>Lời giải</summary>

Năm bước, và bước 4 là bước người ta bỏ:

```text i18n-prose
1. create-access-key           -> gio user co 2 khoa (tran la 2, bai A6 bac co ban)
2. cap nhat moi noi dang dung khoa cu sang khoa moi
3. update-access-key --status Inactive   cho khoa CU
4. DOI — it nhat mot chu ky day du cua moi job (job theo thang => doi mot thang)
5. khong co gi hong  -> delete-access-key khoa cu
   co cai hong       -> update-access-key --status Active   (rollback trong 1 giay)
```

Kiểm bước 4 bằng số, đừng đoán:

```bash
aws iam get-access-key-last-used --access-key-id <khoa-cu> \
  --query 'AccessKeyLastUsed.LastUsedDate'
```

```text i18n-prose
(chưa chạy — dán LastUsedDate của khoá cũ trước và sau khi Inactive)
```

`Inactive` **bật lại được**, `delete` thì không. Đó là toàn bộ lý do có bước 3 riêng thay
vì xoá luôn — bạn mua một đường rollback bằng một lệnh.

⚠️ Trần **2 khoá/user** nghĩa là user đang có 2 khoá thì **không rotate được** — phải xoá
một cái trước, tức là mất đường rollback. Giữ nguyên tắc: bình thường mỗi user **một**
khoá, khoá thứ hai chỉ tồn tại trong lúc rotate.

</details>

### P4. Identity Center thay IAM user cho người

**Đề:** Nêu đúng thứ phải làm để chuyển một nhóm 10 người từ IAM user sang Identity Center,
và thứ gì **không** mất khi chuyển.

<details>
<summary>Lời giải</summary>

| Việc | Ghi chú |
|---|---|
| Bật Identity Center ở management account | $0 |
| Nối identity source | Identity Center directory, hoặc AD, hoặc IdP ngoài (Okta, Entra ID) |
| Tạo **permission set** theo chức năng | đây là "policy" của Identity Center, gắn vào *group × account* |
| Gán group ↔ account ↔ permission set | ba chiều, không gán cho từng người |
| Người dùng `aws sso login` | nhận credential **tạm**, hết hạn tự động |
| Xoá IAM user cũ + khoá của họ | bước này hay bị quên ⇒ còn đường vào cũ |

**Thứ không mất:** mọi policy bạn đã viết. Permission set dùng cùng ngôn ngữ policy JSON,
và vẫn áp SCP, vẫn áp permission boundary. Kiến thức hai bậc trước dùng nguyên.

Vì sao đây là đáp án của *LEAST operational overhead*: tắt một người ở IdP là tắt mọi
account cùng lúc. Với IAM user, bạn phải đi xoá ở từng account — và sẽ có account bị bỏ sót.

</details>

---

## Phần B — Least privilege có bằng chứng (3 bài)

### P5. Thu hẹp một role `*:*` bằng số liệu

**Đề:** Lấy một role đang có `Resource: "*"`, `Action: "*"`. Viết lại policy theo đúng thứ
nó dùng trong 90 ngày.

<details>
<summary>Lời giải — ba bước, không đảo thứ tự</summary>

```bash
# 1. service nao role nay thuc su goi?
JOB=$(aws iam generate-service-last-accessed-details \
        --arn arn:aws:iam::<account>:role/<role> --query JobId --output text)
aws iam get-service-last-accessed-details --job-id "$JOB" \
  --query 'ServicesLastAccessed[?TotalAuthenticatedEntities>`0`].[ServiceNamespace,LastAuthenticated]' \
  --output table

# 2. action cu the: Access Advisor chi tra ve muc SERVICE, nen phai lay tu CloudTrail
aws cloudtrail lookup-events --max-results 50 \
  --lookup-attributes AttributeKey=Username,AttributeValue=<ten-role> \
  --query 'Events[].[EventName,EventSource]' --output text | sort -u

# 3. viet lai policy roi MO PHONG truoc khi apply
aws iam simulate-custom-policy --policy-input-list "$(cat policy-moi.json)" \
  --action-names <action-can-cho-1> <action-can-cho-2> <action-phai-chan> \
  --resource-arns <arn>
```

```text i18n-prose
(chưa chạy — dán danh sách service ở bước 1 và action ở bước 2 vào đây)
```

Bước 3 là bước phân biệt công việc này với việc đoán: bạn có **danh sách action phải cho**
và **danh sách action phải chặn**, chạy một lệnh, đối chiếu cả hai cột. Policy mới chỉ được
apply khi cả hai cột đúng.

:::warning Access Advisor chỉ thấy quá khứ

Nó báo quyền **đã dùng**, không phải quyền **cần**. Action chạy theo quý, hoặc chỉ chạy khi
có sự cố, sẽ không xuất hiện và bị cắt oan — rồi hỏng đúng lúc tệ nhất. Vì vậy cửa sổ là
**90 ngày** trở lên, và trước khi cắt phải hỏi chủ service xem có đường chạy theo lịch thưa.

:::

Siết từng bước, không một nhát: `*:*` → giới hạn **service** → giới hạn **action** →
giới hạn **resource** → thêm **condition**. Mỗi bước để chạy vài ngày trước khi siết tiếp.

</details>

### P6. Tìm mọi policy quá rộng trong account

**Đề:** Liệt kê mọi customer managed policy có `Action: "*"` hoặc `Resource: "*"`, và mọi
policy cấp `iam:PassRole` rộng.

<details>
<summary>Lời giải</summary>

```bash
aws iam get-account-authorization-details > /tmp/iam.json

# policy co Action: * hoac Resource: *
jq -r '.Policies[] | . as $p | .PolicyVersionList[]
       | select(.IsDefaultVersion) | .Document.Statement[]?
       | select(.Effect=="Allow" and ((.Action=="*") or (.Resource=="*")))
       | $p.PolicyName' /tmp/iam.json | sort -u

# policy cap iam:PassRole
jq -r '.Policies[] | . as $p | .PolicyVersionList[]
       | select(.IsDefaultVersion) | .Document.Statement[]?
       | select((.Action // empty | tostring) | test("iam:PassRole|iam:\\*"))
       | $p.PolicyName' /tmp/iam.json | sort -u
```

```text i18n-prose
(chưa chạy — dán hai danh sách vào đây)
```

Danh sách thứ hai là danh sách đáng lo hơn, dù thường ngắn hơn: mỗi policy trong đó
**tương đương quyền admin** nếu `Resource` của `PassRole` là `*` (bài
[I17 bậc trung bình](bt-02-trung-binh.md)).

Chạy lệnh này mỗi tháng, lưu file lại và `diff` — mọi quyền mới phát sinh sẽ hiện ra, kể
cả quyền không ai báo.

</details>

### P7. Policy test trong CI

**Đề:** Biến việc review policy thành test tự động, chạy ở pull request.

<details>
<summary>Lời giải</summary>

Mỗi policy trong repo đi kèm một file kỳ vọng:

```text i18n-prose
policies/
  data-reader.json
  data-reader.expect     # action<TAB>resource<TAB>allowed|denied
```

```text
s3:GetObject	arn:aws:s3:::data-lake/public/a.txt	allowed
s3:GetObject	arn:aws:s3:::data-lake/private/a.txt	denied
s3:DeleteObject	arn:aws:s3:::data-lake/public/a.txt	denied
iam:CreateUser	*	denied
```

Script CI:

```bash
fail=0
while IFS=$'\t' read -r action resource want; do
  got=$(aws iam simulate-custom-policy \
          --policy-input-list "$(cat policies/data-reader.json)" \
          --action-names "$action" --resource-arns "$resource" \
          --query 'EvaluationResults[0].EvalDecision' --output text)
  case "$got:$want" in
    allowed:allowed|implicitDeny:denied|explicitDeny:denied) ;;
    *) echo "MISMATCH $action $resource: muon=$want duoc=$got"; fail=1 ;;
  esac
done < policies/data-reader.expect
exit $fail
```

```text i18n-prose
(chưa chạy — dán kết quả một lần chạy CI vào đây)
```

Giá trị thật: policy **mở rộng hơn dự định** sẽ làm CI đỏ. Đó là loại lỗi đọc JSON bằng
mắt không bắt được — người review thấy `Allow s3:GetObject` rồi gật đầu, không nhận ra
`Resource` đã bị nới thành `data-lake/*`.

Dòng `iam:CreateUser → denied` trong file kỳ vọng nhìn như dư, nhưng nó là chốt chặn
chống nới policy về sau: ai thêm `Action: "*"` vào là CI đỏ ngay.

</details>

---

## Phần C — Hàng rào (4 bài)

### P8. Permission boundary chặn leo thang

**Đề:** Cho developer tự tạo role mà **không** tự cấp thêm quyền cho mình.

<details>
<summary>Lời giải — mẫu hai lớp</summary>

Lớp 1 — **boundary** định nghĩa trần quyền mà role do dev tạo được phép có:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:*", "dynamodb:*", "logs:*", "lambda:InvokeFunction"],
    "Resource": "*"
  }]
}
```

Lớp 2 — policy của **developer**, bắt buộc họ phải gắn boundary đó khi tạo role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "TaoRoleNhungPhaiCoBoundary",
      "Effect": "Allow",
      "Action": ["iam:CreateRole", "iam:PutRolePolicy", "iam:AttachRolePolicy"],
      "Resource": "arn:aws:iam::<account>:role/dev-*",
      "Condition": {
        "StringEquals": {
          "iam:PermissionsBoundary": "arn:aws:iam::<account>:policy/dev-boundary"
        }
      }
    },
    {
      "Sid": "KhongDuocThaoBoundary",
      "Effect": "Deny",
      "Action": [
        "iam:DeleteRolePermissionsBoundary",
        "iam:PutRolePermissionsBoundary",
        "iam:DeletePolicy",
        "iam:CreatePolicyVersion",
        "iam:SetDefaultPolicyVersion"
      ],
      "Resource": [
        "arn:aws:iam::<account>:policy/dev-boundary",
        "arn:aws:iam::<account>:role/dev-*"
      ]
    }
  ]
}
```

```text i18n-prose
(chưa chạy — thử tạo role không gắn boundary, và thử sửa chính boundary; dán cả hai lỗi)
```

**Statement thứ hai là statement quyết định**, và là cái hay bị bỏ. Không có nó thì dev
tạo role đúng boundary — rồi sửa luôn nội dung boundary cho rộng ra, hoặc gỡ boundary khỏi
role. Cấp quyền tạo role mà không chặn đường sửa hàng rào thì hàng rào chỉ là hình thức.

Điều kiện `iam:PermissionsBoundary` và tiền tố `role/dev-*` phải đi cùng nhau: thiếu tiền
tố thì dev tạo được role tên bất kỳ, kể cả trùng tên role hệ thống.

</details>

### P9. SCP — trần toàn tổ chức

**Đề:** Viết ba SCP: khoá region, chặn tắt CloudTrail, chặn gỡ hàng rào bảo mật.

<details>
<summary>Lời giải</summary>

**SCP 1 — khoá region:**

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "ChanRegionNgoaiDanhSach",
    "Effect": "Deny",
    "NotAction": [
      "iam:*", "sts:*", "organizations:*", "cloudfront:*",
      "route53:*", "support:*", "budgets:*", "waf:*", "shield:*"
    ],
    "Resource": "*",
    "Condition": {
      "StringNotEquals": {"aws:RequestedRegion": ["ap-southeast-1", "us-east-1"]}
    }
  }]
}
```

**SCP 2 — không ai được tắt giám sát:**

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "KhongTatDuocGiamSat",
    "Effect": "Deny",
    "Action": [
      "cloudtrail:StopLogging",
      "cloudtrail:DeleteTrail",
      "cloudtrail:UpdateTrail",
      "config:DeleteConfigurationRecorder",
      "config:StopConfigurationRecorder",
      "guardduty:DeleteDetector",
      "guardduty:DisassociateFromMasterAccount"
    ],
    "Resource": "*"
  }]
}
```

**SCP 3 — không gỡ được hàng rào của P8:**

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "BaoVeRoleHeThong",
    "Effect": "Deny",
    "Action": [
      "iam:DeleteRole", "iam:DeleteRolePolicy", "iam:DetachRolePolicy",
      "iam:PutRolePermissionsBoundary", "iam:DeleteRolePermissionsBoundary"
    ],
    "Resource": [
      "arn:aws:iam::*:role/org-security-*",
      "arn:aws:iam::*:role/aws-reserved/*"
    ]
  }]
}
```

```text i18n-prose
(chưa chạy — dùng admin của member account thử phá cả ba SCP; dán ba lỗi vào đây)
```

Ba chi tiết quyết định, sai là tự khoá mình:

- **`NotAction` phải chứa service global.** IAM, STS, Organizations, CloudFront, Route 53,
  WAF, Shield là global nhưng endpoint ở `us-east-1`. Chặn hết region mà không loại trừ
  chúng = **không vào được IAM của account đó nữa**.
- **SCP không áp lên management account.** Test ở member account, nếu không bạn sẽ kết
  luận SCP không hoạt động.
- **Simulator không thấy SCP.** `allowed` ở simulator mà thực tế đỏ ⇒ nghi SCP trước tiên.

Luôn gắn SCP mới vào một **OU thử** trước, không gắn thẳng vào root.

</details>

### P10. Break-glass role

**Đề:** Một role quyền cao, thường ngày không ai dùng, bắt buộc MFA, có alert khi bị dùng.

<details>
<summary>Lời giải — ba phần</summary>

**1. Trust policy bắt MFA và giới hạn session ngắn:**

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"AWS": [
      "arn:aws:iam::<account>:user/oncall-1",
      "arn:aws:iam::<account>:user/oncall-2"
    ]},
    "Action": "sts:AssumeRole",
    "Condition": {
      "Bool": {"aws:MultiFactorAuthPresent": "true"},
      "NumericLessThan": {"aws:MultiFactorAuthAge": "3600"}
    }
  }]
}
```

```bash
aws iam update-role --role-name break-glass --max-session-duration 3600
```

**2. Alert khi role bị assume** — EventBridge rule bắt `AssumeRole` trong CloudTrail:

```json
{
  "source": ["aws.sts"],
  "detail-type": ["AWS API Call via CloudTrail"],
  "detail": {
    "eventSource": ["sts.amazonaws.com"],
    "eventName": ["AssumeRole"],
    "requestParameters": {
      "roleArn": ["arn:aws:iam::<account>:role/break-glass"]
    }
  }
}
```

Target: SNS topic có người thật đăng ký.

**3. Kiểm:**

| Thử | Kỳ vọng |
|---|---|
| `assume-role` **không** MFA | `AccessDenied` |
| `assume-role` có MFA | thành công, và **SNS gửi alert** |

```text i18n-prose
(chưa chạy — dán cả hai, và xác nhận đã nhận được alert)
```

`aws:MultiFactorAuthAge` là chi tiết hay bị bỏ: không có nó thì một session đã xác thực
MFA từ 11 giờ trước vẫn tính là "có MFA". `3600` buộc người ta xác thực lại gần thời điểm
dùng quyền cao.

**Alert mới là phần quan trọng nhất của bài**, không phải policy. Quyền cao không thể cấm
— có lúc phải dùng thật. Cái bạn cần là **không ai dùng nó mà không có người biết**.

</details>

### P11. Access Analyzer — tài nguyên đang lộ ra ngoài

**Đề:** Tìm mọi tài nguyên trong account đang share ra ngoài account hoặc ngoài
Organizations.

<details>
<summary>Lời giải</summary>

```bash
aws accessanalyzer create-analyzer --analyzer-name org-external \
  --type ACCOUNT   # hoac ORGANIZATION neu chay o management account

aws accessanalyzer list-findings \
  --analyzer-arn <arn> \
  --filter '{"status":{"eq":["ACTIVE"]}}' \
  --query 'findings[].[resourceType,resource,isPublic]' --output table
```

```text i18n-prose
(chưa chạy — dán danh sách finding vào đây; mục tiêu là 0 finding ngoài ý muốn)
```

Loại `ACCOUNT`/`ORGANIZATION` cho **external access** — **miễn phí**. Nó soi bucket policy,
KMS key policy, role trust policy, SQS policy, Lambda resource policy… và báo cái nào cho
principal ngoài vùng tin cậy vào được.

Với mỗi finding, đúng ba lựa chọn: **sửa** policy, **archive** finding kèm lý do (nếu cố ý
share), hoặc **xoá** tài nguyên. Để finding ACTIVE mà không quyết là trạng thái tệ nhất —
lần sau không ai biết nó đã được xem xét chưa.

⚠️ Loại **unused access** là analyzer **khác** và **có phí** theo role/tháng. Đừng bật
chung một lượt rồi quên.

</details>

---

## Phần D — Mẫu nâng cao (3 bài)

### P12. Tag-based access control

**Đề:** Một policy duy nhất cho N team, mỗi team chỉ thấy tài nguyên cùng tag.

<details>
<summary>Lời giải</summary>

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ChiThayTaiNguyenCungTeam",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:ResourceTag/Team": "${aws:PrincipalTag/Team}"
        }
      }
    },
    {
      "Sid": "TaoMoiThiPhaiGanTagCuaMinh",
      "Effect": "Allow",
      "Action": "s3:PutObject",
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:RequestTag/Team": "${aws:PrincipalTag/Team}"
        },
        "Null": {"aws:RequestTag/Team": "false"}
      }
    }
  ]
}
```

```text i18n-prose
(chưa chạy — gắn Team=alpha cho user A, Team=beta cho user B, thử chéo; dán 4 kết quả)
```

`${aws:PrincipalTag/Team}` là **biến policy** — nó được thay bằng giá trị thật lúc đánh
giá. Nhờ vậy một policy phục vụ mọi team, không phải N bản copy.

Ba điều kiện cần nhớ, thiếu một là hở:

- `aws:ResourceTag` đọc tag **của tài nguyên** — dùng cho hành động trên cái đã có.
- `aws:RequestTag` đọc tag **trong request tạo mới** — nếu không bắt thì user tạo tài
  nguyên không tag, rồi chính họ cũng không truy cập được (hoặc tệ hơn: tài nguyên không
  tag nằm ngoài mọi giới hạn).
- `Null: false` bắt tag phải có mặt — cùng cái bẫy ở bài
  [I18 bậc trung bình](bt-02-trung-binh.md).

🔴 **Đánh đổi thật:** mô hình này phụ thuộc tag đúng, mà **tag thì ai cũng sửa được** nếu
không chặn. Phải thêm `Deny` cho `s3:PutBucketTagging` / `ec2:CreateTags` trên tag key
`Team`, nếu không user tự đổi tag của mình là xong.

</details>

### P13. ABAC cho Identity Center

**Đề:** Người đăng nhập qua IdP ngoài. Làm sao tag `Team` của họ vào được policy?

<details>
<summary>Lời giải</summary>

Trong Identity Center bật **attribute-based access control**, map attribute của IdP sang
session tag:

```text i18n-prose
IdP attribute   ->  session tag
  department    ->  Team
  costCenter    ->  CostCenter
```

Sau đó permission set dùng `${aws:PrincipalTag/Team}` **y như bài P12** — không cần biết
người đó là ai, chỉ cần biết thuộc tính của họ.

```text i18n-prose
(chưa chạy — dán `aws sts get-caller-identity` + một lệnh bị chặn do sai Team)
```

Vì sao đây là đích đến của cả bậc: **không có IAM user, không có khoá, không có policy
riêng cho từng người.** Thêm một người vào team ở IdP là họ có đúng quyền ở mọi account,
không ai phải sửa policy. Bỏ họ khỏi team là mất quyền ngay.

Giới hạn phải biết: session tag **không** dùng được cho mọi service, và policy phụ thuộc
tag thì khó đọc hơn policy liệt kê ARN — debug một `AccessDenied` dạng này mất lâu hơn.

</details>

### P14. Soát định kỳ — biến bài tập thành thói quen

**Đề:** Thiết kế vòng soát hàng tháng cho IAM của một account.

<details>
<summary>Lời giải</summary>

| Chu kỳ | Việc | Lệnh / nơi làm |
|---|---|---|
| **Hàng tháng** | Credential report: khoá cũ, user không MFA | [I14](bt-02-trung-binh.md) |
| Hàng tháng | Snapshot `get-account-authorization-details`, `diff` với tháng trước | [P6](#p6-tìm-mọi-policy-quá-rộng-trong-account) |
| Hàng tháng | Access Analyzer: finding external access mới | [P11](#p11-access-analyzer--tài-nguyên-đang-lộ-ra-ngoài) |
| **Hàng quý** | Access Advisor cho mọi role: service chưa dùng 90 ngày | [P5](#p5-thu-hẹp-một-role--bằng-số-liệu) |
| Hàng quý | Soát mọi `iam:PassRole` với `Resource: "*"` | [P6](#p6-tìm-mọi-policy-quá-rộng-trong-account) |
| **Mỗi PR** | Policy test tự động | [P7](#p7-policy-test-trong-ci) |
| **Mỗi lần dùng** | Alert break-glass | [P10](#p10-break-glass-role) |

```text i18n-prose
(chưa chạy — dán lịch soát bạn đã dựng, và kết quả lần soát đầu tiên)
```

Cột trái quan trọng hơn cột phải: lệnh thì tra lại được, **chu kỳ** thì không ai nhắc. Một
lần soát rồi bỏ không khác gì không soát — vì quyền chỉ nới ra theo thời gian, không bao
giờ tự hẹp lại.

</details>

---

## Sáu nguyên tắc rút ra

Học thuộc sáu dòng này; đề hỏi trực tiếp, và production hỏng đúng ở đây:

1. Người → **Identity Center**. Máy trong AWS → **role**. Máy ngoài AWS → **OIDC**.
   Không có ô nào dành cho access key dài hạn.
2. Cấp quyền theo **role theo chức năng**, không theo từng người.
3. Siết dần, **mở rộng khi có bằng chứng** (CloudTrail / Access Advisor) — không mở sẵn
   `*` rồi hẹn dọn sau. Lần dọn đó không bao giờ tới.
4. `iam:PassRole`, `iam:CreatePolicyVersion`, `iam:UpdateAssumeRolePolicy` là **quyền leo
   thang** — cấp như cấp admin.
5. Policy mới: **mô phỏng trước khi apply**. Policy cũ: review có chu kỳ, không vĩnh viễn.
6. Quyền cao nhất phải **khó dùng**: break-glass có MFA, có alert, không ai dùng thường ngày.

## Related Topics

- [Policy evaluation](../reference/iam-policy-evaluation.md) — cơ chế đằng sau các mẫu ở đây
- [Bài tập — Trung bình](bt-02-trung-binh.md) — bậc trước, phải xong trước P5
- [Bài tập — Cơ bản](bt-01-co-ban.md) — bậc đầu, chạy miễn phí trên emulator
- [Access management](../../foundations/reference/access-management.md) — Identity Center, Secrets Manager ở tầng nền
- [Bài tập IAM](index.md) — ba bậc
