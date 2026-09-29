---
title: Luxembourg 11,22 trên thang 0–10
sidebar_position: 3
description: "Model trả lời đầy tự tin ở ngoài vùng dữ liệu nó từng thấy, vượt trần thang đo, và không có cảnh báo nào."
tags: [extrapolation, sampling-bias, model-rot, machine-learning, homl3, chuong-1]
domain: ai
category: concept
doc_type: case-study
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-29
---

# Luxembourg 11,22 trên thang 0–10

> **Chốt:** Một model tuyến tính hoàn toàn đúng đắn, train trên dữ liệu hoàn toàn sạch,
> trả về **11,22** cho một thang điểm **0–10**. Không exception, không warning. **Model
> không biết khi nào nó đang đoán.**

## Tình huống

Bộ dữ liệu life satisfaction của Géron: 27 quốc gia, một feature (GDP đầu người), một
nhãn (điểm 0–10). Không có ô trống, không outlier, không lỗi kiểu dữ liệu. Về mọi tiêu
chí chất lượng dữ liệu thông thường, **bảng này sạch**.

Model: `LinearRegression`. Câu hỏi: Luxembourg chấm bao nhiêu điểm?

## Giả thuyết ban đầu — và nó sai ở đâu

> "Dữ liệu sạch và model đơn giản, nên dự đoán sẽ ở mức hợp lý."

Sai ở chỗ *"sạch"* và *"đại diện"* là **hai tính chất khác nhau**, và không test chất
lượng dữ liệu nào chạy trên chính bảng đó phát hiện được cái thứ hai.

Mọi quốc gia trong 27 dòng có GDP đầu người nằm giữa **26.456** (Russia) và **60.236**
(United States). Luxembourg là **110.261** — gần gấp đôi mức cao nhất từng thấy.

## Tái hiện

Chạy thật 29/09/2026 tại `~/learn-lab/ml` — Python 3.12.3, scikit-learn 1.9.1, trên
chính bộ dữ liệu của sách (`ageron/data`).

```python
s27 = pd.read_csv("lifesat.csv")        # 27 nuoc
s36 = pd.read_csv("lifesat_full.csv")   # 36 nuoc, them ca dau ngheo lan dau giau
l27 = LinearRegression().fit(X27, y27)
l36 = LinearRegression().fit(X36, y36)
```

## Kết quả

```text
duong tren 27 nuoc: 3.749 + 0.0000678 x GDP
duong tren 36 nuoc: 5.580 + 0.0000233 x GDP

Luxembourg GDP 110,261 — diem that 6.9
   duong 27 nuoc doan: 11.22   <- vuot tran thang 0-10
   duong 36 nuoc doan: 8.15
```

| Model | Train trên | Độ dốc | Luxembourg | Sai lệch |
|---|---|---|---|---|
| Đường thẳng | 27 nước | 0,0000678 | **11,22** | **+4,32**, và **vượt trần thang đo** |
| Đường thẳng | 36 nước | 0,0000233 | 8,15 | +1,25 |
| *Sự thật* | — | — | *6,9* | — |

Độ dốc rơi xuống **khoảng một phần ba** khi thêm 9 quốc gia còn thiếu.

## Cơ chế

**Ba lỗi khác nhau chồng lên nhau**, và mỗi lỗi là một bài học riêng:

**1 · Sampling bias — mẫu không phủ hết dải.** 27 quốc gia đó không phải một mẫu ngẫu
nhiên của thế giới; chúng là khúc giữa. Đường dốc kia **không sai về dữ liệu của chính
nó** — nó khớp 27 điểm ấy rất tốt. **Nó sai về thế giới.**

**2 · Ngoại suy — một đường thẳng không có khái niệm về biên.** Đường thẳng không mang
thông tin nào về *chỗ bằng chứng của nó dừng lại*. Hỏi ở 110.261, nó nhân và cộng, rồi
trả lời. Hỏi ở 200.000 nó cũng sẽ trả lời. **Cấu trúc của model không có chỗ nào để nói
"tôi không biết".**

**3 · Model rot — và cả sau khi sửa vẫn còn sai.** Đường train trên 36 nước hạ dự đoán
xuống 8,15, nhưng vẫn **cao hơn 1,25 điểm**. Phần dư đó **không còn là lỗi dữ liệu nữa** —
đó là lỗi model: một đường thẳng **không cong xuống được ở đầu giàu**, mà dữ liệu thì có
cong (United States giàu nhất trong 27 nước và chấm thấp hơn cả Denmark lẫn Australia).

Ba lỗi, ba chỗ sửa khác nhau. Sửa cái thứ nhất mà tưởng đã xong là cách mất thêm một vòng.

## Cách chặn

**1 · Ghi lại dải của mọi feature lúc train, và kiểm lúc predict.**

```python
lo, hi = X_train.min(axis=0), X_train.max(axis=0)
# luu lo/hi cung voi model; luc serve thi canh bao neu dau vao nam ngoai
```

Đây là phép kiểm rẻ nhất trong cả bài và gần như không ai làm. Nó biến một câu trả lời
tự tin thành một cảnh báo.

**2 · Kiểm trần và sàn của thang đo.** Nhãn nằm trên thang 0–10 thì **11,22 phải là một
alert**, không phải một giá trị. Ràng buộc miền giá trị của đầu ra là kiểm thử rẻ nhất
có thể có, và nó bắt được lỗi này ngay lập tức.

**3 · Vẽ dữ liệu trước khi chọn dạng model.** Biểu đồ phân tán cho thấy quan hệ **phẳng
ra ở đầu giàu**. Một đường thẳng không theo được hình đó, và điều này thấy được **trước
khi** train.

**4 · Hỏi "mẫu này thiếu ai" trước khi hỏi "mẫu này có đủ lớn không".** Xem
[Dữ liệu xấu](../reference/bad-data.md): thêm dữ liệu chữa được sampling noise và
**không** chữa được sampling bias.

## Dấu hiệu nhận ra trong dự án thật

| Dấu hiệu | Mức nghi ngờ |
|---|---|
| Dự đoán nằm ngoài miền giá trị hợp lệ của nhãn | **Chắc chắn có vấn đề** |
| Đầu vào lúc serve nằm ngoài dải lúc train | Cao |
| Model tuyến tính trên dữ liệu có bão hoà hoặc trần | Cao |
| Hiệu năng tốt offline, kém hẳn với một phân khúc khách hàng | Cao — phân khúc đó có thể không có trong train |
| Không ai ghi lại dải feature lúc train | Không phát hiện được gì cả |

## Related Topics

- [Dữ liệu xấu](../reference/bad-data.md) — sampling bias, và vì sao thêm dữ liệu không chữa
- [Batch và online learning](../reference/batch-vs-online.md) — model rot: model trả lời bằng thế giới hôm qua
- [Instance-based và model-based](../reference/instance-vs-model-based.md) — model không biết khi nào nó đang đoán
- [Overfitting và underfitting](../reference/overfitting-underfitting.md) — phần dư 1,25 điểm là underfit, không phải lỗi dữ liệu
- [Foundations](../index.md)
