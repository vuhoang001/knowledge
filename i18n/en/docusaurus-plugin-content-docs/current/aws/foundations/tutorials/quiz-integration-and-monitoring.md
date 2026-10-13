---
title: "Câu hỏi: Integration & monitoring"
i18n_status: untranslated
sidebar_position: 9
description: "Tự chấm phần messaging (SQS/SNS/Kinesis) và monitoring (CloudWatch/CloudTrail)."
tags: [aws, clf-c02, quiz, monitoring]
domain: cloud
category: concept
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-10-13
---

> **Chốt:** Tự chấm phần integration & monitoring. Đọc kỹ loại câu (multiple choice =
> một đáp án; multiple response = chọn đúng số lượng ghi trong đề).

## Phần A — Messaging / integration

### Câu 1 (multiple choice)

Cần **decouple** một producer và một consumer sao cho nếu consumer tạm ngừng thì message
không bị mất mà chờ được xử lý sau. Dịch vụ nào phù hợp nhất?

- A. SNS
- B. SQS
- C. Kinesis Data Streams
- D. EventBridge

<details>
<summary>Đáp án</summary>

**B — SQS.** Queue đứng giữa producer và consumer: producer đẩy message vào, consumer tự
kéo (pull/poll) về khi sẵn sàng. Nếu consumer sập hoặc chậm, message vẫn nằm trong queue
chờ (mặc định tối đa 4 ngày, cấu hình được tới 14 ngày), không ai mất gì. Đây chính là
định nghĩa của decouple: hai bên không cần online cùng lúc.

- **A. SNS** là pub/sub push-based. SNS đẩy message tới subscriber ngay; nếu subscriber
  đang offline và không có cơ chế lưu trữ (như SQS đi kèm) thì message có thể mất — không
  đáp ứng yêu cầu "không mất".
- **C. Kinesis Data Streams** dành cho streaming real-time khối lượng lớn (nhiều consumer
  cùng đọc một stream theo thứ tự), không phải mô hình queue decouple một producer–một
  consumer đơn giản.
- **D. EventBridge** là event bus định tuyến theo rule, không phải buffer giữ message cho
  consumer kéo về.

📌 Nhớ cho đề: "decouple + consumer có thể offline + không mất message" → **SQS**.

</details>

### Câu 2 (multiple choice)

Bạn muốn một event được **gửi đồng thời tới nhiều subscriber** (fan-out) theo mô hình
pub/sub. Chọn dịch vụ.

- A. SQS
- B. SNS
- C. Amazon MQ
- D. Step Functions

<details>
<summary>Đáp án</summary>

**B — SNS.** SNS là dịch vụ pub/sub: publisher gửi một message vào một topic, SNS **push**
bản sao của message đó tới mọi subscriber của topic cùng lúc (fan-out). Subscriber có thể
là SQS queue, Lambda, HTTP endpoint, email, SMS. Một message vào, nhiều bên nhận — đúng
mô hình one-to-many.

- **A. SQS** là one-to-one, pull-based: mỗi message thường chỉ được một consumer xử lý,
  không broadcast tới nhiều bên.
- **C. Amazon MQ** là managed broker cho ActiveMQ/RabbitMQ; dùng khi migrate hệ thống cũ,
  không phải lựa chọn mặc định cho fan-out trên AWS.
- **D. Step Functions** điều phối workflow nhiều bước (state machine), không phải để
  broadcast một event tới nhiều subscriber.

📌 Nhớ cho đề: "pub/sub + fan-out + push tới nhiều subscriber" → **SNS**.

</details>

### Câu 3 (multiple choice)

Đâu là điểm khác biệt đúng giữa SQS và SNS?

- A. SQS là push, SNS là pull
- B. SQS là one-to-many, SNS là one-to-one
- C. SQS là pull (consumer poll), SNS là push (đẩy tới subscriber)
- D. Cả hai đều lưu message vĩnh viễn như nhau

<details>
<summary>Đáp án</summary>

**C.** Phân biệt cốt lõi: **SQS = queue, pull-based, one-to-one** — consumer chủ động
poll message từ queue, mỗi message thường chỉ một consumer lấy. **SNS = pub/sub,
push-based, one-to-many** — SNS chủ động đẩy message tới mọi subscriber của topic.

