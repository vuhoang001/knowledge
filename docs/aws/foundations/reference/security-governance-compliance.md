---
title: Governance và compliance
sidebar_position: 6
description: "Artifact lấy báo cáo tuân thủ, CloudTrail ghi ai làm gì, Config ghi cấu hình đổi thế nào, CloudWatch đo số liệu. Bốn service bốn câu hỏi khác nhau."
tags: [aws, clf-c02, cloudtrail, config, artifact, kms, encryption, compliance, domain-2]
domain: cloud
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-14
---

# Governance và compliance

> **Chốt:** Bốn service nghe giống nhau, bốn câu hỏi khác nhau. **CloudTrail** = *ai đã
> gọi API nào*. **Config** = *cấu hình tài nguyên đã đổi thế nào, và có đúng quy định
> không*. **CloudWatch** = *số liệu và log của ứng dụng*. **Artifact** = *tải báo cáo
> SOC/ISO của AWS*. Phân biệt được bốn cái này là phân biệt được phần lớn Domain 2.

## Mục tiêu

Task 2.2 đòi: tìm thông tin tuân thủ ở đâu, hiểu lợi ích của mã hoá, biết **log nằm ở
đâu**, nhận ra service phục vụ governance, và biết yêu cầu tuân thủ **khác nhau giữa các
service**.

## Tổng quan

### Bốn service, bốn câu hỏi

| Service | Trả lời | Dấu hiệu trong đề |
|---|---|---|
| **AWS CloudTrail** | **Ai** đã làm gì, khi nào, từ IP nào — lịch sử **API call** | *who*, *audit*, *API activity*, *forensics* |
| **AWS Config** | **Cấu hình** tài nguyên hiện tại và lịch sử thay đổi; có lệch rule không | *configuration history*, *compliance rule*, *drift* |
| **Amazon CloudWatch** | **Số liệu**, log, alarm, dashboard | *metric*, *alarm*, *monitor performance*, *log* |
| **AWS Artifact** | Nơi **tải** báo cáo tuân thủ của AWS (SOC, ISO, PCI) và thoả thuận | *download report*, *auditor asks for evidence* |

Cặp hay lẫn nhất là **CloudTrail ⇄ Config**: *hành động của người* ⇄ *trạng thái của vật*.
"Ai đã xoá security group đó" là CloudTrail. "Security group đó có từng mở cổng 22 ra
internet không" là Config.

Cặp thứ hai: **CloudWatch ⇄ CloudTrail**: *hiệu năng* ⇄ *hành động*. CPU 95% là CloudWatch;
ai `TerminateInstances` là CloudTrail.

### Các service phát hiện và đánh giá

| Service | Nó tìm gì | Nhìn vào đâu |
|---|---|---|
| **Amazon GuardDuty** | **Hoạt động đe doạ** đang diễn ra — phát hiện xâm nhập | Log: CloudTrail, VPC Flow Logs, DNS |
| **Amazon Inspector** | **Lỗ hổng** trong EC2, container image, Lambda | Quét phần mềm và cấu hình mạng |
| **Amazon Macie** | **Dữ liệu nhạy cảm** trong S3 (PII) | Nội dung object |
| **Amazon Detective** | **Điều tra nguyên nhân** sau khi có phát hiện | Gom và dựng đồ thị từ log |
| **AWS Shield** | **Chặn tấn công DDoS** ở tầng mạng và vận chuyển — Standard bật sẵn, miễn phí | Lưu lượng vào CloudFront, Route 53, ELB |
| **AWS Security Hub** | **Gom mọi phát hiện** về một chỗ, chấm theo tiêu chuẩn | Kết quả của các service trên |
| **AWS Audit Manager** | Tự động thu thập **bằng chứng** cho một bộ kiểm soát | Tài nguyên + log của bạn |

Bốn dòng đầu rất hay bị trộn. Một câu nhớ: **GuardDuty tìm *kẻ đang làm*, Inspector tìm
*chỗ có thể bị làm*, Macie tìm *thứ đáng bị lấy*, Detective trả lời *vì sao*.**

Exam guide gom **Inspector, Security Hub, GuardDuty và Shield** vào *một* gạch đầu dòng —
"khách hàng bảo vệ tài nguyên của mình bằng gì". Ba cái đầu **phát hiện**, Shield **chặn**;
chi tiết Shield và các tầng chặn khác nằm ở [thành phần bảo mật](security-components.md).

