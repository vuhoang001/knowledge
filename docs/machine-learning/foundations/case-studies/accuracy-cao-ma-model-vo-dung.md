---
title: Accuracy 89,81% cho một model không làm gì cả
sidebar_position: 2
description: "DummyClassifier luôn trả về 'không' đạt accuracy 0.8981 trên dữ liệu lệch lớp, trong khi precision và recall đều bằng 0."
tags: [metrics, accuracy, precision, recall, class-imbalance, homl3]
domain: ai
category: concept
doc_type: case-study
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-29
---

# Accuracy 89,81% cho một model không làm gì cả

> **Chốt:** Một classifier trả về `False` cho **mọi** đầu vào đạt accuracy **0.8981**.
> Cùng model đó có precision, recall và F1 đều bằng **0.0000**. Cả bốn con số đều đúng —
> chỉ có ba trong số đó là trung thực.

## Tình huống

Bài toán nhận dạng chữ số viết tay, thu về dạng nhị phân: *"ảnh này có phải chữ số 5
không"*. Đây đúng là bài toán mở đầu chương 3 của HOML3.

Lớp dương — chữ số 5 — chiếm khoảng **10%** dữ liệu. Chín ảnh trên mười **không** phải
số 5.

## Giả thuyết ban đầu — và nó sai ở đâu

> "Accuracy gần 90% thì model này dùng được rồi."

Accuracy đếm cả `TN` (đoán đúng lớp âm). Khi lớp âm chiếm 90% dữ liệu, `TN` áp đảo tử
số và accuracy biến thành phép đo *"lớp âm có đông không"* — một sự thật về **dữ liệu**,
không phải về **model**.

## Tái hiện

Chạy thật 29/09/2026 tại `~/learn-lab/ml` — Python 3.12.3, scikit-learn 1.9.1.
Seed `random_state=42`.

```python
X, y = load_digits(return_X_y=True)
y5 = (y == 5)
Xtr, Xte, ytr, yte = train_test_split(X, y5, test_size=0.3, random_state=42, stratify=y5)

dummy = DummyClassifier(strategy="most_frequent").fit(Xtr, ytr)   # luon doan "khong"
sgd   = SGDClassifier(random_state=42, max_iter=1000).fit(Xtr, ytr)
```

`DummyClassifier(strategy="most_frequent")` **không học gì cả** — nó đếm xem lớp nào
đông hơn trong tập train rồi trả về lớp đó mãi mãi.

## Kết quả

```text
ty le lop duong trong train: 0.1010  (127/1257)
ty le lop duong trong test : 0.1019  (55/540)

DummyClassifier (luon doan 'khong')
   accuracy : 0.8981
   precision: 0.0000
   recall   : 0.0000
   F1       : 0.0000

SGDClassifier
   accuracy : 0.9926
   precision: 0.9811
   recall   : 0.9455
   F1       : 0.9630

confusion matrix cua SGDClassifier  [[TN FP] [FN TP]]:
[[484   1]
 [  3  52]]

ROC-AUC cua SGDClassifier: 0.9972
ROC-AUC cua Dummy        : 0.5000
```

| Metric | Dummy | SGD | Metric này có lột mặt được Dummy không |
|---|---|---|---|
| Accuracy | **0.8981** | 0.9926 | ❌ Không — 89,81% nghe như dùng được |
| Precision | 0.0000 | 0.9811 | ✅ Có |
| Recall | 0.0000 | 0.9455 | ✅ Có |
| F1 | 0.0000 | 0.9630 | ✅ Có |
| ROC-AUC | 0.5000 | 0.9972 | ✅ Có — và 0.5 là mốc đoán bừa tuyệt đối |

## Cơ chế

Tập test có 540 ảnh, trong đó 55 là số 5 và 485 không phải.

`DummyClassifier` trả về `False` cho cả 540:

```text
TN = 485    FP = 0
FN = 55     TP = 0
```

- Accuracy = `(0 + 485) / 540` = **0.8981** — `TN` một mình gánh toàn bộ con số.
- Precision = `0 / (0 + 0)` → quy ước bằng 0. **Không có `TN` ở đâu cả.**
- Recall = `0 / (0 + 55)` = 0. Cũng không có `TN`.

Đó là toàn bộ cơ chế: **precision và recall sống sót qua dữ liệu lệch lớp vì công thức
của chúng không chứa `TN`.**

## Con số đáng chú ý thứ hai

Nhìn confusion matrix của `SGDClassifier`:

```text
[[484   1]
 [  3  52]]
```

Chỉ **1 báo động giả** nhưng **3 ca bỏ sót**. Vì thế recall (0.9455) thấp hơn precision
(0.9811). F1 = 0.9630 gộp hai số đó thành một và **giấu mất sự mất cân bằng này**.

Với nhận dạng chữ số thì không sao. Nếu cùng ma trận đó đến từ một hệ sàng lọc ung thư,
con số phải đưa lên đầu báo cáo là **3 ca bỏ sót**, không phải "F1 = 0,96".

## Cách chặn

1. **Luôn chạy `DummyClassifier` làm mốc sàn.** Một dòng code. Model thật không vượt nó
   rõ rệt thì hoặc feature vô dụng, hoặc có bug.

   ```python
   DummyClassifier(strategy="most_frequent").fit(Xtr, ytr).score(Xte, yte)
   ```

2. **Báo cáo tỷ lệ lớp cùng với mọi metric.** "Accuracy 0.8981" là vô nghĩa nếu không
   đi kèm "lớp dương chiếm 10,19%".

3. **Không bao giờ báo cáo accuracy một mình** trên bài toán lệch lớp. Tối thiểu phải có
   precision, recall, và confusion matrix.

4. **Đừng quên `stratify=y`** khi tách. Thiếu nó thì tỷ lệ lớp lệch giữa train và test,
   và mọi metric trôi theo một cách không tái lập được.

## Related Topics

- [Metric hiệu năng](../reference/performance-metrics.md) — công thức đầy đủ và cách chọn metric
- [Bản đồ Machine Learning](../reference/ml-landscape.md) — metric là chữ **P**, phải chốt trước khi train
- [Case study: chọn feature trước khi tách](chon-feature-truoc-khi-tach.md) — kiểu số đẹp mà vô nghĩa còn lại
- [Foundations](../index.md) — chủ đề chứa file này
