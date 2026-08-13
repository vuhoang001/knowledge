---
title: Lab Kafka trên Docker
i18n_status: untranslated
sidebar_position: 1
description: "Dựng cluster 3 broker KRaft bằng Docker: sticky partitioner, key, rebalance, compaction, acks — output thật."
tags: [kafka, docker, kraft, lab, tutorial]
domain: data-engineering
category: technology
doc_type: tutorial
status: draft
difficulty: beginner
verified_at:
updated: 2026-08-12
---

# Lab Kafka trên Docker

> **Chốt:** Ba broker là con số tối thiểu để học Kafka cho ra hồn — một broker không dựng
> nổi ISR, không thấy được `min.insync.replicas` chặn ghi, tức là bỏ mất đúng phần quan
> trọng nhất.

**Chạy trong thư mục lab NGOÀI repo** (`~/Documents/learn-lab/kafka`), **KHÔNG tạo file nào
trong repo này.** Repo knowledge chỉ chứa `.md`; code lab sống ở `~/Documents/learn-lab/`.

```bash
mkdir -p ~/Documents/learn-lab/kafka && cd ~/Documents/learn-lab/kafka
```

> **Output trong bài này là thật**, lấy từ lần chạy ngày 12/08/2026 trên
> `apache/kafka:4.3.1`, cluster 3 broker KRaft. Trường `verified_at` vẫn để trống cho tới
> khi chủ repo tự tay chạy lại — xem luật cứng #1.

## Cái bẫy số một: script không nằm trên PATH

Image `apache/kafka` **không** đặt các script `kafka-*.sh` lên `PATH`. Gõ tên trần sẽ nhận:

```
OCI runtime exec failed: exec failed: unable to start container process:
exec: "kafka-topics.sh": executable file not found in $PATH
```

Mọi lệnh trong bài đều dùng đường dẫn đầy đủ `/opt/kafka/bin/`. Đây là chi tiết môi trường,
khác nhau giữa các image (`bitnami/kafka` lại có sẵn trên PATH) — đừng chép lệnh từ blog
mà không kiểm.

## Bài 0 — Dựng cluster 3 broker KRaft

Từ Kafka 4.x **không còn ZooKeeper**. Mỗi node dưới đây vừa là broker vừa là controller
(*combined mode*), dùng ba loại listener: `INTERNAL` cho broker nói với nhau, `CONTROLLER`
cho bầu leader metadata, `EXTERNAL` cho truy cập từ host.

`CLUSTER_ID` phải **sinh thật**, và ba node phải dùng **chung một giá trị**:

```bash
docker run --rm apache/kafka:4.3.1 /opt/kafka/bin/kafka-storage.sh random-uuid
```

**Kết quả:**

```
skE65zILTdG_Jvi8bxfWHA
```

Tạo `docker-compose.yml` (thay `CLUSTER_ID` bằng giá trị bạn vừa sinh):

