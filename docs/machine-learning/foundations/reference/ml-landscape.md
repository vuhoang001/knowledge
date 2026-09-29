---
title: Bản đồ Machine Learning
sidebar_position: 1
description: "Bốn trục phân loại mô hình — có nhãn hay không, học một lần hay học tiếp, so sánh hay khái quát hoá — và vì sao trục cuối quyết định mọi thứ."
tags: [machine-learning, supervised, unsupervised, online-learning, homl3]
domain: ai
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-29
---

# Bản đồ Machine Learning

> **Chốt:** Machine Learning là lập trình bằng **ví dụ** thay vì bằng **luật**. Mọi thuật
> toán trong kho này chỉ khác nhau ở bốn trục: *có nhãn không*, *học một lần hay học
> tiếp*, *so sánh với dữ liệu cũ hay rút ra quy luật*, và *ai chịu trách nhiệm khi nó sai*.

## Mục tiêu

Trả lời được **"bài toán này thuộc loại gì"** trước khi chọn thuật toán. Chọn sai loại
thì mọi thứ sau đó — metric, cách chia dữ liệu, cách đánh giá — đều sai theo, và sai
một cách **im lặng**: code chạy, số ra đẹp, không có lỗi nào báo.

## Tổng quan

### ML là gì, nói cho chặt

Định nghĩa của Tom Mitchell (1997), dùng được vì nó **đo được**:

> Một chương trình học từ kinh nghiệm **E** với nhiệm vụ **T** và thước đo **P**,
> nếu hiệu năng của nó trên T — đo bằng P — **cải thiện theo E**.

Ba chữ cái đó chính là ba câu hỏi phải trả lời trước khi viết dòng code đầu tiên:

| Chữ | Câu hỏi | Ví dụ lọc thư rác |
|---|---|---|
| **T** | Nhiệm vụ là gì | Gắn nhãn *rác* / *không rác* cho một email |
| **E** | Học từ cái gì | 10.000 email đã được người gắn nhãn |
| **P** | Đo bằng gì | Tỷ lệ thư rác bị chặn, và tỷ lệ thư thật bị chặn nhầm |

**Không trả lời được P thì không làm được ML.** Đây là chỗ hay bị bỏ qua nhất: "làm
model dự đoán khách rời bỏ" không phải một bài toán, vì nó không nói *sai kiểu nào
thì tệ hơn*.

### Trục 1 — Có nhãn hay không

| Loại | Dữ liệu train | Trả lời câu hỏi | Ví dụ |
|---|---|---|---|
| **Supervised** | Có nhãn `y` | "Giá trị/lớp của cái này là gì" | Hồi quy giá nhà, lọc thư rác |
| **Unsupervised** | Không nhãn | "Dữ liệu này có cấu trúc gì" | Phân cụm khách, phát hiện bất thường |
| **Semi-supervised** | Ít nhãn + nhiều không nhãn | Như supervised nhưng nhãn đắt | Google Photos nhận mặt người |
| **Self-supervised** | Không nhãn, **tự sinh nhãn** | "Đoán phần bị che" | Model ngôn ngữ, BERT |
| **Reinforcement** | Không nhãn, có **phần thưởng** | "Hành động nào tốt về lâu dài" | Chơi game, điều khiển robot |

Ranh giới hay nhầm nhất là **self-supervised vs unsupervised**. Che một từ trong câu
rồi bắt model đoán — dữ liệu không có nhãn người gán, nhưng bài toán vẫn là supervised,
vì nhãn được **sinh ra một cách máy móc từ chính dữ liệu**. Đó là lý do model ngôn ngữ
train được trên toàn bộ internet mà không cần ai ngồi gán nhãn.

### Trục 2 — Học một lần hay học tiếp

