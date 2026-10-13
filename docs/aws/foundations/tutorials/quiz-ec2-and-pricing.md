---
title: "Câu hỏi: EC2 & pricing"
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

**C.** EC2 là IaaS — cho thuê hạ tầng ở mức máy ảo, bạn tự quản OS lên trên.

Ba mô hình dịch vụ chia theo "AWS lo tới đâu, bạn lo tới đâu". IaaS (Infrastructure as a Service) giao cho bạn virtual machine: AWS lo phần cứng, ảo hóa, mạng vật lý; bạn lo OS, patch, runtime, phần mềm. PaaS giao nền tảng chạy code sẵn (bạn chỉ đẩy app lên). SaaS giao luôn phần mềm dùng ngay qua trình duyệt. EC2 nằm đúng tầng IaaS vì bạn vẫn phải tự cài và vá OS.

- **A. SaaS** sai — là ứng dụng dùng sẵn, không cho bạn chạm OS; ví dụ AWS là WorkMail, WorkDocs.
- **B. PaaS** sai — là nền tảng triển khai code mà không quản server; phía AWS gần nghĩa này là Elastic Beanstalk, không phải EC2 thuần.
- **D. FaaS** sai — chạy từng hàm theo sự kiện, không có server để quản; đó là Lambda.

📌 Nhớ cho đề: thấy "virtual machine / tự quản OS" → **IaaS = EC2**; "chạy hàm theo event, không quản server" → FaaS = Lambda.

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

**C.** Workload chịu được gián đoạn + muốn rẻ nhất = Spot Instances.

Spot bán phần capacity đang nhàn rỗi của AWS với giá giảm rất sâu (tới khoảng 90% so với On-Demand), nhưng đổi lại AWS có quyền thu hồi (reclaim) bất cứ lúc nào khi cần capacity, chỉ báo trước vài phút. Vì vậy Spot chỉ hợp với workload chịu được bị ngắt và có thể retry: batch, rendering, CI, phân tích dữ liệu không gấp. Từ khóa "có thể dừng và chạy lại" là dấu hiệu kinh điển của Spot.

- **A. On-Demand** sai — linh hoạt nhưng đơn giá cao nhất; dùng khi không chịu được gián đoạn, không phải khi muốn rẻ nhất.
- **B. Reserved Instances** sai — rẻ hơn On-Demand nhưng phải cam kết 1–3 năm; một job đêm không cần cam kết dài và không rẻ bằng Spot.
- **D. Dedicated Host** sai — đây là máy chủ vật lý riêng, đắt nhất, dành cho compliance/BYOL, hoàn toàn lệch mục tiêu "rẻ nhất".

📌 Nhớ cho đề: "chịu được gián đoạn / dừng-chạy lại / retry được" + "rẻ nhất" → **Spot**.

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

**C.** Chạy liên tục, biết trước cấu hình, cam kết dài hạn → Reserved Instances 3 năm.

Reserved Instances (RI) cho giảm giá mạnh so với On-Demand để đổi lấy cam kết dùng 1 hoặc 3 năm; hạn càng dài, trả trước càng nhiều thì chiết khấu càng sâu. Vì không bị AWS thu hồi, RI vẫn đảm bảo "luôn có instance" — đúng với web app phải sống 24/7. Khi tải ổn định và biết trước cấu hình, cam kết dài là lựa chọn tiết kiệm nhất mà vẫn chắc chắn.

- **A. Spot Instances** sai — rẻ nhất nhưng bị thu hồi bất cứ lúc nào; một web app không được đứt thì không dùng Spot.
- **B. On-Demand** sai — không cam kết nên đơn giá cao; chạy 24/7 suốt 3 năm bằng On-Demand là lãng phí lớn.
- **D. Dedicated Instance** sai — cô lập phần cứng cho compliance và đắt hơn; đề không nêu yêu cầu cô lập, nên không phải lựa chọn tiết kiệm.

📌 Nhớ cho đề: "24/7, ổn định, biết trước cấu hình, cam kết 1–3 năm" → **Reserved Instances** (hoặc Savings Plans nếu cần linh hoạt đổi family/region).

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

**B.** Chỉ Dedicated Host cho bạn thấy và kiểm soát socket/core vật lý của server.

Dedicated Host là nguyên một máy chủ vật lý được cấp riêng cho tài khoản bạn, và quan trọng là nó phơi bày thông tin phần cứng vật lý (số socket, số core). Điều này cần cho BYOL khi license đếm theo core/socket, và cho các yêu cầu compliance đòi cô lập tới mức phần cứng. Đây là điểm phân biệt mấu chốt với Dedicated Instance.

