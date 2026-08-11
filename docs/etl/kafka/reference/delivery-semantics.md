---
title: Delivery semantics
sidebar_position: 5
description: "At-most/at-least/exactly-once — cơ chế protocol thật: PID + epoch + sequence, transaction coordinator, markers, và biên giới Kafka-only."
tags: [delivery-semantics, exactly-once, idempotent-producer, transactions, eos, producer-id, transaction-coordinator]
domain: data-engineering
category: concept
doc_type: reference
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-11
---

# Delivery semantics

> **Chốt:** "Exactly-once" của Kafka là một **cơ chế protocol cụ thể** — idempotent producer (PID + epoch + sequence, broker dedup theo partition) cộng transaction (coordinator + markers + last-stable-offset) — và nó chỉ đúng trong **phạm vi Kafka→Kafka**. Ra sink ngoài mà sink không idempotent/transactional thì bạn vẫn có trùng. Không có phép màu end-to-end miễn phí.

Ba mức giao nhận là một trong những chỗ bị marketing làm mờ nhiều nhất. "Exactly-once" nghe như đảm bảo tuyệt đối; thực tế nó là một cơ chế cụ thể với biên giới cụ thể. Hiểu sai biên giới đó là nguồn của rất nhiều dữ liệu trùng "không hiểu vì sao".

## Ba mức

- **At-most-once**: mỗi message xử lý **0 hoặc 1 lần** — không bao giờ trùng, nhưng có thể mất. Cách làm: **commit offset TRƯỚC khi xử lý**. Nếu crash sau commit trước khi xử lý xong → message đó bị bỏ. Dùng khi mất vài bản ghi chấp nhận được và tuyệt đối không muốn trùng (một số loại metrics).
- **At-least-once** (mặc định của Kafka): mỗi message xử lý **một lần trở lên** — không bao giờ mất, nhưng có thể trùng. Cách làm: **xử lý xong rồi mới commit offset**. Nếu crash sau khi xử lý trước khi commit → khi khởi động lại đọc lại từ offset cũ → **trùng**. Retry của producer cũng gây trùng. Đây là mặc định vì "thà trùng còn hơn mất".
- **Exactly-once**: mỗi message có hiệu ứng **đúng một lần**. Không phải "gửi đúng một lần" (mạng thì không thể) mà là "kết quả *như thể* xử lý đúng một lần".

Ranh giới thực dụng: đa số hệ thống nên **thiết kế cho at-least-once + consumer idempotent**. Đó thường rẻ và bền hơn EOS, và đúng cho cả khi ghi ra sink ngoài.

## Idempotent producer ở mức protocol

`enable.idempotence=true` chống **trùng do retry của producer**. Nhìn sâu vào protocol để hiểu vì sao nó chỉ chống được đúng loại trùng đó:

- Khi producer bật idempotence lần đầu, broker cấp cho nó một **Producer ID (PID)** và **epoch** (bắt đầu 0).
- Mỗi record producer gửi mang một **sequence number** — tăng dần, **theo từng partition** (không phải global). Record đầu vào partition P mang seq 0, kế tiếp seq 1, ...
- Broker (leader của partition) **nhớ sequence cuối đã ghi** cho mỗi `(PID, epoch, partition)`. Khi nhận record:
  - Seq = (last_seq + 1) → ghi, cập nhật last_seq.
  - Seq = last_seq (đúng cái vừa ghi) → **retry**: broker đã ghi rồi nhưng ack rớt trên đường về → broker **bỏ qua** (dedup), trả ack như thể ghi thành công. Không tạo bản trùng.
  - Seq > last_seq + 1 (nhảy cóc) → **`OutOfOrderSequenceException`**: có một batch trước đó bị mất/chưa tới. Producer phải xử lý (thường là fatal, cần khởi tạo lại).

```text
Broker dedup theo (PID, epoch, partition, sequence):

producer gửi:  seq=5  ──►  broker ghi, last_seq=5, ack ──► (ack rớt)
producer retry: seq=5 ──►  broker thấy seq==last_seq → BỎ QUA, ack lại
                            → không có bản trùng
```

**Cửa sổ 5 in-flight**: idempotence yêu cầu `max.in.flight.requests.per.connection` **nhỏ hơn hoặc bằng 5**. Broker chỉ theo dõi dedup trong một cửa sổ; quá 5 request chưa ack cùng lúc thì không đảm bảo giữ được thứ tự + dedup. (Không bật idempotence mà đặt in-flight lớn hơn 1 + có retry thì còn có thể **đảo thứ tự** khi retry — idempotence với cửa sổ 5 giữ cả thứ tự lẫn dedup.)

