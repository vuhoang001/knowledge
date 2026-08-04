---
title: Sửa bản sao, bản gốc đổi theo
sidebar_position: 4
description: "MemberwiseClone và record with đều là sao chép nông — tên tách được nên ai cũng tin đã tách, còn danh sách cột thì dùng chung."
tags: [case-study, prototype, memento, deep-copy, record]
domain: backend
category: pattern
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Sửa bản sao, bản gốc đổi theo

> **Nhãn: tình huống dựng lại.** Mọi con số chạy thật bằng `dotnet run 10-prototype.cs`
> trên .NET 11.0.0.

## Bối cảnh

Công cụ báo cáo cho người dùng "nhân bản một báo cáo mẫu rồi sửa". Cấu hình báo cáo:

```csharp
sealed class CauHinhBaoCao(string ten, List<string> cot, Nguong nguong)
{
    public string Ten { get; set; } = ten;
    public List<string> Cot { get; set; } = cot;
    public Nguong Nguong { get; set; } = nguong;

    public CauHinhBaoCao SaoChepNong() => (CauHinhBaoCao)MemberwiseClone();
}
```

Người dùng mở "Doanh thu quý", bấm *Nhân bản*, đổi tên bản sao, thêm cột `san_pham`, nâng
ngưỡng cảnh báo từ 1.000 lên 5.000.

## Triệu chứng

Báo cáo **gốc** — thứ mà giám đốc đã duyệt và không ai được sửa — bỗng có thêm cột
`san_pham` và ngưỡng 5.000.

```text
=== Sao chep nong (MemberwiseClone) ===
  ban sao: ten="Doanh thu quy - ban sao" cot=[ngay,khu_vuc,san_pham] nguong=5000
  ban GOC: ten="Doanh thu quy" cot=[ngay,khu_vuc,san_pham] nguong=5000
  Cot cua goc bi them chua? CO — hong
  Nguong cua goc bi doi chua? CO — hong
```

Đọc kỹ ba dòng đầu: **`Ten` thì tách đúng, `Cot` và `Nguong` thì không.**

Đó là chi tiết làm ca này khó lần. Người dùng thấy tên bản sao khác tên bản gốc, nên tin
rằng nhân bản đã hoạt động. Không ai nghĩ tới việc kiểm cột.

## Giả thuyết sai lúc đầu

| Nghi ngờ | Vì sao nghe hợp lý | Vì sao sai |
|---|---|---|
| Người dùng sửa nhầm bản gốc | Dễ nhất | Log thao tác cho thấy họ chỉ mở bản sao |
| Có hai tab, lưu đè lên nhau | Có vẻ hợp lý với ứng dụng web | Tái hiện được với đúng một tab |
| Cache phía server trả nhầm bản ghi | Kinh điển | Đọc thẳng từ CSDL: dữ liệu gốc **thật sự** đã đổi |
| `MemberwiseClone` không sao chép gì cả | Gần đúng | Sai — `Ten` tách đúng, nên nó **có** sao chép |

Giả thuyết cuối là chỗ mất nhiều thời gian nhất: người debug thấy `Ten` tách đúng nên loại
`MemberwiseClone` khỏi danh sách nghi phạm.

## Nguyên nhân thật

`MemberwiseClone` sao chép **giá trị của từng field**. Với field kiểu tham chiếu, giá trị
đó là **địa chỉ**, không phải nội dung.

| Field | Kiểu | Sau `MemberwiseClone` |
|---|---|---|
| `Ten` | `string` (bất biến) | Cùng địa chỉ — nhưng gán `Ten` mới tạo chuỗi khác, nên **trông như** đã tách |
| `Cot` | `List<string>` | Cùng địa chỉ; `Add` sửa luôn danh sách gốc |
| `Nguong` | class có setter | Cùng địa chỉ; đổi `GiaTri` đổi cả hai |

**`string` tách được không phải vì nó được sao chép, mà vì nó bất biến.** Đó chính là ảo
giác đã đánh lừa cả người dùng lẫn người debug.

### Và `record` + `with` cũng vậy

