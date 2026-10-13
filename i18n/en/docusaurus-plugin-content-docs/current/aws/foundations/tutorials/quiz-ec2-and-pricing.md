---
title: "Câu hỏi: EC2 & pricing"
i18n_status: untranslated
sidebar_position: 4
description: "Tự chấm phần EC2 và các mô hình mua — chọn option rẻ nhất cho từng workload."
tags: [aws, clf-c02, quiz, ec2, pricing]
domain: cloud
category: concept
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-10-13
---

> **Chốt:** Hầu hết câu EC2 trong đề là "đọc hình dạng workload → chọn mô hình mua rẻ nhất mà vẫn chịu được rủi ro". Luyện đúng phản xạ từ khóa → đáp án.

Tự làm trước, mở `<details>` sau. Loại câu ghi rõ ở đầu mỗi câu.

---

### Câu 1 (multiple choice)

EC2 thuộc mô hình dịch vụ cloud nào?

- A. SaaS
- B. PaaS
- C. IaaS
- D. FaaS

<details>
<summary>Đáp án</summary>

**C.** EC2 cho thuê virtual machine — bạn quản OS và phần mềm, AWS quản phần cứng. Đó là IaaS. FaaS là Lambda; SaaS là ứng dụng dùng sẵn (ví dụ WorkMail).

</details>

---

### Câu 2 (multiple choice)

Một job batch xử lý ảnh chạy mỗi đêm, **có thể bị dừng giữa chừng và chạy lại** mà không sao. Muốn rẻ nhất, chọn mô hình mua nào?

- A. On-Demand
- B. Reserved Instances
- C. Spot Instances
- D. Dedicated Host

<details>
<summary>Đáp án</summary>

**C.** Workload chịu được gián đoạn + muốn rẻ nhất = Spot (giảm khoảng tới 90%). Từ khóa "có thể dừng và chạy lại" là dấu hiệu kinh điển của Spot.

</details>

---

### Câu 3 (multiple choice)

Một web application chạy **24/7, ổn định, cấu hình cố định** suốt 3 năm tới. Chọn gì để tiết kiệm nhất mà vẫn đảm bảo luôn có instance?

- A. Spot Instances
- B. On-Demand
- C. Reserved Instances (3 năm)
- D. Dedicated Instance

<details>
<summary>Đáp án</summary>

**C.** Chạy liên tục, ổn định, biết trước cấu hình, cam kết dài hạn → Reserved Instances 3 năm (hoặc Savings Plans nếu muốn linh hoạt). KHÔNG dùng Spot vì service không được gián đoạn.

</details>

---

### Câu 4 (multiple choice)

Công ty cần chạy phần mềm có **license tính theo số core/socket vật lý (BYOL)** và yêu cầu **cô lập phần cứng cho compliance**. Chọn gì?

- A. Dedicated Instance
- B. Dedicated Host
- C. Reserved Instances
- D. Spot Instances

<details>
<summary>Đáp án</summary>

**B.** Chỉ Dedicated Host cho bạn thấy và kiểm soát socket/core vật lý — cần cho BYOL theo core và cho compliance cô lập phần cứng. Dedicated Instance cô lập ở mức tài khoản nhưng không lộ phần cứng vật lý.

</details>

---

### Câu 5 (multiple choice)

Startup đang **thử nghiệm một tính năng mới**, không biết sẽ chạy bao lâu, không muốn cam kết dài hạn. Mô hình mua phù hợp?

- A. Reserved Instances 3 năm
- B. On-Demand
- C. Savings Plans
- D. Dedicated Host

<details>
<summary>Đáp án</summary>

**B.** Ngắn hạn, không đoán trước, không cam kết → On-Demand. Cam kết 1–3 năm (RI/Savings Plans) chỉ đáng khi chắc chắn dùng lâu dài.

</details>

---

### Câu 6 (multiple choice)

Workload cần chạy một **in-memory database** với bộ nhớ RAM rất lớn. Nên chọn instance family nào?

- A. Compute Optimized
- B. Storage Optimized
- C. Memory Optimized
- D. General Purpose

<details>
<summary>Đáp án</summary>

**C.** Nhu cầu RAM lớn / in-memory → Memory Optimized.

</details>

---

### Câu 7 (multiple choice)

Nhận định nào ĐÚNG về Security Group?

- A. Nó stateless, phải khai cả inbound và outbound cho traffic trả về
- B. Nó stateful, cho inbound thì traffic trả về tự được phép
- C. Nó hỗ trợ cả allow rule và deny rule
- D. Nó hoạt động ở mức subnet

<details>
<summary>Đáp án</summary>

**B.** Security Group là **stateful**: mở một chiều thì chiều trả về tự thông. Nó chỉ có allow rule (không có deny), gắn ở mức instance. Cái stateless, ở mức subnet, có deny rule là **Network ACL**.

</details>

---

### Câu 8 (multiple choice)

Đội vận hành muốn cam kết dài hạn để giảm giá, **nhưng cần quyền đổi instance family và region trong thời hạn**, thậm chí muốn chiết khấu áp cả Fargate và Lambda. Chọn gì?

