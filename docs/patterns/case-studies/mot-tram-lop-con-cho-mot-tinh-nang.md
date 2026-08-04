---
title: Thêm một tuỳ chọn, sinh thêm 36 lớp
sidebar_position: 6
description: "Cây kế thừa hai trục nhân lên theo mỗi chiều mới — 6 lớp thành 72 sau ba tuỳ chọn, trong khi composition đi từ 4 lên 11."
tags: [case-study, bridge, decorator, composition, inheritance]
domain: backend
category: pattern
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Thêm một tuỳ chọn, sinh thêm 36 lớp

> **Nhãn: tình huống dựng lại.** Mọi con số chạy thật bằng
> `dotnet run 03-composition.cs` và `dotnet run 12-bridge.cs` trên .NET 11.0.0.

## Bối cảnh

Hệ thống đặt món của một chuỗi cà phê. Ban đầu hai loại nền và hai topping, mỗi tổ hợp một
lớp:

```csharp
abstract class CaPheKeThua { public abstract decimal Gia(); }

sealed class EspressoTron      : CaPheKeThua { public override decimal Gia() => 30000m; }
sealed class EspressoSua       : CaPheKeThua { public override decimal Gia() => 30000m + 8000m; }
sealed class EspressoSuaDuong  : CaPheKeThua { public override decimal Gia() => 30000m + 8000m + 2000m; }
sealed class AmericanoTron     : CaPheKeThua { public override decimal Gia() => 35000m; }
sealed class AmericanoSua      : CaPheKeThua { public override decimal Gia() => 35000m + 8000m; }
sealed class AmericanoSuaDuong : CaPheKeThua { public override decimal Gia() => 35000m + 8000m + 2000m; }
```

Sáu lớp. Chạy tốt hai năm.

## Triệu chứng

Marketing yêu cầu ba tính năng trong một quý: **size** (3 mức), **nóng/đá**, **thêm kem
tươi**.

```text
chieu them vao             ke thua   composition
------------------------------------------------
+ size (3 muc)                  18             7
+ nong/da (2)                   36             9
+ kem tuoi (2)                  72            11
```

**Từ 6 lớp lên 72.** Ước lượng ban đầu của đội cho tính năng "size" là hai ngày; nó mất
hai tuần.

Và triệu chứng thứ hai, tệ hơn: quán tăng giá sữa từ 8.000 lên 9.000.

```text
Ke thua     : 6 lop con cho 2 loai x 3 to hop
Composition : 4 lop (2 base + 2 topping)
```

Với 72 lớp, hằng số `8000m` xuất hiện ở **36** chỗ. Sửa sót một chỗ là một tổ hợp món ra
giá sai — và không có test nào phủ hết 72 tổ hợp.

## Giả thuyết sai lúc đầu

| Nghi ngờ | Vì sao nghe hợp lý | Vì sao sai |
|---|---|---|
| Đội thiếu người | Ước lượng trượt 7 lần | Thêm người làm chậm hơn: 72 lớp phải chia nhau, mỗi người sót một kiểu |
| Cần sinh code tự động | Giải quyết đúng triệu chứng "gõ nhiều" | Sinh 72 lớp vẫn là 72 lớp phải đọc, phải build, phải test |
| Cần một bảng giá trong CSDL | Đúng hướng | Đúng một nửa — nhưng nó bỏ mất phần *hành vi* khác nhau giữa các món |
| Refactor bằng cách rút lớp cha chung | Bản năng OOP đầu tiên | Không giúp: vấn đề không phải code lặp, mà là **số tổ hợp** |

Giả thuyết cuối là chỗ mất nhiều thời gian nhất. Đội dựng thêm hai tầng lớp cha trung
gian, code lặp giảm được một chút, và **số lớp không giảm dòng nào** — vì mỗi tổ hợp vẫn
cần một lớp lá.

## Nguyên nhân thật

Cây kế thừa đang mã hoá **nhiều trục biến thiên** trong một chiều duy nhất.

```text
EspressoSuaDuong
└── Espresso | Americano       ← truc "nen"
    └── Sua | Duong            ← truc "topping"
```

Kế thừa chỉ có **một** trục. Mỗi trục thêm vào phải nhân với tất cả trục đã có:

```text
so lop = ∏ kᵢ        (ke thua)
so lop = Σ kᵢ        (composition)
```

Với 5 trục cỡ 2–3, tích là 72 còn tổng là 11.

