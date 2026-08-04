---
title: Job đêm chết vì một dòng RemoveAll
sidebar_position: 18
description: "InvalidOperationException khi sửa collection đang duyệt là may mắn — ca thật sự nguy hiểm là lazy IEnumerable duyệt hai lần và gọi API gấp đôi."
tags: [case-study, iterator, ienumerable, lazy, linq]
domain: backend
category: pattern
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Job đêm chết vì một dòng `RemoveAll`

> **Nhãn: tình huống dựng lại.** Mọi con số chạy thật bằng `dotnet run 21-iterator.cs`
> trên .NET 11.0.0.

## Bối cảnh

Job dọn dẹp chạy đêm: duyệt danh sách bản ghi chờ xử lý, bỏ những bản ghi đã quá hạn.

```csharp
foreach (var x in ds)
    if (DaQuaHan(x)) ds.Remove(x);
```

Ba tháng không có vấn đề — vì trong ba tháng đó, không có bản ghi nào quá hạn.

## Triệu chứng — phần dễ

```text
=== Sua collection dang duyet ===
  nem: InvalidOperationException: Collection was modified; enumeration operation may not execute.
```

Job chết, có exception rõ ràng, có stack trace trỏ đúng dòng. Sửa mất năm phút.

**Đây là ca may mắn.** `List<T>` giữ một `_version` tăng mỗi lần sửa và enumerator so nó
mỗi lần `MoveNext()` — nó **cố tình** biến một lỗi âm thầm thành exception.

Hai cách sửa, cả hai đều đúng:

```csharp
foreach (var x in ds2.ToArray()) if (x == "b") ds2.Remove(x);          // duyet ban sao
for (var i = ds3.Count - 1; i >= 0; i--) if (ds3[i] == "b") ds3.RemoveAt(i);   // duyet nguoc
```

```text
=== Cach dung: duyet ban sao, hoac duyet nguoc bang chi so ===
  con lai: [a, c]
  con lai: [a, c]
```

## Triệu chứng — phần khó

Cùng tuần đó, đội phát hiện hoá đơn API bên thứ ba tăng gấp đôi. Không có lỗi nào.

Đoạn code:

```csharp
var canGui = danhSach.Where(x => x.CanThongBao).Select(x => GoiApiLayEmail(x));
_logger.LogInformation("Se gui {So} thong bao", canGui.Count());
foreach (var e in canGui) Gui(e);
```

```text
=== Bay cua lazy: duyet lai la tinh lai ===
  Count() = 5, so lan tinh = 5
  Sum()   = 30, so lan tinh = 10   <- tinh lai tu dau
  Sau ToList(): so lan tinh = 15 (khong tang tu 15)
```

**`Count()` rồi duyệt = tính hai lần.** Với `Select(x => x * 2)` thì vô hại. Với
`Select(x => GoiApiLayEmail(x))` thì đó là gấp đôi số lời gọi API — và dòng log "để cho
dễ theo dõi" chính là thứ gây ra nó.

## Giả thuyết sai lúc đầu

| Nghi ngờ | Vì sao nghe hợp lý | Vì sao sai |
|---|---|---|
| Job chạy hai lần (cron trùng) | Gấp đôi chính xác | Log cho thấy đúng một lần chạy mỗi đêm |
| Retry của HTTP client | Gấp đôi là số của retry một lần | Không có lỗi nào để retry; mọi lời gọi đều 200 |
| Bên thứ ba tính sai | Đổ lỗi ra ngoài | Log phía mình cũng đếm gấp đôi |
| Có hai chỗ gọi API | Gần đúng | Chỉ một chỗ trong code — nhưng nó **chạy** hai lần |

Bằng chứng quyết định: thêm một bộ đếm vào trong `Select` và thấy nó bằng đúng hai lần số
phần tử.

## Nguyên nhân thật

`IEnumerable<T>` là **lazy**. `Where` và `Select` không tính gì cả — chúng dựng một cỗ máy
sẽ tính **mỗi khi** ai đó duyệt.

`canGui.Count()` là một lần duyệt. `foreach (var e in canGui)` là lần thứ hai.

Đây là mặt trái trực tiếp của thứ làm lazy hữu ích:

```text
=== Lazy: chi tinh khi lay, dung khi du ===
  3 phan tu dau: [1, 4, 9], so lan sinh = 3
```