```yaml
x-kafka-common: &kafka-common
  image: apache/kafka:4.3.1
  environment: &kafka-env
    CLUSTER_ID: skE65zILTdG_Jvi8bxfWHA
    KAFKA_PROCESS_ROLES: broker,controller
    KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
    KAFKA_INTER_BROKER_LISTENER_NAME: INTERNAL
    KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: INTERNAL:PLAINTEXT,CONTROLLER:PLAINTEXT,EXTERNAL:PLAINTEXT
    KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka-1:29093,2@kafka-2:29093,3@kafka-3:29093
    KAFKA_LOG_DIRS: /var/lib/kafka/data
    KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 3
    KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 3
    KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 2
    KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: 0
    KAFKA_AUTO_CREATE_TOPICS_ENABLE: "false"

services:
  kafka-1:
    <<: *kafka-common
    container_name: kafka-1
    hostname: kafka-1
    ports: ["9092:9092"]
    environment:
      <<: *kafka-env
      KAFKA_NODE_ID: 1
      KAFKA_LISTENERS: INTERNAL://:19092,CONTROLLER://:29093,EXTERNAL://:9092
      KAFKA_ADVERTISED_LISTENERS: INTERNAL://kafka-1:19092,EXTERNAL://localhost:9092
    volumes: ["kafka-1-data:/var/lib/kafka/data"]

  kafka-2:
    <<: *kafka-common
    container_name: kafka-2
    hostname: kafka-2
    ports: ["9093:9093"]
    environment:
      <<: *kafka-env
      KAFKA_NODE_ID: 2
      KAFKA_LISTENERS: INTERNAL://:19092,CONTROLLER://:29093,EXTERNAL://:9093
      KAFKA_ADVERTISED_LISTENERS: INTERNAL://kafka-2:19092,EXTERNAL://localhost:9093
    volumes: ["kafka-2-data:/var/lib/kafka/data"]

  kafka-3:
    <<: *kafka-common
    container_name: kafka-3
    hostname: kafka-3
    ports: ["9094:9094"]
    environment:
      <<: *kafka-env
      KAFKA_NODE_ID: 3
      KAFKA_LISTENERS: INTERNAL://:19092,CONTROLLER://:29093,EXTERNAL://:9094
      KAFKA_ADVERTISED_LISTENERS: INTERNAL://kafka-3:19092,EXTERNAL://localhost:9094
    volumes: ["kafka-3-data:/var/lib/kafka/data"]

volumes:
  kafka-1-data:
  kafka-2-data:
  kafka-3-data:
```

Hai chi tiết cố ý:

- **`KAFKA_AUTO_CREATE_TOPICS_ENABLE: "false"`** — gõ sai tên topic thì báo lỗi ngay, thay
  vì âm thầm tạo một topic ma rồi ngồi tự hỏi sao không có dữ liệu.
- **`KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: 0`** — rebalance ngay, không đợi gom thêm
  consumer. Chỉ hợp cho lab; production để mặc định (3000) tránh rebalance dồn dập lúc khởi động.

```bash
docker compose up -d
docker exec kafka-1 /opt/kafka/bin/kafka-metadata-quorum.sh \
  --bootstrap-server kafka-1:19092 describe --status
```

**Kết quả:**

```
ClusterId:              skE65zILTdG_Jvi8bxfWHA
LeaderId:               2
LeaderEpoch:            1
HighWatermark:          51
MaxFollowerLag:         0
MaxFollowerLagTimeMs:   241
CurrentVoters:          [{"id": 1, ...}, {"id": 2, ...}, {"id": 3, ...}]
CurrentObservers:       []
```

Đủ 3 voter, `MaxFollowerLag: 0` — quorum khoẻ. Cluster lên trong **2 giây**.

## Bài 1 — Replica nằm đâu, ai làm leader

```bash
docker exec kafka-1 /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka-1:19092 \
  --create --topic demo --partitions 3 --replication-factor 3

docker exec kafka-1 /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka-1:19092 \
  --describe --topic demo
```

**Kết quả:**

```
Topic: demo  PartitionCount: 3  ReplicationFactor: 3  Configs: min.insync.replicas=1
  Topic: demo  Partition: 0  Leader: 1  Replicas: 1,2,3  Isr: 1,2,3  Elr:   LastKnownElr:
  Topic: demo  Partition: 1  Leader: 2  Replicas: 2,3,1  Isr: 2,3,1  Elr:   LastKnownElr:
  Topic: demo  Partition: 2  Leader: 3  Replicas: 3,1,2  Isr: 3,1,2  Elr:   LastKnownElr:
```

Đọc từng cột:

