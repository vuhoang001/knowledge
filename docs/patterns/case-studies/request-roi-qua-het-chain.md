---
title: Yêu cầu đổi hàng biến mất, không ai báo
sidebar_position: 12
description: "Chuỗi duyệt không có mắt xích chốt — loại yêu cầu mới rơi qua hết chuỗi, trả null, và người gọi không kiểm tra."
tags: [case-study, chain-of-responsibility, silent-failure]
domain: backend
category: pattern
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Yêu cầu đổi hàng biến mất, không ai báo

> **Nhãn: tình huống dựng lại.** Mọi con số chạy thật bằng `dotnet run 18-chain.cs`
> trên .NET 11.0.0.

## Bối cảnh

Quy trình duyệt hoàn tiền dùng
[Chain of Responsibility](../skills/chain-of-responsibility.md):

```csharp
abstract class NguoiXuLy : INguoiXuLy
{
    public INguoiXuLy? Tiep { get; set; }
    public string? Xu(YeuCau y) => Nhan(y) ? $"{GetType().Name} duyet" : Tiep?.Xu(y);
    protected abstract bool Nhan(YeuCau y);
}
```

| Người duyệt | Nhận khi |
|---|---|
| `TruongCa` | hoàn tiền ≤ 1.000.000 |
| `QuanLy` | hoàn tiền ≤ 10.000.000 |
| `GiamDoc` | hoàn tiền, không giới hạn |

Chạy đúng một năm. Rồi sản phẩm thêm loại yêu cầu **đổi hàng**, đi qua cùng endpoint.

## Triệu chứng

Chăm sóc khách hàng báo: *"khách nói đã gửi yêu cầu đổi hàng nhưng hệ thống không có gì
cả."*

```text
=== Chuoi khong co nguoi chot ===
  hoan tien       200,000 -> TruongCa duyet
  hoan tien     8,000,000 -> QuanLy duyet
  hoan tien    90,000,000 -> GiamDoc duyet
  doi hang         50,000 -> (khong ai xu ly — im lang)
```

Ba loại hoàn tiền chạy đúng. Yêu cầu đổi hàng trả về `null` — và biến mất.

Chi tiết làm ca này khó chịu: **API trả HTTP 200**. Frontend hiện "Đã gửi yêu cầu". Khách
chờ. Không có bản ghi nào trong CSDL, không có dòng log nào ở mức `Warning` trở lên, và
dashboard "số yêu cầu chờ duyệt" không đếm nó.

## Giả thuyết sai lúc đầu

| Nghi ngờ | Vì sao nghe hợp lý | Vì sao sai |
|---|---|---|
| Frontend không gửi request | "Không có gì trong CSDL" | Log access của gateway: request có, 200 OK |
| Yêu cầu bị lọc ở tầng xác thực | Có thể im lặng | Log xác thực: qua bình thường |
| Job xử lý hàng đợi chết | Kinh điển | Không có gì trong hàng đợi để xử lý — đó mới là manh mối |
| CSDL rollback do transaction lỗi | Giải thích được "không có bản ghi" | Không có transaction nào được mở |

Manh mối quyết định là giả thuyết thứ ba đọc ngược lại: **không có gì trong hàng đợi**
nghĩa là code chưa bao giờ tới bước đẩy vào hàng đợi. Đặt breakpoint ngay sau `Xu(y)` là
thấy `null`.

## Nguyên nhân thật

Không mắt xích nào trong chuỗi nhận loại `"doi hang"`. `Tiep?.Xu(y)` ở mắt xích cuối
(`GiamDoc`) trả về `null` vì `Tiep` là `null`.

Người gọi:

```csharp
var kq = chuoi.Xu(y);
return Ok(new { thongBao = kq });      // kq = null, van tra 200
```

**Ba quyết định thiết kế, mỗi cái riêng lẻ đều hợp lý, ghép lại thành lỗ hổng:**

1. Chuỗi trả `string?` — kiểu cho phép `null`.
2. Mắt xích cuối trả `null` khi không ai nhận — hành vi mặc định của pattern.
3. Người gọi không kiểm `null` — vì trong một năm nó chưa bao giờ là `null`.

Điểm thứ ba là chỗ đáng nhớ: code **đúng theo kinh nghiệm**, cho tới ngày tập đầu vào mở
rộng.

Và đây là điều mà `if/else` cho không mà chuỗi lấy mất: `else` cuối cùng là chỗ trình biên
dịch (hoặc ít nhất là mắt bạn) buộc phải nghĩ tới. Chuỗi không có `else`.