Một dãy **vô hạn** chỉ chạy 3 lần vì `Take(3)`. Cùng cơ chế đó làm `Count()` + `foreach`
chạy 2n lần.

**`IEnumerable<T>` không phải một tập hợp. Nó là một công thức để tạo ra tập hợp.**

## Vì sao không test nào bắt được

| Kiểm tra | Kết quả | Vì sao không thấy |
|---|---|---|
| Unit test "gửi đúng danh sách" | Xanh | Kết quả đúng — chỉ tốn gấp đôi |
| Test tích hợp với API giả | Xanh | Mock trả về ngay, không ai đếm số lần gọi |
| Code review | Trượt | `Count()` để log là thói quen tốt, trông vô hại |
| Trình biên dịch | Im lặng | Duyệt `IEnumerable` nhiều lần là hợp lệ |
| Analyzer | Có luật | `CA1851` (*possible multiple enumeration*) — nhưng chưa bật |

Dòng cuối là cơ hội bị bỏ lỡ: .NET **có sẵn** analyzer cho lỗi này. Bật một dòng trong
`.editorconfig` là chặn được.

## Cách sửa

### Chốt một lần

```csharp
var canGui = danhSach.Where(x => x.CanThongBao).Select(x => GoiApiLayEmail(x)).ToList();
```

```text
  Sau ToList(): so lan tinh = 15 (khong tang tu 15)
```

Sau khi chốt, số lần tính không tăng dù duyệt bao nhiêu lần.

**Quy tắc: định duyệt từ hai lần trở lên thì `ToList()` ngay.**

### Chọn kiểu trả về nói đúng ý định

| Người gọi cần | Trả về |
|---|---|
| Duyệt một lần, có thể rất nhiều phần tử | `IEnumerable<T>` |
| Cần `Count` | `IReadOnlyCollection<T>` |
| Duyệt nhiều lần, truy cập theo chỉ số | `IReadOnlyList<T>` |
| Kết quả từ CSDL, kết nối sẽ đóng | `ToList()` **trước khi trả** |

Dòng cuối là một lớp lỗi riêng: trả `IEnumerable` từ repository rồi đóng kết nối, và người
gọi duyệt sau đó nhận exception ở một chỗ hoàn toàn không liên quan.

### Bật analyzer

```ini
# .editorconfig
dotnet_diagnostic.CA1851.severity = error
```

### Và bẫy thứ ba: ngoại lệ xảy ra muộn

```csharp
IEnumerable<string> Doc(string tep)
{
    if (!File.Exists(tep)) throw new FileNotFoundException(tep);   // KHONG chay ngay
    foreach (var d in File.ReadLines(tep)) yield return d;
}
```

Hàm có `yield return` **không chạy dòng nào** cho tới khi ai đó duyệt. `FileNotFoundException`
sẽ ném ở chỗ duyệt — có thể ở tầng khác, sau một `try/catch` đã đóng.

Cách sửa: tách làm hai hàm.

```csharp
IEnumerable<string> Doc(string tep)
{
    if (!File.Exists(tep)) throw new FileNotFoundException(tep);   // chay ngay
    return DocLoi(tep);
}
private IEnumerable<string> DocLoi(string tep) { foreach (...) yield return ...; }
```

## Dấu hiệu nhận ra sớm

```bash
# Sua collection trong foreach
grep -rnA5 "foreach" --include=*.cs src/ | grep -E "\.(Remove|Add|Clear)\("

# Count() roi duyet lai
grep -rnB2 -A5 "\.Count()" --include=*.cs src/ | grep -A3 "foreach"
```

Ba câu hỏi cho code review:

1. Biến `IEnumerable` này được duyệt mấy lần? Trên 1 thì cần `ToList()`.
2. Bên trong `Select`/`Where` có I/O không (API, CSDL, tệp)? Nếu có, duyệt lại là gọi lại.
3. Hàm trả `IEnumerable` này có `yield return` không? Nếu có, phần kiểm tra tham số có
   chạy ngay không?

## Related Topics

- [Iterator](../skills/iterator.md) — hai cái bẫy của `IEnumerable` trong C#
- [Composite](../skills/composite.md) — duyệt cây, nơi lazy hay gặp nhất
- [Case study — Design Patterns](index.md)
