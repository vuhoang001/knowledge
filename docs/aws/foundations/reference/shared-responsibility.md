---
title: Shared responsibility model
sidebar_position: 5
description: "Security OF the cloud là của AWS, security IN the cloud là của khách. Ranh giới dịch chuyển theo service — EC2, RDS và Lambda chia khác nhau."
tags: [aws, clf-c02, shared-responsibility, security, iaas-paas, domain-2]
domain: cloud
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-13
---

# Shared responsibility model

> **Chốt:** AWS lo **security *of* the cloud**, khách lo **security *in* the cloud**. Nhưng
> ranh giới **không cố định** — nó dịch theo service. Dùng EC2 thì khách vá OS; dùng RDS
> thì AWS vá OS mà khách vẫn quản user trong database. Đề hỏi đúng chỗ dịch chuyển đó.

## Mục tiêu

Task 2.1 đòi bốn thứ: nhận ra các thành phần của model, nói được **phần của khách**, nói
được **phần của AWS**, và nói được **ranh giới dịch chuyển theo service** (guide nêu tên
RDS, Lambda, EC2).

## Giải thích cặn kẽ

Trước khi vào bảng, hãy nắm ý cốt lõi: AWS lo **cái hộp** — mọi thứ giúp đám mây *chạy
được và an toàn về vật lý*. Khách lo **cái bên trong hộp** — mọi thứ mình *đặt vào và cấu
hình*. Hai từ khoá để nhớ cả đời:

- **OF the cloud** = AWS. "Of" = bản thân hạ tầng: phần cứng, data center, hypervisor,
  mạng xương sống, Region/AZ.
- **IN the cloud** = khách. "In" = thứ bạn nhét vào trong đó: dữ liệu, cấu hình, phân
  quyền, mã nguồn.

Nghe một chữ khác nhau ("of" vs "in") nhưng đó đúng là lằn ranh mà đề thi xoáy vào.

### Analogy: thuê căn hộ

Hãy coi AWS như **chủ toà nhà cho thuê căn hộ**, còn bạn là **người thuê**:

| Chủ toà nhà (AWS) lo | Người thuê (khách) lo |
|---|---|
| Móng, tường, mái, kết cấu toà nhà | Đồ đạc bạn mang vào trong phòng |
| Hệ thống điện, nước, thang máy chung | Khoá cửa phòng mình, giữ chìa khoá cho ai |
| Bảo vệ ở sảnh, camera an ninh toà nhà | Có đóng cửa sổ lại không, có để người lạ vào không |
| Sửa khi thang máy hỏng | Dọn dẹp và sắp xếp trong phòng |

Chủ toà nhà đảm bảo *toà nhà* an toàn và vững, nhưng **không chịu trách nhiệm** nếu bạn
để cửa phòng mở toang rồi mất đồ. Security Group mở cổng 22 cho cả thế giới = để cửa
phòng mở toang — đó là lỗi của **người thuê**, không phải chủ nhà.

Một analogy khác hợp với việc "ranh giới dịch theo service": **thuê xe**. Thuê xe tự lái
(EC2) thì bạn tự đổ xăng, tự để ý đèn báo, tự đỗ xe đúng chỗ. Thuê xe có tài xế (RDS/
Lambda) thì hãng lo chiếc xe và người lái, bạn chỉ lo **đi đâu và mang theo gì** — nhưng
đồ đạc bạn để trên xe (dữ liệu) và việc cho ai ngồi cùng (phân quyền) thì vẫn là của bạn,
dù thuê kiểu nào.

## Tổng quan

### Hai nửa

| | AWS — *security **of** the cloud* | Khách — *security **in** the cloud* |
|---|---|---|
| Phần cứng | Server, ổ đĩa, thiết bị mạng | — |
| Cơ sở vật chất | Data center, điện, làm mát, an ninh vật lý | — |
| Hạ tầng ảo hoá | Hypervisor, hạ tầng Region/AZ | — |
| Vứt bỏ ổ đĩa an toàn | ✅ | — |
| OS và patch | **Tuỳ service** | **Tuỳ service** |
| Dữ liệu của khách | — | ✅ **Luôn luôn** |
| Phân loại dữ liệu | — | ✅ |
| IAM — user, group, role, policy | — | ✅ **Luôn luôn** |
| Mã hoá phía client, quản khoá | — | ✅ |
| Cấu hình firewall (SG, NACL) | — | ✅ |
| Cấu hình network và truyền | Hạ tầng mạng | Cấu hình của khách |

