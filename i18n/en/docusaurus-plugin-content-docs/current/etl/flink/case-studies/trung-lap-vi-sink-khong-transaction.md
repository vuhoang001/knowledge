---
title: Trùng lặp vì sink không transaction
i18n_status: untranslated
sidebar_position: 4
description: "Checkpoint cho exactly-once nội bộ, nhưng sink at-least-once làm bản ghi trùng sau mỗi lần restart."
tags: [flink, exactly-once, sink, transaction, idempotent]
domain: data-engineering
category: technology
doc_type: case-study
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-11
---

# Trùng lặp vì sink không transaction

> **Chốt:** `CheckpointingMode.EXACTLY_ONCE` chỉ bảo đảm exactly-once cho **state nội bộ**; nếu sink ghi ra ngoài ở chế độ at-least-once, mỗi lần restart sẽ replay và tạo **bản ghi trùng ở đích**.

## Nhãn

**Tình huống dựng lại** — số liệu là **minh hoạ, chưa chạy trên cluster**, nhưng nhất quán trong bài.

## Bối cảnh

Job bật `EXACTLY_ONCE` checkpointing và mọi người tin đây là **end-to-end exactly-once**. Sink ghi kết quả ra một Kafka topic / bảng DB, nhưng để **at-least-once** (không transaction, không idempotent).

## Triệu chứng

*Số minh hoạ — chưa chạy:*

- Bình thường số bản ghi đích khớp nguồn.
- Mỗi lần job **restart** (deploy, TaskManager chết, rebalance), đếm bản ghi đích **tăng vọt** một cụm nhỏ — vd +1.500 bản ghi thừa quanh mốc restart 14:32.
- Các bản thừa là **bản sao y hệt** của record đã ghi trước đó, chỉ khác thời điểm ghi.

Không có lỗi; job vẫn EXACTLY_ONCE, checkpoint vẫn xanh.

## Giả thuyết sai lúc đầu

1. **Nghi source gửi trùng.** Kiểm nguồn: mỗi record có key duy nhất, nguồn không lặp. Loại.
2. **Nghi bug logic gộp.** Rà pipeline → logic đúng, chỉ ra đúng số record một lần trong luồng nội bộ. Không phải logic.

Chỗ mất thời gian: giả định "EXACTLY_ONCE bật rồi thì cả đường ra đích cũng exactly-once". Sự thật: bảo đảm đó **dừng ở ranh giới state**, không tự lan tới sink.

## Nguyên nhân thật

Exactly-once của Flink là về **state tất định khi restore**: khi restart, job rollback state về checkpoint cuối và **replay** các record kể từ đó. Với state nội bộ, replay là idempotent (ghi đè state). Nhưng với **side effect ra ngoài** (đã ghi vào sink at-least-once trước khi chết), replay **ghi lại lần nữa** → đích có bản trùng.

Để end-to-end exactly-once, sink phải tham gia giao thức 2 pha (2PC) khớp với checkpoint, **hoặc** phải idempotent.

## Cách sửa

**1. Kafka sink transaction (2PC):**

```java
KafkaSink<String> sink = KafkaSink.<String>builder()
    .setBootstrapServers(brokers)
    .setDeliveryGuarantee(DeliveryGuarantee.EXACTLY_ONCE) // dùng transaction, commit theo checkpoint
    .setTransactionalIdPrefix("orders-agg-")
    .setRecordSerializer(/* ... */)
    .build();
```

Phía đọc phải `isolation.level = read_committed` để chỉ thấy record đã commit — nếu không vẫn đọc phải record của transaction bị abort.

**2. Sink idempotent (upsert theo key):** DB/`upsert-kafka` ghi đè theo primary key. Replay ghi cùng key cùng giá trị → không sinh bản mới.

```sql
-- Flink SQL: upsert-kafka khử trùng theo key
CREATE TABLE sink_agg (
  window_start TIMESTAMP(3),
  region STRING,
  cnt BIGINT,
  PRIMARY KEY (window_start, region) NOT ENFORCED
) WITH ('connector' = 'upsert-kafka', /* ... */);
```

**3. Iceberg sink:** commit file theo từng checkpoint — dữ liệu chỉ "hiện" khi checkpoint hoàn tất, replay giữa hai checkpoint không lộ bản trùng.

Đánh đổi: transaction Kafka tăng latency (dữ liệu chỉ visible sau commit checkpoint) và cần cấu hình `transaction.timeout` hợp lý. Upsert cần một khoá tự nhiên ổn định.

## Dấu hiệu nhận ra sớm

**Đếm bản ghi đích quanh mỗi lần job restart.** Nếu số đích **nhảy** đúng các mốc restart (deploy, failover) → gần như chắc chắn sink đang at-least-once. Đối chiếu mốc restart trong Flink UI (Job → Exceptions/restart count) với đồ thị số dòng ghi ở đích.

## Related Topics

- [Exactly-once](../reference/exactly-once.md) — ranh giới bảo đảm của Flink và 2PC ở sink
- [Connectors](../skills/connectors.md) — DeliveryGuarantee, upsert-kafka, Iceberg sink
- [Flink](../index.md) — chủ đề chứa case study này
