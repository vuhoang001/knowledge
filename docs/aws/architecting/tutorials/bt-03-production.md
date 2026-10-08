---
title: Bài tập — Production
sidebar_position: 30
description: "Tám bài biến IAM từ cơ chế thành quy trình: bỏ khoá tĩnh, OIDC cho CI, least privilege dựng từ CloudTrail, boundary chặn leo thang, SCP, break-glass có MFA."
tags: [tutorial, aws, iam, saa-c03, oidc, least-privilege, scp, organizations, break-glass, access-analyzer, domain-1]
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
> gọn lại thành một câu: **không có credential dài hạn ở đâu cả** — con người đăng nhập
> qua Identity Center, máy trong AWS dùng role, máy ngoài AWS dùng OIDC. Mọi bài dưới đây
> là một cách thực hiện câu đó.

Bậc trước: [Trung bình](bt-02-trung-binh.md) ·
Lý thuyết: [Policy evaluation](../reference/iam-policy-evaluation.md)

Đây cũng là bậc trả lời đúng hai cụm từ đề SAA-C03 hay dùng — *MOST secure* và
*LEAST operational overhead* — vì hai cụm đó thường trỏ về cùng một đáp án: bỏ khoá tĩnh.

## Tám bài

| # | Bài | Xong khi |
|---|---|---|
| P1 | **Kiểm kê khoá tĩnh.** Đếm mọi access key đang tồn tại; với từng cái trả lời *"thay bằng role được không"* | 0 khoá cho con người (dùng Identity Center), 0 khoá cho app chạy **trong** AWS (dùng instance profile / task role) |
| P2 | **CI/CD không giữ secret.** GitHub Actions assume role AWS qua **OIDC**, trust policy khoá theo `sub` đúng repo + branch | workflow lấy được credential tạm, repo **không** chứa `AWS_SECRET_ACCESS_KEY` |
| P3 | **Least privilege có bằng chứng.** Lấy một role đang `*:*`, dùng Access Advisor + CloudTrail xem nó thật sự gọi gì trong 30 ngày, viết lại policy theo đúng danh sách đó, mô phỏng trước khi apply | policy mới `allowed` cho mọi action role thật sự dùng, `implicitDeny` cho phần còn lại |
| P4 | **Chặn leo thang.** Gắn permission boundary bắt buộc cho mọi role mà developer tự tạo được | dev tạo được role, nhưng **không** tạo nổi role vượt boundary |
| P5 | **Trần toàn tổ chức.** Organizations + SCP: chặn region không dùng (`aws:RequestedRegion`), chặn tắt CloudTrail, chặn `iam:DeleteRole` ngoài vùng cho phép | admin trong member account **cũng không** vượt được SCP |
| P6 | **Break-glass.** Một role quyền cao, thường ngày không ai assume, bắt buộc `aws:MultiFactorAuthPresent`, có alarm CloudTrail khi bị assume | assume không MFA → thất bại · assume có MFA → sinh alert |
| P7 | **Vòng soát định kỳ.** IAM Access Analyzer tìm tài nguyên đang share ra ngoài account/org; credential report hàng tháng | 0 finding cross-account ngoài ý muốn |
| P8 | **Tag-based access control.** Một policy cho phép hành động chỉ khi `aws:PrincipalTag/Team` == `aws:ResourceTag/Team` | hai team dùng **chung một** policy mà không thấy tài nguyên của nhau |

## Mẫu P1 — kiểm kê khoá tĩnh

```bash
for u in $(aws iam list-users --query 'Users[].UserName' --output text); do
  aws iam list-access-keys --user-name "$u" \
    --query "AccessKeyMetadata[].[UserName,AccessKeyId,Status,CreateDate]" --output text
done
```

Mỗi dòng trả về là một câu hỏi phải trả lời, không phải một dòng để đọc qua:

| Khoá này của ai | Thay bằng gì |
|---|---|
| Một con người | **IAM Identity Center** — xoá khoá |
| App chạy trên EC2 / ECS / Lambda | **Instance profile / task role / execution role** — xoá khoá |
| CI/CD ngoài AWS | **OIDC federation** (bài P2) — xoá khoá |
| Script trên laptop ai đó | Identity Center + `aws sso login` — xoá khoá |

Cột phải không có ô nào ghi *"giữ nguyên"*. Đó chính là kết luận của bài.

## Mẫu P2 — OIDC cho GitHub Actions

Đây là bài có giá trị thực tế cao nhất cả bậc: nó xoá vĩnh viễn nhu cầu để secret AWS
trong repo.

Trust policy của role (thay `<…>` bằng giá trị của bạn):

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

🔴 **Chỗ duy nhất được phép sai ở bài này là `sub`, và sai nó là mất cả bài.**

