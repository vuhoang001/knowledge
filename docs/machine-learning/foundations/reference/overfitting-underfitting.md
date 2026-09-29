---
title: Overfitting và underfitting
sidebar_position: 6
description: "Model xấu theo hai hướng ngược nhau, và cách chữa cũng chạy ngược nhau. Quy tắc 'tên có chữ w' đúng 4/4 và không nói gì về thế giới."
tags: [overfitting, underfitting, regularization, hyperparameter, bias-variance, homl3, chuong-1]
domain: ai
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-29
---

# Overfitting và underfitting

> **Chốt:** Overfitting là model **quá phức tạp so với dữ liệu của nó**; underfitting là
> quá đơn giản. Chữ **"so với"** gánh cả ý nghĩa: **không model nào tự nó quá phức tạp**
> — một đường cong overfit 27 quốc gia có thể vừa khít với 27 triệu dòng.

## Mục tiêu

Biến câu hỏi *"model này có tốt không"* thành một chẩn đoán hai chiều, và **biết phải
sửa gì tiếp** — vì thuốc chữa hai bệnh này **chạy ngược chiều nhau**, uống nhầm là làm
bệnh nặng thêm.

## Tổng quan

### Hai đầu của cùng một dải

```text
qua don gian  <----- can bang -----> qua phuc tap
UNDERFITTING                         OVERFITTING
sai ngay ca tren               tot tren train,
du lieu train                  te tren du lieu moi
```

### Bảng chẩn đoán

| Lỗi train | Lỗi test | Chẩn đoán | Sửa gì |
|---|---|---|---|
| Cao | Cao | **Underfit** | Model mạnh hơn, feature tốt hơn, **bớt** regularization |
| Thấp | Cao | **Overfit** | Đơn giản hoá, **thêm dữ liệu**, bớt nhiễu, **thêm** regularization |
| Thấp | Thấp | Vừa | Dừng lại, đừng nghịch thêm |
| Cao | **Thấp** | Nghi có bug | Test set rò vào train, hoặc chia dữ liệu sai |

Dòng cuối hay bị bỏ qua: lỗi test **thấp hơn đáng kể** lỗi train gần như luôn là lỗi
lập trình, không phải may mắn. Xem
[case study rò rỉ](../case-studies/chon-feature-truoc-khi-tach.md).

### Overfitting: học cả nhiễu

Model làm tốt trên tập train nhưng **khái quát hoá kém**. Xảy ra khi model **quá phức
tạp so với lượng dữ liệu và độ nhiễu của nó**.

Ba cách chữa:

1. **Đơn giản hoá model** — ít tham số hơn, lớp model đơn giản hơn, ít thuộc tính hơn.
2. **Lấy thêm dữ liệu train.**
3. **Giảm nhiễu** trong dữ liệu — sửa lỗi, bỏ outlier.

> **Chú ý hai trong ba cách chữa đổi *dữ liệu*, không đổi model.** Vì định nghĩa là
> "phức tạp **so với** dữ liệu", **bạn được phép dịch chuyển vế nào cũng được**.

### Bias và variance

| | Bias cao | Variance cao |
|---|---|---|
| Nguyên nhân | Giả định sai về hình dạng dữ liệu | Quá nhạy với từng mẫu train |
| Biểu hiện | **Underfit** — sai đều ở mọi nơi | **Overfit** — đổi vài dòng train là đổi model |
| Ví dụ | Đường thẳng cho dữ liệu cong | Cây quyết định không giới hạn độ sâu |
| Chữa bằng | Model phức tạp hơn | Nhiều dữ liệu hơn, regularization |

Tăng độ phức tạp thì **bias giảm, variance tăng**. Đó là toàn bộ nội dung của
"bias/variance trade-off". Chỗ tối ưu nằm ở giữa và **không tìm được bằng lý thuyết**.

### Regularization và hyperparameter

**Regularization** là ràng buộc model cho đơn giản lại để giảm overfitting; cường độ
điều khiển bằng một **hyperparameter**.

| | Model parameter | Hyperparameter |
|---|---|---|
| Thuộc về | **model** | **thuật toán học** |
| Ví dụ | `theta_0`, `theta_1` | cường độ regularization, `k` của k-NN |
| Ai đặt | **training** | **bạn**, trước khi train |
| Trong lúc train | bị chỉnh để khớp | **đứng yên** |
| Ví von | giá trị mà job tính ra | một `--conf` truyền lúc submit job |

