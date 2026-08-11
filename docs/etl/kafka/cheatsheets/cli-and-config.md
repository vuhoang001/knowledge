---
title: Kafka CLI và config
sidebar_position: 1
description: "Bảng tra lệnh kafka-* và các config quan trọng theo nhóm."
tags: [kafka, cli, config, cheatsheet]
domain: data-engineering
category: concept
doc_type: cheatsheet
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-11
---

# Kafka CLI và config

> **Chốt:** Tra nhanh khi đang làm. Mọi giá trị mặc định ghi dưới đây là **mặc định tài liệu** — kiểm lại bằng `--describe` trên cluster của bạn trước khi tin.

Giả định `--bootstrap-server localhost:9092` (port **9092** là mặc định phổ biến). Tên lệnh có thể là `kafka-topics.sh` hoặc `kafka-topics` tuỳ bản đóng gói.

## Lệnh theo nhóm

### Topic

| Việc | Lệnh |
|---|---|
| Tạo topic | `kafka-topics --create --topic t --partitions 6 --replication-factor 3 --bootstrap-server localhost:9092` |
| Liệt kê | `kafka-topics --list --bootstrap-server localhost:9092` |
| Xem chi tiết (leader/ISR) | `kafka-topics --describe --topic t --bootstrap-server localhost:9092` |
| Đổi số partition | `kafka-topics --alter --topic t --partitions 12 --bootstrap-server localhost:9092` |
| Đổi config topic | `kafka-configs --alter --entity-type topics --entity-name t --add-config retention.ms=604800000 --bootstrap-server localhost:9092` |
| Xoá topic | `kafka-topics --delete --topic t --bootstrap-server localhost:9092` |

> Giảm partition là **không** làm được — chỉ tăng. Tăng partition cũng phá phân bố key cũ (xem case study đổi key).

### Produce / consume

| Việc | Lệnh |
|---|---|
| Gửi tay | `kafka-console-producer --topic t --bootstrap-server localhost:9092` |
| Gửi kèm key | `kafka-console-producer --topic t --property parse.key=true --property key.separator=: --bootstrap-server localhost:9092` |
| Đọc từ đầu | `kafka-console-consumer --topic t --from-beginning --bootstrap-server localhost:9092` |
| Đọc kèm key + partition | `kafka-console-consumer --topic t --from-beginning --property print.key=true --property print.partition=true --bootstrap-server localhost:9092` |
| Đọc trong một group | `kafka-console-consumer --topic t --group g --bootstrap-server localhost:9092` |

### Consumer group

| Việc | Lệnh |
|---|---|
| Liệt kê group | `kafka-consumer-groups --list --bootstrap-server localhost:9092` |
| Xem lag + assignment | `kafka-consumer-groups --describe --group g --bootstrap-server localhost:9092` |
| Reset offset về đầu (dry-run) | `kafka-consumer-groups --reset-offsets --to-earliest --group g --topic t --dry-run --bootstrap-server localhost:9092` |
| Reset và ghi (`--execute`) | thay `--dry-run` bằng `--execute` |
| Reset theo thời điểm | `--reset-offsets --to-datetime 2026-08-11T00:00:00.000 --group g --topic t --execute ...` |

> `--reset-offsets` chỉ chạy khi **không có consumer nào đang active** trong group.

### Reassign partition (cân broker)

| Việc | Lệnh |
|---|---|
| Sinh kế hoạch | `kafka-reassign-partitions --generate --topics-to-move-json-file topics.json --broker-list "1,2,3" --bootstrap-server localhost:9092` |
| Thực thi | `kafka-reassign-partitions --execute --reassignment-json-file plan.json --bootstrap-server localhost:9092` |
| Kiểm tiến độ | `kafka-reassign-partitions --verify --reassignment-json-file plan.json --bootstrap-server localhost:9092` |

## Config theo nhóm

Ký hiệu mặc định: **(mặc định tài liệu)** — có thể khác theo phiên bản, luôn xác nhận lại.

### Producer

| Config | Ý nghĩa | Mặc định tài liệu |
|---|---|---|
| `acks` | Chờ ai xác nhận ghi: `0`/`1`/`all` | `all` (client mới) / `1` (lịch sử) |
| `enable.idempotence` | Chống ghi trùng khi retry | `true` (client mới) |
| `linger.ms` | Chờ gom batch trước khi gửi | `0` |
| `batch.size` | Kích thước batch tối đa mỗi partition (byte) | `16384` |
| `compression.type` | `none`/`gzip`/`snappy`/`lz4`/`zstd` | `none` |

> `acks=all` + `min.insync.replicas>=2` mới là bền (xem case study `acks=1`).

### Consumer

| Config | Ý nghĩa | Mặc định tài liệu |
|---|---|---|
| `group.id` | Tên consumer group | (bắt buộc đặt) |
| `auto.offset.reset` | Khi chưa có offset: `earliest`/`latest`/`none` | `latest` |
| `enable.auto.commit` | Tự commit offset định kỳ | `true` |
| `max.poll.records` | Số record tối đa mỗi `poll()` | `500` |
| `max.poll.interval.ms` | Khoảng tối đa giữa hai `poll()` trước khi bị kick | `300000` |
| `session.timeout.ms` | Hết heartbeat bao lâu thì coi là chết | `45000` |

> `max.poll.interval.ms` (còn gọi poll không) khác `session.timeout.ms` (còn heartbeat không) — xem case study rebalance.

### Topic / broker

| Config | Ý nghĩa | Mặc định tài liệu |
|---|---|---|
| `replication.factor` | Số bản mỗi partition | (đặt lúc tạo topic) |
| `min.insync.replicas` | Số replica trong ISR tối thiểu để ghi `acks=all` thành công | `1` |
| `retention.ms` | Giữ message bao lâu (delete policy) | `604800000` (7 ngày) |
| `cleanup.policy` | `delete` / `compact` / `compact,delete` | `delete` |
| `segment.ms` | Bao lâu đóng một segment | `604800000` |
| `min.cleanable.dirty.ratio` | Tỉ lệ bẩn tối thiểu để cleaner chạy compact | `0.5` |
| `delete.retention.ms` | Giữ tombstone bao lâu trên compacted topic | `86400000` (1 ngày) |
| `unclean.leader.election.enable` | Cho replica ngoài ISR lên leader (mất dữ liệu) | `false` |

## Related Topics

- [Producer tuning](../skills/producer-tuning.md) — giải thích `acks`, idempotence, batching
- [Replication và độ bền](../reference/replication-durability.md) — ISR, `min.insync.replicas`
- [Retention và compaction](../reference/retention-compaction.md) — delete vs compact, tombstone
- [Kafka](../index.md) — chủ đề chứa cheatsheet này