**Giới hạn của bảo đảm này** — hẹp có chủ đích:

- Chỉ chống trùng *của một producer* *khi retry* *vào một partition*. Không làm gì với trùng do consumer đọc lại hay logic ứng dụng.
- **Khi PID đổi, mất đảm bảo.** PID không bền qua producer restart mặc định: producer chết và lên lại được cấp **PID mới**, broker coi đó là producer khác → không dedup với PID cũ → **retry qua ranh giới restart vẫn có thể trùng**. Đây là lý do "read-process-write bền" cần transaction (với `transactional.id` ổn định), không chỉ idempotence.

## Transactions ở mức protocol

`transactional.id` cho **atomic multi-partition write + commit offset**. Cơ chế:

- Producer khai báo `transactional.id` (một tên ổn định theo vai trò/instance). Khi khởi tạo, nó gọi `initTransactions()` → tìm **transaction coordinator** (một broker được chọn theo hash của `transactional.id` vào các partition của topic nội bộ `__transaction_state`).
- Coordinator cấp/khôi phục **PID** gắn với `transactional.id` đó và **tăng epoch**. Việc tăng epoch chính là cơ chế **fencing**: một producer zombie mang cùng `transactional.id` nhưng epoch cũ sẽ bị coordinator **từ chối** (fenced) → chống double-write từ instance cũ chưa chết hẳn.
- Trong một transaction: `beginTransaction()` → `send()` vào nhiều partition → (tuỳ chọn) `sendOffsetsToTransaction()` → `commitTransaction()` hoặc `abortTransaction()`.
- Coordinator ghi trạng thái transaction vào **`__transaction_state`** (đang mở, các partition tham gia, commit/abort) — bản thân nó là một log bền, để coordinator khôi phục sau crash.
- Khi commit/abort, coordinator ghi **transaction markers** (control record: COMMIT hoặc ABORT) vào **mọi partition** mà transaction đã chạm. Marker là một record đặc biệt nằm ngay trong log dữ liệu, đánh dấu "mọi record của PID này tới đây thuộc transaction đã commit/abort".

### Last Stable Offset + `isolation.level=read_committed`

Consumer bên đọc đặt `isolation.level=read_committed` để **chỉ đọc message của transaction đã commit**. Cơ chế lọc dựa trên **Last Stable Offset (LSO)**:

- LSO = offset cao nhất mà **mọi transaction dưới nó đã kết thúc** (đã có marker commit/abort). Record của transaction **đang mở** nằm **trên** LSO.
- Consumer `read_committed` chỉ được đọc tới **LSO**, không phải log-end-offset. Record trong transaction đang mở bị "giữ lại" — chưa hiện ra tới khi transaction commit (rồi hiện) hoặc abort (rồi bị lọc bỏ nhờ marker ABORT).
- Broker gửi cả danh sách **aborted transactions** kèm fetch response để consumer lọc bỏ record của những transaction bị abort.

Mặc định là `read_uncommitted` — sẽ đọc cả record rồi bị abort, phá vỡ EOS. **Bật producer transaction mà quên đổi consumer sang `read_committed` là một lỗi âm thầm phổ biến.**

```properties
# Ví dụ minh hoạ — chưa chạy trên cluster:
# producer — EOS read-process-write
enable.idempotence=true
transactional.id=orders-enricher-1
acks=all
max.in.flight.requests.per.connection=5
# consumer đầu ra
isolation.level=read_committed
```

## Read-process-write (EOS)

Mô hình lõi của exactly-once *trong Kafka*: đọc từ topic A → xử lý → ghi ra topic B → **và** commit offset của A, tất cả **nguyên tử**. Điểm mấu chốt là `sendOffsetsToTransaction()`: commit offset consume **không** đi con đường commit thường mà **nằm trong chính transaction** — nó ghi offset vào `__consumer_offsets` như một phần của transaction. Nên hoặc cả "ghi output B + commit offset A" cùng thành công, hoặc cả hai cùng bị abort. Không có trạng thái nửa vời "đã ghi B nhưng chưa commit offset A" (gây trùng) hay ngược lại (gây mất).

**EOS v1 vs v2 (KIP-447)** ngắn gọn: v1 buộc **mỗi input partition một `transactional.id`** → số producer nở theo số partition, rebalance đắt. v2 (KIP-447) cho **một producer phục vụ nhiều input partition** an toàn nhờ coordinator theo dõi mapping consumer-group-generation → producer, fencing chính xác hơn. Kết quả: EOS rẻ và scale tốt hơn nhiều; stream processor hiện đại dùng v2.

### Sơ đồ luồng transaction