**Hai dòng không bao giờ dịch chuyển:** *dữ liệu của khách* và *IAM*. Dù dùng service
serverless nhất đi nữa, hai thứ đó vẫn là của khách. Đáp án nào nói AWS quản IAM policy
của bạn là sai, không cần đọc tiếp.

### Ma trận trách nhiệm chi tiết

Bảng dưới liệt kê từng hạng mục cụ thể hay bị hỏi — đọc theo hàng để biết "cái này ai
lo". Cột giữa đánh dấu khi nào mới thuộc AWS.

| Hạng mục | AWS lo | Khách lo | Ghi chú |
|---|---|---|---|
| Vá **hypervisor** | ✅ | — | Luôn của AWS, không bao giờ dịch |
| Vá **OS guest** (EC2) | — | ✅ | Trên EC2 là việc của khách |
| Vá **OS** dưới service managed (RDS/Lambda) | ✅ | — | Khách không thấy OS này |
| Vá **DB engine** (RDS) | ✅ | — | Khách chọn maintenance window + phiên bản |
| Vá **DB engine** tự cài trên EC2 | — | ✅ | Tự cài thì tự vá hết |
| **Mã hoá dữ liệu** (bật, chọn kiểu, quản khoá) | — | ✅ | Khách quyết định bật và quản key |
| Hạ tầng cho dịch vụ mã hoá (KMS, phần cứng HSM) | ✅ | — | AWS vận hành KMS; khách dùng |
| Cấu hình **Security Group / NACL** | — | ✅ | AWS không bao giờ sửa rule của bạn |
| Quản **IAM user, role, access key** | — | ✅ | Luôn của khách, tuyệt đối |
| **Bảo mật vật lý data center** | ✅ | — | Khách còn không được vào |
| **Phân loại dữ liệu** (nhạy cảm hay không) | — | ✅ | Chỉ khách biết dữ liệu là gì |
| **Xoá/huỷ ổ đĩa** an toàn khi hết vòng đời | ✅ | — | AWS làm media disposal |
| Bảo vệ **mạng xương sống** giữa Region/AZ | ✅ | — | Hạ tầng mạng toàn cầu |
| Cấu hình **routing, VPC, subnet** | — | ✅ | Khách tự thiết kế mạng của mình |
| **Backup/snapshot** dữ liệu ứng dụng | — | ✅ (thường) | RDS có auto-backup nhưng khách phải bật/giữ |
| **Patch dependency** trong code/container image | — | ✅ | Thư viện bạn đóng gói là của bạn |

Đọc ngược lại cũng được: cột "AWS lo" toàn là thứ dính tới **vật lý, hạ tầng, hypervisor,
engine managed**. Cột "khách lo" toàn là thứ dính tới **dữ liệu, phân quyền, cấu hình,
mã nguồn**. Nhớ hai nhóm từ khoá đó là đoán được 90% câu hỏi.

### Ranh giới dịch theo service

| Service | AWS lo | Khách lo |
|---|---|---|
| **EC2** (IaaS) | Phần cứng, hypervisor | **Guest OS + patch**, app, firewall (SG), mã hoá, IAM, dữ liệu |
| **RDS** (managed) | Phần cứng, OS, patch engine DB, backup tự động | **User và quyền trong DB**, cấu hình mạng/SG, mã hoá, dữ liệu, IAM |
| **Lambda** (serverless) | Mọi thứ tới runtime | **Mã nguồn**, IAM role của function, dữ liệu, biến môi trường |
| **S3** (managed) | Hạ tầng lưu trữ, độ bền | **Ai được truy cập**, bucket policy, bật mã hoá, versioning |

Đọc bảng theo chiều từ trên xuống: **càng managed, phần của khách càng hẹp — nhưng không
bao giờ bằng không.** Mô hình này đôi khi gọi là *inherited controls*: khách thừa hưởng
các kiểm soát vật lý và môi trường từ AWS.

### Ranh giới dịch theo từng bậc — ví dụ cụ thể

