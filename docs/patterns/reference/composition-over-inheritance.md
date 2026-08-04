---
title: Composition over inheritance
sidebar_position: 3
description: "Kế thừa nhân số lớp lên theo mỗi chiều biến thiên, composition cộng vào — đo thật bằng số kiểu sinh ra khi thêm chiều thứ tư."
tags: [composition, inheritance, oop, decorator, bridge]
domain: backend
category: concept
doc_type: reference
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Composition over inheritance

> **Chốt:** Mỗi chiều biến thiên mới **nhân** số lớp con lên với kế thừa, nhưng chỉ
> **cộng** thêm vài lớp với composition. Đo thật ở dưới: 6 → 72 lớp so với 4 → 11 khi
> thêm ba chiều. Đó là toàn bộ lý do GoF viết câu *"favor object composition over class
> inheritance"* ngay ở chương 1.

## Mục tiêu

Cho một tiêu chí **đếm được** để quyết định kế thừa hay composition, thay vì cảm tính
"kế thừa là xấu" — câu đó vừa sai vừa vô dụng khi đang đứng trước một class hierarchy
thật.

## Tổng quan

Hai cách tái sử dụng code:

| | Kế thừa | Composition |
|---|---|---|
| Quan hệ | `Vuong` **là một** `ChuNhat` | `LyCaPheCoSua` **có một** `LyCaPhe` bên trong |
| Chốt lúc nào | Compile time — cố định trong khai báo lớp | Runtime — ghép được lúc chạy |
| Truy cập vào cha | Thấy cả `protected`, phụ thuộc chi tiết cài đặt | Chỉ thấy public API |
| Thêm một chiều biến thiên | Nhân số lớp | Cộng số lớp |

Dòng cuối là dòng quyết định, và cũng là dòng dễ đo nhất.

## Vì sao cần — bài toán bùng nổ tổ hợp

Quán cà phê có 2 loại nền (Espresso, Americano) và khách được thêm topping (sữa, đường).
Với kế thừa, mỗi **tổ hợp** phải là một lớp:

```csharp
abstract class CaPheKeThua { public abstract decimal Gia(); }

sealed class EspressoTron      : CaPheKeThua { public override decimal Gia() => 30000m; }
sealed class EspressoSua       : CaPheKeThua { public override decimal Gia() => 30000m + 8000m; }
sealed class EspressoSuaDuong  : CaPheKeThua { public override decimal Gia() => 30000m + 8000m + 2000m; }
sealed class AmericanoTron     : CaPheKeThua { public override decimal Gia() => 35000m; }
sealed class AmericanoSua      : CaPheKeThua { public override decimal Gia() => 35000m + 8000m; }
sealed class AmericanoSuaDuong : CaPheKeThua { public override decimal Gia() => 35000m + 8000m + 2000m; }
```

Sáu lớp cho hai loại. Chú ý con số `8000m` xuất hiện ở **bốn** chỗ — thêm một loại nền
thứ ba là nó xuất hiện ở sáu chỗ, và ngày quán tăng giá sữa thì bạn phải sửa đúng hết.

## Ví dụ xuyên suốt — cùng bài toán, hai cách sắp xếp

Chạy bằng `dotnet run 03-composition.cs` trên .NET 11.0.0.

### Cách composition — bọc lồng nhau

```csharp
interface IDoUong { decimal Gia(); string Ten(); }

sealed class Espresso  : IDoUong { public decimal Gia() => 30000m; public string Ten() => "Espresso"; }
sealed class Americano : IDoUong { public decimal Gia() => 35000m; public string Ten() => "Americano"; }

sealed class Sua(IDoUong g)   : IDoUong { public decimal Gia() => g.Gia() + 8000m; public string Ten() => g.Ten() + " + sua"; }
sealed class Duong(IDoUong g) : IDoUong { public decimal Gia() => g.Gia() + 2000m; public string Ten() => g.Ten() + " + duong"; }
```

Bốn lớp. `8000m` xuất hiện **một** lần. Tổ hợp được dựng lúc chạy:

```csharp
IDoUong[] hopThanh =
{
    new Espresso(),
    new Sua(new Espresso()),
    new Duong(new Sua(new Espresso())),
    new Americano(),
    new Sua(new Americano()),
    new Duong(new Sua(new Americano())),
};
```

### Kiểm chứng — giá phải khớp từng ly

