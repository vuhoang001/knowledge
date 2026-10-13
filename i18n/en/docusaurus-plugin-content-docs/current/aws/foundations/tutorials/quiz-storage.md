---
title: "Câu hỏi: Storage"
i18n_status: untranslated
sidebar_position: 5
description: "Tự chấm phần storage — EBS/EFS/S3, S3 storage classes, Snow family."
tags: [aws, clf-c02, quiz, storage]
domain: cloud
category: concept
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-10-13
---

> **Chốt:** Đọc câu hỏi tìm từ khóa — "shared across instances" → EFS, "one instance / one AZ" → EBS, "objects/website/archive" → S3, "mạng chậm + TB lớn" → Snow.

Tự chấm: đọc câu hỏi, chọn đáp án, rồi mở phần giải thích. Ghi rõ loại câu (một đáp án / nhiều đáp án).

---

### Câu 1 (multiple choice)

Ứng dụng cần một ổ đĩa gắn vào một EC2 để làm boot volume và chạy database. Dịch vụ nào?

- A. S3
- B. EBS
- C. EFS
- D. Instance Store

<details>
<summary>Đáp án</summary>

**B — EBS.** Block storage gắn vào một EC2, hợp cho boot volume và database. S3 là object (không mount như ổ đĩa), EFS là file chia sẻ, Instance Store mất dữ liệu khi stop.

</details>

---

### Câu 2 (multiple choice)

Nhiều EC2 Linux cần cùng mount và đọc/ghi chung một file system qua nhiều AZ. Chọn dịch vụ.

- A. EBS
- B. EFS
- C. S3
- D. FSx for Windows File Server

<details>
<summary>Đáp án</summary>

**B — EFS.** File system NFS, nhiều EC2 Linux cùng mount, trải trên nhiều AZ. EBS chỉ gắn một máy trong một AZ. FSx for Windows là cho Windows (SMB), không phải Linux.

</details>

---

### Câu 3 (multiple choice)

Công ty cần lưu trữ dữ liệu compliance trong 7 năm, gần như không bao giờ truy cập, chi phí phải rẻ nhất, chấp nhận chờ nhiều giờ khi cần lấy. Storage class nào?

- A. S3 Standard
- B. S3 Standard-IA
- C. S3 Glacier Instant Retrieval
- D. S3 Glacier Deep Archive

<details>
<summary>Đáp án</summary>

**D — S3 Glacier Deep Archive.** Chi phí lưu thấp nhất, dành cho archive dài hạn, thời gian lấy hàng giờ — hợp đúng yêu cầu "rẻ nhất, hiếm khi truy cập, chấp nhận chờ".

</details>

---

### Câu 4 (multiple choice)

Cần chuyển khoảng 50 TB dữ liệu lên AWS, nhưng đường truyền Internet của công ty rất chậm và có deadline. Giải pháp tốt nhất?

- A. Upload trực tiếp lên S3 qua Internet
- B. AWS Snowball Edge
- C. Storage Gateway
- D. EFS

<details>
<summary>Đáp án</summary>

**B — AWS Snowball Edge.** Chuyển dữ liệu lớn offline bằng thiết bị vật lý khi mạng quá chậm. Upload qua Internet sẽ không kịp deadline với mạng chậm.

</details>

---

### Câu 5 (multiple choice)

Bạn muốn host một static website (HTML, CSS, JS, ảnh) mà không quản lý server. Dịch vụ rẻ và đơn giản nhất?

- A. EC2
- B. EBS
- C. S3
- D. EFS

<details>
<summary>Đáp án</summary>

**C — S3.** S3 hỗ trợ static website hosting, không cần EC2 hay quản lý server.

</details>

---

### Câu 6 (multiple choice)

Phát biểu nào đúng về S3 durability?

- A. 99.9%
- B. 99.99%
- C. 99.999999999% (11 số 9)
- D. 100% được bảo đảm tuyệt đối

<details>
<summary>Đáp án</summary>

**C — 11 số 9 (99.999999999%).** Đây là con số durability chuẩn của S3: dữ liệu gần như không thể mất. Không có dịch vụ nào bảo đảm 100% tuyệt đối.

</details>

---

### Câu 7 (multiple choice)

EC2 dùng Instance Store làm nơi lưu cache. Chuyện gì xảy ra với dữ liệu khi instance bị **stop**?

- A. Dữ liệu được giữ nguyên
- B. Dữ liệu tự chuyển sang EBS
- C. Dữ liệu bị mất
- D. Dữ liệu được snapshot tự động

<details>
<summary>Đáp án</summary>

**C — Dữ liệu bị mất.** Instance Store là ephemeral: dữ liệu mất khi stop hoặc terminate (chỉ sống qua reboot). Vì vậy chỉ dùng cho cache/scratch.

</details>

---

### Câu 8 (multiple choice)

Một EBS volume đang ở AZ `ap-southeast-1a`. Cách nào để dùng dữ liệu đó cho một EC2 ở AZ `ap-southeast-1b`?

- A. Mount trực tiếp volume đó vào EC2 ở AZ khác
- B. Tạo snapshot rồi tạo volume mới từ snapshot ở AZ đích
- C. Bật Multi-AZ cho volume
- D. Dùng EFS thay thế ngay lập tức

