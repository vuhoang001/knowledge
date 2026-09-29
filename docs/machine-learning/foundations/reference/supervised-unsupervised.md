---
title: Trục 1 — Học có giám sát, không giám sát, và những thứ ở giữa
sidebar_position: 2
description: "Năm kiểu giám sát xếp theo một câu hỏi duy nhất: tín hiệu học đến từ đâu, và ai trả tiền cho nó."
tags: [supervised, unsupervised, semi-supervised, self-supervised, reinforcement-learning, homl3, chuong-1]
domain: ai
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-29
---

# Trục 1 — Học có giám sát, không giám sát, và những thứ ở giữa

> **Chốt:** Năm kiểu giám sát khác nhau ở đúng một chỗ — **tín hiệu học đến từ đâu**.
> Và vì thuật toán thì miễn phí còn dòng dữ liệu thô thường cũng gần miễn phí, **cột
> nhãn là thứ đắt tiền**. Kế hoạch của một dự án supervised thực chất là một kế hoạch
> gắn nhãn.

## Mục tiêu

Đặt tên đúng cho bài toán trước khi chọn thuật toán, và biết trước **hoá đơn gắn nhãn**
thay vì phát hiện nó ở giữa dự án.

## Tổng quan

### Bảng tổng: tín hiệu đến từ đâu

| Kiểu | Tín hiệu học đến từ | Ai trả tiền |
|---|---|---|
| **Supervised** | Một nhãn trên **mọi** instance | Người — đắt nhất |
| **Semi-supervised** | Một phần nhỏ có nhãn, phần còn lại không | Người, nhưng ít hơn nhiều |
| **Self-supervised** | Nhãn **tự sinh ra từ chính dữ liệu không nhãn** | Không ai |
| **Unsupervised** | Không có nhãn nào | Không ai |
| **Reinforcement** | **Phần thưởng và hình phạt** mà hành động của agent kiếm được | Môi trường |

Bốn kiểu đầu nằm trên cùng một thang: *cần bao nhiêu công gắn nhãn của người*.
**Reinforcement learning không nằm trên thang đó chút nào** — tín hiệu của nó sinh ra
bằng cách *hành động*, nên nó cần một **môi trường để hành động**, không phải một tập
dữ liệu để đọc.

### Supervised: mọi dòng đã có sẵn đáp án

Tập train gồm các dòng có đủ cột đầu vào **cộng một cột đáp án** gọi là **label**.
Training dạy model điền cột đó cho những dòng còn trống.

Hai việc, khác nhau đúng ở chỗ **cột đáp án chứa gì**:

| | Classification | Regression |
|---|---|---|
| Dự đoán | một **class** | một **số**, gọi là *target* |
| Ví dụ của sách | bộ lọc thư rác | giá một chiếc xe |

Hai chữ này **không tách bạch như vẻ ngoài**. Logistic regression mang chữ "regression"
nhưng được dùng cho classification, vì nó xuất ra *xác suất* thuộc về một lớp — ví dụ
20% khả năng là thư rác. Muốn biến xác suất thành class thì chọn một ngưỡng: từ 0,5 trở
lên là rác, dưới 0,5 là ham.

**Đọc hai chữ đó như hai câu hỏi về cột nhãn, đừng đọc như hai hộp công cụ.** Để cột
nhãn quyết định, không phải thuật toán.

### Từ vựng: nhiều tên cho cùng một thứ

| Thứ | Các tên khác | Ghi chú |
|---|---|---|
| **feature** | *predictor*, *attribute* | một cột đầu vào, ví dụ số km đã đi của xe |
| **label** | *target* | *target* hay dùng hơn ở regression, *label* ở classification |

Chữ `feature` dùng ở **hai mức phóng to**, và sách dùng cả hai trong hai câu liên tiếp:

- một ô: *"feature số km của chiếc xe này bằng 15.000"*
- cả cột: *"feature số km tương quan mạnh với giá"*

Vô hại khi nói, **nguy hiểm khi biến thành code**: câu thứ hai chỉ tính được trên toàn
bộ các dòng, câu thứ nhất là một giá trị. Chốt xem câu đang nói ở mức nào trước khi gõ.

### Giá của giám sát

Thuật toán miễn phí. Dòng dữ liệu thô thường cũng gần miễn phí. **Đáp án thì không.**
Đó là toàn bộ nội dung của mục này, và nó quyết định quy mô phần lớn dự án supervised.

