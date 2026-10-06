---
title: Well-Architected Framework
i18n_status: untranslated
sidebar_position: 2
description: "Sáu pillar và câu hỏi riêng của mỗi pillar. Đề không hỏi định nghĩa pillar — nó mô tả một tình huống rồi hỏi pillar nào đang bị vi phạm."
tags: [aws, clf-c02, well-architected, reliability, sustainability, domain-1]
domain: cloud
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-06
---

# Well-Architected Framework

> **Chốt:** Sáu pillar, và mỗi pillar sở hữu **đúng một câu hỏi**. Đề cho một tình huống
> rồi hỏi *pillar nào* — nên thứ phải thuộc không phải định nghĩa, mà là **từ khoá nào
> thuộc pillar nào**.

## Mục tiêu

Task statement 1.2 chỉ đòi hai thứ: kể được sáu pillar, và **phân biệt** được chúng.
Phần "phân biệt" là phần có điểm, vì ba cặp pillar chồng lấn nhau rất dễ lẫn.

## Tổng quan

### Sáu pillar

| Pillar | Câu hỏi nó sở hữu | Từ khoá trong đề |
|---|---|---|
| **Operational Excellence** | Chạy và **theo dõi** hệ thống thế nào, và cải tiến quy trình ra sao | *monitor*, *runbook*, *small reversible changes*, *IaC*, *observability* |
| **Security** | Bảo vệ dữ liệu, hệ thống, tài sản ra sao | *least privilege*, *encryption*, *traceability*, *identity* |
| **Reliability** | Hệ thống **phục hồi** sau lỗi và đáp ứng được nhu cầu không | *recover*, *failure*, *backup*, *multi-AZ*, *fault isolation* |
| **Performance Efficiency** | Dùng **đúng lượng** tài nguyên để đạt yêu cầu | *latency*, *right resource type*, *experiment*, *serverless* |
| **Cost Optimization** | Có đang trả cho thứ không cần không | *unused*, *rightsizing*, *spend*, *measure efficiency* |
| **Sustainability** | Tác động môi trường của workload | *carbon*, *energy*, *minimize resources*, *managed service* |

**Sustainability là pillar thứ sáu, thêm vào tháng 12/2021.** Tài liệu cũ chỉ có năm —
gặp đáp án liệt kê năm pillar thì đó là distractor dựa trên tài liệu lỗi thời.

### Ba cặp dễ lẫn, và ranh giới thật

| Cặp | Ranh giới |
|---|---|
| Reliability ⇄ Performance Efficiency | *Chịu được lỗi* (reliability) ⇄ *đủ nhanh* (performance). Thêm Multi-AZ là reliability; đổi instance type cho nhanh hơn là performance |
| Cost Optimization ⇄ Performance Efficiency | Cả hai đều dẫn tới *rightsizing*, nhưng động cơ khác: giảm tiền ⇄ đạt latency. Câu hỏi nói *reduce spend* thì là cost |
| Operational Excellence ⇄ Reliability | *Quy trình của con người và việc vận hành* ⇄ *hành vi của hệ thống khi hỏng*. Runbook và CI/CD là operational; auto failover là reliability |
| Cost Optimization ⇄ Sustainability | Cùng khuyên "bỏ tài nguyên không dùng", nhưng sustainability tính theo **tài nguyên vật lý tiêu thụ**, không theo hoá đơn |

### Design principles — sáu nguyên tắc chung

Khác với pillar, đây là nguyên tắc cắt ngang mọi pillar:

1. **Stop guessing capacity** — scale theo nhu cầu đo được.
2. **Test systems at production scale** — dựng bản sao, test, xoá.
3. **Automate to make architectural experimentation easier** — IaC.
4. **Allow for evolutionary architectures** — thiết kế để đổi được, không chốt một lần.
5. **Drive architectures using data** — quyết định bằng số đo.
6. **Improve through game days** — chủ động dựng lại sự cố để tập xử lý.

Nguyên tắc 2 và 3 **chỉ khả thi vì cloud trả tiền theo lượng dùng** — dựng một bản sao
production, test, rồi xoá là việc bất khả thi về tài chính trong data center. Đó là chỗ
framework này gắn vào [sáu lợi thế](cloud-value-proposition.md).

### AWS Well-Architected Tool

Service miễn phí trong Console: chọn workload, trả lời bộ câu hỏi theo từng pillar, nhận
danh sách rủi ro (**HRI** — high risk issue) kèm hướng sửa. Nó **không** quét hạ tầng
thật — nó hỏi bạn. Service tự quét là [Trusted Advisor](security-components.md).

Đây là ranh giới mà đề hỏi rất hay: *tool phỏng vấn* ⇄ *tool quét*.

## Bẫy trong đề

| Bẫy | Vì sao sai |
|---|---|
| Liệt kê năm pillar | Thiếu **Sustainability** |
| Gọi "Cost Optimization" cho câu *reduce latency* | Latency là Performance Efficiency |
| Gọi "Security" cho câu *audit who did what* | Truy vết là Security về *nguyên tắc*, nhưng nếu câu hỏi hỏi **service** thì là [CloudTrail](security-governance-compliance.md) |
| Cho rằng Well-Architected Tool quét tài nguyên | Nó là bộ câu hỏi; Trusted Advisor mới là bộ quét |
| Cho rằng phải đạt 100% mọi pillar | Framework nói rõ các pillar **đánh đổi với nhau** — tăng reliability thường tăng chi phí |

## Đánh đổi giữa các pillar, nói thẳng

| Tăng cái này | Thường mất cái này |
|---|---|
| Reliability (Multi-AZ, backup, replica) | Cost Optimization — hạ tầng nhân đôi |
| Performance (instance lớn, cache, replica) | Cost Optimization |
| Security (mã hoá, kiểm duyệt, nhiều tầng) | Operational Excellence — thêm bước, thêm ma sát |
| Cost Optimization (cắt tài nguyên dự phòng) | Reliability |

**Không có kiến trúc nào tối đa cả sáu.** Việc của framework là bắt ta *chọn có ý thức*,
và ghi lại vì sao — chứ không phải đưa ra một cấu hình đúng duy nhất.

## Related Topics

- [Giá trị của AWS Cloud](cloud-value-proposition.md) — sáu lợi thế mà framework này khai thác
- [Migration và AWS CAF](migration-and-caf.md) — CAF là framework *tổ chức*, Well-Architected là framework *kỹ thuật*
- [Thành phần bảo mật](security-components.md) — Trusted Advisor, công cụ quét thật
- [Kinh tế cloud](cloud-economics.md) — pillar Cost Optimization nói bằng số
- [AWS · Foundations](../index.md)