**Artifact ⇄ Audit Manager** cũng là một cặp: Artifact cho bằng chứng **của AWS** (phần
hạ tầng); Audit Manager thu bằng chứng **của bạn** (phần cấu hình và tài nguyên). Đúng
theo hai nửa của [shared responsibility](shared-responsibility.md).

### Tuân thủ khác nhau theo nơi, theo ngành, và theo service

Exam guide tách riêng hai ý mà người học hay gộp làm một: yêu cầu tuân thủ **khác nhau giữa
các vùng địa lý và các ngành**, và **khác nhau giữa các AWS service**.

**Theo nơi và theo ngành** — mỗi khung là một bộ yêu cầu riêng, không thay thế nhau:

| Khung | Trục | Áp cho ai |
|---|---|---|
| **GDPR** | Địa lý | Dữ liệu cá nhân của người ở EU, bất kể công ty đặt ở đâu |
| **HIPAA** | Ngành | Dữ liệu sức khoẻ ở Mỹ |
| **PCI DSS** | Ngành | Bất kỳ ai xử lý dữ liệu thẻ thanh toán |
| **FedRAMP** | Địa lý + ngành | Cơ quan chính phủ liên bang Mỹ |
| **SOC 1 / 2 / 3 · ISO 27001** | Không theo ngành | Chứng nhận chung, dùng để chứng minh với đối tác và kiểm toán |

Hệ quả thực tế: *"dữ liệu phải ở trong nước"* là ràng buộc **chọn Region**, không phải ràng
buộc chọn service — xem [global infrastructure](global-infrastructure.md). Còn *"chúng tôi
cần bằng chứng tuân thủ cho kiểm toán viên"* thì luôn là **AWS Artifact**.

**Theo service** — đây là chỗ hay bị hiểu sai nhất:

- AWS đạt một chứng nhận **không có nghĩa mọi service đều nằm trong phạm vi chứng nhận đó**.
  Mỗi chương trình tuân thủ có **danh sách service in-scope riêng**, và danh sách đó đổi theo
  thời gian.
- Chứng nhận của AWS chỉ phủ **nửa của AWS** trong [shared
  responsibility](shared-responsibility.md). Dùng một service "HIPAA eligible" **không** tự
  làm hệ thống của bạn đạt HIPAA — phần cấu hình, mã hoá, kiểm soát truy cập vẫn là của bạn.
- Dấu hiệu trong đề: câu hỏi nói *"is this service covered by…"* thì nơi tra là **AWS Artifact**
  và trang AWS Compliance, không phải Config hay Security Hub.

### Mã hoá: hai trạng thái, một service quản khoá

| Trạng thái | Nghĩa | Cơ chế điển hình |
|---|---|---|
| **In transit** | Dữ liệu đang đi trên đường | TLS/HTTPS; chứng chỉ do **ACM** phát và tự gia hạn |
| **At rest** | Dữ liệu đang nằm trên đĩa | S3/EBS/RDS bật mã hoá, khoá do **KMS** quản |

| Service | Việc |
|---|---|
| **AWS KMS** | Tạo và quản khoá mã hoá; tích hợp sẵn với hầu hết service lưu trữ |
| **AWS CloudHSM** | Module phần cứng **dành riêng**, khách **toàn quyền kiểm soát khoá** — chọn khi quy định đòi FIPS/HSM riêng |
| **AWS Certificate Manager (ACM)** | Phát và tự gia hạn chứng chỉ TLS cho ELB, CloudFront, API Gateway |
| **AWS Secrets Manager** | Lưu **mật khẩu, khoá API**, có **tự động rotate** |

Ranh giới hay hỏi: **KMS ⇄ CloudHSM** (AWS quản khoá trong môi trường dùng chung ⇄ khách
toàn quyền trên HSM riêng), và **Secrets Manager ⇄ Parameter Store** (có rotate tự động
và tốn phí ⇄ lưu tham số, mức cơ bản miễn phí) — xem [access-management](access-management.md).

### Governance ở cấp tổ chức

