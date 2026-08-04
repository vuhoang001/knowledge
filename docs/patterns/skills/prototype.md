---
title: Prototype
sidebar_position: 5
description: "Nhân bản thay vì dựng lại — và bẫy lớn nhất là MemberwiseClone lẫn record with đều là sao chép nông, sửa bản sao đổi luôn bản gốc."
tags: [prototype, creational, gof, deep-copy, record]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Prototype

> **Chốt:** Prototype tự nó đơn giản — nhân bản một object có sẵn thay vì dựng lại. Toàn
> bộ độ khó nằm ở **nông hay sâu**, và cả `MemberwiseClone` lẫn `record ... with` của C#
> đều **nông**. Output ở dưới cho thấy sửa bản sao làm đổi bản gốc.

## Mục tiêu

Chặn lớp lỗi tốn nhất khi sao chép object: hai biến tưởng là hai object, thực ra dùng
chung một `List` bên trong — và ai sửa cái nào cũng đổi cả hai.

## Ý định gốc (GoF)

Tạo object mới bằng cách sao chép một object mẫu, thay vì gọi constructor.

Lý do gốc năm 1994 là *tạo mới tốn kém* (đọc file, query, dựng cây). Lý do phổ biến hơn
năm 2026 là *muốn một biến thể của cấu hình đã có* — cùng cơ chế, khác động cơ.

## Ví dụ xuyên suốt — cấu hình báo cáo

Chạy bằng `dotnet run 10-prototype.cs` trên .NET 11.0.0.

```csharp
sealed class CauHinhBaoCao(string ten, List<string> cot, Nguong nguong)
{
    public string Ten { get; set; } = ten;
    public List<string> Cot { get; set; } = cot;
    public Nguong Nguong { get; set; } = nguong;

    public CauHinhBaoCao SaoChepNong() => (CauHinhBaoCao)MemberwiseClone();
    public CauHinhBaoCao SaoChepSau()  => new(Ten, [.. Cot], Nguong.Ban());
}
```

### Sao chép nông — sửa bản sao đổi luôn bản gốc

```csharp
var nong = goc.SaoChepNong();
nong.Ten = "Doanh thu quy - ban sao";
nong.Cot.Add("san_pham");
nong.Nguong.GiaTri = 5000m;
```

```text
=== Sao chep nong (MemberwiseClone) ===
  ban sao: ten="Doanh thu quy - ban sao" cot=[ngay,khu_vuc,san_pham] nguong=5000
  ban GOC: ten="Doanh thu quy" cot=[ngay,khu_vuc,san_pham] nguong=5000
  Cot cua goc bi them chua? CO — hong
  Nguong cua goc bi doi chua? CO — hong
```

Đọc kỹ ba dòng đầu: **`Ten` thì tách được, `Cot` và `Nguong` thì không.** Đó chính là
định nghĩa của sao chép nông — nó sao chép *giá trị của từng field*, mà field kiểu tham
chiếu thì giá trị của nó là **địa chỉ**, không phải nội dung.

`string` tách được vì nó bất biến: gán `Ten` mới tạo ra một chuỗi khác chứ không sửa
chuỗi cũ. Đây là chỗ bẫy trở nên hiểm — vài field *có vẻ* tách đúng, làm người ta tin
cả object đã tách.

### Sao chép sâu

```csharp
public CauHinhBaoCao SaoChepSau() => new(Ten, [.. Cot], Nguong.Ban());
```

```text
=== Sao chep sau ===
  ban sao: ten="Doanh thu quy - ban sao" cot=[ngay,khu_vuc,san_pham] nguong=5000
  ban GOC: ten="Doanh thu quy" cot=[ngay,khu_vuc] nguong=1000
  Cot cua goc bi them chua? khong
  Nguong cua goc bi doi chua? khong
```