| | Batch (offline) | Online (incremental) |
|---|---|---|
| Cách học | Train trên toàn bộ dữ liệu, rồi đóng băng | Nạp từng mẩu, cập nhật dần |
| Dữ liệu mới | Train lại **từ đầu** | Nạp thêm, không train lại |
| Tài nguyên | Cần cả bộ dữ liệu trong RAM/đĩa | Chỉ cần một mini-batch |
| Rủi ro | Model cũ dần, *model rot* | **Dữ liệu xấu làm hỏng model trong vài phút** |

Trong `scikit-learn`, online learning là các estimator có `partial_fit`:
`SGDClassifier`, `SGDRegressor`, `MiniBatchKMeans`.

**Cái bẫy của online learning không phải kỹ thuật mà là vận hành.** Một sensor hỏng
gửi số rác vào lúc 2 giờ sáng sẽ kéo model đi trong khi không ai nhìn. Batch learning
có một thứ online learning không có: **một phiên bản model đứng yên để so sánh**. Vì
thế mặc định nên là batch, và chỉ chuyển sang online khi dữ liệu thật sự không vừa bộ nhớ.

### Trục 3 — Instance-based hay model-based

Đây là trục **quan trọng nhất**, vì nó quyết định cái gì bị mang đi lúc deploy.

| | Instance-based | Model-based |
|---|---|---|
| Cách khái quát hoá | So sánh điểm mới với các điểm **đã thuộc lòng** | Rút ra **tham số**, rồi vứt dữ liệu train đi |
| Lúc `fit` | Gần như không làm gì — chỉ lưu dữ liệu | Tối ưu hoá, tốn thời gian |
| Lúc `predict` | Chậm — phải duyệt dữ liệu train | Nhanh — chỉ là vài phép nhân |
| Deploy phải mang theo | **Toàn bộ dữ liệu train** | Vài chục số |
| Ví dụ | k-Nearest Neighbors | Linear/Logistic Regression, mạng nơ-ron |

## Ví dụ

Chạy thật 29/09/2026 tại `~/learn-lab/ml` — Python 3.12.3, scikit-learn 1.9.1,
numpy 2.5.3. Seed `random_state=42`.

Hai mô hình trên cùng bộ `load_diabetes`: một model-based, một instance-based.

```python
X, y = load_diabetes(return_X_y=True)
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42)

lin = LinearRegression().fit(Xtr, ytr)
knn = KNeighborsRegressor(n_neighbors=5).fit(Xtr, ytr)
```

```text
so mau train / test        : 353 / 89
so tham so LinearRegression: 11
so tham so KNeighbors      : 0  (luu lai 28240 byte du lieu train)

MAE LinearRegression : 42.79
MAE KNeighbors(k=5)  : 42.77

chenh lech du doan giua hai mo hinh: trung binh 26.70, lon nhat 88.89
```

Đọc kỹ ba con số này, vì chúng là cả bài học:

1. **MAE gần như bằng nhau — 42.79 và 42.77.** Nếu chỉ nhìn bảng điểm thì hai mô hình
   này thay thế được cho nhau.
2. **Nhưng trên từng mẫu chúng lệch trung bình 26.70, cao nhất 88.89** — tức là gần
   bằng chính sai số của chúng. Hai mô hình "ngang nhau" đang **trả lời khác hẳn nhau
   cho cùng một bệnh nhân**.
3. **Chi phí deploy lệch nhau hoàn toàn**: 11 con số so với 28.240 byte dữ liệu bệnh nhân
   thật phải mang theo ra production.

Điểm số bằng nhau **không** có nghĩa là hai mô hình tương đương. Nếu dữ liệu train chứa
thông tin cá nhân, điểm 3 một mình đã đủ để loại k-NN.

## Trade-offs

