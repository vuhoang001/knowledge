---
title: Lab Kafka trên Docker
sidebar_position: 1
description: "Dựng 1 broker KRaft bằng Docker: produce, consume, consumer group, compaction — tự chạy."
tags: [kafka, docker, kraft, lab, tutorial]
domain: data-engineering
category: technology
doc_type: tutorial
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-11
---

# Lab Kafka trên Docker

> **Chốt:** Một broker KRaft chạy Docker là đủ để thấy tận mắt produce/consume, một consumer group **rebalance**, và compaction — ba thứ đọc lý thuyết không thay được.

**Chạy trong thư mục lab NGOÀI repo** (`~/Documents/learn-lab/kafka`), **KHÔNG tạo file nào trong repo này.** Repo knowledge chỉ chứa `.md`; code lab sống ở `~/Documents/learn-lab/`.

```bash
mkdir -p ~/Documents/learn-lab/kafka && cd ~/Documents/learn-lab/kafka
```

Các ô **Kết quả** để trống có chủ đích — chạy xong tự dán output vào. Chưa dán = chưa gọi là học.

## Bài 0 — Dựng cluster (1 broker KRaft)

Tạo `docker-compose.yml`. Image dưới đây là **ví dụ — tự kiểm image/version** phù hợp (ví dụ `apache/kafka` hoặc `bitnami/kafka`); đừng coi tag là sự thật cố định.

```yaml
# docker-compose.yml — ví dụ, tự kiểm image/version
services:
  kafka:
    image: apache/kafka:latest   # ví dụ; ghim version cụ thể khi chạy thật
    container_name: kafka
    ports:
      - "9092:9092"              # 9092 là port mặc định phổ biến
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://:9092,CONTROLLER://:9093
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@localhost:9093
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,CONTROLLER:PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1
      KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: 0
```

```bash
docker compose up -d
docker compose ps
# lệnh kafka-* chạy bên trong container:
docker exec -it kafka kafka-topics.sh --bootstrap-server localhost:9092 --list
```

**Kết quả:** ⬜ chưa chạy

## Bài 1 — Tạo topic

```bash
docker exec -it kafka kafka-topics.sh --bootstrap-server localhost:9092 \
  --create --topic demo --partitions 3 --replication-factor 1

docker exec -it kafka kafka-topics.sh --bootstrap-server localhost:9092 \
  --describe --topic demo
```

Với 1 broker, `replication-factor` chỉ có thể là **1** (không đủ broker cho 2 bản).

**Kết quả:** ⬜ chưa chạy

## Bài 2 — Console producer / consumer

Mở hai terminal. Terminal A gửi, terminal B đọc:

```bash
# Terminal A — producer (gõ dòng rồi Enter để gửi)
docker exec -it kafka kafka-console-producer.sh --bootstrap-server localhost:9092 --topic demo

# Terminal B — consumer đọc từ đầu, in cả partition
docker exec -it kafka kafka-console-consumer.sh --bootstrap-server localhost:9092 \
  --topic demo --from-beginning --property print.partition=true
```

Quan sát: message rơi vào các partition khác nhau (key=null → round-robin).

**Kết quả:** ⬜ chưa chạy

## Bài 3 — Consumer group + rebalance

Chạy **2 consumer cùng một `--group`** trên topic 3 partition, rồi kill 1 để thấy rebalance.

```bash
# Terminal A
docker exec -it kafka kafka-console-consumer.sh --bootstrap-server localhost:9092 \
  --topic demo --group g1 --property print.partition=true
# Terminal B (cùng group g1)
docker exec -it kafka kafka-console-consumer.sh --bootstrap-server localhost:9092 \
  --topic demo --group g1 --property print.partition=true

# Terminal C — xem chia partition giữa 2 consumer
docker exec -it kafka kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --describe --group g1
```

Giờ **Ctrl-C một consumer** và chạy lại `--describe`: các partition của nó chuyển sang consumer còn lại — đó là **rebalance**.

**Kết quả:** ⬜ chưa chạy

## Bài 4 — Compacted topic

Tạo topic compacted, gửi nhiều bản cùng key, quan sát vẫn thấy nhiều bản (compaction là quá trình nền — xem [case study](../case-studies/compaction-khong-nhu-mong-doi.md)).

```bash
docker exec -it kafka kafka-topics.sh --bootstrap-server localhost:9092 \
  --create --topic state --partitions 1 --replication-factor 1 \
  --config cleanup.policy=compact --config segment.ms=1000 \
  --config min.cleanable.dirty.ratio=0.01

# gửi 3 bản cùng key=k1 (key.separator = ':')
docker exec -it kafka kafka-console-producer.sh --bootstrap-server localhost:9092 \
  --topic state --property parse.key=true --property key.separator=:
# nhập:  k1:v1  <Enter>  k1:v2  <Enter>  k1:v3  <Enter>  rồi Ctrl-C

docker exec -it kafka kafka-console-consumer.sh --bootstrap-server localhost:9092 \
  --topic state --from-beginning --property print.key=true --timeout-ms 5000
```

Quan sát: ngay sau khi gửi, vẫn có thể thấy **nhiều bản** của `k1` (active segment chưa compact). Consumer phải lấy bản offset lớn nhất.

**Kết quả:** ⬜ chưa chạy

## Bài 5 — acks & min.insync.replicas (giới hạn 1 broker)

Với **1 broker**, không dựng được `min.insync.replicas=2` để thấy mất/không-mất dữ liệu thật — cần ≥3 broker. Ở đây chỉ *quan sát hành vi fail* khi yêu cầu vượt số replica có được:

```bash
docker exec -it kafka kafka-topics.sh --bootstrap-server localhost:9092 \
  --create --topic durable --partitions 1 --replication-factor 1 \
  --config min.insync.replicas=2

# gửi với acks=all → kỳ vọng FAIL vì chỉ có 1 replica < min.insync.replicas=2
docker exec -it kafka kafka-console-producer.sh --bootstrap-server localhost:9092 \
  --topic durable --producer-property acks=all
# nhập một dòng rồi Enter — quan sát lỗi NotEnoughReplicas
```

Kỳ vọng: producer báo lỗi vì ISR (1) < `min.insync.replicas` (2). Đây chính là cơ chế chặn mất dữ liệu ở [case study acks=1](../case-studies/mat-du-lieu-acks-1.md) — nhưng chứng minh đầy đủ (leader chết, follower lên) cần cluster nhiều broker.

**Kết quả:** ⬜ chưa chạy

## Dọn dẹp

```bash
docker compose down -v   # -v xoá luôn volume dữ liệu
```

**Kết quả:** ⬜ chưa chạy

## Related Topics

- [Consumer group và rebalance](../skills/consumer-groups.md) — lý thuyết cho bài 3
- [Retention và compaction](../reference/retention-compaction.md) — lý thuyết cho bài 4
- [Replication và độ bền](../reference/replication-durability.md) — lý thuyết cho bài 5
- [Kafka CLI và config](../cheatsheets/cli-and-config.md) — tra nhanh các lệnh dùng trong lab
- [Kafka](../index.md) — chủ đề chứa bài tập này