Hình dung một cái "thang" từ tự lo nhiều nhất đến ít nhất. Mỗi bậc AWS gánh thêm một
tầng, phần của khách co lại — nhưng **dữ liệu, IAM và mã hoá phía khách thì bám ở mọi
bậc, không bao giờ rớt sang AWS.**

1. **EC2 (IaaS) — tự lo nhiều nhất.**
   Bạn thuê một máy ảo trống. AWS giao phần cứng và hypervisor chạy ổn; từ **guest OS trở
   lên là của bạn**. Ví dụ: chạy Ubuntu trên EC2 → bạn phải tự `apt upgrade` vá lỗ hổng
   kernel, tự cài và vá PostgreSQL nếu dùng, tự chỉnh Security Group, tự bật mã hoá ổ EBS.
   Có lỗ hổng OS chưa vá mà bị tấn công → đó là **trách nhiệm của bạn**.

2. **RDS (managed database) — AWS gánh thêm OS và engine.**
   Giờ AWS vá cả **OS lẫn phiên bản MySQL/PostgreSQL** cho bạn (bạn chỉ chọn maintenance
   window). Nhưng việc **tạo user trong database, cấp quyền `GRANT`, đặt mật khẩu, bật mã
   hoá at-rest, cấu hình Security Group chặn truy cập, và bản thân dữ liệu** vẫn là của
   bạn. Ví dụ: bạn tạo user `app_readonly` và cấp quyền SELECT → AWS không dính gì tới
   việc đó.

3. **Lambda / Fargate (serverless) — AWS lo tới tận runtime.**
   Bạn không còn thấy server hay OS nào cả. AWS lo tất cả tới **runtime** (vd runtime
   Python/Node của Lambda, hạ tầng chạy container của Fargate). Phần của bạn co lại còn:
   **mã nguồn + các thư viện bạn đóng gói, IAM role gắn vào function/task, biến môi
   trường, và dữ liệu**. Ví dụ: một dependency npm trong Lambda của bạn có CVE → đó vẫn
   là việc của bạn vá, vì bạn đóng gói nó.

4. **S3 / DynamoDB (managed storage) — khách chỉ còn lo data + quyền truy cập.**
   Không có OS, không có engine, không có server để nghĩ tới. AWS lo độ bền, hạ tầng, hạ
   tầng mã hoá. Bạn chỉ còn **ai được truy cập (bucket policy / IAM / DynamoDB policy),
   có bật mã hoá không, có bật versioning/block-public-access không, và chính dữ liệu**.
   Ví dụ: để một S3 bucket public lộ dữ liệu khách hàng → lỗi cấu hình của bạn, AWS không
   chịu trách nhiệm.

**Ba thứ dán chặt ở mọi bậc, KHÔNG BAO GIỜ dịch sang AWS:**

- **Dữ liệu** của khách — AWS không biết và không đụng vào nội dung của bạn.
- **Phân quyền IAM** — user, role, policy, access key là bạn tạo và quản.
- **Mã hoá phía khách** (bật mã hoá, chọn kiểu, quản khoá qua KMS) — AWS cung cấp *công
  cụ* mã hoá, nhưng *quyết định dùng và quản khoá* là của bạn.

Nếu một đáp án nói AWS lo một trong ba thứ này — loại ngay, kể cả service serverless nhất.

### Ba loại kiểm soát

| Loại | Nghĩa | Ví dụ |
|---|---|---|
| **Inherited** | Khách thừa hưởng hoàn toàn từ AWS | An ninh vật lý, kiểm soát môi trường |
| **Shared** | Hai bên làm ở hai tầng khác nhau | Patch (AWS vá hạ tầng, khách vá guest OS) · quản lý cấu hình · nhận thức và đào tạo |
| **Customer specific** | Hoàn toàn của khách | Phân loại dữ liệu, IAM, mã hoá dữ liệu |

### Patch: chỗ dễ nói sai nhất

| Service | Ai vá OS | Ai vá app/engine |
|---|---|---|
| EC2 | **Khách** | Khách |
| RDS | AWS | AWS vá engine; khách chọn **cửa sổ bảo trì** và phiên bản |
| Lambda | AWS | Khách chỉ lo dependency trong package của mình |
| ECS trên EC2 | **Khách** (vá EC2 làm node) | Khách lo image container |
| ECS trên **Fargate** | AWS | Khách lo image container |