- **A** đảo ngược hoàn toàn: SQS mới là pull, SNS mới là push.
- **B** cũng đảo ngược: SQS là one-to-one, SNS mới là one-to-many (fan-out).
- **D** sai: cả hai đều không lưu vĩnh viễn. SQS giữ message tối đa 14 ngày rồi xoá; SNS
  không lưu message nếu subscriber không nhận được (trừ khi bắt với SQS/dead-letter).

📌 Nhớ cho đề: **SQS = Pull / Queue / 1-1**; **SNS = Push / Pub-Sub / 1-nhiều**.

</details>

### Câu 4 (multiple choice)

Hệ thống cần **ingest và phân tích dữ liệu streaming real-time** (clickstream, IoT
telemetry). Dịch vụ nào?

- A. SQS
- B. SNS
- C. Kinesis
- D. CloudTrail

<details>
<summary>Đáp án</summary>

**C — Kinesis.** Kinesis là nền tảng cho dữ liệu streaming real-time khối lượng lớn, liên
tục: Data Streams để thu nhận và cho nhiều consumer xử lý theo thứ tự, Firehose để nạp
stream vào S3/Redshift/OpenSearch, Data Analytics để phân tích ngay trên luồng. Dữ liệu
được giữ trong stream và đọc lại được (replay) — khác hẳn message bị xoá sau khi xử lý.

- **A. SQS** và **B. SNS** là messaging (gửi/nhận message rời rạc), không phải streaming:
  không có khái niệm thứ tự theo shard, replay, hay phân tích real-time trên luồng.
- **D. CloudTrail** là dịch vụ audit ghi lại API call, hoàn toàn không liên quan tới
  ingest/phân tích dữ liệu ứng dụng.

📌 Nhớ cho đề: "real-time streaming, clickstream, IoT, phân tích trên luồng" → **Kinesis**.

</details>

### Câu 5 (multiple choice)

Muốn **orchestrate một workflow nhiều bước** (phối hợp nhiều Lambda theo luồng có nhánh
và retry) dưới dạng state machine. Chọn dịch vụ.

- A. Step Functions
- B. EventBridge
- C. API Gateway
- D. SQS

<details>
<summary>Đáp án</summary>

**A — Step Functions.** Step Functions điều phối (orchestrate) một workflow thành
state machine: định nghĩa từng bước, nhánh rẽ (choice), xử lý lỗi và retry, chạy song song
— thường để nối chuỗi nhiều Lambda thành một quy trình có trạng thái rõ ràng.

- **B. EventBridge** chỉ là event bus định tuyến từng event tới target theo rule; nó
  không quản lý trạng thái hay thứ tự nhiều bước của một workflow.
- **C. API Gateway** là cửa trước cho API (REST/HTTP), không điều phối luồng xử lý.
- **D. SQS** chỉ là queue buffer message, không có khái niệm bước/nhánh/retry của một
  quy trình.

📌 Nhớ cho đề: "workflow nhiều bước + state machine + orchestrate Lambda" → **Step Functions**.

</details>

### Câu 6 (multiple choice)

Bạn cần một **event bus serverless** để định tuyến event giữa các AWS service và ứng dụng
SaaS theo rule. Dịch vụ nào?

- A. SNS
- B. EventBridge
- C. Kinesis Firehose
- D. AppSync

<details>
<summary>Đáp án</summary>

**B — EventBridge.** EventBridge là event bus serverless: nhận event từ AWS service, ứng
dụng của bạn hoặc đối tác SaaS, rồi định tuyến tới target (Lambda, SQS, Step Functions...)
dựa trên **rule** khớp nội dung event. Điểm mạnh là tích hợp sẵn nhiều nguồn SaaS và lọc
event theo pattern.

- **A. SNS** cũng push message nhưng là pub/sub thuần theo topic, không có schema registry
  hay tích hợp sự kiện từ SaaS bên thứ ba như EventBridge.
- **C. Kinesis Firehose** nạp dữ liệu streaming vào kho lưu trữ, không phải bus định tuyến
  event theo rule.
- **D. AppSync** là dịch vụ managed GraphQL API, không liên quan event routing.

📌 Nhớ cho đề: "event bus serverless + rule routing + tích hợp SaaS" → **EventBridge**.