| Service | Việc |
|---|---|
| **AWS Organizations** | Nhiều account thành một cây, có **SCP** (service control policy) đặt trần quyền |
| **AWS Control Tower** | Dựng sẵn môi trường nhiều account theo thực hành tốt, kèm **guardrail** |
| **AWS Service Catalog** | Danh mục sản phẩm đã được duyệt để người trong tổ chức tự triển khai |
| **AWS Firewall Manager** | Áp quy tắc WAF/Shield/Network Firewall trên nhiều account cùng lúc |
| **AWS RAM** | Chia sẻ tài nguyên giữa các account |
| **Service Quotas** | Xem và **xin nâng giới hạn** (quota) của từng service, trên từng Region |

**Service Quotas ⇄ Trusted Advisor** là một cặp mới hay ra đề: Trusted Advisor **cảnh báo**
khi bạn sắp chạm giới hạn; Service Quotas là nơi **xem và gửi yêu cầu nâng** giới hạn đó.

Bốn service governance nữa, mỗi cái một dòng — đủ để nhận ra tên trong đề:

| Service | Một dòng | Chi tiết |
|---|---|---|
| **AWS Systems Manager** | Vận hành đội máy: patch, chạy lệnh từ xa, Parameter Store | [deploy](deploy-and-access-methods.md) |
| **AWS Compute Optimizer** | Đề xuất **rightsizing** dựa trên số liệu dùng thật | [kinh tế cloud](cloud-economics.md) |
| **AWS License Manager** | Theo dõi và áp hạn mức **licence** phần mềm (BYOL) | [kinh tế cloud](cloud-economics.md) |
| **AWS Well-Architected Tool** | Bộ **câu hỏi** tự đánh giá workload theo sáu pillar | [Well-Architected](well-architected-framework.md) |

**SCP không cấp quyền** — nó chỉ **giới hạn** quyền tối đa mà IAM trong account con có thể
có. Đây là điểm đề hỏi: SCP + IAM policy là *giao* của hai tập, không phải *hợp*.

### Log nằm ở đâu

| Loại log | Ở đâu |
|---|---|
| API call trên account | **CloudTrail** (lưu được vào S3, CloudWatch Logs) |
| Log ứng dụng, log hệ thống | **CloudWatch Logs** |
| Lưu lượng mạng trong VPC | **VPC Flow Logs** |
| Truy cập vào bucket S3 | **S3 server access logs** / CloudTrail data events |
| Lịch sử cấu hình tài nguyên | **AWS Config** |

## Giải thích cặn kẽ

### Bốn service governance trả lời bốn câu hỏi khác nhau

Chỗ dễ sai nhất của Domain 2 không phải vì nhớ nhầm tên, mà vì không thấy **bốn service
này nhìn vào bốn góc hoàn toàn khác nhau của cùng một hệ thống**. Chúng không thay thế
nhau. Một tổ chức nghiêm túc bật cả bốn, vì mỗi cái bù một mảng mù của cái kia.

Lấy một tình huống xuyên suốt: bạn chạy một EC2 instance làm web server. Một đêm nó bị
dừng, sếp hỏi *chuyện gì đã xảy ra*. Bốn service trả lời bốn phần khác nhau của câu
chuyện:

- **CloudTrail — "AI đã gọi API nào, khi nào?"** Đây là *sổ nhật ký hành động người
  dùng*. Mỗi lần ai đó (người hay service) gọi một API của AWS, CloudTrail ghi lại một
  dòng: *danh tính (IAM user/role), thời gian, IP nguồn, tên API, tham số, kết quả thành
  công hay bị từ chối*. Trong tình huống trên, CloudTrail trả lời: lúc 02:14 UTC,
  `iam-user/dev-minh` từ IP `203.0.113.x` gọi `StopInstances` lên đúng instance đó. Đây
  là **audit** — đọc xong là biết *ai chịu trách nhiệm*. CloudTrail **không** cho bạn biết
  CPU lúc đó bao nhiêu, cũng không cho biết security group của instance đã bị đổi hay
  chưa.

