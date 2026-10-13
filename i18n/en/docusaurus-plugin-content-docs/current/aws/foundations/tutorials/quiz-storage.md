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

**B — EBS.** Block storage gắn vào đúng một EC2, trông như một ổ đĩa thô (raw disk) để OS format và mount — hợp với boot volume và database.

Bốn loại storage của EC2 khác nhau ở *mô hình truy cập*: EBS là block (gắn một máy), EFS là file dùng chung qua network, S3 là object truy cập qua API, Instance Store là ổ vật lý gắn tạm trên host. Database và boot volume cần đọc/ghi block tốc độ cao, bền qua stop/start — đó là EBS.

- **A sai** — S3 là object storage truy cập qua HTTP API, không mount như ổ đĩa, không dùng làm boot volume hay disk của database.
- **C sai** — EFS là file system chia sẻ qua network (NFS); dùng được nhưng không phải để làm boot volume của một máy đơn, và block storage phục vụ DB tốt hơn.
- **D sai** — Instance Store là ephemeral: dữ liệu mất khi stop/terminate, không an toàn cho database cần bền bỉ.

📌 Nhớ cho đề: "boot volume" + "database" + "một EC2" → EBS (block, 1 AZ).

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

**B — EFS.** File system dùng chung theo giao thức NFS: nhiều EC2 Linux mount đồng thời cùng một file system, dữ liệu tự trải trên nhiều AZ trong một Region.

Từ khóa quyết định là "nhiều EC2 cùng mount" + "nhiều AZ". EBS gắn một máy trong một AZ, nên bị loại ngay. EFS co giãn dung lượng tự động và là lựa chọn mặc định khi cần shared file storage cho Linux.

- **A sai** — EBS chỉ gắn một EC2 tại một thời điểm và nằm trong một AZ duy nhất, không chia sẻ qua nhiều AZ được.
- **C sai** — S3 là object storage truy cập qua API, không mount như file system POSIX để nhiều máy đọc/ghi chung.
- **D sai** — FSx for Windows File Server phục vụ Windows qua giao thức SMB, không phải Linux/NFS.

📌 Nhớ cho đề: "shared" + "nhiều EC2 Linux" + "nhiều AZ" → EFS (file, multi-AZ).

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

**D — S3 Glacier Deep Archive.** Chi phí lưu thấp nhất trong mọi storage class, nhắm đúng archive dài hạn gần như không đụng tới, đổi lại thời gian lấy (retrieval) tính bằng giờ.

Các S3 storage class đánh đổi giữa *giá lưu* và *giá + độ trễ khi lấy*: càng ít truy cập thì giá lưu càng rẻ nhưng lấy ra càng đắt/chậm. Yêu cầu "7 năm, hiếm khi truy cập, rẻ nhất, chấp nhận chờ nhiều giờ" khớp hoàn hảo với tier rẻ nhất.

- **A sai** — S3 Standard dành cho dữ liệu truy cập thường xuyên, giá lưu cao nhất, lãng phí cho archive.
- **B sai** — Standard-IA rẻ hơn Standard nhưng vẫn cho dữ liệu "ít truy cập nhưng cần tức thì", không phải rẻ nhất.
- **C sai** — Glacier Instant Retrieval lấy tức thì (mili-giây) nên giá lưu cao hơn Deep Archive; đề đã nói "chấp nhận chờ nhiều giờ" nên không cần trả thêm cho tốc độ.

📌 Nhớ cho đề: "rẻ nhất" + "archive dài hạn" + "chờ hàng giờ OK" → Glacier Deep Archive.

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

**B — AWS Snowball Edge.** Thiết bị vật lý của Snow Family: AWS gửi thiết bị tới, bạn copy dữ liệu vào rồi gửi về, AWS nạp lên S3 — chuyển offline khi mạng quá chậm.

Snow Family giải quyết đúng bài toán "nhiều TB + băng thông kém + deadline": truyền qua Internet với đường chậm có thể mất nhiều tuần, còn gửi thiết bị thì vài ngày. Quy mô chọn thiết bị: Snowball Edge cho hàng chục TB, Snowmobile (xe tải) cho hàng PB/EB.

