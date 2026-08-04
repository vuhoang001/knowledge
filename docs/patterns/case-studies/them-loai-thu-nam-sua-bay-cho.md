---
title: Thêm định dạng thứ năm, sáu chỗ bỏ sót
sidebar_position: 2
description: "Sáu switch song song trên cùng một mã định dạng, mỗi cái có nhánh mặc định — thêm loại mới sót sáu chỗ và không có exception nào."
tags: [case-study, factory-method, open-closed, shotgun-surgery]
domain: backend
category: pattern
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Thêm định dạng thứ năm, sáu chỗ bỏ sót

> **Nhãn: tình huống dựng lại.** Mọi con số chạy thật bằng
> `dotnet run cs-switch-drift.cs` trên .NET 11.0.0.

## Bối cảnh

Module xuất báo cáo hỗ trợ `pdf`, `excel`, `csv`. Qua hai năm, mã định dạng được dùng ở
sáu chỗ khác nhau — mỗi chỗ một `switch` riêng, viết bởi người khác nhau, ở file khác
nhau:

| `switch` | Trả về | Nằm ở |
|---|---|---|
| `Xuat` | phần mở rộng tệp | `XuatBaoCao.cs` |
| `Ten` | tên hiển thị | `GiaoDien/MenuXuat.cs` |
| `Icon` | tệp icon | `GiaoDien/Icon.cs` |
| `Quyen` | ai được xuất | `BaoMat/QuyenXuat.cs` |
| `GioiHan` | giới hạn dung lượng | `CauHinh/GioiHan.cs` |
| `Mime` | content type khi tải về | `Api/TaiVeController.cs` |

Đội thêm `xml` (năm ngoái) rồi `json` (tuần này).

## Triệu chứng

Người dùng báo: *"tải file JSON về thì trình duyệt mở ra dạng text thay vì tải xuống, và
trên menu nó hiện là 'Không rõ'."*

```text
ma      xuat      ten         icon        quyen     gioi han    mime                      lech
--------------------------------------------------------------------------------------------------
pdf     pdf       PDF         pdf.svg     moi ai    10MB        application/pdf           -
excel   xlsx      Excel       xls.svg     noi bo    50MB        application/vnd.ms-excel  -
csv     csv       CSV         csv.svg     noi bo    200MB       text/csv                  -
xml     xml       XML         (mac dinh)  noi bo    (mac dinh)  application/xml           2 cho
json    json      (khong ro)  (mac dinh)  noi bo    (mac dinh)  (mac dinh)                4 cho
--------------------------------------------------------------------------------------------------
Tong so cho bi bo sot: 6
So switch song song tren cung mot ma: 6
Khong cho nao nem exception — tat ca deu co nhanh mac dinh.
```

**Sáu chỗ bỏ sót, không một exception.** Và `xml` — thêm từ **năm ngoái** — vẫn đang
thiếu hai chỗ mà không ai biết.

Chú ý cột `gioi han`: `json` rơi vào giá trị mặc định. Nếu mặc định là 10MB thì báo cáo
JSON lớn sẽ bị chặn với thông báo vô nghĩa; nếu mặc định là không giới hạn thì đó là một
lỗ hổng.

## Giả thuyết sai lúc đầu

| Nghi ngờ | Vì sao nghe hợp lý | Vì sao sai |
|---|---|---|
| Sai cấu hình web server | Triệu chứng là chuyện content type | Header đúng như code sinh ra; server không đụng vào |
| Trình duyệt cache | Kinh điển | Trình duyệt khác, ẩn danh — y hệt |
| Thiếu một dòng trong `TaiVeController` | Gần đúng | Đúng một phần: sửa xong vẫn còn menu và icon sai |
| Lỗi của người thêm `json` | Có vẻ hiển nhiên | Người đó **không có cách nào biết** có sáu chỗ |

Giả thuyết thứ ba là chỗ nguy hiểm nhất: nó sửa được triệu chứng người dùng báo, đóng
ticket, và để lại năm chỗ còn lại cho lần sau.

## Nguyên nhân thật

Mã định dạng là một khái niệm có **sáu** biểu hiện, nhưng không có **một** chỗ nào giữ đủ
cả sáu. Mỗi `switch` tự có nhánh `_ =>` trả về giá trị "an toàn", nên thiếu sót không bao
giờ nổ.

Đây là *shotgun surgery* kinh điển: một thay đổi khái niệm đòi sửa rải rác nhiều file, và
không có gì liệt kê được danh sách file đó.

Điểm mấu chốt: **nhánh mặc định là thủ phạm, không phải cứu tinh.** Nếu cả sáu `switch`
đều ném thay vì trả giá trị mặc định, `json` đã nổ ngay trên môi trường dev đầu tiên.