- **AWS Config — "cấu hình đã đổi gì, có tuân thủ không?"** Đây là *sổ nhật ký trạng thái
  của tài nguyên*. Config chụp lại cấu hình của từng tài nguyên theo thời gian
  (configuration item) và cho phép đặt **Config Rule** để kiểm tra *có đúng quy định
  không*. Trong tình huống trên, Config trả lời những câu kiểu: instance này có từng gắn
  một security group mở cổng 22 ra `0.0.0.0/0` không; EBS volume của nó có bật mã hoá
  không; đúng 01:50 ai đó đã gỡ một tag bắt buộc. Config nhìn **vật**, không nhìn **người**
  — nó biết *cấu hình đã lệch khỏi chuẩn*, nhưng để biết *ai gây lệch* thì phải quay về
  CloudTrail.

- **Amazon CloudWatch — "số liệu/hiệu năng đang thế nào?"** Đây là *màn hình theo dõi sức
  khoẻ*. CloudWatch gom **metric** (CPU, memory qua agent, network, số request), **log**
  ứng dụng, dựng **dashboard**, và bắn **alarm** khi vượt ngưỡng. Trong tình huống trên,
  CloudWatch trả lời: trước khi dừng, CPU đã cắm 100% suốt 20 phút và một alarm đã kích
  hoạt. Nó cho biết *hệ thống khoẻ hay ốm*, nhưng **không** cho biết *ai bấm nút dừng* —
  đó lại là việc của CloudTrail.

- **AWS Artifact — "tải báo cáo compliance ở đâu?"** Đây **không** phải công cụ giám sát;
  nó là *kho tài liệu*. Khi auditor bên ngoài đòi "chứng minh AWS đạt SOC 2 / ISO 27001 /
  PCI DSS", bạn vào Artifact **tải báo cáo chứng nhận của AWS** (và ký các thoả thuận như
  BAA của HIPAA). Trong tình huống trên, Artifact chẳng dính gì tới việc instance bị dừng
  — nhưng nếu câu hỏi là "làm sao đưa bằng chứng tuân thủ của *tầng hạ tầng AWS* cho kiểm
  toán viên", thì đáp án là Artifact.

Cách nhớ nhanh — **tra ngược từ câu hỏi về service**:

| Câu hỏi bạn đang cần trả lời | Dùng service nào |
|---|---|
| *Ai* đã gọi API đó, lúc nào, từ IP nào | **CloudTrail** |
| Lần API call đó thành công hay bị từ chối (dấu vết điều tra) | **CloudTrail** |
| Cấu hình tài nguyên này *bây giờ* ra sao | **AWS Config** |
| Cấu hình đã *đổi gì* theo thời gian | **AWS Config** |
| Tài nguyên có *tuân thủ* rule nội bộ không (vd EBS phải mã hoá) | **AWS Config** |
| CPU/memory/latency/số request đang như thế nào | **Amazon CloudWatch** |
| Tự động cảnh báo khi một số liệu vượt ngưỡng | **Amazon CloudWatch (alarm)** |
| Xem log ứng dụng tập trung một chỗ | **Amazon CloudWatch Logs** |
| Tải báo cáo SOC / ISO / PCI *của AWS* cho auditor | **AWS Artifact** |
| Ký thoả thuận pháp lý với AWS (vd BAA cho HIPAA) | **AWS Artifact** |
| Thu thập *bằng chứng tuân thủ của chính bạn* một cách tự động | **AWS Audit Manager** |

Hai mẹo ranh giới đáng khắc cốt:

- **CloudWatch Logs ⇄ CloudTrail**: cả hai đều "log", nhưng CloudWatch Logs chứa *log do
  ứng dụng của bạn in ra* (dòng text tuỳ ý), còn CloudTrail chứa *bản ghi API call có cấu
  trúc do AWS tự sinh*. "Xem lỗi app in ra stderr" là CloudWatch; "xem ai gọi
  `DeleteBucket`" là CloudTrail.
- **Config ⇄ CloudTrail một lần nữa**: Config trả lời *cái gì đã đổi* (state); CloudTrail
  trả lời *ai làm nó đổi* (action). Điều tra sự cố thật thường dùng cả hai — Config chỉ
  ra tài nguyên lệch chuẩn, CloudTrail truy ra người gây ra.

### Mã hoá: at-rest và in-transit, và ai giữ khoá

Mã hoá trong CLF-C02 gói gọn vào hai trạng thái và một câu hỏi "ai giữ khoá".