| | Instance-based (k-NN) | Model-based (Linear) |
|---|---|---|
| Train | Tức thì | Tốn thời gian |
| Predict | Chậm, tăng theo số mẫu train | Hằng số |
| Kích thước artifact | Bằng cả bộ dữ liệu | Vài chục byte |
| Quyền riêng tư | **Mang dữ liệu gốc ra production** | Không mang |
| Giải thích được | "Vì nó giống 5 ca này" | "Vì hệ số cột BMI là 0.4" |
| Dữ liệu nhiều chiều | Sụp đổ — xem [curse of dimensionality](#) | Chịu được tốt hơn |

| | Batch | Online |
|---|---|---|
| Kiểm soát | Có phiên bản đứng yên để so | Model trôi liên tục |
| Dữ liệu xấu | Bắt được ở lần train sau | **Hỏng ngay, khó truy lại** |
| Dữ liệu lớn hơn RAM | Không làm được | Làm được |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Chọn thuật toán trước khi chốt **P** (thước đo) | Tối ưu nhầm thứ; model "tốt" mà nghiệp vụ không dùng được |
| Coi self-supervised là unsupervised | Quên mất vẫn cần tách test set như mọi bài supervised |
| Dùng online learning vì nghe hiện đại | Một ngày dữ liệu xấu phá model, không có bản cũ để quay lại |
| Chọn k-NN rồi mới phát hiện phải mang dữ liệu gốc ra production | Vi phạm quyền riêng tư, phát hiện lúc sắp deploy |
| Kết luận hai model tương đương vì cùng điểm | Như ví dụ trên — chúng lệch 88.89 trên từng ca |

## FAQ

<details>
<summary>Bài toán của tôi có nhãn nhưng nhãn rất ít và rất đắt — làm gì?</summary>

Đó đúng là semi-supervised. Cách làm thực dụng trong HOML3 chương 9: phân cụm dữ liệu
không nhãn trước, gán nhãn tay cho **một mẫu đại diện của mỗi cụm**, rồi lan nhãn đó
ra cả cụm. Với cùng công sức gán tay, cách này thường cho model tốt hơn hẳn so với gán
ngẫu nhiên cùng số lượng.

</details>

<details>
<summary>Khi nào thì ML <strong>không</strong> phải câu trả lời?</summary>

Khi luật viết tay ngắn hơn và ổn định. Nếu quy tắc nghiệp vụ là "đơn trên 10 triệu thì
cần duyệt", đừng train model — viết một câu `if`. ML trả công khi luật **quá nhiều,
quá thay đổi, hoặc không ai viết ra được** (nhận diện ảnh là ví dụ kinh điển: không ai
viết nổi luật mô tả "con mèo").

</details>

<details>
<summary>Instance-based có bao giờ tốt hơn model-based không?</summary>

Có, khi ranh giới quyết định méo mó không theo công thức nào, và dữ liệu đủ dày. k-NN
không giả định gì về hình dạng dữ liệu — đó vừa là điểm mạnh vừa là điểm yếu. Nó cũng
là baseline rất đáng chạy: model phức tạp không thắng nổi k-NN thì vấn đề nằm ở
feature, không nằm ở thuật toán.

</details>

<details>
<summary>Tôi phải nhớ hết bốn trục này không?</summary>

Không. Nhớ **trục 3** (instance vs model-based) vì nó quyết định artifact lúc deploy,
và nhớ rằng **P phải chốt trước**. Hai trục còn lại tra lại khi cần.

</details>

## Related Topics

- [Overfitting và underfitting](overfitting-underfitting.md) — thử thách lớn nhất sau khi đã chọn đúng loại bài toán
- [Metric hiệu năng](performance-metrics.md) — chữ **P** trong định nghĩa Mitchell
- [Thiết kế API của Scikit-Learn](sklearn-api-design.md) — mọi thuật toán ở trên đều dùng chung ba giao diện
- [Foundations](../index.md) — chủ đề chứa file này
- [Data Quality](../../../data-quality/index.md) — **E** bẩn thì không có **P** nào cứu được

## References

- Aurélien Géron — *Hands-On Machine Learning*, 3rd ed., chương 1
- Tom Mitchell — *Machine Learning* (1997), định nghĩa T/E/P