| Cột | Nghĩa | Vì sao đáng nhìn |
|---|---|---|
| `Leader` | Broker phục vụ **mọi** ghi và **mọi** đọc của partition đó | Rải đều 1/2/3 — dồn cả ba vào một broker thì broker đó gánh 100% traffic |
| `Replicas` | Danh sách bản sao, **phần tử đầu là preferred leader** | Broker chết rồi sống lại, Kafka muốn trả quyền leader về cho nó |
| `Isr` | Replica đang bắt kịp leader | **Dòng nhìn đầu tiên khi nghi có sự cố** — ISR co lại là dấu hiệu bệnh sớm nhất |
| `Elr` | *Eligible Leader Replicas*, mới có ở Kafka 4.x | Replica đủ điều kiện lên leader khi mất sạch ISR; rỗng = khoẻ |
| `min.insync.replicas=1` | Mặc định | **Cấu hình nguy hiểm** — bài 6 sẽ cho thấy vì sao |

Luật rút ra: **ghi và đọc đều chỉ qua leader**, follower chỉ kéo dữ liệu về cho giống. Cho
đọc follower thì ghi xong đọc lại ngay có thể không thấy cái mình vừa ghi.

## Bài 2 — Không key thì KHÔNG phải round-robin

Đây là chỗ gần như mọi tài liệu tiếng Việt (và bản cũ của chính file này) viết sai.

```bash
docker exec kafka-1 /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka-1:19092 \
  --create --topic t-sticky --partitions 3 --replication-factor 3

printf 'm1\nm2\nm3\nm4\nm5\nm6\n' | docker exec -i kafka-1 \
  /opt/kafka/bin/kafka-console-producer.sh --bootstrap-server kafka-1:19092 --topic t-sticky

docker exec kafka-1 /opt/kafka/bin/kafka-get-offsets.sh \
  --bootstrap-server kafka-1:19092 --topic t-sticky --time latest
```

**Kết quả:**

```
t-sticky:0:0
t-sticky:1:0
t-sticky:2:6
```

Round-robin từng message thì phải là `2 / 2 / 2`. Thực tế **cả 6 vào chung một partition,
hai partition kia rỗng tuyệt đối**.

Từ Kafka 2.4 (KIP-480) producer dùng **sticky partitioner**: dính vào một partition cho tới
khi batch đầy hoặc hết `linger.ms`, gửi cả cụm đi, rồi mới đổi partition cho batch sau.
Round-robin ở mức **batch**, không phải mức message. Lý do thực dụng: round-robin từng
message với 3 partition = 3 batch nhỏ = 3 request mạng; dính một partition = 1 batch to =
1 request.

Chạy lại lệnh trên vài lần: partition được chọn **khác nhau mỗi lần** — trong lần chạy này
nó rơi vào partition 2, lần trước trên topic khác lại là partition 1. Ngẫu nhiên, không cố định.

**Bài học:** test vài chục message rồi kết luận *"dữ liệu phân bố đều"* là kết luận **sai**.

## Bài 3 — Có key thì tất định

```bash
docker exec kafka-1 /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka-1:19092 \
  --create --topic t-keys --partitions 3 --replication-factor 3

# gửi cùng 9 key HAI lần, giá trị khác nhau
printf 'k1:v\nk2:v\nk3:v\nk4:v\nk5:v\nk6:v\nk7:v\nk8:v\nk9:v\n' | docker exec -i kafka-1 \
  /opt/kafka/bin/kafka-console-producer.sh --bootstrap-server kafka-1:19092 --topic t-keys \
  --property parse.key=true --property key.separator=:

printf 'k1:lan2\nk2:lan2\nk3:lan2\nk4:lan2\nk5:lan2\nk6:lan2\nk7:lan2\nk8:lan2\nk9:lan2\n' | \
docker exec -i kafka-1 /opt/kafka/bin/kafka-console-producer.sh \
  --bootstrap-server kafka-1:19092 --topic t-keys \
  --property parse.key=true --property key.separator=:

docker exec kafka-1 /opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server kafka-1:19092 \
  --topic t-keys --from-beginning --timeout-ms 6000 \
  --property print.partition=true --property print.key=true 2>/dev/null \
  | grep '^Partition' | awk '{print $2"\t"$3"\t-> "$1}' | sort
```