**Degrees of freedom — cách dễ nhất để thấy regularization làm gì.** Model tuyến tính
có hai tham số, nên thuật toán có **hai bậc tự do**: θ₀ chỉnh độ cao, θ₁ chỉnh độ dốc.

- Ép θ₁ = 0 → còn **một** bậc tự do. Chỉ nâng lên hạ xuống được, và nó dừng quanh **giá
  trị trung bình**.
- Cho θ₁ thay đổi nhưng **phải nhỏ** → giữa một và hai bậc tự do. **Đó chính là
  regularization.**

> **Regularization là một núm vặn, và cả hai đầu đều là thất bại.** Vặn quá nhẹ thì model
> bám nhiễu. Vặn quá mạnh thì độ dốc ghim về 0, đường phẳng ra quanh trung bình: **không
> overfit được, và cũng không học được gì.** Nên cường độ là thứ phải **tinh chỉnh và
> đo**, không bao giờ đặt một lần theo nguyên lý — và vì nó là hyperparameter, **training
> không chọn hộ bạn được.**

### Underfitting: quá đơn giản để học

Model quá đơn giản để nắm cấu trúc bên dưới, nên dự đoán **sai ngay cả trên chính các ví
dụ train**. Thuốc chữa chạy ngược lại:

1. Chọn model **mạnh hơn**, nhiều tham số hơn.
2. Đưa vào **feature tốt hơn** — feature engineering.
3. **Nới** ràng buộc bằng cách giảm hyperparameter regularization.

## Ví dụ

Chạy thật 29/09/2026 tại `~/learn-lab/ml` — Python 3.12.3, scikit-learn 1.9.1, trên bộ
dữ liệu 36 quốc gia của sách (`lifesat_full.csv`).

### 1 · Quy tắc "tên có chữ w" — hình dạng chung của overfitting

```text
quy tac 'ten co chu w' tren 36 nuoc:
   New Zealand    7.3
   Sweden         7.3
   Norway         7.6
   Switzerland    7.5
   -> 4/4 tren 7, trong khi ca bang chi 12/36 tren 7
```

Đưa cho một model linh hoạt một thuộc tính vô nghĩa — **tên quốc gia** — và nó có thể
nhận ra rằng **mọi** nước có chữ *w* trong tên đều có life satisfaction trên 7.

Bằng SQL: nó đã học `CASE WHEN country LIKE '%w%' THEN 'tren 7'`. **Đúng 4 trên 4.**
Trong khi cả bảng chỉ có **12 trên 36** nước vượt 7 — nên đoán bừa chỉ đúng một phần ba.

Và nó là **thuần tuý ngẫu nhiên**. Không có gì nói nó đúng cho **Rwanda** hay **Zimbabwe**.

> **Một quy tắc hoàn hảo trên tập train là bằng chứng về *tập train đó*, không phải về
> thế giới.** Đó chính xác là lý do bài sau giữ dữ liệu lại.

### 2 · Đường cong quá linh hoạt

```text
RMSE tren 36 nuoc:  duong thang 0.61   da thuc bac 10 0.29
```

Đa thức bậc 10 lệch 36 quốc gia **0,29** điểm; đường thẳng lệch **0,61**. Đường cong
**trông tốt hơn gấp đôi** — cho tới khi hỏi nó về những mức thu nhập nó chưa thấy:

| GDP đầu người | đa thức bậc 10 dự đoán |
|---|---|
| 75.000 | 8,13 |
| 80.000 | 8,34 |
| 100.000 | **4,64** |

Giữa 80.000 và 100.000, dự đoán **rơi 3,7 điểm** mà không có gì trong dữ liệu biện minh.
Đường cong đã đi theo nhiễu của 36 điểm, và **ở giữa chúng nó không mang nghĩa gì**.