Hai dòng cuối là cặp bẫy phổ biến: **ECS không tự nghĩa là không quản server.** Chỉ khi
launch type là **Fargate** thì mới hết việc vá node — xem [compute](compute.md).

## Ví dụ cụ thể — tình huống đề thi mẫu

Đề CLF-C02 hay ra dạng "ai chịu trách nhiệm cho X?". Luyện phản xạ qua vài tình huống:

**Tình huống 1 — Vá OS của một instance EC2 đang chạy production.**

<details>
<summary>Ai chịu trách nhiệm?</summary>

**Khách.** EC2 là IaaS: AWS chỉ lo phần cứng và hypervisor, từ guest OS trở lên là của
khách. Khách phải tự cập nhật bản vá bảo mật cho OS. Đáp án nào nói AWS là sai.

</details>

**Tình huống 2 — Vá phiên bản MySQL engine trên một RDS instance.**

<details>
<summary>Ai chịu trách nhiệm?</summary>

**AWS.** RDS là managed database: AWS vá cả OS lẫn DB engine. Khách chỉ chọn
*maintenance window* để AWS áp bản vá. Nhưng chú ý: việc tạo **user trong database** và
cấp quyền thì vẫn là của khách — câu hỏi thường gài chỗ này.

</details>

**Tình huống 3 — Một S3 bucket bị cấu hình public và làm lộ dữ liệu khách hàng.**

<details>
<summary>Ai chịu trách nhiệm?</summary>

**Khách.** AWS lo độ bền và hạ tầng của S3, nhưng *ai được truy cập* và cấu hình bucket
policy / Block Public Access là của khách. Cấu hình sai dẫn tới lộ dữ liệu là trách
nhiệm của khách. (Mẹo: mọi câu có từ "misconfigured" hay "public" gần như luôn trỏ về
phía khách.)

</details>

**Tình huống 4 — Bảo đảm an ninh vật lý cho data center và huỷ ổ đĩa hỏng an toàn.**

<details>
<summary>Ai chịu trách nhiệm?</summary>

**AWS.** An ninh vật lý và media disposal là *security of the cloud* — hoàn toàn của AWS,
khách thậm chí không được vào data center. Đây là loại kiểm soát *inherited*.

</details>

## Bẫy trong đề

| Bẫy | Vì sao sai |
|---|---|
| "AWS lo bảo mật, khách không phải làm gì" | Khách luôn giữ dữ liệu và IAM |
| "Dùng RDS nên AWS quản luôn user trong database" | AWS vá engine, **khách tạo và phân quyền user** |
| "AWS mã hoá dữ liệu của tôi mặc định nên tôi không cần nghĩ" | Khách là người **bật** và chọn cách quản khoá |
| "Dùng container nên không phải vá OS" | Chỉ đúng với **Fargate**; ECS/EKS trên EC2 thì khách vẫn vá node |
| "AWS chịu trách nhiệm nếu security group mở cổng 22 cho cả thế giới" | Cấu hình firewall là của khách — **AWS không sửa cấu hình của bạn** |

## Đánh đổi

| Hướng | Được | Mất |
|---|---|---|
| Đi về phía managed/serverless | Phần bảo mật phải tự lo hẹp lại; AWS vá nhanh hơn người | Ít quyền tinh chỉnh; phụ thuộc lịch bảo trì của AWS |
| Giữ EC2 tự quản | Toàn quyền OS, cài gì cũng được, BYOL dễ | Gánh toàn bộ việc vá — và lỗ hổng chưa vá là **trách nhiệm của khách** |

Trong đề, cụm **"reduce operational overhead"** hầu như luôn đẩy đáp án về phía managed,
chính vì nó đẩy ranh giới này sang phía AWS.

## Related Topics

- [Access management](access-management.md) — IAM, nửa không bao giờ dịch chuyển
- [Governance và compliance](security-governance-compliance.md) — AWS Artifact là nơi lấy bằng chứng cho *phần của AWS*
- [Thành phần bảo mật](security-components.md) — SG, NACL, WAF: công cụ cho *phần của khách*
- [Compute](compute.md) — Fargate ⇄ EC2 launch type, chỗ ranh giới dịch chuyển rõ nhất
- [AWS · Foundations](../index.md)
