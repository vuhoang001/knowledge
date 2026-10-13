---
title: "Câu hỏi: Khái niệm cloud & global infrastructure"
i18n_status: untranslated
sidebar_position: 1
description: "Tự chấm phần khái niệm cloud, deployment model và global infrastructure cho CLF-C02."
tags: [aws, clf-c02, quiz, cloud-concepts]
domain: cloud
category: concept
doc_type: tutorial
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-13
---

> Tự chấm: đọc đề, chọn đáp án, rồi mở khối **Đáp án** để đối chiếu. Mỗi câu ghi rõ loại.

## Câu 1 (multiple choice — chọn 1)

Một startup không muốn bỏ tiền mua server trước, mà chỉ trả cho phần hạ tầng thực sự dùng mỗi tháng. Lợi ích nào của cloud mô tả điều này?

- A. Economies of scale
- B. Trade capital expense for variable expense
- C. Go global in minutes
- D. Increase speed and agility

<details>
<summary>Đáp án</summary>

**B.** Đổi chi phí đầu tư trả trước (capex) thành chi phí vận hành theo mức dùng (opex) chính là "trade capital expense for variable expense".

</details>

## Câu 2 (multiple choice — chọn 1)

Để đạt **high availability**, nên triển khai ứng dụng trên nhiều thành phần nào trong cùng một Region?

- A. Nhiều Edge Location
- B. Nhiều Region
- C. Nhiều Availability Zone
- D. Nhiều Local Zone

<details>
<summary>Đáp án</summary>

**C.** High availability trong một Region đạt được bằng cách trải workload qua nhiều Availability Zone tách biệt — một AZ hỏng vẫn còn AZ khác.

</details>

## Câu 3 (multiple choice — chọn 1)

Một trang web muốn giảm độ trễ khi phân phối nội dung (ảnh, video) cho người dùng trên toàn cầu. Thành phần hạ tầng nào phục vụ mục đích này?

- A. Availability Zone
- B. Region
- C. Edge Location
- D. AWS Outposts

<details>
<summary>Đáp án</summary>

**C.** Edge Location (Point of Presence) nằm gần người dùng cuối và là nơi CDN như Amazon CloudFront phục vụ nội dung với độ trễ thấp.

</details>

## Câu 4 (multiple choice — chọn 1)

Amazon EC2 thuộc mô hình dịch vụ nào?

- A. SaaS
- B. PaaS
- C. IaaS
- D. FaaS

<details>
<summary>Đáp án</summary>

**C.** EC2 cung cấp máy chủ ảo mà bạn tự quản OS, runtime, ứng dụng — đó là Infrastructure as a Service (IaaS).

</details>

## Câu 5 (multiple choice — chọn 1)

Công ty giữ một phần hệ thống trong data center riêng vì lý do tuân thủ, đồng thời chạy phần còn lại trên AWS và nối hai bên với nhau. Đây là deployment model nào?

- A. Public / cloud-native
- B. Hybrid
- C. On-premises
- D. Multi-Region

<details>
<summary>Đáp án</summary>

**B.** Kết hợp giữa cloud và hạ tầng on-premises, nối với nhau, là mô hình Hybrid.

</details>

## Câu 6 (multiple choice — chọn 1)

Một ứng dụng phải lưu dữ liệu công dân trong lãnh thổ một quốc gia theo quy định pháp luật. Yếu tố nào quan trọng nhất khi chọn nơi chạy?

- A. Pricing của Region
- B. Số lượng Availability Zone
- C. Compliance / data sovereignty của Region
- D. Số Edge Location gần đó

<details>
<summary>Đáp án</summary>

**C.** Khi luật bắt buộc dữ liệu nằm trong một khu vực địa lý, compliance / data sovereignty là yếu tố loại trừ đầu tiên khi chọn Region.

</details>

## Câu 7 (multiple response — chọn 2)

Đâu là **hai** đặc trưng cốt lõi của cloud computing ở mức khái niệm? (Chọn 2)

- A. On-demand self-service
- B. Bắt buộc ký hợp đồng 3 năm
- C. Pay-as-you-go
- D. Chỉ chạy được trên phần cứng tại chỗ

<details>
<summary>Đáp án</summary>

**A và C.** Cloud computing đặc trưng bởi tự cấp phát theo nhu cầu (on-demand self-service) và trả theo mức dùng (pay-as-you-go). B và D ngược lại tinh thần của cloud.

</details>

## Câu 8 (multiple choice — chọn 1)

Dịch vụ nào là ví dụ điển hình của **PaaS** trên AWS?

- A. Amazon EC2
- B. AWS Elastic Beanstalk
- C. Amazon VPC
- D. Amazon EBS

