---
title: Một lớp con nhận cả dòng dữ liệu hỏng
sidebar_position: 16
description: "Bước kiểm tra là virtual có logic chung; lớp con override để thêm luật riêng và quên gọi base, làm luật chung biến mất không cảnh báo."
tags: [case-study, template-method, inheritance, validation]
domain: backend
category: pattern
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Một lớp con nhận cả dòng dữ liệu hỏng

> **Nhãn: tình huống dựng lại.** Mọi con số chạy thật bằng
> `dotnet run 27-template-method.cs` trên .NET 11.0.0.

## Bối cảnh

Pipeline nạp dữ liệu từ nhiều nguồn dùng
[Template Method](../skills/template-method.md). Khung xử lý chung, mỗi nguồn chỉ khác
cách lấy mã:

```csharp
abstract class NapDeVo
{
    public (int nhan, int loai) Chay(string[] dong)
    {
        foreach (var d in dong)
            if (KiemTra(d)) nhan++; else loai++;
        ...
    }
    protected virtual bool KiemTra(string d) => !string.IsNullOrWhiteSpace(LayMa(d));   // luat chung
    protected abstract string LayMa(string d);
}
```

Luật chung: **dòng thiếu mã thì loại**. Nó nằm trong `KiemTra`, và `KiemTra` là `virtual`.

Nguồn JSON cần thêm một luật riêng, nên lập trình viên `override`:

```csharp
sealed class NapJsonDeVo : NapDeVo
{
    protected override string LayMa(string d) => d.Split(',')[0];
    protected override bool KiemTra(string d) => d.Length > 0;      // QUEN goi base
}
```

## Triệu chứng

Ba tuần sau khi thêm nguồn JSON, báo cáo bắt đầu có dòng "không xác định" ở mọi nhóm.

```text
=== Khung de vo: lop con override va quen goi base ===
  NapCsvDeVo       nhan 2 dong, loai 1 dong hong
  NapJsonDeVo      nhan 3 dong, loai 0 dong hong
```

**Cùng ba dòng dữ liệu, một nguồn loại 1 dòng, nguồn kia loại 0.** Dòng thiếu mã chảy qua
`NapJsonDeVo` và vào thẳng kho dữ liệu.

Đặc điểm làm nó khó lần: **chỉ nguồn JSON bị.** Ba nguồn còn lại vẫn lọc đúng, nên mọi
người tin là logic lọc đang hoạt động.

## Giả thuyết sai lúc đầu

| Nghi ngờ | Vì sao nghe hợp lý | Vì sao sai |
|---|---|---|
| Dữ liệu nguồn JSON bẩn hơn các nguồn khác | Chỉ nguồn đó có dòng hỏng | Đúng là bẩn hơn — nhưng pipeline lẽ ra phải lọc, và nó lọc được ở nguồn khác |
| Tầng nạp CSDL bỏ qua ràng buộc NOT NULL | Dữ liệu hỏng vào được kho | Cột mã cho phép null theo thiết kế (nghiệp vụ yêu cầu) |
| Có đường nạp thứ hai không qua pipeline | Kinh điển | Rà log: mọi dòng đều qua `Chay()` |
| Bug trong `LayMa` của JSON | Gần nhất | `LayMa` trả về chuỗi rỗng — **đúng như mong đợi** cho dòng thiếu mã |

Giả thuyết cuối là chỗ mất thời gian nhất: người debug xác nhận `LayMa` chạy đúng, và kết
luận rằng vấn đề nằm ở chỗ khác. Nó **đúng** — chỉ là kết quả của nó không còn được ai
dùng nữa.

## Nguyên nhân thật

`KiemTra` được `override` **thay thế**, không phải **bổ sung**.

```csharp
protected override bool KiemTra(string d) => d.Length > 0;
//                                            ^ luat rieng, nhung khong con luat chung
```

Bản gốc kiểm `!string.IsNullOrWhiteSpace(LayMa(d))` — kiểm **mã** rỗng. Bản mới kiểm
**dòng** rỗng. Dòng `",thieu ma"` có độ dài 10 nên qua được.

Người viết `NapJsonDeVo` không cố ý phá gì. Họ thấy cần một điều kiện riêng, và `override`
là cách hiển nhiên trong C#. **Không có gì trong ngôn ngữ nhắc rằng method này chứa logic
mà khung đang phụ thuộc.**

Đây là điểm yếu cố hữu của Template Method dùng `virtual` cho bước có logic chung: lời hứa
"lớp con không đổi cấu trúc thuật toán" **không được cưỡng chế**.

## Vì sao không test nào bắt được

