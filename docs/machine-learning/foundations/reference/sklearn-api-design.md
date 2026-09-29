---
title: Thiết kế API của Scikit-Learn
sidebar_position: 9
description: "Ba giao diện Estimator, Transformer, Predictor — và vì sao pipeline là thứ duy nhất giữ test set không bị rò."
tags: [scikit-learn, pipeline, estimator, transformer, data-leakage, homl3]
domain: ai
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-29
---

# Thiết kế API của Scikit-Learn

> **Chốt:** Cả thư viện chỉ có **ba giao diện** và chúng ghép được với nhau. Ghép bằng
> `Pipeline` không phải để code đẹp — nó là thứ **cơ học** ngăn tập test rò vào tập
> train. Làm tay thì rò, và rò một cách im lặng.

## Mục tiêu

Hiểu vì sao mọi thứ trong `scikit-learn` đều có cùng ba phương thức, và biến hiểu biết
đó thành một luật vận hành: **mọi bước biến đổi dữ liệu phải nằm trong pipeline.**

## Tổng quan

### Ba giao diện

| Giao diện | Phương thức | Nhiệm vụ | Ví dụ |
|---|---|---|---|
| **Estimator** | `fit(X, y)` | Học tham số từ dữ liệu, lưu vào thuộc tính có hậu tố `_` | mọi thứ |
| **Transformer** | `transform(X)` | Biến đổi dữ liệu bằng tham số đã học | `StandardScaler`, `SimpleImputer` |
| **Predictor** | `predict(X)` | Đưa ra dự đoán | `LinearRegression`, `SGDClassifier` |

Một lớp có thể mang nhiều vai. `StandardScaler` là Estimator + Transformer.
`LinearRegression` là Estimator + Predictor. `PCA` là cả ba.

**Quy ước dấu gạch dưới có ý nghĩa thật, không phải phong cách:**

| Tên | Nghĩa | Ví dụ |
|---|---|---|
| `alpha` (không gạch) | **Hyperparameter** — người đặt, trước khi fit | `Ridge(alpha=1.0)` |
| `coef_` (có gạch cuối) | **Tham số học được** — chỉ tồn tại sau `fit` | `lin.coef_` |

Nhìn tên là biết ai chịu trách nhiệm cho con số đó. Truy cập `coef_` trước khi `fit`
thì báo `NotFittedError` — cố ý, để lỗi lộ ra sớm.

### Vì sao `fit` và `transform` phải tách rời

Đây là chỗ toàn bộ thiết kế trả công:

```python
scaler.fit(X_train)          # HOC trung binh va do lech chuan — chi tu train
X_train_s = scaler.transform(X_train)
X_test_s  = scaler.transform(X_test)   # AP DUNG so da hoc, KHONG hoc lai
```

Tập test phải được xử lý bằng **tham số học từ tập train**, vì lúc chạy thật không có
"tập test" — chỉ có từng bản ghi đến một mình. Học tham số từ test set là giả vờ biết
tương lai.

`fit_transform(X_train)` là lối tắt cho hai dòng đầu. **Không có `fit_transform` cho
tập test** — nếu bạn đang gõ nó cho test, đó là bug.

### Pipeline: biến luật trên thành thứ không quên được

```python
pipe = make_pipeline(SimpleImputer(), StandardScaler(), LogisticRegression())
pipe.fit(X_train, y_train)     # fit tung buoc, dung thu tu, chi tren train
pipe.predict(X_test)           # transform bang tham so cu, roi predict
```

`Pipeline` gọi `fit_transform` cho mọi bước trừ bước cuối, và chỉ `transform` khi
predict. Quan trọng hơn: khi đưa pipeline vào `cross_val_score`, **mỗi fold tự fit lại
toàn bộ các bước tiền xử lý trên đúng phần train của fold đó**. Làm tay thì không ai
nhớ nổi điều này qua năm fold.

### `ColumnTransformer` — mỗi loại cột một nhánh

```python
ColumnTransformer([
    ("num", make_pipeline(SimpleImputer(), StandardScaler()), cot_so),
    ("cat", OneHotEncoder(handle_unknown="ignore"), cot_chu),
])
```

