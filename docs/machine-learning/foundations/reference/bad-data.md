---
title: Dữ liệu xấu — bốn thử thách đầu tiên
sidebar_position: 5
description: "Không cái nào chữa được bằng thuật toán tốt hơn. Cả bốn đều hỏng im lặng: job chạy xong, model train xong, số trả về, và vẫn sai."
tags: [data-quality, sampling-bias, sampling-noise, feature-engineering, missing-values, homl3, chuong-1]
domain: ai
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-29
---

# Dữ liệu xấu — bốn thử thách đầu tiên

> **Chốt:** Khi một model làm bạn thất vọng, thủ phạm là **dữ liệu xấu** hoặc **model
> xấu**. Bốn cách dữ liệu hỏng đều có chung một tính chất nguy hiểm: **không có gì
> fail** — job chạy xong, model train xong, số trả về, và model **tự tin sai đúng ở
> những đầu vào không ai lấy mẫu**.

## Mục tiêu

Kiểm tra dữ liệu **trước khi** đổ lỗi cho thuật toán, và phân biệt được hai vấn đề lấy
mẫu — vì **cùng một hành động chữa cái này và làm cái kia tệ đi**.

## Tổng quan

```text
Cai gi co the hong
├── du lieu xau    <- bai nay
│   ├── 1. so luong khong du
│   ├── 2. du lieu khong dai dien
│   ├── 3. chat luong kem
│   └── 4. feature khong lien quan
└── model xau      <- bai sau: overfitting va underfitting
```

Đây là những vấn đề chất lượng dữ liệu bạn đã quen đuổi trong pipeline, **với một khúc
ngoặt khó chịu: model vẫn train, vẫn trả về số, và vẫn sai.**

### 1 · Số lượng không đủ

Một đứa trẻ cần được chỉ quả táo vài lần. Thuật toán ML cần **hàng nghìn** ví dụ cho
bài toán đơn giản, và thường **hàng triệu** cho bài khó như nhận dạng ảnh hay giọng nói.

Kết quả Banko và Brill mà sách trích dẫn là thứ khó chịu: trên một bài phân biệt ngôn
ngữ tự nhiên (chọn giữa "to", "two", "too" theo ngữ cảnh), **những thuật toán rất khác
nhau cho kết quả gần như y hệt một khi được cho đủ dữ liệu.**

Chi tiết đáng nhớ hơn cả kết luận: **thứ hạng đảo ngược.** Thuật toán tệ nhất trên dữ
liệu nhỏ (Winnow, ~0,75) kết thúc **tốt nhất** trên dữ liệu lớn; thuật toán tốt nhất lúc
đầu (Memory-Based, ~0,83) về **cuối bảng** (0,942).

**So sánh thuật toán trên một tập dữ liệu nhỏ có thể dẫn bạn đi sai hoàn toàn.**

Cảnh báo ngược lại cũng quan trọng: tập dữ liệu nhỏ và vừa vẫn rất phổ biến, và **lấy
thêm dữ liệu không phải lúc nào cũng rẻ hoặc khả thi.**

### 2 · Dữ liệu không đại diện

Để khái quát hoá tốt, dữ liệu train **phải đại diện cho những ca bạn muốn khái quát
hoá tới**.

Hai cách một mẫu có thể không đại diện — và **chỉ một cái chữa được bằng cách lấy thêm
dữ liệu**:

| Vấn đề | Nguyên nhân | Lấy thêm dữ liệu có chữa được không |
|---|---|---|
| **sampling noise** | mẫu **quá nhỏ**, nên không đại diện **do tình cờ** | **Có** |
| **sampling bias** | **cách lấy mẫu** sai, nên mẫu lớn cũng không đại diện | **Không — chỉ làm câu trả lời sai tự tin hơn** |

**Ca kinh điển của sampling bias:** năm 1936, *Literary Digest* gửi phiếu thăm dò cho
khoảng **10 triệu** người, nhận về **2,4 triệu** câu trả lời, và dự đoán Landon thắng
với 57%. **Roosevelt thắng với 62%.** Một mẫu khổng lồ, lấy sai cách.

> **Trước khi ai đó đề xuất "lấy thêm dữ liệu đi", hãy xác định bạn đang có cái nào
> trong hai.** Cùng một hành động chữa cái thứ nhất và làm cái thứ hai tệ đi.

### 3 · Chất lượng kém

Lỗi, **outlier** (instance nằm xa hẳn phần còn lại) và **nhiễu** làm quy luật bên dưới
khó lộ ra, nên dọn dẹp thường đáng công.

