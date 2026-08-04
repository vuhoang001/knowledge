---
title: Báo cáo thiếu 4,2 triệu, không có lỗi nào
sidebar_position: 5
description: "Adapter catch trống biến sự cố dịch vụ tỷ giá thành null, và null nhân với 0 cho ra một con số sai trông như số đúng."
tags: [case-study, adapter, exception-handling, silent-failure]
domain: backend
category: pattern
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Báo cáo thiếu 4,2 triệu, không có lỗi nào

> **Nhãn: tình huống dựng lại.** Mọi con số chạy thật bằng `dotnet run 11-adapter.cs`
> trên .NET 11.0.0.

## Bối cảnh

Báo cáo doanh thu quy đổi về VND. Tỷ giá lấy từ một dịch vụ bên thứ ba qua adapter:

```csharp
sealed class AdapterNuotLoi(ThuVienTyGiaBenThuBa tv) : ITyGia
{
    public decimal? LayTyGia(string ma)
    {
        try { return decimal.Parse(tv.FetchRate(ma)); }
        catch { return null; }                       // nuot sach moi thu
    }
}
```

Người gọi:

```csharp
foreach (var d in dong) t += d.tien * (tg.LayTyGia(d.ma) ?? 0m);
```

Hai dòng này, viết cách nhau sáu tháng bởi hai người, ghép lại thành một lỗ hổng.

## Triệu chứng

Kế toán báo: *"doanh thu quý III thấp hơn số của phòng kinh doanh, nhưng không nhiều —
khoảng vài phần trăm."*

```text
=== Hau qua tren bao cao ===
  Tong voi adapter nuot loi : 4,192,050 VND   <- thieu tien, khong bao gi
  Tong voi adapter dich loi : dung lai — khong tra duoc ty gia cho "XXX"
```

Không exception, không dòng log ở mức `Error`, không cảnh báo trên dashboard. Báo cáo
chạy xong, gửi mail đúng giờ, và **sai**.

Điều tệ nhất: sai *ít*. Nếu thiếu một nửa thì ai cũng thấy ngay. Thiếu vài phần trăm thì
người ta bắt đầu tranh luận xem ai đúng.

## Giả thuyết sai lúc đầu

| Nghi ngờ | Vì sao nghe hợp lý | Vì sao sai |
|---|---|---|
| Hai phòng dùng hai định nghĩa doanh thu | Kinh điển với báo cáo lệch | Đối chiếu định nghĩa: giống nhau |
| Lệch do làm tròn tỷ giá | Con số lệch nhỏ | Làm tròn cho lệch ở hàng đơn vị, không phải hàng triệu |
| Có đơn hàng bị lọc mất ở tầng truy vấn | Đúng hướng "thiếu dòng" | Đếm số dòng: **bằng nhau** ở cả hai bên |
| Tỷ giá của một loại tiền bị sai | Gần đúng | Đúng — nhưng nó không *sai*, nó **bằng 0** |

Giả thuyết thứ ba là chỗ đáng chú ý: người debug kiểm số **dòng** và thấy khớp, nên loại
bỏ hướng "mất dữ liệu". Dữ liệu không mất — nó được nhân với 0.

## Nguyên nhân thật

Dịch vụ tỷ giá không có mã `XXX` (một loại tiền hiếm mới thêm vào hệ thống). Nó ném
`ExternalRateApiException`.

`catch { return null; }` nuốt exception đó và trả `null`. Người gọi có `?? 0m`. Kết quả:
dòng đó đóng góp **0 đồng** vào tổng.

Chuỗi ba mắt xích, mỗi mắt xích riêng lẻ đều "hợp lý":

1. Adapter: *"không lấy được thì trả `null`, để người gọi quyết định."*
2. Người gọi: *"`null` thì coi như không có, `?? 0m` cho an toàn."*
3. Báo cáo: cộng và in ra.

**Không ai sai một mình. Ghép lại thì mất tiền.**

Điểm mấu chốt là `catch` trống không phân biệt được bốn tình huống hoàn toàn khác nhau:

| Tình huống thật | Sau `catch { return null; }` |
|---|---|
| Mã tiền tệ không tồn tại | `null` |
| Dịch vụ đang sập | `null` |
| Token hết hạn | `null` |
| Họ đổi định dạng số, `Parse` hỏng | `null` |

Ba tình huống cuối là **sự cố hệ thống** và đáng dừng pipeline. Chúng bị đối xử như tình
huống đầu.

## Vì sao không test nào bắt được