Đây là cách duy nhất gọn để dữ liệu hỗn hợp vẫn nằm trong **một** đối tượng có `fit`.
Một đối tượng nghĩa là một thứ để `joblib.dump`, và artifact đó chứa **cả tiền xử lý
lẫn model** — thứ trực tiếp ngăn training/serving skew.

## Ví dụ

Chạy thật 29/09/2026 tại `~/learn-lab/ml` — Python 3.12.3, scikit-learn 1.9.1,
numpy 2.5.3. Seed `default_rng(42)` và `random_state=42`.

Dữ liệu **hoàn toàn ngẫu nhiên**: 200 dòng × 5.000 cột nhiễu, nhãn tung đồng xu. Không
có tín hiệu nào tồn tại, nên điểm đúng **phải là 0.50**.

```python
rng = np.random.default_rng(42)
X = rng.normal(size=(200, 5000))       # 5000 cot nhieu thuan tuy
y = rng.integers(0, 2, size=200)       # nhan tung dong xu

# SAI — chon 20 cot "tot nhat" tren TOAN BO du lieu, roi moi tach
sel = SelectKBest(f_classif, k=20).fit(X, y)
Xtr, Xte, ytr, yte = train_test_split(sel.transform(X), y, test_size=0.3, random_state=42)
bad = LogisticRegression(max_iter=1000).fit(Xtr, ytr).score(Xte, yte)

# DUNG — chon feature nam TRONG pipeline, chi fit tren phan train cua moi fold
pipe = make_pipeline(SelectKBest(f_classif, k=20), LogisticRegression(max_iter=1000))
good = cross_val_score(pipe, X, y, cv=5).mean()
```

```text
du lieu: 200 dong x 5000 cot nhieu, nhan ngau nhien
diem dung ky vong (doan bua)        : 0.5000

chon feature TRUOC khi tach (SAI)   : 0.8667
chon feature trong pipeline (DUNG)  : 0.5450

ro ri thoi phong diem len            : +32.2 diem phan tram
```

**86,67% accuracy trên dữ liệu không chứa một chút thông tin nào.** Không có ngoại lệ
nào được ném ra, không có cảnh báo nào, không có gì trong code trông sai cả.

Cơ chế: `SelectKBest` nhìn cả 200 dòng để chọn ra 20 cột **tình cờ tương quan với nhãn**.
Trong 5.000 cột nhiễu, luôn có vài chục cột như vậy — thuần tuý do may rủi. Sự tương
quan tình cờ đó có mặt ở cả phần sẽ-thành-test. Tách xong thì đã quá muộn: **thông tin
về test set đã chui vào bước chọn cột rồi.**

Bản đúng cho 0.5450 — đúng như kỳ vọng quanh mức đoán bừa, phần dư là dao động thống kê
trên 200 mẫu.

Ví dụ này dùng feature selection vì hiệu ứng lộ rõ nhất, nhưng **cùng một cơ chế áp dụng
cho `StandardScaler`, `SimpleImputer`, `PCA`, và mọi phép mã hoá mục tiêu** — chỉ khác
độ lớn. Phép scaler rò thường chỉ thổi phồng vài phần trăm, đủ nhỏ để không ai nghi ngờ
và đủ lớn để chọn nhầm model.

## Trade-offs

| Dùng Pipeline | Làm tay từng bước |
|---|---|
| Không thể quên `transform` cho test | Phải tự nhớ, ở mọi chỗ |
| Cross-validation tự fit lại tiền xử lý mỗi fold | Rò ở mọi fold, im lặng |
| Một artifact chứa cả tiền xử lý lẫn model | Hai thứ rời, dễ lệch phiên bản lúc serve |
| Debug khó hơn một chút — lỗi nằm trong bước nào | Nhìn thấy từng bước trực tiếp |
| Grid search được cả hyperparameter của tiền xử lý | Không làm được gọn |