**Kết quả:**

```
k1  lan2  -> Partition:2      k4  lan2  -> Partition:1      k7  lan2  -> Partition:1
k1  v     -> Partition:2      k4  v     -> Partition:1      k7  v     -> Partition:1
k2  lan2  -> Partition:0      k5  lan2  -> Partition:0      k8  lan2  -> Partition:2
k2  v     -> Partition:0      k5  v     -> Partition:0      k8  v     -> Partition:2
k3  lan2  -> Partition:1      k6  lan2  -> Partition:1      k9  lan2  -> Partition:2
k3  v     -> Partition:1      k6  v     -> Partition:1      k9  v     -> Partition:2
```

**9/9 lặp lại chính xác** — đó là `murmur2(key) % số_partition`, không có ngẫu nhiên. Chạy
trên một topic hoàn toàn mới cũng ra kết quả y hệt, vì hash chỉ phụ thuộc **key** và **số
partition**, không phụ thuộc topic.

Để ý phân bố: **p0 có 2 key, p1 có 4, p2 có 3**. Hash chỉ hứa *tất định*, **không hứa
*cân bằng*** với số key nhỏ. Một key nóng chiếm 40% lưu lượng thì partition đó thành điểm
nghẽn, và Kafka không cứu được — nó buộc phải tôn trọng luật "cùng key cùng partition".

**Cái bẫy chết người:** mẫu số là *số partition*. Thêm partition ⇒ ánh xạ đổi hết ⇒ thứ tự
theo key **gãy vĩnh viễn**, không sửa ngược được. Xem
[case study mất thứ tự vì đổi key](../case-studies/mat-thu-tu-vi-doi-key.md).

## Bài 4 — Consumer group và rebalance

Cần **3 terminal**. Terminal A và B chạy consumer cùng group `g1`, terminal C quan sát.

```bash
# Terminal A và B — chạy CÙNG lệnh này, cùng --group g1
docker exec -it kafka-1 /opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server kafka-1:19092 --topic demo --group g1 --property print.partition=true

# Terminal C — xem group chia partition thế nào
docker exec kafka-1 /opt/kafka/bin/kafka-consumer-groups.sh \
  --bootstrap-server kafka-1:19092 --describe --group g1
```

**Kết quả** — khi mới có **một** consumer, nó ôm cả 3 partition:

```
GROUP  TOPIC  PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG  CONSUMER-ID
g1     demo   0          0               0               0    console-consumer-5e1b35cd-...
g1     demo   1          12              12              0    console-consumer-5e1b35cd-...
g1     demo   2          0               0               0    console-consumer-5e1b35cd-...
```

**Kết quả** — sau khi bật consumer thứ hai, partition 2 **chuyển chủ** sang `...90bf879f`:

```
g1     demo   0          0               0               0    console-consumer-5e1b35cd-...
g1     demo   1          12              12              0    console-consumer-5e1b35cd-...
g1     demo   2          0               0               0    console-consumer-90bf879f-...
```

Ctrl-C consumer thứ hai, đợi ~5 giây rồi chạy lại `--describe`: partition quay về consumer
còn lại. Đó là **rebalance**.

### Consumer chạy mà không in gì ra?

Không phải treo. **`--from-beginning` chỉ có tác dụng khi group CHƯA TỪNG commit offset.**
Group đã có vị trí lưu thì cờ đó bị bỏ qua, consumer nhảy thẳng tới cuối log và ngồi đợi
message mới. Cách chữa: gửi thêm message, hoặc tua group về đầu (bài 7).

### Luật cốt lõi

Trong **một** consumer group, một partition chỉ thuộc về **đúng một** consumer. Suy ra
**số consumer hữu ích tối đa = số partition** — consumer thứ 4 trên topic 3 partition sẽ
ngồi không. Muốn scale thêm phải thêm partition, mà thêm partition thì gãy ánh xạ key ở
bài 3. Hai ràng buộc này dính nhau, phải quyết **trước khi** lên production. Xem
[case study rebalance liên tục](../case-studies/rebalance-lien-tuc.md).

