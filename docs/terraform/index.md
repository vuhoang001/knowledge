---
title: Terraform
description: "Declarative IaC — state, provider, vòng lặp plan/apply. Công cụ đổi, nhưng mô hình reconcile-từ-state thì dùng chung với mọi IaC tool khác."
tags: [terraform, iac, devops]
domain: devops
category: technology
doc_type: index
status: draft
difficulty: beginner
updated: 2026-10-28
---

# Terraform

**Đây là công nghệ, nhưng phần mất giá chậm nhất của nó lại là khái niệm.** Cú pháp HCL
hay tên CLI flag có thể đổi qua các version; nhưng *state là trí nhớ không phải thực
tại*, *plan là diff không phải thực thi*, *resource graph quyết định thứ tự* — ba ý đó
đúng y hệt trên OpenTofu, Pulumi, CloudFormation hay Crossplane. Học Terraform mà chỉ
nhớ lệnh là học cách gõ; hiểu state/plan/graph rồi thì đổi sang IaC tool nào cũng đọc
tài liệu của nó nhanh hơn hẳn.

> Chỗ này trả lời **"vì sao Terraform hành xử như vậy"**. Danh sách resource/argument
> cụ thể của một provider (ví dụ toàn bộ tham số `aws_instance`) không thuộc về đây —
> tra thẳng [Terraform Registry](https://registry.terraform.io/), nó đổi liên tục và
> không đáng chép lại vào một kho tri thức tĩnh.

## Nội dung

Năm nhóm chuẩn, giống mọi chủ đề khác trong kho — xem [`ROUTING.md`](https://github.com/vuhoang001/knowledge/blob/main/ROUTING.md).

### [Tài liệu](reference/index.md) — nó là gì, vì sao, đánh đổi ra sao

| # | Tài liệu | Trả lời câu hỏi | Mức | Trạng thái |
|---|---|---|---|---|
| 1 | [State](reference/state.md) | Terraform so sánh config với CÁI GÌ — và vì sao xoá tài nguyên bằng tay làm `plan` báo `+ create` | beginner | 📝 output chạy thật |
| 2 | [Providers và Resources](reference/providers-and-resources.md) | Ai thật sự tạo ra tài nguyên; vì sao `init` đôi khi tải gì đó, đôi khi không | beginner | 📝 output chạy thật |
| 3 | [Quy trình Plan / Apply](reference/plan-apply-workflow.md) | Ba ký hiệu `+ ~ -` là toàn bộ ngữ pháp của diff; vì sao apply hai lần liên tiếp không làm gì | beginner | 📝 output chạy thật |

### Kỹ năng — kỹ thuật áp dụng lên phần trên (dự kiến, chưa viết)

| # | Kỹ thuật | Trả lời câu hỏi |
|---|---|---|
| 1 | Import | Đưa resource đã tạo sẵn ngoài Terraform vào state mà không recreate |
| 2 | State surgery (`mv`/`rm`) | Đổi tên resource, tách module mà không destroy/recreate tài nguyên thật |
| 3 | `count` vs `for_each` | Khi nào resource đánh số theo chỉ số, khi nào theo khoá — và vì sao đổi key của `for_each` gây destroy/recreate |
| 4 | Lifecycle meta-argument | `create_before_destroy`, `prevent_destroy`, `ignore_changes` — mỗi cái vá một lớp lỗi khác nhau |
| 5 | Remote state làm data source | Đọc output của một state khác, ghép hai layer hạ tầng không cùng thư mục |
| 6 | Secrets trong state | State lưu plaintext mọi attribute — `sensitive = true` chỉ ẩn ở output CLI, không mã hoá state |
| 7 | Backend và state locking | Ai được ghi state lúc nào — S3+DynamoDB, Terraform Cloud, và vì sao local backend không an toàn khi có người thứ hai |
| 8 | Provisioners | `local-exec`/`remote-exec` là đường cùng khi provider không có resource tương ứng, không phải lựa chọn đầu tiên |

### Ba nhóm còn lại

| Nhóm | Nội dung |
|---|---|
| [Bài tập](tutorials/index.md) | **Lab 0 đã viết** — vòng đời đầy đủ + tự tay gây drift. Lab 1–4 (modules, remote state, import, state surgery) đang ở dạng mục lục dự kiến |
| Cheatsheet | Chưa có — mở khi có bài lab CLI đủ dùng để tra nhanh |
| Case study | Chưa có — mỗi kỹ thuật ở Kỹ năng cần ít nhất một ca hỏng cụ thể, viết sau khi phần Kỹ năng có nội dung |

Ký hiệu: ✅ đã chạy tay và xác nhận · 📝 output chạy thật khi viết, `verified_at` chờ
chủ repo chạy lại tay · ⬜ chưa viết, chỉ nằm trong mục lục dự kiến ở trên.

## Vì sao bắt đầu từ State, không phải từ HCL syntax

Phần lớn tài liệu nhập môn Terraform bắt đầu từ cú pháp: `resource` block viết thế nào,
`variable` khai ra sao. Vế đó học nhanh — nó giống học cú pháp một ngôn ngữ lập trình.
Vế tốn tiền thật là **mô hình tư duy**: Terraform không "thấy" hạ tầng của bạn, nó chỉ
thấy state. Không hiểu điều đó thì:

- Xoá nhầm `terraform.tfstate` → tưởng mất tài nguyên, thật ra chỉ mất *khả năng quản
  lý* tài nguyên đó bằng Terraform (tài nguyên thật vẫn còn, tốn tiền vẫn tốn).
- Hai người cùng `apply` không có remote state + lock → state ghi đè nhau, một bên
  "biến mất" khỏi hiểu biết của Terraform mà không có lỗi nào báo.
- Ai đó sửa tài nguyên bằng console cloud → `plan` lần sau báo thay đổi lạ, vì nó đang
  so với state cũ, không phải so với lần sửa tay đó.

Cả ba đều **không phải lỗi cú pháp**. HCL viết đúng, `terraform validate` xanh. Sai ở
chỗ không phân biệt được "cái Terraform nhớ" với "cái đang thật sự tồn tại".

## Learning Path

```text
Provider và Resource         ← bắt đầu ở đây: ai tạo ra cái gì
      ↓
State                        ← trọng tâm: Terraform chỉ biết cái nó nhớ
      ↓
Quy trình Plan / Apply        ← ba ký hiệu +/~/-, và vì sao phải review trước khi apply
      ↓
Lab 0: vòng đời đầy đủ + tự tay gây drift   ← chạy thật ở đây
      ↓
Import · State surgery · count vs for_each   (kỹ thuật theo tình huống, chưa viết)
      ↓
Backend và locking · Modules                 (vận hành nhiều người, chưa viết)
```

**Đường ngắn nhất tới chỗ dùng được:** Providers/Resources → State → Plan/Apply → Lab 0.

## Related Topics

- [AWS](../aws/index.md) — provider cloud phổ biến nhất để thực hành Terraform thật
- [Bash](../bash/index.md) — hầu hết lệnh Terraform chạy trong script shell, CI pipeline
- [Glossary](../glossary/index.md)
