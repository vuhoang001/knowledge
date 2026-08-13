---
title: Replication và độ bền
i18n_status: untranslated
sidebar_position: 3
description: "acks=all + min.insync.replicas=2 mới là bền; acks=1 mất dữ liệu khi leader chết đúng lúc."
tags: [replication, isr, durability, acks, min-insync-replicas]
domain: data-engineering
category: concept
doc_type: reference
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-11
---

# Replication và độ bền

> **Chốt:** Độ bền không đến từ một tham số mà từ **cặp** `acks=all` **và** `min.insync.replicas>=2` — thiếu một trong hai, bạn vẫn mất dữ liệu khi leader chết đúng lúc.

Đây là nơi người ta hay tưởng mình an toàn mà không. `acks=1` nghe có vẻ "đã được xác nhận", nhưng nó chỉ xác nhận **leader** đã ghi — nếu leader chết trước khi follower kịp sao chép, message đó bốc hơi mà không lỗi nào báo về producer.

## Replication factor, leader, follower

Mỗi partition được nhân bản thành **replication factor (RF)** bản, đặt trên các broker khác nhau. Trong RF bản đó:

- Một bản là **leader** — phục vụ **toàn bộ** read và write của partition đó.
- Các bản còn lại là **follower** — chỉ sao chép dữ liệu từ leader, không phục vụ client (trong mô hình cổ điển).

Client luôn nói chuyện với leader. Follower liên tục fetch từ leader để bám sát. Khi leader chết, một follower được bầu lên làm leader mới.

## Giao thức replication: follower là "một loại consumer đặc biệt"

Điều làm Kafka replication đơn giản đến bất ngờ: **follower không nhận dữ liệu được push tới**, mà **chủ động fetch** từ leader — dùng đúng cơ chế như một consumer. Vòng lặp của mỗi follower:

1. Follower gửi **`FetchRequest`** tới leader, kèm offset nó muốn đọc tiếp (offset của record kế tiếp sau cái nó đã có).
2. Leader trả về các record từ offset đó trở đi (hoặc chờ tới `replica.fetch.wait.max.ms` nếu chưa có gì mới — long-poll).
3. Follower ghi các record vào log của nó, rồi vòng lại fetch với offset mới hơn.

Chính offset trong `FetchRequest` là cách leader **biết follower đã sao chép tới đâu**: một follower fetch từ offset `N` nghĩa là nó đã có mọi record `< N`. Leader lưu, cho mỗi follower, **`LogEndOffset` (LEO)** — offset ngay sau record cuối cùng mà follower đó đã xác nhận có.

```mermaid
flowchart LR
  P[Producer] -->|produce acks=all| L[(Leader partition-0)]
  F1[(Follower A)] -->|FetchRequest offset=N| L
  F2[(Follower B)] -->|FetchRequest offset=M| L
  L -.->|records >= N| F1
  L -.->|records >= M| F2
  C[Consumer] -->|đọc tối đa tới High Watermark| L
```

### High Watermark (HW) — ranh giới consumer được đọc

**High Watermark** là offset cao nhất đã được sao chép sang **mọi replica trong ISR**. Cụ thể: `HW = min(LEO của tất cả replica trong ISR)`. Hai hệ quả cốt lõi:

- **Consumer chỉ đọc được record `< HW`.** Record đã ghi vào leader nhưng chưa được mọi ISR sao chép (nằm giữa HW và LEO của leader) là **vô hình** với consumer — vì nếu leader chết ngay lúc đó, record ấy có thể chưa tồn tại ở leader mới. Không cho đọc là để tránh consumer thấy dữ liệu rồi mất.
- **HW chỉ tiến khi ISR đã bắt kịp.** Leader đẩy HW lên sau khi thấy LEO nhỏ nhất trong ISR đã vượt qua. Follower biết HW mới qua field trong `FetchResponse` của lượt fetch kế tiếp — nên HW ở follower luôn trễ HW ở leader một nhịp round-trip.

