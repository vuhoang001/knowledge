---
title: Trục 3 — Instance-based và model-based
sidebar_position: 4
description: "Hai cách trả lời một ca chưa từng thấy. Cyprus tính tay bằng cả hai cách, và toàn bộ workflow gói trong mười dòng Scikit-Learn."
tags: [instance-based, model-based, knn, linear-regression, scikit-learn, homl3, chuong-1]
domain: ai
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-29
---

# Trục 3 — Instance-based và model-based

> **Chốt:** Hai cách **khái quát hoá** sang một ca chưa từng thấy. Instance-based **giữ
> lại các ví dụ** và đo độ giống. Model-based **vứt ví dụ đi**, giữ lại vài con số.
> Đây là trục quan trọng nhất, vì nó quyết định **cái gì bị mang theo lúc deploy**.

## Mục tiêu

Hiểu *khái quát hoá* nghĩa là gì bằng một ví dụ tính được ra số bằng tay, và nhận ra
rằng đổi giữa hai họ thuật toán trong `scikit-learn` chỉ là **hai dòng code**.

## Tổng quan

### Khái quát hoá là mục tiêu thật

**Generalize** nghĩa là làm tốt trên những instance hệ thống **chưa từng thấy**. Gần như
mọi nhiệm vụ ML đều là dự đoán, nên đó mới là đích thật.

> **Hiệu năng tốt trên tập train là *cần* nhưng **không đủ*** — giống hệt một báo cáo chỉ
> đúng cho đúng những tháng bạn đã kiểm thử thì chưa xong.

Điều đó cắn mạnh nhất vào instance-based learning, thứ **có thể trông xuất sắc trên tập
train vì một lý do tầm thường: tập train chính là thứ nó học thuộc.**

### Hai cách

```text
Instance-based:  giu lai cac vi du  ->  so sanh ca moi voi chung
Model-based:     khop mot model     ->  ap model len ca moi
```

| | Instance-based | Model-based |
|---|---|---|
| Học bằng cách | **thuộc lòng** các ví dụ train | dựng một **model** của các ví dụ |
| Dự đoán bằng | một **thước đo độ giống** | áp dụng model |
| Thuật toán ở bài này | k-nearest neighbours | linear regression |
| Cyprus | **≈ 6,33** từ ba nước gần nhất | **6,30** từ đường đã khớp |

### Instance-based: học thuộc lòng

Một bộ lọc thư rác kiểu này sẽ gắn cờ những email **y hệt** cái đã bị gắn cờ. Bớt tầm
thường đi một chút: nó cũng gắn cờ email **giống** thư rác đã biết — và việc đó cần một
**thước đo độ giống**. Một thước đo rất thô sơ: **đếm số từ chung giữa hai email**.

Với k-nearest neighbours, `k` là số ví dụ gần nhất mà nó nhìn. Toàn bộ phép dự đoán cho
Cyprus đọc **đúng như một câu truy vấn**:

```sql
SELECT AVG(life_satisfaction)              -- khoang 6.33
FROM (
  SELECT life_satisfaction
  FROM countries
  ORDER BY ABS(gdp_per_capita - 37655)     -- Cyprus: 37,655 USD
  LIMIT 3                                  -- k = 3
) AS nearest;
```

> **Không có model, nên mọi giả định nằm trong thước đo độ giống.** Instance-based không
> khớp gì cả, nên mọi quyết định thiết kế dồn vào hai chỗ: **đo độ giống thế nào**, và
> **nhìn bao nhiêu hàng xóm**. Đổi thước đo thì mọi dự đoán đổi theo, **mà không có bước
> training nào để chỉ vào**. Giả định không biến mất — nó **chuyển vào hàm khoảng cách**.

### Model-based: bốn bước, và cả cuốn sách là bốn bước này

1. **Nghiên cứu dữ liệu.** Vẽ GDP theo life satisfaction, nhìn ra xu hướng.
2. **Chọn model.** Biểu đồ trông gần như tuyến tính, nên chọn model tuyến tính hai tham số:

   ```text
   life satisfaction = theta_0 + theta_1 x GDP per capita
   ```

3. **Train nó.** Tìm bộ tham số khớp nhất, cần một thước đo độ khớp:

   | Thước đo | Nó đo | Training đẩy nó |
   |---|---|---|
   | **utility function** | model tốt đến đâu | **lên** |
   | **cost function** | model tệ đến đâu | **xuống** |