Hai kiểu tiếp theo tồn tại chính vì lý do này — cả hai đều là cách mua cùng một cột
nhãn với ít công người hơn.

### Unsupervised: bốn họ, bốn câu hỏi

Các dòng trông y hệt như ở supervised; **cột nhãn đơn giản là không có**.

| Họ | Câu hỏi nó đặt ra |
|---|---|
| **Clustering** | Có những nhóm instance giống nhau nào? |
| **Visualisation / dimensionality reduction** | Vẽ ra được không, hoặc bỏ bớt cột mà không mất nhiều? |
| **Anomaly / novelty detection** | Cái gì không thuộc về đây? |
| **Association rule learning** | Những thuộc tính nào đi với nhau? |

**Clustering** giống một `GROUP BY` mà *thuật toán tự nghĩ ra cột để group*.

**Dimensionality reduction mất mát dữ liệu một cách có chủ đích.** Gộp số km và tuổi xe
thành một feature "hao mòn" là vứt bỏ khả năng hỏi riêng từng cái, đổi lấy tốc độ và
đôi khi là độ chính xác. Chữ đỡ cả ý tưởng này là **tương quan**: hai cột đi cùng nhau
thì mang thông tin chồng lấn, nên gộp lại mất ít. Nó **hết an toàn** khi hai cột chỉ
tình cờ đi cùng nhau *trong đúng mẫu này*.

**Anomaly vs novelty** là cùng một việc với mức sạch dữ liệu khác nhau:

| | Anomaly detection | Novelty detection |
|---|---|---|
| Phát hiện | instance bất thường | instance thuộc loại **chưa từng thấy** |
| Train trên | phần lớn là instance bình thường | tập train **hoàn toàn không chứa** loại cần phát hiện |
| Ảnh Chihuahua mới, khi 1% ảnh chó trong train là Chihuahua | **có thể bị gắn cờ** — hiếm và khác | **không bị gắn cờ** — đã có trong train |

**Lựa chọn giữa hai cái được quyết định lúc gom dữ liệu train, không phải lúc chọn
thuật toán.**

### Không có đáp án thì "tốt" phải được định nghĩa

Không có cột nhãn nên không có gì để đối chiếu: câu *"phân cụm này có đúng không"*
**không có đáp án** theo cách mà *"email này phân loại đúng không"* có. Đó mới là khác
biệt thật so với supervised.

Vì thế kết quả unsupervised thường được phán xử bằng việc **nó có giúp bước sau hay
không** — chính là lý do sách đưa ra cho dimensionality reduction: thuật toán supervised
chạy sau đó **nhanh hơn, và đôi khi chính xác hơn**.

### Semi-supervised: gắn nhãn vài cái, không phải tất cả

Dịch vụ lưu ảnh là ví dụ đời thường:

```text
1. phan khong giam sat: phan cum anh
      nguoi A xuat hien o anh 1, 5, 11
      nguoi B xuat hien o anh 2, 5, 7
2. phan cua ban: mot nhan cho moi nguoi ("nguoi A la ...")
3. dich vu dat ten cho toan bo cum
```

Phần lớn thuật toán semi-supervised bên dưới là **tổ hợp của unsupervised và supervised**.

### Self-supervised: dữ liệu tự sinh nhãn cho mình

Sinh ra một tập **có nhãn đầy đủ** từ một tập **hoàn toàn không nhãn**, rồi train bằng
kỹ thuật supervised thông thường.

Ví dụ của sách: che một mảng ngẫu nhiên trên mọi ảnh trong một kho ảnh lớn, rồi train
model dựng lại phần bị che. **Ảnh bị che là đầu vào, ảnh gốc là đáp án.** Không ai viết
một nhãn nào; dữ liệu tự cung cấp.

Mẹo nằm ở chỗ model học được **representation dùng được xa hơn nhiều** so với nhiệm vụ
nhân tạo đó. Một model học vá ảnh hoá ra là điểm khởi đầu tốt để **phân loại** ảnh, sau
khi *fine-tune* — train thêm một chút trên việc thật sự cần. Dùng lại model kiểu này
gọi là **transfer learning**, một trong những ý tưởng quan trọng nhất của ML hiện đại.

> **Giới hạn suy ra từ chính logic đó:** nhiệm vụ bịa ra **phải đòi hỏi đúng loại hiểu
> biết mà nhiệm vụ thật cần**, nếu không thì chẳng học được gì đáng dùng lại.

### Reinforcement: học từ phần thưởng

