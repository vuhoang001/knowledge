---
title: Machine Learning là gì, và khi nào đáng dùng
sidebar_position: 1
description: "Định nghĩa T/E/P của Mitchell biến một mong muốn thành ba thứ đi lấy được; bốn tình huống ML trả công hơn luật viết tay."
tags: [machine-learning, mitchell, supervised, homl3, chuong-1]
domain: ai
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-29
---

# Machine Learning là gì, và khi nào đáng dùng

> **Chốt:** Machine Learning là lập trình bằng **ví dụ** thay vì bằng **luật** — mũi tên
> đảo chiều. Và một bài toán chỉ có thật khi gọi tên được **cả ba** chữ T, E, P. Thiếu
> một chữ thì đó là một *mong muốn*, không phải bài toán ML.

## Mục tiêu

Có một phép thử **mang tính phá huỷ có chủ đích**: đặt ba câu hỏi làm chết phần lớn
yêu cầu "hãy dùng AI cho việc này" ngay trong một cuộc họp, thay vì sau một quý.

## Tổng quan

### Mũi tên đảo chiều

```text
Lập trình truyền thống:  dữ liệu + luật     ->  chương trình  ->  đáp án
Machine Learning:        dữ liệu + đáp án   ->  training      ->  luật (model)
```

Nói bằng ngôn ngữ SQL: lập trình truyền thống là bạn tự viết các `CASE WHEN`. Machine
Learning là bạn đưa vào những dòng **đã điền sẵn cột đáp án**, và training tự tìm ra
`CASE WHEN` đó.

### Hai định nghĩa, và chỉ một cái dùng được

| | Phát biểu | Dùng để làm gì |
|---|---|---|
| **Arthur Samuel, 1959** | Lĩnh vực cho máy tính khả năng học mà không cần được lập trình tường minh | Giải thích *ý tưởng* cho người ngoài |
| **Tom Mitchell, 1997** | Một chương trình học từ kinh nghiệm **E** với nhiệm vụ **T** và thước đo **P**, nếu hiệu năng trên T — đo bằng P — cải thiện theo E | **Quyết định có bắt đầu được hay không** |

Định nghĩa của Samuel nói ML *là gì*. Định nghĩa của Mitchell nói bạn *có bài toán để
bắt đầu hay chưa*. Chỉ cái thứ hai đo được.

### Ba chỗ trống phải điền

| Chữ | Phải gọi tên được | Trong bộ lọc thư rác |
|---|---|---|
| **T** — task | Việc cần làm | Gắn nhãn *rác* / *không rác* cho một email |
| **E** — experience | Dữ liệu nó học từ đó; một ví dụ gọi là *training instance* | Những email người dùng đã gắn nhãn |
| **P** — performance measure | Thước đo để phán xử | Tỷ lệ email phân loại đúng |

**Phần lớn yêu cầu ML chết ở E hoặc ở P** — không ai có dữ liệu đã gắn nhãn, hoặc không
ai thống nhất được "tốt hơn" nghĩa là gì. Phát hiện ra điều đó tốn một cuộc họp; phát
hiện muộn tốn một quý.

> **P không phải báo cáo đọc sau, mà là cái đích.** Định nghĩa nói hiệu năng cải thiện
> *đo bằng P*, nên **bất cứ thứ gì P bỏ qua, hệ thống được phép làm tệ**. P của bộ lọc
> thư rác ở trên — tỷ lệ phân loại đúng — coi *để lọt một thư rác* và *chặn nhầm một thư
> thật* là **cùng một lỗi**. Với một hệ thống mail thì hai cái đó không hề giống nhau.
> Chọn P là một **quyết định thiết kế**, không phải thủ tục.

### Dữ liệu một mình không phải kinh nghiệm

Tải toàn bộ Wikipedia về máy là rất nhiều dữ liệu, nhưng **không có gì học được cả**:
không có T, không có P nào đang cải thiện theo nó.

Đây đúng là ranh giới hay bị vượt trong công việc dữ liệu: đổ một bảng lớn vào lake
**không** làm báo cáo nào chính xác hơn trong ngày nó hạ cánh. Câu *"chúng ta có dữ
liệu"* tự nó chưa bao giờ là lập luận rằng một model là khả thi.