```mermaid
sequenceDiagram
  participant Pr as Producer (txn.id)
  participant Co as Transaction Coordinator
  participant Pb as Partition topic B
  participant Off as __consumer_offsets

  Pr->>Co: initTransactions() → cấp PID, epoch++ (fencing)
  Pr->>Co: beginTransaction()
  Pr->>Pb: send(records)  (nằm TRÊN last-stable-offset, chưa hiện với read_committed)
  Pr->>Co: sendOffsetsToTransaction(offsets, groupId)
  Pr->>Co: commitTransaction()
  Co->>Pb: ghi COMMIT marker
  Co->>Off: ghi offset (thuộc transaction) + COMMIT marker
  Note over Pb,Off: LSO tiến lên → read_committed consumer giờ thấy records
```

## Failure scenarios

| Sự cố | Điều gì xảy ra | Vì sao vẫn đúng |
|---|---|---|
| Producer chết **giữa** transaction (trước commit) | Transaction không có COMMIT marker → treo tới khi coordinator hết `transaction.timeout.ms` → **abort** | Record đã ghi nằm trên LSO, bị marker ABORT lọc bỏ; `read_committed` không bao giờ thấy → không hiệu ứng nửa vời |
| Producer zombie (bị nghĩ là chết) hồi sinh, ghi tiếp | Instance mới đã `initTransactions()` → **epoch tăng**; coordinator **fence** producer cũ (epoch thấp) → từ chối ghi | Chỉ một epoch hợp lệ tại một thời điểm → không double-write |
| Ack rớt, producer retry (idempotent) | Broker thấy seq trùng → bỏ qua, ack lại | Dedup theo (PID, partition, seq) → không bản trùng |
| Producer restart, PID mới (chỉ idempotence, không txn) | Broker không nối được với PID cũ → **có thể trùng** qua ranh giới restart | Đây là lý do cần `transactional.id` để bền qua restart |
| Coordinator (broker) chết | Coordinator mới đọc lại `__transaction_state` để khôi phục transaction đang mở, hoàn tất commit/abort | `__transaction_state` là log bền, replicate |

## Biên giới quan trọng nhất: Kafka→Kafka, không phải end-to-end

EOS của Kafka đảm bảo **trong phạm vi Kafka**: đọc topic → xử lý → ghi topic + commit offset, nguyên tử. **Ngay khi bạn ghi ra sink ngoài Kafka** (DB, S3, Elasticsearch, API), bảo đảm này **không còn tự động áp dụng** — vì transaction marker, LSO, coordinator chỉ sống trong Kafka. Sink phải tự **idempotent** (ghi cùng key nhiều lần cho cùng kết quả, ví dụ upsert theo primary key) hoặc **transactional** (two-phase commit phối hợp với Kafka) thì mới có exactly-once thực sự tới đích.

Đây là lý do các stream processor như **Flink** có cơ chế exactly-once riêng dựa trên **checkpoint + two-phase commit** tới sink, phối hợp với transaction của Kafka: Flink dùng transactional producer để ghi Kafka, và với sink ngoài dùng `TwoPhaseCommitSinkFunction` gắn commit vào checkpoint barrier. Muốn EOS *tới tận sink* thì phải nhìn cả chuỗi, không chỉ Kafka. Xem [Flink exactly-once](../../flink/reference/exactly-once.md).

## Bảng config liên quan

| Config | Phía | Mặc định phổ biến | Làm gì | Khi nào đổi |
|---|---|---|---|---|
| `enable.idempotence` | producer | `true` (Kafka mới) | Bật PID + sequence, broker dedup retry | Gần như luôn để bật; chỉ tắt nếu có lý do rất đặc biệt |
| `acks` | producer | `all` (khi idempotence bật) | Chờ mọi ISR ack — điều kiện của độ bền và EOS | Giữ `all` cho EOS; `1`/`0` chỉ khi chấp nhận mất |
| `max.in.flight.requests.per.connection` | producer | 5 | Số request chưa ack song song trên một connection | Giữ nhỏ hơn hoặc bằng 5 khi bật idempotence |
| `transactional.id` | producer | (không set) | Bật transaction + fencing bền qua restart | Set khi làm read-process-write EOS; phải ổn định theo vai trò |
| `transaction.timeout.ms` | producer | 60000 (mặc định phổ biến) | Coordinator abort transaction treo quá lâu | Tăng nếu batch xử lý dài; nhỏ hơn `transaction.max.timeout.ms` của broker |
| `isolation.level` | consumer | `read_uncommitted` | `read_committed` để chỉ đọc dữ liệu đã commit (lọc theo LSO) | Đặt `read_committed` mỗi khi phía trên dùng transaction |
| `retries` | producer | rất lớn / `MAX_INT` | Số lần retry — idempotence khiến retry an toàn | Ít khi cần đổi khi idempotence bật |

