---
title: "Câu hỏi: Serverless & containers"
i18n_status: untranslated
sidebar_position: 7
description: "Tự chấm phần Lambda, container và công cụ triển khai cho CLF-C02."
tags: [aws, clf-c02, quiz, serverless, containers]
domain: cloud
category: concept
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-10-13
---

> **Chốt:** Đa số câu dưới dạng "mô tả nhu cầu → chọn đúng dịch vụ compute". Nắm từ khóa: event-driven ngắn → Lambda, container không quản server → Fargate, deploy app nhanh → Elastic Beanstalk, hạ tầng lặp lại bằng code → CloudFormation, VPS đơn giản → Lightsail.

Tự chấm: đọc câu, chọn đáp án, rồi mở `<details>` để đối chiếu.

---

**Câu 1 (multiple choice).** Dịch vụ nào cho phép chạy code **theo sự kiện** mà **không cần provision hay quản server**, tính phí theo số request và thời gian chạy?

- A. Amazon EC2
- B. AWS Lambda
- C. Amazon Lightsail
- D. AWS Elastic Beanstalk

<details>
<summary>Đáp án</summary>

**B. AWS Lambda** — dịch vụ serverless chạy function theo event, không phải dựng hay quản server.

Lambda là trụ cột serverless của AWS: bạn chỉ upload đoạn code (function), còn việc provision, scale, patch server do AWS lo hết. Function được kích hoạt bởi một event (object mới trên S3, message vào SQS, HTTP request qua API Gateway, lịch định kỳ...). Mô hình tính phí là theo số request cộng thời gian chạy — không có request thì không tốn tiền, đúng tinh thần "pay for what you use".

- A sai: EC2 là virtual machine bạn phải tự chọn instance type, tự cài runtime, tự patch OS và tự scale — ngược hẳn với "không quản server".
- C sai: Lightsail là VPS gói sẵn giá cố định hàng tháng, không phải mô hình chạy-theo-event.
- D sai: Elastic Beanstalk là PaaS để triển khai cả một ứng dụng lên hạ tầng (EC2/ELB) chứ không phải chạy một function theo sự kiện.

📌 Nhớ cho đề: "chạy code theo event" + "không quản server" + "trả theo request/thời gian chạy" = AWS Lambda.

</details>

---

**Câu 2 (multiple choice).** Công ty muốn **chạy container nhưng KHÔNG muốn quản lý server/EC2 node** bên dưới. Nên dùng gì?

- A. Amazon ECS với EC2 launch type
- B. AWS Fargate
- C. Amazon EC2
- D. Amazon ECR

<details>
<summary>Đáp án</summary>

**B. AWS Fargate** — serverless compute engine cho container, không phải quản EC2 node.

Khi chạy container trên AWS, bạn cần hai thứ: một orchestrator (ECS hoặc EKS) để điều phối container, và một chỗ để container thực sự chạy. Chỗ chạy đó có hai lựa chọn: EC2 launch type (bạn tự dựng và quản cụm node) hoặc Fargate (AWS lo node, bạn chỉ khai báo CPU/memory). Fargate chính là "serverless cho container".

- A sai: ECS với EC2 launch type vẫn bắt bạn tự provision, scale và patch các EC2 node — tức vẫn phải quản server.
- C sai: EC2 là máy ảo thuần, còn phải quản nhiều hơn nữa.
- D sai: ECR chỉ là registry lưu trữ container image, không chạy container.

📌 Nhớ cho đề: "container" + "không quản server/node" = Fargate.

</details>

---

**Câu 3 (multiple choice).** Nhóm dev muốn **deploy một web app nhanh** và để AWS tự lo provisioning, capacity, load balancing và auto scaling, nhưng vẫn muốn thấy được tài nguyên bên dưới. Dịch vụ nào?

- A. AWS CloudFormation
- B. AWS Lambda
- C. AWS Elastic Beanstalk
- D. Amazon ECS

<details>
<summary>Đáp án</summary>

**C. AWS Elastic Beanstalk** — PaaS triển khai app nhanh mà vẫn thấy được hạ tầng bên dưới.

Elastic Beanstalk nhận code của bạn (Java, Python, Node.js, .NET...) rồi tự dựng EC2, Elastic Load Balancer, Auto Scaling Group và deploy app lên. Khác biệt mấu chốt so với các serverless thuần: bạn vẫn truy cập và tinh chỉnh được tài nguyên EC2/ELB bên dưới. Bản thân Beanstalk không tính phí thêm — bạn chỉ trả cho tài nguyên nó tạo ra.