**At-rest — dữ liệu đang nằm yên trên đĩa.** Tưởng tượng ai đó rút ổ cứng vật lý ra khỏi
datacenter, hoặc một snapshot S3/EBS bị lộ. Nếu dữ liệu đã mã hoá at-rest, cái họ cầm
được chỉ là đống byte vô nghĩa vì không có khoá. Ví dụ cụ thể: bạn bật
`Default encryption` trên một S3 bucket và bật encryption khi tạo EBS volume cho EC2 —
từ đó mọi object và block ghi xuống đều được mã hoá bằng khoá KMS trước khi chạm đĩa, và
tự giải mã khi đọc ra (minh bạch với ứng dụng).

**In-transit — dữ liệu đang đi trên đường dây.** Tưởng tượng ai đó ngồi giữa (man in the
middle) nghe trộm gói tin giữa trình duyệt và server. Nếu kết nối dùng TLS/HTTPS, cái họ
bắt được đã bị mã hoá. Ví dụ cụ thể: bạn gắn một chứng chỉ do **ACM** phát lên Load
Balancer, client gọi `https://...` thay vì `http://...`; toàn bộ request/response giữa
client và ELB được mã hoá, và ACM tự gia hạn chứng chỉ trước khi hết hạn nên không có
cảnh "quên gia hạn, site sập".

Một câu hay lẫn: "dữ liệu đã mã hoá at-rest thì có an toàn khi truyền không?" — **Không.**
At-rest và in-transit là hai lớp độc lập; phải bật cả hai mới kín. Dữ liệu mã hoá trên
đĩa nhưng gửi qua HTTP trần thì vẫn bị nghe trộm trên đường.

**KMS quản khoá thế nào.** Vấn đề gốc của mã hoá là *quản khoá*, không phải *thuật toán*.
KMS giải bằng cách bạn **không bao giờ cầm khoá gốc** (CMK — customer master key) ra khỏi
KMS. Mô hình điển hình là *envelope encryption*: KMS sinh một data key, dùng data key mã
hoá dữ liệu, rồi dùng CMK mã hoá luôn chính data key và cất bản mã của data key cạnh dữ
liệu. Khi cần đọc, service gọi KMS giải mã data key rồi dùng data key giải mã dữ liệu.
Ở mức CLF chỉ cần nhớ: **khoá gốc nằm trong KMS, mọi lần dùng khoá đều được CloudTrail ghi
lại** (nên "ai đã dùng khoá để giải mã" cũng là một câu CloudTrail trả lời được), và KMS
tích hợp sẵn một-nút-bấm với S3, EBS, RDS, DynamoDB, v.v.

**Phân biệt KMS vs CloudHSM vs Secrets Manager** — ba service này hay bị gom nhầm vì đều
dính tới "khoá/bí mật", nhưng trả lời ba nhu cầu khác nhau:

| Service | Bạn lưu gì trong đó | Ai kiểm soát | Chọn khi |
|---|---|---|---|
| **AWS KMS** | **Khoá mã hoá** (encryption key) | AWS quản, chạy trên HSM dùng chung | Mặc định — cần mã hoá at-rest cho S3/EBS/RDS, tích hợp sẵn, rẻ |
| **AWS CloudHSM** | **Khoá mã hoá** | **Khách toàn quyền**, HSM dành riêng một mình bạn | Quy định đòi HSM riêng/FIPS 140-2 Level 3, hoặc chính sách "AWS không được chạm vào khoá" |
| **AWS Secrets Manager** | **Bí mật ứng dụng**: mật khẩu DB, API key, token | Khách, có rotate tự động | Ứng dụng cần lấy credential lúc chạy, muốn tự xoay vòng mật khẩu |

Phân biệt bằng *loại thứ được lưu*: KMS và CloudHSM lưu **khoá để mã hoá thứ khác**;
Secrets Manager lưu **bí mật mà ứng dụng của bạn tiêu thụ trực tiếp** (như chuỗi kết nối
database). Và KMS ⇄ CloudHSM chỉ khác nhau ở *ai nắm khoá*: KMS là AWS quản trên hạ tầng
dùng chung (tiện, rẻ, đủ cho hầu hết); CloudHSM là một hộp phần cứng chỉ của bạn (đắt hơn
hẳn, và **mất khoá là AWS không cứu được** — xem phần Đánh đổi).