Ví dụ số minh hoạ (chưa chạy):

```text
Ví dụ minh hoạ — chưa chạy
Leader LEO = 105  (đã ghi tới offset 104)
Follower A LEO = 105  (bắt kịp)
Follower B LEO = 102  (tụt 3)
ISR = {Leader, A, B}
=> HW = min(105, 105, 102) = 102
=> Consumer đọc được tới offset 101; offset 102..104 còn "chưa an toàn", ẩn.
Khi B fetch xong tới 105 => HW nhảy lên 105 => consumer thấy tiếp 102..104.
```

## ISR — in-sync replicas

**ISR** là tập các replica đang **bám kịp** leader (fetch trong ngưỡng thời gian `replica.lag.time.max.ms`). Leader luôn nằm trong ISR. Một follower tụt lại quá lâu sẽ bị **loại khỏi ISR**; bắt kịp lại thì được thêm vào.

ISR là khái niệm trung tâm của độ bền vì các bảo đảm được diễn đạt theo ISR, không theo RF. RF là "có bao nhiêu bản"; ISR là "bao nhiêu bản thực sự đang đồng bộ *ngay lúc này*".

### ISR được quản lý thế nào — `replica.lag.time.max.ms`

Kafka **không** đo tụt hậu bằng số message (cách cũ `replica.lag.max.messages` đã bỏ, vì một burst produce làm mọi follower "tụt" giả). Nó đo bằng **thời gian**: một follower còn trong ISR nếu, trong `replica.lag.time.max.ms` gần nhất, nó **hoặc** đã fetch bắt kịp LEO của leader, **hoặc** vẫn đang gửi fetch đều đặn và tiến. Cụ thể:

- Follower bị **loại khỏi ISR** khi quá `replica.lag.time.max.ms` mà chưa fetch tới được LEO của leader tại thời điểm nó bắt đầu tụt (broker chậm, GC pause dài, network nghẽn, đĩa chậm).
- Khi loại xong, leader **thu hẹp ISR** và ghi thay đổi này qua controller (metadata). HW được tính lại chỉ trên ISR còn lại — nên **loại một follower tụt có thể làm HW nhảy lên**, vì `min(LEO)` không còn tính follower chậm.
- Follower **quay lại ISR** khi fetch bắt kịp LEO của leader trở lại. Leader mở rộng ISR, ghi qua controller.

| Config | Mặc định | Làm gì | Khi nào đổi |
|---|---|---|---|
| `replica.lag.time.max.ms` | `30000` (mặc định) | Follower tụt quá lâu này thì bị đẩy khỏi ISR | Tăng nếu cluster có GC pause/mạng giật khiến ISR "rung" (flapping); giảm nếu muốn phát hiện broker chậm sớm hơn |
| `replica.fetch.max.bytes` | mặc định broker | Kích thước tối đa mỗi partition trả về một fetch của follower | Tăng khi message lớn để follower bắt kịp nhanh hơn |
| `num.replica.fetchers` | `1` (mặc định) | Số thread fetch replication mỗi broker | Tăng khi một broker là follower của rất nhiều partition và replication là bottleneck |
| `replica.fetch.wait.max.ms` | mặc định broker | Long-poll: leader chờ tối đa bao lâu nếu chưa có data mới cho follower | Hiếm khi đổi |

## Leader epoch — chống "diverging log" khi đổi leader

Đây là phần cơ chế tinh vi nhất, và là lý do Kafka hiện đại **không còn dùng HW để truncate** như thời cũ.

### Bài toán: log truncation theo HW gây mất/lệch dữ liệu

Cơ chế cũ (trước KIP-101): khi một follower quay lại và trở thành leader, hoặc một leader cũ quay lại làm follower, nó **truncate log về HW của mình** rồi fetch lại từ đó. Vấn đề: HW ở follower luôn trễ HW ở leader (như đã nói ở trên). Khi có nhiều lần đổi leader liên tiếp, hai replica có thể **truncate về hai điểm khác nhau** rồi ghi tiếp nội dung khác nhau tại cùng offset → **log phân kỳ (diverging)**: cùng offset `102` nhưng ở replica X là record `a`, ở replica Y là record `b`. Đây là mất/hỏng dữ liệu ngầm.