- A sai: CloudFormation là IaC để mô hình hóa toàn bộ hạ tầng bằng template, không phải công cụ "deploy app nhanh" theo kiểu PaaS.
- B sai: Lambda chạy function theo event, không triển khai cả một web app có load balancer và auto scaling truyền thống.
- D sai: ECS điều phối container, không phải cách nhanh nhất để đưa một web app lên mà vẫn thấy EC2/ELB như Beanstalk.

📌 Nhớ cho đề: "deploy app nhanh" + "AWS lo provisioning/scaling nhưng vẫn thấy tài nguyên" = Elastic Beanstalk (PaaS).

</details>

---

**Câu 4 (multiple choice).** Dịch vụ nào dùng **template YAML/JSON** để dựng lại hạ tầng một cách **lặp lại, nhất quán** (Infrastructure as Code)?

- A. AWS Elastic Beanstalk
- B. AWS CloudFormation
- C. AWS Systems Manager
- D. Amazon EKS

<details>
<summary>Đáp án</summary>

**B. AWS CloudFormation** — Infrastructure as Code bằng template YAML/JSON.

CloudFormation cho phép khai báo toàn bộ hạ tầng (VPC, EC2, S3, RDS, IAM...) trong một template YAML/JSON, rồi deploy template đó thành một stack. Vì hạ tầng là code, bạn dựng lại được y hệt ở nhiều môi trường/region một cách nhất quán, version được, và xóa sạch bằng cách xóa stack.

- A sai: Elastic Beanstalk tập trung vào triển khai một ứng dụng, không phải mô hình hóa mọi loại tài nguyên hạ tầng.
- C sai: Systems Manager là bộ công cụ vận hành/quản lý máy đang chạy (patch, run command, parameter store), không phải IaC dựng hạ tầng từ template.
- D sai: EKS là Kubernetes managed để điều phối container, không liên quan tới việc dựng hạ tầng từ template.

📌 Nhớ cho đề: "template YAML/JSON" + "lặp lại hạ tầng nhất quán" = CloudFormation (IaC).

</details>

---

**Câu 5 (multiple choice).** Người mới muốn một **VPS đơn giản, giá cố định hàng tháng** cho một blog nhỏ. Lựa chọn phù hợp nhất?

- A. Amazon EC2
- B. Amazon Lightsail
- C. AWS Fargate
- D. AWS Lambda

<details>
<summary>Đáp án</summary>

**B. Amazon Lightsail** — VPS gói sẵn, giá cố định hàng tháng, hướng tới người mới.

Lightsail đóng gói sẵn compute, storage và networking thành các plan giá cố định dễ đoán theo tháng. Nó che bớt độ phức tạp của EC2 (chọn instance type, cấu hình VPC, security group...) nên hợp với người mới và các app nhỏ như blog, website cá nhân, app đơn giản.

- A sai: EC2 mạnh và linh hoạt nhưng phức tạp hơn, giá theo mức dùng chứ không phải gói cố định đơn giản — dành cho khi cần kiểm soát sâu.
- C sai: Fargate để chạy container không quản node, không phải VPS cho blog.
- D sai: Lambda chạy function theo event, không phải nơi host một blog chạy liên tục theo kiểu VPS.

📌 Nhớ cho đề: "VPS đơn giản" + "giá cố định hàng tháng" + "người mới" = Lightsail.

</details>

---

**Câu 6 (multiple choice).** Đâu là **registry lưu trữ container image** của AWS (tương tự Docker Hub)?

- A. Amazon ECS
- B. Amazon EKS
- C. Amazon ECR
- D. AWS Fargate

<details>
<summary>Đáp án</summary>

**C. Amazon ECR (Elastic Container Registry)** — nơi lưu trữ container image của AWS.

Trong luồng chạy container, bạn build image rồi push lên một registry; khi chạy, orchestrator sẽ pull image từ registry đó xuống. ECR chính là registry managed của AWS (vai trò giống Docker Hub) để lưu, versioning và phân phối image, tích hợp sẵn IAM để kiểm soát quyền truy cập.

- A sai: ECS là orchestrator điều phối container, không phải nơi lưu image.
- B sai: EKS là Kubernetes managed (cũng là orchestrator), không phải registry.
- D sai: Fargate là compute engine để container chạy, không lưu trữ image.

📌 Nhớ cho đề: "registry lưu container image" / "tương tự Docker Hub" = ECR. ECS/EKS điều phối, Fargate chạy, ECR lưu image.

</details>

---

**Câu 7 (multiple choice).** Dịch vụ nào là **Kubernetes managed** của AWS?

