---
title: Storage
sidebar_position: 14
description: "Object, block, file — ba loại không thay nhau được. Bảy lớp S3 chọn theo tần suất truy cập và thời gian chấp nhận chờ, kèm lifecycle chạy thật trên emulator."
tags: [aws, clf-c02, s3, ebs, efs, glacier, lifecycle, storage-gateway, domain-3]
domain: cloud
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-13
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

## Giải thích cặn kẽ

### Analogy: block vs file vs object

Ba loại storage dễ lẫn nếu chỉ đọc bảng. Hình dung ba kiểu cất đồ khác nhau:

- **Block storage (EBS)** như một **ổ cứng rời cắm vào đúng một máy tính**. Máy coi nó như
  đĩa của chính mình: định dạng được, chia partition được, cài hệ điều hành lên được, sửa
  từng block nhỏ mà không cần đụng cả file. Nhưng mỗi lúc chỉ **một máy** cắm được — rút ra
  cắm sang máy khác thì được, dùng chung một lúc thì không.
- **File storage (EFS/FSx)** như một **ổ mạng chia sẻ trong văn phòng**. Nhiều máy cùng
  mount một đường dẫn, cùng thấy cây thư mục, cùng đọc ghi. Bạn thao tác theo đơn vị
  **file và folder**, không quan tâm block nằm đâu. Đổi lại độ trễ cao hơn ổ cắm trực tiếp.
- **Object storage (S3)** như một **kho gửi đồ có quầy**. Bạn không có đĩa, không có cây
  thư mục thật — bạn đưa cả **món đồ (object)** kèm **một mã (key)**, muốn lấy thì đọc cả
  món theo mã đó qua API. Không sửa được "một góc" của object; muốn đổi thì ghi đè cả món.
  Bù lại: dung lượng gần như vô hạn, bền trên nhiều AZ, truy cập từ bất kỳ đâu qua HTTP.

Một câu để chốt ba analogy: **ổ cắm riêng một máy (block) · ổ mạng chia nhiều máy (file) ·
kho gửi đồ mỗi món một mã (object)**.

### Khi nào dùng cái nào: EBS vs EFS vs S3 vs Instance Store

Chọn storage là chọn theo **câu hỏi "ai dùng, có cần còn lại, thao tác theo đơn vị nào"**,
không phải theo "cái nào rẻ".

| Tình huống trong đề | Chọn | Vì sao |
|---|---|---|
| **Một EC2 cần một ổ đĩa** để cài OS hoặc chạy database tự dựng | **EBS** | Block, gắn một instance, dữ liệu còn khi stop, snapshot được |
| **Nhiều EC2 Linux cùng đọc ghi một thư mục** (ví dụ cụm web cùng dùng chung thư mục upload) | **EFS** | File share, nhiều máy mount một lúc, tự co giãn dung lượng |
| **Lưu file tĩnh, ảnh web, log, backup, data lake** — đọc qua URL/API | **S3** | Object, dung lượng vô hạn, bền 11 số 9, phục vụ web tĩnh được |
| **Cache tạm, dữ liệu buffer mất đi dựng lại được**, cần IOPS cao nhất | **Instance store** | Ổ cục bộ nhanh nhất, nhưng **mất sạch** khi stop/terminate |

Đi qua từng tình huống:

- *"Một EC2 chạy PostgreSQL tự cài, cần ổ lưu dữ liệu."* → **EBS**. Database ghi theo block,
  cần một ổ gắn riêng cho một máy, và dữ liệu phải còn sau reboot/stop. Dùng S3 không được
  vì S3 không cho sửa từng block; dùng EFS được về kỹ thuật nhưng chậm hơn và không phải cách
  thường làm cho một DB đơn.
- *"Ba EC2 web server cùng cần đọc và ghi vào một thư mục `/shared/uploads`."* → **EFS**.
  EBS gắn được một máy nên không chia ba máy cùng ghi; EFS là NFS, ba máy mount cùng đường dẫn.
- *"Lưu 50 TB ảnh sản phẩm để website hiển thị, thỉnh thoảng thêm bớt."* → **S3**. Phục vụ
  qua URL, co giãn không cần quản ổ, lại bật được static website hosting và CloudFront phía trước.
- *"Node xử lý video cần thư mục scratch tốc độ cực cao, xử xong xoá."* → **Instance store**.
  Dữ liệu là tạm, mất được, và IOPS cục bộ cao nhất. Đừng để gì cần-giữ ở đây.

### Bảy lớp S3 theo ba trục

Đừng học thuộc bảy cái tên rời. Đặt chúng lên ba trục: **tần suất truy cập × thời gian chờ
lấy ra × chi phí lưu**. Chi phí lưu đi xuống khi truy cập thưa dần và thời gian chờ dài dần —
đó là toàn bộ logic.

