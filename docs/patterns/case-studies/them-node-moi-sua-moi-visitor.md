---
title: Thêm một toán tử, sáu nơi phải sửa
sidebar_position: 17
description: "Visitor bắt lỗi thiếu nhánh lúc biên dịch, switch trên kiểu bắt lúc chạy ở production — cùng một thiếu sót, hai cái giá khác nhau."
tags: [case-study, visitor, interpreter, expression-problem]
domain: backend
category: pattern
doc_type: case-study
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Thêm một toán tử, sáu nơi phải sửa

> **Nhãn: tình huống dựng lại.** Mọi con số chạy thật bằng `dotnet run 28-visitor.cs`
> trên .NET 11.0.0.

## Bối cảnh

Công cụ báo cáo cho phép người dùng viết công thức tính. Công thức được parse thành cây
biểu thức ([Interpreter](../skills/interpreter.md)), và có sáu thao tác chạy trên cây đó:
đánh giá, hiển thị lại, sinh SQL, đếm nút, tính độ sâu, kiểm tra kiểu.

Cây ban đầu có ba loại nút: `So`, `Cong`, `Nhan`. Sáu thao tác được viết bằng `switch` trên
kiểu:

```csharp
decimal DanhGiaBangSwitch(INut n) => n switch
{
    So s => s.GiaTri,
    Cong c => DanhGiaBangSwitch(c.Trai) + DanhGiaBangSwitch(c.Phai),
    Nhan m => DanhGiaBangSwitch(m.Trai) * DanhGiaBangSwitch(m.Phai),
    _ => throw new NotSupportedException($"chua ho tro {n.GetType().Name}")
};
```

Sprint này thêm toán tử trừ: `Tru`.

## Triệu chứng

Người dùng lưu công thức có phép trừ. Lưu thành công. Chạy báo cáo:

```text
=== So sanh: switch tren kieu thi khong ai bat thieu nhanh ===
  DanhGiaBangSwitch(cay)  = 23
  DanhGiaBangSwitch(cay2) -> NotSupportedException: chua ho tro Tru
```

`NotSupportedException` ở production, trong một job chạy đêm, với công thức của khách
hàng.

Và đó mới là thao tác **có** nhánh mặc định ném. Ba thao tác khác có nhánh mặc định trả về
giá trị "an toàn" — chúng không ném, chỉ cho kết quả sai: `DemNut` đếm thiếu, `DoSau` trả
về 1, `SinhSql` bỏ qua nhánh trừ và sinh ra câu `WHERE` **thiếu điều kiện**.

Câu SQL thiếu điều kiện là ca tệ nhất: nó chạy, trả về dữ liệu, và dữ liệu đó nhiều hơn
đáng lẽ.

## Giả thuyết sai lúc đầu

| Nghi ngờ | Vì sao nghe hợp lý | Vì sao sai |
|---|---|---|
| Parser tạo sai cây | Exception nói "chua ho tro" | Dump cây: cấu trúc đúng, có nút `Tru` đúng chỗ |
| Quên deploy một service | Chỉ job đêm lỗi | Cùng phiên bản trên mọi node |
| Người thêm `Tru` làm ẩu | Có vẻ hiển nhiên | Họ đã sửa **hai** thao tác — hai cái mà test có phủ |
| Chỉ cần thêm nhánh vào `DanhGia` | Sửa được triệu chứng đã báo | Còn ba thao tác nữa đang sai âm thầm |

Giả thuyết cuối nguy hiểm nhất: nó đóng được ticket. Sáu tuần sau, báo cáo SQL sai số được
phát hiện — cùng nguyên nhân, khác triệu chứng.

## Nguyên nhân thật

Thêm một **kiểu nút** đòi sửa **mọi thao tác**, và không có gì liệt kê được danh sách thao
tác.

Đây là *expression problem*: không có cách tổ chức nào rẻ ở cả hai chiều.

| Cách tổ chức | Thêm **kiểu** | Thêm **thao tác** |
|---|---|---|
| Method trong lớp nút | rẻ | **đắt** — sửa mọi lớp |
| `switch` trên kiểu | **đắt và im lặng** | rẻ |
| [Visitor](../skills/visitor.md) | **đắt nhưng ồn ào** | rẻ |

Dự án chọn hàng giữa vì lúc đầu thao tác tăng nhanh còn kiểu nút ổn định. Lựa chọn đó
**đúng** — vấn đề là nhánh `_ =>`, không phải `switch`.

**Nhánh mặc định biến "trình biên dịch nhắc bạn" thành "production nhắc bạn".**

## Vì sao không test nào bắt được