- A. Amazon ECS
- B. Amazon EKS
- C. AWS Batch
- D. AWS Elastic Beanstalk

<details>
<summary>Đáp án</summary>

**B. Amazon EKS (Elastic Kubernetes Service)** — Kubernetes managed của AWS.

EKS chạy control plane Kubernetes do AWS quản lý, hợp khi tổ chức đã cam kết với hệ sinh thái Kubernetes (dùng Helm, operator, công cụ k8s chuẩn, dễ di chuyển đa cloud). Đổi lại là độ phức tạp cao hơn so với orchestrator riêng của AWS.

- A sai: ECS cũng là container orchestrator nhưng là của riêng AWS, đơn giản hơn và không phải Kubernetes.
- C sai: AWS Batch dùng để chạy batch computing job, không phải orchestrator Kubernetes.
- D sai: Elastic Beanstalk là PaaS triển khai app, không liên quan tới Kubernetes.

📌 Nhớ cho đề: "Kubernetes managed" = EKS. "Container orchestrator riêng của AWS, đơn giản hơn" = ECS.

</details>

---

**Câu 8 (multiple choice).** Khẳng định nào về **serverless** là ĐÚNG?

- A. Serverless nghĩa là không hề có server nào
- B. Bạn phải tự patch OS của server serverless
- C. Bạn không quản server và chỉ trả tiền theo lượng dùng thật
- D. Serverless luôn rẻ hơn mọi phương án khác trong mọi trường hợp

<details>
<summary>Đáp án</summary>

**C.** Server vẫn tồn tại nhưng AWS quản toàn bộ, còn bạn chỉ trả theo lượng dùng thật.

"Serverless" không có nghĩa là biến mất server — nó nghĩa là server đã bị trừu tượng hóa đi: AWS lo provision, scale, patch, bảo trì, còn bạn tập trung vào code/logic và trả tiền theo mức sử dụng thực tế (số request, thời gian chạy).

- A sai: server vẫn tồn tại, chỉ là bạn không nhìn thấy và không quản nó.
- B sai: việc patch OS là của AWS, không phải việc của bạn — đó là lợi ích chính của serverless.
- D sai: không có chuyện "luôn rẻ hơn mọi trường hợp"; với workload chạy liên tục dài hạn, EC2 reserved/dedicated có thể kinh tế hơn.

📌 Nhớ cho đề: serverless = vẫn có server nhưng AWS quản + trả theo lượng dùng. Cảnh giác các đáp án tuyệt đối hóa ("không hề có", "luôn rẻ hơn").

</details>

---

**Câu 9 (multiple choice).** Workload nào **ít phù hợp nhất** với AWS Lambda?

- A. Xử lý ảnh mỗi khi có object mới upload lên S3
- B. Một backend chạy **liên tục 24/7** với tiến trình kéo dài nhiều giờ
- C. Biến đổi record khi có message tới SQS
- D. Hàm chạy theo lịch mỗi 5 phút

<details>
<summary>Đáp án</summary>

**B.** Một backend chạy liên tục 24/7 với tiến trình kéo dài nhiều giờ là thứ ít hợp Lambda nhất.

Lambda sinh ra cho các tác vụ ngắn, event-driven: mỗi lần gọi có giới hạn thời gian chạy tối đa, nên tiến trình kéo dài nhiều giờ hoặc chạy liên tục không nghỉ sẽ vượt mô hình này. Workload như vậy hợp với EC2 hoặc Fargate hơn, vừa về kỹ thuật vừa về chi phí.

- A hợp Lambda: upload S3 là event điển hình kích hoạt function xử lý ảnh.
- C hợp Lambda: message tới SQS là nguồn event chuẩn, xử lý nhanh từng record.
- D hợp Lambda: chạy theo lịch (scheduled event) là use case kinh điển.

📌 Nhớ cho đề: Lambda = tác vụ ngắn, theo event. "Chạy liên tục 24/7" hoặc "process kéo dài nhiều giờ" = tín hiệu chọn EC2/Fargate, không phải Lambda.

</details>

---

**Câu 10 (multiple choice).** Cách Lambda **tính phí** là gì?

- A. Theo thời gian instance bật, dù có gọi hay không
- B. Theo số request cộng thời gian chạy (ms × memory cấp)
- C. Giá cố định hàng tháng
- D. Theo dung lượng image lưu trong registry

<details>
<summary>Đáp án</summary>

**B.** Lambda tính theo số request cộng thời gian chạy (mili-giây, nhân với lượng memory cấp cho function).

