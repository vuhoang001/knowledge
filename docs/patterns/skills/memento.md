---
title: Memento
sidebar_position: 18
description: "Chụp trạng thái để khôi phục mà không phá đóng gói — và bẫy y hệt Prototype: bản chụp nông dùng chung collection với bản gốc."
tags: [memento, behavioral, gof, undo, snapshot]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Memento

> **Chốt:** Memento cho phép lưu và khôi phục trạng thái **mà không mở `private` ra**.
> Bẫy giống hệt [Prototype](prototype.md): bản chụp nông dùng chung `List` với bản gốc,
> nên "khôi phục" không khôi phục gì cả — output ở dưới cho thấy hình vẽ thêm vào vẫn còn
> sau khi undo.

## Mục tiêu

Làm undo/redo hoặc checkpoint mà không phải biến mọi field riêng tư thành public — vì đó
là cái giá mà cách làm ngây thơ luôn đòi.

## Ý định gốc (GoF)

Không phá vỡ đóng gói, nắm bắt và đưa ra ngoài trạng thái nội tại của một đối tượng, để
sau này có thể khôi phục đối tượng về trạng thái đó.

Ba vai:

| Vai | Là ai | Làm gì |
|---|---|---|
| **Originator** | `BanThietKe` | Tự chụp và tự khôi phục — chỉ nó biết cấu trúc bên trong |
| **Memento** | `BanChup` | Giữ trạng thái; **không lộ gì ra ngoài** |
| **Caretaker** | `Stack<BanChup>` | Giữ và trả lại; không đọc, không sửa |

## Ví dụ xuyên suốt — bản vẽ thiết kế

Chạy bằng `dotnet run 23-memento.cs` trên .NET 11.0.0.

### Bẫy — chụp nông

```csharp
public BanChup ChupNong() => new(_ten, _hinh);           // dung chung List
```

```text
=== Chup NONG: ban chup dung chung List ===
  hien tai : "ban ve 2" [hinh vuong, hinh tron, mui ten]
  sau khoi phuc: "ban ve 1" [hinh vuong, hinh tron, mui ten]   <- "mui ten" van con
```

**Tên khôi phục được, danh sách hình thì không.** `_ten` là `string` (bất biến) nên gán
lại là xong; `_hinh` là cùng một `List` mà bản chụp đang trỏ tới, nên `Add("mui ten")`
sửa luôn nội dung của "bản chụp".