> **Một phát hiện khi tái hiện, không có trong sách.** Sách in những con số ngoại suy
> khác hẳn (−0,20 tại 80.000; **136,25** tại 100.000). Chúng tôi tái hiện **đúng con số
> RMSE 0,29**, nhưng phần ngoại suy thì **phụ thuộc mạnh vào cách chuẩn hoá đầu vào**:
>
> ```text
> chia 1e4         RMSE train 0.60 | 75k         8.88 | 80k         8.86 | 100k           2.33
> chia 1e5         RMSE train 0.29 | 75k         8.13 | 80k         8.34 | 100k           4.64
> StandardScaler   RMSE train 0.30 | 75k        10.25 | 80k        13.45 | 100k         -64.43
> ```
>
> **Bản thân sự bất ổn đó mới là bài học.** Cùng một bậc 10, cùng một dữ liệu, chia đầu
> vào cho 1e4 hay 1e5 hay chuẩn hoá — ra **2,33 / 4,64 / −64,43** tại cùng một điểm. Một
> model overfit không chỉ sai; nó **sai theo cách không tái lập được**, vì lời giải của
> nó nằm ở vùng số học không ổn định.

### 3 · Regularization, bằng số

```text
duong tren 27 nuoc: 3.749 + 0.0000678 x GDP
Ridge (alpha=3e9) tren 27 nuoc: he so 0.0000302 -> Luxembourg 8.64
duong tren 36 nuoc: 5.580 + 0.0000233 x GDP  ->  Luxembourg 8.15
```

| Model | Train trên | Độ dốc | Luxembourg (GDP 110.261, thật 6,9) |
|---|---|---|---|
| Đường thẳng thường | 27 nước | 0,0000678 | **11,22** — vượt trần thang 0–10 |
| **Ridge, regularization rất mạnh** | **27 nước** | 0,0000302 | **8,64** |
| Đường thẳng thường | **36 nước** (sự thật đầy đủ) | 0,0000233 | 8,15 |

Đọc kỹ dòng giữa: **Ridge chỉ nhìn thấy đúng 27 quốc gia như đường dốc kia**, nhưng một
ràng buộc giữ độ dốc của nó xuống, và nó **hạ cánh gần như đúng chỗ của đường biết cả
36 nước** — 8,64 so với 8,15, thay vì 11,22.

**Đó chính là thứ regularization mua được:** khớp dữ liệu train **kém đi một chút**, khái
quát hoá **tốt hơn đáng kể**.

*(Sách in 0,0000293 và 8,58; chúng tôi ra 0,0000302 và 8,64 — chênh lệch đến từ giá trị
`alpha` cụ thể, sách không công bố. Kết luận không đổi.)*

## Trade-offs

| Model phức tạp hơn | Model đơn giản hơn |
|---|---|
| Bias thấp — bắt được quan hệ phi tuyến | Bias cao — bỏ sót cấu trúc thật |
| Variance cao — nhạy với nhiễu | Variance thấp — ổn định |
| Cần nhiều dữ liệu hơn để không overfit | Chạy tốt với ít dữ liệu |
| Khó giải thích, **và ngoại suy bất ổn** | Dễ giải thích, dễ bảo vệ |

| Thêm dữ liệu | Thêm regularization |
|---|---|
| Chữa overfit **mà không tăng bias** | Chữa overfit **bằng cách tăng bias** |
| Đắt, chậm, đôi khi bất khả thi | Rẻ, chỉ là một tham số |
| **Không chữa được underfit** | **Làm underfit nặng thêm** |

**Khi underfit thì thêm dữ liệu là vô ích.** Đây là kết luận thực dụng nhất của cả bài,
và nó tiết kiệm được nhiều tuần.

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Chỉ báo cáo lỗi train | Đa thức bậc 10 trông tốt gấp đôi đường thẳng |
| Chọn model bằng **test set** | Test set thành tập train thứ hai; điểm báo cáo là điểm giả |
| Thấy overfit là đi xin thêm dữ liệu ngay | Đôi khi đúng, nhưng phải **kiểm underfit trước** |
| Coi "thừa tham số = overfit" | Chữ **"so với"** mới là chỗ quyết định, không phải số tham số |
| Đặt cường độ regularization một lần theo nguyên lý | Cả hai đầu núm vặn đều là thất bại; phải đo |
| Đi tìm hyperparameter trong output của `fit` | Nó không ở đó — training không chạm vào nó |
| Tin một model overfit ở ngoài vùng dữ liệu | Không chỉ sai, mà **sai không tái lập được** |
| Tin lỗi test thấp hơn lỗi train | Gần như luôn là rò rỉ |