Đây là mô hình "pay per use" đúng nghĩa: bạn trả theo số lần function được gọi và theo thời lượng mỗi lần chạy (đo bằng ms), có tính thêm hệ số theo lượng memory bạn cấp. Không có lời gọi nào thì hóa đơn bằng 0 — không mất tiền cho capacity ngồi không.

- A sai: trả theo thời gian instance bật bất kể có dùng hay không là mô hình EC2, ngược với serverless.
- C sai: giá cố định hàng tháng gợi tới Lightsail.
- D sai: tính theo dung lượng image trong registry gợi tới chi phí lưu trữ của ECR, không phải cách Lambda tính phí chạy.

📌 Nhớ cho đề: Lambda tính phí = số request + thời gian chạy (ms × memory). Không gọi = không tốn tiền.

</details>

---

**Câu 11 (multiple choice).** Câu hỏi nhấn mạnh **"least operational overhead"** cho việc chạy một hàm xử lý sự kiện. Lựa chọn nào hợp nhất?

- A. EC2 tự cài runtime và tự scale
- B. ECS với EC2 launch type
- C. AWS Lambda
- D. Elastic Beanstalk trên một cụm EC2

<details>
<summary>Đáp án</summary>

**C. AWS Lambda** — "least operational overhead" cho một hàm chạy theo sự kiện luôn là serverless.

Trong đề CLF-C02, cụm từ "least operational overhead" (ít việc vận hành nhất) là tín hiệu mạnh hướng tới giải pháp managed/serverless. Khi nhu cầu còn là "chạy một hàm xử lý sự kiện", Lambda là phương án bỏ hết việc provision, scale, patch — gần như không còn gì để vận hành.

- A sai: EC2 tự cài runtime và tự scale là mức overhead cao nhất, ngược hẳn yêu cầu.
- B sai: ECS với EC2 launch type vẫn bắt bạn quản cụm node.
- D sai: Elastic Beanstalk trên cụm EC2 vẫn còn hạ tầng EC2 để trông coi, nhiều overhead hơn Lambda; và nó hợp triển khai cả app chứ không phải một hàm theo event.

📌 Nhớ cho đề: "least operational overhead" + "chạy hàm theo event" = Lambda. Thấy "tự cài / tự scale / quản node" là loại ngay.

</details>

---

**Câu 12 (multiple choice).** Dịch vụ nào tự **xếp hàng và chạy batch computing job** quy mô lớn, tự provision compute rồi dọn đi khi xong?

- A. AWS Batch
- B. AWS Lambda
- C. Amazon Lightsail
- D. AWS CloudFormation

<details>
<summary>Đáp án</summary>

**A. AWS Batch** — chuyên xếp hàng và chạy batch computing job quy mô lớn.

AWS Batch quản một hàng đợi job, tự provision lượng compute phù hợp (EC2 hoặc Fargate) để xử lý khối lượng lớn theo đợt, rồi dọn tài nguyên khi job xong. Hợp với các tác vụ nặng chạy theo lô: xử lý dữ liệu lớn, render, mô phỏng khoa học.

- B sai: Lambda hợp tác vụ ngắn, event-driven; không thiết kế cho khối lượng batch nặng, kéo dài.
- C sai: Lightsail là VPS giá cố định cho app nhỏ, không có cơ chế hàng đợi/scheduler batch.
- D sai: CloudFormation là IaC dựng hạ tầng, không chạy batch job.

📌 Nhớ cho đề: "batch job quy mô lớn" + "tự xếp hàng, tự provision rồi dọn" = AWS Batch.

</details>

---

**Câu 13 (multiple response — chọn 2).** Đâu là các khẳng định ĐÚNG về **Fargate**? (Chọn 2)

- A. Fargate là một orchestrator thay thế cho ECS và EKS
- B. Fargate cho phép chạy container mà không cần quản EC2 node
- C. Fargate có thể chạy bên dưới cả ECS lẫn EKS
- D. Fargate là một registry chứa container image

<details>
<summary>Đáp án</summary>

**B và C.** Fargate chạy container không cần quản EC2 node, và làm nền chạy cho cả ECS lẫn EKS.

Fargate là compute engine "serverless" cho container: thay vì tự dựng và quản một cụm EC2 node làm chỗ chạy, bạn chỉ khai báo CPU/memory cho task, AWS lo phần còn lại. Nó không phải một orchestrator riêng — nó là launch type/nền chạy mà cả ECS và EKS đều dùng được.

- A sai: Fargate không điều phối container; ECS và EKS mới là orchestrator. Fargate là nơi container chạy.
- D sai: registry chứa image là ECR, không phải Fargate.