4. **Áp dụng model để dự đoán** trên ca mới. Đây là **inference**.

**Đọc công thức, từng mảnh:**

| Mảnh | Đọc là | Nó là gì | Trong code |
|---|---|---|---|
| life_satisfaction | — | số model dự đoán, thang 0–10 | `model.predict(...)` |
| `theta_0` | "theta zero" | giá trị khởi đầu: dự đoán khi GDP bằng 0 | `model.intercept_` |
| `theta_1` | "theta one" | độ dốc: điểm tăng thêm cho mỗi đô-la GDP | `model.coef_` |
| GDP_per_capita | — | đầu vào | `X` |

Nói thường: **dự đoán = giá trị khởi đầu + độ dốc × GDP**.

### Parameter và hyperparameter — đừng lẫn

| | Model parameter | Hyperparameter |
|---|---|---|
| Thuộc về | **model** | **thuật toán học** |
| Ví dụ | `theta_0`, `theta_1` | `k` của k-NN, cường độ regularization |
| Ai đặt | **training** | **bạn**, trước khi train |
| Trong lúc train | bị chỉnh để khớp dữ liệu | **đứng yên** |
| Ví von | giá trị mà job tính ra | một `--conf` truyền vào lúc submit job |

## Ví dụ

Chạy thật 29/09/2026 tại `~/learn-lab/ml` — Python 3.12.3, scikit-learn 1.9.1, trên
**chính bộ dữ liệu của sách** (`lifesat.csv`, 27 quốc gia). Mọi con số dưới đây khớp
**từng chữ số** với sách.

### Training tính ra hai con số đó thế nào

Một đầu vào nên làm được bằng tay, và **có đáp án chính xác trong một lượt** — không
lặp, không ngẫu nhiên. Đó là lý do chạy lại hai lần cho **cùng một kết quả**.

```text
theta_0 = 3.7490   theta_1 = 0.0000677890
buoc 1: GDP tb = 41,564.5   diem tb = 6.5667
buoc 2: tong tich   = 163,499.4
buoc 3: tong binh phuong = 2,411,886,717.9
buoc 4: theta_1 = 0.0000677890
buoc 5: theta_0 = 3.7490
```

| Bước | Làm gì | Ra gì |
|---|---|---|
| 1 | GDP trung bình và điểm trung bình của 27 nước | 41.564,5 và 6,5667 |
| 2 | Với mỗi nước nhân (GDP − 41.564,5) với (điểm − 6,5667), cộng 27 kết quả | **163.499,4** — GDP và điểm đi cùng nhau đến đâu |
| 3 | Với mỗi nước bình phương (GDP − 41.564,5), cộng 27 kết quả | **2.411.886.717,9** — GDP trải rộng đến đâu |
| 4 | θ₁ = bước 2 ÷ bước 3 | **0,0000678** |
| 5 | θ₀ = điểm tb − θ₁ × GDP tb | **3,749** |

Nên **10.000 đô-la GDP thêm vào đi kèm 0,0000678 × 10.000 = 0,68 điểm** life satisfaction.

### Cyprus: cùng một câu hỏi, hai câu trả lời

```text
Cyprus, linear      : 6.30166
Cyprus, kNN k=1     : 7.20000
Cyprus, kNN k=3     : 6.33333
Cyprus, kNN k=5     : 6.26000

5 nuoc gan Cyprus nhat:
   Israel           38,341  cach     686  diem 7.2
   Lithuania        36,732  cach     923  diem 5.9
   Slovenia         36,548  cach   1,107  diem 5.9
   Italy            38,992  cach   1,337  diem 6.0
   Spain            36,215  cach   1,440  diem 6.3
```

| Cách | Phép tính | Kết quả |
|---|---|---|
| **Đường thẳng** | 3,749 + 0,0000678 × 37.655,2 | **6,30** |
| **k = 1** | Israel một mình | **7,20** |
| **k = 3** | (7,2 + 5,9 + 5,9) ÷ 3 | **6,33** |
| **k = 5** | (7,2 + 5,9 + 5,9 + 6,0 + 6,3) ÷ 5 | **6,26** |