<details>
<summary>Đáp án</summary>

**B — snapshot rồi tạo volume mới ở AZ đích.** EBS nằm trong một AZ, không gắn thẳng sang AZ khác. Snapshot là cách di chuyển dữ liệu EBS vượt ranh giới AZ/Region.

</details>

---

### Câu 9 (multiple response — chọn 2)

Những phát biểu nào về EFS là ĐÚNG? (Chọn 2)

- A. Trải trên nhiều AZ trong một Region
- B. Nhiều EC2 Linux có thể cùng mount
- C. Chỉ gắn được một EC2 tại một thời điểm
- D. Dùng cho Windows file share qua SMB

<details>
<summary>Đáp án</summary>

**A và B.** EFS là file system NFS, nhiều AZ, nhiều EC2 Linux cùng mount. C là mô tả của EBS. D là việc của FSx for Windows File Server.

</details>

---

### Câu 10 (multiple choice)

Dữ liệu được truy cập không đều, pattern khó đoán trước, và bạn không muốn tự tính toán khi nào chuyển class. Storage class nào phù hợp nhất?

- A. S3 Standard
- B. S3 One Zone-IA
- C. S3 Intelligent-Tiering
- D. S3 Glacier Deep Archive

<details>
<summary>Đáp án</summary>

**C — S3 Intelligent-Tiering.** Tự động chuyển object giữa các tier theo pattern truy cập, hợp khi không đoán được tần suất. Đổi lại có phí monitoring nhỏ.

</details>

---

### Câu 11 (multiple choice)

Tính năng nào của S3 giúp **chống ghi đè và xóa nhầm** object?

- A. Lifecycle policy
- B. Versioning
- C. Block Public Access
- D. Intelligent-Tiering

<details>
<summary>Đáp án</summary>

**B — Versioning.** Giữ nhiều phiên bản của cùng object, khôi phục được khi bị ghi đè/xóa nhầm. Lifecycle là để chuyển/xóa theo tuổi; Block Public Access là chặn truy cập public.

</details>

---

### Câu 12 (multiple choice)

Team cần tự động chuyển object cũ sang class rẻ hơn theo tuổi (30 ngày → IA, 1 năm → Glacier) để giảm chi phí mà không làm thủ công. Dùng gì?

- A. S3 Lifecycle policy
- B. S3 Versioning
- C. Snowball
- D. Storage Gateway

<details>
<summary>Đáp án</summary>

**A — S3 Lifecycle policy.** Luật tự động chuyển object giữa các storage class theo tuổi, hoặc xóa. Đây là cách tối ưu chi phí lưu trữ tự động.

</details>

---

### Câu 13 (multiple choice)

Công ty còn data center on-premises nhưng muốn backup và mở rộng dung lượng lên AWS mà không đổi ứng dụng đang dùng giao thức file/volume/tape. Dịch vụ nào?

- A. Snowmobile
- B. Storage Gateway
- C. EFS
- D. S3 Standard

<details>
<summary>Đáp án</summary>

**B — Storage Gateway.** Dịch vụ hybrid nối storage on-prem với cloud, cho ứng dụng dùng giao thức quen thuộc trong khi dữ liệu nằm trên S3/Glacier.

</details>

---

### Câu 14 (multiple choice)

Workload HPC / machine learning cần file system hiệu năng cực cao. Dịch vụ phù hợp nhất?

- A. EFS
- B. FSx for Lustre
- C. S3 Standard
- D. EBS sc1

<details>
<summary>Đáp án</summary>

**B — FSx for Lustre.** File system hiệu năng cực cao cho HPC, ML, xử lý dữ liệu lớn. EFS là NFS đa dụng, không nhắm hiệu năng Lustre; sc1 là HDD cold.

</details>

---

### Câu 15 (multiple response — chọn 2)

Những phát biểu nào về S3 storage classes là ĐÚNG? (Chọn 2)

- A. S3 One Zone-IA chỉ lưu trong một AZ nên chịu rủi ro mất AZ
- B. S3 Glacier Deep Archive có chi phí lưu thấp nhất trong các class
- C. S3 Standard-IA lấy dữ liệu mất hàng giờ
- D. Tên bucket S3 chỉ cần duy nhất trong một Region

<details>
<summary>Đáp án</summary>

**A và B.** One Zone-IA lưu một AZ (rẻ hơn, rủi ro cao hơn); Deep Archive rẻ nhất. C sai — Standard-IA lấy tức thì (chỉ Glacier mới chờ lâu). D sai — tên bucket phải duy nhất **toàn cầu**.

</details>

---

### Câu 16 (multiple choice)

Muốn ngăn mọi truy cập public vào bucket để tránh lộ dữ liệu do cấu hình nhầm quyền. Dùng tính năng nào?

- A. Versioning
- B. SSE encryption
- C. Block Public Access
- D. Lifecycle policy

<details>
<summary>Đáp án</summary>

**C — Block Public Access.** Chặn truy cập public ở mức account/bucket, bật mặc định — lá chắn chống lộ dữ liệu do cấu hình nhầm. SSE là mã hóa at rest, không liên quan quyền public.

</details>

---

## Related Topics

- [Storage — EBS, EFS, S3, Snow, Storage Gateway](../reference/storage.md)
- [Mục lục AWS](../index.md)
