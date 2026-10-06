---
title: Storage
i18n_status: untranslated
sidebar_position: 14
description: "Object, block, file — ba loại không thay nhau được. Bảy lớp S3 chọn theo tần suất truy cập và thời gian chấp nhận chờ, kèm lifecycle chạy thật trên emulator."
tags: [aws, clf-c02, s3, ebs, efs, glacier, lifecycle, storage-gateway, domain-3]
domain: cloud
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-06
---

# Storage

> **Chốt:** Ba loại storage trả lời ba câu hỏi khác nhau. **Object (S3)** — ghi/đọc cả file
> qua API, dung lượng không giới hạn. **Block (EBS)** — ổ đĩa gắn vào **một** instance, sửa
> được từng block. **File (EFS/FSx)** — nhiều máy mount cùng lúc. Chọn sai loại thì không
> có cách tinh chỉnh nào cứu được.

## Mục tiêu

Task 3.6 đòi: dùng object storage để làm gì, **khác biệt giữa các lớp S3**, block storage
(EBS ⇄ instance store), file service (EFS, FSx), **cached file system** (Storage Gateway),
**lifecycle policy**, và **AWS Backup**.

## Tổng quan

### Ba loại

| Loại | Service | Gắn vào | Dùng khi |
|---|---|---|---|
| **Object** | **Amazon S3**, S3 Glacier | Truy cập qua API/HTTP | Ảnh, video, backup, log, data lake, web tĩnh |
| **Block** | **Amazon EBS**, **instance store** | **Một** instance (EBS Multi-Attach là ngoại lệ) | Ổ hệ thống, database tự dựng |
| **File** | **Amazon EFS**, **Amazon FSx** | **Nhiều** máy mount cùng lúc | Thư mục dùng chung, workload Windows/HPC |

**EBS ⇄ instance store** là cặp bắt buộc nhớ:

| | EBS | Instance store |
|---|---|---|
| Vị trí | Mạng, tách khỏi máy chủ vật lý | **Ổ đĩa gắn trực tiếp** vào máy chủ vật lý |
| Dữ liệu khi stop/terminate | **Còn** | **Mất sạch** |
| Snapshot | Có, lưu vào S3 | Không |
| Hiệu năng | Cao, cấu hình được | **Cao nhất** (IOPS cục bộ) |

Instance store dùng cho cache, dữ liệu tạm, buffer — mọi thứ **dựng lại được**. Câu hỏi
nói *"data must persist after the instance is stopped"* thì đáp án không bao giờ là instance
store.

**EFS ⇄ FSx**: EFS là NFS cho Linux; **FSx** cho hệ thống file khác — FSx for Windows File
Server (SMB, Active Directory), FSx for Lustre (HPC, tính toán hiệu năng cao).

### Bảy lớp S3, chọn theo hai câu hỏi

Hai câu quyết định: **truy cập thường xuyên đến mức nào** và **chờ bao lâu thì được**.

| Lớp | Tần suất truy cập | Lấy ra | Dấu hiệu trong đề |
|---|---|---|---|
| **S3 Standard** | Thường xuyên | Ngay | Mặc định, website, dữ liệu đang dùng |
| **S3 Intelligent-Tiering** | **Không đoán được** | Ngay | *unknown or changing access pattern* |
| **S3 Standard-IA** | Thưa, nhưng cần ngay | Ngay | *infrequently accessed, rapid access when needed* |
| **S3 One Zone-IA** | Thưa, **tái tạo được** | Ngay | *can be recreated*, chỉ **một AZ** ⇒ rẻ hơn, kém bền hơn |
| **S3 Glacier Instant Retrieval** | Rất thưa (quý/lần) | **Mili giây** | Archive nhưng vẫn cần ngay |
| **S3 Glacier Flexible Retrieval** | Archive | **Phút tới giờ** | Backup, archive không gấp |
| **S3 Glacier Deep Archive** | Archive dài hạn | **Nhiều giờ** (tới ~12h) | *lowest cost*, *7–10 years retention*, hồ sơ tuân thủ |