## Vì sao không test nào bắt được

| Kiểm tra | Kết quả | Vì sao không thấy |
|---|---|---|
| Unit test cho `XuatBaoCao` | Xanh | `Xuat("json")` đúng — đó là `switch` duy nhất đã cập nhật |
| Test tích hợp xuất báo cáo | Xanh | Nội dung file đúng; menu và header không nằm trong test |
| Trình biên dịch | Im lặng | `string` không có tính đầy đủ để kiểm; nhánh `_` phủ hết |
| Test độ phủ | 100% | Mọi nhánh **đang có** đều được chạy — nhánh **thiếu** không đo được |

Dòng cuối đáng nhớ: **độ phủ đo code đã viết, không đo code lẽ ra phải viết.**

## Cách sửa

### Bước 1 — gom sáu `switch` thành một lớp

```csharp
interface IDinhDangXuat
{
    string Ma { get; }
    string PhanMoRong { get; }
    string TenHienThi { get; }
    string Icon { get; }
    string Quyen { get; }
    long GioiHanByte { get; }
    string Mime { get; }
}
```

Giờ **trình biên dịch** bắt buộc mọi định dạng cài đủ bảy thuộc tính. Không có nhánh mặc
định nào để rơi vào.

### Bước 2 — một bảng đăng ký

```csharp
static class Xuong
{
    private static readonly Dictionary<string, Func<IDinhDangXuat>> _bang = new() { ... };
    public static void DangKy(string ma, Func<IDinhDangXuat> tao) => _bang[ma] = tao;
    public static IDinhDangXuat Tao(string ma) =>
        _bang.TryGetValue(ma, out var f) ? f() : throw new NotSupportedException($"chua dang ky dinh dang: {ma}");
}
```

Kết quả đo được sau khi sửa ([Factory Method](../skills/factory-method.md)):

```text
=== Sau: mot dang ky, khong the lech ===
ma      xuat                        ten hien thi        khop?
------------------------------------------------------------------
pdf     %PDF-1.7 (pdf)              pdf                 OK
excel   PK.. xlsx (excel)           excel               OK
csv     a,b,c (csv)                 csv                 OK
So dong lech: 0
```

```text
=== Them dinh dang thu tu: json ===
  json -> {"a":1} (json) / json   (khong sua dong nao cua code cu)
  So dinh dang dang co: 4
```

### Trước và sau

| | Sáu `switch` | Một lớp / định dạng |
|---|---|---|
| Chỗ phải sửa khi thêm định dạng | 6 file, không ai biết là 6 | 1 lớp mới + 1 dòng đăng ký |
| Quên một chỗ | giá trị mặc định, **im lặng** | không biên dịch được |
| Mã sai (`"pdff"`) | rơi vào mặc định | ném, có tên mã |
| Định dạng do plugin cấp | không | `DangKy` lúc khởi động |

### Nếu chưa muốn refactor lớn

Cách rẻ nhất mua lại phần lớn giá trị: **đổi `enum` và bỏ nhánh mặc định**.

```csharp
enum DinhDang { Pdf, Excel, Csv, Xml, Json }

string Mime(DinhDang d) => d switch
{
    DinhDang.Pdf => "application/pdf",
    // ... khong co nhanh _
};
```

C# cảnh báo `CS8524` khi `switch` biểu thức không phủ hết. Bật `TreatWarningsAsErrors` và
việc thêm `Json` vào enum sẽ **làm hỏng build** ở cả sáu chỗ — đúng cái ta muốn.

Đây là bài học ngược chiều đáng nhớ: `switch` trên `enum` **an toàn hơn** bảng đăng ký ở
điểm này. Chỉ đổi sang factory khi cần thêm định dạng lúc chạy.

## Dấu hiệu nhận ra sớm

```bash
# Dem so switch tren cung mot khai niem
grep -rn 'case "pdf"\|"pdf" =>' --include=*.cs src/ | wc -l
```

Ba câu hỏi cho code review:

1. Mã này còn được `switch` ở đâu nữa? Nếu không trả lời được ngay thì đó là câu trả lời.
2. Nhánh mặc định trả về giá trị hay ném? Trả về giá trị = che lỗi.
3. Kiểu của mã là `string` hay `enum`? `string` = trình biên dịch không giúp được gì.

## Related Topics

- [Factory Method](../skills/factory-method.md) — gom quyết định "tạo cái gì" về một chỗ
- [Abstract Factory](../skills/abstract-factory.md) — khi các thuộc tính phải khớp thành họ
- [SOLID](../reference/solid.md) — vi phạm Open/Closed điển hình
- [Case study — Design Patterns](index.md)
