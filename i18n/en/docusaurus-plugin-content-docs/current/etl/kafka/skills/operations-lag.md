---
title: Vận hành và consumer lag
i18n_status: untranslated
sidebar_position: 5
description: "Consumer lag là chỉ số sức khoẻ số một; đo và chẩn bằng kafka-consumer-groups."
tags: [consumer-lag, operations, monitoring, partitions, reassignment]
domain: data-engineering
category: concept
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-11
---

> **Chốt:** Consumer lag = log-end-offset − committed-offset; nó là chỉ số sức khoẻ số một của một pipeline Kafka, và `kafka-consumer-groups --describe` là chỗ đầu tiên bạn nhìn khi có gì đó chậm.

Giả định đã nắm [topic, partition, offset](../reference/topic-partition-offset.md) và [consumer group](consumer-groups.md). Đây là cách đo sức khoẻ và chẩn khi số liệu xấu.

## Consumer lag là gì và vì sao là số một

Lag định nghĩa **per-partition**, chính xác là hiệu của hai offset:

```text
lag(partition) = LEO (log-end-offset, message mới nhất broker có)
                 − committed-offset (consumer group đã commit tới)
lag(group)     = tổng lag của mọi partition group đang giữ
```

Lưu ý phân biệt: LEO là **offset kế tiếp sẽ ghi** (đuôi log), committed-offset là offset consumer đã **commit** — không nhất thiết bằng offset đã đọc (có thể đọc rồi mà chưa commit). Vì thế lag phản ánh tiến độ **đã xác nhận xử lý**, không phải đã đọc.

Lag là **số message consumer còn nợ**. Vì sao nó là chỉ số quan trọng nhất:

- Lag ổn định quanh một mức thấp → consumer theo kịp producer. Khoẻ.
- Lag **tăng đều** → consumer chậm hơn producer, sớm muộn cũng trễ nghiêm trọng.
- Lag nhảy vọt → có sự cố (consumer chết, rebalance liên tục, producer burst).

Một con số, phản ánh trực tiếp trải nghiệm downstream (dữ liệu trễ bao nhiêu). Đo được nó là đo được sức khoẻ.

## Đo bằng kafka-consumer-groups

```bash
kafka-consumer-groups --bootstrap-server localhost:9092 \
  --describe --group orders-consumer
```

Output minh hoạ, chưa chạy:

```text
# Output minh hoạ — chưa chạy (không dựng được cluster)
GROUP            TOPIC    PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG   CONSUMER-ID       HOST
orders-consumer  orders   0          15230           15240           10    consumer-1-abc    /10.0.0.11
orders-consumer  orders   1          15100           18900           3800  consumer-2-def    /10.0.0.12
orders-consumer  orders   2          15220           15225           5     consumer-1-abc    /10.0.0.11
```

> `localhost:9092` là cổng **mặc định** phổ biến của Kafka, không phải host thật của bạn — thay bằng bootstrap server thực tế.

Đọc từng cột:

| Cột | Nghĩa |
|---|---|
| `CURRENT-OFFSET` | Committed-offset của group cho partition này (đã xử lý & commit tới đâu) |
| `LOG-END-OFFSET` | LEO — đuôi log, message mới nhất broker có |
| `LAG` | `LOG-END-OFFSET − CURRENT-OFFSET` |
| `CONSUMER-ID` | Member đang giữ partition này. **Trống** = không member nào giữ (group chết hoặc chưa join) |
| `HOST` | Host của member |

Ở ví dụ: partition 1 lag 3800 trong khi hai partition kia gần 0. Đó là **lệch tải** hoặc một partition có key nóng — không phải cả group chậm. Nhìn theo partition, không chỉ theo tổng. Nếu `CONSUMER-ID` trống mà `LAG` lớn, nghĩa là **không ai đang đọc** partition đó — báo động khác hẳn "đọc nhưng chậm".

## Metric quan trọng qua JMX

Lệnh `--describe` là ảnh chụp tay; giám sát liên tục phải qua JMX metric của broker và client:

