---
title: Chọn k bằng test set — con số đẹp hơn 12,1%
sidebar_position: 4
description: "Thử 12 giá trị k rồi giữ cái có điểm test tốt nhất. Đo trên 200 lần chia: con số báo cáo lạc quan 12,1%, và 184/200 lần nó đẹp hơn sự thật."
tags: [test-set, hyperparameter, selection-bias, cross-validation, machine-learning, homl3]
domain: ai
category: concept
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-09-29
---

# Chọn k bằng test set — con số đẹp hơn 12,1%

> **Chốt:** Bạn không cần **train** trên một tập để làm hỏng nó. Thử 12 giá trị `k` rồi
> giữ cái có điểm test thấp nhất là **đã khớp một con số — chính lựa chọn đó — vào tập
> test**. Đo trên 200 lần chia: con số báo cáo **lạc quan 12,1%**, và **184/200 lần** nó
> đẹp hơn sự thật.

## Tình huống

k-nearest neighbours trên bộ 36 quốc gia. `k` là hyperparameter — không có giá trị đúng
theo lý thuyết, phải chọn bằng cách đo.

Quy trình nghe hoàn toàn hợp lý: thử `k` từ 1 tới 12, giữ cái cho điểm test tốt nhất,
báo cáo điểm đó.

## Giả thuyết ban đầu — và nó sai ở đâu

> "Tôi có train trên test set đâu. Tôi chỉ *đo* trên nó thôi."

Đúng là không train. Nhưng **ra một quyết định từ một tập cũng là khớp vào tập đó** —
chỉ là khớp đúng một tham số: *lựa chọn*. Chọn cái tốt nhất trong 12 lần thử nghĩa là
chọn **cái may mắn nhất trên đúng tập test này**, và may mắn không tái lập được.

Điểm đó không còn là ước lượng **không thiên lệch** của generalization error nữa. Nó là
**điểm đẹp nhất trong 12 lần thử**.

## Tái hiện

Chạy thật 29/09/2026 tại `~/learn-lab/ml` — Python 3.12.3, scikit-learn 1.9.1, trên
`lifesat_full.csv` (36 quốc gia).

Một lần chia trước, để thấy hình dạng:

```text
  k  RMSE test  RMSE cross-val
--------------------------------
  1     0.5673          0.5849
  2     0.5933          0.4975
  3     0.5497          0.4124
  4     0.5095          0.4165
  5     0.4754          0.4033
  6     0.4909          0.4284
  7     0.5118          0.4586
  8     0.4735          0.4978
  9     0.5099          0.5208
 10     0.5091          0.5268
 11     0.5326          0.5821
 12     0.5419          0.6169

chon k bang TEST SET      -> k=8, bao cao RMSE 0.4735
chon k bang CROSS-VAL     -> k=5, RMSE that tren test 0.4754
```

Chênh lệch chỉ **0,0019**. Nhìn một lần chia thì lỗi này trông **vô hại** — và đó chính
là lý do nó sống sót trong rất nhiều dự án.

Đo trên 200 lần chia mới thấy:

```python
for seed in range(200):
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.3, random_state=seed)
    te = {k: rmse(yte, KNeighborsRegressor(n_neighbors=k).fit(Xtr, ytr).predict(Xte)) for k in KS}
    cv = {k: -cross_val_score(KNeighborsRegressor(n_neighbors=k), Xtr, ytr,
                              scoring="neg_root_mean_squared_error", cv=4).mean() for k in KS}
    gian.append(te[min(te, key=te.get)])    # chon bang chinh test set
    that.append(te[min(cv, key=cv.get)])    # chon bang cross-val
```

## Kết quả

```text
200 lan chia 70/30 tren 36 nuoc, do 12 gia tri k moi lan

chon k bang TEST SET, roi bao cao diem test do : 0.4182
chon k bang CROSS-VAL, roi bao cao diem test   : 0.4760

do lac quan trung binh                         : 0.0578 RMSE  (12.1% qua dep)
so lan cach gian cho diem 'tot hon'             : 184/200
so lan hai cach chon cung mot k                 : 16/200
```