- **A. Dedicated Instance** sai — cũng chạy trên phần cứng riêng ở mức tài khoản (không share với tài khoản khác), nhưng KHÔNG lộ/không cho kiểm soát socket-core vật lý, nên không phục vụ được BYOL theo core.
- **C. Reserved Instances** sai — đây là mô hình thanh toán để giảm giá, không nói gì về cô lập phần cứng hay quyền thấy core vật lý.
- **D. Spot Instances** sai — là mô hình giá rẻ bị thu hồi, càng không liên quan tới cô lập phần cứng hay BYOL.

📌 Nhớ cho đề: "BYOL tính theo core/socket" hoặc "cần thấy phần cứng vật lý" → **Dedicated Host**; chỉ cần "phần cứng riêng ở mức account" → Dedicated Instance.

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

**B.** Ngắn hạn, không đoán trước, không muốn cam kết → On-Demand.

On-Demand trả theo giây/giờ dùng thực tế, bật tắt tùy ý, không ràng buộc thời hạn. Đó chính là lựa chọn mặc định khi workload còn mới, chưa rõ pattern tải, chưa biết sẽ chạy bao lâu — bạn chưa đủ dữ liệu để cam kết an toàn. Khi tải đã ổn định và dự đoán được, lúc đó mới chuyển sang RI/Savings Plans để cắt giá.

- **A. Reserved Instances 3 năm** sai — khóa cam kết 3 năm trong khi còn chưa biết tính năng có sống quá vài tuần không; rủi ro trả tiền cho thứ bỏ dở.
- **C. Savings Plans** sai — tuy linh hoạt hơn RI nhưng vẫn là cam kết $/giờ trong 1–3 năm; "không muốn cam kết dài hạn" loại nó ra.
- **D. Dedicated Host** sai — đắt và dành cho compliance/BYOL, hoàn toàn thừa cho một thử nghiệm ngắn.

📌 Nhớ cho đề: "thử nghiệm / không đoán trước / không cam kết / ngắn hạn" → **On-Demand**.

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

**C.** Nhu cầu RAM lớn / xử lý trong bộ nhớ → Memory Optimized.

Các họ EC2 được thiết kế lệch về một loại tài nguyên để hợp từng loại workload. Memory Optimized có tỉ lệ RAM trên vCPU cao, nhắm đúng in-memory database (Redis, Memcached), SAP HANA, hoặc phân tích dữ liệu lớn giữ trong RAM. Từ khóa "in-memory / RAM rất lớn" chỉ thẳng vào họ này.

- **A. Compute Optimized** sai — lệch về CPU mạnh (batch tính toán, web server tải CPU cao), không phải nơi cần nhiều RAM.
- **B. Storage Optimized** sai — lệch về I/O ổ đĩa local và IOPS cao (data warehouse, NoSQL nặng đĩa), không tối ưu cho RAM.
- **D. General Purpose** sai — cân bằng CPU/RAM/mạng cho tải phổ thông; không đủ RAM-trên-vCPU cho in-memory DB lớn.

📌 Nhớ cho đề: "in-memory / cần nhiều RAM" → **Memory Optimized**.

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

**B.** Security Group là **stateful**: mở một chiều thì chiều trả về tự thông.

"Stateful" nghĩa là nó nhớ kết nối: khi bạn cho phép một request đi vào (inbound), traffic phản hồi đi ra được tự động cho qua mà không cần khai thêm rule outbound. Security Group gắn ở mức instance (chính xác hơn là mức network interface của instance), và chỉ có allow rule — mọi thứ không được allow thì mặc định bị chặn. Đây là lớp firewall đầu tiên bao quanh EC2.

- **A** sai — "phải khai cả hai chiều" là đặc tính của **Network ACL** (stateless), không phải Security Group.
- **C** sai — Security Group chỉ có allow rule, không có deny rule; deny rule là của Network ACL.
- **D** sai — Security Group hoạt động ở mức instance; thứ hoạt động ở mức subnet là Network ACL.

📌 Nhớ cho đề: Security Group = **stateful, mức instance, chỉ allow**. Network ACL = stateless, mức subnet, có cả allow lẫn deny.

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

**C.** Compute Savings Plans — cam kết dài hạn nhưng linh hoạt nhất về cấu hình và phạm vi áp dụng.

Savings Plans cam kết theo mức chi $/giờ trong 1 hoặc 3 năm (chứ không khóa vào một cấu hình instance cụ thể). Gói **Compute** Savings Plans cho đổi tự do instance family, size, OS, tenancy và cả region trong thời hạn, đồng thời chiết khấu áp cho cả EC2, Fargate và Lambda. Đúng y yêu cầu "cam kết để giảm giá nhưng vẫn đổi được".