### Lời giải: leader epoch

Mỗi lần bầu leader mới, controller cấp một **leader epoch** — số nguyên tăng đơn điệu (epoch 0, 1, 2, …). Leader gắn epoch hiện tại vào **mọi record batch** nó ghi. Kết quả là mỗi replica giữ một **leader-epoch file**: bản đồ `epoch -> offset bắt đầu của epoch đó`.

Khi một follower cần biết cắt log ở đâu (sau khi đổi leader), nó **không** dùng HW nữa mà hỏi leader bằng **`OffsetsForLeaderEpoch`**:

1. Follower hỏi: "với leader epoch cuối cùng của tôi là `E`, offset kết thúc của epoch đó là bao nhiêu?"
2. Leader trả về offset kết thúc của epoch `E` **theo log của leader**.
3. Nếu log của follower vượt quá điểm đó (nó có record thuộc epoch `E` mà leader không có), follower **truncate chính xác về điểm phân kỳ** — không nhiều hơn, không ít hơn.

Kịch bản khớp lại (minh hoạ — chưa chạy):

```text
Ví dụ minh hoạ — chưa chạy
Follower cũ (từng là leader epoch 5) có: ...offset 100(e5) 101(e5) 102(e5)
Leader mới (epoch 6) chỉ nhận được tới offset 101 trước khi lên làm leader:
   log leader: ...100(e5) 101(e5) 102(e6-new) 103(e6-new)
Follower hỏi OffsetsForLeaderEpoch(epoch=5) => leader trả 102 (epoch 5 kết ở offset 102, tức record cuối của e5 là 101).
Follower thấy nó có 102(e5) là "thừa" so với ranh giới => truncate offset 102 trở đi,
rồi fetch lại 102(e6-new), 103(e6-new) từ leader. Hai log hội tụ, không phân kỳ.
```

Điểm mấu chốt: leader epoch cho phép follower biết **chính xác record nào thuộc về nhánh lịch sử nào**, thay vì đoán mù bằng một offset HW trễ nhịp.

## Controller và bầu leader

**Controller** là một broker giữ vai trò điều phối metadata cluster: theo dõi broker sống/chết, quản lý ISR, và **bầu leader** cho partition khi leader cũ chết.

- **Với ZooKeeper (mô hình cũ):** controller là một broker được bầu qua ZK; nó đọc/ghi trạng thái partition vào ZK. Khi một broker chết, controller phát hiện qua ZK session hết hạn rồi bầu leader mới cho mọi partition mà broker đó đang làm leader.
- **Với KRaft (mô hình mới, không ZK):** metadata cluster nằm trong một **metadata topic** nội bộ do một nhóm **controller node** đồng thuận bằng Raft. Controller quorum này bầu leader và ghi thay đổi ISR vào metadata log. Bỏ được ZK giúp bầu leader và propagate metadata nhanh hơn nhiều ở cluster lớn.

### Preferred leader election

Khi tạo partition, replica **đầu tiên** trong danh sách assignment được coi là **preferred leader**. Sau các đợt failover, leader có thể dồn lệch về vài broker (mất cân bằng tải). **Preferred leader election** đưa leadership về lại preferred replica để rải đều. Có thể tự động (`auto.leader.rebalance.enable=true`) hoặc chạy tay.

| Config | Mặc định | Làm gì |
|---|---|---|
| `auto.leader.rebalance.enable` | `true` (mặc định) | Tự đưa leadership về preferred leader định kỳ |
| `leader.imbalance.check.interval.seconds` | `300` (mặc định) | Chu kỳ kiểm tra mất cân bằng leader |
| `leader.imbalance.per.broker.percentage` | `10` (mặc định) | Ngưỡng % lệch mới kích hoạt rebalance |