## Vì sao không test nào bắt được

| Kiểm tra | Kết quả | Vì sao không thấy |
|---|---|---|
| Unit test từng mắt xích | Xanh | Mỗi mắt xích nhận/không nhận đúng đặc tả |
| Test chuỗi với 3 mức hoàn tiền | Xanh | Ba ca đó đều có người nhận |
| Test tính năng đổi hàng | **Không có** | Nó được thêm ở tầng khác; ai cũng nghĩ chuỗi duyệt là chuyện của hoàn tiền |
| Trình biên dịch | Cảnh báo được | Nếu bật nullable reference types — nhưng dự án chưa bật |
| Kiểu trả về | `string?` | Kiểu **cho phép** `null`, nên không có gì sai |

Dòng thứ tư là cơ hội bị bỏ lỡ: `<Nullable>enable</Nullable>` sẽ cảnh báo tại chỗ gán
`kq` vào một trường không nhận `null`. Một cài đặt project chặn được cả lớp lỗi này.

## Cách sửa

### Bước 1 — luôn có mắt xích chốt

```csharp
var chuoi2 = Noi(new TruongCa(), new QuanLy(), new GiamDoc(), new ChotSo());
```

```text
=== Chuoi co nguoi chot o cuoi ===
  hoan tien       200,000 -> TruongCa duyet
  hoan tien     8,000,000 -> QuanLy duyet
  hoan tien    90,000,000 -> GiamDoc duyet
  doi hang         50,000 -> ChotSo duyet
```

`ChotSo` nhận mọi thứ. Trong code thật nó nên **ghi log mức `Error` rồi ném**, hoặc đẩy
vào hàng đợi xử lý tay. Điều quan trọng không phải nó xử lý được — mà là **không gì rơi ra
ngoài im lặng**.

### Bước 2 — đổi kiểu trả về để không thể quên

```csharp
abstract record KetQuaDuyet;
sealed record DaDuyet(string BoiAi) : KetQuaDuyet;
sealed record KhongAiNhan(YeuCau Y) : KetQuaDuyet;
```

`string?` mời gọi việc quên kiểm `null`. Một kiểu có hai nhánh rõ ràng buộc người gọi phải
xử lý cả hai — trình biên dịch nhắc khi `switch` thiếu nhánh.

### Bước 3 — nối chuỗi bằng `List`, không bằng con trỏ `Tiep`

```csharp
foreach (var h in _danhSach) { var r = h.Thu(y); if (r is not null) return r; }
throw new KhongAiXuLy(y);
```

Ba lợi ích: thứ tự **hiện rõ ở một chỗ**, không tạo được vòng, và `throw` cuối cùng là thứ
không quên được — nó nằm ngay đó.

### Và một bẫy đi kèm: thứ tự

Cùng bộ mắt xích, đảo thứ tự:

```text
=== Thu tu doi ket qua: dat GiamDoc len dau ===
  hoan tien       200,000 -> GiamDoc duyet
  hoan tien     8,000,000 -> GiamDoc duyet
  hoan tien    90,000,000 -> GiamDoc duyet
```

**Mọi khoản hoàn tiền giờ do giám đốc duyệt**, kể cả 200.000. Không lỗi, không cảnh báo —
quy trình nghiệp vụ sai trong khi code chạy đúng.

Quy tắc: **mắt xích hẹp nhất đứng trước**, và viết một test khoá thứ tự cho mỗi ngưỡng
nghiệp vụ.

## Dấu hiệu nhận ra sớm

```bash
# Chuoi tra ve kieu nullable
grep -rn "?\.Xu(\|Tiep?\." --include=*.cs src/

# Nullable reference types da bat chua
grep -rn "<Nullable>" --include=*.csproj .
```

Ba câu hỏi cho code review:

1. Chuỗi này có mắt xích **nhận mọi thứ** ở cuối không?
2. Kiểu trả về có phân biệt được "đã xử lý" với "không ai nhận" không, hay cả hai đều là
   `null`?
3. Nếu ngày mai xuất hiện một loại yêu cầu mới, nó đi đâu? Nếu câu trả lời là "không biết"
   thì đó chính là lỗ hổng.

## Related Topics

- [Chain of Responsibility](../skills/chain-of-responsibility.md) — mắt xích chốt và thứ tự
- [Command](../skills/command.md) — yêu cầu vật hoá, xếp hàng được thay vì biến mất
- [Case study — Design Patterns](index.md)