```text
agent ----- thuc hien hanh dong ----> moi truong
  ^                                       |
  +---- quan sat + thuong hoac phat ------+
```

Hệ thống học gọi là **agent**: quan sát môi trường, chọn và thực hiện **hành động**,
nhận về **reward** (hoặc **penalty** — reward âm). Nó phải tự học ra chiến lược tốt
nhất, gọi là **policy** — cuốn sổ luật *"ở tình huống này thì làm thế này"*, được **học
ra chứ không phải viết ra**. Đúng là `CASE WHEN` mà không ai phải viết.

**Cái làm nó khó là độ trễ:** phần thưởng cho một hành động tốt có thể đến rất lâu sau
hành động đó, nên agent phải tự tìm ra *trong hàng loạt lựa chọn trước đó, cái nào đã
kiếm được nó*. Robot tập đi và AlphaGo là ví dụ chuẩn đúng vì cả hai đều phải đi một
chuỗi dài hành động trước khi có điểm.

## Ví dụ

Chạy thật 29/09/2026 tại `~/learn-lab/ml` — scikit-learn 1.9.1, trên bộ dữ liệu 27 quốc
gia của sách.

**Cùng một bảng, hai loại bài toán supervised:**

| Quốc gia | GDP đầu người (feature) | Life satisfaction (label) |
|---|---|---|
| Russia | 26.456 | 5,8 |
| Poland | 32.238 | 6,1 |
| Finland | 47.261 | 7,6 |

- Dự đoán điểm số (5,8 / 6,1 / 7,6 — bất kỳ số nào trên thang 0–10) là **regression**.
- Biến nhãn thành hai lớp *"từ 7 trở lên"* và *"dưới 7"* thì **cùng bảng đó** thành
  **classification**: 11 nước ở lớp đầu, 16 ở lớp sau. Russia và Poland "dưới 7";
  Finland "từ 7 trở lên".

**Cùng bảng đó, bỏ cột nhãn đi, thành unsupervised.** Chạy k-means xin 2 nhóm:

| nhóm | số nước | GDP thấp nhất | GDP cao nhất | tâm nhóm |
|---|---|---|---|---|
| 1 | 16 | Russia, 26.456 | New Zealand, 42.404 | 34.751 |
| 2 | 11 | Canada, 45.857 | United States, 60.236 | 51.475 |

Không ai bảo thuật toán cắt ở đâu; nó đặt nhát cắt giữa New Zealand (42.404) và Canada
(45.857). Và nó **không nói được các nhóm đó *nghĩa là* gì**. "Nghèo hơn" và "giàu hơn"
là cách *chúng ta* đọc, không phải thứ thuật toán xuất ra.

**Đó chính xác là cái giá của cột nhãn bị thiếu: thuật toán tìm ra cấu trúc, và một
người phải đặt tên cho nó.**

**Self-supervised không có ca thật nào trong bảng này — và hiểu vì sao là cách ghim ý
tưởng chắc nhất.** Giấu điểm của Hungary (5,6), train đường thẳng trên 26 nước còn lại,
rồi hỏi về Hungary: nó trả lời **5,87**. Đó **không phải** self-supervised. Con số 5,6
là một nhãn **người đã sản xuất ra** (nó là kết quả khảo sát), nên đây là supervised
thông thường với một dòng giữ lại để đối chiếu. Self-supervised bắt đầu từ dữ liệu
**không có nhãn** và *chế tạo* ra nhãn.

## Trade-offs

| Supervised | Unsupervised |
|---|---|
| Có đáp án để chấm — "đúng" đo được | Không có đáp án; "tốt" phải tự định nghĩa |
| Cột nhãn là hoá đơn lớn nhất | Không tốn công gắn nhãn |
| Kết quả bảo vệ được trước nghiệp vụ | Kết quả cần một người đặt tên và diễn giải |

| Semi-supervised | Self-supervised |
|---|---|
| Xin người vài nhãn, lan ra các cụm máy đã tìm | Chế nhãn từ dữ liệu sẵn có, không cần người |
| Hiệu quả khi dữ liệu có cấu trúc cụm rõ | Hiệu quả khi nhiệm vụ bịa ra ép học đúng thứ cần |
| Vài nhãn vẫn phải đúng | Không có nhãn người nào để sai |

