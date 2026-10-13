---
title: "Câu hỏi: Serverless & containers"
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

**B — AWS Lambda.** Lambda là serverless, chạy function theo event, trả tiền theo số request + thời gian chạy (ms). EC2 phải tự quản; Lightsail là VPS; Beanstalk là PaaS triển khai app.

</details>

---

**Câu 2 (multiple choice).** Công ty muốn **chạy container nhưng KHÔNG muốn quản lý server/EC2 node** bên dưới. Nên dùng gì?

- A. Amazon ECS với EC2 launch type
- B. AWS Fargate
- C. Amazon EC2
- D. Amazon ECR

<details>
<summary>Đáp án</summary>

**B — AWS Fargate.** Fargate là "serverless cho container": không cần dựng/quản EC2 node. ECS với EC2 launch type thì vẫn phải quản node. ECR chỉ là registry chứa image.

</details>

---

**Câu 3 (multiple choice).** Nhóm dev muốn **deploy một web app nhanh** và để AWS tự lo provisioning, capacity, load balancing và auto scaling, nhưng vẫn muốn thấy được tài nguyên bên dưới. Dịch vụ nào?

- A. AWS CloudFormation
- B. AWS Lambda
- C. AWS Elastic Beanstalk
- D. Amazon ECS

<details>
<summary>Đáp án</summary>

**C — AWS Elastic Beanstalk.** PaaS: đưa code lên, AWS lo hạ tầng; bạn vẫn truy cập được EC2/ELB bên dưới. Không tính phí thêm cho Beanstalk, chỉ trả tài nguyên dùng.

</details>

---

**Câu 4 (multiple choice).** Dịch vụ nào dùng **template YAML/JSON** để dựng lại hạ tầng một cách **lặp lại, nhất quán** (Infrastructure as Code)?

- A. AWS Elastic Beanstalk
- B. AWS CloudFormation
- C. AWS Systems Manager
- D. Amazon EKS

<details>
<summary>Đáp án</summary>

**B — AWS CloudFormation.** IaC bằng template YAML/JSON, tạo stack để dựng/lặp lại hạ tầng. Beanstalk tập trung vào deploy app, không phải mô hình hóa toàn bộ hạ tầng.

</details>

---

**Câu 5 (multiple choice).** Người mới muốn một **VPS đơn giản, giá cố định hàng tháng** cho một blog nhỏ. Lựa chọn phù hợp nhất?

- A. Amazon EC2
- B. Amazon Lightsail
- C. AWS Fargate
- D. AWS Lambda

<details>
<summary>Đáp án</summary>

**B — Amazon Lightsail.** VPS gói sẵn compute/storage/networking, giá cố định dễ đoán, hướng tới người mới và app nhỏ. EC2 là lựa chọn phức tạp hơn khi cần kiểm soát sâu.

</details>

---

**Câu 6 (multiple choice).** Đâu là **registry lưu trữ container image** của AWS (tương tự Docker Hub)?

- A. Amazon ECS
- B. Amazon EKS
- C. Amazon ECR
- D. AWS Fargate

<details>
<summary>Đáp án</summary>

**C — Amazon ECR (Elastic Container Registry).** ECS/EKS kéo image từ ECR để chạy. ECS/EKS là orchestrator; Fargate là compute engine.

</details>

---

**Câu 7 (multiple choice).** Dịch vụ nào là **Kubernetes managed** của AWS?

- A. Amazon ECS
- B. Amazon EKS
- C. AWS Batch
- D. AWS Elastic Beanstalk

<details>
<summary>Đáp án</summary>

**B — Amazon EKS (Elastic Kubernetes Service).** Kubernetes managed, hợp khi đã cam kết hệ sinh thái Kubernetes. ECS là orchestrator riêng của AWS, đơn giản hơn.

</details>

---

**Câu 8 (multiple choice).** Khẳng định nào về **serverless** là ĐÚNG?

- A. Serverless nghĩa là không hề có server nào
- B. Bạn phải tự patch OS của server serverless
- C. Bạn không quản server và chỉ trả tiền theo lượng dùng thật
- D. Serverless luôn rẻ hơn mọi phương án khác trong mọi trường hợp

<details>
<summary>Đáp án</summary>

**C.** Server vẫn tồn tại nhưng AWS quản; bạn trả theo lượng dùng. A sai (vẫn có server), B sai (không phải việc của bạn), D sai (không có "luôn rẻ hơn" — workload liên tục dài có thể EC2 kinh tế hơn).

</details>

---

**Câu 9 (multiple choice).** Workload nào **ít phù hợp nhất** với AWS Lambda?

- A. Xử lý ảnh mỗi khi có object mới upload lên S3
- B. Một backend chạy **liên tục 24/7** với tiến trình kéo dài nhiều giờ
- C. Biến đổi record khi có message tới SQS
- D. Hàm chạy theo lịch mỗi 5 phút

<details>
<summary>Đáp án</summary>

