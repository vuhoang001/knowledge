---
title: k-means cắt đúng chỗ, và không nói được nhóm nghĩa là gì
sidebar_position: 5
description: "Thuật toán tìm ra cấu trúc thật trên 27 quốc gia, đặt nhát cắt hợp lý, rồi dừng lại — 'nghèo hơn' và 'giàu hơn' là cách người đọc, không phải output."
tags: [clustering, unsupervised, k-means, machine-learning, homl3, chuong-1]
domain: ai
category: concept
doc_type: case-study
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-29
---

# k-means cắt đúng chỗ, và không nói được nhóm nghĩa là gì

> **Chốt:** Bỏ cột nhãn đi, k-means vẫn tìm ra cấu trúc thật và đặt nhát cắt ở chỗ hợp
> lý. Nhưng nó **không xuất ra ý nghĩa nào**. "Nghèo hơn" và "giàu hơn" là *chúng ta*
> đọc vào. **Đó chính xác là cái giá của cột nhãn bị thiếu.**

## Tình huống

Cùng bảng 27 quốc gia, nhưng **xoá cột life satisfaction đi**. Còn lại: tên nước và GDP
đầu người. Không nhãn, nên không có bài toán supervised nào.

Câu hỏi: vẫn làm được gì có ích không?

## Giả thuyết ban đầu — và nó sai ở đâu

> "Chạy clustering là sẽ ra các phân khúc, rồi dùng luôn tên phân khúc đó."

Nửa đầu đúng, nửa sau không. Clustering trả về **nhãn nhóm dạng số** — `0`, `1` — và
**danh sách thành viên**. Nó không trả về `"nghèo hơn"`, không trả về `"thị trường mới
nổi"`, không trả về bất cứ chữ nào.

Sâu hơn: **không có đáp án để đối chiếu**, nên câu hỏi *"phân cụm này có đúng không"*
**không có câu trả lời** theo cách mà *"email này phân loại đúng không"* có.

## Tái hiện

Chạy thật 29/09/2026 tại `~/learn-lab/ml` — scikit-learn 1.9.1, seed `random_state=42`,
trên `lifesat.csv` đã bỏ cột nhãn.

```python
km = KMeans(n_clusters=2, random_state=42, n_init=10).fit(X)   # X = chi cot GDP
```

## Kết quả

```text
k-means 2 nhom:
   nhom: 16 nuoc | thap nhat Russia 26,456 | cao nhat New Zealand 42,404 | tam 34,751
   nhom: 11 nuoc | thap nhat Canada 45,857 | cao nhat United States 60,236 | tam 51,475
```

| nhóm | số nước | GDP thấp nhất | GDP cao nhất | tâm nhóm |
|---|---|---|---|---|
| 1 | 16 | Russia, 26.456 | New Zealand, 42.404 | 34.751 |
| 2 | 11 | Canada, 45.857 | United States, 60.236 | 51.475 |

**Không ai bảo thuật toán cắt ở đâu.** Nó đặt nhát cắt vào khoảng trống lớn nhất — giữa
New Zealand (42.404) và Canada (45.857), một khe **3.453 đô-la**, rộng hơn mọi khe khác
trong vùng đó.

Đối chiếu với nhãn đã bị giấu đi: 11 nước chấm từ 7 điểm trở lên, 16 nước dưới 7 —
**đúng cùng tỷ lệ 11/16**. Trùng hợp thú vị, nhưng **không phải cùng một tập nước**, và
thuật toán không có cách nào biết điều đó.

## Cơ chế

k-means tối ưu đúng một thứ: **tổng bình phương khoảng cách từ mỗi điểm tới tâm nhóm của
nó**. Nó đặt nhát cắt ở chỗ làm con số đó nhỏ nhất — tức là ở khoảng trống lớn nhất.

Đó là một mục tiêu **hình học thuần tuý**. Không có chỗ nào trong nó mã hoá "giàu",
"nghèo", "thị trường phát triển", hay bất cứ khái niệm nào của con người. Cấu trúc nó
tìm ra là **thật**; **ý nghĩa** thì không tồn tại trong output.

## Cái giá, phát biểu cho chính xác

| Supervised có | Unsupervised không có |
|---|---|
| Đáp án để chấm — "đúng" đo được | Không có gì để đối chiếu |
| Tên lớp do người đặt trước | Nhóm chỉ có số thứ tự |
| Metric tuyệt đối (accuracy, RMSE) | Chỉ có metric nội tại (silhouette) hoặc đánh giá gián tiếp |

Vì thế kết quả unsupervised thường được phán xử bằng **nó có giúp bước sau hay không** —
đúng lý lẽ mà sách dùng để biện minh cho dimensionality reduction: thuật toán supervised
chạy sau đó **nhanh hơn, và đôi khi chính xác hơn**.

## Cách dùng cho đúng

**1 · Coi clustering là bước sinh giả thuyết, không phải bước ra kết luận.** Nó chỉ ra
*ở đâu có ranh giới*. Ranh giới đó *nghĩa là gì* thì một người phải trả lời.

**2 · Luôn có một người đặt tên nhóm, và ghi lại cơ sở.** "Nhóm 2 = thu nhập cao" là một
**diễn giải**, và nó phải được viết ra ở đâu đó để sáu tháng sau còn cãi lại được.

**3 · Kiểm nhát cắt có bền không.** Đổi seed, đổi `k`, thêm vài dòng. Nhát cắt giữa New
Zealand và Canada bền vì nó nằm ở một khoảng trống thật. Một nhát cắt nhảy lung tung khi
đổi seed là nhát cắt không có gì đỡ.

**4 · Nếu cuối cùng vẫn cần nhãn, cân nhắc semi-supervised.** Phân cụm trước, gắn nhãn
tay cho **một đại diện mỗi cụm**, rồi lan ra — xem
[Học có giám sát và không giám sát](../reference/supervised-unsupervised.md).

## Dấu hiệu nhận ra trong dự án thật

| Dấu hiệu | Vấn đề |
|---|---|
| Tên phân khúc xuất hiện trong báo cáo mà không ai nhớ ai đặt | Diễn giải đã thành "sự thật" |
| Đổi seed thì thành viên nhóm đổi nhiều | Nhát cắt không nằm ở khoảng trống thật |
| `k` được chọn vì "nghiệp vụ muốn 4 phân khúc" | Hợp lệ, nhưng phải ghi rõ là ràng buộc nghiệp vụ, không phải phát hiện |
| Không ai đo silhouette hay kiểm nhát cắt | Không có bằng chứng nào cho rằng nhóm có thật |

## Related Topics

- [Học có giám sát và không giám sát](../reference/supervised-unsupervised.md) — bốn họ unsupervised, và giá của cột nhãn
- [Machine Learning là gì](../reference/ml-landscape.md) — T/E/P: unsupervised thiếu chữ P tuyệt đối
- [Kiểm thử và thẩm định](../reference/testing-and-validating.md) — không có nhãn thì "đánh giá" nghĩa khác hẳn
- [Foundations](../index.md)