| Anomaly detection | Novelty detection |
|---|---|
| Chịu được vài ca lạ lẫn trong train | Đòi tập train **sạch tuyệt đối** loại cần phát hiện |
| Dễ gom dữ liệu hơn | Khó gom, nhưng phân biệt được "hiếm" với "mới" |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Lên kế hoạch dự án supervised mà chưa lên kế hoạch gắn nhãn | Phát hiện hoá đơn lớn nhất ở giữa dự án |
| Đọc "classification vs regression" như hai bộ thuật toán | Bỏ qua logistic regression, bỏ qua việc cùng thuật toán làm được cả hai |
| Trộn hai mức phóng to của chữ `feature` trong cùng một đoạn code | Tính thống kê toàn cột rồi dùng như giá trị một dòng |
| Coi self-supervised là unsupervised | Quên mất vẫn phải tách test set như mọi bài supervised |
| Gộp hai cột tương quan mà không kiểm tra tương quan có bền không | Mất thông tin thật vì một trùng hợp của mẫu |
| Chọn novelty detection nhưng train trên dữ liệu có lẫn loại cần bắt | Nó im lặng trở thành anomaly detection, và không ai biết |
| Kỳ vọng clustering tự đặt tên cho nhóm | Nó không làm, và cũng không báo là nó không làm |

## FAQ

<details>
<summary>Bài toán của tôi có nhãn nhưng rất ít và rất đắt — làm gì?</summary>

Đó đúng là semi-supervised. Công thức thực dụng của HOML3 chương 9: **phân cụm dữ liệu
không nhãn trước, gắn nhãn tay cho một mẫu đại diện của mỗi cụm, rồi lan nhãn ra cả cụm.**

Với cùng công sức gắn tay, cách này thường cho model tốt hơn hẳn so với gắn nhãn ngẫu
nhiên đúng chừng ấy dòng — vì mỗi nhãn bỏ ra mua được nhiều dòng hơn.

</details>

<details>
<summary>Vì sao một nhiệm vụ bịa ra lại dạy được điều gì thật?</summary>

Không ai cần ảnh được vá lại. Nhiệm vụ che ảnh có ích vì **để lấp được cái lỗ, model
buộc phải học ảnh nói chung trông như thế nào** — và hiểu biết đó chuyển được sang việc
thật sau khi fine-tune.

Giới hạn suy ra từ cùng logic: nhiệm vụ bịa ra phải **đòi hỏi đúng loại hiểu biết** mà
nhiệm vụ thật cần. Che ngẫu nhiên một pixel thì không ép học được gì.

</details>

<details>
<summary>Vì sao tính năng gom mặt người của dịch vụ ảnh là semi-supervised chứ không phải unsupervised?</summary>

Vì phần phân cụm là unsupervised, nhưng **bước cuối cần đúng một nhãn người cho mỗi
cụm** để đặt tên. Bỏ bước đó đi thì dịch vụ chỉ nói được "ba ảnh này cùng một người",
không nói được người đó là ai. Cái nhãn ít ỏi đó là phần "semi".

</details>

<details>
<summary>Không có đáp án thì làm sao biết một phân cụm là tốt, hay chọn bao nhiêu cụm?</summary>

Hai đường. **Nội tại:** điểm silhouette — mỗi điểm thuộc về cụm của nó rõ ràng đến đâu
so với cụm bên cạnh. **Ngoại tại và thực dụng hơn:** nó có làm bước sau tốt lên không.

Chi tiết ở [Chọn k cho clustering](#) và Clustering (chương 9, chưa viết).

</details>

<details>
<summary>Reinforcement learning có xếp cùng thang với bốn cái kia không?</summary>

Không, và đó là điểm quan trọng. Bốn cái kia khác nhau ở **cần bao nhiêu nhãn người**.
RL không đọc dữ liệu — nó **hành động** và nhận điểm. Nó cần một **môi trường**, không
phải một tập dữ liệu. Vì thế sách vẽ nó thành một vòng lặp riêng.

</details>

## Related Topics

- [Machine Learning là gì](ml-landscape.md) — T/E/P, và ba trục phân loại
- [Batch và online learning](batch-vs-online.md) — trục 2
- [Instance-based và model-based](instance-vs-model-based.md) — trục 3
- [Dữ liệu xấu](bad-data.md) — nhãn sai còn tệ hơn không có nhãn
- [Metric hiệu năng](performance-metrics.md) — classification và regression đo bằng thước khác nhau
- [Data Quality](../../../data-quality/index.md)

## References

- Aurélien Géron — *Hands-On Machine Learning*, 3rd ed., chương 1, bài b03, b04 và b05