| | RMSE báo cáo | Ý nghĩa |
|---|---|---|
| Chọn `k` bằng test set | **0,4182** | Điểm đẹp nhất trong 12 lần thử — **không phải ước lượng** |
| Chọn `k` bằng cross-validation | **0,4760** | Ước lượng trung thực của generalization error |
| **Độ lạc quan** | **0,0578** | **12,1% quá đẹp** |

Và **184/200 lần**, cách gian cho ra con số "tốt hơn". Nó gần như **luôn luôn** làm bạn
trông giỏi hơn thực tế.

## Cơ chế

Với mỗi giá trị `k`, điểm test là *hiệu năng thật* cộng *nhiễu của đúng tập test này*.
Lấy giá trị **nhỏ nhất** trong 12 con số như vậy là chọn ra cái có **nhiễu âm lớn nhất** —
không phải cái có hiệu năng thật tốt nhất.

Càng thử nhiều giá trị, độ lạc quan càng lớn. Ở đây mới 12 giá trị trên một feature.
Một `GridSearchCV` thật thường dò **hàng trăm tổ hợp**, và cùng cơ chế đó áp lên đúng
tập test.

Cross-validation không bị vì nó chọn trên các fold **cắt ra từ tập train**. Test set
chưa bao giờ tham gia vào quyết định, nên khi cuối cùng đo trên nó, con số vẫn trung thực.

## Cách chặn

```python
# DUNG — chon tren cac fold cat ra tu TRAIN, roi cham test set dung mot lan
gs = GridSearchCV(KNeighborsRegressor(), {"n_neighbors": range(1, 13)},
                  scoring="neg_root_mean_squared_error", cv=5)
gs.fit(X_train, y_train)          # test set chua bi cham
final = gs.best_estimator_        # da tu train lai tren toan bo X_train
print(rmse(y_test, final.predict(X_test)))   # LAN DUY NHAT
```

Ba luật rút ra:

1. **Một tập, một câu hỏi.** Test set trả lời *"kẻ thắng sai bao nhiêu"*, và chỉ trả lời
   **một lần**.
2. **Đếm số lần đã chạm vào test set.** Một test set đã quyết định 50 lần thì không còn
   là mẫu chưa thấy. Ghi con số đó cạnh điểm báo cáo.
3. **Báo cáo điểm cross-validation làm kết quả cuối cũng là cùng một lỗi**, ở một tầng
   khác — xem FAQ trong [Kiểm thử và thẩm định](../reference/testing-and-validating.md).

## Dấu hiệu nhận ra trong dự án thật

| Dấu hiệu | Mức nghi ngờ |
|---|---|
| Điểm test tốt hơn điểm cross-validation | **Rất cao** — thứ tự ngược so với bình thường |
| Trong code có vòng lặp chọn model dùng `X_test` | Chắc chắn |
| Điểm offline đẹp, production kém hẳn | Muộn rồi, nhưng đúng triệu chứng |
| Không ai nhớ đã chạy trên test set bao nhiêu lần | Không đo được độ lạc quan |
| Số tổ hợp hyperparameter đã dò rất lớn | Độ lạc quan tăng theo số lần thử |

## Related Topics

- [Kiểm thử, thẩm định và train-dev set](../reference/testing-and-validating.md) — một tập một câu hỏi, và holdout validation năm bước
- [Instance-based và model-based](../reference/instance-vs-model-based.md) — `k` là hyperparameter, không phải parameter
- [Overfitting và underfitting](../reference/overfitting-underfitting.md) — cường độ regularization chọn cùng cách này
- [Case study: chọn feature trước khi tách](chon-feature-truoc-khi-tach.md) — cùng họ lỗi, ở bước tiền xử lý
- [Foundations](../index.md)