| Metric | Ở đâu | Nghĩa / báo động |
|---|---|---|
| `records-lag-max` | Consumer client | Lag lớn nhất trên các partition consumer giữ; tăng đều → consumer đuối |
| `under-replicated-partitions` | Broker | Số partition có ISR < replication factor; lớn hơn 0 kéo dài → mất khả năng chịu lỗi |
| `offline-partitions-count` | Controller | Partition không có leader; lớn hơn 0 là báo động đỏ, không đọc/ghi được |
| `active-controller-count` | Broker | Tổng toàn cluster phải đúng bằng 1; khác 1 → sự cố controller |
| `request latency` (produce/fetch p99) | Broker | Tăng vọt → broker quá tải, đĩa/mạng nghẽn |
| `isr-shrinks-rate` / `isr-expands-rate` | Broker | ISR co giãn liên tục → replica không theo kịp |

- **Under-replicated partitions**: một replica tụt hoặc broker rớt. Kéo dài → mất khả năng chịu lỗi, và với `min.insync.replicas` cao có thể **chặn cả producer** (`acks=all` không đủ replica trong ISR để xác nhận).
- **Offline partitions**: partition không có leader — không đọc/ghi được. Báo động đỏ.

Cả hai còn xem nhanh qua `kafka-topics --describe` (so cột `Isr` với `Replicas`).

### Công cụ giám sát

- **Burrow** (LinkedIn): chuyên theo dõi consumer lag, đánh giá sức khoẻ group theo **xu hướng** (không chỉ ngưỡng tuyệt đối) — hợp cho cảnh báo lag.
- **Cruise Control** (LinkedIn): tự động cân bằng cluster — phát hiện lệch tải và sinh/chạy kế hoạch reassignment, kèm throttle. Thay việc viết `plan.json` tay.

## Bảng triệu chứng → nguyên nhân → nhìn ở đâu

| Triệu chứng | Nguyên nhân khả dĩ | Nhìn ở đâu |
|---|---|---|
| Lag tăng đều mọi partition | Consumer chậm hơn producer (thiếu năng lực) | `records-lag-max`, CPU consumer, downstream chậm |
| Lag chỉ một/vài partition | Key nóng, lệch phân bố | LAG theo partition, phân bố key |
| Lag lớn, `CONSUMER-ID` trống | Không member nào giữ partition (group chết/chưa join) | `--describe`, log consumer, số instance đang chạy |
| Lag nhảy răng cưa | Rebalance liên tục | [rebalance liên tục](../case-studies/rebalance-lien-tuc.md), log rebalance |
| Lag tăng đột ngột rồi hồi | Producer burst | Throughput producer theo thời gian |
| Producer bị chặn / lỗi ghi | Under-replicated + `min.insync.replicas` | `under-replicated-partitions`, ISR |
| Không đọc/ghi được hẳn | Offline partitions | `offline-partitions-count`, controller |
| Fetch/produce chậm toàn cục | Broker quá tải | `request latency` p99, đĩa/mạng broker |

## Scale consumer: bẫy số partition

Muốn tiêu thụ nhanh hơn, thêm consumer vào group. Nhưng:

> Số consumer hữu ích tối đa = **số partition**. Consumer thứ N+1 (N = số partition) **ngồi không** — không được gán partition nào.

Nếu đã có 6 partition và 6 consumer mà vẫn lag, thêm consumer thứ 7 vô ích — nó chỉ ngồi chờ, thậm chí gây thêm một rebalance khi join. Lúc đó phải **tăng số partition** trước (rồi mới scale consumer), hoặc tối ưu tốc độ xử lý mỗi consumer. Nhớ cảnh báo ở [producer tuning](producer-tuning.md): tăng số partition làm `hash(key) % N` đổi, ảnh hưởng thứ tự per-key.

## Partition reassignment và throttle

Khi thêm broker hoặc tải lệch giữa broker, di chuyển replica bằng:

```bash
# 1. Sinh kế hoạch đề xuất
kafka-reassign-partitions --bootstrap-server localhost:9092 \
  --topics-to-move-json-file topics.json --broker-list "1,2,3,4" --generate

# 2. Chạy kế hoạch, KÈM throttle để không bão hoà mạng
kafka-reassign-partitions --bootstrap-server localhost:9092 \
  --reassignment-json-file plan.json --execute \
  --throttle 50000000   # ~50 MB/s, số minh hoạ — chỉnh theo băng thông thật

# 3. Kiểm tiến độ và gỡ throttle khi xong
kafka-reassign-partitions --bootstrap-server localhost:9092 \
  --reassignment-json-file plan.json --verify
```

