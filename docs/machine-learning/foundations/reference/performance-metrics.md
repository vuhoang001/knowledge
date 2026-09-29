---
title: Metric hiệu năng
sidebar_position: 3
description: "RMSE, MAE, precision, recall, F1, ROC-AUC — cái nào nói thật và cái nào nói dối khi dữ liệu lệch lớp."
tags: [metrics, precision, recall, roc-auc, confusion-matrix, homl3]
domain: ai
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-29
---

# Metric hiệu năng

> **Chốt:** Accuracy là metric **duy nhất** ai cũng biết và là metric **hay sai nhất**.
> Trên dữ liệu lệch lớp, một mô hình không làm gì cả vẫn đạt 89,81% — con số đó thật,
> chạy ra ở ví dụ bên dưới.

## Mục tiêu

Chọn được thước đo **trước khi** train, và chọn đúng cái phản ánh chi phí nghiệp vụ.
Đây là chữ **P** trong định nghĩa Mitchell ở [Bản đồ ML](ml-landscape.md) — chốt sai
chữ này thì mọi công sức sau đó tối ưu nhầm thứ.

## Tổng quan

### Hồi quy: RMSE hay MAE

| | RMSE | MAE |
|---|---|---|
| Công thức | Căn của trung bình **bình phương** sai số | Trung bình **trị tuyệt đối** sai số |
| Phạt sai số lớn | **Nặng** — bình phương | Đều tay |
| Nhạy với outlier | Rất nhạy | Ít nhạy |
| Dùng khi | Sai số lớn là thảm hoạ | Dữ liệu có nhiều outlier |

**RMSE luôn ≥ MAE.** Khoảng cách giữa hai số này chính là chỉ dấu về outlier: chúng gần
nhau thì sai số phân bố đều; RMSE lớn hơn nhiều thì có vài ca sai rất nặng đang kéo nó lên.

### Phân loại: bắt đầu từ confusion matrix

Mọi metric phân loại nhị phân đều là một phân số lấy từ bốn ô này:

```text
                 Dự đoán: Không    Dự đoán: Có
Thực tế: Không        TN               FP        <- FP: báo động giả
Thực tế: Có           FN               TP        <- FN: bỏ sót
```

| Metric | Công thức | Trả lời câu hỏi |
|---|---|---|
| **Accuracy** | `(TP+TN) / tổng` | Đoán đúng bao nhiêu phần trăm |
| **Precision** | `TP / (TP+FP)` | Trong số **báo có**, bao nhiêu là thật |
| **Recall** | `TP / (TP+FN)` | Trong số **thật sự có**, bắt được bao nhiêu |
| **F1** | Trung bình điều hoà của hai cái trên | Một số duy nhất khi cần so nhanh |

Cách nhớ không bao giờ lẫn: **precision nhìn theo cột dự đoán, recall nhìn theo dòng
thực tế.** Mẫu số của precision là những gì model *nói*; mẫu số của recall là những gì
*có thật*.

### Vì sao accuracy nói dối

Accuracy có `TN` ở tử số. Khi lớp âm chiếm 90% dữ liệu, `TN` áp đảo mọi thứ còn lại và
con số trở thành phép đo *"lớp âm có đông không"*, chứ không phải *"model có giỏi không"*.

**Precision và recall không có `TN` ở đâu cả.** Đó chính xác là lý do chúng sống sót
qua dữ liệu lệch lớp.

### Trade-off precision / recall

Một classifier thực ra không trả về nhãn — nó trả về **điểm số**, rồi cắt ở một ngưỡng.
Dịch ngưỡng lên: precision tăng, recall giảm. Dịch xuống: ngược lại. **Không bao giờ
tăng được cả hai bằng cách đổi ngưỡng** — muốn thế phải đổi model.

Chọn phía nào là câu hỏi **nghiệp vụ**, không phải kỹ thuật:

| Bài toán | Ưu tiên | Vì sao |
|---|---|---|
| Lọc video an toàn cho trẻ em | **Precision** | Lọt một video bẩn tệ hơn chặn nhầm mười video sạch |
| Sàng lọc ung thư | **Recall** | Bỏ sót một ca là mất mạng; báo động giả chỉ tốn một lần xét nghiệm lại |
| Phát hiện gian lận thẻ | Tuỳ chi phí | Chặn nhầm làm mất khách; bỏ sót thì mất tiền |

### ROC-AUC và khi nào đừng dùng

ROC vẽ **recall** (TPR) theo **tỷ lệ báo động giả** (FPR) ở mọi ngưỡng. AUC là diện tích
dưới đường đó: 1.0 là hoàn hảo, 0.5 là đoán bừa.

**Cái bẫy:** FPR có `TN` ở mẫu số. Khi lớp âm quá đông, FPR ở lại rất nhỏ dù FP tăng
nhiều, nên đường ROC trông đẹp một cách sai lệch. Quy tắc trong HOML3: **lớp dương hiếm,
hoặc quan tâm tới FP hơn FN → dùng đường precision/recall thay cho ROC.**

## Ví dụ

Chạy thật 29/09/2026 tại `~/learn-lab/ml` — Python 3.12.3, scikit-learn 1.9.1.
Seed `random_state=42`.

Bộ `load_digits`, đổi thành bài toán nhị phân *"có phải chữ số 5 không"* — lớp dương
chiếm khoảng 10%.

```python
X, y = load_digits(return_X_y=True)
y5 = (y == 5)
Xtr, Xte, ytr, yte = train_test_split(X, y5, test_size=0.3, random_state=42, stratify=y5)

dummy = DummyClassifier(strategy="most_frequent").fit(Xtr, ytr)   # luon doan "khong"
sgd   = SGDClassifier(random_state=42, max_iter=1000).fit(Xtr, ytr)
```

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

Đọc kỹ:

1. **`DummyClassifier` đạt accuracy 89,81%** mà không hề học gì — nó trả về `False` cho
   mọi ảnh. Nếu một báo cáo chỉ ghi "accuracy 89,8%", người đọc không có cách nào biết
   model này vô dụng.
2. **Precision, recall, F1 của nó đều bằng 0** — ba metric này lột mặt nó ngay lập tức,
   vì không cái nào đếm `TN`.
3. **ROC-AUC của Dummy đúng bằng 0.5000** — giá trị của phép đoán bừa. Đây là lý do AUC
   dễ đọc: nó có một mốc tham chiếu tuyệt đối, accuracy thì không.
4. **Confusion matrix của SGD nói chi tiết hơn mọi con số gộp**: chỉ 1 báo động giả
   nhưng **3 ca bỏ sót**. Recall (0.9455) thấp hơn precision (0.9811) đúng như ma trận
   cho thấy. Nếu đây là sàng lọc y tế, 3 ca bỏ sót mới là con số phải báo cáo.

**Khoảng cách 89,81% → 0,00% giữa hai cách đo cùng một mô hình** là toàn bộ lý do mục
này tồn tại.

## Trade-offs

| Precision cao | Recall cao |
|---|---|
| Ít báo động giả | Ít bỏ sót |
| Bỏ sót nhiều ca thật | Nhiều báo động giả, tốn công xử lý |
| Hợp với: kiểm duyệt nội dung, tự động hoá không người duyệt | Hợp với: sàng lọc y tế, an ninh |

| ROC-AUC | Precision-Recall AUC |
|---|---|
| Có mốc tham chiếu tuyệt đối 0.5 | Mốc tham chiếu = tỷ lệ lớp dương, đổi theo dữ liệu |
| **Lạc quan giả khi lớp dương hiếm** | Trung thực khi lớp dương hiếm |
| So được giữa các bộ dữ liệu khác tỷ lệ lớp | Khó so chéo bộ dữ liệu |

