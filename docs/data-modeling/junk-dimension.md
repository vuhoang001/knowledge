---
title: Junk dimension và cột cardinality thấp
description: "Cột trạng thái vài giá trị: để thẳng trong fact, tách dimension riêng, hay gộp chung — và cách quyết định."
tags: [junk-dimension, degenerate-dimension, dimension, data-modeling, kimball]
domain: data-engineering
category: concept
status: draft
difficulty: intermediate
verified_at:
updated: 2026-07-31
---

# Junk dimension và cột cardinality thấp

> **Chốt:** Một cột bảy giá trị **không** đáng một bảng dimension riêng — trừ khi nó
> mang thuộc tính đi kèm. Nhiều cột như thế thì gộp hết vào **một** junk dimension,
> đừng tạo mỗi cột một bảng.

## Mục tiêu

Cho một quy tắc quyết định được với loại cột hay gặp nhất mà sách ít nói: `trang_thai`,
`kenh_ban`, `loai_thanh_toan`, `co_khuyen_mai` — vài giá trị, lặp lại trên triệu dòng
fact, và không rõ nên nhét đâu.

## Hỏi grain trước, đừng hỏi tách hay gộp trước

Câu "tách dimension riêng hay gộp vào" hỏi **sau**. Câu hỏi đầu tiên là *trạng thái này
thuộc về ai* — trả lời sai chỗ này thì mọi lựa chọn phía dưới đều sai.