- **A. Standard Reserved Instances** sai — giảm giá sâu nhất nhưng khóa cứng gần như toàn bộ cấu hình; không đổi family/region tự do được.
- **B. Spot Instances** sai — rẻ nhưng không phải cam kết dài hạn, và bị thu hồi bất cứ lúc nào; ngược hẳn yêu cầu.
- **D. On-Demand** sai — linh hoạt nhưng không có cam kết nên không có chiết khấu dài hạn; đề nói rõ muốn "cam kết để giảm giá".

📌 Nhớ cho đề: "cam kết dài hạn NHƯNG cần đổi family/region" và/hoặc "áp cả Fargate, Lambda" → **Compute Savings Plans**.

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

**B.** Convertible đánh đổi linh hoạt lấy mức giảm giá: đổi được family/OS/tenancy nhưng tiết kiệm ít hơn Standard.

Reserved Instances có hai loại. Standard RI khóa cấu hình chặt (chỉ đổi được size trong cùng family) nhưng cho chiết khấu sâu nhất. Convertible RI cho phép đổi sang instance family, OS, hay tenancy khác trong thời hạn — bù lại mức giảm giá thấp hơn Standard. Đây là nguyên tắc chung xuyên suốt pricing EC2: càng linh hoạt thì càng ít rẻ.

- **A** sai — ngược chiều thực tế: Convertible mới là loại đổi được family, Standard thì không.
- **C** sai — Convertible tiết kiệm ÍT hơn Standard, không phải nhiều hơn; nó trả phần linh hoạt bằng chiết khấu thấp hơn.
- **D** sai — cả hai đều là Reserved Instances nên đều cam kết thời hạn 1 hoặc 3 năm.

📌 Nhớ cho đề: Standard RI = rẻ nhất, khóa cứng; Convertible RI = đổi được family/OS/tenancy, rẻ ít hơn. Linh hoạt luôn đánh đổi bằng giá.

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

**B.** User data là script bootstrap chạy một lần lúc instance khởi động lần đầu.

Khi launch EC2, bạn có thể đính kèm một đoạn user data — thường là shell script — và nó được thực thi tự động một lần ở lần boot đầu tiên. Dùng để cài package, cập nhật OS, kéo code, cấu hình service... biến một AMI chung thành instance sẵn sàng chạy mà không cần ai SSH vào gõ tay.

- **A** sai — lưu dữ liệu lâu dài là việc của storage như EBS hay S3, không phải user data.
- **C** sai — bản mẫu OS để nhân bản instance là **AMI** (Amazon Machine Image); đáp án này mô tả AMI chứ không phải user data.
- **D** sai — gán IP tĩnh là việc của **Elastic IP**, không liên quan tới user data.

📌 Nhớ cho đề: "script chạy một lần lúc khởi động để cấu hình" → **user data**; "ảnh mẫu để nhân bản" → AMI; "IP tĩnh" → Elastic IP.

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

**B.** Cần GPU cho ML training → Accelerated Computing.

Accelerated Computing là họ EC2 có phần cứng tăng tốc chuyên dụng — GPU hoặc FPGA — gắn kèm, dành cho các tải nặng tính toán song song: ML training/inference, đồ họa, HPC, xử lý video. "GPU / ML training" chỉ thẳng vào họ này; không họ nào khác có GPU chuyên dụng.

- **A. General Purpose** sai — cân bằng CPU/RAM cho tải phổ thông, không có GPU.
- **C. Storage Optimized** sai — tối ưu I/O đĩa local, không liên quan tới sức mạnh GPU.
- **D. Compute Optimized** sai — nhiều vCPU mạnh cho tải nặng CPU, nhưng vẫn là CPU thường, không có GPU chuyên dụng cho ML.

📌 Nhớ cho đề: "GPU / ML / đồ họa / HPC" → **Accelerated Computing**; "nhiều CPU nhưng không GPU" → Compute Optimized.

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

**B và C.** Cả hai đều chịu được gián đoạn và có thể chạy lại — đúng gu Spot.

Spot bán capacity nhàn rỗi giá rẻ nhưng AWS thu hồi được bất cứ lúc nào khi cần. Nên câu hỏi duy nhất để chọn Spot là: "mất instance giữa chừng có sao không?". Rendering/encode theo lô (B) và CI/CD build (C) đều có thể retry từ đầu hoặc từ checkpoint, mất một lần chạy không gây hậu quả — hợp Spot để cắt giá mạnh.

- **A. Production database liên tục** sai — bị thu hồi giữa chừng là mất kết nối/mất dữ liệu đang ghi; service critical không được đặt lên Spot.
- **D. Web server trang thanh toán 24/7** sai — là service phải luôn sẵn sàng, không chịu được bị AWS reclaim; dùng On-Demand/RI/Savings Plans.

📌 Nhớ cho đề: Spot chỉ dành cho tải "retry được, không đứt là chết ai". Thấy "production / liên tục / critical / 24/7" → loại Spot.

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