## Khi nào KHÔNG nên bật exactly-once

- **Sink đã idempotent tự nhiên** (upsert theo key vào DB): at-least-once + upsert cho kết quả đúng như EOS mà rẻ hơn nhiều. Bật transaction là trả throughput/latency vô ích.
- **Throughput là ưu tiên hàng đầu**: transaction thêm overhead (markers ghi vào mọi partition tham gia, phối hợp coordinator), độ trễ tăng theo chu kỳ commit vì `read_committed` chỉ thấy dữ liệu sau khi commit. Với luồng cực lớn, cân nhắc kỹ.
- **Pipeline đơn giản một chặng ghi ra store idempotent**: không cần cỗ máy transaction.

## Trade-offs

| Được | Mất | Đổi lấy |
|---|---|---|
| Không trùng trong Kafka (EOS) | Throughput giảm, latency tăng theo chu kỳ commit | Đảm bảo tính đúng |
| read-process-write nguyên tử | Phức tạp vận hành (transactional.id, coordinator, fencing) | Ít phải khử trùng downstream |
| Retry an toàn (idempotent producer) | Rất ít overhead — nên gần như luôn bật | An toàn retry |
| `read_committed` chỉ thấy dữ liệu đã commit | Latency đọc tăng: dữ liệu "hiện" trễ tới sau commit marker | Đọc sạch, không thấy dữ liệu abort |

## Common Mistakes

| Lỗi | Hậu quả | Phòng bằng |
|---|---|---|
| Bật transaction, quên `read_committed` | Consumer đọc cả message bị abort → vẫn trùng | Đặt `isolation.level=read_committed` |
| Tưởng EOS Kafka = exactly-once tới sink ngoài | Trùng ở DB/S3 "không hiểu vì sao" | Sink phải idempotent/transactional; xét cả chuỗi |
| `transactional.id` không ổn định theo instance/vai trò | Mất fencing (epoch không nối được), zombie double-write | Gán `transactional.id` ổn định, duy nhất theo vai trò |
| Chỉ bật idempotence rồi mong bền qua restart | PID đổi khi restart → vẫn trùng qua ranh giới restart | Dùng transaction với `transactional.id` cho read-process-write |
| `max.in.flight` lớn hơn 5 khi bật idempotence | Ngoài cửa sổ dedup → có thể trùng/đảo thứ tự | Giữ `max.in.flight` nhỏ hơn hoặc bằng 5 |
| Dùng EOS khi sink đã idempotent | Trả overhead vô ích | At-least-once + upsert theo key |

## FAQ

<details>
<summary>Idempotent producer và transaction khác gì nhau?</summary>

Idempotent producer chống trùng do **retry của một producer vào một partition** (PID + sequence, dedup ở broker). Transaction cho **nguyên tử qua nhiều partition + commit offset** (coordinator + markers + fencing bằng epoch), và bền qua producer restart nhờ `transactional.id`. EOS đầy đủ trong Kafka cần cả hai; bật transaction thường tự kéo theo idempotence.

</details>

<details>
<summary>At-least-once + consumer idempotent có tương đương exactly-once không?</summary>

Về kết quả cuối, thường có — và đó là cách rẻ, bền, phổ biến nhất. Nếu mỗi hiệu ứng downstream idempotent theo key (upsert), xử lý lại một message không đổi kết quả. Nhiều team chọn hướng này thay vì cỗ máy transaction của Kafka, nhất là khi đích là sink ngoài.

</details>

<details>
<summary>Vì sao `read_committed` làm dữ liệu "hiện" trễ hơn?</summary>

Vì consumer `read_committed` chỉ đọc tới last-stable-offset — record của transaction đang mở nằm trên LSO và bị giữ lại tới khi có COMMIT marker. Nên độ trễ đọc gắn với chu kỳ commit của producer transactional: commit thưa → dữ liệu hiện trễ hơn nhưng throughput tốt hơn; commit dày → latency thấp hơn nhưng nhiều marker hơn.

</details>

## Related Topics

- [Topic, partition, offset](topic-partition-offset.md) — last-stable-offset, high-watermark, committed offset
- [Replication và độ bền](replication-durability.md) — acks=all là điều kiện của EOS
- [Retention và log compaction](retention-compaction.md) — compacted changelog trong stateful processing
- [Flink exactly-once](../../flink/reference/exactly-once.md) — EOS tới sink ngoài qua checkpoint + 2PC
- [Operations: lag](../skills/operations-lag.md) — theo dõi consumer lag khi bật EOS
- [Kafka](../index.md) — chủ đề tổng