| Trạng thái thuộc về | Ví dụ | Đi hướng nào |
|---|---|---|
| **Thực thể**, đổi theo thời gian | Khách hàng: hoạt động → tạm khoá → đóng | [SCD](scd.md) Type 2 trên dim chủ. Không phải chuyện ở trang này |
| **Sự kiện**, chốt cứng lúc ghi | Đơn hàng lúc thanh toán: thành công / thất bại | Đọc tiếp trang này |
| **Quy trình**, đổi liên tục trong vòng đời | Đơn: đặt → đóng gói → giao → nhận | Accumulating snapshot fact, mỗi bước một cột mốc thời gian. Xem [Fact và Dimension](fact-and-dimension.md#ba-loại-fact) |

Bẫy hay gặp nhất là hàng thứ ba bị xử như hàng thứ hai: nhét `trang_thai` hiện tại vào
một cột trong fact rồi `UPDATE` mỗi lần đơn chuyển bước. Lúc đó fact không còn là bản
ghi sự kiện nữa, và **báo cáo tháng trước tự đổi số** khi đơn cũ chuyển trạng thái.

## Bốn lựa chọn

Giả sử đã xác định đây là thuộc tính của sự kiện, chốt cứng lúc ghi.

| Cách | Khi nào chọn | Cái giá |
|---|---|---|
| **Để thẳng trong fact** (degenerate dimension) | Đúng một cột, chỉ là nhãn, không thuộc tính đi kèm | Đổi tên nhãn phải `UPDATE` triệu dòng; text lặp lại tốn chỗ |
| **Dimension nhỏ riêng** | Trạng thái **mang thuộc tính**: nhóm, thứ tự sắp xếp, cờ "có tính doanh thu" | Thêm một join vào mọi query |
| **Junk dimension** | Có từ ~3 cột cardinality thấp trở lên | Phải sinh và bảo trì bảng tổ hợp; đọc lần đầu khó hiểu |
| **SCD Type 2 trên dim chủ** | Trạng thái là thuộc tính của thực thể và cần lịch sử | Dim phình theo nhịp đổi trạng thái |

**Với đúng một cột bảy giá trị và không có thuộc tính nào đi kèm: để thẳng trong fact.**
Tạo bảng bảy dòng rồi join nó ở mọi query chỉ để đổi `3` thành `"Đã giao"` là trả phí
join mà không mua được gì — không có thuộc tính nào để lọc, không có nhóm nào để cuộn.

Ngưỡng đảo chiều là lúc xuất hiện câu hỏi kiểu *"doanh thu theo nhóm trạng thái"* hoặc
*"chỉ tính các trạng thái được coi là chốt đơn"*. Lúc đó trạng thái đã có thuộc tính, và
dimension riêng trả được phí của nó.

## Junk dimension là gì

Khi fact có bốn cột cardinality thấp, cách ngây thơ là bốn bảng dimension bé và bốn khoá
trong fact. Junk dimension gộp chúng thành **một** bảng tổ hợp và **một** khoá:

```text
dim_junk_don_hang
junk_sk | trang_thai   | kenh_ban | loai_thanh_toan | co_khuyen_mai
1       | Đã giao      | Online   | Thẻ             | false
2       | Đã giao      | Online   | Thẻ             | true
3       | Đã giao      | Online   | COD             | false
...
```

Fact giữ đúng `junk_sk` thay cho bốn cột. Bảy trạng thái × ba kênh × bốn loại thanh
toán × hai cờ = 168 dòng — nhỏ hơn cả một dimension khách hàng loại bé nhất.

**Chỉ sinh những tổ hợp thật sự xuất hiện trong dữ liệu**, không sinh sẵn toàn bộ tích
Descartes. Với bốn cột thì hai cách như nhau, nhưng thêm một cột 50 giá trị vào là tích
Descartes nổ lên 8400 dòng trong đó phần lớn không bao giờ dùng tới.

## Trade-offs

| Được | Mất |
|---|---|
| Fact hẹp lại — bốn khoá còn một | Thêm một tầng gián tiếp, người mới đọc không hiểu ngay |
| Thêm cột cờ mới không phải đổi schema fact | Phải có bước sinh/bổ sung tổ hợp trong pipeline |
| Lọc nhiều điều kiện chỉ quét một dimension bé | Không dùng lại được ở fact khác có bộ cột khác |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Tạo dimension bảy dòng cho một cột nhãn thuần | Join thừa ở mọi query, không đổi lấy khả năng phân tích nào |
| Sinh full tích Descartes rồi thêm cột cardinality cao | Bảng nổ, phần lớn dòng không khớp fact nào |
| Nhét trạng thái đang đổi vào dim khách hàng Type 2 | Mỗi lần đổi trạng thái sinh một version khách mới — dim phình, và grain của dim không còn là "một khách" |
| Coi trạng thái vòng đời là thuộc tính dimension | Báo cáo quá khứ tự đổi số, không lỗi nào báo |
| Dùng thẳng mã trạng thái nghiệp vụ làm khoá | Nghiệp vụ đánh lại mã là hỏng khoá — xem [Surrogate key](surrogate-key.md) |

## FAQ

<details>
<summary>Bảy trạng thái thì có cần surrogate key không?</summary>

Nếu để thẳng trong fact thì không có khoá nào cả — chỉ là một cột text hoặc mã.

Nếu tách thành dimension thì có: giữ `trang_thai_sk` làm khoá, và giữ **cả** mã nghiệp
vụ lẫn tên hiển thị làm cột thường. Lý do giống mọi dimension khác, xem
[Surrogate key](surrogate-key.md).

</details>

<details>
<summary>Thêm trạng thái thứ tám thì phải làm gì?</summary>

Để thẳng trong fact: không phải làm gì.

Dimension riêng: thêm một dòng.

Junk dimension: thêm các tổ hợp mới của trạng thái đó với các cột còn lại. Đây là lý do
nên sinh tổ hợp theo dữ liệu thật thay vì khai cứng — bước sinh tự bắt được giá trị mới.

</details>

<details>
<summary>Fact đã có cột trạng thái rồi, giờ đổi sang junk dimension có đáng không?</summary>

Chỉ khi đã có từ ba cột cardinality thấp trở lên và fact đủ lớn để độ rộng dòng thành
vấn đề thật. Một cột thì không đáng — đổi schema fact là việc tốn, và đổi lại đúng một
join thêm.

</details>

## Related Topics

- [Fact và Dimension](fact-and-dimension.md) — quy tắc gốc: cột nào thuộc bảng nào
- [Grain](grain.md) — phải chốt grain trước khi hỏi tách hay gộp
- [SCD](scd.md) — khi trạng thái thuộc về thực thể và cần lịch sử
- [Surrogate key](surrogate-key.md) — khoá cho dimension tách ra
- [Star, Snowflake, OBT](star-snowflake-obt.md) — junk dimension vẫn là star, không phải snowflake
- [Quy trình thiết kế](design-process.md) — bước 3 chọn dimension

## References

- Kimball & Ross — *The Data Warehouse Toolkit*, chương 3 (junk dimension) và chương 4