**A.** On-Demand linh hoạt nhất nhưng đơn giá cao nhất.

Nguyên tắc xuyên suốt pricing EC2: linh hoạt càng cao thì giá càng đắt, và cam kết/chấp nhận rủi ro càng nhiều thì càng rẻ. On-Demand không cam kết gì, bật tắt tùy ý, không bị thu hồi — đổi lại đơn giá/giờ cao nhất trong các mô hình. Đó là mức giá chuẩn để những mô hình khác đem ra so sánh "tiết kiệm bao nhiêu phần trăm".

- **B. Spot Instances** sai — rẻ nhất (nhờ chấp nhận bị thu hồi), nằm ở cực ngược lại của thang giá.
- **C. Reserved Instances** sai — rẻ hơn On-Demand nhờ cam kết 1–3 năm; cam kết đổi lấy giá thấp, nên kém linh hoạt hơn.
- **D. Savings Plans** sai — cũng cam kết $/giờ để giảm giá so với On-Demand; linh hoạt hơn RI nhưng vẫn rẻ hơn và ràng buộc hơn On-Demand.

📌 Nhớ cho đề: thang giá từ đắt-linh hoạt → rẻ-ràng buộc: **On-Demand > Savings Plans/RI > Spot**.

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

**B.** Chặn (deny) một IP cụ thể ở mức subnet là việc của Network ACL.

Network ACL là lớp firewall ở mức subnet, stateless, và quan trọng là nó có cả allow rule lẫn **deny rule**. Vì có deny, nó mới chặn được một IP/dải IP cụ thể trong khi vẫn cho phần còn lại đi qua. Đây là khác biệt mấu chốt so với Security Group.

- **A. Security Group (thêm deny rule)** sai — Security Group CHỈ có allow rule, không tồn tại deny rule; không thể dùng để "chặn một IP".
- **C. AMI** sai — là ảnh mẫu OS để tạo instance, chẳng liên quan tới lọc traffic mạng.
- **D. User data** sai — là script cấu hình lúc boot, không phải công cụ kiểm soát mạng.

📌 Nhớ cho đề: cần **deny / chặn IP cụ thể** → **Network ACL** (mức subnet). Security Group không chặn được vì chỉ có allow.

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

**B.** Nhu cầu I/O ổ đĩa local và IOPS cao → Storage Optimized.

Storage Optimized có ổ lưu trữ local (thường NVMe SSD) throughput và IOPS cao gắn trực tiếp vào instance, nhắm các workload đọc/ghi tuần tự hoặc ngẫu nhiên rất nặng: data warehouse, NoSQL (Cassandra, MongoDB), search index, xử lý dữ liệu lớn trên đĩa. Từ khóa "IOPS local disk rất cao" chỉ thẳng vào họ này.

- **A. Memory Optimized** sai — tối ưu cho RAM lớn (in-memory DB), không phải cho I/O đĩa.
- **C. General Purpose** sai — cân bằng cho tải phổ thông, không có ổ local IOPS cao chuyên dụng.
- **D. Accelerated Computing** sai — tối ưu cho GPU/FPGA (ML, đồ họa), không liên quan tới IOPS đĩa.

📌 Nhớ cho đề: "IOPS / I/O đĩa local cao / data warehouse / NoSQL nặng đĩa" → **Storage Optimized**.

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

**A và C.** Cả RI lẫn Savings Plans đều là cam kết 1–3 năm để cắt giá cho workload chạy ổn định dài hạn.

Reserved Instances và Savings Plans là hai cơ chế "trả cam kết đổi lấy chiết khấu": bạn hứa dùng trong 1 hoặc 3 năm (RI khóa cấu hình, Savings Plans cam kết $/giờ), AWS giảm giá so với On-Demand. Cả hai chỉ đáng dùng khi tải dự đoán được và chạy liên tục — vì nếu không dùng tới, bạn vẫn phải trả theo cam kết.

- **B** sai — "bị AWS thu hồi bất cứ lúc nào" là đặc tính riêng của **Spot**; RI và Savings Plans không bị thu hồi, chúng đảm bảo capacity/giá.
- **D** sai — RI và Savings Plans không liên quan tới Spot; chúng là các cơ chế cam kết giảm giá độc lập, áp cho On-Demand usage (Savings Plans còn phủ cả Fargate, Lambda).

📌 Nhớ cho đề: RI và Savings Plans = cam kết 1–3 năm cho tải ổn định, KHÔNG bị thu hồi. "Bị thu hồi bất cứ lúc nào" luôn là đặc trưng của Spot.

</details>

---

## Related Topics

- [EC2 & mô hình mua (pricing)](../reference/compute.md) — phần lý thuyết
- [Bản đồ khái niệm AWS](../index.md)