### Audit Manager dùng khi nào, và compliance program là gì

**Compliance program** là một *bộ tiêu chuẩn do bên thứ ba đặt ra* mà hệ thống phải đáp
ứng để được coi là tuân thủ. Vài cái hay gặp trong đề: **SOC 1/2/3** (báo cáo kiểm soát
nội bộ về bảo mật/khả dụng), **ISO 27001** (quản lý an toàn thông tin), **PCI DSS** (xử
lý thẻ thanh toán), **HIPAA** (dữ liệu y tế ở Mỹ), **FedRAMP** (dịch vụ cho chính phủ
Mỹ), **GDPR** (bảo vệ dữ liệu cá nhân ở EU). Đây là *yêu cầu*, không phải service.

Giờ nối hai service lại cho đúng nửa trách nhiệm:

- **Artifact** đưa bạn báo cáo chứng minh **AWS** (tầng hạ tầng) đạt các program trên —
  phần "security *of* the cloud".
- **Audit Manager** giúp bạn chứng minh **phần của bạn** (cấu hình, tài nguyên, quy trình)
  đạt các program đó — phần "security *in* the cloud".

**Audit Manager dùng khi nào.** Khi bạn phải đi qua một đợt kiểm toán (vd xin chứng nhận
SOC 2) và việc *thu thập bằng chứng* đang làm thủ công, tốn sức, dễ sót. Audit Manager
map các control của framework (nó có sẵn khung cho SOC 2, PCI DSS, ISO 27001, GDPR...) tới
tài nguyên AWS của bạn và **tự động, liên tục gom bằng chứng** — kéo dữ liệu từ
CloudTrail, Config, Security Hub... rồi đóng gói thành báo cáo sẵn cho auditor. Ví dụ cụ
thể: thay vì mỗi quý tự chụp màn hình chứng minh "mọi S3 bucket đều bật mã hoá", bạn giao
cho Audit Manager chạy một assessment liên tục và xuất báo cáo bằng chứng khi auditor hỏi.

Mẹo phân biệt trong đề: **"tải báo cáo tuân thủ *của AWS*"** → Artifact; **"tự động thu
thập bằng chứng tuân thủ *của tôi* cho một đợt audit"** → Audit Manager; **"kiểm tra tài
nguyên *có đúng rule* không ngay lúc này"** → Config; **"chấm điểm tổng hợp theo tiêu
chuẩn và gom finding"** → Security Hub.

## Ví dụ cụ thể: tình huống đề thi mẫu

**Tình huống 1.** *Một security group bị sửa để mở cổng 3389 ra toàn Internet. Đội bảo
mật muốn biết **chính xác người/role nào** đã thực hiện thay đổi đó và vào lúc nào. Nên
dùng service nào?*

Giải: **AWS CloudTrail.** Câu hỏi là *ai đã gọi API nào* (`AuthorizeSecurityGroupIngress`)
— đúng việc của CloudTrail. Bẫy ở đây là AWS Config: Config cho bạn biết *cấu hình đã lệch*
(security group hiện mở 3389) và *đã đổi lúc nào*, nhưng **không cho biết danh tính người
gây ra**. "Chính xác người/role nào" là từ khoá chốt → CloudTrail.

**Tình huống 2.** *Kiểm toán viên bên ngoài yêu cầu bằng chứng rằng cơ sở hạ tầng AWS
tuân thủ **ISO 27001** và **PCI DSS**. Tìm những báo cáo này ở đâu?*

Giải: **AWS Artifact.** Đây là nơi tải báo cáo tuân thủ *của AWS* (SOC, ISO, PCI...).
Bẫy: Audit Manager — nhưng Audit Manager dành cho việc thu thập bằng chứng *của chính bạn*,
còn câu hỏi hỏi về bằng chứng *của tầng hạ tầng AWS*. Từ khoá "cơ sở hạ tầng AWS tuân thủ"
→ phần của AWS → Artifact.

**Tình huống 3.** *Chính sách công ty bắt buộc **mọi EBS volume phải được mã hoá**. Đội
vận hành cần một cách **tự động phát hiện** volume nào không tuân thủ và cảnh báo. Dùng gì?*