Reassign **copy dữ liệu qua mạng** giữa các broker để cân dữ liệu và leadership. Không throttle thì việc copy này giành băng thông với traffic production thật — produce/fetch chậm, lag tăng. Luôn `--throttle` và làm ngoài giờ cao điểm; nhớ `--verify` để gỡ throttle sau khi xong (throttle còn treo sẽ bóp cả replication bình thường).

## Sizing partition theo throughput

Chọn số partition không phải "càng nhiều càng tốt" — nhiều partition thêm chi phí metadata, file handle, rebalance lâu hơn. Nguyên tắc sizing theo throughput mục tiêu (minh hoạ, chưa chạy):

```text
# Số minh hoạ — chưa chạy
Throughput mục tiêu:        600 MB/s
Throughput một partition
  (giới hạn bởi consumer):  ~50 MB/s   (đo từ benchmark của bạn)
→ số partition tối thiểu = 600 / 50 = 12

Đối chiếu phía producer:
  một partition ghi được:   ~100 MB/s
→ producer cần tối thiểu = 600 / 100 = 6

Lấy max(12, 6) = 12, cộng dư để scale → chọn ~16–18
```

Quy tắc thô:

- `số partition ≥ max(mục tiêu/throughput-một-partition-consumer, mục tiêu/throughput-một-partition-producer)`.
- `số partition ≥ số consumer cao điểm` bạn định chạy.
- Chừa dư để scale — vì **tăng partition dễ, giảm thì không**, và tăng lại phá thứ tự per-key.

## Common Mistakes

| Sai | Hậu quả | Sửa |
|---|---|---|
| Thêm consumer > số partition | Consumer thừa ngồi không, lag không giảm | Tăng partition trước rồi scale |
| Chỉ nhìn tổng lag | Bỏ sót một partition nóng | Xem LAG theo từng partition |
| Bỏ qua `CONSUMER-ID` trống | Tưởng lag do chậm, thực ra không ai đọc | Kiểm member đang giữ partition |
| Bỏ qua under-replicated kéo dài | Mất khả năng chịu lỗi, có thể chặn producer | Canh ISR, xử lý broker rớt sớm |
| Reassign giờ cao điểm không throttle | Đè băng thông, ảnh hưởng traffic thật | Throttle, làm ngoài giờ, `--verify` gỡ throttle |

## FAQ

<details>
<summary>Lag bằng 0 có phải luôn khoẻ?</summary>

Không hẳn. Lag 0 có thể vì consumer đang theo kịp, nhưng cũng có thể vì consumer chết và không có producer nào ghi thêm. Nhìn kèm throughput và `CONSUMER-ID` trong `--describe`: nếu không có consumer active, lag 0 là giả tạo.

</details>

<details>
<summary>Nên đặt cảnh báo lag theo ngưỡng tuyệt đối hay theo xu hướng?</summary>

Theo xu hướng đáng tin hơn. Ngưỡng tuyệt đối phụ thuộc throughput từng topic. Cảnh báo khi lag **tăng liên tục** trong một khoảng thời gian bắt được vấn đề sớm hơn là chờ chạm một con số cố định. Burrow đánh giá theo xu hướng chính vì lý do này.

</details>

<details>
<summary>committed-offset và current-offset trong --describe có phải một?</summary>

`CURRENT-OFFSET` trong output chính là committed-offset của group — offset đã commit, không phải offset đã đọc gần nhất. Consumer có thể đã đọc xa hơn nhưng chưa commit, khi đó lag hiển thị vẫn tính theo cái đã commit.

</details>

## Related Topics

- [Topic, partition, offset](../reference/topic-partition-offset.md)
- [Consumer group và rebalance](consumer-groups.md)
- [Producer tuning](producer-tuning.md)
- [Replication và durability](../reference/replication-durability.md)
- [Case study — rebalance liên tục](../case-studies/rebalance-lien-tuc.md)
- [Kafka index](../index.md)