### Rack awareness — `broker.rack`

Đặt `broker.rack` cho mỗi broker (tên rack/AZ). Khi rải replica cho partition, Kafka **cố gắng đặt các replica lên rack khác nhau** — để mất cả một rack/AZ vẫn còn bản sống. Không có rack awareness, cả RF=3 vẫn có thể rơi hết vào một rack và một sự cố rack là mất partition.

## Ma trận đầy đủ: `acks` × `min.insync.replicas` × RF

Câu hỏi thực dụng: **"cấu hình này chịu được mấy broker chết mà (a) không mất dữ liệu, (b) vẫn ghi được?"** Bảng dưới với RF=3 (số minh hoạ, chưa chạy — nhưng theo đúng ngữ nghĩa Kafka):

| RF | acks | min.ISR | Không mất dữ liệu khi | Vẫn ghi được khi | Nhận xét |
|---|---|---|---|---|---|
| 3 | `all` | `2` | mất tối đa 1 broker | mất tối đa 1 broker | **Cấu hình bền chuẩn** — cân bằng durability/availability |
| 3 | `all` | `3` | mất tối đa 2 broker (dữ liệu) | mất **0** broker | Bền nhất về đọc lại, nhưng 1 broker bảo trì là chặn ghi ngay |
| 3 | `all` | `1` | **không** đảm bảo (ISR co còn 1 = như acks=1) | mất tối đa 2 broker | Bền giả — `min.ISR=1` vô hiệu hoá `acks=all` |
| 3 | `1` | (bất kỳ) | **không** — leader chết trong khe hở là mất | mất tối đa 2 broker | min.ISR không có tác dụng với acks=1 |
| 3 | `0` | (bất kỳ) | **không** — mất tự do | luôn "ghi được" (không chờ) | Fire-and-forget |
| 2 | `all` | `2` | mất tối đa 1 broker | mất **0** broker | 1 broker chết là chặn ghi — thiếu biên an toàn |

Quy tắc chung: với `acks=all`, **số broker chịu được mà vẫn ghi = RF − min.ISR**, còn **số broker chịu được mà không mất dữ liệu = min.ISR − 1** (cần ít nhất min.ISR bản có mỗi record). Chọn RF=3, min.ISR=2 vì nó cho cả hai vế bằng 1 — mất một broker vẫn vừa ghi được vừa an toàn.

## Cặp quyết định: `acks=all` + `min.insync.replicas`

`min.insync.replicas` (viết tắt **min.ISR**) là số replica trong ISR tối thiểu để một write với `acks=all` được chấp nhận. Nếu số replica in-sync tụt dưới ngưỡng này, producer với `acks=all` nhận lỗi (`NotEnoughReplicas`) — write bị từ chối thay vì âm thầm kém bền.

**Vì sao cần CẢ HAI:**

- Chỉ `acks=all` mà `min.insync.replicas=1`: "all" ở đây nghĩa là "tất cả replica *trong ISR*". Nếu ISR co lại còn đúng 1 (chỉ leader), thì `acks=all` = chờ đúng leader ghi = **hệt như acks=1**. Leader chết ngay sau đó → mất dữ liệu. Nên `min.insync.replicas=1` làm `acks=all` trở nên vô nghĩa về độ bền.
- Chỉ `min.insync.replicas=2` mà `acks=1`: producer không chờ đủ 2 bản, chỉ chờ leader. `min.ISR` không có tác dụng vì nó chỉ chặn write khi dùng `acks=all`.

Cấu hình bền điển hình: **RF=3, `min.insync.replicas=2`, `acks=all`**. Nghĩa là mỗi write phải được leader + ít nhất 1 follower xác nhận; chịu được 1 broker chết mà không mất dữ liệu, không mất khả năng ghi.

