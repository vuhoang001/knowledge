---
title: Compute
i18n_status: untranslated
sidebar_position: 11
description: "Năm họ instance EC2, ba cách chạy container, hai loại serverless. Và ranh giới hay bị bỏ qua: ECS/EKS không tự nghĩa là hết việc quản server."
tags: [aws, clf-c02, ec2, lambda, fargate, ecs, eks, auto-scaling, elb, domain-3]
domain: cloud
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-13
---

# Compute

> **Chốt:** Ba bậc trách nhiệm. **EC2** — bạn quản OS. **Container trên EC2** — bạn vẫn
> quản node. **Fargate / Lambda** — không còn server nào để quản. Mọi câu hỏi có cụm
> *"without managing servers"* hoặc *"reduce operational overhead"* đẩy đáp án xuống bậc
> thấp nhất đang khả thi.

## Mục tiêu

Task 3.3 đòi: chọn đúng **loại instance EC2**, chọn đúng **tuỳ chọn container**, chọn đúng
**serverless**, hiểu **auto scaling cho elasticity**, và hiểu **mục đích của load balancer**.

## Tổng quan

### Năm họ instance EC2

| Họ | Tối ưu cho | Dấu hiệu trong đề |
|---|---|---|
| **General purpose** (T, M) | Cân bằng CPU/RAM/mạng | Web server, môi trường dev |
| **Compute optimized** (C) | CPU cao | Xử lý theo lô, mã hoá, game server, HPC |
| **Memory optimized** (R, X) | RAM lớn | Database trong bộ nhớ, cache, phân tích tập lớn |
| **Storage optimized** (I, D) | IOPS cục bộ rất cao | Data warehouse, NoSQL tự dựng, log xử lý tuần tự |
| **Accelerated computing** (P, G, Inf) | GPU / chip chuyên dụng | Huấn luyện ML, suy luận, dựng hình |

Đề không hỏi tên instance cụ thể — nó mô tả workload rồi hỏi **họ nào**. Đọc câu hỏi tìm
chữ: *CPU-intensive* → C · *in-memory / large dataset in RAM* → R · *high local IOPS* → I ·
*machine learning training* → P/G.

### Container: ba lựa chọn, và chỗ bị hiểu sai

| Service | Là gì | Ai quản server |
|---|---|---|
| **Amazon ECR** | Nơi **lưu image** container | — |
| **Amazon ECS** | Orchestrator **của AWS** | Tuỳ launch type |
| **Amazon EKS** | **Kubernetes** được quản | Tuỳ launch type |
| **AWS Fargate** | **Launch type serverless** cho ECS và EKS | **AWS** |

**Fargate không phải đối thủ của ECS/EKS — nó là cách chạy chúng.** ECS/EKS với launch
type EC2 nghĩa là bạn vẫn sở hữu, vá, và trả tiền cho node theo giờ. Với Fargate thì
không còn node. Đây đúng là chỗ
[shared responsibility](shared-responsibility.md) dịch chuyển.

ECS ⇄ EKS trong đề: *đã dùng Kubernetes / cần chuẩn Kubernetes* → **EKS**; không nhắc
Kubernetes, muốn đơn giản nhất → **ECS**.

### Serverless

| Service | Mô hình | Giới hạn đáng nhớ |
|---|---|---|
| **AWS Lambda** | Chạy **hàm** theo sự kiện, trả theo số lần gọi và thời gian chạy | Mỗi lần chạy có **thời gian tối đa 15 phút** |
| **AWS Fargate** | Chạy **container**, không quản node | Không giới hạn kiểu 15 phút |
| **AWS Batch** | Chạy **job theo lô**, tự xếp hàng và cấp tài nguyên | Dành cho lô lớn, chạy lâu |

Ba dòng đó là một bộ phân loại hay ra đề: *event-driven, ngắn* → Lambda · *tiến trình chạy
lâu, đã đóng container* → Fargate · *hàng nghìn job tính toán theo lô* → Batch.

### Các cách chạy khác

| Service | Dùng khi |
|---|---|
| **Amazon Lightsail** | Muốn **giá cố định hằng tháng**, dựng nhanh một web/WordPress — đơn giản hơn EC2 |
| **AWS Elastic Beanstalk** | Có code, muốn AWS tự dựng EC2 + ELB + Auto Scaling |
| **AWS Outposts / Local Zones / Wavelength** | Cần compute ở chỗ đặc biệt — xem [global infrastructure](global-infrastructure.md) |

Lightsail ⇄ EC2: *predictable monthly price, simple* → Lightsail.

### Elastic Load Balancing và Auto Scaling: hai việc, không thay nhau được