| Metric gộp (F1) | Confusion matrix |
|---|---|
| Một số, xếp hạng model nhanh | Bốn số, biết **sai kiểu gì** |
| Giấu mất cân bằng FP/FN | Chỉ thẳng ra 3 FN vs 1 FP |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Báo cáo accuracy trên dữ liệu lệch lớp | 89,81% cho một model không làm gì — xem ví dụ |
| Chốt metric **sau khi** đã train | Chọn metric nào làm model trông đẹp nhất — tự lừa mình |
| Dùng F1 khi FP và FN có chi phí rất khác nhau | F1 coi hai loại sai như nhau; thực tế hiếm khi vậy |
| Dùng ROC-AUC cho bài toán lớp dương cực hiếm | Đường ROC đẹp giả; dùng precision/recall curve |
| So precision của model A với recall của model B | Hai thang khác nhau, so là vô nghĩa |
| Quên `stratify` khi tách test set | Tỷ lệ lớp lệch giữa train và test, mọi metric trôi theo |

## FAQ

<details>
<summary>Chỉ được chọn một metric thì chọn gì?</summary>

Hỏi ngược: **sai kiểu nào tốn tiền hơn?** Trả lời được thì metric tự lộ ra — FP đắt thì
precision, FN đắt thì recall. Thật sự ngang nhau thì F1. Không trả lời được câu hỏi đó
nghĩa là bài toán chưa được đóng khung xong, và train model lúc này là quá sớm.

</details>

<details>
<summary>F1 khác gì trung bình cộng của precision và recall?</summary>

F1 là trung bình **điều hoà**, nó phạt sự mất cân bằng. Precision 1.0 và recall 0.0:
trung bình cộng cho 0.5 (nghe như tạm được), F1 cho **0.0** (đúng với thực tế — model
không bắt được ca nào). Vì thế F1 không bị `DummyClassifier` đánh lừa.

</details>

<details>
<summary>Vì sao <code>DummyClassifier</code> lại đáng chạy?</summary>

Vì nó cho **mốc sàn**. Model thật không vượt được Dummy một cách rõ ràng thì hoặc
feature vô dụng, hoặc có bug. Chạy nó mất một dòng code và chặn được cả một loại tự lừa
dối. Coi nó như `SELECT COUNT(*)` trước khi tin một phép JOIN.

</details>

<details>
<summary>Đổi ngưỡng có làm model tốt lên không?</summary>

Không — nó chỉ **di chuyển** trên đường precision/recall sẵn có. Muốn dịch cả đường lên
thì phải đổi feature hoặc đổi thuật toán. Nhưng đổi ngưỡng vẫn rất đáng làm, vì ngưỡng
mặc định 0.5 hầu như không bao giờ là ngưỡng đúng cho bài toán thật.

</details>

<details>
<summary>Bài toán nhiều lớp thì precision/recall tính sao?</summary>

Tính cho từng lớp rồi gộp lại: `macro` (trung bình đều các lớp — lớp hiếm có tiếng nói
ngang lớp phổ biến), `weighted` (trung bình theo số mẫu), `micro` (gộp hết TP/FP/FN rồi
mới tính). Lớp hiếm là thứ quan tâm thì dùng `macro`, đừng dùng `weighted` — nó lại chôn
lớp hiếm đúng như accuracy.

</details>

## Related Topics

- [Bản đồ Machine Learning](ml-landscape.md) — metric là chữ **P** trong T/E/P
- [Overfitting và underfitting](overfitting-underfitting.md) — đo trên tập nào thì con số mới thật
- [Thiết kế API của Scikit-Learn](sklearn-api-design.md) — `scoring=` trong cross-validation
- [Case study: accuracy 89,81% cho model không làm gì](../case-studies/accuracy-cao-ma-model-vo-dung.md)
- [Data Quality](../../../data-quality/index.md) — nhãn sai thì mọi metric đều sai theo

## References

- Aurélien Géron — *Hands-On Machine Learning*, 3rd ed., chương 2 (RMSE/MAE) và chương 3 (phân loại)