- **Outlier rõ ràng** thường tốt nhất là **bỏ đi hoặc sửa tay**.
- **Instance thiếu vài feature** — ví dụ 5% khách không cho biết tuổi — buộc phải chọn:

| Cách | Bằng ngôn ngữ SQL | Cái giá thật |
|---|---|---|
| Bỏ cả thuộc tính | `DROP COLUMN age` | **Bỏ một feature cho mọi dòng** để xử lý 5% |
| Bỏ những dòng đó | `WHERE age IS NOT NULL` | Những khách giấu tuổi **có thể không giống** những khách khai |
| Điền giá trị, ví dụ median | `COALESCE(age, median_age)` | Đặt vào một giá trị **không ai quan sát được**, và âm thầm làm những dòng đó trông trung bình |
| **Train hai model, một có feature một không** | dựng cả hai; dòng có giá trị đi model thứ nhất, dòng thiếu đi model thứ hai | **Cách duy nhất sinh ra bằng chứng thay vì sở thích** — và rẻ khi model rẻ |

**Bốn lựa chọn này không thay thế được cho nhau.** Ba cái đầu đều là một quyết định
không đo được. Cái thứ tư đo được.

### 4 · Feature không liên quan

Rác vào, rác ra. Thuốc chữa là **feature engineering**:

| Bước | Bằng ngôn ngữ SQL |
|---|---|
| Chọn những feature hữu ích nhất trong số đang có | chọn cột nào vào `SELECT` |
| Rút ra feature mới bằng cách gộp hoặc giảm cái đang có | một cột dẫn xuất, như "hao mòn" từ số km và tuổi |
| Tạo feature từ dữ liệu mới | join thêm một nguồn |

## Ví dụ

Chạy thật 29/09/2026 tại `~/learn-lab/ml` — scikit-learn 1.9.1, trên bộ dữ liệu của sách.

Bảng 27 quốc gia mắc **hai trong bốn** vấn đề.

**Số lượng không đủ.** 27 dòng là cực nhỏ. Luận điểm của sách: ngay cả bài toán đơn giản
cũng cần hàng nghìn.

**Dữ liệu không đại diện.** Mọi quốc gia trong bảng có GDP đầu người nằm giữa **26.456**
(Russia) và **60.236** (United States). Hỏi đường thẳng về một nước giàu hơn thì nó sai
rất nặng:

```text
duong tren 27 nuoc: 3.749 + 0.0000678 x GDP
duong tren 36 nuoc: 5.580 + 0.0000233 x GDP

Luxembourg GDP 110,261 — diem that 6.9
   duong 27 nuoc doan: 11.22   <- vuot tran thang 0-10
   duong 36 nuoc doan: 8.15
```

| Quốc gia (ngoài 27) | GDP đầu người | điểm thật | đường train trên 27 dòng | đường train trên 36 dòng |
|---|---|---|---|---|
| Luxembourg | 110.261 | 6,9 | **11,22** | 8,15 |

**11,22 vượt trần thang 0–10.** Thêm 9 quốc gia vắng mặt (South Africa, Colombia,
Brazil, Mexico, Chile, Norway, Switzerland, Ireland, Luxembourg) làm đường **phẳng hẳn
đi**: độ dốc rơi từ 0,0000678 xuống 0,0000233 mỗi đô-la, và dự đoán cho Luxembourg tụt
về 8,15.

Vẫn **cao hơn 1,25 điểm** so với sự thật, vì **một đường thẳng không cong xuống được ở
đầu giàu**. Đó không còn là lỗi dữ liệu nữa — đó là lỗi model, xem
[Overfitting và underfitting](overfitting-underfitting.md).

Điểm quan trọng nhất: **đường dốc kia không sai về dữ liệu của chính nó. Nó sai về thế
giới**, vì mẫu nó học từ đó chỉ phủ khúc giữa của dải.

**Chất lượng kém.** Không có ở đây: mọi dòng đủ cả hai số.

**Feature không liên quan.** Chỉ có một feature là GDP đầu người, nên không có gì để
chọn hay bỏ.

## Trade-offs

| Lấy thêm dữ liệu | Dọn dữ liệu đang có |
|---|---|
| Chữa được sampling noise | Chữa được nhiễu và outlier |
| **Không chữa được sampling bias** | Không chữa được thiếu phạm vi |
| Đắt, chậm, đôi khi bất khả thi | Rẻ hơn, nhưng tốn công người |