| Kiểm tra | Kết quả | Vì sao không thấy |
|---|---|---|
| Test `DanhGia` với phép trừ | Xanh | Người thêm `Tru` đã sửa thao tác này |
| Test `InRa` với phép trừ | Xanh | Cũng đã sửa |
| Test `SinhSql`, `DemNut`, `DoSau` với phép trừ | **Không có** | Không ai biết là phải viết — không có danh sách thao tác |
| Trình biên dịch | Im lặng | Nhánh `_` phủ hết mọi kiểu |
| Độ phủ | Cao | Mọi nhánh **đang có** đều chạy |

Dòng thứ ba là cơ chế thật: người thêm `Tru` sửa những thao tác họ **biết**. Họ không có
cách nào biết còn bốn cái nữa.

## Cách sửa

### Chuyển sang Visitor — để trình biên dịch giữ danh sách

```csharp
interface IVisitor<T>
{
    T Tham(So n);
    T Tham(Cong n);
    T Tham(Nhan n);
    T Tham(Tru n);          // <- them dong nay
}
```

```text
=== Them KIEU NUT moi (Tru) — moi visitor phai bo sung ===
  in: (10 - 4)
  danh gia: 6
  dem nut : 3
  do sau  : 2
  -> them Tru vao IVisitor<T> lam MOI visitor khong bien dich duoc cho toi khi bo sung
     (do la dac diem tot: trinh bien dich bat, khong phai runtime)
```

**Thêm một dòng vào interface là sáu lỗi biên dịch.** Chi phí vẫn là "sửa sáu chỗ", nhưng
nó chuyển từ *runtime ở production* sang *build time trên máy dev* — và không thể bỏ sót.

Chiều còn lại vẫn rẻ:

```text
=== Them thao tac thu tu: do sau — chi them MOT lop ===
  do sau   : 3
```

### Hoặc rẻ hơn: bỏ nhánh mặc định

Nếu chưa muốn chuyển sang Visitor, sửa gốc là **xoá `_ =>`**:

```csharp
decimal DanhGia(INut n) => n switch
{
    So s => s.GiaTri,
    Cong c => DanhGia(c.Trai) + DanhGia(c.Phai),
    Nhan m => DanhGia(m.Trai) * DanhGia(m.Phai),
    Tru t => DanhGia(t.Trai) - DanhGia(t.Phai),
};
```

C# cảnh báo `CS8509` khi `switch` biểu thức không phủ hết. Bật `TreatWarningsAsErrors` và
bạn được gần như toàn bộ lợi ích của Visitor với một phần nhỏ công sức.

**Hạn chế:** C# chưa có union type đóng, nên trình biên dịch chỉ *cảnh báo* dựa trên phân
tích, không *khẳng định* được tính đầy đủ. Với hierarchy có thể được kế thừa từ assembly
khác, cảnh báo đó không đủ.

### Bảng chọn

| Tình huống | Chọn |
|---|---|
| 3–5 kiểu nút, vài thao tác, hierarchy nội bộ | `switch` biểu thức **không có** nhánh mặc định + `TreatWarningsAsErrors` |
| Số thao tác vượt số kiểu, kiểu ổn định | [Visitor](../skills/visitor.md) |
| Thao tác đến từ assembly khác (plugin) | Visitor |
| Tập kiểu còn đang thay đổi nhiều | **Không** dùng Visitor — mỗi kiểu mới là một đợt sửa toàn bộ |

### Và: nhánh mặc định trả về giá trị là tệ nhất

Trong ba thao tác không ném, chúng trả về "giá trị an toàn". Với `SinhSql`, "an toàn" là
bỏ qua điều kiện — và kết quả là một truy vấn trả về **nhiều dữ liệu hơn đáng lẽ**. Đó là
lỗi bảo mật, không chỉ lỗi tính toán.

**Nếu bắt buộc phải có nhánh mặc định, nó phải ném.**

## Dấu hiệu nhận ra sớm

```bash
# switch tren kieu co nhanh mac dinh
grep -rnE "_ =>" --include=*.cs src/ | grep -v "throw"

# Dem so cho switch tren cung mot hierarchy
grep -rn "Cong c =>\|is Cong" --include=*.cs src/ | wc -l
```

Ba câu hỏi cho code review khi thêm một kiểu vào hierarchy:

1. Hierarchy này được `switch` ở mấy chỗ? Nếu không trả lời được ngay, đó là câu trả lời.
2. Các `switch` đó có nhánh mặc định không? Có = trình biên dịch không giúp được gì.
3. Nhánh mặc định trả về giá trị hay ném? Trả về giá trị = lỗi sẽ im lặng.

## Related Topics

- [Visitor](../skills/visitor.md) — expression problem và ba cách mở rộng
- [Interpreter](../skills/interpreter.md) — cây biểu thức mà Visitor đi trên đó
- [Case study — Design Patterns](index.md)