## Bài 5 — Compaction giữ bản mới nhất mỗi key

```bash
docker exec kafka-1 /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka-1:19092 \
  --create --topic state --partitions 1 --replication-factor 3 \
  --config cleanup.policy=compact --config segment.ms=1000 \
  --config min.cleanable.dirty.ratio=0.01 --config max.compaction.lag.ms=1000

printf 'k1:v1\nk1:v2\nk1:v3\nk2:w1\n' | docker exec -i kafka-1 \
  /opt/kafka/bin/kafka-console-producer.sh --bootstrap-server kafka-1:19092 --topic state \
  --property parse.key=true --property key.separator=:

docker exec kafka-1 /opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server kafka-1:19092 \
  --topic state --from-beginning --timeout-ms 5000 \
  --property print.key=true --property print.offset=true
```

**Kết quả** — đọc **ngay** sau khi gửi, cả ba bản của `k1` vẫn còn:

```
Offset:0  k1  v1
Offset:1  k1  v2
Offset:2  k1  v3
Offset:3  k2  w1
```

Gửi thêm để segment đang ghi đóng lại, đợi ~30 giây cho log cleaner chạy:

```bash
printf 'k3:z1\nk4:z2\nk1:v4\n' | docker exec -i kafka-1 \
  /opt/kafka/bin/kafka-console-producer.sh --bootstrap-server kafka-1:19092 --topic state \
  --property parse.key=true --property key.separator=:
sleep 30
```

**Kết quả** — đọc lại:

```
Offset:2  k1  v3
Offset:3  k2  w1
Offset:4  k3  z1
Offset:5  k4  z2
Offset:6  k1  v4
```

Hai điều quan trọng, cả hai đều hay làm người ta hoảng:

1. **Offset 0 và 1 biến mất** — `k1:v1` và `k1:v2` đã bị dọn. Log compacted có **lỗ hổng
   offset**; offset vẫn tăng đơn điệu nhưng **không còn liên tục**. Code nào giả định
   `offset + 1` là message kế tiếp sẽ sai.
2. **`k1` vẫn xuất hiện HAI lần** (offset 2 và offset 6). Compaction chỉ hứa *"bản mới nhất
   của mỗi key sẽ không bị xoá"*, **không hứa** *"mỗi key chỉ còn đúng một bản"*. Segment
   đang ghi không bao giờ được compact, nên bản mới luôn nằm ngoài tầm dọn dẹp.

Hệ quả cho người viết consumer: đọc topic compacted phải **lấy bản có offset lớn nhất cho
mỗi key**, không được giả định gặp key nào là giá trị cuối. Chi tiết ở
[case study compaction không như mong đợi](../case-studies/compaction-khong-nhu-mong-doi.md).

## Bài 6 — `acks` và `min.insync.replicas`

Bài quan trọng nhất, và là lý do phải dựng 3 broker.

```bash
docker exec kafka-1 /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka-1:19092 \
  --create --topic dur2 --partitions 1 --replication-factor 3 \
  --config min.insync.replicas=3
```

**Kết quả** — lúc khoẻ, ISR đủ 3:

```
Topic: dur2  Partition: 0  Leader: 2  Replicas: 2,3,1  Isr: 2,3,1  Elr:   LastKnownElr:
```

Ghi một message lúc khoẻ (console producer mặc định `acks=all`):

```bash
printf 'msg-khoe\n' | docker exec -i kafka-1 \
  /opt/kafka/bin/kafka-console-producer.sh --bootstrap-server kafka-1:19092 --topic dur2

docker exec kafka-1 /opt/kafka/bin/kafka-get-offsets.sh \
  --bootstrap-server kafka-1:19092 --topic dur2 --time latest
```