| Kiểm tra | Kết quả | Vì sao không thấy |
|---|---|---|
| Unit test adapter | Xanh | Test dùng mã hợp lệ (`USD`, `JPY`) |
| Test "mã không tồn tại trả null" | Xanh | Đó chính là hành vi được đặc tả — **đặc tả sai** |
| Test tích hợp báo cáo | Xanh | Dữ liệu test không có loại tiền hiếm |
| Giám sát | Im lặng | Không có exception nào để đếm, không có alert nào để bật |
| Kiểm tra số dòng | Khớp | Dòng vẫn ở đó, chỉ giá trị bằng 0 |

Dòng thứ hai là bài học sâu nhất: **có một test xanh khẳng định đúng hành vi sai.** Test
không bảo vệ bạn khỏi đặc tả sai.

Dòng thứ tư giải thích vì sao nó sống sót lâu: hệ thống giám sát đếm exception. Không có
exception thì không có gì để đếm — sự cố **vô hình với chính công cụ dựng ra để thấy nó**.

## Cách sửa

### Bước 1 — `catch` đúng kiểu, dịch sang ngôn ngữ của mình

```csharp
sealed class AdapterDichLoi(ThuVienTyGiaBenThuBa tv) : ITyGia
{
    public decimal? LayTyGia(string ma)
    {
        try { return decimal.Parse(tv.FetchRate(ma)); }
        catch (ExternalRateApiException e) { throw new KhongTraCuuDuocTyGia($"khong tra duoc ty gia cho \"{ma}\"", e); }
    }
}
```

```text
=== Adapter dich loi sang ngon ngu cua minh ===
  USD: 25,400.50
  JPY: 165.20
  XXX: nem KhongTraCuuDuocTyGia: khong tra duoc ty gia cho "XXX"
```

Hai chi tiết bắt buộc:

- **`catch` kiểu cụ thể**, không `catch` trống. `OperationCanceledException` và
  `OutOfMemoryException` phải đi thẳng lên trên.
- **Giữ exception gốc làm inner.** Không giữ là mất stack trace của bên kia.

### Bước 2 — phân biệt hai câu hỏi ở tầng thiết kế API

| Câu hỏi | Trả về gì |
|---|---|
| *"Loại tiền này không có tỷ giá hôm nay"* — kết quả hợp lệ | `null` / `Result`, và đặt tên method là `ThuLayTyGia` |
| *"Không tra cứu được"* — sự cố | Ném |

Nếu API bên kia không phân biệt được hai ca đó, **adapter chính là chỗ bạn phải phân
biệt** — bằng mã lỗi HTTP, mã lỗi của họ, hay bất cứ tín hiệu nào có.

### Bước 3 — bỏ `?? 0m` ở người gọi

`?? 0m` biến "không biết" thành "bằng không". Với số tiền, hai thứ đó không bao giờ giống
nhau. Nếu thật sự cần tiếp tục khi thiếu tỷ giá, hãy **đếm và báo cáo**:

```csharp
if (tg.ThuLayTyGia(d.ma) is not { } r) { soDongBoQua++; continue; }
```

rồi in `soDongBoQua` lên chính báo cáo. Con số 0 im lặng là thứ phải biến mất.

### Trước và sau

| | Nuốt lỗi | Dịch lỗi |
|---|---|---|
| Dịch vụ sập | báo cáo ra số thiếu | pipeline dừng, có alert |
| Mã tiền tệ mới chưa hỗ trợ | 0 đồng, im lặng | exception có tên mã |
| Họ đổi định dạng số | 0 đồng, im lặng | exception, thấy ngay ngày đầu |
| Giám sát thấy gì | không gì cả | exception đếm được |

## Dấu hiệu nhận ra sớm

```bash
# catch trong hoac catch Exception rong
grep -rnE "catch\s*\{|catch\s*\(Exception[^)]*\)\s*\{\s*(return|//)" --include=*.cs src/

# ?? 0 tren gia tri tien te
grep -rn "?? 0m\|?? 0M\|GetValueOrDefault()" --include=*.cs src/
```

Ba câu hỏi cho code review:

1. `catch` này bắt kiểu gì? Trống hoặc `Exception` = đang che một lớp lỗi chưa biết.
2. Giá trị mặc định ở đây có **phân biệt được** với giá trị thật không? `0` cho tiền thì
   không.
3. Nếu dịch vụ ngoài sập hoàn toàn, báo cáo này ra số gì? Nếu câu trả lời là "một số
   nhỏ hơn" thì bạn có đúng lỗ hổng này.

Câu thứ ba là câu bắt được nhiều nhất, và trả lời được trong 30 giây.

## Related Topics

- [Adapter](../skills/adapter.md) — dịch hình dạng, và dịch lỗi
- [Facade](../skills/facade.md) — cùng cám dỗ "giấu cho gọn", cùng hậu quả
- [Case study — Design Patterns](index.md)