### Bốn tình huống ML trả công hơn luật viết tay

| Tình huống | Vì sao ML thắng |
|---|---|
| Giải pháp hiện tại là một danh sách luật dài, chỉnh tay | ML rút ngắn code, dễ bảo trì hơn |
| **Không có giải pháp truyền thống nào tốt** | Nhận dạng giọng nói — không ai viết nổi luật phân biệt "one" với "two" qua mọi giọng, mọi phòng ồn |
| **Môi trường thay đổi liên tục** | Train lại trên dữ liệu mới; đây là lợi thế sắc nhất |
| Hiểu dữ liệu lớn / phức tạp | Mở model ra xem nó học gì — **data mining** |

**Tình huống thứ ba khác hẳn ba cái kia về bản chất.** Ba cái còn lại: ML là *công cụ
tốt hơn cho cùng một việc*. Cái này: ML là **một mô hình vận hành khác**. Bộ lọc luật
cần một người phát hiện ra spammer đã đổi "4U" thành "For U" rồi vá tay. Bộ lọc được
train lại tự khép vòng đó.

Cái giá phải trả: **hệ thống giờ thay đổi mà không ai quyết định là nó nên thay đổi** —
chính xác là lý do phần sau dành nhiều chỗ cho dữ liệu xấu và giám sát.

### Khi nào ML *không* phải câu trả lời

**Khi luật ngắn và ổn định.** Bảng dưới là phép so sánh thật, không phải giả định.

## Ví dụ

Chạy thật 29/09/2026 tại `~/learn-lab/ml` — Python 3.12.3, scikit-learn 1.9.1,
trên **chính bộ dữ liệu của sách** (`ageron/data`, `lifesat.csv`, 27 quốc gia).

Một người có thể viết tay luật này: *GDP đầu người trên 40.000 USD thì đoán 7, còn lại
đoán 6.* Một dòng `CASE WHEN`. So với đường thẳng mà training tìm ra:

| Quốc gia | GDP đầu người | điểm thật | luật viết tay | đường đã train |
|---|---|---|---|---|
| Hungary | 31.008 | 5,6 | 6 | 5,85 |
| Israel | 38.341 | 7,2 | 6 | 6,35 |
| Denmark | 55.938 | 7,6 | 7 | 7,54 |
| United States | 60.236 | 6,9 | 7 | 7,83 |

```text
sai so tuyet doi trung binh tren 27 nuoc: 0.3125
lech nhieu nhat: United States — du doan 7.83, that 6.9
```

Luật viết tay lệch trung bình **0,33** điểm; đường đã train lệch **0,31**. Với *một*
cột đầu vào và *27* dòng, một dòng `CASE WHEN` gần như ngang ngửa cả một model.

**Đó chính là luận điểm.** ML không trả công ở đây. Nó trả công khi luật phải dài (bộ
lọc thư rác cần hàng trăm luật, không phải một), hoặc khi luật **ôi thiu**: khi sách
thêm 9 quốc gia nữa, đường thẳng chỉ cần train lại trên 36 dòng, còn luật viết tay cần
một người phát hiện và sửa.

## Trade-offs

| Luật viết tay | Model được train |
|---|---|
| Rẻ để viết lần đầu | Đắt để dựng lần đầu |
| **Đắt để giữ đúng** | **Rẻ để làm mới** |
| Đọc được, cãi được với nghiệp vụ | Phải tin vào một bảng số |
| Thay đổi chỉ khi có người sửa | Thay đổi mỗi lần train lại |
| Đúng cho tới khi thế giới đổi | Theo kịp thế giới, kể cả khi không ai muốn |