**Kết quả:** `dur2:0:1` — vào bình thường.

### Giết một broker

```bash
docker stop kafka-3
sleep 22
docker exec kafka-1 /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka-1:19092 \
  --describe --topic dur2
```

**Kết quả** — ISR co từ 3 xuống 2, broker 3 rơi vào `Elr`:

```
Topic: dur2  Partition: 0  Leader: 2  Replicas: 2,3,1  Isr: 2,1  Elr: 3  LastKnownElr:
```

### Ghi với `acks=all` khi ISR thiếu

```bash
printf 'msg-acks-all-luc-yeu\n' | docker exec -i kafka-1 \
  /opt/kafka/bin/kafka-console-producer.sh --bootstrap-server kafka-1:19092 --topic dur2
```

**Kết quả** — bị chặn thẳng, retry ba lần rồi bỏ:

```
WARN [Producer clientId=console-producer] Got error produce response ... on topic-partition
dur2-0, retrying (2 attempts left). Error: NOT_ENOUGH_REPLICAS
```

Log broker nói rõ nguyên nhân:

```
ERROR [ReplicaManager broker=1] Error processing append operation on partition dur2-0
org.apache.kafka.common.errors.NotEnoughReplicasException: The size of the current ISR : 2
is insufficient to satisfy the min.isr requirement of 3 for partition dur2-0
```

Offset đứng yên `dur2:0:1`. **Message này không bao giờ tồn tại** — producer biết mình thất bại.

### Ghi với `acks=1` trong cùng hoàn cảnh

```bash
printf 'msg-acks-1-luc-yeu\n' | docker exec -i kafka-1 \
  /opt/kafka/bin/kafka-console-producer.sh --bootstrap-server kafka-1:19092 --topic dur2 \
  --request-required-acks 1
```

**Kết quả** — producer **không báo lỗi gì**, coi như thành công. Nhưng offset vẫn `dur2:0:1`
và consumer chỉ đọc được:

```
Offset:0  msg-khoe
```

Message vừa ghi **không đọc được**. Nó đã nằm trong log của leader nhưng *high watermark*
chưa nhích, vì ISR (2) chưa đạt `min.insync.replicas` (3) — mà consumer chỉ được đọc tới
high watermark.

### Bật lại broker

```bash
docker start kafka-3
sleep 25
```

**Kết quả** — ISR về 3, high watermark nhảy `1 → 2`, message ẩn hiện ra:

```
Topic: dur2  Partition: 0  Leader: 2  Replicas: 2,3,1  Isr: 1,2,3  Elr:   LastKnownElr:

Offset:0  msg-khoe
Offset:1  msg-acks-1-luc-yeu
```

`msg-acks-all-luc-yeu` **không bao giờ xuất hiện** — đúng như thiết kế.

### Rút ra

| | `acks=all` | `acks=1` |
|---|---|---|
| Khi ISR thiếu | **Từ chối**, producer nhận `NOT_ENOUGH_REPLICAS` | **Nhận**, producer tưởng thành công |
| Ứng dụng biết mình mất dữ liệu? | **Có** — retry hoặc báo lỗi được | **Không** — im lặng đi tiếp |
| Dữ liệu sống nếu leader chết ngay sau đó? | Có, đã nằm trên ≥ `min.isr` bản | **Không đảm bảo** |

`acks=1` không phải "nhanh hơn một chút". Nó là **đánh đổi lấy sự im lặng**: bạn mất khả
năng biết mình vừa mất dữ liệu. Xem
[case study mất dữ liệu với acks=1](../case-studies/mat-du-lieu-acks-1.md).

Đôi `acks=all` + `min.insync.replicas=2` (với RF=3) là cấu hình bền đúng: chịu được **một**
broker chết mà vẫn ghi được, và không bao giờ nhận ghi khi chỉ còn một bản.

