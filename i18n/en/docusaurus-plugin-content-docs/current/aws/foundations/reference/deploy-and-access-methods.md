---
title: Cách triển khai và truy cập
i18n_status: untranslated
sidebar_position: 9
description: "Console, CLI, SDK, IaC — chọn theo một lần hay lặp lại. Cloud/hybrid/on-premises, và ba cách nối mạng vào AWS: internet, VPN, Direct Connect."
tags: [aws, clf-c02, cloudformation, iac, cli, sdk, direct-connect, vpn, domain-3]
domain: cloud
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-06
---

# Cách triển khai và truy cập

> **Chốt:** Câu hỏi quyết định không phải "cách nào xịn hơn" mà **"việc này làm một lần
> hay lặp lại"**. Một lần → Console. Lặp lại → **IaC** (CloudFormation). Trong script →
> CLI. Trong code ứng dụng → SDK.

## Mục tiêu

Task 3.1 đòi bốn thứ: chọn giữa **Console / CLI / SDK / IaC**, đánh giá **một lần ⇄ lặp
lại**, nhận ra ba **deployment model** (cloud, hybrid, on-premises), và nhận ra ba tuỳ
chọn **kết nối** (internet công cộng, VPN, Direct Connect).

## Tổng quan

### Bốn cách tác động lên AWS

| Cách | Là gì | Chọn khi |
|---|---|---|
| **AWS Management Console** | Giao diện web | Khám phá, làm **một lần**, xem trạng thái |
| **AWS CLI** | Lệnh dòng, chạy được trong script | Tự động hoá việc vận hành, làm hàng loạt |
| **SDK** | Thư viện cho Python/Java/JS/… | Gọi AWS **từ trong ứng dụng** |
| **IaC** — CloudFormation, CDK | Mô tả hạ tầng thành template | Cần **lặp lại giống nhau**, cần review và version |

Hai công cụ chạy lệnh ngay trong trình duyệt, không cài gì: **AWS CloudShell** (shell có
sẵn CLI) và **AWS Cloud9** (IDE trên cloud).

### IaC: CloudFormation và họ hàng

| Service | Việc |
|---|---|
| **AWS CloudFormation** | Template YAML/JSON → **stack** tài nguyên; xoá stack là xoá sạch |
| **AWS CDK** | Viết hạ tầng bằng ngôn ngữ lập trình, sinh ra CloudFormation |
| **AWS Elastic Beanstalk** | Đưa **code ứng dụng** lên, AWS tự dựng EC2/ELB/Auto Scaling bên dưới |
| **AWS Launch Wizard** | Hướng dẫn dựng một workload cụ thể (ví dụ SAP, SQL Server) đúng cỡ |
| **AWS Service Catalog** | Danh mục template **đã được duyệt** để người trong tổ chức tự dùng |
| **AWS Systems Manager** | Vận hành đội máy đang chạy: patch, chạy lệnh, lưu tham số |
| **AWS AppConfig** | Đổi **cấu hình ứng dụng** đang chạy mà không deploy lại |

Ranh giới hay hỏi: **CloudFormation ⇄ Elastic Beanstalk** — bạn mô tả *hạ tầng* ⇄ bạn chỉ
đưa *code* và nhận hạ tầng mặc định. Và cả hai đều **miễn phí**; chỉ trả tiền cho tài
nguyên chúng dựng ra.

Lợi ích của IaC mà exam guide gắn vào cả [kinh tế cloud](cloud-economics.md): lặp lại được,
bỏ lỗi tay, review như code, và **dựng lại toàn bộ môi trường** để test rồi xoá.

### Ba deployment model

| Model | Nghĩa | Service điển hình |
|---|---|---|
| **Cloud** | Mọi thứ chạy trên cloud | — |
| **Hybrid** | Một phần trên cloud, một phần trong data center | **Direct Connect**, **Storage Gateway**, **Outposts** |
| **On-premises** (private cloud) | Chạy trong hạ tầng riêng | **Outposts** — phần cứng AWS đặt tại chỗ |

### Ba cách nối mạng vào AWS

| Cách | Đi qua | Chọn khi |
|---|---|---|
| **Internet công cộng** | Internet | Mặc định, không chuẩn bị gì |
| **AWS Site-to-Site VPN** | Internet, **có mã hoá** | Cần riêng tư, **dựng trong vài giờ**, chịu được độ trễ biến động |
| **AWS Direct Connect** | **Đường vật lý riêng** tới AWS | Cần băng thông ổn định, độ trễ nhất quán, lưu lượng lớn lâu dài |

Ba dấu hiệu quyết định trong đề:

- *"encrypted connection quickly / low cost"* → **VPN**.
- *"consistent latency, dedicated bandwidth"* → **Direct Connect**.
- *"one-time transfer of 500 TB"* → **không phải cả hai** — đó là
  [Snow Family](migration-and-caf.md).

Direct Connect mất **nhiều tuần để lắp đặt** và tốn phí cố định; đó là lý do nó không bao
giờ là đáp án cho yêu cầu "ngay lập tức". Mẫu thường gặp trong thực tế: VPN làm đường dự
phòng cho Direct Connect.

## Bẫy trong đề

| Bẫy | Vì sao sai |
|---|---|
| Chọn Console cho "dựng 50 môi trường giống nhau" | Lặp lại ⇒ **IaC** |
| Chọn CLI cho "gọi AWS từ trong ứng dụng Python" | Đó là **SDK** |
| Chọn Direct Connect cho "cần ngay hôm nay" | Lắp đặt tính bằng tuần |
| Nghĩ CloudFormation có phí | Miễn phí; chỉ tài nguyên nó dựng mới tính tiền |
| Chọn **Beanstalk** cho "toàn quyền kiểm soát hạ tầng" | Beanstalk giữ phần hạ tầng cho mình; cần toàn quyền thì CloudFormation/EC2 |
| Chọn **Outposts** cho "chạy hoàn toàn trên cloud" | Outposts là phần cứng AWS **đặt tại chỗ khách** |

## Đánh đổi

| Quyết định | Được | Mất |
|---|---|---|
| IaC thay Console | Lặp lại được, review được, xoá sạch được | Phải học template; sửa nhanh một thứ trở nên chậm hơn |
| Beanstalk thay tự dựng | Lên production nhanh nhất | Ít quyền tinh chỉnh; khó khớp kiến trúc đặc thù |
| Direct Connect thay VPN | Băng thông và độ trễ ổn định | Phí cố định, lắp đặt lâu, **một đường là một điểm lỗi** nếu không có VPN dự phòng |
| Hybrid thay all-in cloud | Giữ được phần không chuyển được | Vận hành hai môi trường, hai mô hình bảo mật |

## Related Topics

- [Global infrastructure](global-infrastructure.md) — Region/AZ, nơi mọi thứ ở đây được triển khai vào
- [Compute](compute.md) — Beanstalk và Auto Scaling dựng ra EC2 gì
- [Network](networking.md) — VPN và Direct Connect gắn vào VPC thế nào
- [Migration và AWS CAF](migration-and-caf.md) — Snow Family cho lần chuyển một lần
- [Kinh tế cloud](cloud-economics.md) — automation là một nguồn tiết kiệm được exam guide nêu tên
- [AWS · Foundations](../index.md)