| | Elastic Load Balancing | Auto Scaling |
|---|---|---|
| Việc | **Phân phối** traffic tới nhiều target, qua nhiều AZ | **Thêm/bớt** instance theo tải |
| Giải quyết | Một instance chết thì traffic đi chỗ khác; **high availability** | Tải lên thì có thêm máy, tải xuống thì bớt; **elasticity** |
| Có **health check** | Có — bỏ target không lành ra khỏi vòng | Có — thay instance chết |

**Chúng hầu như luôn đi cặp**: ELB đứng trước, Auto Scaling group đứng sau. Nhưng câu hỏi
"AZ sập thì sao" trả lời bằng **nhiều AZ + ELB**, còn "tải tăng gấp mười vào thứ Sáu" trả
lời bằng **Auto Scaling**.

Bốn loại load balancer cần nhận ra tên: **ALB** (HTTP/HTTPS, định tuyến theo đường dẫn),
**NLB** (TCP/UDP, hiệu năng rất cao), **GWLB** (chèn thiết bị kiểm tra), **CLB** (thế hệ cũ).

**AWS Auto Scaling** (khác *EC2 Auto Scaling*) là tầng điều phối scaling cho nhiều loại
tài nguyên, không chỉ EC2. **AWS Compute Optimizer** đọc số liệu thật rồi đề xuất đổi cỡ —
đó là công cụ của [rightsizing](cloud-economics.md).

## Giải thích cặn kẽ

### Ba bậc trách nhiệm, nói bằng chuyện thuê nhà

Ranh giới này là linh hồn của cả Task 3.3, nên nhớ bằng một ví von sẽ chắc hơn nhớ bảng:

- **EC2 = tự thuê một căn nhà và tự lo mọi thứ.** Bạn cầm chìa khoá cả căn: tự sơn tường
  (cài OS), tự sửa ống nước (vá bảo mật, cập nhật kernel), tự bật tắt điện (quản lý
  instance chạy hay tắt). AWS chỉ xây sẵn cái khung nhà (hạ tầng vật lý, hypervisor).
  Linh hoạt nhất, nhưng việc vặt nhiều nhất.
- **Container trên EC2 (ECS/EKS launch type EC2) = thuê nhà có người giúp một phần.** Có
  người lo điều phối container vào đúng phòng (orchestrator xếp task lên node), nhưng
  **căn nhà — tức các node EC2 — vẫn là của bạn**: vẫn phải vá chúng, vẫn trả tiền chúng
  theo giờ kể cả khi phòng trống.
- **Fargate / Lambda = ở khách sạn, chỉ xách vali tới.** Không sở hữu căn phòng nào.
  Cần chỗ thì nhận phòng, xong việc thì trả phòng, chỉ trả cho đúng số đêm (hoặc số lần
  gọi) đã dùng. Không ai bắt bạn vá ống nước. Đổi lại ít quyền tinh chỉnh và đơn giá mỗi
  đêm thường nhỉnh hơn khi ở lâu dài, đều đặn.

Mọi câu hỏi "*without managing servers*", "*reduce operational overhead*", "*no
infrastructure to manage*" đang hỏi "khách sạn ở đâu" — kéo đáp án về Fargate/Lambda.

### Mỗi họ instance, một workload đời thực

- **General purpose (T, M)** — một **web server** hoặc **API backend** tải vừa phải, và
  các **môi trường dev/test**. T (ví dụ t3) có cơ chế *burst*: rẻ khi chạy nhàn, dồn
  credit để bật nhanh khi có spike — hợp blog, trang nội bộ ít truy cập. M cho API chạy
  đều, lượng request ổn định.
- **Compute optimized (C)** — một **game server** chịu nhiều người chơi cùng lúc, một cụm
  **batch encoding video** (transcode), hay một **HPC** mô phỏng khoa học. Dấu hiệu: nghẽn
  ở CPU chứ không ở RAM.
- **Memory optimized (R, X)** — một **Redis/Memcached cache** lớn, một **in-memory
  database** như SAP HANA, hay chạy **phân tích/BI** nạp vài trăm GB dataset vào RAM để
  truy vấn tức thì. Dấu hiệu: "giữ cả tập dữ liệu trong bộ nhớ".
- **Storage optimized (I, D)** — một **data warehouse** tự dựng, một **NoSQL** (Cassandra,
  ScyllaDB) cần đọc/ghi đĩa cục bộ cực nhanh, hay **xử lý log/stream** tuần tự khối lượng
  lớn. Dấu hiệu: "very high local IOPS", ổ NVMe gắn trực tiếp.
- **Accelerated computing (P, G, Inf)** — **huấn luyện mô hình deep learning** (P), **suy
  luận ML** và **render đồ hoạ 3D / video** (G), hay **inference chi phí thấp** trên chip
  AWS Inferentia (Inf). Dấu hiệu: GPU, machine learning, rendering.

### Lambda, nhìn kỹ hơn

