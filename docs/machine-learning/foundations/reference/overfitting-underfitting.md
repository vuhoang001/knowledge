---
title: Overfitting và underfitting
sidebar_position: 2
description: "Học thuộc lòng khác với học. Đo bằng khoảng cách giữa lỗi train và lỗi test, và so với sàn nhiễu."
tags: [overfitting, underfitting, bias-variance, regularization, homl3]
domain: ai
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-29
---

# Overfitting và underfitting

> **Chốt:** Mô hình không có nhiệm vụ khớp dữ liệu train — nó có nhiệm vụ khớp dữ liệu
> **chưa từng thấy**. Lỗi train thấp mà lỗi test cao là **overfit**; cả hai cùng cao là
> **underfit**. Không nhìn cả hai con số thì không biết mình đang ở đâu.

## Mục tiêu

Biến câu hỏi mơ hồ *"model này có tốt không"* thành một phép đo có hai số, và từ hai số
đó **suy ra phải sửa gì tiếp** — chứ không phải thử bừa.

## Tổng quan

### Ba con số, không phải một

| Số | Ý nghĩa | Đọc thế nào |
|---|---|---|
| **Lỗi train** | Model khớp dữ liệu nó đã thấy đến đâu | Cao = model quá yếu |
| **Lỗi test** | Model khớp dữ liệu mới đến đâu | Đây mới là con số thật |
| **Sàn nhiễu** | Lỗi thấp nhất **về lý thuyết** có thể đạt | Không có mô hình nào xuống dưới mà còn đúng |

Sàn nhiễu là thứ hay bị bỏ quên nhất. Nếu nhãn có nhiễu với độ lệch chuẩn 1.0 thì RMSE
1.0 là **hoàn hảo**, không phải kém. Đuổi theo RMSE 0.3 nghĩa là đang học thuộc nhiễu.

### Bảng chẩn đoán

| Lỗi train | Lỗi test | Chẩn đoán | Sửa gì |
|---|---|---|---|
| Cao | Cao | **Underfit** | Model mạnh hơn, thêm feature, bớt regularization |
| Thấp | Cao | **Overfit** | Thêm dữ liệu, bớt feature, tăng regularization |
| Thấp | Thấp | Vừa | Dừng lại, đừng nghịch thêm |
| Cao | **Thấp** | Nghi ngờ — thường là bug | Test set rò vào train, hoặc chia dữ liệu sai |

Dòng cuối là dòng hay bị bỏ qua. Lỗi test **thấp hơn** lỗi train một cách đáng kể gần
như luôn là lỗi lập trình, không phải may mắn.

### Bias và variance

Hai nguyên nhân khác nhau dẫn tới lỗi, và chúng **kéo ngược chiều nhau**:

| | Bias cao | Variance cao |
|---|---|---|
| Nguyên nhân | Giả định sai về hình dạng dữ liệu | Quá nhạy với từng mẫu train |
| Biểu hiện | Underfit — sai đều ở mọi nơi | Overfit — đổi vài dòng train là đổi model |
| Ví dụ | Dùng đường thẳng cho dữ liệu cong | Cây quyết định không giới hạn độ sâu |
| Chữa bằng | Model phức tạp hơn | Nhiều dữ liệu hơn, regularization |

**Tăng độ phức tạp của model thì bias giảm, variance tăng.** Đó là toàn bộ nội dung của
"bias/variance trade-off". Chỗ tối ưu nằm ở giữa, và **không tìm được bằng lý thuyết** —
phải đo.

### Regularization: ghìm model lại có chủ đích