</details>

### Câu 7 (multiple choice)

Team đang migrate một ứng dụng dùng **RabbitMQ/ActiveMQ** lên AWS và không muốn viết lại
code messaging theo API mới. Dịch vụ nào phù hợp nhất?

- A. SQS
- B. SNS
- C. Amazon MQ
- D. Kinesis Data Streams

<details>
<summary>Đáp án</summary>

**C — Amazon MQ.** Amazon MQ là managed message broker cho ActiveMQ và RabbitMQ, hỗ trợ
các giao thức chuẩn công nghiệp (JMS, AMQP, MQTT, STOMP...). Vì giữ nguyên API/protocol
quen thuộc, ứng dụng đang chạy broker on-prem lift-and-shift lên gần như không phải sửa
code — đó là lý do chọn MQ thay vì làm lại theo API của AWS.

- **A. SQS** và **B. SNS** là dịch vụ messaging riêng của AWS, dùng API độc quyền của AWS;
  migrate sang chúng buộc phải viết lại phần messaging.
- **D. Kinesis Data Streams** là streaming, không phải broker message theo giao thức
  truyền thống.

📌 Nhớ cho đề: "migrate RabbitMQ/ActiveMQ + không muốn đổi API" → **Amazon MQ**.

</details>

### Câu 8 (multiple response — chọn 2)

Pattern **fan-out bền (durable)**: một event cần tới nhiều consumer độc lập, mỗi consumer
xử lý theo nhịp riêng và không được mất message. Nên ghép những dịch vụ nào? (Chọn 2)

- A. SNS topic
- B. Nhiều SQS queue subscribe vào topic
- C. CloudTrail
- D. X-Ray
- E. API Gateway

<details>
<summary>Đáp án</summary>

**A và B.** Pattern kinh điển "SNS fan-out to SQS": SNS topic broadcast một message tới
nhiều SQS queue cùng subscribe vào topic đó. SNS cho khả năng fan-out (một-tới-nhiều),
còn mỗi SQS queue cho **độ bền**: consumer của queue có thể offline rồi quay lại xử lý mà
message vẫn chờ, mỗi consumer đi theo nhịp riêng. Kết hợp push của SNS với buffer bền của
SQS giải quyết đúng cả hai yêu cầu.

- **C. CloudTrail** là audit API call, không tham gia luồng message.
- **D. X-Ray** là distributed tracing để debug, không phải thành phần messaging.
- **E. API Gateway** là cửa API cho request đồng bộ, không phải cơ chế fan-out bền.

📌 Nhớ cho đề: "fan-out + mỗi consumer độc lập + không mất message" → **SNS + nhiều SQS**.

</details>

### Câu 9 (multiple choice)

Bạn muốn tạo và quản lý một **REST/HTTP API** làm cửa trước cho backend Lambda. Dịch vụ?

- A. AppSync
- B. API Gateway
- C. EventBridge
- D. SNS

<details>
<summary>Đáp án</summary>

**B — API Gateway.** API Gateway là dịch vụ tạo, publish, bảo trì và bảo vệ REST API và
HTTP API ở mọi quy mô. Nó đứng làm "cửa trước" nhận request HTTP từ client rồi gọi backend
(thường là Lambda), lo luôn throttling, authorization và caching.

- **A. AppSync** cũng là managed API nhưng cho **GraphQL**, không phải REST/HTTP.
- **C. EventBridge** là event bus, không phục vụ request HTTP đồng bộ của client.
- **D. SNS** là pub/sub messaging, không phải API endpoint cho client gọi vào.

📌 Nhớ cho đề: "REST/HTTP API làm cửa trước" → **API Gateway**; "GraphQL" → **AppSync**.

</details>

## Phần B — Monitoring / observability

### Câu 10 (multiple choice)

Bạn cần biết **ai đã gọi API nào, khi nào, từ đâu** trong account để phục vụ audit và
điều tra bảo mật. Dịch vụ nào?

- A. CloudWatch
- B. CloudTrail
- C. X-Ray
- D. AWS Health Dashboard

<details>
<summary>Đáp án</summary>