- **A sai** — Upload qua Internet với đường truyền rất chậm sẽ không kịp deadline; đây chính là tình huống Snow sinh ra để thay thế.
- **C sai** — Storage Gateway là dịch vụ hybrid chạy liên tục nối on-prem với cloud, không phải để migrate một lần khối lượng lớn; vẫn phụ thuộc băng thông mạng.
- **D sai** — EFS là file system dùng chung, không phải công cụ di chuyển dữ liệu lên AWS.

📌 Nhớ cho đề: "TB/PB lớn" + "mạng chậm" + "deadline" → Snow Family (offline).

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

**C — S3.** S3 có tính năng static website hosting: trỏ bucket phục vụ file tĩnh qua HTTP, không cần dựng hay vá server, chỉ trả tiền cho lưu trữ và request.

Static website chỉ gồm file tĩnh (HTML/CSS/JS/ảnh) — không có backend xử lý — nên không cần compute chạy liên tục. S3 là lựa chọn serverless rẻ và đơn giản nhất cho việc này.

- **A sai** — EC2 là server ảo bạn phải tự quản lý (patch, scale, trả tiền kể cả khi rảnh); thừa thãi và tốn kém cho file tĩnh.
- **B sai** — EBS chỉ là ổ đĩa gắn vào EC2, bản thân nó không phục vụ web; vẫn cần một server.
- **D sai** — EFS là file system dùng chung cho EC2, không có khả năng host website qua HTTP.

📌 Nhớ cho đề: "static website" + "không quản lý server" → S3 static website hosting.

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

**C — 11 số 9 (99.999999999%).** Đây là con số durability thiết kế chuẩn của S3: object được sao chép dư thừa trên nhiều thiết bị/AZ nên xác suất mất dữ liệu gần như bằng không.

Phân biệt hai khái niệm: *durability* (độ bền — dữ liệu có mất không) là 11 số 9, còn *availability* (độ sẵn sàng — có truy cập được mọi lúc không) thấp hơn và khác nhau theo storage class. Đề thi hay trộn hai con số này.

- **A và B sai** — 99.9% và 99.99% là mức gần với các con số *availability*/SLA, không phải durability của S3.
- **D sai** — Không có dịch vụ cloud nào cam kết 100% tuyệt đối; luôn là một chuỗi số 9, dù rất cao.

📌 Nhớ cho đề: S3 durability = 11 số 9; đừng nhầm với availability; không có "100%".

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

**C — Dữ liệu bị mất.** Instance Store là ephemeral storage: ổ đĩa gắn vật lý ngay trên host máy chủ chạy instance, nên khi instance rời host nó cũng mất dữ liệu.

Điểm mấu chốt: Instance Store sống qua **reboot** (instance ở lại host cũ) nhưng mất khi **stop** hoặc **terminate** (instance có thể được dọn khỏi host). Vì vậy chỉ dùng cho dữ liệu tạm có thể dựng lại được như cache, buffer, scratch.

- **A sai** — Chỉ reboot mới giữ nguyên; stop thì mất, đó là bản chất ephemeral.
- **B sai** — Không có cơ chế tự di chuyển dữ liệu từ Instance Store sang EBS; hai loại storage độc lập.
- **D sai** — AWS không snapshot Instance Store tự động; snapshot là tính năng của EBS.

📌 Nhớ cho đề: Instance Store = ephemeral, sống qua reboot nhưng mất khi stop/terminate.

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

**B — snapshot rồi tạo volume mới ở AZ đích.** EBS volume bị khóa trong một AZ. Snapshot được lưu trên S3 (cấp Region), nên từ snapshot có thể dựng volume mới ở bất kỳ AZ nào trong Region — và copy snapshot để sang Region khác.

Ràng buộc nền: EBS = block storage của *một* AZ. Muốn dữ liệu vượt ranh giới AZ phải đi qua snapshot. Đây là lý do snapshot vừa là cơ chế backup vừa là cơ chế di chuyển/nhân bản EBS.

- **A sai** — EBS không mount được sang EC2 ở AZ khác; volume và instance phải cùng AZ.
- **C sai** — EBS volume không có chế độ "Multi-AZ" như RDS; nó luôn là single-AZ.
- **D sai** — Đổi sang EFS buộc thay đổi kiến trúc (file thay vì block) và không di chuyển sẵn dữ liệu EBS đang có; không phải cách đưa dữ liệu hiện tại sang AZ khác.

📌 Nhớ cho đề: EBS = 1 AZ; vượt AZ/Region → snapshot (lưu ở S3 cấp Region).

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