```properties
# Cấu hình bền điển hình (giá trị minh hoạ mặc định phổ biến — kiểm trên cluster thật)
# broker / topic
replication.factor=3
min.insync.replicas=2
# producer
acks=all
enable.idempotence=true
```

## Bảng acks × hậu quả

| acks | Producer chờ | Được | Rủi ro |
|---|---|---|---|
| `0` | không chờ gì | throughput cao nhất, latency thấp nhất | mất dữ liệu tự do — không biết có tới không |
| `1` | leader ghi xong | nhanh | leader chết trước khi follower sao chép → **mất dữ liệu**, producer tưởng thành công |
| `all` (`-1`) | tất cả replica **trong ISR** ghi xong | bền nhất | latency cao hơn; và chỉ thực sự bền khi `min.insync.replicas>=2` |

Xem [case study mất dữ liệu vì acks=1](../case-studies/mat-du-lieu-acks-1.md) — đúng kịch bản leader chết trong khe hở sao chép.

## `unclean.leader.election.enable` — đánh đổi availability vs mất dữ liệu

Khi mọi replica trong ISR đều chết, còn một replica **ngoài ISR** (đã tụt lại, thiếu dữ liệu mới nhất) còn sống:

- `unclean.leader.election.enable=false` (khuyến nghị cho độ bền): **không** bầu replica lạc hậu đó làm leader. Partition **offline** tới khi một replica in-sync quay lại. Chọn **consistency/durability** hơn availability.
- `unclean.leader.election.enable=true`: bầu replica lạc hậu làm leader để partition **available** trở lại ngay — nhưng những message chỉ có ở các replica in-sync đã chết sẽ **mất vĩnh viễn** (bị truncate). Chọn **availability** hơn durability.

Không có lựa chọn miễn phí ở đây; đây là điểm CAP trần trụi. Hệ thống coi trọng không-mất-dữ-liệu thì để `false` và chấp nhận có lúc partition offline.

### Kịch bản mất dữ liệu từng bước với `unclean=true`

Đi chậm để thấy chính xác chỗ message bốc hơi (số minh hoạ — chưa chạy):

```text
Ví dụ minh hoạ — chưa chạy. RF=3: broker B1(leader), B2, B3. min.ISR=2, acks=all.

t0  ISR = {B1, B2, B3}. HW = 100.
t1  Producer ghi offset 100..149 với acks=all.
    B1 và B2 đã sao chép tới 149; B3 đang GC pause, tụt lại ở 100.
    HW = min(149,149,100)=100 ban đầu... B3 tụt quá replica.lag.time.max.ms
    => B3 bị loại khỏi ISR. ISR = {B1, B2}. HW nhảy lên 149.
    Producer nhận ack cho 100..149 (đủ 2 bản trong ISR).
t2  B2 chết (mất điện rack). ISR = {B1}. Vì min.ISR=2, mọi acks=all mới bị từ chối
    (NotEnoughReplicas) — nhưng 100..149 ĐÃ ack trước đó, coi như bền.
t3  B1 chết luôn. Giờ chỉ B3 còn sống — nhưng B3 chỉ có tới offset 100.
t4a unclean=false: partition OFFLINE. Chờ B1 hoặc B2 quay lại. 100..149 an toàn.
t4b unclean=true : B3 (lạc hậu, chỉ có tới 100) được bầu làm leader.
    Log mới bắt đầu ghi tiếp từ offset 101 với NỘI DUNG KHÁC.
    => offset 100..149 mà producer đã được ack coi như thành công GIỜ MẤT VĨNH VIỄN.
       Producer không hề biết. Consumer đã đọc 100..149 giờ thấy dữ liệu khác nếu đọc lại.
```

Đây là lý do `unclean.leader.election.enable=false` là mặc định an toàn: nó thà để partition offline còn hơn "nuốt" các message đã được xác nhận.

## Khi nào KHÔNG cần bền tối đa