Ba thứ phải nhớ kèm:

- **Lấy ra khỏi lớp Glacier có phí riêng** (retrieval fee) — rẻ khi lưu, **tốn khi lấy**.
- Các lớp IA/Glacier có **thời gian lưu tối thiểu** (30 ngày với IA, 90 với Glacier Flexible,
  **180 với Deep Archive**); xoá sớm hơn vẫn bị tính đủ.
- **One Zone-IA chỉ nằm trong một AZ.** AZ đó mất là dữ liệu mất. Mọi lớp khác bền trên
  nhiều AZ.

**S3 Intelligent-Tiering** là đáp án mặc định khi câu hỏi nói *không biết pattern* — nó tự
chuyển tầng và không có phí lấy ra khi chuyển.

### Lifecycle policy

Quy tắc tự động **chuyển lớp** hoặc **xoá** object theo tuổi. Nó là cách đúng để làm việc
"dữ liệu cũ thì rẻ dần" mà không cần ai nhớ.

### Storage Gateway và AWS Backup

| Service | Việc |
|---|---|
| **AWS Storage Gateway** | Cầu nối **hybrid**: máy tại chỗ thấy một file share/ổ đĩa, dữ liệu thật nằm trên S3 — có **cache cục bộ** cho phần nóng |
| **AWS Backup** | Một chỗ **đặt chính sách backup** cho nhiều service: EBS, RDS, DynamoDB, EFS, FSx |
| **AWS Elastic Disaster Recovery** | Nhân bản để phục hồi sau thảm hoạ |

Dấu hiệu Storage Gateway trong đề: *"on-premises application needs low-latency access to
data stored in AWS"* hoặc *"extend on-premises storage to the cloud"*.

### Tính năng S3 cần nhận ra tên

| Tính năng | Việc |
|---|---|
| **Versioning** | Giữ mọi phiên bản — chống ghi đè và xoá nhầm |
| **Cross-Region Replication** | Nhân bản sang Region khác |
| **S3 Object Lock** | WORM — không cho xoá/sửa trong khoảng thời gian, cho yêu cầu tuân thủ |
| **Block Public Access** | Hàng rào chặn mở công khai ở cấp bucket/account |
| **Static website hosting** | Phục vụ web tĩnh ngay từ bucket |

## Ví dụ

Chạy thật 06/10/2026 trên **emulator AWS local** ở `~/aws-lab` (cổng 4566),
`aws-cli/2.37.9`. Gọi qua endpoint local, **không** gọi AWS thật.

Đặt lifecycle ba chặng cho prefix `reports/`:

```bash
aws s3api put-bucket-lifecycle-configuration --bucket kb-storage-demo \
  --lifecycle-configuration file://lc.json
aws s3api get-bucket-lifecycle-configuration --bucket kb-storage-demo \
  --query 'Rules[0].Transitions' --output table
```

```text
{
    "TransitionDefaultMinimumObjectSize": "all_storage_classes_128K"
}
---------------------------------
|GetBucketLifecycleConfiguration|
+---------+---------------------+
|  Days   |    StorageClass     |
+---------+---------------------+
|  30     |  STANDARD_IA        |
|  90     |  GLACIER            |
|  365    |  DEEP_ARCHIVE       |
+---------+---------------------+
```

Dòng đầu là thứ không ai nhớ khi học lý thuyết: **object nhỏ hơn 128 KB không được
lifecycle chuyển tầng** theo mặc định. Hợp lý — mỗi lần chuyển tầng có phí cho mỗi object,
nên chuyển hàng triệu file tí xíu thì phí chuyển lớn hơn tiền tiết kiệm được.

### Chỗ lab local nói dối

Ghi bốn object vào bốn lớp rồi đọc thẳng object ở `DEEP_ARCHIVE`:

```bash
aws s3api list-objects-v2 --bucket kb-storage-demo \
  --query 'Contents[].[Key,StorageClass,Size]' --output table
aws s3api get-object --bucket kb-storage-demo --key DEEP_ARCHIVE/bc.txt out.txt
```

```text
-----------------------------------------------
|                ListObjectsV2                |
+----------------------+----------------+-----+
|  DEEP_ARCHIVE/bc.txt |  DEEP_ARCHIVE  |  16 |
|  GLACIER/bc.txt      |  GLACIER       |  16 |
|  STANDARD/bc.txt     |  STANDARD      |  16 |
|  STANDARD_IA/bc.txt  |  STANDARD_IA   |  16 |
+----------------------+----------------+-----+
```

Lệnh `get-object` **thành công** trên emulator. Trên AWS thật nó phải thất bại với
`InvalidObjectState` — object ở lớp Glacier Flexible hoặc Deep Archive **không đọc trực
tiếp được**; phải `restore-object` trước, chờ từ vài phút tới nhiều giờ, rồi mới đọc bản
tạm.

**Nhớ đúng một câu:** lớp Glacier không phải "S3 rẻ hơn" — nó là **S3 có thêm một bước
chờ**. Bước chờ đó là nội dung của
[case study lifecycle](../case-studies/s3-lifecycle-roi-can-gap.md).

## Bẫy trong đề

| Bẫy | Vì sao sai |
|---|---|
| Chọn **instance store** cho dữ liệu cần còn sau khi stop | Mất sạch khi stop/terminate |
| Chọn **EBS** cho "nhiều EC2 cùng đọc ghi một thư mục" | EBS gắn một instance ⇒ **EFS** |
| Chọn **One Zone-IA** cho dữ liệu không tái tạo được | Chỉ một AZ ⇒ AZ mất là dữ liệu mất |
| Chọn **Deep Archive** cho "cần lấy trong vài phút" | Deep Archive tính bằng giờ ⇒ Glacier Instant Retrieval |
| Chọn **Standard-IA** khi không biết pattern truy cập | Không đoán được ⇒ **Intelligent-Tiering** |
| Quên **phí lấy ra** và **thời gian lưu tối thiểu** | Lớp lạnh rẻ khi lưu, tốn khi lấy và khi xoá sớm |
| Chọn **S3** cho ổ hệ thống của EC2 | Đó là block storage ⇒ EBS |

## Đánh đổi

| Quyết định | Được | Mất |
|---|---|---|
| Lifecycle xuống lớp lạnh | Giảm chi phí lưu trữ rõ rệt | Phí lấy ra, thời gian chờ, và **thời gian lưu tối thiểu** |
| Intelligent-Tiering | Không phải đoán pattern | Phí giám sát theo object — kém lợi với rất nhiều object nhỏ |
| One Zone-IA | Rẻ hơn ~20% so với Standard-IA | Mất độ bền nhiều AZ |
| Bật Versioning | Chống xoá/ghi nhầm | Trả tiền cho **mọi** phiên bản — cần lifecycle cho bản cũ |
| EFS thay EBS | Nhiều máy dùng chung, tự lớn | Đơn giá/GB cao hơn; độ trễ cao hơn EBS |
| Storage Gateway | Giữ ứng dụng tại chỗ mà dữ liệu lên cloud | Thêm thiết bị/VM phải vận hành; phụ thuộc đường truyền |

## Related Topics

- [Database](databases.md) — RDS nằm trên EBS; snapshot đi vào S3
- [Global infrastructure](global-infrastructure.md) — độ bền nhiều AZ, và One Zone-IA là ngoại lệ
- [Pricing model](pricing-models.md) — phí lưu trữ, phí lấy ra, phí data transfer out
- [Governance và compliance](security-governance-compliance.md) — mã hoá at rest, Macie quét S3
- [Case study: lifecycle đẩy xuống Deep Archive rồi cần gấp](../case-studies/s3-lifecycle-roi-can-gap.md)
- [AWS · Foundations](../index.md)