> **Chưa chạy:** thí nghiệm giết **leader** ngay sau khi ghi bằng `acks=1` để chứng minh
> dữ liệu **mất hẳn** (chứ không chỉ tạm ẩn) chưa làm trong lần này — nó cần khống chế
> thời điểm follower fetch. Trong lab trên, leader không chết nên dữ liệu vẫn còn.

## Bài 7 — Đo lag và tua offset

```bash
docker exec kafka-1 /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka-1:19092 \
  --create --topic t-lag --partitions 1 --replication-factor 3

seq 1 100 | docker exec -i kafka-1 /opt/kafka/bin/kafka-console-producer.sh \
  --bootstrap-server kafka-1:19092 --topic t-lag

# cho group đọc đúng 10 message rồi dừng
docker exec kafka-1 /opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server kafka-1:19092 \
  --topic t-lag --group g-lag --max-messages 10 --from-beginning

docker exec kafka-1 /opt/kafka/bin/kafka-consumer-groups.sh \
  --bootstrap-server kafka-1:19092 --describe --group g-lag
```

**Kết quả:**

```
GROUP  TOPIC  PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG  CONSUMER-ID
g-lag  t-lag  0          10              100             90   -
```

`LAG = LOG-END-OFFSET − CURRENT-OFFSET = 90` — số message còn nợ. Đây là **chỉ số sức khoẻ
số một**: lag tăng đều nghĩa là consumer xử lý chậm hơn tốc độ ghi, sớm muộn cũng vỡ.

Tua về đầu log:

```bash
docker exec kafka-1 /opt/kafka/bin/kafka-consumer-groups.sh --bootstrap-server kafka-1:19092 \
  --group g-lag --topic t-lag --reset-offsets --to-earliest --execute
```

**Kết quả:**

```
GROUP  TOPIC  PARTITION  NEW-OFFSET
g-lag  t-lag  0          0

GROUP  TOPIC  PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG
g-lag  t-lag  0          0               100             100
```

Nếu group còn consumer đang chạy, lệnh này **từ chối**:

```
Error: Assignments can only be reset if the group 'g1' is inactive,
but the current state is Stable
```

Kafka cấm tua offset dưới chân một consumer đang chạy. Tắt hết consumer rồi tua lại.

Đổi `--execute` thành `--dry-run` để xem trước mà không đổi gì. Đọc lại quá khứ là chuyện
**bình thường** với Kafka — sửa bug xong tua lại xử lý từ đầu, dựng service mới đọc lại
toàn bộ lịch sử. Với hàng đợi thì không tưởng.

## Phụ lục — cảnh báo deprecated ở Kafka 4.3.1

Các lệnh trên in cảnh báo, **không phải lỗi**, nhưng nên biết để đổi dần:

| Đang dùng | Sẽ bị bỏ, thay bằng |
|---|---|
| `--property` (console consumer) | `--formatter-property` |
| `--property` (console producer) | `--reader-property` |
| `--producer-property` | `--command-property` |

Riêng `--producer-property acks=1` **không có tác dụng** với console producer — phải dùng
cờ riêng `--request-required-acks 1`. Đây là chỗ dễ mất cả buổi để tưởng rằng `acks=1`
cũng bị `min.insync.replicas` chặn.

## Dọn dẹp

```bash
cd ~/Documents/learn-lab/kafka
docker compose down -v   # -v xoá luôn volume dữ liệu
```

## Related Topics

- [Consumer group và rebalance](../skills/consumer-groups.md) — lý thuyết cho bài 4
- [Retention và compaction](../reference/retention-compaction.md) — lý thuyết cho bài 5
- [Replication và độ bền](../reference/replication-durability.md) — lý thuyết cho bài 6
- [Delivery semantics](../reference/delivery-semantics.md) — `acks`, idempotence, transaction
- [Kafka CLI và config](../cheatsheets/cli-and-config.md) — tra nhanh các lệnh dùng trong lab
- [Kafka](../index.md) — chủ đề chứa bài tập này