**Dấu hiệu đã có sẵn trong tên lớp từ đầu:** `EspressoSuaDuong` ghép từ hai danh mục khác
nhau. Đó là chỉ báo hai trục, và nó xuất hiện ngay từ lớp thứ ba — hai năm trước khi vấn
đề nổ ra.

## Vì sao không test nào bắt được

| Kiểm tra | Kết quả | Vì sao không thấy |
|---|---|---|
| Unit test từng lớp | Xanh | Mỗi lớp đúng riêng lẻ |
| Độ phủ | Cao | Mọi lớp **đang có** đều được test |
| Code review từng PR | Trượt | Mỗi PR chỉ thêm vài lớp — không ai thấy đường cong |
| Trình biên dịch | Im lặng | 72 lớp là hợp lệ |

Đây là loại vấn đề **không phải lỗi**. Không có gì sai để bắt; chỉ có chi phí tăng theo
hàm nhân, và chi phí không phải thứ test đo được.

Chỉ báo duy nhất nhìn ra được là **tốc độ**: cùng một loại yêu cầu ("thêm một tuỳ chọn")
mất ngày càng lâu. Đó là dữ liệu có sẵn trong mọi hệ thống quản lý công việc, và gần như
không ai nhìn.

## Cách sửa

### Hướng 1 — [Decorator](../skills/decorator.md) cho topping cộng dồn

```csharp
interface IDoUong { decimal Gia(); string Ten(); }

sealed class Espresso  : IDoUong { public decimal Gia() => 30000m; public string Ten() => "Espresso"; }
sealed class Sua(IDoUong g)   : IDoUong { public decimal Gia() => g.Gia() + 8000m; public string Ten() => g.Ten() + " + sua"; }
sealed class Duong(IDoUong g) : IDoUong { public decimal Gia() => g.Gia() + 2000m; public string Ten() => g.Ten() + " + duong"; }
```

Kiểm chứng giá không đổi — đây là phép kiểm bắt buộc của mọi lần refactor:

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
```

`8000m` giờ ở **một** chỗ. Và `new Sua(new Sua(new Espresso()))` — hai phần sữa — chạy
được mà không cần lớp `EspressoSuaSua`.

### Hướng 2 — [Bridge](../skills/bridge.md) khi hai trục là hai hệ độc lập

Với bài toán báo cáo × định dạng xuất (cùng cấu trúc, khác ngữ cảnh):

```text
n bao cao x m dinh dang      ke thua    bridge
----------------------------------------------
2 x 2                              4         4
3 x 3                              9         6
5 x 4                             20         9
8 x 6                             48        14
```

**Chú ý dòng đầu: ở 2×2, Bridge không lãi.** Đó là lý do lỗi này khó phát hiện sớm — ở
quy mô nhỏ, kế thừa thật sự đơn giản hơn. Nó chỉ sai khi trục thứ ba xuất hiện.

### Chọn hướng nào

| Hình dạng bài toán | Dùng |
|---|---|
| Các tuỳ chọn **cộng dồn**, xếp chồng được, số lượng tự do | [Decorator](../skills/decorator.md) |
| Hai **hệ** độc lập, mỗi bên chọn đúng một | [Bridge](../skills/bridge.md) |
| Tuỳ chọn là dữ liệu thuần, không có hành vi riêng | Một `record` cấu hình + một hàm tính |

## Dấu hiệu nhận ra sớm

```bash
# Ten lop con ghep tu hai danh muc — dau hieu hai truc
ls src/**/*.cs | grep -iE "(Espresso|Americano)(Sua|Duong)"
```

Ba câu hỏi cho code review, dùng được từ lớp con **thứ ba**:

1. Tên lớp con có ghép từ **hai danh mục** khác nhau không?
2. Nếu thêm một tuỳ chọn `k` giá trị, số lớp **nhân** lên hay **cộng** vào?
3. Một hằng số nghiệp vụ (giá sữa) xuất hiện ở mấy lớp? Trên 2 là đã lặp.

Câu thứ hai trả lời được trong một phút và là câu quan trọng nhất — nó biến một cảm giác
("code này hơi nhiều lớp") thành một dự báo có số.

## Related Topics

- [Composition over inheritance](../reference/composition-over-inheritance.md) — công thức tích so với tổng
- [Bridge](../skills/bridge.md) — tách hai trục thành hai cây
- [Decorator](../skills/decorator.md) — tuỳ chọn cộng dồn, xếp chồng được
- [Case study — Design Patterns](index.md)
