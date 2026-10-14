---
title: Thành phần bảo mật
sidebar_position: 8
description: "Security group, network ACL, WAF, Shield — bốn tầng chặn ở bốn chỗ khác nhau. Và bốn service 'kiểm tra bảo mật' nghe giống nhau nhưng trả lời bốn câu khác nhau."
tags: [aws, clf-c02, security-group, network-acl, waf, shield, trusted-advisor, domain-2]
domain: cloud
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-14
---

# Thành phần bảo mật

> **Chốt:** Bốn công cụ chặn ở bốn tầng khác nhau. **Security group** lọc ở *instance*,
> chỉ có allow. **Network ACL** lọc ở *subnet*, có cả deny. **WAF** lọc ở *tầng ứng dụng*
> (HTTP). **Shield** chống *DDoS*. Câu hỏi có chữ "block a specific IP" thì đáp án là
> NACL — vì SG **không có rule deny**.

## Mục tiêu

Task 2.4 đòi: mô tả tính năng bảo mật của AWS (SG, NACL, WAF), biết có sản phẩm bảo mật
của bên thứ ba trên **Marketplace**, biết **tìm thông tin bảo mật ở đâu**, và biết service
nào dùng để **phát hiện vấn đề** (guide nêu tên Trusted Advisor).

## Tổng quan

### Bốn tầng chặn

| Công cụ | Chặn ở | Có deny? | Trạng thái | Việc của nó |
|---|---|---|---|---|
| **Security group** | ENI của instance | **Không** — chỉ allow | **Stateful** — trả lời được tự động | Mở cổng cho đúng nguồn |
| **Network ACL** | Biên subnet | **Có** allow và deny | **Stateless** — phải mở cả hai chiều | Chặn một IP/dải, hàng rào cấp subnet |
| **AWS WAF** | HTTP(S) — ALB, CloudFront, API Gateway | Có | — | Chặn SQL injection, XSS, bot, theo rate |
| **AWS Shield** | Tầng mạng/vận chuyển | — | — | Chống **DDoS**; Standard bật mặc định miễn phí, Advanced trả phí |

Ba hệ quả hay ra đề:

- **"Chặn một IP đang tấn công"** → NACL. Thêm rule vào SG không chặn được gì, vì SG
  không biểu đạt được "không cho".
- **SG stateful** nên chỉ cần mở inbound; trả lời ra tự động được. **NACL stateless** nên
  quên rule outbound là kết nối treo — lỗi im lặng, rất khó lần ra.
- **Shield Standard** luôn bật và **không phải trả thêm tiền**. Chỉ Advanced mới có phí,
  kèm đội phản ứng và bảo vệ hoá đơn trước đợt tấn công.

Chi tiết VPC và cách SG/NACL ngồi trong đó: [networking](networking.md).

### Bốn service "kiểm tra bảo mật", bốn câu hỏi

Đây là nhóm bị trộn nhiều nhất trong Domain 2:

| Service | Trả lời câu hỏi | Phạm vi |
|---|---|---|
| **AWS Trusted Advisor** | Tài khoản của tôi có lệch **thực hành tốt** không | 5 trục: cost, performance, security, fault tolerance, service limits |
| **Amazon Inspector** | Workload của tôi có **lỗ hổng** đã biết không | EC2, container image trong ECR, Lambda |
| **Amazon GuardDuty** | Có ai đang **hành động đáng ngờ** không | Phân tích log: CloudTrail, VPC Flow Logs, DNS |
| **AWS Config** | **Cấu hình** có lệch rule tôi đặt không | Trạng thái và lịch sử cấu hình tài nguyên |

Mẹo phân biệt nhanh bằng chủ ngữ của câu hỏi: *tài khoản* → Trusted Advisor · *phần mềm*
→ Inspector · *kẻ xâm nhập* → GuardDuty · *cấu hình* → Config.

**Trusted Advisor còn liên quan tới Domain 4**: nó cảnh báo cả instance dùng dưới mức và
**service limit** sắp đạt. Mức **Basic** chỉ xem được một phần kiểm tra; đầy đủ cần
**Business Support+** trở lên — xem [support](support-and-technical-resources.md).

### Tìm thông tin bảo mật ở đâu