| Bỏ cột | Bỏ dòng | Điền median | Train hai model |
|---|---|---|---|
| Mất feature cho **mọi** dòng | Mất dòng, **có thể lệch mẫu** | Bịa ra giá trị không quan sát được | Giữ mọi dòng, không bịa gì |
| Rẻ nhất | Rẻ | Rẻ, mặc định của nhiều tool | Đắt gấp đôi, **và là cái duy nhất đo được** |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Đổ lỗi cho thuật toán trước khi kiểm dữ liệu | Đổi model vài lần, không cái nào chạm tới nguyên nhân |
| Đề xuất "lấy thêm dữ liệu" khi vấn đề là **bias** | Mẫu lớn hơn chỉ làm câu trả lời sai **tự tin hơn** |
| So sánh thuật toán trên một tập nhỏ rồi chốt | Thứ hạng đảo ngược khi dữ liệu lớn — xem Banko & Brill |
| Điền median rồi quên mất | Những dòng đó **âm thầm trông trung bình**, và không ai biết dòng nào bị điền |
| Tin model ở ngoài dải dữ liệu train | 11,22 trên thang 0–10, không có cảnh báo nào |
| Coi "job chạy xong" là bằng chứng dữ liệu ổn | **Dữ liệu xấu không làm fail cái gì cả** |

## FAQ

<details>
<summary>Tôi có 30 dòng và một model khớp chúng hoàn hảo. Vấn đề nào đáng lo nhất?</summary>

**Số lượng không đủ**, và hệ quả trực tiếp của nó. Với 30 dòng, một model đủ linh hoạt
**luôn** tìm được một quy luật đúng với mọi dòng — mà quy luật đó là bằng chứng về 30
dòng ấy, không phải về thế giới.

"Khớp hoàn hảo" ở đây gần như chắc chắn là [overfitting](overfitting-underfitting.md),
và không có cách nào phát hiện được cho tới khi giữ lại dữ liệu — xem
[Kiểm thử và thẩm định](testing-and-validating.md).

</details>

<details>
<summary>Tool tiêu chuẩn thật sự làm gì với ô trống, và điền median gây ra gì về sau?</summary>

`scikit-learn` có `SimpleImputer` cài đặt ba trong bốn lựa chọn ở trên, và thêm một ý
tưởng bài học **không nhắc tới**: một **cột chỉ báo** đánh dấu giá trị nào đã bị điền
(`add_indicator=True`).

Cột đó quan trọng, vì nó trả lại thứ mà việc điền đã lấy đi: **khả năng phân biệt "tuổi
35" với "không biết, coi như 35".** Nếu việc khách không khai tuổi tự nó mang thông tin —
và thường là có — thì cột chỉ báo chính là feature đó.

</details>

<details>
<summary>Làm sao biết mẫu của mình có bias mà không có sẵn "sự thật" để so?</summary>

Không có phép thử chắc chắn, nhưng có ba việc làm được: so **phân phối biên** của mẫu
với một nguồn dân số đã biết; kiểm **phạm vi** của mọi feature quan trọng (đúng cái đã
lộ ra vấn đề ở bảng 27 nước — không có GDP nào dưới 26.456); và truy lại **cơ chế lấy
mẫu** rồi hỏi ai bị loại ra một cách hệ thống.

*Literary Digest* thất bại ở cái thứ ba: danh sách gửi thư lấy từ đăng ký ô tô và danh
bạ điện thoại, năm 1936.

</details>

<details>
<summary>"Dữ liệu xấu" khác gì với "dữ liệu bẩn" trong pipeline thường ngày?</summary>

Chồng lấn một phần. Dữ liệu bẩn (sai kiểu, trùng dòng, null bất ngờ) thường **làm fail
gì đó**, hoặc ít nhất làm một test đỏ lên.

Hai vấn đề đầu ở bài này — **không đủ** và **không đại diện** — **không thể phát hiện
bằng bất kỳ test nào chạy trên chính dữ liệu đó**. Dữ liệu hoàn toàn hợp lệ. Nó chỉ là
dữ liệu sai.

</details>

## Related Topics

- [Overfitting và underfitting](overfitting-underfitting.md) — nhánh còn lại của cây "cái gì có thể hỏng"
- [Kiểm thử và thẩm định](testing-and-validating.md) — cách bắt những lỗi này bằng số
- [Instance-based và model-based](instance-vs-model-based.md) — vì sao 11,22 không có cảnh báo nào
- [Học có giám sát và không giám sát](supervised-unsupervised.md) — nhãn là phần đắt, và nhãn sai còn tệ hơn
- [Data Quality](../../../data-quality/index.md) — sáu chiều chất lượng, áp cho bảng nguồn
- [Case study: chọn feature trước khi tách](../case-studies/chon-feature-truoc-khi-tach.md)

## References

- Aurélien Géron — *Hands-On Machine Learning*, 3rd ed., chương 1, bài b09
- Banko & Brill (2001), kết quả về dữ liệu so với thuật toán