Regularization là **cố tình làm model kém đi trên tập train** để nó tốt hơn trên tập
test. Ba cách thông dụng, chi tiết ở [Regularization](#):

- Ràng buộc tham số (Ridge, Lasso)
- Giới hạn cấu trúc (`max_depth` của cây)
- Dừng sớm (early stopping)

## Ví dụ

Chạy thật 29/09/2026 tại `~/learn-lab/ml` — Python 3.12.3, scikit-learn 1.9.1,
numpy 2.5.3. Seed `default_rng(42)` và `random_state=42`.

Dữ liệu sinh từ một đa thức **bậc 2** cộng nhiễu chuẩn `sigma = 1.0`. Vì biết công thức
thật nên biết luôn đáp án: bậc 2 là đúng, và RMSE 1.0 là sàn.

```python
rng = np.random.default_rng(42)
X = rng.uniform(-3, 3, size=(60, 1))
y = 0.5 * X[:, 0] ** 2 + X[:, 0] + 2 + rng.normal(0, 1, 60)   # bac 2 + nhieu
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.3, random_state=42)

for d in (1, 2, 3, 10, 25):
    m = make_pipeline(PolynomialFeatures(d), StandardScaler(), LinearRegression()).fit(Xtr, ytr)
```

```text
san nhieu ly thuyet (do lech chuan cua nhieu) = 1.000 — khong mo hinh nao xuong duoi ma con dung

 bac  RMSE train  RMSE test  chenh lech  chan doan
----------------------------------------------------------
   1       1.304      1.735       0.431  underfit (train > san nhieu)
   2       0.722      0.845       0.123  vua
   3       0.707      0.797       0.089  vua
  10       0.583      0.813       0.231  vua
  25       0.550      2.414       1.864  overfit
```

Bốn điều đọc được, không điều nào thấy được nếu chỉ nhìn một con số:

1. **Bậc 1 underfit.** RMSE train 1.304 **cao hơn sàn nhiễu 1.0** — model còn chưa học
   xong cái học được. Thêm dữ liệu ở đây là vô ích.
2. **Bậc 2 là đáp án đúng**, và đúng là nó cho khoảng cách train/test nhỏ nhất trong
   nhóm hợp lý (0.123).
3. **Bậc 10 vẫn ổn một cách bất ngờ** — RMSE test 0.813. Thừa tham số không tự động là
   thảm hoạ khi dữ liệu còn đủ.
4. **Bậc 25 thì sập.** Train 0.550 (đã chui xuống dưới sàn nhiễu — dấu hiệu học thuộc
   nhiễu), test 2.414. **Lỗi test gấp 4,4 lần lỗi train.**

Chú ý con số quan trọng nhất: ở bậc 25, **RMSE train đẹp hơn mọi bậc khác**. Một người
chỉ báo cáo lỗi train sẽ kết luận bậc 25 là model tốt nhất.

## Trade-offs

| Model phức tạp hơn | Model đơn giản hơn |
|---|---|
| Bias thấp — bắt được quan hệ phi tuyến | Bias cao — bỏ sót cấu trúc thật |
| Variance cao — nhạy với nhiễu | Variance thấp — ổn định |
| Cần nhiều dữ liệu hơn để không overfit | Chạy tốt với ít dữ liệu |
| Khó giải thích | Dễ giải thích, dễ bảo vệ trước nghiệp vụ |

| Thêm dữ liệu | Thêm regularization |
|---|---|
| Chữa được overfit **mà không tăng bias** | Chữa overfit bằng cách **tăng bias** |
| Đắt, chậm, đôi khi bất khả thi | Rẻ, chỉ là một tham số |
| **Không chữa được underfit** | Làm underfit nặng thêm |

**Khi underfit thì thêm dữ liệu là vô ích.** Đây là kết luận thực dụng nhất của cả mục
này, và nó tiết kiệm được nhiều tuần: đo lỗi train trước, thấy nó cao hơn sàn nhiễu thì
đừng đi xin thêm dữ liệu.

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Chỉ báo cáo lỗi train | Bậc 25 trông như model tốt nhất — xem ví dụ trên |
| Không ước lượng sàn nhiễu | Đuổi theo RMSE bất khả thi, học thuộc nhiễu |
| Chọn model bằng **test set** | Test set thành tập train thứ hai; điểm báo cáo là điểm giả |
| Thấy overfit là đi xin thêm dữ liệu ngay | Đôi khi đúng, nhưng phải kiểm underfit trước |
| Coi "thừa tham số = overfit" | Bậc 10 ở trên vẫn ổn; điều quyết định là tỷ lệ tham số / dữ liệu |
| Tin lỗi test thấp hơn lỗi train | Gần như luôn là rò rỉ dữ liệu — xem [Scikit-Learn API](sklearn-api-design.md) |

## FAQ

<details>
<summary>Làm sao ước lượng sàn nhiễu khi không biết công thức sinh dữ liệu?</summary>

Không có cách chính xác, nhưng có ba cách xấp xỉ dùng được: lỗi của **người** làm cùng
việc đó; lỗi của hai lần đo lặp lại trên cùng một đối tượng; hoặc lỗi của model tốt
nhất đã biết trên cùng bộ dữ liệu. Có một con số thô còn hơn không có gì — không có nó
thì không biết khi nào nên dừng.

</details>

<details>
<summary>Nếu chọn model bằng test set là sai, thì chọn bằng gì?</summary>

Bằng **validation set** hoặc cross-validation, cả hai đều cắt ra từ tập train. Test set
chỉ được chạm đúng **một lần**, ở cuối cùng, để báo cáo. Chạm nhiều lần thì con số báo
cáo mất ý nghĩa — xem [Cross-validation](#).

</details>

<details>
<summary>Khoảng cách train/test bao nhiêu thì gọi là overfit?</summary>

Không có ngưỡng chung, vì nó phụ thuộc vào sàn nhiễu. Cách dùng được: so **tỷ lệ**
lỗi test / lỗi train và nhìn xu hướng khi tăng độ phức tạp. Trong ví dụ trên, tỷ lệ đi
1.33 → 1.17 → 1.13 → 1.39 → **4.39**. Chỗ nó bật lên là chỗ cần dừng.

</details>

<details>
<summary>Train-dev set là gì và khi nào cần?</summary>

Khi dữ liệu train khác phân phối với dữ liệu production (ví dụ: train bằng ảnh tải từ
web, chạy thật trên ảnh chụp điện thoại). Cắt thêm một phần từ *train* gọi là train-dev.
Lỗi cao trên train-dev = overfit; lỗi thấp trên train-dev nhưng cao trên dev thật =
**lệch phân phối**, không phải overfit. Hai bệnh này chữa khác nhau hoàn toàn.

</details>

## Related Topics

- [Bản đồ Machine Learning](ml-landscape.md) — loại bài toán quyết định cách chia dữ liệu
- [Metric hiệu năng](performance-metrics.md) — đo bằng cái gì thì "lỗi" mới có nghĩa
- [Thiết kế API của Scikit-Learn](sklearn-api-design.md) — pipeline là thứ giữ test set sạch
- [Case study: chọn feature trước khi tách](../case-studies/chon-feature-truoc-khi-tach.md) — lỗi test thấp giả
- [Foundations](../index.md) — chủ đề chứa file này

## References

- Aurélien Géron — *Hands-On Machine Learning*, 3rd ed., chương 1 và chương 4