**Câu hỏi quyết định không phải "bài toán này có khó không" mà là "đáp án đúng thay đổi
nhanh đến đâu".** Luật ngắn và ổn định thì viết tay vẫn là kỹ thuật tốt hơn.

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Bắt đầu dự án khi chưa gọi tên được **P** | Tối ưu nhầm thứ; model "tốt" mà nghiệp vụ không dùng |
| Chọn P vì nó dễ tính, không vì nó phản ánh chi phí | Hệ thống tự do làm tệ ở đúng chỗ P không nhìn |
| Coi "chúng ta có dữ liệu" là bằng chứng ML khả thi | Không có T và P thì đó chỉ là dữ liệu, không phải E |
| Dùng ML cho luật một dòng | Thêm một hệ thống phải nuôi để đổi 0,33 lấy 0,31 |
| Chọn ML vì "môi trường thay đổi" mà không dựng giám sát | Hệ thống tự đổi, không ai biết nó đổi thành gì |
| Lên kế hoạch dựa trên việc "sẽ mở model ra đọc được" | Dễ với bộ lọc thư rác, rất khó với nhiều loại model khác |

## FAQ

<details>
<summary>P của bộ lọc thư rác — tỷ lệ phân loại đúng — sai ở chỗ nào?</summary>

Nó coi hai loại sai như nhau. Để lọt một thư rác làm người dùng khó chịu; chặn nhầm một
thư thật có thể làm mất một hợp đồng. Thước đo đúng phải tách hai loại đó ra — đó chính
là precision và recall ở [Metric hiệu năng](performance-metrics.md).

Đây là ví dụ cụ thể của luật chung: **bất cứ thứ gì P bỏ qua, hệ thống được phép làm tệ.**

</details>

<details>
<summary>Ranh giới giữa "data mining" và "machine learning" ở đâu?</summary>

Theo cách sách dùng: data mining là **mục đích** (đào dữ liệu lớn để tìm quy luật chưa
ai biết), machine learning là **công cụ** giỏi việc đó. Mở một bộ lọc thư rác đã train
ra và đọc danh sách từ mà nó coi là dấu hiệu rác — đó là data mining, và đôi khi nó lộ
ra tương quan không ai ngờ.

Kèm theo cảnh báo của sách: dễ với bộ lọc thư rác, **khó với nhiều loại model khác**.
Đừng lên kế hoạch dự án dựa trên giả định là sẽ đọc được model.

</details>

<details>
<summary>Tôi có dữ liệu nhưng chưa có nhãn. Đã đủ để bắt đầu chưa?</summary>

Chưa, nếu bài toán là supervised. Gọi tên được T và P nhưng E chưa tồn tại thì **kế
hoạch dự án thực chất là một kế hoạch gắn nhãn** — và đó thường là phần đắt nhất. Xem
[Học có giám sát và không giám sát](supervised-unsupervised.md), mục nói về giá của
cột nhãn, cùng hai cách mua nó rẻ hơn.

</details>

<details>
<summary>Ba trục phân loại hệ thống ML là gì?</summary>

Sách sắp xếp mọi hệ thống ML theo ba trục **độc lập nhau** — một hệ thống luôn có cả ba:

| Trục | Câu hỏi | Chi tiết ở |
|---|---|---|
| 1 | Giám sát nhiều hay ít | [Học có giám sát và không giám sát](supervised-unsupervised.md) |
| 2 | Học một lần hay học tiếp | [Batch và online](batch-vs-online.md) |
| 3 | So sánh hay khái quát hoá | [Instance-based và model-based](instance-vs-model-based.md) |

</details>

## Related Topics

- [Học có giám sát và không giám sát](supervised-unsupervised.md) — trục 1, và giá của cột nhãn
- [Batch và online learning](batch-vs-online.md) — trục 2
- [Instance-based và model-based](instance-vs-model-based.md) — trục 3, kèm ví dụ Cyprus chạy tay
- [Dữ liệu xấu: bốn thử thách đầu tiên](bad-data.md) — E hỏng theo bốn kiểu
- [Metric hiệu năng](performance-metrics.md) — chữ **P**, và vì sao chọn sai thì hỏng hết
- [Data Quality](../../../data-quality/index.md) — E bẩn thì không P nào cứu được

## References

- Aurélien Géron — *Hands-On Machine Learning*, 3rd ed., chương 1, bài b01 và b02
- Tom Mitchell — *Machine Learning* (1997), định nghĩa T/E/P
- Arthur Samuel (1959), định nghĩa không chính thức