**Event-driven nghĩa là gì.** Lambda không có server chạy sẵn chờ bạn gọi; nó nằm im cho
tới khi **một sự kiện xảy ra** rồi mới bật hàm của bạn lên chạy đúng lúc đó. Ví dụ kinh
điển: người dùng **upload một ảnh lên S3** → S3 phát ra sự kiện *object created* →
sự kiện này **trigger một hàm Lambda** → hàm resize ảnh thành thumbnail rồi ghi lại vào
S3. Bạn không phải dựng, bật, hay canh một server nào cho việc resize đó. Các nguồn sự
kiện thường gặp khác: API Gateway (có request HTTP tới), DynamoDB Streams (bản ghi đổi),
SQS (có message trong hàng đợi), EventBridge (tới giờ hẹn).

**Trả tiền ra sao.** Hai thành phần: **số request** (mỗi lần hàm được gọi) cộng
**duration** (thời gian chạy × bộ nhớ cấp cho hàm). Không có request thì không chạy, không
chạy thì **không trả một xu nào** — khác hẳn EC2 vẫn tính tiền theo giờ dù máy ngồi không.
Đây là lý do Lambda hợp workload lúc có lúc không, lưu lượng co giãn thất thường.

**Cold start.** Khi một hàm lâu không được gọi (hoặc cần thêm bản chạy song song), AWS
phải khởi tạo môi trường thực thi mới trước khi chạy code — độ trễ thêm đó gọi là
*cold start*. Lần gọi tiếp theo khi môi trường còn "ấm" thì nhanh. Với trang cần phản hồi
tức thì mọi lúc, cold start là một đánh đổi phải cân nhắc.

**Giới hạn 15 phút.** Mỗi lần chạy của một hàm Lambda **tối đa 15 phút** rồi bị cắt. Đây
là con số chốt cho đề: việc nào cần chạy lâu hơn (job 2 giờ, xử lý lô dài) thì **không
dùng Lambda** — chuyển sang **Fargate** (container chạy không giới hạn kiểu đó) hoặc
**AWS Batch** (job theo lô).

## Ví dụ cụ thể

### Tình huống chọn: ECS vs EKS vs Fargate

Một đội nhỏ đã đóng gói ứng dụng thành **container Docker**, nhưng **chưa từng dùng
Kubernetes** và muốn **ít việc vận hành nhất có thể** — không muốn vá node, không muốn
canh cụm. Chọn thế nào?

1. **Cần Kubernetes không?** Không, đội chưa dùng và không có yêu cầu chuẩn K8s → **loại
   EKS** (EKS kéo theo cả bộ khái niệm Kubernetes và phí control plane).
2. **Vậy ECS.** ECS là orchestrator của AWS, đơn giản hơn, không cần biết Kubernetes.
3. **Chạy ECS trên launch type nào?** Muốn hết việc vá node → chọn **Fargate** thay vì
   EC2 launch type.

→ Đáp án: **ECS trên Fargate.** Nhớ: ECS/EKS trả lời câu "điều phối container kiểu gì",
Fargate trả lời câu "ai quản node" — hai trục khác nhau, chọn trên cả hai.

Đổi một chi tiết: nếu đề nói *"đội đã vận hành Kubernetes nhiều năm, muốn chuyển workload
lên AWS mà giữ nguyên manifest và công cụ K8s"* → đổi sang **EKS** (trên Fargate nếu vẫn
muốn bỏ việc quản node).

### Tình huống: ELB và Auto Scaling là hai việc khác hẳn

Cùng một ứng dụng web, hai kịch bản tách bạch:

- **"Một AZ sập lúc 3 giờ sáng — người dùng vẫn truy cập được."** Đây là **high
  availability**, không phải chuyện tải. Lời giải: đặt instance ở **nhiều AZ** và cho
  **ELB** đứng trước. ELB có health check, thấy các target ở AZ chết thì **ngừng gửi
  traffic sang đó**, dồn về AZ còn sống. Auto Scaling ở đây không giải được bài toán
  "đang chạy thì một vùng chết" — nó không phân phối traffic.
- **"Thứ Sáu khuyến mãi, lưu lượng tăng gấp 10 trong vài giờ rồi về bình thường."** Đây
  là **elasticity**. Lời giải: **Auto Scaling group** thấy CPU/traffic vượt ngưỡng thì
  **thêm instance**, hết đợt cao điểm thì **bớt đi** để khỏi trả tiền thừa. ELB ở đây
  không giải được — nó chỉ chia traffic cho số máy *đang có*, không tự tạo thêm máy.

Thực tế ghép cả hai: ELB đứng trước một Auto Scaling group trải trên nhiều AZ — vừa chịu
được AZ sập, vừa co giãn theo tải. Nhưng trong đề, đọc kỹ câu hỏi đang hỏi **việc nào**:
*availability / AZ fails* → ELB + multi-AZ · *tải thay đổi / cost khi tải thấp* → Auto
Scaling.

