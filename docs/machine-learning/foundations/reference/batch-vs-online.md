---
title: Trục 2 — Batch và online learning
sidebar_position: 3
description: "Full refresh hay incremental load, áp cho model. Batch trôi dần giữa hai lần train; online tươi liên tục nhưng dữ liệu xấu ngấm thẳng vào hệ thống đang chạy."
tags: [batch-learning, online-learning, model-rot, learning-rate, out-of-core, homl3, chuong-1]
domain: ai
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-29
---

# Trục 2 — Batch và online learning

> **Chốt:** Đây đúng là **full refresh so với incremental load**, áp cho model thay vì
> cho bảng. Batch đúng vào ngày nó ship rồi **trôi dần** tới lần train sau. Online luôn
> tươi, nhưng dữ liệu xấu **đã nằm trong tham số của hệ thống đang phục vụ traffic**.

## Mục tiêu

Chọn nhịp train bằng một câu hỏi đo được — *thế giới của tôi đổi nhanh hơn hay chậm hơn
tốc độ tôi dựng lại được model* — thay vì chọn theo cảm giác "online nghe hiện đại hơn".

## Tổng quan

### Bảng đối chiếu

| | Batch learning | Online learning |
|---|---|---|
| Giống như | **full refresh** — dựng lại từ toàn bộ dữ liệu | **incremental load** — nạp dữ liệu mới khi nó đến |
| Train trên | tất cả dữ liệu cùng lúc, **offline** | từng instance, hoặc **mini-batch** nhỏ |
| Sau khi launch | chạy, **không học thêm** | tiếp tục học tại chỗ |
| Dữ liệu mới nghĩa là | train lại một phiên bản **từ đầu** | thêm một bước học nhanh và rẻ |
| Rủi ro chính | train lại chậm và tốn; **model rot** | dữ liệu xấu **làm hỏng hệ thống đang chạy** |

### Batch learning: train một lần rồi đóng băng

Batch learning **không học tăng dần được**. Nó phải được train trên toàn bộ dữ liệu sẵn
có, offline, rồi ship ra và chạy mà không học thêm gì nữa — còn gọi là *offline learning*.

Muốn nó biết về dữ liệu mới thì train lại một phiên bản mới **từ đầu** trên toàn bộ dữ
liệu cũ cộng mới, rồi thay vào. Việc này **thường tự động hoá được**, nên batch không
tự động là sai. Nhưng nó có hai chi phí thật:

1. **Thời gian và compute.** Train trên tập đầy đủ có thể mất hàng giờ.
2. **Mục nát.** Hiệu năng của model batch **giảm dần theo thời gian**, đơn giản vì thế
   giới đổi mà model thì không. Sách gọi là **model rot**, hay *data drift*.

Đúng là một **bảng snapshot**: đúng vào ngày dựng, rồi âm thầm ôi đi. Cách giảm nhẹ là
train lại hằng ngày hoặc hằng tuần.

Batch còn **hỏng hẳn** khi tập dữ liệu lớn hơn bộ nhớ, hoặc khi hệ thống phải chạy tự
chủ trên tài nguyên hạn chế — một app điện thoại, hay một rover trên sao Hoả.

> **Batch không sai, nó chỉ đẩy chi phí vào lịch chạy.** Câu hỏi hiếm khi là *làm được
> không*, mà là **nhịp**. Đúng cái câu hỏi bạn đã trả lời khi chọn refresh interval cho
> một bảng dẫn xuất. **Model rot sống trọn trong cái khe đó.**

### Online learning: học từng bước nhỏ

Nạp từng instance hoặc từng **mini-batch**. Mỗi bước học nhanh và rẻ, nên hệ thống học
được về dữ liệu mới **tại chỗ**.

Trong `scikit-learn` đó là các estimator có `partial_fit`: `SGDClassifier`,
`SGDRegressor`, `MiniBatchKMeans`.

**Out-of-core learning** — cùng cơ chế, dùng cho tập dữ liệu lớn hơn RAM:

```text
tap du lieu lon hon bo nho
  -> nap mot phan   -> mot buoc train
  -> nap phan tiep  -> mot buoc train
  -> ... lap cho toi khi het du lieu
```

Đúng là xử lý một file lớn hơn RAM theo từng chunk. **Out-of-core thường chạy offline**,
bất chấp cái tên — nên sách khuyên đọc chữ "online" thành **incremental**, đừng đọc
thành "trên internet".

### Learning rate: núm vặn không có giá trị an toàn

| Learning rate | Được gì | Mất gì |
|---|---|---|
| **Cao** | thích nghi nhanh | **quên dữ liệu cũ nhanh** |
| **Thấp** | ít nhạy với nhiễu | học chậm |

**Không có giá trị nào tốt ở cả hai đầu.** Giá trị đúng phụ thuộc vào *quy luật thật
đổi nhanh đến đâu* so với *dữ liệu nhiễu đến đâu* — **hai tính chất của dữ liệu, không
phải của thuật toán**.

Phép thử cực đoan đáng nhớ: vặn quá cao thì bộ lọc thư rác **chỉ còn gắn cờ đúng loại
rác mới nhất mà nó vừa được xem.**

### Rủi ro thật của online là rủi ro vận hành

Với batch, một tập train xấu bị bắt **trước khi phát hành**, và bạn vẫn đang phục vụ
model cũ. Với online, dữ liệu xấu **đã nằm bên trong tham số** của hệ thống đang phục
vụ traffic, và hiệu năng **trượt dần chứ không sập** — nên không có alert nào nổ.

Vì thế cách giảm nhẹ mà sách đưa ra **không phải một thuật toán tốt hơn**, mà là vận
hành: **giám sát dữ liệu đầu vào sát sao và phản ứng khi hiệu năng tụt.**

