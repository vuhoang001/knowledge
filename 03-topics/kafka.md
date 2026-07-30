---
type: topic
level: L0
started:
next-review:
tags: [kafka, streaming, data-engineering, hdos]
updated: 2026-07-30
---

# Kafka

## Mục tiêu

Hiểu và dựng lại được đường **CDC realtime** của HDOS: Debezium đọc WAL của HIS
Postgres → Kafka → Flink → `hdos_bronze.patient_cdc`. Toàn bộ đoạn này đã bị gỡ khỏi
`kafka-flink` khi thu gọn repo (27/07/2026), giờ chỉ còn luồng batch.

Đạt **L3** là đủ: topic tắc, consumer lag tăng, rebalance liên tục thì phải tự đọc
ra nguyên nhân.

## Nó giải quyết vấn đề gì

Nối N hệ thống với M hệ thống bằng đường trực tiếp thì ra N×M kết nối, đổi một cái
là gãy dây chuyền, và bên nhận chậm thì bên gửi phải chờ.

Kafka chen vào giữa làm nơi chứa: bên ghi cứ ghi, bên đọc đọc theo nhịp của mình,
thêm consumer mới không ảnh hưởng ai. Đổi lại phải nuôi thêm một cụm và chấp nhận
dữ liệu chỉ **eventually consistent**.

## Mô hình tư duy cốt lõi

**Kafka KHÔNG phải message queue. Nó là commit log phân tán, đọc lại được.**

Queue: consume xong là message biến mất. Kafka: message nằm lại theo `retention`,
mỗi consumer group giữ **offset riêng** — nên đọc lại từ bất kỳ điểm nào trong quá
khứ là chuyện bình thường, không phải thao tác cứu hộ.

Hiểu sai chỗ này thì thiết kế sai toàn bộ: sẽ sợ "mất message" trong khi nó vẫn nằm
đó, sẽ không dám replay khi job Flink tính sai, và sẽ dùng Kafka như một cái queue
tầm thường.

Hệ quả thực tế cho HDOS: job Flink tính sai một ngày → sửa code, reset offset về
đầu ngày, chạy lại. Không cần đụng tới HIS.

## Bản đồ khái niệm

| Khái niệm | Là gì | Vì sao quan trọng |
|---|---|---|
| topic | Tên của một dòng log | Đơn vị tổ chức |
| **partition** | Lát cắt của topic | **Đơn vị song song VÀ đơn vị thứ tự** — ý quan trọng nhất |
| offset | Vị trí một bản ghi trong partition | Consumer nhớ mình đọc tới đâu |
| key | Quyết định bản ghi vào partition nào | Cùng key → cùng partition → **đúng thứ tự** |
| consumer group | Nhóm cùng chia nhau một topic | Mỗi partition chỉ một consumer trong group |
| rebalance | Chia lại partition khi thành viên đổi | Nguyên nhân số 1 của "consumer tự dưng đứng" |
| replication factor | Số bản sao của partition | Chịu lỗi broker |
| ISR | Các bản sao đang bắt kịp | `acks=all` đợi ISR |
| retention | Giữ bao lâu / bao nhiêu | Hết hạn là mất thật |
| log compaction | Chỉ giữ bản mới nhất mỗi key | Hợp cho CDC snapshot trạng thái |

**Thứ tự CHỈ đảm bảo trong một partition.** Muốn mọi thay đổi của một bệnh nhân về
đúng thứ tự thì key phải là mã BN. Không đặt key → phân tán vòng tròn → hai bản ghi
của cùng bệnh nhân có thể xử lý ngược thứ tự. Đây là lỗi im lặng, không ai báo.

## Lộ trình

- [ ] **L1 Hiểu** — nói được vì sao Kafka không phải queue, và partition vừa là song song vừa là thứ tự
- [ ] **L2 Chạy được** — dựng Kafka bằng Docker, producer/consumer chạy, xem được offset và lag
- [ ] **L3 Sửa được** — gỡ được lag tăng, rebalance lặp, mất thứ tự (≥3 lỗi, ghi ở "Sai lầm")
- [ ] **L4 Thiết kế được** — chọn được số partition, key, retention cho topic CDC của HDOS và bảo vệ được lựa chọn

## Bài tập