Giải: **AWS Config** (với một Config Rule kiểm tra EBS encryption). Config đánh giá tài
nguyên theo rule và đánh dấu cái nào *non-compliant*. Bẫy: CloudTrail — chỉ ghi API call,
không tự đánh giá "tuân thủ hay không"; và CloudWatch — đo số liệu/hiệu năng, không biết
khái niệm "compliant với policy cấu hình". Từ khoá "tự động phát hiện cấu hình không tuân
thủ" → Config.

**Tình huống 4.** *Ứng dụng cần lấy mật khẩu database lúc chạy, và đội muốn mật khẩu được
**tự động xoay vòng** định kỳ. Service nào?*

Giải: **AWS Secrets Manager.** Nó sinh ra để lưu credential ứng dụng và có **rotate tự
động**. Bẫy: KMS (lưu *khoá mã hoá*, không phải mật khẩu DB để app tiêu thụ) và Parameter
Store (lưu được bí mật nhưng mức cơ bản *không* tự rotate). Từ khoá "mật khẩu + tự động
xoay vòng" → Secrets Manager.

## Bẫy trong đề

| Bẫy | Vì sao sai |
|---|---|
| Dùng **CloudWatch** để biết ai xoá tài nguyên | Đó là CloudTrail |
| Dùng **CloudTrail** để biết cấu hình đã lệch chuẩn | Đó là Config (hoặc Security Hub cho điểm tuân thủ) |
| Dùng **Artifact** để chứng minh *cấu hình của bạn* đạt chuẩn | Artifact chỉ có báo cáo **của AWS**; phần của bạn là Audit Manager |
| Chọn **Inspector** cho "phát hiện truy cập bất thường từ IP lạ" | Đó là GuardDuty |
| Chọn **Macie** cho "quét lỗ hổng EC2" | Macie xem **dữ liệu nhạy cảm trong S3** |
| Cho rằng **SCP cấp quyền** | SCP đặt **trần**; quyền vẫn phải do IAM policy cấp |
| Nghĩ dữ liệu mã hoá **at-rest** thì an toàn cả khi truyền | At-rest và in-transit là hai lớp độc lập; phải bật cả hai |
| Chọn **KMS** cho "lưu mật khẩu DB và tự rotate" | KMS lưu *khoá*; mật khẩu ứng dụng có rotate là **Secrets Manager** |
| Chọn **CloudWatch Logs** để tra "ai gọi `DeleteBucket`" | Đó là CloudTrail; CloudWatch Logs chứa log do app in ra |
| Cho rằng "AWS đạt HIPAA" ⇒ hệ thống của mình đạt HIPAA | Chứng nhận phủ **nửa của AWS**; cấu hình và kiểm soát truy cập vẫn là phần của bạn |
| Chọn **Trusted Advisor** cho "xin nâng giới hạn số VPC" | Trusted Advisor chỉ **cảnh báo**; nâng quota là **Service Quotas** |

## Đánh đổi

| Quyết định | Được | Mất |
|---|---|---|
| Bật Config trên mọi tài nguyên | Có lịch sử cấu hình để truy vết | Tốn phí theo số configuration item — không miễn phí |
| Bật GuardDuty | Phát hiện mối đe doạ không cần dựng gì | Phí theo lượng log phân tích; vẫn cần người xử lý finding |
| CloudHSM thay KMS | Toàn quyền kiểm soát khoá, đạt yêu cầu HSM riêng | Đắt hơn hẳn, và **tự chịu trách nhiệm nếu mất khoá** |
| Secrets Manager thay Parameter Store | Rotate tự động | Tốn phí theo secret |
| Audit Manager thay thu bằng chứng thủ công | Bằng chứng gom liên tục, tự động, đỡ sót | Tốn phí và công cấu hình khung control ban đầu |

## Related Topics

- [Shared responsibility model](shared-responsibility.md) — Artifact ⇄ Audit Manager chia theo đúng hai nửa đó
- [Access management](access-management.md) — IAM, MFA, Secrets Manager, Parameter Store
- [Thành phần bảo mật](security-components.md) — SG, NACL, WAF, Shield, Trusted Advisor
- [Billing và cost management](billing-and-cost-management.md) — Organizations còn là đơn vị gộp hoá đơn
- [AWS · Foundations](../index.md)