| Lớp | Tần suất truy cập | Thời gian chờ lấy ra | Chi phí lưu | Tình huống điển hình |
|---|---|---|---|---|
| **Standard** | Thường xuyên | Ngay | Cao nhất | Dữ liệu đang hoạt động, asset website |
| **Intelligent-Tiering** | Không đoán được | Ngay (tầng nóng) | Theo tầng + phí giám sát | Pattern thay đổi/không rõ |
| **Standard-IA** | Thưa | Ngay | Thấp hơn Standard | Backup cần khôi phục nhanh khi cần |
| **One Zone-IA** | Thưa, tái tạo được | Ngay | Thấp hơn Standard-IA | Bản sao thứ cấp, dữ liệu dựng lại được |
| **Glacier Instant Retrieval** | Rất thưa | Mili giây | Thấp | Archive y tế/ảnh cần truy cập tức thì hiếm khi |
| **Glacier Flexible Retrieval** | Archive | Phút → giờ | Rất thấp | Backup dài hạn, khôi phục không gấp |
| **Glacier Deep Archive** | Archive dài hạn | Nhiều giờ (tới ~12h) | **Thấp nhất** | Giữ 7–10 năm cho tuân thủ |

Đọc theo trục cho dễ chọn:

- **Truy cập thường xuyên → Standard.** Trả nhiều tiền lưu để đổi lấy không phí lấy ra, không chờ.
- **Ít truy cập nhưng khi cần phải có ngay → Standard-IA.** Rẻ hơn Standard cho phần lưu,
  nhưng mỗi lần đọc có phí lấy ra. Hợp với backup "mong là không phải dùng, nhưng dùng thì gấp".
- **Archive giữ 7 năm, rẻ nhất, chờ được → Glacier Deep Archive.** Rẻ nhất cho lưu, bù lại
  lấy ra tính bằng giờ và có thời gian lưu tối thiểu 180 ngày.
- **Không đoán được pattern → Intelligent-Tiering.** AWS tự chuyển object giữa tầng nóng và
  lạnh theo thực tế truy cập; bạn trả thêm một khoản phí giám sát mỗi object thay vì phải đoán.

Trục này cũng giải thích luôn các bẫy: Deep Archive **không** trả lời được "cần trong vài
phút" (sai trục thời gian chờ), còn Standard-IA **không** trả lời được "không biết pattern"
(sai trục tần suất — thứ đó là Intelligent-Tiering).

### Lifecycle vs Versioning — hai thứ khác hẳn nhau

Hai tính năng này hay bị gộp vì cùng đứng trên bucket, nhưng giải quyết hai bài toán khác nhau:

| | Lifecycle policy | Versioning |
|---|---|---|
| Trả lời câu hỏi | "Dữ liệu cũ dần thì **rẻ dần / biến mất** thế nào?" | "Làm sao **không mất** bản cũ khi ghi đè/xoá?" |
| Làm gì | Tự **chuyển lớp** theo tuổi, hoặc **xoá** object hết hạn | Giữ **mọi phiên bản** của một key, kể cả bản đã xoá (delete marker) |
| Hướng vận động | Dữ liệu đi **xuống** (rẻ hơn) rồi **mất đi** theo thời gian | Dữ liệu **tích lại** — mỗi lần ghi là thêm một version |
| Tác động chi phí | **Giảm** chi phí | **Tăng** chi phí (trả cho mọi version) |

Chúng **bổ sung** nhau, không thay nhau: thực tế thường bật Versioning để chống xoá nhầm,
rồi đặt Lifecycle để dọn các version cũ (ví dụ "noncurrent version quá 90 ngày thì xoá"),
nếu không thì tiền version cũ phình mãi. Trong đề: *"keep every version to recover from
accidental deletes"* → **Versioning**; *"automatically move old objects to cheaper tier /
delete after N days"* → **Lifecycle**.

### Snow Family vs Storage Gateway — một ví dụ mỗi cái

Hai thứ này đều liên quan tới "đưa dữ liệu vào AWS", nhưng khác nhau ở **một lần hay liên tục**.

- **Snow Family (AWS Snowball / Snowcone)** — khi **mạng quá chậm hoặc dữ liệu quá lớn** để
  upload qua Internet. AWS gửi một thiết bị vật lý tới chỗ bạn, bạn copy dữ liệu vào rồi gửi
  trả, AWS nạp lên S3. Đây là **di cư một lần**, offline.
  *Ví dụ:* một hãng phim có **80 TB** footage cần đưa lên S3, đường truyền 100 Mbps upload
  sẽ mất hàng tháng → đặt một **Snowball**, chép rồi gửi về, xong trong vài ngày.
- **Storage Gateway** — khi cần nối **liên tục, hybrid**: ứng dụng tại chỗ vẫn chạy và cần
  truy cập dữ liệu như thể nó nằm ở local, nhưng dữ liệu thật nằm trên S3, có **cache cục bộ**
  cho phần nóng.
  *Ví dụ:* một hệ thống backup on-premises ghi vào một file share như bình thường, nhưng phía
  sau file share đó là một **Storage Gateway** đẩy dữ liệu lên S3 — không ai phải viết lại ứng dụng.