📌 Nhớ cho đề: phân vai rõ — ECS/EKS điều phối, Fargate là nền chạy không-quản-node, ECR lưu image.

</details>

---

**Câu 14 (multiple response — chọn 2).** Những phát biểu nào phân biệt đúng **Elastic Beanstalk** và **CloudFormation**? (Chọn 2)

- A. Beanstalk tập trung vào triển khai nhanh một ứng dụng
- B. CloudFormation dùng template để dựng và lặp lại hạ tầng
- C. Beanstalk là Infrastructure as Code bằng template YAML/JSON
- D. CloudFormation chỉ dùng để chạy function serverless

<details>
<summary>Đáp án</summary>

**A và B.** Beanstalk tập trung triển khai nhanh một app; CloudFormation dùng template để dựng và lặp lại hạ tầng.

Hai dịch vụ này hay bị lẫn vì đều "tự động hóa hạ tầng". Khác biệt: Beanstalk là PaaS — bạn quan tâm ứng dụng, nó lo hạ tầng để chạy app đó. CloudFormation là IaC — bạn mô hình hóa mọi loại tài nguyên bằng template YAML/JSON và dựng lại nhất quán ở nhiều nơi.

- C sai: IaC bằng template YAML/JSON là mô tả của CloudFormation, không phải Beanstalk.
- D sai: CloudFormation dựng được mọi loại tài nguyên (VPC, EC2, S3, RDS...), không chỉ riêng function serverless.

📌 Nhớ cho đề: Beanstalk = PaaS deploy app nhanh. CloudFormation = IaC bằng template, dựng mọi tài nguyên, lặp lại nhất quán.

</details>

---

**Câu 15 (multiple choice).** Công cụ nào cho phép định nghĩa hạ tầng bằng **ngôn ngữ lập trình quen thuộc** (như TypeScript, Python) rồi biên dịch ra CloudFormation?

- A. AWS SAM
- B. AWS CDK
- C. AWS Systems Manager
- D. Amazon ECR

<details>
<summary>Đáp án</summary>

**B. AWS CDK (Cloud Development Kit)** — viết hạ tầng bằng ngôn ngữ lập trình rồi sinh ra CloudFormation.

CDK cho phép mô tả hạ tầng bằng ngôn ngữ quen thuộc như TypeScript, Python, Java..., tận dụng vòng lặp, hàm, lớp của ngôn ngữ thay vì viết YAML/JSON thuần. Khi deploy, CDK biên dịch (synthesize) ra template CloudFormation rồi dùng chính CloudFormation để dựng tài nguyên.

- A sai: SAM là phần mở rộng của CloudFormation chuyên cho ứng dụng serverless (Lambda, API Gateway...), vẫn dạng template chứ không phải viết bằng ngôn ngữ lập trình đầy đủ.
- C sai: Systems Manager là bộ công cụ vận hành máy đang chạy, không phải IaC.
- D sai: ECR là registry lưu container image, không liên quan.

📌 Nhớ cho đề: "định nghĩa hạ tầng bằng ngôn ngữ lập trình → biên dịch ra CloudFormation" = CDK. SAM = mở rộng CloudFormation cho serverless.

</details>

---

**Câu 16 (multiple choice).** So với EC2 tự quản, điểm khác biệt cốt lõi của **Fargate** là gì?

- A. Fargate cho quyền kiểm soát OS và patching sâu hơn
- B. Fargate bỏ việc tự dựng và quản EC2 node làm nền chạy container
- C. Fargate chỉ chạy được workload batch
- D. Fargate là một VPS giá cố định

<details>
<summary>Đáp án</summary>

**B.** Khác biệt cốt lõi: Fargate bỏ việc tự dựng và quản cụm EC2 node làm nền chạy container.

Với EC2 launch type, bạn phải tự provision node, canh capacity, scale cụm và patch OS của node. Với Fargate, những việc đó biến mất — bạn chỉ khai báo CPU/memory cho task và AWS lo hạ tầng bên dưới. Đây chính là điểm "serverless" của Fargate.

- A sai: ngược lại — nếu muốn kiểm soát OS/patching sâu thì chọn EC2 launch type, không phải Fargate.
- C sai: Fargate chạy được dịch vụ long-running lẫn các loại task thông thường, không giới hạn ở batch.
- D sai: VPS giá cố định là mô tả của Lightsail, không phải Fargate.

📌 Nhớ cho đề: Fargate vs EC2 = bỏ việc quản node (serverless container), đổi lại mất quyền kiểm soát sâu OS/node.

</details>

---

## Related Topics

- [Serverless, containers & triển khai](../reference/compute.md)
- [Mục lục AWS](../index.md)