Đây đúng là cơ chế đã thấy ở [Prototype](prototype.md#sao-chép-nông--sửa-bản-sao-đổi-luôn-bản-gốc),
và nó nguy hiểm hơn ở đây: người dùng bấm undo, thấy tên đổi lại, **tin rằng undo đã
chạy**, rồi phát hiện ra hình vẽ vẫn còn sau nhiều thao tác nữa.

### Chụp sâu

```csharp
public BanChup Chup() => new(_ten, [.. _hinh]);          // sao chep SAU
```

```text
=== Chup SAU ===
  hien tai : "ban ve 2" [hinh vuong, hinh tron, mui ten]
  sau khoi phuc: "ban ve 1" [hinh vuong, hinh tron]
```

### Undo nhiều bước

```text
=== Undo nhieu buoc bang stack memento ===
  them A -> "ban ve 1" [A]
  them B -> "ban ve 1" [A, B]
  them C -> "ban ve 1" [A, B, C]
  undo   -> "ban ve 1" [A, B]
  undo   -> "ban ve 1" [A]
  undo   -> "ban ve 1" []
```

Chụp **trước** mỗi thao tác, đẩy vào stack. Undo là pop và khôi phục. Không có logic
nghịch nào phải viết — đó là ưu điểm so với
[Command với lệnh nghịch](command.md#undo-hai-chiến-lược).

### Đóng gói vẫn nguyên vẹn

```text
=== Nguoi giu memento KHONG doc duoc ruot ===
  So property cong khai cua BanChup: 0
  -> lich su chi giu va tra lai, khong sua duoc noi dung
```

`BanChup` khai báo các thuộc tính là `internal`, và nó là lớp lồng bên trong
`BanThietKe`. Kết quả: `Stack<BanChup>` giữ được nó, nhưng **không đọc được gì bên
trong** — đúng ý định của pattern.

Trong C# có ba mức để đạt điều này:

| Cách | Ai đọc được ruột |
|---|---|
| Lớp lồng với thành viên `private` | Chỉ originator |
| Lớp lồng với thành viên `internal` | Cả assembly (như ví dụ này) |
| Interface rỗng công khai + lớp cài `internal` | Chỉ originator, và caretaker ở assembly khác vẫn giữ được |

### Trước và sau

| | Mở `private` ra để lưu | Memento |
|---|---|---|
| Caretaker đọc được trạng thái | có | không |
| Thêm field mới vào originator | mọi chỗ lưu phải sửa | chỉ `Chup`/`KhoiPhuc` |
| Ai chịu trách nhiệm sao chép sâu | rải ở chỗ lưu | originator — đúng chỗ biết cấu trúc |
| Bộ nhớ | như nhau | như nhau |
| Undo phức tạp | phải viết logic nghịch | không cần |

## Chi phí bộ nhớ — vấn đề thật của pattern này

Mỗi memento là một bản sao đầy đủ. Với ảnh, tài liệu lớn, hay bảng tính, 50 bước undo là
50 bản sao.

| Kỹ thuật | Ý tưởng | Đổi lại |
|---|---|---|
| **Giới hạn độ sâu** | Giữ 20 bước gần nhất | Undo xa hơn không được |
| **Chụp gia tăng** | Chỉ lưu phần đổi so với bản trước | Khôi phục phải áp lại chuỗi delta |
| **Cấu trúc bất biến chia sẻ** | `ImmutableList` chia sẻ phần không đổi | Ghi chậm hơn một chút |
| **Chuyển sang lệnh nghịch** | Xem [Command](command.md) | Phải viết đúng logic ngược |

Cách thứ ba là lựa chọn mặc định tốt trong .NET hiện đại: `ImmutableList<T>` chia sẻ cấu
trúc nội bộ, nên chụp là O(1) và không nhân bản dữ liệu.

## Khi nào KHÔNG dùng

| Tình huống | Vì sao |
|---|---|
| Trạng thái rất lớn, thao tác rất nhỏ | Chụp toàn bộ để undo một ký tự là lãng phí; dùng lệnh nghịch |
| Đối tượng vốn đã bất biến | Không cần chụp — giữ tham chiếu cũ là đủ |
| Trạng thái nằm ngoài tiến trình (CSDL, tệp) | Memento không khôi phục được thứ nó không sở hữu |
| Chỉ cần undo một bước | Một field `_truocDo` là đủ |

## Trade-offs

| Được | Mất |
|---|---|
| Đóng gói giữ nguyên — caretaker không đọc được ruột | Bộ nhớ tuyến tính theo số bước undo |
| Khôi phục luôn đúng, không phải viết logic nghịch | Chụp sâu tốn thời gian với trạng thái lớn |
| Thêm field chỉ sửa `Chup`/`KhoiPhuc` | Quên thêm field vào `Chup` là hỏng **âm thầm** |
| Hợp với checkpoint, không chỉ undo | Không khôi phục được tác dụng phụ ra bên ngoài |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Chụp nông trạng thái có collection | Undo không undo — đúng output đầu tiên |
| Thêm field mới mà quên đưa vào `Chup()` | Field đó không được khôi phục; lỗi xuất hiện rất muộn |
| Cho caretaker đọc/sửa memento | Mất toàn bộ lý do dùng pattern |
| Stack undo không giới hạn | Rò rỉ bộ nhớ trong ứng dụng chạy lâu |
| Khôi phục rồi không xoá stack redo | Redo áp lệnh cũ lên trạng thái mới |
| Tưởng memento khôi phục được cả tác dụng phụ | Email đã gửi, tệp đã ghi không quay lại được |

Dòng thứ hai có cách chặn: viết một test dùng reflection đếm số field của originator và so
với số field của memento — nó đỏ ngay khi ai đó thêm field mà quên.

## FAQ

<details>
<summary>Memento khác Prototype chỗ nào? Cả hai đều sao chép.</summary>

Mục đích và hướng đi. [Prototype](prototype.md) sao chép để **tạo một object mới dùng song
song**; memento sao chép để **đưa object cũ trở về trạng thái cũ**.

Hệ quả thiết kế: bản sao của Prototype là công dân hạng nhất (dùng như object thường);
memento thì cố tình **không dùng được** — nó chỉ để cất và trả lại.

</details>

<details>
<summary>Dùng serialize (JSON) làm memento được không?</summary>

Được, và tiện: một dòng, không quên field nào. Đổi lại đúng những nhược điểm đã nêu ở
[Prototype](prototype.md#ba-cách-sao-chép-sâu-trong-c): chậm, mất field không serialize
được, mất kiểu thực của object đa hình.

Hợp cho checkpoint thưa (autosave mỗi 5 phút). Không hợp cho undo từng thao tác.

</details>

<details>
<summary>Undo cho nhiều object cùng lúc thì sao?</summary>

Mỗi object tự chụp, và caretaker giữ một *bộ* memento cho một bước:

```csharp
record BuocUndo(BanThietKe.BanChup Ve, BangMau.BanChup Mau);
```

Điều bắt buộc: chụp **tất cả** trong cùng một thời điểm nhất quán, và khôi phục **tất cả**
cùng nhau. Khôi phục một nửa để lại trạng thái lai, tệ hơn cả không undo.

</details>

## Related Topics

- [Command](command.md) — chiến lược undo còn lại: lệnh nghịch
- [Prototype](prototype.md) — cùng bẫy nông/sâu, khác mục đích
- [Iterator](iterator.md) — duyệt lịch sử memento
- [State](state.md) — memento hay dùng để lưu trạng thái của máy trạng thái
- [Chọn pattern nào](../reference/choosing-a-pattern.md) — bảng tra triệu chứng

## References

- GoF — *Design Patterns*, Memento
