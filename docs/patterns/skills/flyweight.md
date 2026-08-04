---
title: Flyweight
sidebar_position: 11
description: "Tách trạng thái nội tại dùng chung khỏi trạng thái ngoại lai riêng — đo thật 112 MB xuống 24 MB cho 500.000 ô dữ liệu."
tags: [flyweight, structural, gof, memory, performance]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Flyweight

> **Chốt:** Flyweight là pattern **duy nhất trong GoF có mục tiêu thuần tuý là bộ nhớ**.
> Đừng dùng nó cho tới khi đã **đo** và thấy con số. Đo thật ở dưới: 500.000 ô dữ liệu,
> 112 MB xuống 24 MB — nhưng chỉ vì trạng thái dùng chung chiếm phần lớn mỗi object.

## Mục tiêu

Giảm bộ nhớ khi có **rất nhiều** object gần giống nhau, bằng cách nhận ra phần lớn nội
dung của chúng là bản sao của cùng vài giá trị.

## Ý định gốc (GoF)

Dùng chia sẻ để hỗ trợ số lượng lớn đối tượng nhỏ một cách hiệu quả.

Khái niệm cốt lõi là tách trạng thái làm hai:

| Loại | Nghĩa | Ví dụ ô bảng tính |
|---|---|---|
| **Nội tại** (intrinsic) | Không phụ thuộc ngữ cảnh, **dùng chung được** | Định dạng số, font, cỡ chữ, màu, căn lề |
| **Ngoại lai** (extrinsic) | Riêng của từng thể hiện | Giá trị của ô |

Tách đúng thì `n` object chỉ còn giữ phần ngoại lai + một tham chiếu tới phần nội tại
dùng chung.

## Ví dụ xuyên suốt — 500.000 ô bảng tính

Chạy bằng `dotnet run 16-flyweight.cs` trên .NET 11.0.0. Đo bằng `GC.GetTotalMemory(true)`
trước và sau khi cấp phát.

### Trước — mỗi ô giữ đủ mọi thứ

```csharp
sealed class ODuLieuNang(decimal giaTri, string dinhDang, string font, int coChu, string mau, string canLe)
{
    public decimal GiaTri = giaTri;
    public string DinhDang = dinhDang;
    public string Font = font;
    public int CoChu = coChu;
    public string Mau = mau;
    public string CanLe = canLe;
}
```

Quan trọng: mỗi ô **tự cấp phát chuỗi riêng**, đúng như khi nạp từng dòng từ CSDL —
không phải chuỗi hằng được CLR intern sẵn:

```csharp
string Rieng(string s) => new(s.AsSpan());
day[i] = new ODuLieuNang(i * 1000m, Rieng("#,##0.00"), Rieng("Arial"), 11, Rieng("#333333"), Rieng("phai"));
```

### Sau — kho kiểu dùng chung

```csharp
sealed class ODuLieuNhe(decimal giaTri, KieuO kieu)
{
    public decimal GiaTri = giaTri;
    public KieuO Kieu = kieu;
}

static class KhoKieu
{
    private static readonly Dictionary<string, KieuO> _kho = [];
    public static KieuO Lay(string dinhDang, string font, int coChu, string mau, string canLe)
    {
        var khoa = $"{dinhDang}|{font}|{coChu}|{mau}|{canLe}";
        if (_kho.TryGetValue(khoa, out var k)) return k;
        return _kho[khoa] = new KieuO(dinhDang, font, coChu, mau, canLe);
    }
}
```

### Kết quả đo

```text
=== 500,000 o du lieu, moi o co dinh dang hien thi ===
  Khong flyweight: 111,986,656 bytes  (224.0 bytes/o)
  Co flyweight   : 23,996,928 bytes  (48.0 bytes/o)

  Ty le: 4.67x
  So doi tuong kieu that su ton tai: 1 (cho 500,000 o)
```

**112 MB xuống 24 MB.** Một object `KieuO` phục vụ nửa triệu ô.