**B.** Lambda hợp tác vụ ngắn, event-driven; có giới hạn thời gian chạy mỗi lần gọi nên không hợp tiến trình rất dài/chạy liên tục — lúc đó EC2/Fargate phù hợp và kinh tế hơn.

</details>

---

**Câu 10 (multiple choice).** Cách Lambda **tính phí** là gì?

- A. Theo thời gian instance bật, dù có gọi hay không
- B. Theo số request cộng thời gian chạy (ms × memory cấp)
- C. Giá cố định hàng tháng
- D. Theo dung lượng image lưu trong registry

<details>
<summary>Đáp án</summary>

**B.** Lambda tính theo số request + thời gian chạy (mili-giây, nhân lượng memory cấp). Không gọi thì không mất tiền. A là mô hình EC2; C gợi Lightsail.

</details>

---

**Câu 11 (multiple choice).** Câu hỏi nhấn mạnh **"least operational overhead"** cho việc chạy một hàm xử lý sự kiện. Lựa chọn nào hợp nhất?

- A. EC2 tự cài runtime và tự scale
- B. ECS với EC2 launch type
- C. AWS Lambda
- D. Elastic Beanstalk trên một cụm EC2

<details>
<summary>Đáp án</summary>

**C — AWS Lambda.** "Least operational overhead" + chạy hàm theo sự kiện → serverless. Lambda bỏ hết việc provision/scale/patch so với các phương án tự quản EC2.

</details>

---

**Câu 12 (multiple choice).** Dịch vụ nào tự **xếp hàng và chạy batch computing job** quy mô lớn, tự provision compute rồi dọn đi khi xong?

- A. AWS Batch
- B. AWS Lambda
- C. Amazon Lightsail
- D. AWS CloudFormation

<details>
<summary>Đáp án</summary>

**A — AWS Batch.** Chuyên chạy batch job lớn theo đợt, tự quản hàng đợi và provision EC2/Fargate. Lambda hợp tác vụ ngắn, không phải khối lượng batch nặng kéo dài.

</details>

---

**Câu 13 (multiple response — chọn 2).** Đâu là các khẳng định ĐÚNG về **Fargate**? (Chọn 2)

- A. Fargate là một orchestrator thay thế cho ECS và EKS
- B. Fargate cho phép chạy container mà không cần quản EC2 node
- C. Fargate có thể chạy bên dưới cả ECS lẫn EKS
- D. Fargate là một registry chứa container image

<details>
<summary>Đáp án</summary>

**B và C.** Fargate là compute engine "serverless" cho container, không quản node, và chạy dưới cả ECS lẫn EKS. A sai (Fargate không phải orchestrator — ECS/EKS mới là); D sai (đó là ECR).

</details>

---

**Câu 14 (multiple response — chọn 2).** Những phát biểu nào phân biệt đúng **Elastic Beanstalk** và **CloudFormation**? (Chọn 2)

- A. Beanstalk tập trung vào triển khai nhanh một ứng dụng
- B. CloudFormation dùng template để dựng và lặp lại hạ tầng
- C. Beanstalk là Infrastructure as Code bằng template YAML/JSON
- D. CloudFormation chỉ dùng để chạy function serverless

<details>
<summary>Đáp án</summary>

**A và B.** Beanstalk = PaaS deploy app nhanh; CloudFormation = IaC bằng template để dựng/lặp lại hạ tầng. C sai (IaC bằng template là CloudFormation); D sai (CloudFormation dựng mọi loại tài nguyên, không riêng serverless).

</details>

---

**Câu 15 (multiple choice).** Công cụ nào cho phép định nghĩa hạ tầng bằng **ngôn ngữ lập trình quen thuộc** (như TypeScript, Python) rồi biên dịch ra CloudFormation?

- A. AWS SAM
- B. AWS CDK
- C. AWS Systems Manager
- D. Amazon ECR

<details>
<summary>Đáp án</summary>

**B — AWS CDK (Cloud Development Kit).** Viết hạ tầng bằng ngôn ngữ lập trình, CDK sinh ra template CloudFormation. SAM là phần mở rộng của CloudFormation chuyên cho app serverless.

</details>

---

**Câu 16 (multiple choice).** So với EC2 tự quản, điểm khác biệt cốt lõi của **Fargate** là gì?

- A. Fargate cho quyền kiểm soát OS và patching sâu hơn
- B. Fargate bỏ việc tự dựng và quản EC2 node làm nền chạy container
- C. Fargate chỉ chạy được workload batch
- D. Fargate là một VPS giá cố định

<details>
<summary>Đáp án</summary>

**B.** Fargate loại bỏ việc tự quản cụm EC2 node — bạn chỉ khai báo CPU/memory cho container. A ngược lại (muốn kiểm soát sâu thì chọn EC2 launch type); D gợi Lightsail.

</details>

---

## Related Topics

- [Serverless, containers & triển khai](../reference/compute.md)
- [Mục lục AWS](../index.md)