```text
mon                        ke thua   composition   khop
--------------------------------------------------------------
Espresso                    30,000        30,000   OK
Espresso + sua              38,000        38,000   OK
Espresso + sua + duong      40,000        40,000   OK
Americano                   35,000        35,000   OK
Americano + sua             43,000        43,000   OK
Americano + sua + duong     45,000        45,000   OK
--------------------------------------------------------------
So dong lech: 0

Ke thua     : 6 lop con cho 2 loai x 3 to hop
Composition : 4 lop (2 base + 2 topping)
```

Số lớp đếm bằng reflection lúc chạy, không phải đếm tay:

```csharp
var soLopKeThua = typeof(CaPheKeThua).Assembly.GetTypes().Count(t => t.IsSubclassOf(typeof(CaPheKeThua)));
var soLopHop    = typeof(IDoUong).Assembly.GetTypes().Count(t => t.IsClass && typeof(IDoUong).IsAssignableFrom(t));
```

### Chỗ chênh lệch bung ra — thêm chiều thứ ba, tư, năm

Quán thêm size (3 mức), nóng/đá (2), kem tươi (2):

```text
chieu them vao             ke thua   composition
------------------------------------------------
+ size (3 muc)                  18             7
+ nong/da (2)                   36             9
+ kem tuoi (2)                  72            11
```

**72 lớp so với 11.** Và 72 mới chỉ là số lớp — mỗi lớp trong đó chép lại toàn bộ công
thức giá của mình, nên số chỗ chứa hằng số `8000m` cũng nhân lên theo.

Công thức: kế thừa là **tích** `∏ kᵢ`, composition là **tổng** `Σ kᵢ`.

### Trước và sau

| | Kế thừa | Composition |
|---|---|---|
| Số lớp với 5 chiều | 72 | 11 |
| Chỗ chứa giá sữa | 36 lớp | 1 lớp |
| Thêm topping mới | thêm 36 lớp | thêm 1 lớp |
| Khách tự chọn tổ hợp lúc chạy | không — tổ hợp cố định lúc biên dịch | có |
| Đặt hai lần sữa | phải có lớp `EspressoSuaSua` | `new Sua(new Sua(new Espresso()))` |
| Đọc lần đầu | phẳng, dễ | phải hiểu lồng nhau |

Dòng áp chót là chỗ composition mở ra khả năng mà kế thừa **không có cách nào** đạt được
mà không nổ thêm một tầng lớp con.

Đây chính xác là pattern [Decorator](../skills/decorator.md). Ca hỏng thật của việc chọn
nhầm hướng: [Một trăm lớp con cho một tính năng](../case-studies/mot-tram-lop-con-cho-mot-tinh-nang.md).

## Khi nào kế thừa vẫn đúng

Câu khẩu hiệu "favor composition" hay bị đọc thành "cấm kế thừa". Kế thừa là công cụ
đúng khi **cả ba** điều kiện sau cùng đúng:

| Điều kiện | Kiểm bằng cách |
|---|---|
| Quan hệ thật sự là "là một", **thay thế được** | Áp phép thử Liskov — xem [SOLID](solid.md#l--liskov-substitution) |
| Chỉ có **một** chiều biến thiên | Đếm số trục: hai trục trở lên là bùng nổ tổ hợp |
| Lớp cha **ổn định**, hiếm khi đổi | Lớp con phụ thuộc chi tiết cài đặt của cha, cha đổi là con vỡ |

Ví dụ kế thừa đúng: `Exception` → `ArgumentException` → `ArgumentNullException`. Một
trục, quan hệ "là một" chặt, lớp cha gần như không bao giờ đổi.

Ví dụ kế thừa sai: `NhanVien` → `NhanVienToanThoiGian` / `NhanVienBanThoiGian`. Nghe
hợp lý cho tới ngày một người vừa toàn thời gian vừa là quản lý vừa là cộng tác viên
dự án — ba trục, và không ai chuyển kiểu lúc chạy được.

## Trade-offs

| Được từ composition | Mất |
|---|---|
| Số lớp cộng chứ không nhân | Phải viết code chuyển tiếp (delegation) — dài dòng hơn kế thừa |
| Ghép được lúc chạy, cấu hình được | Thứ tự ghép trở nên quan trọng và **im lặng** khi sai |
| Chỉ phụ thuộc public API, không phụ thuộc chi tiết cha | Debug phải đi qua nhiều tầng bọc; stack trace sâu |
| Một hằng số một chỗ | Không dùng được `base.` để tái sử dụng phần chung |

Dòng thứ hai là cái bẫy thật của Decorator: `new Cache(new Retry(x))` và
`new Retry(new Cache(x))` đều biên dịch được, chạy được, và **có ngữ nghĩa khác hẳn
nhau**. Xem [Đổi thứ tự decorator, mất cache](../case-studies/doi-thu-tu-decorator-mat-cache.md).

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Kế thừa để **tái sử dụng code**, không phải để thay thế được | Lớp con lôi theo cả những method không có nghĩa với nó |
| Dựng cây kế thừa cho hai trục biến thiên | Bùng nổ tổ hợp — 72 lớp như bảng trên |
| Đặt logic vào lớp cha rồi cho lớp con `override` chọn lọc | Lớp con quên gọi `base.` là hỏng âm thầm; xem [Template Method](../skills/template-method.md) |
| Composition nhưng bọc quá sâu (7–8 tầng) | Không ai đọc nổi thứ tự; nên gom thành factory dựng sẵn cấu hình chuẩn |
| Dùng `protected` field trong lớp cha | Lớp con phụ thuộc chi tiết cài đặt — đổi cha là vỡ hết con |

## FAQ

<details>
<summary>Vậy interface có phải là kế thừa không?</summary>

Không, và đây là chỗ hay lẫn. Kế thừa **cài đặt** (`class B : A`) lôi theo cả code lẫn
trạng thái của `A`. Cài **interface** (`class B : IA`) chỉ lôi theo một hợp đồng, không
có code nào.

Câu "favor composition over inheritance" nói về loại thứ nhất. Cài nhiều interface là
chuyện bình thường và không gây bùng nổ tổ hợp.

</details>

<details>
<summary>C# có <code>record</code> và <code>with</code> rồi, còn cần composition không?</summary>

`with` giải bài toán **sao chép có sửa đổi**, không giải bài toán **thêm hành vi**.
`espresso with { CoSua = true }` buộc `IDoUong` phải có sẵn cột `CoSua` — tức là mọi
chiều biến thiên phải được biết trước lúc thiết kế, đúng cái mà composition tránh.

Khi số chiều cố định và ít, record + `with` gọn hơn Decorator thật. Khi chiều mở
(plugin, cấu hình theo chi nhánh), Decorator vẫn thắng.

</details>

<details>
<summary>Delegation dài dòng quá, C# có cách nào rút gọn không?</summary>

Có ba mức:

1. **Primary constructor** (C# 12+) — đúng cái đang dùng ở ví dụ trên,
   `sealed class Sua(IDoUong g) : IDoUong`, không cần field và constructor riêng.
2. **Expression-bodied member** — `public decimal Gia() => g.Gia() + 8000m;` một dòng.
3. **Default interface method** cho phần chuyển tiếp chung, nếu nhiều decorator lặp lại
   cùng một cách chuyển tiếp.

Không có cơ chế delegation tự động như `by` của Kotlin. Đó là chi phí thật, và là lý do
đúng để chọn kế thừa khi chỉ có một trục.

</details>

<details>
<summary>Làm sao biết mình đang có mấy trục biến thiên?</summary>

Liệt kê tên các lớp con hiện có và tìm phần lặp trong tên. `EspressoSua`,
`EspressoSuaDuong`, `AmericanoSua` — hai nhóm từ (`Espresso|Americano` và
`Sua|Duong`) ghép chéo nhau chính là hai trục.

Quy tắc nhanh: **tên lớp con có dấu vết của hai danh mục khác nhau ghép lại là đã hai
trục.** Lúc đó nghĩ tới [Bridge](../skills/bridge.md) hoặc
[Decorator](../skills/decorator.md).

</details>

## Related Topics

- [Design pattern là gì](what-is-a-pattern.md) — vì sao GoF đặt nguyên tắc này ở chương 1
- [SOLID](solid.md) — vi phạm LSP thường là hậu quả của kế thừa sai chỗ
- [Decorator](../skills/decorator.md) — pattern hiện thực hoá đúng ví dụ ở trang này
- [Bridge](../skills/bridge.md) — tách hai trục biến thiên thành hai cây độc lập
- [Strategy](../skills/strategy.md) — thay `override` bằng đối tượng cắm vào
- [Coupling và cohesion](coupling-cohesion.md) — kế thừa là dạng coupling chặt nhất

## References

- GoF — *Design Patterns*, chương 1, mục 1.6 "Inheritance versus Composition"
- Joshua Bloch — *Effective Java*, "Favor composition over inheritance"