**B — CloudTrail.** CloudTrail ghi lại mọi API call trong account — ai (identity) gọi,
hành động gì, khi nào, từ IP nào — phục vụ audit, governance và compliance. Mẹo nhớ:
**Trail = dấu vết hoạt động để lại**, trả lời câu hỏi "ai đã làm gì".

- **A. CloudWatch** đo hiệu năng (metric/log/alarm) — trả lời "tài nguyên đang chạy thế
  nào", không phải "ai gọi API".
- **C. X-Ray** là tracing để lần theo một request qua các service nhằm tìm chỗ chậm/lỗi,
  không phải log audit.
- **D. AWS Health Dashboard** cho biết tình trạng sức khoẻ dịch vụ AWS, không ghi lại
  hành động của user.

📌 Nhớ cho đề: "ai gọi API nào, khi nào, từ đâu + audit" → **CloudTrail**.

</details>

### Câu 11 (multiple choice)

Bạn muốn **theo dõi CPU của EC2 và đặt alarm** khi vượt ngưỡng để kích hoạt Auto Scaling.
Dịch vụ nào?

- A. CloudTrail
- B. CloudWatch
- C. X-Ray
- D. EventBridge

<details>
<summary>Đáp án</summary>

**B — CloudWatch.** CloudWatch thu thập metric (CPU, network, disk...), cho đặt alarm theo
ngưỡng, và alarm có thể kích hoạt hành động như Auto Scaling hoặc gửi notification qua SNS.
CloudWatch trả lời "chuyện gì đang xảy ra với tài nguyên" — đúng tình huống theo dõi CPU
và scale tự động.

- **A. CloudTrail** ghi API call để audit, không đo metric hiệu năng cũng không đặt alarm
  theo ngưỡng CPU.
- **C. X-Ray** là tracing request qua microservice, không theo dõi CPU hay trigger Auto
  Scaling.
- **D. EventBridge** định tuyến event theo rule; nó có thể phản ứng với một số sự kiện
  nhưng việc đo metric CPU và đặt alarm theo ngưỡng là của CloudWatch.

📌 Nhớ cho đề: "metric + alarm theo ngưỡng + trigger Auto Scaling" → **CloudWatch**.

</details>

### Câu 12 (multiple choice)

Trong một kiến trúc microservices, một request đi qua nhiều service và bạn cần **tìm xem
khâu nào chậm/lỗi** bằng cách lần theo trace của request. Dịch vụ nào?

- A. CloudWatch Logs
- B. CloudTrail
- C. X-Ray
- D. Kinesis

<details>
<summary>Đáp án</summary>

**C — X-Ray.** X-Ray cung cấp distributed tracing: nó gắn trace vào request và lần theo
request đó khi nó đi qua nhiều service/Lambda, dựng service map cho thấy thời gian ở từng
khâu — nhờ đó định vị bottleneck và lỗi trong hệ phân tán.

- **A. CloudWatch Logs** gom log tập trung, nhưng không tự nối các bước của một request
  thành một trace xuyên service như X-Ray.
- **B. CloudTrail** ghi API call quản trị để audit, không trace luồng request ứng dụng.
- **D. Kinesis** là streaming data, không phải công cụ tracing.

📌 Nhớ cho đề: "trace một request qua nhiều microservice + tìm chỗ chậm" → **X-Ray**.

</details>

### Câu 13 (multiple choice)

Phát biểu nào **đúng** về khác biệt giữa CloudWatch và CloudTrail?

- A. CloudWatch ghi lịch sử API call; CloudTrail đo metric hiệu năng
- B. CloudWatch đo metric/log/alarm (hiệu năng); CloudTrail ghi lịch sử API call (audit)
- C. Cả hai đều chỉ dùng để audit
- D. CloudTrail dùng để đặt alarm còn CloudWatch dùng để tracing

<details>
<summary>Đáp án</summary>

**B.** Đây là cặp phân biệt ra đề cực nhiều. **CloudWatch = hiệu năng**: metric, log,
alarm — "tài nguyên đang chạy thế nào". **CloudTrail = audit**: lịch sử API call — "ai đã
làm gì, khi nào".

- **A** đảo ngược hai dịch vụ: CloudTrail mới ghi API call, CloudWatch mới đo metric.
- **C** sai: CloudWatch không dùng để audit mà để giám sát hiệu năng.
- **D** sai cả hai vế: đặt alarm là của CloudWatch (không phải CloudTrail), còn tracing
  là của X-Ray (không phải CloudWatch).

