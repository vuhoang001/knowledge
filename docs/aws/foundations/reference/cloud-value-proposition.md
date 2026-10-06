---
title: Giá trị của AWS Cloud
sidebar_position: 1
description: "Sáu lợi thế cloud, tách rõ cái nào là kinh tế và cái nào là kỹ thuật — vì đề hỏi hai loại đó bằng hai loại từ khoá khác nhau."
tags: [aws, clf-c02, cloud-concepts, elasticity, agility, economies-of-scale, domain-1]
domain: cloud
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-06
---

# Giá trị của AWS Cloud

> **Chốt:** Sáu lợi thế chia làm hai loại, và đề hỏi hai loại bằng hai bộ từ khoá khác
> nhau. Loại **kinh tế** (`CapEx → OpEx`, `economies of scale`) trả lời câu "tiền".
> Loại **kỹ thuật** (`elasticity`, `agility`, `global reach`) trả lời câu "thời gian".
> Trộn hai loại là chỗ mất điểm — không phải vì không biết, mà vì chọn đúng-nhưng-lệch-trục.

## Mục tiêu

Task statement 1.1 đòi ba thứ: hiểu **economies of scale**, hiểu lợi thế của **global
infrastructure**, và phân biệt được **high availability / elasticity / agility**. Ba cụm
cuối nghe gần giống nhau trong tiếng Việt nhưng trả lời ba câu hỏi khác nhau.

## Tổng quan

### Sáu lợi thế, theo đúng cách AWS đặt tên

| # | Lợi thế | Trục | Nghĩa thật |
|---|---|---|---|
| 1 | Trade fixed expense for variable expense | kinh tế | Không mua server trước; trả theo lượng dùng |
| 2 | Benefit from massive economies of scale | kinh tế | Hàng trăm nghìn khách gộp lại ⇒ giá/đơn vị thấp hơn tự dựng |
| 3 | Stop guessing capacity | kỹ thuật | Không phải đoán tải trước; scale theo nhu cầu thật |
| 4 | Increase speed and agility | kỹ thuật | Thời gian từ "cần một server" tới "có server" tính bằng phút |
| 5 | Stop spending money running and maintaining data centers | kinh tế | Bỏ việc rack, nguồn, điều hoà, bảo trì phần cứng |
| 6 | Go global in minutes | kỹ thuật | Deploy sang Region khác mà không mở data center |

**Ba cái kinh tế không phải một.** #1 là *dạng* chi phí (trước ⇄ theo lượng dùng), #2 là
*đơn giá* (gộp cầu ⇒ rẻ hơn), #5 là *loại việc bị loại bỏ* (vận hành phần cứng). Đề phân
biệt được ba cái đó.

### Elasticity, scalability, availability, agility — bốn từ, bốn câu hỏi

| Từ | Trả lời câu hỏi | Dấu hiệu trong đề |
|---|---|---|
| **Elasticity** | Tải tăng rồi **giảm** thì tài nguyên có đi theo *cả hai chiều* không | *spike*, *seasonal*, *scale in and out*, *match demand* |
| **Scalability** | Tải tăng **lâu dài** thì hệ thống có lớn theo được không | *grow*, *handle more users over time* |
| **High availability** | Một thành phần sập thì service **còn chạy** không | *fault tolerant*, *survive AZ failure*, *minimize downtime* |
| **Agility** | **Thử một ý tưởng mới** mất bao lâu | *experiment*, *time to market*, *provision in minutes* |

Hai cặp dễ lẫn nhất:

- **Elasticity ≠ scalability.** Scale được mà không co lại được thì vẫn trả tiền cho đỉnh
  tải đã qua. Từ *elastic* luôn hàm ý **giảm cũng tự động**.
- **High availability ≠ elasticity.** HA là chuyện *chịu lỗi*, giải bằng **nhiều AZ**.
  Elasticity là chuyện *chịu tải*, giải bằng **Auto Scaling**. Câu hỏi nói "AZ sập" thì
  đáp án không bao giờ là Auto Scaling.

### Economies of scale, nói cho đúng

Nó **không** phải "AWS mua phần cứng rẻ hơn". Theo cách AWS diễn giải: vì hàng trăm nghìn
khách hàng dùng chung hạ tầng, **tổng cầu được gộp lại**, nên chi phí trên mỗi đơn vị
giảm — và AWS đẩy phần giảm đó sang giá bán. Hệ quả dễ kiểm: AWS đã **giảm giá hàng chục
lần** kể từ 2006, không lần nào vì khách hàng đàm phán lại hợp đồng.

### Global reach: ba cách đề hỏi

| Yêu cầu trong câu hỏi | Thứ nó muốn |
|---|---|
| "users in Asia see high latency" | Deploy thêm Region, hoặc dùng **CloudFront** (edge) |
| "data must stay in-country" | **Data sovereignty** → chọn Region cụ thể |
| "launch in a new market next month" | *Go global in minutes* — không mở data center |

Chi tiết Region/AZ/edge nằm ở [global-infrastructure](global-infrastructure.md); ở đây
chỉ cần nhớ **global reach là một lợi thế kinh doanh**, và đề thường hỏi nó dưới dạng
latency hoặc chủ quyền dữ liệu.

## Bẫy trong đề

| Bẫy | Vì sao sai |
|---|---|
| Chọn *elasticity* cho câu "chịu được một AZ sập" | Đó là high availability |
| Chọn *agility* cho câu "giảm chi phí" | Agility là **thời gian**, không phải tiền |
| Hiểu "variable expense" là "rẻ hơn" | Nó là **dạng chi phí khác**, không bảo đảm tổng tiền thấp hơn — xem [cloud-economics](cloud-economics.md) |
| Hiểu *economies of scale* là chiết khấu cho khách hàng lớn | Chiết khấu theo lượng dùng là **pricing model**, khác hẳn — xem [pricing-models](pricing-models.md) |
| Cho rằng cloud luôn rẻ hơn on-premises | Workload tải ổn định 24/7 nhiều năm có thể rẻ hơn khi tự dựng; lợi thế thật là **không phải đoán trước** |

Dòng cuối là chỗ đáng nhớ: exam guide hỏi *benefits*, nhưng không chỗ nào nói cloud luôn
rẻ hơn. Đáp án có từ "always cheaper" gần như chắc chắn là distractor.

## Đánh đổi

| Được | Mất |
|---|---|
| Không bỏ vốn trước (CapEx → OpEx) | Chi phí thành **biến** — sai cấu hình là hoá đơn tăng, không có hàng rào vật lý |
| Scale trong vài phút | Phải tự đặt hàng rào: Budgets, alarm, [quota](billing-and-cost-management.md) |
| Bỏ việc vận hành phần cứng | Nhận thêm việc vận hành **cloud** — IAM, mạng, cấu hình |
| Có mặt toàn cầu | Thêm nghĩa vụ về **chủ quyền dữ liệu** và phí data transfer liên Region |

## Related Topics

- [Well-Architected Framework](well-architected-framework.md) — sáu lợi thế này biến thành nguyên tắc thiết kế ở đâu
- [Kinh tế cloud](cloud-economics.md) — phần tiền, nói bằng con số
- [Global infrastructure](global-infrastructure.md) — Region/AZ/edge, nền của HA và global reach
- [Compute](compute.md) — Auto Scaling là cơ chế thật của elasticity
- [AWS · Foundations](../index.md)