## Ví dụ

Chạy thật 29/09/2026 tại `~/learn-lab/ml` — scikit-learn 1.9.1, dữ liệu của sách.

Model của chương 1 là một model **batch**: training nhìn cả 27 dòng một lúc rồi ngừng học.

```text
duong tren 27 nuoc: 3.749 + 0.0000678 x GDP
duong tren 36 nuoc: 5.580 + 0.0000233 x GDP
```

Sách thêm 9 quốc gia (South Africa, Colombia, Brazil, Mexico, Chile, Norway,
Switzerland, Ireland, Luxembourg). Hệ thống batch **train lại từ đầu** trên cả 36 dòng
và ra một đường mới. **Độ dốc còn khoảng một phần ba** so với trước: 0,0000233 so với
0,0000678.

Cho tới khi lần train đó chạy, model cũ **vẫn dùng đường cũ**:

```text
Luxembourg GDP 110,261 — diem that 6.9
   duong 27 nuoc doan: 11.22   <- vuot tran thang 0-10
   duong 36 nuoc doan: 8.15
```

**11,22 trên thang 0–10.** Đó là model rot ở dạng thuần khiết nhất: không có gì hỏng,
không có lỗi nào, chỉ là một model đang trả lời bằng thế giới của ngày hôm qua.

Một hệ thống **online** sẽ không đợi lần train đầy đủ. Mỗi khi một quốc gia mới đến, nó
đi một bước học nhỏ, và **learning rate quyết định bước đó dịch đường đi bao xa**.

## Trade-offs

| Batch | Online |
|---|---|
| Có một phiên bản **đứng yên để so sánh** | Model trôi liên tục, không có mốc |
| Dữ liệu xấu bị bắt **trước khi phát hành** | Dữ liệu xấu **ngấm vào hệ thống đang chạy** |
| Lỗi thì **sập rõ ràng** hoặc bị chặn ở CI | Lỗi thì **trượt dần**, không alert nào nổ |
| Cần cả tập dữ liệu trong bộ nhớ | Chỉ cần một mini-batch |
| Train lại tốn giờ và tiền | Mỗi bước học nhanh và rẻ |
| Không chạy được khi dữ liệu lớn hơn RAM | Out-of-core giải đúng chỗ đó |
| Ôi dần giữa hai lần train | Luôn tươi |

**Đổi một bài toán build lấy một bài toán monitoring.** Đó là cách gọn nhất để tóm tắt
lựa chọn này.

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Chọn online vì nghe hiện đại | Một ngày dữ liệu xấu phá model, **không có bản cũ để quay lại** |
| Chọn batch rồi không đặt lịch train lại | Model rot: đúng ngày ship, sai dần mỗi ngày sau |
| Đọc "online" thành "trên internet" | Bỏ lỡ out-of-core — nó chạy offline |
| Chỉnh learning rate một lần theo nguyên lý | Không có giá trị an toàn; nó phụ thuộc dữ liệu, phải đo |
| Triển khai online mà không giám sát đầu vào | Cách giảm nhẹ duy nhất bị bỏ qua đúng chỗ nó cần nhất |
| So hai model train ở hai thời điểm khác nhau | Với online thì "model" không phải một vật cố định |

## FAQ

<details>
<summary>Model phải chạy trên thiết bị nhận dữ liệu mỗi giây và không gọi về được. Batch hay online?</summary>

**Online.** Batch cần một lần train lại tập trung rồi đẩy model mới xuống — mà thiết bị
này không gọi về được. Đây cũng là một trong hai ca sách nêu là batch **hỏng hẳn**
(cùng với tập dữ liệu lớn hơn bộ nhớ).

Kèm điều kiện: phải có cách phát hiện model đã trôi đi đâu, vì không ai nhìn thấy nó.

</details>

<details>
<summary>Learning rate chọn thế nào cho ra chọn, thay vì đoán?</summary>

Bằng **lịch learning rate** — quy tắc thay đổi learning rate trong quá trình train,
thay vì giữ một hằng số. `scikit-learn` cài sẵn trong stochastic gradient descent, và
`partial_fit` là lời gọi làm online learning khả thi.

Giá trị ban đầu vẫn phải tìm bằng cách đo. Chi tiết ở Linear models và gradient descent
(chương 4, chưa viết).

</details>

<details>
<summary>Out-of-core learning có phải online learning không?</summary>

Dùng **cùng cơ chế** — nạp từng phần, học từng bước — nhưng **mục đích khác và thường
chạy offline**. Online learning giải bài toán *dữ liệu đến liên tục*; out-of-core giải
bài toán *dữ liệu lớn hơn bộ nhớ*. Một thuật toán, hai lý do.

</details>

<details>
<summary>Model rot khác gì data drift?</summary>

Sách dùng hai chữ cho cùng một hiện tượng: model đứng yên trong khi thế giới đi tiếp.
Trong thực hành người ta hay tách: *data drift* là **phân phối đầu vào** đổi, *concept
drift* là **quan hệ giữa đầu vào và nhãn** đổi. Cả hai đều biểu hiện thành model rot.

</details>

## Related Topics

- [Machine Learning là gì](ml-landscape.md) — trục 2 trong ba trục
- [Học có giám sát và không giám sát](supervised-unsupervised.md) — trục 1
- [Instance-based và model-based](instance-vs-model-based.md) — trục 3
- [Dữ liệu xấu](bad-data.md) — dữ liệu không đại diện là thứ sinh ra con số 11,22 ở trên
- [Kiểm thử và thẩm định](testing-and-validating.md) — đo model rot cần một tập giữ lại

## References

- Aurélien Géron — *Hands-On Machine Learning*, 3rd ed., chương 1, bài b06