📌 Nhớ cho đề: **CloudWatch = Watch tài nguyên (hiệu năng)**; **CloudTrail = Trail dấu vết
(ai gọi API)**.

</details>

### Câu 14 (multiple choice)

Bạn muốn xem **tình trạng sức khoẻ của các dịch vụ AWS** và các sự kiện/bảo trì ảnh hưởng
tới tài nguyên của mình. Dịch vụ nào?

- A. CloudWatch Dashboards
- B. AWS Health Dashboard
- C. CloudTrail
- D. X-Ray

<details>
<summary>Đáp án</summary>

**B — AWS Health Dashboard.** AWS Health Dashboard cho biết tình trạng sức khoẻ các dịch
vụ AWS và các sự kiện (sự cố, bảo trì theo lịch) có ảnh hưởng tới tài nguyên trong account
của bạn — giúp biết vấn đề đến từ phía AWS chứ không phải ứng dụng.

- **A. CloudWatch Dashboards** hiển thị metric/alarm của chính tài nguyên bạn, không phải
  tình trạng dịch vụ AWS toàn cục.
- **C. CloudTrail** ghi lịch sử API call để audit, không báo sức khoẻ dịch vụ.
- **D. X-Ray** trace request trong ứng dụng của bạn, không liên quan health của AWS.

📌 Nhớ cho đề: "sức khoẻ dịch vụ AWS + sự kiện/bảo trì ảnh hưởng tới mình" → **AWS Health
Dashboard**.

</details>

### Câu 15 (multiple response — chọn 2)

Những khả năng nào sau đây thuộc về **CloudWatch**? (Chọn 2)

- A. Thu thập metric và đặt alarm theo ngưỡng
- B. Tập trung và lưu log từ ứng dụng/EC2/Lambda
- C. Ghi lại ai đã gọi API nào để audit
- D. Distributed tracing qua nhiều microservice
- E. Managed GraphQL API

<details>
<summary>Đáp án</summary>

**A và B.** CloudWatch có hai trụ cột: **metrics + alarms** (thu metric như CPU và báo
động theo ngưỡng) và **Logs** (gom log tập trung từ EC2, Lambda, ứng dụng). Cả hai đều
thuộc nhóm giám sát hiệu năng — đúng phạm vi CloudWatch.

- **C** là **CloudTrail** — ghi API call để audit, không phải CloudWatch.
- **D** là **X-Ray** — distributed tracing qua nhiều microservice.
- **E** là **AppSync** — managed GraphQL API, không dính gì tới monitoring.

📌 Nhớ cho đề: CloudWatch = **Metrics/Alarms + Logs**; đừng lẫn với CloudTrail (audit),
X-Ray (tracing), AppSync (GraphQL).

</details>

### Câu 16 (multiple choice)

Auditor hỏi: "Ba tháng trước ai đã tạo security group này và từ IP nào?" Bạn tra ở đâu?

- A. CloudWatch Metrics
- B. CloudWatch Dashboards
- C. CloudTrail
- D. X-Ray

<details>
<summary>Đáp án</summary>

**C — CloudTrail.** Câu hỏi là điển hình của audit: "ai đã làm hành động gì, khi nào, từ
IP nào". CloudTrail lưu lịch sử API call nên tra được ai đã gọi `CreateSecurityGroup`,
thời điểm và source IP — đúng việc của nó, kể cả truy ngược về quá khứ.

- **A. CloudWatch Metrics** chỉ có số liệu hiệu năng, không ghi ai gọi API.
- **B. CloudWatch Dashboards** chỉ là màn hình trực quan hoá metric, không lưu lịch sử
  hành động người dùng.
- **D. X-Ray** trace request ứng dụng để debug hiệu năng, không ghi lại thao tác quản trị.

📌 Nhớ cho đề: câu hỏi dạng "ai đã tạo/xoá/sửa resource này, khi nào, từ đâu" → luôn là
**CloudTrail**.

</details>

## Related Topics

- [Integration & monitoring](../reference/other-service-categories.md)
- [AWS — index](../index.md)
