---
title: Chọn feature trước khi tách — 86,67% trên dữ liệu ngẫu nhiên
sidebar_position: 1
description: "Một bước SelectKBest đặt sai chỗ thổi accuracy từ 0.5450 lên 0.8667 trên dữ liệu không chứa tín hiệu nào."
tags: [data-leakage, pipeline, cross-validation, machine-learning, homl3]
domain: ai
category: concept
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-09-29
---

# Chọn feature trước khi tách — 86,67% trên dữ liệu ngẫu nhiên

> **Chốt:** Một dòng `SelectKBest(...).fit(X, y)` đặt trước `train_test_split` làm model
> đạt **86,67%** trên dữ liệu **không chứa một bit thông tin nào**. Không exception,
> không warning, không gì trong code trông sai.

## Tình huống

Bài toán phân loại nhị phân, dữ liệu rộng: **200 dòng, 5.000 cột**. Tỷ lệ cột/dòng như
vậy rất thường gặp ở dữ liệu gene, dữ liệu sensor, hoặc bất kỳ chỗ nào người ta đổ hết
feature có thể nghĩ ra vào bảng.

Bước tiền xử lý nghe hoàn toàn hợp lý: 5.000 cột là quá nhiều, hãy chọn 20 cột tốt nhất
trước đã.

## Giả thuyết ban đầu — và nó sai ở đâu

> "Chọn feature là tiền xử lý. Tiền xử lý thì làm trước khi tách, cho gọn."

Đúng với các phép biến đổi **không nhìn vào `y`** — ví dụ đổi kiểu dữ liệu, bỏ cột trùng.
Sai với mọi phép **có `y` trong công thức**, và `SelectKBest(f_classif)` chính là vậy:
nó xếp hạng từng cột theo mức tương quan với nhãn.

Nhìn vào `y` của toàn bộ dữ liệu nghĩa là nhìn vào `y` của phần **sẽ trở thành test set**.

## Tái hiện

Chạy thật 29/09/2026 tại `~/learn-lab/ml` — Python 3.12.3, scikit-learn 1.9.1,
numpy 2.5.3. Seed `default_rng(42)`, `random_state=42`.

Để không phải tranh cãi "model có học được gì thật không", dữ liệu được sinh sao cho
**chắc chắn không có tín hiệu**:

```python
rng = np.random.default_rng(42)
X = rng.normal(size=(200, 5000))       # 5000 cot nhieu thuan tuy
y = rng.integers(0, 2, size=200)       # nhan tung dong xu
```

`X` và `y` độc lập hoàn toàn. Điểm đúng duy nhất là **0.50**.

Bản sai — chọn feature trước:

```python
sel = SelectKBest(f_classif, k=20).fit(X, y)
Xtr, Xte, ytr, yte = train_test_split(sel.transform(X), y, test_size=0.3, random_state=42)
bad = LogisticRegression(max_iter=1000).fit(Xtr, ytr).score(Xte, yte)
```

Bản đúng — chọn feature trong pipeline:

```python
pipe = make_pipeline(SelectKBest(f_classif, k=20), LogisticRegression(max_iter=1000))
good = cross_val_score(pipe, X, y, cv=5).mean()
```

## Kết quả

```text
du lieu: 200 dong x 5000 cot nhieu, nhan ngau nhien
diem dung ky vong (doan bua)        : 0.5000

chon feature TRUOC khi tach (SAI)   : 0.8667
chon feature trong pipeline (DUNG)  : 0.5450

ro ri thoi phong diem len            : +32.2 diem phan tram
```

| | Điểm | Lệch so với sự thật |
|---|---|---|
| Sự thật (dữ liệu ngẫu nhiên) | 0.5000 | — |
| Chọn feature trước khi tách | **0.8667** | **+36,7 điểm %** |
| Chọn feature trong pipeline | 0.5450 | +4,5 điểm % (dao động thống kê trên 200 mẫu) |

## Cơ chế

Trong 5.000 cột nhiễu, một số cột **tình cờ** tương quan với `y` — thuần tuý do may rủi.
Với 5.000 lần thử, chuyện đó là chắc chắn xảy ra, không phải có thể.

`SelectKBest` chạy trên toàn bộ dữ liệu sẽ tìm đúng những cột đó, **kể cả phần tương
quan tình cờ nằm ở 30% sẽ thành test set**. Sau khi tách, 20 cột được giữ lại đã mang
sẵn dấu vết của test set. Model không học được quy luật nào — nó khai thác một sự trùng
hợp mà chính bước chọn cột đã bảo toàn qua ranh giới train/test.

`cross_val_score` với pipeline không bị vì `SelectKBest` được **fit lại trong từng fold**,
chỉ trên phần train của fold đó. Tương quan tình cờ tìm được ở fold đó không có lý do gì
tồn tại ở phần held-out.

## Cách chặn

```python
# DUNG — moi buoc nhin vao y deu nam trong pipeline
pipe = make_pipeline(
    SimpleImputer(),
    StandardScaler(),
    SelectKBest(f_classif, k=20),
    LogisticRegression(max_iter=1000),
)
score = cross_val_score(pipe, X, y, cv=5).mean()
```

Luật rút ra, áp dụng được mà không cần nhớ chi tiết:

**Bất kỳ bước nào có `y` trong công thức đều phải nằm trong pipeline.** Danh sách hay
gặp: feature selection, target encoding, oversampling (SMOTE), rời rạc hoá theo nhãn.

Và luật rộng hơn một bậc: **mọi thứ có `fit` đều phải nằm trong pipeline** — kể cả các
bước không nhìn `y` như `StandardScaler` và `SimpleImputer`. Chúng rò ít hơn nhiều,
nhưng "ít hơn" không phải "không", và không có lý do gì để tự nhận rủi ro đó.

## Dấu hiệu nhận ra trong dự án thật

| Dấu hiệu | Mức nghi ngờ |
|---|---|
| Điểm cao bất thường so với baseline nghiệp vụ | Cao |
| Điểm test **cao hơn** điểm train | Rất cao — gần như luôn là rò rỉ |
| Số cột lớn hơn hẳn số dòng | Cao — rò rỉ khuếch đại mạnh ở đây |
| Điểm tụt hẳn khi đưa tiền xử lý vào pipeline | **Đã tìm ra thủ phạm** |
| Model chạy production kém hẳn lúc offline | Muộn rồi, nhưng đúng triệu chứng |

Phép thử rẻ nhất: chạy lại toàn bộ với `y` bị xáo trộn (`rng.permutation(y)`). Điểm phải
rơi về mức đoán bừa. Không rơi nghĩa là có rò rỉ, và phép thử này mất đúng một dòng code.

## Related Topics

- [Thiết kế API của Scikit-Learn](../reference/sklearn-api-design.md) — ba giao diện và vì sao pipeline chặn được lỗi này
- [Overfitting và underfitting](../reference/overfitting-underfitting.md) — bảng chẩn đoán, dòng "lỗi test thấp hơn lỗi train"
- [Metric hiệu năng](../reference/performance-metrics.md) — con số đẹp mà vô nghĩa
- [Foundations](../index.md) — chủ đề chứa file này