## FAQ

<details>
<summary>Model đạt 99% trên train và 62% trên tập giữ lại. Bệnh gì, và hai cách chữa?</summary>

**Overfitting** — định nghĩa đúng nguyên văn: tốt trên dữ liệu train, tệ trên dữ liệu
mới. Hai cách chữa bất kỳ trong ba: **đơn giản hoá model** (ít tham số, ít feature),
**lấy thêm dữ liệu train**, hoặc **giảm nhiễu** (sửa lỗi, bỏ outlier).

Cách thứ tư không nằm trong ba cái đó nhưng thường là cái rẻ nhất: **tăng regularization**.

</details>

<details>
<summary>Cường độ regularization chọn thế nào, khi không được phép chỉnh trên test set?</summary>

Bằng **validation set** hoặc cross-validation — cả hai cắt ra từ tập train. Trong
`scikit-learn`, `Ridge` có tham số `alpha`, và `GridSearchCV` dò giá trị cho nó.

Test set chỉ được chạm **một lần**, ở cuối. Xem
[Kiểm thử và thẩm định](testing-and-validating.md).

</details>

<details>
<summary>Vì sao quy tắc "chữ w" lại là ví dụ tốt, khi không ai đưa tên nước vào model?</summary>

Vì nó là **hình dạng chung** ở dạng dễ thấy nhất. Đưa cho một model đủ linh hoạt **đủ
nhiều cột và đủ ít dòng**, nó sẽ **luôn** tìm được một quy tắc đúng với mọi dòng train.

Trong dự án thật, "chữ w" là một ID khách hàng tương quan tình cờ với nhãn, một timestamp
mã hoá thứ tự nạp dữ liệu, hay một mã chi nhánh chỉ xuất hiện trong dữ liệu cũ. Xem
[case study: 86,67% trên dữ liệu ngẫu nhiên](../case-studies/chon-feature-truoc-khi-tach.md)
— cùng cơ chế, 5.000 cột nhiễu.

</details>

<details>
<summary>Độ phức tạp "so với dữ liệu" — có cách nào ước lượng ngưỡng không?</summary>

Không có công thức chung, nhưng có một tỷ lệ đáng nhìn: **số tham số so với số dòng**.
Đa thức bậc 10 có 11 tham số cho 36 dòng — khoảng 3 dòng cho mỗi tham số. Đường thẳng có
2 tham số cho 36 dòng — 18 dòng mỗi tham số.

Đây là dấu hiệu, không phải ngưỡng. Cách chắc chắn duy nhất vẫn là **đo trên dữ liệu giữ
lại**.

</details>

<details>
<summary>Vì sao ngoại suy của đa thức lại phụ thuộc vào cách chia đầu vào?</summary>

Vì `PolynomialFeatures(10)` tạo ra các cột từ x tới x¹⁰. Với GDP cỡ 10⁵, cột x¹⁰ có độ
lớn cỡ 10⁵⁰ — vượt xa khả năng biểu diễn ổn định của số thực 64 bit. Bài toán trở nên
**điều kiện xấu** (*ill-conditioned*): những thay đổi cực nhỏ ở đầu vào làm hệ số nhảy rất xa.

Đó cũng là lý do thực hành chuẩn là **luôn scale trước khi tạo feature đa thức** — và
lý do `make_pipeline(PolynomialFeatures(d), StandardScaler(), LinearRegression())` là
thứ tự đáng dùng.

</details>

## Related Topics

- [Dữ liệu xấu](bad-data.md) — nhánh còn lại của cây "cái gì có thể hỏng"
- [Kiểm thử và thẩm định](testing-and-validating.md) — cách phát hiện hai bệnh này bằng số
- [Instance-based và model-based](instance-vs-model-based.md) — parameter so với hyperparameter
- [Metric hiệu năng](performance-metrics.md) — RMSE và các thước đo khác
- [Thiết kế API của Scikit-Learn](sklearn-api-design.md) — pipeline giữ test set sạch
- [Case study: chọn feature trước khi tách](../case-studies/chon-feature-truoc-khi-tach.md)

## References

- Aurélien Géron — *Hands-On Machine Learning*, 3rd ed., chương 1, bài b10