Đường thẳng dùng **cả 27 nước cùng lúc**, thông qua đúng hai con số đã học. k-NN dùng
**ba nước**, và giữ lại cả 27 để làm được việc đó.

> **Vì sao hai phương pháp có thể cùng đúng mà vẫn bất đồng.** Đường nói 6,30; k-NN nói
> 6,33. **Không cái nào là *đáp án*** — chúng trả lời hai câu hỏi hơi khác nhau: *xu
> hướng chung nói gì tại mức 37.655 USD*, so với *những nước giống nhất thực sự chấm
> bao nhiêu*. Đồng thuận sát nhau là **bằng chứng yếu** rằng quy luật có thật. Bất đồng
> lớn sẽ đang nói cho bạn điều gì đó về **hình dạng dữ liệu**, chứ không phải rằng một
> trong hai bị hỏng.

Chú ý `k` làm câu trả lời nhảy: **7,20 → 6,33 → 6,26**. `k` là một hyperparameter —
**bạn** chọn, training không chạm vào.

### Toàn bộ workflow trong mười dòng

```python
import pandas as pd
from sklearn.linear_model import LinearRegression

lifesat = pd.read_csv("lifesat.csv")
X = lifesat[["GDP per capita (USD)"]].values   # 2 chieu: 27 dong x 1 cot
y = lifesat[["Life satisfaction"]].values

model = LinearRegression()
model.fit(X, y)
print(model.predict([[37_655.2]]))             # Cyprus
```

Đổi sang instance-based là **đúng hai dòng**:

```python
from sklearn.neighbors import KNeighborsRegressor
model = KNeighborsRegressor(n_neighbors=3)
```

Mọi thứ xung quanh — nạp dữ liệu, tạo hình `X` và `y`, `fit`, `predict` — **giữ nguyên**.
Giao diện đồng nhất đó là ý tưởng thiết kế trung tâm của Scikit-Learn, và là lý do phần
còn lại của sách đi nhanh được qua rất nhiều thuật toán. Chi tiết ở
[Thiết kế API của Scikit-Learn](sklearn-api-design.md).

> **Chi tiết làm ai cũng vấp: dấu ngoặc vuông kép.** `lifesat[["GDP per capita (USD)"]]`
> — một cặp ngoặc cho lại **một cột phẳng**, hai cặp cho lại một **bảng tình cờ có một
> cột**. Scikit-Learn bắt `X` phải có hình bảng, vì khoảnh khắc bạn dùng hai đầu vào thay
> vì một, **không dòng nào khác trong code phải đổi**. Một cặp ngoặc gây lỗi shape ở tận
> bước sau, và thông báo lỗi không hề gợi ý gì.

### Model không biết khi nào nó đang đoán

Đổi `37_655.2` thành một con số xa ngoài vùng dữ liệu đã thấy — ví dụ 200.000 — và nó
**vẫn trả lời đầy tự tin**, vì một đường thẳng không có khái niệm gì về chỗ bằng chứng
của nó dừng lại.

**Đó là thói quen tư duy nên hình thành ngay bây giờ**, không phải ở chương 4. Xem
[Dữ liệu xấu](bad-data.md) để thấy con số cụ thể: 11,22 trên thang 0–10.

## Trade-offs

| | Instance-based (k-NN) | Model-based (Linear) |
|---|---|---|
| Lúc `fit` | gần như không làm gì — chỉ **lưu dữ liệu** | tối ưu hoá, tốn thời gian |
| Lúc `predict` | **chậm** — phải duyệt dữ liệu train | nhanh — vài phép nhân |
| Deploy mang theo | **toàn bộ tập train** | vài chục con số |
| Quyền riêng tư | **mang dữ liệu gốc ra production** | không mang |
| Giải thích | "vì nó giống 3 ca này" | "vì hệ số là 0,0000678" |
| Giả định nằm ở | **hàm khoảng cách** — không có bước train để soi | dạng model đã chọn |
| Dữ liệu nhiều chiều | sụp đổ (curse of dimensionality) | chịu được tốt hơn |
| Dữ liệu cong | theo được mọi hình dạng | chỉ theo được hình đã chọn |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Tin điểm trên tập train của một model instance-based | Nó **học thuộc** tập đó; điểm cao là tautology |
| Chọn k-NN rồi mới phát hiện phải mang dữ liệu gốc ra production | Vi phạm quyền riêng tư, phát hiện lúc sắp deploy |
| Coi hai model "ngang điểm" là thay thế được cho nhau | Chúng trả lời hai câu hỏi khác nhau |
| Đổi thước đo độ giống mà không coi đó là đổi model | Mọi dự đoán đổi, không có bước train nào để truy |
| Quên ngoặc vuông kép cho `X` | Lỗi shape ở bước sau, thông báo lỗi vô dụng |
| Hỏi model ngoài vùng dữ liệu đã thấy rồi tin câu trả lời | **Model không biết khi nào nó đang đoán** |
| Lẫn hyperparameter `k` với parameter học được | Đi tìm `k` trong output của `fit` — nó không ở đó |