| Kiểm tra | Kết quả | Vì sao không thấy |
|---|---|---|
| Unit test `NapCsvDeVo` | Xanh | Lớp đó không override `KiemTra` |
| Unit test `NapJsonDeVo` | Xanh | Test kiểm "luật riêng có chạy không" — có |
| Test khung `NapDeVo` | Xanh | Test lớp cơ sở qua một lớp con giả không override |
| Trình biên dịch | Im lặng | `override` không gọi `base` là hợp lệ |
| Analyzer mặc định | Im lặng | Không có luật nào yêu cầu gọi `base` |

Bài học: **mỗi lớp con được test riêng, không lớp nào được test theo cùng một bộ ca.**

Test bắt được lỗi này là một *test theo hợp đồng* — cùng một bộ dữ liệu chạy qua **mọi**
lớp con, khẳng định phần hành vi chung:

```csharp
[Theory]
[MemberData(nameof(MoiBoNap))]
void Moi_bo_nap_deu_phai_loai_dong_thieu_ma(NapChac bo)
{
    var (nhan, loai) = bo.Chay([",thieu ma", "1,ok"]);
    Assert.Equal(1, loai);
}
```

Một test, áp cho tất cả lớp con hiện tại **và tương lai** — lớp con mới tự động được kiểm.

## Cách sửa

### Đưa luật chung ra khỏi tầm với của lớp con

```csharp
abstract class NapChac
{
    public (int nhan, int loai) Chay(string[] dong)
    {
        foreach (var d in dong)
        {
            var ma = LayMa(d);                                        // buoc bien thien
            if (string.IsNullOrWhiteSpace(ma)) { loai++; continue; }   // luat chung, lop con khong voi toi
            nhan++;
        }
        ...
    }
    protected abstract string LayMa(string d);
}
```

```text
=== Khung chac: template method sealed, buoc bien thien la abstract ===
  NapCsv           nhan 2 dong, loai 1 dong hong
  NapJson          nhan 2 dong, loai 1 dong hong
```

**Hai lớp con giờ cho cùng kết quả** trên phần luật chung. Lớp con chỉ quyết định *cách
lấy mã*; nó không có cách nào quyết định *mã rỗng có hợp lệ không*.

### Ba quy tắc

| Quy tắc | Vì sao |
|---|---|
| Template method (`Chay`) **không** `virtual` | Lớp con không đổi được trình tự |
| Bước bắt buộc biến thiên là `abstract` | Trình biên dịch buộc cài; không có `base` để quên |
| `virtual` **chỉ** cho hook có thân **rỗng** | Không có logic chung nên không có gì để mất |

Quy tắc thứ ba là quy tắc bị vi phạm ở ca này. Nếu cần cho lớp con thêm luật, tách làm
hai:

```csharp
private bool KiemTraChung(string d) => !string.IsNullOrWhiteSpace(LayMa(d));   // khong ai voi toi
protected virtual bool KiemTraRieng(string d) => true;                         // hook rong

// trong Chay:
if (!KiemTraChung(d) || !KiemTraRieng(d)) { loai++; continue; }
```

Lớp con override `KiemTraRieng` bao nhiêu cũng được; luật chung không suy suyển.

### Hoặc: bỏ kế thừa

```csharp
public static (int nhan, int loai) Chay(string[] dong, Func<string, string> layMa) { ... }
```

```text
=== Cung khung do, viet bang delegate thay vi ke thua ===
  ham thuan       nhan 2 dong, loai 1 dong hong
```

Không có `base` để quên, không có cây kế thừa, và bước biến thiên truyền vào lúc gọi.
**Với một hoặc hai bước biến thiên, đây gần như luôn là lựa chọn tốt hơn.**

## Dấu hiệu nhận ra sớm

```bash
# override khong goi base — ung vien dang nghi
grep -rnA5 "protected override" --include=*.cs src/ | grep -B4 "^\s*$" | grep -L "base\."

# virtual method co than KHONG rong trong lop truu tuong
grep -rnE "protected virtual (bool|void|string).*=>" --include=*.cs src/
```

Ba câu hỏi cho code review:

1. Method `virtual` này có **logic** trong thân không? Nếu có, lớp con override sẽ xoá nó.
2. `override` này có gọi `base` không? Nếu không, cố ý hay quên?
3. Có test nào chạy **cùng một bộ ca** qua **mọi** lớp con không?

Câu thứ ba là câu chặn được cả lớp lỗi này, và chi phí là một `[Theory]`.

## Related Topics

- [Template Method](../skills/template-method.md) — ba quy tắc giữ khung không vỡ
- [Composition over inheritance](../reference/composition-over-inheritance.md) — vì sao delegate thường thắng
- [Case study — Design Patterns](index.md)
