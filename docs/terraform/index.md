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
| 4 | [Variables, Outputs và Locals](reference/variables-outputs-locals.md) | Thứ tự ưu tiên khi CLI/`.tfvars`/env var cùng truyền giá trị; vì sao `sensitive` không mã hoá gì | beginner | 📝 output chạy thật |
| 5 | [Modules](reference/modules.md) | Gọi cùng module hai lần ra hai bộ resource độc lập — địa chỉ state có tiền tố `module.<tên>` thế nào | intermediate | 📝 output chạy thật |

### [Kỹ năng](skills/index.md) — kỹ thuật áp dụng lên phần trên

| # | Kỹ thuật | Trả lời câu hỏi | Tài liệu riêng | Lab minh hoạ |
|---|---|---|---|---|
| 1 | Import | Đưa resource đã tạo sẵn ngoài Terraform vào state mà không recreate | [skill](skills/import.md) | [Lab 4](tutorials/lab-04-import.md) (Docker) · [Lab 9](tutorials/lab-09-import-existing-bucket.md) (AWS) |
| 2 | `count` vs `for_each` | Xoá phần tử giữa danh sách — `count` đổi tên/xoá nhầm resource, `for_each` thì không | [skill](skills/count-vs-for-each.md) | [Lab 7](tutorials/lab-07-vpc-subnet-sg.md) (subnet theo CIDR) |
| 3 | Backend và state locking | Ai được ghi state lúc nào; backend không đọc được `var.*`; lock DynamoDB vs lock S3-native | [skill](skills/backend-va-locking.md) | [Lab 2](tutorials/lab-02-state-locking.md) (local lock) |
| 4 | State surgery (`mv`/`rm`) | Đổi tên resource, tách module mà không destroy/recreate tài nguyên thật | ⬜ dự kiến | [Lab 3](tutorials/lab-03-state-surgery.md) |
| 5 | Lifecycle meta-argument | `create_before_destroy`, `prevent_destroy`, `ignore_changes` — mỗi cái vá một lớp lỗi khác nhau | ⬜ dự kiến | — |
| 6 | Remote state làm data source | Đọc output của một state khác, ghép hai layer hạ tầng không cùng thư mục | ⬜ dự kiến | — |
| 7 | Secrets trong state | State lưu plaintext mọi attribute — `sensitive = true` chỉ ẩn ở output CLI, không mã hoá state | ⬜ dự kiến (demo thật đã có ở [Variables/Outputs/Locals](reference/variables-outputs-locals.md)) | — |
| 8 | Provisioners | `local-exec`/`remote-exec` là đường cùng khi provider không có resource tương ứng, không phải lựa chọn đầu tiên | ⬜ dự kiến | [Lab 2](tutorials/lab-02-state-locking.md), [Lab 8](tutorials/lab-08-ec2-instance.md) có dùng/bàn tới |

### Ba nhóm còn lại

| Nhóm | Nội dung |
|---|---|
| [Bài tập](tutorials/index.md) | **10 lab đã viết** — Lab 0-4 (drift, modules, state locking, state surgery, import Docker) dùng provider local/Docker; Lab 5-9 (S3, IAM, VPC/SG, EC2, import) chạy thật trên AWS qua LocalStack |
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

Nhưng hiểu state/plan/graph là **chưa đủ để viết được** — phải biết cả lớp "biết viết"
(`variable`/`output`/`locals`/`module`, mục 4-5 ở bảng Tài liệu) trước khi tới các kỹ
thuật tình huống ở nhóm Kỹ năng. Mục 4-5 không giải thích "vì sao Terraform hành xử
vậy" như 3 mục đầu — chúng là nền cú pháp tối thiểu mọi kỹ năng sau đó giả định đã biết.

## Learning Path

```text
Provider và Resource         ← bắt đầu ở đây: ai tạo ra cái gì
      ↓
State                        ← trọng tâm: Terraform chỉ biết cái nó nhớ
      ↓
Quy trình Plan / Apply        ← ba ký hiệu +/~/-, và vì sao phải review trước khi apply
      ↓
Lab 0: vòng đời đầy đủ + tự tay gây drift
      ↓
Variables, Outputs, Locals · Modules        ← lớp "biết viết" trước khi vào kỹ thuật tình huống
      ↓
Lab 1: Modules · Lab 2: State locking · Lab 3: State surgery · Lab 4: Import (Docker)
      ↓
Import · count vs for_each · Backend và locking   ← 3 skill đã viết, chạy thật trên AWS (LocalStack)
      ↓
Lab 5-9: S3 · IAM · VPC/SG · EC2 · Import (AWS)     ← chạy thật trên AWS ở đây
      ↓
Lifecycle · Remote state · Secrets · Provisioners   (kỹ thuật theo tình huống, chưa viết thành bài riêng)
```

**Đường ngắn nhất tới chỗ dùng được:** Providers/Resources → State → Plan/Apply → Lab
0 → Variables/Outputs/Locals → Lab 1-4 (cơ chế) → Lab 5 (AWS thật).

## Related Topics

- [AWS](../aws/index.md) — provider cloud phổ biến nhất để thực hành Terraform thật
- [Bash](../bash/index.md) — hầu hết lệnh Terraform chạy trong script shell, CI pipeline
- [Glossary](../glossary/index.md)