`[.. Cot]` là collection expression (C# 12) — dựng một `List` mới với cùng phần tử.
`Nguong.Ban()` tự nhân bản. Bản gốc giữ nguyên `[ngay,khu_vuc]` và `1000`.

### `record` + `with` **cũng** là sao chép nông

Đây là phần hay bị bỏ qua nhất, vì `record` được quảng cáo là "bất biến":

```csharp
record CauHinhRecord(string Ten, List<string> Cot);

var r1 = new CauHinhRecord("Doanh thu quy", new List<string> { "ngay" });
var r2 = r1 with { Ten = "Ban sao" };
r2.Cot.Add("khu_vuc");
```

```text
=== record + with cung la sao chep NONG ===
  r1.Cot = [ngay, khu_vuc]
  r2.Cot = [ngay, khu_vuc]
  Cung mot List? True
```

**`ReferenceEquals(r1.Cot, r2.Cot)` trả về `True`.** `record` bất biến ở tầng *tham
chiếu của chính nó*; nó không làm gì với thứ nó trỏ tới. Một `record` chứa `List<T>`
là một object thay đổi được đội lốt bất biến.

Cách sửa: dùng collection bất biến.

```csharp
record CauHinhBatBien(string Ten, ImmutableArray<string> Cot);

var i1 = new CauHinhBatBien("Doanh thu quy", ["ngay"]);
var i2 = i1 with { Cot = [.. i1.Cot, "khu_vuc"] };
```

```text
=== record voi collection bat bien thi an toan ===
  i1.Cot = [ngay]
  i2.Cot = [ngay, khu_vuc]
```

### Trước và sau

| | Nông | Sâu |
|---|---|---|
| `string`, `int`, `decimal` | tách đúng | tách đúng |
| `List`, `Dictionary`, object con | **dùng chung** | tách đúng |
| Chi phí | O(số field) | O(kích thước cây) |
| Viết | một dòng `MemberwiseClone` | phải xử lý từng field kiểu tham chiếu |
| Chu trình trong đồ thị object | không quan tâm | **lặp vô hạn** nếu không theo dõi node đã thăm |
| An toàn khi bản sao đi sang luồng khác | không | có |

## Ba cách sao chép sâu trong C#

| Cách | Ưu | Nhược |
|---|---|---|
| **Viết tay** từng field | Nhanh nhất, kiểm soát hoàn toàn | Thêm field mà quên sửa `Clone` là hỏng âm thầm |
| **Serialize rồi deserialize** (`System.Text.Json`) | Một dòng, không quên field nào | Chậm; mất field không serialize được; mất kiểu thực của object đa hình |
| **Dùng bản ghi bất biến ngay từ đầu** | Không cần sao chép gì cả | Phải thiết kế từ sớm; chi phí cấp phát khi đổi nhiều |

Cột "nhược" của cách thứ nhất là lỗi thật hay gặp: **`Clone()` viết tay không được trình
biên dịch nhắc khi lớp thêm field mới.** Nếu chọn cách này, viết một test so sánh số
property qua reflection với số dòng gán trong `Clone` — hoặc chọn cách thứ ba.

## Khi nào KHÔNG dùng

| Tình huống | Làm gì thay thế |
|---|---|
| Object bất biến toàn phần | Không cần sao chép — chia sẻ tham chiếu là an toàn |
| Tạo mới rẻ | Constructor rõ ràng hơn `Clone()`; xem [Builder](builder.md) |
| Chỉ cần đổi một hai field | `record` + `with`, miễn là mọi field đều bất biến |
| Object giữ tài nguyên hệ điều hành (file handle, kết nối) | Nhân bản một handle không có nghĩa; dùng factory |

## Trade-offs

| Được | Mất |
|---|---|
| Không phải chạy lại quá trình dựng tốn kém | Phải bảo trì `Clone` song song với danh sách field |
| Nhân bản được object mà không biết kiểu cụ thể | `MemberwiseClone` bỏ qua constructor — bất biến nội tại có thể vỡ |
| Dựng biến thể từ một cấu hình mẫu | Nông/sâu là quyết định vô hình tại chỗ gọi |
| Bản sao độc lập, an toàn qua luồng (nếu sâu) | Sao chép sâu tốn bộ nhớ và thời gian tuyến tính theo cây |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Tưởng `MemberwiseClone` là sao chép sâu | Bản sao dùng chung collection — đúng output đầu tiên ở trên |
| Tưởng `record` + `with` cho object độc lập | `ReferenceEquals` trả `True`; lỗi rất khó lần vì `record` "trông bất biến" |
| Thêm field mới mà quên cập nhật `Clone()` | Field mới bị dùng chung; lỗi xuất hiện nhiều tuần sau |
| Sao chép sâu một đồ thị có chu trình | `StackOverflowException` |
| Cài `ICloneable` | Interface này **không nói rõ nông hay sâu** — Microsoft khuyến nghị không dùng |
| Sao chép sâu bằng JSON cho lớp có kế thừa | Bản sao mất kiểu con, thành kiểu cha |

Dòng thứ năm đáng nhớ: `ICloneable` là một trong số ít interface của BCL bị chính
Microsoft khuyên tránh — vì hợp đồng của nó mơ hồ đúng ở chỗ quan trọng nhất.

## FAQ

<details>
<summary>Làm sao biết một lớp cần sao chép nông hay sâu?</summary>

Hỏi một câu: *"bản sao và bản gốc có được phép ảnh hưởng lẫn nhau không?"*

- Bản sao là **ảnh chụp** để so sánh về sau → sâu.
- Bản sao là **một khung nhìn khác** của cùng dữ liệu → nông, và nên đặt tên là
  `TaoKhungNhin()` chứ đừng gọi là `Clone()`.

Khi phân vân, chọn sâu: nó đắt hơn nhưng sai thì lộ ra ngay, còn nông sai thì lộ ra sau
nhiều tuần.

</details>

<details>
<summary>Sao chép sâu bằng JSON có ổn cho production không?</summary>

Ổn cho object cấu hình nhỏ, ít khi sao chép. Không ổn khi nằm trong vòng lặp nóng —
serialize + deserialize đắt hơn gán field vài bậc.

Ba điểm mù cần biết trước khi chọn: field `private` không có setter sẽ mất; kiểu đa hình
mất kiểu thực; kiểu không có converter (như `IntPtr`) sẽ ném.

</details>

<details>
<summary>Prototype có liên quan gì tới Registry of prototypes trong sách GoF không?</summary>

Có. GoF mô tả thêm một *prototype manager*: một bảng tra từ khoá sang object mẫu, và
`Tao(khoa)` trả về bản sao của mẫu.

Hình dạng đó gần như trùng với [Factory Method](factory-method.md) dùng bảng đăng ký —
khác đúng một điểm: factory **gọi constructor**, prototype registry **nhân bản một mẫu
đã cấu hình sẵn**. Chọn prototype khi phần cấu hình mẫu là thứ tốn công dựng.

</details>

## Related Topics

- [Builder](builder.md) — dựng từ đầu thay vì nhân bản
- [Memento](memento.md) — cũng chụp trạng thái, nhưng để khôi phục chứ không để tạo mới
- [Flyweight](flyweight.md) — hướng ngược lại: **chia sẻ** thay vì nhân bản
- [Composition over inheritance](../reference/composition-over-inheritance.md) — `record` và `with`
- [Chọn pattern nào](../reference/choosing-a-pattern.md) — bảng tra triệu chứng

## References

- GoF — *Design Patterns*, Prototype
- Microsoft — *ICloneable Interface*, mục Remarks (khuyến nghị không dùng)