- A. Standard Reserved Instances
- B. Spot Instances
- C. Savings Plans (Compute)
- D. On-Demand

<details>
<summary>Đáp án</summary>

**C.** Compute Savings Plans cam kết theo $/giờ, linh hoạt đổi family/region và áp cả EC2, Fargate, Lambda. Standard RI khóa cứng cấu hình nên không hợp yêu cầu "đổi được".

</details>

---

### Câu 9 (multiple choice)

Giữa Standard RI và Convertible RI, nhận định nào ĐÚNG?

- A. Standard RI cho đổi instance family, Convertible thì không
- B. Convertible RI cho đổi instance family/OS/tenancy nhưng tiết kiệm ít hơn Standard
- C. Convertible RI tiết kiệm nhiều hơn Standard
- D. Cả hai đều không cam kết thời hạn

<details>
<summary>Đáp án</summary>

**B.** Convertible đánh đổi: linh hoạt đổi family/OS/tenancy, bù lại giảm giá ít hơn Standard. Standard tiết kiệm nhiều nhất nhưng khóa cấu hình chặt hơn.

</details>

---

### Câu 10 (multiple choice)

Mục đích chính của **user data** khi launch EC2 instance là gì?

- A. Lưu trữ dữ liệu người dùng lâu dài
- B. Chạy script bootstrap một lần lúc instance khởi động lần đầu
- C. Tạo bản mẫu OS để nhân bản instance
- D. Gán địa chỉ IP tĩnh

<details>
<summary>Đáp án</summary>

**B.** User data là script bootstrap chạy một lần lúc khởi động đầu tiên (cài package, kéo code...). Bản mẫu OS để nhân bản là **AMI** (đáp án C mô tả AMI).

</details>

---

### Câu 11 (multiple choice)

Một job machine learning **training** cần GPU. Nên chọn instance family nào?

- A. General Purpose
- B. Accelerated Computing
- C. Storage Optimized
- D. Compute Optimized

<details>
<summary>Đáp án</summary>

**B.** GPU / ML training / đồ họa → Accelerated Computing. Compute Optimized nhiều CPU nhưng không có GPU chuyên dụng.

</details>

---

### Câu 12 (multiple response — chọn 2)

Trường hợp nào phù hợp dùng **Spot Instances**? (Chọn 2)

- A. Production database phải chạy liên tục không đứt
- B. Rendering/encode video theo lô, có thể retry
- C. CI/CD build job chịu được dừng và chạy lại
- D. Web server của trang thanh toán 24/7

<details>
<summary>Đáp án</summary>

**B và C.** Cả hai đều chịu được gián đoạn và có thể chạy lại → hợp Spot. A và D là service critical/liên tục, không được để AWS thu hồi giữa chừng.

</details>

---

### Câu 13 (multiple choice)

Mô hình mua nào **linh hoạt nhất nhưng đắt nhất** trên mỗi giờ chạy?

- A. On-Demand
- B. Spot Instances
- C. Reserved Instances
- D. Savings Plans

<details>
<summary>Đáp án</summary>

**A.** On-Demand không cam kết, bật tắt tùy ý — linh hoạt nhất, nhưng đơn giá cao nhất. Spot rẻ nhất nhưng kém linh hoạt vì bị thu hồi.

</details>

---

### Câu 14 (multiple choice)

Bạn cần **chặn một địa chỉ IP cụ thể** không cho vào subnet. Công cụ nào phù hợp?

- A. Security Group (thêm deny rule)
- B. Network ACL (thêm deny rule)
- C. AMI
- D. User data

<details>
<summary>Đáp án</summary>

**B.** Security Group không có deny rule nên không chặn IP cụ thể được. Deny rule ở mức subnet là của **Network ACL**.

</details>

---

### Câu 15 (multiple choice)

Workload cần **IOPS đọc/ghi local disk rất cao** (ví dụ data warehouse). Instance family nào?

- A. Memory Optimized
- B. Storage Optimized
- C. General Purpose
- D. Accelerated Computing

<details>
<summary>Đáp án</summary>

**B.** Nhu cầu I/O local disk / IOPS cao → Storage Optimized.

</details>

---

### Câu 16 (multiple response — chọn 2)

Đặc điểm nào sau đây ĐÚNG về Reserved Instances và Savings Plans? (Chọn 2)

- A. Cả hai đều cam kết thời hạn 1 hoặc 3 năm
- B. Cả hai đều bị AWS thu hồi bất cứ lúc nào
- C. Cả hai dùng để tiết kiệm cho workload ổn định dài hạn
- D. Cả hai chỉ áp dụng cho Spot

<details>
<summary>Đáp án</summary>

**A và C.** Cả hai cam kết 1–3 năm và nhắm workload ổn định để giảm giá so với On-Demand. Bị thu hồi bất cứ lúc nào là **Spot** (loại B, D).

</details>

---

## Related Topics

- [EC2 & mô hình mua (pricing)](../reference/compute.md) — phần lý thuyết
- [Bản đồ khái niệm AWS](../index.md)