### Bài 1 — Producer/consumer tối thiểu (L2)

**Làm gì:** Docker compose một broker. Gửi 10 message, đọc lại bằng
`kafka-console-consumer --from-beginning`.

**Xong khi:** đọc lại được đúng 10 message **lần thứ hai** — chứng minh dữ liệu
không biến mất sau khi consume.

**Kết quả:**

### Bài 2 — Thứ tự vỡ vì thiếu key (L2→L3)

**Làm gì:** topic 3 partition. Gửi 100 message **không key**, ghi lại thứ tự nhận.
Gửi lại 100 message **có key** cố định.

**Xong khi:** thấy tận mắt lần đầu thứ tự lộn, lần sau đúng — và giải thích được vì sao.

> Bài quan trọng nhất. Đây đúng là lỗi sẽ gặp với `patient_cdc`.

**Kết quả:**

### Bài 3 — Consumer group và rebalance (L3)

**Làm gì:** 2 consumer cùng group đọc topic 3 partition. Giết một cái, xem log rebalance.
Thêm consumer thứ 4 vào group.

**Xong khi:** giải thích được vì sao consumer thứ 4 **không nhận được gì**.

**Kết quả:**

### Bài 4 — Replay sau khi tính sai (L3)

**Làm gì:** consume hết, rồi `kafka-consumer-groups --reset-offsets --to-earliest --execute`.

**Xong khi:** xử lý lại toàn bộ mà không cần bên gửi gửi lại.

**Kết quả:**

### Bài 5 — Debezium bắt CDC từ Postgres (L3→L4)

**Làm gì:** Debezium connector đọc WAL của một bảng Postgres. `UPDATE` một dòng, xem
message sinh ra.

**Xong khi:** đọc được cấu trúc `before`/`after`/`op`, và nói được điều gì xảy ra khi
connector chết 1 tiếng rồi sống lại.

**Kết quả:**

## Tự kiểm

<details><summary>1. Kafka khác message queue ở điểm nào?</summary>

Queue xoá sau khi consume. Kafka giữ theo retention, mỗi consumer group có offset
riêng → đọc lại từ bất kỳ đâu là chuyện thường.
</details>

<details><summary>2. Thứ tự message được đảm bảo ở phạm vi nào?</summary>

**Chỉ trong một partition.** Trên toàn topic thì không có khái niệm thứ tự.
</details>

<details><summary>3. Muốn mọi thay đổi của một bệnh nhân đúng thứ tự thì làm gì?</summary>

Đặt `key` = mã bệnh nhân. Cùng key → cùng partition → đúng thứ tự.
</details>

<details><summary>4. Group có 4 consumer, topic có 3 partition — chuyện gì xảy ra?</summary>

Một consumer ngồi không. Mỗi partition chỉ được một consumer trong group đọc.
Số consumer hữu ích bị chặn bởi số partition.
</details>

<details><summary>5. Consumer lag tăng dần nghĩa là gì? Nghi gì trước?</summary>

Đọc chậm hơn ghi. Nghi theo thứ tự: xử lý mỗi message quá lâu → số partition quá ít
→ rebalance lặp làm mất thời gian → consumer chết âm thầm.
</details>

<details><summary>6. Vì sao <code>retention</code> nguy hiểm hơn nó có vẻ?</summary>

Hết hạn là mất **thật**, không lấy lại được. Consumer chết lâu hơn retention thì
replay không còn dữ liệu để replay.
</details>

## Sai lầm đã mắc

<!-- ≥3 mục thật thì nâng L3. Ghi cả cái tưởng sai lúc đầu. -->

## Nguồn

- [ ] Kafka docs — phần *Design* (đọc hết, đây là chỗ giải thích commit log)
- [ ] Debezium docs — connector Postgres, phần WAL và replication slot

## Ghi chú thuộc chủ đề này

<!-- Mọi note trong ../02-notes/ về Kafka phải có mặt ở đây. -->

## Liên kết

- [Flink](flink.md) — bên tiêu thụ topic CDC
- [Iceberg](iceberg.md) — đích đến cuối: `hdos_bronze.patient_cdc`
- Repo `kafka-flink` — luồng CDC bị gỡ 27/07/2026, lịch sử git còn giữ