## FAQ

<details>
<summary>Giải thích khác nhau giữa utility function và cost function trong một câu.</summary>

Utility function đo model **tốt** đến đâu và training đẩy nó **lên**; cost function đo
model **tệ** đến đâu và training đẩy nó **xuống**. Cùng một việc, hai dấu.

</details>

<details>
<summary>Độ dốc nói 10.000 đô-la GDP đi kèm 0,68 điểm. Vậy tiền có làm người ta hạnh phúc không?</summary>

Con số đó là **tương quan**, không phải nhân quả. Để nói được chữ "làm" cần thêm nhiều
thứ: loại trừ biến gây nhiễu (giáo dục, y tế, bất bình đẳng đều đi cùng GDP), một cơ chế
nhân quả, và lý tưởng nhất là một can thiệp.

Chú ý ngay trong chính dữ liệu này đã có bằng chứng chống lại cách đọc đơn giản: **United
States là nước giàu nhất bảng và điểm thấp hơn Denmark lẫn Australia**, cả hai đều nghèo
hơn. Quan hệ rõ ràng **phẳng ra hoặc gãy ở đầu giàu**.

</details>

<details>
<summary>Instance-based có bao giờ là lựa chọn đúng không?</summary>

Có, khi ranh giới quyết định méo mó không theo công thức nào và dữ liệu đủ dày. k-NN
**không giả định gì** về hình dạng dữ liệu — vừa là điểm mạnh vừa là điểm yếu.

Nó cũng là **baseline rất đáng chạy**: nếu một model phức tạp không thắng nổi k-NN thì
vấn đề nằm ở feature, không nằm ở thuật toán.

</details>

<details>
<summary>Vì sao <code>fit</code> của linear regression chạy lại cho kết quả y hệt, còn nhiều model khác thì không?</summary>

Với đường thẳng một đầu vào, phép tìm tham số **có đáp án chính xác tính được trong một
lượt** — năm dòng số học ở trên. Không lặp, không ngẫu nhiên.

Các model dùng gradient descent hoặc khởi tạo ngẫu nhiên thì khác, và đó là lý do phải
ghi lại seed. Xem Linear models và gradient descent (chương 4, chưa viết).

</details>

<details>
<summary>k bằng bao nhiêu là đúng?</summary>

Không có đáp án chung — nó là hyperparameter, **chọn bằng cách đo**. Trên bộ dữ liệu này
k = 1 cho 7,20 (chỉ nghe Israel), k = 3 cho 6,33, k = 5 cho 6,26. k nhỏ bám nhiễu; k lớn
làm phẳng quy luật thật.

Và tuyệt đối **không chọn k bằng test set** — xem [Kiểm thử và thẩm định](testing-and-validating.md).

</details>

## Related Topics

- [Machine Learning là gì](ml-landscape.md) — trục 3 trong ba trục
- [Thiết kế API của Scikit-Learn](sklearn-api-design.md) — ba giao diện, và vì sao đổi model chỉ là hai dòng
- [Dữ liệu xấu](bad-data.md) — vùng dữ liệu chưa thấy, và con số 11,22
- [Overfitting và underfitting](overfitting-underfitting.md) — hiệu năng train là cần nhưng không đủ
- [Kiểm thử và thẩm định](testing-and-validating.md) — cách đo khái quát hoá cho thật
- [Metric hiệu năng](performance-metrics.md) — thước đo độ khớp, viết cho chỉn chu

## References

- Aurélien Géron — *Hands-On Machine Learning*, 3rd ed., chương 1, bài b07 và b08 (Example 1-1)
