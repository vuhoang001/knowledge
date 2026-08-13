---
title: State phình vì thiếu TTL
i18n_status: untranslated
sidebar_position: 3
description: "Keyed state giữ mọi key mãi mãi — checkpoint chậm dần rồi TaskManager OOM."
tags: [flink, state, ttl, checkpoint, rocksdb]
domain: data-engineering
category: technology
doc_type: case-study
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-11
---

# State phình vì thiếu TTL

> **Chốt:** Keyed state không có TTL giữ **mọi key đã từng xuất hiện mãi mãi**; với key space vô hạn (order_id, session_id), state chỉ tăng — checkpoint chậm dần theo thời gian rồi TaskManager OOM.

## Nhãn

**Tình huống dựng lại** — số liệu là **minh hoạ, chưa chạy trên cluster**, nhưng nhất quán trong bài.

## Bối cảnh

Job làm **dedup**: giữ một `ValueState<Boolean>` theo `order_id` để bỏ bản ghi trùng. Mỗi `order_id` mới tạo một entry state. `order_id` **không bao giờ được dùng lại** — key space thực tế là vô hạn, tăng theo lượng đơn.

Không ai đặt TTL, vì lúc đầu job chạy tốt và state còn nhỏ.

## Triệu chứng

*Số minh hoạ — chưa chạy:*

- **Tuần 1:** checkpoint size ~200 MB, duration ~3 s. Ổn.
- **Tuần 4:** checkpoint size ~4 GB, duration ~40 s. Vẫn "chạy được".
- **Tuần 8:** checkpoint bắt đầu **timeout** (vượt `execution.checkpointing.timeout`), rồi TaskManager **OOM** và restart, restore từ checkpoint lớn cũng lâu → vòng xoáy.

Đồ thị checkpoint size và duration **tăng gần tuyến tính theo thời gian**, không theo tải.

## Giả thuyết sai lúc đầu

1. **Nghi thiếu RAM tạm thời.** Tăng heap TaskManager → **hoãn** được vài tuần rồi OOM lại ở mức cao hơn. Chỉ mua thời gian.
2. **Nghi data spike.** Rà throughput input → **ổn định**, không có đợt tăng đột biến. Loại.
3. **Nghi checkpoint config sai.** Chỉnh interval/timeout → size vẫn tăng, chỉ dời điểm chết. Không phải config checkpoint.

Chỗ mất thời gian: mọi giả thuyết coi đây là vấn đề **tài nguyên/tức thời**, trong khi đây là **rò rỉ state có hệ thống** — state chỉ thêm, không bao giờ bớt.

## Nguyên nhân thật

State là **unbounded**: mỗi key mới thêm một entry, không có cơ chế nào xoá entry cũ. Với key space vô hạn, tổng state → vô hạn theo thời gian. Checkpoint phải chụp toàn bộ state → size và duration tăng theo → cuối cùng vượt bộ nhớ / timeout.

Đây không phải bug của Flink; là **thiếu vòng đời cho state**. Flink giữ đúng những gì được bảo giữ.

## Cách sửa

**1. Đặt TTL cho state** để entry cũ tự bị dọn:

```java
StateTtlConfig ttl = StateTtlConfig
    .newBuilder(Time.days(7))                       // sống 7 ngày
    .setUpdateType(StateTtlConfig.UpdateType.OnCreateAndWrite)
    .setStateVisibility(StateTtlConfig.StateVisibility.NeverReturnExpired)
    .cleanupInRocksdbCompactFilter(1000)            // dọn trong lúc RocksDB compaction
    .build();

ValueStateDescriptor<Boolean> desc =
    new ValueStateDescriptor<>("seen", Boolean.class);
desc.enableTimeToLive(ttl);
```

**2. Dùng RocksDB state backend** cho state lớn (spill ra đĩa thay vì giữ hết trên heap):

```properties
state.backend: rocksdb
state.backend.incremental: true   # checkpoint tăng dần, chỉ chụp phần thay đổi
```

**3. Thiết kế lại để state bounded** khi có thể: dedup theo cửa sổ thời gian giới hạn thay vì "nhớ mọi order_id mãi mãi" — chỉ cần chống trùng trong khoảng hợp lý (vd 24h).

Đánh đổi: TTL nghĩa là sau ngưỡng, một `order_id` cũ quay lại **không còn** bị coi là trùng. Chọn TTL đủ dài để bao trọn khả năng đến muộn/replay thực tế.

## Dấu hiệu nhận ra sớm

Theo dõi **checkpoint size và duration theo thời gian** (Flink UI → Checkpoints, hoặc metrics `lastCheckpointSize`, `lastCheckpointDuration`). Đường **tăng tuyến tính bất kể tải** = state đang rò. Bắt sớm rẻ hơn nhiều so với đợi OOM: alert khi checkpoint size vượt ngưỡng hoặc tăng đều nhiều tuần liền.

## Related Topics

- [State và checkpoint](../reference/state-and-checkpoint.md) — vòng đời keyed state, TTL, RocksDB backend
- [Backpressure tuning](../skills/backpressure-tuning.md) — checkpoint size/duration ảnh hưởng tới độ khoẻ job
- [Flink](../index.md) — chủ đề chứa case study này