<details>
<summary>Đáp án</summary>

**B.** Elastic Beanstalk lo OS, patching, scaling nền tảng — bạn chỉ đẩy code — đó là Platform as a Service. EC2/VPC/EBS là IaaS.

</details>

## Câu 9 (multiple choice — chọn 1)

Một doanh nghiệp muốn đưa phần cứng và dịch vụ AWS vào **chính data center của họ** để đạt độ trễ thấp và giữ dữ liệu tại chỗ. Giải pháp nào phù hợp?

- A. AWS Wavelength
- B. Amazon CloudFront
- C. AWS Outposts
- D. AWS Local Zones

<details>
<summary>Đáp án</summary>

**C.** AWS Outposts đưa hạ tầng AWS vào data center on-premises của khách hàng — dùng cho hybrid cần độ trễ thấp hoặc dữ liệu phải nằm tại chỗ.

</details>

## Câu 10 (multiple choice — chọn 1)

Vì sao AWS có thể cung cấp giá thấp hơn so với tự dựng hạ tầng?

- A. Vì AWS không tính phí lưu trữ
- B. Vì economies of scale — mua và vận hành ở quy mô khổng lồ
- C. Vì mọi dịch vụ đều miễn phí trong năm đầu
- D. Vì khách hàng phải đoán capacity trước

<details>
<summary>Đáp án</summary>

**B.** Quy mô khổng lồ giúp chi phí trên mỗi đơn vị thấp hơn, và phần tiết kiệm được truyền lại thành giá thấp cho khách hàng (economies of scale).

</details>

## Câu 11 (multiple response — chọn 3)

Khi chọn một AWS Region, đâu là những yếu tố cần cân nhắc? (Chọn 3)

- A. Compliance / data sovereignty
- B. Latency tới người dùng
- C. Màu sắc logo của Region
- D. Pricing của dịch vụ tại Region
- E. Service availability tại Region

<details>
<summary>Đáp án</summary>

**A, B, D, E đều đúng về lý thuyết — chọn 3 trong số đó**; C là distractor vô nghĩa. Bốn yếu tố chuẩn khi chọn Region là: compliance/data sovereignty, latency, pricing, và service availability.

</details>

## Câu 12 (multiple choice — chọn 1)

Phát biểu nào về Availability Zone là **đúng**?

- A. AZ là điểm phục vụ CDN gần người dùng
- B. Mỗi Region chỉ có đúng một AZ
- C. AZ gồm một hoặc nhiều data center tách biệt trong cùng một Region
- D. AZ là data center nằm trong chính văn phòng của khách hàng

<details>
<summary>Đáp án</summary>

**C.** Availability Zone là một hoặc nhiều data center tách biệt (về điện, mạng, vị trí) trong cùng một Region, nối với nhau bằng mạng độ trễ thấp. A là Edge Location; D là Outposts.

</details>

## Câu 13 (multiple choice — chọn 1)

Đội phát triển có thể dựng môi trường thử nghiệm trong vài phút thay vì chờ mua server vài tuần. Lợi ích nào của cloud mô tả điều này?

- A. Stop spending money running data centers
- B. Increase speed and agility
- C. Trade capex for opex
- D. Economies of scale

<details>
<summary>Đáp án</summary>

**B.** Tài nguyên sẵn sàng trong vài phút giúp thử nghiệm và ra sản phẩm nhanh hơn — đó là "increase speed and agility".

</details>

## Câu 14 (multiple choice — chọn 1)

Một ứng dụng game mobile cần độ trễ cực thấp cho người chơi đang dùng mạng 5G. Giải pháp AWS nào hướng tới trường hợp này?

- A. AWS Outposts
- B. AWS Wavelength
- C. Amazon RDS
- D. AWS Elastic Beanstalk

<details>
<summary>Đáp án</summary>

**B.** AWS Wavelength nhúng compute/storage vào mạng 5G của nhà mạng để ứng dụng mobile/edge đạt độ trễ rất thấp.

</details>

## Câu 15 (multiple choice — chọn 1)

Phần mềm email dùng ngay qua trình duyệt, không phải quản OS hay server, thuộc mô hình nào?

- A. IaaS
- B. PaaS
- C. SaaS
- D. On-premises

<details>
<summary>Đáp án</summary>

**C.** Dùng phần mềm trọn gói qua trình duyệt, nhà cung cấp lo toàn bộ hạ tầng và phần mềm — đó là Software as a Service (ví dụ Amazon WorkMail).

</details>

## Related Topics

- [Khái niệm cloud & AWS global infrastructure](../reference/cloud-value-proposition.md)
- [Mục lục AWS](../index.md)