| Nơi | Có gì |
|---|---|
| **AWS Artifact** | Tải báo cáo tuân thủ: SOC, ISO, PCI DSS |
| **AWS Security Center** (trang bảo mật của AWS) | Tài liệu, thực hành tốt, thông báo |
| **AWS Security Blog** | Bài viết và cảnh báo mới |
| **AWS Knowledge Center** | Câu hỏi thường gặp đã có lời giải |
| **AWS Trust & Safety** | Nơi **báo cáo lạm dụng** tài nguyên AWS |
| **AWS Marketplace** | Sản phẩm bảo mật **của bên thứ ba** — firewall, WAF, antivirus |

Hai dòng cuối đều có trong exam guide và đều hay bị bỏ qua. "Tôi phát hiện một EC2 đang
quét cổng máy tôi" → báo cho **Trust & Safety**. "Chúng tôi cần đúng firewall của hãng X"
→ **Marketplace**.

### Các service bảo mật còn lại cần nhận ra tên

| Service | Một dòng |
|---|---|
| **AWS Network Firewall†** | Firewall có trạng thái ở biên **VPC**, lọc được cả theo domain |
| **AWS Firewall Manager** | Áp quy tắc WAF/Shield/Network Firewall trên **nhiều account** |
| **Amazon Macie** | Tìm **dữ liệu nhạy cảm** (PII) trong S3 |
| **Amazon Detective** | **Điều tra** nguyên nhân sau một finding |
| **AWS Security Hub** | **Gom** finding từ nhiều service, chấm theo tiêu chuẩn |
| **AWS Directory Service** | Active Directory được quản trên AWS |
| **AWS RAM** | Chia sẻ tài nguyên giữa các account |
| **AWS KMS** / **CloudHSM** | Quản khoá mã hoá — xem [governance](security-governance-compliance.md) |
| **AWS Certificate Manager (ACM)** | Phát và **tự gia hạn** chứng chỉ TLS cho ELB, CloudFront, API Gateway |
| **AWS Secrets Manager** | Lưu mật khẩu/khoá API, có **tự động rotate** — xem [access management](access-management.md) |
| **Amazon Cognito** | Đăng nhập cho **người dùng ứng dụng của bạn** |
| **AWS IAM Identity Center** | Một chỗ đăng nhập cho **nhiều account** |

`†` **AWS Network Firewall nằm trong danh sách out-of-scope** của exam guide bản 2026 —
giữ một dòng vì Firewall Manager nhắc tới nó, nhưng đừng chọn nó làm đáp án.

Mười bảy service của nhóm Security, Identity, and Compliance đều đã xuất hiện ở đâu đó
trong bộ ba tài liệu Domain 2: trang này, [governance](security-governance-compliance.md)
và [access management](access-management.md).

## Giải thích cặn kẽ

### Security group vs NACL — hai hàng rào ở hai độ sâu

Hình dung một khu phố có cổng chung và từng nhà có bảo vệ riêng.

- **Security group là người bảo vệ đứng ngay cửa từng nhà (instance).** Mỗi nhà một bảo
  vệ. Khi bạn cho một người vào nhà, bảo vệ **nhớ mặt**: lúc người đó đi ra, không cần hỏi
  lại giấy. Đó chính là *stateful* — SG tự động cho chiều trả về của một kết nối đã được
  phép vào. Bảo vệ nhà chỉ biết nói "mời vào" (allow), **không biết nói "cấm cửa"** một
  người cụ thể; muốn ai đó không vào thì chỉ cần không thêm họ vào danh sách mời.
- **NACL là chốt gác ở đầu khu phố (subnet).** Một chốt gác canh cho cả dãy nhà. Chốt gác
  **không nhớ mặt ai** — mỗi lượt qua, cả vào lẫn ra, đều bị xét lại từ đầu bằng danh sách
  quy tắc. Đó là *stateless*: bạn mở cho gói đi vào thì vẫn phải mở riêng cho gói đi ra,
  nếu không chiều về bị chặn và kết nối treo. Chốt gác này **có quyền cấm cửa** (deny) một
  người hay cả một đoàn (dải IP), và xét quy tắc **theo thứ tự số nhỏ trước**, gặp khớp
  đầu tiên là dừng.

Vì sao điều này ra đề liên tục: khi đề nói *"chặn một địa chỉ IP độc hại đang tấn công"*,
bảo vệ từng nhà (SG) **chịu thua** — nó không có từ "cấm". Phải ra chốt gác đầu khu phố
(NACL), nơi duy nhất viết được rule deny.