- **Metrics/telemetry mất vài bản ghi không sao**: `acks=1` hoặc thậm chí `0` đổi lấy throughput/latency là hợp lý. Ép `acks=all` + RF=3 cho log giám sát tần suất cao là trả giá latency vô ích.
- **Dữ liệu tái tạo được từ nguồn khác**: nếu mất thì replay từ source, độ bền cực đại là thừa.

Đừng mặc định "bền nhất luôn tốt nhất" — nó tốn latency và throughput thật.

## Common Mistakes

| Lỗi | Hậu quả | Phòng bằng |
|---|---|---|
| `acks=all` nhưng `min.insync.replicas=1` | Bền giả — khi ISR co còn 1 thì hệt acks=1 | Đặt `min.insync.replicas=2` với RF=3 |
| RF=2 + `min.insync.replicas=2` | 1 broker chết → mất khả năng ghi (ISR còn dưới min) | RF=3 để chịu 1 broker chết mà vẫn ghi được |
| Bật `unclean.leader.election` để "đỡ downtime" | Mất dữ liệu ngầm khi bầu leader lạc hậu | Để `false` nếu coi trọng độ bền |
| Tưởng `acks=1` là "đã bền" | Mất message khi leader chết đúng khe hở | Hiểu acks=1 chỉ xác nhận leader |
| Không đặt `broker.rack` | Cả RF=3 rơi một rack, mất rack là mất partition | Đặt `broker.rack` theo AZ để rải replica |
| `min.insync.replicas=3` với RF=3 | 1 broker bảo trì là chặn toàn bộ ghi | Dùng min.ISR=2 trừ khi thật sự cần |

## FAQ

<details>
<summary>Vì sao RF=3 mà min.insync.replicas=2, không phải 3?</summary>

Để chịu được 1 broker chết mà **vẫn ghi được**. Nếu min.ISR=3=RF thì chỉ cần 1 broker bảo trì/chết là ISR tụt xuống 2 < 3 → mọi write acks=all bị từ chối. min.ISR=2 cho biên an toàn: mất 1 vẫn ghi, đủ 2 bản để không mất dữ liệu.

</details>

<details>
<summary>Follower có phục vụ read để giảm tải leader không?</summary>

Trong mô hình cổ điển, không — leader phục vụ toàn bộ read/write. Có tính năng fetch-from-follower cho tối ưu theo rack/địa lý, nhưng đừng giả định nó bật; kiểm cấu hình cluster thật trước khi dựa vào.

</details>

<details>
<summary>Consumer có đọc được record mà leader đã ghi nhưng follower chưa kịp không?</summary>

Không. Consumer chỉ đọc tới **High Watermark** — offset đã được mọi replica trong ISR sao chép. Record giữa HW và LEO của leader (đã ghi vào leader, chưa sao chép hết) là vô hình với consumer. Đó là để nếu leader chết, consumer không lỡ thấy dữ liệu rồi mất.

</details>

<details>
<summary>Leader epoch giải quyết gì mà HW truncation cũ không làm được?</summary>

HW ở follower luôn trễ HW ở leader một nhịp round-trip. Truncate theo HW khi đổi leader nhiều lần liên tiếp có thể khiến hai replica cắt log ở hai điểm khác nhau rồi ghi tiếp nội dung khác tại cùng offset — log phân kỳ (diverging). Leader epoch gắn số epoch vào mỗi batch, cho follower hỏi `OffsetsForLeaderEpoch` để truncate **chính xác về điểm phân kỳ**, không đoán mù bằng HW.

</details>

## Related Topics

- [Delivery semantics](delivery-semantics.md) — idempotent producer, acks trong ngữ cảnh EOS
- [Topic, partition, offset](topic-partition-offset.md) — leader/follower theo partition
- [mất dữ liệu vì acks=1](../case-studies/mat-du-lieu-acks-1.md) — kịch bản leader chết
- [Producer tuning](../skills/producer-tuning.md) — chỉnh acks, idempotence, batch
- [Kafka](../index.md) — chủ đề tổng