```text
=== Kho kieu tra ve CUNG mot the hien ===
  ReferenceEquals(k1, k2) = True
  So kieu sau khi xin them: 1
```

`ReferenceEquals` trả `True` là bằng chứng cơ chế hoạt động — hai lần xin cùng bộ thuộc
tính trả về cùng một object, và số kiểu trong kho không tăng.

### Trước và sau

| | Không flyweight | Flyweight |
|---|---|---|
| Bộ nhớ / ô | 224 bytes | 48 bytes |
| Tổng cho 500.000 ô | 112 MB | 24 MB |
| Số object kiểu | 500.000 | 1 |
| Đổi font cho toàn bảng | duyệt 500.000 ô | đổi 1 object (nếu cho phép) — hoặc xin kiểu mới |
| Đổi font cho **một** ô | gán trực tiếp | phải xin một `KieuO` khác — **không được sửa cái đang dùng chung** |
| Độ phức tạp code | thấp | thêm kho, thêm khoá, thêm vòng đời |

**Dòng áp chót là bẫy chính.** Object dùng chung phải **bất biến**; sửa nó là sửa cho tất
cả những ai đang trỏ tới. Ca hỏng:
[Flyweight chia sẻ nhầm trạng thái](../case-studies/flyweight-chia-se-nham-trang-thai.md).

### Con số này phụ thuộc mạnh vào tỷ lệ nội tại / ngoại lai

Nếu mỗi ô chỉ có một chuỗi dùng chung thay vì bốn, tỷ lệ tiết kiệm tụt hẳn. Công thức thô:

```text
tiet kiem ≈ (kich thuoc phan noi tai) / (kich thuoc ca object)
```

Đó là lý do phải **đo trước**: cùng một pattern, cùng một số object, tỷ lệ có thể là 4,67x
hoặc 1,05x tuỳ hình dạng dữ liệu.

## Flyweight đã có sẵn trong .NET

| Cơ chế | Là flyweight cho |
|---|---|
| String interning | Chuỗi hằng — mọi `"abc"` trong assembly là cùng một object |
| `string.Intern()` | Chuỗi tính lúc chạy, chủ động đưa vào bảng dùng chung |
| Boxing cache của `bool`, `byte`, `int` nhỏ | Một số giá trị boxing được tái dùng |
| `ArrayPool<T>` / `MemoryPool<T>` | Không đúng flyweight nhưng cùng động cơ: tái dùng thay vì cấp phát |

**Cẩn thận với `string.Intern()`:** chuỗi đã intern **không bao giờ được thu hồi** trong
suốt vòng đời tiến trình. Intern dữ liệu người dùng nhập là một cách rò rỉ bộ nhớ có thật.

## Khi nào KHÔNG dùng

| Tình huống | Vì sao |
|---|---|
| Chưa đo, chỉ "cảm thấy tốn RAM" | Flyweight thêm hẳn một lớp hạ tầng; đừng trả giá đó cho giả thuyết |
| Số object dưới vài chục nghìn | Tiết kiệm không bù nổi độ phức tạp |
| Phần nội tại nhỏ so với cả object | Tỷ lệ tiết kiệm gần 1 |
| Object cần **thay đổi** phần dùng chung | Không làm được; phần dùng chung phải bất biến |
| Đã có cấu trúc dữ liệu phù hợp hơn | Ví dụ dữ liệu dạng cột (`decimal[]` + `int[]` chỉ số kiểu) — ít bộ nhớ hơn và nhanh hơn |

Dòng cuối đáng cân nhắc nghiêm túc: với dữ liệu bảng, chuyển sang bố cục **cột** thường
thắng cả flyweight về cả bộ nhớ lẫn tốc độ duyệt.

## Trade-offs