**A và B.** EFS là file system NFS được quản lý: dữ liệu trải trên nhiều AZ trong Region (A đúng) và nhiều EC2 Linux mount đồng thời cùng một file system (B đúng).

Câu này đối chiếu EFS với hai dịch vụ dễ nhầm: EBS (block, một máy, một AZ) và FSx for Windows (SMB). Nắm được ranh giới ba dịch vụ này là nắm phần lớn câu storage của đề.

- **C sai** — "Chỉ một EC2 tại một thời điểm" là mô tả của EBS, không phải EFS; sức mạnh của EFS chính là dùng chung.
- **D sai** — Windows file share qua SMB là việc của FSx for Windows File Server; EFS dùng NFS cho Linux.

📌 Nhớ cho đề: EFS = NFS, multi-AZ, nhiều Linux mount chung; EBS = 1 máy/1 AZ; FSx Windows = SMB.

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

**C — S3 Intelligent-Tiering.** Tự động theo dõi pattern truy cập của từng object và dịch chuyển nó giữa các access tier (frequent ↔ infrequent ↔ archive) để tối ưu chi phí, mà không cần bạn đặt lifecycle thủ công.

Các class khác đòi bạn *biết trước* tần suất truy cập để chọn đúng. Intelligent-Tiering sinh ra cho đúng tình huống "không đoán được pattern", đổi lại trả một phí monitoring/automation nhỏ trên mỗi object.

- **A sai** — S3 Standard không tự chuyển class; chọn nó nghĩa là trả giá frequent-access cho cả dữ liệu ít đụng tới.
- **B sai** — One Zone-IA cho dữ liệu *ít truy cập* và chỉ lưu một AZ (rủi ro cao hơn); không tự thích nghi với pattern thay đổi.
- **D sai** — Deep Archive là archive dài hạn, lấy mất hàng giờ, không hợp dữ liệu có thể bị truy cập bất ngờ.

📌 Nhớ cho đề: "pattern khó đoán" + "không muốn tự quản" → Intelligent-Tiering.

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

**B — Versioning.** Khi bật, S3 giữ lại mọi phiên bản của một object: ghi đè sẽ tạo version mới chứ không xóa bản cũ, còn xóa chỉ đặt một "delete marker" — nên luôn khôi phục lại được bản trước đó.

Versioning là lớp bảo vệ chống thao tác sai của người dùng/ứng dụng. Cần phân biệt rõ với các tính năng khác của S3 vì đề hay liệt kê chúng cạnh nhau.

- **A sai** — Lifecycle policy tự động *chuyển class hoặc xóa* object theo tuổi để tối ưu chi phí; nó không khôi phục bản bị ghi đè.
- **C sai** — Block Public Access chặn truy cập công khai (vấn đề quyền), không liên quan chống ghi đè/xóa nhầm.
- **D sai** — Intelligent-Tiering chỉ tối ưu chi phí theo access pattern, không giữ lịch sử phiên bản.

📌 Nhớ cho đề: "chống ghi đè / xóa nhầm" + "khôi phục bản cũ" → Versioning.

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

**A — S3 Lifecycle policy.** Tập luật chạy tự động theo *tuổi* của object: transition sang class rẻ hơn (ví dụ 30 ngày → Standard-IA, 1 năm → Glacier) hoặc expiration (xóa hẳn) sau một mốc.

Từ khóa quyết định là "tự động theo tuổi" + "giảm chi phí". Lifecycle chính là cơ chế của S3 để điều phối dữ liệu qua các storage class mà không ai phải can thiệp tay.

- **B sai** — Versioning chỉ giữ lịch sử phiên bản chống xóa/ghi đè nhầm, không tự chuyển class theo tuổi.
- **C sai** — Snowball là thiết bị vật lý để di chuyển khối lượng lớn dữ liệu offline, không phải tối ưu class trong S3.
- **D sai** — Storage Gateway là dịch vụ hybrid nối on-prem với cloud, không quản lý vòng đời object trong bucket.

📌 Nhớ cho đề: "tự động theo tuổi" + "đổi class / xóa" → S3 Lifecycle policy.

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

**B — Storage Gateway.** Dịch vụ hybrid: cài một gateway ở data center on-prem, cung cấp các giao thức quen thuộc (file/NFS-SMB, volume/iSCSI, tape/VTL) trong khi dữ liệu thực tế được đẩy lên S3/Glacier ở cloud.