Bảng so sánh đầy đủ:

| Tiêu chí | Security group | Network ACL |
|---|---|---|
| **Mức áp dụng** | Gắn vào ENI của từng instance | Gắn vào subnet (áp cho mọi instance trong subnet) |
| **Stateful / stateless** | **Stateful** — chiều trả về tự động được phép | **Stateless** — phải khai rule cho cả inbound và outbound |
| **Allow / deny** | **Chỉ allow** (không có rule deny) | **Cả allow và deny** |
| **Thứ tự xét rule** | Xét **toàn bộ** rule; chỉ cần một rule cho phép là qua | Xét **theo số thứ tự** từ nhỏ tới lớn, khớp đầu tiên thắng |
| **Rule mặc định** | Mặc định chặn hết inbound, cho hết outbound | NACL mặc định cho hết; NACL tự tạo mặc định chặn hết cho tới khi thêm rule |
| **Đơn vị bảo vệ** | Lớp cuối cùng, sát instance | Lớp đầu, sát biên subnet — chặn sớm hơn |
| **Khi nào dùng** | Mở đúng cổng cho đúng nguồn (web mở 443, SSH mở cho IP admin) | Chặn một IP/dải xấu, đặt rào thô ở biên subnet |

Thực tế hai lớp này **không thay thế nhau mà chồng lên nhau**: một gói tin vào phải qua
NACL của subnet trước, rồi qua SG của instance sau. Chặn ở lớp nào cũng là chặn.

### WAF vs Shield — lọc nội dung yêu cầu vs chống ngập lưu lượng

Hai service này hay bị đổi chỗ vì cùng đứng "trước" ứng dụng, nhưng chúng nhìn vào hai thứ
hoàn toàn khác nhau.

- **AWS WAF lọc ở tầng ứng dụng (L7 — HTTP/HTTPS).** Nó đọc **nội dung** của từng request:
  URL, header, query string, body. Nhờ đọc được nội dung, WAF bắt được các tấn công nhắm
  vào ứng dụng: **SQL injection**, **cross-site scripting (XSS)**, bot cào dữ liệu, và
  chặn theo **rate** (quá nhiều request từ một IP trong một khoảng thời gian). WAF gắn
  trước **ALB, CloudFront, API Gateway**.
- **AWS Shield chống DDoS ở tầng mạng/vận chuyển (L3/L4).** Nó không quan tâm nội dung
  request viết gì — nó chống kiểu tấn công **làm ngập**: hàng triệu gói tin đổ vào để làm
  nghẽn băng thông hoặc cạn tài nguyên, khiến người dùng thật không vào được.

Phân biệt bằng câu hỏi "tấn công nhắm vào cái gì":

| | AWS WAF | AWS Shield |
|---|---|---|
| **Tầng** | L7 — tầng ứng dụng (HTTP) | L3/L4 — tầng mạng/vận chuyển |
| **Nhìn vào** | **Nội dung** từng request | **Khối lượng** lưu lượng |
| **Chống** | SQL injection, XSS, bad bot, rate-based | DDoS (làm ngập băng thông/kết nối) |
| **Gắn trước** | ALB, CloudFront, API Gateway | Tự động cho tài nguyên biên AWS |
| **Chi phí** | Trả phí theo rule và theo request | **Standard miễn phí**, **Advanced trả phí** |

Về Shield có hai mức, và đây là chỗ ra bẫy chi phí:

| | Shield Standard | Shield Advanced |
|---|---|---|
| **Giá** | **Miễn phí, bật sẵn** cho mọi khách hàng | **Trả phí** (cam kết theo tháng + phí) |
| **Chống** | DDoS phổ biến ở L3/L4 | DDoS lớn/tinh vi hơn, có báo cáo chi tiết |
| **Hỗ trợ** | Không có đội riêng | **Đội DDoS Response Team (DRT)** |
| **Bảo vệ hoá đơn** | Không | **Có** — hoàn phí phần scale phát sinh do bị tấn công |

Câu "chúng tôi muốn bật Shield Standard" là bẫy — nó **đã bật rồi và không mất tiền**,
không có gì để "bật" hay trả thêm.

### Bốn (năm) service kiểm tra bảo mật — mỗi service một câu hỏi

Phần trên đã có bảng gọn; đây là cách nhớ cặn kẽ bằng *"service này đọc cái gì, để tìm
cái gì"*:

- **Amazon GuardDuty — phát hiện threat từ log.** Nó liên tục đọc **log hành vi**
  (CloudTrail, VPC Flow Logs, DNS logs) và dùng machine learning để phát hiện **hành vi
  bất thường**: một instance đột nhiên gọi tới IP của máy khai thác tiền ảo, credential
  dùng từ một quốc gia lạ, cổng bị quét. Trả lời: *"có ai đang hành động đáng ngờ không?"*
- **Amazon Inspector — quét lỗ hổng.** Nó không nhìn hành vi; nó **quét workload** để đối
  chiếu với danh sách **CVE** (lỗ hổng phần mềm đã biết). Phạm vi: **EC2, container image
  trong ECR, Lambda**. Trả lời: *"phần mềm tôi đang chạy có lỗ hổng đã biết nào không?"*
- **Amazon Macie — phát hiện PII trong S3.** Chuyên một việc: dùng ML quét **dữ liệu
  trong S3** để tìm **dữ liệu nhạy cảm** (số thẻ, số căn cước, email, thông tin cá nhân).
  Trả lời: *"có dữ liệu nhạy cảm nào đang nằm hớ hênh trong S3 không?"*
- **AWS Config — theo dõi thay đổi cấu hình và compliance.** Nó ghi lại **trạng thái và
  lịch sử cấu hình** của tài nguyên, và đối chiếu với **rule** bạn đặt (ví dụ "mọi S3
  bucket phải mã hoá", "không EBS nào được public"). Trả lời: *"cấu hình có lệch chuẩn tôi
  đặt không, và ai đổi nó lúc nào?"*
- **AWS Trusted Advisor — khuyến nghị best practice.** Không điều tra, không quét CVE; nó
  rà tài khoản theo **5 trục** (cost, performance, security, fault tolerance, service
  limits) rồi **khuyến nghị thực hành tốt**: bật MFA cho root, siết SG đang mở toang,
  xoá instance nhàn rỗi. Trả lời: *"tài khoản tôi có lệch best practice chỗ nào không?"*

Bảng "mô tả tình huống → chọn service" (đây chính là dạng câu hay ra nhất):

| Tình huống trong đề | Service đúng |
|---|---|
| "Phát hiện một EC2 đang **gọi tới IP khai thác tiền ảo**" | **GuardDuty** |
| "Credential root được dùng từ **một quốc gia bất thường**" | **GuardDuty** |
| "Liệt kê **lỗ hổng CVE** trên các EC2 và image trong ECR" | **Inspector** |
| "Kiểm tra hàm **Lambda** có dùng thư viện dính lỗ hổng không" | **Inspector** |
| "Quét xem **S3 có chứa số thẻ tín dụng / PII** không" | **Macie** |
| "Phát hiện khi có ai **đổi cấu hình** S3 thành public" | **Config** |
| "Giữ **lịch sử thay đổi cấu hình** của tài nguyên để audit" | **Config** |
| "Kiểm tra **mọi resource có tuân thủ** rule mã hoá tôi đặt" | **Config** |
| "Tài khoản có **lệch best practice** (security, cost, limits) không" | **Trusted Advisor** |
| "Cảnh báo khi **service limit** sắp đạt" | **Trusted Advisor** |
| "**Gom** finding từ nhiều service lại một chỗ, chấm theo tiêu chuẩn" | **Security Hub** |
| "**Điều tra sâu** nguyên nhân sau khi đã có một finding" | **Detective** |

## Ví dụ cụ thể

Ba tình huống đề mẫu, kèm cách loại trừ — vì đề thi luôn chôn ba đáp án nghe hợp lý
cạnh đáp án đúng.

**Tình huống 1.** *"Một địa chỉ IP công cộng đang liên tục gửi request độc hại tới một
EC2 trong public subnet. Giải pháp nào chặn hoàn toàn IP đó ở mức mạng?"*

- A) Thêm một rule outbound vào security group
- B) Thêm một rule **deny** cho IP đó vào **network ACL** của subnet ✅
- C) Bật AWS Shield Standard
- D) Tạo một WAF rule chặn IP

Giải: đáp án **B**. SG **không có rule deny** nên A loại ngay (và outbound thì càng sai
hướng). Shield Standard đã bật sẵn và chống DDoS, không chặn một IP theo yêu cầu — C loại.
WAF (D) chặn được ở tầng ứng dụng nhưng đề hỏi *"ở mức mạng"* và nhắm thẳng một IP — NACL
là câu khớp nhất. Mấu chốt: muốn **deny** một IP thì chỉ NACL làm được.