| Được | Mất |
|---|---|
| Bộ nhớ giảm theo tỷ lệ phần nội tại | Thêm kho, thêm khoá, thêm một lần tra bảng |
| Ít object hơn → GC nhẹ hơn | Kho giữ tham chiếu vĩnh viễn → phải nghĩ về vòng đời và rò rỉ |
| Cache locality tốt hơn khi duyệt | Truy cập thuộc tính thêm một lần nhảy con trỏ |
| So sánh kiểu bằng `ReferenceEquals`, rất nhanh | Object dùng chung **bắt buộc bất biến** — dễ vi phạm âm thầm |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Cho object dùng chung có setter | Sửa một chỗ đổi toàn bộ — lỗi rất khó lần |
| Kho flyweight không giới hạn, khoá sinh từ dữ liệu người dùng | Rò rỉ bộ nhớ; kho lớn hơn thứ nó tiết kiệm |
| Dùng `string.Intern()` cho dữ liệu nhập | Chuỗi không bao giờ được thu hồi |
| Áp dụng khi chưa đo | Trả độ phức tạp, nhận tiết kiệm 3% |
| Kho tĩnh, không an toàn đa luồng | Đua khi nhiều luồng cùng xin kiểu mới — dùng `ConcurrentDictionary` |
| Đưa cả trạng thái ngoại lai vào object dùng chung | Hai ô khác giá trị lại chia sẻ cùng object — dữ liệu sai |

## FAQ

<details>
<summary>Làm sao đo bộ nhớ cho đúng trong .NET?</summary>

`GC.GetTotalMemory(forceFullCollection: true)` trước và sau, như ví dụ ở trang này — đủ
cho phép so tương đối, và nhớ `GC.KeepAlive` để mảng không bị thu hồi giữa chừng.

Muốn chính xác hơn: `GC.GetTotalAllocatedBytes(precise: true)` đo tổng đã cấp phát (kể cả
đã thu hồi), hoặc dùng BenchmarkDotNet với `[MemoryDiagnoser]` — nó tách được cấp phát
theo từng thế hệ GC.

Con số tuyệt đối luôn phụ thuộc nền tảng (64-bit, kích thước con trỏ, padding). Cái đáng
tin là **tỷ lệ**.

</details>

<details>
<summary>Flyweight có phải là cache không?</summary>

Không, dù trông giống. Cache đánh đổi **bộ nhớ lấy thời gian** và có quyền quên (eviction).
Flyweight đánh đổi **một lần tra bảng lấy bộ nhớ** và **không được quên** — quên là hai ô
đang dùng chung bỗng thành hai object khác nhau.

Hệ quả thiết kế: kho flyweight thường không có TTL, và vì thế phải giới hạn số khoá có
thể sinh ra.

</details>

<details>
<summary>Có thể dùng <code>record</code> làm flyweight không?</summary>

Được, và khá hợp: `record` bất biến sẵn, và có `Equals`/`GetHashCode` theo giá trị nên
làm khoá `Dictionary` không cần tự ghép chuỗi khoá:

```csharp
record KieuO(string DinhDang, string Font, int CoChu, string Mau, string CanLe);
private static readonly ConcurrentDictionary<KieuO, KieuO> _kho = new();
public static KieuO Lay(KieuO mau) => _kho.GetOrAdd(mau, mau);
```

Đổi lại: phải tạo một `KieuO` tạm mỗi lần tra — rẻ, nhưng không miễn phí trong vòng lặp
nóng.

</details>

## Related Topics

- [Prototype](prototype.md) — hướng ngược lại: nhân bản thay vì chia sẻ
- [Singleton](singleton.md) — cũng là "một thể hiện dùng chung", nhưng cho một object cụ thể
- [Proxy](proxy.md) — cũng đứng giữa, nhưng để kiểm soát chứ không để tiết kiệm
- [Composite](composite.md) — nút lá trong cây lớn là chỗ hay áp flyweight
- [Coupling và cohesion](../reference/coupling-cohesion.md) — kho tĩnh là common coupling

## References

- GoF — *Design Patterns*, Flyweight
- Microsoft — *String.Intern Method*, mục Remarks (cảnh báo về vòng đời)