Từ khóa là "on-prem" + "không đổi ứng dụng" + "giao thức file/volume/tape". Storage Gateway sinh ra để ứng dụng cũ vẫn chạy nguyên trạng mà vẫn dùng được dung lượng gần như vô hạn của cloud làm backup/mở rộng.

- **A sai** — Snowmobile là xe tải chở dữ liệu quy mô exabyte lên AWS một lần (migration lớn), không phải backup hybrid liên tục giữ giao thức cũ.
- **C sai** — EFS là file system dùng chung cho EC2 trong cloud, không phải cầu nối cho ứng dụng on-prem.
- **D sai** — S3 Standard là nơi lưu object; bản thân nó không nói giao thức file/volume/tape cho ứng dụng on-prem — cần gateway đứng giữa.

📌 Nhớ cho đề: "on-prem" + "giữ giao thức file/volume/tape" + "mở rộng/backup lên cloud" → Storage Gateway.

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

**B — FSx for Lustre.** File system hiệu năng cực cao dựa trên Lustre, nhắm đúng HPC, machine learning và xử lý dữ liệu lớn cần throughput/IOPS rất lớn; tích hợp được với S3 làm backing store.

Mấu chốt là cụm từ "HPC/ML hiệu năng cực cao" — AWS có một dịch vụ FSx chuyên biệt (Lustre) cho đúng nhóm workload này, tách khỏi file storage đa dụng.

- **A sai** — EFS là NFS đa dụng, co giãn, tiện dùng chung nhưng không nhắm throughput cực cao của HPC như Lustre.
- **C sai** — S3 là object storage (truy cập qua API), không phải file system POSIX hiệu năng cao để workload HPC mount.
- **D sai** — EBS sc1 là loại HDD "cold" throughput thấp, giá rẻ — ngược hẳn với yêu cầu hiệu năng cực cao.

📌 Nhớ cho đề: "HPC / ML, file system hiệu năng cực cao" → FSx for Lustre.

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

**A và B.** One Zone-IA lưu dữ liệu trong một AZ duy nhất — rẻ hơn các IA đa-AZ nhưng mất dữ liệu nếu AZ đó hỏng (A đúng). Deep Archive là tier có chi phí lưu thấp nhất trong mọi storage class (B đúng).

Câu này kiểm hai nhóm kiến thức: đánh đổi giữa các storage class, và quy tắc đặt tên bucket. Cả hai đều là bẫy quen thuộc của CLF-C02.

- **C sai** — Standard-IA lấy dữ liệu tức thì (mili-giây) như Standard, chỉ khác giá; chỉ các class Glacier mới có độ trễ lấy (phút tới giờ).
- **D sai** — Tên bucket S3 phải duy nhất **toàn cầu** (trên toàn bộ AWS), không chỉ trong một Region.

📌 Nhớ cho đề: One Zone-IA = 1 AZ (rủi ro); Deep Archive = rẻ nhất; IA lấy tức thì; tên bucket duy nhất toàn cầu.

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

**C — Block Public Access.** Lá chắn chặn mọi truy cập public ở cấp account hoặc bucket, đè lên các ACL/bucket policy lỡ cấu hình sai; bật mặc định cho bucket mới để chống lộ dữ liệu.

Vấn đề ở đây là *quyền truy cập công khai* (confidentiality), không phải mã hóa hay lịch sử phiên bản. Phân biệt rõ nhóm tính năng bảo mật của S3 là điểm hay bị hỏi.

- **A sai** — Versioning chống ghi đè/xóa nhầm (giữ bản cũ), không ngăn truy cập public.
- **B sai** — SSE encryption mã hóa dữ liệu at rest; vẫn không chặn người ngoài truy cập nếu bucket để public — bảo vệ nội dung, không phải quyền.
- **D sai** — Lifecycle policy tối ưu chi phí bằng cách chuyển class/xóa theo tuổi, không liên quan quyền public.

📌 Nhớ cho đề: "chặn public / tránh lộ do nhầm quyền" → Block Public Access (đừng nhầm với SSE là mã hóa).

</details>

---

## Related Topics

- [Storage — EBS, EFS, S3, Snow, Storage Gateway](../reference/storage.md)
- [Mục lục AWS](../index.md)