Phân biệt trong đề: *"one-time transfer of petabytes, network too slow"* → **Snow Family**;
*"ongoing low-latency access from on-premises app, data in AWS"* → **Storage Gateway**.

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

## Ví dụ cụ thể — tình huống đề thi mẫu

Ba câu dạng hay gặp, kèm cách suy ra đáp án theo đúng các trục ở trên.

**Tình huống 1 — chọn lớp S3 cho dữ liệu không đoán được pattern.**
> *"Một công ty lưu dữ liệu analytics vào S3. Pattern truy cập thay đổi liên tục và không
> dự đoán được. Họ muốn tối ưu chi phí mà không phải quản lý tay. Chọn lớp nào?"*

Đáp án: **S3 Intelligent-Tiering.** Từ khoá chốt là *"không dự đoán được pattern"* +
*"không phải quản lý tay"*. Standard-IA và Glacier buộc bạn phải **đoán trước** dữ liệu
nóng hay lạnh; đoán sai thì phí lấy ra ăn hết tiền tiết kiệm. Intelligent-Tiering để AWS tự
chuyển tầng theo thực tế. Bẫy ở đây là chọn Standard-IA vì nghe "rẻ hơn Standard".

**Tình huống 2 — nhiều EC2 cùng ghi một thư mục.**
> *"Một cụm web gồm nhiều EC2 Linux cần truy cập **đồng thời** vào cùng một bộ file dùng
> chung, đọc và ghi. Dịch vụ storage nào phù hợp?"*

Đáp án: **Amazon EFS.** Từ khoá chốt là *"nhiều EC2"* + *"đồng thời"* + *"đọc và ghi"*.
EBS gắn một instance (trừ Multi-Attach trong phạm vi hẹp, không phải lựa chọn cho nhiều máy
Linux dùng chung file), nên loại. S3 không phải file system để mount và thao tác theo
file/folder như NFS. EFS là NFS co giãn, đúng bài.

**Tình huống 3 — archive tuân thủ 7 năm, chi phí thấp nhất, chấp nhận chờ.**
> *"Hồ sơ tài chính phải giữ **7 năm** cho mục đích tuân thủ, gần như không bao giờ truy
> cập lại; khi cần lấy có thể **chờ vài giờ**. Yêu cầu chi phí lưu trữ thấp nhất. Chọn gì?"*

Đáp án: **S3 Glacier Deep Archive.** Từ khoá chốt là *"7 năm"* + *"chi phí thấp nhất"* +
*"chờ vài giờ được"*. Đủ cả ba trục: truy cập cực thưa, thời gian chờ dài chấp nhận được,
đổi lấy giá lưu rẻ nhất. Nếu câu đổi thành *"cần lấy trong vài phút"* thì đáp án nhảy sang
**Glacier Instant Retrieval** (hoặc Flexible nếu "phút tới giờ") — đừng chọn Deep Archive
cho thứ cần nhanh.

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
| Chọn **Storage Gateway** cho di cư một lần dữ liệu lớn | Đó là hybrid liên tục ⇒ **Snow Family** cho transfer một lần |
| Nhầm **Versioning** với **Lifecycle** | Versioning giữ bản cũ (tăng phí); Lifecycle chuyển lớp/xoá (giảm phí) |

## Đánh đổi

| Quyết định | Được | Mất |
|---|---|---|
| Lifecycle xuống lớp lạnh | Giảm chi phí lưu trữ rõ rệt | Phí lấy ra, thời gian chờ, và **thời gian lưu tối thiểu** |
| Intelligent-Tiering | Không phải đoán pattern | Phí giám sát theo object — kém lợi với rất nhiều object nhỏ |
| One Zone-IA | Rẻ hơn ~20% so với Standard-IA | Mất độ bền nhiều AZ |
| Bật Versioning | Chống xoá/ghi nhầm | Trả tiền cho **mọi** phiên bản — cần lifecycle cho bản cũ |
| EFS thay EBS | Nhiều máy dùng chung, tự lớn | Đơn giá/GB cao hơn; độ trễ cao hơn EBS |
| Storage Gateway | Giữ ứng dụng tại chỗ mà dữ liệu lên cloud | Thêm thiết bị/VM phải vận hành; phụ thuộc đường truyền |
| Snow Family thay upload mạng | Đưa dữ liệu lớn vào khi mạng chậm | Chỉ hợp **một lần**; có độ trễ giao nhận thiết bị vật lý |

## Related Topics

- [Database](databases.md) — RDS nằm trên EBS; snapshot đi vào S3
- [Global infrastructure](global-infrastructure.md) — độ bền nhiều AZ, và One Zone-IA là ngoại lệ
- [Pricing model](pricing-models.md) — phí lưu trữ, phí lấy ra, phí data transfer out
- [Governance và compliance](security-governance-compliance.md) — mã hoá at rest, Macie quét S3
- [Case study: lifecycle đẩy xuống Deep Archive rồi cần gấp](../case-studies/s3-lifecycle-roi-can-gap.md)
- [AWS · Foundations](../index.md)
