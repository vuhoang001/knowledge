---
title: "Lifecycle đẩy xuống Deep Archive rồi cần gấp"
i18n_status: untranslated
sidebar_position: 2
description: "Một lifecycle rule ba chặng tiết kiệm tiền đúng như thiết kế — rồi kiểm toán hỏi một file 400 ngày tuổi, và câu trả lời là 'chờ nhiều giờ'."
tags: [aws, clf-c02, s3, lifecycle, glacier, deep-archive, case-study]
domain: cloud
category: concept
doc_type: case-study
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-06
---

# Lifecycle đẩy xuống Deep Archive rồi cần gấp

**Nhãn: tình huống dựng lại.** Phần cấu hình lifecycle và hành vi storage class là **chạy
thật** trên emulator AWS local ở `~/aws-lab` ngày 06/10/2026 (`aws-cli/2.37.9`). Phần **phí
và thời gian restore là số niêm yết của AWS, chưa chạy** — ghi nhãn rõ ở chỗ xuất hiện.

## Bối cảnh

Bucket chứa báo cáo hằng ngày dưới prefix `reports/`. Chi phí lưu trữ tăng đều, nên đặt
một lifecycle rule ba chặng — đúng theo sách:

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

Rule chạy đúng. Hoá đơn storage giảm. Không ai nhìn lại trong một năm.

## Triệu chứng

Tháng thứ mười bốn, kiểm toán hỏi một báo cáo cụ thể, **400 ngày tuổi**, và cần trong
buổi sáng. Người xử lý thấy object vẫn **còn trong danh sách** như bình thường:

```bash
aws s3api list-objects-v2 --bucket kb-storage-demo \
  --query 'Contents[].[Key,StorageClass,Size]' --output table
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

Object **có mặt**, key đúng, size đúng. Chỉ có cột `StorageClass` nói một chuyện khác. Trên
AWS thật, `get-object` lúc này trả về **`InvalidObjectState`** — phải `restore-object`
trước, chờ, rồi mới đọc được bản tạm. *(Số và hành vi restore: theo tài liệu AWS, chưa chạy
thật ở đây — xem mục [Chỗ emulator nói dối](#chỗ-emulator-nói-dối).)*

## Giả thuyết sai lúc đầu

| Đã nghi | Vì sao sai |
|---|---|
| "File bị lifecycle **xoá** rồi" | `Expiration` đặt ở 2555 ngày; object vẫn còn, `list` thấy ngay |
| "Lỗi quyền — thiếu `s3:GetObject`" | Lỗi là `InvalidObjectState`, không phải `AccessDenied` |
| "Bucket bị lỗi, thử lại là được" | Thử lại bao nhiêu lần cũng cùng một trạng thái |
| "Chuyển lại sang Standard là xong, vài giây" | Đổi storage class **cũng phải restore trước**; không có đường tắt |

Chỗ mất thời gian là giả thuyết đầu: `list-objects` trả về object nên trực giác nói "file
còn đó thì đọc được".

## Nguyên nhân thật

**Lớp Glacier không phải "S3 rẻ hơn" — nó là "S3 có thêm một bước chờ".** Lifecycle đã làm
đúng việc được giao; thứ sai là **thiết kế rule không hỏi câu "có bao giờ cần gấp không"**.

Ba con số niêm yết của AWS biến quyết định này thành quyết định có đánh đổi *(số niêm yết,
chưa chạy — kiểm lại trên trang pricing)*:

| Lớp | Thời gian lấy ra | Thời gian lưu tối thiểu |
|---|---|---|
| S3 Standard-IA | ngay | 30 ngày |
| S3 Glacier Instant Retrieval | **mili giây** | 90 ngày |
| S3 Glacier Flexible Retrieval | phút → giờ | 90 ngày |
| **S3 Glacier Deep Archive** | **nhiều giờ** (tới ~12h) | **180 ngày** |

Hai hệ quả tiền, cả hai đều không hiện trong hoá đơn tháng trước:

1. **Phí lấy ra (retrieval fee)** tính theo GB, riêng với phí request — chỉ phát sinh khi
   cần, nên không ai thấy nó trong lúc thiết kế rule.
2. **Thời gian lưu tối thiểu:** xoá object khỏi Deep Archive trước 180 ngày vẫn bị tính đủ
   180 ngày.

## Vì sao không có phép thử nào bắt được sớm

| Phép thử | Kết quả | Vì sao không bắt được |
|---|---|---|
| `get-bucket-lifecycle-configuration` | Rule đúng y thiết kế | Rule **không sai** |
| Theo dõi hoá đơn storage | Giảm đều — trông như thành công | Phí lấy ra chưa phát sinh lần nào |
| `list-objects-v2` | Object còn đủ | `list` không bị ảnh hưởng bởi storage class |
| Thử restore ngay sau khi đặt rule | Thành công | Lúc đó object còn ở Standard — transition chưa xảy ra |

Lỗi loại này **chín dần theo thời gian**: nó chỉ xuất hiện sau khi transition đã chạy, tức
là nhiều tháng sau khi người thiết kế rule đã quên nó.

## Chỗ emulator nói dối

Trên emulator local, đọc thẳng object ở `DEEP_ARCHIVE` **thành công**:

```bash
aws s3api get-object --bucket kb-storage-demo --key DEEP_ARCHIVE/bc.txt out.txt
```

Nó trả về nội dung kèm `"StorageClass": "DEEP_ARCHIVE"` — không có `InvalidObjectState`,
không cần restore. Emulator lưu storage class như một **nhãn metadata** chứ không mô phỏng
tầng lưu trữ lạnh.

**Nên lab local không bao giờ tái hiện được chính sự cố này.** Đây là ví dụ cụ thể cho giới
hạn đã nêu ở [trang chủ AWS](../../index.md#lab-chạy-ở-đâu--và-cảnh-báo): việc gì phụ thuộc
*hành vi vận hành* của AWS thì phải thử trên AWS thật, hoặc đọc tài liệu và chấp nhận không
có bằng chứng tự chạy.

## Cách sửa

1. Thêm một chặng **Glacier Instant Retrieval** cho dữ liệu *vẫn có thể bị hỏi gấp* — lấy
   ra trong mili giây, vẫn rẻ hơn Standard nhiều.
2. Chỉ đẩy xuống **Deep Archive** phần có thể nói trước "nếu cần thì chờ được một ngày".
3. Tách prefix theo **nghĩa vụ truy xuất**, không theo tuổi: `reports/audit/` (có thể bị
   hỏi gấp) ⇄ `reports/archive/` (không bao giờ gấp). Rule lifecycle khác nhau cho hai
   prefix.
4. Nhớ ngưỡng **128 KB**: object nhỏ hơn thế mặc định **không được transition** — nên rule
   nhắm vào hàng triệu file tí xíu sẽ tiết kiệm ít hơn kỳ vọng.
5. Ghi thẳng vào tài liệu vận hành: *lấy từ Deep Archive mất nhiều giờ.* Người cần nó sẽ
   không phải là người viết rule.

## Dấu hiệu nhận ra sớm

Một câu hỏi phải trả lời **trước khi** đặt lifecycle rule:

> Nếu ai đó hỏi một object ở chặng cuối, **họ chờ được bao lâu**?

Không trả lời được thì chưa đặt rule. Và trong đề thi, hai cụm này quyết định đáp án:
*"must be retrievable within minutes"* → **không** phải Deep Archive · *"lowest possible
cost, retrieval time is not a concern"* → Deep Archive.

## Related Topics

- [Storage](../reference/storage.md) — bảy lớp S3, lifecycle, và cơ cấu giá nhiều chiều
- [Pricing model](../reference/pricing-models.md) — phí lấy ra, thời gian lưu tối thiểu, data transfer
- [Case study — Foundations](index.md)