| `Pipeline` | `make_pipeline` |
|---|---|
| Tự đặt tên bước — dùng trong `param_grid` | Tên tự sinh từ tên lớp, viết nhanh hơn |
| Nên dùng khi có grid search | Đủ cho mã thăm dò |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| `fit_transform` trên **cả** X trước khi tách | Rò rỉ; ví dụ trên thổi điểm +32,2 điểm % |
| `scaler.fit(X_test)` | Cùng loại lỗi, dễ thấy hơn nhưng vẫn hay gặp |
| Tiền xử lý ngoài pipeline rồi mới `cross_val_score` | Rò ở **mọi** fold, và CV không phát hiện được |
| Lưu model mà không lưu scaler | Training/serving skew — model đúng, output sai |
| `OneHotEncoder` không đặt `handle_unknown="ignore"` | Production gặp giá trị lạ là ném exception |
| Đọc `coef_` trước khi `fit` | `NotFittedError` — thiết kế cố ý, đừng bọc `try` để nuốt nó |

## FAQ

<details>
<summary>Vì sao fit scaler trên cả bộ dữ liệu lại là gian lận? Nó chỉ là trung bình thôi mà.</summary>

Vì trung bình đó **chứa thông tin từ tập test**. Lúc chạy thật, bản ghi mới đến một
mình và bạn không có cách nào biết trung bình của tương lai. Điểm số tính bằng thông tin
không có ở production là điểm số không tái lập được. Hiệu ứng của riêng scaler thường
nhỏ — và đó mới là cái nguy hiểm: đủ nhỏ để không ai nghi, đủ lớn để chọn nhầm model.

</details>

<details>
<summary>Tôi cần một biến đổi mà sklearn không có — viết thế nào cho ghép được vào pipeline?</summary>

Kế thừa `BaseEstimator` và `TransformerMixin`, hiện thực `fit` (trả về `self`) và
`transform`. `TransformerMixin` cho `fit_transform` miễn phí, `BaseEstimator` cho
`get_params`/`set_params` — thứ mà grid search cần. Thêm `get_feature_names_out` nếu
muốn giữ được tên cột sau biến đổi.

</details>

<details>
<summary>Cross-validation có tự bảo vệ khỏi rò rỉ không?</summary>

**Chỉ khi mọi bước tiền xử lý nằm trong pipeline được truyền vào nó.** Biến đổi dữ liệu
trước rồi mới gọi `cross_val_score` thì CV không cứu được gì — nó chia dữ liệu **đã bị
nhiễm**. Đây chính là điều ví dụ ở trên đo được: 0.8667 so với 0.5450.

</details>

<details>
<summary>Đặt <code>SMOTE</code> hay cân bằng lớp ở đâu?</summary>

Trong pipeline, và **chỉ áp lên phần train của mỗi fold** — dùng `imblearn.pipeline`
thay cho `sklearn.pipeline`, vì bản gốc không cho một bước đổi số dòng. Oversample
trước khi tách là một trong những kiểu rò nặng nhất: bản sao của cùng một dòng nằm ở
cả hai bên.

</details>

<details>
<summary>Vì sao <code>predict</code> không có tham số <code>y</code>?</summary>

Vì đó là toàn bộ điểm của bài toán. `y` chỉ xuất hiện ở `fit` và ở các hàm tính điểm.
Nếu thấy mình cần `y` lúc predict thì thiết kế đang có vấn đề — thường là một feature
được tính từ nhãn đã lẻn vào tập feature.

</details>

## Related Topics

- [Bản đồ Machine Learning](ml-landscape.md) — mọi thuật toán đều dùng chung ba giao diện này
- [Overfitting và underfitting](overfitting-underfitting.md) — rò rỉ làm lỗi test thấp giả
- [Metric hiệu năng](performance-metrics.md) — `scoring=` truyền vào cross-validation
- [Case study: chọn feature trước khi tách](../case-studies/chon-feature-truoc-khi-tach.md) — ca hỏng của chính ví dụ trên
- [Python](../../../languages/python/index.md) — NumPy là nền của `X`

## References

- Aurélien Géron — *Hands-On Machine Learning*, 3rd ed., chương 2
- Buitinck et al. — *API design for machine learning software* (2013), bài báo mô tả chính ba giao diện này