### Tình huống đề thi mẫu

**Câu 1.** Một công ty cần chạy một script xử lý file dài khoảng **40 phút** mỗi khi có
file mới được đẩy lên S3, và muốn **không phải quản lý server nào**. Dịch vụ nào phù hợp?

- A. AWS Lambda
- B. Amazon EC2 với Auto Scaling
- C. AWS Fargate
- D. Amazon Lightsail

*Giải: **C.** "Không quản server" loại B và D (vẫn là EC2). Lambda (A) bị cắt ở **15
phút** nên không chạy nổi job 40 phút. Fargate chạy container serverless, không giới hạn
kiểu 15 phút → đúng.*

**Câu 2.** Ứng dụng của bạn cần **giữ toàn bộ một tập dữ liệu lớn trong RAM** để truy vấn
tức thì. Nên chọn họ EC2 nào?

- A. Compute optimized (C)
- B. Memory optimized (R)
- C. Storage optimized (I)
- D. General purpose (M)

*Giải: **B.** "Giữ dataset lớn trong RAM" là tín hiệu kinh điển của **memory optimized**.
Compute optimized là cho CPU-intensive, storage optimized cho IOPS cục bộ cao — đều không
phải bài toán RAM.*

**Câu 3.** Ứng dụng web chạy trên nhiều EC2 và cần **vẫn phục vụ được người dùng khi một
Availability Zone gặp sự cố**. Giải pháp nào trực tiếp nhất?

- A. Chỉ bật EC2 Auto Scaling
- B. Đặt instance ở nhiều AZ và dùng Elastic Load Balancing
- C. Tăng cỡ instance lên loại lớn hơn
- D. Chuyển sang AWS Lambda

*Giải: **B.** Đây là bài toán **high availability**. Nhiều AZ + ELB: ELB health-check
phát hiện target ở AZ hỏng rồi dồn traffic sang AZ còn sống. Auto Scaling (A) lo tải, không
lo phân phối khi một vùng chết; tăng cỡ máy (C) không chống được việc cả một AZ sập.*

## Bẫy trong đề

| Bẫy | Vì sao sai |
|---|---|
| "Dùng ECS nên không phải quản server" | Chỉ đúng với **Fargate**; launch type EC2 thì vẫn phải vá node |
| Chọn **Auto Scaling** cho "chịu được một AZ sập" | Đó là HA ⇒ nhiều AZ + ELB |
| Chọn **ELB** cho "giảm chi phí khi tải thấp" | ELB không bớt instance; đó là Auto Scaling |
| Chọn **Lambda** cho job chạy 2 giờ | Lambda tối đa **15 phút** mỗi lần chạy ⇒ Fargate hoặc Batch |
| Chọn **EC2** cho "chạy code theo sự kiện, không quản hạ tầng" | Đó là Lambda |
| Chọn **compute optimized** cho "giữ tập dữ liệu lớn trong RAM" | Đó là **memory optimized** |
| Chọn **Lightsail** cho kiến trúc cần tinh chỉnh sâu | Lightsail đổi tính linh hoạt lấy sự đơn giản |

## Đánh đổi

| Quyết định | Được | Mất |
|---|---|---|
| Lambda thay EC2 | Không quản server, không trả tiền khi rảnh | Giới hạn thời gian chạy; cold start; khó chuyển sang nơi khác |
| Fargate thay ECS-on-EC2 | Hết việc vá node | Đơn giá tính theo vCPU/RAM thường cao hơn khi tải **đều và cao** |
| EKS thay ECS | Chuẩn Kubernetes, chuyển được giữa các nơi | Phức tạp hơn nhiều, có phí control plane |
| Auto Scaling | Chỉ trả cho tải thật | Phải chọn metric và ngưỡng đúng; scale sai nhịp thì vừa chậm vừa tốn |
| Lightsail thay EC2 | Giá cố định, dựng rất nhanh | Khó mở rộng sang kiến trúc phức tạp |

## Related Topics

- [Global infrastructure](global-infrastructure.md) — Multi-AZ là tiền đề của ELB và Auto Scaling
- [Shared responsibility model](shared-responsibility.md) — ranh giới dịch rõ nhất ở Fargate ⇄ EC2
- [Pricing model](pricing-models.md) — On-Demand, Spot, Reserved, Savings Plans áp lên chính compute này
- [Network](networking.md) — instance nằm trong subnet nào, SG nào
- [Cách triển khai và truy cập](deploy-and-access-methods.md) — Beanstalk dựng sẵn bộ EC2 + ELB + ASG
- [AWS · Foundations](../index.md)