**Tình huống 2.** *"Đội bảo mật muốn biết liệu có dữ liệu khách hàng nhạy cảm như số thẻ
tín dụng đang được lưu nhầm trong các S3 bucket hay không. Dùng service nào?"*

- A) Amazon GuardDuty
- B) Amazon Inspector
- C) **Amazon Macie** ✅
- D) AWS Config

Giải: đáp án **C**. Câu khoá là *"dữ liệu nhạy cảm trong S3"* → **Macie**, service duy
nhất chuyên tìm PII trong S3. GuardDuty tìm *hành vi* đáng ngờ, Inspector tìm *lỗ hổng
phần mềm*, Config theo dõi *cấu hình* — không service nào trong ba cái đó đọc nội dung
dữ liệu để tìm PII.

**Tình huống 3.** *"Một web application bị tấn công SQL injection qua form đăng nhập, và
cùng lúc hứng một đợt lưu lượng khổng lồ làm nghẽn băng thông. Cần kết hợp hai service
nào?"*

- A) WAF cho SQL injection và Shield cho DDoS ✅
- B) Shield cho SQL injection và WAF cho DDoS
- C) NACL cho cả hai
- D) GuardDuty cho cả hai

Giải: đáp án **A**. Đây là bẫy đổi chỗ kinh điển. **SQL injection là tấn công tầng ứng
dụng → WAF**; **làm nghẽn băng thông là DDoS → Shield**. B đảo đúng hai vai nên sai hoàn
toàn. NACL lọc theo IP/port chứ không hiểu nội dung SQL (C loại); GuardDuty chỉ *phát
hiện*, không *chặn* (D loại).

## Bẫy trong đề

| Bẫy | Vì sao sai |
|---|---|
| Dùng **security group** để chặn một IP cụ thể | SG chỉ có allow — phải dùng **NACL** |
| Quên rule outbound của NACL | NACL **stateless**; thiếu chiều về là kết nối treo |
| Chọn **Shield** cho tấn công SQL injection | Đó là tầng ứng dụng → **WAF** |
| Chọn **WAF** cho "làm ngập băng thông" | Đó là DDoS → **Shield** |
| Trả tiền để "bật Shield Standard" | Nó đã bật sẵn, miễn phí |
| Chọn **Inspector** cho "tài khoản có lệch best practice" | Đó là **Trusted Advisor** |
| Chọn **GuardDuty** cho "liệt kê lỗ hổng CVE trên EC2" | Đó là **Inspector** |
| Chọn **GuardDuty** cho "tìm PII trong S3" | Đó là **Macie** |
| Chọn **Inspector** cho "phát hiện đổi cấu hình thành public" | Đó là **Config** |
| Chọn **Config** cho "phát hiện credential bị dùng từ nước lạ" | Đó là hành vi → **GuardDuty** |

## Đánh đổi

| Quyết định | Được | Mất |
|---|---|---|
| Chặn ở NACL thay vì SG | Chặn được cả dải, trước khi gói vào instance | Stateless ⇒ dễ sai; rule đánh số, khó đọc khi nhiều |
| Thêm WAF trước ALB | Lọc được tấn công tầng 7, có managed rule sẵn | Phí theo rule và theo request; rule sai là chặn người dùng thật |
| Shield Advanced | Có đội phản ứng, được bảo vệ chi phí khi bị tấn công | Phí cam kết cao — chỉ hợp khi downtime đắt hơn nhiều |
| Mua sản phẩm trên Marketplace | Dùng đúng công cụ đã quen, triển khai nhanh | Thêm một nhà cung cấp phải vận hành và vá |

## Related Topics

- [Network](networking.md) — VPC, subnet, nơi SG và NACL thật sự ngồi
- [Governance và compliance](security-governance-compliance.md) — GuardDuty, Inspector, Macie, Security Hub, mã hoá
- [Access management](access-management.md) — IAM, và vì sao Trusted Advisor nhắc MFA cho root
- [Support và tài nguyên kỹ thuật](support-and-technical-resources.md) — mức support nào mở hết Trusted Advisor
- [Case study: security group không chặn được một IP](../case-studies/security-group-khong-chan-duoc-ip.md)
- [AWS · Foundations](../index.md)