Đội định sửa bằng cách chuyển sang `record` — vì "record là bất biến":

```csharp
record CauHinhRecord(string Ten, List<string> Cot);
var r2 = r1 with { Ten = "Ban sao" };
r2.Cot.Add("khu_vuc");
```

```text
=== record + with cung la sao chep NONG ===
  r1.Cot = [ngay, khu_vuc]
  r2.Cot = [ngay, khu_vuc]
  Cung mot List? True
```

**`ReferenceEquals` trả về `True`.** `record` bất biến ở tầng tham chiếu của chính nó; nó
không làm gì với thứ nó trỏ tới. Một `record` chứa `List<T>` là object thay đổi được đội
lốt bất biến — và nguy hiểm hơn bản cũ, vì cái tên `record` tạo cảm giác an toàn sai.

## Vì sao không test nào bắt được

| Kiểm tra | Kết quả | Vì sao không thấy |
|---|---|---|
| Test "nhân bản rồi đổi tên" | Xanh | Chỉ kiểm `Ten` — field duy nhất trông có vẻ đúng |
| Test "bản sao có đúng cột không" | Xanh | Bản sao **đúng**; bản gốc mới sai |
| Trình biên dịch | Im lặng | `MemberwiseClone` là API hợp lệ |
| Analyzer | Im lặng | Không có luật nào về nông/sâu |

Phép kiểm duy nhất bắt được là loại **ít ai nghĩ tới viết**: sau khi sửa bản sao, khẳng
định **bản gốc không đổi**.

```csharp
[Fact] void Sua_ban_sao_khong_dung_toi_ban_goc()
{
    var goc = MauChuan();
    var sao = goc.SaoChep();
    sao.Cot.Add("moi");
    Assert.DoesNotContain("moi", goc.Cot);       // <- day la assertion bi thieu
}
```

## Cách sửa

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

### Hoặc: dùng collection bất biến ngay từ đầu

```csharp
record CauHinhBatBien(string Ten, ImmutableArray<string> Cot);
var i2 = i1 with { Cot = [.. i1.Cot, "khu_vuc"] };
```

```text
=== record voi collection bat bien thi an toan ===
  i1.Cot = [ngay]
  i2.Cot = [ngay, khu_vuc]
```

Cách này **triệt để hơn**: không có `Clone` nào để viết sai, và không có `Add` nào để gọi
nhầm. Đây là hướng nên chọn khi thiết kế mới.

### Bảng đối chiếu

| | `MemberwiseClone` | `record` + `with` | Sao chép sâu tay | Collection bất biến |
|---|---|---|---|---|
| Field bất biến (`string`, `int`) | tách | tách | tách | tách |
| `List`, `Dictionary` | **dùng chung** | **dùng chung** | tách | không cần tách |
| Thêm field mới mà quên | không quên được | không quên được | **hỏng âm thầm** | không quên được |
| Chi phí | O(số field) | O(số field) | O(kích thước cây) | O(1) khi chụp |

Cột thứ ba có rủi ro riêng đáng nhớ: `Clone()` viết tay **không được trình biên dịch nhắc**
khi lớp thêm field. Nếu chọn cách này, viết một test so số property qua reflection.

## Dấu hiệu nhận ra sớm

```bash
# Moi cho sao chep nong
grep -rn "MemberwiseClone\|ICloneable" --include=*.cs src/

# record co field kieu collection thay doi duoc
grep -rnE "record .*\(.*(List|Dictionary|HashSet)<" --include=*.cs src/
```

Ba câu hỏi cho code review:

1. Lớp này có field kiểu tham chiếu **thay đổi được** không? Nếu có, `Clone` là nông hay sâu?
2. Có test nào khẳng định **bản gốc không đổi** sau khi sửa bản sao không?
3. `record` này có chứa `List<T>` không? Nếu có, nó không bất biến như tên gọi.

## Related Topics

- [Prototype](../skills/prototype.md) — nhân bản, và ba cách sao chép sâu
- [Memento](../skills/memento.md) — cùng bẫy nông/sâu, ở ngữ cảnh undo
- [Case study — Design Patterns](index.md)