| Viết `sub` thành | Hậu quả |
|---|---|
| `repo:<org>/<repo>:ref:refs/heads/main` | đúng — chỉ branch `main` của đúng repo đó |
| `repo:<org>/<repo>:*` | mọi branch, **mọi pull request** — người ngoài mở PR là chạy được |
| dùng `StringLike` với `repo:<org>/*` | mọi repo trong org |
| bỏ hẳn điều kiện `sub` | **mọi repo GitHub trên thế giới** assume được role của bạn |

Dòng cuối không phải nói quá: provider `token.actions.githubusercontent.com` phục vụ toàn
bộ GitHub, nên không khoá `sub` thì bạn vừa mở role cho tất cả. Đây đúng là confused
deputy ở
[lý thuyết](../reference/iam-policy-evaluation.md#confused-deputy-và-hai-condition-key-ngăn-nó),
chỉ khác tên gọi.

Phía workflow — không có secret nào:

```yaml
permissions:
  id-token: write        # thieu dong nay la khong co OIDC token
  contents: read
```

Ô dán kết quả:

```text
(chưa chạy — dán output `aws sts get-caller-identity` chạy trong Actions vào đây;
 Arn phải là .../assumed-role/<ten-role>/<ten-session>, KHÔNG phải :user/...)
```

## Mẫu P3 — least privilege có bằng chứng

Thứ tự ba bước, không đảo:

```bash
# 1. role nay thuc su goi service nao trong 30 ngay?
aws iam generate-service-last-accessed-details --arn <arn-cua-role>
aws iam get-service-last-accessed-details --job-id <job-id> \
  --query 'ServicesLastAccessed[?TotalAuthenticatedEntities>`0`].[ServiceNamespace,LastAuthenticated]' \
  --output table

# 2. action cu the thi phai lay tu CloudTrail — Access Advisor chi tra ve muc service
aws cloudtrail lookup-events --max-results 50 \
  --lookup-attributes AttributeKey=Username,AttributeValue=<ten-role>

# 3. viet lai policy roi MO PHONG truoc khi apply
aws iam simulate-custom-policy --policy-input-list "$(cat policy-moi.json)" \
  --action-names <action-1> <action-2> --resource-arns <arn>
```

:::warning Access Advisor chỉ thấy quá khứ

Nó trả về quyền **đã dùng**, không phải quyền **cần**. Một action chỉ chạy theo quý, hoặc
chỉ chạy khi có sự cố, sẽ không xuất hiện trong 30 ngày và bị cắt oan — rồi hỏng đúng lúc
tệ nhất. ⇒ Cửa sổ quan sát nên là **90 ngày**, và trước khi cắt phải hỏi chủ service xem
có đường chạy nào theo lịch thưa.

:::

## Chi phí của bậc này

IAM core miễn phí, nhưng ba thứ trong danh sách trên thì không hoàn toàn:

| Thứ | Phí |
|---|---|
| IAM API, role, policy, Policy Simulator, credential report, Access Advisor | **$0** |
| AWS Organizations, SCP | **$0** — nhưng P5 cần ≥ 2 account (tạo account thêm không mất tiền) |
| IAM Access Analyzer — **external access** | **$0** · đủ cho P7 |
| IAM Access Analyzer — **unused access** | **có phí** theo role/tháng — kiểm giá hiện hành trước khi bật, tắt sau khi lab |
| CloudTrail | trail **quản lý event đầu tiên** mỗi account miễn phí; trail thứ hai và **data event** có phí |
| IAM Identity Center | **$0** |

Hai dòng cần để ý là *unused access* và *data event* — cả hai đều bật bằng một cú bấm và
tính tiền theo thời gian chạy.

## Sáu nguyên tắc rút ra

Học thuộc sáu dòng này; đề hỏi trực tiếp, và production hỏng đúng ở đây:

1. Con người → **Identity Center**. Máy trong AWS → **role**. Máy ngoài AWS → **OIDC**.
   Không có ô nào dành cho access key dài hạn.
2. Cấp quyền theo **role theo chức năng**, không theo từng người.
3. Siết dần và **mở rộng khi có bằng chứng** (CloudTrail / Access Advisor) — không mở sẵn
   `*` rồi hẹn dọn sau. Lần dọn đó không bao giờ tới.
4. `iam:PassRole`, `iam:CreatePolicyVersion`, `iam:UpdateAssumeRolePolicy` là **quyền leo
   thang** — cấp như cấp admin.
5. Policy mới: **mô phỏng trước khi apply**. Policy cũ: review có hạn, không để vĩnh viễn.
6. Quyền cao nhất phải **khó dùng**: break-glass có MFA, có alarm, không ai assume thường ngày.

## Related Topics

- [Policy evaluation](../reference/iam-policy-evaluation.md) — cơ chế đằng sau các mẫu ở đây
- [Bài tập — Trung bình](bt-02-trung-binh.md) — bậc trước, phải xong trước P3
- [Access management](../../foundations/reference/access-management.md) — Identity Center, Secrets Manager ở tầng nền
- [Bài tập IAM](index.md) — ba bậc
